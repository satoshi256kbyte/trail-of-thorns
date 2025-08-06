/**
 * RecruitmentDataManager - Handles data persistence and save/load functionality for recruitment system
 * 
 * This class manages:
 * - Saving and loading recruitment information
 * - Chapter progression and recruited character availability
 * - Data integrity checks and error recovery
 * - Save data version compatibility
 */

import {
    RecruitableCharacter,
    RecruitmentStatus,
    NPCState,
    RecruitmentError,
    RecruitmentSystemConfig,
    RecruitmentStatistics,
    RecruitmentTypeValidators
} from '../types/recruitment';
import { Unit, GameplayError, GameplayErrorResult } from '../types/gameplay';

/**
 * Version information for save data compatibility
 */
export interface SaveDataVersion {
    major: number;
    minor: number;
    patch: number;
    format: string; // e.g., "recruitment-v1"
}

/**
 * Recruited character information for save data
 */
export interface RecruitedCharacterSaveData {
    characterId: string;
    recruitedAt: number; // timestamp
    recruitedInChapter: string;
    recruitedInStage: string;
    originalStats: any; // Original character stats when recruited
    currentStats: any; // Current character stats (may have grown)
    equipment: any; // Current equipment
    experience: number;
    level: number;
    isAvailable: boolean; // Whether character is available for current chapter
    recruitmentConditions: any[]; // Original conditions that were met
}

/**
 * Chapter progression data
 */
export interface ChapterProgressData {
    chapterId: string;
    currentStage: string;
    completedStages: string[];
    availableCharacters: string[]; // IDs of characters available in this chapter
    lostCharacters: string[]; // IDs of characters lost in this chapter
    recruitedInChapter: string[]; // IDs of characters recruited in this chapter
    chapterStartTime: number;
    lastSaveTime: number;
}

/**
 * Complete recruitment save data structure
 */
export interface RecruitmentSaveData {
    version: SaveDataVersion;
    playerId: string;
    gameId: string;
    createdAt: number;
    lastModified: number;

    // Recruitment data
    recruitedCharacters: RecruitedCharacterSaveData[];
    recruitmentStatistics: RecruitmentStatistics;

    // Chapter progression
    currentChapter: string;
    chapterProgress: Record<string, ChapterProgressData>;

    // System configuration
    systemConfig: RecruitmentSystemConfig;

    // Data integrity
    checksum: string;
    backupData?: Partial<RecruitmentSaveData>; // Backup for recovery
}

/**
 * Save operation result
 */
export interface SaveOperationResult {
    success: boolean;
    error?: RecruitmentError;
    message?: string;
    savedAt?: number;
    dataSize?: number;
}

/**
 * Load operation result
 */
export interface LoadOperationResult {
    success: boolean;
    error?: RecruitmentError;
    message?: string;
    data?: RecruitmentSaveData;
    migrated?: boolean; // Whether data was migrated from older version
    recovered?: boolean; // Whether data was recovered from backup
}

/**
 * Data integrity check result
 */
export interface IntegrityCheckResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    corruptedSections: string[];
    recoverable: boolean;
}

export class RecruitmentDataManager {
    private static readonly CURRENT_VERSION: SaveDataVersion = {
        major: 1,
        minor: 0,
        patch: 0,
        format: "recruitment-v1"
    };

    private static readonly STORAGE_KEY = 'srpg_recruitment_data';
    private static readonly BACKUP_KEY = 'srpg_recruitment_backup';
    private static readonly MAX_BACKUP_COUNT = 3;

    private eventEmitter?: Phaser.Events.EventEmitter;
    private currentSaveData: RecruitmentSaveData | null = null;

    constructor(eventEmitter?: Phaser.Events.EventEmitter) {
        this.eventEmitter = eventEmitter;
    }

    /**
     * Save recruitment data to persistent storage
     * 
     * @param recruitedCharacters Currently recruited characters
     * @param chapterProgress Current chapter progression data
     * @param statistics Recruitment statistics
     * @param config System configuration
     * @returns Save operation result
     */
    async saveRecruitmentData(
        recruitedCharacters: RecruitedCharacterSaveData[],
        chapterProgress: Record<string, ChapterProgressData>,
        statistics: RecruitmentStatistics,
        config: RecruitmentSystemConfig,
        currentChapter: string,
        playerId: string = 'default',
        gameId: string = 'default'
    ): Promise<SaveOperationResult> {
        try {
            // Create save data structure
            const saveData: RecruitmentSaveData = {
                version: { ...RecruitmentDataManager.CURRENT_VERSION },
                playerId,
                gameId,
                createdAt: this.currentSaveData?.createdAt || Date.now(),
                lastModified: Date.now(),
                recruitedCharacters: this.sanitizeRecruitedCharacters(recruitedCharacters),
                recruitmentStatistics: this.sanitizeStatistics(statistics),
                currentChapter,
                chapterProgress: this.sanitizeChapterProgress(chapterProgress),
                systemConfig: this.sanitizeConfig(config),
                checksum: '',
                backupData: this.createBackupData()
            };

            // Generate checksum for data integrity
            saveData.checksum = this.generateChecksum(saveData);

            // Validate save data before saving
            const validationResult = this.validateSaveData(saveData);
            if (!validationResult.isValid) {
                return {
                    success: false,
                    error: RecruitmentError.DATA_CORRUPTION,
                    message: `Save data validation failed: ${validationResult.errors.join(', ')}`
                };
            }

            // Create backup of current data
            await this.createBackup();

            // Save to storage
            const serializedData = JSON.stringify(saveData);
            localStorage.setItem(RecruitmentDataManager.STORAGE_KEY, serializedData);

            // Update current save data reference
            this.currentSaveData = saveData;

            // Emit save completed event
            this.eventEmitter?.emit('recruitment-data-saved', {
                success: true,
                dataSize: serializedData.length,
                savedAt: saveData.lastModified
            });

            return {
                success: true,
                savedAt: saveData.lastModified,
                dataSize: serializedData.length,
                message: 'Recruitment data saved successfully'
            };

        } catch (error) {
            console.error('Error saving recruitment data:', error);

            this.eventEmitter?.emit('recruitment-save-error', {
                error: error instanceof Error ? error.message : String(error)
            });

            return {
                success: false,
                error: RecruitmentError.SYSTEM_ERROR,
                message: 'Failed to save recruitment data'
            };
        }
    }

    /**
     * Load recruitment data from persistent storage
     * 
     * @returns Load operation result with data
     */
    async loadRecruitmentData(): Promise<LoadOperationResult> {
        try {
            // Try to load from primary storage
            const savedData = localStorage.getItem(RecruitmentDataManager.STORAGE_KEY);

            if (!savedData) {
                // No save data exists - return empty result
                return {
                    success: true,
                    message: 'No save data found - starting fresh',
                    data: this.createEmptySaveData()
                };
            }

            // Parse saved data
            let parsedData: RecruitmentSaveData;
            try {
                parsedData = JSON.parse(savedData);
            } catch (parseError) {
                console.warn('Failed to parse save data, attempting recovery from backup');
                return await this.recoverFromBackup();
            }

            // Validate data integrity
            const integrityResult = this.checkDataIntegrity(parsedData);
            if (!integrityResult.isValid) {
                console.warn('Save data integrity check failed:', integrityResult.errors);

                if (!integrityResult.recoverable) {
                    return await this.recoverFromBackup();
                }

                // Attempt to repair data
                parsedData = this.repairSaveData(parsedData, integrityResult);
            }

            // Check version compatibility and migrate if needed
            const migrationResult = await this.migrateDataIfNeeded(parsedData);
            if (migrationResult.migrated) {
                parsedData = migrationResult.data!;
            }

            // Final validation after migration
            const finalValidation = this.validateSaveData(parsedData);
            if (!finalValidation.isValid) {
                return {
                    success: false,
                    error: RecruitmentError.DATA_CORRUPTION,
                    message: `Save data is corrupted and cannot be recovered: ${finalValidation.errors.join(', ')}`
                };
            }

            // Update current save data reference
            this.currentSaveData = parsedData;

            // Emit load completed event
            this.eventEmitter?.emit('recruitment-data-loaded', {
                success: true,
                dataSize: savedData.length,
                migrated: migrationResult.migrated,
                recovered: integrityResult.recoverable && !integrityResult.isValid
            });

            return {
                success: true,
                data: parsedData,
                migrated: migrationResult.migrated,
                recovered: integrityResult.recoverable && !integrityResult.isValid,
                message: 'Recruitment data loaded successfully'
            };

        } catch (error) {
            console.error('Error loading recruitment data:', error);

            this.eventEmitter?.emit('recruitment-load-error', {
                error: error instanceof Error ? error.message : String(error)
            });

            // Attempt recovery from backup as last resort
            return await this.recoverFromBackup();
        }
    }

    /**
     * Get recruited characters available for a specific chapter
     * 
     * @param chapterId Chapter ID to check
     * @returns Array of available recruited characters
     */
    getAvailableRecruitedCharacters(chapterId: string): RecruitedCharacterSaveData[] {
        if (!this.currentSaveData) {
            return [];
        }

        const chapterProgress = this.currentSaveData.chapterProgress[chapterId];
        if (!chapterProgress) {
            return [];
        }

        return this.currentSaveData.recruitedCharacters.filter(character =>
            character.isAvailable &&
            chapterProgress.availableCharacters.includes(character.characterId) &&
            !chapterProgress.lostCharacters.includes(character.characterId)
        );
    }

    /**
     * Update chapter progression and character availability
     * 
     * @param chapterId Chapter ID
     * @param progressData Updated chapter progress data
     * @returns Operation result
     */
    async updateChapterProgress(
        chapterId: string,
        progressData: Partial<ChapterProgressData>
    ): Promise<GameplayErrorResult> {
        try {
            if (!this.currentSaveData) {
                return {
                    success: false,
                    error: GameplayError.INVALID_STAGE_DATA,
                    message: 'No save data loaded'
                };
            }

            // Get existing chapter progress or create new
            const existingProgress = this.currentSaveData.chapterProgress[chapterId] || {
                chapterId,
                currentStage: '',
                completedStages: [],
                availableCharacters: [],
                lostCharacters: [],
                recruitedInChapter: [],
                chapterStartTime: Date.now(),
                lastSaveTime: Date.now()
            };

            // Update progress data
            const updatedProgress: ChapterProgressData = {
                ...existingProgress,
                ...progressData,
                lastSaveTime: Date.now()
            };

            // Update in save data
            this.currentSaveData.chapterProgress[chapterId] = updatedProgress;
            this.currentSaveData.currentChapter = chapterId;
            this.currentSaveData.lastModified = Date.now();

            // Update character availability based on chapter progression
            this.updateCharacterAvailability(chapterId, updatedProgress);

            // Save updated data
            const saveResult = await this.saveCurrentData();
            if (!saveResult.success) {
                return {
                    success: false,
                    error: GameplayError.INVALID_STAGE_DATA,
                    message: 'Failed to save chapter progress'
                };
            }

            return { success: true };

        } catch (error) {
            console.error('Error updating chapter progress:', error);
            return {
                success: false,
                error: GameplayError.INVALID_STAGE_DATA,
                message: 'Failed to update chapter progress'
            };
        }
    }

    /**
     * Mark a character as lost in the current chapter
     * 
     * @param characterId Character ID
     * @param chapterId Chapter ID
     * @returns Operation result
     */
    async markCharacterLost(characterId: string, chapterId: string): Promise<GameplayErrorResult> {
        try {
            if (!this.currentSaveData) {
                return {
                    success: false,
                    error: GameplayError.UNIT_NOT_FOUND,
                    message: 'No save data loaded'
                };
            }

            const chapterProgress = this.currentSaveData.chapterProgress[chapterId];
            if (!chapterProgress) {
                return {
                    success: false,
                    error: GameplayError.INVALID_STAGE_DATA,
                    message: 'Chapter progress not found'
                };
            }

            // Add to lost characters if not already there
            if (!chapterProgress.lostCharacters.includes(characterId)) {
                chapterProgress.lostCharacters.push(characterId);
            }

            // Remove from available characters
            chapterProgress.availableCharacters = chapterProgress.availableCharacters.filter(
                id => id !== characterId
            );

            // Update character availability
            const character = this.currentSaveData.recruitedCharacters.find(
                c => c.characterId === characterId
            );
            if (character) {
                character.isAvailable = false;
            }

            // Save updated data
            const saveResult = await this.saveCurrentData();
            if (!saveResult.success) {
                return {
                    success: false,
                    error: GameplayError.INVALID_STAGE_DATA,
                    message: 'Failed to save character loss data'
                };
            }

            // Emit character lost event
            this.eventEmitter?.emit('recruited-character-lost', {
                characterId,
                chapterId
            });

            return { success: true };

        } catch (error) {
            console.error('Error marking character as lost:', error);
            return {
                success: false,
                error: GameplayError.SYSTEM_ERROR,
                message: 'Failed to mark character as lost'
            };
        }
    }

    /**
     * Reset character loss status at chapter completion
     * 
     * @param chapterId Completed chapter ID
     * @returns Operation result
     */
    async resetChapterLossStatus(chapterId: string): Promise<GameplayErrorResult> {
        try {
            if (!this.currentSaveData) {
                return {
                    success: false,
                    error: GameplayError.INVALID_STAGE_DATA,
                    message: 'No save data loaded'
                };
            }

            const chapterProgress = this.currentSaveData.chapterProgress[chapterId];
            if (!chapterProgress) {
                return { success: true }; // No progress to reset
            }

            // Reset lost characters for completed chapter
            const lostCharacterIds = [...chapterProgress.lostCharacters];
            chapterProgress.lostCharacters = [];

            // Restore availability for previously lost characters
            for (const characterId of lostCharacterIds) {
                const character = this.currentSaveData.recruitedCharacters.find(
                    c => c.characterId === characterId
                );
                if (character) {
                    character.isAvailable = true;

                    // Add back to available characters for next chapter
                    if (!chapterProgress.availableCharacters.includes(characterId)) {
                        chapterProgress.availableCharacters.push(characterId);
                    }
                }
            }

            // Save updated data
            const saveResult = await this.saveCurrentData();
            if (!saveResult.success) {
                return {
                    success: false,
                    error: GameplayError.INVALID_STAGE_DATA,
                    message: 'Failed to save chapter completion data'
                };
            }

            // Emit chapter completed event
            this.eventEmitter?.emit('chapter-loss-status-reset', {
                chapterId,
                restoredCharacters: lostCharacterIds
            });

            return { success: true };

        } catch (error) {
            console.error('Error resetting chapter loss status:', error);
            return {
                success: false,
                error: GameplayError.SYSTEM_ERROR,
                message: 'Failed to reset chapter loss status'
            };
        }
    }

    /**
     * Add a newly recruited character to save data
     * 
     * @param character Recruited character data
     * @param chapterId Chapter where recruited
     * @param stageId Stage where recruited
     * @returns Operation result
     */
    async addRecruitedCharacter(
        character: Unit,
        chapterId: string,
        stageId: string,
        recruitmentConditions: any[] = []
    ): Promise<GameplayErrorResult> {
        try {
            if (!this.currentSaveData) {
                return {
                    success: false,
                    error: GameplayError.INVALID_STAGE_DATA,
                    message: 'No save data loaded'
                };
            }

            // Check if character is already recruited
            const existingCharacter = this.currentSaveData.recruitedCharacters.find(
                c => c.characterId === character.id
            );

            if (existingCharacter) {
                return {
                    success: false,
                    error: GameplayError.INVALID_ACTION,
                    message: 'Character is already recruited'
                };
            }

            // Create recruited character save data
            const recruitedCharacterData: RecruitedCharacterSaveData = {
                characterId: character.id,
                recruitedAt: Date.now(),
                recruitedInChapter: chapterId,
                recruitedInStage: stageId,
                originalStats: { ...character.stats },
                currentStats: { ...character.stats },
                equipment: character.equipment ? { ...character.equipment } : {},
                experience: 0,
                level: 1,
                isAvailable: true,
                recruitmentConditions: [...recruitmentConditions]
            };

            // Add to recruited characters
            this.currentSaveData.recruitedCharacters.push(recruitedCharacterData);

            // Update chapter progress
            const chapterProgress = this.currentSaveData.chapterProgress[chapterId];
            if (chapterProgress) {
                if (!chapterProgress.recruitedInChapter.includes(character.id)) {
                    chapterProgress.recruitedInChapter.push(character.id);
                }
                if (!chapterProgress.availableCharacters.includes(character.id)) {
                    chapterProgress.availableCharacters.push(character.id);
                }
            }

            // Update statistics
            this.currentSaveData.recruitmentStatistics.successfulRecruitments++;
            this.currentSaveData.recruitmentStatistics.totalAttempts++;

            // Save updated data
            const saveResult = await this.saveCurrentData();
            if (!saveResult.success) {
                return {
                    success: false,
                    error: GameplayError.INVALID_STAGE_DATA,
                    message: 'Failed to save recruited character data'
                };
            }

            // Emit character recruited event
            this.eventEmitter?.emit('character-recruited-saved', {
                characterId: character.id,
                chapterId,
                stageId
            });

            return { success: true };

        } catch (error) {
            console.error('Error adding recruited character:', error);
            return {
                success: false,
                error: GameplayError.SYSTEM_ERROR,
                message: 'Failed to add recruited character'
            };
        }
    }

    /**
     * Get current save data (read-only)
     * 
     * @returns Current save data or null if not loaded
     */
    getCurrentSaveData(): Readonly<RecruitmentSaveData> | null {
        return this.currentSaveData ? JSON.parse(JSON.stringify(this.currentSaveData)) : null;
    }

    /**
     * Check if save data exists
     * 
     * @returns True if save data exists in storage
     */
    hasSaveData(): boolean {
        return localStorage.getItem(RecruitmentDataManager.STORAGE_KEY) !== null;
    }

    /**
     * Delete all save data (for new game or reset)
     * 
     * @returns Operation result
     */
    async deleteSaveData(): Promise<GameplayErrorResult> {
        try {
            // Remove from storage
            localStorage.removeItem(RecruitmentDataManager.STORAGE_KEY);
            localStorage.removeItem(RecruitmentDataManager.BACKUP_KEY);

            // Clear current data
            this.currentSaveData = null;

            // Emit data deleted event
            this.eventEmitter?.emit('recruitment-data-deleted');

            return { success: true };

        } catch (error) {
            console.error('Error deleting save data:', error);
            return {
                success: false,
                error: GameplayError.SYSTEM_ERROR,
                message: 'Failed to delete save data'
            };
        }
    }

    // Private helper methods

    private async saveCurrentData(): Promise<SaveOperationResult> {
        if (!this.currentSaveData) {
            return {
                success: false,
                error: RecruitmentError.SYSTEM_ERROR,
                message: 'No current save data to save'
            };
        }

        return await this.saveRecruitmentData(
            this.currentSaveData.recruitedCharacters,
            this.currentSaveData.chapterProgress,
            this.currentSaveData.recruitmentStatistics,
            this.currentSaveData.systemConfig,
            this.currentSaveData.currentChapter,
            this.currentSaveData.playerId,
            this.currentSaveData.gameId
        );
    }

    private sanitizeRecruitedCharacters(characters: RecruitedCharacterSaveData[]): RecruitedCharacterSaveData[] {
        return characters.map(character => ({
            ...character,
            recruitedAt: Math.max(0, character.recruitedAt),
            experience: Math.max(0, character.experience),
            level: Math.max(1, character.level),
            isAvailable: Boolean(character.isAvailable)
        }));
    }

    private sanitizeStatistics(stats: RecruitmentStatistics): RecruitmentStatistics {
        return {
            ...stats,
            totalAttempts: Math.max(0, stats.totalAttempts),
            successfulRecruitments: Math.max(0, stats.successfulRecruitments),
            failedRecruitments: Math.max(0, stats.failedRecruitments),
            npcsSaved: Math.max(0, stats.npcsSaved),
            npcsLost: Math.max(0, stats.npcsLost),
            averageConditionsMet: Math.max(0, Math.min(100, stats.averageConditionsMet))
        };
    }

    private sanitizeChapterProgress(progress: Record<string, ChapterProgressData>): Record<string, ChapterProgressData> {
        const sanitized: Record<string, ChapterProgressData> = {};

        for (const [chapterId, data] of Object.entries(progress)) {
            sanitized[chapterId] = {
                ...data,
                completedStages: [...new Set(data.completedStages)], // Remove duplicates
                availableCharacters: [...new Set(data.availableCharacters)],
                lostCharacters: [...new Set(data.lostCharacters)],
                recruitedInChapter: [...new Set(data.recruitedInChapter)],
                chapterStartTime: Math.max(0, data.chapterStartTime),
                lastSaveTime: Math.max(0, data.lastSaveTime)
            };
        }

        return sanitized;
    }

    private sanitizeConfig(config: RecruitmentSystemConfig): RecruitmentSystemConfig {
        return {
            ...config,
            maxNPCsPerStage: Math.max(1, config.maxNPCsPerStage),
            npcProtectionPriority: Math.max(0, Math.min(100, config.npcProtectionPriority)),
            npcSurvivalBonus: Math.max(0, config.npcSurvivalBonus)
        };
    }

    private generateChecksum(data: RecruitmentSaveData): string {
        // Create a simplified hash of critical data
        const criticalData = {
            recruitedCharacters: data.recruitedCharacters.length,
            currentChapter: data.currentChapter,
            lastModified: data.lastModified
        };

        return btoa(JSON.stringify(criticalData)).slice(0, 16);
    }

    private validateSaveData(data: RecruitmentSaveData): IntegrityCheckResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        const corruptedSections: string[] = [];

        // Check version
        if (!data.version || typeof data.version !== 'object') {
            errors.push('Missing or invalid version information');
            corruptedSections.push('version');
        }

        // Check basic structure
        if (!data.playerId || typeof data.playerId !== 'string') {
            errors.push('Missing or invalid player ID');
        }

        if (!Array.isArray(data.recruitedCharacters)) {
            errors.push('Invalid recruited characters data');
            corruptedSections.push('recruitedCharacters');
        }

        if (!data.chapterProgress || typeof data.chapterProgress !== 'object') {
            errors.push('Invalid chapter progress data');
            corruptedSections.push('chapterProgress');
        }

        // Check timestamps
        if (data.createdAt > Date.now() || data.lastModified > Date.now()) {
            warnings.push('Future timestamps detected');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            corruptedSections,
            recoverable: corruptedSections.length < 3 // Recoverable if less than 3 sections corrupted
        };
    }

    private checkDataIntegrity(data: RecruitmentSaveData): IntegrityCheckResult {
        const result = this.validateSaveData(data);

        // Additional integrity checks
        if (data.checksum) {
            const expectedChecksum = this.generateChecksum(data);
            if (data.checksum !== expectedChecksum) {
                result.warnings.push('Checksum mismatch - data may have been modified');
            }
        }

        return result;
    }

    private repairSaveData(data: RecruitmentSaveData, integrityResult: IntegrityCheckResult): RecruitmentSaveData {
        const repairedData = { ...data };

        // Repair corrupted sections
        for (const section of integrityResult.corruptedSections) {
            switch (section) {
                case 'recruitedCharacters':
                    repairedData.recruitedCharacters = [];
                    break;
                case 'chapterProgress':
                    repairedData.chapterProgress = {};
                    break;
                case 'version':
                    repairedData.version = { ...RecruitmentDataManager.CURRENT_VERSION };
                    break;
            }
        }

        // Update checksum
        repairedData.checksum = this.generateChecksum(repairedData);

        return repairedData;
    }

    private async migrateDataIfNeeded(data: RecruitmentSaveData): Promise<{ migrated: boolean; data?: RecruitmentSaveData }> {
        const currentVersion = RecruitmentDataManager.CURRENT_VERSION;

        // Check if migration is needed
        if (data.version.major === currentVersion.major &&
            data.version.minor === currentVersion.minor) {
            return { migrated: false };
        }

        // Perform migration based on version differences
        const migratedData = { ...data };

        // Update version
        migratedData.version = { ...currentVersion };
        migratedData.lastModified = Date.now();

        // Add any missing fields with defaults
        if (!migratedData.recruitmentStatistics) {
            migratedData.recruitmentStatistics = {
                totalAttempts: 0,
                successfulRecruitments: migratedData.recruitedCharacters.length,
                failedRecruitments: 0,
                npcsSaved: 0,
                npcsLost: 0,
                averageConditionsMet: 100,
                recruitmentsByStage: {}
            };
        }

        // Update checksum
        migratedData.checksum = this.generateChecksum(migratedData);

        return { migrated: true, data: migratedData };
    }

    private async recoverFromBackup(): Promise<LoadOperationResult> {
        try {
            const backupData = localStorage.getItem(RecruitmentDataManager.BACKUP_KEY);

            if (!backupData) {
                return {
                    success: false,
                    error: RecruitmentError.DATA_CORRUPTION,
                    message: 'No backup data available for recovery'
                };
            }

            const parsedBackup = JSON.parse(backupData);
            const integrityResult = this.checkDataIntegrity(parsedBackup);

            if (!integrityResult.isValid && !integrityResult.recoverable) {
                return {
                    success: false,
                    error: RecruitmentError.DATA_CORRUPTION,
                    message: 'Backup data is also corrupted'
                };
            }

            // Repair backup data if needed
            const recoveredData = integrityResult.isValid ?
                parsedBackup :
                this.repairSaveData(parsedBackup, integrityResult);

            // Save recovered data as current
            localStorage.setItem(RecruitmentDataManager.STORAGE_KEY, JSON.stringify(recoveredData));
            this.currentSaveData = recoveredData;

            return {
                success: true,
                data: recoveredData,
                recovered: true,
                message: 'Data recovered from backup'
            };

        } catch (error) {
            return {
                success: false,
                error: RecruitmentError.DATA_CORRUPTION,
                message: 'Failed to recover from backup'
            };
        }
    }

    private async createBackup(): Promise<void> {
        try {
            if (this.currentSaveData) {
                const backupData = JSON.stringify(this.currentSaveData);
                localStorage.setItem(RecruitmentDataManager.BACKUP_KEY, backupData);
            }
        } catch (error) {
            console.warn('Failed to create backup:', error);
        }
    }

    private createBackupData(): Partial<RecruitmentSaveData> | undefined {
        if (!this.currentSaveData) {
            return undefined;
        }

        // Create minimal backup with essential data
        return {
            recruitedCharacters: this.currentSaveData.recruitedCharacters,
            currentChapter: this.currentSaveData.currentChapter,
            chapterProgress: this.currentSaveData.chapterProgress
        };
    }

    private createEmptySaveData(): RecruitmentSaveData {
        return {
            version: { ...RecruitmentDataManager.CURRENT_VERSION },
            playerId: 'default',
            gameId: 'default',
            createdAt: Date.now(),
            lastModified: Date.now(),
            recruitedCharacters: [],
            recruitmentStatistics: {
                totalAttempts: 0,
                successfulRecruitments: 0,
                failedRecruitments: 0,
                npcsSaved: 0,
                npcsLost: 0,
                averageConditionsMet: 0,
                recruitmentsByStage: {}
            },
            currentChapter: '',
            chapterProgress: {},
            systemConfig: {
                enableRecruitment: true,
                maxNPCsPerStage: 3,
                npcProtectionPriority: 90,
                autoShowConditions: true,
                conditionHintLevel: 'basic',
                allowMultipleAttempts: false,
                npcSurvivalBonus: 50
            },
            checksum: ''
        };
    }

    private updateCharacterAvailability(chapterId: string, chapterProgress: ChapterProgressData): void {
        if (!this.currentSaveData) return;

        // Update availability based on chapter progression
        for (const character of this.currentSaveData.recruitedCharacters) {
            // Character is available if:
            // 1. They are in the available list for this chapter
            // 2. They are not in the lost list for this chapter
            character.isAvailable =
                chapterProgress.availableCharacters.includes(character.characterId) &&
                !chapterProgress.lostCharacters.includes(character.characterId);
        }
    }
}