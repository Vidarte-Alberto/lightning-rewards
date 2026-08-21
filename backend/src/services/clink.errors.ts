export type ClinkOperation = 'offer' | 'debit';

type ClinkServiceErrorOptions = {
  operation: ClinkOperation;
  code: string;
  publicMessage: string;
  retryable?: boolean;
  indeterminate?: boolean;
  cause?: unknown;
};

export class ClinkServiceError extends Error {
  readonly operation: ClinkOperation;
  readonly code: string;
  readonly publicMessage: string;
  readonly retryable: boolean;
  readonly indeterminate: boolean;

  constructor(options: ClinkServiceErrorOptions) {
    super(options.publicMessage, { cause: options.cause });
    this.name = 'ClinkServiceError';
    this.operation = options.operation;
    this.code = options.code;
    this.publicMessage = options.publicMessage;
    this.retryable = options.retryable ?? false;
    this.indeterminate = options.indeterminate ?? false;
  }
}

const offerMessages: Record<number, string> = {
  1: 'The business offer is invalid or no longer available.',
  2: 'The business cannot generate an invoice right now.',
  3: 'The business offer expired or was replaced.',
  4: 'The business does not support this payment request.',
  5: 'The amount is outside the range accepted by the business.',
};

const debitMessages: Record<number, string> = {
  1: 'The payment was not approved in your wallet.',
  2: 'The wallet cannot process the payment right now.',
  3: 'The payment request expired.',
  4: 'The wallet temporarily limited payment requests.',
  5: 'The amount is outside the range authorized by the wallet.',
  6: 'The wallet received an invalid payment request.',
};

export const offerResponseError = (code: number, cause?: unknown) =>
  new ClinkServiceError({
    operation: 'offer',
    code: `CLINK_OFFER_${code}`,
    publicMessage: offerMessages[code] ?? 'The business rejected the invoice request.',
    retryable: code === 2,
    cause,
  });

export const debitResponseError = (code: number, cause?: unknown) =>
  new ClinkServiceError({
    operation: 'debit',
    code: code === 1 ? 'CLINK_DEBIT_DENIED' : `CLINK_DEBIT_${code}`,
    publicMessage: debitMessages[code] ?? 'The wallet rejected the payment request.',
    retryable: false,
    cause,
  });
