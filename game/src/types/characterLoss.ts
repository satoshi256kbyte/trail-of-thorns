/**
 * Character Loss System type definitions for the SRPG
 * Contains all interfaces, enums, and types related to character loss mechanics
 */

import { Unit, Position } from './gameplay';

/**
 * Danger level enum for character warning system
 */
export enum DangerLevel {
    NONE = 'none',
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical',
}

/**
 * Loss cause type enum for categorizing different loss reasons
 */
export enum LossCauseType {
    BATTLE_DEFEAT = 'battle_defeat',
    CRITICAL_DAMAGE = 'critical_damage',
    STATUS_EFFECT = 'status_effect',
    ENVIRONMENTAL = 'environmental',
    SACRIFICE = 'sacrifice',
}

/**
 * Status effect types that can cause character loss
 */
export enum StatusEffectType {
    POISON = 'poison',
    BURN = 'burn',
    FREEZE = 'freeze',
    CURSE = 'curse',
    DRAIN = 'drain',
}

/**
 * Character loss error types for error handling
 */
export enum CharacterLossError {
    INVALID_CHARACTER = 'invalid_character',
    ALREADY_LOST = 'already_lost',
    CHAPTER_NOT_INITIALIZED = 'chapter_not_initialized',
    SAVE_DATA_CORRUPTED = 'save_data_corrupted',
    SYSTEM_ERROR = 'system_error',
    INVALID_LOSS_CAUSE = 'invalid_loss_cause',
    LOSS_PROCESSING_FAILED = 'loss_processing_failed',
    UI_UPDATE_FAILED = 'ui_update_failed',
}

/**
 * Loss cause information structure
 */
export interface LossCause {
    type: LossCauseType;
    sourceId?: string; // ID of the attacker or source
    sourceName?: string; // Name of the attacker or source
    damageAmount?: number; // Amount of damage that caused the loss
    statusType?: StatusEffectType; // Status effect that caused the loss
    description: string; // Human-readable description of the loss cause
    timestamp: number; // When the loss occurred
}

/**
 * Lost character information structure
 */
export interface LostCharacter {
    characterId: string;
    name: string;
    lostAt: number; // Timestamp when the character was lost
    turn: number; // Turn number when the character was lost
    cause: LossCause;
    level: number; // Character level at time of loss
    wasRecruited: boolean; // Whether this character was recruited from enemies
    position?: Position; // Position where the character was lost
}

/**
 * Loss record for detailed history tracking
 */
export interface LossRecord extends LostCharacter {
    chapterId: string; // Which chapter this loss occurred in
    stageId: string; // Which stage this loss occurred in
    recoverable: boolean; // Whether this loss can be undone (for debugging)
}

/**
 * Chapter loss summary for end-of-chapter display
 */
export interface ChapterLossSummary {
    chapterId: string;
    chapterName: string;
    totalCharacters: number; // Total characters that participated
    lostCharacters: LostCharacter[]; // Characters that were lost
    survivedCharacters: string[]; // IDs of characters that survived
    chapterDuration: number; // Duration of the chapter in milliseconds
    totalTurns: number; // Total number of turns in the chapter
    isPerfectClear: boolean; // Whether no characters were lost
    completedAt: number; // Timestamp when chapter was completed
}

/**
 * Chapter loss data for serialization/persistence
 */
export interface ChapterLossData {
    chapterId: string;
    lostCharacters: Record<string, LostCharacter>; // Map of character ID to lost character data
    lossHistory: LossRecord[]; // Complete history of losses in this chapter
    chapterStartTime: number; // When the chapter started
    version: string; // Data format version for compatibility
}

/**
 * Loss context for error handling and debugging
 */
export interface LossContext {
    characterId: string;
    chapterId?: string;
    stageId?: string;
    turn?: number;
    phase?: string; // Current game phase when loss occurred
    additionalData?: Record<string, any>; // Additional context data
}

/**
 * Character loss error details for comprehensive error reporting
 */
export interface CharacterLossErrorDetails {
    error: CharacterLossError;
    message: string;
    context: LossContext;
    timestamp: number;
    recoverable: boolean; // Whether the error can be recovered from
    suggestedAction?: string; // Suggested action for recovery
}

/**
 * Party validation result for party composition checking
 */
export interface PartyValidationResult {
    isValid: boolean;
    errors: PartyValidationError[];
    warnings: PartyValidationWarning[];
    availableCharacters: string[]; // IDs of available characters
    lostCharacters: LostCharacter[]; // Characters that are lost
    totalAvailable: number; // Total number of available characters
}

/**
 * Party validation error for invalid party compositions
 */
export interface PartyValidationError {
    type: 'lost_character' | 'insufficient_members' | 'invalid_character' | 'duplicate_character';
    characterId?: string;
    message: string;
    severity: 'error' | 'warning';
}

/**
 * Party validation warning for suboptimal party compositions
 */
export interface PartyValidationWarning {
    type: 'low_level' | 'unbalanced_party' | 'missing_role' | 'recommended_character';
    message: string;
    severity: 'low' | 'medium' | 'high';
    characterId?: string;
}

/**
 * Loss warning configuration for danger state warnings
 */
export interface LossWarningConfig {
    enableWarnings: boolean;
    criticalHPThreshold: number; // HP percentage for critical warning (default: 25)
    highDangerHPThreshold: number; // HP percentage for high danger warning (default: 50)
    mediumDangerHPThreshold: number; // HP percentage for medium danger warning (default: 75)
    showConfirmationDialog: boolean; // Whether to show confirmation dialogs
    warningDisplayDuration: number; // How long to show warnings in milliseconds
    enableSoundAlerts: boolean; // Whether to play sound alerts
}

/**
 * Loss animation configuration for visual effects
 */
export interface LossAnimationConfig {
    enableAnimations: boolean;
    blinkDuration: number; // Duration of blink effect in milliseconds
    fadeOutDuration: number; // Duration of fade out effect in milliseconds
    messageDisplayDuration: number; // Duration of loss message display in milliseconds
    particleEffectDuration: number; // Duration of particle effects in milliseconds
    enableScreenShake: boolean; // Whether to shake screen on character loss
    animationSpeed: number; // Speed multiplier for all animations
}

/**
 * Character loss statistics for tracking and analysis
 */
export interface CharacterLossStatistics {
    totalLosses: number;
    lossesByType: Record<LossCauseType, number>;
    lossesByChapter: Record<string, number>;
    averageLossesPerChapter: number;
    mostCommonLossCause: LossCauseType;
    perfectClearChapters: string[]; // Chapters completed without losses
    longestSurvivalStreak: number; // Longest streak without character loss
}

/**
 * Extended unit interface with loss-related properties
 */
export interface LossTrackingUnit extends Unit {
    dangerLevel: DangerLevel;
    isLost: boolean;
    lossData?: LostCharacter;
    warningDisplayed: boolean;
    lastDangerCheck: number; // Timestamp of last danger level check
}

/**
 * Type guards and validation functions for character loss system
 */
export class CharacterLossTypeValidators {
    /**
     * Validates loss cause structure
     */
    static isValidLossCause(cause: any): cause is LossCause {
        return (
            typeof cause === 'object' &&
            cause !== null &&
            Object.values(LossCauseType).includes(cause.type) &&
            typeof cause.description === 'string' &&
            typeof cause.timestamp === 'number' &&
            (cause.sourceId === undefined || typeof cause.sourceId === 'string') &&
            (cause.sourceName === undefined || typeof cause.sourceName === 'string') &&
            (cause.damageAmount === undefined ||
                (typeof cause.damageAmount === 'number' && cause.damageAmount >= 0)) &&
            (cause.statusType === undefined ||
                Object.values(StatusEffectType).includes(cause.statusType)) &&
            cause.timestamp > 0
        );
    }

    /**
     * Validates lost character structure
     */
    static isValidLostCharacter(lostChar: any): lostChar is LostCharacter {
        return (
            typeof lostChar === 'object' &&
            lostChar !== null &&
            typeof lostChar.characterId === 'string' &&
            typeof lostChar.name === 'string' &&
            typeof lostChar.lostAt === 'number' &&
            typeof lostChar.turn === 'number' &&
            typeof lostChar.level === 'number' &&
            typeof lostChar.wasRecruited === 'boolean' &&
            this.isValidLossCause(lostChar.cause) &&
            lostChar.characterId.length > 0 &&
            lostChar.name.length > 0 &&
            lostChar.lostAt > 0 &&
            lostChar.turn >= 1 &&
            lostChar.level >= 1 &&
            (lostChar.position === undefined ||
                (typeof lostChar.position === 'object' &&
                    typeof lostChar.position.x === 'number' &&
                    typeof lostChar.position.y === 'number'))
        );
    }

    /**
     * Validates loss record structure
     */
    static isValidLossRecord(record: any): record is LossRecord {
        return (
            this.isValidLostCharacter(record) &&
            typeof record.chapterId === 'string' &&
            typeof record.stageId === 'string' &&
            typeof record.recoverable === 'boolean' &&
            record.chapterId.length > 0 &&
            record.stageId.length > 0
        );
    }

    /**
     * Validates chapter loss summary structure
     */
    static isValidChapterLossSummary(summary: any): summary is ChapterLossSummary {
        return (
            typeof summary === 'object' &&
            summary !== null &&
            typeof summary.chapterId === 'string' &&
            typeof summary.chapterName === 'string' &&
            typeof summary.totalCharacters === 'number' &&
            Array.isArray(summary.lostCharacters) &&
            Array.isArray(summary.survivedCharacters) &&
            typeof summary.chapterDuration === 'number' &&
            typeof summary.totalTurns === 'number' &&
            typeof summary.isPerfectClear === 'boolean' &&
            typeof summary.completedAt === 'number' &&
            summary.chapterId.length > 0 &&
            summary.chapterName.length > 0 &&
            summary.totalCharacters >= 0 &&
            summary.chapterDuration >= 0 &&
            summary.totalTurns >= 0 &&
            summary.completedAt > 0 &&
            summary.lostCharacters.every((char: any) => this.isValidLostCharacter(char)) &&
            summary.survivedCharacters.every((id: any) => typeof id === 'string' && id.length > 0) &&
            summary.isPerfectClear === (summary.lostCharacters.length === 0)
        );
    }

    /**
     * Validates chapter loss data structure
     */
    static isValidChapterLossData(data: any): data is ChapterLossData {
        return (
            typeof data === 'object' &&
            data !== null &&
            typeof data.chapterId === 'string' &&
            typeof data.lostCharacters === 'object' &&
            Array.isArray(data.lossHistory) &&
            typeof data.chapterStartTime === 'number' &&
            typeof data.version === 'string' &&
            data.chapterId.length > 0 &&
            data.chapterStartTime > 0 &&
            data.version.length > 0 &&
            data.lossHistory.every((record: any) => this.isValidLossRecord(record)) &&
            Object.values(data.lostCharacters).every((char: any) => this.isValidLostCharacter(char))
        );
    }

    /**
     * Validates party validation result structure
     */
    static isValidPartyValidationResult(result: any): result is PartyValidationResult {
        return (
            typeof result === 'object' &&
            result !== null &&
            typeof result.isValid === 'boolean' &&
            Array.isArray(result.errors) &&
            Array.isArray(result.warnings) &&
            Array.isArray(result.availableCharacters) &&
            Array.isArray(result.lostCharacters) &&
            typeof result.totalAvailable === 'number' &&
            result.totalAvailable >= 0 &&
            result.errors.every((error: any) => this.isValidPartyValidationError(error)) &&
            result.warnings.every((warning: any) => this.isValidPartyValidationWarning(warning)) &&
            result.availableCharacters.every((id: any) => typeof id === 'string' && id.length > 0) &&
            result.lostCharacters.every((char: any) => this.isValidLostCharacter(char))
        );
    }

    /**
     * Validates party validation error structure
     */
    static isValidPartyValidationError(error: any): error is PartyValidationError {
        const validTypes = [
            'lost_character',
            'insufficient_members',
            'invalid_character',
            'duplicate_character',
        ];
        const validSeverities = ['error', 'warning'];
        return (
            typeof error === 'object' &&
            error !== null &&
            validTypes.includes(error.type) &&
            typeof error.message === 'string' &&
            validSeverities.includes(error.severity) &&
            error.message.length > 0 &&
            (error.characterId === undefined ||
                (typeof error.characterId === 'string' && error.characterId.length > 0))
        );
    }

    /**
     * Validates party validation warning structure
     */
    static isValidPartyValidationWarning(warning: any): warning is PartyValidationWarning {
        const validTypes = ['low_level', 'unbalanced_party', 'missing_role', 'recommended_character'];
        const validSeverities = ['low', 'medium', 'high'];
        return (
            typeof warning === 'object' &&
            warning !== null &&
            validTypes.includes(warning.type) &&
            typeof warning.message === 'string' &&
            validSeverities.includes(warning.severity) &&
            warning.message.length > 0 &&
            (warning.characterId === undefined ||
                (typeof warning.characterId === 'string' && warning.characterId.length > 0))
        );
    }

    /**
     * Validates danger level enum value
     */
    static isValidDangerLevel(level: any): level is DangerLevel {
        return Object.values(DangerLevel).includes(level);
    }

    /**
     * Validates loss cause type enum value
     */
    static isValidLossCauseType(type: any): type is LossCauseType {
        return Object.values(LossCauseType).includes(type);
    }

    /**
     * Validates status effect type enum value
     */
    static isValidStatusEffectType(type: any): type is StatusEffectType {
        return Object.values(StatusEffectType).includes(type);
    }
}

/**
 * Utility functions for character loss system
 */
export class CharacterLossUtils {
    /**
     * Calculate danger level based on current HP percentage
     */
    static calculateDangerLevel(currentHP: number, maxHP: number): DangerLevel {
        if (currentHP <= 0) return DangerLevel.CRITICAL;

        const hpPercentage = (currentHP / maxHP) * 100;

        if (hpPercentage <= 25) return DangerLevel.CRITICAL;
        if (hpPercentage <= 50) return DangerLevel.HIGH;
        if (hpPercentage <= 75) return DangerLevel.MEDIUM;
        if (hpPercentage <= 90) return DangerLevel.LOW;

        return DangerLevel.NONE;
    }

    /**
     * Create a loss cause from battle defeat
     */
    static createBattleDefeatCause(
        attackerId: string,
        attackerName: string,
        damage: number
    ): LossCause {
        return {
            type: LossCauseType.BATTLE_DEFEAT,
            sourceId: attackerId,
            sourceName: attackerName,
            damageAmount: damage,
            description: `${attackerName}の攻撃により撃破`,
            timestamp: Date.now(),
        };
    }

    /**
     * Create a loss cause from status effect
     */
    static createStatusEffectCause(statusType: StatusEffectType, damage: number): LossCause {
        const statusNames: Record<StatusEffectType, string> = {
            [StatusEffectType.POISON]: '毒',
            [StatusEffectType.BURN]: '火傷',
            [StatusEffectType.FREEZE]: '凍結',
            [StatusEffectType.CURSE]: '呪い',
            [StatusEffectType.DRAIN]: '吸収',
        };

        return {
            type: LossCauseType.STATUS_EFFECT,
            statusType: statusType,
            damageAmount: damage,
            description: `${statusNames[statusType]}により撃破`,
            timestamp: Date.now(),
        };
    }

    /**
     * Create a loss cause from critical damage
     */
    static createCriticalDamageCause(
        attackerId: string,
        attackerName: string,
        damage: number
    ): LossCause {
        return {
            type: LossCauseType.CRITICAL_DAMAGE,
            sourceId: attackerId,
            sourceName: attackerName,
            damageAmount: damage,
            description: `${attackerName}のクリティカル攻撃により撃破`,
            timestamp: Date.now(),
        };
    }

    /**
     * Generate a unique loss record ID
     */
    static generateLossRecordId(characterId: string, chapterId: string, timestamp: number): string {
        return `loss_${characterId}_${chapterId}_${timestamp}`;
    }

    /**
     * Format loss cause for display
     */
    static formatLossCauseDescription(cause: LossCause): string {
        switch (cause.type) {
            case LossCauseType.BATTLE_DEFEAT:
                return cause.sourceName ? `${cause.sourceName}の攻撃により撃破` : '戦闘により撃破';
            case LossCauseType.CRITICAL_DAMAGE:
                return cause.sourceName
                    ? `${cause.sourceName}のクリティカル攻撃により撃破`
                    : 'クリティカル攻撃により撃破';
            case LossCauseType.STATUS_EFFECT:
                return cause.statusType
                    ? `状態異常（${cause.statusType}）により撃破`
                    : '状態異常により撃破';
            case LossCauseType.ENVIRONMENTAL:
                return '環境ダメージにより撃破';
            case LossCauseType.SACRIFICE:
                return '自己犠牲により撃破';
            default:
                return cause.description || '不明な原因により撃破';
        }
    }

    /**
     * Calculate chapter completion statistics
     */
    static calculateChapterStats(summary: ChapterLossSummary): {
        survivalRate: number;
        averageTurnDuration: number;
        lossRate: number;
    } {
        const survivalRate =
            summary.totalCharacters > 0
                ? ((summary.totalCharacters - summary.lostCharacters.length) / summary.totalCharacters) *
                100
                : 100;

        const averageTurnDuration =
            summary.totalTurns > 0 ? summary.chapterDuration / summary.totalTurns : 0;

        const lossRate =
            summary.totalCharacters > 0
                ? (summary.lostCharacters.length / summary.totalCharacters) * 100
                : 0;

        return {
            survivalRate: Math.round(survivalRate * 100) / 100,
            averageTurnDuration: Math.round(averageTurnDuration),
            lossRate: Math.round(lossRate * 100) / 100,
        };
    }

    /**
     * Deep clone a lost character object
     */
    static cloneLostCharacter(lostChar: LostCharacter): LostCharacter {
        return {
            ...lostChar,
            cause: { ...lostChar.cause },
            position: lostChar.position ? { ...lostChar.position } : undefined,
        };
    }

    /**
     * Deep clone a chapter loss summary
     */
    static cloneChapterLossSummary(summary: ChapterLossSummary): ChapterLossSummary {
        return {
            ...summary,
            lostCharacters: summary.lostCharacters.map(char => this.cloneLostCharacter(char)),
            survivedCharacters: [...summary.survivedCharacters],
        };
    }

    /**
     * Serialize chapter loss data for persistence
     */
    static serializeChapterLossData(data: ChapterLossData): string {
        try {
            // Convert Map to plain object for JSON serialization
            const serializable = {
                ...data,
                lostCharacters: data.lostCharacters,
            };
            return JSON.stringify(serializable);
        } catch (error) {
            throw new Error(`Failed to serialize chapter loss data: ${error}`);
        }
    }

    /**
     * Deserialize chapter loss data from persistence
     */
    static deserializeChapterLossData(serializedData: string): ChapterLossData {
        try {
            const parsed = JSON.parse(serializedData);

            // Validate the deserialized data
            if (!CharacterLossTypeValidators.isValidChapterLossData(parsed)) {
                throw new Error('Invalid chapter loss data format');
            }

            return parsed;
        } catch (error) {
            throw new Error(`Failed to deserialize chapter loss data: ${error}`);
        }
    }

    /**
     * Create default chapter loss data for a new chapter
     */
    static createDefaultChapterLossData(chapterId: string): ChapterLossData {
        return {
            chapterId,
            lostCharacters: {},
            lossHistory: [],
            chapterStartTime: Date.now(),
            version: '1.0.0',
        };
    }

    /**
     * Merge chapter loss data (useful for loading saved data)
     */
    static mergeChapterLossData(
        base: ChapterLossData,
        update: Partial<ChapterLossData>
    ): ChapterLossData {
        return {
            ...base,
            ...update,
            lostCharacters: {
                ...base.lostCharacters,
                ...(update.lostCharacters || {}),
            },
            lossHistory: [...base.lossHistory, ...(update.lossHistory || [])],
        };
    }

    /**
     * Validate and sanitize chapter loss data
     */
    static sanitizeChapterLossData(data: any): ChapterLossData {
        // Check if data has basic structure
        if (!data || typeof data !== 'object' || !data.chapterId) {
            return this.createDefaultChapterLossData(data?.chapterId || 'unknown');
        }

        // Start with basic structure
        const sanitized: ChapterLossData = {
            chapterId: data.chapterId,
            lostCharacters: {},
            lossHistory: [],
            chapterStartTime:
                typeof data.chapterStartTime === 'number' ? data.chapterStartTime : Date.now(),
            version: typeof data.version === 'string' ? data.version : '1.0.0',
        };

        // Sanitize lost characters
        if (data.lostCharacters && typeof data.lostCharacters === 'object') {
            Object.entries(data.lostCharacters).forEach(([id, char]) => {
                if (CharacterLossTypeValidators.isValidLostCharacter(char)) {
                    sanitized.lostCharacters[id] = char as LostCharacter;
                }
            });
        }

        // Sanitize loss history
        if (Array.isArray(data.lossHistory)) {
            sanitized.lossHistory = data.lossHistory.filter((record: any) =>
                CharacterLossTypeValidators.isValidLossRecord(record)
            );
        }

        return sanitized;
    }

    /**
     * Create a loss cause from skill defeat
     */
    static createSkillDefeatCause(
        casterId: string,
        casterName: string,
        skillId: string,
        damage: number
    ): LossCause {
        return {
            type: LossCauseType.BATTLE_DEFEAT,
            sourceId: casterId,
            sourceName: casterName,
            damageAmount: damage,
            description: `${casterName}のスキル「${skillId}」により撃破`,
            timestamp: Date.now(),
        };
    }
}
