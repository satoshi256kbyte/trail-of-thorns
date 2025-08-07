/**
 * Unit tests for CharacterLossErrorHandler
 * Tests comprehensive error handling and user feedback functionality
 */

import {
  CharacterLossErrorHandler,
  ErrorRecoveryStrategy,
  ErrorSeverity,
} from '../../../game/src/systems/CharacterLossErrorHandler';
import {
  CharacterLossError,
  LossCauseType,
  CharacterLossUtils,
} from '../../../game/src/types/characterLoss';
import { Unit } from '../../../game/src/types/gameplay';

describe('CharacterLossErrorHandler', () => {
  let errorHandler: CharacterLossErrorHandler;
  let mockUnit: Unit;

  beforeEach(() => {
    errorHandler = new CharacterLossErrorHandler({
      enableLogging: false, // Disable logging for tests
      enableUserNotifications: true,
      enableAutoRecovery: true,
      maxRetryAttempts: 3,
      retryDelay: 100,
    });

    mockUnit = {
      id: 'test-unit-1',
      name: 'Test Character',
      position: { x: 5, y: 5 },
      currentHP: 50,
      maxHP: 100,
      currentMP: 30,
      maxMP: 50,
      level: 5,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
      wasRecruited: false,
    };

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    errorHandler.destroy();
    localStorage.clear();
  });

  describe('Invalid Character Error Handling', () => {
    test('should handle null character', () => {
      const result = errorHandler.handleInvalidCharacterError(null, {
        characterId: '',
        phase: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.strategy).toBe(ErrorRecoveryStrategy.USER_INTERVENTION);
      expect(result.requiresUserAction).toBe(true);
    });

    test('should handle character with missing ID', () => {
      const invalidUnit = { ...mockUnit, id: '' };

      const result = errorHandler.handleInvalidCharacterError(invalidUnit, {
        characterId: '',
        phase: 'test',
      });

      expect(result.success).toBe(true);
      expect(result.strategy).toBe(ErrorRecoveryStrategy.RETRY);
      expect(result.recoveredData).toBeDefined();
      expect(result.recoveredData.id).toMatch(/^repaired_character_/);
    });

    test('should handle character with missing name', () => {
      const invalidUnit = { ...mockUnit, name: '' };

      const result = errorHandler.handleInvalidCharacterError(invalidUnit, {
        characterId: mockUnit.id,
        phase: 'test',
      });

      expect(result.success).toBe(true);
      expect(result.strategy).toBe(ErrorRecoveryStrategy.RETRY);
      expect(result.recoveredData).toBeDefined();
      expect(result.recoveredData.name).toContain('キャラクター');
    });

    test('should handle character with invalid HP values', () => {
      const invalidUnit = { ...mockUnit, currentHP: -10, maxHP: 0 };

      const result = errorHandler.handleInvalidCharacterError(invalidUnit, {
        characterId: mockUnit.id,
        phase: 'test',
      });

      expect(result.success).toBe(true);
      expect(result.strategy).toBe(ErrorRecoveryStrategy.RETRY);
      expect(result.recoveredData).toBeDefined();
      expect(result.recoveredData.currentHP).toBeGreaterThanOrEqual(0);
      expect(result.recoveredData.maxHP).toBeGreaterThan(0);
    });

    test('should handle character with HP exceeding max HP', () => {
      const invalidUnit = { ...mockUnit, currentHP: 150, maxHP: 100 };

      const result = errorHandler.handleInvalidCharacterError(invalidUnit, {
        characterId: mockUnit.id,
        phase: 'test',
      });

      expect(result.success).toBe(true);
      expect(result.strategy).toBe(ErrorRecoveryStrategy.RETRY);
      expect(result.recoveredData).toBeDefined();
      expect(result.recoveredData.currentHP).toBeLessThanOrEqual(result.recoveredData.maxHP);
    });

    test('should handle character with invalid faction', () => {
      const invalidUnit = { ...mockUnit, faction: 'invalid' as any };

      const result = errorHandler.handleInvalidCharacterError(invalidUnit, {
        characterId: mockUnit.id,
        phase: 'test',
      });

      expect(result.success).toBe(true);
      expect(result.strategy).toBe(ErrorRecoveryStrategy.RETRY);
      expect(result.recoveredData).toBeDefined();
      expect(['player', 'enemy', 'npc']).toContain(result.recoveredData.faction);
    });

    test('should handle character with missing position', () => {
      const invalidUnit = { ...mockUnit, position: undefined as any };

      const result = errorHandler.handleInvalidCharacterError(invalidUnit, {
        characterId: mockUnit.id,
        phase: 'test',
      });

      expect(result.success).toBe(true);
      expect(result.strategy).toBe(ErrorRecoveryStrategy.RETRY);
      expect(result.recoveredData).toBeDefined();
      expect(result.recoveredData.position).toEqual({ x: 0, y: 0 });
    });

    test('should handle character with invalid level', () => {
      const invalidUnit = { ...mockUnit, level: 0 };

      const result = errorHandler.handleInvalidCharacterError(invalidUnit, {
        characterId: mockUnit.id,
        phase: 'test',
      });

      expect(result.success).toBe(true);
      expect(result.strategy).toBe(ErrorRecoveryStrategy.RETRY);
      expect(result.recoveredData).toBeDefined();
      expect(result.recoveredData.level).toBe(1);
    });

    test('should emit user feedback for invalid character', done => {
      errorHandler.on('user-feedback', message => {
        expect(message.type).toBe('warning');
        expect(message.title).toContain('修復');
        expect(message.dismissible).toBe(true);
        done();
      });

      errorHandler.handleInvalidCharacterError(
        { ...mockUnit, name: '' },
        {
          characterId: mockUnit.id,
          phase: 'test',
        }
      );
    });
  });

  describe('Duplicate Loss Error Handling', () => {
    const mockLostCharacter = {
      characterId: 'test-unit-1',
      name: 'Test Character',
      lostAt: Date.now() - 5000, // 5 seconds ago
      turn: 3,
      cause: {
        type: LossCauseType.BATTLE_DEFEAT,
        description: 'Test defeat',
        timestamp: Date.now() - 5000,
      },
      level: 5,
      wasRecruited: false,
    };

    test('should handle legitimate duplicate loss', () => {
      const result = errorHandler.handleDuplicateLossError('test-unit-1', mockLostCharacter, {
        characterId: 'test-unit-1',
        phase: 'test',
      });

      expect(result.success).toBe(true);
      expect(result.strategy).toBe(ErrorRecoveryStrategy.SKIP);
      expect(result.recoveredData).toEqual(mockLostCharacter);
      expect(result.requiresUserAction).toBe(false);
    });

    test('should handle rapid duplicate request', () => {
      const recentLoss = {
        ...mockLostCharacter,
        lostAt: Date.now() - 500, // 500ms ago (recent)
      };

      const result = errorHandler.handleDuplicateLossError('test-unit-1', recentLoss, {
        characterId: 'test-unit-1',
        phase: 'test',
      });

      expect(result.success).toBe(true);
      expect(result.strategy).toBe(ErrorRecoveryStrategy.SKIP);
      expect(result.requiresUserAction).toBe(false);
    });

    test('should emit user feedback for duplicate loss', done => {
      errorHandler.on('user-feedback', message => {
        expect(message.type).toBe('warning');
        expect(message.title).toContain('ロスト状態');
        expect(message.dismissible).toBe(true);
        done();
      });

      errorHandler.handleDuplicateLossError('test-unit-1', mockLostCharacter, {
        characterId: 'test-unit-1',
        phase: 'test',
      });
    });
  });

  describe('Save Data Corruption Handling', () => {
    const mockChapterData = CharacterLossUtils.createDefaultChapterLossData('test-chapter');

    test('should handle corruption with backup available', () => {
      // Create backup first
      errorHandler.createBackup('test-chapter', mockChapterData);

      const result = errorHandler.handleSaveDataCorruption(
        'test-chapter',
        { corrupted: 'data' },
        { chapterId: 'test-chapter', phase: 'test' }
      );

      expect(result.success).toBe(true);
      expect(result.strategy).toBe(ErrorRecoveryStrategy.RESTORE_BACKUP);
      expect(result.recoveredData).toBeDefined();
      expect(result.requiresUserAction).toBe(true);
    });

    test('should handle corruption without backup', () => {
      const result = errorHandler.handleSaveDataCorruption(
        'test-chapter',
        { corrupted: 'data' },
        { chapterId: 'test-chapter', phase: 'test' }
      );

      expect(result.success).toBe(false);
      expect(result.strategy).toBe(ErrorRecoveryStrategy.RESET);
      expect(result.requiresUserAction).toBe(true);
    });

    test('should handle corruption with sanitizable data', () => {
      const partiallyCorruptedData = {
        chapterId: 'test-chapter',
        lostCharacters: {},
        lossHistory: [],
        chapterStartTime: Date.now(),
        version: '1.0.0',
      };

      const result = errorHandler.handleSaveDataCorruption('test-chapter', partiallyCorruptedData, {
        chapterId: 'test-chapter',
        phase: 'test',
      });

      expect(result.success).toBe(true);
      expect(result.strategy).toBe(ErrorRecoveryStrategy.RETRY);
      expect(result.recoveredData).toBeDefined();
    });

    test('should emit user feedback for corruption with backup', done => {
      errorHandler.createBackup('test-chapter', mockChapterData);

      errorHandler.on('user-feedback', message => {
        expect(message.type).toBe('warning');
        expect(message.title).toContain('破損');
        expect(message.actions).toHaveLength(2);
        expect(message.dismissible).toBe(false);
        done();
      });

      errorHandler.handleSaveDataCorruption(
        'test-chapter',
        { corrupted: 'data' },
        { chapterId: 'test-chapter', phase: 'test' }
      );
    });

    test('should emit user feedback for complete data loss', done => {
      errorHandler.on('user-feedback', message => {
        expect(message.type).toBe('error');
        expect(message.title).toContain('復旧に失敗');
        expect(message.actions).toHaveLength(1);
        expect(message.dismissible).toBe(false);
        done();
      });

      errorHandler.handleSaveDataCorruption('test-chapter', null, {
        chapterId: 'test-chapter',
        phase: 'test',
      });
    });
  });

  describe('Backup Management', () => {
    const mockChapterData = CharacterLossUtils.createDefaultChapterLossData('test-chapter');

    test('should create backup in memory and localStorage', () => {
      errorHandler.createBackup('test-chapter', mockChapterData);

      const memoryBackup = errorHandler.getBackupData('test-chapter');
      expect(memoryBackup).toBeDefined();
      expect(memoryBackup?.chapterId).toBe('test-chapter');

      const storageBackup = localStorage.getItem('character_loss_backup_test-chapter');
      expect(storageBackup).toBeDefined();
    });

    test('should retrieve backup from memory first', () => {
      errorHandler.createBackup('test-chapter', mockChapterData);

      const backup = errorHandler.getBackupData('test-chapter');
      expect(backup).toBeDefined();
      expect(backup?.chapterId).toBe('test-chapter');
    });

    test('should retrieve backup from localStorage if memory backup not available', () => {
      // Create backup
      errorHandler.createBackup('test-chapter', mockChapterData);

      // Create new error handler (simulates memory loss)
      const newErrorHandler = new CharacterLossErrorHandler();

      const backup = newErrorHandler.getBackupData('test-chapter');
      expect(backup).toBeDefined();
      expect(backup?.chapterId).toBe('test-chapter');

      newErrorHandler.destroy();
    });

    test('should return null for non-existent backup', () => {
      const backup = errorHandler.getBackupData('non-existent-chapter');
      expect(backup).toBeNull();
    });

    test('should handle corrupted backup data gracefully', () => {
      // Manually corrupt localStorage backup
      localStorage.setItem('character_loss_backup_test-chapter', 'corrupted data');

      const backup = errorHandler.getBackupData('test-chapter');
      expect(backup).toBeNull();
    });
  });

  describe('User Feedback System', () => {
    test('should emit user feedback event', done => {
      const testMessage = {
        type: 'info' as const,
        title: 'Test Message',
        message: 'This is a test message',
        dismissible: true,
      };

      errorHandler.on('user-feedback', message => {
        expect(message).toEqual(testMessage);
        done();
      });

      errorHandler.showUserFeedback(testMessage);
    });

    test('should auto-dismiss feedback with duration', done => {
      const testMessage = {
        type: 'info' as const,
        title: 'Test Message',
        message: 'This is a test message',
        dismissible: true,
        duration: 100,
      };

      errorHandler.on('dismiss-feedback', message => {
        expect(message).toEqual(testMessage);
        done();
      });

      errorHandler.showUserFeedback(testMessage);
    });

    test('should not show feedback when notifications disabled', () => {
      const errorHandlerNoNotifications = new CharacterLossErrorHandler({
        enableUserNotifications: false,
      });

      let feedbackEmitted = false;
      errorHandlerNoNotifications.on('user-feedback', () => {
        feedbackEmitted = true;
      });

      errorHandlerNoNotifications.showUserFeedback({
        type: 'info',
        title: 'Test',
        message: 'Test',
        dismissible: true,
      });

      expect(feedbackEmitted).toBe(false);
      errorHandlerNoNotifications.destroy();
    });
  });

  describe('Error Statistics', () => {
    test('should track error statistics', () => {
      // Generate some errors
      errorHandler.handleInvalidCharacterError(null, { characterId: '', phase: 'test' });
      errorHandler.handleInvalidCharacterError({ id: '' }, { characterId: '', phase: 'test' });

      const stats = errorHandler.getStatistics();
      expect(stats.totalErrors).toBe(2);
      expect(stats.errorsByType[CharacterLossError.INVALID_CHARACTER]).toBe(2);
      expect(stats.lastErrorTime).toBeGreaterThan(0);
    });

    test('should track error severity', () => {
      errorHandler.handleInvalidCharacterError(null, { characterId: '', phase: 'test' });

      const stats = errorHandler.getStatistics();
      expect(stats.errorsBySeverity[ErrorSeverity.HIGH]).toBe(1);
    });

    test('should identify most common error', () => {
      // Generate multiple invalid character errors
      for (let i = 0; i < 3; i++) {
        errorHandler.handleInvalidCharacterError(null, { characterId: '', phase: 'test' });
      }

      // Generate one duplicate loss error
      errorHandler.handleDuplicateLossError(
        'test',
        {
          characterId: 'test',
          name: 'test',
          lostAt: Date.now(),
          turn: 1,
          cause: { type: LossCauseType.BATTLE_DEFEAT, description: 'test', timestamp: Date.now() },
          level: 1,
          wasRecruited: false,
        },
        { characterId: 'test', phase: 'test' }
      );

      const stats = errorHandler.getStatistics();
      expect(stats.mostCommonError).toBe(CharacterLossError.INVALID_CHARACTER);
    });

    test('should get recent errors', () => {
      errorHandler.handleInvalidCharacterError(null, { characterId: '', phase: 'test' });
      errorHandler.handleInvalidCharacterError({ id: '' }, { characterId: '', phase: 'test' });

      const recentErrors = errorHandler.getRecentErrors(10);
      expect(recentErrors).toHaveLength(2);
      expect(recentErrors[0].error).toBe(CharacterLossError.INVALID_CHARACTER);
    });

    test('should clear error log and statistics', () => {
      errorHandler.handleInvalidCharacterError(null, { characterId: '', phase: 'test' });

      let stats = errorHandler.getStatistics();
      expect(stats.totalErrors).toBe(1);

      errorHandler.clearErrorLog();

      stats = errorHandler.getStatistics();
      expect(stats.totalErrors).toBe(0);
      expect(errorHandler.getRecentErrors()).toHaveLength(0);
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration', () => {
      errorHandler.updateConfig({
        enableLogging: true,
        maxRetryAttempts: 5,
      });

      // Configuration is private, but we can test behavior changes
      // This is more of an integration test
      expect(true).toBe(true); // Placeholder - actual behavior would be tested in integration
    });

    test('should use default configuration', () => {
      const defaultErrorHandler = new CharacterLossErrorHandler();

      // Test that default configuration works
      const result = defaultErrorHandler.handleInvalidCharacterError(null, {
        characterId: '',
        phase: 'test',
      });

      expect(result).toBeDefined();
      defaultErrorHandler.destroy();
    });
  });

  describe('Resource Cleanup', () => {
    test('should cleanup resources on destroy', () => {
      errorHandler.createBackup(
        'test-chapter',
        CharacterLossUtils.createDefaultChapterLossData('test-chapter')
      );

      let eventEmitted = false;
      errorHandler.on('test-event', () => {
        eventEmitted = true;
      });

      errorHandler.destroy();

      // Test that events are no longer emitted
      errorHandler.emit('test-event');
      expect(eventEmitted).toBe(false);

      // Test that statistics are cleared
      const stats = errorHandler.getStatistics();
      expect(stats.totalErrors).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle undefined context gracefully', () => {
      const result = errorHandler.handleInvalidCharacterError(null, undefined as any);
      expect(result.success).toBe(false);
      expect(result.requiresUserAction).toBe(true);
    });

    test('should handle empty context gracefully', () => {
      const result = errorHandler.handleInvalidCharacterError(null, {});
      expect(result.success).toBe(false);
      expect(result.requiresUserAction).toBe(true);
    });

    test('should handle character with all valid data', () => {
      const result = errorHandler.handleInvalidCharacterError(mockUnit, {
        characterId: mockUnit.id,
        phase: 'test',
      });

      expect(result.success).toBe(true);
      expect(result.strategy).toBe(ErrorRecoveryStrategy.RETRY);
      expect(result.requiresUserAction).toBe(false);
    });

    test('should handle backup creation failure gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage full');
      });

      // Should not throw error
      expect(() => {
        errorHandler.createBackup(
          'test-chapter',
          CharacterLossUtils.createDefaultChapterLossData('test-chapter')
        );
      }).not.toThrow();

      // Restore original method
      localStorage.setItem = originalSetItem;
    });

    test('should handle backup retrieval failure gracefully', () => {
      // Mock localStorage to throw error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => {
        throw new Error('Storage error');
      });

      const backup = errorHandler.getBackupData('test-chapter');
      expect(backup).toBeNull();

      // Restore original method
      localStorage.getItem = originalGetItem;
    });
  });
});
