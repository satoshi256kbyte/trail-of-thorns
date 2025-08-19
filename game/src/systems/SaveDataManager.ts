/**
 * SaveDataManager - ゲームデータの保存・読み込み管理
 * 
 * このクラスは、ゲームの進行状況を永続化するためのメインコントローラーです:
 * - キャラクター経験値・レベル情報の保存・復元
 * - 章進行状況の管理
 * - セーブデータの整合性チェック
 * - エラー回復処理
 * - 新規仲間キャラクターの初期設定
 * 
 * 要件: 7.1, 7.2, 7.3, 7.4, 7.5
 * 
 * @version 1.0.0
 * @author Trail of Thorns Development Team
 */

import {
    GameSaveData,
    SaveDataResult,
    SaveDataError,
    SaveDataValidationResult,
    SaveDataRecoveryOptions,
    SaveDataConfig,
    SaveSlotInfo,
    CharacterExperienceSaveData,
    ChapterProgressSaveData,
    RecruitedCharacterSaveData,
    GameSettingsSaveData,
    NewCharacterInitialSettings,
    SaveDataVersion
} from '../types/saveData';
import { ExperienceInfo } from '../types/experience';
import { Unit } from '../types/gameplay';

/**
 * SaveDataManagerクラス
 * ゲームデータの永続化を管理する
 */
export class SaveDataManager {
    private config: SaveDataConfig;
    private eventEmitter: Phaser.Events.EventEmitter;
    private currentSaveData: GameSaveData | null = null;
    private autoSaveTimer?: number;
    private isInitialized: boolean = false;

    // セーブデータのバージョン情報
    private static readonly CURRENT_VERSION: SaveDataVersion = {
        major: 1,
        minor: 0,
        patch: 0
    };

    // デフォルト設定
    private static readonly DEFAULT_CONFIG: SaveDataConfig = {
        maxSaveSlots: 10,
        autoSaveInterval: 300000, // 5分
        backupCount: 3,
        compressionEnabled: false,
        encryptionEnabled: false,
        checksumAlgorithm: 'sha256',
        storageType: 'localStorage'
    };

    constructor(config?: Partial<SaveDataConfig>) {
        this.config = { ...SaveDataManager.DEFAULT_CONFIG, ...config };
        // Use a simple EventEmitter implementation for Node.js compatibility
        this.eventEmitter = typeof Phaser !== 'undefined'
            ? new Phaser.Events.EventEmitter()
            : new (require('events').EventEmitter)();
        this.setupAutoSave();
    }

    /**
     * システム初期化
     * 要件: 7.1
     */
    public async initialize(): Promise<SaveDataResult<boolean>> {
        try {
            // ストレージの可用性をチェック
            const storageCheck = this.checkStorageAvailability();
            if (!storageCheck.success) {
                return storageCheck;
            }

            // 既存のセーブデータをスキャン
            const scanResult = await this.scanExistingSaveData();
            if (!scanResult.success) {
                console.warn('Failed to scan existing save data:', scanResult.message);
            }

            this.isInitialized = true;

            this.eventEmitter.emit('save-system-initialized', {
                availableSlots: this.getAvailableSaveSlots(),
                config: this.config
            });

            return {
                success: true,
                data: true,
                message: 'Save system initialized successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: SaveDataError.LOAD_FAILED,
                message: 'Failed to initialize save system',
                details: error
            };
        }
    }

    /**
     * キャラクター経験値・レベル情報のセーブデータ統合を実装
     * 要件: 7.1
     */
    public saveCharacterExperienceData(
        characterExperienceMap: Map<string, ExperienceInfo>
    ): SaveDataResult<boolean> {
        try {
            if (!this.isInitialized) {
                return {
                    success: false,
                    error: SaveDataError.SAVE_FAILED,
                    message: 'Save system not initialized'
                };
            }

            if (!this.currentSaveData) {
                return {
                    success: false,
                    error: SaveDataError.SAVE_FAILED,
                    message: 'No active save data'
                };
            }

            // 経験値データを変換
            const characterExperienceData: Record<string, CharacterExperienceSaveData> = {};

            for (const [characterId, experienceInfo] of characterExperienceMap) {
                characterExperienceData[characterId] = {
                    characterId,
                    currentLevel: experienceInfo.currentLevel,
                    currentExperience: experienceInfo.currentExperience,
                    totalExperience: experienceInfo.totalExperience,
                    lastLevelUpTimestamp: Date.now()
                };
            }

            // セーブデータを更新
            this.currentSaveData.characterExperience = characterExperienceData;
            this.currentSaveData.lastSavedAt = Date.now();

            // チェックサムを更新
            this.updateChecksum(this.currentSaveData);

            // ストレージに保存
            const saveResult = this.saveToStorage(this.currentSaveData);
            if (!saveResult.success) {
                return saveResult;
            }

            this.eventEmitter.emit('character-experience-saved', {
                characterCount: characterExperienceMap.size,
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
                error: SaveDataError.SAVE_FAILED,
                message: 'Failed to save character experience data',
                details: error
            };
        }
    }

    /**
     * 章進行時の経験値情報継続管理を実装
     * 要件: 7.2
     */
    public saveChapterProgress(
        chapterId: string,
        stageNumber: number,
        isCompleted: boolean = false
    ): SaveDataResult<boolean> {
        try {
            if (!this.currentSaveData) {
                return {
                    success: false,
                    error: SaveDataError.SAVE_FAILED,
                    message: 'No active save data'
                };
            }

            // 章進行状況を更新
            if (!this.currentSaveData.chapterProgress[chapterId]) {
                this.currentSaveData.chapterProgress[chapterId] = {
                    chapterId,
                    currentStage: stageNumber,
                    completedStages: [],
                    isCompleted: false,
                    startTimestamp: Date.now(),
                    totalPlayTime: 0
                };
            }

            const chapterProgress = this.currentSaveData.chapterProgress[chapterId];
            chapterProgress.currentStage = Math.max(chapterProgress.currentStage, stageNumber);

            if (isCompleted && !chapterProgress.completedStages.includes(stageNumber)) {
                chapterProgress.completedStages.push(stageNumber);
                chapterProgress.completedStages.sort((a, b) => a - b);
            }

            if (isCompleted && chapterProgress.completedStages.length > 0) {
                const allStagesCompleted = this.checkAllStagesCompleted(chapterId);
                if (allStagesCompleted) {
                    chapterProgress.isCompleted = true;
                    chapterProgress.completionTimestamp = Date.now();
                }
            }

            // 現在の章・ステージを更新
            this.currentSaveData.currentChapter = chapterId;
            this.currentSaveData.currentStage = stageNumber;
            this.currentSaveData.lastSavedAt = Date.now();

            // チェックサムを更新
            this.updateChecksum(this.currentSaveData);

            // ストレージに保存
            const saveResult = this.saveToStorage(this.currentSaveData);
            if (!saveResult.success) {
                return saveResult;
            }

            this.eventEmitter.emit('chapter-progress-saved', {
                chapterId,
                stageNumber,
                isCompleted,
                timestamp: Date.now()
            });

            return {
                success: true,
                data: true,
                message: 'Chapter progress saved successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: SaveDataError.SAVE_FAILED,
                message: 'Failed to save chapter progress',
                details: error
            };
        }
    }

    /**
     * ゲーム再開時の経験値情報復元機能を実装
     * 要件: 7.3
     */
    public loadCharacterExperienceData(): SaveDataResult<Map<string, ExperienceInfo>> {
        try {
            if (!this.currentSaveData) {
                return {
                    success: false,
                    error: SaveDataError.LOAD_FAILED,
                    message: 'No save data loaded'
                };
            }

            const experienceMap = new Map<string, ExperienceInfo>();

            // セーブデータから経験値情報を復元
            for (const [characterId, saveData] of Object.entries(this.currentSaveData.characterExperience)) {
                const experienceInfo: ExperienceInfo = {
                    characterId,
                    currentLevel: saveData.currentLevel,
                    currentExperience: saveData.currentExperience,
                    totalExperience: saveData.totalExperience,
                    experienceToNextLevel: 0, // 計算で求める
                    canLevelUp: false, // 計算で求める
                    isMaxLevel: false, // 計算で求める
                    experienceProgress: 0 // 計算で求める
                };

                experienceMap.set(characterId, experienceInfo);
            }

            this.eventEmitter.emit('character-experience-loaded', {
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
                error: SaveDataError.LOAD_FAILED,
                message: 'Failed to load character experience data',
                details: error
            };
        }
    }

    /**
     * 新規仲間キャラクターの初期レベル・経験値設定を実装
     * 要件: 7.4
     */
    public initializeNewCharacter(settings: NewCharacterInitialSettings): SaveDataResult<CharacterExperienceSaveData> {
        try {
            if (!this.currentSaveData) {
                return {
                    success: false,
                    error: SaveDataError.SAVE_FAILED,
                    message: 'No active save data'
                };
            }

            // 新規キャラクターの経験値データを作成
            const characterExperienceData: CharacterExperienceSaveData = {
                characterId: settings.characterId,
                currentLevel: settings.initialLevel,
                currentExperience: settings.initialExperience,
                totalExperience: settings.initialExperience,
                lastLevelUpTimestamp: Date.now(),
                customGrowthRates: settings.baseGrowthRates
            };

            // セーブデータに追加
            this.currentSaveData.characterExperience[settings.characterId] = characterExperienceData;

            // 仲間キャラクター情報も追加
            if (!settings.isTemporary) {
                const recruitedCharacterData: RecruitedCharacterSaveData = {
                    characterId: settings.characterId,
                    recruitmentTimestamp: Date.now(),
                    recruitmentChapter: settings.joinChapter,
                    recruitmentStage: settings.joinStage,
                    isActive: true
                };

                this.currentSaveData.recruitedCharacters[settings.characterId] = recruitedCharacterData;
                this.currentSaveData.statistics.charactersRecruited++;
            }

            this.currentSaveData.lastSavedAt = Date.now();

            // チェックサムを更新
            this.updateChecksum(this.currentSaveData);

            // ストレージに保存
            const saveResult = this.saveToStorage(this.currentSaveData);
            if (!saveResult.success) {
                return saveResult;
            }

            this.eventEmitter.emit('new-character-initialized', {
                characterId: settings.characterId,
                initialLevel: settings.initialLevel,
                isTemporary: settings.isTemporary,
                timestamp: Date.now()
            });

            return {
                success: true,
                data: characterExperienceData,
                message: 'New character initialized successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: SaveDataError.SAVE_FAILED,
                message: 'Failed to initialize new character',
                details: error
            };
        }
    }

    /**
     * セーブデータ破損時のエラー回復処理を実装
     * 要件: 7.5
     */
    public recoverCorruptedSaveData(
        slotId: number,
        options: SaveDataRecoveryOptions
    ): SaveDataResult<GameSaveData> {
        try {
            console.log(`Attempting to recover corrupted save data for slot ${slotId}`);

            let recoveredData: GameSaveData | null = null;

            // バックアップからの復旧を試行
            if (options.useBackup) {
                const backupResult = this.loadFromBackup(slotId);
                if (backupResult.success && backupResult.data) {
                    recoveredData = backupResult.data;
                    console.log('Successfully recovered from backup');
                }
            }

            // バックアップからの復旧に失敗した場合、部分的な復旧を試行
            if (!recoveredData) {
                const partialRecoveryResult = this.attemptPartialRecovery(slotId, options);
                if (partialRecoveryResult.success && partialRecoveryResult.data) {
                    recoveredData = partialRecoveryResult.data;
                    console.log('Successfully performed partial recovery');
                }
            }

            // 全ての復旧方法が失敗した場合、新しいセーブデータを作成
            if (!recoveredData) {
                if (options.useDefaultValues) {
                    recoveredData = this.createDefaultSaveData();
                    console.log('Created new save data with default values');
                } else {
                    return {
                        success: false,
                        error: SaveDataError.DATA_CORRUPTED,
                        message: 'Unable to recover save data and default values not allowed'
                    };
                }
            }

            // 復旧したデータを検証
            const validationResult = this.validateSaveData(recoveredData);
            if (!validationResult.isValid) {
                // 検証に失敗した場合、可能な限り修正
                recoveredData = this.fixSaveDataIssues(recoveredData, validationResult);
            }

            // 復旧したデータを保存
            const saveResult = this.saveToStorage(recoveredData, slotId);
            if (!saveResult.success) {
                return {
                    success: false,
                    error: SaveDataError.SAVE_FAILED,
                    message: 'Failed to save recovered data'
                };
            }

            // 現在のセーブデータとして設定
            this.currentSaveData = recoveredData;

            // ユーザーに通知
            if (options.notifyUser) {
                this.eventEmitter.emit('save-data-recovered', {
                    slotId,
                    recoveryMethod: options.useBackup ? 'backup' : 'partial',
                    timestamp: Date.now()
                });
            }

            return {
                success: true,
                data: recoveredData,
                message: 'Save data recovered successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: SaveDataError.DATA_CORRUPTED,
                message: 'Failed to recover corrupted save data',
                details: error
            };
        }
    }

    /**
     * セーブデータをスロットに保存
     */
    public saveToSlot(slotId: number, saveData?: GameSaveData): SaveDataResult<boolean> {
        try {
            const dataToSave = saveData || this.currentSaveData;
            if (!dataToSave) {
                return {
                    success: false,
                    error: SaveDataError.SAVE_FAILED,
                    message: 'No save data to save'
                };
            }

            // スロットIDの検証
            if (slotId < 0 || slotId >= this.config.maxSaveSlots) {
                return {
                    success: false,
                    error: SaveDataError.SAVE_FAILED,
                    message: `Invalid slot ID: ${slotId}`
                };
            }

            // セーブデータを更新
            dataToSave.lastSavedAt = Date.now();
            this.updateChecksum(dataToSave);

            // バックアップを作成
            this.createBackup(slotId, dataToSave);

            // ストレージに保存
            const saveResult = this.saveToStorage(dataToSave, slotId);
            if (!saveResult.success) {
                return saveResult;
            }

            this.eventEmitter.emit('game-saved', {
                slotId,
                timestamp: Date.now(),
                dataSize: JSON.stringify(dataToSave).length
            });

            return {
                success: true,
                data: true,
                message: 'Game saved successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: SaveDataError.SAVE_FAILED,
                message: 'Failed to save game',
                details: error
            };
        }
    }

    /**
     * スロットからセーブデータを読み込み
     */
    public loadFromSlot(slotId: number): SaveDataResult<GameSaveData> {
        try {
            // スロットIDの検証
            if (slotId < 0 || slotId >= this.config.maxSaveSlots) {
                return {
                    success: false,
                    error: SaveDataError.LOAD_FAILED,
                    message: `Invalid slot ID: ${slotId}`
                };
            }

            // ストレージから読み込み
            const loadResult = this.loadFromStorage(slotId);
            if (!loadResult.success || !loadResult.data) {
                return loadResult;
            }

            const saveData = loadResult.data;

            // データの検証
            const validationResult = this.validateSaveData(saveData);
            if (!validationResult.isValid) {
                // 破損データの復旧を試行
                const recoveryOptions: SaveDataRecoveryOptions = {
                    useBackup: true,
                    resetCorruptedData: true,
                    useDefaultValues: false,
                    preserveProgress: true,
                    notifyUser: true
                };

                return this.recoverCorruptedSaveData(slotId, recoveryOptions);
            }

            // バージョン互換性チェック
            const versionCheck = this.checkVersionCompatibility(saveData.version);
            if (!versionCheck.success) {
                return versionCheck;
            }

            // 現在のセーブデータとして設定
            this.currentSaveData = saveData;

            this.eventEmitter.emit('game-loaded', {
                slotId,
                timestamp: Date.now(),
                playerName: saveData.playerName,
                currentChapter: saveData.currentChapter
            });

            return {
                success: true,
                data: saveData,
                message: 'Game loaded successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: SaveDataError.LOAD_FAILED,
                message: 'Failed to load game',
                details: error
            };
        }
    }

    /**
     * 新しいゲームを開始
     */
    public createNewGame(playerName: string): SaveDataResult<GameSaveData> {
        try {
            const newSaveData = this.createDefaultSaveData();
            newSaveData.playerName = playerName;
            newSaveData.createdAt = Date.now();
            newSaveData.lastSavedAt = Date.now();

            this.currentSaveData = newSaveData;

            this.eventEmitter.emit('new-game-created', {
                playerName,
                timestamp: Date.now()
            });

            return {
                success: true,
                data: newSaveData,
                message: 'New game created successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: SaveDataError.SAVE_FAILED,
                message: 'Failed to create new game',
                details: error
            };
        }
    }

    /**
     * 利用可能なセーブスロット情報を取得
     */
    public getAvailableSaveSlots(): SaveSlotInfo[] {
        const slots: SaveSlotInfo[] = [];

        for (let i = 0; i < this.config.maxSaveSlots; i++) {
            const loadResult = this.loadFromStorage(i);

            if (loadResult.success && loadResult.data) {
                const saveData = loadResult.data;
                slots.push({
                    slotId: i,
                    isEmpty: false,
                    saveData,
                    previewData: {
                        playerName: saveData.playerName,
                        currentChapter: saveData.currentChapter,
                        currentStage: saveData.currentStage,
                        totalPlayTime: saveData.totalPlayTime,
                        lastSavedAt: saveData.lastSavedAt,
                        characterCount: Object.keys(saveData.characterExperience).length,
                        completedChapters: Object.values(saveData.chapterProgress)
                            .filter(chapter => chapter.isCompleted).length
                    }
                });
            } else {
                slots.push({
                    slotId: i,
                    isEmpty: true
                });
            }
        }

        return slots;
    }

    /**
     * 現在のセーブデータを取得
     */
    public getCurrentSaveData(): GameSaveData | null {
        return this.currentSaveData;
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
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        this.eventEmitter.removeAllListeners();
        this.currentSaveData = null;
        this.isInitialized = false;
    }

    // プライベートメソッド

    /**
     * ストレージの可用性をチェック
     */
    private checkStorageAvailability(): SaveDataResult<boolean> {
        try {
            if (this.config.storageType === 'localStorage') {
                if (typeof Storage === 'undefined') {
                    return {
                        success: false,
                        error: SaveDataError.PERMISSION_DENIED,
                        message: 'localStorage is not available'
                    };
                }

                // テスト書き込み
                const testKey = '__save_test__';
                localStorage.setItem(testKey, 'test');
                localStorage.removeItem(testKey);
            }

            return {
                success: true,
                data: true
            };

        } catch (error) {
            return {
                success: false,
                error: SaveDataError.PERMISSION_DENIED,
                message: 'Storage is not available',
                details: error
            };
        }
    }

    /**
     * 既存のセーブデータをスキャン
     */
    private async scanExistingSaveData(): Promise<SaveDataResult<number>> {
        try {
            let foundSlots = 0;

            for (let i = 0; i < this.config.maxSaveSlots; i++) {
                const loadResult = this.loadFromStorage(i);
                if (loadResult.success && loadResult.data) {
                    foundSlots++;
                }
            }

            return {
                success: true,
                data: foundSlots,
                message: `Found ${foundSlots} existing save slots`
            };

        } catch (error) {
            return {
                success: false,
                error: SaveDataError.LOAD_FAILED,
                message: 'Failed to scan existing save data',
                details: error
            };
        }
    }

    /**
     * ストレージに保存
     */
    private saveToStorage(saveData: GameSaveData, slotId?: number): SaveDataResult<boolean> {
        try {
            const key = slotId !== undefined ? `save_slot_${slotId}` : 'current_save';
            const serializedData = JSON.stringify(saveData);

            if (this.config.storageType === 'localStorage') {
                localStorage.setItem(key, serializedData);
            }

            return {
                success: true,
                data: true
            };

        } catch (error) {
            if (error instanceof DOMException && error.code === 22) {
                return {
                    success: false,
                    error: SaveDataError.STORAGE_FULL,
                    message: 'Storage quota exceeded'
                };
            }

            return {
                success: false,
                error: SaveDataError.SAVE_FAILED,
                message: 'Failed to save to storage',
                details: error
            };
        }
    }

    /**
     * ストレージから読み込み
     */
    private loadFromStorage(slotId?: number): SaveDataResult<GameSaveData> {
        try {
            const key = slotId !== undefined ? `save_slot_${slotId}` : 'current_save';

            if (this.config.storageType === 'localStorage') {
                const serializedData = localStorage.getItem(key);
                if (!serializedData) {
                    return {
                        success: false,
                        error: SaveDataError.LOAD_FAILED,
                        message: 'No save data found'
                    };
                }

                const saveData = JSON.parse(serializedData) as GameSaveData;
                return {
                    success: true,
                    data: saveData
                };
            }

            return {
                success: false,
                error: SaveDataError.LOAD_FAILED,
                message: 'Unsupported storage type'
            };

        } catch (error) {
            return {
                success: false,
                error: SaveDataError.DATA_CORRUPTED,
                message: 'Failed to parse save data',
                details: error
            };
        }
    }

    /**
     * デフォルトセーブデータを作成
     */
    private createDefaultSaveData(): GameSaveData {
        return {
            version: SaveDataManager.CURRENT_VERSION,
            saveId: this.generateSaveId(),
            playerName: '',
            createdAt: Date.now(),
            lastSavedAt: Date.now(),
            totalPlayTime: 0,
            characterExperience: {},
            chapterProgress: {},
            currentChapter: 'chapter_1',
            currentStage: 1,
            recruitedCharacters: {},
            activeParty: [],
            gameSettings: {
                experienceMultiplier: 1.0,
                autoLevelUp: false,
                showExperiencePopups: true,
                experienceAnimationSpeed: 1.0,
                levelUpAnimationDuration: 2000,
                lastModified: Date.now()
            },
            statistics: {
                totalBattles: 0,
                totalVictories: 0,
                totalExperienceGained: 0,
                totalLevelUps: 0,
                charactersRecruited: 0,
                charactersLost: 0
            },
            checksum: ''
        };
    }

    /**
     * セーブデータを検証
     */
    private validateSaveData(saveData: GameSaveData): SaveDataValidationResult {
        const result: SaveDataValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            fixedIssues: [],
            corruptedData: []
        };

        try {
            // 基本構造の検証
            if (!saveData.version || !saveData.saveId) {
                result.errors.push('Missing required fields');
                result.isValid = false;
            }

            // チェックサムの検証
            const expectedChecksum = this.calculateChecksum(saveData);
            if (saveData.checksum !== expectedChecksum) {
                result.errors.push('Checksum mismatch');
                result.isValid = false;
            }

            // キャラクター経験値データの検証
            for (const [characterId, expData] of Object.entries(saveData.characterExperience)) {
                if (expData.currentLevel < 1 || expData.currentExperience < 0) {
                    result.errors.push(`Invalid experience data for character ${characterId}`);
                    result.corruptedData.push(`characterExperience.${characterId}`);
                    result.isValid = false;
                }
            }

            // 章進行データの検証
            for (const [chapterId, chapterData] of Object.entries(saveData.chapterProgress)) {
                if (chapterData.currentStage < 1) {
                    result.errors.push(`Invalid chapter progress for ${chapterId}`);
                    result.corruptedData.push(`chapterProgress.${chapterId}`);
                    result.isValid = false;
                }
            }

        } catch (error) {
            result.errors.push('Validation failed due to exception');
            result.isValid = false;
        }

        return result;
    }

    /**
     * セーブデータの問題を修正
     */
    private fixSaveDataIssues(saveData: GameSaveData, validationResult: SaveDataValidationResult): GameSaveData {
        const fixedData = { ...saveData };

        // 破損したデータをリセット
        for (const corruptedPath of validationResult.corruptedData) {
            if (corruptedPath.startsWith('characterExperience.')) {
                const characterId = corruptedPath.split('.')[1];
                delete fixedData.characterExperience[characterId];
            } else if (corruptedPath.startsWith('chapterProgress.')) {
                const chapterId = corruptedPath.split('.')[1];
                delete fixedData.chapterProgress[chapterId];
            }
        }

        // チェックサムを再計算
        this.updateChecksum(fixedData);

        return fixedData;
    }

    /**
     * バックアップを作成
     */
    private createBackup(slotId: number, saveData: GameSaveData): void {
        try {
            const backupKey = `save_backup_${slotId}_${Date.now()}`;
            const serializedData = JSON.stringify(saveData);

            if (this.config.storageType === 'localStorage') {
                localStorage.setItem(backupKey, serializedData);

                // 古いバックアップを削除
                this.cleanupOldBackups(slotId);
            }

        } catch (error) {
            console.warn('Failed to create backup:', error);
        }
    }

    /**
     * バックアップから読み込み
     */
    private loadFromBackup(slotId: number): SaveDataResult<GameSaveData> {
        try {
            if (this.config.storageType === 'localStorage') {
                // 最新のバックアップを検索
                const backupKeys = Object.keys(localStorage)
                    .filter(key => key.startsWith(`save_backup_${slotId}_`))
                    .sort()
                    .reverse();

                for (const backupKey of backupKeys) {
                    try {
                        const serializedData = localStorage.getItem(backupKey);
                        if (serializedData) {
                            const saveData = JSON.parse(serializedData) as GameSaveData;
                            const validationResult = this.validateSaveData(saveData);

                            if (validationResult.isValid) {
                                return {
                                    success: true,
                                    data: saveData,
                                    message: 'Loaded from backup successfully'
                                };
                            }
                        }
                    } catch (error) {
                        console.warn(`Failed to load backup ${backupKey}:`, error);
                    }
                }
            }

            return {
                success: false,
                error: SaveDataError.LOAD_FAILED,
                message: 'No valid backup found'
            };

        } catch (error) {
            return {
                success: false,
                error: SaveDataError.LOAD_FAILED,
                message: 'Failed to load from backup',
                details: error
            };
        }
    }

    /**
     * 部分的な復旧を試行
     */
    private attemptPartialRecovery(slotId: number, options: SaveDataRecoveryOptions): SaveDataResult<GameSaveData> {
        try {
            // 新しいセーブデータを作成
            const recoveredData = this.createDefaultSaveData();

            // 可能な限り既存データを復元
            const corruptedResult = this.loadFromStorage(slotId);
            if (corruptedResult.data) {
                const corruptedData = corruptedResult.data;

                // 基本情報を復元
                if (corruptedData.playerName) {
                    recoveredData.playerName = corruptedData.playerName;
                }
                if (corruptedData.createdAt) {
                    recoveredData.createdAt = corruptedData.createdAt;
                }
                if (corruptedData.totalPlayTime) {
                    recoveredData.totalPlayTime = corruptedData.totalPlayTime;
                }

                // 進行状況を可能な限り復元
                if (options.preserveProgress && corruptedData.chapterProgress) {
                    for (const [chapterId, chapterData] of Object.entries(corruptedData.chapterProgress)) {
                        if (chapterData && chapterData.currentStage > 0) {
                            recoveredData.chapterProgress[chapterId] = chapterData;
                        }
                    }
                }

                // キャラクター経験値を可能な限り復元
                if (corruptedData.characterExperience) {
                    for (const [characterId, expData] of Object.entries(corruptedData.characterExperience)) {
                        if (expData && expData.currentLevel > 0 && expData.currentExperience >= 0) {
                            recoveredData.characterExperience[characterId] = expData;
                        }
                    }
                }
            }

            // チェックサムを更新
            this.updateChecksum(recoveredData);

            return {
                success: true,
                data: recoveredData,
                message: 'Partial recovery completed'
            };

        } catch (error) {
            return {
                success: false,
                error: SaveDataError.DATA_CORRUPTED,
                message: 'Partial recovery failed',
                details: error
            };
        }
    }

    /**
     * バージョン互換性をチェック
     */
    private checkVersionCompatibility(version: SaveDataVersion): SaveDataResult<boolean> {
        const current = SaveDataManager.CURRENT_VERSION;

        // メジャーバージョンが異なる場合は非互換
        if (version.major !== current.major) {
            return {
                success: false,
                error: SaveDataError.VERSION_MISMATCH,
                message: `Incompatible save data version: ${version.major}.${version.minor}.${version.patch}`
            };
        }

        // マイナーバージョンが新しい場合は警告
        if (version.minor > current.minor) {
            console.warn('Save data is from a newer version, some features may not work correctly');
        }

        return {
            success: true,
            data: true
        };
    }

    /**
     * 全ステージ完了チェック
     */
    private checkAllStagesCompleted(chapterId: string): boolean {
        // TODO: 実際の章データから必要ステージ数を取得
        // 現在はダミー実装
        const requiredStages = 10; // 仮の値
        const chapterProgress = this.currentSaveData?.chapterProgress[chapterId];

        return chapterProgress ? chapterProgress.completedStages.length >= requiredStages : false;
    }

    /**
     * チェックサムを計算
     */
    private calculateChecksum(saveData: GameSaveData): string {
        // チェックサムフィールドを除外してハッシュを計算
        const dataForChecksum = { ...saveData };
        delete (dataForChecksum as any).checksum;

        const dataString = JSON.stringify(dataForChecksum);

        // 簡単なハッシュ関数（実際の実装ではより強力なアルゴリズムを使用）
        let hash = 0;
        for (let i = 0; i < dataString.length; i++) {
            const char = dataString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32bit整数に変換
        }

        return hash.toString(16);
    }

    /**
     * チェックサムを更新
     */
    private updateChecksum(saveData: GameSaveData): void {
        saveData.checksum = this.calculateChecksum(saveData);
    }

    /**
     * セーブIDを生成
     */
    private generateSaveId(): string {
        return `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 古いバックアップを削除
     */
    private cleanupOldBackups(slotId: number): void {
        try {
            if (this.config.storageType === 'localStorage') {
                const backupKeys = Object.keys(localStorage)
                    .filter(key => key.startsWith(`save_backup_${slotId}_`))
                    .sort()
                    .reverse();

                // 設定された数を超えるバックアップを削除
                for (let i = this.config.backupCount; i < backupKeys.length; i++) {
                    localStorage.removeItem(backupKeys[i]);
                }
            }

        } catch (error) {
            console.warn('Failed to cleanup old backups:', error);
        }
    }

    /**
     * オートセーブを設定
     */
    private setupAutoSave(): void {
        if (this.config.autoSaveInterval > 0) {
            this.autoSaveTimer = window.setInterval(() => {
                if (this.currentSaveData) {
                    this.saveToStorage(this.currentSaveData);
                }
            }, this.config.autoSaveInterval);
        }
    }
}