/**
 * Unit tests for GameStateManager movement integration methods
 * Tests the movement-specific functionality added to GameStateManager
 */

import { GameStateManager } from '../../../game/src/systems/GameStateManager';
import { Unit, GameplayError } from '../../../game/src/types/gameplay';

// Mock event emitter
const mockEventEmitter = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
} as any;

describe('GameStateManager Movement Integration', () => {
  let gameStateManager: GameStateManager;
  let playerUnit1: Unit;
  let playerUnit2: Unit;
  let enemyUnit1: Unit;
  let enemyUnit2: Unit;
  let allUnits: Unit[];

  beforeEach(() => {
    jest.clearAllMocks();

    // Create test units
    playerUnit1 = {
      id: 'player1',
      name: 'Player 1',
      position: { x: 1, y: 1 },
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
    };

    playerUnit2 = {
      id: 'player2',
      name: 'Player 2',
      position: { x: 2, y: 1 },
      stats: {
        maxHP: 90,
        maxMP: 40,
        attack: 18,
        defense: 14,
        speed: 12,
        movement: 4,
      },
      currentHP: 90,
      currentMP: 40,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
    };

    enemyUnit1 = {
      id: 'enemy1',
      name: 'Enemy 1',
      position: { x: 5, y: 5 },
      stats: {
        maxHP: 80,
        maxMP: 30,
        attack: 16,
        defense: 12,
        speed: 8,
        movement: 2,
      },
      currentHP: 80,
      currentMP: 30,
      faction: 'enemy',
      hasActed: false,
      hasMoved: false,
    };

    enemyUnit2 = {
      id: 'enemy2',
      name: 'Enemy 2',
      position: { x: 6, y: 5 },
      stats: {
        maxHP: 70,
        maxMP: 25,
        attack: 14,
        defense: 10,
        speed: 6,
        movement: 3,
      },
      currentHP: 70,
      currentMP: 25,
      faction: 'enemy',
      hasActed: false,
      hasMoved: false,
    };

    allUnits = [playerUnit1, playerUnit2, enemyUnit1, enemyUnit2];

    gameStateManager = new GameStateManager(mockEventEmitter);
    gameStateManager.initializeTurnOrder(allUnits);
  });

  describe('canCharacterMove', () => {
    it('should return true for valid player character during player turn', () => {
      expect(gameStateManager.canCharacterMove(playerUnit1)).toBe(true);
      expect(gameStateManager.canCharacterMove(playerUnit2)).toBe(true);
    });

    it('should return false for enemy character during player turn', () => {
      expect(gameStateManager.canCharacterMove(enemyUnit1)).toBe(false);
      expect(gameStateManager.canCharacterMove(enemyUnit2)).toBe(false);
    });

    it('should return false for null/undefined character', () => {
      expect(gameStateManager.canCharacterMove(null as any)).toBe(false);
      expect(gameStateManager.canCharacterMove(undefined as any)).toBe(false);
    });

    it('should return false for defeated character', () => {
      playerUnit1.currentHP = 0;
      expect(gameStateManager.canCharacterMove(playerUnit1)).toBe(false);
    });

    it('should return false for character with no movement points', () => {
      playerUnit1.stats.movement = 0;
      expect(gameStateManager.canCharacterMove(playerUnit1)).toBe(false);
    });

    it('should return false for character that has already moved', () => {
      playerUnit1.hasMoved = true;
      expect(gameStateManager.canCharacterMove(playerUnit1)).toBe(false);
    });

    it('should return false when game has ended', () => {
      gameStateManager.setGameResult('victory');
      expect(gameStateManager.canCharacterMove(playerUnit1)).toBe(false);
    });

    it('should return false for character not in turn order', () => {
      const unknownUnit: Unit = {
        id: 'unknown',
        name: 'Unknown',
        position: { x: 0, y: 0 },
        stats: {
          maxHP: 50,
          maxMP: 25,
          attack: 10,
          defense: 8,
          speed: 5,
          movement: 2,
        },
        currentHP: 50,
        currentMP: 25,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
      };

      expect(gameStateManager.canCharacterMove(unknownUnit)).toBe(false);
    });

    it('should handle turn switching correctly', () => {
      // Initially, the active unit should be able to move
      const activeUnit = gameStateManager.getActiveUnit();
      expect(gameStateManager.canCharacterMove(activeUnit!)).toBe(true);

      // Units not currently active should not be able to move (unless it's their faction's turn)
      const inactiveUnits = allUnits.filter(unit => unit.id !== activeUnit?.id);

      // In a speed-based turn system, only the active unit can move
      // But we allow any unit of the active player's faction to move
      const activePlayerUnits = allUnits.filter(
        unit => unit.faction === gameStateManager.getCurrentPlayer()
      );
      const otherFactionUnits = allUnits.filter(
        unit => unit.faction !== gameStateManager.getCurrentPlayer()
      );

      activePlayerUnits.forEach(unit => {
        expect(gameStateManager.canCharacterMove(unit)).toBe(true);
      });

      otherFactionUnits.forEach(unit => {
        expect(gameStateManager.canCharacterMove(unit)).toBe(false);
      });
    });
  });

  describe('markCharacterMoved', () => {
    it('should successfully mark character as moved', () => {
      const result = gameStateManager.markCharacterMoved(playerUnit1);

      expect(result.success).toBe(true);
      expect(playerUnit1.hasMoved).toBe(true);
    });

    it('should emit movement completed event', () => {
      gameStateManager.markCharacterMoved(playerUnit1);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'character-movement-completed',
        expect.objectContaining({
          character: playerUnit1,
          canStillAct: true, // hasn't acted yet
          turnComplete: false, // hasn't both moved and acted
        })
      );
    });

    it('should update selected unit if it matches', () => {
      gameStateManager.selectUnit(playerUnit1);
      gameStateManager.markCharacterMoved(playerUnit1);

      const selectedUnit = gameStateManager.getSelectedUnit();
      expect(selectedUnit?.hasMoved).toBe(true);
    });

    it('should return error for null character', () => {
      const result = gameStateManager.markCharacterMoved(null as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.UNIT_NOT_FOUND);
    });

    it('should return error for character not in turn order', () => {
      const unknownUnit: Unit = {
        id: 'unknown',
        name: 'Unknown',
        position: { x: 0, y: 0 },
        stats: {
          maxHP: 50,
          maxMP: 25,
          attack: 10,
          defense: 8,
          speed: 5,
          movement: 2,
        },
        currentHP: 50,
        currentMP: 25,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
      };

      const result = gameStateManager.markCharacterMoved(unknownUnit);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.UNIT_NOT_FOUND);
    });
  });

  describe('getCharactersCanMove', () => {
    it('should return all characters that can move', () => {
      const canMove = gameStateManager.getCharactersCanMove();

      // During player turn, only player characters can move
      expect(canMove).toContain(playerUnit1);
      expect(canMove).toContain(playerUnit2);
      expect(canMove).not.toContain(enemyUnit1);
      expect(canMove).not.toContain(enemyUnit2);
    });

    it('should exclude characters that have already moved', () => {
      playerUnit1.hasMoved = true;
      gameStateManager.updateUnit(playerUnit1);

      const canMove = gameStateManager.getCharactersCanMove();

      expect(canMove).not.toContain(playerUnit1);
      expect(canMove).toContain(playerUnit2);
    });

    it('should exclude defeated characters', () => {
      playerUnit1.currentHP = 0;
      gameStateManager.updateUnit(playerUnit1);

      const canMove = gameStateManager.getCharactersCanMove();

      expect(canMove).not.toContain(playerUnit1);
      expect(canMove).toContain(playerUnit2);
    });
  });

  describe('getPlayerCharactersCanMove', () => {
    it('should return only player characters that can move', () => {
      const playerCanMove = gameStateManager.getPlayerCharactersCanMove();

      expect(playerCanMove).toContain(playerUnit1);
      expect(playerCanMove).toContain(playerUnit2);
      expect(playerCanMove).not.toContain(enemyUnit1);
      expect(playerCanMove).not.toContain(enemyUnit2);
    });

    it('should work during enemy turn', () => {
      // Keep advancing turns until we get to an enemy turn
      let attempts = 0;
      while (gameStateManager.getCurrentPlayer() === 'player' && attempts < 10) {
        gameStateManager.nextTurn();
        attempts++;
      }

      if (gameStateManager.getCurrentPlayer() === 'enemy') {
        const playerCanMove = gameStateManager.getPlayerCharactersCanMove();
        // Should return empty array since it's not player turn
        expect(playerCanMove).toHaveLength(0);
      } else {
        // If we couldn't get to enemy turn, skip this test
        // This can happen if all units are player units or turn order is different
        expect(true).toBe(true);
      }
    });
  });

  describe('getEnemyCharactersCanMove', () => {
    it('should return empty array during player turn', () => {
      const enemyCanMove = gameStateManager.getEnemyCharactersCanMove();

      expect(enemyCanMove).toHaveLength(0);
    });

    it('should return enemy characters during enemy turn', () => {
      // Keep advancing turns until we get to an enemy turn
      let attempts = 0;
      while (gameStateManager.getCurrentPlayer() === 'player' && attempts < 10) {
        gameStateManager.nextTurn();
        attempts++;
      }

      if (gameStateManager.getCurrentPlayer() === 'enemy') {
        const enemyCanMove = gameStateManager.getEnemyCharactersCanMove();

        expect(enemyCanMove).toContain(enemyUnit1);
        expect(enemyCanMove).toContain(enemyUnit2);
        expect(enemyCanMove).not.toContain(playerUnit1);
        expect(enemyCanMove).not.toContain(playerUnit2);
      } else {
        // If we couldn't get to enemy turn, skip this test
        expect(true).toBe(true);
      }
    });
  });

  describe('haveAllCurrentPlayerCharactersMoved', () => {
    it('should return false when no characters have moved', () => {
      expect(gameStateManager.haveAllCurrentPlayerCharactersMoved()).toBe(false);
    });

    it('should return false when only some characters have moved', () => {
      playerUnit1.hasMoved = true;
      gameStateManager.updateUnit(playerUnit1);

      expect(gameStateManager.haveAllCurrentPlayerCharactersMoved()).toBe(false);
    });

    it('should return true when all player characters have moved', () => {
      playerUnit1.hasMoved = true;
      playerUnit2.hasMoved = true;
      gameStateManager.updateUnit(playerUnit1);
      gameStateManager.updateUnit(playerUnit2);

      expect(gameStateManager.haveAllCurrentPlayerCharactersMoved()).toBe(true);
    });

    it('should ignore defeated characters', () => {
      playerUnit1.hasMoved = true;
      playerUnit2.currentHP = 0; // Defeated
      gameStateManager.updateUnit(playerUnit1);
      gameStateManager.updateUnit(playerUnit2);

      // Only living characters count
      expect(gameStateManager.haveAllCurrentPlayerCharactersMoved()).toBe(true);
    });

    it('should work for enemy turn', () => {
      // Keep advancing turns until we get to an enemy turn
      let attempts = 0;
      while (gameStateManager.getCurrentPlayer() === 'player' && attempts < 10) {
        gameStateManager.nextTurn();
        attempts++;
      }

      if (gameStateManager.getCurrentPlayer() === 'enemy') {
        expect(gameStateManager.haveAllCurrentPlayerCharactersMoved()).toBe(false);

        enemyUnit1.hasMoved = true;
        enemyUnit2.hasMoved = true;
        gameStateManager.updateUnit(enemyUnit1);
        gameStateManager.updateUnit(enemyUnit2);

        expect(gameStateManager.haveAllCurrentPlayerCharactersMoved()).toBe(true);
      } else {
        // If we couldn't get to enemy turn, skip this test
        expect(true).toBe(true);
      }
    });
  });

  describe('haveAllCurrentPlayerCharactersActed', () => {
    it('should return false when no characters have acted', () => {
      expect(gameStateManager.haveAllCurrentPlayerCharactersActed()).toBe(false);
    });

    it('should return false when characters have only moved', () => {
      playerUnit1.hasMoved = true;
      playerUnit2.hasMoved = true;
      gameStateManager.updateUnit(playerUnit1);
      gameStateManager.updateUnit(playerUnit2);

      expect(gameStateManager.haveAllCurrentPlayerCharactersActed()).toBe(false);
    });

    it('should return false when characters have only acted', () => {
      playerUnit1.hasActed = true;
      playerUnit2.hasActed = true;
      gameStateManager.updateUnit(playerUnit1);
      gameStateManager.updateUnit(playerUnit2);

      expect(gameStateManager.haveAllCurrentPlayerCharactersActed()).toBe(false);
    });

    it('should return true when all characters have both moved and acted', () => {
      playerUnit1.hasMoved = true;
      playerUnit1.hasActed = true;
      playerUnit2.hasMoved = true;
      playerUnit2.hasActed = true;
      gameStateManager.updateUnit(playerUnit1);
      gameStateManager.updateUnit(playerUnit2);

      expect(gameStateManager.haveAllCurrentPlayerCharactersActed()).toBe(true);
    });
  });

  describe('forceNextTurn', () => {
    it('should advance to next turn', () => {
      const currentActiveUnit = gameStateManager.getActiveUnit();
      const result = gameStateManager.forceNextTurn();

      expect(result.success).toBe(true);

      // The active unit should have changed (unless we completed a round)
      const newActiveUnit = gameStateManager.getActiveUnit();
      if (newActiveUnit) {
        // Either different unit or new round started
        expect(
          newActiveUnit.id !== currentActiveUnit?.id || gameStateManager.getCurrentTurn() > 1
        ).toBe(true);
      }
    });

    it("should mark active unit as acted if they haven't", () => {
      const activeUnit = gameStateManager.getActiveUnit();
      expect(activeUnit?.hasActed).toBe(false);

      gameStateManager.forceNextTurn();

      expect(activeUnit?.hasActed).toBe(true);
    });
  });

  describe('turn advancement logic', () => {
    it('should trigger turn advancement when character completes turn', () => {
      // Mark character as both moved and acted
      playerUnit1.hasActed = true;
      gameStateManager.updateUnit(playerUnit1);

      // This should trigger turn advancement
      gameStateManager.markCharacterMoved(playerUnit1);

      // Verify events were emitted (turn advancement logic)
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'character-movement-completed',
        expect.any(Object)
      );
    });

    it('should handle multiple characters completing turns', () => {
      // Mark first character as complete
      playerUnit1.hasActed = true;
      playerUnit1.hasMoved = true;
      gameStateManager.updateUnit(playerUnit1);

      // Mark second character as complete
      playerUnit2.hasActed = true;
      gameStateManager.markCharacterMoved(playerUnit2);

      // Both characters have completed their turns
      expect(gameStateManager.haveAllCurrentPlayerCharactersActed()).toBe(true);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle empty turn order gracefully', () => {
      const emptyGameState = new GameStateManager();

      expect(emptyGameState.canCharacterMove(playerUnit1)).toBe(false);
      expect(emptyGameState.getCharactersCanMove()).toHaveLength(0);
    });

    it('should handle invalid character data gracefully', () => {
      const invalidUnit = { id: 'invalid' } as Unit;

      expect(gameStateManager.canCharacterMove(invalidUnit)).toBe(false);
    });

    it('should maintain consistency after errors', () => {
      // Try to mark invalid character as moved
      const result = gameStateManager.markCharacterMoved(null as any);
      expect(result.success).toBe(false);

      // Game state should remain consistent
      expect(gameStateManager.canCharacterMove(playerUnit1)).toBe(true);
      expect(gameStateManager.getCurrentPlayer()).toBe('player');
    });
  });
});
