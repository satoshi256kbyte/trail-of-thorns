/**
 * ChapterStageErrorRecovery Tests
 * エラーリカバリー機能のテスト
 *
 * 要件: 9.1, 9.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ChapterStageErrorRecovery,
  RecoveryAction,
} from '../../../../game/src/systems/chapter-stage/ChapterStageErrorRecovery';
import { ChapterStageError } from '../../../../game/src/systems/chapter-stage/ChapterStageErrorHandler';

// モックシーンの作成
const createMockScene = () => {
  return {
    cameras: {
      main: {
        width: 800,
        height: 600,
      },
    },
    add: {
      rectangle: vi.fn().mockReturnValue({
        setScrollFactor: vi.fn().mockReturnThis(),
        setDepth: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
        active: true,
      }),
      text: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
        setScrollFactor: vi.fn().mockReturnThis(),
        setDepth: vi.fn().mockReturnThis(),
        setInteractive: vi.fn().mockReturnThis(),
        on: vi.fn(),
        destroy: vi.fn(),
      }),
    },
    scene: {
      key: 'TestScene',
      stop: vi.fn(),
      start: vi.fn(),
    },
    time: {
      delayedCall: vi.fn(),
    },
  };
};

describe('ChapterStageErrorRecovery', () => {
  let errorRecovery: ChapterStageErrorRecovery;
  let mockScene: any;

  beforeEach(() => {
    mockScene = createMockScene();
    errorRecovery = new ChapterStageErrorRecovery(mockScene);
  });

  describe('初期化', () => {
    it('正しく初期化される', () => {
      expect(errorRecovery).toBeDefined();
      expect(errorRecovery.isRecoveringNow()).toBe(false);
    });
  });

  describe('重大なエラーのリカバリー', () => {
    it('SAVE_DATA_CORRUPTEDエラーでタイトル画面に戻る', async () => {
      // ユーザーが「タイトルに戻る」を選択する場合をシミュレート
      const textMock = mockScene.add.text();
      textMock.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'pointerdown') {
          // 最初のボタン（タイトルに戻る）をクリック
          setTimeout(() => callback(), 0);
        }
      });

      const result = await errorRecovery.recover(
        ChapterStageError.SAVE_DATA_CORRUPTED,
        {}
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe(RecoveryAction.RETURN_TO_TITLE);
      expect(mockScene.scene.stop).toHaveBeenCalled();
      expect(mockScene.scene.start).toHaveBeenCalledWith('TitleScene');
    });

    it('DATA_LOAD_FAILEDエラーでタイトル画面に戻る', async () => {
      const textMock = mockScene.add.text();
      textMock.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'pointerdown') {
          setTimeout(() => callback(), 0);
        }
      });

      const result = await errorRecovery.recover(
        ChapterStageError.DATA_LOAD_FAILED,
        {}
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe(RecoveryAction.RETURN_TO_TITLE);
    });
  });

  describe('セーブエラーのリカバリー', () => {
    it('SAVE_FAILEDエラーで再試行オプションを提供', async () => {
      const textMock = mockScene.add.text();
      let clickCount = 0;
      textMock.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'pointerdown') {
          clickCount++;
          if (clickCount === 1) {
            // 最初のボタン（再試行）をクリック
            setTimeout(() => callback(), 0);
          }
        }
      });

      const retryListener = vi.fn();
      errorRecovery.on('retry-save', retryListener);

      const result = await errorRecovery.recover(ChapterStageError.SAVE_FAILED, {
        slotId: 1,
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe(RecoveryAction.RETRY);
      expect(retryListener).toHaveBeenCalled();
    });

    it('最大リトライ回数に達したら再試行を拒否', async () => {
      const textMock = mockScene.add.text();
      textMock.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'pointerdown') {
          setTimeout(() => callback(), 0);
        }
      });

      // 最大リトライ回数まで試行
      for (let i = 0; i < 3; i++) {
        await errorRecovery.recover(
          ChapterStageError.SAVE_FAILED,
          { slotId: 1 },
          { maxRetries: 3 }
        );
      }

      // 4回目は拒否される
      const result = await errorRecovery.recover(
        ChapterStageError.SAVE_FAILED,
        { slotId: 1 },
        { maxRetries: 3 }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('最大リトライ回数');
    });
  });

  describe('ロードエラーのリカバリー', () => {
    it('LOAD_FAILEDエラーで別のセーブデータ選択を提案', async () => {
      const textMock = mockScene.add.text();
      let clickCount = 0;
      textMock.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'pointerdown') {
          clickCount++;
          if (clickCount === 1) {
            // 最初のボタン（選択する）をクリック
            setTimeout(() => callback(), 0);
          }
        }
      });

      const selectListener = vi.fn();
      errorRecovery.on('select-save-slot', selectListener);

      const result = await errorRecovery.recover(ChapterStageError.LOAD_FAILED, {});

      expect(result.success).toBe(true);
      expect(result.action).toBe(RecoveryAction.RETRY);
      expect(selectListener).toHaveBeenCalled();
    });
  });

  describe('パーティ編成エラーのリカバリー', () => {
    it('PARTY_FULLエラーで編成画面を維持', async () => {
      const result = await errorRecovery.recover(ChapterStageError.PARTY_FULL, {});

      expect(result.success).toBe(true);
      expect(result.action).toBe(RecoveryAction.CONTINUE);
      expect(result.message).toContain('パーティ編成');
    });

    it('CHARACTER_LOSTエラーで編成画面を維持', async () => {
      const result = await errorRecovery.recover(
        ChapterStageError.CHARACTER_LOST,
        { characterId: 'char-001' }
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe(RecoveryAction.CONTINUE);
    });
  });

  describe('解放エラーのリカバリー', () => {
    it('STAGE_NOT_UNLOCKEDエラーで解放条件を表示', async () => {
      const showConditionsListener = vi.fn();
      errorRecovery.on('show-unlock-conditions', showConditionsListener);

      const result = await errorRecovery.recover(
        ChapterStageError.STAGE_NOT_UNLOCKED,
        { stageId: 'stage-1-2' }
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe(RecoveryAction.CONTINUE);
      expect(showConditionsListener).toHaveBeenCalledWith({
        stageId: 'stage-1-2',
      });
    });
  });

  describe('リトライカウント管理', () => {
    it('リトライカウントを正しく追跡', async () => {
      const textMock = mockScene.add.text();
      textMock.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'pointerdown') {
          setTimeout(() => callback(), 0);
        }
      });

      expect(errorRecovery.getRetryCount('save_1')).toBe(0);

      await errorRecovery.recover(ChapterStageError.SAVE_FAILED, { slotId: 1 });

      expect(errorRecovery.getRetryCount('save_1')).toBe(1);
    });

    it('リトライカウントをリセットできる', async () => {
      const textMock = mockScene.add.text();
      textMock.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'pointerdown') {
          setTimeout(() => callback(), 0);
        }
      });

      await errorRecovery.recover(ChapterStageError.SAVE_FAILED, { slotId: 1 });
      expect(errorRecovery.getRetryCount('save_1')).toBe(1);

      errorRecovery.resetRetryCount('save_1');
      expect(errorRecovery.getRetryCount('save_1')).toBe(0);
    });

    it('全てのリトライカウントをリセットできる', async () => {
      const textMock = mockScene.add.text();
      textMock.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'pointerdown') {
          setTimeout(() => callback(), 0);
        }
      });

      await errorRecovery.recover(ChapterStageError.SAVE_FAILED, { slotId: 1 });
      await errorRecovery.recover(ChapterStageError.SAVE_FAILED, { slotId: 2 });

      errorRecovery.resetRetryCount();

      expect(errorRecovery.getRetryCount('save_1')).toBe(0);
      expect(errorRecovery.getRetryCount('save_2')).toBe(0);
    });
  });

  describe('同時リカバリーの防止', () => {
    it('リカバリー中は新しいリカバリーを拒否', async () => {
      const textMock = mockScene.add.text();
      let resolveCallback: Function | null = null;

      textMock.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'pointerdown') {
          resolveCallback = callback;
        }
      });

      // 最初のリカバリーを開始（完了させない）
      const firstRecovery = errorRecovery.recover(
        ChapterStageError.SAVE_DATA_CORRUPTED,
        {}
      );

      // リカバリー中であることを確認
      expect(errorRecovery.isRecoveringNow()).toBe(true);

      // 2番目のリカバリーを試みる
      const secondRecovery = await errorRecovery.recover(
        ChapterStageError.SAVE_FAILED,
        {}
      );

      expect(secondRecovery.success).toBe(false);
      expect(secondRecovery.message).toContain('リカバリー処理中');

      // 最初のリカバリーを完了させる
      if (resolveCallback) {
        resolveCallback();
      }
      await firstRecovery;

      expect(errorRecovery.isRecoveringNow()).toBe(false);
    });
  });

  describe('イベント発行', () => {
    it('タイトル画面復帰時にイベントを発行', async () => {
      const textMock = mockScene.add.text();
      textMock.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'pointerdown') {
          setTimeout(() => callback(), 0);
        }
      });

      const returnListener = vi.fn();
      errorRecovery.on('returned-to-title', returnListener);

      await errorRecovery.recover(ChapterStageError.SAVE_DATA_CORRUPTED, {});

      expect(returnListener).toHaveBeenCalled();
    });
  });

  describe('破棄処理', () => {
    it('正しく破棄される', () => {
      errorRecovery.destroy();

      expect(errorRecovery.isRecoveringNow()).toBe(false);
      expect(errorRecovery.getRetryCount('any')).toBe(0);
    });
  });
});
