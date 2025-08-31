/**
 * JobPersistenceManager - 職業システムのデータ永続化管理
 * 
 * このクラスは職業システムとセーブデータシステムの統合を管理します:
 * - キャラクター職業データの保存・読み込み
 * - 薔薇の力データの永続化
 * - 職業変更履歴の保存
 * - ランクアップ履歴の記録
 * - データ整合性の保証
 * 
 * 要件: 6.5, 4.3, 8.3
 * 
 * @version 1.0.0
 * @author Trail of Thorns Development Team
 */

import {
    CharacterJobData,
    RoseEssenceData,
    RoseEssenceTransaction,
    JobHistoryEntry
} from '../../types/job';
import { SaveDataManager } from '../SaveDataManager';

/**
 * 職業システム永続化の結果型
 */
export interface JobPersistenceResult<T> {
    success: boolean;
    data?: T;
    error?: JobPersistenceError;
    message?: string;
    details?: any;
}

/**
 * 職業システム永続化のエラータイプ
 */
export enum JobPersistenceError {
    NOT_INITIALIZED = 'not_initialized',
    SAVE_SYSTEM_UNAVAILABLE = 'save_system_unavailable',
    SAVE_FAILED = 'save_failed',
    LOAD_FAILED = 'load_failed',
    VALIDATION_FAILED = 'validation_failed',
    DATA_CORRUPTION = 'data_corruption',
    RECOVERY_FAILED = 'recovery_failed',
    NO_BACKUP_AVAILABLE = 'no_backup_available',
    INITIALIZATION_FAILED = 'initialization_failed'
}

/**
 * 職業システム永続化設定
 */
export interface JobPersistenceConfig {
    autoSaveInterval: number;
    backupRetentionCount: number;
    enableAutoBackup: boolean;
    validateOnLoad: boolean;
    recoverFromBackup: boolean;
    logPersistenceOperations: boolean;
}

/**
 * JobPersistenceManagerクラス
 * 職業システムのデータ永続化を管理する
 */
export class JobPersistenceManager {
    private saveDataManager: SaveDataManager;
    private eventEmitter: any;
    private config: JobPersistenceConfig;
    private isInitialized: boolean = false;

    // デフォルト設定
    private static readonly DEFAULT_CONFIG: JobPersistenceConfig = {
        autoSaveInterval: 30000, // 30秒
        backupRetentionCount: 5,
        enableAutoBackup: true,
        validateOnLoad: true,
        recoverFromBackup: true,
        logPersistenceOperations: true
    };

    constructor(saveDataManager: SaveDataManager, config?: Partial<JobPersistenceConfig>) {
        this.saveDataManager = saveDataManager;
        this.config = { ...JobPersistenceManager.DEFAULT_CONFIG, ...config };

        // Use a simple EventEmitter implementation for Node.js compatibility
        this.eventEmitter = typeof Phaser !== 'undefined'
            ? new Phaser.Events.EventEmitter()
            : new (require('events').EventEmitter)();

        this.setupEventListeners();
    }

    /**
     * システム初期化
     * 要件: 6.5, 8.3
     */
    public async initialize(): Promise<JobPersistenceResult<boolean>> {
        try {
            // SaveDataManagerの初期化を確認
            const saveSystemResult = await this.saveDataManager.initialize();
            if (!saveSystemResult.success) {
                return {
                    success: false,
                    error: JobPersistenceError.SAVE_SYSTEM_UNAVAILABLE,
                    message: 'Save data manager initialization failed',
                    details: saveSystemResult
                };
            }

            this.isInitialized = true;

            if (this.config.logPersistenceOperations) {
                console.log('Job persistence manager initialized successfully');
            }

            this.eventEmitter.emit('job-persistence-initialized', {
                timestamp: Date.now()
            });

            return {
                success: true,
                data: true,
                message: 'Job persistence manager initialized successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: JobPersistenceError.INITIALIZATION_FAILED,
                message: 'Failed to initialize job persistence manager',
                details: error
            };
        }
    }

    /**
     * キャラクター職業データの保存・読み込み
     * 要件: 6.5
     */
    public async saveCharacterJobData(
        characterJobMap: Map<string, CharacterJobData>
    ): Promise<JobPersistenceResult<boolean>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: JobPersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            // セーブデータに統合
            const currentSaveData = this.saveDataManager.getCurrentSaveData();
            if (!currentSaveData) {
                return {
                    success: false,
                    error: JobPersistenceError.SAVE_FAILED,
                    message: 'No active save data'
                };
            }

            // 職業データをセーブデータ形式に変換
            const jobSaveData: Record<string, any> = {};
            for (const [characterId, jobData] of characterJobMap) {
                jobSaveData[characterId] = {
                    characterId: jobData.characterId,
                    currentJobId: jobData.currentJobId,
                    currentRank: jobData.currentRank,
                    jobHistory: jobData.jobHistory.map(entry => ({
                        jobId: entry.jobId,
                        rank: entry.rank,
                        changedAt: entry.changedAt.getTime(),
                        roseEssenceUsed: entry.roseEssenceUsed
                    })),
                    jobExperience: Object.fromEntries(jobData.jobExperience),
                    learnedJobSkills: Object.fromEntries(
                        Array.from(jobData.learnedJobSkills.entries()).map(([jobId, skills]) => [
                            jobId,
                            skills
                        ])
                    )
                };
            }

            // セーブデータを更新
            if (!currentSaveData.jobSystem) {
                currentSaveData.jobSystem = {};
            }
            currentSaveData.jobSystem.characterJobs = jobSaveData;
            currentSaveData.lastSavedAt = Date.now();

            // ストレージに保存
            const saveResult = this.saveDataManager.saveToSlot(0, currentSaveData);
            if (!saveResult.success) {
                return {
                    success: false,
                    error: JobPersistenceError.SAVE_FAILED,
                    message: 'Failed to save to storage',
                    details: saveResult
                };
            }

            if (this.config.logPersistenceOperations) {
                console.log(`Saved job data for ${characterJobMap.size} characters`);
            }

            this.eventEmitter.emit('job-data-saved', {
                characterCount: characterJobMap.size,
                timestamp: Date.now()
            });

            return {
                success: true,
                data: true,
                message: 'Character job data saved successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: JobPersistenceError.SAVE_FAILED,
                message: 'Failed to save character job data',
                details: error
            };
        }
    }

    /**
     * キャラクター職業データの読み込み
     * 要件: 6.5
     */
    public async loadCharacterJobData(): Promise<JobPersistenceResult<Map<string, CharacterJobData>>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: JobPersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            const currentSaveData = this.saveDataManager.getCurrentSaveData();
            if (!currentSaveData) {
                return {
                    success: false,
                    error: JobPersistenceError.LOAD_FAILED,
                    message: 'No save data loaded'
                };
            }

            const jobDataMap = new Map<string, CharacterJobData>();

            // セーブデータから職業データを復元
            if (currentSaveData.jobSystem?.characterJobs) {
                for (const [characterId, saveData] of Object.entries(currentSaveData.jobSystem.characterJobs)) {
                    const jobData: CharacterJobData = {
                        characterId: saveData.characterId,
                        currentJobId: saveData.currentJobId,
                        currentRank: saveData.currentRank,
                        jobHistory: saveData.jobHistory.map((entry: any) => ({
                            jobId: entry.jobId,
                            rank: entry.rank,
                            changedAt: new Date(entry.changedAt),
                            roseEssenceUsed: entry.roseEssenceUsed
                        })),
                        jobExperience: new Map(Object.entries(saveData.jobExperience || {})),
                        learnedJobSkills: new Map(
                            Object.entries(saveData.learnedJobSkills || {}).map(([jobId, skills]) => [
                                jobId,
                                skills as string[]
                            ])
                        )
                    };

                    jobDataMap.set(characterId, jobData);
                }
            }

            if (this.config.logPersistenceOperations) {
                console.log(`Loaded job data for ${jobDataMap.size} characters`);
            }

            this.eventEmitter.emit('job-data-loaded', {
                characterCount: jobDataMap.size,
                timestamp: Date.now()
            });

            return {
                success: true,
                data: jobDataMap,
                message: 'Character job data loaded successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: JobPersistenceError.LOAD_FAILED,
                message: 'Failed to load character job data',
                details: error
            };
        }
    }

    /**
     * 薔薇の力データの永続化
     * 要件: 4.3
     */
    public async saveRoseEssenceData(
        roseEssenceData: RoseEssenceData,
        transactions: RoseEssenceTransaction[]
    ): Promise<JobPersistenceResult<boolean>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: JobPersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            // セーブデータに統合
            const currentSaveData = this.saveDataManager.getCurrentSaveData();
            if (!currentSaveData) {
                return {
                    success: false,
                    error: JobPersistenceError.SAVE_FAILED,
                    message: 'No active save data'
                };
            }

            // 薔薇の力データをセーブデータ形式に変換
            if (!currentSaveData.jobSystem) {
                currentSaveData.jobSystem = {};
            }

            currentSaveData.jobSystem.roseEssenceData = {
                currentAmount: roseEssenceData.currentAmount,
                totalEarned: roseEssenceData.totalEarned,
                totalSpent: roseEssenceData.totalSpent,
                sources: roseEssenceData.sources,
                costs: roseEssenceData.costs
            };

            currentSaveData.jobSystem.roseEssenceTransactions = transactions.map(transaction => ({
                id: transaction.id,
                type: transaction.type,
                amount: transaction.amount,
                source: transaction.source,
                timestamp: transaction.timestamp.getTime(),
                characterId: transaction.characterId,
                description: transaction.description
            }));

            currentSaveData.lastSavedAt = Date.now();

            // ストレージに保存
            const saveResult = this.saveDataManager.saveToSlot(0, currentSaveData);
            if (!saveResult.success) {
                return {
                    success: false,
                    error: JobPersistenceError.SAVE_FAILED,
                    message: 'Failed to save to storage',
                    details: saveResult
                };
            }

            if (this.config.logPersistenceOperations) {
                console.log(`Saved rose essence data: ${roseEssenceData.currentAmount} essence, ${transactions.length} transactions`);
            }

            this.eventEmitter.emit('rose-essence-data-saved', {
                currentAmount: roseEssenceData.currentAmount,
                transactionCount: transactions.length,
                timestamp: Date.now()
            });

            return {
                success: true,
                data: true,
                message: 'Rose essence data saved successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: JobPersistenceError.SAVE_FAILED,
                message: 'Failed to save rose essence data',
                details: error
            };
        }
    }

    /**
     * 薔薇の力データの読み込み
     * 要件: 4.3
     */
    public async loadRoseEssenceData(): Promise<JobPersistenceResult<{
        roseEssenceData: RoseEssenceData;
        transactions: RoseEssenceTransaction[];
    }>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: JobPersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            const currentSaveData = this.saveDataManager.getCurrentSaveData();
            if (!currentSaveData) {
                return {
                    success: false,
                    error: JobPersistenceError.LOAD_FAILED,
                    message: 'No save data loaded'
                };
            }

            // デフォルトの薔薇の力データ
            let roseEssenceData: RoseEssenceData = this.createDefaultRoseEssenceData();
            let transactions: RoseEssenceTransaction[] = [];

            // セーブデータから薔薇の力データを復元
            if (currentSaveData.jobSystem?.roseEssenceData) {
                roseEssenceData = currentSaveData.jobSystem.roseEssenceData;
            }

            if (currentSaveData.jobSystem?.roseEssenceTransactions) {
                transactions = currentSaveData.jobSystem.roseEssenceTransactions.map((transaction: any) => ({
                    id: transaction.id,
                    type: transaction.type,
                    amount: transaction.amount,
                    source: transaction.source,
                    timestamp: new Date(transaction.timestamp),
                    characterId: transaction.characterId,
                    description: transaction.description
                }));
            }

            if (this.config.logPersistenceOperations) {
                console.log(`Loaded rose essence data: ${roseEssenceData.currentAmount} essence, ${transactions.length} transactions`);
            }

            this.eventEmitter.emit('rose-essence-data-loaded', {
                currentAmount: roseEssenceData.currentAmount,
                transactionCount: transactions.length,
                timestamp: Date.now()
            });

            return {
                success: true,
                data: { roseEssenceData, transactions },
                message: 'Rose essence data loaded successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: JobPersistenceError.LOAD_FAILED,
                message: 'Failed to load rose essence data',
                details: error
            };
        }
    }

    /**
     * 職業変更履歴の保存
     * 要件: 6.5
     */
    public async saveJobChangeHistory(
        characterId: string,
        historyEntry: JobHistoryEntry
    ): Promise<JobPersistenceResult<boolean>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: JobPersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            // 現在の職業データを読み込み
            const loadResult = await this.loadCharacterJobData();
            if (!loadResult.success || !loadResult.data) {
                return {
                    success: false,
                    error: JobPersistenceError.LOAD_FAILED,
                    message: 'Failed to load current job data'
                };
            }

            const jobDataMap = loadResult.data;
            const characterJobData = jobDataMap.get(characterId);

            if (!characterJobData) {
                return {
                    success: false,
                    error: JobPersistenceError.SAVE_FAILED,
                    message: `Character job data not found: ${characterId}`
                };
            }

            // 履歴エントリを追加
            characterJobData.jobHistory.push(historyEntry);

            // 履歴の長さを制限（最新の50件まで）
            if (characterJobData.jobHistory.length > 50) {
                characterJobData.jobHistory = characterJobData.jobHistory.slice(-50);
            }

            // 更新されたデータを保存
            const saveResult = await this.saveCharacterJobData(jobDataMap);
            if (!saveResult.success) {
                return saveResult;
            }

            if (this.config.logPersistenceOperations) {
                console.log(`Saved job change history for character: ${characterId}`);
            }

            this.eventEmitter.emit('job-history-saved', {
                characterId,
                historyEntry,
                timestamp: Date.now()
            });

            return {
                success: true,
                data: true,
                message: 'Job change history saved successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: JobPersistenceError.SAVE_FAILED,
                message: 'Failed to save job change history',
                details: error
            };
        }
    }

    /**
     * ランクアップ履歴の記録
     * 要件: 6.5
     */
    public async saveRankUpHistory(
        characterId: string,
        oldRank: number,
        newRank: number,
        roseEssenceUsed: number
    ): Promise<JobPersistenceResult<boolean>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: JobPersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            // 現在の職業データを読み込み
            const loadResult = await this.loadCharacterJobData();
            if (!loadResult.success || !loadResult.data) {
                return {
                    success: false,
                    error: JobPersistenceError.LOAD_FAILED,
                    message: 'Failed to load current job data'
                };
            }

            const jobDataMap = loadResult.data;
            const characterJobData = jobDataMap.get(characterId);

            if (!characterJobData) {
                return {
                    success: false,
                    error: JobPersistenceError.SAVE_FAILED,
                    message: `Character job data not found: ${characterId}`
                };
            }

            // ランクアップ履歴エントリを作成
            const historyEntry: JobHistoryEntry = {
                jobId: characterJobData.currentJobId,
                rank: oldRank,
                changedAt: new Date(),
                roseEssenceUsed: roseEssenceUsed
            };

            // 履歴エントリを追加
            characterJobData.jobHistory.push(historyEntry);

            // 現在のランクを更新
            characterJobData.currentRank = newRank;

            // 更新されたデータを保存
            const saveResult = await this.saveCharacterJobData(jobDataMap);
            if (!saveResult.success) {
                return saveResult;
            }

            if (this.config.logPersistenceOperations) {
                console.log(`Saved rank up history for character: ${characterId} (${oldRank} -> ${newRank})`);
            }

            this.eventEmitter.emit('rank-up-history-saved', {
                characterId,
                oldRank,
                newRank,
                roseEssenceUsed,
                timestamp: Date.now()
            });

            return {
                success: true,
                data: true,
                message: 'Rank up history saved successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: JobPersistenceError.SAVE_FAILED,
                message: 'Failed to save rank up history',
                details: error
            };
        }
    }

    /**
     * データ整合性の保証
     * 要件: 8.3
     */
    public async validateDataIntegrity(): Promise<JobPersistenceResult<boolean>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: JobPersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            const issues: string[] = [];

            // 職業データの整合性チェック
            const jobDataResult = await this.loadCharacterJobData();
            if (jobDataResult.success && jobDataResult.data) {
                const jobValidation = await this.validateJobData(jobDataResult.data);
                if (!jobValidation.success) {
                    issues.push(`Job data validation failed: ${jobValidation.message}`);
                }
            }

            // 薔薇の力データの整合性チェック
            const roseEssenceResult = await this.loadRoseEssenceData();
            if (roseEssenceResult.success && roseEssenceResult.data) {
                const roseEssenceValidation = await this.validateRoseEssenceData(roseEssenceResult.data);
                if (!roseEssenceValidation.success) {
                    issues.push(`Rose essence data validation failed: ${roseEssenceValidation.message}`);
                }
            }

            if (issues.length > 0) {
                return {
                    success: false,
                    error: JobPersistenceError.VALIDATION_FAILED,
                    message: 'Data integrity validation failed',
                    details: issues
                };
            }

            if (this.config.logPersistenceOperations) {
                console.log('Data integrity validation passed');
            }

            return {
                success: true,
                data: true,
                message: 'Data integrity validation passed'
            };

        } catch (error) {
            return {
                success: false,
                error: JobPersistenceError.VALIDATION_FAILED,
                message: 'Failed to validate data integrity',
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
        // イベントエミッターを破棄
        this.eventEmitter.removeAllListeners();

        this.isInitialized = false;

        if (this.config.logPersistenceOperations) {
            console.log('Job persistence manager destroyed');
        }
    }

    // =============================================================================
    // プライベートメソッド
    // =============================================================================

    /**
     * イベントリスナーを設定
     */
    private setupEventListeners(): void {
        // SaveDataManagerのイベントを監視
        this.saveDataManager.on('save-data-recovered', (data: any) => {
            this.eventEmitter.emit('job-persistence-recovery-detected', data);
        });

        this.saveDataManager.on('game-saved', (data: any) => {
            this.eventEmitter.emit('job-persistence-saved', data);
        });

        this.saveDataManager.on('game-loaded', (data: any) => {
            this.eventEmitter.emit('job-persistence-loaded', data);
        });
    }

    /**
     * 職業データを検証
     */
    private async validateJobData(
        jobDataMap: Map<string, CharacterJobData>
    ): Promise<JobPersistenceResult<boolean>> {
        try {
            const validationErrors: string[] = [];

            for (const [characterId, jobData] of jobDataMap) {
                // 基本的な値の検証
                if (!jobData.currentJobId) {
                    validationErrors.push(`Missing job ID for character ${characterId}`);
                }

                if (jobData.currentRank < 1) {
                    validationErrors.push(`Invalid rank for character ${characterId}: ${jobData.currentRank}`);
                }

                // 履歴の検証
                for (const historyEntry of jobData.jobHistory) {
                    if (!historyEntry.jobId) {
                        validationErrors.push(`Invalid job history entry for character ${characterId}`);
                    }

                    if (historyEntry.rank < 1) {
                        validationErrors.push(`Invalid rank in history for character ${characterId}: ${historyEntry.rank}`);
                    }

                    if (historyEntry.roseEssenceUsed < 0) {
                        validationErrors.push(`Invalid rose essence used in history for character ${characterId}: ${historyEntry.roseEssenceUsed}`);
                    }
                }
            }

            if (validationErrors.length > 0) {
                return {
                    success: false,
                    error: JobPersistenceError.VALIDATION_FAILED,
                    message: 'Job data validation failed',
                    details: validationErrors
                };
            }

            return {
                success: true,
                data: true,
                message: 'Job data validation passed'
            };

        } catch (error) {
            return {
                success: false,
                error: JobPersistenceError.VALIDATION_FAILED,
                message: 'Failed to validate job data',
                details: error
            };
        }
    }

    /**
     * 薔薇の力データを検証
     */
    private async validateRoseEssenceData(data: {
        roseEssenceData: RoseEssenceData;
        transactions: RoseEssenceTransaction[];
    }): Promise<JobPersistenceResult<boolean>> {
        try {
            const validationErrors: string[] = [];
            const { roseEssenceData, transactions } = data;

            // 基本的な値の検証
            if (roseEssenceData.currentAmount < 0) {
                validationErrors.push(`Invalid current amount: ${roseEssenceData.currentAmount}`);
            }

            if (roseEssenceData.totalEarned < 0) {
                validationErrors.push(`Invalid total earned: ${roseEssenceData.totalEarned}`);
            }

            if (roseEssenceData.totalSpent < 0) {
                validationErrors.push(`Invalid total spent: ${roseEssenceData.totalSpent}`);
            }

            // 取引履歴の検証
            for (const transaction of transactions) {
                if (!transaction.id) {
                    validationErrors.push('Transaction missing ID');
                }

                if (transaction.amount <= 0) {
                    validationErrors.push(`Invalid transaction amount: ${transaction.amount}`);
                }

                if (!['gain', 'spend'].includes(transaction.type)) {
                    validationErrors.push(`Invalid transaction type: ${transaction.type}`);
                }
            }

            if (validationErrors.length > 0) {
                return {
                    success: false,
                    error: JobPersistenceError.VALIDATION_FAILED,
                    message: 'Rose essence data validation failed',
                    details: validationErrors
                };
            }

            return {
                success: true,
                data: true,
                message: 'Rose essence data validation passed'
            };

        } catch (error) {
            return {
                success: false,
                error: JobPersistenceError.VALIDATION_FAILED,
                message: 'Failed to validate rose essence data',
                details: error
            };
        }
    }

    /**
     * デフォルト薔薇の力データを作成
     */
    private createDefaultRoseEssenceData(): RoseEssenceData {
        return {
            currentAmount: 0,
            totalEarned: 0,
            totalSpent: 0,
            sources: {},
            costs: {
                rankUp: {
                    warrior: { 2: 10, 3: 20, 4: 40, 5: 80 },
                    mage: { 2: 10, 3: 20, 4: 40, 5: 80 },
                    archer: { 2: 10, 3: 20, 4: 40, 5: 80 },
                    healer: { 2: 10, 3: 20, 4: 40, 5: 80 },
                    thief: { 2: 10, 3: 20, 4: 40, 5: 80 },
                    special: { 2: 15, 3: 30, 4: 60, 5: 120 }
                },
                jobChange: 5,
                skillUnlock: 3
            }
        };
    }
}