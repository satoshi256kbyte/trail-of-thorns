/**
 * ChapterStageRecoveryManager Unit Tests
 * 章・ステージ管理システムのエラーリカバリーマネージャーのテスト
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { ChapterStageRecoveryManager, RecoveryCallbacks, RecoveryContext } from '../../../../game/src/systems/chapterStage/ChapterStageRecoveryManager';
import { ErrorHandlingResult } from '../../../../game/src/systems/chapterStage/ChapterStageErrorHandler';
import { ChapterStageError, ChapterState, SaveData } from '../../../../game/src/types/chapterStage';

describe('ChapterStageRecoveryManager', () => {
  let recoveryManager: ChapterStageRecoveryManager;
  let mockCallbacks: RecoveryCallbacks;

  beforeEach(() => {
    // モックコールバックを作成
    mockCallbacks = {
      onReturnToTitle: vi.fn(),
      onRetry: vi.fn().mockResolvedValue(true),
      onShowConditions: vi.fn(),
      onRecoveryComplete: vi.fn(),
    };

    recoveryManager = new ChapterStageRecoveryManager(undefined, undefined, mockCallbacks);
  });

  describe('初期化', () => {
    test('デフォルト設定で初期化される', () => {
      const manager = new ChapterStageRecoveryManager();
      expect(manager).toBeDefined();
      expect(manager.getAllSafeStates()).toHaveLength(0);
    });

    test('カスタム設定で初期化される', () => {
      const config = {
        autoRecovery: false,
        maxRetries: 5,
        maxSafeStates: 10,
      };
      const manager = new ChapterStageRecoveryManager(undefined, config);
      expect(manager).toBeDefined();
    });

    test('コールバックを後から設定できる', () => {
      const manager = new ChapterStageRecoveryManager();
      const callbacks: RecoveryCallbacks = {
        onReturnToTitle: vi.fn(),
      };
      manager.setCallbacks(callbacks);
      expect(manager).toBeDefined();
    });
  });

  describe('セーフステート管理', () => {
    test('章状態をセーフステートとして保存できる', () => {
      const chapterState: ChapterState = {
        chapterId: 'chapter-1',
        currentStageIndex: 0,
        lostCharacterIds: [],
        availableCharacterIds: ['char-1', 'char-2'],
        completedStageIds: [],
        isCompleted: false,
        startTime: Date.now(),
        playTime: 0,
      };

      recoveryManager.saveSafeState(chapterState, 'Test chapter state');

      const safeStates = recoveryManager.getAllSafeStates();
      expect(safeStates).toHaveLength(1);
      expect(safeStates[0].chapterState).toEqual(chapterState);
      expect(safeStates[0].description).toBe('Test chapter state');
    });

    test('セーブデータをセーフステートとして保存できる', () => {
      const saveData: SaveData = {
        version: '1.0.0',
        timestamp: Date.now(),
        chapterStates: [],
        globalProgress: {
          unlockedChapterIds: ['chapter-1'],
          totalPlayTime: 0,
          lastPlayedChapterId: 'chapter-1',
        },
      };

      recoveryManager.saveSafeState(saveData, 'Test save data');

      const safeStates = recoveryManager.getAllSafeStates();
      expect(safeStates).toHaveLength(1);
      expect(safeStates[0].saveData).toEqual(saveData);
    });

    test('最新のセーフステートを取得できる', () => {
      const state1: ChapterState = {
        chapterId: 'chapter-1',
        currentStageIndex: 0,
        lostCharacterIds: [],
        availableCharacterIds: [],
        completedStageIds: [],
        isCompleted: false,
        startTime: Date.now(),
        playTime: 0,
      };

      const state2: ChapterState = {
        ...state1,
        currentStageIndex: 1,
      };

      recoveryManager.saveSafeState(state1, 'State 1');
      recoveryManager.saveSafeState(state2, 'State 2');

      const latest = recoveryManager.getLatestSafeState();
      expect(latest).toBeDefined();
      expect(latest?.chapterState?.currentStageIndex).toBe(1);
      expect(latest?.description).toBe('State 2');
    });

    test('セーフステートが存在しない場合はnullを返す', () => {
      const latest = recoveryManager.getLatestSafeState();
      expect(latest).toBeNull();
    });

    test('最大保持数を超えたセーフステートは削除される', () => {
      const config = { maxSafeStates: 3 };
      const manager = new ChapterStageRecoveryManager(undefined, config);

      for (let i = 0; i < 5; i++) {
        const state: ChapterState = {
          chapterId: `chapter-${i}`,
          currentStageIndex: i,
          lostCharacterIds: [],
          availableCharacterIds: [],
          completedStageIds: [],
          isCompleted: false,
          startTime: Date.now(),
          playTime: 0,
        };
        manager.saveSafeState(state, `State ${i}`);
      }

      const safeStates = manager.getAllSafeStates();
      expect(safeStates).toHaveLength(3);
      expect(safeStates[0].description).toBe('State 2');
      expect(safeStates[2].description).toBe('State 4');
    });

    test('セーフステートをクリアできる', () => {
      const state: ChapterState = {
        chapterId: 'chapter-1',
        currentStageIndex: 0,
        lostCharacterIds: [],
        availableCharacterIds: [],
        completedStageIds: [],
        isCompleted: false,
        startTime: Date.now(),
        playTime: 0,
      };

      recoveryManager.saveSafeState(state, 'Test state');
      expect(recoveryManager.getAllSafeStates()).toHaveLength(1);

      recoveryManager.clearSafeStates();
      expect(recoveryManager.getAllSafeStates()).toHaveLength(0);
    });
  });

  describe('タイトル画面への復帰', () => {
    test('RETURN_TO_TITLEアクションでタイトル画面に戻る', async () => {
      const errorResult: ErrorHandlingResult = {
        handled: true,
        recovered: false,
        action: 'RETURN_TO_TITLE',
        userMessage: 'Critical error',
      };

      const result = await recoveryManager.recoverFromError(errorResult);

      expect(result.success).toBe(true);
      expect(result.action).toBe('RETURN_TO_TITLE');
      expect(mockCallbacks.onReturnToTitle).toHaveBeenCalled();
      expect(mockCallbacks.onRecoveryComplete).toHaveBeenCalled();
    });

    test('タイトル画面に戻るとセーフステートがクリアされる', async () => {
      const state: ChapterState = {
        chapterId: 'chapter-1',
        currentStageIndex: 0,
        lostCharacterIds: [],
        availableCharacterIds: [],
        completedStageIds: [],
        isCompleted: false,
        startTime: Date.now(),
        playTime: 0,
      };

      recoveryManager.saveSafeState(state, 'Test state');
      expect(recoveryManager.getAllSafeStates()).toHaveLength(1);

      const errorResult: ErrorHandlingResult = {
        handled: true,
        recovered: false,
        action: 'RETURN_TO_TITLE',
      };

      await recoveryManager.recoverFromError(errorResult);

      expect(recoveryManager.getAllSafeStates()).toHaveLength(0);
    });

    test('タイトル画面に戻ると再試行カウンターがリセットされる', async () => {
      // 再試行が失敗するようにモックを設定
      mockCallbacks.onRetry = vi.fn().mockResolvedValue(false);
      const manager = new ChapterStageRecoveryManager(undefined, undefined, mockCallbacks);

      const errorResult: ErrorHandlingResult = {
        handled: true,
        recovered: false,
        action: 'RETRY',
      };

      // 再試行を実行してカウンターを増やす
      await manager.recoverFromError(errorResult);
      expect(manager.getRetryCount(ChapterStageError.DATA_LOAD_FAILED)).toBeGreaterThan(0);

      // タイトルに戻る
      const titleResult: ErrorHandlingResult = {
        handled: true,
        recovered: false,
        action: 'RETURN_TO_TITLE',
      };

      await manager.recoverFromError(titleResult);

      expect(manager.getRetryCount(ChapterStageError.DATA_LOAD_FAILED)).toBe(0);
    });
  });

  describe('再試行機能', () => {
    test('RETRYアクションで再試行が実行される', async () => {
      const errorResult: ErrorHandlingResult = {
        handled: true,
        recovered: true,
        action: 'RETRY',
        userMessage: 'Retry error',
      };

      const result = await recoveryManager.recoverFromError(errorResult);

      expect(result.success).toBe(true);
      expect(result.action).toBe('RETRY');
      expect(mockCallbacks.onRetry).toHaveBeenCalled();
      expect(mockCallbacks.onRecoveryComplete).toHaveBeenCalled();
    });

    test('再試行成功時にカウンターがリセットされる', async () => {
      mockCallbacks.onRetry = vi.fn().mockResolvedValue(true);
      const manager = new ChapterStageRecoveryManager(undefined, undefined, mockCallbacks);

      const errorResult: ErrorHandlingResult = {
        handled: true,
        recovered: true,
        action: 'RETRY',
      };

      await manager.recoverFromError(errorResult);

      expect(manager.getRetryCount(ChapterStageError.DATA_LOAD_FAILED)).toBe(0);
    });

    test('再試行失敗時にカウンターが増加する', async () => {
      mockCallbacks.onRetry = vi.fn().mockResolvedValue(false);
      const manager = new ChapterStageRecoveryManager(undefined, undefined, mockCallbacks);

      const errorResult: ErrorHandlingResult = {
        handled: true,
        recovered: true,
        action: 'RETRY',
      };

      await manager.recoverFromError(errorResult);

      expect(manager.getRetryCount(ChapterStageError.DATA_LOAD_FAILED)).toBe(1);
    });

    test('最大再試行回数に達するとタイトル画面に戻る', async () => {
      mockCallbacks.onRetry = vi.fn().mockResolvedValue(false);
      const config = { maxRetries: 2 };
      const manager = new ChapterStageRecoveryManager(undefined, config, mockCallbacks);

      const errorResult: ErrorHandlingResult = {
        handled: true,
        recovered: true,
        action: 'RETRY',
      };

      // 1回目の再試行
      const result1 = await manager.recoverFromError(errorResult);
      expect(result1.action).toBe('RETRY');
      expect(manager.getRetryCount(ChapterStageError.DATA_LOAD_FAILED)).toBe(1);

      // 2回目の再試行
      const result2 = await manager.recoverFromError(errorResult);
      expect(result2.action).toBe('RETURN_TO_TITLE'); // 2回目で既に上限に達する
      expect(mockCallbacks.onReturnToTitle).toHaveBeenCalled();
    });

    test('再試行カウンターを手動でリセットできる', () => {
      const errorResult: ErrorHandlingResult = {
        handled: true,
        recovered: true,
        action: 'RETRY',
      };

      recoveryManager.recoverFromError(errorResult);
      expect(recoveryManager.getRetryCount(ChapterStageError.DATA_LOAD_FAILED)).toBeGreaterThan(0);

      recoveryManager.resetRetryCount(ChapterStageError.DATA_LOAD_FAILED);
      expect(recoveryManager.getRetryCount(ChapterStageError.DATA_LOAD_FAILED)).toBe(0);
    });

    test('全ての再試行カウンターをリセットできる', async () => {
      mockCallbacks.onRetry = vi.fn().mockResolvedValue(false);
      const manager = new ChapterStageRecoveryManager(undefined, undefined, mockCallbacks);

      const errorResult: ErrorHandlingResult = {
        handled: true,
        recovered: true,
        action: 'RETRY',
      };

      await manager.recoverFromError(errorResult);
      expect(manager.getRetryCount(ChapterStageError.DATA_LOAD_FAILED)).toBeGreaterThan(0);

      manager.resetRetryCount();
      expect(manager.getRetryCount(ChapterStageError.DATA_LOAD_FAILED)).toBe(0);
    });
  });

  describe('現在の状態で続行', () => {
    test('CONTINUEアクションで現在の状態を維持する', async () => {
      const errorResult: ErrorHandlingResult = {
        handled: true,
        recovered: true,
        action: 'CONTINUE',
        userMessage: 'Continue with current state',
      };

      const result = await recoveryManager.recoverFromError(errorResult);

      expect(result.success).toBe(true);
      expect(result.action).toBe('CONTINUE');
      expect(mockCallbacks.onRecoveryComplete).toHaveBeenCalled();
    });

    test('セーフステートが存在する場合は復元される', async () => {
      const state: ChapterState = {
        chapterId: 'chapter-1',
        currentStageIndex: 2,
        lostCharacterIds: ['char-1'],
        availableCharacterIds: ['char-2', 'char-3'],
        completedStageIds: ['stage-1', 'stage-2'],
        isCompleted: false,
        startTime: Date.now(),
        playTime: 1000,
      };

      recoveryManager.saveSafeState(state, 'Test state');

      const errorResult: ErrorHandlingResult = {
        handled: true,
        recovered: true,
        action: 'CONTINUE',
      };

      const result = await recoveryManager.recoverFromError(errorResult);

      expect(result.success).toBe(true);
      expect(result.restoredState).toEqual(state);
    });
  });

  describe('条件表示', () => {
    test('SHOW_CONDITIONSアクションで条件が表示される', async () => {
      const errorResult: ErrorHandlingResult = {
        handled: true,
        recovered: true,
        action: 'SHOW_CONDITIONS',
        userMessage: 'Show unlock conditions',
      };

      const result = await recoveryManager.recoverFromError(errorResult);

      expect(result.success).toBe(true);
      expect(result.action).toBe('SHOW_CONDITIONS');
      expect(mockCallbacks.onShowConditions).toHaveBeenCalled();
      expect(mockCallbacks.onRecoveryComplete).toHaveBeenCalled();
    });
  });

  describe('リカバリー履歴', () => {
    test('リカバリー実行時に履歴が記録される', async () => {
      const errorResult: ErrorHandlingResult = {
        handled: true,
        recovered: true,
        action: 'CONTINUE',
      };

      await recoveryManager.recoverFromError(errorResult);

      const history = recoveryManager.getRecoveryHistory();
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('CONTINUE');
    });

    test('複数のリカバリーが履歴に記録される', async () => {
      const actions: Array<'CONTINUE' | 'RETRY' | 'SHOW_CONDITIONS'> = ['CONTINUE', 'RETRY', 'SHOW_CONDITIONS'];

      for (const action of actions) {
        const errorResult: ErrorHandlingResult = {
          handled: true,
          recovered: true,
          action,
        };
        await recoveryManager.recoverFromError(errorResult);
      }

      const history = recoveryManager.getRecoveryHistory();
      expect(history).toHaveLength(3);
      expect(history[0].action).toBe('CONTINUE');
      expect(history[1].action).toBe('RETRY');
      expect(history[2].action).toBe('SHOW_CONDITIONS');
    });

    test('履歴を制限付きで取得できる', async () => {
      for (let i = 0; i < 5; i++) {
        const errorResult: ErrorHandlingResult = {
          handled: true,
          recovered: true,
          action: 'CONTINUE',
        };
        await recoveryManager.recoverFromError(errorResult);
      }

      const history = recoveryManager.getRecoveryHistory(3);
      expect(history).toHaveLength(3);
    });

    test('履歴をクリアできる', async () => {
      const errorResult: ErrorHandlingResult = {
        handled: true,
        recovered: true,
        action: 'CONTINUE',
      };

      await recoveryManager.recoverFromError(errorResult);
      expect(recoveryManager.getRecoveryHistory()).toHaveLength(1);

      recoveryManager.clearRecoveryHistory();
      expect(recoveryManager.getRecoveryHistory()).toHaveLength(0);
    });
  });

  describe('リセット機能', () => {
    test('reset()で全ての状態がクリアされる', async () => {
      // セーフステートを保存
      const state: ChapterState = {
        chapterId: 'chapter-1',
        currentStageIndex: 0,
        lostCharacterIds: [],
        availableCharacterIds: [],
        completedStageIds: [],
        isCompleted: false,
        startTime: Date.now(),
        playTime: 0,
      };
      recoveryManager.saveSafeState(state, 'Test state');

      // リカバリーを実行
      const errorResult: ErrorHandlingResult = {
        handled: true,
        recovered: true,
        action: 'RETRY',
      };
      await recoveryManager.recoverFromError(errorResult);

      // リセット前の確認
      expect(recoveryManager.getAllSafeStates()).toHaveLength(1);
      expect(recoveryManager.getRecoveryHistory()).toHaveLength(1);

      // リセット
      recoveryManager.reset();

      // リセット後の確認
      expect(recoveryManager.getAllSafeStates()).toHaveLength(0);
      expect(recoveryManager.getRecoveryHistory()).toHaveLength(0);
      expect(recoveryManager.getRetryCount(ChapterStageError.DATA_LOAD_FAILED)).toBe(0);
    });
  });

  describe('エラーハンドリング', () => {
    test('アクションが指定されていない場合はエラーを返す', async () => {
      const errorResult: ErrorHandlingResult = {
        handled: true,
        recovered: false,
      };

      const result = await recoveryManager.recoverFromError(errorResult);

      expect(result.success).toBe(false);
      expect(result.message).toContain('リカバリーアクションが指定されていません');
    });

    test('コールバックでエラーが発生しても処理を続行する', async () => {
      const errorCallbacks: RecoveryCallbacks = {
        onReturnToTitle: vi.fn(() => {
          throw new Error('Callback error');
        }),
      };

      const manager = new ChapterStageRecoveryManager(undefined, undefined, errorCallbacks);

      const errorResult: ErrorHandlingResult = {
        handled: true,
        recovered: false,
        action: 'RETURN_TO_TITLE',
      };

      const result = await manager.recoverFromError(errorResult);

      // エラーが発生してもリカバリーは成功する
      expect(result.success).toBe(true);
      expect(result.action).toBe('RETURN_TO_TITLE');
    });

    test('再試行コールバックでエラーが発生した場合は失敗を返す', async () => {
      const errorCallbacks: RecoveryCallbacks = {
        onRetry: vi.fn().mockRejectedValue(new Error('Retry error')),
      };

      const manager = new ChapterStageRecoveryManager(undefined, undefined, errorCallbacks);

      const errorResult: ErrorHandlingResult = {
        handled: true,
        recovered: true,
        action: 'RETRY',
      };

      const result = await manager.recoverFromError(errorResult);

      expect(result.success).toBe(false);
      expect(result.message).toContain('再試行中にエラーが発生しました');
    });
  });
});
