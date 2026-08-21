import {
  CompatibleClinkClient,
  isCompatibleClinkResponse,
  type ClinkCryptoModule,
} from '../src/services/clink.transport';

const expected = {
  kind: 21001,
  peerPubkey: 'aa'.repeat(32),
  requestorPubkey: 'bb'.repeat(32),
  requestId: 'request-id',
};

const response = (tags: string[][]) => ({
  id: 'response-id',
  pubkey: expected.peerPubkey,
  created_at: 1,
  kind: expected.kind,
  tags,
  content: 'encrypted',
  sig: 'signature',
});

const correlatedTags = [
  ['p', expected.requestorPubkey],
  ['e', expected.requestId],
];

test('accepts a signed legacy Lightning.Pub response without clink_version', () => {
  expect(isCompatibleClinkResponse(response(correlatedTags), expected, () => true)).toBe(true);
});

test('accepts a signed CLINK v1 response', () => {
  expect(
    isCompatibleClinkResponse(
      response([...correlatedTags, ['clink_version', '1']]),
      expected,
      () => true,
    ),
  ).toBe(true);
});

test.each([
  ['bad signature', response(correlatedTags), () => false],
  ['wrong peer', { ...response(correlatedTags), pubkey: 'cc'.repeat(32) }, () => true],
  ['wrong request', response([['p', expected.requestorPubkey], ['e', 'other']]), () => true],
  ['wrong recipient', response([['p', 'cc'.repeat(32)], ['e', expected.requestId]]), () => true],
  [
    'unsupported explicit version',
    response([...correlatedTags, ['clink_version', '2']]),
    () => true,
  ],
])('rejects %s', (_name, event, verifyEvent) => {
  expect(
    isCompatibleClinkResponse(
      event,
      expected,
      verifyEvent as ClinkCryptoModule['verifyEvent'],
    ),
  ).toBe(false);
});

const createTransport = (responseBody: unknown, includeVersion: boolean) => {
  let destroyed = false;
  let subscriptionClosed = false;

  class FakePool {
    private onEvent?: (event: ReturnType<typeof response>) => void;

    subscribeMany(
      _relays: string[],
      _filters: Array<Record<string, unknown>>,
      params: { onevent(event: ReturnType<typeof response>): void },
    ) {
      this.onEvent = params.onevent;
      return { close: () => { subscriptionClosed = true; } };
    }

    publish(_relays: string[], event: { id: string; kind: number }) {
      queueMicrotask(() => {
        this.onEvent?.(
          {
            ...response([
              ...correlatedTags.map((tag) =>
                tag[0] === 'e' ? ['e', event.id] : tag,
              ),
              ...(includeVersion ? [['clink_version', '1']] : []),
            ]),
            kind: event.kind,
          },
        );
      });
      return [Promise.resolve()];
    }

    destroy() {
      destroyed = true;
    }
  }

  const sdk = {
    SimplePool: FakePool,
    getPublicKey: () => expected.requestorPubkey,
    finalizeEvent: (event: object) => ({
      ...event,
      id: expected.requestId,
      sig: 'request-signature',
    }),
    verifyEvent: () => true,
    nip44: {
      getConversationKey: () => new Uint8Array(32),
      encrypt: (content: string) => content,
      decrypt: () => JSON.stringify(responseBody),
    },
  } as unknown as ClinkCryptoModule;

  const client = new CompatibleClinkClient(sdk, {
    privateKey: new Uint8Array(32),
    relays: ['wss://relay.example.com'],
    toPubKey: expected.peerPubkey,
    defaultTimeoutSeconds: 1,
  });

  return {
    client,
    state: () => ({ destroyed, subscriptionClosed }),
  };
};

test('resolves an Offer response from legacy Lightning.Pub', async () => {
  const { client, state } = createTransport({ bolt11: 'lnbc-legacy' }, false);

  await expect(client.Noffer({ offer: 'offer-id', amount_sats: 10 })).resolves.toEqual({
    bolt11: 'lnbc-legacy',
  });
  expect(state().subscriptionClosed).toBe(true);

  client.Stop();
  expect(state().destroyed).toBe(true);
});

test('resolves a modern Debit response using the same compatible transport', async () => {
  const { client } = createTransport({ res: 'ok', preimage: 'ab'.repeat(32) }, true);

  await expect(
    client.Ndebit({ bolt11: 'lnbc-modern', amount_sats: 10, pointer: 'wallet' }),
  ).resolves.toEqual({ res: 'ok', preimage: 'ab'.repeat(32) });

  client.Stop();
});
