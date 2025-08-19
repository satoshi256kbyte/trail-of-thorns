/**
 * 経験値システム関連の型定義
 * 
 * このファイルには、経験値・レベルアップシステムで使用される
 * 全ての型定義、インターフェース、列挙型が含まれています。
 * 
 * 主な機能:
 * - 多様な経験値獲得方法の定義
 * - レベルアップと能力値成長の管理
 * - 経験値テーブルとデータ構造
 * - イベントシステムと統計情報
 * 
 * @version 1.0.0
 * @author Trail of Thorns Development Team
 */

/**
 * 経験値獲得源の種類
 */
export enum ExperienceSource {
    ATTACK_HIT = 'attack_hit',        // 攻撃命中
    ENEMY_DEFEAT = 'enemy_defeat',    // 敵撃破
    ALLY_SUPPORT = 'ally_support',    // 味方支援
    HEALING = 'healing',              // 回復
    SKILL_USE = 'skill_use',          // スキル使用
    CRITICAL_HIT = 'critical_hit',    // クリティカルヒット
    COUNTER_ATTACK = 'counter_attack', // 反撃
    TURN_SURVIVAL = 'turn_survival'   // ターン生存
}

/**
 * 経験値獲得アクションの種類
 */
export enum ExperienceAction {
    ATTACK = 'attack',
    DEFEAT = 'defeat',
    HEAL = 'heal',
    SUPPORT = 'support',
    SKILL_CAST = 'skill_cast',
    BUFF_APPLY = 'buff_apply',
    DEBUFF_APPLY = 'debuff_apply'
}

/**
 * 経験値システムエラーの種類
 */
export enum ExperienceError {
    DATA_NOT_FOUND = 'data_not_found',
    INVALID_CHARACTER = 'invalid_character',
    MAX_LEVEL_REACHED = 'max_level_reached',
    INVALID_EXPERIENCE_AMOUNT = 'invalid_experience_amount',
    EXPERIENCE_TABLE_INVALID = 'experience_table_invalid',
    GROWTH_RATE_INVALID = 'growth_rate_invalid',
    STAT_LIMIT_EXCEEDED = 'stat_limit_exceeded',
    LEVEL_UP_FAILED = 'level_up_failed',
    SYSTEM_NOT_INITIALIZED = 'system_not_initialized',
    PERSISTENCE_ERROR = 'persistence_error'
}

/**
 * 経験値永続化エラーの種類
 */
export enum ExperiencePersistenceError {
    NOT_INITIALIZED = 'not_initialized',
    SAVE_SYSTEM_UNAVAILABLE = 'save_system_unavailable',
    INITIALIZATION_FAILED = 'initialization_failed',
    SAVE_FAILED = 'save_failed',
    LOAD_FAILED = 'load_failed',
    VALIDATION_FAILED = 'validation_failed',
    RECOVERY_FAILED = 'recovery_failed',
    NO_BACKUP_AVAILABLE = 'no_backup_available',
    NO_RECOVERABLE_DATA = 'no_recoverable_data',
    DATA_EXTRACTION_FAILED = 'data_extraction_failed',
    REPAIR_FAILED = 'repair_failed'
}

/**
 * キャラクターの経験値情報
 * 
 * キャラクターの現在の経験値状況とレベルアップ可能性を表す
 * 
 * @interface ExperienceInfo
 * @example
 * ```typescript
 * const expInfo: ExperienceInfo = {
 *   characterId: 'player-001',
 *   currentExperience: 150,
 *   currentLevel: 5,
 *   experienceToNextLevel: 50,
 *   totalExperience: 150,
 *   canLevelUp: false,
 *   isMaxLevel: false,
 *   experienceProgress: 0.75
 * };
 * ```
 */
export interface ExperienceInfo {
    /** キャラクターの一意識別子 */
    characterId: string;
    /** 現在のレベルでの経験値 */
    currentExperience: number;
    /** 現在のレベル */
    currentLevel: number;
    /** 次のレベルまでに必要な経験値 */
    experienceToNextLevel: number;
    /** 累計獲得経験値 */
    totalExperience: number;
    /** レベルアップ可能かどうか */
    canLevelUp: boolean;
    /** 最大レベルに到達しているかどうか */
    isMaxLevel: boolean;
    /** 次のレベルまでの進捗率 (0.0-1.0) */
    experienceProgress: number;
}

/**
 * レベルアップ結果
 * 
 * レベルアップ処理の完了後に返される結果情報
 * 
 * @interface LevelUpResult
 * @example
 * ```typescript
 * const levelUpResult: LevelUpResult = {
 *   characterId: 'player-001',
 *   oldLevel: 4,
 *   newLevel: 5,
 *   statGrowth: { hp: 5, mp: 3, attack: 2, defense: 1, speed: 1, skill: 2, luck: 1 },
 *   newExperienceRequired: 250,
 *   oldStats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3, skill: 12, luck: 8 },
 *   newStats: { maxHP: 105, maxMP: 53, attack: 22, defense: 16, speed: 11, movement: 3, skill: 14, luck: 9 },
 *   levelsGained: 1,
 *   timestamp: Date.now()
 * };
 * ```
 */
export interface LevelUpResult {
    /** キャラクターの一意識別子 */
    characterId: string;
    /** レベルアップ前のレベル */
    oldLevel: number;
    /** レベルアップ後のレベル */
    newLevel: number;
    /** 能力値の成長結果 */
    statGrowth: StatGrowthResult;
    /** 新しいレベルでの次レベルまでの必要経験値 */
    newExperienceRequired: number;
    /** レベルアップ前の能力値 */
    oldStats: UnitStats;
    /** レベルアップ後の能力値 */
    newStats: UnitStats;
    /** 獲得したレベル数（複数レベルアップの場合） */
    levelsGained: number;
    /** レベルアップが発生した時刻（Unix timestamp） */
    timestamp: number;
}

// 基本のUnitStatsをgameplay.tsからインポートし、経験値システム用に拡張
import type { UnitStats as BaseUnitStats } from './gameplay';

/**
 * 経験値システム用の拡張ユニット統計情報
 */
export interface UnitStats extends BaseUnitStats {
    skill: number;     // 技術
    luck: number;      // 運
}

/**
 * 能力値成長結果
 */
export interface StatGrowthResult {
    hp: number;        // HP上昇値
    mp: number;        // MP上昇値
    attack: number;    // 攻撃力上昇値
    defense: number;   // 防御力上昇値
    speed: number;     // 速度上昇値
    skill: number;     // 技術上昇値
    luck: number;      // 運上昇値
}

/**
 * キャラクター成長率
 */
export interface GrowthRates {
    hp: number;        // HP成長率 (0-100%)
    mp: number;        // MP成長率 (0-100%)
    attack: number;    // 攻撃力成長率 (0-100%)
    defense: number;   // 防御力成長率 (0-100%)
    speed: number;     // 速度成長率 (0-100%)
    skill: number;     // 技術成長率 (0-100%)
    luck: number;      // 運成長率 (0-100%)
}

/**
 * 経験値テーブルデータ
 */
export interface ExperienceTableData {
    levelRequirements: number[];           // レベル別必要経験値
    experienceGains: {
        attackHit: number;                   // 攻撃命中時獲得経験値
        enemyDefeat: number;                 // 敵撃破時獲得経験値
        allySupport: number;                 // 味方支援時獲得経験値
        healing: number;                     // 回復時獲得経験値
    };
    maxLevel: number;                      // 最大レベル
}

/**
 * 経験値獲得コンテキスト
 */
export interface ExperienceContext {
    source: ExperienceSource;
    action: ExperienceAction;
    targetId?: string;
    amount?: number;
    multiplier?: number;
    bonusAmount?: number;
    metadata?: Record<string, any>;
    timestamp: number;
    battleContext?: BattleContext;
}

/**
 * 戦闘コンテキスト
 */
export interface BattleContext {
    battleId: string;
    turnNumber: number;
    attackerId?: string;
    defenderId?: string;
    damageDealt?: number;
    healingAmount?: number;
    skillId?: string;
}

/**
 * 能力値上限設定
 */
export interface StatLimits {
    maxHP: number;
    maxMP: number;
    attack: number;
    defense: number;
    speed: number;
    skill: number;
    luck: number;
}

/**
 * 成長率データ
 */
export interface GrowthRateData {
    characterGrowthRates: Record<string, GrowthRates>;
    jobClassGrowthRates: Record<string, GrowthRates>;
    statLimits: StatLimits;
}

/**
 * 経験値システム設定
 */
export interface ExperienceSystemConfig {
    enableExperienceGain: boolean;
    experienceMultiplier: number;
    maxLevel: number;
    debugMode: boolean;
    autoLevelUp: boolean;
    showExperiencePopups: boolean;
    experienceAnimationSpeed: number;
    levelUpAnimationDuration: number;
}

/**
 * 経験値イベント
 */
export interface ExperienceEvent {
    type: ExperienceEventType;
    characterId: string;
    data: ExperienceEventData;
    timestamp: number;
}

/**
 * 経験値イベントタイプ
 */
export enum ExperienceEventType {
    EXPERIENCE_GAINED = 'experience_gained',
    LEVEL_UP = 'level_up',
    STAT_GROWTH = 'stat_growth',
    MAX_LEVEL_REACHED = 'max_level_reached',
    EXPERIENCE_MULTIPLIER_CHANGED = 'experience_multiplier_changed'
}

/**
 * 経験値イベントデータ
 */
export type ExperienceEventData =
    | ExperienceGainedEventData
    | LevelUpEventData
    | StatGrowthEventData
    | MaxLevelReachedEventData
    | ExperienceMultiplierChangedEventData;

/**
 * 経験値獲得イベントデータ
 */
export interface ExperienceGainedEventData {
    amount: number;
    source: ExperienceSource;
    action: ExperienceAction;
    context: ExperienceContext;
}

/**
 * レベルアップイベントデータ
 */
export interface LevelUpEventData {
    result: LevelUpResult;
}

/**
 * 能力値成長イベントデータ
 */
export interface StatGrowthEventData {
    growth: StatGrowthResult;
    oldStats: UnitStats;
    newStats: UnitStats;
}

/**
 * 最大レベル到達イベントデータ
 */
export interface MaxLevelReachedEventData {
    characterId: string;
    maxLevel: number;
}

/**
 * 経験値倍率変更イベントデータ
 */
export interface ExperienceMultiplierChangedEventData {
    oldMultiplier: number;
    newMultiplier: number;
    reason: string;
}

/**
 * 経験値システム状態
 */
export interface ExperienceSystemState {
    isInitialized: boolean;
    experienceTableLoaded: boolean;
    growthRatesLoaded: boolean;
    activeCharacters: Set<string>;
    pendingLevelUps: Map<string, LevelUpResult[]>;
    experienceMultiplier: number;
    config: ExperienceSystemConfig;
}

/**
 * 経験値計算結果
 */
export interface ExperienceCalculationResult {
    baseAmount: number;
    multipliedAmount: number;
    bonusAmount: number;
    finalAmount: number;
    source: ExperienceSource;
    action: ExperienceAction;
    context: ExperienceContext;
}

/**
 * レベルアップ予測結果
 */
export interface LevelUpPrediction {
    characterId: string;
    currentLevel: number;
    predictedLevel: number;
    experienceNeeded: number;
    canLevelUp: boolean;
    predictedStatGrowth: StatGrowthResult;
}

/**
 * 経験値統計情報
 */
export interface ExperienceStatistics {
    totalExperienceGained: number;
    experienceBySource: Record<ExperienceSource, number>;
    experienceByAction: Record<ExperienceAction, number>;
    totalLevelUps: number;
    averageStatGrowth: StatGrowthResult;
    sessionStartTime: number;
    sessionDuration: number;
}

// ===== データ永続化関連の型定義 =====

/**
 * 経験値永続化結果
 */
export interface ExperiencePersistenceResult<T> {
    success: boolean;
    data?: T;
    error?: ExperiencePersistenceError;
    message?: string;
    details?: any;
}

/**
 * 経験値復旧オプション
 */
export interface ExperienceRecoveryOptions {
    useBackup: boolean;
    useSaveDataRecovery: boolean;
    resetCorruptedData: boolean;
    useDefaultValues: boolean;
    preserveProgress: boolean;
    attemptPartialRecovery: boolean;
    notifyUser: boolean;
}

/**
 * 新規キャラクター経験値設定
 */
export interface NewCharacterExperienceSettings {
    characterId: string;
    initialLevel: number;
    initialExperience: number;
    baseGrowthRates?: GrowthRates;
    joinChapter: string;
    joinStage: number;
    isTemporary?: boolean;
}

/**
 * 経験値バックアップデータ
 */
export interface ExperienceBackupData {
    characterId: string;
    experienceInfo: ExperienceInfo;
    timestamp: number;
    source: string;
}

/**
 * 経験値永続化設定
 */
export interface ExperiencePersistenceConfig {
    autoSaveInterval: number;
    backupRetentionCount: number;
    enableAutoBackup: boolean;
    validateOnLoad: boolean;
    recoverFromBackup: boolean;
    logPersistenceOperations: boolean;
}