export class PaymentServiceError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus: number) {
    super(message);
    this.name = 'PaymentServiceError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}
