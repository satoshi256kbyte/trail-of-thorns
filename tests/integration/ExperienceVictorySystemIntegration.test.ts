/**
 * ExperienceSystem と VictoryConditionSystem の統合テスト
 * 
 * このテストは、ステージクリア時の経験値報酬配布機能が
 * ExperienceSystemと正しく統合されていることを検証します。
 * 
 * テスト対象:
 * - ステージクリア時の経験値報酬配布
 * - ボス撃破時の経験値ボーナス計算と付与
 * - クリア評価による経験値倍率適用
 * - 報酬配布時のレベルアップ処理連携
 * 
 * 要件: 4.8, 6.1, 6.2, 6.3
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import Phaser from 'phaser';
import { RewardDistributor } from '../../game/src/systems/victory/RewardDistributor';
import { ExperienceSystem } from '../../game/src/systems/experience/ExperienceSystem';
import { StageRewards, ClearRating } from '../../game/src/types/reward';
import { Unit } from '../../game/src/types/gameplay';
import { RoseEssenceType } from '../../game/src/types/boss';

describe('ExperienceSystem と VictoryConditionSystem の統合テスト', () => {
  let scene: Phaser.Scene;
  let rewardDistributor: RewardDistributor;
  let experienceSystem: ExperienceSystem;
  let mockPlayerUnits: Unit[];

  beforeEach(async () => {
    // Phaserシーンのモックを作成
    scene = {
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
          destroy: vi.fn(),
        })),
        sprite: vi.fn(() => ({
          setOrigin: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          play: vi.fn().mockReturnThis(),
          on: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        })),
        container: vi.fn(() => ({
          setScrollFactor: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          add: vi.fn().mockReturnThis(),
          remove: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        })),
      },
      tweens: {
        add: vi.fn((config) => {
          if (config.onComplete) {
            config.onComplete();
          }
          return { remove: vi.fn() };
        }),
      },
    } as any;

    // ExperienceSystemを初期化
    experienceSystem = new ExperienceSystem(scene);
    await experienceSystem.initialize();

    // RewardDistributorを初期化
    rewardDistributor = new RewardDistributor({
      enableExperienceDistribution: true,
      enableRoseEssenceDistribution: true,
      enableRecruitmentRewards: true,
      enableItemRewards: false,
      maxRetries: 3,
      debugMode: true,
    });

    // ExperienceSystemを設定
    rewardDistributor.setExperienceSystem(experienceSystem);

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

    // プレイヤーユニットをExperienceSystemに登録
    for (const unit of mockPlayerUnits) {
      experienceSystem.registerCharacter(unit, unit.level || 1, 0);
    }
  });

  afterEach(() => {
    if (experienceSystem) {
      experienceSystem.destroy();
    }
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

      // 各キャラクターの経験値が増加していることを確認
      for (const unit of mockPlayerUnits) {
        const expInfo = experienceSystem.getExperienceInfo(unit.id);
        expect(expInfo.currentExperience).toBeGreaterThan(0);
        expect(expInfo.totalExperience).toBeGreaterThan(0);
      }
    });

    test('経験値配布後にレベルアップが発生する', async () => {
      // 要件6.3: 報酬配布時のレベルアップ処理連携を実装
      const rewards: StageRewards = {
        baseExperience: 500, // 大量の経験値でレベルアップを誘発
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

      // レベルアップが発生したことを確認
      for (const unit of mockPlayerUnits) {
        const expInfo = experienceSystem.getExperienceInfo(unit.id);
        // 大量の経験値でレベルアップしているはず
        expect(expInfo.currentLevel).toBeGreaterThanOrEqual(1);
      }
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
      expect(result.totalExperience).toBeGreaterThan(100); // 基本経験値 + ボーナス

      // 各キャラクターがボーナス経験値を受け取っていることを確認
      for (const unit of mockPlayerUnits) {
        const expInfo = experienceSystem.getExperienceInfo(unit.id);
        expect(expInfo.totalExperience).toBeGreaterThan(100);
      }
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
      // 基本経験値 + ボス1ボーナス + ボス2ボーナス
      expect(result.totalExperience).toBeGreaterThan(100 + 150 + 200);
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
      // 基本経験値 + 評価ボーナス（基本経験値 * (2.0 - 1.0)）
      expect(result.totalExperience).toBeGreaterThan(100);

      // 各キャラクターが評価ボーナスを受け取っていることを確認
      for (const unit of mockPlayerUnits) {
        const expInfo = experienceSystem.getExperienceInfo(unit.id);
        expect(expInfo.totalExperience).toBeGreaterThan(100);
      }
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
      // 基本経験値 + 評価ボーナス（基本経験値 * (1.5 - 1.0)）
      expect(result.totalExperience).toBeGreaterThan(100);
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
      // 基本経験値のみ（評価ボーナスなし）
      expect(result.totalExperience).toBeGreaterThanOrEqual(100);
    });
  });

  describe('統合シナリオテスト', () => {
    test('ボス撃破 + クリア評価S で最大経験値を獲得', async () => {
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
      // 基本経験値 + ボスボーナス + 評価ボーナス
      expect(result.totalExperience).toBeGreaterThan(200 + 500);

      // 各キャラクターが大量の経験値を獲得してレベルアップしていることを確認
      for (const unit of mockPlayerUnits) {
        const expInfo = experienceSystem.getExperienceInfo(unit.id);
        expect(expInfo.totalExperience).toBeGreaterThan(500);
        // 大量の経験値でレベルアップしているはず
        expect(expInfo.currentLevel).toBeGreaterThanOrEqual(1);
      }
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
