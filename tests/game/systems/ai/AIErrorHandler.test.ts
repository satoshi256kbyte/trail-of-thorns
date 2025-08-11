/**
 * AIErrorHandler のユニットテスト
 * エラーハンドリングシステムの動作を検証
 */

import {
    AIErrorHandler,
    AIMemoryShortageError,
    AIUnexpectedError,
    withErrorHandling,
    executeAIActionSafely,
} from '../../../../game/src/systems/ai/AIErrorHandler';
import {
    AIError,
    AIThinkingTimeoutError,
    InvalidActionError,
    AIDataCorruptionError,
    AIErrorType,
    AIAction,
    ActionType,
    AIContext,
    Unit,
} from '../../../../game/src/types/ai';

// モックデータ
const createMockUnit = (overrides: Partial<Unit> = {}): Unit => ({
    id: 'test-unit-1',
    name: 'Test Unit',
    position: { x: 0, y: 0 },
    stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 20,
        defense: 15,
        speed: 10,
        movement: 3,
    },
    currentHP: 100,
    currentMP: 50,
    faction: 'enemy',
    hasActed: false,
    hasMoved: false,
    ...overrides,
});

const createMockContext = (overrides: Partial<AIContext> = {}): Partial<AIContext> => ({
    currentCharacter: createMockUnit(),
    visibleEnemies: [],
    visibleAllies: [],
    npcs: [],
    availableSkills: [],
    turnNumber: 1,
    difficultySettings: {
        thinkingDepth: 2,
        randomnessFactor: 0.1,
        mistakeProbability: 0.05,
        reactionTime: 500,
        skillUsageFrequency: 0.3,
        thinkingTimeLimit: 2000,
    },
    ...overrides,
});

const createMockAction = (overrides: Partial<AIAction> = {}): AIAction => ({
    type: ActionType.WAIT,
    priority: 50,
    reasoning: 'Test action',
    ...overrides,
});

describe('AIErrorHandler', () => {
    let errorHandler: AIErrorHandler;
    let mockUnit: Unit;
    let mockContext: Partial<AIContext>;

    beforeEach(() => {
        errorHandler = AIErrorHandler.getInstance();
        errorHandler.clearErrorLog();
        errorHandler.setEnabled(true);
        mockUnit = createMockUnit();
        mockContext = createMockContext();
    });

    describe('シングルトンパターン', () => {
        test('同じインスタンスを返すこと', () => {
            const instance1 = AIErrorHandler.getInstance();
            const instance2 = AIErrorHandler.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('エラーハンドラーの有効化/無効化', () => {
        test('有効化/無効化が正しく動作すること', () => {
            expect(errorHandler.isHandlerEnabled()).toBe(true);

            errorHandler.setEnabled(false);
            expect(errorHandler.isHandlerEnabled()).toBe(false);

            errorHandler.setEnabled(true);
            expect(errorHandler.isHandlerEnabled()).toBe(true);
        });

        test('無効化時はエラーをそのまま投げること', () => {
            errorHandler.setEnabled(false);
            const testError = new Error('Test error');

            expect(() => {
                errorHandler.handleError(testError, mockUnit, mockContext);
            }).toThrow('Test error');
        });
    });

    describe('思考タイムアウトエラーの処理', () => {
        test('思考タイムアウトエラーを正しく処理すること', () => {
            const recovery = errorHandler.handleThinkingTimeout(mockUnit, 3000, mockContext);

            expect(recovery.type).toBe('fallback');
            expect(recovery.action.type).toBe(ActionType.WAIT);
            expect(recovery.action.priority).toBe(0);
            expect(recovery.description).toContain('thinking timeout');
        });

        test('思考タイムアウトエラーが統計に記録されること', () => {
            errorHandler.handleThinkingTimeout(mockUnit, 3000, mockContext);

            const stats = errorHandler.getStatistics();
            expect(stats.totalErrors).toBe(1);
            expect(stats.errorsByType[AIErrorType.THINKING_TIMEOUT]).toBe(1);
        });
    });

    describe('無効な行動エラーの処理', () => {
        test('無効な行動エラーを正しく処理すること', () => {
            const invalidAction = createMockAction({ type: ActionType.ATTACK });
            const recovery = errorHandler.handleInvalidAction(
                invalidAction,
                mockUnit,
                'Target out of range',
                mockContext
            );

            expect(recovery.type).toBe('retry');
            expect(recovery.action.type).toBe(ActionType.WAIT); // 代替行動
            expect(recovery.description).toContain('alternative valid action');
        });

        test('代替行動が正しく生成されること', () => {
            const invalidAction = createMockAction({ type: ActionType.ATTACK });
            const alternative = errorHandler.generateAlternativeAction(invalidAction, mockUnit, mockContext);

            expect(alternative.type).not.toBe(ActionType.ATTACK);
            expect(alternative.character).toBe(mockUnit);
            expect(alternative.priority).toBeLessThan(invalidAction.priority);
        });
    });

    describe('データ破損エラーの処理', () => {
        test('データ破損エラーを正しく処理すること', () => {
            const recovery = errorHandler.handleDataCorruption(
                mockUnit,
                'AI personality data corrupted',
                mockContext
            );

            expect(recovery.type).toBe('reset');
            expect(recovery.action.type).toBe(ActionType.WAIT);
            expect(recovery.description).toContain('basic AI pattern');
        });

        test('基本パターンへのリセットが正しく動作すること', () => {
            const resetAction = errorHandler.resetToBasicPattern(mockUnit);

            expect(resetAction.type).toBe(ActionType.WAIT);
            expect(resetAction.character).toBe(mockUnit);
            expect(resetAction.priority).toBe(0);
            expect(resetAction.reasoning).toContain('basic AI pattern');
        });
    });

    describe('メモリ不足エラーの処理', () => {
        test('メモリ不足エラーを正しく処理すること', () => {
            const recovery = errorHandler.handleMemoryShortage(mockUnit, 512, mockContext);

            expect(recovery.type).toBe('fallback');
            expect(recovery.action.type).toBe(ActionType.WAIT);
            expect(recovery.description).toContain('memory shortage');
        });
    });

    describe('予期しないエラーの処理', () => {
        test('予期しないエラーを正しく処理すること', () => {
            const unexpectedError = new Error('Something went wrong');
            const recovery = errorHandler.handleUnexpectedError(unexpectedError, mockUnit, mockContext);

            expect(recovery.type).toBe('fallback');
            expect(recovery.action.type).toBe(ActionType.WAIT);
            expect(recovery.description).toContain('unexpected error');
        });
    });

    describe('エラー統計', () => {
        test('エラー統計が正しく更新されること', () => {
            // 複数のエラーを発生させる
            errorHandler.handleThinkingTimeout(mockUnit, 3000, mockContext);
            errorHandler.handleInvalidAction(createMockAction(), mockUnit, 'Test', mockContext);
            errorHandler.handleDataCorruption(mockUnit, 'Test corruption', mockContext);

            const stats = errorHandler.getStatistics();
            expect(stats.totalErrors).toBe(3);
            expect(stats.errorsByType[AIErrorType.THINKING_TIMEOUT]).toBe(1);
            expect(stats.errorsByType[AIErrorType.INVALID_ACTION]).toBe(1);
            expect(stats.errorsByType[AIErrorType.DATA_CORRUPTION]).toBe(1);
        });

        test('最近のエラーが正しく記録されること', () => {
            errorHandler.handleThinkingTimeout(mockUnit, 3000, mockContext);
            errorHandler.handleInvalidAction(createMockAction(), mockUnit, 'Test', mockContext);

            const recentErrors = errorHandler.getRecentErrors(5);
            expect(recentErrors).toHaveLength(2);
            expect(recentErrors[0].type).toBe(AIErrorType.THINKING_TIMEOUT);
            expect(recentErrors[1].type).toBe(AIErrorType.INVALID_ACTION);
        });
    });

    describe('エラーログ管理', () => {
        test('エラーログが正しく記録されること', () => {
            errorHandler.handleThinkingTimeout(mockUnit, 3000, mockContext);

            const errorLog = errorHandler.getErrorLog();
            expect(errorLog).toHaveLength(1);
            expect(errorLog[0].type).toBe(AIErrorType.THINKING_TIMEOUT);
            expect(errorLog[0].character).toBe(mockUnit);
        });

        test('エラーログのクリアが正しく動作すること', () => {
            errorHandler.handleThinkingTimeout(mockUnit, 3000, mockContext);
            expect(errorHandler.getErrorLog()).toHaveLength(1);

            errorHandler.clearErrorLog();
            expect(errorHandler.getErrorLog()).toHaveLength(0);
            expect(errorHandler.getStatistics().totalErrors).toBe(0);
        });
    });

    describe('回復戦略', () => {
        test('回復戦略の設定と取得が正しく動作すること', () => {
            const newStrategy = {
                maxRetries: 5,
                retryDelay: 200,
            };

            errorHandler.setRecoveryStrategy(newStrategy);
            const strategy = errorHandler.getRecoveryStrategy();

            expect(strategy.maxRetries).toBe(5);
            expect(strategy.retryDelay).toBe(200);
        });
    });

    describe('システム健全性チェック', () => {
        test('健全なシステムでは問題なしと報告されること', () => {
            const health = errorHandler.checkSystemHealth();

            expect(health.isHealthy).toBe(true);
            expect(health.issues).toHaveLength(0);
            expect(health.recommendations).toHaveLength(0);
        });

        test('多数のエラーがある場合は問題が報告されること', () => {
            // 多数のエラーを発生させる
            for (let i = 0; i < 15; i++) {
                errorHandler.handleThinkingTimeout(mockUnit, 3000, mockContext);
            }

            const health = errorHandler.checkSystemHealth();

            expect(health.isHealthy).toBe(false);
            expect(health.issues.length).toBeGreaterThan(0);
            expect(health.recommendations.length).toBeGreaterThan(0);
        });
    });

    describe('エラー変換', () => {
        test('一般的なエラーがAIErrorに正しく変換されること', () => {
            const timeoutError = new Error('Operation timeout');
            const recovery = errorHandler.handleError(timeoutError, mockUnit, mockContext);

            expect(recovery.action.type).toBe(ActionType.WAIT);
        });

        test('既存のAIErrorはそのまま処理されること', () => {
            const aiError = new AIThinkingTimeoutError('Test timeout');
            const recovery = errorHandler.handleError(aiError, mockUnit, mockContext);

            expect(recovery.type).toBe('fallback');
            expect(recovery.action.type).toBe(ActionType.WAIT);
        });
    });

    describe('ヘルパー関数', () => {
        test('withErrorHandling が正常な場合は結果を返すこと', async () => {
            const result = await withErrorHandling(
                async () => 'success',
                mockUnit,
                mockContext
            );

            expect(result).toBe('success');
        });

        test('withErrorHandling がエラー時にフォールバック値を返すこと', async () => {
            const result = await withErrorHandling(
                async () => {
                    throw new Error('Test error');
                },
                mockUnit,
                mockContext,
                'fallback'
            );

            expect(result).toBe('fallback');
        });

        test('executeAIActionSafely が有効な行動をそのまま返すこと', async () => {
            const validAction = createMockAction({ type: ActionType.WAIT });
            const result = await executeAIActionSafely(validAction, mockUnit, mockContext);

            expect(result).toBe(validAction);
        });

        test('executeAIActionSafely が無効な行動を修正すること', async () => {
            const invalidAction = createMockAction({ type: 'invalid' as ActionType });
            const result = await executeAIActionSafely(invalidAction, mockUnit, mockContext);

            expect(result.type).toBe(ActionType.WAIT);
            expect(result).not.toBe(invalidAction);
        });
    });

    describe('エラー率計算', () => {
        test('エラー率が正しく計算されること', () => {
            // 初期状態ではエラー率は0
            expect(errorHandler.getErrorRate()).toBe(0);

            // エラーを発生させる
            errorHandler.handleThinkingTimeout(mockUnit, 3000, mockContext);

            const errorRate = errorHandler.getErrorRate();
            expect(errorRate).toBeGreaterThan(0);
        });
    });

    describe('カスタムエラークラス', () => {
        test('AIMemoryShortageError が正しく動作すること', () => {
            const error = new AIMemoryShortageError('Memory shortage test');

            expect(error.type).toBe(AIErrorType.MEMORY_SHORTAGE);
            expect(error.name).toBe('AIMemoryShortageError');

            const recovery = error.getRecoveryAction();
            expect(recovery.type).toBe(ActionType.WAIT);
            expect(recovery.reasoning).toContain('minimal resource');
        });

        test('AIUnexpectedError が正しく動作すること', () => {
            const error = new AIUnexpectedError('Unexpected error test');

            expect(error.type).toBe(AIErrorType.UNEXPECTED_ERROR);
            expect(error.name).toBe('AIUnexpectedError');

            const recovery = error.getRecoveryAction();
            expect(recovery.type).toBe(ActionType.WAIT);
            expect(recovery.reasoning).toContain('safe fallback');
        });
    });
});

describe('AIErrorHandler 統合テスト', () => {
    let errorHandler: AIErrorHandler;
    let mockUnit: Unit;
    let mockContext: Partial<AIContext>;

    beforeEach(() => {
        errorHandler = AIErrorHandler.getInstance();
        errorHandler.clearErrorLog();
        errorHandler.setEnabled(true);
        mockUnit = createMockUnit();
        mockContext = createMockContext();
    });

    test('複数のエラータイプが混在する場合の処理', () => {
        // 異なるタイプのエラーを発生させる
        errorHandler.handleThinkingTimeout(mockUnit, 3000, mockContext);
        errorHandler.handleInvalidAction(createMockAction(), mockUnit, 'Test', mockContext);
        errorHandler.handleDataCorruption(mockUnit, 'Test corruption', mockContext);
        errorHandler.handleMemoryShortage(mockUnit, 512, mockContext);

        const stats = errorHandler.getStatistics();
        expect(stats.totalErrors).toBe(4);

        // 各エラータイプが1回ずつ記録されていること
        expect(stats.errorsByType[AIErrorType.THINKING_TIMEOUT]).toBe(1);
        expect(stats.errorsByType[AIErrorType.INVALID_ACTION]).toBe(1);
        expect(stats.errorsByType[AIErrorType.DATA_CORRUPTION]).toBe(1);
        expect(stats.errorsByType[AIErrorType.MEMORY_SHORTAGE]).toBe(1);
    });

    test('大量のエラーが発生した場合のメモリ管理', () => {
        // 大量のエラーを発生させる
        for (let i = 0; i < 1500; i++) {
            errorHandler.handleThinkingTimeout(mockUnit, 3000, mockContext);
        }

        const errorLog = errorHandler.getErrorLog();
        const stats = errorHandler.getStatistics();

        // ログサイズが制限されていること
        expect(errorLog.length).toBeLessThanOrEqual(1000);

        // 統計は正しく記録されていること
        expect(stats.totalErrors).toBe(1500);
        expect(stats.errorsByType[AIErrorType.THINKING_TIMEOUT]).toBe(1500);
    });

    test('エラー回復の連鎖処理', async () => {
        // 無効な行動から始まる回復の連鎖
        const invalidAction = createMockAction({ type: 'invalid' as ActionType });

        const result = await executeAIActionSafely(invalidAction, mockUnit, mockContext);

        // 最終的に有効な行動が返されること
        expect(result.type).toBe(ActionType.WAIT);
        expect(result.character).toBe(mockUnit);

        // エラーが記録されていること
        const stats = errorHandler.getStatistics();
        expect(stats.totalErrors).toBe(1);
        expect(stats.errorsByType[AIErrorType.INVALID_ACTION]).toBe(1);
    });

    test('システム健全性の総合チェック', () => {
        // 様々なエラーを発生させる
        for (let i = 0; i < 5; i++) {
            errorHandler.handleThinkingTimeout(mockUnit, 3000, mockContext);
        }
        for (let i = 0; i < 3; i++) {
            errorHandler.handleMemoryShortage(mockUnit, 512, mockContext);
        }

        const health = errorHandler.checkSystemHealth();

        // 問題が検出されること
        expect(health.isHealthy).toBe(false);
        expect(health.issues.length).toBeGreaterThan(0);
        expect(health.recommendations.length).toBeGreaterThan(0);

        // 具体的な問題が含まれていること
        const issueText = health.issues.join(' ');
        expect(issueText).toContain('Memory shortage errors');
    });
});