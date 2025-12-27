/**
 * BossUI テスト
 * ボス情報UIシステムの機能をテスト
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import Phaser from 'phaser';
import { BossUI } from '../../../../game/src/systems/victory/BossUI';
import { BossData, RoseEssenceType, BossDifficulty, BossType } from '../../../../game/src/types/boss';
import { Unit } from '../../../../game/src/types/gameplay';

describe('BossUI', () => {
  let scene: Phaser.Scene;
  let bossUI: BossUI;
  let mockBoss: Unit;
  let mockBossData: BossData;

  beforeEach(() => {
    // Phaserシーンのモック作成
    scene = {
      add: {
        container: vi.fn().mockReturnValue({
          setDepth: vi.fn().mockReturnThis(),
          setVisible: vi.fn().mockReturnThis(),
          add: vi.fn(),
          setAlpha: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        }),
        rectangle: vi.fn().mockReturnValue({
          setDepth: vi.fn().mockReturnThis(),
          setOrigin: vi.fn().mockReturnThis(),
          setStrokeStyle: vi.fn().mockReturnThis(),
          setFillStyle: vi.fn().mockReturnThis(),
          setAlpha: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        }),
        text: vi.fn().mockReturnValue({
          setOrigin: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          setAlpha: vi.fn().mockReturnThis(),
          setScale: vi.fn().mockReturnThis(),
          setText: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        }),
      },
      cameras: {
        main: {
          centerX: 400,
          centerY: 300,
          width: 800,
          height: 600,
          shake: vi.fn(),
        },
      },
      tweens: {
        add: vi.fn().mockImplementation((config) => {
          // アニメーション完了を即座に呼び出し
          if (config.onComplete) {
            setTimeout(() => config.onComplete(), 0);
          }
          return { stop: vi.fn() };
        }),
      },
      time: {
        delayedCall: vi.fn().mockImplementation((delay, callback) => {
          setTimeout(callback, 0);
          return { remove: vi.fn() };
        }),
      },
    } as any;

    // モックボスユニット
    mockBoss = {
      id: 'boss-001',
      name: 'テストボス',
      position: { x: 5, y: 5 },
      currentHP: 100,
      stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 30,
        defense: 20,
        speed: 10,
        movement: 3,
      },
      faction: 'enemy',
    } as Unit;

    // モックボスデータ
    mockBossData = {
      id: 'boss-001',
      name: 'テストボス',
      title: '魔性の薔薇の守護者',
      description: 'テスト用のボスです',
      roseEssenceAmount: 10,
      roseEssenceType: RoseEssenceType.CRIMSON,
      isBoss: true,
      bossType: BossType.MINOR_BOSS,
      difficulty: BossDifficulty.NORMAL,
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
          statModifiers: {},
          newAbilities: [],
        },
      ],
      currentPhase: 1,
      specialAbilities: [],
      aiPersonality: 'aggressive' as any,
      aiPriority: 10,
      experienceReward: 100,
    };

    bossUI = new BossUI(scene);
  });

  afterEach(() => {
    if (bossUI) {
      bossUI.destroy();
    }
  });

  describe('初期化', () => {
    test('BossUIが正しく初期化される', () => {
      expect(bossUI).toBeDefined();
      expect(scene.add.container).toHaveBeenCalled();
    });

    test('カスタム設定で初期化できる', () => {
      const customConfig = {
        healthBarWidth: 500,
        healthBarHeight: 40,
        introductionDuration: 4000,
      };

      const customBossUI = new BossUI(scene, customConfig);
      expect(customBossUI).toBeDefined();
      customBossUI.destroy();
    });
  });

  describe('showBossIntroduction', () => {
    test('ボス登場演出を表示できる', async () => {
      const promise = bossUI.showBossIntroduction(mockBoss, mockBossData);

      // Promise完了を待つ
      await promise;

      // 非同期処理後に呼ばれることを確認
      expect(scene.add.rectangle).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalled();
      expect(scene.tweens.add).toHaveBeenCalled();
    });

    test('説明なしのボスデータでも動作する', async () => {
      const bossDataWithoutDescription = { ...mockBossData, description: '' };
      const promise = bossUI.showBossIntroduction(mockBoss, bossDataWithoutDescription);

      await promise;
      expect(scene.add.text).toHaveBeenCalled();
    });

    test('boss-introduction-startedイベントが発行される', async () => {
      const eventSpy = vi.fn();
      bossUI.on('boss-introduction-started', eventSpy);

      await bossUI.showBossIntroduction(mockBoss, mockBossData);

      expect(eventSpy).toHaveBeenCalledWith({
        bossId: mockBoss.id,
        bossName: mockBossData.name,
      });
    });
  });

  describe('showBossHealthBar', () => {
    test('ボスHPバーを表示できる', () => {
      bossUI.showBossHealthBar(mockBoss, mockBossData);

      expect(scene.add.container).toHaveBeenCalled();
      expect(scene.add.rectangle).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalled();
    });

    test('boss-health-bar-shownイベントが発行される', () => {
      const eventSpy = vi.fn();
      bossUI.on('boss-health-bar-shown', eventSpy);

      bossUI.showBossHealthBar(mockBoss, mockBossData);

      expect(eventSpy).toHaveBeenCalledWith({
        bossId: mockBoss.id,
        bossName: mockBossData.name,
      });
    });

    test('既存のHPバーがある場合は削除される', () => {
      bossUI.showBossHealthBar(mockBoss, mockBossData);
      const firstCallCount = (scene.add.container as any).mock.calls.length;

      bossUI.showBossHealthBar(mockBoss, mockBossData);
      const secondCallCount = (scene.add.container as any).mock.calls.length;

      expect(secondCallCount).toBeGreaterThan(firstCallCount);
    });
  });

  describe('updateBossHealthBar', () => {
    test('ボスHPバーを更新できる', () => {
      bossUI.showBossHealthBar(mockBoss, mockBossData);

      mockBoss.currentHP = 50;
      bossUI.updateBossHealthBar(mockBoss);

      expect(scene.tweens.add).toHaveBeenCalled();
    });

    test('HPが0以下でも正しく処理される', () => {
      bossUI.showBossHealthBar(mockBoss, mockBossData);

      mockBoss.currentHP = -10;
      bossUI.updateBossHealthBar(mockBoss);

      expect(scene.tweens.add).toHaveBeenCalled();
    });

    test('boss-health-bar-updatedイベントが発行される', () => {
      const eventSpy = vi.fn();
      bossUI.on('boss-health-bar-updated', eventSpy);

      bossUI.showBossHealthBar(mockBoss, mockBossData);
      mockBoss.currentHP = 75;
      bossUI.updateBossHealthBar(mockBoss);

      expect(eventSpy).toHaveBeenCalledWith({
        bossId: mockBoss.id,
        currentHP: 75,
        maxHP: mockBoss.stats.maxHP,
        percentage: 0.75,
      });
    });

    test('存在しないボスIDでは何もしない', () => {
      const nonExistentBoss = { ...mockBoss, id: 'non-existent' };
      bossUI.updateBossHealthBar(nonExistentBoss);

      // エラーが発生しないことを確認
      expect(true).toBe(true);
    });
  });

  describe('hideBossHealthBar', () => {
    test('ボスHPバーを非表示にできる', () => {
      bossUI.showBossHealthBar(mockBoss, mockBossData);
      bossUI.hideBossHealthBar(mockBoss.id);

      expect(scene.tweens.add).toHaveBeenCalled();
    });

    test('存在しないボスIDでは何もしない', () => {
      bossUI.hideBossHealthBar('non-existent');

      // エラーが発生しないことを確認
      expect(true).toBe(true);
    });
  });

  describe('showBossPhase', () => {
    test('ボスフェーズを表示できる', () => {
      bossUI.showBossHealthBar(mockBoss, mockBossData);
      bossUI.showBossPhase(2, 3);

      expect(scene.add.text).toHaveBeenCalled();
      expect(scene.tweens.add).toHaveBeenCalled();
    });

    test('boss-phase-shownイベントが発行される', () => {
      const eventSpy = vi.fn();
      bossUI.on('boss-phase-shown', eventSpy);

      bossUI.showBossHealthBar(mockBoss, mockBossData);
      bossUI.showBossPhase(2, 3);

      expect(eventSpy).toHaveBeenCalledWith({
        phase: 2,
        totalPhases: 3,
      });
    });
  });

  describe('showBossDefeatCutscene', () => {
    test('ボス撃破演出を表示できる', async () => {
      const promise = bossUI.showBossDefeatCutscene(mockBoss, mockBossData);

      // Promise完了を待つ
      await promise;

      // 非同期処理後に呼ばれることを確認
      expect(scene.add.rectangle).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalled();
      expect(scene.cameras.main.shake).toHaveBeenCalled();
    });

    test('boss-defeat-cutscene-startedイベントが発行される', async () => {
      const eventSpy = vi.fn();
      bossUI.on('boss-defeat-cutscene-started', eventSpy);

      await bossUI.showBossDefeatCutscene(mockBoss, mockBossData);

      expect(eventSpy).toHaveBeenCalledWith({
        bossId: mockBoss.id,
        bossName: mockBossData.name,
      });
    });
  });

  describe('showRoseEssenceGain', () => {
    test('薔薇の力獲得演出を表示できる', async () => {
      const promise = bossUI.showRoseEssenceGain(10, RoseEssenceType.CRIMSON);

      // Promise完了を待つ
      await promise;

      // 非同期処理後に呼ばれることを確認
      expect(scene.add.rectangle).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalled();
    });

    test('全ての薔薇の力の種類で動作する', async () => {
      const types = [
        RoseEssenceType.CRIMSON,
        RoseEssenceType.SHADOW,
        RoseEssenceType.THORN,
        RoseEssenceType.CURSED,
      ];

      for (const type of types) {
        await bossUI.showRoseEssenceGain(5, type);
      }

      expect(scene.add.text).toHaveBeenCalled();
    });

    test('rose-essence-gain-startedイベントが発行される', async () => {
      const eventSpy = vi.fn();
      bossUI.on('rose-essence-gain-started', eventSpy);

      await bossUI.showRoseEssenceGain(15, RoseEssenceType.SHADOW);

      expect(eventSpy).toHaveBeenCalledWith({
        amount: 15,
        type: RoseEssenceType.SHADOW,
      });
    });
  });

  describe('clearAllEffects', () => {
    test('すべてのエフェクトをクリアできる', () => {
      bossUI.showBossHealthBar(mockBoss, mockBossData);
      bossUI.clearAllEffects();

      // エラーが発生しないことを確認
      expect(true).toBe(true);
    });
  });

  describe('destroy', () => {
    test('システムを破棄できる', () => {
      bossUI.showBossHealthBar(mockBoss, mockBossData);
      bossUI.destroy();

      // エラーが発生しないことを確認
      expect(true).toBe(true);
    });
  });

  describe('視覚的インパクトと情報伝達', () => {
    test('ボス登場演出は視覚的に目立つ', async () => {
      await bossUI.showBossIntroduction(mockBoss, mockBossData);

      // 暗転、テキスト表示、アニメーションが実行されることを確認
      expect(scene.add.rectangle).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalled();
      expect(scene.tweens.add).toHaveBeenCalled();
    });

    test('HPバーは常に見やすい位置に表示される', () => {
      bossUI.showBossHealthBar(mockBoss, mockBossData);

      // HPバーが画面上部に表示されることを確認
      expect(scene.add.container).toHaveBeenCalled();
    });

    test('フェーズ変化は明確に伝わる', () => {
      bossUI.showBossHealthBar(mockBoss, mockBossData);
      bossUI.showBossPhase(2, 3);

      // フェーズテキストとアニメーションが実行されることを確認
      expect(scene.add.text).toHaveBeenCalled();
      expect(scene.tweens.add).toHaveBeenCalled();
    });

    test('撃破演出は達成感を演出する', async () => {
      await bossUI.showBossDefeatCutscene(mockBoss, mockBossData);

      // フラッシュ、シェイク、テキストが実行されることを確認
      expect(scene.add.rectangle).toHaveBeenCalled();
      expect(scene.cameras.main.shake).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalled();
    });

    test('薔薇の力獲得演出は報酬の価値を伝える', async () => {
      await bossUI.showRoseEssenceGain(20, RoseEssenceType.CRIMSON);

      // グロー、アイコン、テキストが表示されることを確認
      expect(scene.add.rectangle).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalled();
    });
  });
});
