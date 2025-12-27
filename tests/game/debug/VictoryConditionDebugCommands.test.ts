/**
 * VictoryConditionDebugCommands テストスイート
 * 
 * デバッグコマンドシステムの動作を検証
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { VictoryConditionDebugCommands } from '../../../game/src/debug/VictoryConditionDebugCommands';
import { VictoryConditionSystem } from '../../../game/src/systems/victory/VictoryConditionSystem';
import { ObjectiveManager } from '../../../game/src/systems/victory/ObjectiveManager';
import { BossSystem } from '../../../game/src/systems/victory/BossSystem';
import { RewardCalculator } from '../../../game/src/systems/victory/RewardCalculator';
import { VictoryConditionPerformanceManager } from '../../../game/src/systems/victory/VictoryConditionPerformanceManager';
import { ObjectiveType } from '../../../game/src/types/victory';
import { BossType, BossDifficulty, RoseEssenceType } from '../../../game/src/types/boss';

describe('VictoryConditionDebugCommands', () => {
  let debugCommands: VictoryConditionDebugCommands;
  let mockVictorySystem: any;
  let mockObjectiveManager: any;
  let mockBossSystem: any;
  let mockRewardCalculator: any;
  let mockPerformanceManager: any;

  beforeEach(() => {
    // モックオブジェクトの作成
    mockObjectiveManager = {
      getAllObjectives: vi.fn(() => []),
      completeObjective: vi.fn(() => ({ success: true })),
      getObjectivesByType: vi.fn(() => []),
    };

    mockBossSystem = {
      isBoss: vi.fn(() => false),
      getBossData: vi.fn(() => null),
      getAllBosses: vi.fn(() => []),
    };

    mockRewardCalculator = {
      calculateRewards: vi.fn(() => ({
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: 'A',
          experienceMultiplier: 1.2,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      })),
    };

    mockPerformanceManager = {
      clearAll: vi.fn(),
    };

    mockVictorySystem = {
      isSystemInitialized: vi.fn(() => true),
      isStageCompleted: vi.fn(() => false),
      isStageFailedStatus: vi.fn(() => false),
      getObjectiveManager: vi.fn(() => mockObjectiveManager),
      getBossSystem: vi.fn(() => mockBossSystem),
      getRewardCalculator: vi.fn(() => mockRewardCalculator),
      getPerformanceManager: vi.fn(() => mockPerformanceManager),
      getCurrentStageData: vi.fn(() => ({
        id: 'test_stage',
        name: 'Test Stage',
        baseExperienceReward: 100,
        targetTurns: 10,
        maxTurns: 20,
        bosses: [],
      })),
      getStagePerformance: vi.fn(() => ({
        turnsUsed: 5,
        unitsLost: 0,
        enemiesDefeated: 10,
        bossesDefeated: 1,
        recruitmentSuccesses: 2,
        damageDealt: 500,
        damageTaken: 200,
        healingDone: 100,
      })),
      checkVictoryConditions: vi.fn(() => ({
        isVictory: true,
        satisfiedConditions: [],
        unsatisfiedConditions: [],
      })),
      checkDefeatConditions: vi.fn(() => ({
        isDefeat: false,
        triggeredConditions: [],
      })),
      handleBossDefeat: vi.fn(() => Promise.resolve({
        bossId: 'test_boss',
        bossName: 'Test Boss',
        roseEssenceAmount: 50,
        roseEssenceType: RoseEssenceType.CRIMSON,
        experienceBonus: 200,
        timestamp: Date.now(),
      })),
    };

    debugCommands = new VictoryConditionDebugCommands(mockVictorySystem);
  });

  describe('初期化', () => {
    test('コンストラクタでVictoryConditionSystemを設定できる', () => {
      expect(debugCommands).toBeDefined();
    });

    test('setVictoryConditionSystemでシステムを設定できる', () => {
      const newDebugCommands = new VictoryConditionDebugCommands();
      newDebugCommands.setVictoryConditionSystem(mockVictorySystem);
      expect(newDebugCommands).toBeDefined();
    });
  });

  describe('報酬倍率の設定', () => {
    test('報酬倍率を設定できる', () => {
      const result = (debugCommands as any).setRewardMultiplier(2.0);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('2');
    });

    test('0以下の倍率は設定できない', () => {
      const result = (debugCommands as any).setRewardMultiplier(0);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('0より大きい');
    });

    test('報酬倍率を取得できる', () => {
      (debugCommands as any).setRewardMultiplier(1.5);
      const result = (debugCommands as any).getRewardMultiplier();
      
      expect(result.success).toBe(true);
      expect(result.data.multiplier).toBe(1.5);
    });
  });

  describe('システム状態の取得', () => {
    test('システム状態を取得できる', () => {
      const result = (debugCommands as any).getSystemStatus();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('initialized');
      expect(result.data).toHaveProperty('stageComplete');
      expect(result.data).toHaveProperty('stageFailed');
    });

    test('パフォーマンス情報を取得できる', () => {
      const result = (debugCommands as any).getPerformance();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('turnsUsed');
      expect(result.data).toHaveProperty('enemiesDefeated');
    });
  });

  describe('目標管理', () => {
    test('目標一覧を表示できる', () => {
      mockObjectiveManager.getAllObjectives.mockReturnValue([
        {
          id: 'obj_1',
          type: ObjectiveType.DEFEAT_BOSS,
          description: 'ボスを倒す',
          isComplete: false,
        },
      ]);

      const result = (debugCommands as any).listObjectives();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    test('目標達成状態を表示できる', () => {
      mockObjectiveManager.getAllObjectives.mockReturnValue([
        {
          id: 'obj_1',
          type: ObjectiveType.DEFEAT_BOSS,
          description: 'ボスを倒す',
          isRequired: true,
          isComplete: false,
          progress: { current: 0, target: 1, percentage: 0 },
        },
      ]);

      const result = (debugCommands as any).showObjectiveStatus();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    test('目標を強制完了できる', () => {
      const result = (debugCommands as any).completeObjective('obj_1');
      
      expect(result.success).toBe(true);
      expect(mockObjectiveManager.completeObjective).toHaveBeenCalledWith('obj_1');
    });
  });

  describe('ボス管理', () => {
    test('ボス一覧を表示できる', () => {
      mockBossSystem.getAllBosses.mockReturnValue([
        {
          id: 'boss_1',
          name: 'Test Boss',
          bossType: BossType.MINOR_BOSS,
          difficulty: BossDifficulty.NORMAL,
          roseEssenceAmount: 50,
          phases: [],
        },
      ]);

      const result = (debugCommands as any).listBosses();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    test('ボス情報を詳細表示できる', () => {
      mockBossSystem.isBoss.mockReturnValue(true);
      mockBossSystem.getBossData.mockReturnValue({
        id: 'boss_1',
        name: 'Test Boss',
        title: 'The Tester',
        description: 'A test boss',
        bossType: BossType.MINOR_BOSS,
        difficulty: BossDifficulty.NORMAL,
        roseEssenceAmount: 50,
        roseEssenceType: RoseEssenceType.CRIMSON,
        phases: [],
        specialAbilities: [],
        experienceReward: 200,
      });

      const result = (debugCommands as any).showBossInfo('boss_1');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('roseEssence');
    });

    test('存在しないボスの情報は取得できない', () => {
      mockBossSystem.isBoss.mockReturnValue(false);

      const result = (debugCommands as any).showBossInfo('invalid_boss');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('見つかりません');
    });

    test('ボスを即座に撃破できる', () => {
      mockBossSystem.isBoss.mockReturnValue(true);
      mockBossSystem.getBossData.mockReturnValue({
        id: 'boss_1',
        name: 'Test Boss',
        roseEssenceAmount: 50,
      });

      const result = (debugCommands as any).defeatBoss('boss_1');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('撃破');
    });
  });

  describe('勝利・敗北強制', () => {
    test('勝利を強制できる', () => {
      mockObjectiveManager.getAllObjectives.mockReturnValue([
        {
          id: 'obj_1',
          isComplete: false,
        },
      ]);

      const result = (debugCommands as any).forceVictory();
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('勝利');
      expect(mockObjectiveManager.completeObjective).toHaveBeenCalled();
    });

    test('敗北を強制できる', () => {
      const result = (debugCommands as any).forceDefeat('テスト理由');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('敗北');
    });

    test('既にクリア済みの場合は勝利を強制できない', () => {
      mockVictorySystem.isStageCompleted.mockReturnValue(true);

      const result = (debugCommands as any).forceVictory();
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('既に');
    });

    test('既に失敗済みの場合は敗北を強制できない', () => {
      mockVictorySystem.isStageFailedStatus.mockReturnValue(true);

      const result = (debugCommands as any).forceDefeat();
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('既に');
    });
  });

  describe('報酬プレビュー', () => {
    test('報酬をプレビューできる', () => {
      const result = (debugCommands as any).previewRewards();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('performance');
      expect(result.data).toHaveProperty('rewards');
      expect(result.data).toHaveProperty('multiplier');
    });

    test('報酬倍率が適用される', () => {
      (debugCommands as any).setRewardMultiplier(2.0);
      
      const result = (debugCommands as any).previewRewards();
      
      expect(result.success).toBe(true);
      expect(result.data.multiplier).toBe(2.0);
      expect(result.data.rewards.baseExperience).toBe(200); // 100 * 2.0
    });
  });

  describe('キャッシュ管理', () => {
    test('キャッシュをクリアできる', () => {
      const result = (debugCommands as any).clearCache();
      
      expect(result.success).toBe(true);
      expect(mockPerformanceManager.clearAll).toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    test('システムが未初期化の場合はエラーを返す', () => {
      mockVictorySystem.isSystemInitialized.mockReturnValue(false);

      const result = (debugCommands as any).showObjectiveStatus();
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('初期化');
    });

    test('システムが設定されていない場合はエラーを返す', () => {
      const newDebugCommands = new VictoryConditionDebugCommands();
      
      const result = (newDebugCommands as any).getSystemStatus();
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('設定されていません');
    });
  });

  describe('ヘルプ表示', () => {
    test('ヘルプを表示できる', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = (debugCommands as any).showHelp();
      
      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('破棄', () => {
    test('destroyでリソースを解放できる', () => {
      debugCommands.destroy();
      
      // windowオブジェクトからコマンドが削除されることを確認
      // （ブラウザ環境でのみ有効）
      if (typeof window !== 'undefined') {
        expect((window as any).victoryCommands).toBeUndefined();
      }
    });
  });
});
