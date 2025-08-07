/**
 * Character Loss Data Persistence Integration Tests
 * Tests the complete data persistence flow including manager and state coordination
 */

import { CharacterLossManager } from '../../game/src/systems/CharacterLossManager';
import { CharacterLossUtils, LossCauseType } from '../../game/src/types/characterLoss';
import { Unit } from '../../game/src/types/gameplay';

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

describe('Character Loss Data Persistence - Integration Tests', () => {
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
      createMockUnit('player3', 'Mage', 60),
      createMockUnit('enemy1', 'Goblin', 50),
      createMockUnit('enemy2', 'Orc', 75),
    ];
    mockUnits[3].faction = 'enemy';
    mockUnits[4].faction = 'enemy';
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Complete Chapter Lifecycle with Persistence', () => {
    test('should handle complete chapter lifecycle with saves and loads', async () => {
      // Initialize chapter
      const initResult = manager.initializeChapter('chapter-1', mockUnits);
      expect(initResult.success).toBe(true);

      // Process some losses
      const cause1 = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 30);
      const cause2 = CharacterLossUtils.createCriticalDamageCause('enemy2', 'Orc', 45);

      await manager.processCharacterLoss(mockUnits[1], cause1); // Warrior lost
      await manager.processCharacterLoss(mockUnits[2], cause2); // Mage lost

      // Verify state
      expect(manager.isCharacterLost('player2')).toBe(true);
      expect(manager.isCharacterLost('player3')).toBe(true);
      expect(manager.getLostCharacters()).toHaveLength(2);

      // Save state
      const saveResult = manager.saveChapterState();
      expect(saveResult.success).toBe(true);

      // Simulate game restart - create new manager and load
      const newManager = new CharacterLossManager(mockScene);
      const loadResult = newManager.loadChapterState('chapter-1');
      expect(loadResult.success).toBe(true);
      expect(loadResult.details?.lossCount).toBe(2);

      // Verify loaded state
      expect(newManager.isCharacterLost('player2')).toBe(true);
      expect(newManager.isCharacterLost('player3')).toBe(true);
      expect(newManager.getLostCharacters()).toHaveLength(2);

      // Complete chapter
      const completeResult = newManager.completeChapter();
      expect(completeResult.success).toBe(true);
      expect(completeResult.summary?.lostCharacters).toHaveLength(2);
      expect(completeResult.summary?.isPerfectClear).toBe(false);

      // Verify save data was cleared after completion
      expect(newManager.hasSaveData('chapter-1')).toBe(false);
    });

    test('should handle perfect clear chapter lifecycle', async () => {
      // Initialize chapter
      manager.initializeChapter('chapter-perfect', mockUnits);

      // Save state without any losses
      manager.saveChapterState();

      // Load in new manager
      const newManager = new CharacterLossManager(mockScene);
      newManager.loadChapterState('chapter-perfect');

      // Complete chapter
      const completeResult = newManager.completeChapter();
      expect(completeResult.success).toBe(true);
      expect(completeResult.summary?.isPerfectClear).toBe(true);
      expect(completeResult.summary?.lostCharacters).toHaveLength(0);
    });
  });

  describe('Suspend and Resume Functionality', () => {
    test('should handle complete suspend and resume cycle', async () => {
      // Initialize and create some state
      manager.initializeChapter('chapter-suspend', mockUnits);

      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 30);
      await manager.processCharacterLoss(mockUnits[1], cause);

      // Suspend chapter
      const suspendResult = manager.suspendChapter();
      expect(suspendResult.success).toBe(true);
      expect(manager.hasSuspendedData('chapter-suspend')).toBe(true);

      // Create new manager and resume
      const newManager = new CharacterLossManager(mockScene);
      const resumeResult = newManager.resumeChapter('chapter-suspend', mockUnits);
      expect(resumeResult.success).toBe(true);
      expect(resumeResult.details?.lostCharacters).toBe(1);

      // Verify state was restored
      expect(newManager.isCharacterLost('player2')).toBe(true);
      expect(newManager.getLostCharacters()).toHaveLength(1);

      // Verify suspend data was cleaned up
      expect(newManager.hasSuspendedData('chapter-suspend')).toBe(false);
    });

    test('should handle multiple suspend/resume cycles', async () => {
      // Initialize chapter
      manager.initializeChapter('chapter-multi-suspend', mockUnits);

      // First suspend/resume cycle
      const cause1 = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 30);
      await manager.processCharacterLoss(mockUnits[1], cause1);

      manager.suspendChapter();
      const manager2 = new CharacterLossManager(mockScene);
      manager2.resumeChapter('chapter-multi-suspend', mockUnits);

      // Second suspend/resume cycle with additional loss
      const cause2 = CharacterLossUtils.createCriticalDamageCause('enemy2', 'Orc', 45);
      await manager2.processCharacterLoss(mockUnits[2], cause2);

      manager2.suspendChapter();
      const manager3 = new CharacterLossManager(mockScene);
      manager3.resumeChapter('chapter-multi-suspend', mockUnits);

      // Verify final state
      expect(manager3.isCharacterLost('player2')).toBe(true);
      expect(manager3.isCharacterLost('player3')).toBe(true);
      expect(manager3.getLostCharacters()).toHaveLength(2);
    });

    test('should handle resume without suspend data', () => {
      const newManager = new CharacterLossManager(mockScene);
      const resumeResult = newManager.resumeChapter('nonexistent-chapter', mockUnits);

      // Should still succeed by loading regular save data (or creating fresh state)
      expect(resumeResult.success).toBe(true);
    });
  });

  describe('Data Corruption and Recovery', () => {
    test('should recover from corrupted main data using backup', async () => {
      // Create and save valid data
      manager.initializeChapter('chapter-corrupt', mockUnits);
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 30);
      await manager.processCharacterLoss(mockUnits[1], cause);
      manager.autoSave(); // Creates both main and backup data

      // Corrupt main data
      localStorageMock.setItem('character_loss_chapter-corrupt', 'corrupted data');

      // Load should recover from backup
      const newManager = new CharacterLossManager(mockScene);
      const loadResult = newManager.loadChapterState('chapter-corrupt');

      expect(loadResult.success).toBe(true);
      expect(loadResult.message).toContain('restored from backup');
      expect(newManager.isCharacterLost('player2')).toBe(true);
    });

    test('should reset to default when all data is corrupted', () => {
      // Set corrupted data for both main and backup
      localStorageMock.setItem('character_loss_chapter-corrupt', 'corrupted main');
      localStorageMock.setItem('character_loss_backup_chapter-corrupt', 'corrupted backup');

      const newManager = new CharacterLossManager(mockScene);
      const loadResult = newManager.loadChapterState('chapter-corrupt');

      expect(loadResult.success).toBe(true);
      expect(loadResult.message).toContain('reset to default state');
      expect(newManager.getLostCharacters()).toHaveLength(0);
    });

    test('should handle partial data corruption gracefully', async () => {
      // Create valid data
      manager.initializeChapter('chapter-partial-corrupt', mockUnits);
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 30);
      await manager.processCharacterLoss(mockUnits[1], cause);
      manager.saveChapterState();

      // Get saved data and partially corrupt it
      const savedData = JSON.parse(
        localStorageMock.getItem('character_loss_chapter-partial-corrupt')!
      );
      savedData.lostCharacters['player2'].cause = null; // Corrupt the cause
      localStorageMock.setItem('character_loss_chapter-partial-corrupt', JSON.stringify(savedData));

      // Load should handle gracefully
      const newManager = new CharacterLossManager(mockScene);
      const loadResult = newManager.loadChapterState('chapter-partial-corrupt');

      expect(loadResult.success).toBe(true);
      // Should either recover or reset to default
    });
  });

  describe('Auto-Save Integration', () => {
    test('should auto-save after character loss processing', async () => {
      manager.initializeChapter('chapter-autosave', mockUnits);

      // Process loss (should trigger auto-save)
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 30);
      await manager.processCharacterLoss(mockUnits[1], cause);

      // Verify data was auto-saved
      expect(manager.hasSaveData('chapter-autosave')).toBe(true);

      // Verify backup was also created
      const backupData = localStorageMock.getItem('character_loss_backup_chapter-autosave');
      expect(backupData).not.toBeNull();
    });

    test('should maintain consistency between auto-saves and manual saves', async () => {
      manager.initializeChapter('chapter-consistency', mockUnits);

      // Process loss (triggers auto-save)
      const cause1 = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 30);
      await manager.processCharacterLoss(mockUnits[1], cause1);

      // Manual save
      const manualSaveResult = manager.saveChapterState();
      expect(manualSaveResult.success).toBe(true);

      // Process another loss (triggers auto-save)
      const cause2 = CharacterLossUtils.createCriticalDamageCause('enemy2', 'Orc', 45);
      await manager.processCharacterLoss(mockUnits[2], cause2);

      // Load and verify consistency
      const newManager = new CharacterLossManager(mockScene);
      newManager.loadChapterState('chapter-consistency');

      expect(newManager.getLostCharacters()).toHaveLength(2);
      expect(newManager.isCharacterLost('player2')).toBe(true);
      expect(newManager.isCharacterLost('player3')).toBe(true);
    });
  });

  describe('Multi-Chapter Data Management', () => {
    test('should handle multiple chapters independently', async () => {
      // Create data for first chapter
      manager.initializeChapter('chapter-1', mockUnits);
      const cause1 = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 30);
      await manager.processCharacterLoss(mockUnits[1], cause1);
      manager.saveChapterState();

      // Create data for second chapter
      const manager2 = new CharacterLossManager(mockScene);
      manager2.initializeChapter('chapter-2', mockUnits);
      const cause2 = CharacterLossUtils.createCriticalDamageCause('enemy2', 'Orc', 45);
      await manager2.processCharacterLoss(mockUnits[2], cause2);
      manager2.saveChapterState();

      // Verify both chapters have independent data
      expect(manager.hasSaveData('chapter-1')).toBe(true);
      expect(manager2.hasSaveData('chapter-2')).toBe(true);

      // Load each chapter independently
      const loader1 = new CharacterLossManager(mockScene);
      const loader2 = new CharacterLossManager(mockScene);

      loader1.loadChapterState('chapter-1');
      loader2.loadChapterState('chapter-2');

      // Verify independent state
      expect(loader1.isCharacterLost('player2')).toBe(true);
      expect(loader1.isCharacterLost('player3')).toBe(false);

      expect(loader2.isCharacterLost('player2')).toBe(false);
      expect(loader2.isCharacterLost('player3')).toBe(true);
    });

    test('should handle chapter data cleanup independently', async () => {
      // Create data for multiple chapters
      const chapters = ['chapter-a', 'chapter-b', 'chapter-c'];
      const managers = chapters.map(() => new CharacterLossManager(mockScene));

      for (let i = 0; i < chapters.length; i++) {
        managers[i].initializeChapter(chapters[i], mockUnits);
        const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 30);
        await managers[i].processCharacterLoss(mockUnits[i], cause);
        managers[i].saveChapterState();
      }

      // Verify all chapters have data
      chapters.forEach(chapterId => {
        expect(managers[0].hasSaveData(chapterId)).toBe(true);
      });

      // Clear one chapter
      const clearResult = managers[0].clearChapterData('chapter-b');
      expect(clearResult.success).toBe(true);

      // Verify only that chapter was cleared
      expect(managers[0].hasSaveData('chapter-a')).toBe(true);
      expect(managers[0].hasSaveData('chapter-b')).toBe(false);
      expect(managers[0].hasSaveData('chapter-c')).toBe(true);
    });
  });

  describe('Performance and Memory Management', () => {
    test('should handle large amounts of data efficiently', async () => {
      const startTime = Date.now();

      // Create large dataset
      const manyUnits = Array.from({ length: 50 }, (_, i) =>
        createMockUnit(`unit${i}`, `Unit ${i}`)
      );

      manager.initializeChapter('chapter-large', manyUnits);

      // Process many losses
      for (let i = 0; i < 25; i++) {
        const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 30);
        await manager.processCharacterLoss(manyUnits[i], cause);
      }

      // Save and load
      const saveResult = manager.saveChapterState();
      expect(saveResult.success).toBe(true);

      const newManager = new CharacterLossManager(mockScene);
      const loadResult = newManager.loadChapterState('chapter-large');
      expect(loadResult.success).toBe(true);
      expect(loadResult.details?.lossCount).toBe(25);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(totalTime).toBeLessThan(5000); // 5 seconds
    });

    test('should cleanup memory properly after chapter completion', async () => {
      manager.initializeChapter('chapter-memory', mockUnits);

      // Create some data
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 30);
      await manager.processCharacterLoss(mockUnits[1], cause);

      // Complete chapter (should cleanup memory)
      const completeResult = manager.completeChapter();
      expect(completeResult.success).toBe(true);

      // Verify cleanup
      expect(manager.hasSaveData('chapter-memory')).toBe(false);
      expect(manager.hasSuspendedData('chapter-memory')).toBe(false);
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should handle localStorage quota exceeded', async () => {
      manager.initializeChapter('chapter-quota', mockUnits);

      // Mock localStorage to throw quota exceeded error
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError');
      });

      const saveResult = manager.saveChapterState();
      expect(saveResult.success).toBe(false);
      expect(saveResult.message).toContain('Failed to save');

      // Restore original function
      localStorageMock.setItem = originalSetItem;
    });

    test('should handle concurrent access gracefully', async () => {
      // Initialize two managers for same chapter
      const manager1 = new CharacterLossManager(mockScene);
      const manager2 = new CharacterLossManager(mockScene);

      manager1.initializeChapter('chapter-concurrent', mockUnits);
      manager2.initializeChapter('chapter-concurrent', mockUnits);

      // Process losses concurrently
      const cause1 = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 30);
      const cause2 = CharacterLossUtils.createCriticalDamageCause('enemy2', 'Orc', 45);

      await Promise.all([
        manager1.processCharacterLoss(mockUnits[1], cause1),
        manager2.processCharacterLoss(mockUnits[2], cause2),
      ]);

      // Both should save successfully (last one wins)
      const save1 = manager1.saveChapterState();
      const save2 = manager2.saveChapterState();

      expect(save1.success).toBe(true);
      expect(save2.success).toBe(true);

      // Load should work with the last saved data
      const loader = new CharacterLossManager(mockScene);
      const loadResult = loader.loadChapterState('chapter-concurrent');
      expect(loadResult.success).toBe(true);
    });

    test('should maintain data integrity across system failures', async () => {
      manager.initializeChapter('chapter-integrity', mockUnits);

      // Process loss and save
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 30);
      await manager.processCharacterLoss(mockUnits[1], cause);
      manager.saveChapterState();

      // Simulate system failure by corrupting data mid-operation
      const savedData = localStorageMock.getItem('character_loss_chapter-integrity');
      const corruptedData = savedData!.substring(0, savedData!.length / 2); // Truncate data
      localStorageMock.setItem('character_loss_chapter-integrity', corruptedData);

      // Load should recover gracefully
      const newManager = new CharacterLossManager(mockScene);
      const loadResult = newManager.loadChapterState('chapter-integrity');

      expect(loadResult.success).toBe(true);
      // Should either recover from backup or reset to default
    });
  });
});
