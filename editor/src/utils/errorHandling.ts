import { ValidationError } from '../components/ValidationErrorDisplay';

export class AppError extends Error {
  public readonly code: string;
  public readonly severity: 'error' | 'warning' | 'info';
  public readonly suggestion?: string;
  public readonly field?: string;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    severity: 'error' | 'warning' | 'info' = 'error',
    suggestion?: string,
    field?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.severity = severity;
    this.suggestion = suggestion;
    this.field = field;
  }
}

export class ValidationAppError extends AppError {
  public readonly errors: ValidationError[];

  constructor(message: string, errors: ValidationError[]) {
    super(message, 'VALIDATION_ERROR', 'error');
    this.errors = errors;
  }
}

export class FileError extends AppError {
  constructor(message: string, suggestion?: string) {
    super(message, 'FILE_ERROR', 'error', suggestion);
  }
}

export class NetworkError extends AppError {
  constructor(message: string, suggestion?: string) {
    super(message, 'NETWORK_ERROR', 'error', suggestion);
  }
}

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
};

export const getErrorSuggestion = (error: unknown): string | undefined => {
  if (error instanceof AppError) {
    return error.suggestion;
  }

  // Common error patterns and suggestions
  const message = getErrorMessage(error);

  if (message.includes('JSON')) {
    return 'Check that your JSON file is properly formatted and contains valid syntax.';
  }

  if (
    message.toLowerCase().includes('network') ||
    message.toLowerCase().includes('fetch')
  ) {
    return 'Check your internet connection and try again.';
  }

  if (
    message.toLowerCase().includes('permission') ||
    message.toLowerCase().includes('access')
  ) {
    return 'Make sure you have the necessary permissions to access this file.';
  }

  if (
    message.toLowerCase().includes('validation') ||
    message.toLowerCase().includes('invalid')
  ) {
    return 'Review the validation errors and correct the highlighted fields.';
  }

  return 'Try refreshing the page or contact support if the problem persists.';
};

export const formatValidationErrors = (errors: any[]): ValidationError[] => {
  return errors.map((error, index) => ({
    field: error.path?.join('.') || `error_${index}`,
    message: error.message || 'Validation failed',
    severity: error.severity || 'error',
    path: error.path || [],
    value: error.value,
    suggestion: getValidationSuggestion(error),
  }));
};

const getValidationSuggestion = (error: any): string | undefined => {
  const message = error.message?.toLowerCase() || '';

  if (message.includes('required')) {
    return 'This field is required and cannot be empty.';
  }

  if (message.includes('minimum') || message.includes('min')) {
    return 'The value is too small. Check the minimum allowed value.';
  }

  if (message.includes('maximum') || message.includes('max')) {
    return 'The value is too large. Check the maximum allowed value.';
  }

  if (message.includes('format') || message.includes('pattern')) {
    return 'The format is incorrect. Check the expected format for this field.';
  }

  if (message.includes('type')) {
    return 'The data type is incorrect. Check the expected type for this field.';
  }

  return undefined;
};

export const handleAsyncError = async <T>(
  operation: () => Promise<T>,
  errorHandler?: (error: unknown) => void
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    if (errorHandler) {
      errorHandler(error);
    } else {
      console.error('Async operation failed:', error);
    }
    return null;
  }
};

export const withErrorBoundary = <T extends (...args: any[]) => any>(
  fn: T,
  errorHandler?: (error: unknown) => void
): T => {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);

      // Handle async functions
      if (result instanceof Promise) {
        return result.catch(error => {
          if (errorHandler) {
            errorHandler(error);
          } else {
            console.error('Function execution failed:', error);
          }
          throw error;
        });
      }

      return result;
    } catch (error) {
      if (errorHandler) {
        errorHandler(error);
      } else {
        console.error('Function execution failed:', error);
      }
      throw error;
    }
  }) as T;
};
