/**
 * ExperienceBalanceTool - 経験値バランス調整ツール
 * 
 * このクラスは経験値システムのバランス調整用ツールを提供します:
 * - 経験値獲得量の動的調整
 * - レベル進行曲線の分析・調整
 * - 成長率バランスの最適化
 * - A/Bテスト機能
 * 
 * 要件: 全要件の設定可能性とデバッグ支援
 * 
 * @version 1.0.0
 * @author Trail of Thorns Development Team
 */

import {
    ExperienceAction,
    ExperienceSource,
    ExperienceTableData,
    GrowthRates,
    StatGrowthResult,
    ExperienceStatistics
} from '../types/experience';
import { ExperienceSystem } from '../systems/experience/ExperienceSystem';
import { ExperienceDebugManager } from './ExperienceDebugManager';
import { GameConfig, ExperienceSystemConfig } from '../config/GameConfig';

/**
 * バランス調整設定
 */
interface BalanceConfiguration {
    name: string;
    description: string;
    experienceMultiplier: number;
    baseExperienceValues: Record<ExperienceAction, number>;
    levelRequirements: number[];
    maxLevel: number;
    growthRateModifiers: Record<string, number>;
}

/**
 * バランステスト結果
 */
interface BalanceTestResult {
    configurationName: string;
    testDuration: number;
    averageLevelUpTime: number;
    experienceEfficiency: Record<ExperienceSource, number>;
    levelDistribution: Record<number, number>;
    statGrowthBalance: StatGrowthResult;
    playerSatisfactionScore: number;
    recommendations: string[];
}

/**
 * レベル進行分析結果
 */
interface LevelProgressionAnalysis {
    currentCurve: number[];
    recommendedCurve: number[];
    difficultySpikes: number[];
    plateauPoints: number[];
    balanceScore: number;
    suggestions: string[];
}

/**
 * 成長率最適化結果
 */
interface GrowthRateOptimization {
    characterId: string;
    currentRates: GrowthRates;
    optimizedRates: GrowthRates;
    expectedImprovement: number;
    balanceImpact: string[];
}

/**
 * ExperienceBalanceToolクラス
 * 経験値システムのバランス調整機能を提供
 */
export class ExperienceBalanceTool {
    private experienceSystem: ExperienceSystem;
    private debugManager: ExperienceDebugManager;
    private gameConfig: GameConfig;

    // バランス設定
    private balanceConfigurations: Map<string, BalanceConfiguration> = new Map();
    private currentConfiguration: string = 'default';
    private testResults: Map<string, BalanceTestResult> = new Map();

    // 分析データ
    private levelProgressionData: number[][] = [];
    private experienceGainHistory: { timestamp: number; amount: number; source: ExperienceSource }[] = [];
    private statGrowthHistory: { timestamp: number; growth: StatGrowthResult }[] = [];

    constructor(
        experienceSystem: ExperienceSystem,
        debugManager: ExperienceDebugManager
    ) {
        this.experienceSystem = experienceSystem;
        this.debugManager = debugManager;
        this.gameConfig = new GameConfig();

        // デフォルト設定を初期化
        this.initializeDefaultConfigurations();

        // データ収集を開始
        this.startDataCollection();

        console.log('ExperienceBalanceTool initialized');
    }

    /**
     * デフォルトバランス設定を初期化
     */
    private initializeDefaultConfigurations(): void {
        // デフォルト設定
        const defaultConfig: BalanceConfiguration = {
            name: 'default',
            description: 'Default balanced experience settings',
            experienceMultiplier: 1.0,
            baseExperienceValues: {
                [ExperienceAction.ATTACK]: 5,
                [ExperienceAction.DEFEAT]: 20,
                [ExperienceAction.HEAL]: 10,
                [ExperienceAction.SUPPORT]: 8,
                [ExperienceAction.SKILL_CAST]: 12,
                [ExperienceAction.BUFF_APPLY]: 6,
                [ExperienceAction.DEBUFF_APPLY]: 7
            },
            levelRequirements: this.generateDefaultLevelRequirements(),
            maxLevel: 20,
            growthRateModifiers: {
                hp: 1.0,
                mp: 1.0,
                attack: 1.0,
                defense: 1.0,
                speed: 1.0,
                skill: 1.0,
                luck: 1.0
            }
        };

        // 高速成長設定
        const fastGrowthConfig: BalanceConfiguration = {
            ...defaultConfig,
            name: 'fast-growth',
            description: 'Faster character progression for testing',
            experienceMultiplier: 2.0,
            baseExperienceValues: {
                [ExperienceAction.ATTACK]: 10,
                [ExperienceAction.DEFEAT]: 40,
                [ExperienceAction.HEAL]: 20,
                [ExperienceAction.SUPPORT]: 16,
                [ExperienceAction.SKILL_CAST]: 24,
                [ExperienceAction.BUFF_APPLY]: 12,
                [ExperienceAction.DEBUFF_APPLY]: 14
            }
        };

        // バランス重視設定
        const balancedConfig: BalanceConfiguration = {
            ...defaultConfig,
            name: 'balanced',
            description: 'Carefully balanced progression curve',
            baseExperienceValues: {
                [ExperienceAction.ATTACK]: 3,
                [ExperienceAction.DEFEAT]: 15,
                [ExperienceAction.HEAL]: 12,
                [ExperienceAction.SUPPORT]: 10,
                [ExperienceAction.SKILL_CAST]: 8,
                [ExperienceAction.BUFF_APPLY]: 8,
                [ExperienceAction.DEBUFF_APPLY]: 6
            },
            growthRateModifiers: {
                hp: 0.9,
                mp: 1.1,
                attack: 1.0,
                defense: 1.0,
                speed: 1.1,
                skill: 1.2,
                luck: 0.8
            }
        };

        this.balanceConfigurations.set('default', defaultConfig);
        this.balanceConfigurations.set('fast-growth', fastGrowthConfig);
        this.balanceConfigurations.set('balanced', balancedConfig);
    }

    /**
     * デフォルトレベル要求値を生成
     */
    private generateDefaultLevelRequirements(): number[] {
        const requirements: number[] = [0]; // レベル1は0経験値

        for (let level = 2; level <= 20; level++) {
            // 指数的成長曲線
            const baseExp = 100;
            const growthFactor = 1.2;
            const requirement = Math.floor(baseExp * Math.pow(growthFactor, level - 2));
            requirements.push(requirement);
        }

        return requirements;
    }

    /**
     * データ収集を開始
     */
    private startDataCollection(): void {
        // 経験値獲得イベントを監視
        this.experienceSystem.on('experience-awarded', (data: any) => {
            this.experienceGainHistory.push({
                timestamp: Date.now(),
                amount: data.result.finalAmount,
                source: data.result.source
            });

            // 履歴サイズを制限
            if (this.experienceGainHistory.length > 10000) {
                this.experienceGainHistory.shift();
            }
        });

        // レベルアップイベントを監視
        this.experienceSystem.on('level-up-processed', (data: any) => {
            this.statGrowthHistory.push({
                timestamp: Date.now(),
                growth: data.result.statGrowth
            });

            // 履歴サイズを制限
            if (this.statGrowthHistory.length > 1000) {
                this.statGrowthHistory.shift();
            }
        });
    }

    /**
     * バランス設定を適用
     */
    public applyBalanceConfiguration(configName: string): boolean {
        const config = this.balanceConfigurations.get(configName);
        if (!config) {
            console.error(`Balance configuration '${configName}' not found`);
            return false;
        }

        try {
            // 経験値倍率を設定
            this.experienceSystem.setExperienceMultiplier(
                config.experienceMultiplier,
                `Balance configuration: ${configName}`
            );

            // 基本経験値を設定
            Object.entries(config.baseExperienceValues).forEach(([action, value]) => {
                this.gameConfig.updateExperienceSystemBalanceSetting(
                    `base${action}Experience`,
                    value
                );
            });

            // 最大レベルを設定
            this.gameConfig.updateExperienceSystemBalanceSetting('maxLevel', config.maxLevel);

            this.currentConfiguration = configName;
            console.log(`Applied balance configuration: ${configName}`);
            return true;

        } catch (error) {
            console.error(`Failed to apply balance configuration: ${error}`);
            return false;
        }
    }

    /**
     * カスタムバランス設定を作成
     */
    public createCustomConfiguration(
        name: string,
        description: string,
        settings: Partial<BalanceConfiguration>
    ): boolean {
        try {
            const defaultConfig = this.balanceConfigurations.get('default')!;
            const customConfig: BalanceConfiguration = {
                ...defaultConfig,
                name,
                description,
                ...settings
            };

            this.balanceConfigurations.set(name, customConfig);
            console.log(`Created custom balance configuration: ${name}`);
            return true;

        } catch (error) {
            console.error(`Failed to create custom configuration: ${error}`);
            return false;
        }
    }

    /**
     * バランステストを実行
     */
    public async runBalanceTest(
        configName: string,
        testDuration: number = 60000,
        characterIds: string[] = []
    ): Promise<BalanceTestResult> {
        const config = this.balanceConfigurations.get(configName);
        if (!config) {
            throw new Error(`Configuration '${configName}' not found`);
        }

        console.log(`Starting balance test for configuration: ${configName}`);
        const startTime = Date.now();

        // 設定を適用
        const originalConfig = this.currentConfiguration;
        this.applyBalanceConfiguration(configName);

        try {
            // テスト用データを収集
            const testData = {
                levelUps: 0,
                experienceGained: 0,
                experienceBySource: {} as Record<ExperienceSource, number>,
                levelDistribution: {} as Record<number, number>,
                statGrowthTotal: {
                    hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, skill: 0, luck: 0
                } as StatGrowthResult
            };

            // 経験値源別統計を初期化
            Object.values(ExperienceSource).forEach(source => {
                testData.experienceBySource[source] = 0;
            });

            // テスト期間中のデータ収集
            const testEndTime = startTime + testDuration;

            while (Date.now() < testEndTime) {
                // シミュレーションを実行
                for (const characterId of characterIds) {
                    try {
                        const simulationResult = await this.debugManager.runExperienceSimulation(
                            characterId,
                            [
                                { action: ExperienceAction.ATTACK, count: 5 },
                                { action: ExperienceAction.HEAL, count: 2 },
                                { action: ExperienceAction.SUPPORT, count: 3 }
                            ],
                            { duration: 1000, logResults: false, visualize: false }
                        );

                        testData.levelUps += simulationResult.levelUpsCount;
                        testData.experienceGained += simulationResult.totalExperienceGained;

                        // レベル分布を記録
                        const level = simulationResult.finalLevel;
                        testData.levelDistribution[level] = (testData.levelDistribution[level] || 0) + 1;

                        // 能力値成長を累積
                        this.addStatGrowth(testData.statGrowthTotal, simulationResult.statGrowthTotal);

                    } catch (error) {
                        console.warn(`Simulation failed for ${characterId}:`, error);
                    }
                }

                // 短い待機
                await this.delay(100);
            }

            // テスト結果を分析
            const actualDuration = Date.now() - startTime;
            const averageLevelUpTime = testData.levelUps > 0 ? actualDuration / testData.levelUps : 0;

            // 経験値効率を計算
            const experienceEfficiency: Record<ExperienceSource, number> = {} as Record<ExperienceSource, number>;
            Object.values(ExperienceSource).forEach(source => {
                experienceEfficiency[source] = testData.experienceBySource[source] / actualDuration * 1000;
            });

            // プレイヤー満足度スコアを計算（簡略化）
            const satisfactionScore = this.calculateSatisfactionScore(testData, config);

            // 推奨事項を生成
            const recommendations = this.generateRecommendations(testData, config);

            const result: BalanceTestResult = {
                configurationName: configName,
                testDuration: actualDuration,
                averageLevelUpTime,
                experienceEfficiency,
                levelDistribution: testData.levelDistribution,
                statGrowthBalance: testData.statGrowthTotal,
                playerSatisfactionScore: satisfactionScore,
                recommendations
            };

            this.testResults.set(configName, result);
            console.log(`Balance test completed for ${configName}:`, result);
            return result;

        } finally {
            // 元の設定に戻す
            this.applyBalanceConfiguration(originalConfig);
        }
    }

    /**
     * レベル進行曲線を分析
     */
    public analyzeLevelProgression(): LevelProgressionAnalysis {
        const config = this.balanceConfigurations.get(this.currentConfiguration)!;
        const currentCurve = config.levelRequirements;

        // 推奨曲線を計算
        const recommendedCurve = this.calculateOptimalLevelCurve();

        // 難易度スパイクを検出
        const difficultySpikes = this.detectDifficultySpikes(currentCurve);

        // プラトー（停滞）ポイントを検出
        const plateauPoints = this.detectPlateauPoints(currentCurve);

        // バランススコアを計算
        const balanceScore = this.calculateLevelCurveBalance(currentCurve);

        // 改善提案を生成
        const suggestions = this.generateLevelCurveSuggestions(
            currentCurve,
            recommendedCurve,
            difficultySpikes,
            plateauPoints
        );

        return {
            currentCurve,
            recommendedCurve,
            difficultySpikes,
            plateauPoints,
            balanceScore,
            suggestions
        };
    }

    /**
     * 成長率を最適化
     */
    public optimizeGrowthRates(characterId: string): GrowthRateOptimization {
        // 現在の成長率を取得（実装が必要）
        const currentRates: GrowthRates = {
            hp: 50, mp: 40, attack: 45, defense: 40, speed: 35, skill: 50, luck: 30
        };

        // 統計データに基づいて最適化
        const optimizedRates = this.calculateOptimalGrowthRates(characterId, currentRates);

        // 改善予測を計算
        const expectedImprovement = this.calculateGrowthRateImprovement(currentRates, optimizedRates);

        // バランスへの影響を分析
        const balanceImpact = this.analyzeGrowthRateBalanceImpact(currentRates, optimizedRates);

        return {
            characterId,
            currentRates,
            optimizedRates,
            expectedImprovement,
            balanceImpact
        };
    }

    /**
     * A/Bテストを実行
     */
    public async runABTest(
        configA: string,
        configB: string,
        testDuration: number = 120000,
        characterIds: string[] = []
    ): Promise<{
        configA: BalanceTestResult;
        configB: BalanceTestResult;
        winner: string;
        confidence: number;
        analysis: string[];
    }> {
        console.log(`Starting A/B test: ${configA} vs ${configB}`);

        // 両方の設定をテスト
        const resultA = await this.runBalanceTest(configA, testDuration / 2, characterIds);
        const resultB = await this.runBalanceTest(configB, testDuration / 2, characterIds);

        // 勝者を決定
        const winner = this.determineABTestWinner(resultA, resultB);
        const confidence = this.calculateABTestConfidence(resultA, resultB);

        // 分析結果を生成
        const analysis = this.generateABTestAnalysis(resultA, resultB);

        return {
            configA: resultA,
            configB: resultB,
            winner,
            confidence,
            analysis
        };
    }

    /**
     * バランス調整レポートを生成
     */
    public generateBalanceReport(): {
        currentConfiguration: string;
        overallBalance: number;
        levelProgression: LevelProgressionAnalysis;
        testResults: BalanceTestResult[];
        recommendations: string[];
    } {
        const levelProgression = this.analyzeLevelProgression();
        const testResults = Array.from(this.testResults.values());

        // 全体的なバランススコアを計算
        const overallBalance = this.calculateOverallBalance();

        // 総合的な推奨事項を生成
        const recommendations = this.generateOverallRecommendations(levelProgression, testResults);

        return {
            currentConfiguration: this.currentConfiguration,
            overallBalance,
            levelProgression,
            testResults,
            recommendations
        };
    }

    /**
     * バランス設定をエクスポート
     */
    public exportBalanceConfiguration(configName: string): string | null {
        const config = this.balanceConfigurations.get(configName);
        if (!config) {
            return null;
        }

        return JSON.stringify(config, null, 2);
    }

    /**
     * バランス設定をインポート
     */
    public importBalanceConfiguration(configJson: string): boolean {
        try {
            const config: BalanceConfiguration = JSON.parse(configJson);

            // 設定を検証
            if (!this.validateBalanceConfiguration(config)) {
                console.error('Invalid balance configuration');
                return false;
            }

            this.balanceConfigurations.set(config.name, config);
            console.log(`Imported balance configuration: ${config.name}`);
            return true;

        } catch (error) {
            console.error(`Failed to import balance configuration: ${error}`);
            return false;
        }
    }

    // ===== プライベートヘルパーメソッド =====

    private calculateOptimalLevelCurve(): number[] {
        // 理想的なレベル曲線を計算（簡略化）
        const curve: number[] = [0];
        for (let level = 2; level <= 20; level++) {
            const baseExp = 80;
            const growthFactor = 1.15;
            curve.push(Math.floor(baseExp * Math.pow(growthFactor, level - 2)));
        }
        return curve;
    }

    private detectDifficultySpikes(curve: number[]): number[] {
        const spikes: number[] = [];
        for (let i = 1; i < curve.length - 1; i++) {
            const prevDiff = curve[i] - curve[i - 1];
            const nextDiff = curve[i + 1] - curve[i];

            if (nextDiff > prevDiff * 1.5) {
                spikes.push(i + 1);
            }
        }
        return spikes;
    }

    private detectPlateauPoints(curve: number[]): number[] {
        const plateaus: number[] = [];
        for (let i = 1; i < curve.length - 1; i++) {
            const prevDiff = curve[i] - curve[i - 1];
            const nextDiff = curve[i + 1] - curve[i];

            if (Math.abs(nextDiff - prevDiff) < prevDiff * 0.1) {
                plateaus.push(i + 1);
            }
        }
        return plateaus;
    }

    private calculateLevelCurveBalance(curve: number[]): number {
        // バランススコアを計算（0-100）
        let score = 100;

        // 急激な変化にペナルティ
        for (let i = 1; i < curve.length - 1; i++) {
            const prevDiff = curve[i] - curve[i - 1];
            const nextDiff = curve[i + 1] - curve[i];
            const ratio = Math.abs(nextDiff - prevDiff) / Math.max(prevDiff, 1);

            if (ratio > 0.5) {
                score -= 5;
            }
        }

        return Math.max(0, score);
    }

    private generateLevelCurveSuggestions(
        current: number[],
        recommended: number[],
        spikes: number[],
        plateaus: number[]
    ): string[] {
        const suggestions: string[] = [];

        if (spikes.length > 0) {
            suggestions.push(`Difficulty spikes detected at levels: ${spikes.join(', ')}. Consider smoothing the progression.`);
        }

        if (plateaus.length > 0) {
            suggestions.push(`Plateau points detected at levels: ${plateaus.join(', ')}. Consider adding more variation.`);
        }

        const avgDifference = current.reduce((sum, val, i) => sum + Math.abs(val - recommended[i]), 0) / current.length;
        if (avgDifference > 50) {
            suggestions.push('Current curve deviates significantly from recommended curve. Consider rebalancing.');
        }

        return suggestions;
    }

    private calculateOptimalGrowthRates(characterId: string, currentRates: GrowthRates): GrowthRates {
        // 統計データに基づいて最適な成長率を計算（簡略化）
        return {
            hp: Math.min(100, currentRates.hp + 5),
            mp: Math.min(100, currentRates.mp + 3),
            attack: Math.min(100, currentRates.attack + 2),
            defense: Math.min(100, currentRates.defense + 2),
            speed: Math.min(100, currentRates.speed + 4),
            skill: Math.min(100, currentRates.skill + 3),
            luck: Math.min(100, currentRates.luck + 1)
        };
    }

    private calculateGrowthRateImprovement(current: GrowthRates, optimized: GrowthRates): number {
        const currentTotal = Object.values(current).reduce((sum, val) => sum + val, 0);
        const optimizedTotal = Object.values(optimized).reduce((sum, val) => sum + val, 0);
        return ((optimizedTotal - currentTotal) / currentTotal) * 100;
    }

    private analyzeGrowthRateBalanceImpact(current: GrowthRates, optimized: GrowthRates): string[] {
        const impact: string[] = [];

        Object.entries(optimized).forEach(([stat, rate]) => {
            const currentRate = current[stat as keyof GrowthRates];
            const difference = rate - currentRate;

            if (Math.abs(difference) > 5) {
                impact.push(`${stat}: ${difference > 0 ? '+' : ''}${difference}% (${currentRate}% → ${rate}%)`);
            }
        });

        return impact;
    }

    private calculateSatisfactionScore(testData: any, config: BalanceConfiguration): number {
        // プレイヤー満足度スコアを計算（簡略化）
        let score = 50;

        // レベルアップ頻度
        const levelUpFrequency = testData.levelUps / (testData.testDuration / 60000);
        if (levelUpFrequency > 0.5 && levelUpFrequency < 2) {
            score += 20;
        }

        // 経験値バランス
        const expBalance = Object.values(testData.experienceBySource).reduce((sum: number, val: number) => sum + val, 0);
        if (expBalance > 0) {
            score += 15;
        }

        // 能力値成長バランス
        const statValues = Object.values(testData.statGrowthTotal);
        const statVariance = this.calculateVariance(statValues);
        if (statVariance < 10) {
            score += 15;
        }

        return Math.min(100, Math.max(0, score));
    }

    private generateRecommendations(testData: any, config: BalanceConfiguration): string[] {
        const recommendations: string[] = [];

        // レベルアップ頻度の分析
        const levelUpFrequency = testData.levelUps / (testData.testDuration / 60000);
        if (levelUpFrequency < 0.3) {
            recommendations.push('Level up frequency is too low. Consider increasing experience gains.');
        } else if (levelUpFrequency > 3) {
            recommendations.push('Level up frequency is too high. Consider reducing experience gains.');
        }

        // 経験値源のバランス
        const expSources = Object.entries(testData.experienceBySource);
        const maxSource = expSources.reduce((max, [source, amount]) =>
            (amount as number) > (max[1] as number) ? [source, amount] : max
        );
        const minSource = expSources.reduce((min, [source, amount]) =>
            (amount as number) < (min[1] as number) ? [source, amount] : min
        );

        if ((maxSource[1] as number) > (minSource[1] as number) * 3) {
            recommendations.push(`Experience source imbalance detected. ${maxSource[0]} provides too much compared to ${minSource[0]}.`);
        }

        return recommendations;
    }

    private determineABTestWinner(resultA: BalanceTestResult, resultB: BalanceTestResult): string {
        const scoreA = resultA.playerSatisfactionScore;
        const scoreB = resultB.playerSatisfactionScore;

        if (Math.abs(scoreA - scoreB) < 5) {
            return 'tie';
        }

        return scoreA > scoreB ? resultA.configurationName : resultB.configurationName;
    }

    private calculateABTestConfidence(resultA: BalanceTestResult, resultB: BalanceTestResult): number {
        // 信頼度を計算（簡略化）
        const scoreDiff = Math.abs(resultA.playerSatisfactionScore - resultB.playerSatisfactionScore);
        return Math.min(95, scoreDiff * 2);
    }

    private generateABTestAnalysis(resultA: BalanceTestResult, resultB: BalanceTestResult): string[] {
        const analysis: string[] = [];

        // 満足度スコア比較
        const scoreDiff = resultA.playerSatisfactionScore - resultB.playerSatisfactionScore;
        analysis.push(`Satisfaction score difference: ${scoreDiff.toFixed(1)} (${resultA.configurationName}: ${resultA.playerSatisfactionScore}, ${resultB.configurationName}: ${resultB.playerSatisfactionScore})`);

        // レベルアップ時間比較
        const timeDiff = resultA.averageLevelUpTime - resultB.averageLevelUpTime;
        analysis.push(`Average level up time difference: ${(timeDiff / 1000).toFixed(1)}s`);

        // 推奨事項の比較
        if (resultA.recommendations.length < resultB.recommendations.length) {
            analysis.push(`${resultA.configurationName} has fewer balance issues`);
        } else if (resultA.recommendations.length > resultB.recommendations.length) {
            analysis.push(`${resultB.configurationName} has fewer balance issues`);
        }

        return analysis;
    }

    private calculateOverallBalance(): number {
        const testResults = Array.from(this.testResults.values());
        if (testResults.length === 0) {
            return 50;
        }

        const avgSatisfaction = testResults.reduce((sum, result) => sum + result.playerSatisfactionScore, 0) / testResults.length;
        return avgSatisfaction;
    }

    private generateOverallRecommendations(
        levelProgression: LevelProgressionAnalysis,
        testResults: BalanceTestResult[]
    ): string[] {
        const recommendations: string[] = [];

        // レベル進行の推奨事項
        recommendations.push(...levelProgression.suggestions);

        // テスト結果からの推奨事項
        const commonRecommendations = new Map<string, number>();
        testResults.forEach(result => {
            result.recommendations.forEach(rec => {
                commonRecommendations.set(rec, (commonRecommendations.get(rec) || 0) + 1);
            });
        });

        // 複数のテストで共通する推奨事項を追加
        for (const [rec, count] of commonRecommendations) {
            if (count > 1) {
                recommendations.push(`${rec} (mentioned in ${count} tests)`);
            }
        }

        return recommendations;
    }

    private validateBalanceConfiguration(config: BalanceConfiguration): boolean {
        if (!config.name || !config.description) {
            return false;
        }

        if (config.experienceMultiplier < 0 || config.maxLevel < 1 || config.maxLevel > 99) {
            return false;
        }

        if (!config.baseExperienceValues || !config.levelRequirements || !config.growthRateModifiers) {
            return false;
        }

        return true;
    }

    private calculateVariance(values: number[]): number {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    }

    private addStatGrowth(total: StatGrowthResult, growth: StatGrowthResult): void {
        total.hp += growth.hp;
        total.mp += growth.mp;
        total.attack += growth.attack;
        total.defense += growth.defense;
        total.speed += growth.speed;
        total.skill += growth.skill;
        total.luck += growth.luck;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * リソースを解放
     */
    public destroy(): void {
        this.balanceConfigurations.clear();
        this.testResults.clear();
        this.levelProgressionData = [];
        this.experienceGainHistory = [];
        this.statGrowthHistory = [];

        console.log('ExperienceBalanceTool destroyed');
    }
}