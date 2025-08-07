/**
 * Character Loss State Persistence Tests
 * Tests for CharacterLossState data persistence functionality
 */

import { CharacterLossState } from '../../../game/src/systems/CharacterLossState';
import {
  CharacterLossUtils,
  LossCauseType,
  CharacterLossTypeValidators,
} from '../../../game/src/types/characterLoss';
import { Unit } from '../../../game/src/types/gameplay';

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

describe('CharacterLossState - Data Persistence', () => {
  let lossState: CharacterLossState;
  let mockUnits: Unit[];

  beforeEach(() => {
    lossState = new CharacterLossState();
    mockUnits = [
      createMockUnit('player1', 'Hero', 100),
      createMockUnit('player2', 'Warrior', 80),
      createMockUnit('enemy1', 'Goblin', 50),
    ];
    mockUnits[2].faction = 'enemy';

    lossState.initializeChapter('test-chapter');
    mockUnits.forEach(unit => lossState.addParticipatingCharacter(unit.id));
  });

  describe('Serialization and Deserialization', () => {
    test('should serialize empty state correctly', () => {
      const serialized = lossState.serialize();

      expect(serialized.chapterId).toBe('test-chapter');
      expect(serialized.lostCharacters).toEqual({});
      expect(serialized.lossHistory).toEqual([]);
      expect(serialized.version).toBe('1.0.0');
      expect(typeof serialized.chapterStartTime).toBe('number');
    });

    test('should serialize state with losses correctly', () => {
      // Add some losses
      const cause1 = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      const cause2 = CharacterLossUtils.createCriticalDamageCause('enemy1', 'Goblin', 50);

      lossState.recordLoss(mockUnits[0], cause1);
      lossState.recordLoss(mockUnits[1], cause2);

      const serialized = lossState.serialize();

      expect(Object.keys(serialized.lostCharacters)).toHaveLength(2);
      expect(serialized.lossHistory).toHaveLength(2);
      expect(serialized.lostCharacters['player1']).toBeDefined();
      expect(serialized.lostCharacters['player2']).toBeDefined();
    });

    test('should deserialize empty state correctly', () => {
      const originalSerialized = lossState.serialize();

      const newState = new CharacterLossState();
      newState.deserialize(originalSerialized);

      expect(newState.getCurrentChapterId()).toBe('test-chapter');
      expect(newState.getTotalLosses()).toBe(0);
      expect(newState.isPerfectChapter()).toBe(true);
    });

    test('should deserialize state with losses correctly', () => {
      // Add losses to original state
      const cause1 = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      const cause2 = CharacterLossUtils.createCriticalDamageCause('enemy1', 'Goblin', 50);

      lossState.recordLoss(mockUnits[0], cause1);
      lossState.recordLoss(mockUnits[1], cause2);

      const serialized = lossState.serialize();

      // Create new state and deserialize
      const newState = new CharacterLossState();
      newState.deserialize(serialized);

      expect(newState.getCurrentChapterId()).toBe('test-chapter');
      expect(newState.getTotalLosses()).toBe(2);
      expect(newState.isLost('player1')).toBe(true);
      expect(newState.isLost('player2')).toBe(true);
      expect(newState.isLost('enemy1')).toBe(false);
      expect(newState.isPerfectChapter()).toBe(false);

      const lostCharacters = newState.getLostCharacters();
      expect(lostCharacters).toHaveLength(2);
      expect(lostCharacters.find(lc => lc.characterId === 'player1')).toBeDefined();
      expect(lostCharacters.find(lc => lc.characterId === 'player2')).toBeDefined();
    });

    test('should maintain data integrity across serialize/deserialize cycles', () => {
      // Create complex state
      const cause1 = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      const cause2 = CharacterLossUtils.createStatusEffectCause('poison', 15);

      lossState.recordLoss(mockUnits[0], cause1);
      lossState.setCurrentTurn(5);
      lossState.recordLoss(mockUnits[1], cause2);

      const originalSummary = lossState.getChapterSummary();
      const originalHistory = lossState.getLossHistory();

      // Serialize and deserialize
      const serialized = lossState.serialize();
      const newState = new CharacterLossState();
      newState.deserialize(serialized);

      // Restore participating characters for new state
      mockUnits.forEach(unit => newState.addParticipatingCharacter(unit.id));

      const newSummary = newState.getChapterSummary();
      const newHistory = newState.getLossHistory();

      // Verify integrity
      expect(newSummary.chapterId).toBe(originalSummary.chapterId);
      expect(newSummary.totalCharacters).toBe(originalSummary.totalCharacters);
      expect(newSummary.lostCharacters).toHaveLength(originalSummary.lostCharacters.length);
      expect(newSummary.isPerfectClear).toBe(originalSummary.isPerfectClear);
      expect(newHistory).toHaveLength(originalHistory.length);
    });

    test('should handle invalid serialized data', () => {
      const invalidData = {
        chapterId: 'test-chapter',
        // Missing required fields
      };

      expect(() => {
        lossState.deserialize(invalidData as any);
      }).toThrow();
    });

    test('should validate serialized data format', () => {
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      lossState.recordLoss(mockUnits[0], cause);

      const serialized = lossState.serialize();

      expect(CharacterLossTypeValidators.isValidChapterLossData(serialized)).toBe(true);
    });
  });

  describe('Checkpoint and Restore', () => {
    test('should create checkpoint successfully', () => {
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      lossState.recordLoss(mockUnits[0], cause);

      const checkpoint = lossState.createCheckpoint();

      expect(checkpoint.chapterId).toBe('test-chapter');
      expect(Object.keys(checkpoint.lostCharacters)).toHaveLength(1);
      expect(checkpoint.lossHistory).toHaveLength(1);
    });

    test('should restore from checkpoint successfully', () => {
      // Create initial state
      const cause1 = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      lossState.recordLoss(mockUnits[0], cause1);

      const checkpoint = lossState.createCheckpoint();

      // Modify state further
      const cause2 = CharacterLossUtils.createCriticalDamageCause('enemy1', 'Goblin', 50);
      lossState.recordLoss(mockUnits[1], cause2);

      expect(lossState.getTotalLosses()).toBe(2);

      // Restore from checkpoint
      lossState.restoreFromCheckpoint(checkpoint);

      expect(lossState.getTotalLosses()).toBe(1);
      expect(lossState.isLost('player1')).toBe(true);
      expect(lossState.isLost('player2')).toBe(false);
    });

    test('should fail to create checkpoint when not initialized', () => {
      const uninitializedState = new CharacterLossState();

      expect(() => {
        uninitializedState.createCheckpoint();
      }).toThrow();
    });

    test('should fail to restore from invalid checkpoint', () => {
      const invalidCheckpoint = {
        chapterId: 'test-chapter',
        // Missing required fields
      };

      expect(() => {
        lossState.restoreFromCheckpoint(invalidCheckpoint as any);
      }).toThrow();
    });
  });

  describe('State Merging', () => {
    test('should merge states successfully', () => {
      // Create first state with one loss
      const cause1 = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      lossState.recordLoss(mockUnits[0], cause1);

      // Create second state with different loss
      const otherState = new CharacterLossState();
      otherState.initializeChapter('other-chapter');
      otherState.addParticipatingCharacter('player2');

      const cause2 = CharacterLossUtils.createCriticalDamageCause('enemy1', 'Goblin', 50);
      otherState.recordLoss(mockUnits[1], cause2);

      const otherData = otherState.serialize();

      // Merge states
      lossState.mergeState(otherData, false);

      expect(lossState.getTotalLosses()).toBe(2);
      expect(lossState.isLost('player1')).toBe(true);
      expect(lossState.isLost('player2')).toBe(true);
    });

    test('should handle overwrite option in merge', () => {
      // Create state with loss
      const cause1 = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      lossState.recordLoss(mockUnits[0], cause1);

      // Create other state with same character but different cause
      const otherState = new CharacterLossState();
      otherState.initializeChapter('other-chapter');
      otherState.addParticipatingCharacter('player1');

      const cause2 = CharacterLossUtils.createCriticalDamageCause('enemy2', 'Orc', 75);
      otherState.recordLoss(mockUnits[0], cause2);

      const otherData = otherState.serialize();

      // Merge without overwrite
      lossState.mergeState(otherData, false);
      const lostChar1 = lossState.getLostCharacter('player1');
      expect(lostChar1?.cause.type).toBe(LossCauseType.BATTLE_DEFEAT);
      expect(lostChar1?.cause.sourceName).toBe('Goblin');

      // Merge with overwrite
      lossState.mergeState(otherData, true);
      const lostChar2 = lossState.getLostCharacter('player1');
      expect(lostChar2?.cause.type).toBe(LossCauseType.CRITICAL_DAMAGE);
      expect(lostChar2?.cause.sourceName).toBe('Orc');
    });

    test('should merge into uninitialized state', () => {
      // Create source state
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      lossState.recordLoss(mockUnits[0], cause);
      const sourceData = lossState.serialize();

      // Create uninitialized target state
      const targetState = new CharacterLossState();
      targetState.mergeState(sourceData, false);

      expect(targetState.getCurrentChapterId()).toBe('test-chapter');
      expect(targetState.getTotalLosses()).toBe(1);
      expect(targetState.isLost('player1')).toBe(true);
    });
  });

  describe('Import and Export', () => {
    test('should export state as JSON string', () => {
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      lossState.recordLoss(mockUnits[0], cause);

      const exported = lossState.exportState();

      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);
      expect(parsed.chapterId).toBe('test-chapter');
      expect(Object.keys(parsed.lostCharacters)).toHaveLength(1);
    });

    test('should import state from JSON string', () => {
      // Create and export state
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      lossState.recordLoss(mockUnits[0], cause);
      const exported = lossState.exportState();

      // Create new state and import
      const newState = new CharacterLossState();
      newState.importState(exported);

      expect(newState.getCurrentChapterId()).toBe('test-chapter');
      expect(newState.getTotalLosses()).toBe(1);
      expect(newState.isLost('player1')).toBe(true);
    });

    test('should handle invalid JSON in import', () => {
      const invalidJson = '{invalid json}';

      expect(() => {
        lossState.importState(invalidJson);
      }).toThrow();
    });
  });

  describe('State Statistics and Monitoring', () => {
    test('should provide accurate state statistics', () => {
      const cause1 = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      const cause2 = CharacterLossUtils.createCriticalDamageCause('enemy1', 'Goblin', 50);

      lossState.recordLoss(mockUnits[0], cause1);
      lossState.setCurrentTurn(3);
      lossState.recordLoss(mockUnits[1], cause2);

      const stats = lossState.getStateStatistics();

      expect(stats.chapterId).toBe('test-chapter');
      expect(stats.isInitialized).toBe(true);
      expect(stats.totalLosses).toBe(2);
      expect(stats.totalParticipants).toBe(3);
      expect(stats.chapterDuration).toBeGreaterThan(0);
      expect(stats.averageLossPerTurn).toBeCloseTo(2 / 3, 2);
      expect(stats.memoryUsage.lostCharactersSize).toBe(2);
      expect(stats.memoryUsage.lossHistorySize).toBe(2);
      expect(stats.memoryUsage.participatingCharactersSize).toBe(3);
    });

    test('should handle statistics for empty state', () => {
      const stats = lossState.getStateStatistics();

      expect(stats.totalLosses).toBe(0);
      expect(stats.averageLossPerTurn).toBe(0);
      expect(stats.memoryUsage.lostCharactersSize).toBe(0);
      expect(stats.memoryUsage.lossHistorySize).toBe(0);
    });
  });

  describe('State Validation and Repair', () => {
    test('should validate clean state successfully', () => {
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      lossState.recordLoss(mockUnits[0], cause);

      const result = lossState.validateAndRepair();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.repaired).toHaveLength(0);
    });

    test('should repair missing participating character entries', () => {
      // Create state with loss but without proper participating character setup
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);

      // Manually create lost character without adding to participating characters first
      const lostCharacter = {
        characterId: 'player1',
        name: 'Hero',
        lostAt: Date.now(),
        turn: 1,
        cause: cause,
        level: 1,
        wasRecruited: false,
      };

      // Access private property for testing (this is a test hack)
      (lossState as any).lostCharacters.set('player1', lostCharacter);
      (lossState as any).lossHistory.push({
        ...lostCharacter,
        chapterId: 'test-chapter',
        stageId: 'test-stage',
        recoverable: false,
      });

      const result = lossState.validateAndRepair();

      expect(result.isValid).toBe(true);
      expect(result.repaired.length).toBeGreaterThan(0);
      expect(result.repaired.some(msg => msg.includes('participating character'))).toBe(true);
    });

    test('should handle uninitialized state validation', () => {
      const uninitializedState = new CharacterLossState();
      const result = uninitializedState.validateAndRepair();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].error).toBe('chapter_not_initialized');
    });

    test('should repair invalid timestamps', () => {
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      lossState.recordLoss(mockUnits[0], cause);

      // Manually corrupt timestamp
      const lostChar = lossState.getLostCharacter('player1');
      if (lostChar) {
        // Set invalid future timestamp
        lostChar.lostAt = Date.now() + 1000000;

        // Manually update the internal state (this is a test hack)
        const serialized = lossState.serialize();
        serialized.lostCharacters['player1'].lostAt = lostChar.lostAt;
        lossState.deserialize(serialized);
      }

      const result = lossState.validateAndRepair();

      expect(result.isValid).toBe(true);
      expect(result.repaired.some(msg => msg.includes('timestamp'))).toBe(true);
    });
  });

  describe('Memory Management', () => {
    test('should cleanup state properly', () => {
      // Create state with data
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      lossState.recordLoss(mockUnits[0], cause);

      expect(lossState.getTotalLosses()).toBe(1);
      expect(lossState.isChapterInitialized()).toBe(true);

      // Cleanup
      lossState.cleanup();

      expect(lossState.getTotalLosses()).toBe(0);
      expect(lossState.isChapterInitialized()).toBe(false);
      expect(lossState.getCurrentChapterId()).toBeNull();

      const stats = lossState.getStateStatistics();
      expect(stats.memoryUsage.lostCharactersSize).toBe(0);
      expect(stats.memoryUsage.lossHistorySize).toBe(0);
      expect(stats.memoryUsage.participatingCharactersSize).toBe(0);
    });

    test('should handle cleanup of empty state', () => {
      expect(() => {
        lossState.cleanup();
      }).not.toThrow();

      expect(lossState.isChapterInitialized()).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle serialization of state with complex loss causes', () => {
      // Create loss with all optional fields
      const complexCause = {
        type: LossCauseType.STATUS_EFFECT,
        sourceId: 'poison_trap_1',
        sourceName: 'Poison Trap',
        damageAmount: 15,
        statusType: 'poison' as any,
        description: 'Poisoned by trap',
        timestamp: Date.now(),
      };

      lossState.recordLoss(mockUnits[0], complexCause);

      const serialized = lossState.serialize();
      const newState = new CharacterLossState();
      newState.deserialize(serialized);

      const restoredChar = newState.getLostCharacter('player1');
      expect(restoredChar?.cause.sourceId).toBe('poison_trap_1');
      expect(restoredChar?.cause.sourceName).toBe('Poison Trap');
      expect(restoredChar?.cause.damageAmount).toBe(15);
      expect(restoredChar?.cause.statusType).toBe('poison');
    });

    test('should handle large numbers of losses', () => {
      // Create many losses
      const manyUnits = Array.from({ length: 100 }, (_, i) =>
        createMockUnit(`unit${i}`, `Unit ${i}`)
      );

      manyUnits.forEach(unit => {
        lossState.addParticipatingCharacter(unit.id);
        const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
        lossState.recordLoss(unit, cause);
      });

      expect(lossState.getTotalLosses()).toBe(100);

      // Serialize and deserialize
      const serialized = lossState.serialize();
      const newState = new CharacterLossState();
      newState.deserialize(serialized);

      expect(newState.getTotalLosses()).toBe(100);
      expect(newState.getLossHistory()).toHaveLength(100);
    });

    test('should handle concurrent modifications during serialization', () => {
      const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 25);
      lossState.recordLoss(mockUnits[0], cause);

      // Simulate concurrent modification
      const serialized = lossState.serialize();

      // Modify state after serialization started
      lossState.recordLoss(mockUnits[1], cause);

      // Original serialization should still be valid
      expect(CharacterLossTypeValidators.isValidChapterLossData(serialized)).toBe(true);
      expect(Object.keys(serialized.lostCharacters)).toHaveLength(1);
    });
  });
});
