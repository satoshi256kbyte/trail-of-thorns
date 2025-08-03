import { useCallback } from 'react';
import { useNotification } from '../components/NotificationSystem';
import {
  getErrorMessage,
  getErrorSuggestion,
  AppError,
} from '../utils/errorHandling';

export const useErrorHandler = () => {
  const { showError, showWarning } = useNotification();

  const handleError = useCallback(
    (error: unknown, context?: string) => {
      const message = getErrorMessage(error);
      const suggestion = getErrorSuggestion(error);

      const title = context ? `${context} Error` : 'Error';
      const fullMessage = suggestion
        ? `${message}\n\n💡 ${suggestion}`
        : message;

      if (error instanceof AppError && error.severity === 'warning') {
        showWarning(fullMessage, title);
      } else {
        showError(fullMessage, title);
      }

      // Log error for debugging
      console.error(`[${title}]`, error);
    },
    [showError, showWarning]
  );

  const handleAsyncError = useCallback(
    async <T>(
      operation: () => Promise<T>,
      context?: string
    ): Promise<T | null> => {
      try {
        return await operation();
      } catch (error) {
        handleError(error, context);
        return null;
      }
    },
    [handleError]
  );

  return {
    handleError,
    handleAsyncError,
  };
};
