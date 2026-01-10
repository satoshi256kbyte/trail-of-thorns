/**
 * Unit tests for InventoryErrorHandler
 * Tests error handling, logging, user notifications, and recovery functionality
 * 
 * 要件: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  InventoryErrorHandler,
  ErrorSeverity,
  InventoryError,
  UserNotificationCallback,
  SafeStateRecoveryCallback,
} from '../../../../game/src/systems/inventory/InventoryErrorHandler';

describe('InventoryErrorHandler', () => {
  let errorHandler: InventoryErrorHandler;
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;
  let consoleInfoSpy: any;

  beforeEach(() => {
    errorHandler = new InventoryErrorHandler();

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error Logging - 要件10.4', () => {
    test('should log error to error log', () => {
      // Arrange
      const error: InventoryError = {
        code: 'TEST_ERROR',
        message: 'Test error message',
        severity: ErrorSeverity.ERROR,
        timestamp: Date.now(),
      };

      // Act
      errorHandler.logError(error);

      // Assert
      const errorLog = errorHandler.getErrorLog();
      expect(errorLog).toHaveLength(1);
      expect(errorLog[0]).toEqual(error);
    });

    test('should log error to console when console logging is enabled', () => {
      // Arrange
      const error: InventoryError = {
        code: 'TEST_ERROR',
        message: 'Test error message',
        severity: ErrorSeverity.ERROR,
        timestamp: Date.now(),
      };

      // Act
      errorHandler.logError(error);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should not log to console when console logging is disabled', () => {
      // Arrange
      errorHandler.updateConfig({ enableConsoleLogging: false });
      const error: InventoryError = {
        code: 'TEST_ERROR',
        message: 'Test error message',
        severity: ErrorSeverity.ERROR,
        timestamp: Date.now(),
      };

      // Act
      errorHandler.logError(error);

      // Assert
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should log INFO severity to console.info', () => {
      // Arrange
      const error: InventoryError = {
        code: 'INFO_ERROR',
        message: 'Info message',
        severity: ErrorSeverity.INFO,
        timestamp: Date.now(),
      };

      // Act
      errorHandler.logError(error);

      // Assert
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    test('should log WARNING severity to console.warn', () => {
      // Arrange
      const error: InventoryError = {
        code: 'WARNING_ERROR',
        message: 'Warning message',
        severity: ErrorSeverity.WARNING,
        timestamp: Date.now(),
      };

      // Act
      errorHandler.logError(error);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    test('should log ERROR severity to console.error', () => {
      // Arrange
      const error: InventoryError = {
        code: 'ERROR_ERROR',
        message: 'Error message',
        severity: ErrorSeverity.ERROR,
        timestamp: Date.now(),
      };

      // Act
      errorHandler.logError(error);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should log CRITICAL severity to console.error', () => {
      // Arrange
      const error: InventoryError = {
        code: 'CRITICAL_ERROR',
        message: 'Critical message',
        severity: ErrorSeverity.CRITICAL,
        timestamp: Date.now(),
      };

      // Act
      errorHandler.logError(error);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should limit error log size to maxErrorLogSize', () => {
      // Arrange
      errorHandler.updateConfig({ maxErrorLogSize: 5 });

      // Act - Add 10 errors
      for (let i = 0; i < 10; i++) {
        errorHandler.logError({
          code: `ERROR_${i}`,
          message: `Error ${i}`,
          severity: ErrorSeverity.ERROR,
          timestamp: Date.now(),
        });
      }

      // Assert
      const errorLog = errorHandler.getErrorLog();
      expect(errorLog).toHaveLength(5);
      expect(errorLog[0].code).toBe('ERROR_5'); // Oldest errors removed
    });

    test('should include context in error log', () => {
      // Arrange
      const error: InventoryError = {
        code: 'TEST_ERROR',
        message: 'Test error',
        severity: ErrorSeverity.ERROR,
        context: { itemId: 'item_1', quantity: 5 },
        timestamp: Date.now(),
      };

      // Act
      errorHandler.logError(error);

      // Assert
      const errorLog = errorHandler.getErrorLog();
      expect(errorLog[0].context).toEqual({ itemId: 'item_1', quantity: 5 });
    });
  });

  describe('User Notifications - 要件10.2', () => {
    test('should notify user with default notification', () => {
      // Act
      errorHandler.notifyUser('Test notification', ErrorSeverity.WARNING);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test notification')
      );
    });

    test('should not notify user when notifications are disabled', () => {
      // Arrange
      errorHandler.updateConfig({ enableUserNotifications: false });

      // Act
      errorHandler.notifyUser('Test notification', ErrorSeverity.WARNING);

      // Assert
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should call custom notification callback when set', () => {
      // Arrange
      const mockCallback: UserNotificationCallback = vi.fn();
      errorHandler.setUserNotificationCallback(mockCallback);

      // Act
      errorHandler.notifyUser('Test notification', ErrorSeverity.ERROR);

      // Assert
      expect(mockCallback).toHaveBeenCalledWith('Test notification', ErrorSeverity.ERROR);
    });

    test('should notify user for ERROR severity in createAndLogError', () => {
      // Arrange
      const mockCallback: UserNotificationCallback = vi.fn();
      errorHandler.setUserNotificationCallback(mockCallback);

      // Act
      errorHandler.createAndLogError(
        'TEST_ERROR',
        'Test error message',
        ErrorSeverity.ERROR
      );

      // Assert
      expect(mockCallback).toHaveBeenCalledWith('Test error message', ErrorSeverity.ERROR);
    });

    test('should notify user for CRITICAL severity in createAndLogError', () => {
      // Arrange
      const mockCallback: UserNotificationCallback = vi.fn();
      errorHandler.setUserNotificationCallback(mockCallback);

      // Act
      errorHandler.createAndLogError(
        'TEST_CRITICAL',
        'Critical error',
        ErrorSeverity.CRITICAL
      );

      // Assert
      expect(mockCallback).toHaveBeenCalledWith('Critical error', ErrorSeverity.CRITICAL);
    });

    test('should not notify user for WARNING severity in createAndLogError', () => {
      // Arrange
      const mockCallback: UserNotificationCallback = vi.fn();
      errorHandler.setUserNotificationCallback(mockCallback);

      // Act
      errorHandler.createAndLogError(
        'TEST_WARNING',
        'Warning message',
        ErrorSeverity.WARNING
      );

      // Assert
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Safe State Recovery - 要件10.5', () => {
    test('should recover to safe state on CRITICAL error', () => {
      // Arrange
      const mockRecoveryCallback: SafeStateRecoveryCallback = vi.fn();
      errorHandler.setSafeStateRecoveryCallback(mockRecoveryCallback);

      const error: InventoryError = {
        code: 'CRITICAL_ERROR',
        message: 'Critical error',
        severity: ErrorSeverity.CRITICAL,
        timestamp: Date.now(),
      };

      // Act
      errorHandler.logError(error);

      // Assert
      expect(mockRecoveryCallback).toHaveBeenCalled();
    });

    test('should not recover to safe state on non-CRITICAL errors', () => {
      // Arrange
      const mockRecoveryCallback: SafeStateRecoveryCallback = vi.fn();
      errorHandler.setSafeStateRecoveryCallback(mockRecoveryCallback);

      const error: InventoryError = {
        code: 'ERROR',
        message: 'Regular error',
        severity: ErrorSeverity.ERROR,
        timestamp: Date.now(),
      };

      // Act
      errorHandler.logError(error);

      // Assert
      expect(mockRecoveryCallback).not.toHaveBeenCalled();
    });

    test('should handle recovery callback errors gracefully', () => {
      // Arrange
      const mockRecoveryCallback: SafeStateRecoveryCallback = vi.fn(() => {
        throw new Error('Recovery failed');
      });
      errorHandler.setSafeStateRecoveryCallback(mockRecoveryCallback);

      const error: InventoryError = {
        code: 'CRITICAL_ERROR',
        message: 'Critical error',
        severity: ErrorSeverity.CRITICAL,
        timestamp: Date.now(),
      };

      // Act & Assert - Should not throw
      expect(() => errorHandler.logError(error)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to recover to safe state'),
        expect.any(Error)
      );
    });

    test('should warn when no recovery callback is set', () => {
      // Arrange
      const error: InventoryError = {
        code: 'CRITICAL_ERROR',
        message: 'Critical error',
        severity: ErrorSeverity.CRITICAL,
        timestamp: Date.now(),
      };

      // Act
      errorHandler.logError(error);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No safe state recovery callback set')
      );
    });
  });

  describe('Default Values - 要件10.1', () => {
    test('should return default item when requested', () => {
      // Act
      const defaultItem = errorHandler.useDefaultValue('defaultItem');

      // Assert
      expect(defaultItem).toBeDefined();
      expect(defaultItem.id).toBe('default_item');
      expect(defaultItem.name).toBe('デフォルトアイテム');
    });

    test('should return default inventory data when requested', () => {
      // Act
      const defaultInventory = errorHandler.useDefaultValue('defaultInventoryData');

      // Assert
      expect(defaultInventory).toBeDefined();
      expect(defaultInventory.maxSlots).toBe(100);
      expect(defaultInventory.usedSlots).toBe(0);
    });

    test('should return default equipment set when requested', () => {
      // Act
      const defaultEquipment = errorHandler.useDefaultValue('defaultEquipmentSet');

      // Assert
      expect(defaultEquipment).toBeDefined();
      expect(defaultEquipment.weapon).toBeNull();
      expect(defaultEquipment.armor).toBeNull();
    });

    test('should log warning when using default value', () => {
      // Act
      errorHandler.useDefaultValue('defaultItem');

      // Assert
      const errorLog = errorHandler.getErrorLog();
      expect(errorLog.some(e => e.code === 'DEFAULT_VALUE_USED')).toBe(true);
    });

    test('should return null for non-existent default value', () => {
      // Act
      const result = errorHandler.useDefaultValue('nonExistentKey');

      // Assert
      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No default value found for key: nonExistentKey')
      );
    });

    test('should allow setting custom default values', () => {
      // Arrange
      const customValue = { custom: 'value' };
      errorHandler.setDefaultValue('customKey', customValue);

      // Act
      const result = errorHandler.useDefaultValue('customKey');

      // Assert
      expect(result).toEqual(customValue);
    });
  });

  describe('Specific Error Handlers', () => {
    test('handleDataLoadError should return default item - 要件10.1', () => {
      // Arrange
      const mockCallback: UserNotificationCallback = vi.fn();
      errorHandler.setUserNotificationCallback(mockCallback);

      // Act
      const result = errorHandler.handleDataLoadError('item_1', new Error('Load failed'));

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('default_item');
      expect(mockCallback).toHaveBeenCalledWith(
        expect.stringContaining('アイテムデータの読み込みに失敗しました'),
        ErrorSeverity.ERROR
      );

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog.some(e => e.code === 'DATA_LOAD_FAILED')).toBe(true);
    });

    test('handleInvalidOperationError should notify user - 要件10.2', () => {
      // Arrange
      const mockCallback: UserNotificationCallback = vi.fn();
      errorHandler.setUserNotificationCallback(mockCallback);

      // Act
      errorHandler.handleInvalidOperationError('addItem', 'インベントリが満杯です');

      // Assert
      expect(mockCallback).toHaveBeenCalledWith(
        expect.stringContaining('操作が拒否されました'),
        ErrorSeverity.WARNING
      );

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog.some(e => e.code === 'INVALID_OPERATION')).toBe(true);
    });

    test('handleEquipmentFailureError should notify user - 要件10.3', () => {
      // Arrange
      const mockCallback: UserNotificationCallback = vi.fn();
      errorHandler.setUserNotificationCallback(mockCallback);

      // Act
      errorHandler.handleEquipmentFailureError('char_1', 'item_1', 'レベルが足りません');

      // Assert
      expect(mockCallback).toHaveBeenCalledWith(
        expect.stringContaining('装備の装着に失敗しました'),
        ErrorSeverity.WARNING
      );

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog.some(e => e.code === 'EQUIPMENT_FAILED')).toBe(true);
    });

    test('handleStorageError should handle save errors', () => {
      // Arrange
      const mockCallback: UserNotificationCallback = vi.fn();
      errorHandler.setUserNotificationCallback(mockCallback);

      // Act
      errorHandler.handleStorageError('save', new Error('Storage full'));

      // Assert
      expect(mockCallback).toHaveBeenCalledWith(
        expect.stringContaining('データの保存に失敗しました'),
        ErrorSeverity.ERROR
      );

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog.some(e => e.code === 'STORAGE_ERROR')).toBe(true);
    });

    test('handleStorageError should handle load errors', () => {
      // Arrange
      const mockCallback: UserNotificationCallback = vi.fn();
      errorHandler.setUserNotificationCallback(mockCallback);

      // Act
      errorHandler.handleStorageError('load', new Error('Data corrupted'));

      // Assert
      expect(mockCallback).toHaveBeenCalledWith(
        expect.stringContaining('データの読み込みに失敗しました'),
        ErrorSeverity.WARNING
      );
    });
  });

  describe('Error Log Management', () => {
    test('should filter error log by severity', () => {
      // Arrange
      errorHandler.createAndLogError('ERROR_1', 'Error 1', ErrorSeverity.ERROR);
      errorHandler.createAndLogError('WARNING_1', 'Warning 1', ErrorSeverity.WARNING);
      errorHandler.createAndLogError('ERROR_2', 'Error 2', ErrorSeverity.ERROR);

      // Act
      const errorLog = errorHandler.getErrorLog(ErrorSeverity.ERROR);

      // Assert
      expect(errorLog).toHaveLength(2);
      expect(errorLog.every(e => e.severity === ErrorSeverity.ERROR)).toBe(true);
    });

    test('should clear error log', () => {
      // Arrange
      errorHandler.createAndLogError('ERROR_1', 'Error 1', ErrorSeverity.ERROR);
      errorHandler.createAndLogError('ERROR_2', 'Error 2', ErrorSeverity.ERROR);

      // Act
      errorHandler.clearErrorLog();

      // Assert
      const errorLog = errorHandler.getErrorLog();
      expect(errorLog).toHaveLength(0);
    });

    test('should return copy of error log', () => {
      // Arrange
      errorHandler.createAndLogError('ERROR_1', 'Error 1', ErrorSeverity.ERROR);

      // Act
      const errorLog1 = errorHandler.getErrorLog();
      const errorLog2 = errorHandler.getErrorLog();

      // Assert
      expect(errorLog1).not.toBe(errorLog2); // Different array instances
      expect(errorLog1).toEqual(errorLog2); // Same content
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration', () => {
      // Act
      errorHandler.updateConfig({
        enableConsoleLogging: false,
        maxErrorLogSize: 50,
      });

      // Assert
      errorHandler.createAndLogError('TEST', 'Test', ErrorSeverity.ERROR);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should merge configuration updates', () => {
      // Arrange
      errorHandler.updateConfig({ enableConsoleLogging: false });

      // Act
      errorHandler.updateConfig({ maxErrorLogSize: 50 });

      // Assert - Console logging should still be disabled
      errorHandler.createAndLogError('TEST', 'Test', ErrorSeverity.ERROR);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('createAndLogError', () => {
    test('should create and log error with all fields', () => {
      // Act
      const error = errorHandler.createAndLogError(
        'TEST_CODE',
        'Test message',
        ErrorSeverity.WARNING,
        { key: 'value' }
      );

      // Assert
      expect(error.code).toBe('TEST_CODE');
      expect(error.message).toBe('Test message');
      expect(error.severity).toBe(ErrorSeverity.WARNING);
      expect(error.context).toEqual({ key: 'value' });
      expect(error.timestamp).toBeDefined();

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog).toContainEqual(error);
    });

    test('should create error without context', () => {
      // Act
      const error = errorHandler.createAndLogError(
        'TEST_CODE',
        'Test message',
        ErrorSeverity.INFO
      );

      // Assert
      expect(error.context).toBeUndefined();
    });
  });

  describe('Debug Information', () => {
    test('should provide debug information', () => {
      // Arrange
      errorHandler.createAndLogError('ERROR_1', 'Error 1', ErrorSeverity.ERROR);
      errorHandler.createAndLogError('WARNING_1', 'Warning 1', ErrorSeverity.WARNING);
      errorHandler.createAndLogError('INFO_1', 'Info 1', ErrorSeverity.INFO);
      errorHandler.createAndLogError('ERROR_2', 'Error 2', ErrorSeverity.ERROR);

      // Act
      const debugInfo = errorHandler.getDebugInfo();

      // Assert
      expect(debugInfo.totalErrors).toBe(4);
      expect(debugInfo.errorsBySeverity[ErrorSeverity.ERROR]).toBe(2);
      expect(debugInfo.errorsBySeverity[ErrorSeverity.WARNING]).toBe(1);
      expect(debugInfo.errorsBySeverity[ErrorSeverity.INFO]).toBe(1);
      expect(debugInfo.errorsBySeverity[ErrorSeverity.CRITICAL]).toBe(0);
      expect(debugInfo.recentErrors).toHaveLength(4);
    });

    test('should limit recent errors to 10', () => {
      // Arrange - Add 15 errors
      for (let i = 0; i < 15; i++) {
        errorHandler.createAndLogError(`ERROR_${i}`, `Error ${i}`, ErrorSeverity.ERROR);
      }

      // Act
      const debugInfo = errorHandler.getDebugInfo();

      // Assert
      expect(debugInfo.recentErrors).toHaveLength(10);
      expect(debugInfo.recentErrors[0].code).toBe('ERROR_5'); // Last 10 errors
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty error log', () => {
      // Act
      const errorLog = errorHandler.getErrorLog();
      const debugInfo = errorHandler.getDebugInfo();

      // Assert
      expect(errorLog).toHaveLength(0);
      expect(debugInfo.totalErrors).toBe(0);
    });

    test('should handle multiple callback invocations', () => {
      // Arrange
      const mockCallback: UserNotificationCallback = vi.fn();
      errorHandler.setUserNotificationCallback(mockCallback);

      // Act
      errorHandler.notifyUser('Message 1', ErrorSeverity.ERROR);
      errorHandler.notifyUser('Message 2', ErrorSeverity.WARNING);

      // Assert
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });

    test('should handle rapid error logging', () => {
      // Act - Log 100 errors rapidly
      for (let i = 0; i < 100; i++) {
        errorHandler.createAndLogError(`ERROR_${i}`, `Error ${i}`, ErrorSeverity.ERROR);
      }

      // Assert
      const errorLog = errorHandler.getErrorLog();
      expect(errorLog.length).toBeLessThanOrEqual(100);
    });
  });
});
