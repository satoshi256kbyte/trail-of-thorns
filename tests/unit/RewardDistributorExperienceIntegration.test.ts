/**
 * RewardDistributor の ExperienceSystem 統合ユニットテスト
 * 
 * このテストは、RewardDistributorがExperienceSystemと正しく統合されていることを検証します。
 * ExperienceSystemをモックして、RewardDistributorの動作のみをテストします。
 * 
 * テスト対象:
 * - ステージクリア時の経験値報酬配布機能
 * - ボス撃破時の経験値ボーナス計算と付与
 * - クリア評価による経験値倍率適用
 * - 報酬配布時のレベルアップ処理連携
 * 
 * 要件: 4.8, 6.1, 6.2, 6.3
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { RewardDistributor } from '../../game/src/systems/victory/RewardDistributor';
import { StageRewards, ClearRating } from '../../game/src/types/reward';
import { Unit } from '../../game/src/types/gameplay';
import { RoseEssenceType } from '../../game/src/types/boss';

describe('RewardDistributor ExperienceSystem統合ユニットテスト', () => {
  let rewardDistributor: RewardDistributor;
  let mockExperienceSystem: any;
  let mockPlayerUnits: Unit[];

  beforeEach(() => {
    // ExperienceSystemのモックを作成
    mockExperienceSystem = {
      awardExperience: vi.fn((characterId, action, context) => {
        // 経験値付与の結果を返す
        return {
          baseAmount: context.amount || 100,
          multipliedAmount: context.amount || 100,
          bonusAmount: 0,
          finalAmount: context.amount || 100,
          source: context.source,
          action,
          context,
        };
      }),
      checkAndProcessLevelUp: vi.fn((characterId) => {
        // レベルアップ結果を返す（モック）
        return {
          characterId,
          oldLevel: 1,
          newLevel: 2,
          statGrowth: {
            hp: 5,
            mp: 3,
            attack: 2,
            defense: 1,
            speed: 1,
            skill: 2,
            luck: 1,
          },
          newExperienceRequired: 250,
          oldStats: {
            maxHP: 100,
            maxMP: 50,
            attack: 20,
            defense: 15,
            speed: 10,
            movement: 3,
            skill: 12,
            luck: 8,
          },
          newStats: {
            maxHP: 105,
            maxMP: 53,
            attack: 22,
            defense: 16,
            speed: 11,
            movement: 3,
            skill: 14,
            luck: 9,
          },
          levelsGained: 1,
          timestamp: Date.now(),
        };
      }),
    };

    // RewardDistributorを初期化
    rewardDistributor = new RewardDistributor({
      enableExperienceDistribution: true,
      enableRoseEssenceDistribution: false,
      enableRecruitmentRewards: false,
      enableItemRewards: false,
      maxRetries: 3,
      debugMode: true,
    });

    // ExperienceSystemを設定
    rewardDistributor.setExperienceSystem(mockExperienceSystem);

    // モックプレイヤーユニットを作成
    mockPlayerUnits = [
      {
        id: 'player-001',
        name: 'テストヒーロー',
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
        level: 1,
      },
      {
        id: 'player-002',
        name: 'テストウォリアー',
        position: { x: 1, y: 0 },
        stats: {
          maxHP: 120,
          maxMP: 30,
          attack: 25,
          defense: 20,
          speed: 8,
          movement: 3,
        },
        currentHP: 120,
        currentMP: 30,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
        level: 1,
      },
    ];
  });

  afterEach(() => {
    if (rewardDistributor) {
      rewardDistributor.destroy();
    }
  });

  describe('ステージクリア時の経験値報酬配布', () => {
    test('基本経験値が全プレイヤーユニットに配布される', async () => {
      // 要件6.1: Experience_Systemに経験値を付与する
      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.B,
          experienceMultiplier: 1.0,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      const result = await rewardDistributor.distributeExperienceRewards(
        rewards,
        mockPlayerUnits
      );

      expect(result.success).toBe(true);
      expect(result.recipientIds).toHaveLength(2);
      expect(result.recipientIds).toContain('player-001');
      expect(result.recipientIds).toContain('player-002');
      expect(result.totalExperience).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);

      // awardExperienceが各キャラクターに対して呼ばれたことを確認
      expect(mockExperienceSystem.awardExperience).toHaveBeenCalledTimes(2);
      expect(mockExperienceSystem.awardExperience).toHaveBeenCalledWith(
        'player-001',
        'SUPPORT',
        expect.objectContaining({
          amount: 100,
        })
      );
      expect(mockExperienceSystem.awardExperience).toHaveBeenCalledWith(
        'player-002',
        'SUPPORT',
        expect.objectContaining({
          amount: 100,
        })
      );
    });

    test('経験値配布後にレベルアップ処理が呼ばれる', async () => {
      // 要件6.3: 報酬配布時のレベルアップ処理連携を実装
      const rewards: StageRewards = {
        baseExperience: 500,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.0,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      const result = await rewardDistributor.distributeExperienceRewards(
        rewards,
        mockPlayerUnits
      );

      expect(result.success).toBe(true);

      // checkAndProcessLevelUpが各キャラクターに対して呼ばれたことを確認
      expect(mockExperienceSystem.checkAndProcessLevelUp).toHaveBeenCalledTimes(2);
      expect(mockExperienceSystem.checkAndProcessLevelUp).toHaveBeenCalledWith('player-001');
      expect(mockExperienceSystem.checkAndProcessLevelUp).toHaveBeenCalledWith('player-002');
    });
  });

  describe('ボス撃破時の経験値ボーナス', () => {
    test('ボス撃破ボーナス経験値が正しく付与される', async () => {
      // 要件6.2: ボス撃破時の経験値ボーナス計算と付与を統合
      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [
          {
            bossId: 'boss-001',
            bossName: 'テストボス',
            roseEssenceAmount: 50,
            roseEssenceType: RoseEssenceType.CRIMSON,
            experienceBonus: 200,
          },
        ],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.B,
          experienceMultiplier: 1.0,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      const result = await rewardDistributor.distributeExperienceRewards(
        rewards,
        mockPlayerUnits
      );

      expect(result.success).toBe(true);

      // awardExperienceが基本経験値 + ボスボーナスで呼ばれたことを確認
      // 各キャラクターに対して: 基本経験値1回 + ボスボーナス1回 = 2回
      expect(mockExperienceSystem.awardExperience).toHaveBeenCalledTimes(4);

      // ボスボーナス経験値の呼び出しを確認
      expect(mockExperienceSystem.awardExperience).toHaveBeenCalledWith(
        expect.any(String),
        'DEFEAT',
        expect.objectContaining({
          amount: 200,
          metadata: expect.objectContaining({
            bossId: 'boss-001',
            bossName: 'テストボス',
            isBoss: true,
          }),
        })
      );
    });

    test('複数のボス撃破ボーナスが累積される', async () => {
      // 要件6.2: ボス撃破時の経験値ボーナス計算と付与を統合
      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [
          {
            bossId: 'boss-001',
            bossName: 'テストボス1',
            roseEssenceAmount: 50,
            roseEssenceType: RoseEssenceType.CRIMSON,
            experienceBonus: 150,
          },
          {
            bossId: 'boss-002',
            bossName: 'テストボス2',
            roseEssenceAmount: 75,
            roseEssenceType: RoseEssenceType.SHADOW,
            experienceBonus: 200,
          },
        ],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.0,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      const result = await rewardDistributor.distributeExperienceRewards(
        rewards,
        mockPlayerUnits
      );

      expect(result.success).toBe(true);

      // awardExperienceが基本経験値 + ボス1 + ボス2で呼ばれたことを確認
      // 各キャラクターに対して: 基本経験値1回 + ボス1ボーナス1回 + ボス2ボーナス1回 = 3回
      expect(mockExperienceSystem.awardExperience).toHaveBeenCalledTimes(6);
    });
  });

  describe('クリア評価による経験値倍率適用', () => {
    test('クリア評価Sで経験値倍率が適用される', async () => {
      // 要件6.2: クリア評価による経験値倍率適用を統合
      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.S,
          experienceMultiplier: 2.0, // 2倍
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      const result = await rewardDistributor.distributeExperienceRewards(
        rewards,
        mockPlayerUnits
      );

      expect(result.success).toBe(true);

      // awardExperienceが基本経験値 + 評価ボーナスで呼ばれたことを確認
      // 各キャラクターに対して: 基本経験値1回 + 評価ボーナス1回 = 2回
      expect(mockExperienceSystem.awardExperience).toHaveBeenCalledTimes(4);

      // 評価ボーナス経験値の呼び出しを確認
      expect(mockExperienceSystem.awardExperience).toHaveBeenCalledWith(
        expect.any(String),
        'SUPPORT',
        expect.objectContaining({
          amount: 100, // 基本経験値 * (2.0 - 1.0) = 100
          metadata: expect.objectContaining({
            rating: ClearRating.S,
            isRatingBonus: true,
          }),
        })
      );
    });

    test('クリア評価Aで経験値倍率が適用される', async () => {
      // 要件6.2: クリア評価による経験値倍率適用を統合
      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.5, // 1.5倍
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      const result = await rewardDistributor.distributeExperienceRewards(
        rewards,
        mockPlayerUnits
      );

      expect(result.success).toBe(true);

      // 評価ボーナス経験値の呼び出しを確認
      expect(mockExperienceSystem.awardExperience).toHaveBeenCalledWith(
        expect.any(String),
        'SUPPORT',
        expect.objectContaining({
          amount: 50, // 基本経験値 * (1.5 - 1.0) = 50
          metadata: expect.objectContaining({
            rating: ClearRating.A,
            isRatingBonus: true,
          }),
        })
      );
    });

    test('クリア評価Bで経験値倍率が適用されない', async () => {
      // 要件6.2: クリア評価による経験値倍率適用を統合
      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.B,
          experienceMultiplier: 1.0, // 倍率なし
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      const result = await rewardDistributor.distributeExperienceRewards(
        rewards,
        mockPlayerUnits
      );

      expect(result.success).toBe(true);

      // awardExperienceが基本経験値のみで呼ばれたことを確認（評価ボーナスなし）
      // 各キャラクターに対して: 基本経験値1回のみ
      expect(mockExperienceSystem.awardExperience).toHaveBeenCalledTimes(2);
    });
  });

  describe('統合シナリオテスト', () => {
    test('ボス撃破 + クリア評価S で全ての経験値が付与される', async () => {
      // 要件6.1, 6.2, 6.3: 全ての経験値報酬機能の統合
      const rewards: StageRewards = {
        baseExperience: 200,
        bossRewards: [
          {
            bossId: 'final-boss',
            bossName: 'ラスボス',
            roseEssenceAmount: 100,
            roseEssenceType: RoseEssenceType.CURSED,
            experienceBonus: 500,
          },
        ],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.S,
          experienceMultiplier: 2.0,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      const result = await rewardDistributor.distributeExperienceRewards(
        rewards,
        mockPlayerUnits
      );

      expect(result.success).toBe(true);
      expect(result.recipientIds).toHaveLength(2);

      // awardExperienceが基本経験値 + ボスボーナス + 評価ボーナスで呼ばれたことを確認
      // 各キャラクターに対して: 基本経験値1回 + ボスボーナス1回 + 評価ボーナス1回 = 3回
      expect(mockExperienceSystem.awardExperience).toHaveBeenCalledTimes(6);

      // checkAndProcessLevelUpが各経験値付与後に呼ばれたことを確認
      expect(mockExperienceSystem.checkAndProcessLevelUp).toHaveBeenCalled();
    });

    test('ExperienceSystemが未設定の場合はエラーを返す', async () => {
      // エラーハンドリングのテスト
      const newDistributor = new RewardDistributor({
        enableExperienceDistribution: true,
        debugMode: false,
      });

      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.B,
          experienceMultiplier: 1.0,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      const result = await newDistributor.distributeExperienceRewards(
        rewards,
        mockPlayerUnits
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('ExperienceSystem not set');
      expect(result.totalExperience).toBe(0);

      newDistributor.destroy();
    });

    test('プレイヤーユニットが空の場合はエラーを返す', async () => {
      // エラーハンドリングのテスト
      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.B,
          experienceMultiplier: 1.0,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      const result = await rewardDistributor.distributeExperienceRewards(
        rewards,
        []
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No player units provided');
      expect(result.totalExperience).toBe(0);
    });
  });

  describe('イベント発行テスト', () => {
    test('経験値配布完了イベントが発行される', async () => {
      // イベントリスナーを設定
      const eventSpy = vi.fn();
      rewardDistributor.on('experience_rewards_distributed', eventSpy);

      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.B,
          experienceMultiplier: 1.0,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      await rewardDistributor.distributeExperienceRewards(
        rewards,
        mockPlayerUnits
      );

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientIds: expect.arrayContaining(['player-001', 'player-002']),
          totalExperience: expect.any(Number),
          timestamp: expect.any(Number),
        })
      );
    });
  });
});
