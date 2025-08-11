import { GameConfig } from '../../config/GameConfig';
import { DifficultySettings } from '../../types/ai';
import { AIStatisticsCollector, AIStatisticsReport } from './AIStatisticsCollector';
import { AITestingFramework, AITestResult } from './AITestingFramework';

/**
 * バランス調整設定
 */
export interface BalanceAdjustment {
    parameter: string;
    currentValue: number;
    suggestedValue: number;
    reason: string;
    impact: 'low' | 'medium' | 'high';
    confidence: number; // 0-1
}

/**
 * バランス分析結果
 */
export interface BalanceAnalysis {
    overallScore: number; // 0-1 (1が最適)
    adjustments: BalanceAdjustment[];
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
}

/**
 * AIバランス調整ツール
 */
export class AIBalanceTool {
    private gameConfig: GameConfig;
    private statisticsCollector: AIStatisticsCollector;
    private testingFramework: AITestingFramework;
    private balanceHistory: BalanceAnalysis[] = [];

    constructor(gameConfig: GameConfig) {
        this.gameConfig = gameConfig;
        this.statisticsCollector = new AIStatisticsCollector();
        this.testingFramework = new AITestingFramework();
    }

    /**
     * 現在のAI設定を分析
     */
    public analyzeCurrentBalance(): BalanceAnalysis {
        const aiConfig = this.gameConfig.getAISystemConfig();
        const adjustments: BalanceAdjustment[] = [];
        const strengths: string[] = [];
        const weaknesses: string[] = [];
        const recommendations: string[] = [];

        // 難易度設定の分析
        this.analyzeDifficultySettings(aiConfig.difficultySettings, adjustments, strengths, weaknesses);

        // パフォーマンス設定の分析
        this.analyzePerformanceSettings(aiConfig.performanceSettings, adjustments, strengths, weaknesses);

        // バランス設定の分析
        this.analyzeBalanceSettings(aiConfig.balanceSettings, adjustments, strengths, weaknesses);

        // 推奨事項を生成
        recommendations.push(...this.generateRecommendations(adjustments));

        // 総合スコアを計算
        const overallScore = this.calculateOverallScore(adjustments);

        const analysis: BalanceAnalysis = {
            overallScore,
            adjustments,
            strengths,
            weaknesses,
            recommendations
        };

        this.balanceHistory.push(analysis);
        return analysis;
    }

    /**
     * 統計データに基づくバランス調整
     */
    public adjustBalanceFromStatistics(statistics: Map<string, AIStatisticsReport>): BalanceAnalysis {
        const adjustments: BalanceAdjustment[] = [];
        const strengths: string[] = [];
        const weaknesses: string[] = [];

        for (const [aiId, stats] of statistics) {
            // パフォーマンス分析
            this.analyzePerformanceStatistics(aiId, stats, adjustments, strengths, weaknesses);

            // 行動分析
            this.analyzeBehaviorStatistics(aiId, stats, adjustments, strengths, weaknesses);

            // 効果分析
            this.analyzeEffectivenessStatistics(aiId, stats, adjustments, strengths, weaknesses);
        }

        // 調整を適用
        this.applyBalanceAdjustments(adjustments);

        const recommendations = this.generateRecommendations(adjustments);
        const overallScore = this.calculateOverallScore(adjustments);

        const analysis: BalanceAnalysis = {
            overallScore,
            adjustments,
            strengths,
            weaknesses,
            recommendations
        };

        this.balanceHistory.push(analysis);
        return analysis;
    }

    /**
     * テスト結果に基づくバランス調整
     */
    public adjustBalanceFromTestResults(testResults: AITestResult[]): BalanceAnalysis {
        const adjustments: BalanceAdjustment[] = [];
        const strengths: string[] = [];
        const weaknesses: string[] = [];

        // 成功率分析
        const successRate = testResults.filter(r => r.success).length / testResults.length;
        if (successRate < 0.6) {
            adjustments.push({
                parameter: 'mistakeProbability',
                currentValue: this.gameConfig.getAISystemConfig().balanceSettings.mistakeProbability,
                suggestedValue: Math.max(0, this.gameConfig.getAISystemConfig().balanceSettings.mistakeProbability - 0.1),
                reason: 'テスト成功率が低いため、AIの精度を向上させる',
                impact: 'medium',
                confidence: 0.8
            });
            weaknesses.push('テスト成功率が低い');
        } else if (successRate > 0.9) {
            adjustments.push({
                parameter: 'mistakeProbability',
                currentValue: this.gameConfig.getAISystemConfig().balanceSettings.mistakeProbability,
                suggestedValue: Math.min(1, this.gameConfig.getAISystemConfig().balanceSettings.mistakeProbability + 0.1),
                reason: 'テスト成功率が高すぎるため、適度な難易度を維持する',
                impact: 'low',
                confidence: 0.6
            });
            strengths.push('高いテスト成功率');
        } else {
            strengths.push('適切なテスト成功率');
        }

        // 思考時間分析
        const avgThinkingTime = testResults.reduce((sum, r) => sum + r.performanceMetrics.averageThinkingTime, 0) / testResults.length;
        if (avgThinkingTime > 1500) {
            adjustments.push({
                parameter: 'thinkingDepth',
                currentValue: this.gameConfig.getAISystemConfig().difficultySettings.thinkingDepth,
                suggestedValue: Math.max(1, this.gameConfig.getAISystemConfig().difficultySettings.thinkingDepth - 1),
                reason: '思考時間が長すぎるため、思考深度を下げる',
                impact: 'high',
                confidence: 0.9
            });
            weaknesses.push('思考時間が長い');
        } else if (avgThinkingTime < 500) {
            adjustments.push({
                parameter: 'thinkingDepth',
                currentValue: this.gameConfig.getAISystemConfig().difficultySettings.thinkingDepth,
                suggestedValue: Math.min(10, this.gameConfig.getAISystemConfig().difficultySettings.thinkingDepth + 1),
                reason: '思考時間が短すぎるため、より深い思考を可能にする',
                impact: 'medium',
                confidence: 0.7
            });
        } else {
            strengths.push('適切な思考時間');
        }

        // 調整を適用
        this.applyBalanceAdjustments(adjustments);

        const recommendations = this.generateRecommendations(adjustments);
        const overallScore = this.calculateOverallScore(adjustments);

        const analysis: BalanceAnalysis = {
            overallScore,
            adjustments,
            strengths,
            weaknesses,
            recommendations
        };

        this.balanceHistory.push(analysis);
        return analysis;
    }

    /**
     * 自動バランス調整を実行
     */
    public async runAutoBalance(iterations: number = 5): Promise<BalanceAnalysis> {
        console.log(`AIBalanceTool: Starting auto-balance with ${iterations} iterations`);

        let bestAnalysis: BalanceAnalysis | null = null;
        let bestScore = 0;

        for (let i = 0; i < iterations; i++) {
            console.log(`AIBalanceTool: Auto-balance iteration ${i + 1}/${iterations}`);

            // テストを実行
            const testResults = await this.testingFramework.runBatchTest(
                ['basic-combat', 'npc-protection'],
                ['aggressive', 'defensive', 'tactical'],
                ['normal', 'hard']
            );

            // バランス調整
            const analysis = this.adjustBalanceFromTestResults(testResults);

            // 最良の結果を記録
            if (analysis.overallScore > bestScore) {
                bestScore = analysis.overallScore;
                bestAnalysis = analysis;
            }

            // 収束チェック
            if (analysis.overallScore > 0.9) {
                console.log('AIBalanceTool: Auto-balance converged early');
                break;
            }
        }

        console.log(`AIBalanceTool: Auto-balance completed. Best score: ${bestScore.toFixed(3)}`);
        return bestAnalysis || this.analyzeCurrentBalance();
    }

    /**
     * バランス履歴を取得
     */
    public getBalanceHistory(): BalanceAnalysis[] {
        return [...this.balanceHistory];
    }

    /**
     * バランス設定をリセット
     */
    public resetBalance(): void {
        // デフォルト設定に戻す
        const defaultConfig = GameConfig.AI_SYSTEM;
        this.gameConfig.updateAISystemConfig(defaultConfig);

        this.balanceHistory = [];
        console.log('AIBalanceTool: Balance settings reset to defaults');
    }

    /**
     * バランス設定をエクスポート
     */
    public exportBalanceSettings(): string {
        const currentConfig = this.gameConfig.getAISystemConfig();
        const exportData = {
            timestamp: Date.now(),
            aiSystemConfig: currentConfig,
            balanceHistory: this.balanceHistory
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * バランス設定をインポート
     */
    public importBalanceSettings(data: string): boolean {
        try {
            const importData = JSON.parse(data);

            if (importData.aiSystemConfig) {
                this.gameConfig.updateAISystemConfig(importData.aiSystemConfig);
            }

            if (importData.balanceHistory) {
                this.balanceHistory = importData.balanceHistory;
            }

            console.log('AIBalanceTool: Balance settings imported successfully');
            return true;
        } catch (error) {
            console.error('AIBalanceTool: Failed to import balance settings:', error);
            return false;
        }
    }

    /**
     * 難易度設定を分析
     */
    private analyzeDifficultySettings(
        settings: DifficultySettings,
        adjustments: BalanceAdjustment[],
        strengths: string[],
        weaknesses: string[]
    ): void {
        // 思考深度チェック
        if (settings.thinkingDepth > 4) {
            adjustments.push({
                parameter: 'thinkingDepth',
                currentValue: settings.thinkingDepth,
                suggestedValue: 3,
                reason: '思考深度が高すぎて処理時間が長くなる可能性',
                impact: 'high',
                confidence: 0.8
            });
            weaknesses.push('思考深度が高い');
        } else if (settings.thinkingDepth >= 2) {
            strengths.push('適切な思考深度');
        }

        // ランダム性チェック
        if (settings.randomnessFactor > 0.3) {
            adjustments.push({
                parameter: 'randomnessFactor',
                currentValue: settings.randomnessFactor,
                suggestedValue: 0.2,
                reason: 'ランダム性が高すぎてAIの一貫性が損なわれる',
                impact: 'medium',
                confidence: 0.7
            });
            weaknesses.push('ランダム性が高い');
        } else {
            strengths.push('適切なランダム性');
        }

        // ミス確率チェック
        if (settings.mistakeProbability > 0.2) {
            weaknesses.push('ミス確率が高い');
        } else if (settings.mistakeProbability < 0.05) {
            weaknesses.push('ミス確率が低すぎる（難しすぎる）');
        } else {
            strengths.push('適切なミス確率');
        }
    }

    /**
     * パフォーマンス設定を分析
     */
    private analyzePerformanceSettings(
        settings: any,
        adjustments: BalanceAdjustment[],
        strengths: string[],
        weaknesses: string[]
    ): void {
        // 思考時間制限チェック
        if (settings.maxThinkingTime > 3000) {
            adjustments.push({
                parameter: 'maxThinkingTime',
                currentValue: settings.maxThinkingTime,
                suggestedValue: 2000,
                reason: '思考時間制限が長すぎてゲームテンポが悪化',
                impact: 'high',
                confidence: 0.9
            });
            weaknesses.push('思考時間制限が長い');
        } else {
            strengths.push('適切な思考時間制限');
        }

        // メモリ使用量チェック
        if (settings.maxMemoryUsage > 100) {
            weaknesses.push('メモリ使用量制限が高い');
        } else {
            strengths.push('適切なメモリ使用量制限');
        }
    }

    /**
     * バランス設定を分析
     */
    private analyzeBalanceSettings(
        settings: any,
        adjustments: BalanceAdjustment[],
        strengths: string[],
        weaknesses: string[]
    ): void {
        // 行動重みのバランスチェック
        const weights = [
            settings.aggressiveBehaviorWeight,
            settings.defensiveBehaviorWeight,
            settings.supportBehaviorWeight,
            settings.tacticalBehaviorWeight
        ];

        const maxWeight = Math.max(...weights);
        const minWeight = Math.min(...weights);
        const weightRatio = maxWeight / Math.max(minWeight, 0.1);

        if (weightRatio > 3) {
            adjustments.push({
                parameter: 'behaviorWeights',
                currentValue: maxWeight,
                suggestedValue: (maxWeight + minWeight) / 2,
                reason: '行動重みの偏りが大きすぎる',
                impact: 'medium',
                confidence: 0.6
            });
            weaknesses.push('行動重みの偏りが大きい');
        } else {
            strengths.push('バランスの取れた行動重み');
        }

        // NPC保護優先度チェック
        if (settings.npcProtectionPriority < 1.5) {
            weaknesses.push('NPC保護優先度が低い');
        } else if (settings.npcProtectionPriority > 3) {
            weaknesses.push('NPC保護優先度が高すぎる');
        } else {
            strengths.push('適切なNPC保護優先度');
        }
    }

    /**
     * パフォーマンス統計を分析
     */
    private analyzePerformanceStatistics(
        aiId: string,
        stats: AIStatisticsReport,
        adjustments: BalanceAdjustment[],
        strengths: string[],
        weaknesses: string[]
    ): void {
        const performance = stats.statistics.performance;

        // 思考時間分析
        if (performance.averageThinkingTime > 1500) {
            adjustments.push({
                parameter: 'thinkingDepth',
                currentValue: this.gameConfig.getAISystemConfig().difficultySettings.thinkingDepth,
                suggestedValue: Math.max(1, this.gameConfig.getAISystemConfig().difficultySettings.thinkingDepth - 1),
                reason: `AI ${aiId} の思考時間が長すぎる`,
                impact: 'high',
                confidence: 0.8
            });
        }

        // 成功率分析
        if (performance.actionSuccessRate < 0.6) {
            adjustments.push({
                parameter: 'mistakeProbability',
                currentValue: this.gameConfig.getAISystemConfig().balanceSettings.mistakeProbability,
                suggestedValue: Math.max(0, this.gameConfig.getAISystemConfig().balanceSettings.mistakeProbability - 0.1),
                reason: `AI ${aiId} の行動成功率が低い`,
                impact: 'medium',
                confidence: 0.7
            });
        }

        // エラー率分析
        if (performance.errorCount > 5) {
            weaknesses.push(`AI ${aiId} でエラーが多発`);
        }
    }

    /**
     * 行動統計を分析
     */
    private analyzeBehaviorStatistics(
        aiId: string,
        stats: AIStatisticsReport,
        adjustments: BalanceAdjustment[],
        strengths: string[],
        weaknesses: string[]
    ): void {
        const behavior = stats.statistics.behavior;
        const totalActions = Object.values(behavior.actionCounts).reduce((sum, count) => sum + count, 0);

        // 待機行動の割合チェック
        const waitRatio = (behavior.actionCounts['wait'] || 0) / Math.max(totalActions, 1);
        if (waitRatio > 0.3) {
            adjustments.push({
                parameter: 'reactionDelay',
                currentValue: this.gameConfig.getAISystemConfig().balanceSettings.reactionDelay,
                suggestedValue: Math.max(0, this.gameConfig.getAISystemConfig().balanceSettings.reactionDelay - 200),
                reason: `AI ${aiId} の待機行動が多すぎる`,
                impact: 'medium',
                confidence: 0.6
            });
        }

        // スキル使用率チェック
        const skillRatio = (behavior.actionCounts['skill'] || 0) / Math.max(totalActions, 1);
        if (skillRatio < 0.1) {
            adjustments.push({
                parameter: 'skillUsageFrequency',
                currentValue: this.gameConfig.getAISystemConfig().balanceSettings.skillUsageFrequency,
                suggestedValue: Math.min(1, this.gameConfig.getAISystemConfig().balanceSettings.skillUsageFrequency + 0.1),
                reason: `AI ${aiId} のスキル使用率が低い`,
                impact: 'low',
                confidence: 0.5
            });
        }
    }

    /**
     * 効果統計を分析
     */
    private analyzeEffectivenessStatistics(
        aiId: string,
        stats: AIStatisticsReport,
        adjustments: BalanceAdjustment[],
        strengths: string[],
        weaknesses: string[]
    ): void {
        const effectiveness = stats.statistics.effectiveness;

        // ダメージ比率分析
        const damageRatio = effectiveness.totalDamageDealt / Math.max(effectiveness.totalDamageReceived, 1);

        if (damageRatio < 0.5) {
            adjustments.push({
                parameter: 'aggressiveBehaviorWeight',
                currentValue: this.gameConfig.getAISystemConfig().balanceSettings.aggressiveBehaviorWeight,
                suggestedValue: this.gameConfig.getAISystemConfig().balanceSettings.aggressiveBehaviorWeight + 0.2,
                reason: `AI ${aiId} の攻撃効率が低い`,
                impact: 'medium',
                confidence: 0.6
            });
        } else if (damageRatio > 2) {
            adjustments.push({
                parameter: 'defensiveBehaviorWeight',
                currentValue: this.gameConfig.getAISystemConfig().balanceSettings.defensiveBehaviorWeight,
                suggestedValue: this.gameConfig.getAISystemConfig().balanceSettings.defensiveBehaviorWeight + 0.2,
                reason: `AI ${aiId} が攻撃的すぎる`,
                impact: 'medium',
                confidence: 0.6
            });
        }

        // 目標達成率分析
        if (effectiveness.objectivesCompleted === 0) {
            weaknesses.push(`AI ${aiId} が目標を達成していない`);
        } else {
            strengths.push(`AI ${aiId} が目標を達成`);
        }
    }

    /**
     * バランス調整を適用
     */
    private applyBalanceAdjustments(adjustments: BalanceAdjustment[]): void {
        const currentConfig = this.gameConfig.getAISystemConfig();
        const updates: any = {};

        for (const adjustment of adjustments) {
            if (adjustment.confidence >= 0.6) { // 信頼度が十分高い場合のみ適用
                switch (adjustment.parameter) {
                    case 'thinkingDepth':
                        updates.difficultySettings = {
                            ...currentConfig.difficultySettings,
                            thinkingDepth: adjustment.suggestedValue
                        };
                        break;
                    case 'mistakeProbability':
                        updates.balanceSettings = {
                            ...currentConfig.balanceSettings,
                            mistakeProbability: adjustment.suggestedValue
                        };
                        break;
                    case 'maxThinkingTime':
                        updates.performanceSettings = {
                            ...currentConfig.performanceSettings,
                            maxThinkingTime: adjustment.suggestedValue
                        };
                        break;
                    // 他のパラメータも同様に処理
                }
            }
        }

        if (Object.keys(updates).length > 0) {
            this.gameConfig.updateAISystemConfig(updates);
            console.log('AIBalanceTool: Applied balance adjustments:', updates);
        }
    }

    /**
     * 推奨事項を生成
     */
    private generateRecommendations(adjustments: BalanceAdjustment[]): string[] {
        const recommendations: string[] = [];

        const highImpactAdjustments = adjustments.filter(a => a.impact === 'high');
        if (highImpactAdjustments.length > 0) {
            recommendations.push('高影響度の調整が必要です。パフォーマンスに大きく影響する可能性があります。');
        }

        const lowConfidenceAdjustments = adjustments.filter(a => a.confidence < 0.6);
        if (lowConfidenceAdjustments.length > 0) {
            recommendations.push('信頼度の低い調整があります。追加のテストデータが必要です。');
        }

        if (adjustments.length === 0) {
            recommendations.push('現在の設定は適切にバランスが取れています。');
        }

        return recommendations;
    }

    /**
     * 総合スコアを計算
     */
    private calculateOverallScore(adjustments: BalanceAdjustment[]): number {
        if (adjustments.length === 0) return 1.0;

        // 調整の必要性に基づいてスコアを計算
        let totalImpact = 0;
        let weightedImpact = 0;

        for (const adjustment of adjustments) {
            const impactWeight = adjustment.impact === 'high' ? 3 : adjustment.impact === 'medium' ? 2 : 1;
            totalImpact += impactWeight;
            weightedImpact += impactWeight * adjustment.confidence;
        }

        // スコアは調整の必要性が少ないほど高くなる
        const impactScore = Math.max(0, 1 - weightedImpact / 10);
        return Math.min(1, impactScore);
    }
}