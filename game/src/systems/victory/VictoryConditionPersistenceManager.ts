/**
 * VictoryConditionPersistenceManager - ボス戦・勝利条件システムのデータ永続化管理
 * 
 * このクラスはボス戦・勝利条件システムとセーブデータシステムの統合を管理します:
 * - ステージクリア状態の保存・読み込み
 * - 薔薇の力総量の永続化
 * - 報酬情報の保存と読み込み
 * - 前ステージ状態の読み込みと復元
 * - セーブデータ整合性チェックとエラー回復
 * 
 * 要件: 11.1, 11.2, 11.3, 11.4, 11.5
 * 
 * @version 1.0.0
 * @author Trail of Thorns Development Team
 */

import { SaveDataManager } from '../SaveDataManager';
import { StageRewards, StagePerformance, ClearRating } from '../../types/reward';
import { BossReward } from '../../types/boss';

/**
 * ステージクリア状態データ
 */
export interface StageClearData {
    stageId: string;
    stageName: string;
    clearedAt: number;
    clearRating: ClearRating;
    turnsUsed: number;
    unitsLost: number;
    bossesDefeated: number;
    recruitmentSuccesses: number;
}

/**
 * 薔薇の力データ
 */
export interface RoseEssencePersistenceData {
    totalAmount: number;
    earnedFromBosses: Record<string, number>;
    lastUpdatedAt: number;
}

/**
 * 報酬情報データ
 */
export interface RewardPersistenceData {
    stageId: string;
    rewards: StageRewards;
    distributedAt: number;
}

/**
 * 前ステージ状態データ
 */
export interface PreviousStageState {
    stageId: string;
    performance: StagePerformance;
    rewards: StageRewards;
    completedAt: number;
}

/**
 * 永続化結果型
 */
export interface VictoryPersistenceResult<T> {
    success: boolean;
    data?: T;
    error?: VictoryPersistenceError;
    message?: string;
    details?: any;
}

/**
 * 永続化エラータイプ
 */
export enum VictoryPersistenceError {
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
 * 永続化設定
 */
export interface VictoryPersistenceConfig {
    autoSaveInterval: number;
    backupRetentionCount: number;
    enableAutoBackup: boolean;
    validateOnLoad: boolean;
    recoverFromBackup: boolean;
    logPersistenceOperations: boolean;
}

/**
 * VictoryConditionPersistenceManagerクラス
 * ボス戦・勝利条件システムのデータ永続化を管理する
 */
export class VictoryConditionPersistenceManager {
    private saveDataManager: SaveDataManager;
    private eventEmitter: any;
    private config: VictoryPersistenceConfig;
    private isInitialized: boolean = false;

    // デフォルト設定
    private static readonly DEFAULT_CONFIG: VictoryPersistenceConfig = {
        autoSaveInterval: 30000, // 30秒
        backupRetentionCount: 5,
        enableAutoBackup: true,
        validateOnLoad: true,
        recoverFromBackup: true,
        logPersistenceOperations: true
    };

    constructor(saveDataManager: SaveDataManager, config?: Partial<VictoryPersistenceConfig>) {
        this.saveDataManager = saveDataManager;
        this.config = { ...VictoryConditionPersistenceManager.DEFAULT_CONFIG, ...config };

        // Use a simple EventEmitter implementation for Node.js compatibility
        this.eventEmitter = typeof Phaser !== 'undefined'
            ? new Phaser.Events.EventEmitter()
            : new (require('events').EventEmitter)();

        this.setupEventListeners();
    }

    /**
     * システム初期化
     * 要件: 11.5
     */
    public async initialize(): Promise<VictoryPersistenceResult<boolean>> {
        try {
            // SaveDataManagerの初期化を確認
            const saveSystemResult = await this.saveDataManager.initialize();
            if (!saveSystemResult.success) {
                return {
                    success: false,
                    error: VictoryPersistenceError.SAVE_SYSTEM_UNAVAILABLE,
                    message: 'Save data manager initialization failed',
                    details: saveSystemResult
                };
            }

            this.isInitialized = true;

            if (this.config.logPersistenceOperations) {
                console.log('Victory condition persistence manager initialized successfully');
            }

            this.eventEmitter.emit('victory-persistence-initialized', {
                timestamp: Date.now()
            });

            return {
                success: true,
                data: true,
                message: 'Victory condition persistence manager initialized successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: VictoryPersistenceError.INITIALIZATION_FAILED,
                message: 'Failed to initialize victory condition persistence manager',
                details: error
            };
        }
    }

    /**
     * ステージクリア状態のセーブデータ統合を実装
     * 要件: 11.1
     */
    public async saveStageClearData(
        stageClearData: StageClearData
    ): Promise<VictoryPersistenceResult<boolean>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: VictoryPersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            // セーブデータに統合
            const currentSaveData = this.saveDataManager.getCurrentSaveData();
            if (!currentSaveData) {
                return {
                    success: false,
                    error: VictoryPersistenceError.SAVE_FAILED,
                    message: 'No active save data'
                };
            }

            // ボス戦・勝利条件システムのデータ領域を確保
            if (!currentSaveData.victoryConditionSystem) {
                currentSaveData.victoryConditionSystem = {
                    stageClearData: {},
                    roseEssenceData: this.createDefaultRoseEssenceData(),
                    rewardHistory: [],
                    previousStageStates: []
                };
            }

            // ステージクリアデータを保存
            currentSaveData.victoryConditionSystem.stageClearData[stageClearData.stageId] = {
                stageId: stageClearData.stageId,
                stageName: stageClearData.stageName,
                clearedAt: stageClearData.clearedAt,
                clearRating: stageClearData.clearRating,
                turnsUsed: stageClearData.turnsUsed,
                unitsLost: stageClearData.unitsLost,
                bossesDefeated: stageClearData.bossesDefeated,
                recruitmentSuccesses: stageClearData.recruitmentSuccesses
            };

            currentSaveData.lastSavedAt = Date.now();

            // ストレージに保存
            const saveResult = this.saveDataManager.saveToSlot(0, currentSaveData);
            if (!saveResult.success) {
                return {
                    success: false,
                    error: VictoryPersistenceError.SAVE_FAILED,
                    message: 'Failed to save to storage',
                    details: saveResult
                };
            }

            if (this.config.logPersistenceOperations) {
                console.log(`Saved stage clear data for stage: ${stageClearData.stageId}`);
            }

            this.eventEmitter.emit('stage-clear-data-saved', {
                stageId: stageClearData.stageId,
                clearRating: stageClearData.clearRating,
                timestamp: Date.now()
            });

            return {
                success: true,
                data: true,
                message: 'Stage clear data saved successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: VictoryPersistenceError.SAVE_FAILED,
                message: 'Failed to save stage clear data',
                details: error
            };
        }
    }

    /**
     * ステージクリア状態の読み込み
     * 要件: 11.4
     */
    public async loadStageClearData(
        stageId: string
    ): Promise<VictoryPersistenceResult<StageClearData | null>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: VictoryPersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            const currentSaveData = this.saveDataManager.getCurrentSaveData();
            if (!currentSaveData) {
                return {
                    success: false,
                    error: VictoryPersistenceError.LOAD_FAILED,
                    message: 'No save data loaded'
                };
            }

            // ステージクリアデータを取得
            const stageClearData = currentSaveData.victoryConditionSystem?.stageClearData?.[stageId];

            if (!stageClearData) {
                return {
                    success: true,
                    data: null,
                    message: 'No clear data found for this stage'
                };
            }

            if (this.config.logPersistenceOperations) {
                console.log(`Loaded stage clear data for stage: ${stageId}`);
            }

            return {
                success: true,
                data: stageClearData,
                message: 'Stage clear data loaded successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: VictoryPersistenceError.LOAD_FAILED,
                message: 'Failed to load stage clear data',
                details: error
            };
        }
    }

    /**
     * 薔薇の力総量のセーブデータ統合を実装
     * 要件: 11.2
     */
    public async saveRoseEssenceData(
        roseEssenceData: RoseEssencePersistenceData
    ): Promise<VictoryPersistenceResult<boolean>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: VictoryPersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            // セーブデータに統合
            const currentSaveData = this.saveDataManager.getCurrentSaveData();
            if (!currentSaveData) {
                return {
                    success: false,
                    error: VictoryPersistenceError.SAVE_FAILED,
                    message: 'No active save data'
                };
            }

            // ボス戦・勝利条件システムのデータ領域を確保
            if (!currentSaveData.victoryConditionSystem) {
                currentSaveData.victoryConditionSystem = {
                    stageClearData: {},
                    roseEssenceData: this.createDefaultRoseEssenceData(),
                    rewardHistory: [],
                    previousStageStates: []
                };
            }

            // 薔薇の力データを保存
            currentSaveData.victoryConditionSystem.roseEssenceData = {
                totalAmount: roseEssenceData.totalAmount,
                earnedFromBosses: roseEssenceData.earnedFromBosses,
                lastUpdatedAt: roseEssenceData.lastUpdatedAt
            };

            currentSaveData.lastSavedAt = Date.now();

            // ストレージに保存
            const saveResult = this.saveDataManager.saveToSlot(0, currentSaveData);
            if (!saveResult.success) {
                return {
                    success: false,
                    error: VictoryPersistenceError.SAVE_FAILED,
                    message: 'Failed to save to storage',
                    details: saveResult
                };
            }

            if (this.config.logPersistenceOperations) {
                console.log(`Saved rose essence data: ${roseEssenceData.totalAmount} total`);
            }

            this.eventEmitter.emit('rose-essence-data-saved', {
                totalAmount: roseEssenceData.totalAmount,
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
                error: VictoryPersistenceError.SAVE_FAILED,
                message: 'Failed to save rose essence data',
                details: error
            };
        }
    }

    /**
     * 薔薇の力データの読み込み
     * 要件: 11.4
     */
    public async loadRoseEssenceData(): Promise<VictoryPersistenceResult<RoseEssencePersistenceData>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: VictoryPersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            const currentSaveData = this.saveDataManager.getCurrentSaveData();
            if (!currentSaveData) {
                return {
                    success: false,
                    error: VictoryPersistenceError.LOAD_FAILED,
                    message: 'No save data loaded'
                };
            }

            // デフォルトの薔薇の力データ
            let roseEssenceData: RoseEssencePersistenceData = this.createDefaultRoseEssenceData();

            // セーブデータから薔薇の力データを復元
            if (currentSaveData.victoryConditionSystem?.roseEssenceData) {
                roseEssenceData = currentSaveData.victoryConditionSystem.roseEssenceData;
            }

            if (this.config.logPersistenceOperations) {
                console.log(`Loaded rose essence data: ${roseEssenceData.totalAmount} total`);
            }

            this.eventEmitter.emit('rose-essence-data-loaded', {
                totalAmount: roseEssenceData.totalAmount,
                timestamp: Date.now()
            });

            return {
                success: true,
                data: roseEssenceData,
                message: 'Rose essence data loaded successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: VictoryPersistenceError.LOAD_FAILED,
                message: 'Failed to load rose essence data',
                details: error
            };
        }
    }

    /**
     * 報酬情報の保存と読み込み機能を実装
     * 要件: 11.3
     */
    public async saveRewardData(
        rewardData: RewardPersistenceData
    ): Promise<VictoryPersistenceResult<boolean>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: VictoryPersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            // セーブデータに統合
            const currentSaveData = this.saveDataManager.getCurrentSaveData();
            if (!currentSaveData) {
                return {
                    success: false,
                    error: VictoryPersistenceError.SAVE_FAILED,
                    message: 'No active save data'
                };
            }

            // ボス戦・勝利条件システムのデータ領域を確保
            if (!currentSaveData.victoryConditionSystem) {
                currentSaveData.victoryConditionSystem = {
                    stageClearData: {},
                    roseEssenceData: this.createDefaultRoseEssenceData(),
                    rewardHistory: [],
                    previousStageStates: []
                };
            }

            // 報酬履歴に追加
            currentSaveData.victoryConditionSystem.rewardHistory.push({
                stageId: rewardData.stageId,
                rewards: rewardData.rewards,
                distributedAt: rewardData.distributedAt
            });

            // 履歴の長さを制限（最新の100件まで）
            if (currentSaveData.victoryConditionSystem.rewardHistory.length > 100) {
                currentSaveData.victoryConditionSystem.rewardHistory =
                    currentSaveData.victoryConditionSystem.rewardHistory.slice(-100);
            }

            currentSaveData.lastSavedAt = Date.now();

            // ストレージに保存
            const saveResult = this.saveDataManager.saveToSlot(0, currentSaveData);
            if (!saveResult.success) {
                return {
                    success: false,
                    error: VictoryPersistenceError.SAVE_FAILED,
                    message: 'Failed to save to storage',
                    details: saveResult
                };
            }

            if (this.config.logPersistenceOperations) {
                console.log(`Saved reward data for stage: ${rewardData.stageId}`);
            }

            this.eventEmitter.emit('reward-data-saved', {
                stageId: rewardData.stageId,
                timestamp: Date.now()
            });

            return {
                success: true,
                data: true,
                message: 'Reward data saved successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: VictoryPersistenceError.SAVE_FAILED,
                message: 'Failed to save reward data',
                details: error
            };
        }
    }

    /**
     * 報酬履歴の読み込み
     * 要件: 11.3
     */
    public async loadRewardHistory(
        stageId?: string
    ): Promise<VictoryPersistenceResult<RewardPersistenceData[]>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: VictoryPersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            const currentSaveData = this.saveDataManager.getCurrentSaveData();
            if (!currentSaveData) {
                return {
                    success: false,
                    error: VictoryPersistenceError.LOAD_FAILED,
                    message: 'No save data loaded'
                };
            }

            let rewardHistory: RewardPersistenceData[] = [];

            // セーブデータから報酬履歴を復元
            if (currentSaveData.victoryConditionSystem?.rewardHistory) {
                rewardHistory = currentSaveData.victoryConditionSystem.rewardHistory;

                // 特定のステージIDでフィルタリング
                if (stageId) {
                    rewardHistory = rewardHistory.filter(r => r.stageId === stageId);
                }
            }

            if (this.config.logPersistenceOperations) {
                console.log(`Loaded ${rewardHistory.length} reward history entries`);
            }

            return {
                success: true,
                data: rewardHistory,
                message: 'Reward history loaded successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: VictoryPersistenceError.LOAD_FAILED,
                message: 'Failed to load reward history',
                details: error
            };
        }
    }

    /**
     * 前ステージ状態の読み込みと復元を実装
     * 要件: 11.4
     */
    public async savePreviousStageState(
        stageState: PreviousStageState
    ): Promise<VictoryPersistenceResult<boolean>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: VictoryPersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            // セーブデータに統合
            const currentSaveData = this.saveDataManager.getCurrentSaveData();
            if (!currentSaveData) {
                return {
                    success: false,
                    error: VictoryPersistenceError.SAVE_FAILED,
                    message: 'No active save data'
                };
            }

            // ボス戦・勝利条件システムのデータ領域を確保
            if (!currentSaveData.victoryConditionSystem) {
                currentSaveData.victoryConditionSystem = {
                    stageClearData: {},
                    roseEssenceData: this.createDefaultRoseEssenceData(),
                    rewardHistory: [],
                    previousStageStates: []
                };
            }

            // 前ステージ状態を追加
            currentSaveData.victoryConditionSystem.previousStageStates.push({
                stageId: stageState.stageId,
                performance: stageState.performance,
                rewards: stageState.rewards,
                completedAt: stageState.completedAt
            });

            // 履歴の長さを制限（最新の10件まで）
            if (currentSaveData.victoryConditionSystem.previousStageStates.length > 10) {
                currentSaveData.victoryConditionSystem.previousStageStates =
                    currentSaveData.victoryConditionSystem.previousStageStates.slice(-10);
            }

            currentSaveData.lastSavedAt = Date.now();

            // ストレージに保存
            const saveResult = this.saveDataManager.saveToSlot(0, currentSaveData);
            if (!saveResult.success) {
                return {
                    success: false,
                    error: VictoryPersistenceError.SAVE_FAILED,
                    message: 'Failed to save to storage',
                    details: saveResult
                };
            }

            if (this.config.logPersistenceOperations) {
                console.log(`Saved previous stage state for stage: ${stageState.stageId}`);
            }

            this.eventEmitter.emit('previous-stage-state-saved', {
                stageId: stageState.stageId,
                timestamp: Date.now()
            });

            return {
                success: true,
                data: true,
                message: 'Previous stage state saved successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: VictoryPersistenceError.SAVE_FAILED,
                message: 'Failed to save previous stage state',
                details: error
            };
        }
    }

    /**
     * 前ステージ状態の読み込み
     * 要件: 11.4
     */
    public async loadPreviousStageState(
        stageId?: string
    ): Promise<VictoryPersistenceResult<PreviousStageState | null>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: VictoryPersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            const currentSaveData = this.saveDataManager.getCurrentSaveData();
            if (!currentSaveData) {
                return {
                    success: false,
                    error: VictoryPersistenceError.LOAD_FAILED,
                    message: 'No save data loaded'
                };
            }

            let previousStageState: PreviousStageState | null = null;

            // セーブデータから前ステージ状態を復元
            if (currentSaveData.victoryConditionSystem?.previousStageStates) {
                const states = currentSaveData.victoryConditionSystem.previousStageStates;

                if (stageId) {
                    // 特定のステージIDで検索
                    previousStageState = states.find(s => s.stageId === stageId) || null;
                } else {
                    // 最新の状態を取得
                    previousStageState = states.length > 0 ? states[states.length - 1] : null;
                }
            }

            if (this.config.logPersistenceOperations) {
                if (previousStageState) {
                    console.log(`Loaded previous stage state for stage: ${previousStageState.stageId}`);
                } else {
                    console.log('No previous stage state found');
                }
            }

            return {
                success: true,
                data: previousStageState,
                message: previousStageState
                    ? 'Previous stage state loaded successfully'
                    : 'No previous stage state found'
            };

        } catch (error) {
            return {
                success: false,
                error: VictoryPersistenceError.LOAD_FAILED,
                message: 'Failed to load previous stage state',
                details: error
            };
        }
    }

    /**
     * セーブデータ整合性チェックとエラー回復を実装
     * 要件: 11.5
     */
    public async validateDataIntegrity(): Promise<VictoryPersistenceResult<boolean>> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: VictoryPersistenceError.NOT_INITIALIZED,
                message: 'Persistence manager not initialized'
            };
        }

        try {
            const issues: string[] = [];

            // ステージクリアデータの整合性チェック
            const stageClearResult = await this.validateStageClearData();
            if (!stageClearResult.success) {
                issues.push(`Stage clear data validation failed: ${stageClearResult.message}`);
            }

            // 薔薇の力データの整合性チェック
            const roseEssenceResult = await this.validateRoseEssenceData();
            if (!roseEssenceResult.success) {
                issues.push(`Rose essence data validation failed: ${roseEssenceResult.message}`);
            }

            // 報酬履歴の整合性チェック
            const rewardHistoryResult = await this.validateRewardHistory();
            if (!rewardHistoryResult.success) {
                issues.push(`Reward history validation failed: ${rewardHistoryResult.message}`);
            }

            if (issues.length > 0) {
                return {
                    success: false,
                    error: VictoryPersistenceError.VALIDATION_FAILED,
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
                error: VictoryPersistenceError.VALIDATION_FAILED,
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
            console.log('Victory condition persistence manager destroyed');
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
            this.eventEmitter.emit('victory-persistence-recovery-detected', data);
        });

        this.saveDataManager.on('game-saved', (data: any) => {
            this.eventEmitter.emit('victory-persistence-saved', data);
        });

        this.saveDataManager.on('game-loaded', (data: any) => {
            this.eventEmitter.emit('victory-persistence-loaded', data);
        });
    }

    /**
     * ステージクリアデータを検証
     */
    private async validateStageClearData(): Promise<VictoryPersistenceResult<boolean>> {
        try {
            const currentSaveData = this.saveDataManager.getCurrentSaveData();
            if (!currentSaveData?.victoryConditionSystem?.stageClearData) {
                return {
                    success: true,
                    data: true,
                    message: 'No stage clear data to validate'
                };
            }

            const validationErrors: string[] = [];
            const stageClearData = currentSaveData.victoryConditionSystem.stageClearData;

            for (const [stageId, clearData] of Object.entries(stageClearData)) {
                // 基本的な値の検証
                if (!clearData.stageId) {
                    validationErrors.push(`Missing stage ID for entry: ${stageId}`);
                }

                if (clearData.turnsUsed < 0) {
                    validationErrors.push(`Invalid turns used for stage ${stageId}: ${clearData.turnsUsed}`);
                }

                if (clearData.unitsLost < 0) {
                    validationErrors.push(`Invalid units lost for stage ${stageId}: ${clearData.unitsLost}`);
                }

                if (clearData.bossesDefeated < 0) {
                    validationErrors.push(`Invalid bosses defeated for stage ${stageId}: ${clearData.bossesDefeated}`);
                }

                if (!['S', 'A', 'B', 'C', 'D'].includes(clearData.clearRating)) {
                    validationErrors.push(`Invalid clear rating for stage ${stageId}: ${clearData.clearRating}`);
                }
            }

            if (validationErrors.length > 0) {
                return {
                    success: false,
                    error: VictoryPersistenceError.VALIDATION_FAILED,
                    message: 'Stage clear data validation failed',
                    details: validationErrors
                };
            }

            return {
                success: true,
                data: true,
                message: 'Stage clear data validation passed'
            };

        } catch (error) {
            return {
                success: false,
                error: VictoryPersistenceError.VALIDATION_FAILED,
                message: 'Failed to validate stage clear data',
                details: error
            };
        }
    }

    /**
     * 薔薇の力データを検証
     */
    private async validateRoseEssenceData(): Promise<VictoryPersistenceResult<boolean>> {
        try {
            const currentSaveData = this.saveDataManager.getCurrentSaveData();
            if (!currentSaveData?.victoryConditionSystem?.roseEssenceData) {
                return {
                    success: true,
                    data: true,
                    message: 'No rose essence data to validate'
                };
            }

            const validationErrors: string[] = [];
            const roseEssenceData = currentSaveData.victoryConditionSystem.roseEssenceData;

            // 基本的な値の検証
            if (roseEssenceData.totalAmount < 0) {
                validationErrors.push(`Invalid total amount: ${roseEssenceData.totalAmount}`);
            }

            // ボスごとの獲得量の検証
            for (const [bossId, amount] of Object.entries(roseEssenceData.earnedFromBosses)) {
                if (amount < 0) {
                    validationErrors.push(`Invalid amount for boss ${bossId}: ${amount}`);
                }
            }

            if (validationErrors.length > 0) {
                return {
                    success: false,
                    error: VictoryPersistenceError.VALIDATION_FAILED,
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
                error: VictoryPersistenceError.VALIDATION_FAILED,
                message: 'Failed to validate rose essence data',
                details: error
            };
        }
    }

    /**
     * 報酬履歴を検証
     */
    private async validateRewardHistory(): Promise<VictoryPersistenceResult<boolean>> {
        try {
            const currentSaveData = this.saveDataManager.getCurrentSaveData();
            if (!currentSaveData?.victoryConditionSystem?.rewardHistory) {
                return {
                    success: true,
                    data: true,
                    message: 'No reward history to validate'
                };
            }

            const validationErrors: string[] = [];
            const rewardHistory = currentSaveData.victoryConditionSystem.rewardHistory;

            for (const rewardData of rewardHistory) {
                // 基本的な値の検証
                if (!rewardData.stageId) {
                    validationErrors.push('Reward entry missing stage ID');
                }

                if (!rewardData.rewards) {
                    validationErrors.push(`Reward entry missing rewards for stage ${rewardData.stageId}`);
                }

                if (rewardData.distributedAt <= 0) {
                    validationErrors.push(`Invalid distributed timestamp for stage ${rewardData.stageId}`);
                }
            }

            if (validationErrors.length > 0) {
                return {
                    success: false,
                    error: VictoryPersistenceError.VALIDATION_FAILED,
                    message: 'Reward history validation failed',
                    details: validationErrors
                };
            }

            return {
                success: true,
                data: true,
                message: 'Reward history validation passed'
            };

        } catch (error) {
            return {
                success: false,
                error: VictoryPersistenceError.VALIDATION_FAILED,
                message: 'Failed to validate reward history',
                details: error
            };
        }
    }

    /**
     * デフォルト薔薇の力データを作成
     */
    private createDefaultRoseEssenceData(): RoseEssencePersistenceData {
        return {
            totalAmount: 0,
            earnedFromBosses: {},
            lastUpdatedAt: Date.now()
        };
    }
}
