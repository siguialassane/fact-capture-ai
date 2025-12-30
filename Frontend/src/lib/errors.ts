/**
 * Gestion d'erreurs centralisée
 *
 * Types et utilitaires pour une gestion cohérente des erreurs
 * dans toute l'application frontend.
 */

/**
 * Classe d'erreur applicative avec code et contexte
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * Convertit en objet JSON pour l'affichage
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.context && { context: this.context }),
    };
  }

  /**
   * Crée une erreur à partir d'une réponse API
   */
  static fromApiResponse(error: {
    code: string;
    message: string;
    details?: unknown;
  }): ApiError {
    return new ApiError(error.code, error.message, {
      details: error.details,
    });
  }
}

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
export interface Failure<E = ApiError> {
  success: false;
  error: E;
}

/**
 * Type union pour un résultat qui peut réussir ou échouer
 */
export type Result<T, E = ApiError> = Success<T> | Failure<E>;

/**
 * Crée un résultat de succès
 */
export function success<T>(data: T): Success<T> {
  return { success: true, data };
}

/**
 * Crée un résultat d'échec
 */
export function failure<E = ApiError>(error: E): Failure<E> {
  return { success: false, error };
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
 * Helper pour unwrap un Result ou retourner une valeur par défaut
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (result.success) {
    return result.data;
  }
  return defaultValue;
}

/**
 * Codes d'erreur standards de l'application
 */
export const ErrorCodes = {
  // Erreurs réseau
  NETWORK_ERROR: "NETWORK_ERROR",
  REQUEST_TIMEOUT: "REQUEST_TIMEOUT",

  // Erreurs API
  API_ERROR: "API_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",

  // Erreurs métier
  INVOICE_ANALYSIS_FAILED: "INVOICE_ANALYSIS_FAILED",
  ACCOUNTING_GENERATION_FAILED: "ACCOUNTING_GENERATION_FAILED",
  SAVE_FAILED: "SAVE_FAILED",

  // Erreurs frontend
  INVALID_INPUT: "INVALID_INPUT",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Messages d'erreur par défaut pour chaque code
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  NETWORK_ERROR: "Erreur de connexion au serveur. Vérifiez votre connexion internet.",
  REQUEST_TIMEOUT: "La requête a pris trop de temps. Veuillez réessayer.",
  API_ERROR: "Une erreur s'est produite côté serveur.",
  UNAUTHORIZED: "Vous n'êtes pas authentifié. Veuillez vous connecter.",
  FORBIDDEN: "Vous n'avez pas les droits pour effectuer cette action.",
  NOT_FOUND: "La ressource demandée n'existe pas.",
  VALIDATION_ERROR: "Les données fournies sont invalides.",
  INVOICE_ANALYSIS_FAILED: "L'analyse de la facture a échoué. Veuillez réessayer.",
  ACCOUNTING_GENERATION_FAILED: "La génération de l'écriture comptable a échoué.",
  SAVE_FAILED: "L'enregistrement a échoué. Veuillez réessayer.",
  INVALID_INPUT: "Les données saisies sont invalides.",
  UNKNOWN_ERROR: "Une erreur inattendue s'est produite.",
};

/**
 * Obtient le message d'erreur par défaut pour un code
 */
export function getErrorMessage(code: string): string {
  return ErrorMessages[code as ErrorCode] || ErrorMessages.UNKNOWN_ERROR;
}

/**
 * Transforme une erreur inconnue en ApiError
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError(
      ErrorCodes.UNKNOWN_ERROR,
      error.message,
      { originalError: error.name }
    );
  }

  return new ApiError(
    ErrorCodes.UNKNOWN_ERROR,
    String(error)
  );
}
