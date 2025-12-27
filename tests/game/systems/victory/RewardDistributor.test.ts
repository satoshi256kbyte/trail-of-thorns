/**
 * RewardDistributor テストスイート
 * 
 * 報酬配布システムの包括的なテスト
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { RewardDistributor } from '../../../../game/src/systems/victory/RewardDistributor';
import { StageRewards, ClearRating, BossReward, RecruitmentReward } from '../../../../game/src/types/reward';
import { Unit } from '../../../../game/src/types/gameplay';
import { RoseEssenceType } from '../../../../game/src/types/boss';

describe('RewardDistributor', () => {
  let rewardDistributor: RewardDistributor;
  let mockExperienceSystem: any;
  let mockJobSystem: any;
  let mockRecruitmentSystem: any;
  let mockInventorySystem: any;
  let mockPlayerUnits: Unit[];
  let mockRewards: StageRewards;

  beforeEach(() => {
    // RewardDistributorインスタンスを作成
    rewardDistributor = new RewardDistributor({
      debugMode: false,
    });

    // モックシステムを作成
    mockExperienceSystem = {
      awardExperience: vi.fn().mockResolvedValue({ success: true, finalAmount: 100 }),
    };

    mockJobSystem = {
      awardRoseEssence: vi.fn().mockResolvedValue(undefined),
      getRankUpCandidates: vi.fn().mockReturnValue([]),
    };

    mockRecruitmentSystem = {
      finalizeRecruitment: vi.fn().mockResolvedValue(undefined),
    };

    mockInventorySystem = {
      addItem: vi.fn().mockResolvedValue(undefined),
    };

    // システム参照を設定
    rewardDistributor.setExperienceSystem(mockExperienceSystem);
    rewardDistributor.setJobSystem(mockJobSystem);
    rewardDistributor.setRecruitmentSystem(mockRecruitmentSystem);
    rewardDistributor.setInventorySystem(mockInventorySystem);

    // モックプレイヤーユニットを作成
    mockPlayerUnits = [
      {
        id: 'player1',
        name: 'Hero',
        faction: 'player',
        currentHP: 100,
        stats: { maxHP: 100 },
      } as Unit,
      {
        id: 'player2',
        name: 'Warrior',
        faction: 'player',
        currentHP: 80,
        stats: { maxHP: 100 },
      } as Unit,
    ];

    // モック報酬を作成
    mockRewards = {
      baseExperience: 500,
      bossRewards: [
        {
          bossId: 'boss1',
          bossName: 'Dark Lord',
          roseEssenceAmount: 100,
          roseEssenceType: RoseEssenceType.CRIMSON,
          experienceBonus: 200,
        },
      ],
      recruitmentRewards: [
        {
          characterId: 'recruit1',
          characterName: 'Mercenary',
          recruitmentBonus: 150,
        },
      ],
      clearRatingBonus: {
        rating: ClearRating.A,
        experienceMultiplier: 1.5,
        additionalRewards: [
          {
            itemId: 'gold',
            itemName: 'Gold',
            quantity: 500,
          },
        ],
      },
      itemRewards: [
        {
          itemId: 'potion',
          itemName: 'Healing Potion',
          quantity: 3,
        },
      ],
      specialRewards: [],
    };
  });

  describe('システム参照設定', () => {
    test('ExperienceSystemの参照を設定できる', () => {
      const newDistributor = new RewardDistributor();
      newDistributor.setExperienceSystem(mockExperienceSystem);

      expect(newDistributor).toBeDefined();
    });

    test('JobSystemの参照を設定できる', () => {
      const newDistributor = new RewardDistributor();
      newDistributor.setJobSystem(mockJobSystem);

      expect(newDistributor).toBeDefined();
    });

    test('RecruitmentSystemの参照を設定できる', () => {
      const newDistributor = new RewardDistributor();
      newDistributor.setRecruitmentSystem(mockRecruitmentSystem);

      expect(newDistributor).toBeDefined();
    });

    test('InventorySystemの参照を設定できる', () => {
      const newDistributor = new RewardDistributor();
      newDistributor.setInventorySystem(mockInventorySystem);

      expect(newDistributor).toBeDefined();
    });
  });

  describe('distributeRewards - 統合報酬配布', () => {
    test('全ての報酬を正常に配布できる', async () => {
      const result = await rewardDistributor.distributeRewards(mockRewards, mockPlayerUnits);

      expect(result.success).toBe(true);
      expect(result.experienceDistributed).toBe(true);
      expect(result.roseEssenceDistributed).toBe(true);
      expect(result.recruitmentProcessed).toBe(true);
      expect(result.itemsDistributed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.details.experienceRecipients).toHaveLength(2);
      expect(result.details.roseEssenceAmount).toBe(100);
      expect(result.details.recruitedCharacters).toHaveLength(1);
      expect(result.details.itemsReceived).toBeGreaterThan(0);
    });

    test('経験値配布が無効の場合はスキップされる', async () => {
      rewardDistributor.updateConfig({ enableExperienceDistribution: false });

      const result = await rewardDistributor.distributeRewards(mockRewards, mockPlayerUnits);

      expect(result.experienceDistributed).toBe(false);
      expect(mockExperienceSystem.awardExperience).not.toHaveBeenCalled();
    });

    test('薔薇の力配布が無効の場合はスキップされる', async () => {
      rewardDistributor.updateConfig({ enableRoseEssenceDistribution: false });

      const result = await rewardDistributor.distributeRewards(mockRewards, mockPlayerUnits);

      expect(result.roseEssenceDistributed).toBe(false);
      expect(mockJobSystem.awardRoseEssence).not.toHaveBeenCalled();
    });

    test('仲間化報酬処理が無効の場合はスキップされる', async () => {
      rewardDistributor.updateConfig({ enableRecruitmentRewards: false });

      const result = await rewardDistributor.distributeRewards(mockRewards, mockPlayerUnits);

      expect(result.recruitmentProcessed).toBe(false);
      expect(mockRecruitmentSystem.finalizeRecruitment).not.toHaveBeenCalled();
    });

    test('アイテム報酬配布が無効の場合はスキップされる', async () => {
      rewardDistributor.updateConfig({ enableItemRewards: false });

      const result = await rewardDistributor.distributeRewards(mockRewards, mockPlayerUnits);

      expect(result.itemsDistributed).toBe(false);
      expect(mockInventorySystem.addItem).not.toHaveBeenCalled();
    });

    test('一部の配布が失敗してもエラーを記録して続行する', async () => {
      mockExperienceSystem.awardExperience.mockRejectedValueOnce(new Error('Experience error'));

      const result = await rewardDistributor.distributeRewards(mockRewards, mockPlayerUnits);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // 他の配布は続行される
      expect(mockJobSystem.awardRoseEssence).toHaveBeenCalled();
    });
  });

  describe('distributeExperienceRewards - 経験値報酬配布', () => {
    test('基本経験値を全プレイヤーに配布できる', async () => {
      const result = await rewardDistributor.distributeExperienceRewards(
        mockRewards,
        mockPlayerUnits
      );

      expect(result.success).toBe(true);
      expect(result.recipientIds).toHaveLength(2);
      expect(result.recipientIds).toContain('player1');
      expect(result.recipientIds).toContain('player2');
      expect(result.totalExperience).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    test('ボス撃破ボーナス経験値を配布できる', async () => {
      const result = await rewardDistributor.distributeExperienceRewards(
        mockRewards,
        mockPlayerUnits
      );

      expect(result.success).toBe(true);
      // 基本経験値 + ボス撃破ボーナスが呼ばれる
      expect(mockExperienceSystem.awardExperience).toHaveBeenCalledWith(
        expect.any(String),
        'BOSS_DEFEAT',
        expect.objectContaining({
          source: 'BOSS_DEFEAT',
          amount: 200,
        })
      );
    });

    test('クリア評価ボーナスを適用できる', async () => {
      const result = await rewardDistributor.distributeExperienceRewards(
        mockRewards,
        mockPlayerUnits
      );

      expect(result.success).toBe(true);
      // クリア評価ボーナスが呼ばれる
      expect(mockExperienceSystem.awardExperience).toHaveBeenCalledWith(
        expect.any(String),
        'SUPPORT',
        expect.objectContaining({
          source: 'CLEAR_RATING_BONUS',
          rating: ClearRating.A,
        })
      );
    });

    test('ExperienceSystemが設定されていない場合はエラーを返す', async () => {
      const newDistributor = new RewardDistributor();

      const result = await newDistributor.distributeExperienceRewards(
        mockRewards,
        mockPlayerUnits
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('ExperienceSystem not set');
    });

    test('プレイヤーユニットが空の場合はエラーを返す', async () => {
      const result = await rewardDistributor.distributeExperienceRewards(
        mockRewards,
        []
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No player units provided');
    });

    test('一部のユニットへの経験値付与が失敗してもエラーを記録して続行する', async () => {
      mockExperienceSystem.awardExperience
        .mockResolvedValueOnce({ success: true, finalAmount: 100 })
        .mockRejectedValueOnce(new Error('Award failed'));

      const result = await rewardDistributor.distributeExperienceRewards(
        mockRewards,
        mockPlayerUnits
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.recipientIds.length).toBeGreaterThan(0);
    });
  });

  describe('distributeRoseEssence - 薔薇の力配布', () => {
    test('ボス撃破報酬の薔薇の力を配布できる', async () => {
      const result = await rewardDistributor.distributeRoseEssence(mockRewards);

      expect(result.success).toBe(true);
      expect(result.totalAmount).toBe(100);
      expect(result.bossRewards).toHaveLength(1);
      expect(result.errors).toHaveLength(0);

      expect(mockJobSystem.awardRoseEssence).toHaveBeenCalledWith(
        100,
        'boss_defeat:boss1',
        undefined
      );
    });

    test('複数のボス撃破報酬を配布できる', async () => {
      const multiRewards: StageRewards = {
        ...mockRewards,
        bossRewards: [
          {
            bossId: 'boss1',
            bossName: 'Boss 1',
            roseEssenceAmount: 50,
            roseEssenceType: RoseEssenceType.CRIMSON,
            experienceBonus: 100,
          },
          {
            bossId: 'boss2',
            bossName: 'Boss 2',
            roseEssenceAmount: 75,
            roseEssenceType: RoseEssenceType.SHADOW,
            experienceBonus: 150,
          },
        ],
      };

      const result = await rewardDistributor.distributeRoseEssence(multiRewards);

      expect(result.success).toBe(true);
      expect(result.totalAmount).toBe(125);
      expect(mockJobSystem.awardRoseEssence).toHaveBeenCalledTimes(2);
    });

    test('ランクアップ可能キャラクターがいる場合はイベントを発行する', async () => {
      mockJobSystem.getRankUpCandidates.mockReturnValue(['char1', 'char2']);

      const eventSpy = vi.fn();
      rewardDistributor.on('rank_up_candidates_available', eventSpy);

      await rewardDistributor.distributeRoseEssence(mockRewards);

      expect(eventSpy).toHaveBeenCalledWith({
        candidates: ['char1', 'char2'],
        totalRoseEssence: 100,
      });
    });

    test('JobSystemが設定されていない場合はエラーを返す', async () => {
      const newDistributor = new RewardDistributor();

      const result = await newDistributor.distributeRoseEssence(mockRewards);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('JobSystem not set');
    });

    test('ボス撃破報酬がない場合は成功として扱う', async () => {
      const noRewards: StageRewards = {
        ...mockRewards,
        bossRewards: [],
      };

      const result = await rewardDistributor.distributeRoseEssence(noRewards);

      expect(result.success).toBe(true);
      expect(result.totalAmount).toBe(0);
      expect(mockJobSystem.awardRoseEssence).not.toHaveBeenCalled();
    });

    test('一部のボス報酬配布が失敗してもエラーを記録して続行する', async () => {
      const multiRewards: StageRewards = {
        ...mockRewards,
        bossRewards: [
          {
            bossId: 'boss1',
            bossName: 'Boss 1',
            roseEssenceAmount: 50,
            roseEssenceType: RoseEssenceType.CRIMSON,
            experienceBonus: 100,
          },
          {
            bossId: 'boss2',
            bossName: 'Boss 2',
            roseEssenceAmount: 75,
            roseEssenceType: RoseEssenceType.SHADOW,
            experienceBonus: 150,
          },
        ],
      };

      mockJobSystem.awardRoseEssence
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Award failed'));

      const result = await rewardDistributor.distributeRoseEssence(multiRewards);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.totalAmount).toBe(50); // 最初のボスの分のみ
    });
  });

  describe('processRecruitmentRewards - 仲間化報酬処理', () => {
    test('仲間化報酬を正常に処理できる', async () => {
      const result = await rewardDistributor.processRecruitmentRewards(mockRewards);

      expect(result.success).toBe(true);
      expect(result.processedCharacters).toHaveLength(1);
      expect(result.processedCharacters).toContain('recruit1');
      expect(result.errors).toHaveLength(0);

      expect(mockRecruitmentSystem.finalizeRecruitment).toHaveBeenCalledWith('recruit1');
    });

    test('複数の仲間化報酬を処理できる', async () => {
      const multiRewards: StageRewards = {
        ...mockRewards,
        recruitmentRewards: [
          {
            characterId: 'recruit1',
            characterName: 'Mercenary 1',
            recruitmentBonus: 100,
          },
          {
            characterId: 'recruit2',
            characterName: 'Mercenary 2',
            recruitmentBonus: 150,
          },
        ],
      };

      const result = await rewardDistributor.processRecruitmentRewards(multiRewards);

      expect(result.success).toBe(true);
      expect(result.processedCharacters).toHaveLength(2);
      expect(mockRecruitmentSystem.finalizeRecruitment).toHaveBeenCalledTimes(2);
    });

    test('RecruitmentSystemが設定されていない場合はエラーを返す', async () => {
      const newDistributor = new RewardDistributor();

      const result = await newDistributor.processRecruitmentRewards(mockRewards);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('RecruitmentSystem not set');
    });

    test('仲間化報酬がない場合は成功として扱う', async () => {
      const noRewards: StageRewards = {
        ...mockRewards,
        recruitmentRewards: [],
      };

      const result = await rewardDistributor.processRecruitmentRewards(noRewards);

      expect(result.success).toBe(true);
      expect(result.processedCharacters).toHaveLength(0);
      expect(mockRecruitmentSystem.finalizeRecruitment).not.toHaveBeenCalled();
    });

    test('一部の仲間化処理が失敗してもエラーを記録して続行する', async () => {
      const multiRewards: StageRewards = {
        ...mockRewards,
        recruitmentRewards: [
          {
            characterId: 'recruit1',
            characterName: 'Mercenary 1',
            recruitmentBonus: 100,
          },
          {
            characterId: 'recruit2',
            characterName: 'Mercenary 2',
            recruitmentBonus: 150,
          },
        ],
      };

      mockRecruitmentSystem.finalizeRecruitment
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Finalize failed'));

      const result = await rewardDistributor.processRecruitmentRewards(multiRewards);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.processedCharacters).toHaveLength(1);
    });
  });

  describe('distributeItemRewards - アイテム報酬配布', () => {
    test('基本アイテム報酬を配布できる', async () => {
      const result = await rewardDistributor.distributeItemRewards(mockRewards);

      expect(result.success).toBe(true);
      expect(result.itemsDistributed).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);

      expect(mockInventorySystem.addItem).toHaveBeenCalledWith('potion', 3);
    });

    test('クリア評価による追加報酬を配布できる', async () => {
      const result = await rewardDistributor.distributeItemRewards(mockRewards);

      expect(result.success).toBe(true);
      expect(mockInventorySystem.addItem).toHaveBeenCalledWith('gold', 500);
    });

    test('InventorySystemが設定されていない場合は成功として扱う', async () => {
      const newDistributor = new RewardDistributor();

      const result = await newDistributor.distributeItemRewards(mockRewards);

      expect(result.success).toBe(true);
      expect(result.itemsDistributed).toBe(0);
    });

    test('アイテム報酬がない場合は成功として扱う', async () => {
      const noRewards: StageRewards = {
        ...mockRewards,
        itemRewards: [],
        clearRatingBonus: {
          ...mockRewards.clearRatingBonus,
          additionalRewards: [],
        },
      };

      const result = await rewardDistributor.distributeItemRewards(noRewards);

      expect(result.success).toBe(true);
      expect(result.itemsDistributed).toBe(0);
    });

    test('一部のアイテム配布が失敗してもエラーを記録して続行する', async () => {
      mockInventorySystem.addItem
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Add item failed'));

      const result = await rewardDistributor.distributeItemRewards(mockRewards);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.itemsDistributed).toBeGreaterThan(0);
    });
  });

  describe('設定管理', () => {
    test('設定を更新できる', () => {
      rewardDistributor.updateConfig({
        enableExperienceDistribution: false,
        debugMode: true,
      });

      const config = rewardDistributor.getConfig();

      expect(config.enableExperienceDistribution).toBe(false);
      expect(config.debugMode).toBe(true);
    });

    test('設定更新時にイベントを発行する', () => {
      const eventSpy = vi.fn();
      rewardDistributor.on('config_updated', eventSpy);

      rewardDistributor.updateConfig({ debugMode: true });

      expect(eventSpy).toHaveBeenCalled();
    });

    test('現在の設定を取得できる', () => {
      const config = rewardDistributor.getConfig();

      expect(config).toBeDefined();
      expect(config.enableExperienceDistribution).toBeDefined();
      expect(config.enableRoseEssenceDistribution).toBeDefined();
      expect(config.enableRecruitmentRewards).toBeDefined();
      expect(config.enableItemRewards).toBeDefined();
    });
  });

  describe('リソース管理', () => {
    test('システムをリセットできる', () => {
      const eventSpy = vi.fn();
      rewardDistributor.on('test_event', eventSpy);

      rewardDistributor.reset();

      rewardDistributor.emit('test_event');
      expect(eventSpy).not.toHaveBeenCalled();
    });

    test('システムを破棄できる', () => {
      rewardDistributor.destroy();

      // 破棄後は参照がクリアされる
      expect(rewardDistributor).toBeDefined();
    });
  });

  describe('エラーハンドリング', () => {
    test('予期しないエラーが発生しても適切に処理する', async () => {
      mockExperienceSystem.awardExperience.mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await rewardDistributor.distributeRewards(mockRewards, mockPlayerUnits);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('nullやundefinedの報酬データを適切に処理する', async () => {
      const invalidRewards = {
        ...mockRewards,
        bossRewards: null as any,
        recruitmentRewards: undefined as any,
      };

      const result = await rewardDistributor.distributeRewards(
        invalidRewards,
        mockPlayerUnits
      );

      // エラーが発生しても処理は続行される
      expect(result).toBeDefined();
    });
  });

  describe('統合テスト', () => {
    test('完全なステージクリアフローで全報酬を配布できる', async () => {
      const result = await rewardDistributor.distributeRewards(mockRewards, mockPlayerUnits);

      // 全ての配布が成功
      expect(result.success).toBe(true);
      expect(result.experienceDistributed).toBe(true);
      expect(result.roseEssenceDistributed).toBe(true);
      expect(result.recruitmentProcessed).toBe(true);
      expect(result.itemsDistributed).toBe(true);

      // 各システムが適切に呼ばれた
      expect(mockExperienceSystem.awardExperience).toHaveBeenCalled();
      expect(mockJobSystem.awardRoseEssence).toHaveBeenCalled();
      expect(mockRecruitmentSystem.finalizeRecruitment).toHaveBeenCalled();
      expect(mockInventorySystem.addItem).toHaveBeenCalled();

      // 詳細情報が正しい
      expect(result.details.experienceRecipients.length).toBeGreaterThan(0);
      expect(result.details.roseEssenceAmount).toBeGreaterThan(0);
      expect(result.details.recruitedCharacters.length).toBeGreaterThan(0);
      expect(result.details.itemsReceived).toBeGreaterThan(0);
    });

    test('一部のシステムが利用不可でも他の報酬は配布される', async () => {
      // InventorySystemを未設定にする
      const newDistributor = new RewardDistributor();
      newDistributor.setExperienceSystem(mockExperienceSystem);
      newDistributor.setJobSystem(mockJobSystem);
      newDistributor.setRecruitmentSystem(mockRecruitmentSystem);
      // InventorySystemは設定しない

      const result = await newDistributor.distributeRewards(mockRewards, mockPlayerUnits);

      // アイテム以外は配布される
      expect(result.experienceDistributed).toBe(true);
      expect(result.roseEssenceDistributed).toBe(true);
      expect(result.recruitmentProcessed).toBe(true);
      expect(result.itemsDistributed).toBe(true); // InventorySystem未設定でも成功扱い
    });
  });
});
