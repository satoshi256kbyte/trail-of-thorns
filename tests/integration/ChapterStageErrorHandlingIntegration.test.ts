/**
 * ChapterStageErrorHandling Integration Tests
 * エラーハンドリングとリカバリーの統合テスト
 *
 * 要件: 9.1, 9.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChapterStageErrorHandler } from '../../game/src/systems/chapter-stage/ChapterStageErrorHandler';
import { ChapterStageError } from '../../game/src/systems/chapter-stage/ChapterStageErrorHandler';
import { RecoveryAction } from '../../game/src/systems/chapter-stage/ChapterStageErrorRecovery';

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

describe('ChapterStageErrorHandling Integration', () => {
  let errorHandler: ChapterStageErrorHandler;
  let mockScene: any;

  beforeEach(() => {
    mockScene = createMockScene();
    errorHandler = new ChapterStageErrorHandler(mockScene);
  });

  describe('エラーハンドリングとリカバリーの統合', () => {
    it('重大なエラーでリカバリーが自動的に開始される', async () => {
      const textMock = mockScene.add.text();
      textMock.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'pointerdown') {
          setTimeout(() => callback(), 0);
        }
      });

      const result = await errorHandler.handleError(
        ChapterStageError.SAVE_DATA_CORRUPTED,
        {}
      );

      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.action).toBe(RecoveryAction.RETURN_TO_TITLE);
      expect(mockScene.scene.start).toHaveBeenCalledWith('TitleScene');
    });

    it('セーブ失敗時にリカバリーオプションが提供される', async () => {
      const textMock = mockScene.add.text();
      textMock.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'pointerdown') {
          setTimeout(() => callback(), 0);
        }
      });

      const retrySaveListener = vi.fn();
      errorHandler.on('retry-save', retrySaveListener);

      const result = await errorHandler.handleError(
        ChapterStageError.SAVE_FAILED,
        { slotId: 1 }
      );

      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.action).toBe(RecoveryAction.RETRY);
      expect(retrySaveListener).toHaveBeenCalled();
    });

    it('エラーログが正しく記録される', async () => {
      await errorHandler.handleError(ChapterStageError.PARTY_FULL, {
        characterId: 'char-001',
      });

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog).toHaveLength(1);
      expect(errorLog[0].errorType).toBe(ChapterStageError.PARTY_FULL);
      expect(errorLog[0].context.characterId).toBe('char-001');
    });

    it('エラーイベントが発行される', async () => {
      const errorListener = vi.fn();
      errorHandler.on('error-occurred', errorListener);

      await errorHandler.handleError(ChapterStageError.STAGE_NOT_UNLOCKED, {
        stageId: 'stage-1-2',
      });

      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: ChapterStageError.STAGE_NOT_UNLOCKED,
          context: expect.objectContaining({
            stageId: 'stage-1-2',
          }),
        })
      );
    });
  });

  describe('エラーリカバリーマネージャーへのアクセス', () => {
    it('エラーリカバリーマネージャーを取得できる', () => {
      const recovery = errorHandler.getErrorRecovery();
      expect(recovery).toBeDefined();
      expect(recovery.isRecoveringNow()).toBe(false);
    });

    it('リトライカウントを管理できる', async () => {
      const textMock = mockScene.add.text();
      textMock.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'pointerdown') {
          setTimeout(() => callback(), 0);
        }
      });

      const recovery = errorHandler.getErrorRecovery();

      await errorHandler.handleError(ChapterStageError.SAVE_FAILED, {
        slotId: 1,
      });

      expect(recovery.getRetryCount('save_1')).toBe(1);

      recovery.resetRetryCount('save_1');
      expect(recovery.getRetryCount('save_1')).toBe(0);
    });
  });

  describe('複数のエラーの連続処理', () => {
    it('複数のエラーを順次処理できる', async () => {
      await errorHandler.handleError(ChapterStageError.PARTY_FULL, {});
      await errorHandler.handleError(ChapterStageError.CHARACTER_LOST, {
        characterId: 'char-001',
      });
      await errorHandler.handleError(ChapterStageError.STAGE_NOT_UNLOCKED, {
        stageId: 'stage-1-2',
      });

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog).toHaveLength(3);

      const statistics = errorHandler.getErrorStatistics();
      expect(statistics[ChapterStageError.PARTY_FULL]).toBe(1);
      expect(statistics[ChapterStageError.CHARACTER_LOST]).toBe(1);
      expect(statistics[ChapterStageError.STAGE_NOT_UNLOCKED]).toBe(1);
    });
  });

  describe('エラーハンドラーの破棄', () => {
    it('破棄時にリカバリーマネージャーも破棄される', () => {
      const recovery = errorHandler.getErrorRecovery();

      errorHandler.destroy();

      expect(errorHandler.getErrorLog()).toHaveLength(0);
      expect(recovery.isRecoveringNow()).toBe(false);
    });
  });

  describe('リカバリーイベントの伝播', () => {
    it('リカバリーイベントがエラーハンドラーに伝播される', async () => {
      const textMock = mockScene.add.text();
      textMock.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'pointerdown') {
          setTimeout(() => callback(), 0);
        }
      });

      const returnedListener = vi.fn();
      errorHandler.on('returned-to-title', returnedListener);

      await errorHandler.handleError(ChapterStageError.SAVE_DATA_CORRUPTED, {});

      expect(returnedListener).toHaveBeenCalled();
    });

    it('セーブスロット選択イベントが伝播される', async () => {
      const textMock = mockScene.add.text();
      textMock.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'pointerdown') {
          setTimeout(() => callback(), 0);
        }
      });

      const selectSlotListener = vi.fn();
      errorHandler.on('select-save-slot', selectSlotListener);

      await errorHandler.handleError(ChapterStageError.LOAD_FAILED, {});

      expect(selectSlotListener).toHaveBeenCalled();
    });
  });

  describe('エラーメッセージの表示', () => {
    it('エラーメッセージが表示される', async () => {
      await errorHandler.handleError(ChapterStageError.PARTY_FULL, {});

      expect(mockScene.add.rectangle).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();
    });

    it('エラーメッセージが自動的に閉じる', async () => {
      await errorHandler.handleError(ChapterStageError.CHARACTER_LOST, {});

      expect(mockScene.time.delayedCall).toHaveBeenCalledWith(
        3000,
        expect.any(Function)
      );
    });
  });
});
