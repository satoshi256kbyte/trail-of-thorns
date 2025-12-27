/**
 * BossEffectsクラスのユニットテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Phaser from 'phaser';
import { BossEffects } from '../../../../game/src/systems/victory/BossEffects';
import { BossData, RoseEssenceType, BossType, BossDifficulty, AIPersonality } from '../../../../game/src/types/boss';
import { Unit } from '../../../../game/src/types/gameplay';

// Phaserモックの作成
class MockScene {
  cameras = {
    main: {
      centerX: 400,
      centerY: 300,
      width: 800,
      height: 600,
      shake: vi.fn(),
    },
  };

  add = {
    container: vi.fn(() => ({
      setDepth: vi.fn().mockReturnThis(),
      add: vi.fn(),
      destroy: vi.fn(),
    })),
    rectangle: vi.fn(() => ({
      setDepth: vi.fn().mockReturnThis(),
      setOrigin: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
      setScale: vi.fn().mockReturnThis(),
      setStrokeStyle: vi.fn().mockReturnThis(),
      setFillStyle: vi.fn().mockReturnThis(),
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
      // 即座にonCompleteを呼び出す
      if (config.onComplete) {
        setTimeout(() => config.onComplete(), 0);
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

describe('BossEffects', () => {
  let bossEffects: BossEffects;
  let mockScene: MockScene;
  let mockBoss: Unit;
  let mockBossData: BossData;

  beforeEach(() => {
    mockScene = new MockScene();
    bossEffects = new BossEffects(mockScene as any);

    // モックボスユニット
    mockBoss = {
      id: 'boss-001',
      name: 'テストボス',
      position: { x: 5, y: 5 },
      stats: {
        maxHP: 1000,
        maxMP: 100,
        attack: 50,
        defense: 30,
        magicAttack: 40,
        magicDefense: 25,
        speed: 10,
        movement: 3,
        attackRange: 1,
      },
      currentHP: 1000,
      currentMP: 100,
      faction: 'enemy',
      hasActed: false,
      hasMoved: false,
      level: 10,
      experience: 0,
    };

    // モックボスデータ
    mockBossData = {
      id: 'boss-001',
      name: 'テストボス',
      title: '魔性の薔薇の守護者',
      description: 'テスト用のボス',
      roseEssenceAmount: 100,
      roseEssenceType: RoseEssenceType.CRIMSON,
      isBoss: true,
      bossType: BossType.MAJOR_BOSS,
      difficulty: BossDifficulty.NORMAL,
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
      aiPersonality: AIPersonality.AGGRESSIVE,
      aiPriority: 10,
      experienceReward: 500,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('playBossIntroduction', () => {
    it('ボス登場演出を正常に再生できる', async () => {
      await bossEffects.playBossIntroduction(mockBoss, mockBossData);

      // 演出要素が作成されたことを確認
      expect(mockScene.add.rectangle).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('カスタム設定で演出を再生できる', async () => {
      const customConfig = {
        duration: 3000,
        fadeInDuration: 1000,
        fadeOutDuration: 1000,
      };

      await bossEffects.playBossIntroduction(mockBoss, mockBossData, customConfig);

      expect(mockScene.add.rectangle).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();
    });

    it('エラーが発生しても演出を完了する', async () => {
      // エラーを発生させる
      mockScene.add.rectangle = vi.fn(() => {
        throw new Error('Test error');
      });

      // エラーでも完了することを確認
      await expect(bossEffects.playBossIntroduction(mockBoss, mockBossData)).resolves.toBeUndefined();
    });
  });

  describe('playBossDefeatCutscene', () => {
    it('ボス撃破演出を正常に再生できる', async () => {
      await bossEffects.playBossDefeatCutscene(mockBoss, mockBossData);

      // 演出要素が作成されたことを確認
      expect(mockScene.add.rectangle).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('カスタム設定で演出を再生できる', async () => {
      const customConfig = {
        duration: 2500,
        fadeOutDuration: 800,
      };

      await bossEffects.playBossDefeatCutscene(mockBoss, mockBossData, customConfig);

      expect(mockScene.add.rectangle).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();
    });
  });

  describe('playPhaseChangeEffect', () => {
    it('フェーズ変化演出を正常に再生できる', async () => {
      await bossEffects.playPhaseChangeEffect(mockBoss, mockBossData, 2);

      // 演出要素が作成されたことを確認
      expect(mockScene.cameras.main.shake).toHaveBeenCalled();
      expect(mockScene.add.rectangle).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('異なるフェーズ番号で演出を再生できる', async () => {
      await bossEffects.playPhaseChangeEffect(mockBoss, mockBossData, 3);

      expect(mockScene.cameras.main.shake).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();
    });
  });

  describe('showBossHealthBar', () => {
    it('ボスHPバーを正常に表示できる', () => {
      bossEffects.showBossHealthBar(mockBoss, mockBossData);

      // HPバー要素が作成されたことを確認
      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.add.rectangle).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();
    });

    it('カスタム設定でHPバーを表示できる', () => {
      const customConfig = {
        x: 500,
        y: 100,
        width: 500,
        height: 40,
      };

      bossEffects.showBossHealthBar(mockBoss, mockBossData, customConfig);

      expect(mockScene.add.container).toHaveBeenCalled();
    });

    it('既存のHPバーがある場合は置き換える', () => {
      // 最初のHPバーを表示
      bossEffects.showBossHealthBar(mockBoss, mockBossData);
      const firstCallCount = mockScene.add.container.mock.calls.length;

      // 同じボスのHPバーを再度表示
      bossEffects.showBossHealthBar(mockBoss, mockBossData);
      const secondCallCount = mockScene.add.container.mock.calls.length;

      // 2回目の呼び出しで新しいコンテナが作成されたことを確認
      expect(secondCallCount).toBeGreaterThan(firstCallCount);
    });
  });

  describe('updateBossHealthBar', () => {
    it('HPバーを正常に更新できる', () => {
      // HPバーを表示
      bossEffects.showBossHealthBar(mockBoss, mockBossData);

      // HPを減らす
      mockBoss.currentHP = 500;

      // HPバーを更新
      bossEffects.updateBossHealthBar(mockBoss);

      // tweenが呼ばれたことを確認
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('存在しないボスのHPバー更新は無視される', () => {
      const nonExistentBoss = { ...mockBoss, id: 'non-existent' };

      // エラーが発生しないことを確認
      expect(() => bossEffects.updateBossHealthBar(nonExistentBoss)).not.toThrow();
    });
  });

  describe('hideBossHealthBar', () => {
    it('HPバーを正常に非表示にできる', () => {
      // HPバーを表示
      bossEffects.showBossHealthBar(mockBoss, mockBossData);

      // HPバーを非表示
      bossEffects.hideBossHealthBar(mockBoss.id);

      // 破棄されたことを確認（モックなので直接確認は難しいが、エラーが出ないことを確認）
      expect(() => bossEffects.hideBossHealthBar(mockBoss.id)).not.toThrow();
    });

    it('存在しないHPバーの非表示は無視される', () => {
      expect(() => bossEffects.hideBossHealthBar('non-existent')).not.toThrow();
    });
  });

  describe('playRoseEssenceGainEffect', () => {
    it('薔薇の力獲得演出を正常に再生できる', async () => {
      await bossEffects.playRoseEssenceGainEffect(100, RoseEssenceType.CRIMSON);

      // 演出要素が作成されたことを確認
      expect(mockScene.add.rectangle).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('異なる薔薇の力の種類で演出を再生できる', async () => {
      const types = [
        RoseEssenceType.CRIMSON,
        RoseEssenceType.SHADOW,
        RoseEssenceType.THORN,
        RoseEssenceType.CURSED,
      ];

      for (const type of types) {
        await bossEffects.playRoseEssenceGainEffect(50, type);
        expect(mockScene.add.rectangle).toHaveBeenCalled();
      }
    });

    it('カスタム設定で演出を再生できる', async () => {
      const customConfig = {
        duration: 3000,
        fadeOutDuration: 1000,
      };

      await bossEffects.playRoseEssenceGainEffect(150, RoseEssenceType.SHADOW, customConfig);

      expect(mockScene.add.rectangle).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();
    });
  });

  describe('clearAllEffects', () => {
    it('すべてのエフェクトをクリアできる', () => {
      // HPバーを表示
      bossEffects.showBossHealthBar(mockBoss, mockBossData);

      // すべてクリア
      bossEffects.clearAllEffects();

      // エラーが発生しないことを確認
      expect(() => bossEffects.clearAllEffects()).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('システムを正常に破棄できる', () => {
      // HPバーを表示
      bossEffects.showBossHealthBar(mockBoss, mockBossData);

      // 破棄
      bossEffects.destroy();

      // エラーが発生しないことを確認
      expect(() => bossEffects.destroy()).not.toThrow();
    });
  });

  describe('パフォーマンステスト', () => {
    it('複数の演出を連続で再生できる', async () => {
      const startTime = Date.now();

      await bossEffects.playBossIntroduction(mockBoss, mockBossData);
      await bossEffects.playPhaseChangeEffect(mockBoss, mockBossData, 2);
      await bossEffects.playBossDefeatCutscene(mockBoss, mockBossData);
      await bossEffects.playRoseEssenceGainEffect(100, RoseEssenceType.CRIMSON);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 演出が適切な時間内に完了することを確認（モックなので即座に完了）
      expect(duration).toBeLessThan(1000);
    });

    it('複数のボスのHPバーを同時に表示できる', () => {
      const boss2 = { ...mockBoss, id: 'boss-002' };
      const boss3 = { ...mockBoss, id: 'boss-003' };

      // 初期状態のコール数を記録
      const initialCallCount = mockScene.add.container.mock.calls.length;

      bossEffects.showBossHealthBar(mockBoss, mockBossData);
      bossEffects.showBossHealthBar(boss2, mockBossData);
      bossEffects.showBossHealthBar(boss3, mockBossData);

      // 3つのコンテナが追加で作成されたことを確認
      expect(mockScene.add.container).toHaveBeenCalledTimes(initialCallCount + 3);
    });
  });

  describe('エラーハンドリング', () => {
    it('演出中のエラーを適切に処理する', async () => {
      // tweenでエラーを発生させる
      mockScene.tweens.add = vi.fn(() => {
        throw new Error('Tween error');
      });

      // エラーでも完了することを確認
      await expect(bossEffects.playBossIntroduction(mockBoss, mockBossData)).resolves.toBeUndefined();
    });

    it('HPバー更新中のエラーを適切に処理する', () => {
      bossEffects.showBossHealthBar(mockBoss, mockBossData);

      // tweenでエラーを発生させる
      mockScene.tweens.add = vi.fn(() => {
        throw new Error('Update error');
      });

      // エラーが発生しないことを確認
      expect(() => bossEffects.updateBossHealthBar(mockBoss)).not.toThrow();
    });
  });
});
