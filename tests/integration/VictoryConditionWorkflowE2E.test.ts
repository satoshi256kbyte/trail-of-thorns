/**
 * VictoryConditionSystem E2Eワークフローテスト
 * 
 * エンドツーエンドのステージクリアワークフローを検証
 * ボス戦から報酬受け取りまでの完全なフローをテスト
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { VictoryConditionSystem } from '../../game/src/systems/victory/VictoryConditionSystem';
import type { StageData } from '../../game/src/types/gameplay';
import type { Unit } from '../../game/src/types/gameplay';
import type { ObjectiveType } from '../../game/src/types/victory';
import type { BossType, RoseEssenceType } from '../../game/src/types/boss';

describe('VictoryConditionSystem - E2Eワークフロー', () => {
  let victorySystem: VictoryConditionSystem;
  let mockScene: any;
  let mockStageData: StageData;

  beforeEach(() => {
    mockScene = {
      events: {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      },
      time: {
        delayedCall: vi.fn((delay, callback) => {
          callback();
          return { remove: vi.fn() };
        }),
      },
      add: {
        text: vi.fn(() => ({
          setOrigin: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          setAlpha: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        })),
        graphics: vi.fn(() => ({
          fillStyle: vi.fn().mockReturnThis(),
          fillRect: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          setAlpha: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        })),
      },
      tweens: {
        add: vi.fn((config) => {
          if (config.onComplete) config.onComplete();
          return { remove: vi.fn() };
        }),
      },
    };

    mockStageData = {
      id: 'e2e_stage',
      name: 'E2E Test Stage',
      description: 'Complete workflow test stage',
      mapData: { width: 15, height: 15, tiles: [] },
      playerUnits: [],
      enemyUnits: [],
      objectives: [
        {
          id: 'obj_boss',
          type: 'defeat_boss' as ObjectiveType,
          description: 'Defeat the chapter boss',
          isRequired: true,
          targetData: { bossId: 'boss_main' },
        },
        {
          id: 'obj_enemies',
          type: 'defeat_all_enemies' as ObjectiveType,
          description: 'Defeat all enemies',
          isRequired: false,
          targetData: {},
        },
      ],
      victoryConditions: [
        {
          id: 'victory_main',
          type: 'defeat_boss',
          description: 'Defeat the main boss',
        },
      ],
      defeatConditions: [
        {
          id: 'defeat_main',
          type: 'all_units_defeated',
          description: 'All player units defeated',
        },
      ],
      bossData: [
        {
          id: 'boss_main',
          name: 'Dark Lord',
          title: 'The Corrupted',
          description: 'Final boss of the chapter',
          roseEssenceAmount: 200,
          roseEssenceType: 'cursed' as RoseEssenceType,
          isBoss: true,
          bossType: 'chapter_boss' as BossType,
          difficulty: 'hard',
          phases: [
            {
              phaseNumber: 1,
              hpThreshold: 100,
              statModifiers: {},
              newAbilities: [],
            },
            {
              phaseNumber: 2,
              hpThreshold: 50,
              statModifiers: { attack: 1.5 },
              newAbilities: ['dark_blast'],
            },
          ],
          specialAbilities: [],
          experienceReward: 1000,
        },
      ],
    };

    victorySystem = new VictoryConditionSystem(mockScene);
  });

  describe('完全なステージクリアフロー', () => {
    test('ステージ開始から勝利までの完全なフロー', async () => {
      // 1. ステージ初期化
      victorySystem.initialize(mockStageData);
      
      expect(victorySystem.getObjectiveManager().getAllObjectives()).toHaveLength(2);
      expect(victorySystem.getBossSystem().isBoss('boss_main')).toBe(true);

      // 2. 通常敵の撃破（任意目標）
      const objectiveManager = victorySystem.getObjectiveManager();
      objectiveManager.updateProgress('obj_enemies', {
        current: 5,
        target: 10,
        percentage: 50,
      });

      let victoryCheck = victorySystem.checkVictoryConditions();
      expect(victoryCheck.isVictory).toBe(false); // まだ勝利していない

      // 3. ボス戦開始
      const boss: Unit = {
        id: 'boss_main',
        name: 'Dark Lord',
        position: { x: 7, y: 7 },
        stats: {
          maxHP: 2000,
          maxMP: 200,
          attack: 80,
          defense: 50,
          speed: 15,
          movement: 4,
        },
        currentHP: 2000,
        currentMP: 200,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
      };

      // 4. ボスのHPを減らす（フェーズ変化）
      boss.currentHP = 900; // 50%以下でフェーズ2

      // 5. ボス撃破
      boss.currentHP = 0;
      const bossDefeatResult = await victorySystem.handleBossDefeat(boss);
      
      expect(bossDefeatResult.success).toBe(true);
      expect(bossDefeatResult.roseEssenceGained).toBe(200);

      // 6. 勝利判定
      victoryCheck = victorySystem.checkVictoryConditions();
      expect(victoryCheck.isVictory).toBe(true);

      // 7. ステージクリア処理
      const completeResult = await victorySystem.handleStageComplete();
      
      expect(completeResult.success).toBe(true);
      expect(completeResult.rewards).toBeDefined();
      expect(completeResult.rewards.bossRewards).toHaveLength(1);
      expect(completeResult.rewards.bossRewards[0].roseEssenceAmount).toBe(200);
      expect(completeResult.rewards.baseExperience).toBeGreaterThan(0);

      // 8. システム状態確認
      expect(victorySystem.isStageCompleteStatus()).toBe(true);
      expect(victorySystem.isStageFailedStatus()).toBe(false);
    });

    test('複数ボス戦を含む完全なフロー', async () => {
      // 複数ボスのステージデータ
      const multiBossStage: StageData = {
        ...mockStageData,
        objectives: [
          {
            id: 'obj_boss1',
            type: 'defeat_boss' as ObjectiveType,
            description: 'Defeat first boss',
            isRequired: true,
            targetData: { bossId: 'boss_1' },
          },
          {
            id: 'obj_boss2',
            type: 'defeat_boss' as ObjectiveType,
            description: 'Defeat second boss',
            isRequired: true,
            targetData: { bossId: 'boss_2' },
          },
        ],
        bossData: [
          {
            id: 'boss_1',
            name: 'First Boss',
            title: 'Guardian',
            description: 'First boss',
            roseEssenceAmount: 100,
            roseEssenceType: 'crimson' as RoseEssenceType,
            isBoss: true,
            bossType: 'minor_boss' as BossType,
            difficulty: 'normal',
            phases: [],
            specialAbilities: [],
            experienceReward: 500,
          },
          {
            id: 'boss_2',
            name: 'Second Boss',
            title: 'Destroyer',
            description: 'Second boss',
            roseEssenceAmount: 150,
            roseEssenceType: 'shadow' as RoseEssenceType,
            isBoss: true,
            bossType: 'major_boss' as BossType,
            difficulty: 'hard',
            phases: [],
            specialAbilities: [],
            experienceReward: 750,
          },
        ],
      };

      victorySystem.initialize(multiBossStage);

      // 最初のボス撃破
      const boss1: Unit = {
        id: 'boss_1',
        name: 'First Boss',
        position: { x: 3, y: 3 },
        stats: { maxHP: 1000, maxMP: 100, attack: 40, defense: 25, speed: 10, movement: 3 },
        currentHP: 0,
        currentMP: 100,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
      };

      const result1 = await victorySystem.handleBossDefeat(boss1);
      expect(result1.success).toBe(true);
      expect(result1.roseEssenceGained).toBe(100);

      // まだ勝利していない
      let victoryCheck = victorySystem.checkVictoryConditions();
      expect(victoryCheck.isVictory).toBe(false);

      // 2番目のボス撃破
      const boss2: Unit = {
        id: 'boss_2',
        name: 'Second Boss',
        position: { x: 10, y: 10 },
        stats: { maxHP: 1500, maxMP: 150, attack: 60, defense: 40, speed: 12, movement: 4 },
        currentHP: 0,
        currentMP: 150,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
      };

      const result2 = await victorySystem.handleBossDefeat(boss2);
      expect(result2.success).toBe(true);
      expect(result2.roseEssenceGained).toBe(150);

      // 勝利判定
      victoryCheck = victorySystem.checkVictoryConditions();
      expect(victoryCheck.isVictory).toBe(true);

      // ステージクリア
      const completeResult = await victorySystem.handleStageComplete();
      expect(completeResult.success).toBe(true);
      expect(completeResult.rewards.bossRewards).toHaveLength(2);
      
      const totalRoseEssence = completeResult.rewards.bossRewards.reduce(
        (sum, reward) => sum + reward.roseEssenceAmount,
        0
      );
      expect(totalRoseEssence).toBe(250);
    });
  });

  describe('敗北フロー', () => {
    test('全ユニット撃破による敗北フロー', async () => {
      victorySystem.initialize(mockStageData);

      // 敗北条件を満たす
      const conditionManager = victorySystem.getVictoryConditionManager();
      vi.spyOn(conditionManager as any, 'evaluateDefeatCondition').mockReturnValue(true);

      // 敗北判定
      const defeatCheck = victorySystem.checkDefeatConditions();
      expect(defeatCheck.isDefeat).toBe(true);

      // ステージ失敗処理
      const failureResult = await victorySystem.handleStageFailure();
      expect(failureResult.success).toBe(true);

      // システム状態確認
      expect(victorySystem.isStageFailedStatus()).toBe(true);
      expect(victorySystem.isStageCompleteStatus()).toBe(false);
    });
  });

  describe('報酬計算と配布の完全フロー', () => {
    test('高評価クリアの報酬フロー', async () => {
      victorySystem.initialize(mockStageData);

      // ボス撃破
      const boss: Unit = {
        id: 'boss_main',
        name: 'Dark Lord',
        position: { x: 7, y: 7 },
        stats: { maxHP: 2000, maxMP: 200, attack: 80, defense: 50, speed: 15, movement: 4 },
        currentHP: 0,
        currentMP: 200,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
      };

      await victorySystem.handleBossDefeat(boss);

      // 高パフォーマンスでクリア
      const rewardCalculator = victorySystem.getRewardCalculator();
      const highPerformance = {
        turnsUsed: 5, // 少ないターン数
        unitsLost: 0, // ロストなし
        enemiesDefeated: 15,
        bossesDefeated: 1,
        recruitmentSuccesses: 3,
        damageDealt: 5000,
        damageTaken: 500,
        healingDone: 300,
      };

      const rewards = rewardCalculator.calculateRewards(mockStageData, highPerformance);
      
      // 高評価を確認
      const rating = rewardCalculator.calculateClearRating(highPerformance);
      expect(['S', 'A']).toContain(rating);

      // 報酬内容を確認
      expect(rewards.baseExperience).toBeGreaterThan(0);
      expect(rewards.bossRewards).toHaveLength(1);
      expect(rewards.clearRatingBonus.experienceMultiplier).toBeGreaterThan(1.0);

      // 報酬配布
      const distributor = victorySystem.getRewardDistributor();
      const distributionResult = await distributor.distributeRewards(rewards);
      
      expect(distributionResult.success).toBe(true);
    });

    test('低評価クリアの報酬フロー', async () => {
      victorySystem.initialize(mockStageData);

      // ボス撃破
      const boss: Unit = {
        id: 'boss_main',
        name: 'Dark Lord',
        position: { x: 7, y: 7 },
        stats: { maxHP: 2000, maxMP: 200, attack: 80, defense: 50, speed: 15, movement: 4 },
        currentHP: 0,
        currentMP: 200,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
      };

      await victorySystem.handleBossDefeat(boss);

      // 低パフォーマンスでクリア
      const rewardCalculator = victorySystem.getRewardCalculator();
      const lowPerformance = {
        turnsUsed: 30, // 多いターン数
        unitsLost: 3, // ロストあり
        enemiesDefeated: 10,
        bossesDefeated: 1,
        recruitmentSuccesses: 0,
        damageDealt: 2000,
        damageTaken: 3000,
        healingDone: 100,
      };

      const rewards = rewardCalculator.calculateRewards(mockStageData, lowPerformance);
      
      // 低評価を確認
      const rating = rewardCalculator.calculateClearRating(lowPerformance);
      expect(['C', 'D']).toContain(rating);

      // 報酬内容を確認（低評価でも報酬はある）
      expect(rewards.baseExperience).toBeGreaterThan(0);
      expect(rewards.bossRewards).toHaveLength(1);
      expect(rewards.clearRatingBonus.experienceMultiplier).toBeLessThanOrEqual(1.0);
    });
  });

  describe('エラーリカバリーフロー', () => {
    test('ボス撃破失敗時のリカバリー', async () => {
      victorySystem.initialize(mockStageData);

      // 存在しないボスの撃破を試みる
      const invalidBoss: Unit = {
        id: 'invalid_boss',
        name: 'Invalid',
        position: { x: 0, y: 0 },
        stats: { maxHP: 100, maxMP: 50, attack: 10, defense: 5, speed: 5, movement: 3 },
        currentHP: 0,
        currentMP: 50,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
      };

      await expect(victorySystem.handleBossDefeat(invalidBoss)).rejects.toThrow();

      // システムは正常な状態を維持
      expect(victorySystem.isStageCompleteStatus()).toBe(false);
      expect(victorySystem.isStageFailedStatus()).toBe(false);

      // 正しいボスで再試行
      const validBoss: Unit = {
        id: 'boss_main',
        name: 'Dark Lord',
        position: { x: 7, y: 7 },
        stats: { maxHP: 2000, maxMP: 200, attack: 80, defense: 50, speed: 15, movement: 4 },
        currentHP: 0,
        currentMP: 200,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
      };

      const result = await victorySystem.handleBossDefeat(validBoss);
      expect(result.success).toBe(true);
    });

    test('報酬計算失敗時のデフォルト報酬', async () => {
      victorySystem.initialize(mockStageData);

      // ボス撃破
      const boss: Unit = {
        id: 'boss_main',
        name: 'Dark Lord',
        position: { x: 7, y: 7 },
        stats: { maxHP: 2000, maxMP: 200, attack: 80, defense: 50, speed: 15, movement: 4 },
        currentHP: 0,
        currentMP: 200,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
      };

      await victorySystem.handleBossDefeat(boss);

      // 報酬計算でエラーが発生しても、デフォルト報酬が付与される
      const rewardCalculator = victorySystem.getRewardCalculator();
      vi.spyOn(rewardCalculator, 'calculateRewards').mockImplementation(() => {
        throw new Error('Calculation error');
      });

      // ステージクリアは成功する（デフォルト報酬で）
      const result = await victorySystem.handleStageComplete();
      expect(result.success).toBe(true);
      expect(result.rewards).toBeDefined();
    });
  });

  describe('パフォーマンステスト', () => {
    test('大規模ステージの処理パフォーマンス', async () => {
      // 大規模ステージデータ
      const largeStageData: StageData = {
        ...mockStageData,
        objectives: Array.from({ length: 50 }, (_, i) => ({
          id: `obj_${i}`,
          type: 'defeat_all_enemies' as ObjectiveType,
          description: `Objective ${i}`,
          isRequired: i < 5,
          targetData: {},
        })),
        bossData: Array.from({ length: 10 }, (_, i) => ({
          id: `boss_${i}`,
          name: `Boss ${i}`,
          title: `Title ${i}`,
          description: `Boss ${i}`,
          roseEssenceAmount: 100 + i * 10,
          roseEssenceType: 'crimson' as RoseEssenceType,
          isBoss: true,
          bossType: 'minor_boss' as BossType,
          difficulty: 'normal',
          phases: [],
          specialAbilities: [],
          experienceReward: 500 + i * 50,
        })),
      };

      const startTime = performance.now();
      
      victorySystem.initialize(largeStageData);
      
      // 全ボス撃破
      for (let i = 0; i < 10; i++) {
        const boss: Unit = {
          id: `boss_${i}`,
          name: `Boss ${i}`,
          position: { x: i, y: i },
          stats: { maxHP: 1000, maxMP: 100, attack: 50, defense: 30, speed: 10, movement: 3 },
          currentHP: 0,
          currentMP: 100,
          faction: 'enemy',
          hasActed: false,
          hasMoved: false,
        };
        await victorySystem.handleBossDefeat(boss);
      }

      // 勝利判定
      victorySystem.checkVictoryConditions();

      // ステージクリア
      await victorySystem.handleStageComplete();
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 大規模ステージでも1秒以内に処理完了
      expect(totalTime).toBeLessThan(1000);
    });
  });
});
