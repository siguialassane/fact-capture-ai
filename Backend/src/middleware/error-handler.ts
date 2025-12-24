import type { Context } from "hono";
import type { StatusCode } from "hono/utils/http-status";

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  public readonly statusCode: StatusCode;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: StatusCode = 500,
    code: string = "INTERNAL_ERROR",
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Pre-defined API errors
 */
export const Errors = {
  badRequest: (message: string, details?: unknown) =>
    new ApiError(message, 400, "BAD_REQUEST", details),

  unauthorized: (message = "Unauthorized") =>
    new ApiError(message, 401, "UNAUTHORIZED"),

  forbidden: (message = "Forbidden") =>
    new ApiError(message, 403, "FORBIDDEN"),

  notFound: (resource = "Resource") =>
    new ApiError(`${resource} not found`, 404, "NOT_FOUND"),

  conflict: (message: string) =>
    new ApiError(message, 409, "CONFLICT"),

  validationError: (details: unknown) =>
    new ApiError("Validation failed", 422, "VALIDATION_ERROR", details),

  tooManyRequests: (message = "Too many requests") =>
    new ApiError(message, 429, "TOO_MANY_REQUESTS"),

  internal: (message = "Internal server error") =>
    new ApiError(message, 500, "INTERNAL_ERROR"),

  serviceUnavailable: (message = "Service temporarily unavailable") =>
    new ApiError(message, 503, "SERVICE_UNAVAILABLE"),

  aiAnalysisError: (message: string, details?: unknown) =>
    new ApiError(message, 422, "AI_ANALYSIS_ERROR", details),

  configurationError: (message: string) =>
    new ApiError(message, 503, "CONFIGURATION_ERROR"),
};

/**
 * Global error handler middleware
 */
export function errorHandler(err: Error, c: Context) {
  console.error(`[ERROR] ${err.message}`, {
    name: err.name,
    stack: err.stack,
  });

  // Handle ApiError
  if (err instanceof ApiError) {
    return c.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      },
      err.statusCode as any
    );
  }

  // Handle Zod validation errors
  if (err.name === "ZodError") {
    return c.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: (err as unknown as { errors: unknown[] }).errors,
        },
      },
      422
    );
  }

  // Handle unknown errors
  return c.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : err.message,
      },
    },
    500
  );
}
