/**
 * Character Loss Data Persistence Tests
 * Tests for save/load functionality and data integrity
 */

import { CharacterLossManager } from '../../../game/src/systems/CharacterLossManager';
import { CharacterLossState } from '../../../game/src/systems/CharacterLossState';
import {
  CharacterLossUtils,
  LossCauseType,
  DangerLevel,
} from '../../../game/src/types/characterLoss';
import { Unit } from '../../../game/src/types/gameplay';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    length: Object.keys(store).length,
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

// Mock Phaser Scene
const mockScene = {
  add: { existing: jest.fn() },
  events: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
} as any;

// Helper function to create mock unit
const createMockUnit = (id: string, name: string, currentHP: number = 100): Unit => ({
  id,
  name,
  position: { x: 0, y: 0 },
  currentHP,
  stats: { maxHP: 100, attack: 10, defense: 5, speed: 8, movement: 3 },
  level: 1,
  faction: 'player',
  hasActed: false,
  hasMoved: false,
  wasRecruited: false,
});

describe('CharacterLossManager - Data Persistence', () => {
  let manager: CharacterLossManager;
  let mockUnits: Unit[];

  beforeEach(() => {
    // Clear localStorage mock
    localStorageMock.clear();

    // Mock global localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Create manager instance
    manager = new CharacterLossManager(mockScene);

    // Create mock units
    mockUnits = [
      createMockUnit('player1', 'Hero', 100),
      createMockUnit('player2', 'Warrior', 80),
      createMockUnit('enemy1', 'Goblin', 50),
    ];
    mockUnits[2].faction = 'enemy';

    // Initialize chapter
    manager.initializeChapter('test-chapter', mockUnits);
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Save Chapter State', () => {
    test('should save chapter state successfully', () => {
      const result = manager.saveChapterState();

      expect(result.success).toBe(true);
      expect(result.message).toContain('saved successfully');
      expect(result.details).toHaveProperty('chapterId', 'test-chapter');
      expect(result.details).toHaveProperty('dataSize');
      expect(result.details).toHaveProperty('savedAt');
    });

    test('should save chapter state with loss data', async () => {
      // Process a character loss
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      await manager.processCharacterLoss(mockUnits[1], cause);

      const result = manager.saveChapterState();

      expect(result.success).toBe(true);

      // Verify data was saved
      const storageKey = 'character_loss_test-chapter';
      const savedData = localStorageMock.getItem(storageKey);
      expect(savedData).not.toBeNull();

      const parsedData = JSON.parse(savedData!);
      expect(parsedData.chapterId).toBe('test-chapter');
      expect(Object.keys(parsedData.lostCharacters)).toHaveLength(1);
      expect(parsedData.lossHistory).toHaveLength(1);
    });

    test('should fail to save when chapter not initialized', () => {
      const uninitializedManager = new CharacterLossManager(mockScene);
      const result = uninitializedManager.saveChapterState();

      expect(result.success).toBe(false);
      expect(result.message).toContain('must be initialized');
    });

    test('should save manager state along with chapter data', () => {
      manager.saveChapterState();

      const managerStateKey = 'character_loss_manager_state';
      const managerState = localStorageMock.getItem(managerStateKey);
      expect(managerState).not.toBeNull();

      const parsedManagerState = JSON.parse(managerState!);
      expect(parsedManagerState.currentChapterId).toBe('test-chapter');
      expect(parsedManagerState).toHaveProperty('savedAt');
    });
  });

  describe('Load Chapter State', () => {
    test('should load chapter state successfully', () => {
      // Save first
      manager.saveChapterState();

      // Create new manager and load
      const newManager = new CharacterLossManager(mockScene);
      const result = newManager.loadChapterState('test-chapter');

      expect(result.success).toBe(true);
      expect(result.message).toContain('loaded successfully');
      expect(result.details).toHaveProperty('chapterId', 'test-chapter');
    });

    test('should load chapter state with loss data', async () => {
      // Process a character loss and save
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      await manager.processCharacterLoss(mockUnits[1], cause);
      manager.saveChapterState();

      // Create new manager and load
      const newManager = new CharacterLossManager(mockScene);
      const result = newManager.loadChapterState('test-chapter');

      expect(result.success).toBe(true);
      expect(result.details?.lossCount).toBe(1);

      // Verify loss data was loaded correctly
      expect(newManager.isCharacterLost('player2')).toBe(true);
      expect(newManager.getLostCharacters()).toHaveLength(1);
    });

    test('should handle missing save data gracefully', () => {
      const newManager = new CharacterLossManager(mockScene);
      const result = newManager.loadChapterState('nonexistent-chapter');

      expect(result.success).toBe(true);
      expect(result.message).toContain('No saved data found');
      expect(result.details?.wasEmpty).toBe(true);
    });

    test('should handle corrupted save data', () => {
      // Save corrupted data
      const storageKey = 'character_loss_test-chapter';
      localStorageMock.setItem(storageKey, 'invalid json data');

      const newManager = new CharacterLossManager(mockScene);
      const result = newManager.loadChapterState('test-chapter');

      expect(result.success).toBe(true);
      expect(result.message).toContain('recovered by resetting');
      expect(result.details?.recoveryMethod).toBe('reset_to_default');
    });

    test('should load manager state when available', async () => {
      // Process losses and save
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      await manager.processCharacterLoss(mockUnits[1], cause);
      manager.saveChapterState();

      // Create new manager and load
      const newManager = new CharacterLossManager(mockScene);
      newManager.loadChapterState('test-chapter');

      // Manager state should be restored (though we can't directly access private state)
      expect(newManager.isCharacterLost('player2')).toBe(true);
    });
  });

  describe('Backup and Recovery', () => {
    test('should create backup data during auto-save', async () => {
      // Process a loss to create data
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      await manager.processCharacterLoss(mockUnits[1], cause);

      // Auto-save should create backup
      manager.autoSave();

      // Check backup exists
      const backupKey = 'character_loss_backup_test-chapter';
      const backupData = localStorageMock.getItem(backupKey);
      expect(backupData).not.toBeNull();

      const parsedBackup = JSON.parse(backupData!);
      expect(parsedBackup.chapterId).toBe('test-chapter');
      expect(Object.keys(parsedBackup.lostCharacters)).toHaveLength(1);
    });

    test('should recover from backup when main data is corrupted', async () => {
      // Create and save valid data
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      await manager.processCharacterLoss(mockUnits[1], cause);
      manager.autoSave();

      // Corrupt main data but keep backup
      const storageKey = 'character_loss_test-chapter';
      localStorageMock.setItem(storageKey, 'corrupted data');

      // Load should recover from backup
      const newManager = new CharacterLossManager(mockScene);
      const result = newManager.loadChapterState('test-chapter');

      expect(result.success).toBe(true);
      expect(result.message).toContain('restored from backup');
      expect(result.details?.recoveryMethod).toBe('backup_restore');
      expect(newManager.isCharacterLost('player2')).toBe(true);
    });

    test('should reset to default when both main and backup are corrupted', () => {
      // Set corrupted data for both main and backup
      const storageKey = 'character_loss_test-chapter';
      const backupKey = 'character_loss_backup_test-chapter';
      localStorageMock.setItem(storageKey, 'corrupted main data');
      localStorageMock.setItem(backupKey, 'corrupted backup data');

      const newManager = new CharacterLossManager(mockScene);
      const result = newManager.loadChapterState('test-chapter');

      expect(result.success).toBe(true);
      expect(result.message).toContain('reset to default state');
      expect(result.details?.recoveryMethod).toBe('reset_to_default');
    });
  });

  describe('Chapter Completion', () => {
    test('should complete chapter and clear save data', async () => {
      // Process a loss and save
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      await manager.processCharacterLoss(mockUnits[1], cause);
      manager.saveChapterState();

      // Complete chapter
      const result = manager.completeChapter();

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary?.lostCharacters).toHaveLength(1);
      expect(result.summary?.isPerfectClear).toBe(false);

      // Verify save data was cleared
      const storageKey = 'character_loss_test-chapter';
      const savedData = localStorageMock.getItem(storageKey);
      expect(savedData).toBeNull();
    });

    test('should handle perfect clear chapter completion', () => {
      // Complete chapter without any losses
      const result = manager.completeChapter();

      expect(result.success).toBe(true);
      expect(result.summary?.isPerfectClear).toBe(true);
      expect(result.summary?.lostCharacters).toHaveLength(0);
    });
  });

  describe('Chapter Suspension and Resumption', () => {
    test('should suspend chapter successfully', () => {
      const result = manager.suspendChapter();

      expect(result.success).toBe(true);
      expect(result.message).toContain('suspended successfully');
      expect(result.details?.chapterId).toBe('test-chapter');

      // Verify suspend data was saved
      const suspendKey = 'character_loss_suspend_test-chapter';
      const suspendData = localStorageMock.getItem(suspendKey);
      expect(suspendData).not.toBeNull();

      const parsedSuspendData = JSON.parse(suspendData!);
      expect(parsedSuspendData.chapterId).toBe('test-chapter');
      expect(parsedSuspendData).toHaveProperty('suspendedAt');
      expect(parsedSuspendData).toHaveProperty('gameState');
      expect(parsedSuspendData).toHaveProperty('units');
    });

    test('should resume chapter successfully', () => {
      // Suspend first
      manager.suspendChapter();

      // Create new manager and resume
      const newManager = new CharacterLossManager(mockScene);
      const result = newManager.resumeChapter('test-chapter', mockUnits);

      expect(result.success).toBe(true);
      expect(result.message).toContain('resumed successfully');
      expect(result.details?.chapterId).toBe('test-chapter');

      // Verify suspend data was cleaned up
      const suspendKey = 'character_loss_suspend_test-chapter';
      const suspendData = localStorageMock.getItem(suspendKey);
      expect(suspendData).toBeNull();
    });

    test('should resume chapter with loss data', async () => {
      // Process a loss, suspend, then resume
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      await manager.processCharacterLoss(mockUnits[1], cause);
      manager.suspendChapter();

      const newManager = new CharacterLossManager(mockScene);
      const result = newManager.resumeChapter('test-chapter', mockUnits);

      expect(result.success).toBe(true);
      expect(result.details?.lostCharacters).toBe(1);
      expect(newManager.isCharacterLost('player2')).toBe(true);
    });

    test('should check for suspended data', () => {
      expect(manager.hasSuspendedData('test-chapter')).toBe(false);

      manager.suspendChapter();
      expect(manager.hasSuspendedData('test-chapter')).toBe(true);
    });

    test('should clear suspended data', () => {
      manager.suspendChapter();
      expect(manager.hasSuspendedData('test-chapter')).toBe(true);

      const result = manager.clearSuspendedData('test-chapter');
      expect(result.success).toBe(true);
      expect(manager.hasSuspendedData('test-chapter')).toBe(false);
    });
  });

  describe('Data Integrity and Validation', () => {
    test('should validate save data format', () => {
      manager.saveChapterState();

      const storageKey = 'character_loss_test-chapter';
      const savedData = localStorageMock.getItem(storageKey);
      expect(savedData).not.toBeNull();

      const parsedData = JSON.parse(savedData!);
      expect(parsedData).toHaveProperty('chapterId');
      expect(parsedData).toHaveProperty('lostCharacters');
      expect(parsedData).toHaveProperty('lossHistory');
      expect(parsedData).toHaveProperty('chapterStartTime');
      expect(parsedData).toHaveProperty('version');
    });

    test('should maintain data consistency across save/load cycles', async () => {
      // Create complex state with multiple losses
      const cause1 = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      const cause2 = CharacterLossUtils.createCriticalDamageCause('enemy1', 'Goblin', 50);

      await manager.processCharacterLoss(mockUnits[1], cause1);
      await manager.processCharacterLoss(mockUnits[0], cause2);

      const originalLostCharacters = manager.getLostCharacters();
      const originalSummary = manager.lossState.getChapterSummary();

      // Save and load
      manager.saveChapterState();
      const newManager = new CharacterLossManager(mockScene);
      newManager.loadChapterState('test-chapter');

      const loadedLostCharacters = newManager.getLostCharacters();
      const loadedSummary = newManager.lossState.getChapterSummary();

      // Verify consistency
      expect(loadedLostCharacters).toHaveLength(originalLostCharacters.length);
      expect(loadedSummary.totalCharacters).toBe(originalSummary.totalCharacters);
      expect(loadedSummary.lostCharacters).toHaveLength(originalSummary.lostCharacters.length);
      expect(loadedSummary.isPerfectClear).toBe(originalSummary.isPerfectClear);

      // Verify specific character states
      expect(newManager.isCharacterLost('player1')).toBe(true);
      expect(newManager.isCharacterLost('player2')).toBe(true);
      expect(newManager.isCharacterLost('enemy1')).toBe(false);
    });

    test('should handle version compatibility', () => {
      // Save data with current version
      manager.saveChapterState();

      const storageKey = 'character_loss_test-chapter';
      const savedData = JSON.parse(localStorageMock.getItem(storageKey)!);

      // Verify version is saved
      expect(savedData.version).toBe('1.0.0');

      // Should load successfully
      const newManager = new CharacterLossManager(mockScene);
      const result = newManager.loadChapterState('test-chapter');
      expect(result.success).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    test('should check if save data exists', () => {
      expect(manager.hasSaveData('test-chapter')).toBe(false);

      manager.saveChapterState();
      expect(manager.hasSaveData('test-chapter')).toBe(true);
    });

    test('should get save data information', async () => {
      // Process a loss and save
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      await manager.processCharacterLoss(mockUnits[1], cause);
      manager.saveChapterState();

      const info = manager.getSaveDataInfo('test-chapter');
      expect(info).not.toBeNull();
      expect(info!.chapterId).toBe('test-chapter');
      expect(info!.lossCount).toBe(1);
      expect(info!.dataSize).toBeGreaterThan(0);
      expect(typeof info!.lastSaved).toBe('number');
    });

    test('should return null for non-existent save data info', () => {
      const info = manager.getSaveDataInfo('nonexistent-chapter');
      expect(info).toBeNull();
    });

    test('should clear chapter data completely', async () => {
      // Create data and save
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      await manager.processCharacterLoss(mockUnits[1], cause);
      manager.autoSave(); // This creates both main and backup data

      // Verify data exists
      expect(manager.hasSaveData('test-chapter')).toBe(true);

      // Clear data
      const result = manager.clearChapterData('test-chapter');
      expect(result.success).toBe(true);

      // Verify all data is cleared
      expect(manager.hasSaveData('test-chapter')).toBe(false);
      const backupKey = 'character_loss_backup_test-chapter';
      expect(localStorageMock.getItem(backupKey)).toBeNull();
    });

    test('should perform auto-save correctly', async () => {
      // Process a loss
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      await manager.processCharacterLoss(mockUnits[1], cause);

      // Auto-save should save both main and backup data
      manager.autoSave();

      expect(manager.hasSaveData('test-chapter')).toBe(true);

      const backupKey = 'character_loss_backup_test-chapter';
      const backupData = localStorageMock.getItem(backupKey);
      expect(backupData).not.toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const result = manager.saveChapterState();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to save');

      // Restore original function
      localStorageMock.setItem = originalSetItem;
    });

    test('should handle JSON parsing errors', () => {
      // Set invalid JSON data
      const storageKey = 'character_loss_test-chapter';
      localStorageMock.setItem(storageKey, '{invalid json}');

      const newManager = new CharacterLossManager(mockScene);
      const result = newManager.loadChapterState('test-chapter');

      // Should recover gracefully
      expect(result.success).toBe(true);
      expect(result.message).toContain('recovered');
    });

    test('should handle missing required fields in save data', () => {
      // Create incomplete save data
      const incompleteData = {
        chapterId: 'test-chapter',
        // Missing required fields
      };

      const storageKey = 'character_loss_test-chapter';
      localStorageMock.setItem(storageKey, JSON.stringify(incompleteData));

      const newManager = new CharacterLossManager(mockScene);
      const result = newManager.loadChapterState('test-chapter');

      // Should handle gracefully
      expect(result.success).toBe(true);
      expect(result.message).toContain('recovered');
    });
  });
});
