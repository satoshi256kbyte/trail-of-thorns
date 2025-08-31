/**
 * JobSystem - 職業・ランクアップシステムのメインコントローラー
 * 
 * このクラスは職業システム全体の初期化、各サブシステムの統合・調整、
 * 公開APIの提供、システム間の連携処理、エラーハンドリングの統合を行います。
 * 要件1.1-1.5に対応した機能を提供します。
 */

import {
    JobData,
    RoseEssenceData,
    JobChangeResult,
    RankUpResult,
    RankUpAvailability,
    CharacterRankUpInfo,
    JobSystemError,
    JobSystemContext,
    JobCategory
} from '../../types/job';
import { Unit } from '../../types/gameplay';
import { JobManager } from './JobManager';
import { RoseEssenceManager } from './RoseEssenceManager';
import { RankUpManager } from './RankUpManager';
import { JobAnimator, JobAnimatorConfig } from './JobAnimator';
import { JobPersistenceManager } from './JobPersistenceManager';
import { JobPerformanceManager } from './JobPerformanceManager';
import { JobMemoryMonitor } from './JobMemoryMonitor';
import { JobCacheOptimizer } from './JobCacheOptimizer';
import { JobUIOptimizer } from './JobUIOptimizer';
import { Job } from './Job';

/**
 * 職業システム設定
 */
export interface JobSystemConfig {
    enableAnimations: boolean;
    enableSoundEffects: boolean;
    animationSpeed: number;
    debugMode: boolean;
    autoSaveEnabled: boolean;
    maxConcurrentAnimations: number;
    // パフォーマンス最適化設定
    enablePerformanceOptimization: boolean;
    enableMemoryMonitoring: boolean;
    enableCacheOptimization: boolean;
    enableUIOptimization: boolean;
    maxCacheSize: number;
    memoryWarningThreshold: number;
}

/**
 * 職業システム統計情報
 */
export interface JobSystemStats {
    totalJobs: number;
    totalCharacters: number;
    totalRoseEssence: number;
    averageJobRank: number;
    rankUpCandidates: number;
    systemUptime: number;
}

/**
 * JobSystemクラス - 職業・ランクアップシステムのメインコントローラー
 */
export class JobSystem extends Phaser.Events.EventEmitter {
    private jobManager: JobManager;
    private roseEssenceManager: RoseEssenceManager;
    private rankUpManager: RankUpManager;
    private jobAnimator?: JobAnimator;
    private persistenceManager?: JobPersistenceManager;

    // パフォーマンス最適化コンポーネント
    private performanceManager?: JobPerformanceManager;
    private memoryMonitor?: JobMemoryMonitor;
    private cacheOptimizer?: JobCacheOptimizer;
    private uiOptimizer?: JobUIOptimizer;

    private config: JobSystemConfig;
    private isInitialized: boolean = false;
    private startTime: number;

    // 外部システム参照
    private characterManager?: any;
    private skillSystem?: any;
    private battleSystem?: any;
    private saveDataManager?: any;

    private static readonly DEFAULT_CONFIG: JobSystemConfig = {
        enableAnimations: true,
        enableSoundEffects: true,
        animationSpeed: 1.0,
        debugMode: false,
        autoSaveEnabled: true,
        maxConcurrentAnimations: 3,
        // パフォーマンス最適化設定
        enablePerformanceOptimization: true,
        enableMemoryMonitoring: true,
        enableCacheOptimization: true,
        enableUIOptimization: true,
        maxCacheSize: 500,
        memoryWarningThreshold: 0.8,
    };

    /**
     * JobSystemインスタンスを作成
     * @param config システム設定
     */
    constructor(config?: Partial<JobSystemConfig>) {
        super();

        this.config = { ...JobSystem.DEFAULT_CONFIG, ...config };
        this.startTime = Date.now();

        // サブシステムを初期化
        this.jobManager = new JobManager();
        this.roseEssenceManager = new RoseEssenceManager();
        this.rankUpManager = new RankUpManager(this.jobManager, this.roseEssenceManager);

        // パフォーマンス最適化コンポーネントを初期化
        this.initializePerformanceOptimization();

        this.setupEventHandlers();
    }

    /**
     * 職業システムを初期化
     * 要件1.1: 職業システム基盤の初期化
     * 
     * @param scene Phaserシーン（アニメーション用）
     * @param jobData 職業データ
     * @param roseEssenceData 薔薇の力データ
     */
    public async initialize(
        scene?: Phaser.Scene,
        jobData?: Map<string, JobData>,
        roseEssenceData?: RoseEssenceData
    ): Promise<void> {
        try {
            if (this.isInitialized) {
                console.warn('JobSystemは既に初期化されています');
                return;
            }

            // JobAnimatorを初期化（シーンが提供された場合）
            if (scene && this.config.enableAnimations) {
                const animatorConfig: Partial<JobAnimatorConfig> = {
                    enableSoundEffects: this.config.enableSoundEffects,
                    animationSpeed: this.config.animationSpeed,
                    enableDebugDisplay: this.config.debugMode,
                    maxConcurrentEffects: this.config.maxConcurrentAnimations,
                };

                this.jobAnimator = new JobAnimator(scene, animatorConfig);
                this.rankUpManager.setJobAnimator(this.jobAnimator);

                // JobAnimatorのイベントハンドラーを設定
                this.setupAnimatorEventHandlers();
            }

            // 職業データを読み込み
            if (jobData) {
                await this.loadJobData(jobData);
            }

            // 薔薇の力データを初期化
            if (roseEssenceData) {
                this.roseEssenceManager.initialize(roseEssenceData);
            }

            // 永続化マネージャーを初期化
            if (this.saveDataManager) {
                this.persistenceManager = new JobPersistenceManager(this.saveDataManager);
                await this.persistenceManager.initialize();

                // 既存データを読み込み
                await this.loadPersistedData();
            }

            this.isInitialized = true;

            this.emit('system_initialized', {
                hasAnimator: !!this.jobAnimator,
                jobCount: this.jobManager.getAllJobs().size,
                config: this.config,
            });

            if (this.config.debugMode) {
                console.log('JobSystem初期化完了:', {
                    animations: this.config.enableAnimations,
                    jobs: this.jobManager.getAllJobs().size,
                    animator: !!this.jobAnimator,
                });
            }

        } catch (error) {
            console.error('JobSystem初期化中にエラーが発生しました:', error);
            throw new Error(`JobSystem初期化失敗: ${error}`);
        }
    }

    /**
     * キャラクターの職業を設定
     * 要件1.1: キャラクターの初期職業設定
     * 
     * @param characterId キャラクターID
     * @param jobId 職業ID
     * @param rank 初期ランク
     */
    public setCharacterJob(characterId: string, jobId: string, rank: number = 1): void {
        this.ensureInitialized();

        try {
            this.jobManager.setCharacterJob(characterId, jobId, rank);

            this.emit('character_job_set', {
                characterId,
                jobId,
                rank,
            });

            if (this.config.debugMode) {
                console.log(`キャラクター職業設定: ${characterId} -> ${jobId} (ランク${rank})`);
            }

        } catch (error) {
            this.handleError(JobSystemError.JOB_NOT_FOUND, {
                characterId,
                targetJobId: jobId,
                error: error as JobSystemError,
            });
            throw error;
        }
    }

    /**
     * 職業変更を実行
     * 要件6.1-6.5: 職業変更システム
     * 
     * @param characterId キャラクターID
     * @param newJobId 新しい職業ID
     * @returns 職業変更結果
     */
    public async changeJob(characterId: string, newJobId: string): Promise<JobChangeResult> {
        this.ensureInitialized();

        try {
            const oldJob = this.jobManager.getCharacterJob(characterId);
            const result = this.jobManager.changeCharacterJob(characterId, newJobId);

            // 職業変更履歴を保存
            if (this.persistenceManager && result.success && oldJob) {
                const historyEntry = {
                    jobId: oldJob.id,
                    rank: result.oldRank,
                    changedAt: new Date(),
                    roseEssenceUsed: 0 // 職業変更時は薔薇の力を使用しない
                };
                await this.persistenceManager.saveJobChangeHistory(characterId, historyEntry);
            }

            if (result.success && this.jobAnimator && this.characterManager) {
                // 職業変更アニメーションを再生
                const character = this.characterManager.getCharacter?.(characterId);
                const newJob = this.jobManager.getCharacterJob(characterId);

                if (character && oldJob && newJob) {
                    try {
                        await this.jobAnimator.playJobChangeAnimation(character, oldJob, newJob);
                    } catch (animationError) {
                        console.warn('職業変更アニメーション実行中にエラー:', animationError);
                    }
                }
            }

            // 自動保存が有効な場合はデータを保存
            if (this.config.autoSaveEnabled && result.success) {
                await this.saveJobData();
            }

            this.emit('job_changed', result);

            if (this.config.debugMode) {
                console.log('職業変更結果:', result);
            }

            return result;

        } catch (error) {
            this.handleError(JobSystemError.JOB_CHANGE_NOT_ALLOWED, {
                characterId,
                targetJobId: newJobId,
                error: error as JobSystemError,
            });
            throw error;
        }
    }

    /**
     * ランクアップを実行
     * 要件5.1-5.5: ランクアップシステム
     * 
     * @param characterId キャラクターID
     * @param targetRank 目標ランク
     * @returns ランクアップ結果
     */
    public async rankUpJob(characterId: string, targetRank?: number): Promise<RankUpResult> {
        this.ensureInitialized();

        try {
            const result = await this.rankUpManager.executeRankUp(characterId, targetRank);

            // ランクアップ履歴を保存
            if (this.persistenceManager && result.success) {
                await this.persistenceManager.saveRankUpHistory(
                    characterId,
                    result.oldRank,
                    result.newRank,
                    result.roseEssenceUsed
                );
            }

            // 自動保存が有効な場合はデータを保存
            if (this.config.autoSaveEnabled) {
                await this.saveJobData();
            }

            this.emit('rank_up_completed', result);

            if (this.config.debugMode) {
                console.log('ランクアップ結果:', result);
            }

            return result;

        } catch (error) {
            this.handleError(JobSystemError.RANK_UP_NOT_AVAILABLE, {
                characterId,
                targetRank,
                error: error as JobSystemError,
            });
            throw error;
        }
    }

    /**
     * 薔薇の力を獲得
     * 要件4.1-4.2: 薔薇の力獲得処理
     * 
     * @param amount 獲得量
     * @param source 獲得源
     * @param position エフェクト表示位置
     */
    public async awardRoseEssence(
        amount: number,
        source: string,
        position?: { x: number; y: number }
    ): Promise<void> {
        this.ensureInitialized();

        if (amount <= 0) {
            throw new Error('薔薇の力の獲得量は正の値である必要があります');
        }

        try {
            this.roseEssenceManager.addRoseEssence(amount, source);

            // 薔薇の力獲得エフェクトを再生
            if (this.jobAnimator) {
                try {
                    await this.jobAnimator.playRoseEssenceGainEffect(amount, position);
                } catch (animationError) {
                    console.warn('薔薇の力獲得エフェクト実行中にエラー:', animationError);
                }
            }

            // 自動保存が有効な場合はデータを保存
            if (this.config.autoSaveEnabled) {
                await this.saveJobData();
            }

            this.emit('rose_essence_awarded', {
                amount,
                source,
                currentTotal: this.roseEssenceManager.getCurrentRoseEssence(),
            });

            if (this.config.debugMode) {
                console.log(`薔薇の力獲得: +${amount} (合計: ${this.roseEssenceManager.getCurrentRoseEssence()})`);
            }

        } catch (error) {
            console.error('薔薇の力獲得処理中にエラー:', error);
            throw error;
        }
    }

    /**
     * ランクアップ可能性を判定
     * 要件5.5: ランクアップ可能判定
     * 
     * @param characterId キャラクターID
     * @returns ランクアップ可能性
     */
    public canRankUp(characterId: string): RankUpAvailability {
        this.ensureInitialized();
        return this.rankUpManager.canRankUp(characterId);
    }

    /**
     * ランクアップ可能キャラクター一覧を取得
     * 
     * @returns ランクアップ可能キャラクター情報
     */
    public getRankUpCandidates(): CharacterRankUpInfo[] {
        this.ensureInitialized();
        return this.rankUpManager.getRankUpCandidates();
    }

    /**
     * 職業オーラエフェクトを表示
     * 要件3.4: 職業オーラエフェクト
     * 
     * @param characterId キャラクターID
     */
    public showJobAura(characterId: string): void {
        if (!this.jobAnimator || !this.characterManager) return;

        const character = this.characterManager.getCharacter?.(characterId);
        const job = this.jobManager.getCharacterJob(characterId);

        if (character && job) {
            this.jobAnimator.showJobAura(character, job);
        }
    }

    /**
     * 職業オーラエフェクトを非表示
     * 
     * @param characterId キャラクターID
     */
    public hideJobAura(characterId: string): void {
        if (this.jobAnimator) {
            this.jobAnimator.hideJobAura(characterId);
        }
    }

    /**
     * スキル習得エフェクトを再生
     * 要件3.5: スキル習得エフェクト
     * 
     * @param characterId キャラクターID
     * @param skillName スキル名
     */
    public async playSkillUnlockEffect(characterId: string, skillName: string): Promise<void> {
        if (!this.jobAnimator || !this.characterManager) return;

        const character = this.characterManager.getCharacter?.(characterId);
        if (character) {
            try {
                await this.jobAnimator.playSkillUnlockEffect(character, skillName);
            } catch (error) {
                console.warn('スキル習得エフェクト実行中にエラー:', error);
            }
        }
    }

    /**
     * 外部システムの参照を設定
     */
    public setCharacterManager(characterManager: any): void {
        this.characterManager = characterManager;
        this.rankUpManager.setCharacterManager(characterManager);
    }

    public setSkillSystem(skillSystem: any): void {
        this.skillSystem = skillSystem;
    }

    public setBattleSystem(battleSystem: any): void {
        this.battleSystem = battleSystem;
    }

    public setSaveDataManager(saveDataManager: any): void {
        this.saveDataManager = saveDataManager;
    }

    /**
     * キャラクターの現在の職業を取得
     * 要件1.1: 職業データの取得
     * 
     * @param characterId キャラクターID
     * @returns 職業インスタンス
     */
    public getCharacterJob(characterId: string): Job | null {
        this.ensureInitialized();
        return this.jobManager.getCharacterJob(characterId);
    }

    /**
     * キャラクターの職業能力値修正を取得
     * 要件1.1: 職業による能力値修正
     * 
     * @param characterId キャラクターID
     * @returns 能力値修正
     */
    public getCharacterJobStats(characterId: string): StatModifiers {
        this.ensureInitialized();
        return this.jobManager.calculateJobStats(characterId);
    }

    /**
     * キャラクターの職業スキルを取得
     * 要件1.3: 職業スキル管理
     * 
     * @param characterId キャラクターID
     * @returns スキルID配列
     */
    public getCharacterJobSkills(characterId: string): string[] {
        this.ensureInitialized();
        return this.jobManager.getJobSkills(characterId);
    }

    /**
     * 現在の薔薇の力残量を取得
     * 要件4.3: 薔薇の力残量管理
     * 
     * @returns 現在の薔薇の力
     */
    public getCurrentRoseEssence(): number {
        this.ensureInitialized();
        return this.roseEssenceManager.getCurrentRoseEssence();
    }

    /**
     * 薔薇の力の履歴を取得
     * 要件4.3: 薔薇の力取引履歴
     * 
     * @returns 取引履歴
     */
    public getRoseEssenceHistory(): any[] {
        this.ensureInitialized();
        return this.roseEssenceManager.getEssenceHistory();
    }

    /**
     * 登録されている全職業を取得
     * 
     * @returns 職業マップ
     */
    public getAllJobs(): Map<string, Job> {
        this.ensureInitialized();
        return this.jobManager.getAllJobs();
    }

    /**
     * 職業を登録
     * 要件1.1: 職業システム基盤
     * 
     * @param job 職業インスタンス
     */
    public registerJob(job: Job): void {
        this.ensureInitialized();
        this.jobManager.registerJob(job);
    }

    /**
     * システムの初期化状態を確認
     * 
     * @returns 初期化済みかどうか
     */
    public isSystemInitialized(): boolean {
        return this.isInitialized;
    }

    /**
     * システム統計情報を取得
     */
    public getSystemStats(): JobSystemStats {
        this.ensureInitialized();

        const rankUpStats = this.rankUpManager.getRankUpStatistics();

        return {
            totalJobs: this.jobManager.getAllJobs().size,
            totalCharacters: rankUpStats.totalCharacters,
            totalRoseEssence: this.roseEssenceManager.getCurrentRoseEssence(),
            averageJobRank: rankUpStats.averageRank,
            rankUpCandidates: rankUpStats.rankUpCandidates,
            systemUptime: Date.now() - this.startTime,
        };
    }

    /**
     * 設定を更新
     */
    public updateConfig(newConfig: Partial<JobSystemConfig>): void {
        this.config = { ...this.config, ...newConfig };

        if (this.jobAnimator) {
            this.jobAnimator.updateConfig({
                enableSoundEffects: this.config.enableSoundEffects,
                animationSpeed: this.config.animationSpeed,
                enableDebugDisplay: this.config.debugMode,
                maxConcurrentEffects: this.config.maxConcurrentAnimations,
            });
        }

        this.emit('config_updated', this.config);
    }

    /**
     * 職業データを保存
     * 要件: 6.5, 4.3, 8.3
     */
    public async saveJobData(): Promise<void> {
        if (!this.persistenceManager) {
            console.warn('Persistence manager not available');
            return;
        }

        try {
            // キャラクター職業データを保存
            const characterJobData = this.jobManager.getAllCharacterJobs();
            await this.persistenceManager.saveCharacterJobData(characterJobData);

            // 薔薇の力データを保存
            const roseEssenceData = this.roseEssenceManager.exportData();
            const transactions = this.roseEssenceManager.getEssenceHistory();
            await this.persistenceManager.saveRoseEssenceData(roseEssenceData, transactions);

            if (this.config.debugMode) {
                console.log('Job data saved successfully');
            }

        } catch (error) {
            console.error('Failed to save job data:', error);
            throw error;
        }
    }

    /**
     * 職業データを読み込み
     * 要件: 6.5, 4.3, 8.3
     */
    public async loadJobData(): Promise<void> {
        if (!this.persistenceManager) {
            console.warn('Persistence manager not available');
            return;
        }

        try {
            // キャラクター職業データを読み込み
            const jobDataResult = await this.persistenceManager.loadCharacterJobData();
            if (jobDataResult.success && jobDataResult.data) {
                this.jobManager.importCharacterJobData(jobDataResult.data);
            }

            // 薔薇の力データを読み込み
            const roseEssenceResult = await this.persistenceManager.loadRoseEssenceData();
            if (roseEssenceResult.success && roseEssenceResult.data) {
                this.roseEssenceManager.importData(roseEssenceResult.data.roseEssenceData);
            }

            if (this.config.debugMode) {
                console.log('Job data loaded successfully');
            }

        } catch (error) {
            console.error('Failed to load job data:', error);
            throw error;
        }
    }

    /**
     * データ整合性を検証
     * 要件: 8.3
     */
    public async validateDataIntegrity(): Promise<boolean> {
        if (!this.persistenceManager) {
            console.warn('Persistence manager not available');
            return false;
        }

        try {
            const result = await this.persistenceManager.validateDataIntegrity();
            return result.success;

        } catch (error) {
            console.error('Failed to validate data integrity:', error);
            return false;
        }
    }

    /**
     * システムをリセット
     */
    public reset(): void {
        this.jobManager.reset();
        this.roseEssenceManager.reset();

        if (this.jobAnimator) {
            this.jobAnimator.stopAllAnimations();
        }

        this.emit('system_reset');

        if (this.config.debugMode) {
            console.log('JobSystemをリセットしました');
        }
    }

    /**
     * リソースを破棄
     * 要件8.5: エラー時のゲーム全体への影響防止
     */
    public destroy(): void {
        try {
            // パフォーマンス最適化コンポーネントを破棄
            if (this.performanceManager) {
                this.performanceManager.dispose();
                this.performanceManager = undefined;
            }

            if (this.memoryMonitor) {
                this.memoryMonitor.dispose();
                this.memoryMonitor = undefined;
            }

            if (this.cacheOptimizer) {
                this.cacheOptimizer.dispose();
                this.cacheOptimizer = undefined;
            }

            if (this.uiOptimizer) {
                this.uiOptimizer.dispose();
                this.uiOptimizer = undefined;
            }

            // 既存のコンポーネントを破棄
            if (this.jobAnimator) {
                this.jobAnimator.destroy();
            }

            if (this.persistenceManager) {
                this.persistenceManager.destroy();
            }

            this.removeAllListeners();
            this.isInitialized = false;

            if (this.config.debugMode) {
                console.log('JobSystemを破棄しました');
            }

        } catch (error) {
            console.error('JobSystem破棄中にエラー:', error);
            // エラーが発生してもシステム全体に影響しないようにする
        }
    }

    // =============================================================================
    // パフォーマンス最適化メソッド
    // =============================================================================

    /**
     * パフォーマンス最適化コンポーネントを初期化
     * 要件8.1-8.5: パフォーマンスと最適化
     */
    private initializePerformanceOptimization(): void {
        if (!this.config.enablePerformanceOptimization) {
            return;
        }

        try {
            // パフォーマンスマネージャーを初期化
            this.performanceManager = new JobPerformanceManager(
                {
                    maxCacheSize: this.config.maxCacheSize,
                    ttlMs: 300000, // 5分
                    enableLRU: true,
                    preloadCommonData: true
                },
                {
                    initialSize: 10,
                    maxSize: 100,
                    growthFactor: 1.5,
                    shrinkThreshold: 0.3
                }
            );

            // メモリ監視を初期化
            if (this.config.enableMemoryMonitoring) {
                this.memoryMonitor = new JobMemoryMonitor({
                    monitoringInterval: 5000,
                    warningThreshold: this.config.memoryWarningThreshold,
                    criticalThreshold: 0.95,
                    enableLeakDetection: true,
                    enableAutoCleanup: true,
                    maxHistorySize: 100
                });

                this.memoryMonitor.onMemoryWarning((info) => {
                    console.warn('Memory warning:', info);
                    this.emit('memory_warning', info);
                });

                this.memoryMonitor.onMemoryLeak((leak) => {
                    console.error('Memory leak detected:', leak);
                    this.emit('memory_leak_detected', leak);
                });

                this.memoryMonitor.startMonitoring();
            }

            // キャッシュ最適化を初期化
            if (this.config.enableCacheOptimization) {
                this.cacheOptimizer = new JobCacheOptimizer({
                    strategy: 'adaptive',
                    maxSize: this.config.maxCacheSize,
                    ttlMs: 600000, // 10分
                    enableCompression: true,
                    enablePredictive: true,
                    preload: {
                        enabled: true,
                        commonJobs: ['warrior', 'mage', 'archer', 'healer'],
                        popularRanks: [1, 2, 3],
                        maxPreloadItems: 50,
                        preloadOnIdle: true,
                        preloadThreshold: 0.1
                    }
                });
            }

            // UI最適化を初期化
            if (this.config.enableUIOptimization) {
                this.uiOptimizer = new JobUIOptimizer({
                    maxBatchSize: 10,
                    batchTimeoutMs: 16,
                    maxFrameTime: 16.67,
                    enableVirtualization: true,
                    enableDirtyChecking: true,
                    enableRequestAnimationFrame: true
                });
            }

            if (this.config.debugMode) {
                console.log('Performance optimization components initialized');
            }

        } catch (error) {
            console.error('Failed to initialize performance optimization:', error);
            // パフォーマンス最適化の失敗はシステム全体を停止させない
        }
    }

    /**
     * 最適化されたキャラクター能力値修正を取得
     * 要件8.1, 8.4: 読み込み時間とCPU最適化
     */
    public getOptimizedCharacterJobStats(characterId: string): StatModifiers {
        this.ensureInitialized();

        if (this.performanceManager && this.cacheOptimizer) {
            const job = this.jobManager.getCharacterJob(characterId);
            if (job) {
                const characterJobData = this.jobManager.getCharacterJobData(characterId);
                const rank = characterJobData?.currentRank || 1;

                // キャッシュから取得または計算
                return this.performanceManager.getCachedStatModifiers(characterId, job, rank);
            }
        }

        // フォールバック
        return this.jobManager.calculateJobStats(characterId);
    }

    /**
     * 最適化されたキャラクタースキルリストを取得
     * 要件8.1: 読み込み時間最適化
     */
    public getOptimizedCharacterJobSkills(characterId: string): string[] {
        this.ensureInitialized();

        if (this.performanceManager && this.cacheOptimizer) {
            const job = this.jobManager.getCharacterJob(characterId);
            if (job) {
                const characterJobData = this.jobManager.getCharacterJobData(characterId);
                const rank = characterJobData?.currentRank || 1;

                // キャッシュから取得または計算
                return this.performanceManager.getCachedSkillList(characterId, job, rank);
            }
        }

        // フォールバック
        return this.jobManager.getJobSkills(characterId);
    }

    /**
     * UI更新を最適化してリクエスト
     * 要件8.2: 処理時間最適化
     */
    public requestOptimizedUIUpdate(
        characterId: string,
        updateType: string,
        data: any,
        priority: number = 2
    ): void {
        if (this.uiOptimizer) {
            this.uiOptimizer.requestUpdate({
                characterId,
                updateType: updateType as any,
                priority: priority as any,
                data,
                dependencies: []
            });
        } else {
            // フォールバック: 直接UI更新
            this.performDirectUIUpdate(characterId, updateType, data);
        }
    }

    /**
     * 複数のUI更新をバッチ処理
     * 要件8.2: 処理時間最適化
     */
    public batchUIUpdates(characterId: string, updates: Array<{
        updateType: string;
        data: any;
        priority?: number;
    }>): void {
        if (this.uiOptimizer) {
            this.uiOptimizer.batchUpdate(characterId, updates as any);
        } else {
            // フォールバック: 順次実行
            updates.forEach(update => {
                this.performDirectUIUpdate(characterId, update.updateType, update.data);
            });
        }
    }

    /**
     * 共通データをプリロード
     * 要件8.1: 読み込み時間最適化
     */
    public preloadCommonJobData(): void {
        if (this.cacheOptimizer && this.performanceManager) {
            const jobs = Array.from(this.jobManager.getAllJobs().values());

            // キャッシュ最適化でプリロード
            this.cacheOptimizer.preloadCommonData(jobs);

            // パフォーマンスマネージャーでプリロード
            const characters = this.characterManager?.getAllCharacters?.() || [];
            this.performanceManager.preloadCommonData(jobs, characters);
        }
    }

    /**
     * パフォーマンスメトリクスを取得
     * 要件8.4: CPUリソース使用最適化
     */
    public getPerformanceMetrics(): {
        performance?: any;
        memory?: any;
        cache?: any;
        ui?: any;
    } {
        return {
            performance: this.performanceManager?.getPerformanceMetrics(),
            memory: this.memoryMonitor?.getMemoryStats(),
            cache: this.cacheOptimizer?.getCacheStats(),
            ui: this.uiOptimizer?.getRenderingStats()
        };
    }

    /**
     * パフォーマンスレポートを生成
     */
    public generatePerformanceReport(): string {
        let report = '=== Job System Performance Report ===\n';

        if (this.performanceManager) {
            const metrics = this.performanceManager.getPerformanceMetrics();
            report += `Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%\n`;
            report += `Average Calculation Time: ${metrics.averageCalculationTime.toFixed(2)}ms\n`;
            report += `Object Pool Utilization: ${(metrics.objectPoolUtilization * 100).toFixed(1)}%\n`;
        }

        if (this.memoryMonitor) {
            report += '\n' + this.memoryMonitor.generateMemoryReport();
        }

        if (this.cacheOptimizer) {
            report += '\n' + this.cacheOptimizer.generateCacheReport();
        }

        if (this.uiOptimizer) {
            report += '\n' + this.uiOptimizer.generateOptimizationReport();
        }

        return report;
    }

    /**
     * メモリクリーンアップを強制実行
     * 要件8.3: メモリ使用量管理
     */
    public forceMemoryCleanup(): void {
        if (this.performanceManager) {
            // パフォーマンスマネージャーのクリーンアップは内部で自動実行
        }

        if (this.memoryMonitor) {
            // メモリ監視は自動クリーンアップを実行
        }

        if (this.cacheOptimizer) {
            // 期限切れキャッシュをクリア
            this.cacheOptimizer.clearCache();
        }

        if (this.uiOptimizer) {
            // UIキューをクリア
            this.uiOptimizer.clearQueues();
        }

        // 強制ガベージコレクション（可能な場合）
        if (typeof global !== 'undefined' && global.gc) {
            global.gc();
        }

        if (this.config.debugMode) {
            console.log('Forced memory cleanup completed');
        }
    }

    /**
     * 直接UI更新を実行（フォールバック）
     */
    private performDirectUIUpdate(characterId: string, updateType: string, data: any): void {
        // 実際のUI更新処理
        switch (updateType) {
            case 'stats':
                this.emit('ui_update_stats', { characterId, data });
                break;
            case 'skills':
                this.emit('ui_update_skills', { characterId, data });
                break;
            case 'job_info':
                this.emit('ui_update_job_info', { characterId, data });
                break;
            case 'rank_info':
                this.emit('ui_update_rank_info', { characterId, data });
                break;
            default:
                this.emit('ui_update_generic', { characterId, updateType, data });
        }
    }

    // =============================================================================
    // プライベートメソッド
    // =============================================================================

    /**
     * 初期化状態をチェック
     */
    private ensureInitialized(): void {
        if (!this.isInitialized) {
            throw new Error('JobSystemが初期化されていません。initialize()を呼び出してください。');
        }
    }

    /**
     * 職業データを読み込み
     */
    private async loadJobData(jobDataMap: Map<string, JobData>): Promise<void> {
        for (const [jobId, jobData] of jobDataMap) {
            try {
                // 職業クラスのファクトリーメソッドを使用して職業インスタンスを作成
                const job = this.createJobInstance(jobData);
                this.jobManager.registerJob(job);

                if (this.config.debugMode) {
                    console.log(`職業データ読み込み完了: ${jobData.name}`);
                }

            } catch (error) {
                console.error(`職業データ読み込み失敗: ${jobId}`, error);
                throw error;
            }
        }
    }

    /**
     * 職業インスタンスを作成
     */
    private createJobInstance(jobData: JobData): Job {
        // 職業カテゴリーに応じた具体的な職業クラスのインスタンスを作成
        try {
            const { WarriorJob } = require('./WarriorJob');
            const { MageJob } = require('./MageJob');
            const { ArcherJob } = require('./ArcherJob');
            const { HealerJob } = require('./HealerJob');
            const { ThiefJob } = require('./ThiefJob');

            switch (jobData.category) {
                case JobCategory.WARRIOR:
                    return new WarriorJob(jobData);
                case JobCategory.MAGE:
                    return new MageJob(jobData);
                case JobCategory.ARCHER:
                    return new ArcherJob(jobData);
                case JobCategory.HEALER:
                    return new HealerJob(jobData);
                case JobCategory.THIEF:
                    return new ThiefJob(jobData);
                default:
                    throw new Error(`未対応の職業カテゴリー: ${jobData.category}`);
            }
        } catch (error) {
            console.error(`職業クラスの作成に失敗: ${jobData.category}`, error);
            // フォールバックとして基本Jobクラスを使用
            return new Job(jobData);
        }
    }

    /**
     * イベントハンドラーを設定
     */
    private setupEventHandlers(): void {
        // JobManagerのイベントを監視
        this.jobManager.on?.('job_changed', (data) => {
            this.handleJobChange(data);
        });

        this.jobManager.on?.('character_job_set', (data) => {
            this.handleCharacterJobSet(data);
        });

        // RoseEssenceManagerのイベントを監視
        this.roseEssenceManager.on?.('essence_added', (data) => {
            this.handleRoseEssenceAdded(data);
        });

        this.roseEssenceManager.on?.('essence_consumed', (data) => {
            this.handleRoseEssenceConsumed(data);
        });

        // RankUpManagerのイベントを監視
        this.rankUpManager.on?.('rank_up_completed', (data) => {
            this.handleRankUpCompleted(data);
        });

        // JobAnimatorのイベントを中継（初期化後に設定）
        this.setupAnimatorEventHandlers();
    }

    /**
     * JobAnimatorのイベントハンドラーを設定
     */
    private setupAnimatorEventHandlers(): void {
        if (this.jobAnimator) {
            this.jobAnimator.on('job_change_complete', (data) => {
                this.emit('job_change_animation_complete', data);
            });

            this.jobAnimator.on('rank_up_complete', (data) => {
                this.emit('rank_up_animation_complete', data);
            });

            this.jobAnimator.on('rose_essence_gain_complete', (data) => {
                this.emit('rose_essence_effect_complete', data);
            });

            this.jobAnimator.on('skill_unlock_complete', (data) => {
                this.emit('skill_unlock_animation_complete', data);
            });
        }
    }

    /**
     * 職業変更イベントを処理
     */
    private handleJobChange(data: any): void {
        // スキルシステムとの連携
        if (this.skillSystem && data.characterId) {
            try {
                this.skillSystem.updateSkillsOnJobChange?.(data.characterId);
            } catch (error) {
                console.warn('スキルシステム連携エラー:', error);
            }
        }

        // キャラクターマネージャーとの連携
        if (this.characterManager && data.characterId) {
            try {
                this.characterManager.updateCharacterStats?.(data.characterId);
            } catch (error) {
                console.warn('キャラクターマネージャー連携エラー:', error);
            }
        }

        this.emit('job_change_processed', data);
    }

    /**
     * キャラクター職業設定イベントを処理
     */
    private handleCharacterJobSet(data: any): void {
        // 初期職業設定時の処理
        if (this.config.debugMode) {
            console.log('キャラクター職業設定:', data);
        }

        this.emit('character_job_initialized', data);
    }

    /**
     * 薔薇の力獲得イベントを処理
     */
    private handleRoseEssenceAdded(data: any): void {
        // ランクアップ可能性をチェック
        const candidates = this.getRankUpCandidates();
        if (candidates.length > 0) {
            this.emit('rank_up_candidates_available', candidates);
        }

        this.emit('rose_essence_balance_changed', {
            amount: data.amount,
            currentTotal: this.getCurrentRoseEssence(),
        });
    }

    /**
     * 薔薇の力消費イベントを処理
     */
    private handleRoseEssenceConsumed(data: any): void {
        this.emit('rose_essence_balance_changed', {
            amount: -data.amount,
            currentTotal: this.getCurrentRoseEssence(),
        });
    }

    /**
     * ランクアップ完了イベントを処理
     */
    private handleRankUpCompleted(data: any): void {
        // スキルシステムとの連携（新スキル習得）
        if (this.skillSystem && data.characterId && data.newSkills) {
            try {
                for (const skillId of data.newSkills) {
                    this.skillSystem.unlockSkill?.(data.characterId, skillId);
                }
            } catch (error) {
                console.warn('スキル習得連携エラー:', error);
            }
        }

        // キャラクターマネージャーとの連携（能力値更新）
        if (this.characterManager && data.characterId) {
            try {
                this.characterManager.updateCharacterStats?.(data.characterId);
            } catch (error) {
                console.warn('キャラクター能力値更新エラー:', error);
            }
        }

        this.emit('rank_up_processed', data);
    }

    /**
     * エラーハンドリング
     */
    private handleError(error: JobSystemError, context: JobSystemContext): void {
        const errorData = {
            error,
            context,
            timestamp: new Date(),
        };

        this.emit('system_error', errorData);

        if (this.config.debugMode) {
            console.error('JobSystemエラー:', errorData);
        }

        // エラー回復処理
        this.attemptErrorRecovery(error, context);
    }

    /**
     * エラー回復処理
     */
    private attemptErrorRecovery(error: JobSystemError, context: JobSystemContext): boolean {
        switch (error) {
            case JobSystemError.DATA_CORRUPTION:
                // データ整合性チェックと修復
                return this.repairDataIntegrity();

            case JobSystemError.INSUFFICIENT_ROSE_ESSENCE:
                // 薔薇の力不足の通知
                this.emit('insufficient_rose_essence', context);
                return true;

            default:
                return false;
        }
    }

    /**
     * データ整合性を修復
     */
    private repairDataIntegrity(): boolean {
        try {
            // キャラクター職業データの整合性チェック
            const characterJobs = this.jobManager.getAllCharacterJobs?.() || new Map();
            const availableJobs = this.jobManager.getAllJobs();

            let repairCount = 0;

            for (const [characterId, jobData] of characterJobs) {
                // 存在しない職業を参照している場合
                if (!availableJobs.has(jobData.currentJobId)) {
                    console.warn(`キャラクター ${characterId} が存在しない職業 ${jobData.currentJobId} を参照しています`);

                    // デフォルト職業に設定
                    const defaultJobId = availableJobs.keys().next().value;
                    if (defaultJobId) {
                        this.jobManager.setCharacterJob(characterId, defaultJobId, 1);
                        repairCount++;
                    }
                }

                // 無効なランクの修正
                const job = availableJobs.get(jobData.currentJobId);
                if (job && (jobData.currentRank < 1 || jobData.currentRank > job.maxRank)) {
                    console.warn(`キャラクター ${characterId} の職業ランクが無効です: ${jobData.currentRank}`);

                    const validRank = Math.max(1, Math.min(jobData.currentRank, job.maxRank));
                    this.jobManager.setCharacterJob(characterId, jobData.currentJobId, validRank);
                    repairCount++;
                }
            }

            // 薔薇の力の整合性チェック
            const currentEssence = this.roseEssenceManager.getCurrentRoseEssence();
            if (currentEssence < 0) {
                console.warn('薔薇の力が負の値になっています:', currentEssence);
                this.roseEssenceManager.reset();
                repairCount++;
            }

            if (this.config.debugMode && repairCount > 0) {
                console.log(`データ整合性修復完了: ${repairCount}件の問題を修正しました`);
            }

            return true;

        } catch (error) {
            console.error('データ整合性修復に失敗:', error);
            return false;
        }
    }

    /**
     * システムデータをバックアップ
     * 
     * @returns バックアップデータ
     */
    public createBackup(): any {
        this.ensureInitialized();

        return {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            jobData: {
                characterJobs: this.jobManager.getAllCharacterJobs?.() || new Map(),
                registeredJobs: Array.from(this.jobManager.getAllJobs().keys()),
            },
            roseEssenceData: {
                currentAmount: this.roseEssenceManager.getCurrentRoseEssence(),
                history: this.roseEssenceManager.getEssenceHistory(),
            },
            systemConfig: this.config,
        };
    }

    /**
     * バックアップからシステムデータを復元
     * 
     * @param backupData バックアップデータ
     */
    public restoreFromBackup(backupData: any): void {
        this.ensureInitialized();

        try {
            if (!backupData || !backupData.timestamp) {
                throw new Error('無効なバックアップデータです');
            }

            // 職業データの復元
            if (backupData.jobData?.characterJobs) {
                for (const [characterId, jobData] of backupData.jobData.characterJobs) {
                    this.jobManager.setCharacterJob(characterId, jobData.currentJobId, jobData.currentRank);
                }
            }

            // 薔薇の力データの復元
            if (backupData.roseEssenceData) {
                this.roseEssenceManager.reset();
                if (backupData.roseEssenceData.currentAmount > 0) {
                    this.roseEssenceManager.addRoseEssence(
                        backupData.roseEssenceData.currentAmount,
                        'backup_restore'
                    );
                }
            }

            // 設定の復元
            if (backupData.systemConfig) {
                this.updateConfig(backupData.systemConfig);
            }

            this.emit('backup_restored', {
                timestamp: backupData.timestamp,
                version: backupData.version,
            });

            if (this.config.debugMode) {
                console.log('バックアップからの復元が完了しました:', backupData.timestamp);
            }

        } catch (error) {
            console.error('バックアップ復元中にエラー:', error);
            throw error;
        }
    }

    /**
     * 永続化されたデータを読み込み
     */
    private async loadPersistedData(): Promise<void> {
        try {
            await this.loadJobData();
        } catch (error) {
            console.warn('Failed to load persisted job data:', error);
        }
    }

    /**
     * システムの健全性をチェック
     * 
     * @returns 健全性チェック結果
     */
    public performHealthCheck(): {
        isHealthy: boolean;
        issues: string[];
        recommendations: string[];
    } {
        const issues: string[] = [];
        const recommendations: string[] = [];

        try {
            // 初期化状態チェック
            if (!this.isInitialized) {
                issues.push('システムが初期化されていません');
                recommendations.push('initialize()メソッドを呼び出してください');
            }

            // 職業データチェック
            const jobCount = this.jobManager.getAllJobs().size;
            if (jobCount === 0) {
                issues.push('職業データが登録されていません');
                recommendations.push('職業データを読み込んでください');
            }

            // 薔薇の力チェック
            const essence = this.roseEssenceManager.getCurrentRoseEssence();
            if (essence < 0) {
                issues.push('薔薇の力が負の値になっています');
                recommendations.push('データ整合性修復を実行してください');
            }

            // メモリ使用量チェック（概算）
            const stats = this.getSystemStats();
            if (stats.systemUptime > 3600000) { // 1時間以上
                recommendations.push('長時間稼働しています。メモリリークがないか確認してください');
            }

            return {
                isHealthy: issues.length === 0,
                issues,
                recommendations,
            };

        } catch (error) {
            issues.push(`健全性チェック中にエラー: ${error}`);
            return {
                isHealthy: false,
                issues,
                recommendations: ['システムの再初期化を検討してください'],
            };
        }
    }
}