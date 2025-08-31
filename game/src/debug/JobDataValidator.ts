/**
 * JobDataValidator - 職業データ検証ツール
 * 
 * このクラスは職業データの整合性チェック、バリデーション、
 * データ品質保証を提供します。
 */

import { JobData, StatModifiers, RankUpRequirements, JobCategory } from '../types/job';
import { Job } from '../systems/jobs/Job';

/**
 * 検証結果
 */
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    suggestions: ValidationSuggestion[];
    score: number; // 0-100のデータ品質スコア
}

/**
 * 検証エラー
 */
export interface ValidationError {
    type: 'structure' | 'data' | 'logic' | 'reference';
    severity: 'critical' | 'high' | 'medium' | 'low';
    field: string;
    message: string;
    value?: any;
    expectedValue?: any;
    suggestion?: string;
}

/**
 * 検証警告
 */
export interface ValidationWarning {
    type: 'balance' | 'consistency' | 'performance' | 'usability';
    field: string;
    message: string;
    value?: any;
    recommendation?: string;
}

/**
 * 検証提案
 */
export interface ValidationSuggestion {
    type: 'optimization' | 'enhancement' | 'standardization';
    field: string;
    message: string;
    benefit: string;
    implementation?: string;
}

/**
 * 検証設定
 */
export interface ValidationConfig {
    // 検証レベル
    level: 'basic' | 'standard' | 'strict' | 'comprehensive';

    // 検証カテゴリ
    categories: {
        structure: boolean;
        dataTypes: boolean;
        ranges: boolean;
        logic: boolean;
        balance: boolean;
        consistency: boolean;
        performance: boolean;
        references: boolean;
    };

    // 許容範囲
    tolerances: {
        statRange: { min: number; max: number };
        rankRange: { min: number; max: number };
        costRange: { min: number; max: number };
        skillCountRange: { min: number; max: number };
    };

    // バランス設定
    balance: {
        maxStatTotal: number;
        maxCostGrowth: number;
        minSkillProgression: number;
        maxPowerLevel: number;
    };
}

/**
 * 職業データ検証ツール
 */
export class JobDataValidator {
    private config: ValidationConfig;
    private knownSkills: Set<string> = new Set();
    private knownJobs: Map<string, JobData> = new Map();

    private static readonly DEFAULT_CONFIG: ValidationConfig = {
        level: 'standard',
        categories: {
            structure: true,
            dataTypes: true,
            ranges: true,
            logic: true,
            balance: true,
            consistency: true,
            performance: false,
            references: true,
        },
        tolerances: {
            statRange: { min: -100, max: 200 },
            rankRange: { min: 1, max: 10 },
            costRange: { min: 0, max: 1000 },
            skillCountRange: { min: 0, max: 20 },
        },
        balance: {
            maxStatTotal: 300,
            maxCostGrowth: 5.0,
            minSkillProgression: 0.5,
            maxPowerLevel: 2.0,
        },
    };

    constructor(config?: Partial<ValidationConfig>) {
        this.config = { ...JobDataValidator.DEFAULT_CONFIG, ...config };
        this.setupConsoleCommands();
        this.initializeKnownData();
    }

    /**
     * 既知のデータを初期化
     */
    private initializeKnownData(): void {
        // 基本スキル一覧
        const basicSkills = [
            'basic_attack', 'guard', 'wait', 'move',
            'power_strike', 'double_attack', 'critical_hit',
            'heal', 'group_heal', 'cure', 'resurrection',
            'fire_bolt', 'ice_shard', 'lightning', 'meteor',
            'arrow_shot', 'multi_shot', 'piercing_arrow',
            'steal', 'hide', 'backstab', 'poison',
            'taunt', 'defend', 'counter', 'berserker_rage',
        ];

        basicSkills.forEach(skill => this.knownSkills.add(skill));
    }

    /**
     * コンソールコマンドを設定
     */
    private setupConsoleCommands(): void {
        if (typeof window !== 'undefined') {
            (window as any).jobValidator = {
                // 検証実行
                validate: (jobData: JobData) => this.validateJobData(jobData),
                validateAll: (jobDataArray: JobData[]) => this.validateAllJobData(jobDataArray),
                validateJob: (job: Job) => this.validateJob(job),

                // 設定管理
                setConfig: (config: Partial<ValidationConfig>) => this.setConfig(config),
                getConfig: () => this.getConfig(),
                resetConfig: () => this.resetConfig(),

                // データ管理
                addKnownSkill: (skill: string) => this.addKnownSkill(skill),
                addKnownJob: (jobData: JobData) => this.addKnownJob(jobData),
                listKnownSkills: () => this.listKnownSkills(),

                // レポート
                generateReport: (results: ValidationResult[]) => this.generateValidationReport(results),

                // ユーティリティ
                fixCommonIssues: (jobData: JobData) => this.fixCommonIssues(jobData),
                suggestImprovements: (jobData: JobData) => this.suggestImprovements(jobData),

                // ヘルプ
                help: () => this.showHelp(),
            };

            console.log('Job Data Validator loaded. Type jobValidator.help() for commands.');
        }
    }

    /**
     * 職業データを検証
     */
    validateJobData(jobData: JobData): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            score: 100,
        };

        // 構造検証
        if (this.config.categories.structure) {
            this.validateStructure(jobData, result);
        }

        // データ型検証
        if (this.config.categories.dataTypes) {
            this.validateDataTypes(jobData, result);
        }

        // 範囲検証
        if (this.config.categories.ranges) {
            this.validateRanges(jobData, result);
        }

        // ロジック検証
        if (this.config.categories.logic) {
            this.validateLogic(jobData, result);
        }

        // バランス検証
        if (this.config.categories.balance) {
            this.validateBalance(jobData, result);
        }

        // 一貫性検証
        if (this.config.categories.consistency) {
            this.validateConsistency(jobData, result);
        }

        // パフォーマンス検証
        if (this.config.categories.performance) {
            this.validatePerformance(jobData, result);
        }

        // 参照検証
        if (this.config.categories.references) {
            this.validateReferences(jobData, result);
        }

        // 最終スコア計算
        result.score = this.calculateQualityScore(result);
        result.isValid = result.errors.length === 0;

        return result;
    }

    /**
     * 複数の職業データを検証
     */
    validateAllJobData(jobDataArray: JobData[]): ValidationResult[] {
        const results: ValidationResult[] = [];

        for (const jobData of jobDataArray) {
            const result = this.validateJobData(jobData);
            results.push(result);
        }

        // 相互参照検証
        this.validateCrossReferences(jobDataArray, results);

        return results;
    }

    /**
     * Jobオブジェクトを検証
     */
    validateJob(job: Job): ValidationResult {
        // JobオブジェクトからJobDataを抽出して検証
        const jobData: JobData = {
            id: job.id,
            name: job.name,
            description: job.description || '',
            category: job.category,
            maxRank: job.maxRank,
            statModifiers: this.extractStatModifiers(job),
            availableSkills: this.extractAvailableSkills(job),
            rankUpRequirements: this.extractRankUpRequirements(job),
            growthRateModifiers: this.extractGrowthRateModifiers(job),
            jobTraits: job.getJobTraits?.() || [],
            visual: {
                iconPath: '',
                spriteModifications: [],
                colorScheme: { primary: '#ffffff', secondary: '#cccccc' },
            },
        };

        return this.validateJobData(jobData);
    }

    /**
     * 構造検証
     */
    private validateStructure(jobData: JobData, result: ValidationResult): void {
        const requiredFields = ['id', 'name', 'category', 'maxRank'];

        for (const field of requiredFields) {
            if (!(field in jobData) || jobData[field as keyof JobData] === undefined) {
                result.errors.push({
                    type: 'structure',
                    severity: 'critical',
                    field,
                    message: `Required field '${field}' is missing`,
                    suggestion: `Add the '${field}' field to the job data`,
                });
            }
        }

        // 必須オブジェクトフィールドの検証
        const requiredObjectFields = ['statModifiers', 'availableSkills', 'rankUpRequirements'];

        for (const field of requiredObjectFields) {
            if (!(field in jobData) || typeof jobData[field as keyof JobData] !== 'object') {
                result.errors.push({
                    type: 'structure',
                    severity: 'high',
                    field,
                    message: `Required object field '${field}' is missing or invalid`,
                    suggestion: `Ensure '${field}' is a properly structured object`,
                });
            }
        }
    }

    /**
     * データ型検証
     */
    private validateDataTypes(jobData: JobData, result: ValidationResult): void {
        // 文字列フィールド
        const stringFields = ['id', 'name', 'description'];
        for (const field of stringFields) {
            const value = jobData[field as keyof JobData];
            if (value !== undefined && typeof value !== 'string') {
                result.errors.push({
                    type: 'data',
                    severity: 'medium',
                    field,
                    message: `Field '${field}' must be a string`,
                    value,
                    expectedValue: 'string',
                });
            }
        }

        // 数値フィールド
        if (typeof jobData.maxRank !== 'number') {
            result.errors.push({
                type: 'data',
                severity: 'high',
                field: 'maxRank',
                message: 'maxRank must be a number',
                value: jobData.maxRank,
                expectedValue: 'number',
            });
        }

        // 列挙型フィールド
        if (!Object.values(JobCategory).includes(jobData.category)) {
            result.errors.push({
                type: 'data',
                severity: 'medium',
                field: 'category',
                message: 'Invalid job category',
                value: jobData.category,
                expectedValue: Object.values(JobCategory).join(' | '),
            });
        }
    }

    /**
     * 範囲検証
     */
    private validateRanges(jobData: JobData, result: ValidationResult): void {
        const { tolerances } = this.config;

        // ランク範囲検証
        if (jobData.maxRank < tolerances.rankRange.min || jobData.maxRank > tolerances.rankRange.max) {
            result.errors.push({
                type: 'data',
                severity: 'medium',
                field: 'maxRank',
                message: `maxRank (${jobData.maxRank}) is outside valid range`,
                value: jobData.maxRank,
                expectedValue: `${tolerances.rankRange.min}-${tolerances.rankRange.max}`,
            });
        }

        // 能力値範囲検証
        if (jobData.statModifiers) {
            for (const [rank, stats] of Object.entries(jobData.statModifiers)) {
                for (const [stat, value] of Object.entries(stats)) {
                    if (value < tolerances.statRange.min || value > tolerances.statRange.max) {
                        result.warnings.push({
                            type: 'balance',
                            field: `statModifiers.${rank}.${stat}`,
                            message: `Stat value (${value}) is outside typical range`,
                            value,
                            recommendation: `Consider keeping stats within ${tolerances.statRange.min}-${tolerances.statRange.max}`,
                        });
                    }
                }
            }
        }

        // ランクアップコスト範囲検証
        if (jobData.rankUpRequirements) {
            for (const [rank, requirements] of Object.entries(jobData.rankUpRequirements)) {
                const cost = requirements.roseEssenceCost;
                if (cost < tolerances.costRange.min || cost > tolerances.costRange.max) {
                    result.warnings.push({
                        type: 'balance',
                        field: `rankUpRequirements.${rank}.roseEssenceCost`,
                        message: `Rank up cost (${cost}) is outside typical range`,
                        value: cost,
                        recommendation: `Consider keeping costs within ${tolerances.costRange.min}-${tolerances.costRange.max}`,
                    });
                }
            }
        }
    }

    /**
     * ロジック検証
     */
    private validateLogic(jobData: JobData, result: ValidationResult): void {
        // ランク一貫性検証
        if (jobData.statModifiers) {
            const ranks = Object.keys(jobData.statModifiers).map(Number).sort((a, b) => a - b);

            // 連続性チェック
            for (let i = 1; i <= jobData.maxRank; i++) {
                if (!ranks.includes(i)) {
                    result.errors.push({
                        type: 'logic',
                        severity: 'high',
                        field: 'statModifiers',
                        message: `Missing stat modifiers for rank ${i}`,
                        suggestion: `Add stat modifiers for all ranks 1-${jobData.maxRank}`,
                    });
                }
            }

            // 成長パターン検証
            this.validateGrowthPattern(jobData, result);
        }

        // スキル進行検証
        if (jobData.availableSkills) {
            this.validateSkillProgression(jobData, result);
        }

        // ランクアップ要件検証
        if (jobData.rankUpRequirements) {
            this.validateRankUpLogic(jobData, result);
        }
    }

    /**
     * 成長パターン検証
     */
    private validateGrowthPattern(jobData: JobData, result: ValidationResult): void {
        if (!jobData.statModifiers) return;

        const ranks = Object.keys(jobData.statModifiers).map(Number).sort((a, b) => a - b);
        const statNames = Object.keys(jobData.statModifiers[ranks[0]] || {});

        for (const statName of statNames) {
            const values = ranks.map(rank => jobData.statModifiers![rank][statName as keyof StatModifiers]);

            // 単調増加チェック（一般的なケース）
            let isMonotonic = true;
            for (let i = 1; i < values.length; i++) {
                if (values[i] < values[i - 1]) {
                    isMonotonic = false;
                    break;
                }
            }

            if (!isMonotonic) {
                result.warnings.push({
                    type: 'consistency',
                    field: `statModifiers.${statName}`,
                    message: `Stat '${statName}' does not follow monotonic growth pattern`,
                    recommendation: 'Consider making stat growth consistent across ranks',
                });
            }

            // 異常な成長率チェック
            for (let i = 1; i < values.length; i++) {
                const growthRate = values[i] / Math.max(values[i - 1], 1);
                if (growthRate > 3.0) {
                    result.warnings.push({
                        type: 'balance',
                        field: `statModifiers.${statName}`,
                        message: `Excessive growth rate (${growthRate.toFixed(2)}x) between ranks ${ranks[i - 1]} and ${ranks[i]}`,
                        recommendation: 'Consider more gradual stat progression',
                    });
                }
            }
        }
    }

    /**
     * スキル進行検証
     */
    private validateSkillProgression(jobData: JobData, result: ValidationResult): void {
        if (!jobData.availableSkills) return;

        const ranks = Object.keys(jobData.availableSkills).map(Number).sort((a, b) => a - b);

        for (let i = 1; i < ranks.length; i++) {
            const prevSkills = jobData.availableSkills[ranks[i - 1]];
            const currentSkills = jobData.availableSkills[ranks[i]];

            // スキル数の減少チェック
            if (currentSkills.length < prevSkills.length) {
                result.warnings.push({
                    type: 'consistency',
                    field: `availableSkills.${ranks[i]}`,
                    message: `Skill count decreased from rank ${ranks[i - 1]} to ${ranks[i]}`,
                    recommendation: 'Skills should generally increase or stay the same with rank',
                });
            }

            // 新スキル追加チェック
            const newSkills = currentSkills.filter(skill => !prevSkills.includes(skill));
            if (newSkills.length === 0 && i < ranks.length - 1) {
                result.suggestions.push({
                    type: 'enhancement',
                    field: `availableSkills.${ranks[i]}`,
                    message: `No new skills added at rank ${ranks[i]}`,
                    benefit: 'Adding new skills provides progression incentive',
                    implementation: 'Consider adding rank-appropriate skills',
                });
            }
        }
    }

    /**
     * ランクアップロジック検証
     */
    private validateRankUpLogic(jobData: JobData, result: ValidationResult): void {
        if (!jobData.rankUpRequirements) return;

        for (const [rankStr, requirements] of Object.entries(jobData.rankUpRequirements)) {
            const rank = parseInt(rankStr);

            // ランク1の要件チェック（通常は不要）
            if (rank === 1) {
                result.warnings.push({
                    type: 'logic',
                    field: `rankUpRequirements.${rank}`,
                    message: 'Rank 1 should not have rank up requirements',
                    recommendation: 'Remove rank up requirements for rank 1',
                });
            }

            // 最大ランクを超える要件チェック
            if (rank > jobData.maxRank) {
                result.errors.push({
                    type: 'logic',
                    severity: 'medium',
                    field: `rankUpRequirements.${rank}`,
                    message: `Rank up requirements defined for rank ${rank} exceeds maxRank ${jobData.maxRank}`,
                    suggestion: `Remove requirements for ranks above ${jobData.maxRank}`,
                });
            }

            // 前提スキル検証
            if (requirements.prerequisiteSkills) {
                for (const skill of requirements.prerequisiteSkills) {
                    if (!this.knownSkills.has(skill)) {
                        result.warnings.push({
                            type: 'reference',
                            field: `rankUpRequirements.${rank}.prerequisiteSkills`,
                            message: `Unknown prerequisite skill: ${skill}`,
                            recommendation: 'Verify skill name or add to known skills list',
                        });
                    }
                }
            }
        }
    }

    /**
     * バランス検証
     */
    private validateBalance(jobData: JobData, result: ValidationResult): void {
        if (!jobData.statModifiers) return;

        const { balance } = this.config;

        // 各ランクの能力値合計チェック
        for (const [rank, stats] of Object.entries(jobData.statModifiers)) {
            const statTotal = Object.values(stats).reduce((sum, value) => sum + Math.abs(value), 0);

            if (statTotal > balance.maxStatTotal) {
                result.warnings.push({
                    type: 'balance',
                    field: `statModifiers.${rank}`,
                    message: `Total stat value (${statTotal}) exceeds balance threshold (${balance.maxStatTotal})`,
                    value: statTotal,
                    recommendation: 'Consider reducing some stat values for better balance',
                });
            }
        }

        // コスト成長率チェック
        if (jobData.rankUpRequirements) {
            const costs = Object.entries(jobData.rankUpRequirements)
                .map(([rank, req]) => ({ rank: parseInt(rank), cost: req.roseEssenceCost }))
                .sort((a, b) => a.rank - b.rank);

            for (let i = 1; i < costs.length; i++) {
                const growthRate = costs[i].cost / Math.max(costs[i - 1].cost, 1);
                if (growthRate > balance.maxCostGrowth) {
                    result.warnings.push({
                        type: 'balance',
                        field: `rankUpRequirements.${costs[i].rank}.roseEssenceCost`,
                        message: `Cost growth rate (${growthRate.toFixed(2)}x) exceeds balance threshold`,
                        recommendation: 'Consider more gradual cost progression',
                    });
                }
            }
        }

        // パワーレベル計算
        const powerLevel = this.calculatePowerLevel(jobData);
        if (powerLevel > balance.maxPowerLevel) {
            result.warnings.push({
                type: 'balance',
                field: 'overall',
                message: `Job power level (${powerLevel.toFixed(2)}) exceeds balance threshold`,
                recommendation: 'Consider reducing overall job power or increasing costs',
            });
        }
    }

    /**
     * 一貫性検証
     */
    private validateConsistency(jobData: JobData, result: ValidationResult): void {
        // 命名一貫性チェック
        if (jobData.id && jobData.name) {
            const idWords = jobData.id.toLowerCase().split(/[_-]/);
            const nameWords = jobData.name.toLowerCase().split(/\s+/);

            const hasCommonWord = idWords.some(word =>
                nameWords.some(nameWord => nameWord.includes(word) || word.includes(nameWord))
            );

            if (!hasCommonWord) {
                result.suggestions.push({
                    type: 'standardization',
                    field: 'id/name',
                    message: 'Job ID and name have no common words',
                    benefit: 'Consistent naming improves maintainability',
                    implementation: 'Consider aligning ID and name terminology',
                });
            }
        }

        // カテゴリ一貫性チェック
        if (jobData.category && jobData.name) {
            const categoryKeywords = {
                [JobCategory.WARRIOR]: ['warrior', 'fighter', 'knight', 'soldier'],
                [JobCategory.MAGE]: ['mage', 'wizard', 'sorcerer', 'magic'],
                [JobCategory.ARCHER]: ['archer', 'ranger', 'bow', 'arrow'],
                [JobCategory.HEALER]: ['healer', 'priest', 'cleric', 'holy'],
                [JobCategory.THIEF]: ['thief', 'rogue', 'assassin', 'stealth'],
            };

            const keywords = categoryKeywords[jobData.category] || [];
            const nameHasKeyword = keywords.some(keyword =>
                jobData.name.toLowerCase().includes(keyword)
            );

            if (!nameHasKeyword) {
                result.suggestions.push({
                    type: 'standardization',
                    field: 'category/name',
                    message: `Job name doesn't reflect category ${jobData.category}`,
                    benefit: 'Clear category alignment improves user understanding',
                    implementation: `Consider including category-related terms: ${keywords.join(', ')}`,
                });
            }
        }
    }

    /**
     * パフォーマンス検証
     */
    private validatePerformance(jobData: JobData, result: ValidationResult): void {
        // データサイズチェック
        const dataSize = JSON.stringify(jobData).length;
        if (dataSize > 10000) { // 10KB
            result.warnings.push({
                type: 'performance',
                field: 'overall',
                message: `Job data size (${dataSize} bytes) is quite large`,
                recommendation: 'Consider optimizing data structure for better performance',
            });
        }

        // 複雑性チェック
        if (jobData.availableSkills) {
            const totalSkills = Object.values(jobData.availableSkills)
                .reduce((sum, skills) => sum + skills.length, 0);

            if (totalSkills > 50) {
                result.suggestions.push({
                    type: 'optimization',
                    field: 'availableSkills',
                    message: `High total skill count (${totalSkills}) may impact performance`,
                    benefit: 'Reducing skill complexity improves calculation speed',
                    implementation: 'Consider skill grouping or lazy loading',
                });
            }
        }
    }

    /**
     * 参照検証
     */
    private validateReferences(jobData: JobData, result: ValidationResult): void {
        // スキル参照チェック
        if (jobData.availableSkills) {
            for (const [rank, skills] of Object.entries(jobData.availableSkills)) {
                for (const skill of skills) {
                    if (!this.knownSkills.has(skill)) {
                        result.warnings.push({
                            type: 'reference',
                            field: `availableSkills.${rank}`,
                            message: `Unknown skill reference: ${skill}`,
                            recommendation: 'Verify skill exists or add to known skills',
                        });
                    }
                }
            }
        }

        // 前提スキル参照チェック
        if (jobData.rankUpRequirements) {
            for (const [rank, requirements] of Object.entries(jobData.rankUpRequirements)) {
                if (requirements.prerequisiteSkills) {
                    for (const skill of requirements.prerequisiteSkills) {
                        if (!this.knownSkills.has(skill)) {
                            result.warnings.push({
                                type: 'reference',
                                field: `rankUpRequirements.${rank}.prerequisiteSkills`,
                                message: `Unknown prerequisite skill: ${skill}`,
                                recommendation: 'Verify skill exists or add to known skills',
                            });
                        }
                    }
                }
            }
        }
    }

    /**
     * 相互参照検証
     */
    private validateCrossReferences(jobDataArray: JobData[], results: ValidationResult[]): void {
        // 重複ID検証
        const idCounts = new Map<string, number>();

        for (const jobData of jobDataArray) {
            const count = idCounts.get(jobData.id) || 0;
            idCounts.set(jobData.id, count + 1);
        }

        idCounts.forEach((count, id) => {
            if (count > 1) {
                const affectedResults = results.filter((_, index) => jobDataArray[index].id === id);

                for (const result of affectedResults) {
                    result.errors.push({
                        type: 'reference',
                        severity: 'critical',
                        field: 'id',
                        message: `Duplicate job ID: ${id}`,
                        suggestion: 'Ensure all job IDs are unique',
                    });
                }
            }
        });
    }

    /**
     * パワーレベルを計算
     */
    private calculatePowerLevel(jobData: JobData): number {
        if (!jobData.statModifiers) return 0;

        let totalPower = 0;
        let rankCount = 0;

        for (const stats of Object.values(jobData.statModifiers)) {
            const rankPower = Object.values(stats).reduce((sum, value) => sum + Math.abs(value), 0);
            totalPower += rankPower;
            rankCount++;
        }

        return rankCount > 0 ? totalPower / (rankCount * 100) : 0; // 正規化
    }

    /**
     * 品質スコアを計算
     */
    private calculateQualityScore(result: ValidationResult): number {
        let score = 100;

        // エラーによる減点
        for (const error of result.errors) {
            switch (error.severity) {
                case 'critical':
                    score -= 25;
                    break;
                case 'high':
                    score -= 15;
                    break;
                case 'medium':
                    score -= 10;
                    break;
                case 'low':
                    score -= 5;
                    break;
            }
        }

        // 警告による減点
        for (const warning of result.warnings) {
            switch (warning.type) {
                case 'balance':
                    score -= 3;
                    break;
                case 'consistency':
                    score -= 2;
                    break;
                case 'performance':
                    score -= 1;
                    break;
                case 'usability':
                    score -= 2;
                    break;
            }
        }

        return Math.max(0, score);
    }

    /**
     * よくある問題を修正
     */
    fixCommonIssues(jobData: JobData): JobData {
        const fixed = { ...jobData };

        // 空文字列を修正
        if (!fixed.description) {
            fixed.description = `A ${fixed.category} job`;
        }

        // 不正なランク範囲を修正
        if (fixed.maxRank < 1) {
            fixed.maxRank = 1;
        } else if (fixed.maxRank > 10) {
            fixed.maxRank = 10;
        }

        // 欠落したランクのデータを補完
        if (fixed.statModifiers) {
            for (let rank = 1; rank <= fixed.maxRank; rank++) {
                if (!fixed.statModifiers[rank]) {
                    // 前のランクをベースに作成
                    const prevRank = fixed.statModifiers[rank - 1];
                    if (prevRank) {
                        fixed.statModifiers[rank] = {
                            hp: Math.floor(prevRank.hp * 1.2),
                            mp: Math.floor(prevRank.mp * 1.2),
                            attack: Math.floor(prevRank.attack * 1.2),
                            defense: Math.floor(prevRank.defense * 1.2),
                            speed: Math.floor(prevRank.speed * 1.1),
                            skill: Math.floor(prevRank.skill * 1.1),
                            luck: Math.floor(prevRank.luck * 1.1),
                        };
                    }
                }
            }
        }

        console.log('Common issues fixed for job:', fixed.id);
        return fixed;
    }

    /**
     * 改善提案を生成
     */
    suggestImprovements(jobData: JobData): ValidationSuggestion[] {
        const suggestions: ValidationSuggestion[] = [];

        // バランス改善提案
        if (jobData.statModifiers) {
            const powerLevel = this.calculatePowerLevel(jobData);
            if (powerLevel < 0.5) {
                suggestions.push({
                    type: 'enhancement',
                    field: 'statModifiers',
                    message: 'Job appears underpowered compared to typical jobs',
                    benefit: 'Increasing power level improves job viability',
                    implementation: 'Consider increasing stat modifiers by 20-30%',
                });
            }
        }

        // スキル多様性提案
        if (jobData.availableSkills) {
            const uniqueSkills = new Set();
            Object.values(jobData.availableSkills).forEach(skills => {
                skills.forEach(skill => uniqueSkills.add(skill));
            });

            if (uniqueSkills.size < 5) {
                suggestions.push({
                    type: 'enhancement',
                    field: 'availableSkills',
                    message: 'Limited skill variety may reduce job appeal',
                    benefit: 'More skills provide greater tactical options',
                    implementation: 'Consider adding 2-3 unique skills per job category',
                });
            }
        }

        // 成長曲線改善提案
        if (jobData.rankUpRequirements) {
            const costs = Object.values(jobData.rankUpRequirements).map(req => req.roseEssenceCost);
            const isLinear = costs.every((cost, i) => i === 0 || cost === costs[0] * (i + 1));

            if (isLinear) {
                suggestions.push({
                    type: 'optimization',
                    field: 'rankUpRequirements',
                    message: 'Linear cost progression may feel monotonous',
                    benefit: 'Exponential growth creates more meaningful progression milestones',
                    implementation: 'Consider exponential cost scaling (e.g., base * 1.5^rank)',
                });
            }
        }

        return suggestions;
    }

    /**
     * Jobオブジェクトから能力値修正を抽出
     */
    private extractStatModifiers(job: Job): { [rank: number]: StatModifiers } {
        const modifiers: { [rank: number]: StatModifiers } = {};

        for (let rank = 1; rank <= job.maxRank; rank++) {
            // 仮の実装 - 実際のJobクラスのAPIに合わせて調整が必要
            modifiers[rank] = job.getStatModifiers();
        }

        return modifiers;
    }

    /**
     * Jobオブジェクトから利用可能スキルを抽出
     */
    private extractAvailableSkills(job: Job): { [rank: number]: string[] } {
        const skills: { [rank: number]: string[] } = {};

        for (let rank = 1; rank <= job.maxRank; rank++) {
            // 仮の実装 - 実際のJobクラスのAPIに合わせて調整が必要
            skills[rank] = job.getAvailableSkills();
        }

        return skills;
    }

    /**
     * Jobオブジェクトからランクアップ要件を抽出
     */
    private extractRankUpRequirements(job: Job): { [rank: number]: RankUpRequirements } {
        const requirements: { [rank: number]: RankUpRequirements } = {};

        for (let rank = 2; rank <= job.maxRank; rank++) {
            // 仮の実装 - 実際のJobクラスのAPIに合わせて調整が必要
            requirements[rank] = job.getRankUpRequirements(rank);
        }

        return requirements;
    }

    /**
     * Jobオブジェクトから成長率修正を抽出
     */
    private extractGrowthRateModifiers(job: Job): { [rank: number]: StatModifiers } {
        const modifiers: { [rank: number]: StatModifiers } = {};

        for (let rank = 1; rank <= job.maxRank; rank++) {
            // 仮の実装 - 実際のJobクラスのAPIに合わせて調整が必要
            modifiers[rank] = job.getGrowthRateModifiers?.() || {
                hp: 1.0, mp: 1.0, attack: 1.0, defense: 1.0, speed: 1.0, skill: 1.0, luck: 1.0
            };
        }

        return modifiers;
    }

    /**
     * 検証レポートを生成
     */
    generateValidationReport(results: ValidationResult[]): string {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalJobs: results.length,
                validJobs: results.filter(r => r.isValid).length,
                averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
                totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
                totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
                totalSuggestions: results.reduce((sum, r) => sum + r.suggestions.length, 0),
            },
            results,
            config: this.config,
        };

        const reportText = JSON.stringify(report, null, 2);
        console.log('Validation report generated');
        return reportText;
    }

    /**
     * 設定を更新
     */
    setConfig(config: Partial<ValidationConfig>): void {
        this.config = { ...this.config, ...config };
        console.log('Validation config updated:', this.config);
    }

    /**
     * 設定を取得
     */
    getConfig(): ValidationConfig {
        return { ...this.config };
    }

    /**
     * 設定をリセット
     */
    resetConfig(): void {
        this.config = { ...JobDataValidator.DEFAULT_CONFIG };
        console.log('Validation config reset to defaults');
    }

    /**
     * 既知のスキルを追加
     */
    addKnownSkill(skill: string): void {
        this.knownSkills.add(skill);
        console.log(`Added known skill: ${skill}`);
    }

    /**
     * 既知の職業を追加
     */
    addKnownJob(jobData: JobData): void {
        this.knownJobs.set(jobData.id, jobData);
        console.log(`Added known job: ${jobData.id}`);
    }

    /**
     * 既知のスキル一覧を表示
     */
    listKnownSkills(): string[] {
        return Array.from(this.knownSkills);
    }

    /**
     * ヘルプを表示
     */
    private showHelp(): void {
        const commands = [
            '=== Job Data Validator Commands ===',
            '',
            'Validation:',
            '  validate(jobData)         - Validate single job data',
            '  validateAll(jobDataArray) - Validate multiple job data',
            '  validateJob(job)          - Validate Job object',
            '',
            'Configuration:',
            '  setConfig(config)         - Update validation config',
            '  getConfig()               - Get current config',
            '  resetConfig()             - Reset to default config',
            '',
            'Data Management:',
            '  addKnownSkill(skill)      - Add skill to known skills',
            '  addKnownJob(jobData)      - Add job to known jobs',
            '  listKnownSkills()         - List all known skills',
            '',
            'Utilities:',
            '  fixCommonIssues(jobData)  - Auto-fix common problems',
            '  suggestImprovements(jobData) - Get improvement suggestions',
            '  generateReport(results)   - Generate validation report',
            '',
            'Usage Examples:',
            '  jobValidator.validate(myJobData)',
            '  jobValidator.setConfig({ level: "strict" })',
            '  jobValidator.fixCommonIssues(myJobData)',
        ];

        console.log(commands.join('\n'));
    }
}