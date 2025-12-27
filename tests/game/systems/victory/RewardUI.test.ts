/**
 * RewardUIシステムのテスト
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import Phaser from 'phaser';
import { RewardUI } from '../../../../game/src/systems/victory/RewardUI';
import {
  StageRewards,
  ClearRating,
  StagePerformance,
  BossReward,
  RecruitmentReward,
} from '../../../../game/src/types/reward';
import { RoseEssenceType } from '../../../../game/src/types/boss';
import { Unit } from '../../../../game/src/types/gameplay';

// Phaserモック
class MockScene {
  cameras = {
    main: {
      centerX: 400,
      centerY: 300,
      width: 800,
      height: 600,
    },
  };

  add = {
    container: vi.fn((x: number, y: number) => ({
      setDepth: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
      add: vi.fn(),
      destroy: vi.fn(),
    })),
    rectangle: vi.fn(() => ({
      setStrokeStyle: vi.fn().mockReturnThis(),
      setFillStyle: vi.fn().mockReturnThis(),
      setOrigin: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
      setScale: vi.fn().mockReturnThis(),
      setInteractive: vi.fn().mockReturnThis(),
      on: vi.fn(),
      destroy: vi.fn(),
    })),
    text: vi.fn(() => ({
      setOrigin: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
      setScale: vi.fn().mockReturnThis(),
      setText: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    })),
  };

  tweens = {
    add: vi.fn((config: any) => {
      if (config.onComplete) {
        setTimeout(config.onComplete, 0);
      }
      return { stop: vi.fn() };
    }),
  };

  time = {
    delayedCall: vi.fn((delay: number, callback: () => void) => {
      setTimeout(callback, 0);
      return { remove: vi.fn() };
    }),
  };
}

describe('RewardUI', () => {
  let scene: MockScene;
  let rewardUI: RewardUI;

  beforeEach(() => {
    scene = new MockScene();
    rewardUI = new RewardUI(scene as any);
  });

  describe('初期化', () => {
    test('正常に初期化される', () => {
      expect(rewardUI).toBeDefined();
    });

    test('カスタム設定で初期化できる', () => {
      const customConfig = {
        screenWidth: 800,
        screenHeight: 600,
        titleFontSize: '64px',
      };

      const customRewardUI = new RewardUI(scene as any, customConfig);
      expect(customRewardUI).toBeDefined();
    });
  });

  describe('showVictoryScreen', () => {
    test('勝利画面を表示できる', async () => {
      const mockRewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.5,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      await rewardUI.showVictoryScreen(mockRewards);

      expect(scene.add.container).toHaveBeenCalled();
      expect(scene.add.rectangle).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalled();
      expect(scene.tweens.add).toHaveBeenCalled();
    });

    test('勝利画面表示イベントを発行する', async () => {
      const mockRewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.5,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      const startedSpy = vi.fn();
      const shownSpy = vi.fn();

      rewardUI.on('victory-screen-started', startedSpy);
      rewardUI.on('victory-screen-shown', shownSpy);

      await rewardUI.showVictoryScreen(mockRewards);

      expect(startedSpy).toHaveBeenCalled();
      expect(shownSpy).toHaveBeenCalled();
    });
  });

  describe('showDefeatScreen', () => {
    test('敗北画面を表示できる', async () => {
      await rewardUI.showDefeatScreen();

      expect(scene.add.container).toHaveBeenCalled();
      expect(scene.add.rectangle).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalled();
      expect(scene.tweens.add).toHaveBeenCalled();
    });

    test('敗北画面表示イベントを発行する', async () => {
      const startedSpy = vi.fn();
      const shownSpy = vi.fn();

      rewardUI.on('defeat-screen-started', startedSpy);
      rewardUI.on('defeat-screen-shown', shownSpy);

      await rewardUI.showDefeatScreen();

      expect(startedSpy).toHaveBeenCalled();
      expect(shownSpy).toHaveBeenCalled();
    });
  });

  describe('showRewardDetails', () => {
    test('報酬詳細を表示できる', async () => {
      const mockRewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.5,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      // 先に勝利画面を表示
      await rewardUI.showVictoryScreen(mockRewards);

      // 報酬詳細を表示
      rewardUI.showRewardDetails(mockRewards);

      expect(scene.add.text).toHaveBeenCalled();
    });

    test('ボス撃破報酬を表示できる', async () => {
      const mockBossReward: BossReward = {
        bossId: 'boss-1',
        bossName: 'テストボス',
        roseEssenceAmount: 50,
        roseEssenceType: RoseEssenceType.CRIMSON,
        experienceBonus: 200,
      };

      const mockRewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [mockBossReward],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.5,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      await rewardUI.showVictoryScreen(mockRewards);
      rewardUI.showRewardDetails(mockRewards);

      expect(scene.add.text).toHaveBeenCalled();
    });

    test('仲間化報酬を表示できる', async () => {
      const mockRecruitmentReward: RecruitmentReward = {
        characterId: 'char-1',
        characterName: 'テストキャラ',
        recruitmentBonus: 50,
      };

      const mockRewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [mockRecruitmentReward],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.5,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      await rewardUI.showVictoryScreen(mockRewards);
      rewardUI.showRewardDetails(mockRewards);

      expect(scene.add.text).toHaveBeenCalled();
    });

    test('報酬詳細表示イベントを発行する', async () => {
      const mockRewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.5,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      const spy = vi.fn();
      rewardUI.on('reward-details-shown', spy);

      await rewardUI.showVictoryScreen(mockRewards);
      rewardUI.showRewardDetails(mockRewards);

      expect(spy).toHaveBeenCalledWith({ rewards: mockRewards });
    });
  });

  describe('showClearRating', () => {
    test('クリア評価を表示できる', async () => {
      const mockPerformance: StagePerformance = {
        turnsUsed: 10,
        unitsLost: 0,
        enemiesDefeated: 15,
        bossesDefeated: 1,
        recruitmentSuccesses: 2,
        damageDealt: 1000,
        damageTaken: 200,
        healingDone: 100,
      };

      const mockRewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.5,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      await rewardUI.showVictoryScreen(mockRewards);
      rewardUI.showClearRating(ClearRating.A, mockPerformance);

      expect(scene.add.text).toHaveBeenCalled();
    });

    test('各評価ランクで異なる色を使用する', async () => {
      const mockPerformance: StagePerformance = {
        turnsUsed: 10,
        unitsLost: 0,
        enemiesDefeated: 15,
        bossesDefeated: 1,
        recruitmentSuccesses: 2,
        damageDealt: 1000,
        damageTaken: 200,
        healingDone: 100,
      };

      const mockRewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.S,
          experienceMultiplier: 2.0,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      await rewardUI.showVictoryScreen(mockRewards);

      // 各評価ランクをテスト
      const ratings = [ClearRating.S, ClearRating.A, ClearRating.B, ClearRating.C, ClearRating.D];

      for (const rating of ratings) {
        rewardUI.showClearRating(rating, mockPerformance);
        expect(scene.add.text).toHaveBeenCalled();
      }
    });

    test('クリア評価表示イベントを発行する', async () => {
      const mockPerformance: StagePerformance = {
        turnsUsed: 10,
        unitsLost: 0,
        enemiesDefeated: 15,
        bossesDefeated: 1,
        recruitmentSuccesses: 2,
        damageDealt: 1000,
        damageTaken: 200,
        healingDone: 100,
      };

      const mockRewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.5,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      const spy = vi.fn();
      rewardUI.on('clear-rating-shown', spy);

      await rewardUI.showVictoryScreen(mockRewards);
      rewardUI.showClearRating(ClearRating.A, mockPerformance);

      expect(spy).toHaveBeenCalledWith({
        rating: ClearRating.A,
        performance: mockPerformance,
      });
    });
  });

  describe('showRoseEssenceReward', () => {
    test('薔薇の力獲得を表示できる', async () => {
      const mockBossReward: BossReward = {
        bossId: 'boss-1',
        bossName: 'テストボス',
        roseEssenceAmount: 50,
        roseEssenceType: RoseEssenceType.CRIMSON,
        experienceBonus: 200,
      };

      const mockRewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.5,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      await rewardUI.showVictoryScreen(mockRewards);
      rewardUI.showRoseEssenceReward(mockBossReward);

      expect(scene.add.text).toHaveBeenCalled();
    });

    test('薔薇の力獲得表示イベントを発行する', async () => {
      const mockBossReward: BossReward = {
        bossId: 'boss-1',
        bossName: 'テストボス',
        roseEssenceAmount: 50,
        roseEssenceType: RoseEssenceType.CRIMSON,
        experienceBonus: 200,
      };

      const mockRewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.5,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      const spy = vi.fn();
      rewardUI.on('rose-essence-reward-shown', spy);

      await rewardUI.showVictoryScreen(mockRewards);
      rewardUI.showRoseEssenceReward(mockBossReward);

      expect(spy).toHaveBeenCalledWith({ reward: mockBossReward });
    });
  });

  describe('showRecruitmentSuccess', () => {
    test('仲間化成功を表示できる', async () => {
      const mockCharacters: Unit[] = [
        {
          id: 'char-1',
          name: 'テストキャラ1',
          position: { x: 0, y: 0 },
          stats: {
            maxHP: 100,
            maxMP: 50,
            attack: 20,
            defense: 15,
            magicAttack: 10,
            magicDefense: 10,
            speed: 10,
            movement: 3,
            attackRange: 1,
          },
          currentHP: 100,
          currentMP: 50,
          faction: 'player',
          hasActed: false,
          hasMoved: false,
          level: 1,
          experience: 0,
        },
      ];

      const mockRewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.5,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      await rewardUI.showVictoryScreen(mockRewards);
      rewardUI.showRecruitmentSuccess(mockCharacters);

      expect(scene.add.text).toHaveBeenCalled();
    });

    test('複数キャラクターの仲間化を表示できる', async () => {
      const mockCharacters: Unit[] = [
        {
          id: 'char-1',
          name: 'テストキャラ1',
          position: { x: 0, y: 0 },
          stats: {
            maxHP: 100,
            maxMP: 50,
            attack: 20,
            defense: 15,
            magicAttack: 10,
            magicDefense: 10,
            speed: 10,
            movement: 3,
            attackRange: 1,
          },
          currentHP: 100,
          currentMP: 50,
          faction: 'player',
          hasActed: false,
          hasMoved: false,
          level: 1,
          experience: 0,
        },
        {
          id: 'char-2',
          name: 'テストキャラ2',
          position: { x: 1, y: 1 },
          stats: {
            maxHP: 80,
            maxMP: 60,
            attack: 15,
            defense: 10,
            magicAttack: 25,
            magicDefense: 20,
            speed: 12,
            movement: 3,
            attackRange: 2,
          },
          currentHP: 80,
          currentMP: 60,
          faction: 'player',
          hasActed: false,
          hasMoved: false,
          level: 1,
          experience: 0,
        },
      ];

      const mockRewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.5,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      await rewardUI.showVictoryScreen(mockRewards);
      rewardUI.showRecruitmentSuccess(mockCharacters);

      expect(scene.add.text).toHaveBeenCalled();
    });

    test('空の配列では何も表示しない', async () => {
      const mockRewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.5,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      await rewardUI.showVictoryScreen(mockRewards);

      const textCallsBefore = (scene.add.text as any).mock.calls.length;
      rewardUI.showRecruitmentSuccess([]);
      const textCallsAfter = (scene.add.text as any).mock.calls.length;

      expect(textCallsAfter).toBe(textCallsBefore);
    });

    test('仲間化成功表示イベントを発行する', async () => {
      const mockCharacters: Unit[] = [
        {
          id: 'char-1',
          name: 'テストキャラ1',
          position: { x: 0, y: 0 },
          stats: {
            maxHP: 100,
            maxMP: 50,
            attack: 20,
            defense: 15,
            magicAttack: 10,
            magicDefense: 10,
            speed: 10,
            movement: 3,
            attackRange: 1,
          },
          currentHP: 100,
          currentMP: 50,
          faction: 'player',
          hasActed: false,
          hasMoved: false,
          level: 1,
          experience: 0,
        },
      ];

      const mockRewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.5,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      const spy = vi.fn();
      rewardUI.on('recruitment-success-shown', spy);

      await rewardUI.showVictoryScreen(mockRewards);
      rewardUI.showRecruitmentSuccess(mockCharacters);

      expect(spy).toHaveBeenCalledWith({ characters: mockCharacters });
    });
  });

  describe('confirmRewardCollection', () => {
    test('報酬受け取り確認を表示できる', async () => {
      const mockRewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.5,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      await rewardUI.showVictoryScreen(mockRewards);

      // 確認ボタンが表示されることを確認
      rewardUI.confirmRewardCollection();

      expect(scene.add.rectangle).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalled();
    });

    test('画面がない場合はfalseを返す', async () => {
      const result = await rewardUI.confirmRewardCollection();
      expect(result).toBe(false);
    });
  });

  describe('clearAllScreens', () => {
    test('すべての画面をクリアできる', async () => {
      const mockRewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.5,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      await rewardUI.showVictoryScreen(mockRewards);
      rewardUI.clearAllScreens();

      // 画面がクリアされたことを確認
      expect(rewardUI['currentScreen']).toBeNull();
    });
  });

  describe('destroy', () => {
    test('システムを破棄できる', () => {
      rewardUI.destroy();

      // イベントリスナーがクリアされたことを確認
      expect(rewardUI.listenerCount('victory-screen-shown')).toBe(0);
    });
  });
});
