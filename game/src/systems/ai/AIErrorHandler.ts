/**
 * AIエラーハンドリングシステム
 * AI思考・実行中のエラーを処理し、適切な回復行動を提供する
 */

import {
    AIError,
    AIThinkingTimeoutError,
    InvalidActionError,
    AIDataCorruptionError,
    AIErrorType,
    AIAction,
    ActionType,
    AIContext,
    AIErrorInfo,
    AIRecoveryAction,
    Unit
} from '../../types/ai';

/**
 * メモリ不足エラー
 */
export class AIMemoryShortageError extends AIError {
    constructor(message: string) {
        super(AIErrorType.MEMORY_SHORTAGE, message);
        this.name = 'AIMemoryShortageError';
    }

    getRecoveryAction(): AIAction {
        return {
            type: ActionType.WAIT,
            priority: 0,
            reasoning: 'Memory shortage - using minimal resource action',
        };
    }
}

/**
 * 予期しないエラー
 */
export class AIUnexpectedError extends AIError {
    constructor(message: string) {
        super(AIErrorType.UNEXPECTED_ERROR, message);
        this.name = 'AIUnexpectedError';
    }

    getRecoveryAction(): AIAction {
        return {
            type: ActionType.WAIT,
            priority: 0,
            reasoning: 'Unexpected error - using safe fallback',
        };
    }
}

/**
 * エラー統計情報
 */
interface ErrorStatistics {
    totalErrors: number;
    errorsByType: Record<AIErrorType, number>;
    recentErrors: AIErrorInfo[];
    recoverySuccessRate: number;
    lastErrorTime: number;
}

/**
 * 回復戦略の設定
 */
interface RecoveryStrategy {
    maxRetries: number;
    retryDelay: number;
    fallbackActions: AIAction[];
    resetThreshold: number;
}

/**
 * AIエラーハンドラー
 * AI実行中のエラーを捕捉し、適切な回復処理を実行する
 */
export class AIErrorHandler {
    private static instance: AIErrorHandler;
    private errorLog: AIErrorInfo[] = [];
    private statistics: ErrorStatistics;
    private recoveryStrategy: RecoveryStrategy;
    private isEnabled: boolean = true;
    private maxLogSize: number = 1000;

    private constructor() {
        this.statistics = {
            totalErrors: 0,
            errorsByType: {
                [AIErrorType.THINKING_TIMEOUT]: 0,
                [AIErrorType.INVALID_ACTION]: 0,
                [AIErrorType.DATA_CORRUPTION]: 0,
                [AIErrorType.MEMORY_SHORTAGE]: 0,
                [AIErrorType.UNEXPECTED_ERROR]: 0,
            },
            recentErrors: [],
            recoverySuccessRate: 0,
            lastErrorTime: 0,
        };

        this.recoveryStrategy = {
            maxRetries: 3,
            retryDelay: 100,
            fallbackActions: [
                {
                    type: ActionType.WAIT,
                    priority: 0,
                    reasoning: 'Safe fallback action',
                },
            ],
            resetThreshold: 10,
        };
    }

    /**
     * シングルトンインスタンスを取得
     */
    public static getInstance(): AIErrorHandler {
        if (!AIErrorHandler.instance) {
            AIErrorHandler.instance = new AIErrorHandler();
        }
        return AIErrorHandler.instance;
    }

    /**
     * エラーハンドラーの有効化/無効化
     */
    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
    }

    /**
     * エラーハンドラーが有効かどうか
     */
    public isHandlerEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * エラーを処理し、回復行動を返す
     */
    public handleError(error: Error, character: Unit, context?: Partial<AIContext>): AIRecoveryAction {
        if (!this.isEnabled) {
            throw error;
        }

        const aiError = this.convertToAIError(error);
        const errorInfo = this.createErrorInfo(aiError, character, context);

        this.logError(errorInfo);
        this.updateStatistics(errorInfo);

        const recoveryAction = this.determineRecoveryAction(aiError, character, context);

        console.warn(`[AIErrorHandler] Handling ${aiError.type} for character ${character.id}: ${aiError.message}`);
        console.warn(`[AIErrorHandler] Recovery action: ${recoveryAction.type} - ${recoveryAction.description}`);

        return recoveryAction;
    }

    /**
     * AI思考タイムアウトエラーを処理
     */
    public handleThinkingTimeout(character: Unit, thinkingTime: number, context?: Partial<AIContext>): AIRecoveryAction {
        const error = new AIThinkingTimeoutError(
            `AI thinking timeout for character ${character.id} after ${thinkingTime}ms`
        );

        return this.handleError(error, character, context);
    }

    /**
     * 無効な行動エラーを処理
     */
    public handleInvalidAction(action: AIAction, character: Unit, reason: string, context?: Partial<AIContext>): AIRecoveryAction {
        const error = new InvalidActionError(
            `Invalid action ${action.type} for character ${character.id}: ${reason}`
        );

        return this.handleError(error, character, context);
    }

    /**
     * AIデータ破損エラーを処理
     */
    public handleDataCorruption(character: Unit, corruptedData: string, context?: Partial<AIContext>): AIRecoveryAction {
        const error = new AIDataCorruptionError(
            `AI data corruption for character ${character.id}: ${corruptedData}`
        );

        return this.handleError(error, character, context);
    }

    /**
     * メモリ不足エラーを処理
     */
    public handleMemoryShortage(character: Unit, memoryUsage: number, context?: Partial<AIContext>): AIRecoveryAction {
        const error = new AIMemoryShortageError(
            `Memory shortage for character ${character.id}: ${memoryUsage}MB used`
        );

        // メモリクリーンアップを実行
        this.performMemoryCleanup();

        return this.handleError(error, character, context);
    }

    /**
     * 予期しないエラーを処理
     */
    public handleUnexpectedError(error: Error, character: Unit, context?: Partial<AIContext>): AIRecoveryAction {
        const aiError = new AIUnexpectedError(
            `Unexpected error for character ${character.id}: ${error.message}`
        );

        return this.handleError(aiError, character, context);
    }

    /**
     * 有効な代替行動を生成
     */
    public generateAlternativeAction(invalidAction: AIAction, character: Unit, context?: Partial<AIContext>): AIAction {
        // 最も安全な代替行動として常に待機を返す
        // より複雑な代替行動の選択は将来の拡張で実装
        return {
            type: ActionType.WAIT,
            character,
            priority: Math.max(0, invalidAction.priority - 10),
            reasoning: `Safe alternative to invalid ${invalidAction.type} action`,
        };
    }

    /**
     * 基本AIパターンで復旧
     */
    public resetToBasicPattern(character: Unit): AIAction {
        // 最も基本的な行動パターン：待機
        return {
            type: ActionType.WAIT,
            character,
            priority: 0,
            reasoning: 'Reset to basic AI pattern due to data corruption',
        };
    }

    /**
     * エラー統計を取得
     */
    public getStatistics(): ErrorStatistics {
        return { ...this.statistics };
    }

    /**
     * エラーログを取得
     */
    public getErrorLog(): AIErrorInfo[] {
        return [...this.errorLog];
    }

    /**
     * 最近のエラーを取得
     */
    public getRecentErrors(count: number = 10): AIErrorInfo[] {
        return this.errorLog.slice(-count);
    }

    /**
     * エラーログをクリア
     */
    public clearErrorLog(): void {
        this.errorLog = [];
        this.statistics.recentErrors = [];
        this.statistics.totalErrors = 0;
        this.statistics.errorsByType = {
            [AIErrorType.THINKING_TIMEOUT]: 0,
            [AIErrorType.INVALID_ACTION]: 0,
            [AIErrorType.DATA_CORRUPTION]: 0,
            [AIErrorType.MEMORY_SHORTAGE]: 0,
            [AIErrorType.UNEXPECTED_ERROR]: 0,
        };
    }

    /**
     * 回復戦略を設定
     */
    public setRecoveryStrategy(strategy: Partial<RecoveryStrategy>): void {
        this.recoveryStrategy = { ...this.recoveryStrategy, ...strategy };
    }

    /**
     * 回復戦略を取得
     */
    public getRecoveryStrategy(): RecoveryStrategy {
        return { ...this.recoveryStrategy };
    }

    /**
     * エラー率を取得
     */
    public getErrorRate(): number {
        if (this.statistics.totalErrors === 0) return 0;

        const recentErrorCount = this.statistics.recentErrors.length;
        const totalDecisions = this.statistics.totalErrors + (this.statistics.totalErrors * 9); // 仮定：エラー率10%

        return recentErrorCount / totalDecisions;
    }

    /**
     * システムの健全性をチェック
     */
    public checkSystemHealth(): {
        isHealthy: boolean;
        issues: string[];
        recommendations: string[];
    } {
        const issues: string[] = [];
        const recommendations: string[] = [];

        // エラー率チェック
        const errorRate = this.getErrorRate();
        if (errorRate > 0.1) {
            issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
            recommendations.push('Consider adjusting AI difficulty or timeout settings');
        }

        // 最近のエラー頻度チェック
        const recentErrors = this.getRecentErrors(50);
        const recentTimeoutErrors = recentErrors.filter(e => e.type === AIErrorType.THINKING_TIMEOUT).length;
        if (recentTimeoutErrors > 5) { // 閾値を下げる
            issues.push(`Frequent thinking timeouts: ${recentTimeoutErrors} in recent 50 errors`);
            recommendations.push('Increase thinking time limit or optimize AI algorithms');
        }

        // メモリ関連エラーチェック
        const memoryErrors = recentErrors.filter(e => e.type === AIErrorType.MEMORY_SHORTAGE).length;
        if (memoryErrors > 2) { // 閾値を下げる
            issues.push(`Memory shortage errors: ${memoryErrors} in recent errors`);
            recommendations.push('Implement more aggressive memory cleanup or reduce AI complexity');
        }

        // 総エラー数チェック
        if (this.statistics.totalErrors > 10) {
            issues.push(`High total error count: ${this.statistics.totalErrors}`);
            recommendations.push('Review AI system stability and error patterns');
        }

        return {
            isHealthy: issues.length === 0,
            issues,
            recommendations,
        };
    }

    // ========================================
    // プライベートメソッド
    // ========================================

    /**
     * 一般的なエラーをAIErrorに変換
     */
    private convertToAIError(error: Error): AIError {
        if (error instanceof AIError) {
            return error;
        }

        // エラーメッセージから種類を推定
        const message = error.message.toLowerCase();

        if (message.includes('timeout')) {
            return new AIThinkingTimeoutError(error.message);
        } else if (message.includes('invalid') || message.includes('illegal')) {
            return new InvalidActionError(error.message);
        } else if (message.includes('memory') || message.includes('out of memory')) {
            return new AIMemoryShortageError(error.message);
        } else if (message.includes('corrupt') || message.includes('malformed')) {
            return new AIDataCorruptionError(error.message);
        } else {
            return new AIUnexpectedError(error.message);
        }
    }

    /**
     * エラー情報を作成
     */
    private createErrorInfo(error: AIError, character: Unit, context?: Partial<AIContext>): AIErrorInfo {
        return {
            type: error.type,
            message: error.message,
            timestamp: error.timestamp,
            character,
            context,
            stackTrace: error.stack,
        };
    }

    /**
     * エラーをログに記録
     */
    private logError(errorInfo: AIErrorInfo): void {
        this.errorLog.push(errorInfo);

        // ログサイズ制限
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog = this.errorLog.slice(-this.maxLogSize);
        }
    }

    /**
     * 統計情報を更新
     */
    private updateStatistics(errorInfo: AIErrorInfo): void {
        this.statistics.totalErrors++;
        this.statistics.errorsByType[errorInfo.type]++;
        this.statistics.lastErrorTime = errorInfo.timestamp;

        // 最近のエラーリストを更新
        this.statistics.recentErrors.push(errorInfo);
        if (this.statistics.recentErrors.length > 100) {
            this.statistics.recentErrors = this.statistics.recentErrors.slice(-100);
        }
    }

    /**
     * 回復行動を決定
     */
    private determineRecoveryAction(error: AIError, character: Unit, context?: Partial<AIContext>): AIRecoveryAction {
        const baseAction = error.getRecoveryAction();

        // エラーの種類に応じて回復戦略を調整
        switch (error.type) {
            case AIErrorType.THINKING_TIMEOUT:
                return {
                    type: 'fallback',
                    action: baseAction,
                    description: 'Using fallback action due to thinking timeout',
                };

            case AIErrorType.INVALID_ACTION:
                const alternativeAction = this.generateAlternativeAction(baseAction, character, context);
                return {
                    type: 'retry',
                    action: alternativeAction,
                    description: 'Retrying with alternative valid action',
                };

            case AIErrorType.DATA_CORRUPTION:
                const resetAction = this.resetToBasicPattern(character);
                return {
                    type: 'reset',
                    action: resetAction,
                    description: 'Reset to basic AI pattern due to data corruption',
                };

            case AIErrorType.MEMORY_SHORTAGE:
                return {
                    type: 'fallback',
                    action: baseAction,
                    description: 'Using minimal resource action due to memory shortage',
                };

            default:
                return {
                    type: 'fallback',
                    action: baseAction,
                    description: 'Using safe fallback action for unexpected error',
                };
        }
    }

    /**
     * 行動の有効性をチェック
     */
    private isValidAction(action: AIAction, context?: Partial<AIContext>): boolean {
        // 基本的な検証
        if (!action.type || !Object.values(ActionType).includes(action.type)) {
            return false;
        }

        // 待機は常に有効
        if (action.type === ActionType.WAIT) {
            return true;
        }

        // コンテキストがない場合は基本的な検証のみ
        if (!context) {
            return true;
        }

        // より詳細な検証はここで実装
        // 例：移動先が有効か、攻撃対象が範囲内か、など
        return true;
    }

    /**
     * メモリクリーンアップを実行
     */
    private performMemoryCleanup(): void {
        // エラーログの古いエントリを削除
        if (this.errorLog.length > this.maxLogSize / 2) {
            this.errorLog = this.errorLog.slice(-this.maxLogSize / 2);
        }

        // 統計の古いデータを削除
        if (this.statistics.recentErrors.length > 50) {
            this.statistics.recentErrors = this.statistics.recentErrors.slice(-50);
        }

        // ガベージコレクションを促す（可能な場合）
        if (global.gc) {
            global.gc();
        }
    }
}

/**
 * グローバルなエラーハンドラーインスタンス
 */
export const aiErrorHandler = AIErrorHandler.getInstance();

/**
 * AI実行をエラーハンドリングでラップするヘルパー関数
 */
export async function withErrorHandling<T>(
    operation: () => Promise<T>,
    character: Unit,
    context?: Partial<AIContext>,
    fallbackValue?: T
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        const recovery = aiErrorHandler.handleError(error as Error, character, context);

        if (fallbackValue !== undefined) {
            return fallbackValue;
        }

        throw error;
    }
}

/**
 * AI行動実行をエラーハンドリングでラップするヘルパー関数
 */
export async function executeAIActionSafely(
    action: AIAction,
    character: Unit,
    context?: Partial<AIContext>
): Promise<AIAction> {
    try {
        // 行動の基本検証
        if (!action.type || !Object.values(ActionType).includes(action.type)) {
            throw new InvalidActionError(`Invalid action type: ${action.type}`);
        }

        return action;
    } catch (error) {
        const recovery = aiErrorHandler.handleError(error as Error, character, context);
        return recovery.action;
    }
}