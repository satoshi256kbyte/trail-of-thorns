/**
 * ObjectiveManager Unit Tests
 *
 * Tests for objective management system including:
 * - Objective registration
 * - Progress tracking and updates
 * - Completion status checking
 * - Data validation
 * - Error handling
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { ObjectiveManager } from '../../../../game/src/systems/victory/ObjectiveManager';
import { Objective, ObjectiveType, ObjectiveProgress } from '../../../../game/src/types/victory';

describe('ObjectiveManager', () => {
  let scene: any;
  let objectiveManager: ObjectiveManager;

  beforeEach(() => {
    // Create mock scene
    scene = {
      events: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
      },
    };

    // Create objective manager with debug logs enabled for testing
    objectiveManager = new ObjectiveManager(scene, {
      enableDebugLogs: false,
      validateOnRegister: true,
      emitProgressEvents: true,
      autoComplete: true,
    });
  });

  afterEach(() => {
    objectiveManager.destroy();
  });

  describe('registerObjective', () => {
    test('should register a valid objective successfully', () => {
      const objective: Objective = {
        id: 'test-objective-1',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Defeat the boss',
        isRequired: true,
        isComplete: false,
        progress: {
          current: 0,
          target: 1,
          percentage: 0,
        },
        targetData: {
          bossId: 'boss-1',
        },
      };

      const result = objectiveManager.registerObjective(objective);

      expect(result.success).toBe(true);
      expect(result.objectiveId).toBe('test-objective-1');
      expect(result.error).toBeUndefined();
    });

    test('should initialize progress if not provided', () => {
      const objective: Objective = {
        id: 'test-objective-2',
        type: ObjectiveType.DEFEAT_ALL_ENEMIES,
        description: 'Defeat all enemies',
        isRequired: true,
        isComplete: false,
        progress: undefined as any,
      };

      const result = objectiveManager.registerObjective(objective);

      expect(result.success).toBe(true);

      const registered = objectiveManager.getObjective('test-objective-2');
      expect(registered).not.toBeNull();
      expect(registered!.progress).toBeDefined();
      expect(registered!.progress.current).toBe(0);
      expect(registered!.progress.target).toBe(1);
      expect(registered!.progress.percentage).toBe(0);
    });

    test('should reject duplicate objective IDs', () => {
      const objective: Objective = {
        id: 'duplicate-id',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'First objective',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      objectiveManager.registerObjective(objective);

      const duplicate: Objective = {
        id: 'duplicate-id',
        type: ObjectiveType.REACH_POSITION,
        description: 'Second objective',
        isRequired: false,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      const result = objectiveManager.registerObjective(duplicate);

      expect(result.success).toBe(false);
      expect(result.error).toBe('DUPLICATE_ID');
    });

    test('should validate objective data when configured', () => {
      const invalidObjective: Objective = {
        id: '', // Invalid: empty ID
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Invalid objective',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      const result = objectiveManager.registerObjective(invalidObjective);

      expect(result.success).toBe(false);
      expect(result.error).toBe('VALIDATION_FAILED');
    });

    test('should validate type-specific target data', () => {
      const objective: Objective = {
        id: 'boss-objective',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Defeat boss without boss ID',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
        targetData: {}, // Missing bossId
      };

      const result = objectiveManager.registerObjective(objective);

      expect(result.success).toBe(false);
      expect(result.error).toBe('VALIDATION_FAILED');
    });

    test('should emit objective-registered event', () => {
      const eventSpy = vi.fn();
      objectiveManager.on('objective-registered', eventSpy);

      const objective: Objective = {
        id: 'event-test',
        type: ObjectiveType.SURVIVE_TURNS,
        description: 'Survive 10 turns',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 10, percentage: 0 },
        targetData: { surviveTurns: 10 },
      };

      objectiveManager.registerObjective(objective);

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          objective: expect.objectContaining({ id: 'event-test' }),
        })
      );
    });
  });

  describe('updateProgress', () => {
    beforeEach(() => {
      const objective: Objective = {
        id: 'progress-test',
        type: ObjectiveType.DEFEAT_ALL_ENEMIES,
        description: 'Defeat all enemies',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 10, percentage: 0 },
      };

      objectiveManager.registerObjective(objective);
    });

    test('should update progress current value', () => {
      const result = objectiveManager.updateProgress('progress-test', { current: 5 });

      expect(result.success).toBe(true);
      expect(result.newProgress.current).toBe(5);
      expect(result.newProgress.percentage).toBe(50);
    });

    test('should update progress target value', () => {
      const result = objectiveManager.updateProgress('progress-test', { target: 20 });

      expect(result.success).toBe(true);
      expect(result.newProgress.target).toBe(20);
      expect(result.newProgress.percentage).toBe(0);
    });

    test('should update both current and target', () => {
      const result = objectiveManager.updateProgress('progress-test', {
        current: 15,
        target: 20,
      });

      expect(result.success).toBe(true);
      expect(result.newProgress.current).toBe(15);
      expect(result.newProgress.target).toBe(20);
      expect(result.newProgress.percentage).toBe(75);
    });

    test('should auto-complete objective when target is reached', () => {
      const result = objectiveManager.updateProgress('progress-test', { current: 10 });

      expect(result.success).toBe(true);
      expect(result.isComplete).toBe(true);
      expect(result.newProgress.percentage).toBe(100);
    });

    test('should emit objective-completed event on completion', () => {
      const eventSpy = vi.fn();
      objectiveManager.on('objective-completed', eventSpy);

      objectiveManager.updateProgress('progress-test', { current: 10 });

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          objective: expect.objectContaining({
            id: 'progress-test',
            isComplete: true,
          }),
        })
      );
    });

    test('should emit objective-progress-updated event', () => {
      const eventSpy = vi.fn();
      objectiveManager.on('objective-progress-updated', eventSpy);

      objectiveManager.updateProgress('progress-test', { current: 3 });

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          objectiveId: 'progress-test',
          previousProgress: expect.objectContaining({ current: 0 }),
          newProgress: expect.objectContaining({ current: 3 }),
        })
      );
    });

    test('should handle non-existent objective gracefully', () => {
      const result = objectiveManager.updateProgress('non-existent', { current: 5 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('should prevent negative progress values', () => {
      const result = objectiveManager.updateProgress('progress-test', { current: -5 });

      expect(result.success).toBe(true);
      expect(result.newProgress.current).toBe(0);
    });

    test('should cap percentage at 100', () => {
      const result = objectiveManager.updateProgress('progress-test', { current: 20 });

      expect(result.success).toBe(true);
      expect(result.newProgress.percentage).toBe(100);
    });
  });

  describe('isObjectiveComplete', () => {
    test('should return true for completed objective', () => {
      const objective: Objective = {
        id: 'completed-obj',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Completed objective',
        isRequired: true,
        isComplete: true,
        progress: { current: 1, target: 1, percentage: 100 },
      };

      objectiveManager.registerObjective(objective);

      expect(objectiveManager.isObjectiveComplete('completed-obj')).toBe(true);
    });

    test('should return false for incomplete objective', () => {
      const objective: Objective = {
        id: 'incomplete-obj',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Incomplete objective',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      objectiveManager.registerObjective(objective);

      expect(objectiveManager.isObjectiveComplete('incomplete-obj')).toBe(false);
    });

    test('should return false for non-existent objective', () => {
      expect(objectiveManager.isObjectiveComplete('non-existent')).toBe(false);
    });
  });

  describe('areAllObjectivesComplete', () => {
    test('should return true when all required objectives are complete', () => {
      const obj1: Objective = {
        id: 'req-1',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Required 1',
        isRequired: true,
        isComplete: true,
        progress: { current: 1, target: 1, percentage: 100 },
      };

      const obj2: Objective = {
        id: 'req-2',
        type: ObjectiveType.DEFEAT_ALL_ENEMIES,
        description: 'Required 2',
        isRequired: true,
        isComplete: true,
        progress: { current: 1, target: 1, percentage: 100 },
      };

      objectiveManager.registerObjective(obj1);
      objectiveManager.registerObjective(obj2);

      expect(objectiveManager.areAllObjectivesComplete()).toBe(true);
    });

    test('should return false when any required objective is incomplete', () => {
      const obj1: Objective = {
        id: 'req-1',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Required 1',
        isRequired: true,
        isComplete: true,
        progress: { current: 1, target: 1, percentage: 100 },
      };

      const obj2: Objective = {
        id: 'req-2',
        type: ObjectiveType.DEFEAT_ALL_ENEMIES,
        description: 'Required 2',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      objectiveManager.registerObjective(obj1);
      objectiveManager.registerObjective(obj2);

      expect(objectiveManager.areAllObjectivesComplete()).toBe(false);
    });

    test('should ignore optional objectives', () => {
      const required: Objective = {
        id: 'required',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Required',
        isRequired: true,
        isComplete: true,
        progress: { current: 1, target: 1, percentage: 100 },
      };

      const optional: Objective = {
        id: 'optional',
        type: ObjectiveType.COLLECT_ITEMS,
        description: 'Optional',
        isRequired: false,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      objectiveManager.registerObjective(required);
      objectiveManager.registerObjective(optional);

      expect(objectiveManager.areAllObjectivesComplete()).toBe(true);
    });

    test('should return false when no required objectives exist', () => {
      const optional: Objective = {
        id: 'optional',
        type: ObjectiveType.COLLECT_ITEMS,
        description: 'Optional',
        isRequired: false,
        isComplete: true,
        progress: { current: 1, target: 1, percentage: 100 },
      };

      objectiveManager.registerObjective(optional);

      expect(objectiveManager.areAllObjectivesComplete()).toBe(false);
    });
  });

  describe('getObjective', () => {
    test('should return objective by ID', () => {
      const objective: Objective = {
        id: 'get-test',
        type: ObjectiveType.REACH_POSITION,
        description: 'Reach position',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      objectiveManager.registerObjective(objective);

      const retrieved = objectiveManager.getObjective('get-test');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe('get-test');
      expect(retrieved!.type).toBe(ObjectiveType.REACH_POSITION);
    });

    test('should return null for non-existent objective', () => {
      const retrieved = objectiveManager.getObjective('non-existent');

      expect(retrieved).toBeNull();
    });

    test('should return a copy of the objective', () => {
      const objective: Objective = {
        id: 'copy-test',
        type: ObjectiveType.SURVIVE_TURNS,
        description: 'Survive',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 10, percentage: 0 },
      };

      objectiveManager.registerObjective(objective);

      const retrieved = objectiveManager.getObjective('copy-test');
      retrieved!.description = 'Modified';

      const original = objectiveManager.getObjective('copy-test');
      expect(original!.description).toBe('Survive');
    });
  });

  describe('getAllObjectives', () => {
    beforeEach(() => {
      const obj1: Objective = {
        id: 'all-1',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Required 1',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      const obj2: Objective = {
        id: 'all-2',
        type: ObjectiveType.DEFEAT_ALL_ENEMIES,
        description: 'Required 2',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      const obj3: Objective = {
        id: 'all-3',
        type: ObjectiveType.COLLECT_ITEMS,
        description: 'Optional',
        isRequired: false,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      objectiveManager.registerObjective(obj1);
      objectiveManager.registerObjective(obj2);
      objectiveManager.registerObjective(obj3);
    });

    test('should return all objectives', () => {
      const all = objectiveManager.getAllObjectives();

      expect(all).toHaveLength(3);
      expect(all.map(o => o.id)).toContain('all-1');
      expect(all.map(o => o.id)).toContain('all-2');
      expect(all.map(o => o.id)).toContain('all-3');
    });

    test('should filter required objectives when requested', () => {
      const required = objectiveManager.getAllObjectives(true);

      expect(required).toHaveLength(2);
      expect(required.map(o => o.id)).toContain('all-1');
      expect(required.map(o => o.id)).toContain('all-2');
      expect(required.map(o => o.id)).not.toContain('all-3');
    });

    test('should return empty array when no objectives exist', () => {
      objectiveManager.clearAllObjectives();

      const all = objectiveManager.getAllObjectives();

      expect(all).toHaveLength(0);
    });
  });

  describe('getObjectivesByType', () => {
    beforeEach(() => {
      const boss1: Objective = {
        id: 'boss-1',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Boss 1',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      const boss2: Objective = {
        id: 'boss-2',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Boss 2',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      const enemies: Objective = {
        id: 'enemies',
        type: ObjectiveType.DEFEAT_ALL_ENEMIES,
        description: 'All enemies',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      objectiveManager.registerObjective(boss1);
      objectiveManager.registerObjective(boss2);
      objectiveManager.registerObjective(enemies);
    });

    test('should return objectives of specified type', () => {
      const bossObjectives = objectiveManager.getObjectivesByType(ObjectiveType.DEFEAT_BOSS);

      expect(bossObjectives).toHaveLength(2);
      expect(bossObjectives.map(o => o.id)).toContain('boss-1');
      expect(bossObjectives.map(o => o.id)).toContain('boss-2');
    });

    test('should return empty array for type with no objectives', () => {
      const surviveObjectives = objectiveManager.getObjectivesByType(ObjectiveType.SURVIVE_TURNS);

      expect(surviveObjectives).toHaveLength(0);
    });
  });

  describe('getCompletionStats', () => {
    test('should return correct statistics', () => {
      const obj1: Objective = {
        id: 'stat-1',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Required complete',
        isRequired: true,
        isComplete: true,
        progress: { current: 1, target: 1, percentage: 100 },
      };

      const obj2: Objective = {
        id: 'stat-2',
        type: ObjectiveType.DEFEAT_ALL_ENEMIES,
        description: 'Required incomplete',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      const obj3: Objective = {
        id: 'stat-3',
        type: ObjectiveType.COLLECT_ITEMS,
        description: 'Optional complete',
        isRequired: false,
        isComplete: true,
        progress: { current: 1, target: 1, percentage: 100 },
      };

      objectiveManager.registerObjective(obj1);
      objectiveManager.registerObjective(obj2);
      objectiveManager.registerObjective(obj3);

      const stats = objectiveManager.getCompletionStats();

      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(2);
      expect(stats.incomplete).toBe(1);
      expect(stats.required).toBe(2);
      expect(stats.requiredCompleted).toBe(1);
      expect(stats.percentage).toBeCloseTo(66.67, 1);
    });

    test('should handle empty objectives', () => {
      const stats = objectiveManager.getCompletionStats();

      expect(stats.total).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.incomplete).toBe(0);
      expect(stats.required).toBe(0);
      expect(stats.requiredCompleted).toBe(0);
      expect(stats.percentage).toBe(0);
    });
  });

  describe('completeObjective', () => {
    test('should manually complete an objective', () => {
      const objective: Objective = {
        id: 'manual-complete',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Manual completion test',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      objectiveManager.registerObjective(objective);

      const result = objectiveManager.completeObjective('manual-complete');

      expect(result).toBe(true);
      expect(objectiveManager.isObjectiveComplete('manual-complete')).toBe(true);

      const completed = objectiveManager.getObjective('manual-complete');
      expect(completed!.progress.current).toBe(1);
      expect(completed!.progress.percentage).toBe(100);
    });

    test('should return false for non-existent objective', () => {
      const result = objectiveManager.completeObjective('non-existent');

      expect(result).toBe(false);
    });

    test('should handle already completed objective', () => {
      const objective: Objective = {
        id: 'already-complete',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Already complete',
        isRequired: true,
        isComplete: true,
        progress: { current: 1, target: 1, percentage: 100 },
      };

      objectiveManager.registerObjective(objective);

      const result = objectiveManager.completeObjective('already-complete');

      expect(result).toBe(true);
    });
  });

  describe('resetObjective', () => {
    test('should reset objective progress', () => {
      const objective: Objective = {
        id: 'reset-test',
        type: ObjectiveType.DEFEAT_ALL_ENEMIES,
        description: 'Reset test',
        isRequired: true,
        isComplete: true,
        progress: { current: 10, target: 10, percentage: 100 },
      };

      objectiveManager.registerObjective(objective);

      const result = objectiveManager.resetObjective('reset-test');

      expect(result).toBe(true);

      const reset = objectiveManager.getObjective('reset-test');
      expect(reset!.isComplete).toBe(false);
      expect(reset!.progress.current).toBe(0);
      expect(reset!.progress.percentage).toBe(0);
    });

    test('should return false for non-existent objective', () => {
      const result = objectiveManager.resetObjective('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('removeObjective', () => {
    test('should remove an objective', () => {
      const objective: Objective = {
        id: 'remove-test',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Remove test',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      objectiveManager.registerObjective(objective);

      const result = objectiveManager.removeObjective('remove-test');

      expect(result).toBe(true);
      expect(objectiveManager.getObjective('remove-test')).toBeNull();
    });

    test('should return false for non-existent objective', () => {
      const result = objectiveManager.removeObjective('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('clearAllObjectives', () => {
    test('should clear all objectives', () => {
      const obj1: Objective = {
        id: 'clear-1',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Clear 1',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      const obj2: Objective = {
        id: 'clear-2',
        type: ObjectiveType.DEFEAT_ALL_ENEMIES,
        description: 'Clear 2',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      objectiveManager.registerObjective(obj1);
      objectiveManager.registerObjective(obj2);

      objectiveManager.clearAllObjectives();

      expect(objectiveManager.getAllObjectives()).toHaveLength(0);
      expect(objectiveManager.getCompletionStats().total).toBe(0);
    });

    test('should emit objectives-cleared event', () => {
      const eventSpy = vi.fn();
      objectiveManager.on('objectives-cleared', eventSpy);

      const obj: Objective = {
        id: 'clear-event',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'Clear event',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      objectiveManager.registerObjective(obj);
      objectiveManager.clearAllObjectives();

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 1,
        })
      );
    });
  });

  describe('error handling', () => {
    test('should handle errors during registration gracefully', () => {
      const invalidObjective = {
        id: 'error-test',
        type: 'INVALID_TYPE' as any,
        description: 'Error test',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 1, percentage: 0 },
      };

      const result = objectiveManager.registerObjective(invalidObjective);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle errors during progress update gracefully', () => {
      const result = objectiveManager.updateProgress('non-existent', { current: 5 });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('event emissions', () => {
    test('should emit all expected events during lifecycle', () => {
      const registeredSpy = vi.fn();
      const progressSpy = vi.fn();
      const completedSpy = vi.fn();
      const resetSpy = vi.fn();
      const removedSpy = vi.fn();

      objectiveManager.on('objective-registered', registeredSpy);
      objectiveManager.on('objective-progress-updated', progressSpy);
      objectiveManager.on('objective-completed', completedSpy);
      objectiveManager.on('objective-reset', resetSpy);
      objectiveManager.on('objective-removed', removedSpy);

      const objective: Objective = {
        id: 'event-lifecycle',
        type: ObjectiveType.DEFEAT_ALL_ENEMIES,
        description: 'Event lifecycle test',
        isRequired: true,
        isComplete: false,
        progress: { current: 0, target: 10, percentage: 0 },
      };

      // Register
      objectiveManager.registerObjective(objective);
      expect(registeredSpy).toHaveBeenCalledTimes(1);

      // Update progress
      objectiveManager.updateProgress('event-lifecycle', { current: 5 });
      expect(progressSpy).toHaveBeenCalledTimes(1);

      // Complete
      objectiveManager.updateProgress('event-lifecycle', { current: 10 });
      expect(completedSpy).toHaveBeenCalledTimes(1);

      // Reset
      objectiveManager.resetObjective('event-lifecycle');
      expect(resetSpy).toHaveBeenCalledTimes(1);

      // Remove
      objectiveManager.removeObjective('event-lifecycle');
      expect(removedSpy).toHaveBeenCalledTimes(1);
    });
  });
});
