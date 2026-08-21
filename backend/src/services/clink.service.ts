import { ClinkServiceError, debitResponseError, offerResponseError } from './clink.errors';
import {
  CompatibleClinkClient,
  type ClinkCryptoModule,
} from './clink.transport';

type NofferResponse =
  | { bolt11: string }
  | { code: number; error: string; range?: { min: number; max: number } };

type NdebitResponse =
  | { res: 'ok'; preimage?: string }
  | { res: 'GFY'; code: number; error: string };

type NdebitData = {
  pointer?: string;
  amount_sats?: number;
  bolt11?: string;
  k1?: string;
  description?: string;
};

type DecodeResult =
  | {
      type: 'noffer';
      data: { pubkey: string; relay: string; offer: string };
    }
  | {
      type: 'ndebit';
      data: { pubkey: string; relay: string; pointer?: string; k1?: string };
    }
  | { type: 'nmanage'; data: unknown };

type ClinkClient = {
  Noffer(
    data: { offer: string; amount_sats: number; description?: string },
    onReceipt?: undefined,
    timeoutSeconds?: number,
  ): Promise<NofferResponse>;
  Ndebit(data: NdebitData, timeoutSeconds?: number): Promise<NdebitResponse>;
  Stop(): void;
};

export type ClinkSdkModule = {
  decodeBech32(value: string): DecodeResult;
  ClinkSDK: new (settings: {
    privateKey: Uint8Array;
    relays: string[];
    toPubKey: string;
    defaultTimeoutSeconds?: number;
  }) => ClinkClient;
  newNdebitPaymentRequest(
    invoice: string,
    amount?: number,
    pointer?: string,
    k1?: string,
    description?: string,
  ): NdebitData;
} & Partial<ClinkCryptoModule>;

type ClinkModuleLoader = () => Promise<ClinkSdkModule>;

type ClinkServiceOptions = {
  privateKeyHex?: string;
  timeoutSeconds: number;
  loadModule?: ClinkModuleLoader;
};

export type DebitPaymentResult = {
  preimage?: string;
  internalSettlement: boolean;
};

const defaultModuleLoader: ClinkModuleLoader = async () => {
  const module = await import('@shocknet/clink-sdk');
  return module as unknown as ClinkSdkModule;
};

const supportsCompatibleTransport = (
  sdkModule: ClinkSdkModule,
): sdkModule is ClinkSdkModule & ClinkCryptoModule =>
  typeof sdkModule.SimplePool === 'function' &&
  typeof sdkModule.getPublicKey === 'function' &&
  typeof sdkModule.finalizeEvent === 'function' &&
  typeof sdkModule.verifyEvent === 'function' &&
  typeof sdkModule.nip44?.getConversationKey === 'function' &&
  typeof sdkModule.nip44.encrypt === 'function' &&
  typeof sdkModule.nip44.decrypt === 'function';

const normalizeDescription = (description?: string) => {
  if (!description) return undefined;

  const normalized = description.trim();
  if (!normalized) return undefined;

  if (normalized.length > 100) {
    throw new Error('CLINK descriptions cannot exceed 100 characters');
  }

  return normalized;
};

const privateKeyFromHex = (privateKeyHex?: string) => {
  if (!privateKeyHex || !/^[0-9a-fA-F]{64}$/.test(privateKeyHex)) {
    throw new ClinkServiceError({
      operation: 'offer',
      code: 'CLINK_CONFIGURATION',
      publicMessage: 'El servicio de pagos no está configurado.',
    });
  }

  return Uint8Array.from(Buffer.from(privateKeyHex, 'hex'));
};

const isTimeout = (error: unknown) =>
  error === 'failed to get response in time' ||
  (error instanceof Error && error.message.includes('failed to get response in time'));

export class ClinkService {
  private readonly privateKeyHex?: string;
  private readonly timeoutSeconds: number;
  private readonly loadModule: ClinkModuleLoader;

  constructor(options: ClinkServiceOptions) {
    this.privateKeyHex = options.privateKeyHex;
    this.timeoutSeconds = options.timeoutSeconds;
    this.loadModule = options.loadModule ?? defaultModuleLoader;
  }

  async requestInvoiceFromOffer(
    nofferString: string,
    amountSats: number,
    description?: string,
  ): Promise<string> {
    const sdkModule = await this.loadModule();
    const pointer = this.decodePointer(sdkModule, nofferString, 'noffer');
    const client = this.createClient(sdkModule, {
      privateKey: privateKeyFromHex(this.privateKeyHex),
      relays: [pointer.relay],
      toPubKey: pointer.pubkey,
      defaultTimeoutSeconds: this.timeoutSeconds,
    });

    try {
      const response = await client.Noffer(
        {
          offer: pointer.offer,
          amount_sats: amountSats,
          description: normalizeDescription(description),
        },
        undefined,
        this.timeoutSeconds,
      );

      if ('bolt11' in response) return response.bolt11;
      throw offerResponseError(response.code, response);
    } catch (error: unknown) {
      if (error instanceof ClinkServiceError) throw error;
      throw this.transportError('offer', error);
    } finally {
      client.Stop();
    }
  }

  async requestDebitPayment(
    ndebitString: string,
    bolt11: string,
    amountSats: number,
    description?: string,
  ): Promise<DebitPaymentResult> {
    const sdkModule = await this.loadModule();
    const pointer = this.decodePointer(sdkModule, ndebitString, 'ndebit');
    const client = this.createClient(sdkModule, {
      privateKey: privateKeyFromHex(this.privateKeyHex),
      relays: [pointer.relay],
      toPubKey: pointer.pubkey,
      defaultTimeoutSeconds: this.timeoutSeconds,
    });

    try {
      const request = sdkModule.newNdebitPaymentRequest(
        bolt11,
        amountSats,
        pointer.pointer,
        pointer.k1,
        normalizeDescription(description),
      );
      const response = await client.Ndebit(request, this.timeoutSeconds);

      if (response.res === 'GFY') {
        throw debitResponseError(response.code, response);
      }

      return {
        preimage: response.preimage,
        internalSettlement: !response.preimage,
      };
    } catch (error: unknown) {
      if (error instanceof ClinkServiceError) throw error;
      throw this.transportError('debit', error);
    } finally {
      client.Stop();
    }
  }

  private decodePointer(
    sdkModule: ClinkSdkModule,
    value: string,
    expectedType: 'noffer',
  ): Extract<DecodeResult, { type: 'noffer' }>['data'];
  private decodePointer(
    sdkModule: ClinkSdkModule,
    value: string,
    expectedType: 'ndebit',
  ): Extract<DecodeResult, { type: 'ndebit' }>['data'];
  private decodePointer(
    sdkModule: ClinkSdkModule,
    value: string,
    expectedType: 'noffer' | 'ndebit',
  ) {
    try {
      const decoded = sdkModule.decodeBech32(value);
      if (decoded.type !== expectedType) throw new Error(`Expected ${expectedType}`);
      return decoded.data;
    } catch (error: unknown) {
      throw new ClinkServiceError({
        operation: expectedType === 'noffer' ? 'offer' : 'debit',
        code: expectedType === 'noffer' ? 'CLINK_INVALID_NOFFER' : 'CLINK_INVALID_NDEBIT',
        publicMessage:
          expectedType === 'noffer'
            ? 'La oferta Lightning del negocio no es válida.'
            : 'La conexión Lightning de la wallet no es válida.',
        cause: error,
      });
    }
  }

  private transportError(operation: 'offer' | 'debit', cause: unknown) {
    const timedOut = isTimeout(cause);
    return new ClinkServiceError({
      operation,
      code: timedOut ? `CLINK_${operation.toUpperCase()}_TIMEOUT` : `CLINK_${operation.toUpperCase()}_NETWORK`,
      publicMessage: timedOut
        ? operation === 'offer'
          ? 'El negocio tardó demasiado en generar la factura.'
          : 'No se pudo confirmar a tiempo el resultado del pago.'
        : 'No se pudo comunicar con el servicio Lightning.',
      retryable: operation === 'offer',
      indeterminate: operation === 'debit',
      cause,
    });
  }

  private createClient(
    sdkModule: ClinkSdkModule,
    settings: {
      privateKey: Uint8Array;
      relays: string[];
      toPubKey: string;
      defaultTimeoutSeconds: number;
    },
  ): ClinkClient {
    if (supportsCompatibleTransport(sdkModule)) {
      return new CompatibleClinkClient(sdkModule, settings) as ClinkClient;
    }

    // Test doubles and older SDK builds can continue through the public client.
    return new sdkModule.ClinkSDK(settings);
  }
}
