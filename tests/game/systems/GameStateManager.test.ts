/**
 * Unit tests for GameStateManager
 * Tests turn order calculation, state transitions, and unit management
 */

import { GameStateManager } from '../../../game/src/systems/GameStateManager';
import { Unit, GameplayError } from '../../../game/src/types/gameplay';

// Mock Phaser EventEmitter
class MockEventEmitter {
  private events: { [key: string]: Function[] } = {};

  emit(event: string, data?: any): void {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }

  on(event: string, callback: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: Function): void {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }

  getEmittedEvents(): { [key: string]: any[] } {
    const emittedEvents: { [key: string]: any[] } = {};
    Object.keys(this.events).forEach(key => {
      emittedEvents[key] = [];
    });
    return emittedEvents;
  }
}

// Helper function to create test units
function createTestUnit(
  id: string,
  name: string,
  faction: 'player' | 'enemy',
  speed: number,
  hasActed: boolean = false,
  hasMoved: boolean = false
): Unit {
  return {
    id,
    name,
    position: { x: 0, y: 0 },
    stats: {
      maxHP: 100,
      maxMP: 50,
      attack: 20,
      defense: 15,
      speed,
      movement: 3,
    },
    currentHP: 100,
    currentMP: 50,
    faction,
    hasActed,
    hasMoved,
  };
}

describe('GameStateManager', () => {
  let gameStateManager: GameStateManager;
  let mockEventEmitter: MockEventEmitter;

  beforeEach(() => {
    mockEventEmitter = new MockEventEmitter();
    gameStateManager = new GameStateManager(mockEventEmitter as any);
  });

  describe('Constructor', () => {
    it('should initialize with default game state', () => {
      const gameState = gameStateManager.getGameState();

      expect(gameState.currentTurn).toBe(1);
      expect(gameState.activePlayer).toBe('player');
      expect(gameState.phase).toBe('select');
      expect(gameState.selectedUnit).toBeUndefined();
      expect(gameState.gameResult).toBeNull();
      expect(gameState.turnOrder).toEqual([]);
      expect(gameState.activeUnitIndex).toBe(0);
    });

    it('should work without event emitter', () => {
      const manager = new GameStateManager();
      const gameState = manager.getGameState();

      expect(gameState.currentTurn).toBe(1);
      expect(gameState.activePlayer).toBe('player');
    });
  });

  describe('initializeTurnOrder', () => {
    it('should sort units by speed (highest first)', () => {
      const units = [
        createTestUnit('slow', 'Slow Unit', 'player', 5),
        createTestUnit('fast', 'Fast Unit', 'enemy', 10),
        createTestUnit('medium', 'Medium Unit', 'player', 7),
      ];

      const result = gameStateManager.initializeTurnOrder(units);

      expect(result.success).toBe(true);

      const turnOrder = gameStateManager.getGameState().turnOrder;
      expect(turnOrder).toHaveLength(3);
      expect(turnOrder[0].id).toBe('fast'); // speed 10
      expect(turnOrder[1].id).toBe('medium'); // speed 7
      expect(turnOrder[2].id).toBe('slow'); // speed 5
    });

    it('should prioritize player units in speed ties', () => {
      const units = [
        createTestUnit('enemy1', 'Enemy 1', 'enemy', 8),
        createTestUnit('player1', 'Player 1', 'player', 8),
        createTestUnit('enemy2', 'Enemy 2', 'enemy', 8),
        createTestUnit('player2', 'Player 2', 'player', 8),
      ];

      const result = gameStateManager.initializeTurnOrder(units);

      expect(result.success).toBe(true);

      const turnOrder = gameStateManager.getGameState().turnOrder;
      expect(turnOrder[0].faction).toBe('player');
      expect(turnOrder[1].faction).toBe('player');
      expect(turnOrder[2].faction).toBe('enemy');
      expect(turnOrder[3].faction).toBe('enemy');
    });

    it('should use unit ID for consistent ordering in complete ties', () => {
      const units = [
        createTestUnit('c', 'Unit C', 'player', 8),
        createTestUnit('a', 'Unit A', 'player', 8),
        createTestUnit('b', 'Unit B', 'player', 8),
      ];

      const result = gameStateManager.initializeTurnOrder(units);

      expect(result.success).toBe(true);

      const turnOrder = gameStateManager.getGameState().turnOrder;
      expect(turnOrder[0].id).toBe('a');
      expect(turnOrder[1].id).toBe('b');
      expect(turnOrder[2].id).toBe('c');
    });

    it('should reset unit action states', () => {
      const units = [
        createTestUnit('unit1', 'Unit 1', 'player', 8, true, true),
        createTestUnit('unit2', 'Unit 2', 'enemy', 6, true, false),
      ];

      const result = gameStateManager.initializeTurnOrder(units);

      expect(result.success).toBe(true);

      const turnOrder = gameStateManager.getGameState().turnOrder;
      turnOrder.forEach(unit => {
        expect(unit.hasActed).toBe(false);
        expect(unit.hasMoved).toBe(false);
      });
    });

    it('should set active player based on first unit', () => {
      const units = [
        createTestUnit('enemy1', 'Enemy 1', 'enemy', 10),
        createTestUnit('player1', 'Player 1', 'player', 8),
      ];

      const result = gameStateManager.initializeTurnOrder(units);

      expect(result.success).toBe(true);
      expect(gameStateManager.getCurrentPlayer()).toBe('enemy');
    });

    it('should emit turn-order-initialized event', () => {
      const units = [createTestUnit('unit1', 'Unit 1', 'player', 8)];
      let emittedData: any = null;

      mockEventEmitter.on('turn-order-initialized', data => {
        emittedData = data;
      });

      gameStateManager.initializeTurnOrder(units);

      expect(emittedData).not.toBeNull();
      expect(emittedData.turnOrder).toHaveLength(1);
      expect(emittedData.activeUnit.id).toBe('unit1');
    });

    it('should return error for empty units array', () => {
      const result = gameStateManager.initializeTurnOrder([]);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_STAGE_DATA);
      expect(result.message).toContain('empty or invalid');
    });

    it('should return error for invalid units', () => {
      const invalidUnits = [
        { id: 'invalid', name: 'Invalid', stats: { speed: 0 } }, // Invalid speed
      ] as Unit[];

      const result = gameStateManager.initializeTurnOrder(invalidUnits);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.CHARACTER_LOAD_FAILED);
    });
  });

  describe('nextTurn', () => {
    beforeEach(() => {
      const units = [
        createTestUnit('player1', 'Player 1', 'player', 10),
        createTestUnit('enemy1', 'Enemy 1', 'enemy', 8),
        createTestUnit('player2', 'Player 2', 'player', 6),
      ];
      gameStateManager.initializeTurnOrder(units);
    });

    it('should advance to next unit in turn order', () => {
      expect(gameStateManager.getActiveUnit()?.id).toBe('player1');

      const result = gameStateManager.nextTurn();

      expect(result.success).toBe(true);
      expect(gameStateManager.getActiveUnit()?.id).toBe('enemy1');
      expect(gameStateManager.getCurrentPlayer()).toBe('enemy');
    });

    it('should mark current unit as having acted', () => {
      const activeUnit = gameStateManager.getActiveUnit();
      expect(activeUnit?.hasActed).toBe(false);

      gameStateManager.nextTurn();

      expect(activeUnit?.hasActed).toBe(true);
    });

    it('should start new round when all units have acted', () => {
      // Advance through all units
      gameStateManager.nextTurn(); // player1 -> enemy1
      gameStateManager.nextTurn(); // enemy1 -> player2

      expect(gameStateManager.getCurrentTurn()).toBe(1);

      const result = gameStateManager.nextTurn(); // player2 -> new round

      expect(result.success).toBe(true);
      expect(gameStateManager.getCurrentTurn()).toBe(2);
      expect(gameStateManager.getActiveUnit()?.id).toBe('player1');
      expect(gameStateManager.getCurrentPlayer()).toBe('player');
    });

    it('should reset unit action states on new round', () => {
      // Mark all units as acted
      gameStateManager.nextTurn();
      gameStateManager.nextTurn();
      gameStateManager.nextTurn(); // Start new round

      const turnOrder = gameStateManager.getGameState().turnOrder;
      turnOrder.forEach(unit => {
        expect(unit.hasActed).toBe(false);
        expect(unit.hasMoved).toBe(false);
      });
    });

    it('should clear selected unit when switching to enemy turn', () => {
      const playerUnit = gameStateManager.getActiveUnit();
      gameStateManager.selectUnit(playerUnit!);

      expect(gameStateManager.getSelectedUnit()).toBeDefined();

      gameStateManager.nextTurn(); // Switch to enemy turn

      expect(gameStateManager.getSelectedUnit()).toBeUndefined();
    });

    it('should emit turn-changed event', () => {
      let emittedData: any = null;

      mockEventEmitter.on('turn-changed', data => {
        emittedData = data;
      });

      gameStateManager.nextTurn();

      expect(emittedData).not.toBeNull();
      expect(emittedData.currentTurn).toBe(1);
      expect(emittedData.activePlayer).toBe('enemy');
      expect(emittedData.activeUnit.id).toBe('enemy1');
      expect(emittedData.phase).toBe('enemy');
    });

    it('should emit new-round-started event', () => {
      let emittedData: any = null;

      mockEventEmitter.on('new-round-started', data => {
        emittedData = data;
      });

      // Advance through all units to trigger new round
      gameStateManager.nextTurn();
      gameStateManager.nextTurn();
      gameStateManager.nextTurn();

      expect(emittedData).not.toBeNull();
      expect(emittedData.currentTurn).toBe(2);
      expect(emittedData.activePlayer).toBe('player');
      expect(emittedData.activeUnit.id).toBe('player1');
    });

    it('should return error when no units in turn order', () => {
      const emptyManager = new GameStateManager();

      const result = emptyManager.nextTurn();

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_TURN_STATE);
    });
  });

  describe('selectUnit', () => {
    let playerUnit: Unit;
    let enemyUnit: Unit;

    beforeEach(() => {
      const units = [
        createTestUnit('player1', 'Player 1', 'player', 10),
        createTestUnit('enemy1', 'Enemy 1', 'enemy', 8),
      ];
      gameStateManager.initializeTurnOrder(units);

      playerUnit = gameStateManager.getPlayerUnits()[0];
      enemyUnit = gameStateManager.getEnemyUnits()[0];
    });

    it('should select valid player unit during player turn', () => {
      const result = gameStateManager.selectUnit(playerUnit);

      expect(result.success).toBe(true);
      expect(gameStateManager.getSelectedUnit()).toBe(playerUnit);
      expect(gameStateManager.getCurrentPhase()).toBe('select');
    });

    it('should deselect unit when passed null', () => {
      gameStateManager.selectUnit(playerUnit);
      expect(gameStateManager.getSelectedUnit()).toBeDefined();

      const result = gameStateManager.selectUnit(null);

      expect(result.success).toBe(true);
      expect(gameStateManager.getSelectedUnit()).toBeUndefined();
    });

    it('should not allow selecting enemy unit during player turn', () => {
      const result = gameStateManager.selectUnit(enemyUnit);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
      expect(result.message).toContain('Cannot select enemy unit');
    });

    it('should not allow selecting units that have already acted', () => {
      playerUnit.hasActed = true;

      const result = gameStateManager.selectUnit(playerUnit);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
      expect(result.message).toContain('already acted');
    });

    it('should emit unit-selected event', () => {
      let emittedData: any = null;

      mockEventEmitter.on('unit-selected', data => {
        emittedData = data;
      });

      gameStateManager.selectUnit(playerUnit);

      expect(emittedData).not.toBeNull();
      expect(emittedData.selectedUnit).toBe(playerUnit);
      expect(emittedData.canAct).toBe(true);
      expect(emittedData.canMove).toBe(true);
    });

    it('should emit unit-deselected event when deselecting', () => {
      let deselectedEmitted = false;

      mockEventEmitter.on('unit-deselected', () => {
        deselectedEmitted = true;
      });

      gameStateManager.selectUnit(null);

      expect(deselectedEmitted).toBe(true);
    });

    it('should return error for undefined unit', () => {
      const result = gameStateManager.selectUnit(undefined as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.UNIT_NOT_FOUND);
    });
  });

  describe('Getter methods', () => {
    beforeEach(() => {
      const units = [
        createTestUnit('player1', 'Player 1', 'player', 10),
        createTestUnit('enemy1', 'Enemy 1', 'enemy', 8),
        createTestUnit('player2', 'Player 2', 'player', 6),
      ];
      gameStateManager.initializeTurnOrder(units);
    });

    it('should return current player', () => {
      expect(gameStateManager.getCurrentPlayer()).toBe('player');

      gameStateManager.nextTurn();
      expect(gameStateManager.getCurrentPlayer()).toBe('enemy');
    });

    it('should return active unit', () => {
      expect(gameStateManager.getActiveUnit()?.id).toBe('player1');

      gameStateManager.nextTurn();
      expect(gameStateManager.getActiveUnit()?.id).toBe('enemy1');
    });

    it('should return current turn number', () => {
      expect(gameStateManager.getCurrentTurn()).toBe(1);

      // Complete a full round
      gameStateManager.nextTurn();
      gameStateManager.nextTurn();
      gameStateManager.nextTurn();

      expect(gameStateManager.getCurrentTurn()).toBe(2);
    });

    it('should return current phase', () => {
      expect(gameStateManager.getCurrentPhase()).toBe('select');

      gameStateManager.nextTurn();
      expect(gameStateManager.getCurrentPhase()).toBe('enemy');
    });

    it('should return player and enemy units', () => {
      const playerUnits = gameStateManager.getPlayerUnits();
      const enemyUnits = gameStateManager.getEnemyUnits();

      expect(playerUnits).toHaveLength(2);
      expect(enemyUnits).toHaveLength(1);
      expect(playerUnits.every(unit => unit.faction === 'player')).toBe(true);
      expect(enemyUnits.every(unit => unit.faction === 'enemy')).toBe(true);
    });

    it('should return units that can act', () => {
      const unitsCanAct = gameStateManager.getUnitsCanAct();
      expect(unitsCanAct).toHaveLength(3);

      gameStateManager.nextTurn(); // Mark first unit as acted

      const unitsCanActAfter = gameStateManager.getUnitsCanAct();
      expect(unitsCanActAfter).toHaveLength(2);
    });
  });

  describe('Phase and game result management', () => {
    beforeEach(() => {
      const units = [createTestUnit('player1', 'Player 1', 'player', 10)];
      gameStateManager.initializeTurnOrder(units);
    });

    it('should set valid phase', () => {
      const result = gameStateManager.setPhase('move');

      expect(result.success).toBe(true);
      expect(gameStateManager.getCurrentPhase()).toBe('move');
    });

    it('should emit phase-changed event', () => {
      let emittedData: any = null;

      mockEventEmitter.on('phase-changed', data => {
        emittedData = data;
      });

      gameStateManager.setPhase('action');

      expect(emittedData).not.toBeNull();
      expect(emittedData.phase).toBe('action');
    });

    it('should reject invalid phase', () => {
      const result = gameStateManager.setPhase('invalid' as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_TURN_STATE);
    });

    it('should set game result', () => {
      const result = gameStateManager.setGameResult('victory');

      expect(result.success).toBe(true);
      expect(gameStateManager.getGameState().gameResult).toBe('victory');
      expect(gameStateManager.getCurrentPhase()).toBe('victory');
      expect(gameStateManager.isGameEnded()).toBe(true);
    });

    it('should emit game-ended event', () => {
      let emittedData: any = null;

      mockEventEmitter.on('game-ended', data => {
        emittedData = data;
      });

      gameStateManager.setGameResult('defeat');

      expect(emittedData).not.toBeNull();
      expect(emittedData.result).toBe('defeat');
      expect(emittedData.currentTurn).toBe(1);
    });
  });

  describe('Turn state checks', () => {
    beforeEach(() => {
      const units = [
        createTestUnit('player1', 'Player 1', 'player', 10),
        createTestUnit('enemy1', 'Enemy 1', 'enemy', 8),
      ];
      gameStateManager.initializeTurnOrder(units);
    });

    it('should correctly identify player turn', () => {
      expect(gameStateManager.isPlayerTurn()).toBe(true);
      expect(gameStateManager.isEnemyTurn()).toBe(false);
    });

    it('should correctly identify enemy turn', () => {
      gameStateManager.nextTurn();

      expect(gameStateManager.isPlayerTurn()).toBe(false);
      expect(gameStateManager.isEnemyTurn()).toBe(true);
    });

    it('should correctly identify game ended state', () => {
      expect(gameStateManager.isGameEnded()).toBe(false);

      gameStateManager.setGameResult('victory');

      expect(gameStateManager.isGameEnded()).toBe(true);
    });
  });

  describe('Unit management', () => {
    let units: Unit[];

    beforeEach(() => {
      units = [
        createTestUnit('player1', 'Player 1', 'player', 10),
        createTestUnit('enemy1', 'Enemy 1', 'enemy', 8),
      ];
      gameStateManager.initializeTurnOrder(units);
    });

    it('should update unit in turn order', () => {
      const updatedUnit = { ...units[0], currentHP: 50 };

      const result = gameStateManager.updateUnit(updatedUnit);

      expect(result.success).toBe(true);
      expect(gameStateManager.getGameState().turnOrder[0].currentHP).toBe(50);
    });

    it('should update selected unit when updating', () => {
      gameStateManager.selectUnit(units[0]);
      const updatedUnit = { ...units[0], currentHP: 50 };

      gameStateManager.updateUnit(updatedUnit);

      expect(gameStateManager.getSelectedUnit()?.currentHP).toBe(50);
    });

    it('should emit unit-updated event', () => {
      let emittedData: any = null;

      mockEventEmitter.on('unit-updated', data => {
        emittedData = data;
      });

      const updatedUnit = { ...units[0], currentHP: 50 };
      gameStateManager.updateUnit(updatedUnit);

      expect(emittedData).not.toBeNull();
      expect(emittedData.unit.currentHP).toBe(50);
      expect(emittedData.isActive).toBe(true);
    });

    it('should return error for non-existent unit', () => {
      const nonExistentUnit = createTestUnit('nonexistent', 'Non-existent', 'player', 5);

      const result = gameStateManager.updateUnit(nonExistentUnit);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.UNIT_NOT_FOUND);
    });
  });

  describe('Reset functionality', () => {
    it('should reset game state to initial values', () => {
      const units = [createTestUnit('player1', 'Player 1', 'player', 10)];
      gameStateManager.initializeTurnOrder(units);
      gameStateManager.nextTurn();
      gameStateManager.setPhase('action');

      let resetEmitted = false;
      mockEventEmitter.on('game-state-reset', () => {
        resetEmitted = true;
      });

      gameStateManager.reset();

      const gameState = gameStateManager.getGameState();
      expect(gameState.currentTurn).toBe(1);
      expect(gameState.activePlayer).toBe('player');
      expect(gameState.phase).toBe('select');
      expect(gameState.turnOrder).toEqual([]);
      expect(resetEmitted).toBe(true);
    });
  });
});
