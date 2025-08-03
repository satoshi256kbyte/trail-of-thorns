/**
 * Focused integration tests for GameStateManager movement integration
 * Tests the core integration logic without requiring full MovementSystem setup
 */

import { GameStateManager } from '../../../game/src/systems/GameStateManager';
import { Unit } from '../../../game/src/types/gameplay';

// Mock event emitter
const mockEventEmitter = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
} as any;

describe('GameStateManager Movement Integration (Focused)', () => {
  let gameStateManager: GameStateManager;
  let playerUnit: Unit;
  let enemyUnit: Unit;
  let allUnits: Unit[];

  beforeEach(() => {
    jest.clearAllMocks();

    // Create test units
    playerUnit = {
      id: 'player1',
      name: 'Player Character',
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

    enemyUnit = {
      id: 'enemy1',
      name: 'Enemy Character',
      position: { x: 5, y: 5 },
      stats: {
        maxHP: 80,
        maxMP: 30,
        attack: 18,
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

    allUnits = [playerUnit, enemyUnit];

    // Initialize systems
    gameStateManager = new GameStateManager(mockEventEmitter);
    gameStateManager.initializeTurnOrder(allUnits);
  });

  describe('Movement validation integration', () => {
    it('should validate character movement based on turn state', () => {
      // Initially, player character should be able to move (player turn)
      expect(gameStateManager.canCharacterMove(playerUnit)).toBe(true);

      // Enemy character should not be able to move during player turn
      expect(gameStateManager.canCharacterMove(enemyUnit)).toBe(false);
    });

    it('should prevent movement when character has already moved', () => {
      // Mark character as moved
      const result = gameStateManager.markCharacterMoved(playerUnit);
      expect(result.success).toBe(true);

      // Character should no longer be able to move
      expect(gameStateManager.canCharacterMove(playerUnit)).toBe(false);
    });

    it('should prevent movement when game has ended', () => {
      // End the game
      gameStateManager.setGameResult('victory');

      // No characters should be able to move
      expect(gameStateManager.canCharacterMove(playerUnit)).toBe(false);
      expect(gameStateManager.canCharacterMove(enemyUnit)).toBe(false);
    });
  });

  describe('Movement flag updates', () => {
    it('should successfully mark character as moved', () => {
      const result = gameStateManager.markCharacterMoved(playerUnit);

      expect(result.success).toBe(true);
      expect(playerUnit.hasMoved).toBe(true);
    });

    it('should emit movement completion event', () => {
      gameStateManager.markCharacterMoved(playerUnit);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'character-movement-completed',
        expect.objectContaining({
          character: playerUnit,
          canStillAct: true,
          turnComplete: false,
        })
      );
    });

    it('should update selected unit if it matches', () => {
      // Select the character first
      gameStateManager.selectUnit(playerUnit);

      // Mark as moved
      gameStateManager.markCharacterMoved(playerUnit);

      // Selected unit should also be updated
      const selectedUnit = gameStateManager.getSelectedUnit();
      expect(selectedUnit?.hasMoved).toBe(true);
    });
  });

  describe('Turn advancement logic', () => {
    it('should trigger turn advancement when character completes turn', () => {
      // Mark character as having acted
      playerUnit.hasActed = true;
      gameStateManager.updateUnit(playerUnit);

      // Mark character as moved (this should trigger turn advancement check)
      gameStateManager.markCharacterMoved(playerUnit);

      // Verify that movement completion event was emitted
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'character-movement-completed',
        expect.objectContaining({
          character: playerUnit,
          canStillAct: false, // has acted
          turnComplete: true, // has both moved and acted
        })
      );
    });

    it('should not advance turn when character has only moved', () => {
      const currentTurn = gameStateManager.getCurrentTurn();
      const currentPlayer = gameStateManager.getCurrentPlayer();

      // Mark character as moved but not acted
      gameStateManager.markCharacterMoved(playerUnit);

      // Turn should not advance yet
      expect(gameStateManager.getCurrentTurn()).toBe(currentTurn);
      expect(gameStateManager.getCurrentPlayer()).toBe(currentPlayer);
    });
  });

  describe('Character tracking methods', () => {
    it('should track characters that can move', () => {
      const canMoveChars = gameStateManager.getCharactersCanMove();

      // During player turn, only player characters can move
      expect(canMoveChars).toContain(playerUnit);
      expect(canMoveChars).not.toContain(enemyUnit);
    });

    it('should track player characters that can move', () => {
      const playerCanMove = gameStateManager.getPlayerCharactersCanMove();

      expect(playerCanMove).toContain(playerUnit);
      expect(playerCanMove).not.toContain(enemyUnit);
    });

    it('should exclude characters that have already moved', () => {
      // Mark character as moved
      gameStateManager.markCharacterMoved(playerUnit);

      const canMoveChars = gameStateManager.getCharactersCanMove();
      expect(canMoveChars).not.toContain(playerUnit);
    });

    it('should check if all current player characters have moved', () => {
      // Initially no one has moved
      expect(gameStateManager.haveAllCurrentPlayerCharactersMoved()).toBe(false);

      // Mark player character as moved
      gameStateManager.markCharacterMoved(playerUnit);

      // Now all player characters have moved
      expect(gameStateManager.haveAllCurrentPlayerCharactersMoved()).toBe(true);
    });

    it('should check if all current player characters have acted', () => {
      // Initially no one has acted
      expect(gameStateManager.haveAllCurrentPlayerCharactersActed()).toBe(false);

      // Mark player character as moved and acted
      gameStateManager.markCharacterMoved(playerUnit);
      playerUnit.hasActed = true;
      gameStateManager.updateUnit(playerUnit);

      // Now all player characters have acted
      expect(gameStateManager.haveAllCurrentPlayerCharactersActed()).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid character in markCharacterMoved', () => {
      const result = gameStateManager.markCharacterMoved(null as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('UNIT_NOT_FOUND');
    });

    it('should handle character not in turn order', () => {
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
      expect(result.error).toBe('UNIT_NOT_FOUND');
    });
  });

  describe('Force turn advancement', () => {
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

  describe('Multiple characters scenario', () => {
    let playerUnit2: Unit;

    beforeEach(() => {
      playerUnit2 = {
        id: 'player2',
        name: 'Player Character 2',
        position: { x: 2, y: 2 },
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

      allUnits.push(playerUnit2);
      gameStateManager.initializeTurnOrder(allUnits);
    });

    it('should track movement status for multiple characters', () => {
      // Initially both player characters can move
      expect(gameStateManager.canCharacterMove(playerUnit)).toBe(true);
      expect(gameStateManager.canCharacterMove(playerUnit2)).toBe(true);

      // Mark first character as moved
      gameStateManager.markCharacterMoved(playerUnit);

      // First character can't move again, second still can
      expect(gameStateManager.canCharacterMove(playerUnit)).toBe(false);
      expect(gameStateManager.canCharacterMove(playerUnit2)).toBe(true);

      // Not all characters have moved yet
      expect(gameStateManager.haveAllCurrentPlayerCharactersMoved()).toBe(false);

      // Mark second character as moved
      gameStateManager.markCharacterMoved(playerUnit2);

      // Now all player characters have moved
      expect(gameStateManager.haveAllCurrentPlayerCharactersMoved()).toBe(true);
    });

    it('should handle turn advancement with multiple characters', () => {
      // Mark both characters as moved and acted
      gameStateManager.markCharacterMoved(playerUnit);
      playerUnit.hasActed = true;
      gameStateManager.updateUnit(playerUnit);

      gameStateManager.markCharacterMoved(playerUnit2);
      playerUnit2.hasActed = true;
      gameStateManager.updateUnit(playerUnit2);

      // All player characters have completed their turns
      expect(gameStateManager.haveAllCurrentPlayerCharactersActed()).toBe(true);
    });
  });

  describe('Integration with movement system pattern', () => {
    it('should provide the interface needed by MovementSystem', () => {
      // Test that GameStateManager provides the methods MovementSystem expects
      expect(typeof gameStateManager.canCharacterMove).toBe('function');
      expect(typeof gameStateManager.markCharacterMoved).toBe('function');
      expect(typeof gameStateManager.isPlayerTurn).toBe('function');
      expect(typeof gameStateManager.isEnemyTurn).toBe('function');
    });

    it('should handle the movement completion workflow', () => {
      // Simulate the workflow that MovementSystem would follow

      // 1. Check if character can move
      expect(gameStateManager.canCharacterMove(playerUnit)).toBe(true);

      // 2. Execute movement (simulated)
      // ... movement execution happens in MovementSystem ...

      // 3. Mark character as moved after successful movement
      const result = gameStateManager.markCharacterMoved(playerUnit);
      expect(result.success).toBe(true);

      // 4. Verify character state is updated
      expect(playerUnit.hasMoved).toBe(true);
      expect(gameStateManager.canCharacterMove(playerUnit)).toBe(false);

      // 5. Verify events are emitted for UI updates
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'character-movement-completed',
        expect.any(Object)
      );
    });
  });
});
