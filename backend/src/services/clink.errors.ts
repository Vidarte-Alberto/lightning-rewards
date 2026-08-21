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
  1: 'La oferta del negocio no es válida o ya no está disponible.',
  2: 'El negocio no puede generar la factura temporalmente.',
  3: 'La oferta del negocio expiró o fue reemplazada.',
  4: 'El negocio no soporta esta solicitud de pago.',
  5: 'El monto está fuera del rango aceptado por el negocio.',
};

const debitMessages: Record<number, string> = {
  1: 'The payment was not approved in your wallet.',
  2: 'La wallet no pudo procesar el pago temporalmente.',
  3: 'La solicitud de pago expiró.',
  4: 'La wallet limitó temporalmente las solicitudes.',
  5: 'El monto está fuera del rango autorizado por la wallet.',
  6: 'La wallet recibió una solicitud de pago inválida.',
};

export const offerResponseError = (code: number, cause?: unknown) =>
  new ClinkServiceError({
    operation: 'offer',
    code: `CLINK_OFFER_${code}`,
    publicMessage: offerMessages[code] ?? 'El negocio rechazó la solicitud de factura.',
    retryable: code === 2,
    cause,
  });

export const debitResponseError = (code: number, cause?: unknown) =>
  new ClinkServiceError({
    operation: 'debit',
    code: code === 1 ? 'CLINK_DEBIT_DENIED' : `CLINK_DEBIT_${code}`,
    publicMessage: debitMessages[code] ?? 'La wallet rechazó la solicitud de pago.',
    retryable: false,
    cause,
  });
