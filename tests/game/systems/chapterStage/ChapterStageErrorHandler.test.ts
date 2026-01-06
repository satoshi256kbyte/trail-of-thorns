/**
 * ChapterStageErrorHandler Tests
 * 章・ステージ管理システムのエラーハンドラーのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChapterStageErrorHandler } from '../../../../game/src/systems/chapterStage/ChapterStageErrorHandler';
import { ChapterStageError } from '../../../../game/src/types/chapterStage';

describe('ChapterStageErrorHandler', () => {
  let errorHandler: ChapterStageErrorHandler;
  let notificationCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    errorHandler = new ChapterStageErrorHandler();
    notificationCallback = vi.fn();
    errorHandler.setNotificationCallback(notificationCallback);
  });

  describe('エラーハンドリング基本機能', () => {
    it('エラーを処理してログに記録する', () => {
      const result = errorHandler.handleError(ChapterStageError.CHAPTER_NOT_FOUND);

      expect(result.handled).toBe(true);
      expect(result.userMessage).toBeDefined();

      const log = errorHandler.getErrorLog();
      expect(log.length).toBe(1);
      expect(log[0].error).toBe(ChapterStageError.CHAPTER_NOT_FOUND);
    });

    it('通知コールバックが呼ばれる', () => {
      errorHandler.handleError(ChapterStageError.PARTY_FULL);

      expect(notificationCallback).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
    });

    it('エラーログを取得できる', () => {
      errorHandler.handleError(ChapterStageError.CHAPTER_NOT_FOUND);
      errorHandler.handleError(ChapterStageError.PARTY_FULL);

      const log = errorHandler.getErrorLog();
      expect(log.length).toBe(2);
    });

    it('エラーログをクリアできる', () => {
      errorHandler.handleError(ChapterStageError.CHAPTER_NOT_FOUND);
      errorHandler.clearErrorLog();

      const log = errorHandler.getErrorLog();
      expect(log.length).toBe(0);
    });
  });

  describe('章管理エラー', () => {
    it('CHAPTER_NOT_FOUND: タイトル画面に戻るアクションを返す', () => {
      const result = errorHandler.handleError(ChapterStageError.CHAPTER_NOT_FOUND);

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(false);
      expect(result.action).toBe('RETURN_TO_TITLE');
    });

    it('CHAPTER_NOT_UNLOCKED: 解放条件を表示するアクションを返す', () => {
      const result = errorHandler.handleError(ChapterStageError.CHAPTER_NOT_UNLOCKED);

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(true);
      expect(result.action).toBe('SHOW_CONDITIONS');
    });

    it('CHAPTER_ALREADY_STARTED: 継続アクションを返す', () => {
      const result = errorHandler.handleError(ChapterStageError.CHAPTER_ALREADY_STARTED);

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(true);
      expect(result.action).toBe('CONTINUE');
    });
  });

  describe('パーティ編成エラー', () => {
    it('PARTY_FULL: 適切なメッセージを表示', () => {
      const result = errorHandler.handleError(ChapterStageError.PARTY_FULL);

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(true);
      expect(result.userMessage).toContain('満員');
      expect(notificationCallback).toHaveBeenCalledWith(
        expect.stringContaining('満員'),
        expect.any(String),
        'warning'
      );
    });

    it('CHARACTER_LOST: キャラクターIDを含むメッセージを表示', () => {
      const result = errorHandler.handleError(ChapterStageError.CHARACTER_LOST, {
        characterId: 'char-001',
      });

      expect(result.handled).toBe(true);
      expect(result.userMessage).toContain('char-001');
    });

    it('CHARACTER_DUPLICATE: 重複エラーメッセージを表示', () => {
      const result = errorHandler.handleError(ChapterStageError.CHARACTER_DUPLICATE);

      expect(result.handled).toBe(true);
      expect(result.userMessage).toContain('重複');
    });

    it('INVALID_PARTY_COMPOSITION: 詳細エラーを含むメッセージを表示', () => {
      const result = errorHandler.handleError(ChapterStageError.INVALID_PARTY_COMPOSITION, {
        errors: ['エラー1', 'エラー2'],
      });

      expect(result.handled).toBe(true);
      expect(result.userMessage).toContain('エラー1');
      expect(result.userMessage).toContain('エラー2');
    });
  });

  describe('ステージ進行エラー', () => {
    it('STAGE_NOT_FOUND: タイトル画面に戻るアクションを返す', () => {
      const result = errorHandler.handleError(ChapterStageError.STAGE_NOT_FOUND);

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(false);
      expect(result.action).toBe('RETURN_TO_TITLE');
    });

    it('STAGE_NOT_UNLOCKED: 解放条件を表示', () => {
      const result = errorHandler.handleError(ChapterStageError.STAGE_NOT_UNLOCKED, {
        stageId: 'stage-1-2',
        requiredStageIds: ['stage-1-1'],
      });

      expect(result.handled).toBe(true);
      expect(result.action).toBe('SHOW_CONDITIONS');
      expect(notificationCallback).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('stage-1-1'),
        'warning'
      );
    });

    it('STAGE_ALREADY_COMPLETED: 情報メッセージを表示', () => {
      const result = errorHandler.handleError(ChapterStageError.STAGE_ALREADY_COMPLETED);

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(true);
      expect(notificationCallback).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'info'
      );
    });
  });

  describe('セーブ・ロードエラー', () => {
    it('SAVE_DATA_CORRUPTED: タイトル画面に戻る', () => {
      const result = errorHandler.handleError(ChapterStageError.SAVE_DATA_CORRUPTED);

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(false);
      expect(result.action).toBe('RETURN_TO_TITLE');
    });

    it('SAVE_FAILED: 再試行アクションを返す', () => {
      const result = errorHandler.handleError(ChapterStageError.SAVE_FAILED);

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(true);
      expect(result.action).toBe('RETRY');
    });

    it('LOAD_FAILED: タイトル画面に戻る', () => {
      const result = errorHandler.handleError(ChapterStageError.LOAD_FAILED);

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(false);
      expect(result.action).toBe('RETURN_TO_TITLE');
    });

    it('SAVE_SLOT_NOT_FOUND: スロットIDを含むメッセージを表示', () => {
      const result = errorHandler.handleError(ChapterStageError.SAVE_SLOT_NOT_FOUND, {
        slotId: 3,
      });

      expect(result.handled).toBe(true);
      expect(result.userMessage).toContain('3');
    });
  });

  describe('データエラー', () => {
    it('DATA_LOAD_FAILED: データタイプを含むメッセージを表示', () => {
      const result = errorHandler.handleError(ChapterStageError.DATA_LOAD_FAILED, {
        dataType: '章データ',
      });

      expect(result.handled).toBe(true);
      expect(result.userMessage).toContain('章データ');
    });

    it('DATA_VALIDATION_FAILED: 検証エラーを含むメッセージを表示', () => {
      const result = errorHandler.handleError(ChapterStageError.DATA_VALIDATION_FAILED, {
        validationErrors: ['必須フィールドが不足', 'フォーマットエラー'],
      });

      expect(result.handled).toBe(true);
      expect(notificationCallback).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('必須フィールドが不足'),
        'error'
      );
    });
  });

  describe('ChapterStageResult処理', () => {
    it('成功した結果はnullを返す', () => {
      const result = errorHandler.handleResult({
        success: true,
        message: '成功',
      });

      expect(result).toBeNull();
    });

    it('エラーを含む結果を処理', () => {
      const result = errorHandler.handleResult({
        success: false,
        error: ChapterStageError.PARTY_FULL,
        message: 'パーティが満員です',
      });

      expect(result).not.toBeNull();
      expect(result?.handled).toBe(true);
    });

    it('エラータイプなしの失敗結果を処理', () => {
      const result = errorHandler.handleResult({
        success: false,
        message: 'エラーが発生しました',
      });

      expect(result).not.toBeNull();
      expect(result?.handled).toBe(true);
      expect(result?.userMessage).toBe('エラーが発生しました');
    });
  });

  describe('エラーログ管理', () => {
    it('最大ログサイズを超えると古いログが削除される', () => {
      // 最大ログサイズは100
      for (let i = 0; i < 105; i++) {
        errorHandler.handleError(ChapterStageError.CHAPTER_NOT_FOUND);
      }

      const log = errorHandler.getErrorLog();
      expect(log.length).toBe(100);
    });

    it('制限付きでログを取得できる', () => {
      for (let i = 0; i < 10; i++) {
        errorHandler.handleError(ChapterStageError.CHAPTER_NOT_FOUND);
      }

      const log = errorHandler.getErrorLog(5);
      expect(log.length).toBe(5);
    });

    it('エラーログにタイムスタンプが含まれる', () => {
      errorHandler.handleError(ChapterStageError.CHAPTER_NOT_FOUND);

      const log = errorHandler.getErrorLog();
      expect(log[0].timestamp).toBeDefined();
      expect(typeof log[0].timestamp).toBe('number');
    });
  });

  describe('通知コールバックなし', () => {
    it('コールバックなしでもエラーを処理できる', () => {
      const handlerWithoutCallback = new ChapterStageErrorHandler();

      const result = handlerWithoutCallback.handleError(ChapterStageError.PARTY_FULL);

      expect(result.handled).toBe(true);
      // コンソール警告が出力されるが、エラーは発生しない
    });
  });
});
