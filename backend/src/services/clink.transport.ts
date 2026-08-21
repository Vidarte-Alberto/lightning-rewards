type NostrEvent = {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
};

type UnsignedNostrEvent = Omit<NostrEvent, 'id' | 'sig'>;

type Subscription = { close(): void };

export type ClinkPool = {
  subscribeMany(
    relays: string[],
    filters: Array<Record<string, unknown>>,
    params: { onevent(event: NostrEvent): void },
  ): Subscription;
  publish(relays: string[], event: NostrEvent): Array<Promise<unknown>>;
  destroy(): void;
};

export type ClinkCryptoModule = {
  SimplePool: new () => ClinkPool;
  getPublicKey(privateKey: Uint8Array): string;
  finalizeEvent(event: UnsignedNostrEvent, privateKey: Uint8Array): NostrEvent;
  verifyEvent(event: NostrEvent): boolean;
  nip44: {
    getConversationKey(privateKey: Uint8Array, publicKey: string): Uint8Array;
    encrypt(content: string, conversationKey: Uint8Array): string;
    decrypt(content: string, conversationKey: Uint8Array): string;
  };
};

type RequestExpectation = {
  kind: number;
  peerPubkey: string;
  requestorPubkey: string;
  requestId: string;
};

const firstTag = (tags: string[][], name: string) =>
  tags.find((tag) => tag[0] === name)?.[1];

const sameHex = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();

/**
 * Lightning.Pub 0.0.38 omits clink_version from responses. Accept that legacy
 * shape only after all cryptographic and correlation checks pass. Explicit
 * versions other than CLINK v1 remain invalid.
 */
export const isCompatibleClinkResponse = (
  event: NostrEvent,
  expected: RequestExpectation,
  verifyEvent: (event: NostrEvent) => boolean,
) => {
  if (event.kind !== expected.kind) return false;
  if (!sameHex(event.pubkey, expected.peerPubkey)) return false;
  if (!verifyEvent(event)) return false;

  const version = firstTag(event.tags, 'clink_version');
  if (version !== undefined && version !== '1') return false;
  if (!sameHex(firstTag(event.tags, 'p') ?? '', expected.requestorPubkey)) return false;

  return firstTag(event.tags, 'e') === expected.requestId;
};

type CompatibleClientSettings = {
  privateKey: Uint8Array;
  relays: string[];
  toPubKey: string;
  defaultTimeoutSeconds?: number;
};

type OfferData = {
  offer: string;
  amount_sats: number;
  description?: string;
};

type DebitData = {
  pointer?: string;
  amount_sats?: number;
  bolt11?: string;
  k1?: string;
  description?: string;
};

const timeoutError = 'failed to get response in time';

export class CompatibleClinkClient {
  private readonly pool: ClinkPool;

  constructor(
    private readonly sdk: ClinkCryptoModule,
    private readonly settings: CompatibleClientSettings,
  ) {
    this.pool = new sdk.SimplePool();
  }

  Noffer(data: OfferData, _onReceipt?: undefined, timeoutSeconds?: number) {
    return this.sendRequest(21001, data, timeoutSeconds);
  }

  Ndebit(data: DebitData, timeoutSeconds?: number) {
    return this.sendRequest(21002, data, timeoutSeconds);
  }

  Stop() {
    this.pool.destroy();
  }

  private sendRequest(kind: number, data: OfferData | DebitData, timeoutSeconds?: number) {
    const requestorPubkey = this.sdk.getPublicKey(this.settings.privateKey);
    const peerPubkey = this.settings.toPubKey.toLowerCase();
    const conversationKey = this.sdk.nip44.getConversationKey(
      this.settings.privateKey,
      peerPubkey,
    );
    const content = this.sdk.nip44.encrypt(JSON.stringify(data), conversationKey);
    const signed = this.sdk.finalizeEvent(
      {
        content,
        created_at: Math.floor(Date.now() / 1000),
        kind,
        pubkey: requestorPubkey,
        tags: [
          ['p', peerPubkey],
          ['clink_version', '1'],
        ],
      },
      this.settings.privateKey,
    );
    const timeout = timeoutSeconds ?? this.settings.defaultTimeoutSeconds ?? 30;

    return new Promise<unknown>((resolve, reject) => {
      let settled = false;
      let timer: NodeJS.Timeout | undefined;
      let subscription: Subscription = { close: () => undefined };

      const cleanup = () => {
        if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
        subscription.close();
      };
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      timer = setTimeout(() => fail(timeoutError), timeout * 1_000);

      try {
        subscription = this.pool.subscribeMany(
          this.settings.relays,
          [
            {
              since: Math.floor(Date.now() / 1000) - 1,
              kinds: [kind],
              '#p': [requestorPubkey],
              '#e': [signed.id],
            },
          ],
          {
            onevent: (event) => {
              if (
                !isCompatibleClinkResponse(
                  event,
                  {
                    kind,
                    peerPubkey,
                    requestorPubkey,
                    requestId: signed.id,
                  },
                  this.sdk.verifyEvent,
                )
              ) {
                return;
              }

              try {
                const decrypted = this.sdk.nip44.decrypt(event.content, conversationKey);
                const response = JSON.parse(decrypted) as unknown;
                if (settled) return;
                settled = true;
                cleanup();
                resolve(response);
              } catch (error: unknown) {
                fail(error);
              }
            },
          },
        );

        Promise.all(this.pool.publish(this.settings.relays, signed)).catch(fail);
      } catch (error: unknown) {
        fail(error);
      }
    });
  }
}
