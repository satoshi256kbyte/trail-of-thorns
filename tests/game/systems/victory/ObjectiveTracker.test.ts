/**
 * ObjectiveTracker unit tests
 * Tests objective progress tracking, condition evaluation, and event handling
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { ObjectiveTracker } from '../../../../game/src/systems/victory/ObjectiveTracker';
import { ObjectiveManager } from '../../../../game/src/systems/victory/ObjectiveManager';
import {
  Objective,
  ObjectiveType,
  ObjectiveProgress,
} from '../../../../game/src/types/victory';
import { Unit, GameState, Position } from '../../../../game/src/types/gameplay';

// Mock Phaser Scene
class MockScene {
  events = {
    on: vi.fn(),
    emit: vi.fn(),
  };
}

// Helper function to create mock unit
function createMockUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: 'unit-1',
    name: 'Test Unit',
    position: { x: 0, y: 0 },
    stats: {
      maxHP: 100,
      maxMP: 50,
      attack: 20,
      defense: 15,
      speed: 10,
      movement: 3,
    },
    currentHP: 100,
    currentMP: 50,
    faction: 'player',
    hasActed: false,
    hasMoved: false,
    equipment: {},
    ...overrides,
  };
}

// Helper function to create mock objective
function createMockObjective(overrides: Partial<Objective> = {}): Objective {
  return {
    id: 'objective-1',
    type: ObjectiveType.DEFEAT_ALL_ENEMIES,
    description: 'Test Objective',
    isRequired: true,
    isComplete: false,
    progress: {
      current: 0,
      target: 1,
      percentage: 0,
    },
    ...overrides,
  };
}

// Helper function to create mock game state
function createMockGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    currentTurn: 1,
    activePlayer: 'player',
    phase: 'select',
    selectedUnit: undefined,
    gameResult: null,
    turnOrder: [],
    activeUnitIndex: 0,
    ...overrides,
  };
}

describe('ObjectiveTracker', () => {
  let scene: MockScene;
  let objectiveManager: ObjectiveManager;
  let objectiveTracker: ObjectiveTracker;

  beforeEach(() => {
    scene = new MockScene();
    objectiveManager = new ObjectiveManager(scene as any, {
      enableDebugLogs: false,
      validateOnRegister: false,
    });
    objectiveTracker = new ObjectiveTracker(scene as any, objectiveManager, {
      enableDebugLogs: false,
      autoTrack: true,
    });
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(objectiveTracker).toBeDefined();
      expect(objectiveTracker.getCurrentTurn()).toBe(1);
      expect(objectiveTracker.getDefeatedUnitsCount()).toBe(0);
    });

    test('should accept custom configuration', () => {
      const customTracker = new ObjectiveTracker(scene as any, objectiveManager, {
        enableDebugLogs: true,
        autoTrack: false,
        emitProgressEvents: false,
      });

      expect(customTracker).toBeDefined();
    });
  });

  describe('Game State Management', () => {
    test('should set game state', () => {
      const gameState = createMockGameState({ currentTurn: 5 });
      objectiveTracker.setGameState(gameState);

      expect(objectiveTracker.getCurrentTurn()).toBe(5);
    });

    test('should update turn from game state', () => {
      const gameState = createMockGameState({ currentTurn: 10 });
      objectiveTracker.setGameState(gameState);

      expect(objectiveTracker.getCurrentTurn()).toBe(10);
    });
  });

  describe('Unit Defeated Tracking', () => {
    test('should track defeated unit', () => {
      const unit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
      objectiveTracker.handleUnitDefeated({
        unit,
        timestamp: Date.now(),
      });

      expect(objectiveTracker.isUnitDefeated('enemy-1')).toBe(true);
      expect(objectiveTracker.getDefeatedUnitsCount()).toBe(1);
    });

    test('should track multiple defeated units', () => {
      const unit1 = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
      const unit2 = createMockUnit({ id: 'enemy-2', faction: 'enemy' });

      objectiveTracker.handleUnitDefeated({ unit: unit1, timestamp: Date.now() });
      objectiveTracker.handleUnitDefeated({ unit: unit2, timestamp: Date.now() });

      expect(objectiveTracker.getDefeatedUnitsCount()).toBe(2);
      expect(objectiveTracker.isUnitDefeated('enemy-1')).toBe(true);
      expect(objectiveTracker.isUnitDefeated('enemy-2')).toBe(true);
    });

    test('should track boss defeat', () => {
      const boss = createMockUnit({ id: 'boss-1', faction: 'enemy' });
      objectiveTracker.handleUnitDefeated({
        unit: boss,
        isBoss: true,
        timestamp: Date.now(),
      });

      expect(objectiveTracker.isUnitDefeated('boss-1')).toBe(true);
    });

    test('should handle invalid unit defeated event', () => {
      // Should not throw error
      objectiveTracker.handleUnitDefeated({} as any);
      expect(objectiveTracker.getDefeatedUnitsCount()).toBe(0);
    });
  });

  describe('Position Reached Tracking', () => {
    test('should track reached position', () => {
      const unit = createMockUnit({ id: 'player-1' });
      const position: Position = { x: 5, y: 5 };

      objectiveTracker.handlePositionReached({
        unit,
        position,
        timestamp: Date.now(),
      });

      const reachedPositions = objectiveTracker.getReachedPositions('player-1');
      expect(reachedPositions).toHaveLength(1);
      expect(reachedPositions[0]).toEqual(position);
    });

    test('should track multiple positions for same unit', () => {
      const unit = createMockUnit({ id: 'player-1' });
      const pos1: Position = { x: 1, y: 1 };
      const pos2: Position = { x: 2, y: 2 };

      objectiveTracker.handlePositionReached({ unit, position: pos1, timestamp: Date.now() });
      objectiveTracker.handlePositionReached({ unit, position: pos2, timestamp: Date.now() });

      const reachedPositions = objectiveTracker.getReachedPositions('player-1');
      expect(reachedPositions).toHaveLength(2);
    });

    test('should handle invalid position reached event', () => {
      // Should not throw error
      objectiveTracker.handlePositionReached({} as any);
      expect(objectiveTracker.getReachedPositions('player-1')).toHaveLength(0);
    });
  });

  describe('Turn Advance Tracking', () => {
    test('should track turn advance', () => {
      objectiveTracker.handleTurnAdvance({
        currentTurn: 2,
        previousTurn: 1,
        activePlayer: 'player',
        timestamp: Date.now(),
      });

      expect(objectiveTracker.getCurrentTurn()).toBe(2);
    });

    test('should track multiple turn advances', () => {
      objectiveTracker.handleTurnAdvance({
        currentTurn: 2,
        previousTurn: 1,
        activePlayer: 'player',
        timestamp: Date.now(),
      });
      objectiveTracker.handleTurnAdvance({
        currentTurn: 3,
        previousTurn: 2,
        activePlayer: 'enemy',
        timestamp: Date.now(),
      });

      expect(objectiveTracker.getCurrentTurn()).toBe(3);
    });

    test('should handle invalid turn advance event', () => {
      const initialTurn = objectiveTracker.getCurrentTurn();
      objectiveTracker.handleTurnAdvance(null as any);
      expect(objectiveTracker.getCurrentTurn()).toBe(initialTurn);
    });
  });

  describe('Objective Evaluation - Defeat Boss', () => {
    test('should evaluate boss defeat objective as incomplete', () => {
      const objective = createMockObjective({
        type: ObjectiveType.DEFEAT_BOSS,
        targetData: { bossId: 'boss-1' },
      });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(true);
      expect(result.isComplete).toBe(false);
      expect(result.progress.current).toBe(0);
      expect(result.progress.target).toBe(1);
    });

    test('should evaluate boss defeat objective as complete', () => {
      const objective = createMockObjective({
        type: ObjectiveType.DEFEAT_BOSS,
        targetData: { bossId: 'boss-1' },
      });

      // Defeat the boss
      const boss = createMockUnit({ id: 'boss-1', faction: 'enemy' });
      objectiveTracker.handleUnitDefeated({ unit: boss, isBoss: true, timestamp: Date.now() });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(true);
      expect(result.isComplete).toBe(true);
      expect(result.progress.current).toBe(1);
      expect(result.progress.percentage).toBe(100);
    });

    test('should fail evaluation without boss ID', () => {
      const objective = createMockObjective({
        type: ObjectiveType.DEFEAT_BOSS,
        targetData: {},
      });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Boss ID not specified');
    });
  });

  describe('Objective Evaluation - Defeat All Enemies', () => {
    test('should evaluate defeat all enemies objective', () => {
      const enemy1 = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
      const enemy2 = createMockUnit({ id: 'enemy-2', faction: 'enemy' });
      const gameState = createMockGameState({
        turnOrder: [enemy1, enemy2],
      });

      objectiveTracker.setGameState(gameState);

      const objective = createMockObjective({
        type: ObjectiveType.DEFEAT_ALL_ENEMIES,
      });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(true);
      expect(result.isComplete).toBe(false);
      expect(result.progress.current).toBe(0);
      expect(result.progress.target).toBe(2);
    });

    test('should evaluate as complete when all enemies defeated', () => {
      const enemy1 = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
      const enemy2 = createMockUnit({ id: 'enemy-2', faction: 'enemy' });
      const gameState = createMockGameState({
        turnOrder: [enemy1, enemy2],
      });

      objectiveTracker.setGameState(gameState);
      objectiveTracker.handleUnitDefeated({ unit: enemy1, timestamp: Date.now() });
      objectiveTracker.handleUnitDefeated({ unit: enemy2, timestamp: Date.now() });

      const objective = createMockObjective({
        type: ObjectiveType.DEFEAT_ALL_ENEMIES,
      });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(true);
      expect(result.isComplete).toBe(true);
      expect(result.progress.current).toBe(2);
      expect(result.progress.percentage).toBe(100);
    });

    test('should fail evaluation without game state', () => {
      const objective = createMockObjective({
        type: ObjectiveType.DEFEAT_ALL_ENEMIES,
      });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Game state not available');
    });
  });

  describe('Objective Evaluation - Reach Position', () => {
    test('should evaluate reach position objective as incomplete', () => {
      const player = createMockUnit({ id: 'player-1', position: { x: 0, y: 0 } });
      const gameState = createMockGameState({
        turnOrder: [player],
      });

      objectiveTracker.setGameState(gameState);

      const objective = createMockObjective({
        type: ObjectiveType.REACH_POSITION,
        targetData: { targetPosition: { x: 5, y: 5 } },
      });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(true);
      expect(result.isComplete).toBe(false);
    });

    test('should evaluate reach position objective as complete', () => {
      const player = createMockUnit({ id: 'player-1', position: { x: 5, y: 5 } });
      const gameState = createMockGameState({
        turnOrder: [player],
      });

      objectiveTracker.setGameState(gameState);

      const objective = createMockObjective({
        type: ObjectiveType.REACH_POSITION,
        targetData: { targetPosition: { x: 5, y: 5 } },
      });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(true);
      expect(result.isComplete).toBe(true);
      expect(result.progress.percentage).toBe(100);
    });

    test('should evaluate reach area objective', () => {
      const player = createMockUnit({ id: 'player-1', position: { x: 3, y: 3 } });
      const gameState = createMockGameState({
        turnOrder: [player],
      });

      objectiveTracker.setGameState(gameState);

      const objective = createMockObjective({
        type: ObjectiveType.REACH_POSITION,
        targetData: {
          targetArea: [
            { x: 3, y: 3 },
            { x: 4, y: 4 },
            { x: 5, y: 5 },
          ],
        },
      });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(true);
      expect(result.isComplete).toBe(true);
    });

    test('should fail evaluation without target position or area', () => {
      const gameState = createMockGameState();
      objectiveTracker.setGameState(gameState);

      const objective = createMockObjective({
        type: ObjectiveType.REACH_POSITION,
        targetData: {},
      });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Target position or area not specified');
    });
  });

  describe('Objective Evaluation - Survive Turns', () => {
    test('should evaluate survive turns objective as incomplete', () => {
      objectiveTracker.handleTurnAdvance({
        currentTurn: 3,
        previousTurn: 2,
        activePlayer: 'player',
        timestamp: Date.now(),
      });

      const objective = createMockObjective({
        type: ObjectiveType.SURVIVE_TURNS,
        targetData: { surviveTurns: 10 },
      });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(true);
      expect(result.isComplete).toBe(false);
      expect(result.progress.current).toBe(3);
      expect(result.progress.target).toBe(10);
    });

    test('should evaluate survive turns objective as complete', () => {
      objectiveTracker.handleTurnAdvance({
        currentTurn: 10,
        previousTurn: 9,
        activePlayer: 'player',
        timestamp: Date.now(),
      });

      const objective = createMockObjective({
        type: ObjectiveType.SURVIVE_TURNS,
        targetData: { surviveTurns: 10 },
      });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(true);
      expect(result.isComplete).toBe(true);
      expect(result.progress.percentage).toBe(100);
    });

    test('should fail evaluation without survive turns', () => {
      const objective = createMockObjective({
        type: ObjectiveType.SURVIVE_TURNS,
        targetData: {},
      });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Survive turns not specified');
    });
  });

  describe('Objective Evaluation - Protect Unit', () => {
    test('should evaluate protect unit objective as successful', () => {
      const protectedUnit = createMockUnit({ id: 'vip-1', currentHP: 50 });
      const gameState = createMockGameState({
        turnOrder: [protectedUnit],
      });

      objectiveTracker.setGameState(gameState);

      const objective = createMockObjective({
        type: ObjectiveType.PROTECT_UNIT,
        targetData: { protectUnitId: 'vip-1' },
      });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(true);
      expect(result.isComplete).toBe(false); // Never complete until stage ends
      expect(result.progress.current).toBe(1);
    });

    test('should evaluate protect unit objective as failed when unit defeated', () => {
      const protectedUnit = createMockUnit({ id: 'vip-1', currentHP: 0 });
      const gameState = createMockGameState({
        turnOrder: [protectedUnit],
      });

      objectiveTracker.setGameState(gameState);
      objectiveTracker.handleUnitDefeated({ unit: protectedUnit, timestamp: Date.now() });

      const objective = createMockObjective({
        type: ObjectiveType.PROTECT_UNIT,
        targetData: { protectUnitId: 'vip-1' },
      });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(true);
      expect(result.progress.current).toBe(0);
      expect(result.message).toContain('defeated');
    });

    test('should fail evaluation without protected unit ID', () => {
      const gameState = createMockGameState();
      objectiveTracker.setGameState(gameState);

      const objective = createMockObjective({
        type: ObjectiveType.PROTECT_UNIT,
        targetData: {},
      });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Protected unit ID not specified');
    });
  });

  describe('Objective Evaluation - Custom', () => {
    test('should evaluate custom objective with condition function', () => {
      const gameState = createMockGameState({ currentTurn: 5 });
      objectiveTracker.setGameState(gameState);

      const objective = createMockObjective({
        type: ObjectiveType.CUSTOM,
        targetData: {
          customCondition: (state: GameState) => state.currentTurn >= 5,
        },
      });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(true);
      expect(result.isComplete).toBe(true);
    });

    test('should fail evaluation without custom condition', () => {
      const gameState = createMockGameState();
      objectiveTracker.setGameState(gameState);

      const objective = createMockObjective({
        type: ObjectiveType.CUSTOM,
        targetData: {},
      });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Custom condition function not specified');
    });

    test('should handle custom condition evaluation error', () => {
      const gameState = createMockGameState();
      objectiveTracker.setGameState(gameState);

      const objective = createMockObjective({
        type: ObjectiveType.CUSTOM,
        targetData: {
          customCondition: () => {
            throw new Error('Test error');
          },
        },
      });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Custom condition evaluation failed');
    });
  });

  describe('Track Objective Progress', () => {
    test('should track progress for all objectives', () => {
      const objective1 = createMockObjective({ id: 'obj-1' });
      const objective2 = createMockObjective({ id: 'obj-2' });

      objectiveManager.registerObjective(objective1);
      objectiveManager.registerObjective(objective2);

      const gameState = createMockGameState();
      objectiveTracker.setGameState(gameState);

      const results = objectiveTracker.trackObjectiveProgress();

      expect(results).toHaveLength(2);
    });

    test('should skip completed objectives', () => {
      const objective1 = createMockObjective({ id: 'obj-1', isComplete: true });
      const objective2 = createMockObjective({ id: 'obj-2', isComplete: false });

      objectiveManager.registerObjective(objective1);
      objectiveManager.registerObjective(objective2);

      const gameState = createMockGameState();
      objectiveTracker.setGameState(gameState);

      const results = objectiveTracker.trackObjectiveProgress();

      expect(results).toHaveLength(1);
      expect(results[0].objectiveId).toBe('obj-2');
    });
  });

  describe('Reset', () => {
    test('should reset tracking state', () => {
      const unit = createMockUnit({ id: 'enemy-1' });
      objectiveTracker.handleUnitDefeated({ unit, timestamp: Date.now() });
      objectiveTracker.handleTurnAdvance({
        currentTurn: 5,
        previousTurn: 4,
        activePlayer: 'player',
        timestamp: Date.now(),
      });

      objectiveTracker.reset();

      expect(objectiveTracker.getDefeatedUnitsCount()).toBe(0);
      expect(objectiveTracker.getCurrentTurn()).toBe(1);
      expect(objectiveTracker.isUnitDefeated('enemy-1')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle null objective gracefully', () => {
      const result = objectiveTracker.evaluateObjectiveCondition(null as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('null or undefined');
    });

    test('should handle unknown objective type', () => {
      const objective = createMockObjective({
        type: 'unknown_type' as any,
      });

      const result = objectiveTracker.evaluateObjectiveCondition(objective);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown objective type');
    });
  });
});
