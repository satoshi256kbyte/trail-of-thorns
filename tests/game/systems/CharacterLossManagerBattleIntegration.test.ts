/**
 * Character Loss Manager Battle System Integration Tests
 *
 * Tests the integration between CharacterLossManager and BattleSystem
 * Covers requirements 8.1, 8.2, 8.3, 8.4, 8.5 from the character loss system specification
 */

import { CharacterLossManager } from '../../../game/src/systems/CharacterLossManager';
import { BattleSystem } from '../../../game/src/systems/BattleSystem';
import { CharacterLossState } from '../../../game/src/systems/CharacterLossState';
import { Unit } from '../../../game/src/types/gameplay';
import {
  LossCause,
  LossCauseType,
  CharacterLossUtils,
} from '../../../game/src/types/characterLoss';
import { BattleResult, Weapon, WeaponType, Element } from '../../../game/src/types/battle';

// Mock Phaser
const mockScene = {
  add: {
    graphics: jest.fn(() => ({
      fillStyle: jest.fn(),
      lineStyle: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
    })),
  },
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    once: jest.fn(),
  },
  time: {
    addEvent: jest.fn(() => ({
      remove: jest.fn(),
    })),
  },
} as any;

// Mock dependencies
jest.mock('../../../game/src/systems/CharacterLossEffects');
jest.mock('../../../game/src/systems/CharacterDangerWarningSystem');
jest.mock('../../../game/src/ui/CharacterLossUI');

describe('CharacterLossManager Battle System Integration', () => {
  let characterLossManager: CharacterLossManager;
  let battleSystem: BattleSystem;
  let mockUnits: Unit[];
  let mockWeapon: Weapon;

  beforeEach(() => {
    // Create mock units
    mockUnits = [
      {
        id: 'player1',
        name: 'Hero',
        position: { x: 0, y: 0 },
        stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
        currentHP: 100,
        currentMP: 50,
        level: 5,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
        wasRecruited: false,
      },
      {
        id: 'enemy1',
        name: 'Orc',
        position: { x: 2, y: 2 },
        stats: { maxHP: 80, maxMP: 20, attack: 25, defense: 10, speed: 8, movement: 2 },
        currentHP: 80,
        currentMP: 20,
        level: 3,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
        wasRecruited: false,
      },
    ];

    // Create mock weapon
    mockWeapon = {
      id: 'sword1',
      name: 'Iron Sword',
      type: WeaponType.SWORD,
      attackPower: 15,
      range: 1,
      rangePattern: {
        type: 'single',
        range: 1,
        pattern: [{ x: 0, y: 0 }],
      },
      element: Element.NONE,
      criticalRate: 10,
      accuracy: 90,
      specialEffects: [],
      description: 'A basic iron sword',
    };

    // Initialize systems
    characterLossManager = new CharacterLossManager(mockScene);
    battleSystem = new BattleSystem(mockScene);

    // Set up integration
    battleSystem.setCharacterLossManager(characterLossManager);
    characterLossManager.setBattleSystem(battleSystem);

    // Initialize chapter
    characterLossManager.initializeChapter('test-chapter', mockUnits);
    battleSystem.initialize(mockUnits);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Battle System Loss Notification', () => {
    test('should receive loss notification when player unit is defeated', async () => {
      // Arrange
      const playerUnit = mockUnits[0];
      const enemyUnit = mockUnits[1];
      const lossCause = CharacterLossUtils.createBattleDefeatCause(
        enemyUnit.id,
        enemyUnit.name,
        100
      );

      const onCharacterLostSpy = jest.spyOn(characterLossManager, 'onCharacterLostInBattle');

      // Act
      await characterLossManager.processCharacterLoss(playerUnit, lossCause);
      await characterLossManager.onCharacterLostInBattle(playerUnit, lossCause, {
        attacker: enemyUnit,
        target: playerUnit,
        targetDefeated: true,
      });

      // Assert
      expect(onCharacterLostSpy).toHaveBeenCalledWith(
        playerUnit,
        lossCause,
        expect.objectContaining({
          attacker: enemyUnit,
          target: playerUnit,
          targetDefeated: true,
        })
      );
      expect(characterLossManager.isCharacterLost(playerUnit.id)).toBe(true);
    });

    test('should handle battle completion notification', async () => {
      // Arrange
      const battleResult = {
        attacker: mockUnits[1],
        target: mockUnits[0],
        targetDefeated: true,
        finalDamage: 100,
        timestamp: Date.now(),
      };

      const onBattleCompletedSpy = jest.spyOn(characterLossManager, 'onBattleCompleted');

      // Act
      await characterLossManager.onBattleCompleted(battleResult);

      // Assert
      expect(onBattleCompletedSpy).toHaveBeenCalledWith(battleResult);
    });

    test('should validate character loss after battle notification', async () => {
      // Arrange
      const playerUnit = mockUnits[0];
      const enemyUnit = mockUnits[1];
      const battleResult = {
        attacker: enemyUnit,
        target: playerUnit,
        targetDefeated: true,
        finalDamage: 100,
      };

      // Process loss first
      const lossCause = CharacterLossUtils.createBattleDefeatCause(
        enemyUnit.id,
        enemyUnit.name,
        100
      );
      await characterLossManager.processCharacterLoss(playerUnit, lossCause);

      // Act
      await characterLossManager.onCharacterLostInBattle(playerUnit, lossCause, battleResult);

      // Assert
      expect(characterLossManager.isCharacterLost(playerUnit.id)).toBe(true);
      const lostCharacter = characterLossManager
        .getLostCharacters()
        .find(lc => lc.characterId === playerUnit.id);
      expect(lostCharacter).toBeDefined();
      expect(lostCharacter?.cause.type).toBe(LossCauseType.BATTLE_DEFEAT);
    });
  });

  describe('Loss Processing Completion Notification', () => {
    test('should notify battle system when loss processing is complete', async () => {
      // Arrange
      const playerUnit = mockUnits[0];
      const enemyUnit = mockUnits[1];
      const lossCause = CharacterLossUtils.createBattleDefeatCause(
        enemyUnit.id,
        enemyUnit.name,
        100
      );

      const emitSpy = jest.spyOn(characterLossManager, 'emit');

      // Act
      await characterLossManager.processCharacterLoss(playerUnit, lossCause);

      // Assert
      expect(emitSpy).toHaveBeenCalledWith(
        'character-loss-processed',
        expect.objectContaining({
          unit: playerUnit,
          cause: lossCause,
          lostCharacter: expect.any(Object),
          totalLosses: 1,
        })
      );
    });

    test('should emit character lost in battle event', async () => {
      // Arrange
      const playerUnit = mockUnits[0];
      const enemyUnit = mockUnits[1];
      const lossCause = CharacterLossUtils.createBattleDefeatCause(
        enemyUnit.id,
        enemyUnit.name,
        100
      );
      const battleResult = {
        attacker: enemyUnit,
        target: playerUnit,
        targetDefeated: true,
      };

      // Process loss first
      await characterLossManager.processCharacterLoss(playerUnit, lossCause);

      const emitSpy = jest.spyOn(characterLossManager, 'emit');

      // Act
      await characterLossManager.onCharacterLostInBattle(playerUnit, lossCause, battleResult);

      // Assert
      expect(emitSpy).toHaveBeenCalledWith(
        'character-lost-in-battle',
        expect.objectContaining({
          unit: playerUnit,
          cause: lossCause,
          battleResult: battleResult,
          totalLosses: 1,
        })
      );
    });
  });

  describe('Battle Result Loss State Reflection', () => {
    test('should apply loss state to battle result', async () => {
      // Arrange
      const playerUnit = mockUnits[0];
      const enemyUnit = mockUnits[1];
      const battleResult = {
        attacker: enemyUnit,
        target: playerUnit,
        targetDefeated: true,
        finalDamage: 100,
        timestamp: Date.now(),
      };

      // Process loss
      const lossCause = CharacterLossUtils.createBattleDefeatCause(
        enemyUnit.id,
        enemyUnit.name,
        100
      );
      await characterLossManager.processCharacterLoss(playerUnit, lossCause);

      // Act
      const modifiedResult = characterLossManager.applyLossStateToBattleResult(battleResult);

      // Assert
      expect(modifiedResult).toHaveProperty('lossInformation');
      expect(modifiedResult.lossInformation.targetWasLost).toBe(true);
      expect(modifiedResult.lossInformation.lossData).toBeDefined();
      expect(modifiedResult.lossInformation.totalLossesInChapter).toBe(1);
      expect(modifiedResult.lossInformation.remainingPlayerUnits).toBe(0);
    });

    test('should handle battle result without losses', () => {
      // Arrange
      const playerUnit = mockUnits[0];
      const enemyUnit = mockUnits[1];
      const battleResult = {
        attacker: playerUnit,
        target: enemyUnit,
        targetDefeated: true,
        finalDamage: 80,
        timestamp: Date.now(),
      };

      // Act
      const modifiedResult = characterLossManager.applyLossStateToBattleResult(battleResult);

      // Assert
      expect(modifiedResult.lossInformation.targetWasLost).toBe(false);
      expect(modifiedResult.lossInformation.lossData).toBeNull();
      expect(modifiedResult.lossInformation.totalLossesInChapter).toBe(0);
      expect(modifiedResult.lossInformation.remainingPlayerUnits).toBe(1);
    });

    test('should include remaining player unit count in battle result', async () => {
      // Arrange
      const additionalPlayerUnit = {
        id: 'player2',
        name: 'Warrior',
        position: { x: 1, y: 1 },
        stats: { maxHP: 120, maxMP: 30, attack: 25, defense: 20, speed: 8, movement: 3 },
        currentHP: 120,
        currentMP: 30,
        level: 4,
        faction: 'player' as const,
        hasActed: false,
        hasMoved: false,
        wasRecruited: false,
      };

      const extendedUnits = [...mockUnits, additionalPlayerUnit];
      characterLossManager.initializeChapter('test-chapter', extendedUnits);

      const playerUnit = mockUnits[0];
      const enemyUnit = mockUnits[1];
      const battleResult = {
        attacker: enemyUnit,
        target: playerUnit,
        targetDefeated: true,
        finalDamage: 100,
      };

      // Process loss for one player unit
      const lossCause = CharacterLossUtils.createBattleDefeatCause(
        enemyUnit.id,
        enemyUnit.name,
        100
      );
      await characterLossManager.processCharacterLoss(playerUnit, lossCause);

      // Act
      const modifiedResult = characterLossManager.applyLossStateToBattleResult(battleResult);

      // Assert
      expect(modifiedResult.lossInformation.remainingPlayerUnits).toBe(1); // One player unit remaining
    });
  });

  describe('Game Over Processing', () => {
    test('should trigger game over when all player characters are lost', async () => {
      // Arrange
      const playerUnit = mockUnits[0];
      const enemyUnit = mockUnits[1];
      const lossCause = CharacterLossUtils.createBattleDefeatCause(
        enemyUnit.id,
        enemyUnit.name,
        100
      );

      const emitSpy = jest.spyOn(characterLossManager, 'emit');

      // Act
      await characterLossManager.processCharacterLoss(playerUnit, lossCause);

      // Assert
      expect(emitSpy).toHaveBeenCalledWith(
        'all-characters-lost',
        expect.objectContaining({
          totalLosses: 1,
          chapterId: 'test-chapter',
          lostCharacters: expect.any(Array),
          gameOverReason: 'all_characters_lost',
        })
      );

      expect(emitSpy).toHaveBeenCalledWith(
        'game-over',
        expect.objectContaining({
          reason: 'all_characters_lost',
          totalLosses: 1,
          chapterId: 'test-chapter',
        })
      );
    });

    test('should check game over condition correctly', async () => {
      // Arrange
      const playerUnit = mockUnits[0];
      const enemyUnit = mockUnits[1];

      // Initially not game over
      expect(characterLossManager.isGameOver()).toBe(false);

      // Process loss
      const lossCause = CharacterLossUtils.createBattleDefeatCause(
        enemyUnit.id,
        enemyUnit.name,
        100
      );
      await characterLossManager.processCharacterLoss(playerUnit, lossCause);

      // Assert
      expect(characterLossManager.isGameOver()).toBe(true);
    });

    test('should provide game over information', async () => {
      // Arrange
      const playerUnit = mockUnits[0];
      const enemyUnit = mockUnits[1];
      const lossCause = CharacterLossUtils.createBattleDefeatCause(
        enemyUnit.id,
        enemyUnit.name,
        100
      );

      // Process loss
      await characterLossManager.processCharacterLoss(playerUnit, lossCause);

      // Act
      const gameOverInfo = characterLossManager.getGameOverInfo();

      // Assert
      expect(gameOverInfo).toBeDefined();
      expect(gameOverInfo?.reason).toBe('all_characters_lost');
      expect(gameOverInfo?.totalLosses).toBe(1);
      expect(gameOverInfo?.chapterId).toBe('test-chapter');
      expect(gameOverInfo?.lostCharacters).toHaveLength(1);
    });

    test('should return null game over info when game is not over', () => {
      // Act
      const gameOverInfo = characterLossManager.getGameOverInfo();

      // Assert
      expect(gameOverInfo).toBeNull();
    });
  });

  describe('Integration Error Handling', () => {
    test('should handle battle system integration errors gracefully', async () => {
      // Arrange
      const playerUnit = mockUnits[0];
      const invalidBattleResult = null;

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await characterLossManager.onBattleCompleted(invalidBattleResult);

      // Assert - Should not throw error
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CharacterLossManager]'),
        expect.stringContaining('Error handling battle completion')
      );

      consoleSpy.mockRestore();
    });

    test('should handle character loss notification errors gracefully', async () => {
      // Arrange
      const playerUnit = mockUnits[0];
      const lossCause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Orc', 100);
      const battleResult = { attacker: mockUnits[1], target: playerUnit };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act - Try to notify without processing loss first
      await characterLossManager.onCharacterLostInBattle(playerUnit, lossCause, battleResult);

      // Assert - Should handle gracefully
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CharacterLossManager]'),
        expect.stringContaining(
          'Warning: Character loss notification received but character not marked as lost'
        )
      );

      consoleSpy.mockRestore();
    });

    test('should handle battle result modification errors gracefully', () => {
      // Arrange
      const invalidBattleResult = { invalid: 'data' };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      const result = characterLossManager.applyLossStateToBattleResult(invalidBattleResult);

      // Assert - Should return original result on error
      expect(result).toBe(invalidBattleResult);

      consoleSpy.mockRestore();
    });
  });

  describe('System Dependencies', () => {
    test('should integrate with battle system correctly', () => {
      // Assert
      expect(battleSystem.hasCharacterLossManager()).toBe(true);
    });

    test('should handle missing battle system gracefully', () => {
      // Arrange
      const standaloneManager = new CharacterLossManager(mockScene);

      // Act & Assert - Should not throw
      expect(() => {
        standaloneManager.initializeChapter('test', mockUnits);
      }).not.toThrow();
    });

    test('should handle battle system events correctly', async () => {
      // Arrange
      const playerUnit = mockUnits[0];
      const enemyUnit = mockUnits[1];
      const battleEvent = {
        attacker: enemyUnit,
        target: playerUnit,
        weapon: mockWeapon,
      };

      const emitSpy = jest.spyOn(characterLossManager, 'emit');

      // Act
      await characterLossManager['onBattleTargetSelected'](battleEvent);

      // Assert - Should handle event without errors
      expect(emitSpy).toHaveBeenCalled();
    });
  });
});
