/**
 * セーブデータ関連の型定義
 * 
 * このファイルには、ゲームの進行状況を保存・復元するための
 * 全ての型定義とインターフェースが含まれています。
 * 
 * 主な機能:
 * - キャラクター経験値・レベル情報の永続化
 * - 章進行状況の管理
 * - セーブデータの整合性チェック
 * - エラー回復処理
 * 
 * @version 1.0.0
 * @author Trail of Thorns Development Team
 */

/**
 * セーブデータのバージョン情報
 */
export interface SaveDataVersion {
    major: number;
    minor: number;
    patch: number;
}

/**
 * キャラクター経験値セーブデータ
 */
export interface CharacterExperienceSaveData {
    characterId: string;
    currentLevel: number;
    currentExperience: number;
    totalExperience: number;
    lastLevelUpTimestamp?: number;
    customGrowthRates?: Record<string, number>;
}

/**
 * 章進行状況セーブデータ
 */
export interface ChapterProgressSaveData {
    chapterId: string;
    currentStage: number;
    completedStages: number[];
    isCompleted: boolean;
    startTimestamp: number;
    completionTimestamp?: number;
    totalPlayTime: number;
}

/**
 * 仲間キャラクター情報セーブデータ
 */
export interface RecruitedCharacterSaveData {
    characterId: string;
    recruitmentTimestamp: number;
    recruitmentChapter: string;
    recruitmentStage: number;
    isActive: boolean;
    customName?: string;
}

/**
 * ゲーム設定セーブデータ
 */
export interface GameSettingsSaveData {
    experienceMultiplier: number;
    autoLevelUp: boolean;
    showExperiencePopups: boolean;
    experienceAnimationSpeed: number;
    levelUpAnimationDuration: number;
    lastModified: number;
}

/**
 * メインセーブデータ構造
 */
export interface GameSaveData {
    version: SaveDataVersion;
    saveId: string;
    playerName: string;
    createdAt: number;
    lastSavedAt: number;
    totalPlayTime: number;

    // 経験値・レベル情報
    characterExperience: Record<string, CharacterExperienceSaveData>;

    // 章・ステージ進行状況
    chapterProgress: Record<string, ChapterProgressSaveData>;
    currentChapter: string;
    currentStage: number;

    // 仲間キャラクター情報
    recruitedCharacters: Record<string, RecruitedCharacterSaveData>;
    activeParty: string[]; // 最大6人のキャラクターID

    // ゲーム設定
    gameSettings: GameSettingsSaveData;

    // 職業システム情報
    jobSystem?: {
        characterJobs: Record<string, any>;
        roseEssenceData: any;
        roseEssenceTransactions: any[];
    };

    // ボス戦・勝利条件システム情報
    victoryConditionSystem?: {
        stageClearData: Record<string, any>;
        roseEssenceData: any;
        rewardHistory: any[];
        previousStageStates: any[];
    };

    // 統計情報
    statistics: {
        totalBattles: number;
        totalVictories: number;
        totalExperienceGained: number;
        totalLevelUps: number;
        charactersRecruited: number;
        charactersLost: number;
    };

    // データ整合性チェック用
    checksum: string;
}

/**
 * セーブデータエラーの種類
 */
export enum SaveDataError {
    SAVE_FAILED = 'save_failed',
    LOAD_FAILED = 'load_failed',
    DATA_CORRUPTED = 'data_corrupted',
    VERSION_MISMATCH = 'version_mismatch',
    CHECKSUM_INVALID = 'checksum_invalid',
    STORAGE_FULL = 'storage_full',
    PERMISSION_DENIED = 'permission_denied',
    CHARACTER_DATA_INVALID = 'character_data_invalid',
    CHAPTER_DATA_INVALID = 'chapter_data_invalid'
}

/**
 * セーブデータ操作結果
 */
export interface SaveDataResult<T = any> {
    success: boolean;
    data?: T;
    error?: SaveDataError;
    message?: string;
    details?: any;
}

/**
 * セーブデータ検証結果
 */
export interface SaveDataValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    fixedIssues: string[];
    corruptedData: string[];
}

/**
 * セーブデータ復旧オプション
 */
export interface SaveDataRecoveryOptions {
    useBackup: boolean;
    resetCorruptedData: boolean;
    useDefaultValues: boolean;
    preserveProgress: boolean;
    notifyUser: boolean;
}

/**
 * セーブデータ統計情報
 */
export interface SaveDataStatistics {
    totalSaveSize: number;
    characterDataSize: number;
    chapterDataSize: number;
    lastBackupTime: number;
    saveCount: number;
    loadCount: number;
    corruptionCount: number;
    recoveryCount: number;
}

/**
 * 新規仲間キャラクター初期設定
 */
export interface NewCharacterInitialSettings {
    characterId: string;
    initialLevel: number;
    initialExperience: number;
    baseGrowthRates: Record<string, number>;
    joinChapter: string;
    joinStage: number;
    isTemporary: boolean;
}

/**
 * セーブデータ設定
 */
export interface SaveDataConfig {
    maxSaveSlots: number;
    autoSaveInterval: number; // milliseconds
    backupCount: number;
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
    checksumAlgorithm: 'md5' | 'sha256';
    storageType: 'localStorage' | 'indexedDB' | 'cloud';
}

/**
 * セーブスロット情報
 */
export interface SaveSlotInfo {
    slotId: number;
    isEmpty: boolean;
    saveData?: GameSaveData;
    previewData?: {
        playerName: string;
        currentChapter: string;
        currentStage: number;
        totalPlayTime: number;
        lastSavedAt: number;
        characterCount: number;
        completedChapters: number;
    };
}