import {
  AppError,
  ValidationAppError,
  FileError,
  NetworkError,
  getErrorMessage,
  getErrorSuggestion,
  formatValidationErrors,
  handleAsyncError,
  withErrorBoundary,
} from '../utils/errorHandling';

describe('Error Handling Utilities', () => {
  describe('AppError', () => {
    it('creates error with default values', () => {
      const error = new AppError('Test message');

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.severity).toBe('error');
      expect(error.suggestion).toBeUndefined();
      expect(error.field).toBeUndefined();
    });

    it('creates error with custom values', () => {
      const error = new AppError(
        'Custom message',
        'CUSTOM_CODE',
        'warning',
        'Custom suggestion',
        'custom.field'
      );

      expect(error.message).toBe('Custom message');
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.severity).toBe('warning');
      expect(error.suggestion).toBe('Custom suggestion');
      expect(error.field).toBe('custom.field');
    });
  });

  describe('ValidationAppError', () => {
    it('creates validation error with errors array', () => {
      const validationErrors = [
        {
          field: 'test',
          message: 'Test error',
          severity: 'error' as const,
          path: ['test'],
        },
      ];

      const error = new ValidationAppError(
        'Validation failed',
        validationErrors
      );

      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.errors).toEqual(validationErrors);
    });
  });

  describe('FileError', () => {
    it('creates file error', () => {
      const error = new FileError('File not found', 'Check file path');

      expect(error.message).toBe('File not found');
      expect(error.code).toBe('FILE_ERROR');
      expect(error.suggestion).toBe('Check file path');
    });
  });

  describe('NetworkError', () => {
    it('creates network error', () => {
      const error = new NetworkError(
        'Connection failed',
        'Check internet connection'
      );

      expect(error.message).toBe('Connection failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.suggestion).toBe('Check internet connection');
    });
  });

  describe('getErrorMessage', () => {
    it('extracts message from AppError', () => {
      const error = new AppError('App error message');
      expect(getErrorMessage(error)).toBe('App error message');
    });

    it('extracts message from regular Error', () => {
      const error = new Error('Regular error message');
      expect(getErrorMessage(error)).toBe('Regular error message');
    });

    it('returns string error as-is', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('returns default message for unknown error types', () => {
      expect(getErrorMessage(null)).toBe('An unknown error occurred');
      expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
      expect(getErrorMessage(123)).toBe('An unknown error occurred');
    });
  });

  describe('getErrorSuggestion', () => {
    it('returns suggestion from AppError', () => {
      const error = new AppError('Test', 'CODE', 'error', 'Test suggestion');
      expect(getErrorSuggestion(error)).toBe('Test suggestion');
    });

    it('provides JSON-related suggestion', () => {
      const error = new Error('Invalid JSON format');
      expect(getErrorSuggestion(error)).toContain(
        'JSON file is properly formatted'
      );
    });

    it('provides network-related suggestion', () => {
      const error = new Error('Network request failed');
      expect(getErrorSuggestion(error)).toContain('internet connection');
    });

    it('provides permission-related suggestion', () => {
      const error = new Error('Access denied');
      expect(getErrorSuggestion(error)).toContain('permissions');
    });

    it('provides validation-related suggestion', () => {
      const error = new Error('Validation failed');
      expect(getErrorSuggestion(error)).toContain('validation errors');
    });

    it('provides default suggestion for unknown errors', () => {
      const error = new Error('Unknown error');
      expect(getErrorSuggestion(error)).toContain('Try refreshing');
    });
  });

  describe('formatValidationErrors', () => {
    it('formats validation errors correctly', () => {
      const rawErrors = [
        {
          path: ['user', 'name'],
          message: 'Name is required',
          severity: 'error',
          value: '',
        },
        {
          message: 'Unknown error',
        },
      ];

      const formatted = formatValidationErrors(rawErrors);

      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toEqual({
        field: 'user.name',
        message: 'Name is required',
        severity: 'error',
        path: ['user', 'name'],
        value: '',
        suggestion: 'This field is required and cannot be empty.',
      });
      expect(formatted[1]).toEqual({
        field: 'error_1',
        message: 'Unknown error',
        severity: 'error',
        path: [],
        value: undefined,
        suggestion: undefined,
      });
    });
  });

  describe('handleAsyncError', () => {
    it('returns result when operation succeeds', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await handleAsyncError(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('returns null when operation fails', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));
      const result = await handleAsyncError(operation);

      expect(result).toBeNull();
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('calls error handler when provided', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));
      const errorHandler = jest.fn();

      await handleAsyncError(operation, errorHandler);

      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('withErrorBoundary', () => {
    it('returns result when function succeeds', () => {
      const fn = jest.fn().mockReturnValue('success');
      const wrappedFn = withErrorBoundary(fn);

      const result = wrappedFn();

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('calls error handler and re-throws when function fails', () => {
      const error = new Error('Test error');
      const fn = jest.fn().mockImplementation(() => {
        throw error;
      });
      const errorHandler = jest.fn();
      const wrappedFn = withErrorBoundary(fn, errorHandler);

      expect(() => wrappedFn()).toThrow(error);
      expect(errorHandler).toHaveBeenCalledWith(error);
    });

    it('handles async functions', async () => {
      const asyncFn = jest.fn().mockResolvedValue('async success');
      const wrappedFn = withErrorBoundary(asyncFn);

      const result = await wrappedFn();

      expect(result).toBe('async success');
    });

    it('handles async function errors', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const errorHandler = jest.fn();
      const wrappedFn = withErrorBoundary(asyncFn, errorHandler);

      await expect(wrappedFn()).rejects.toThrow(error);
      expect(errorHandler).toHaveBeenCalledWith(error);
    });
  });
});
