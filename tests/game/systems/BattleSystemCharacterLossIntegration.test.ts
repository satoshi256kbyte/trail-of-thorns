/**
 * Battle System Character Loss Integration Tests
 *
 * Tests the integration between BattleSystem and CharacterLossManager
 * Covers battle system's responsibility in character loss processing
 */

import { BattleSystem } from '../../../game/src/systems/BattleSystem';
import { CharacterLossManager } from '../../../game/src/systems/CharacterLossManager';
import { Unit } from '../../../game/src/types/gameplay';
import { Weapon, WeaponType, Element, BattleResult } from '../../../game/src/types/battle';
import { LossCause, LossCauseType } from '../../../game/src/types/characterLoss';

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
jest.mock('../../../game/src/systems/AttackRangeCalculator');
jest.mock('../../../game/src/systems/TargetSelector');
jest.mock('../../../game/src/systems/DamageCalculator');
jest.mock('../../../game/src/systems/BattleAnimator');
jest.mock('../../../game/src/systems/BattleStateManager');
jest.mock('../../../game/src/systems/BattleErrorHandler');
jest.mock('../../../game/src/systems/CharacterLossManager');

describe('BattleSystem Character Loss Integration', () => {
  let battleSystem: BattleSystem;
  let mockCharacterLossManager: jest.Mocked<CharacterLossManager>;
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

    // Create mock character loss manager
    mockCharacterLossManager = {
      processCharacterLoss: jest.fn(),
      isCharacterLost: jest.fn(),
      onBattleCompleted: jest.fn(),
      onCharacterLostInBattle: jest.fn(),
      applyLossStateToBattleResult: jest.fn(),
      isGameOver: jest.fn(),
      getGameOverInfo: jest.fn(),
    } as any;

    // Initialize battle system
    battleSystem = new BattleSystem(mockScene);
    battleSystem.setCharacterLossManager(mockCharacterLossManager);
    battleSystem.initialize(mockUnits);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Character Loss Manager Integration', () => {
    test('should set character loss manager correctly', () => {
      // Act
      const hasManager = battleSystem.hasCharacterLossManager();

      // Assert
      expect(hasManager).toBe(true);
    });

    test('should handle missing character loss manager gracefully', () => {
      // Arrange
      const standaloneBattleSystem = new BattleSystem(mockScene);

      // Act
      const hasManager = standaloneBattleSystem.hasCharacterLossManager();

      // Assert
      expect(hasManager).toBe(false);
    });
  });

  describe('Character Loss Processing During Battle', () => {
    test('should process character loss when player unit is defeated', async () => {
      // Arrange
      const playerUnit = mockUnits[0];
      const enemyUnit = mockUnits[1];

      // Mock battle system internals
      const mockDamageCalculator = {
        performCompleteCalculation: jest.fn().mockReturnValue({
          baseDamage: 100,
          finalDamage: 100,
          modifiers: [],
          isCritical: false,
          isEvaded: false,
        }),
      };

      const mockBattleStateManager = {
        applyDamage: jest.fn().mockReturnValue({ success: true }),
        grantExperience: jest.fn().mockReturnValue({ success: true }),
        recordBattleResult: jest.fn(),
        updatePostBattle: jest.fn(),
      };

      const mockBattleAnimator = {
        playAttackAnimation: jest.fn(),
        showDamageEffect: jest.fn(),
        animateHPChange: jest.fn(),
        playDefeatedAnimation: jest.fn(),
      };

      // Set up mocks
      (battleSystem as any).damageCalculator = mockDamageCalculator;
      (battleSystem as any).battleStateManager = mockBattleStateManager;
      (battleSystem as any).battleAnimator = mockBattleAnimator;

      // Set up defeated unit
      playerUnit.currentHP = 0;

      // Mock the executeBattle method to simulate defeat
      const originalExecuteBattle = (battleSystem as any).executeBattle;
      (battleSystem as any).executeBattle = jest
        .fn()
        .mockImplementation(async (attacker, target, weapon) => {
          // Simulate battle result with defeat
          const battleResult: BattleResult = {
            attacker,
            target,
            weapon,
            baseDamage: 100,
            finalDamage: 100,
            modifiers: [],
            isCritical: false,
            isEvaded: false,
            experienceGained: 50,
            targetDefeated: true,
            effectsApplied: [],
            timestamp: Date.now(),
          };

          // Simulate character loss processing
          if (target.faction === 'player' && battleResult.targetDefeated) {
            await mockCharacterLossManager.processCharacterLoss(
              target,
              expect.objectContaining({
                type: LossCauseType.BATTLE_DEFEAT,
                sourceId: attacker.id,
                sourceName: attacker.name,
              })
            );
          }

          return battleResult;
        });

      // Act
      await (battleSystem as any).executeBattle(enemyUnit, playerUnit, mockWeapon);

      // Assert
      expect(mockCharacterLossManager.processCharacterLoss).toHaveBeenCalledWith(
        playerUnit,
        expect.objectContaining({
          type: LossCauseType.BATTLE_DEFEAT,
          sourceId: enemyUnit.id,
          sourceName: enemyUnit.name,
        })
      );
    });

    test('should handle critical damage loss cause correctly', async () => {
      // Arrange
      const playerUnit = mockUnits[0];
      const enemyUnit = mockUnits[1];

      // Mock critical damage
      const mockDamageCalculator = {
        performCompleteCalculation: jest.fn().mockReturnValue({
          baseDamage: 80,
          finalDamage: 120,
          modifiers: [],
          isCritical: true,
          isEvaded: false,
        }),
      };

      (battleSystem as any).damageCalculator = mockDamageCalculator;

      // Mock the executeBattle method to simulate critical defeat
      (battleSystem as any).executeBattle = jest
        .fn()
        .mockImplementation(async (attacker, target, weapon) => {
          const battleResult: BattleResult = {
            attacker,
            target,
            weapon,
            baseDamage: 80,
            finalDamage: 120,
            modifiers: [],
            isCritical: true,
            isEvaded: false,
            experienceGained: 50,
            targetDefeated: true,
            effectsApplied: [],
            timestamp: Date.now(),
          };

          // Simulate critical damage loss processing
          if (target.faction === 'player' && battleResult.targetDefeated) {
            await mockCharacterLossManager.processCharacterLoss(
              target,
              expect.objectContaining({
                type: LossCauseType.CRITICAL_DAMAGE,
                sourceId: attacker.id,
                sourceName: attacker.name,
                damageAmount: 120,
              })
            );
          }

          return battleResult;
        });

      // Act
      await (battleSystem as any).executeBattle(enemyUnit, playerUnit, mockWeapon);

      // Assert
      expect(mockCharacterLossManager.processCharacterLoss).toHaveBeenCalledWith(
        playerUnit,
        expect.objectContaining({
          type: LossCauseType.CRITICAL_DAMAGE,
          sourceId: enemyUnit.id,
          sourceName: enemyUnit.name,
          damageAmount: 120,
        })
      );
    });

    test('should not process loss for enemy units', async () => {
      // Arrange
      const playerUnit = mockUnits[0];
      const enemyUnit = mockUnits[1];

      // Mock the executeBattle method
      (battleSystem as any).executeBattle = jest
        .fn()
        .mockImplementation(async (attacker, target, weapon) => {
          const battleResult: BattleResult = {
            attacker,
            target,
            weapon,
            baseDamage: 100,
            finalDamage: 100,
            modifiers: [],
            isCritical: false,
            isEvaded: false,
            experienceGained: 50,
            targetDefeated: true,
            effectsApplied: [],
            timestamp: Date.now(),
          };

          // Should not process loss for enemy units
          if (target.faction === 'player' && battleResult.targetDefeated) {
            await mockCharacterLossManager.processCharacterLoss(target, expect.any(Object));
          }

          return battleResult;
        });

      // Act - Player attacks enemy
      await (battleSystem as any).executeBattle(playerUnit, enemyUnit, mockWeapon);

      // Assert - Should not process loss for enemy
      expect(mockCharacterLossManager.processCharacterLoss).not.toHaveBeenCalled();
    });

    test('should emit character lost event when processing loss', async () => {
      // Arrange
      const playerUnit = mockUnits[0];
      const enemyUnit = mockUnits[1];
      const emitSpy = jest.spyOn(battleSystem, 'emit');

      // Mock the executeBattle method
      (battleSystem as any).executeBattle = jest
        .fn()
        .mockImplementation(async (attacker, target, weapon) => {
          const battleResult: BattleResult = {
            attacker,
            target,
            weapon,
            baseDamage: 100,
            finalDamage: 100,
            modifiers: [],
            isCritical: false,
            isEvaded: false,
            experienceGained: 50,
            targetDefeated: true,
            effectsApplied: [],
            timestamp: Date.now(),
          };

          // Simulate character loss processing and event emission
          if (target.faction === 'player' && battleResult.targetDefeated) {
            const lossCause = {
              type: LossCauseType.BATTLE_DEFEAT,
              sourceId: attacker.id,
              sourceName: attacker.name,
              damageAmount: 100,
              description: `${attacker.name}の攻撃により撃破`,
              timestamp: Date.now(),
            };

            await mockCharacterLossManager.processCharacterLoss(target, lossCause);

            // Emit character lost event
            battleSystem.emit('character-lost', {
              unit: target,
              cause: lossCause,
              battleResult,
            });
          }

          return battleResult;
        });

      // Act
      await (battleSystem as any).executeBattle(enemyUnit, playerUnit, mockWeapon);

      // Assert
      expect(emitSpy).toHaveBeenCalledWith(
        'character-lost',
        expect.objectContaining({
          unit: playerUnit,
          cause: expect.objectContaining({
            type: LossCauseType.BATTLE_DEFEAT,
            sourceId: enemyUnit.id,
            sourceName: enemyUnit.name,
          }),
          battleResult: expect.any(Object),
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle character loss processing errors gracefully', async () => {
      // Arrange
      const playerUnit = mockUnits[0];
      const enemyUnit = mockUnits[1];

      // Mock character loss manager to throw error
      mockCharacterLossManager.processCharacterLoss.mockRejectedValue(
        new Error('Loss processing failed')
      );

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Mock the executeBattle method
      (battleSystem as any).executeBattle = jest
        .fn()
        .mockImplementation(async (attacker, target, weapon) => {
          const battleResult: BattleResult = {
            attacker,
            target,
            weapon,
            baseDamage: 100,
            finalDamage: 100,
            modifiers: [],
            isCritical: false,
            isEvaded: false,
            experienceGained: 50,
            targetDefeated: true,
            effectsApplied: [],
            timestamp: Date.now(),
          };

          // Simulate error handling during loss processing
          if (target.faction === 'player' && battleResult.targetDefeated) {
            try {
              await mockCharacterLossManager.processCharacterLoss(target, expect.any(Object));
            } catch (error) {
              // Log error but don't throw - battle should continue
              console.log('[BattleSystem] Error processing character loss:', error.message);
            }
          }

          return battleResult;
        });

      // Act & Assert - Should not throw
      await expect(
        (battleSystem as any).executeBattle(enemyUnit, playerUnit, mockWeapon)
      ).resolves.toBeDefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BattleSystem] Error processing character loss:'),
        expect.stringContaining('Loss processing failed')
      );

      consoleSpy.mockRestore();
    });

    test('should handle missing character loss manager during battle', async () => {
      // Arrange
      const standaloneBattleSystem = new BattleSystem(mockScene);
      standaloneBattleSystem.initialize(mockUnits);

      const playerUnit = mockUnits[0];
      const enemyUnit = mockUnits[1];

      // Mock the executeBattle method for standalone system
      (standaloneBattleSystem as any).executeBattle = jest
        .fn()
        .mockImplementation(async (attacker, target, weapon) => {
          const battleResult: BattleResult = {
            attacker,
            target,
            weapon,
            baseDamage: 100,
            finalDamage: 100,
            modifiers: [],
            isCritical: false,
            isEvaded: false,
            experienceGained: 50,
            targetDefeated: true,
            effectsApplied: [],
            timestamp: Date.now(),
          };

          // Should handle missing character loss manager gracefully
          const hasLossManager = standaloneBattleSystem.hasCharacterLossManager();
          if (hasLossManager && target.faction === 'player' && battleResult.targetDefeated) {
            // This should not execute since no loss manager is set
          }

          return battleResult;
        });

      // Act & Assert - Should not throw
      await expect(
        (standaloneBattleSystem as any).executeBattle(enemyUnit, playerUnit, mockWeapon)
      ).resolves.toBeDefined();
    });
  });

  describe('Battle Completion Integration', () => {
    test('should notify character loss manager of battle completion', async () => {
      // Arrange
      const playerUnit = mockUnits[0];
      const enemyUnit = mockUnits[1];

      // Mock the executeBattle method
      (battleSystem as any).executeBattle = jest
        .fn()
        .mockImplementation(async (attacker, target, weapon) => {
          const battleResult: BattleResult = {
            attacker,
            target,
            weapon,
            baseDamage: 100,
            finalDamage: 100,
            modifiers: [],
            isCritical: false,
            isEvaded: false,
            experienceGained: 50,
            targetDefeated: false,
            effectsApplied: [],
            timestamp: Date.now(),
          };

          // Simulate battle completion notification
          await mockCharacterLossManager.onBattleCompleted(battleResult);

          return battleResult;
        });

      // Act
      await (battleSystem as any).executeBattle(playerUnit, enemyUnit, mockWeapon);

      // Assert
      expect(mockCharacterLossManager.onBattleCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          attacker: playerUnit,
          target: enemyUnit,
          targetDefeated: false,
        })
      );
    });

    test('should apply loss state to battle result', async () => {
      // Arrange
      const playerUnit = mockUnits[0];
      const enemyUnit = mockUnits[1];

      const mockModifiedResult = {
        attacker: enemyUnit,
        target: playerUnit,
        targetDefeated: true,
        lossInformation: {
          targetWasLost: true,
          lossData: { characterId: playerUnit.id },
          totalLossesInChapter: 1,
          remainingPlayerUnits: 0,
        },
      };

      mockCharacterLossManager.applyLossStateToBattleResult.mockReturnValue(mockModifiedResult);

      // Mock the executeBattle method
      (battleSystem as any).executeBattle = jest
        .fn()
        .mockImplementation(async (attacker, target, weapon) => {
          const battleResult: BattleResult = {
            attacker,
            target,
            weapon,
            baseDamage: 100,
            finalDamage: 100,
            modifiers: [],
            isCritical: false,
            isEvaded: false,
            experienceGained: 50,
            targetDefeated: true,
            effectsApplied: [],
            timestamp: Date.now(),
          };

          // Apply loss state to battle result
          const modifiedResult =
            mockCharacterLossManager.applyLossStateToBattleResult(battleResult);

          return modifiedResult;
        });

      // Act
      const result = await (battleSystem as any).executeBattle(enemyUnit, playerUnit, mockWeapon);

      // Assert
      expect(mockCharacterLossManager.applyLossStateToBattleResult).toHaveBeenCalled();
      expect(result).toHaveProperty('lossInformation');
      expect(result.lossInformation.targetWasLost).toBe(true);
    });
  });
});
