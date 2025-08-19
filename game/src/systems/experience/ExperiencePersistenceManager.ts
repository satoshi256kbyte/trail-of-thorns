/**
 * ExperiencePersistenceManager - 経験値システムのデータ永続化管理
 * 
 * このクラスは経験値システムとセーブデータシステムの統合を管理します:
 * - キャラクター経験値・レベル情報のセーブデータ統合
 * - 章進行時の経験値情報継続管理
 * - ゲーム再開時の経験値情報復元機能
 * - 新規仲間キャラクターの初期レベル・経験値設定
 * - セーブデータ破損時のエラー回復処理
 * 
 * 要件: 7.1, 7.2, 7.3, 7.4, 7.5
 * 
 * @version 1.0.0
 * @author Trail of Thorns Development Team
 */

import {
    ExperienceInfo,
    ExperiencePersistenceResult,
    ExperiencePersistenceError,
    ExperienceRecoveryOptions,
    NewCharacterExperienceSettings,
    ExperienceBackupData,
    ExperiencePersistenceConfig
} from '../../types/experience';
import { SaveDataManager } from '../SaveDataManager';
import {
    GameSaveData,
    CharacterExperienceSaveData,
    NewCharacterInitialSettings,
    SaveDataRecoveryOptions
} from '../../types/saveData';
import { Unit } from '../../types/gameplay';

/**
 * ExperiencePersistenceManagerクラス
 * 経験値システムのデータ永続化を管理する
 */
export class ExperiencePersistenceManager {
    private saveDataManager: SaveDataManager;
    private eventEmitter: Phaser.Events.EventEmitter;
    private config: ExperiencePersistenceConfig;
    private isInitialized: boolean = false;

    // バックアップデータ
    private experienceBackup: Map<string, ExperienceBackupData> = new Map();
    private lastBackupTimestamp: number = 0;

    // デフォルト設定
    private static readonly DEFAULT_CONFIG: ExperiencePersistenceConfig = {
        autoSaveInterval: 30000, // 30秒
        backupRetentionCount: 5,
        enableAutoBackup: true,
        validateOnLoad: true,
        recoverFromBackup: true,
        logPersistenceOperations: true
    };

    constructor(saveDataManager: SaveDataManager, config?: Partial<ExperiencePersistenceConfig>) {
        this.saveDataManager = saveDataManager;
        this.config = { ...ExperiencePersistenceManager.DEFAULT_CONFIG, ...config };

        // Use a simple EventEmitter implementation for Node.js compatibility
        this.eventEmitter = typeof Phaser !== 'undefined'
            ? new Phaser.Events.EventEmitter()
            : new (require('events').EventEmitter)();

        this.setupEventListeners();
    }

    /**
     * システム初期化
     * 要件: 7.1
     */
    public async initialize(): Promise<ExperiencePersistenceResult<boolean>> {
        try {
            // SaveDataManagerの初期化を確認
            const saveSystemResult = await this.saveDataManager.initialize();
            if (!saveSystemResult.success) {
                return {
                    success: false,
                    error: ExperiencePersistenceError.SAVE_SYSTEM_UNAVAILABLE,
                    message: 'Save data manager initialization failed',
                    details: saveSystemResult
                };
            }

            // 既存の経験値データをバックアップ
            await this.createInitialBackup();

            this.isInitialized = true;

            if (this.config.logPersistenceOperations) {
                console.log('Experience persistence manager initialized successfully');
            }

            this.eventEmitter.emit('experience-persistence-initialized', {
                timestamp: Date.now()
            });

            return {
                success: true,
                data: true,
                message: 'Experience persistence manager initialized successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: ExperiencePersistenceError.INITIALIZATION_FAILED,
                message: 'Failed to initialize experience persistence manager',
                details: error
            };
        }
    }

    /**
     * キャラクター経験値・レベル情報のセーブデータ統合を実装
     * 要件: 7.1
     */
    public async saveCharacterExperienceData(
        experienceMap: Map<string, ExperienceInfo>
    ): Promise<ExperiencePersistenceResult<boolean>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: ExperiencePersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            // バックアップを作成
            if (this.config.enableAutoBackup) {
                await this.createExperienceBackup(experienceMap);
            }

            // SaveDataManagerを使用してデータを保存
            const saveResult = this.saveDataManager.saveCharacterExperienceData(experienceMap);

            if (!saveResult.success) {
                return {
                    success: false,
                    error: ExperiencePersistenceError.SAVE_FAILED,
                    message: 'Failed to save character experience data',
                    details: saveResult
                };
            }

            if (this.config.logPersistenceOperations) {
                console.log(`Saved experience data for ${experienceMap.size} characters`);
            }

            this.eventEmitter.emit('experience-data-saved', {
                characterCount: experienceMap.size,
                timestamp: Date.now()
            });

            return {
                success: true,
                data: true,
                message: 'Character experience data saved successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: ExperiencePersistenceError.SAVE_FAILED,
                message: 'Failed to save character experience data',
                details: error
            };
        }
    }

    /**
     * 章進行時の経験値情報継続管理を実装
     * 要件: 7.2
     */
    public async saveChapterProgressWithExperience(
        chapterId: string,
        stageNumber: number,
        experienceMap: Map<string, ExperienceInfo>,
        isCompleted: boolean = false
    ): Promise<ExperiencePersistenceResult<boolean>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: ExperiencePersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            // 経験値データを保存
            const experienceSaveResult = await this.saveCharacterExperienceData(experienceMap);
            if (!experienceSaveResult.success) {
                return experienceSaveResult;
            }

            // 章進行状況を保存
            const chapterSaveResult = this.saveDataManager.saveChapterProgress(
                chapterId,
                stageNumber,
                isCompleted
            );

            if (!chapterSaveResult.success) {
                return {
                    success: false,
                    error: ExperiencePersistenceError.SAVE_FAILED,
                    message: 'Failed to save chapter progress',
                    details: chapterSaveResult
                };
            }

            // 章完了時の特別処理
            if (isCompleted) {
                await this.handleChapterCompletion(chapterId, experienceMap);
            }

            if (this.config.logPersistenceOperations) {
                console.log(`Saved chapter progress: ${chapterId} stage ${stageNumber} (completed: ${isCompleted})`);
            }

            this.eventEmitter.emit('chapter-progress-saved', {
                chapterId,
                stageNumber,
                isCompleted,
                characterCount: experienceMap.size,
                timestamp: Date.now()
            });

            return {
                success: true,
                data: true,
                message: 'Chapter progress and experience data saved successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: ExperiencePersistenceError.SAVE_FAILED,
                message: 'Failed to save chapter progress with experience',
                details: error
            };
        }
    }

    /**
     * ゲーム再開時の経験値情報復元機能を実装
     * 要件: 7.3
     */
    public async loadCharacterExperienceData(): Promise<ExperiencePersistenceResult<Map<string, ExperienceInfo>>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: ExperiencePersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            // SaveDataManagerから経験値データを読み込み
            const loadResult = this.saveDataManager.loadCharacterExperienceData();

            if (!loadResult.success) {
                // 読み込み失敗時はバックアップからの復旧を試行
                if (this.config.recoverFromBackup) {
                    const recoveryResult = await this.recoverExperienceDataFromBackup();
                    if (recoveryResult.success) {
                        return recoveryResult;
                    }
                }

                return {
                    success: false,
                    error: ExperiencePersistenceError.LOAD_FAILED,
                    message: 'Failed to load character experience data',
                    details: loadResult
                };
            }

            const experienceMap = loadResult.data!;

            // データ検証
            if (this.config.validateOnLoad) {
                const validationResult = await this.validateExperienceData(experienceMap);
                if (!validationResult.success) {
                    // 検証失敗時は修復を試行
                    const repairedData = await this.repairExperienceData(experienceMap, validationResult);
                    if (repairedData.success) {
                        return repairedData;
                    }

                    return validationResult;
                }
            }

            if (this.config.logPersistenceOperations) {
                console.log(`Loaded experience data for ${experienceMap.size} characters`);
            }

            this.eventEmitter.emit('experience-data-loaded', {
                characterCount: experienceMap.size,
                timestamp: Date.now()
            });

            return {
                success: true,
                data: experienceMap,
                message: 'Character experience data loaded successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: ExperiencePersistenceError.LOAD_FAILED,
                message: 'Failed to load character experience data',
                details: error
            };
        }
    }

    /**
     * 新規仲間キャラクターの初期レベル・経験値設定を実装
     * 要件: 7.4
     */
    public async initializeNewCharacterExperience(
        settings: NewCharacterExperienceSettings
    ): Promise<ExperiencePersistenceResult<ExperienceInfo>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: ExperiencePersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            // 新規キャラクター設定をSaveDataManager用に変換
            const saveDataSettings: NewCharacterInitialSettings = {
                characterId: settings.characterId,
                initialLevel: settings.initialLevel,
                initialExperience: settings.initialExperience,
                baseGrowthRates: settings.baseGrowthRates,
                joinChapter: settings.joinChapter,
                joinStage: settings.joinStage,
                isTemporary: settings.isTemporary || false
            };

            // SaveDataManagerで新規キャラクターを初期化
            const initResult = this.saveDataManager.initializeNewCharacter(saveDataSettings);

            if (!initResult.success) {
                return {
                    success: false,
                    error: ExperiencePersistenceError.INITIALIZATION_FAILED,
                    message: 'Failed to initialize new character',
                    details: initResult
                };
            }

            // ExperienceInfo形式に変換
            const saveData = initResult.data!;
            const experienceInfo: ExperienceInfo = {
                characterId: saveData.characterId,
                currentLevel: saveData.currentLevel,
                currentExperience: saveData.currentExperience,
                totalExperience: saveData.totalExperience,
                experienceToNextLevel: this.calculateExperienceToNextLevel(
                    saveData.currentLevel,
                    saveData.currentExperience
                ),
                canLevelUp: false, // 初期化時はレベルアップ不可
                isMaxLevel: false, // 初期化時は最大レベルではない
                experienceProgress: 0 // 初期化時は進捗0
            };

            // バックアップに追加
            if (this.config.enableAutoBackup) {
                const backupData: ExperienceBackupData = {
                    characterId: settings.characterId,
                    experienceInfo,
                    timestamp: Date.now(),
                    source: 'new_character_initialization'
                };
                this.experienceBackup.set(settings.characterId, backupData);
            }

            if (this.config.logPersistenceOperations) {
                console.log(`Initialized new character: ${settings.characterId} (Level ${settings.initialLevel})`);
            }

            this.eventEmitter.emit('new-character-experience-initialized', {
                characterId: settings.characterId,
                initialLevel: settings.initialLevel,
                initialExperience: settings.initialExperience,
                isTemporary: settings.isTemporary,
                timestamp: Date.now()
            });

            return {
                success: true,
                data: experienceInfo,
                message: 'New character experience initialized successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: ExperiencePersistenceError.INITIALIZATION_FAILED,
                message: 'Failed to initialize new character experience',
                details: error
            };
        }
    }

    /**
     * セーブデータ破損時のエラー回復処理を実装
     * 要件: 7.5
     */
    public async recoverCorruptedExperienceData(
        options: ExperienceRecoveryOptions
    ): Promise<ExperiencePersistenceResult<Map<string, ExperienceInfo>>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: ExperiencePersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            console.log('Attempting to recover corrupted experience data...');

            let recoveredData: Map<string, ExperienceInfo> | null = null;

            // バックアップからの復旧を試行
            if (options.useBackup && this.experienceBackup.size > 0) {
                const backupRecoveryResult = await this.recoverExperienceDataFromBackup();
                if (backupRecoveryResult.success) {
                    recoveredData = backupRecoveryResult.data!;
                    console.log('Successfully recovered experience data from backup');
                }
            }

            // SaveDataManagerの復旧機能を使用
            if (!recoveredData && options.useSaveDataRecovery) {
                const saveDataRecoveryOptions: SaveDataRecoveryOptions = {
                    useBackup: options.useBackup,
                    resetCorruptedData: options.resetCorruptedData,
                    useDefaultValues: options.useDefaultValues,
                    preserveProgress: options.preserveProgress,
                    notifyUser: options.notifyUser
                };

                const saveDataRecoveryResult = this.saveDataManager.recoverCorruptedSaveData(
                    0, // デフォルトスロット
                    saveDataRecoveryOptions
                );

                if (saveDataRecoveryResult.success) {
                    // 復旧されたセーブデータから経験値情報を抽出
                    const extractResult = this.extractExperienceDataFromSaveData(saveDataRecoveryResult.data!);
                    if (extractResult.success) {
                        recoveredData = extractResult.data!;
                        console.log('Successfully recovered experience data from save data recovery');
                    }
                }
            }

            // 部分的な復旧を試行
            if (!recoveredData && options.attemptPartialRecovery) {
                const partialRecoveryResult = await this.attemptPartialExperienceRecovery();
                if (partialRecoveryResult.success) {
                    recoveredData = partialRecoveryResult.data!;
                    console.log('Successfully performed partial experience data recovery');
                }
            }

            // デフォルト値での復旧
            if (!recoveredData && options.useDefaultValues) {
                recoveredData = this.createDefaultExperienceData();
                console.log('Created default experience data');
            }

            // 復旧に失敗
            if (!recoveredData) {
                return {
                    success: false,
                    error: ExperiencePersistenceError.RECOVERY_FAILED,
                    message: 'Unable to recover experience data'
                };
            }

            // 復旧したデータを保存
            const saveResult = await this.saveCharacterExperienceData(recoveredData);
            if (!saveResult.success) {
                console.warn('Failed to save recovered experience data:', saveResult.message);
            }

            if (this.config.logPersistenceOperations) {
                console.log(`Recovered experience data for ${recoveredData.size} characters`);
            }

            // ユーザーに通知
            if (options.notifyUser) {
                this.eventEmitter.emit('experience-data-recovered', {
                    characterCount: recoveredData.size,
                    recoveryMethod: this.determineRecoveryMethod(options),
                    timestamp: Date.now()
                });
            }

            return {
                success: true,
                data: recoveredData,
                message: 'Experience data recovered successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: ExperiencePersistenceError.RECOVERY_FAILED,
                message: 'Failed to recover corrupted experience data',
                details: error
            };
        }
    }

    /**
     * 経験値データの整合性チェック
     */
    public async validateExperienceData(
        experienceMap: Map<string, ExperienceInfo>
    ): Promise<ExperiencePersistenceResult<boolean>> {
        try {
            const validationErrors: string[] = [];

            for (const [characterId, experienceInfo] of experienceMap) {
                // 基本的な値の検証
                if (experienceInfo.currentLevel < 1) {
                    validationErrors.push(`Invalid level for character ${characterId}: ${experienceInfo.currentLevel}`);
                }

                if (experienceInfo.currentExperience < 0) {
                    validationErrors.push(`Invalid experience for character ${characterId}: ${experienceInfo.currentExperience}`);
                }

                if (experienceInfo.totalExperience < experienceInfo.currentExperience) {
                    validationErrors.push(`Total experience less than current for character ${characterId}`);
                }

                // レベルと経験値の整合性チェック
                const expectedMinExp = this.calculateMinimumExperienceForLevel(experienceInfo.currentLevel);
                if (experienceInfo.currentExperience < expectedMinExp) {
                    validationErrors.push(`Experience too low for level ${experienceInfo.currentLevel} for character ${characterId}`);
                }
            }

            if (validationErrors.length > 0) {
                return {
                    success: false,
                    error: ExperiencePersistenceError.VALIDATION_FAILED,
                    message: 'Experience data validation failed',
                    details: validationErrors
                };
            }

            return {
                success: true,
                data: true,
                message: 'Experience data validation passed'
            };

        } catch (error) {
            return {
                success: false,
                error: ExperiencePersistenceError.VALIDATION_FAILED,
                message: 'Failed to validate experience data',
                details: error
            };
        }
    }

    /**
     * イベントリスナーを追加
     */
    public on(event: string, listener: (...args: any[]) => void): void {
        this.eventEmitter.on(event, listener);
    }

    /**
     * イベントリスナーを削除
     */
    public off(event: string, listener: (...args: any[]) => void): void {
        this.eventEmitter.off(event, listener);
    }

    /**
     * システムを破棄
     */
    public destroy(): void {
        // バックアップデータをクリア
        this.experienceBackup.clear();

        // イベントエミッターを破棄
        this.eventEmitter.removeAllListeners();

        this.isInitialized = false;

        if (this.config.logPersistenceOperations) {
            console.log('Experience persistence manager destroyed');
        }
    }

    // プライベートメソッド

    /**
     * イベントリスナーを設定
     */
    private setupEventListeners(): void {
        // SaveDataManagerのイベントを監視
        this.saveDataManager.on('save-data-recovered', (data) => {
            this.eventEmitter.emit('experience-persistence-recovery-detected', data);
        });

        this.saveDataManager.on('character-experience-saved', (data) => {
            this.eventEmitter.emit('experience-persistence-saved', data);
        });

        this.saveDataManager.on('character-experience-loaded', (data) => {
            this.eventEmitter.emit('experience-persistence-loaded', data);
        });
    }

    /**
     * 初期バックアップを作成
     */
    private async createInitialBackup(): Promise<void> {
        try {
            const loadResult = await this.loadCharacterExperienceData();
            if (loadResult.success && loadResult.data) {
                await this.createExperienceBackup(loadResult.data);
            }
        } catch (error) {
            console.warn('Failed to create initial backup:', error);
        }
    }

    /**
     * 経験値データのバックアップを作成
     */
    private async createExperienceBackup(experienceMap: Map<string, ExperienceInfo>): Promise<void> {
        try {
            const timestamp = Date.now();

            for (const [characterId, experienceInfo] of experienceMap) {
                const backupData: ExperienceBackupData = {
                    characterId,
                    experienceInfo: { ...experienceInfo },
                    timestamp,
                    source: 'auto_backup'
                };

                this.experienceBackup.set(characterId, backupData);
            }

            this.lastBackupTimestamp = timestamp;

            // 古いバックアップを削除
            this.cleanupOldBackups();

        } catch (error) {
            console.error('Failed to create experience backup:', error);
        }
    }

    /**
     * バックアップから経験値データを復旧
     */
    private async recoverExperienceDataFromBackup(): Promise<ExperiencePersistenceResult<Map<string, ExperienceInfo>>> {
        try {
            if (this.experienceBackup.size === 0) {
                return {
                    success: false,
                    error: ExperiencePersistenceError.NO_BACKUP_AVAILABLE,
                    message: 'No backup data available'
                };
            }

            const recoveredMap = new Map<string, ExperienceInfo>();

            for (const [characterId, backupData] of this.experienceBackup) {
                recoveredMap.set(characterId, { ...backupData.experienceInfo });
            }

            return {
                success: true,
                data: recoveredMap,
                message: 'Experience data recovered from backup'
            };

        } catch (error) {
            return {
                success: false,
                error: ExperiencePersistenceError.RECOVERY_FAILED,
                message: 'Failed to recover from backup',
                details: error
            };
        }
    }

    /**
     * 章完了時の処理
     */
    private async handleChapterCompletion(
        chapterId: string,
        experienceMap: Map<string, ExperienceInfo>
    ): Promise<void> {
        try {
            // 章完了時の特別なバックアップを作成
            const timestamp = Date.now();
            const chapterBackupKey = `chapter_${chapterId}_completion`;

            // 章完了時のスナップショットを保存
            for (const [characterId, experienceInfo] of experienceMap) {
                const backupData: ExperienceBackupData = {
                    characterId,
                    experienceInfo: { ...experienceInfo },
                    timestamp,
                    source: chapterBackupKey
                };

                this.experienceBackup.set(`${characterId}_${chapterBackupKey}`, backupData);
            }

            if (this.config.logPersistenceOperations) {
                console.log(`Created chapter completion backup for ${chapterId}`);
            }

        } catch (error) {
            console.error('Failed to handle chapter completion:', error);
        }
    }

    /**
     * セーブデータから経験値データを抽出
     */
    private extractExperienceDataFromSaveData(
        saveData: GameSaveData
    ): ExperiencePersistenceResult<Map<string, ExperienceInfo>> {
        try {
            const experienceMap = new Map<string, ExperienceInfo>();

            for (const [characterId, saveDataExp] of Object.entries(saveData.characterExperience)) {
                const experienceInfo: ExperienceInfo = {
                    characterId,
                    currentLevel: saveDataExp.currentLevel,
                    currentExperience: saveDataExp.currentExperience,
                    totalExperience: saveDataExp.totalExperience,
                    experienceToNextLevel: this.calculateExperienceToNextLevel(
                        saveDataExp.currentLevel,
                        saveDataExp.currentExperience
                    ),
                    canLevelUp: false,
                    isMaxLevel: false,
                    experienceProgress: 0
                };

                experienceMap.set(characterId, experienceInfo);
            }

            return {
                success: true,
                data: experienceMap,
                message: 'Experience data extracted from save data'
            };

        } catch (error) {
            return {
                success: false,
                error: ExperiencePersistenceError.DATA_EXTRACTION_FAILED,
                message: 'Failed to extract experience data from save data',
                details: error
            };
        }
    }

    /**
     * 部分的な経験値データ復旧を試行
     */
    private async attemptPartialExperienceRecovery(): Promise<ExperiencePersistenceResult<Map<string, ExperienceInfo>>> {
        try {
            const recoveredMap = new Map<string, ExperienceInfo>();

            // バックアップから部分的に復旧
            for (const [key, backupData] of this.experienceBackup) {
                if (!key.includes('_chapter_')) { // 通常のバックアップのみ
                    recoveredMap.set(backupData.characterId, { ...backupData.experienceInfo });
                }
            }

            if (recoveredMap.size === 0) {
                return {
                    success: false,
                    error: ExperiencePersistenceError.NO_RECOVERABLE_DATA,
                    message: 'No recoverable experience data found'
                };
            }

            return {
                success: true,
                data: recoveredMap,
                message: 'Partial experience data recovery completed'
            };

        } catch (error) {
            return {
                success: false,
                error: ExperiencePersistenceError.RECOVERY_FAILED,
                message: 'Failed to perform partial recovery',
                details: error
            };
        }
    }

    /**
     * デフォルト経験値データを作成
     */
    private createDefaultExperienceData(): Map<string, ExperienceInfo> {
        const defaultMap = new Map<string, ExperienceInfo>();

        // 基本的なプレイヤーキャラクターのデフォルトデータを作成
        const defaultCharacters = ['player_1', 'player_2', 'player_3'];

        for (const characterId of defaultCharacters) {
            const experienceInfo: ExperienceInfo = {
                characterId,
                currentLevel: 1,
                currentExperience: 0,
                totalExperience: 0,
                experienceToNextLevel: 100, // デフォルト値
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0
            };

            defaultMap.set(characterId, experienceInfo);
        }

        return defaultMap;
    }

    /**
     * 経験値データを修復
     */
    private async repairExperienceData(
        experienceMap: Map<string, ExperienceInfo>,
        validationResult: ExperiencePersistenceResult<boolean>
    ): Promise<ExperiencePersistenceResult<Map<string, ExperienceInfo>>> {
        try {
            const repairedMap = new Map<string, ExperienceInfo>();

            for (const [characterId, experienceInfo] of experienceMap) {
                const repairedInfo = { ...experienceInfo };

                // レベルの修復
                if (repairedInfo.currentLevel < 1) {
                    repairedInfo.currentLevel = 1;
                }

                // 経験値の修復
                if (repairedInfo.currentExperience < 0) {
                    repairedInfo.currentExperience = 0;
                }

                // 総経験値の修復
                if (repairedInfo.totalExperience < repairedInfo.currentExperience) {
                    repairedInfo.totalExperience = repairedInfo.currentExperience;
                }

                // 次レベルまでの経験値を再計算
                repairedInfo.experienceToNextLevel = this.calculateExperienceToNextLevel(
                    repairedInfo.currentLevel,
                    repairedInfo.currentExperience
                );

                repairedMap.set(characterId, repairedInfo);
            }

            return {
                success: true,
                data: repairedMap,
                message: 'Experience data repaired successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: ExperiencePersistenceError.REPAIR_FAILED,
                message: 'Failed to repair experience data',
                details: error
            };
        }
    }

    /**
     * 古いバックアップを削除
     */
    private cleanupOldBackups(): void {
        try {
            const backupEntries = Array.from(this.experienceBackup.entries());
            const sortedEntries = backupEntries.sort((a, b) => b[1].timestamp - a[1].timestamp);

            // 保持数を超えた古いバックアップを削除
            if (sortedEntries.length > this.config.backupRetentionCount) {
                const toDelete = sortedEntries.slice(this.config.backupRetentionCount);
                for (const [key] of toDelete) {
                    this.experienceBackup.delete(key);
                }
            }

        } catch (error) {
            console.error('Failed to cleanup old backups:', error);
        }
    }

    /**
     * 復旧方法を決定
     */
    private determineRecoveryMethod(options: ExperienceRecoveryOptions): string {
        if (options.useBackup) return 'backup';
        if (options.useSaveDataRecovery) return 'save_data_recovery';
        if (options.attemptPartialRecovery) return 'partial_recovery';
        if (options.useDefaultValues) return 'default_values';
        return 'unknown';
    }

    /**
     * レベルに対する最小経験値を計算
     */
    private calculateMinimumExperienceForLevel(level: number): number {
        // 簡単な計算式（実際の実装では経験値テーブルを参照）
        return Math.max(0, (level - 1) * 100);
    }

    /**
     * 次レベルまでの経験値を計算
     */
    private calculateExperienceToNextLevel(currentLevel: number, currentExperience: number): number {
        // 簡単な計算式（実際の実装では経験値テーブルを参照）
        const nextLevelExp = currentLevel * 100;
        return Math.max(0, nextLevelExp - currentExperience);
    }

    /**
     * デバッグ情報を取得
     */
    public getDebugInfo(): any {
        return {
            isInitialized: this.isInitialized,
            config: this.config,
            backupCount: this.experienceBackup.size,
            lastBackupTimestamp: this.lastBackupTimestamp,
            saveDataManager: this.saveDataManager ? 'connected' : 'not connected'
        };
    }
}