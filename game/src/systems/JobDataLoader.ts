/**
 * 職業データローダーとJSONスキーマ検証システム
 * 
 * 職業データJSONファイルの読み込み、検証、キャッシュ管理を行う
 */

import { JobData, RoseEssenceData, JobSystemError } from '../types/job';
import {
    jobDataSchema,
    roseEssenceDataSchema,
    jobTableSchema,
    validateJobData,
    validateRoseEssenceData,
    validateJobTable
} from '../schemas/jobSchema';

/**
 * 職業テーブルデータの型定義
 */
export interface JobTableData {
    version: string;
    jobs: JobData[];
    roseEssenceConfig?: RoseEssenceData;
}

/**
 * データ検証結果の型定義
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * データ整合性チェック結果の型定義
 */
export interface IntegrityCheckResult {
    isValid: boolean;
    errors: string[];
    missingReferences: string[];
    duplicateIds: string[];
}

/**
 * 職業データローダークラス
 */
export class JobDataLoader {
    private static instance: JobDataLoader;
    private jobCache: Map<string, JobData> = new Map();
    private roseEssenceCache: RoseEssenceData | null = null;
    private lastLoadTime: number = 0;
    private cacheTimeout: number = 5 * 60 * 1000; // 5分

    /**
     * シングルトンインスタンスの取得
     */
    public static getInstance(): JobDataLoader {
        if (!JobDataLoader.instance) {
            JobDataLoader.instance = new JobDataLoader();
        }
        return JobDataLoader.instance;
    }

    /**
     * 職業データJSONファイルの読み込み
     */
    public async loadJobData(filePath: string = 'data/jobs.json'): Promise<JobTableData> {
        try {
            console.log(`職業データを読み込み中: ${filePath}`);

            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`職業データファイルの読み込みに失敗: ${response.status} ${response.statusText}`);
            }

            const rawData = await response.json();

            // データの検証
            const validationResult = this.validateJobTableData(rawData);
            if (!validationResult.isValid) {
                console.error('職業データの検証に失敗:', validationResult.errors);
                throw new Error(`職業データの検証エラー: ${validationResult.errors.join(', ')}`);
            }

            // 警告がある場合はログに出力
            if (validationResult.warnings.length > 0) {
                console.warn('職業データの警告:', validationResult.warnings);
            }

            // データ整合性チェック
            const integrityResult = this.checkDataIntegrity(rawData);
            if (!integrityResult.isValid) {
                console.error('職業データの整合性チェックに失敗:', integrityResult.errors);
                throw new Error(`職業データの整合性エラー: ${integrityResult.errors.join(', ')}`);
            }

            // キャッシュに保存
            this.updateCache(rawData);

            console.log(`職業データの読み込み完了: ${rawData.jobs.length}個の職業`);
            return rawData as JobTableData;

        } catch (error) {
            console.error('職業データの読み込みエラー:', error);

            // デフォルトデータの使用を試行
            const defaultData = this.getDefaultJobData();
            if (defaultData) {
                console.warn('デフォルト職業データを使用します');
                return defaultData;
            }

            throw new Error(`職業データの読み込みに失敗: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 薔薇の力設定データの読み込み
     */
    public async loadRoseEssenceData(filePath: string = 'data/rose-essence-config.json'): Promise<RoseEssenceData> {
        try {
            console.log(`薔薇の力設定データを読み込み中: ${filePath}`);

            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`薔薇の力設定ファイルの読み込みに失敗: ${response.status} ${response.statusText}`);
            }

            const rawData = await response.json();

            // データの検証
            const validationResult = this.validateRoseEssenceData(rawData);
            if (!validationResult.isValid) {
                console.error('薔薇の力設定データの検証に失敗:', validationResult.errors);
                throw new Error(`薔薇の力設定データの検証エラー: ${validationResult.errors.join(', ')}`);
            }

            // キャッシュに保存
            this.roseEssenceCache = rawData as RoseEssenceData;

            console.log('薔薇の力設定データの読み込み完了');
            return rawData as RoseEssenceData;

        } catch (error) {
            console.error('薔薇の力設定データの読み込みエラー:', error);

            // デフォルトデータの使用を試行
            const defaultData = this.getDefaultRoseEssenceData();
            if (defaultData) {
                console.warn('デフォルト薔薇の力設定データを使用します');
                return defaultData;
            }

            throw new Error(`薔薇の力設定データの読み込みに失敗: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 職業データの検証・バリデーション
     */
    public validateJobTableData(data: unknown): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: []
        };

        try {
            // 基本的な型チェック
            if (!data || typeof data !== 'object') {
                result.isValid = false;
                result.errors.push('データが無効です（nullまたは非オブジェクト）');
                return result;
            }

            const jobTable = data as any;

            // 必須フィールドのチェック
            if (!jobTable.version) {
                result.errors.push('バージョン情報が不足しています');
            }

            if (!jobTable.jobs || !Array.isArray(jobTable.jobs)) {
                result.isValid = false;
                result.errors.push('職業データ配列が不足しています');
                return result;
            }

            if (jobTable.jobs.length === 0) {
                result.isValid = false;
                result.errors.push('職業データが空です');
                return result;
            }

            // 各職業データの検証
            for (let i = 0; i < jobTable.jobs.length; i++) {
                const job = jobTable.jobs[i];
                const jobValidation = this.validateSingleJobData(job, i);

                result.errors.push(...jobValidation.errors);
                result.warnings.push(...jobValidation.warnings);

                if (!jobValidation.isValid) {
                    result.isValid = false;
                }
            }

            // 薔薇の力設定の検証（オプション）
            if (jobTable.roseEssenceConfig) {
                const roseValidation = this.validateRoseEssenceData(jobTable.roseEssenceConfig);
                result.errors.push(...roseValidation.errors);
                result.warnings.push(...roseValidation.warnings);

                if (!roseValidation.isValid) {
                    result.isValid = false;
                }
            }

        } catch (error) {
            result.isValid = false;
            result.errors.push(`検証中にエラーが発生: ${error instanceof Error ? error.message : String(error)}`);
        }

        return result;
    }

    /**
     * 単一職業データの検証
     */
    private validateSingleJobData(job: unknown, index: number): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: []
        };

        if (!job || typeof job !== 'object') {
            result.isValid = false;
            result.errors.push(`職業データ[${index}]: 無効なデータ形式`);
            return result;
        }

        const jobData = job as any;

        // 必須フィールドのチェック
        const requiredFields = ['id', 'name', 'description', 'category', 'maxRank'];
        for (const field of requiredFields) {
            if (!jobData[field]) {
                result.errors.push(`職業データ[${index}]: 必須フィールド '${field}' が不足`);
            }
        }

        // IDの重複チェック（後でまとめて行う）
        if (jobData.id && typeof jobData.id !== 'string') {
            result.errors.push(`職業データ[${index}]: IDは文字列である必要があります`);
        }

        // maxRankの範囲チェック
        if (jobData.maxRank && (typeof jobData.maxRank !== 'number' || jobData.maxRank < 1 || jobData.maxRank > 10)) {
            result.errors.push(`職業データ[${index}]: maxRankは1-10の範囲である必要があります`);
        }

        // statModifiersの検証
        if (jobData.statModifiers) {
            const statValidation = this.validateStatModifiers(jobData.statModifiers, index);
            result.errors.push(...statValidation.errors);
            result.warnings.push(...statValidation.warnings);
            if (!statValidation.isValid) {
                result.isValid = false;
            }
        }

        // availableSkillsの検証
        if (jobData.availableSkills) {
            const skillValidation = this.validateAvailableSkills(jobData.availableSkills, index);
            result.errors.push(...skillValidation.errors);
            result.warnings.push(...skillValidation.warnings);
            if (!skillValidation.isValid) {
                result.isValid = false;
            }
        }

        // rankUpRequirementsの検証
        if (jobData.rankUpRequirements) {
            const rankValidation = this.validateRankUpRequirements(jobData.rankUpRequirements, index, jobData.maxRank);
            result.errors.push(...rankValidation.errors);
            result.warnings.push(...rankValidation.warnings);
            if (!rankValidation.isValid) {
                result.isValid = false;
            }
        }

        return result;
    }

    /**
     * 能力値修正の検証
     */
    private validateStatModifiers(statModifiers: unknown, jobIndex: number): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: []
        };

        if (!statModifiers || typeof statModifiers !== 'object') {
            result.isValid = false;
            result.errors.push(`職業データ[${jobIndex}]: statModifiersが無効`);
            return result;
        }

        const stats = statModifiers as any;
        const requiredStats = ['hp', 'mp', 'attack', 'defense', 'speed', 'skill', 'luck'];

        for (const [rank, modifiers] of Object.entries(stats)) {
            if (!modifiers || typeof modifiers !== 'object') {
                result.errors.push(`職業データ[${jobIndex}]: ランク${rank}の能力値修正が無効`);
                continue;
            }

            const rankModifiers = modifiers as any;
            for (const stat of requiredStats) {
                if (typeof rankModifiers[stat] !== 'number') {
                    result.errors.push(`職業データ[${jobIndex}]: ランク${rank}の${stat}が数値ではありません`);
                }
            }

            // 能力値の妥当性チェック
            if (rankModifiers.hp && rankModifiers.hp < -50) {
                result.warnings.push(`職業データ[${jobIndex}]: ランク${rank}のHP修正が極端に低い値です`);
            }
        }

        return result;
    }

    /**
     * 使用可能スキルの検証
     */
    private validateAvailableSkills(availableSkills: unknown, jobIndex: number): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: []
        };

        if (!availableSkills || typeof availableSkills !== 'object') {
            result.isValid = false;
            result.errors.push(`職業データ[${jobIndex}]: availableSkillsが無効`);
            return result;
        }

        const skills = availableSkills as any;

        for (const [rank, skillList] of Object.entries(skills)) {
            if (!Array.isArray(skillList)) {
                result.errors.push(`職業データ[${jobIndex}]: ランク${rank}のスキルリストが配列ではありません`);
                continue;
            }

            const skillArray = skillList as string[];
            for (let i = 0; i < skillArray.length; i++) {
                if (typeof skillArray[i] !== 'string') {
                    result.errors.push(`職業データ[${jobIndex}]: ランク${rank}のスキル[${i}]が文字列ではありません`);
                }
            }

            // スキル数の妥当性チェック
            if (skillArray.length === 0) {
                result.warnings.push(`職業データ[${jobIndex}]: ランク${rank}にスキルが設定されていません`);
            }
        }

        return result;
    }

    /**
     * ランクアップ要件の検証
     */
    private validateRankUpRequirements(requirements: unknown, jobIndex: number, maxRank: number): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: []
        };

        if (!requirements || typeof requirements !== 'object') {
            result.isValid = false;
            result.errors.push(`職業データ[${jobIndex}]: rankUpRequirementsが無効`);
            return result;
        }

        const reqs = requirements as any;

        for (const [rank, requirement] of Object.entries(reqs)) {
            const rankNum = parseInt(rank);
            if (isNaN(rankNum) || rankNum < 2 || rankNum > maxRank) {
                result.errors.push(`職業データ[${jobIndex}]: 無効なランク${rank}の要件`);
                continue;
            }

            if (!requirement || typeof requirement !== 'object') {
                result.errors.push(`職業データ[${jobIndex}]: ランク${rank}の要件が無効`);
                continue;
            }

            const req = requirement as any;

            // 必須フィールドのチェック
            if (typeof req.roseEssenceCost !== 'number' || req.roseEssenceCost < 0) {
                result.errors.push(`職業データ[${jobIndex}]: ランク${rank}の薔薇の力コストが無効`);
            }

            if (typeof req.levelRequirement !== 'number' || req.levelRequirement < 1) {
                result.errors.push(`職業データ[${jobIndex}]: ランク${rank}のレベル要件が無効`);
            }

            if (!Array.isArray(req.prerequisiteSkills)) {
                result.errors.push(`職業データ[${jobIndex}]: ランク${rank}の前提スキルが配列ではありません`);
            }
        }

        return result;
    }

    /**
     * 薔薇の力データの検証
     */
    public validateRoseEssenceData(data: unknown): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: []
        };

        try {
            if (!data || typeof data !== 'object') {
                result.isValid = false;
                result.errors.push('薔薇の力データが無効です');
                return result;
            }

            const roseData = data as any;

            // 必須フィールドのチェック
            const requiredFields = ['currentAmount', 'totalEarned', 'totalSpent', 'sources', 'costs'];
            for (const field of requiredFields) {
                if (roseData[field] === undefined) {
                    result.errors.push(`薔薇の力データ: 必須フィールド '${field}' が不足`);
                }
            }

            // 数値フィールドの検証
            const numericFields = ['currentAmount', 'totalEarned', 'totalSpent'];
            for (const field of numericFields) {
                if (roseData[field] !== undefined && (typeof roseData[field] !== 'number' || roseData[field] < 0)) {
                    result.errors.push(`薔薇の力データ: ${field}は0以上の数値である必要があります`);
                }
            }

            // sourcesの検証
            if (roseData.sources && typeof roseData.sources === 'object') {
                for (const [sourceType, config] of Object.entries(roseData.sources)) {
                    if (!config || typeof config !== 'object') {
                        result.errors.push(`薔薇の力データ: 獲得源 '${sourceType}' の設定が無効`);
                        continue;
                    }

                    const sourceConfig = config as any;
                    const requiredSourceFields = ['baseAmount', 'difficultyMultiplier', 'firstTimeBonus'];
                    for (const field of requiredSourceFields) {
                        if (typeof sourceConfig[field] !== 'number' || sourceConfig[field] < 0) {
                            result.errors.push(`薔薇の力データ: 獲得源 '${sourceType}' の ${field} が無効`);
                        }
                    }
                }
            }

            // costsの検証
            if (roseData.costs && typeof roseData.costs === 'object') {
                const costs = roseData.costs;

                if (costs.rankUp && typeof costs.rankUp === 'object') {
                    for (const [jobCategory, rankCosts] of Object.entries(costs.rankUp)) {
                        if (!rankCosts || typeof rankCosts !== 'object') {
                            result.errors.push(`薔薇の力データ: 職業 '${jobCategory}' のランクアップコストが無効`);
                            continue;
                        }

                        const rankCostObj = rankCosts as any;
                        for (const [rank, cost] of Object.entries(rankCostObj)) {
                            if (typeof cost !== 'number' || (cost as number) < 0) {
                                result.errors.push(`薔薇の力データ: 職業 '${jobCategory}' ランク${rank}のコストが無効`);
                            }
                        }
                    }
                }

                if (typeof costs.jobChange !== 'number' || costs.jobChange < 0) {
                    result.errors.push('薔薇の力データ: 職業変更コストが無効');
                }

                if (typeof costs.skillUnlock !== 'number' || costs.skillUnlock < 0) {
                    result.errors.push('薔薇の力データ: スキル解放コストが無効');
                }
            }

        } catch (error) {
            result.isValid = false;
            result.errors.push(`薔薇の力データの検証中にエラー: ${error instanceof Error ? error.message : String(error)}`);
        }

        if (result.errors.length > 0) {
            result.isValid = false;
        }

        return result;
    }

    /**
     * データ整合性チェック
     */
    public checkDataIntegrity(data: JobTableData): IntegrityCheckResult {
        const result: IntegrityCheckResult = {
            isValid: true,
            errors: [],
            missingReferences: [],
            duplicateIds: []
        };

        try {
            // 職業IDの重複チェック
            const jobIds = new Set<string>();
            const duplicates = new Set<string>();

            for (const job of data.jobs) {
                if (jobIds.has(job.id)) {
                    duplicates.add(job.id);
                } else {
                    jobIds.add(job.id);
                }
            }

            if (duplicates.size > 0) {
                result.duplicateIds = Array.from(duplicates);
                result.errors.push(`重複する職業ID: ${Array.from(duplicates).join(', ')}`);
                result.isValid = false;
            }

            // ランクの整合性チェック
            for (const job of data.jobs) {
                // statModifiersのランクチェック
                const statRanks = Object.keys(job.statModifiers).map(Number).sort((a, b) => a - b);
                const expectedRanks = Array.from({ length: job.maxRank }, (_, i) => i + 1);

                for (const expectedRank of expectedRanks) {
                    if (!statRanks.includes(expectedRank)) {
                        result.errors.push(`職業 '${job.id}': ランク${expectedRank}の能力値修正が不足`);
                        result.isValid = false;
                    }
                }

                // availableSkillsのランクチェック
                const skillRanks = Object.keys(job.availableSkills).map(Number).sort((a, b) => a - b);
                for (const expectedRank of expectedRanks) {
                    if (!skillRanks.includes(expectedRank)) {
                        result.errors.push(`職業 '${job.id}': ランク${expectedRank}のスキルリストが不足`);
                        result.isValid = false;
                    }
                }

                // rankUpRequirementsのランクチェック（ランク2以上）
                const rankUpRanks = Object.keys(job.rankUpRequirements).map(Number).sort((a, b) => a - b);
                const expectedRankUpRanks = Array.from({ length: job.maxRank - 1 }, (_, i) => i + 2);

                for (const expectedRank of expectedRankUpRanks) {
                    if (!rankUpRanks.includes(expectedRank)) {
                        result.errors.push(`職業 '${job.id}': ランク${expectedRank}のランクアップ要件が不足`);
                        result.isValid = false;
                    }
                }
            }

            // 薔薇の力設定との整合性チェック
            if (data.roseEssenceConfig) {
                const roseConfig = data.roseEssenceConfig;

                // 職業カテゴリーとランクアップコストの整合性
                for (const job of data.jobs) {
                    if (!roseConfig.costs.rankUp[job.category]) {
                        result.errors.push(`薔薇の力設定: 職業カテゴリー '${job.category}' のランクアップコストが不足`);
                        result.isValid = false;
                    } else {
                        const categoryRankCosts = roseConfig.costs.rankUp[job.category];
                        for (let rank = 2; rank <= job.maxRank; rank++) {
                            if (!categoryRankCosts[rank]) {
                                result.errors.push(`薔薇の力設定: 職業 '${job.category}' ランク${rank}のコストが不足`);
                                result.isValid = false;
                            }
                        }
                    }
                }
            }

        } catch (error) {
            result.isValid = false;
            result.errors.push(`整合性チェック中にエラー: ${error instanceof Error ? error.message : String(error)}`);
        }

        return result;
    }

    /**
     * データキャッシュシステム
     */
    private updateCache(data: JobTableData): void {
        // 職業データをキャッシュに保存
        this.jobCache.clear();
        for (const job of data.jobs) {
            this.jobCache.set(job.id, job);
        }

        // 薔薇の力設定をキャッシュに保存
        if (data.roseEssenceConfig) {
            this.roseEssenceCache = data.roseEssenceConfig;
        }

        this.lastLoadTime = Date.now();
        console.log(`データキャッシュを更新: ${data.jobs.length}個の職業`);
    }

    /**
     * キャッシュから職業データを取得
     */
    public getCachedJobData(jobId: string): JobData | null {
        if (this.isCacheExpired()) {
            console.warn('キャッシュが期限切れです');
            return null;
        }

        return this.jobCache.get(jobId) || null;
    }

    /**
     * キャッシュから薔薇の力設定を取得
     */
    public getCachedRoseEssenceData(): RoseEssenceData | null {
        if (this.isCacheExpired()) {
            console.warn('キャッシュが期限切れです');
            return null;
        }

        return this.roseEssenceCache;
    }

    /**
     * キャッシュの有効期限チェック
     */
    private isCacheExpired(): boolean {
        return Date.now() - this.lastLoadTime > this.cacheTimeout;
    }

    /**
     * キャッシュのクリア
     */
    public clearCache(): void {
        this.jobCache.clear();
        this.roseEssenceCache = null;
        this.lastLoadTime = 0;
        console.log('データキャッシュをクリアしました');
    }

    /**
     * デフォルト職業データの取得
     */
    private getDefaultJobData(): JobTableData | null {
        try {
            // 最小限のデフォルト職業データ
            const defaultData: JobTableData = {
                version: '1.0.0-default',
                jobs: [
                    {
                        id: 'warrior',
                        name: '戦士',
                        description: '基本的な戦士職業',
                        category: 'warrior' as any,
                        maxRank: 3,
                        statModifiers: {
                            1: { hp: 5, mp: 2, attack: 3, defense: 3, speed: 0, skill: 1, luck: 1 },
                            2: { hp: 10, mp: 4, attack: 6, defense: 6, speed: 0, skill: 2, luck: 2 },
                            3: { hp: 15, mp: 6, attack: 9, defense: 9, speed: 0, skill: 3, luck: 3 }
                        },
                        availableSkills: {
                            1: ['sword_slash'],
                            2: ['sword_slash', 'guard'],
                            3: ['sword_slash', 'guard', 'power_strike']
                        },
                        rankUpRequirements: {
                            2: { roseEssenceCost: 10, levelRequirement: 5, prerequisiteSkills: ['sword_slash'] },
                            3: { roseEssenceCost: 25, levelRequirement: 12, prerequisiteSkills: ['guard'] }
                        },
                        growthRateModifiers: {
                            1: { hp: 15, mp: 5, attack: 12, defense: 10, speed: 5, skill: 6, luck: 4 },
                            2: { hp: 17, mp: 7, attack: 14, defense: 12, speed: 7, skill: 8, luck: 6 },
                            3: { hp: 19, mp: 9, attack: 16, defense: 14, speed: 9, skill: 10, luck: 8 }
                        },
                        jobTraits: [],
                        visual: {
                            iconPath: 'assets/icons/jobs/warrior.png',
                            spriteModifications: [],
                            colorScheme: { primary: '#8B4513', secondary: '#CD853F', accent: '#FFD700' }
                        }
                    }
                ]
            };

            console.log('デフォルト職業データを生成しました');
            return defaultData;

        } catch (error) {
            console.error('デフォルト職業データの生成に失敗:', error);
            return null;
        }
    }

    /**
     * デフォルト薔薇の力設定の取得
     */
    private getDefaultRoseEssenceData(): RoseEssenceData | null {
        try {
            const defaultData: RoseEssenceData = {
                currentAmount: 0,
                totalEarned: 0,
                totalSpent: 0,
                sources: {
                    boss_defeat: { baseAmount: 50, difficultyMultiplier: 1.5, firstTimeBonus: 25 }
                },
                costs: {
                    rankUp: {
                        warrior: { 2: 10, 3: 25 }
                    },
                    jobChange: 5,
                    skillUnlock: 15
                }
            };

            console.log('デフォルト薔薇の力設定データを生成しました');
            return defaultData;

        } catch (error) {
            console.error('デフォルト薔薇の力設定データの生成に失敗:', error);
            return null;
        }
    }

    /**
     * データの再読み込み
     */
    public async reloadData(jobFilePath?: string, roseFilePath?: string): Promise<{ jobData: JobTableData; roseData: RoseEssenceData }> {
        this.clearCache();

        const [jobData, roseData] = await Promise.all([
            this.loadJobData(jobFilePath),
            this.loadRoseEssenceData(roseFilePath)
        ]);

        return { jobData, roseData };
    }

    /**
     * キャッシュ統計情報の取得
     */
    public getCacheStats(): { jobCount: number; hasRoseEssenceData: boolean; lastLoadTime: number; isExpired: boolean } {
        return {
            jobCount: this.jobCache.size,
            hasRoseEssenceData: this.roseEssenceCache !== null,
            lastLoadTime: this.lastLoadTime,
            isExpired: this.isCacheExpired()
        };
    }
}

/**
 * 職業データローダーのシングルトンインスタンスをエクスポート
 */
export const jobDataLoader = JobDataLoader.getInstance();