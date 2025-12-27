/**
 * VictoryConditionErrorHandler テストスイート
 * 
 * エラーハンドリングとユーザーフィードバックシステムのテスト
 * 要件12.1, 12.2, 12.3, 12.4, 12.5に対応
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  VictoryConditionErrorHandler,
  VictoryConditionError,
  ErrorNotification,
} from '../../../../game/src/systems/victory/VictoryConditionErrorHandler';
import { ObjectiveType } from '../../../../game/src/types/victory';
import { ClearRating } from '../../../../game/src/types/reward';

describe('VictoryConditionErrorHandler', () => {
  let errorHandler: VictoryConditionErrorHandler;
  let notificationCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    errorHandler = new VictoryConditionErrorHandler();
    notificationCallback = vi.fn();
    errorHandler.setNotificationCallback(notificationCallback);
  });

  describe('handleError - 基本機能', () => {
    test('エラーを処理してログに記録する', () => {
      const result = errorHandler.handleError(VictoryConditionError.INVALID_OBJECTIVE_DATA, {
        message: 'Test error',
        details: { test: 'data' },
      });

      expect(result.handled).toBe(true);
      expect(errorHandler.getErrorLog()).toHaveLength(1);

      const latestError = errorHandler.getLatestError();
      expect(latestError).not.toBeNull();
      expect(latestError!.error).toBe(VictoryConditionError.INVALID_OBJECTIVE_DATA);
      expect(latestError!.message).toBe('Test error');
    });

    test('複数のエラーを記録できる', () => {
      errorHandler.handleError(VictoryConditionError.INVALID_OBJECTIVE_DATA, {
        message: 'Error 1',
      });
      errorHandler.handleError(VictoryConditionError.INVALID_BOSS_DATA, {
        message: 'Error 2',
      });
      errorHandler.handleError(VictoryConditionError.REWARD_CALCULATION_FAILED, {
        message: 'Error 3',
      });

      expect(errorHandler.getErrorLog()).toHaveLength(3);
    });
  });

  describe('handleInvalidObjectiveData - 要件12.1', () => {
    test('不正な目標データのエラーを処理する', () => {
      const result = errorHandler.handleError(VictoryConditionError.INVALID_OBJECTIVE_DATA, {
        message: 'Invalid objective data',
        details: { objectiveId: 'test-objective' },
      });

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(true);
      expect(result.fallbackApplied).toBe(true);
      expect(result.message).toBe('Applied default objective');
    });

    test('デフォルト目標を提供する', () => {
      errorHandler.handleError(VictoryConditionError.INVALID_OBJECTIVE_DATA, {
        message: 'Invalid objective data',
      });

      const defaultObjective = errorHandler.getDefaultObjective();
      expect(defaultObjective.id).toBe('default_objective');
      expect(defaultObjective.type).toBe(ObjectiveType.DEFEAT_ALL_ENEMIES);
      expect(defaultObjective.isRequired).toBe(true);
    });

    test('ユーザーに通知を送信する', () => {
      errorHandler.handleError(VictoryConditionError.INVALID_OBJECTIVE_DATA, {
        message: 'Invalid objective data',
      });

      expect(notificationCallback).toHaveBeenCalledTimes(1);
      const notification: ErrorNotification = notificationCallback.mock.calls[0][0];
      expect(notification.title).toBe('目標データエラー');
      expect(notification.severity).toBe('warning');
      expect(notification.actions).toHaveLength(1);
    });
  });

  describe('handleInvalidBossData - 要件12.2', () => {
    test('不正なボスデータのエラーを処理する', () => {
      const result = errorHandler.handleError(VictoryConditionError.INVALID_BOSS_DATA, {
        message: 'Invalid boss data',
        details: { bossId: 'test-boss' },
      });

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(true);
      expect(result.fallbackApplied).toBe(true);
      expect(result.message).toBe('Continuing without boss data');
    });

    test('ユーザーに通知を送信する', () => {
      errorHandler.handleError(VictoryConditionError.INVALID_BOSS_DATA, {
        message: 'Invalid boss data',
      });

      expect(notificationCallback).toHaveBeenCalledTimes(1);
      const notification: ErrorNotification = notificationCallback.mock.calls[0][0];
      expect(notification.title).toBe('ボスデータエラー');
      expect(notification.severity).toBe('warning');
    });
  });

  describe('handleRewardCalculationFailure - 要件12.3', () => {
    test('報酬計算失敗のエラーを処理する', () => {
      const result = errorHandler.handleError(VictoryConditionError.REWARD_CALCULATION_FAILED, {
        message: 'Reward calculation failed',
        details: { stageId: 'test-stage' },
      });

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(true);
      expect(result.fallbackApplied).toBe(true);
      expect(result.message).toBe('Applied default rewards');
    });

    test('デフォルト報酬を提供する', () => {
      errorHandler.handleError(VictoryConditionError.REWARD_CALCULATION_FAILED, {
        message: 'Reward calculation failed',
      });

      const defaultRewards = errorHandler.getDefaultRewards();
      expect(defaultRewards.baseExperience).toBe(100);
      expect(defaultRewards.clearRatingBonus.rating).toBe(ClearRating.C);
      expect(defaultRewards.bossRewards).toEqual([]);
    });

    test('ユーザーに通知を送信する', () => {
      errorHandler.handleError(VictoryConditionError.REWARD_CALCULATION_FAILED, {
        message: 'Reward calculation failed',
      });

      expect(notificationCallback).toHaveBeenCalledTimes(1);
      const notification: ErrorNotification = notificationCallback.mock.calls[0][0];
      expect(notification.title).toBe('報酬計算エラー');
      expect(notification.severity).toBe('warning');
    });
  });

  describe('handleSystemIntegrationError - 要件12.4', () => {
    test('システム統合エラーを処理する', () => {
      const result = errorHandler.handleError(VictoryConditionError.SYSTEM_INTEGRATION_ERROR, {
        message: 'System integration failed',
        details: { system: 'BattleSystem' },
      });

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(false);
      expect(result.fallbackApplied).toBe(false);
      expect(result.message).toBe('System integration error logged');
    });

    test('エラーログに記録する', () => {
      errorHandler.handleError(VictoryConditionError.SYSTEM_INTEGRATION_ERROR, {
        message: 'System integration failed',
      });

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog).toHaveLength(1);
      expect(errorLog[0].error).toBe(VictoryConditionError.SYSTEM_INTEGRATION_ERROR);
    });

    test('ユーザーに通知を送信する', () => {
      errorHandler.handleError(VictoryConditionError.SYSTEM_INTEGRATION_ERROR, {
        message: 'System integration failed',
      });

      expect(notificationCallback).toHaveBeenCalledTimes(1);
      const notification: ErrorNotification = notificationCallback.mock.calls[0][0];
      expect(notification.title).toBe('システムエラー');
      expect(notification.severity).toBe('error');
      expect(notification.actions).toHaveLength(2); // 続行と再試行
    });
  });

  describe('handleUIDisplayError', () => {
    test('UI表示エラーを処理する', () => {
      const result = errorHandler.handleError(VictoryConditionError.UI_DISPLAY_ERROR, {
        message: 'UI display failed',
      });

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(false);
      expect(result.message).toBe('UI display error handled');
    });

    test('ユーザーに通知を送信する', () => {
      errorHandler.handleError(VictoryConditionError.UI_DISPLAY_ERROR, {
        message: 'UI display failed',
      });

      expect(notificationCallback).toHaveBeenCalledTimes(1);
      const notification: ErrorNotification = notificationCallback.mock.calls[0][0];
      expect(notification.title).toBe('UI表示エラー');
      expect(notification.severity).toBe('warning');
    });
  });

  describe('handleDataPersistenceError', () => {
    test('データ永続化エラーを処理する', () => {
      const result = errorHandler.handleError(VictoryConditionError.DATA_PERSISTENCE_ERROR, {
        message: 'Data persistence failed',
      });

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(false);
      expect(result.message).toBe('Data persistence error handled');
    });

    test('ユーザーに通知を送信する', () => {
      errorHandler.handleError(VictoryConditionError.DATA_PERSISTENCE_ERROR, {
        message: 'Data persistence failed',
      });

      expect(notificationCallback).toHaveBeenCalledTimes(1);
      const notification: ErrorNotification = notificationCallback.mock.calls[0][0];
      expect(notification.title).toBe('データ保存エラー');
      expect(notification.severity).toBe('error');
      expect(notification.actions).toHaveLength(2); // 再試行と続行
    });
  });

  describe('エラーログ管理', () => {
    test('エラーログを取得できる', () => {
      errorHandler.handleError(VictoryConditionError.INVALID_OBJECTIVE_DATA, {
        message: 'Error 1',
      });
      errorHandler.handleError(VictoryConditionError.INVALID_BOSS_DATA, {
        message: 'Error 2',
      });

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog).toHaveLength(2);
      expect(errorLog[0].message).toBe('Error 1');
      expect(errorLog[1].message).toBe('Error 2');
    });

    test('エラーログをクリアできる', () => {
      errorHandler.handleError(VictoryConditionError.INVALID_OBJECTIVE_DATA, {
        message: 'Error 1',
      });
      errorHandler.handleError(VictoryConditionError.INVALID_BOSS_DATA, {
        message: 'Error 2',
      });

      expect(errorHandler.getErrorLog()).toHaveLength(2);

      errorHandler.clearErrorLog();

      expect(errorHandler.getErrorLog()).toHaveLength(0);
      expect(errorHandler.getLatestError()).toBeNull();
    });

    test('最新のエラーを取得できる', () => {
      errorHandler.handleError(VictoryConditionError.INVALID_OBJECTIVE_DATA, {
        message: 'Error 1',
      });
      errorHandler.handleError(VictoryConditionError.INVALID_BOSS_DATA, {
        message: 'Error 2',
      });

      const latestError = errorHandler.getLatestError();
      expect(latestError).not.toBeNull();
      expect(latestError!.message).toBe('Error 2');
      expect(latestError!.error).toBe(VictoryConditionError.INVALID_BOSS_DATA);
    });

    test('特定種別のエラーを取得できる', () => {
      errorHandler.handleError(VictoryConditionError.INVALID_OBJECTIVE_DATA, {
        message: 'Error 1',
      });
      errorHandler.handleError(VictoryConditionError.INVALID_BOSS_DATA, {
        message: 'Error 2',
      });
      errorHandler.handleError(VictoryConditionError.INVALID_OBJECTIVE_DATA, {
        message: 'Error 3',
      });

      const objectiveErrors = errorHandler.getErrorsByType(
        VictoryConditionError.INVALID_OBJECTIVE_DATA
      );
      expect(objectiveErrors).toHaveLength(2);
      expect(objectiveErrors[0].message).toBe('Error 1');
      expect(objectiveErrors[1].message).toBe('Error 3');
    });
  });

  describe('エラー統計', () => {
    test('回復可能なエラーの数を取得できる', () => {
      errorHandler.handleError(VictoryConditionError.INVALID_OBJECTIVE_DATA, {
        message: 'Recoverable 1',
        recoverable: true,
      });
      errorHandler.handleError(VictoryConditionError.SYSTEM_INTEGRATION_ERROR, {
        message: 'Unrecoverable 1',
        recoverable: false,
      });
      errorHandler.handleError(VictoryConditionError.REWARD_CALCULATION_FAILED, {
        message: 'Recoverable 2',
        recoverable: true,
      });

      expect(errorHandler.getRecoverableErrorCount()).toBe(2);
    });

    test('回復不可能なエラーの数を取得できる', () => {
      errorHandler.handleError(VictoryConditionError.INVALID_OBJECTIVE_DATA, {
        message: 'Recoverable 1',
        recoverable: true,
      });
      errorHandler.handleError(VictoryConditionError.SYSTEM_INTEGRATION_ERROR, {
        message: 'Unrecoverable 1',
        recoverable: false,
      });
      errorHandler.handleError(VictoryConditionError.DATA_PERSISTENCE_ERROR, {
        message: 'Unrecoverable 2',
        recoverable: false,
      });

      expect(errorHandler.getUnrecoverableErrorCount()).toBe(2);
    });
  });

  describe('通知コールバック', () => {
    test('通知コールバックが設定されていない場合でもエラーを処理できる', () => {
      const handlerWithoutCallback = new VictoryConditionErrorHandler();

      const result = handlerWithoutCallback.handleError(
        VictoryConditionError.INVALID_OBJECTIVE_DATA,
        {
          message: 'Test error',
        }
      );

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(true);
    });

    test('通知コールバックを設定できる', () => {
      const newCallback = vi.fn();
      errorHandler.setNotificationCallback(newCallback);

      errorHandler.handleError(VictoryConditionError.INVALID_OBJECTIVE_DATA, {
        message: 'Test error',
      });

      expect(newCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('フォールバック機能 - 要件12.3', () => {
    test('デフォルト目標は独立したインスタンスを返す', () => {
      const objective1 = errorHandler.getDefaultObjective();
      const objective2 = errorHandler.getDefaultObjective();

      expect(objective1).not.toBe(objective2);
      expect(objective1).toEqual(objective2);

      // 変更が他のインスタンスに影響しないことを確認
      objective1.isComplete = true;
      expect(objective2.isComplete).toBe(false);
    });

    test('デフォルト報酬は独立したインスタンスを返す', () => {
      const rewards1 = errorHandler.getDefaultRewards();
      const rewards2 = errorHandler.getDefaultRewards();

      expect(rewards1).not.toBe(rewards2);
      expect(rewards1).toEqual(rewards2);

      // 変更が他のインスタンスに影響しないことを確認
      rewards1.baseExperience = 200;
      expect(rewards2.baseExperience).toBe(100);
    });
  });

  describe('エラーコンテキスト', () => {
    test('エラーコンテキストにタイムスタンプが含まれる', () => {
      const beforeTimestamp = Date.now();
      errorHandler.handleError(VictoryConditionError.INVALID_OBJECTIVE_DATA, {
        message: 'Test error',
      });
      const afterTimestamp = Date.now();

      const latestError = errorHandler.getLatestError();
      expect(latestError).not.toBeNull();
      expect(latestError!.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(latestError!.timestamp).toBeLessThanOrEqual(afterTimestamp);
    });

    test('エラーコンテキストに詳細情報が含まれる', () => {
      const details = { stageId: 'test-stage', objectiveId: 'test-objective' };
      errorHandler.handleError(VictoryConditionError.INVALID_OBJECTIVE_DATA, {
        message: 'Test error',
        details,
      });

      const latestError = errorHandler.getLatestError();
      expect(latestError).not.toBeNull();
      expect(latestError!.details).toEqual(details);
    });

    test('デフォルトで回復可能フラグがtrueになる', () => {
      errorHandler.handleError(VictoryConditionError.INVALID_OBJECTIVE_DATA, {
        message: 'Test error',
      });

      const latestError = errorHandler.getLatestError();
      expect(latestError).not.toBeNull();
      expect(latestError!.recoverable).toBe(true);
    });
  });
});
