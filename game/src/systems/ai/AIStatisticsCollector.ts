import { Unit } from '../../types/gameplay';
import { AIAction, AIContext, BehaviorResult } from '../../types/ai';

/**
 * AI統計データの種類
 */
export interface AIStatistics {
    // パフォーマンス統計
    performance: {
        averageThinkingTime: number;
        maxThinkingTime: number;
        minThinkingTime: number;
        memoryUsage: number;
        actionSuccessRate: number;
        errorCount: number;
        timeoutCount: number;
    };

    // 行動統計
    behavior: {
        actionCounts: Record<string, number>;
        targetSelectionAccuracy: number;
        skillUsageRate: number;
        movementEfficiency: number;
        decisionConsistency: number;
    };

    // 効果統計
    effectiveness: {
        totalDamageDealt: number;
        totalDamageReceived: number;
        totalHealingProvided: number;
        objectivesCompleted: number;
        survivalRate: number;
        winRate: number;
    };

    // 時系列データ
    timeline: {
        timestamp: number;
        thinkingTime: number;
        actionType: string;
        success: boolean;
        effectiveness: number;
    }[];
}

/**
 * AI統計レポート
 */
export interface AIStatisticsReport {
    generatedAt: number;
    aiId: string;
    aiType: string;
    difficultyLevel: string;
    sessionDuration: number;
    statistics: AIStatistics;
    recommendations: string[];
    balanceAdjustments: Record<string, number>;
}

/**
 * AI統計収集・分析システム
 */
export class AIStatisticsCollector {
    private statistics: Map<string, AIStatistics> = new Map();
    private sessionStartTime: number = Date.now();
    private collectionInterval: number = 1000;
    private maxHistorySize: number = 1000;
    private isCollecting: boolean = false;

    constructor(collectionInterval: number = 1000, maxHistorySize: number = 1000) {
        this.collectionInterval = collectionInterval;
        this.maxHistorySize = maxHistorySize;
    }

    /**
     * 統計収集を開始
     */
    public startCollection(): void {
        this.isCollecting = true;
        this.sessionStartTime = Date.now();
        console.log('AIStatisticsCollector: Statistics collection started');
    }

    /**
     * 統計収集を停止
     */
    public stopCollection(): void {
        this.isCollecting = false;
        console.log('AIStatisticsCollector: Statistics collection stopped');
    }

    /**
     * AI思考時間を記録
     */
    public recordThinkingTime(aiId: string, thinkingTime: number): void {
        if (!this.isCollecting) return;

        const stats = this.getOrCreateStatistics(aiId);

        // パフォーマンス統計を更新
        const perfStats = stats.performance;
        const currentCount = stats.timeline.length;

        perfStats.averageThinkingTime =
            (perfStats.averageThinkingTime * currentCount + thinkingTime) / (currentCount + 1);
        perfStats.maxThinkingTime = Math.max(perfStats.maxThinkingTime, thinkingTime);
        perfStats.minThinkingTime = Math.min(perfStats.minThinkingTime, thinkingTime);

        // タイムライン記録
        this.addTimelineEntry(aiId, {
            timestamp: Date.now(),
            thinkingTime,
            actionType: 'thinking',
            success: thinkingTime <= 2000, // 2秒以内なら成功
            effectiveness: Math.max(0, 1 - thinkingTime / 2000)
        });
    }

    /**
     * AI行動を記録
     */
    public recordAction(aiId: string, action: AIAction, result: BehaviorResult): void {
        if (!this.isCollecting) return;

        const stats = this.getOrCreateStatistics(aiId);

        // 行動統計を更新
        const actionType = action.type;
        stats.behavior.actionCounts[actionType] = (stats.behavior.actionCounts[actionType] || 0) + 1;

        // 成功率を更新
        const isSuccess = result === BehaviorResult.SUCCESS;
        const currentSuccessRate = stats.performance.actionSuccessRate;
        const totalActions = Object.values(stats.behavior.actionCounts).reduce((sum, count) => sum + count, 0);

        stats.performance.actionSuccessRate =
            (currentSuccessRate * (totalActions - 1) + (isSuccess ? 1 : 0)) / totalActions;

        // タイムライン記録
        this.addTimelineEntry(aiId, {
            timestamp: Date.now(),
            thinkingTime: 0,
            actionType,
            success: isSuccess,
            effectiveness: this.calculateActionEffectiveness(action, result)
        });
    }

    /**
     * メモリ使用量を記録
     */
    public recordMemoryUsage(aiId: string, memoryUsage: number): void {
        if (!this.isCollecting) return;

        const stats = this.getOrCreateStatistics(aiId);
        stats.performance.memoryUsage = memoryUsage;
    }

    /**
     * エラーを記録
     */
    public recordError(aiId: string, errorType: 'timeout' | 'error'): void {
        if (!this.isCollecting) return;

        const stats = this.getOrCreateStatistics(aiId);

        if (errorType === 'timeout') {
            stats.performance.timeoutCount++;
        } else {
            stats.performance.errorCount++;
        }
    }

    /**
     * ダメージ・回復を記録
     */
    public recordCombatResult(aiId: string, damageDealt: number, damageReceived: number, healingProvided: number): void {
        if (!this.isCollecting) return;

        const stats = this.getOrCreateStatistics(aiId);
        stats.effectiveness.totalDamageDealt += damageDealt;
        stats.effectiveness.totalDamageReceived += damageReceived;
        stats.effectiveness.totalHealingProvided += healingProvided;
    }

    /**
     * 目標達成を記録
     */
    public recordObjectiveCompletion(aiId: string): void {
        if (!this.isCollecting) return;

        const stats = this.getOrCreateStatistics(aiId);
        stats.effectiveness.objectivesCompleted++;
    }

    /**
     * 統計レポートを生成
     */
    public generateReport(aiId: string, aiType: string, difficultyLevel: string): AIStatisticsReport {
        const stats = this.statistics.get(aiId);
        if (!stats) {
            throw new Error(`No statistics found for AI: ${aiId}`);
        }

        const sessionDuration = Date.now() - this.sessionStartTime;
        const recommendations = this.generateRecommendations(stats);
        const balanceAdjustments = this.generateBalanceAdjustments(stats);

        return {
            generatedAt: Date.now(),
            aiId,
            aiType,
            difficultyLevel,
            sessionDuration,
            statistics: stats,
            recommendations,
            balanceAdjustments
        };
    }

    /**
     * 全AI統計を取得
     */
    public getAllStatistics(): Map<string, AIStatistics> {
        return new Map(this.statistics);
    }

    /**
     * 統計をクリア
     */
    public clearStatistics(aiId?: string): void {
        if (aiId) {
            this.statistics.delete(aiId);
        } else {
            this.statistics.clear();
        }
        console.log(`AIStatisticsCollector: Statistics cleared${aiId ? ` for ${aiId}` : ''}`);
    }

    /**
     * 統計をJSONで出力
     */
    public exportStatistics(aiId?: string): string {
        const data = aiId ?
            { [aiId]: this.statistics.get(aiId) } :
            Object.fromEntries(this.statistics);

        return JSON.stringify(data, null, 2);
    }

    /**
     * 統計データを取得または作成
     */
    private getOrCreateStatistics(aiId: string): AIStatistics {
        if (!this.statistics.has(aiId)) {
            this.statistics.set(aiId, this.createEmptyStatistics());
        }
        return this.statistics.get(aiId)!;
    }

    /**
     * 空の統計データを作成
     */
    private createEmptyStatistics(): AIStatistics {
        return {
            performance: {
                averageThinkingTime: 0,
                maxThinkingTime: 0,
                minThinkingTime: Infinity,
                memoryUsage: 0,
                actionSuccessRate: 0,
                errorCount: 0,
                timeoutCount: 0
            },
            behavior: {
                actionCounts: {},
                targetSelectionAccuracy: 0,
                skillUsageRate: 0,
                movementEfficiency: 0,
                decisionConsistency: 0
            },
            effectiveness: {
                totalDamageDealt: 0,
                totalDamageReceived: 0,
                totalHealingProvided: 0,
                objectivesCompleted: 0,
                survivalRate: 0,
                winRate: 0
            },
            timeline: []
        };
    }

    /**
     * タイムラインエントリを追加
     */
    private addTimelineEntry(aiId: string, entry: AIStatistics['timeline'][0]): void {
        const stats = this.getOrCreateStatistics(aiId);
        stats.timeline.push(entry);

        // 履歴サイズ制限
        if (stats.timeline.length > this.maxHistorySize) {
            stats.timeline.shift();
        }
    }

    /**
     * 行動の効果を計算
     */
    private calculateActionEffectiveness(action: AIAction, result: BehaviorResult): number {
        if (result === BehaviorResult.FAILURE) return 0;
        if (result === BehaviorResult.SUCCESS) return 1;

        // 部分的成功の場合は行動タイプに基づいて計算
        switch (action.type) {
            case 'attack':
                return 0.7;
            case 'move':
                return 0.8;
            case 'skill':
                return 0.9;
            case 'wait':
                return 0.5;
            default:
                return 0.6;
        }
    }

    /**
     * 改善提案を生成
     */
    private generateRecommendations(stats: AIStatistics): string[] {
        const recommendations: string[] = [];

        // パフォーマンス関連の提案
        if (stats.performance.averageThinkingTime > 1500) {
            recommendations.push('思考時間が長すぎます。アルゴリズムの最適化を検討してください。');
        }

        if (stats.performance.actionSuccessRate < 0.7) {
            recommendations.push('行動成功率が低いです。行動選択ロジックの見直しが必要です。');
        }

        if (stats.performance.errorCount > 5) {
            recommendations.push('エラーが多発しています。エラーハンドリングの強化が必要です。');
        }

        // 行動パターン関連の提案
        const totalActions = Object.values(stats.behavior.actionCounts).reduce((sum, count) => sum + count, 0);
        const waitActions = stats.behavior.actionCounts['wait'] || 0;

        if (waitActions / totalActions > 0.3) {
            recommendations.push('待機行動が多すぎます。より積極的な行動パターンを検討してください。');
        }

        // 効果関連の提案
        if (stats.effectiveness.totalDamageReceived > stats.effectiveness.totalDamageDealt * 1.5) {
            recommendations.push('被ダメージが多すぎます。防御的な行動パターンの強化が必要です。');
        }

        return recommendations;
    }

    /**
     * バランス調整値を生成
     */
    private generateBalanceAdjustments(stats: AIStatistics): Record<string, number> {
        const adjustments: Record<string, number> = {};

        // 思考時間に基づく調整
        if (stats.performance.averageThinkingTime > 1500) {
            adjustments.thinkingDepth = -0.5;
        } else if (stats.performance.averageThinkingTime < 500) {
            adjustments.thinkingDepth = 0.5;
        }

        // 成功率に基づく調整
        if (stats.performance.actionSuccessRate < 0.6) {
            adjustments.mistakeProbability = -0.1;
        } else if (stats.performance.actionSuccessRate > 0.9) {
            adjustments.mistakeProbability = 0.1;
        }

        // 効果に基づく調整
        const damageRatio = stats.effectiveness.totalDamageDealt / Math.max(1, stats.effectiveness.totalDamageReceived);
        if (damageRatio < 0.8) {
            adjustments.aggressiveBehaviorWeight = 0.2;
        } else if (damageRatio > 1.5) {
            adjustments.defensiveBehaviorWeight = 0.2;
        }

        return adjustments;
    }
}