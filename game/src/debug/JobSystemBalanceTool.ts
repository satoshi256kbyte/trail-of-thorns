/**
 * JobSystemBalanceTool - 職業システムバランス調整ツール
 * 
 * このクラスは職業システムのバランス調整、データ検証、
 * 開発用設定管理を提供します。
 */

import { JobSystem } from '../systems/jobs/JobSystem';
import { JobData, StatModifiers, RankUpRequirements } from '../types/job';
import { Job } from '../systems/jobs/Job';

/**
 * バランス調整設定
 */
export interface BalanceConfig {
    // 薔薇の力設定
    roseEssence: {
        baseGainMultiplier: number;
        firstTimeBonusMultiplier: number;
        difficultyModifier: number;
        rankUpCostMultiplier: number;
    };

    // 職業成長設定
    jobGrowth: {
        statGrowthMultiplier: number;
        skillUnlockThreshold: number;
        maxRankMultiplier: number;
    };

    // 経験値設定
    experience: {
        jobChangeExperienceRetention: number;
        rankUpExperienceBonus: number;
    };
}

/**
 * バランステスト結果
 */
export interface BalanceTestResult {
    testName: string;
    passed: boolean;
    issues: string[];
    recommendations: string[];
    metrics: any;
}

/**
 * 職業システムバランス調整ツール
 */
export class JobSystemBalanceTool {
    private jobSystem: JobSystem;
    private originalConfig: BalanceConfig;
    private currentConfig: BalanceConfig;
    private testResults: BalanceTestResult[] = [];

    private static readonly DEFAULT_BALANCE_CONFIG: BalanceConfig = {
        roseEssence: {
            baseGainMultiplier: 1.0,
            firstTimeBonusMultiplier: 2.0,
            difficultyModifier: 1.0,
            rankUpCostMultiplier: 1.0,
        },
        jobGrowth: {
            statGrowthMultiplier: 1.0,
            skillUnlockThreshold: 1.0,
            maxRankMultiplier: 1.0,
        },
        experience: {
            jobChangeExperienceRetention: 0.8,
            rankUpExperienceBonus: 1.2,
        },
    };

    constructor(jobSystem: JobSystem, config?: Partial<BalanceConfig>) {
        this.jobSystem = jobSystem;
        this.originalConfig = { ...JobSystemBalanceTool.DEFAULT_BALANCE_CONFIG };
        this.currentConfig = { ...this.originalConfig, ...config };

        this.setupConsoleCommands();
    }

    /**
     * コンソールコマンドを設定
     */
    private setupConsoleCommands(): void {
        if (typeof window !== 'undefined') {
            (window as any).jobBalance = {
                // バランス設定
                setConfig: (config: Partial<BalanceConfig>) => this.setBalanceConfig(config),
                getConfig: () => this.getBalanceConfig(),
                resetConfig: () => this.resetBalanceConfig(),

                // テスト実行
                runTests: () => this.runAllBalanceTests(),
                testJobProgression: () => this.testJobProgression(),
                testRoseEssenceEconomy: () => this.testRoseEssenceEconomy(),
                testJobBalance: () => this.testJobBalance(),

                // データ検証
                validateJobData: () => this.validateAllJobData(),
                validateRoseEssenceData: () => this.validateRoseEssenceData(),

                // シミュレーション
                simulateProgression: (characterId: string, stages: number) =>
                    this.simulateCharacterProgression(characterId, stages),
                simulateEconomy: (playerCount: number, stages: number) =>
                    this.simulateEconomyBalance(playerCount, stages),

                // レポート
                generateReport: () => this.generateBalanceReport(),
                exportResults: () => this.exportTestResults(),

                // ヘルプ
                help: () => this.showHelp(),
            };

            console.log('Job System Balance Tool loaded. Type jobBalance.help() for commands.');
        }
    }

    /**
     * バランス設定を更新
     */
    setBalanceConfig(config: Partial<BalanceConfig>): void {
        this.currentConfig = this.deepMerge(this.currentConfig, config);
        console.log('Balance config updated:', this.currentConfig);

        // 設定をJobSystemに適用
        this.applyConfigToJobSystem();
    }

    /**
     * 現在のバランス設定を取得
     */
    getBalanceConfig(): BalanceConfig {
        return { ...this.currentConfig };
    }

    /**
     * バランス設定をリセット
     */
    resetBalanceConfig(): void {
        this.currentConfig = { ...this.originalConfig };
        this.applyConfigToJobSystem();
        console.log('Balance config reset to defaults');
    }

    /**
     * 設定をJobSystemに適用
     */
    private applyConfigToJobSystem(): void {
        // 実際のJobSystemに設定を適用する処理
        // これは実装に依存するため、JobSystemのAPIに合わせて調整が必要
        console.log('Applying balance config to JobSystem...');
    }

    /**
     * 全バランステストを実行
     */
    runAllBalanceTests(): BalanceTestResult[] {
        console.log('Running all balance tests...');

        this.testResults = [];

        this.testResults.push(this.testJobProgression());
        this.testResults.push(this.testRoseEssenceEconomy());
        this.testResults.push(this.testJobBalance());
        this.testResults.push(this.testRankUpCosts());
        this.testResults.push(this.testSkillProgression());

        const passedTests = this.testResults.filter(r => r.passed).length;
        const totalTests = this.testResults.length;

        console.log(`Balance tests completed: ${passedTests}/${totalTests} passed`);

        if (passedTests < totalTests) {
            console.warn('Some balance tests failed. Check results for details.');
            this.testResults.filter(r => !r.passed).forEach(result => {
                console.warn(`Failed test: ${result.testName}`);
                result.issues.forEach(issue => console.warn(`  - ${issue}`));
            });
        }

        return this.testResults;
    }

    /**
     * 職業進行テスト
     */
    testJobProgression(): BalanceTestResult {
        const result: BalanceTestResult = {
            testName: 'Job Progression Balance',
            passed: true,
            issues: [],
            recommendations: [],
            metrics: {},
        };

        try {
            const jobs = this.jobSystem.getAllJobs();
            const progressionMetrics: any = {};

            jobs.forEach((job, jobId) => {
                const jobMetrics = this.analyzeJobProgression(job);
                progressionMetrics[jobId] = jobMetrics;

                // 進行バランスをチェック
                if (jobMetrics.totalRankUpCost > 1000) {
                    result.issues.push(`${jobId}: Total rank up cost too high (${jobMetrics.totalRankUpCost})`);
                    result.passed = false;
                }

                if (jobMetrics.statGrowthRate < 0.5) {
                    result.issues.push(`${jobId}: Stat growth rate too low (${jobMetrics.statGrowthRate})`);
                    result.passed = false;
                }

                if (jobMetrics.skillUnlockRate < 0.3) {
                    result.recommendations.push(`${jobId}: Consider more frequent skill unlocks`);
                }
            });

            result.metrics = progressionMetrics;

        } catch (error) {
            result.passed = false;
            result.issues.push(`Test execution failed: ${error}`);
        }

        return result;
    }

    /**
     * 薔薇の力経済テスト
     */
    testRoseEssenceEconomy(): BalanceTestResult {
        const result: BalanceTestResult = {
            testName: 'Rose Essence Economy Balance',
            passed: true,
            issues: [],
            recommendations: [],
            metrics: {},
        };

        try {
            const economyMetrics = this.analyzeRoseEssenceEconomy();
            result.metrics = economyMetrics;

            // 経済バランスをチェック
            if (economyMetrics.gainToSpendRatio < 0.8) {
                result.issues.push(`Rose essence gain too low compared to costs (ratio: ${economyMetrics.gainToSpendRatio})`);
                result.passed = false;
            }

            if (economyMetrics.gainToSpendRatio > 2.0) {
                result.issues.push(`Rose essence gain too high compared to costs (ratio: ${economyMetrics.gainToSpendRatio})`);
                result.passed = false;
            }

            if (economyMetrics.averageStagesPerRankUp > 5) {
                result.recommendations.push('Consider reducing rank up costs or increasing boss rewards');
            }

        } catch (error) {
            result.passed = false;
            result.issues.push(`Test execution failed: ${error}`);
        }

        return result;
    }

    /**
     * 職業バランステスト
     */
    testJobBalance(): BalanceTestResult {
        const result: BalanceTestResult = {
            testName: 'Job Balance Analysis',
            passed: true,
            issues: [],
            recommendations: [],
            metrics: {},
        };

        try {
            const jobs = this.jobSystem.getAllJobs();
            const balanceMetrics: any = {};

            jobs.forEach((job, jobId) => {
                const jobBalance = this.analyzeJobBalance(job);
                balanceMetrics[jobId] = jobBalance;

                // バランスをチェック
                if (jobBalance.powerLevel > 1.5) {
                    result.issues.push(`${jobId}: Power level too high (${jobBalance.powerLevel})`);
                    result.passed = false;
                }

                if (jobBalance.powerLevel < 0.5) {
                    result.issues.push(`${jobId}: Power level too low (${jobBalance.powerLevel})`);
                    result.passed = false;
                }

                if (jobBalance.versatility < 0.3) {
                    result.recommendations.push(`${jobId}: Consider adding more diverse abilities`);
                }
            });

            result.metrics = balanceMetrics;

        } catch (error) {
            result.passed = false;
            result.issues.push(`Test execution failed: ${error}`);
        }

        return result;
    }

    /**
     * ランクアップコストテスト
     */
    testRankUpCosts(): BalanceTestResult {
        const result: BalanceTestResult = {
            testName: 'Rank Up Cost Balance',
            passed: true,
            issues: [],
            recommendations: [],
            metrics: {},
        };

        try {
            const jobs = this.jobSystem.getAllJobs();
            const costMetrics: any = {};

            jobs.forEach((job, jobId) => {
                const costs = this.analyzeRankUpCosts(job);
                costMetrics[jobId] = costs;

                // コストバランスをチェック
                if (costs.exponentialGrowth > 3.0) {
                    result.issues.push(`${jobId}: Rank up costs grow too exponentially (${costs.exponentialGrowth})`);
                    result.passed = false;
                }

                if (costs.finalRankCost > 200) {
                    result.issues.push(`${jobId}: Final rank cost too high (${costs.finalRankCost})`);
                    result.passed = false;
                }
            });

            result.metrics = costMetrics;

        } catch (error) {
            result.passed = false;
            result.issues.push(`Test execution failed: ${error}`);
        }

        return result;
    }

    /**
     * スキル進行テスト
     */
    testSkillProgression(): BalanceTestResult {
        const result: BalanceTestResult = {
            testName: 'Skill Progression Balance',
            passed: true,
            issues: [],
            recommendations: [],
            metrics: {},
        };

        try {
            const jobs = this.jobSystem.getAllJobs();
            const skillMetrics: any = {};

            jobs.forEach((job, jobId) => {
                const skills = this.analyzeSkillProgression(job);
                skillMetrics[jobId] = skills;

                // スキル進行をチェック
                if (skills.totalSkills < 3) {
                    result.issues.push(`${jobId}: Too few skills available (${skills.totalSkills})`);
                    result.passed = false;
                }

                if (skills.skillsPerRank < 0.5) {
                    result.recommendations.push(`${jobId}: Consider more frequent skill unlocks`);
                }
            });

            result.metrics = skillMetrics;

        } catch (error) {
            result.passed = false;
            result.issues.push(`Test execution failed: ${error}`);
        }

        return result;
    }

    /**
     * 職業進行を分析
     */
    private analyzeJobProgression(job: Job): any {
        let totalRankUpCost = 0;
        let totalStatGrowth = 0;
        let skillCount = 0;

        for (let rank = 1; rank <= job.maxRank; rank++) {
            const requirements = job.getRankUpRequirements(rank);
            if (requirements) {
                totalRankUpCost += requirements.roseEssenceCost || 0;
            }

            const stats = job.getStatModifiers();
            totalStatGrowth += Object.values(stats).reduce((sum, val) => sum + Math.abs(val), 0);

            const skills = job.getAvailableSkills();
            skillCount = Math.max(skillCount, skills.length);
        }

        return {
            totalRankUpCost,
            statGrowthRate: totalStatGrowth / job.maxRank,
            skillUnlockRate: skillCount / job.maxRank,
            maxRank: job.maxRank,
        };
    }

    /**
     * 薔薇の力経済を分析
     */
    private analyzeRoseEssenceEconomy(): any {
        // 仮想的な経済分析
        const averageBossReward = 50; // 平均ボス報酬
        const averageRankUpCost = 30; // 平均ランクアップコスト
        const stagesPerChapter = 10; // 章あたりのステージ数
        const bossesPerChapter = 3; // 章あたりのボス数

        const gainPerChapter = averageBossReward * bossesPerChapter;
        const spendPerChapter = averageRankUpCost * 2; // 2回のランクアップを想定

        return {
            gainToSpendRatio: gainPerChapter / spendPerChapter,
            averageStagesPerRankUp: stagesPerChapter / 2,
            economicBalance: gainPerChapter - spendPerChapter,
        };
    }

    /**
     * 職業バランスを分析
     */
    private analyzeJobBalance(job: Job): any {
        const stats = job.getStatModifiers();
        const skills = job.getAvailableSkills();

        // パワーレベルを計算（能力値の合計）
        const powerLevel = Object.values(stats).reduce((sum, val) => sum + Math.abs(val), 0) / 100;

        // 汎用性を計算（スキル数とカテゴリの多様性）
        const versatility = skills.length / 10;

        return {
            powerLevel,
            versatility,
            skillCount: skills.length,
            statTotal: Object.values(stats).reduce((sum, val) => sum + val, 0),
        };
    }

    /**
     * ランクアップコストを分析
     */
    private analyzeRankUpCosts(job: Job): any {
        const costs: number[] = [];

        for (let rank = 2; rank <= job.maxRank; rank++) {
            const requirements = job.getRankUpRequirements(rank);
            if (requirements) {
                costs.push(requirements.roseEssenceCost || 0);
            }
        }

        if (costs.length === 0) {
            return { exponentialGrowth: 0, finalRankCost: 0, totalCost: 0 };
        }

        const exponentialGrowth = costs.length > 1 ? costs[costs.length - 1] / costs[0] : 1;
        const finalRankCost = costs[costs.length - 1] || 0;
        const totalCost = costs.reduce((sum, cost) => sum + cost, 0);

        return {
            exponentialGrowth,
            finalRankCost,
            totalCost,
            costs,
        };
    }

    /**
     * スキル進行を分析
     */
    private analyzeSkillProgression(job: Job): any {
        const allSkills = job.getAvailableSkills();
        const skillsPerRank = allSkills.length / job.maxRank;

        return {
            totalSkills: allSkills.length,
            skillsPerRank,
            maxRank: job.maxRank,
        };
    }

    /**
     * 全職業データを検証
     */
    validateAllJobData(): any {
        const jobs = this.jobSystem.getAllJobs();
        const validationResults: any = {};

        jobs.forEach((job, jobId) => {
            validationResults[jobId] = this.validateJobData(job);
        });

        const totalIssues = Object.values(validationResults)
            .reduce((sum: number, result: any) => sum + result.issues.length, 0);

        console.log(`Job data validation completed. Total issues: ${totalIssues}`);

        if (totalIssues > 0) {
            console.table(validationResults);
        }

        return validationResults;
    }

    /**
     * 個別職業データを検証
     */
    private validateJobData(job: Job): any {
        const issues: string[] = [];
        const warnings: string[] = [];

        // 基本データ検証
        if (!job.id || job.id.trim() === '') {
            issues.push('Job ID is missing or empty');
        }

        if (!job.name || job.name.trim() === '') {
            issues.push('Job name is missing or empty');
        }

        if (job.maxRank < 1 || job.maxRank > 10) {
            issues.push(`Invalid max rank: ${job.maxRank} (should be 1-10)`);
        }

        // 能力値修正検証
        const stats = job.getStatModifiers();
        const statTotal = Object.values(stats).reduce((sum, val) => sum + Math.abs(val), 0);

        if (statTotal === 0) {
            warnings.push('No stat modifiers defined');
        }

        if (statTotal > 200) {
            warnings.push(`Very high stat total: ${statTotal}`);
        }

        // スキル検証
        const skills = job.getAvailableSkills();
        if (skills.length === 0) {
            warnings.push('No skills defined');
        }

        // ランクアップ要件検証
        for (let rank = 2; rank <= job.maxRank; rank++) {
            const requirements = job.getRankUpRequirements(rank);
            if (!requirements) {
                issues.push(`Missing rank up requirements for rank ${rank}`);
            } else {
                if (!requirements.roseEssenceCost || requirements.roseEssenceCost < 0) {
                    issues.push(`Invalid rose essence cost for rank ${rank}`);
                }
            }
        }

        return {
            issues,
            warnings,
            isValid: issues.length === 0,
        };
    }

    /**
     * 薔薇の力データを検証
     */
    validateRoseEssenceData(): any {
        const validationResult = {
            issues: [] as string[],
            warnings: [] as string[],
            isValid: true,
        };

        try {
            // 現在の薔薇の力を取得
            const currentEssence = this.jobSystem.getCurrentRoseEssence();

            if (currentEssence < 0) {
                validationResult.issues.push('Negative rose essence amount');
                validationResult.isValid = false;
            }

            // 履歴を検証
            const history = this.jobSystem.getRoseEssenceHistory();

            let calculatedTotal = 0;
            for (const transaction of history) {
                if (transaction.type === 'gain') {
                    calculatedTotal += transaction.amount;
                } else if (transaction.type === 'spend') {
                    calculatedTotal -= transaction.amount;
                }

                if (transaction.amount <= 0) {
                    validationResult.issues.push(`Invalid transaction amount: ${transaction.amount}`);
                    validationResult.isValid = false;
                }
            }

            if (Math.abs(calculatedTotal - currentEssence) > 0.01) {
                validationResult.issues.push(`Rose essence total mismatch: calculated=${calculatedTotal}, actual=${currentEssence}`);
                validationResult.isValid = false;
            }

        } catch (error) {
            validationResult.issues.push(`Validation failed: ${error}`);
            validationResult.isValid = false;
        }

        console.log('Rose essence data validation:', validationResult);
        return validationResult;
    }

    /**
     * キャラクター進行をシミュレート
     */
    simulateCharacterProgression(characterId: string, stages: number): any {
        console.log(`Simulating ${stages} stages of progression for ${characterId}...`);

        const simulation = {
            characterId,
            stages,
            initialState: this.captureCharacterState(characterId),
            progression: [] as any[],
            finalState: null as any,
        };

        // 各ステージをシミュレート
        for (let stage = 1; stage <= stages; stage++) {
            const stageResult = this.simulateStage(characterId, stage);
            simulation.progression.push(stageResult);
        }

        simulation.finalState = this.captureCharacterState(characterId);

        console.log('Progression simulation completed:', simulation);
        return simulation;
    }

    /**
     * 経済バランスをシミュレート
     */
    simulateEconomyBalance(playerCount: number, stages: number): any {
        console.log(`Simulating economy balance for ${playerCount} players over ${stages} stages...`);

        const simulation = {
            playerCount,
            stages,
            totalRoseEssenceGained: 0,
            totalRoseEssenceSpent: 0,
            averageRankUpsPerPlayer: 0,
            economicBalance: 0,
        };

        // 経済シミュレーション
        for (let stage = 1; stage <= stages; stage++) {
            // ボス撃破による薔薇の力獲得をシミュレート
            const bossReward = this.simulateBossReward(stage);
            simulation.totalRoseEssenceGained += bossReward;

            // ランクアップによる薔薇の力消費をシミュレート
            const rankUpCost = this.simulateRankUpCosts(playerCount, stage);
            simulation.totalRoseEssenceSpent += rankUpCost;
        }

        simulation.economicBalance = simulation.totalRoseEssenceGained - simulation.totalRoseEssenceSpent;
        simulation.averageRankUpsPerPlayer = simulation.totalRoseEssenceSpent / (playerCount * 30); // 平均コスト30と仮定

        console.log('Economy simulation completed:', simulation);
        return simulation;
    }

    /**
     * キャラクター状態をキャプチャ
     */
    private captureCharacterState(characterId: string): any {
        try {
            const job = this.jobSystem.getCharacterJob(characterId);
            const stats = this.jobSystem.getCharacterJobStats(characterId);
            const skills = this.jobSystem.getCharacterJobSkills(characterId);

            return {
                jobId: job?.id || null,
                rank: job?.rank || 0,
                stats,
                skills,
                timestamp: Date.now(),
            };
        } catch (error) {
            return { error: error.toString() };
        }
    }

    /**
     * ステージをシミュレート
     */
    private simulateStage(characterId: string, stage: number): any {
        // 仮想的なステージシミュレーション
        const hasBoss = stage % 3 === 0; // 3ステージごとにボス
        const roseEssenceGained = hasBoss ? 50 : 0;
        const experienceGained = 100 + stage * 10;

        return {
            stage,
            hasBoss,
            roseEssenceGained,
            experienceGained,
            actions: hasBoss ? ['boss_defeated'] : ['stage_cleared'],
        };
    }

    /**
     * ボス報酬をシミュレート
     */
    private simulateBossReward(stage: number): number {
        // ステージに応じたボス報酬を計算
        const baseReward = 30;
        const stageMultiplier = 1 + (stage / 10);
        return Math.floor(baseReward * stageMultiplier);
    }

    /**
     * ランクアップコストをシミュレート
     */
    private simulateRankUpCosts(playerCount: number, stage: number): number {
        // プレイヤー数とステージに応じたランクアップコストを計算
        const rankUpProbability = 0.3; // 30%の確率でランクアップ
        const averageCost = 25 + stage * 2;

        return Math.floor(playerCount * rankUpProbability * averageCost);
    }

    /**
     * バランスレポートを生成
     */
    generateBalanceReport(): string {
        const report = {
            timestamp: new Date().toISOString(),
            config: this.currentConfig,
            testResults: this.testResults,
            summary: {
                totalTests: this.testResults.length,
                passedTests: this.testResults.filter(r => r.passed).length,
                totalIssues: this.testResults.reduce((sum, r) => sum + r.issues.length, 0),
                totalRecommendations: this.testResults.reduce((sum, r) => sum + r.recommendations.length, 0),
            },
        };

        const reportText = JSON.stringify(report, null, 2);
        console.log('Balance Report Generated:', report);

        return reportText;
    }

    /**
     * テスト結果をエクスポート
     */
    exportTestResults(): string {
        const exportData = {
            timestamp: new Date().toISOString(),
            config: this.currentConfig,
            results: this.testResults,
        };

        const exportText = JSON.stringify(exportData, null, 2);
        console.log('Test results exported');

        return exportText;
    }

    /**
     * オブジェクトを深くマージ
     */
    private deepMerge(target: any, source: any): any {
        const result = { ...target };

        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }

    /**
     * ヘルプを表示
     */
    private showHelp(): void {
        const commands = [
            '=== Job System Balance Tool Commands ===',
            '',
            'Configuration:',
            '  setConfig(config)         - Update balance configuration',
            '  getConfig()               - Get current configuration',
            '  resetConfig()             - Reset to default configuration',
            '',
            'Testing:',
            '  runTests()                - Run all balance tests',
            '  testJobProgression()      - Test job progression balance',
            '  testRoseEssenceEconomy()  - Test rose essence economy',
            '  testJobBalance()          - Test job balance',
            '',
            'Validation:',
            '  validateJobData()         - Validate all job data',
            '  validateRoseEssenceData() - Validate rose essence data',
            '',
            'Simulation:',
            '  simulateProgression(charId, stages) - Simulate character progression',
            '  simulateEconomy(players, stages)    - Simulate economy balance',
            '',
            'Reporting:',
            '  generateReport()          - Generate balance report',
            '  exportResults()           - Export test results',
            '',
            'Usage Examples:',
            '  jobBalance.setConfig({ roseEssence: { baseGainMultiplier: 1.5 } })',
            '  jobBalance.runTests()',
            '  jobBalance.simulateProgression("player1", 10)',
        ];

        console.log(commands.join('\n'));
    }
}