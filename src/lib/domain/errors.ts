/**
 * Structured errors — one error system (contract §13).
 * Safe typed errors to clients; internals stay server-side.
 */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_STATE"
  | "PAYMENT_ERROR"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = statusFor(code);
    this.details = details;
  }

  toSafe() {
    return { code: this.code, message: this.message };
  }
}

function statusFor(code: ErrorCode): number {
  switch (code) {
    case "VALIDATION_ERROR":
      return 400;
    case "UNAUTHENTICATED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
    case "INVALID_STATE":
    case "PAYMENT_ERROR":
      return 409;
    case "DATABASE_ERROR":
    case "INTERNAL_ERROR":
      return 500;
  }
}

export const validationError = (message: string, details?: Record<string, unknown>) =>
  new DomainError("VALIDATION_ERROR", message, details);
export const notFound = (message = "Not found") => new DomainError("NOT_FOUND", message);
export const conflict = (message: string, details?: Record<string, unknown>) =>
  new DomainError("CONFLICT", message, details);
export const invalidState = (message: string, details?: Record<string, unknown>) =>
  new DomainError("INVALID_STATE", message, details);
export const paymentError = (message: string, details?: Record<string, unknown>) =>
  new DomainError("PAYMENT_ERROR", message, details);
