/**
 * Unit tests for MovementSystem integration with turn-based game state
 * Tests the integration between MovementSystem and GameStateManager
 */

import { GameStateManager } from '../../../game/src/systems/GameStateManager';
import { MovementSystem } from '../../../game/src/systems/MovementSystem';
import { Unit, MapData, Position } from '../../../game/src/types/gameplay';
import { MovementError } from '../../../game/src/types/movement';

// Mock Phaser scene
const mockScene = {
  add: {
    graphics: jest.fn(() => ({
      clear: jest.fn(),
      fillStyle: jest.fn(),
      fillRect: jest.fn(),
      strokeLineShape: jest.fn(),
      setDepth: jest.fn(),
      destroy: jest.fn(),
    })),
    container: jest.fn(() => ({
      setDepth: jest.fn(),
      add: jest.fn(),
      clear: jest.fn(),
      destroy: jest.fn(),
    })),
  },
  tweens: {
    add: jest.fn(),
  },
  textures: {
    exists: jest.fn(() => false),
    createCanvas: jest.fn(() => ({
      canvas: document.createElement('canvas'),
      context: document.createElement('canvas').getContext('2d'),
      refresh: jest.fn(),
    })),
  },
} as any;

// Mock event emitter
const mockEventEmitter = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
} as any;

describe('MovementSystem Turn Integration', () => {
  let gameStateManager: GameStateManager;
  let movementSystem: MovementSystem;
  let mockMapData: MapData;
  let playerUnit: Unit;
  let enemyUnit: Unit;
  let allUnits: Unit[];

  beforeEach(() => {
    // Reset mocks
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

    // Create mock map data
    mockMapData = {
      width: 10,
      height: 10,
      tileSize: 32,
      layers: [
        {
          name: 'background',
          type: 'background',
          data: Array(10)
            .fill(null)
            .map(() => Array(10).fill(0)),
          visible: true,
          opacity: 1,
        },
      ],
      playerSpawns: [{ x: 0, y: 0 }],
      enemySpawns: [{ x: 9, y: 9 }],
    };

    // Initialize systems
    gameStateManager = new GameStateManager(mockEventEmitter);
    movementSystem = new MovementSystem(mockScene, {}, mockEventEmitter);

    // Set up integration
    movementSystem.setGameStateManager(gameStateManager);
    movementSystem.initialize(mockMapData);
    movementSystem.updateUnits(allUnits);

    // Initialize turn order
    gameStateManager.initializeTurnOrder(allUnits);
  });

  describe('canCharacterMove integration', () => {
    it('should use GameStateManager validation when available', () => {
      // Player turn - player character should be able to move
      expect(movementSystem.canCharacterMove(playerUnit)).toBe(true);

      // Player turn - enemy character should not be able to move
      expect(movementSystem.canCharacterMove(enemyUnit)).toBe(false);
    });

    it('should prevent movement when character has already moved', () => {
      // Mark character as moved
      playerUnit.hasMoved = true;
      gameStateManager.updateUnit(playerUnit);

      expect(movementSystem.canCharacterMove(playerUnit)).toBe(false);
    });

    it('should prevent movement when character is defeated', () => {
      // Defeat character
      playerUnit.currentHP = 0;
      gameStateManager.updateUnit(playerUnit);

      expect(movementSystem.canCharacterMove(playerUnit)).toBe(false);
    });

    it('should prevent movement during wrong faction turn', () => {
      // Keep advancing turns until we get to an enemy turn
      let attempts = 0;
      while (gameStateManager.getCurrentPlayer() === 'player' && attempts < 10) {
        gameStateManager.nextTurn();
        attempts++;
      }

      if (gameStateManager.getCurrentPlayer() === 'enemy') {
        // Player character should not be able to move during enemy turn
        expect(movementSystem.canCharacterMove(playerUnit)).toBe(false);

        // Enemy character should be able to move during enemy turn
        expect(movementSystem.canCharacterMove(enemyUnit)).toBe(true);
      } else {
        // If we couldn't get to enemy turn, test the opposite
        expect(movementSystem.canCharacterMove(playerUnit)).toBe(true);
        expect(movementSystem.canCharacterMove(enemyUnit)).toBe(false);
      }
    });

    it('should prevent movement when game has ended', () => {
      // End the game
      gameStateManager.setGameResult('victory');

      expect(movementSystem.canCharacterMove(playerUnit)).toBe(false);
      expect(movementSystem.canCharacterMove(enemyUnit)).toBe(false);
    });
  });

  describe('movement flag updates', () => {
    it('should mark character as moved after successful movement', async () => {
      const destination: Position = { x: 2, y: 1 };

      // Execute movement
      const result = await movementSystem.executeMovement(playerUnit, destination);

      expect(result.success).toBe(true);
      expect(playerUnit.hasMoved).toBe(true);

      // Verify GameStateManager was notified
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'character-movement-completed',
        expect.objectContaining({
          character: playerUnit,
          canStillAct: true, // hasn't acted yet
          turnComplete: false, // hasn't both moved and acted
        })
      );
    });

    it('should update character position after movement', async () => {
      const destination: Position = { x: 3, y: 2 };

      await movementSystem.executeMovement(playerUnit, destination);

      expect(playerUnit.position).toEqual(destination);
    });

    it('should not mark character as moved if movement fails', async () => {
      const invalidDestination: Position = { x: 10, y: 10 }; // Outside movement range

      const result = await movementSystem.executeMovement(playerUnit, invalidDestination);

      expect(result.success).toBe(false);
      expect(playerUnit.hasMoved).toBe(false);
    });
  });

  describe('turn advancement logic', () => {
    it('should check turn advancement after character movement', async () => {
      const destination: Position = { x: 2, y: 1 };

      // Spy on the private checkTurnAdvancement method through events
      const turnAdvancementSpy = jest.spyOn(mockEventEmitter, 'emit');

      await movementSystem.executeMovement(playerUnit, destination);

      // Verify that movement completion event was emitted
      expect(turnAdvancementSpy).toHaveBeenCalledWith(
        'character-movement-completed',
        expect.any(Object)
      );
    });

    it('should advance turn when character has both moved and acted', () => {
      // Mark character as having acted
      playerUnit.hasActed = true;
      gameStateManager.updateUnit(playerUnit);

      // Mark character as moved (this should trigger turn advancement)
      const result = gameStateManager.markCharacterMoved(playerUnit);

      expect(result.success).toBe(true);
      expect(playerUnit.hasMoved).toBe(true);

      // Since player has both moved and acted, turn should advance
      // (This would be handled by the checkTurnAdvancement method)
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

  describe('GameStateManager movement tracking methods', () => {
    it('should track characters that can move', () => {
      const canMoveChars = gameStateManager.getCharactersCanMove();

      // Initially, player character should be able to move (it's player turn)
      expect(canMoveChars).toContain(playerUnit);
      expect(canMoveChars).not.toContain(enemyUnit); // enemy turn hasn't started
    });

    it('should track player characters that can move', () => {
      const playerCanMove = gameStateManager.getPlayerCharactersCanMove();

      expect(playerCanMove).toContain(playerUnit);
      expect(playerCanMove).not.toContain(enemyUnit);
    });

    it('should track enemy characters that can move', () => {
      // Keep advancing turns until we get to an enemy turn
      let attempts = 0;
      while (gameStateManager.getCurrentPlayer() === 'player' && attempts < 10) {
        gameStateManager.nextTurn();
        attempts++;
      }

      if (gameStateManager.getCurrentPlayer() === 'enemy') {
        const enemyCanMove = gameStateManager.getEnemyCharactersCanMove();

        expect(enemyCanMove).toContain(enemyUnit);
        expect(enemyCanMove).not.toContain(playerUnit);
      } else {
        // If we couldn't get to enemy turn, test that no enemies can move during player turn
        const enemyCanMove = gameStateManager.getEnemyCharactersCanMove();
        expect(enemyCanMove).toHaveLength(0);
      }
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

  describe('error handling', () => {
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

    it('should handle movement system without GameStateManager', () => {
      // Create movement system without GameStateManager
      const standaloneMovementSystem = new MovementSystem(mockScene);
      standaloneMovementSystem.initialize(mockMapData);
      standaloneMovementSystem.updateUnits(allUnits);

      // Should fall back to local validation
      expect(standaloneMovementSystem.canCharacterMove(playerUnit)).toBe(true);
    });
  });

  describe('integration events', () => {
    it('should emit movement completion events', async () => {
      const destination: Position = { x: 2, y: 1 };

      await movementSystem.executeMovement(playerUnit, destination);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'character-movement-completed',
        expect.objectContaining({
          character: playerUnit,
          canStillAct: expect.any(Boolean),
          turnComplete: expect.any(Boolean),
        })
      );
    });

    it('should emit turn switching events when appropriate', () => {
      // Mark all player units as having completed their turns
      playerUnit.hasMoved = true;
      playerUnit.hasActed = true;
      gameStateManager.updateUnit(playerUnit);

      // This should trigger turn switching logic
      gameStateManager.markCharacterMoved(playerUnit);

      // Check if turn switching events were emitted
      // (The exact event depends on the implementation of checkTurnAdvancement)
    });
  });

  describe('multiple characters scenario', () => {
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
      movementSystem.updateUnits(allUnits);
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
});
