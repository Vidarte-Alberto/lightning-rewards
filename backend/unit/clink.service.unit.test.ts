import {
  ClinkService,
  type ClinkSdkModule,
  type DebitPaymentResult,
} from '../src/services/clink.service';
import { ClinkServiceError } from '../src/services/clink.errors';

const PRIVATE_KEY = '11'.repeat(32);

type FakeOptions = {
  decoded?: ReturnType<ClinkSdkModule['decodeBech32']>;
  offerResponse?: { bolt11: string } | { code: number; error: string };
  debitResponse?: { res: 'ok'; preimage?: string } | { res: 'GFY'; code: number; error: string };
  offerError?: unknown;
  debitError?: unknown;
};

const createFakeSdk = (options: FakeOptions = {}) => {
  const calls = {
    offer: [] as unknown[],
    debit: [] as unknown[],
    debitRequest: [] as unknown[],
    stop: 0,
  };

  class FakeClient {
    async Noffer(data: unknown) {
      calls.offer.push(data);
      if (options.offerError) throw options.offerError;
      return options.offerResponse ?? { bolt11: 'lnbc-test-invoice' };
    }

    async Ndebit(data: unknown) {
      calls.debit.push(data);
      if (options.debitError) throw options.debitError;
      return options.debitResponse ?? { res: 'ok' as const, preimage: 'ab'.repeat(32) };
    }

    Stop() {
      calls.stop += 1;
    }
  }

  const module = {
    decodeBech32: () =>
      options.decoded ?? {
        type: 'noffer' as const,
        data: { pubkey: 'pubkey', relay: 'wss://relay.example.com', offer: 'offer-id' },
      },
    ClinkSDK: FakeClient,
    newNdebitPaymentRequest: (...args: unknown[]) => {
      calls.debitRequest.push(args);
      return { bolt11: args[0], amount_sats: args[1], pointer: args[2], k1: args[3] };
    },
    getPublicKey: () => 'aa'.repeat(32),
    nip19: {
      npubEncode: (publicKeyHex: string) => `npub1${publicKeyHex}`,
    },
  } as unknown as ClinkSdkModule;

  return { module, calls };
};

const createService = (module: ClinkSdkModule) =>
  new ClinkService({
    privateKeyHex: PRIVATE_KEY,
    timeoutSeconds: 15,
    loadModule: async () => module,
  });

test('exposes the stable platform identity for wallet approval setup', async () => {
  const { module } = createFakeSdk();

  await expect(createService(module).getPlatformIdentity()).resolves.toEqual({
    publicKeyHex: 'aa'.repeat(32),
    npub: `npub1${'aa'.repeat(32)}`,
  });
});

test('requests an invoice using the decoded noffer', async () => {
  const { module, calls } = createFakeSdk();

  await expect(
    createService(module).requestInvoiceFromOffer('noffer1test', 2_500, 'Compra de café'),
  ).resolves.toBe('lnbc-test-invoice');

  expect(calls.offer).toEqual([
    { offer: 'offer-id', amount_sats: 2_500, description: 'Compra de café' },
  ]);
  expect(calls.stop).toBe(1);
});

test('maps offer protocol errors to stable application codes', async () => {
  const { module } = createFakeSdk({
    offerResponse: { code: 5, error: 'Invalid Amount' },
  });

  await expect(
    createService(module).requestInvoiceFromOffer('noffer1test', 1, 'Compra'),
  ).rejects.toMatchObject({ code: 'CLINK_OFFER_5', retryable: false });
});

test('includes pointer and session k1 in a debit payment request', async () => {
  const { module, calls } = createFakeSdk({
    decoded: {
      type: 'ndebit',
      data: {
        pubkey: 'wallet-pubkey',
        relay: 'wss://relay.example.com',
        pointer: 'wallet-pointer',
        k1: '22'.repeat(32),
      },
    },
  });

  const result: DebitPaymentResult = await createService(module).requestDebitPayment(
    'ndebit1test',
    'lnbc-test-invoice',
    2_500,
    'Compra de café',
  );

  expect(result).toEqual({ preimage: 'ab'.repeat(32), internalSettlement: false });
  expect(calls.debitRequest).toEqual([
    ['lnbc-test-invoice', 2_500, 'wallet-pointer', '22'.repeat(32), 'Compra de café'],
  ]);
  expect(calls.stop).toBe(1);
});

test.each([undefined, ''])('accepts an internal settlement with preimage %j', async (preimage) => {
  const { module } = createFakeSdk({
    decoded: {
      type: 'ndebit',
      data: { pubkey: 'wallet-pubkey', relay: 'wss://relay.example.com' },
    },
    debitResponse: { res: 'ok', preimage },
  });

  await expect(
    createService(module).requestDebitPayment('ndebit1test', 'lnbc-test', 100),
  ).resolves.toEqual({ preimage: undefined, internalSettlement: true });
});

test('maps GFY code 1 to an explicit customer denial', async () => {
  const { module } = createFakeSdk({
    decoded: {
      type: 'ndebit',
      data: { pubkey: 'wallet-pubkey', relay: 'wss://relay.example.com' },
    },
    debitResponse: { res: 'GFY', code: 1, error: 'Request Denied' },
  });

  await expect(
    createService(module).requestDebitPayment('ndebit1test', 'lnbc-test', 100),
  ).rejects.toMatchObject({
    code: 'CLINK_DEBIT_DENIED',
    publicMessage: 'The payment was not approved in your wallet.',
    retryable: false,
    indeterminate: false,
  });
});

test('rejects a missing platform key when the service starts', () => {
  const { module } = createFakeSdk();

  expect(
    () =>
      new ClinkService({
        privateKeyHex: undefined,
        timeoutSeconds: 15,
        loadModule: async () => module,
      }),
  ).toThrowError(
    expect.objectContaining({
      code: 'CLINK_CONFIGURATION',
    }),
  );
});

test('marks debit timeouts as indeterminate and never retryable', async () => {
  const { module, calls } = createFakeSdk({
    decoded: {
      type: 'ndebit',
      data: { pubkey: 'wallet-pubkey', relay: 'wss://relay.example.com' },
    },
    debitError: 'failed to get response in time',
  });

  const promise = createService(module).requestDebitPayment('ndebit1test', 'lnbc-test', 100);

  await expect(promise).rejects.toBeInstanceOf(ClinkServiceError);
  await expect(promise).rejects.toMatchObject({
    code: 'CLINK_DEBIT_TIMEOUT',
    retryable: false,
    indeterminate: true,
  });
  expect(calls.stop).toBe(1);
});
