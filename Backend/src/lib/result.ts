/**
 * Result Type
 *
 * Type générique pour représenter le résultat d'une opération
 * qui peut réussir ou échouer de manière explicite.
 *
 * Usage:
 * ```typescript
 * async function fetchUser(id: string): Promise<Result<User, AppError>> {
 *   try {
 *     const user = await db.findUser(id);
 *     if (!user) {
 *       return failure(new AppError("USER_NOT_FOUND", "User not found"));
 *     }
 *     return success(user);
 *   } catch (error) {
 *     return failure(new AppError("DB_ERROR", error.message));
 *   }
 * }
 *
 * // Utilisation
 * const result = await fetchUser("123");
 * if (result.success) {
 *   console.log(result.data.name);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */

/**
 * Résultat de succès
 */
export interface Success<T> {
  success: true;
  data: T;
}

/**
 * Résultat d'échec
 */
export interface Failure<E = Error> {
  success: false;
  error: E;
}

/**
 * Type union pour un résultat qui peut réussir ou échouer
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Crée un résultat de succès
 */
export function success<T>(data: T): Success<T> {
  return { success: true, data };
}

/**
 * Crée un résultat d'échec
 */
export function failure<E = Error>(error: E): Failure<E> {
  return { success: false, error };
}

/**
 * Classe d'erreur applicative avec code et contexte
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }

  /**
   * Convertit en objet JSON pour les réponses API
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.context && { context: this.context }),
    };
  }
}

/**
 * Helper pour vérifier si un Result est un succès (type guard)
 */
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success === true;
}

/**
 * Helper pour vérifier si un Result est un échec (type guard)
 */
export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.success === false;
}

/**
 * Helper pour unwrap un Result ou lancer une erreur
 */
export function unwrap<T, E extends Error>(result: Result<T, E>): T {
  if (result.success) {
    return result.data;
  }
  throw result.error;
}

/**
 * Helper pour unwrap un Result avec une valeur par défaut
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (result.success) {
    return result.data;
  }
  return defaultValue;
}

/**
 * Helper pour mapper un Result de succès
 */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> {
  if (result.success) {
    return success(fn(result.data));
  }
  return result;
}

/**
 * Helper pour exécuter une fonction async et retourner un Result
 */
export async function tryCatch<T, E = Error>(
  fn: () => Promise<T>,
  errorMapper?: (error: unknown) => E
): Promise<Result<T, E>> {
  try {
    const data = await fn();
    return success(data);
  } catch (error) {
    if (errorMapper) {
      return failure(errorMapper(error));
    }
    return failure(error as E);
  }
}
