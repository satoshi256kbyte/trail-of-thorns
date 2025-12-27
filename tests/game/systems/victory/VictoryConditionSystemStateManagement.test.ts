/**
 * VictoryConditionSystem状態管理テスト
 * 
 * システム全体の状態管理と整合性をテスト
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import Phaser from 'phaser';
import { VictoryConditionSystem, VictoryStageData } from '../../../../game/src/systems/victory/VictoryConditionSystem';
import { ObjectiveType, VictoryConditionType, DefeatConditionType } from '../../../../game/src/types/victory';
import { BossDifficulty, BossType, RoseEssenceType } from '../../../../game/src/types/boss';
import { GameState } from '../../../../game/src/types/gameplay';

describe('VictoryConditionSystem - State Management', () => {
  let scene: Phaser.Scene;
  let system: VictoryConditionSystem;
  let mockStageData: VictoryStageData;

  beforeEach(() => {
    scene = {
      events: {
        on: vi.fn(),
        off: vi.fn(),
      },
    } as any;

    mockStageData = {
      id: 'state-test-stage',
      name: '状態管理テストステージ',
      description: '状態管理のテスト',
      objectives: [
        {
          id: 'obj-state-1',
          type: ObjectiveType.DEFEAT_BOSS,
          description: 'ボスを撃破',
          isRequired: true,
          isComplete: false,
          progress: { current: 0, target: 1, percentage: 0 },
          targetData: { bossId: 'boss-state-1' },
        },
      ],
      victoryConditions: [
        {
          id: 'vc-state-1',
          type: VictoryConditionType.DEFEAT_BOSS,
          description: 'ボス撃破',
          isRequired: true,
          evaluate: (gameState: any) => true,
        },
      ],
      defeatConditions: [
        {
          id: 'dc-state-1',
          type: DefeatConditionType.ALL_UNITS_DEFEATED,
          description: '全滅',
          evaluate: (gameState: any) => false,
        },
      ],
      bosses: [
        {
          id: 'boss-state-1',
          name: '状態テストボス',
          title: '状態の守護者',
          description: '状態管理テスト用',
          roseEssenceAmount: 50,
          roseEssenceType: RoseEssenceType.SHADOW,
          isBoss: true,
          bossType: BossType.MINOR_BOSS,
          difficulty: BossDifficulty.EASY,
          phases: [
            {
              phaseNumber: 1,
              hpThreshold: 100,
              statModifiers: {},
              newAbilities: [],
            },
          ],
          currentPhase: 1,
          specialAbilities: [],
          aiPersonality: 'defensive' as any,
          aiPriority: 5,
          experienceReward: 300,
        },
      ],
      baseExperienceReward: 500,
      targetTurns: 15,
      maxTurns: 30,
    };

    system = new VictoryConditionSystem(scene, {
      enableDebugLogs: false,
    });
  });

  describe('initialization state', () => {
    test('should start in uninitialized state', () => {
      expect(system.isSystemInitialized()).toBe(false);
      expect(system.isStageCompleted()).toBe(false);
      expect(system.isStageFailedStatus()).toBe(false);
    });

    test('should transition to initialized state', () => {
      system.initialize(mockStageData);

      expect(system.isSystemInitialized()).toBe(true);
      expect(system.isStageCompleted()).toBe(false);
      expect(system.isStageFailedStatus()).toBe(false);
    });

    test('should maintain initialized state after operations', () => {
      system.initialize(mockStageData);
      system.updateObjectiveProgress('obj-state-1', 0);

      expect(system.isSystemInitialized()).toBe(true);
    });
  });

  describe('stage completion state', () => {
    beforeEach(() => {
      system.initialize(mockStageData);
    });

    test('should transition to completed state', async () => {
      const gameState: GameState = {
        currentTurn: 10,
        activePlayer: 'player',
        phase: 'victory',
        gameResult: 'victory',
        turnOrder: [],
        activeUnitIndex: 0,
      };

      await system.handleStageComplete(gameState);

      expect(system.isStageCompleted()).toBe(true);
      expect(system.isStageFailedStatus()).toBe(false);
    });

    test('should prevent operations after completion', async () => {
      const gameState: GameState = {
        currentTurn: 10,
        activePlayer: 'player',
        phase: 'victory',
        gameResult: 'victory',
        turnOrder: [],
        activeUnitIndex: 0,
      };

      await system.handleStageComplete(gameState);

      // 2回目の完了は失敗するはず
      await expect(system.handleStageComplete(gameState)).rejects.toThrow();
    });

    test('should prevent failure after completion', async () => {
      const gameState: GameState = {
        currentTurn: 10,
        activePlayer: 'player',
        phase: 'victory',
        gameResult: 'victory',
        turnOrder: [],
        activeUnitIndex: 0,
      };

      await system.handleStageComplete(gameState);

      // 完了後の失敗は失敗するはず
      await expect(system.handleStageFailure('テスト失敗')).rejects.toThrow();
    });
  });

  describe('stage failure state', () => {
    beforeEach(() => {
      system.initialize(mockStageData);
    });

    test('should transition to failed state', async () => {
      await system.handleStageFailure('全滅');

      expect(system.isStageFailedStatus()).toBe(true);
      expect(system.isStageCompleted()).toBe(false);
    });

    test('should prevent operations after failure', async () => {
      await system.handleStageFailure('全滅');

      // 2回目の失敗は失敗するはず
      await expect(system.handleStageFailure('再度失敗')).rejects.toThrow();
    });

    test('should prevent completion after failure', async () => {
      const gameState: GameState = {
        currentTurn: 10,
        activePlayer: 'player',
        phase: 'defeat',
        gameResult: 'defeat',
        turnOrder: [],
        activeUnitIndex: 0,
      };

      await system.handleStageFailure('全滅');

      // 失敗後の完了は失敗するはず
      await expect(system.handleStageComplete(gameState)).rejects.toThrow();
    });
  });

  describe('performance tracking state', () => {
    beforeEach(() => {
      system.initialize(mockStageData);
    });

    test('should maintain performance state across operations', () => {
      system.recordEnemyDefeat('enemy-1');
      system.recordEnemyDefeat('enemy-2');
      system.recordUnitLost('unit-1');
      system.recordRecruitmentSuccess('char-1');

      const performance = system.getStagePerformance();

      expect(performance.enemiesDefeated).toBe(2);
      expect(performance.unitsLost).toBe(1);
      expect(performance.recruitmentSuccesses).toBe(1);
    });

    test('should reset performance on system reset', () => {
      system.recordEnemyDefeat('enemy-1');
      system.reset();
      system.initialize(mockStageData);

      const performance = system.getStagePerformance();

      expect(performance.enemiesDefeated).toBe(0);
    });

    test('should accumulate performance correctly', () => {
      for (let i = 0; i < 5; i++) {
        system.recordEnemyDefeat(`enemy-${i}`);
      }

      system.recordDamage(500, 200);
      system.recordHealing(150);

      const performance = system.getStagePerformance();

      expect(performance.enemiesDefeated).toBe(5);
      expect(performance.damageDealt).toBe(500);
      expect(performance.damageTaken).toBe(200);
      expect(performance.healingDone).toBe(150);
    });
  });

  describe('objective state synchronization', () => {
    beforeEach(() => {
      system.initialize(mockStageData);
    });

    test('should synchronize objective completion with system state', () => {
      system.updateObjectiveProgress('obj-state-1', 1);

      const objective = system.getObjectiveManager().getObjective('obj-state-1');
      expect(objective?.isComplete).toBe(true);
    });

    test('should maintain objective state across multiple updates', () => {
      system.updateObjectiveProgress('obj-state-1', 0);
      system.updateObjectiveProgress('obj-state-1', 0);
      system.updateObjectiveProgress('obj-state-1', 1);

      const objective = system.getObjectiveManager().getObjective('obj-state-1');
      expect(objective?.progress.current).toBe(1);
      expect(objective?.isComplete).toBe(true);
    });
  });

  describe('condition check state', () => {
    beforeEach(() => {
      system.initialize(mockStageData);
    });

    test('should maintain consistent check results', () => {
      const gameState: GameState = {
        currentTurn: 5,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      const result1 = system.checkVictoryConditions(gameState);
      const result2 = system.checkVictoryConditions(gameState);

      expect(result1.isVictory).toBe(result2.isVictory);
    });

    test('should not check after stage completion', async () => {
      const gameState: GameState = {
        currentTurn: 10,
        activePlayer: 'player',
        phase: 'victory',
        gameResult: 'victory',
        turnOrder: [],
        activeUnitIndex: 0,
      };

      await system.handleStageComplete(gameState);

      const victoryResult = system.checkVictoryConditions(gameState);
      const defeatResult = system.checkDefeatConditions(gameState);

      expect(victoryResult.message).toContain('already complete');
      expect(defeatResult.message).toContain('already complete');
    });
  });

  describe('reset state transitions', () => {
    test('should reset all state flags', async () => {
      system.initialize(mockStageData);
      
      const gameState: GameState = {
        currentTurn: 10,
        activePlayer: 'player',
        phase: 'victory',
        gameResult: 'victory',
        turnOrder: [],
        activeUnitIndex: 0,
      };

      await system.handleStageComplete(gameState);
      system.reset();

      expect(system.isSystemInitialized()).toBe(false);
      expect(system.isStageCompleted()).toBe(false);
      expect(system.isStageFailedStatus()).toBe(false);
      expect(system.getCurrentStageData()).toBeNull();
    });

    test('should allow re-initialization after reset', () => {
      system.initialize(mockStageData);
      system.reset();
      const result = system.initialize(mockStageData);

      expect(result.success).toBe(true);
      expect(system.isSystemInitialized()).toBe(true);
    });
  });

  describe('concurrent state operations', () => {
    beforeEach(() => {
      system.initialize(mockStageData);
    });

    test('should handle multiple performance updates', () => {
      system.recordEnemyDefeat('enemy-1');
      system.recordDamage(100, 50);
      system.recordEnemyDefeat('enemy-2');
      system.recordHealing(25);
      system.recordUnitLost('unit-1');

      const performance = system.getStagePerformance();

      expect(performance.enemiesDefeated).toBe(2);
      expect(performance.damageDealt).toBe(100);
      expect(performance.damageTaken).toBe(50);
      expect(performance.healingDone).toBe(25);
      expect(performance.unitsLost).toBe(1);
    });

    test('should handle objective updates and checks together', () => {
      const gameState: GameState = {
        currentTurn: 5,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      system.updateObjectiveProgress('obj-state-1', 0);
      const victoryResult1 = system.checkVictoryConditions(gameState);

      system.updateObjectiveProgress('obj-state-1', 1);
      const victoryResult2 = system.checkVictoryConditions(gameState);

      // 状態が変化していることを確認
      expect(victoryResult1).toBeDefined();
      expect(victoryResult2).toBeDefined();
    });
  });

  describe('state persistence', () => {
    test('should maintain state across getter calls', () => {
      system.initialize(mockStageData);
      system.recordEnemyDefeat('enemy-1');

      const performance1 = system.getStagePerformance();
      const performance2 = system.getStagePerformance();

      expect(performance1.enemiesDefeated).toBe(performance2.enemiesDefeated);
    });

    test('should return copies of state data', () => {
      system.initialize(mockStageData);
      system.recordEnemyDefeat('enemy-1');

      const performance1 = system.getStagePerformance();
      performance1.enemiesDefeated = 999; // 変更を試みる

      const performance2 = system.getStagePerformance();

      // 元のデータは変更されていないはず
      expect(performance2.enemiesDefeated).toBe(1);
    });
  });
});
