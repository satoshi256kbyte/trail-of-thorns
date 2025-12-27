/**
 * JobSystemとVictoryConditionSystemの統合テスト
 * 
 * ボス撃破時の薔薇の力付与、ランクアップ可能通知、
 * 報酬画面でのランクアップ案内表示をテストします。
 * 
 * 要件4.4, 4.9, 7.1, 7.2, 7.3, 7.4
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { RewardDistributor } from '../../game/src/systems/victory/RewardDistributor';
import { JobSystem } from '../../game/src/systems/jobs/JobSystem';
import { StageRewards, BossReward, ClearRating } from '../../game/src/types/reward';
import { RoseEssenceType } from '../../game/src/types/boss';

// RewardUIのモック
class MockRewardUI {
  public showRankUpAvailableNotificationCalled = false;
  public lastCandidates: any[] = [];

  showRankUpAvailableNotification(candidates: any[]): void {
    this.showRankUpAvailableNotificationCalled = true;
    this.lastCandidates = candidates;
  }

  reset(): void {
    this.showRankUpAvailableNotificationCalled = false;
    this.lastCandidates = [];
  }
}

describe('JobSystem - VictoryConditionSystem Integration', () => {
  let rewardDistributor: RewardDistributor;
  let jobSystem: JobSystem;
  let mockRewardUI: MockRewardUI;

  beforeEach(() => {
    // RewardDistributorを初期化
    rewardDistributor = new RewardDistributor({
      enableRoseEssenceDistribution: true,
      debugMode: true,
    });

    // JobSystemを初期化
    jobSystem = new JobSystem({
      enableAnimations: false,
      debugMode: true,
    });

    // MockRewardUIを初期化
    mockRewardUI = new MockRewardUI();

    // JobSystemとRewardUIをRewardDistributorに設定
    rewardDistributor.setJobSystem(jobSystem);
    rewardDistributor.setRewardUI(mockRewardUI);
  });

  afterEach(() => {
    rewardDistributor.destroy();
    jobSystem.destroy();
  });

  describe('薔薇の力付与統合', () => {
    test('ボス撃破時に薔薇の力が正しく付与される', async () => {
      // 要件7.1, 7.2: ボス撃破時の薔薇の力付与

      // JobSystemを初期化
      await jobSystem.initialize();

      // 初期の薔薇の力を確認
      const initialRoseEssence = jobSystem.getCurrentRoseEssence();
      expect(initialRoseEssence).toBe(0);

      // ボス撃破報酬を作成
      const bossReward: BossReward = {
        bossId: 'boss_001',
        bossName: 'テストボス',
        roseEssenceAmount: 100,
        roseEssenceType: RoseEssenceType.CRIMSON,
        experienceBonus: 500,
      };

      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [bossReward],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.2,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      // 薔薇の力を配布
      const result = await rewardDistributor.distributeRoseEssence(rewards);

      // 結果を検証
      expect(result.success).toBe(true);
      expect(result.totalAmount).toBe(100);
      expect(result.errors).toHaveLength(0);

      // JobSystemの薔薇の力が増加していることを確認
      const finalRoseEssence = jobSystem.getCurrentRoseEssence();
      expect(finalRoseEssence).toBe(100);
    });

    test('複数のボス撃破報酬が正しく合計される', async () => {
      // 要件7.1: 薔薇の力の量を計算する

      await jobSystem.initialize();

      // 複数のボス撃破報酬を作成
      const bossRewards: BossReward[] = [
        {
          bossId: 'boss_001',
          bossName: 'ボス1',
          roseEssenceAmount: 50,
          roseEssenceType: RoseEssenceType.CRIMSON,
          experienceBonus: 300,
        },
        {
          bossId: 'boss_002',
          bossName: 'ボス2',
          roseEssenceAmount: 75,
          roseEssenceType: RoseEssenceType.SHADOW,
          experienceBonus: 400,
        },
        {
          bossId: 'boss_003',
          bossName: 'ボス3',
          roseEssenceAmount: 100,
          roseEssenceType: RoseEssenceType.THORN,
          experienceBonus: 500,
        },
      ];

      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards,
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.S,
          experienceMultiplier: 1.5,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      // 薔薇の力を配布
      const result = await rewardDistributor.distributeRoseEssence(rewards);

      // 結果を検証
      expect(result.success).toBe(true);
      expect(result.totalAmount).toBe(225); // 50 + 75 + 100
      expect(result.errors).toHaveLength(0);

      // JobSystemの薔薇の力が正しく合計されていることを確認
      const finalRoseEssence = jobSystem.getCurrentRoseEssence();
      expect(finalRoseEssence).toBe(225);
    });

    test('薔薇の力の種類が正しく記録される', async () => {
      // 要件7.3: 薔薇の力の種類と量の計算を統合

      await jobSystem.initialize();

      // 異なる種類の薔薇の力を持つボス報酬
      const bossReward: BossReward = {
        bossId: 'boss_shadow',
        bossName: '影のボス',
        roseEssenceAmount: 150,
        roseEssenceType: RoseEssenceType.SHADOW,
        experienceBonus: 600,
      };

      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [bossReward],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.2,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      // 薔薇の力を配布
      const result = await rewardDistributor.distributeRoseEssence(rewards);

      expect(result.success).toBe(true);
      expect(result.totalAmount).toBe(150);

      // 薔薇の力の履歴を確認
      const history = jobSystem.getRoseEssenceHistory();
      expect(history.length).toBeGreaterThan(0);

      // 最新の履歴エントリを確認
      const latestEntry = history[history.length - 1];
      expect(latestEntry.amount).toBe(150);

      // ソース情報に薔薇の力の種類が含まれていることを確認
      const sourceInfo = JSON.parse(latestEntry.source);
      expect(sourceInfo.essenceType).toBe(RoseEssenceType.SHADOW);
      expect(sourceInfo.bossId).toBe('boss_shadow');
      expect(sourceInfo.bossName).toBe('影のボス');
    });
  });

  describe('ランクアップ可能通知統合', () => {
    test('ランクアップ可能キャラクターが通知される', async () => {
      // 要件7.3: ランクアップ可能なキャラクターを通知する

      await jobSystem.initialize();

      // モックのランクアップ候補を返すようにJobSystemをスパイ
      const mockCandidates = [
        {
          characterId: 'char_001',
          currentJobId: 'warrior',
          currentJobName: '戦士',
          currentRank: 1,
          nextRank: 2,
          requiredRoseEssence: 50,
          canRankUp: true,
        },
        {
          characterId: 'char_002',
          currentJobId: 'mage',
          currentJobName: '魔法使い',
          currentRank: 2,
          nextRank: 3,
          requiredRoseEssence: 100,
          canRankUp: true,
        },
      ];

      vi.spyOn(jobSystem, 'getRankUpCandidates').mockReturnValue(mockCandidates);

      // イベントリスナーを設定
      let notificationReceived = false;
      let notifiedCandidates: any[] = [];

      rewardDistributor.on('rank_up_candidates_available', (data) => {
        notificationReceived = true;
        notifiedCandidates = data.candidates;
      });

      // ボス撃破報酬を作成
      const bossReward: BossReward = {
        bossId: 'boss_001',
        bossName: 'テストボス',
        roseEssenceAmount: 100,
        roseEssenceType: RoseEssenceType.CRIMSON,
        experienceBonus: 500,
      };

      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [bossReward],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.2,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      // 薔薇の力を配布
      await rewardDistributor.distributeRoseEssence(rewards);

      // 通知が発行されたことを確認
      expect(notificationReceived).toBe(true);
      expect(notifiedCandidates).toHaveLength(2);
      expect(notifiedCandidates[0].characterId).toBe('char_001');
      expect(notifiedCandidates[1].characterId).toBe('char_002');
    });

    test('ランクアップ可能キャラクターがいない場合は通知されない', async () => {
      // 要件7.3: ランクアップ可能なキャラクターを通知する

      await jobSystem.initialize();

      // 空の候補リストを返すようにJobSystemをスパイ
      vi.spyOn(jobSystem, 'getRankUpCandidates').mockReturnValue([]);

      // イベントリスナーを設定
      let notificationReceived = false;

      rewardDistributor.on('rank_up_candidates_available', () => {
        notificationReceived = true;
      });

      // ボス撃破報酬を作成
      const bossReward: BossReward = {
        bossId: 'boss_001',
        bossName: 'テストボス',
        roseEssenceAmount: 10, // 少量
        roseEssenceType: RoseEssenceType.CRIMSON,
        experienceBonus: 100,
      };

      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [bossReward],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.B,
          experienceMultiplier: 1.0,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      // 薔薇の力を配布
      await rewardDistributor.distributeRoseEssence(rewards);

      // 通知が発行されないことを確認
      expect(notificationReceived).toBe(false);
    });

    test('通知イベントに薔薇の力の総量とボス報酬情報が含まれる', async () => {
      // 要件7.3: ランクアップ可能なキャラクターを通知する

      await jobSystem.initialize();

      const mockCandidates = [
        {
          characterId: 'char_001',
          currentJobId: 'warrior',
          currentJobName: '戦士',
          currentRank: 1,
          nextRank: 2,
          requiredRoseEssence: 50,
          canRankUp: true,
        },
      ];

      vi.spyOn(jobSystem, 'getRankUpCandidates').mockReturnValue(mockCandidates);

      // イベントリスナーを設定
      let eventData: any = null;

      rewardDistributor.on('rank_up_candidates_available', (data) => {
        eventData = data;
      });

      // ボス撃破報酬を作成
      const bossRewards: BossReward[] = [
        {
          bossId: 'boss_001',
          bossName: 'ボス1',
          roseEssenceAmount: 50,
          roseEssenceType: RoseEssenceType.CRIMSON,
          experienceBonus: 300,
        },
        {
          bossId: 'boss_002',
          bossName: 'ボス2',
          roseEssenceAmount: 75,
          roseEssenceType: RoseEssenceType.SHADOW,
          experienceBonus: 400,
        },
      ];

      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards,
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.2,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      // 薔薇の力を配布
      await rewardDistributor.distributeRoseEssence(rewards);

      // イベントデータを検証
      expect(eventData).not.toBeNull();
      expect(eventData.candidates).toHaveLength(1);
      expect(eventData.totalRoseEssence).toBe(125); // 50 + 75
      expect(eventData.bossRewards).toHaveLength(2);
      expect(eventData.bossRewards[0].bossId).toBe('boss_001');
      expect(eventData.bossRewards[1].bossId).toBe('boss_002');
    });
  });

  describe('RewardUI統合', () => {
    test('ランクアップ可能通知がRewardUIに表示される', async () => {
      // 要件7.4: 報酬画面でのランクアップ案内表示を実装

      await jobSystem.initialize();

      const mockCandidates = [
        {
          characterId: 'char_001',
          currentJobId: 'warrior',
          currentJobName: '戦士',
          currentRank: 1,
          nextRank: 2,
          requiredRoseEssence: 50,
          canRankUp: true,
        },
        {
          characterId: 'char_002',
          currentJobId: 'mage',
          currentJobName: '魔法使い',
          currentRank: 2,
          nextRank: 3,
          requiredRoseEssence: 100,
          canRankUp: true,
        },
      ];

      vi.spyOn(jobSystem, 'getRankUpCandidates').mockReturnValue(mockCandidates);

      // ボス撃破報酬を作成
      const bossReward: BossReward = {
        bossId: 'boss_001',
        bossName: 'テストボス',
        roseEssenceAmount: 100,
        roseEssenceType: RoseEssenceType.CRIMSON,
        experienceBonus: 500,
      };

      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [bossReward],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.2,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      // 薔薇の力を配布
      await rewardDistributor.distributeRoseEssence(rewards);

      // RewardUIのメソッドが呼ばれたことを確認
      expect(mockRewardUI.showRankUpAvailableNotificationCalled).toBe(true);
      expect(mockRewardUI.lastCandidates).toHaveLength(2);
      expect(mockRewardUI.lastCandidates[0].characterId).toBe('char_001');
      expect(mockRewardUI.lastCandidates[1].characterId).toBe('char_002');
    });

    test('ランクアップ可能キャラクターがいない場合はRewardUIに通知されない', async () => {
      // 要件7.4: 報酬画面でのランクアップ案内表示を実装

      await jobSystem.initialize();

      // 空の候補リストを返すようにJobSystemをスパイ
      vi.spyOn(jobSystem, 'getRankUpCandidates').mockReturnValue([]);

      // ボス撃破報酬を作成
      const bossReward: BossReward = {
        bossId: 'boss_001',
        bossName: 'テストボス',
        roseEssenceAmount: 10, // 少量
        roseEssenceType: RoseEssenceType.CRIMSON,
        experienceBonus: 100,
      };

      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [bossReward],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.B,
          experienceMultiplier: 1.0,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      // 薔薇の力を配布
      await rewardDistributor.distributeRoseEssence(rewards);

      // RewardUIのメソッドが呼ばれていないことを確認
      expect(mockRewardUI.showRankUpAvailableNotificationCalled).toBe(false);
      expect(mockRewardUI.lastCandidates).toHaveLength(0);
    });

    test('RewardUIが設定されていない場合でもエラーにならない', async () => {
      // RewardUIを設定しないRewardDistributorを作成
      const distributorWithoutUI = new RewardDistributor({
        enableRoseEssenceDistribution: true,
        debugMode: true,
      });

      const testJobSystem = new JobSystem({
        enableAnimations: false,
        debugMode: true,
      });

      await testJobSystem.initialize();

      distributorWithoutUI.setJobSystem(testJobSystem);
      // RewardUIは設定しない

      const mockCandidates = [
        {
          characterId: 'char_001',
          currentJobId: 'warrior',
          currentJobName: '戦士',
          currentRank: 1,
          nextRank: 2,
          requiredRoseEssence: 50,
          canRankUp: true,
        },
      ];

      vi.spyOn(testJobSystem, 'getRankUpCandidates').mockReturnValue(mockCandidates);

      const bossReward: BossReward = {
        bossId: 'boss_001',
        bossName: 'テストボス',
        roseEssenceAmount: 100,
        roseEssenceType: RoseEssenceType.CRIMSON,
        experienceBonus: 500,
      };

      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [bossReward],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.2,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      // エラーが発生しないことを確認
      await expect(distributorWithoutUI.distributeRoseEssence(rewards)).resolves.toBeDefined();

      distributorWithoutUI.destroy();
      testJobSystem.destroy();
    });
  });

  describe('エラーハンドリング', () => {
    test('JobSystemが設定されていない場合はエラーを返す', async () => {
      // JobSystemを設定しないRewardDistributorを作成
      const distributorWithoutJobSystem = new RewardDistributor();

      const bossReward: BossReward = {
        bossId: 'boss_001',
        bossName: 'テストボス',
        roseEssenceAmount: 100,
        roseEssenceType: RoseEssenceType.CRIMSON,
        experienceBonus: 500,
      };

      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [bossReward],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.2,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      // 薔薇の力を配布
      const result = await distributorWithoutJobSystem.distributeRoseEssence(rewards);

      // エラーが返されることを確認
      expect(result.success).toBe(false);
      expect(result.errors).toContain('JobSystem not set');
      expect(result.totalAmount).toBe(0);

      distributorWithoutJobSystem.destroy();
    });

    test('ボス報酬がない場合は成功として扱う', async () => {
      await jobSystem.initialize();

      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [], // ボス報酬なし
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.B,
          experienceMultiplier: 1.0,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      // 薔薇の力を配布
      const result = await rewardDistributor.distributeRoseEssence(rewards);

      // 成功として扱われることを確認
      expect(result.success).toBe(true);
      expect(result.totalAmount).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.bossRewards).toHaveLength(0);
    });

    test('JobSystemでエラーが発生した場合でも処理を継続する', async () => {
      await jobSystem.initialize();

      // awardRoseEssenceがエラーをスローするようにモック
      vi.spyOn(jobSystem, 'awardRoseEssence').mockRejectedValueOnce(
        new Error('Test error')
      );

      const bossRewards: BossReward[] = [
        {
          bossId: 'boss_001',
          bossName: 'ボス1',
          roseEssenceAmount: 50,
          roseEssenceType: RoseEssenceType.CRIMSON,
          experienceBonus: 300,
        },
        {
          bossId: 'boss_002',
          bossName: 'ボス2',
          roseEssenceAmount: 75,
          roseEssenceType: RoseEssenceType.SHADOW,
          experienceBonus: 400,
        },
      ];

      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards,
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.2,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      // 薔薇の力を配布
      const result = await rewardDistributor.distributeRoseEssence(rewards);

      // 1つ目はエラー、2つ目は成功
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to award rose essence for boss boss_001');
      expect(result.totalAmount).toBe(75); // 2つ目のボスの分のみ
    });
  });
});
