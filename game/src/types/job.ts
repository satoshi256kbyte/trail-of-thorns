/**
 * 職業・ランクアップシステムの型定義
 * 
 * このファイルには以下の型定義が含まれます：
 * - 職業関連の基本型定義
 * - 薔薇の力関連の型定義
 * - ランクアップ関連の型定義
 */

// =============================================================================
// 職業関連の基本型定義
// =============================================================================

/**
 * 能力値修正値の型定義
 */
export interface StatModifiers {
    hp: number;
    mp: number;
    attack: number;
    defense: number;
    speed: number;
    skill: number;
    luck: number;
}

/**
 * 成長率修正値の型定義
 */
export interface GrowthRateModifiers {
    hp: number;
    mp: number;
    attack: number;
    defense: number;
    speed: number;
    skill: number;
    luck: number;
}

/**
 * 職業カテゴリーの列挙型
 */
export enum JobCategory {
    WARRIOR = 'warrior',
    MAGE = 'mage',
    ARCHER = 'archer',
    HEALER = 'healer',
    THIEF = 'thief',
    SPECIAL = 'special',
}

/**
 * 職業特性の効果タイプ
 */
export enum TraitEffectType {
    STAT_BONUS = 'stat_bonus',
    SKILL_BONUS = 'skill_bonus',
    DAMAGE_BONUS = 'damage_bonus',
    RESISTANCE = 'resistance',
    SPECIAL_ABILITY = 'special_ability',
}

/**
 * 職業特性の効果定義
 */
export interface TraitEffect {
    type: TraitEffectType;
    value: number;
    target?: string;
    condition?: string;
}

/**
 * 職業特性の定義
 */
export interface JobTrait {
    id: string;
    name: string;
    description: string;
    effect: TraitEffect;
}

/**
 * スプライト修正の定義
 */
export interface SpriteModification {
    type: 'color' | 'overlay' | 'replace';
    target: string;
    value: string;
}

/**
 * カラースキームの定義
 */
export interface ColorScheme {
    primary: string;
    secondary: string;
    accent: string;
}

/**
 * 職業の視覚的表現
 */
export interface JobVisual {
    iconPath: string;
    spriteModifications: SpriteModification[];
    colorScheme: ColorScheme;
}

/**
 * ランクアップ要件の定義
 */
export interface RankUpRequirements {
    roseEssenceCost: number;
    levelRequirement: number;
    prerequisiteSkills: string[];
    completedStages?: string[];
    defeatedBosses?: string[];
}

/**
 * 職業データの完全な定義
 */
export interface JobData {
    id: string;
    name: string;
    description: string;
    category: JobCategory;
    maxRank: number;

    // 各ランクでの能力値修正
    statModifiers: {
        [rank: number]: StatModifiers;
    };

    // 各ランクでの使用可能スキル
    availableSkills: {
        [rank: number]: string[];
    };

    // ランクアップ要件
    rankUpRequirements: {
        [rank: number]: RankUpRequirements;
    };

    // 成長率修正
    growthRateModifiers: {
        [rank: number]: GrowthRateModifiers;
    };

    // 職業特性
    jobTraits: JobTrait[];

    // 視覚的表現
    visual: JobVisual;
}

/**
 * キャラクターの職業履歴エントリ
 */
export interface JobHistoryEntry {
    jobId: string;
    rank: number;
    changedAt: Date;
    roseEssenceUsed: number;
}

/**
 * キャラクターの職業データ
 */
export interface CharacterJobData {
    characterId: string;
    currentJobId: string;
    currentRank: number;
    jobHistory: JobHistoryEntry[];

    // 職業経験値（将来的な拡張用）
    jobExperience: Map<string, number>;

    // 習得済み職業スキル
    learnedJobSkills: Map<string, string[]>;
}

// =============================================================================
// 薔薇の力関連の型定義
// =============================================================================

/**
 * 薔薇の力の獲得源タイプ
 */
export enum RoseEssenceSourceType {
    BOSS_DEFEAT = 'boss_defeat',
    STAGE_CLEAR = 'stage_clear',
    SPECIAL_EVENT = 'special_event',
    ITEM_USE = 'item_use',
}

/**
 * 薔薇の力の獲得源情報
 */
export interface RoseEssenceSource {
    type: RoseEssenceSourceType;
    sourceId: string;
    bossId?: string;
    stageId?: string;
    eventId?: string;
}

/**
 * 薔薇の力の取引記録
 */
export interface RoseEssenceTransaction {
    id: string;
    type: 'gain' | 'spend';
    amount: number;
    source: RoseEssenceSource | string;
    timestamp: Date;
    characterId?: string;
    description: string;
}

/**
 * 薔薇の力の獲得源別設定
 */
export interface RoseEssenceSourceConfig {
    baseAmount: number;
    difficultyMultiplier: number;
    firstTimeBonus: number;
}

/**
 * 薔薇の力の消費用途別設定
 */
export interface RoseEssenceCostConfig {
    rankUp: {
        [jobCategory: string]: {
            [rank: number]: number;
        };
    };
    jobChange: number;
    skillUnlock: number;
}

/**
 * 薔薇の力データの完全な定義
 */
export interface RoseEssenceData {
    currentAmount: number;
    totalEarned: number;
    totalSpent: number;

    // 獲得源別の設定
    sources: {
        [sourceType: string]: RoseEssenceSourceConfig;
    };

    // 消費用途別の設定
    costs: RoseEssenceCostConfig;
}

// =============================================================================
// ランクアップ関連の型定義
// =============================================================================

/**
 * ランクアップ可能性の判定結果
 */
export interface RankUpAvailability {
    canRankUp: boolean;
    currentRank: number;
    targetRank: number;
    requirements: RankUpRequirements;
    missingRequirements: {
        roseEssence?: number;
        level?: number;
        skills?: string[];
        stages?: string[];
        bosses?: string[];
    };
}

/**
 * ランクアップ結果の詳細
 */
export interface RankUpResult {
    success: boolean;
    characterId: string;
    jobId: string;
    oldRank: number;
    newRank: number;
    roseEssenceUsed: number;
    newStatModifiers: StatModifiers;
    newSkills: string[];
    newTraits: JobTrait[];
    error?: string;
}

/**
 * キャラクターのランクアップ情報
 */
export interface CharacterRankUpInfo {
    characterId: string;
    characterName: string;
    currentJob: string;
    currentRank: number;
    maxRank: number;
    canRankUp: boolean;
    nextRankRequirements: RankUpRequirements;
    roseEssenceCost: number;
}

/**
 * 職業変更の結果
 */
export interface JobChangeResult {
    success: boolean;
    characterId: string;
    oldJobId: string;
    newJobId: string;
    oldRank: number;
    newRank: number;
    statChanges: StatModifiers;
    skillChanges: {
        lost: string[];
        gained: string[];
    };
    error?: string;
}

// =============================================================================
// システム関連の型定義
// =============================================================================

/**
 * 職業システムのエラータイプ
 */
export enum JobSystemError {
    JOB_NOT_FOUND = 'job_not_found',
    INVALID_RANK = 'invalid_rank',
    INSUFFICIENT_ROSE_ESSENCE = 'insufficient_rose_essence',
    LEVEL_REQUIREMENT_NOT_MET = 'level_requirement_not_met',
    PREREQUISITE_SKILLS_MISSING = 'prerequisite_skills_missing',
    JOB_CHANGE_NOT_ALLOWED = 'job_change_not_allowed',
    RANK_UP_NOT_AVAILABLE = 'rank_up_not_available',
    DATA_CORRUPTION = 'data_corruption',
}

/**
 * 職業システムのコンテキスト情報
 */
export interface JobSystemContext {
    characterId: string;
    currentJobId?: string;
    targetJobId?: string;
    currentRank?: number;
    targetRank?: number;
    availableRoseEssence?: number;
    characterLevel?: number;
    error?: JobSystemError;
}

/**
 * メモリ使用量情報
 */
export interface MemoryUsageInfo {
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
}

/**
 * 職業システムの設定
 */
export interface JobSystemConfig {
    enableDebugMode: boolean;
    maxJobsPerCharacter: number;
    defaultRoseEssenceAmount: number;
    autoSaveInterval: number;
    performanceMonitoring: boolean;
}

// =============================================================================
// エクスポート用の型定義集約
// =============================================================================

/**
 * 職業システム関連の全型定義をまとめたインターフェース
 */
export interface JobSystemTypes {
    // 基本型
    StatModifiers: StatModifiers;
    GrowthRateModifiers: GrowthRateModifiers;
    JobData: JobData;
    CharacterJobData: CharacterJobData;

    // 薔薇の力関連
    RoseEssenceData: RoseEssenceData;
    RoseEssenceTransaction: RoseEssenceTransaction;
    RoseEssenceSource: RoseEssenceSource;

    // ランクアップ関連
    RankUpRequirements: RankUpRequirements;
    RankUpResult: RankUpResult;
    RankUpAvailability: RankUpAvailability;
    JobChangeResult: JobChangeResult;

    // システム関連
    JobSystemError: JobSystemError;
    JobSystemContext: JobSystemContext;
    JobSystemConfig: JobSystemConfig;
}