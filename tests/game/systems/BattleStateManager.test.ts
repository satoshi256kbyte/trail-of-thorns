/**
 * Unit tests for BattleStateManager
 * Tests battle state management, damage application, experience granting, and battle result recording
 */

import { BattleStateManager } from '../../../game/src/systems/BattleStateManager';
import { Unit, GameplayError } from '../../../game/src/types/gameplay';
import {
  BattleResult,
  BattleUnit,
  Element,
  WeaponType,
  DamageType,
} from '../../../game/src/types/battle';

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

  getEmittedEvents(): string[] {
    return Object.keys(this.events);
  }

  getEventCallCount(event: string): number {
    return this.events[event]?.length || 0;
  }
}

describe('BattleStateManager', () => {
  let battleStateManager: BattleStateManager;
  let mockEventEmitter: MockEventEmitter;
  let mockPlayerUnit: Unit;
  let mockEnemyUnit: Unit;
  let mockBattleUnit: BattleUnit;

  beforeEach(() => {
    mockEventEmitter = new MockEventEmitter();
    battleStateManager = new BattleStateManager(mockEventEmitter as any);

    // Create mock player unit
    mockPlayerUnit = {
      id: 'player-1',
      name: 'Test Player',
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
    };

    // Create mock enemy unit
    mockEnemyUnit = {
      id: 'enemy-1',
      name: 'Test Enemy',
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

    // Create mock battle unit
    mockBattleUnit = {
      ...mockPlayerUnit,
      weapon: {
        id: 'sword-1',
        name: 'Test Sword',
        type: WeaponType.SWORD,
        attackPower: 25,
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
        description: 'A test sword',
      },
      statusEffects: [],
      battleStats: {
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        criticalHitsLanded: 0,
        criticalHitsReceived: 0,
        attacksLanded: 0,
        attacksMissed: 0,
        attacksEvaded: 0,
        unitsDefeated: 0,
        experienceGained: 0,
        battlesParticipated: 0,
      },
      canAttack: true,
      attacksRemaining: 1,
    };
  });

  describe('applyDamage', () => {
    test('should apply damage correctly to a unit', () => {
      const result = battleStateManager.applyDamage(mockPlayerUnit, 30);

      expect(result.success).toBe(true);
      expect(mockPlayerUnit.currentHP).toBe(70);
    });

    test('should not reduce HP below 0', () => {
      const result = battleStateManager.applyDamage(mockPlayerUnit, 150);

      expect(result.success).toBe(true);
      expect(mockPlayerUnit.currentHP).toBe(0);
    });

    test('should handle zero damage', () => {
      const originalHP = mockPlayerUnit.currentHP;
      const result = battleStateManager.applyDamage(mockPlayerUnit, 0);

      expect(result.success).toBe(true);
      expect(mockPlayerUnit.currentHP).toBe(originalHP);
    });

    test('should emit damage-applied event', () => {
      let emittedData: any = null;
      mockEventEmitter.on('damage-applied', data => {
        emittedData = data;
      });

      battleStateManager.applyDamage(mockPlayerUnit, 25);

      expect(emittedData).not.toBeNull();
      expect(emittedData.target).toBe(mockPlayerUnit);
      expect(emittedData.damage).toBe(25);
      expect(emittedData.previousHP).toBe(100);
      expect(emittedData.currentHP).toBe(75);
      expect(emittedData.wasDefeated).toBe(false);
    });

    test('should handle unit defeat when HP reaches 0', () => {
      let defeatEmitted = false;
      mockEventEmitter.on('unit-defeated', () => {
        defeatEmitted = true;
      });

      mockPlayerUnit.currentHP = 20;
      const result = battleStateManager.applyDamage(mockPlayerUnit, 30);

      expect(result.success).toBe(true);
      expect(mockPlayerUnit.currentHP).toBe(0);
      expect(defeatEmitted).toBe(true);
    });

    test('should return error for null unit', () => {
      const result = battleStateManager.applyDamage(null as any, 10);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.UNIT_NOT_FOUND);
    });

    test('should return error for negative damage', () => {
      const result = battleStateManager.applyDamage(mockPlayerUnit, -10);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
    });

    test('should update battle statistics for BattleUnit', () => {
      const result = battleStateManager.applyDamage(mockBattleUnit, 25);

      expect(result.success).toBe(true);
      expect(mockBattleUnit.battleStats.totalDamageReceived).toBe(25);
    });
  });

  describe('handleUnitDefeated', () => {
    beforeEach(() => {
      mockPlayerUnit.currentHP = 0; // Set unit as defeated
    });

    test('should mark defeated unit as having acted', () => {
      const result = battleStateManager.handleUnitDefeated(mockPlayerUnit);

      expect(result.success).toBe(true);
      expect(mockPlayerUnit.hasActed).toBe(true);
      expect(mockPlayerUnit.hasMoved).toBe(true);
    });

    test('should clear status effects for BattleUnit', () => {
      mockBattleUnit.currentHP = 0;
      mockBattleUnit.statusEffects = [
        {
          id: 'poison-1',
          type: 'poison',
          name: 'Poison',
          description: 'Taking poison damage',
          duration: 3,
          power: 5,
          source: 'enemy-attack',
          stackable: false,
        },
      ];

      const result = battleStateManager.handleUnitDefeated(mockBattleUnit);

      expect(result.success).toBe(true);
      expect(mockBattleUnit.statusEffects).toHaveLength(0);
    });

    test('should update BattleUnit combat flags', () => {
      mockBattleUnit.currentHP = 0;
      const result = battleStateManager.handleUnitDefeated(mockBattleUnit);

      expect(result.success).toBe(true);
      expect(mockBattleUnit.canAttack).toBe(false);
      expect(mockBattleUnit.attacksRemaining).toBe(0);
    });

    test('should emit unit-defeated event', () => {
      let emittedData: any = null;
      mockEventEmitter.on('unit-defeated', data => {
        emittedData = data;
      });

      const result = battleStateManager.handleUnitDefeated(mockPlayerUnit);

      expect(result.success).toBe(true);
      expect(emittedData).not.toBeNull();
      expect(emittedData.unit).toBe(mockPlayerUnit);
      expect(emittedData.faction).toBe('player');
      expect(emittedData.wasPlayer).toBe(true);
    });

    test('should return error for unit with HP > 0', () => {
      mockPlayerUnit.currentHP = 50;
      const result = battleStateManager.handleUnitDefeated(mockPlayerUnit);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
    });

    test('should return error for null unit', () => {
      const result = battleStateManager.handleUnitDefeated(null as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.UNIT_NOT_FOUND);
    });
  });

  describe('grantExperience', () => {
    test('should grant experience to player unit', () => {
      const result = battleStateManager.grantExperience(mockPlayerUnit, 50);

      expect(result.success).toBe(true);
      expect((mockPlayerUnit as any).experience).toBe(50);
    });

    test('should not grant experience to enemy unit', () => {
      const result = battleStateManager.grantExperience(mockEnemyUnit, 50);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
    });

    test('should not grant experience to defeated unit', () => {
      mockPlayerUnit.currentHP = 0;
      const result = battleStateManager.grantExperience(mockPlayerUnit, 50);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
    });

    test('should apply level difference multiplier with battle result', () => {
      const battleResult: BattleResult = {
        attacker: mockPlayerUnit,
        target: mockEnemyUnit,
        weapon: mockBattleUnit.weapon!,
        baseDamage: 20,
        finalDamage: 25,
        modifiers: [],
        isCritical: false,
        isEvaded: false,
        experienceGained: 0,
        targetDefeated: false,
        effectsApplied: [],
        timestamp: Date.now(),
      };

      const result = battleStateManager.grantExperience(mockPlayerUnit, 50, battleResult);

      expect(result.success).toBe(true);
      expect((mockPlayerUnit as any).experience).toBeGreaterThan(0);
    });

    test('should grant bonus experience for critical hits', () => {
      // Create a stronger enemy for this test to ensure positive level difference
      const strongerEnemy: Unit = {
        ...mockEnemyUnit,
        stats: {
          ...mockEnemyUnit.stats,
          maxHP: 120, // Higher than player's 100 HP
        },
      };

      const battleResult: BattleResult = {
        attacker: mockPlayerUnit,
        target: strongerEnemy,
        weapon: mockBattleUnit.weapon!,
        baseDamage: 20,
        finalDamage: 30,
        modifiers: [],
        isCritical: true,
        isEvaded: false,
        experienceGained: 0,
        targetDefeated: false,
        effectsApplied: [],
        timestamp: Date.now(),
      };

      const result = battleStateManager.grantExperience(mockPlayerUnit, 50, battleResult);

      expect(result.success).toBe(true);
      expect((mockPlayerUnit as any).experience).toBeGreaterThan(50);
    });

    test('should grant bonus experience for defeating enemies', () => {
      const battleResult: BattleResult = {
        attacker: mockPlayerUnit,
        target: mockEnemyUnit,
        weapon: mockBattleUnit.weapon!,
        baseDamage: 20,
        finalDamage: 25,
        modifiers: [],
        isCritical: false,
        isEvaded: false,
        experienceGained: 0,
        targetDefeated: true,
        effectsApplied: [],
        timestamp: Date.now(),
      };

      const result = battleStateManager.grantExperience(mockPlayerUnit, 50, battleResult);

      expect(result.success).toBe(true);
      expect((mockPlayerUnit as any).experience).toBeGreaterThan(50);
    });

    test('should cap experience at maximum per battle', () => {
      const result = battleStateManager.grantExperience(mockPlayerUnit, 1000);

      expect(result.success).toBe(true);
      expect((mockPlayerUnit as any).experience).toBeLessThanOrEqual(200); // Default max
    });

    test('should emit experience-granted event', () => {
      let emittedData: any = null;
      mockEventEmitter.on('experience-granted', data => {
        emittedData = data;
      });

      const result = battleStateManager.grantExperience(mockPlayerUnit, 75);

      expect(result.success).toBe(true);
      expect(emittedData).not.toBeNull();
      expect(emittedData.unit).toBe(mockPlayerUnit);
      expect(emittedData.experienceGained).toBe(75);
    });

    test('should handle level up when experience threshold is reached', () => {
      let levelUpEmitted = false;
      mockEventEmitter.on('unit-level-up', () => {
        levelUpEmitted = true;
      });

      const result = battleStateManager.grantExperience(mockPlayerUnit, 150);

      expect(result.success).toBe(true);
      expect(levelUpEmitted).toBe(true);
    });

    test('should return error for negative experience', () => {
      const result = battleStateManager.grantExperience(mockPlayerUnit, -10);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
    });
  });

  describe('recordBattleResult', () => {
    let mockBattleResult: BattleResult;

    beforeEach(() => {
      mockBattleResult = {
        attacker: mockBattleUnit,
        target: mockEnemyUnit,
        weapon: mockBattleUnit.weapon!,
        baseDamage: 20,
        finalDamage: 25,
        modifiers: [],
        isCritical: false,
        isEvaded: false,
        experienceGained: 50,
        targetDefeated: false,
        effectsApplied: [],
        timestamp: Date.now(),
      };
    });

    test('should record battle result successfully', () => {
      const result = battleStateManager.recordBattleResult(mockBattleResult);

      expect(result.success).toBe(true);
      expect(battleStateManager.getBattleHistory()).toHaveLength(1);
    });

    test('should update attacker battle statistics', () => {
      const result = battleStateManager.recordBattleResult(mockBattleResult);

      expect(result.success).toBe(true);
      expect(mockBattleUnit.battleStats.totalDamageDealt).toBe(25);
      expect(mockBattleUnit.battleStats.battlesParticipated).toBe(1);
      expect(mockBattleUnit.battleStats.attacksLanded).toBe(1);
    });

    test('should update statistics for critical hits', () => {
      mockBattleResult.isCritical = true;
      const result = battleStateManager.recordBattleResult(mockBattleResult);

      expect(result.success).toBe(true);
      expect(mockBattleUnit.battleStats.criticalHitsLanded).toBe(1);
    });

    test('should update statistics for missed attacks', () => {
      mockBattleResult.isEvaded = true;
      const result = battleStateManager.recordBattleResult(mockBattleResult);

      expect(result.success).toBe(true);
      expect(mockBattleUnit.battleStats.attacksMissed).toBe(1);
    });

    test('should update statistics for defeated units', () => {
      mockBattleResult.targetDefeated = true;
      const result = battleStateManager.recordBattleResult(mockBattleResult);

      expect(result.success).toBe(true);
      expect(mockBattleUnit.battleStats.unitsDefeated).toBe(1);
    });

    test('should update summary statistics', () => {
      const result = battleStateManager.recordBattleResult(mockBattleResult);

      expect(result.success).toBe(true);
      const summary = battleStateManager.getBattleStatsSummary();
      expect(summary.totalBattles).toBe(1);
      expect(summary.totalDamageDealt).toBe(25);
      expect(summary.averageDamagePerBattle).toBe(25);
    });

    test('should emit battle-result-recorded event', () => {
      let emittedData: any = null;
      mockEventEmitter.on('battle-result-recorded', data => {
        emittedData = data;
      });

      const result = battleStateManager.recordBattleResult(mockBattleResult);

      expect(result.success).toBe(true);
      expect(emittedData).not.toBeNull();
      expect(emittedData.result).toBe(mockBattleResult);
      expect(emittedData.battleCount).toBe(1);
    });

    test('should add timestamp if not present', () => {
      delete (mockBattleResult as any).timestamp;
      const result = battleStateManager.recordBattleResult(mockBattleResult);

      expect(result.success).toBe(true);
      const history = battleStateManager.getBattleHistory();
      expect(history[0].timestamp).toBeDefined();
      expect(typeof history[0].timestamp).toBe('number');
    });

    test('should return error for null battle result', () => {
      const result = battleStateManager.recordBattleResult(null as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
    });

    test('should return error for invalid battle result', () => {
      const invalidResult = { ...mockBattleResult };
      delete (invalidResult as any).attacker;

      const result = battleStateManager.recordBattleResult(invalidResult);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
    });
  });

  describe('updatePostBattle', () => {
    let allUnits: Unit[];
    let mockBattleResult: BattleResult;

    beforeEach(() => {
      allUnits = [mockPlayerUnit, mockEnemyUnit];
      mockBattleResult = {
        attacker: mockPlayerUnit,
        target: mockEnemyUnit,
        weapon: mockBattleUnit.weapon!,
        baseDamage: 20,
        finalDamage: 25,
        modifiers: [],
        isCritical: false,
        isEvaded: false,
        experienceGained: 50,
        targetDefeated: false,
        effectsApplied: [],
        timestamp: Date.now(),
      };
    });

    test('should update post-battle state successfully', () => {
      const result = battleStateManager.updatePostBattle(mockBattleResult, allUnits);

      expect(result.success).toBe(true);
    });

    test('should emit post-battle-update-complete event', () => {
      let emittedData: any = null;
      mockEventEmitter.on('post-battle-update-complete', data => {
        emittedData = data;
      });

      const result = battleStateManager.updatePostBattle(mockBattleResult, allUnits);

      expect(result.success).toBe(true);
      expect(emittedData).not.toBeNull();
      expect(emittedData.battleResult).toBe(mockBattleResult);
      expect(emittedData.livingPlayerUnits).toBe(1);
      expect(emittedData.livingEnemyUnits).toBe(1);
    });

    test('should emit victory condition when all enemies defeated', () => {
      let victoryEmitted = false;
      mockEventEmitter.on('battle-victory-condition-met', () => {
        victoryEmitted = true;
      });

      // Defeat all enemy units
      mockEnemyUnit.currentHP = 0;

      const result = battleStateManager.updatePostBattle(mockBattleResult, allUnits);

      expect(result.success).toBe(true);
      expect(victoryEmitted).toBe(true);
    });

    test('should emit defeat condition when all players defeated', () => {
      let defeatEmitted = false;
      mockEventEmitter.on('battle-defeat-condition-met', () => {
        defeatEmitted = true;
      });

      // Defeat all player units
      mockPlayerUnit.currentHP = 0;

      const result = battleStateManager.updatePostBattle(mockBattleResult, allUnits);

      expect(result.success).toBe(true);
      expect(defeatEmitted).toBe(true);
    });

    test('should return error for null battle result', () => {
      const result = battleStateManager.updatePostBattle(null as any, allUnits);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
    });

    test('should return error for invalid units array', () => {
      const result = battleStateManager.updatePostBattle(mockBattleResult, null as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
    });
  });

  describe('configuration management', () => {
    test('should get experience configuration', () => {
      const config = battleStateManager.getExperienceConfig();

      expect(config).toBeDefined();
      expect(typeof config.attackHitExperience).toBe('number');
      expect(typeof config.defeatExperience).toBe('number');
    });

    test('should update experience configuration', () => {
      const newConfig = { attackHitExperience: 20 };
      battleStateManager.updateExperienceConfig(newConfig);

      const config = battleStateManager.getExperienceConfig();
      expect(config.attackHitExperience).toBe(20);
    });

    test('should get battle configuration', () => {
      const config = battleStateManager.getBattleConfig();

      expect(config).toBeDefined();
      expect(typeof config.autoMarkDefeatedAsActed).toBe('boolean');
      expect(typeof config.clearStatusEffectsOnDefeat).toBe('boolean');
    });

    test('should update battle configuration', () => {
      const newConfig = { autoMarkDefeatedAsActed: false };
      battleStateManager.updateBattleConfig(newConfig);

      const config = battleStateManager.getBattleConfig();
      expect(config.autoMarkDefeatedAsActed).toBe(false);
    });
  });

  describe('statistics and history', () => {
    test('should get empty battle history initially', () => {
      const history = battleStateManager.getBattleHistory();

      expect(history).toHaveLength(0);
    });

    test('should get initial battle statistics', () => {
      const stats = battleStateManager.getBattleStatsSummary();

      expect(stats.totalBattles).toBe(0);
      expect(stats.totalDamageDealt).toBe(0);
      expect(stats.totalExperienceGranted).toBe(0);
    });

    test('should get recent battles', () => {
      const mockResult: BattleResult = {
        attacker: mockPlayerUnit,
        target: mockEnemyUnit,
        weapon: mockBattleUnit.weapon!,
        baseDamage: 20,
        finalDamage: 25,
        modifiers: [],
        isCritical: false,
        isEvaded: false,
        experienceGained: 50,
        targetDefeated: false,
        effectsApplied: [],
        timestamp: Date.now(),
      };

      battleStateManager.recordBattleResult(mockResult);
      const recent = battleStateManager.getRecentBattles(5);

      expect(recent).toHaveLength(1);
      expect(recent[0]).toEqual(mockResult);
    });

    test('should clear battle history', () => {
      const mockResult: BattleResult = {
        attacker: mockPlayerUnit,
        target: mockEnemyUnit,
        weapon: mockBattleUnit.weapon!,
        baseDamage: 20,
        finalDamage: 25,
        modifiers: [],
        isCritical: false,
        isEvaded: false,
        experienceGained: 50,
        targetDefeated: false,
        effectsApplied: [],
        timestamp: Date.now(),
      };

      battleStateManager.recordBattleResult(mockResult);
      expect(battleStateManager.getBattleHistory()).toHaveLength(1);

      battleStateManager.clearBattleHistory();
      expect(battleStateManager.getBattleHistory()).toHaveLength(0);

      const stats = battleStateManager.getBattleStatsSummary();
      expect(stats.totalBattles).toBe(0);
    });
  });

  describe('reset and destroy', () => {
    test('should reset battle state manager', () => {
      // Add some data first
      const mockResult: BattleResult = {
        attacker: mockPlayerUnit,
        target: mockEnemyUnit,
        weapon: mockBattleUnit.weapon!,
        baseDamage: 20,
        finalDamage: 25,
        modifiers: [],
        isCritical: false,
        isEvaded: false,
        experienceGained: 50,
        targetDefeated: false,
        effectsApplied: [],
        timestamp: Date.now(),
      };

      battleStateManager.recordBattleResult(mockResult);
      expect(battleStateManager.getBattleHistory()).toHaveLength(1);

      // Reset
      battleStateManager.reset();

      expect(battleStateManager.getBattleHistory()).toHaveLength(0);
      const stats = battleStateManager.getBattleStatsSummary();
      expect(stats.totalBattles).toBe(0);
    });

    test('should destroy battle state manager', () => {
      let destroyEmitted = false;
      mockEventEmitter.on('battle-state-manager-destroyed', () => {
        destroyEmitted = true;
      });

      battleStateManager.destroy();

      expect(destroyEmitted).toBe(true);
      expect(battleStateManager.getBattleHistory()).toHaveLength(0);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle unit with invalid HP values', () => {
      const invalidUnit = { ...mockPlayerUnit };
      delete (invalidUnit as any).currentHP;

      const result = battleStateManager.applyDamage(invalidUnit, 10);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
    });

    test('should handle experience granting with invalid amount', () => {
      const result = battleStateManager.grantExperience(mockPlayerUnit, NaN);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
    });

    test('should handle battle result recording with missing fields', () => {
      const invalidResult = {
        attacker: mockPlayerUnit,
        // Missing target and other required fields
      };

      const result = battleStateManager.recordBattleResult(invalidResult as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
    });

    test('should handle post-battle update with empty units array', () => {
      const mockResult: BattleResult = {
        attacker: mockPlayerUnit,
        target: mockEnemyUnit,
        weapon: mockBattleUnit.weapon!,
        baseDamage: 20,
        finalDamage: 25,
        modifiers: [],
        isCritical: false,
        isEvaded: false,
        experienceGained: 50,
        targetDefeated: false,
        effectsApplied: [],
        timestamp: Date.now(),
      };

      const result = battleStateManager.updatePostBattle(mockResult, []);

      expect(result.success).toBe(true); // Should succeed with empty array
    });
  });
});
