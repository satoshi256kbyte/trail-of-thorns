/**
 * Balance testing tool for the recruitment system
 * Provides tools for analyzing and adjusting recruitment balance
 */

import { Unit } from '../types/gameplay';
import {
    RecruitmentCondition,
    RecruitmentContext,
    RecruitmentResult,
    RecruitmentConditionType,
    RecruitableCharacter,
    RecruitmentStatistics
} from '../types/recruitment';
import { RecruitmentDebugManager } from './RecruitmentDebugManager';

/**
 * Balance test configuration
 */
interface BalanceTestConfig {
    testName: string;
    iterations: number;
    damageRange: { min: number; max: number };
    turnRange: { min: number; max: number };
    hpThresholds: number[];
    targetSuccessRate: { min: number; max: number };
    performanceThreshold: number; // ms per test
}

/**
 * Balance test result
 */
interface BalanceTestResult {
    testName: string;
    characterId: string;
    successRate: number;
    averageConditionsMet: number;
    averageEvaluationTime: number;
    conditionBreakdown: Record<string, number>;
    recommendations: string[];
    isBalanced: boolean;
    performanceAcceptable: boolean;
}

/**
 * Balance analysis report
 */
interface BalanceAnalysisReport {
    testDate: Date;
    totalCharactersTested: number;
    overallSuccessRate: number;
    balancedCharacters: number;
    unbalancedCharacters: number;
    performanceIssues: number;
    characterResults: BalanceTestResult[];
    globalRecommendations: string[];
    configurationSuggestions: Record<string, any>;
}

/**
 * Condition effectiveness data
 */
interface ConditionEffectiveness {
    conditionType: RecruitmentConditionType;
    totalTests: number;
    successfulTests: number;
    averageEvaluationTime: number;
    effectivenessScore: number; // 0-100
    commonFailureReasons: string[];
}

/**
 * Recruitment balance testing tool
 */
export class RecruitmentBalanceTool {
    private static instance: RecruitmentBalanceTool;
    private debugManager: RecruitmentDebugManager;
    private testConfigurations: Map<string, BalanceTestConfig> = new Map();
    private testResults: BalanceTestResult[] = [];
    private conditionEffectiveness: Map<RecruitmentConditionType, ConditionEffectiveness> = new Map();

    private constructor() {
        this.debugManager = RecruitmentDebugManager.getInstance();
        this.initializeTestConfigurations();
        this.initializeConditionEffectiveness();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): RecruitmentBalanceTool {
        if (!RecruitmentBalanceTool.instance) {
            RecruitmentBalanceTool.instance = new RecruitmentBalanceTool();
        }
        return RecruitmentBalanceTool.instance;
    }

    /**
     * Initialize default test configurations
     */
    private initializeTestConfigurations(): void {
        // Standard balance test
        this.testConfigurations.set('standard', {
            testName: 'Standard Balance Test',
            iterations: 100,
            damageRange: { min: 20, max: 80 },
            turnRange: { min: 1, max: 10 },
            hpThresholds: [0.1, 0.2, 0.3, 0.4, 0.5],
            targetSuccessRate: { min: 20, max: 60 },
            performanceThreshold: 5
        });

        // Difficulty test (harder conditions)
        this.testConfigurations.set('difficulty', {
            testName: 'Difficulty Balance Test',
            iterations: 200,
            damageRange: { min: 10, max: 50 },
            turnRange: { min: 1, max: 5 },
            hpThresholds: [0.1, 0.15, 0.2, 0.25, 0.3],
            targetSuccessRate: { min: 10, max: 40 },
            performanceThreshold: 5
        });

        // Performance test (high iteration count)
        this.testConfigurations.set('performance', {
            testName: 'Performance Test',
            iterations: 1000,
            damageRange: { min: 30, max: 70 },
            turnRange: { min: 1, max: 8 },
            hpThresholds: [0.2, 0.3, 0.4],
            targetSuccessRate: { min: 25, max: 55 },
            performanceThreshold: 2
        });

        // Edge case test
        this.testConfigurations.set('edge_cases', {
            testName: 'Edge Case Test',
            iterations: 50,
            damageRange: { min: 1, max: 999 },
            turnRange: { min: 1, max: 20 },
            hpThresholds: [0.01, 0.05, 0.1, 0.9, 0.95, 0.99],
            targetSuccessRate: { min: 5, max: 80 },
            performanceThreshold: 10
        });
    }

    /**
     * Initialize condition effectiveness tracking
     */
    private initializeConditionEffectiveness(): void {
        const conditionTypes = Object.values(RecruitmentConditionType);

        for (const type of conditionTypes) {
            this.conditionEffectiveness.set(type, {
                conditionType: type,
                totalTests: 0,
                successfulTests: 0,
                averageEvaluationTime: 0,
                effectivenessScore: 0,
                commonFailureReasons: []
            });
        }
    }

    /**
     * Run balance test for a specific character
     */
    public async runBalanceTest(
        character: RecruitableCharacter,
        attacker: Unit,
        target: Unit,
        configName: string = 'standard'
    ): Promise<BalanceTestResult> {
        const config = this.testConfigurations.get(configName);
        if (!config) {
            throw new Error(`Test configuration not found: ${configName}`);
        }

        console.log(`Running balance test: ${config.testName} for ${character.characterId}`);

        const sessionId = this.debugManager.startDebugSession(
            `balance_test_${character.characterId}_${configName}_${Date.now()}`
        );

        const startTime = Date.now();
        let successCount = 0;
        let totalConditionsMet = 0;
        let totalEvaluationTime = 0;
        const conditionBreakdown: Record<string, number> = {};

        // Initialize condition breakdown
        for (const condition of character.conditions) {
            conditionBreakdown[condition.id] = 0;
        }

        // Run test iterations
        for (let i = 0; i < config.iterations; i++) {
            // Generate random test parameters
            const damage = this.randomInRange(config.damageRange.min, config.damageRange.max);
            const turn = this.randomInRange(config.turnRange.min, config.turnRange.max);
            const hpThreshold = config.hpThresholds[Math.floor(Math.random() * config.hpThresholds.length)];

            // Adjust target HP for testing
            const originalHP = target.currentHP;
            target.currentHP = Math.floor(target.stats.maxHP * hpThreshold);

            const iterationStartTime = Date.now();

            // Run simulation
            const result = this.debugManager.simulateRecruitment(
                attacker,
                target,
                character.conditions,
                damage,
                turn
            );

            const iterationTime = Date.now() - iterationStartTime;
            totalEvaluationTime += iterationTime;

            if (result.success) {
                successCount++;
            }

            // Track condition results
            result.conditionsMet.forEach((met, index) => {
                if (met) {
                    const conditionId = character.conditions[index].id;
                    conditionBreakdown[conditionId]++;
                }
                totalConditionsMet += met ? 1 : 0;
            });

            // Update condition effectiveness
            this.updateConditionEffectiveness(character.conditions, result, iterationTime);

            // Restore original HP
            target.currentHP = originalHP;

            // Progress reporting for long tests
            if (config.iterations > 100 && (i + 1) % 50 === 0) {
                const progress = ((i + 1) / config.iterations * 100).toFixed(1);
                console.log(`  Progress: ${progress}% (${i + 1}/${config.iterations})`);
            }
        }

        const session = this.debugManager.endDebugSession();
        const totalTime = Date.now() - startTime;

        // Calculate results
        const successRate = (successCount / config.iterations) * 100;
        const averageConditionsMet = (totalConditionsMet / (config.iterations * character.conditions.length)) * 100;
        const averageEvaluationTime = totalEvaluationTime / config.iterations;

        // Generate recommendations
        const recommendations = this.generateRecommendations(
            character,
            successRate,
            averageConditionsMet,
            conditionBreakdown,
            config
        );

        // Determine if balanced
        const isBalanced = successRate >= config.targetSuccessRate.min &&
            successRate <= config.targetSuccessRate.max;
        const performanceAcceptable = averageEvaluationTime <= config.performanceThreshold;

        const result: BalanceTestResult = {
            testName: config.testName,
            characterId: character.characterId,
            successRate,
            averageConditionsMet,
            averageEvaluationTime,
            conditionBreakdown,
            recommendations,
            isBalanced,
            performanceAcceptable
        };

        this.testResults.push(result);

        console.log(`Balance test completed for ${character.characterId}:`);
        console.log(`  Success Rate: ${successRate.toFixed(2)}%`);
        console.log(`  Average Evaluation Time: ${averageEvaluationTime.toFixed(2)}ms`);
        console.log(`  Balanced: ${isBalanced ? 'Yes' : 'No'}`);
        console.log(`  Performance: ${performanceAcceptable ? 'Acceptable' : 'Needs Improvement'}`);

        return result;
    }

    /**
     * Run comprehensive balance analysis
     */
    public async runComprehensiveAnalysis(
        recruitableCharacters: RecruitableCharacter[],
        testUnits: { attacker: Unit; targets: Unit[] },
        configNames: string[] = ['standard', 'difficulty']
    ): Promise<BalanceAnalysisReport> {
        console.log('Starting comprehensive balance analysis...');

        const characterResults: BalanceTestResult[] = [];
        let totalSuccessRate = 0;
        let balancedCount = 0;
        let performanceIssues = 0;

        // Run tests for each character and configuration
        for (const character of recruitableCharacters) {
            const target = testUnits.targets.find(t => t.id === character.characterId);
            if (!target) {
                console.warn(`Target unit not found for character: ${character.characterId}`);
                continue;
            }

            for (const configName of configNames) {
                try {
                    const result = await this.runBalanceTest(
                        character,
                        testUnits.attacker,
                        target,
                        configName
                    );

                    characterResults.push(result);
                    totalSuccessRate += result.successRate;

                    if (result.isBalanced) balancedCount++;
                    if (!result.performanceAcceptable) performanceIssues++;

                } catch (error) {
                    console.error(`Error testing ${character.characterId} with ${configName}:`, error);
                }
            }
        }

        // Generate global recommendations
        const globalRecommendations = this.generateGlobalRecommendations(characterResults);

        // Generate configuration suggestions
        const configurationSuggestions = this.generateConfigurationSuggestions(characterResults);

        const report: BalanceAnalysisReport = {
            testDate: new Date(),
            totalCharactersTested: recruitableCharacters.length,
            overallSuccessRate: characterResults.length > 0 ? totalSuccessRate / characterResults.length : 0,
            balancedCharacters: balancedCount,
            unbalancedCharacters: characterResults.length - balancedCount,
            performanceIssues,
            characterResults,
            globalRecommendations,
            configurationSuggestions
        };

        console.log('Comprehensive balance analysis completed');
        this.logAnalysisReport(report);

        return report;
    }

    /**
     * Get condition effectiveness analysis
     */
    public getConditionEffectivenessAnalysis(): Map<RecruitmentConditionType, ConditionEffectiveness> {
        // Calculate effectiveness scores
        for (const [type, data] of this.conditionEffectiveness) {
            if (data.totalTests > 0) {
                data.effectivenessScore = (data.successfulTests / data.totalTests) * 100;
            }
        }

        return new Map(this.conditionEffectiveness);
    }

    /**
     * Export balance test results
     */
    public exportResults(): string {
        const exportData = {
            exportDate: new Date().toISOString(),
            testResults: this.testResults,
            conditionEffectiveness: Array.from(this.conditionEffectiveness.entries()).map(
                ([type, data]) => ({ type, ...data })
            ),
            testConfigurations: Array.from(this.testConfigurations.entries()).map(
                ([name, config]) => ({ name, ...config })
            )
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Clear all test results
     */
    public clearResults(): void {
        this.testResults = [];
        this.initializeConditionEffectiveness();
        console.log('Balance test results cleared');
    }

    /**
     * Add custom test configuration
     */
    public addTestConfiguration(name: string, config: BalanceTestConfig): void {
        this.testConfigurations.set(name, config);
        console.log(`Added test configuration: ${name}`);
    }

    /**
     * Generate random number in range
     */
    private randomInRange(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Update condition effectiveness tracking
     */
    private updateConditionEffectiveness(
        conditions: RecruitmentCondition[],
        result: RecruitmentResult,
        evaluationTime: number
    ): void {
        conditions.forEach((condition, index) => {
            const effectiveness = this.conditionEffectiveness.get(condition.type);
            if (effectiveness) {
                effectiveness.totalTests++;
                if (result.conditionsMet[index]) {
                    effectiveness.successfulTests++;
                }

                // Update average evaluation time
                effectiveness.averageEvaluationTime =
                    (effectiveness.averageEvaluationTime * (effectiveness.totalTests - 1) + evaluationTime)
                    / effectiveness.totalTests;
            }
        });
    }

    /**
     * Generate recommendations for a character
     */
    private generateRecommendations(
        character: RecruitableCharacter,
        successRate: number,
        averageConditionsMet: number,
        conditionBreakdown: Record<string, number>,
        config: BalanceTestConfig
    ): string[] {
        const recommendations: string[] = [];

        // Success rate analysis
        if (successRate < config.targetSuccessRate.min) {
            recommendations.push(`Success rate too low (${successRate.toFixed(2)}%). Consider relaxing conditions.`);

            // Identify problematic conditions
            const totalTests = config.iterations;
            for (const [conditionId, successCount] of Object.entries(conditionBreakdown)) {
                const conditionSuccessRate = (successCount / totalTests) * 100;
                if (conditionSuccessRate < 30) {
                    recommendations.push(`Condition '${conditionId}' is too restrictive (${conditionSuccessRate.toFixed(2)}% success rate).`);
                }
            }
        } else if (successRate > config.targetSuccessRate.max) {
            recommendations.push(`Success rate too high (${successRate.toFixed(2)}%). Consider tightening conditions.`);
            recommendations.push('Add additional conditions or make existing ones more restrictive.');
        }

        // Condition balance analysis
        if (averageConditionsMet < 50) {
            recommendations.push('Many conditions are failing. Review condition parameters.');
        }

        // Individual condition analysis
        const conditionCount = character.conditions.length;
        for (const [conditionId, successCount] of Object.entries(conditionBreakdown)) {
            const conditionSuccessRate = (successCount / config.iterations) * 100;

            if (conditionSuccessRate > 90) {
                recommendations.push(`Condition '${conditionId}' is almost always met. Consider making it more challenging.`);
            } else if (conditionSuccessRate < 10) {
                recommendations.push(`Condition '${conditionId}' is rarely met. Consider making it more achievable.`);
            }
        }

        // Complexity analysis
        if (conditionCount > 4) {
            recommendations.push('Character has many conditions. Consider simplifying for better player experience.');
        } else if (conditionCount === 1) {
            recommendations.push('Character has only one condition. Consider adding variety with additional conditions.');
        }

        return recommendations;
    }

    /**
     * Generate global recommendations
     */
    private generateGlobalRecommendations(results: BalanceTestResult[]): string[] {
        const recommendations: string[] = [];

        if (results.length === 0) {
            return ['No test results available for analysis.'];
        }

        const averageSuccessRate = results.reduce((sum, r) => sum + r.successRate, 0) / results.length;
        const balancedCount = results.filter(r => r.isBalanced).length;
        const performanceIssues = results.filter(r => !r.performanceAcceptable).length;

        // Overall balance
        if (balancedCount / results.length < 0.7) {
            recommendations.push('Less than 70% of characters are well-balanced. Review global balance settings.');
        }

        // Performance issues
        if (performanceIssues > 0) {
            recommendations.push(`${performanceIssues} characters have performance issues. Optimize condition evaluation.`);
        }

        // Success rate distribution
        if (averageSuccessRate < 20) {
            recommendations.push('Overall success rates are too low. Consider global difficulty reduction.');
        } else if (averageSuccessRate > 70) {
            recommendations.push('Overall success rates are too high. Consider global difficulty increase.');
        }

        // Condition effectiveness
        const conditionAnalysis = this.getConditionEffectivenessAnalysis();
        for (const [type, data] of conditionAnalysis) {
            if (data.totalTests > 10) {
                if (data.effectivenessScore < 20) {
                    recommendations.push(`${type} conditions are too restrictive (${data.effectivenessScore.toFixed(2)}% effectiveness).`);
                } else if (data.effectivenessScore > 80) {
                    recommendations.push(`${type} conditions are too lenient (${data.effectivenessScore.toFixed(2)}% effectiveness).`);
                }
            }
        }

        return recommendations;
    }

    /**
     * Generate configuration suggestions
     */
    private generateConfigurationSuggestions(results: BalanceTestResult[]): Record<string, any> {
        const suggestions: Record<string, any> = {};

        if (results.length === 0) {
            return suggestions;
        }

        const averageSuccessRate = results.reduce((sum, r) => sum + r.successRate, 0) / results.length;
        const averageEvaluationTime = results.reduce((sum, r) => sum + r.averageEvaluationTime, 0) / results.length;

        // Animation speed suggestions
        if (averageEvaluationTime > 5) {
            suggestions.animationSpeed = 1.5; // Speed up animations
            suggestions.conditionDisplayDuration = 1500; // Reduce display time
        }

        // Balance settings suggestions
        if (averageSuccessRate < 30) {
            suggestions.balanceSettings = {
                npcSurvivalBonus: 150, // Increase bonus to encourage recruitment
                conditionDisplayDuration: 4000 // Give players more time to understand
            };
        } else if (averageSuccessRate > 60) {
            suggestions.balanceSettings = {
                npcSurvivalBonus: 75, // Reduce bonus to increase difficulty
                conditionDisplayDuration: 2000 // Reduce display time
            };
        }

        // Debug settings suggestions
        const performanceIssues = results.filter(r => !r.performanceAcceptable).length;
        if (performanceIssues > results.length * 0.3) {
            suggestions.enableDetailedLogging = false; // Disable to improve performance
            suggestions.showConditionCheckDebug = false;
        }

        return suggestions;
    }

    /**
     * Log analysis report
     */
    private logAnalysisReport(report: BalanceAnalysisReport): void {
        console.log('=== Balance Analysis Report ===');
        console.log(`Test Date: ${report.testDate.toISOString()}`);
        console.log(`Characters Tested: ${report.totalCharactersTested}`);
        console.log(`Overall Success Rate: ${report.overallSuccessRate.toFixed(2)}%`);
        console.log(`Balanced Characters: ${report.balancedCharacters}/${report.totalCharactersTested}`);
        console.log(`Performance Issues: ${report.performanceIssues}`);
        console.log('');

        console.log('Global Recommendations:');
        report.globalRecommendations.forEach((rec, index) => {
            console.log(`  ${index + 1}. ${rec}`);
        });
        console.log('');

        if (Object.keys(report.configurationSuggestions).length > 0) {
            console.log('Configuration Suggestions:');
            console.log(JSON.stringify(report.configurationSuggestions, null, 2));
        }
    }
}