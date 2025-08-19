/**
 * ExperienceSystem - 経験値システムメインコントローラー
 * 
 * このクラスは経験値システム全体を統合・管理するメインコントローラーです:
 * - システム初期化とデータ読み込み
 * - 経験値獲得処理の統合
 * - レベルアップ判定・実行
 * - 経験値情報取得
 * - 戦闘中経験値処理
 * 
 * 要件: 1.1, 2.1, 2.2, 5.1, 5.2
 * 
 * @version 1.0.0
 * @author Trail of Thorns Development Team
 */

import * as Phaser from 'phaser';
import {
    ExperienceInfo,
    LevelUpResult,
    ExperienceSource,
    ExperienceAction,
    ExperienceContext,
    ExperienceTableData,
    GrowthRateData,
    ExperienceSystemState,
    ExperienceSystemConfig,
    ExperienceError,
    BattleContext,
    ExperienceCalculationResult
} from '../../types/experience';
import { Unit } from '../../types/gameplay';
import { ExperienceDataLoader } from './ExperienceDataLoader';
import { ExperienceManager } from './ExperienceManager';
import { LevelUpProcessor } from './LevelUpProcessor';
import { GrowthCalculator } from './GrowthCalculator';
import { ExperienceUI } from './ExperienceUI';
import { ExperiencePersistenceManager } from './ExperiencePersistenceManager';
import { ExperienceErrorHandler, UserNotification } from './ExperienceErrorHandler';
import { ExperiencePerformanceManager } from './ExperiencePerformanceManager';
import { ExperienceCache } from './ExperienceCache';
import { ExperienceObjectPool } from './ExperienceObjectPool';
import { ExperienceBatchProcessor } from './ExperienceBatchProcessor';
import { SaveDataManager } from '../SaveDataManager';

/**
 * ExperienceSystemクラス
 * 経験値システム全体の統合管理を行う
 */
export class ExperienceSystem {
    private scene: Phaser.Scene;
    private eventEmitter: Phaser.Events.EventEmitter;

    // コンポーネント
    private experienceDataLoader: ExperienceDataLoader;
    private experienceManager: ExperienceManager;
    private levelUpProcessor: LevelUpProcessor;
    private growthCalculator: GrowthCalculator;
    private experienceUI: ExperienceUI;
    private persistenceManager?: ExperiencePersistenceManager;
    private errorHandler: ExperienceErrorHandler;

    // パフォーマンス最適化コンポーネント
    private performanceManager: ExperiencePerformanceManager;
    private cache: ExperienceCache;
    private objectPool: ExperienceObjectPool;
    private batchProcessor: ExperienceBatchProcessor;

    // システム状態
    private systemState: ExperienceSystemState;
    private config: ExperienceSystemConfig;

    // 戦闘中の経験値処理用
    private battleExperienceQueue: Map<string, ExperienceCalculationResult[]> = new Map();
    private pendingLevelUps: Map<string, LevelUpResult[]> = new Map();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.eventEmitter = new Phaser.Events.EventEmitter();

        // コンポーネントを初期化
        this.experienceDataLoader = new ExperienceDataLoader();
        this.experienceManager = new ExperienceManager(this.experienceDataLoader, this.eventEmitter);
        this.growthCalculator = new GrowthCalculator();
        this.levelUpProcessor = new LevelUpProcessor(
            this.growthCalculator,
            this.experienceManager,
            this.eventEmitter
        );
        this.experienceUI = new ExperienceUI(scene);
        this.errorHandler = new ExperienceErrorHandler();

        // パフォーマンス最適化コンポーネントを初期化
        this.performanceManager = ExperiencePerformanceManager.getInstance();
        this.cache = ExperienceCache.getInstance();
        this.objectPool = new ExperienceObjectPool(scene);
        this.batchProcessor = new ExperienceBatchProcessor();

        // 最適化コンポーネントを相互連携
        this.initializePerformanceOptimization();

        // システム状態を初期化
        this.systemState = {
            isInitialized: false,
            experienceTableLoaded: false,
            growthRatesLoaded: false,
            activeCharacters: new Set(),
            pendingLevelUps: new Map(),
            experienceMultiplier: 1.0,
            config: this.getDefaultConfig()
        };

        this.config = this.systemState.config;

        // イベントリスナーを設定
        this.setupEventListeners();

        // エラーハンドラーを初期化
        this.initializeErrorHandler();
    }

    /**
     * システム初期化とデータ読み込みを実装
     * 要件: 1.1, 4.1, 4.2, 4.3, 4.4, 4.5
     */
    public async initialize(
        experienceTablePath?: string,
        growthRateData?: GrowthRateData
    ): Promise<boolean> {
        try {
            console.log('Initializing Experience System...');

            // 経験値テーブルを読み込み
            const experienceTableLoaded = await this.experienceDataLoader.loadExperienceTable(
                experienceTablePath
            );

            if (!experienceTableLoaded) {
                const recoveryResult = this.errorHandler.handleError(
                    'experience_table_invalid' as ExperienceError,
                    { operation: 'initialize', details: 'Failed to load experience table' }
                );

                if (recoveryResult.success && recoveryResult.strategy === 'fallback') {
                    console.warn('Experience table loading failed, using default values');
                } else {
                    console.error('Failed to recover from experience table loading error');
                    return false;
                }
            }

            this.systemState.experienceTableLoaded = experienceTableLoaded;

            // 成長率データを読み込み
            if (growthRateData) {
                try {
                    this.growthCalculator.loadGrowthRateData(growthRateData);
                    this.systemState.growthRatesLoaded = true;
                } catch (error) {
                    const recoveryResult = this.errorHandler.handleError(
                        'growth_rate_invalid' as ExperienceError,
                        { operation: 'initialize', details: error }
                    );

                    if (recoveryResult.success) {
                        const defaultGrowthRateData = this.createDefaultGrowthRateData();
                        this.growthCalculator.loadGrowthRateData(defaultGrowthRateData);
                        this.systemState.growthRatesLoaded = true;
                        console.log('Using default growth rate data due to error');
                    } else {
                        return false;
                    }
                }
            } else {
                // デフォルト成長率データを作成
                const defaultGrowthRateData = this.createDefaultGrowthRateData();
                this.growthCalculator.loadGrowthRateData(defaultGrowthRateData);
                this.systemState.growthRatesLoaded = true;
                console.log('Using default growth rate data');
            }

            // キャッシュに経験値テーブルを設定
            const experienceTableData = this.experienceDataLoader.getExperienceTableData();
            if (experienceTableData) {
                this.cache.setExperienceTable(experienceTableData);
            }

            // システム初期化完了
            this.systemState.isInitialized = true;

            // 初期化完了イベントを発行
            this.eventEmitter.emit('experience-system-initialized', {
                experienceTableLoaded: this.systemState.experienceTableLoaded,
                growthRatesLoaded: this.systemState.growthRatesLoaded
            });

            console.log('Experience System initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize Experience System:', error);
            this.errorHandler.handleError(
                'system_not_initialized' as ExperienceError,
                { operation: 'initialize', details: error }
            );
            this.systemState.isInitialized = false;
            return false;
        }
    }

    /**
     * 経験値獲得処理の統合を実装
     * 要件: 1.1, 1.2, 1.5, 5.1, 5.2
     */
    public awardExperience(
        characterId: string,
        action: ExperienceAction,
        context: ExperienceContext
    ): ExperienceCalculationResult | null {
        if (!this.systemState.isInitialized) {
            const recoveryResult = this.errorHandler.handleError(
                'system_not_initialized' as ExperienceError,
                { characterId, operation: 'awardExperience' }
            );

            if (!recoveryResult.success) {
                return null;
            }
        }

        if (!characterId) {
            this.errorHandler.handleError(
                'invalid_character' as ExperienceError,
                { characterId, operation: 'awardExperience', details: 'Empty character ID' }
            );
            return null;
        }

        if (!this.experienceManager.hasCharacter(characterId)) {
            const recoveryResult = this.errorHandler.handleError(
                'invalid_character' as ExperienceError,
                { characterId, operation: 'awardExperience', details: 'Character not registered' }
            );

            if (recoveryResult.strategy === 'skip') {
                return null;
            }
        }

        try {
            // 経験値計算を実行（パフォーマンス測定付き）
            const calculationResult = this.measureExperienceCalculation('award-experience', () => {
                return this.calculateExperienceGain(action, context);
            });

            if (calculationResult.finalAmount < 0) {
                const recoveryResult = this.errorHandler.handleError(
                    'invalid_experience_amount' as ExperienceError,
                    { characterId, operation: 'awardExperience', details: `Negative amount: ${calculationResult.finalAmount}` }
                );

                if (recoveryResult.success && recoveryResult.recoveredData !== undefined) {
                    calculationResult.finalAmount = recoveryResult.recoveredData;
                } else {
                    calculationResult.finalAmount = 0;
                }
            }

            if (calculationResult.finalAmount <= 0) {
                return calculationResult;
            }

            // 経験値を付与
            const actualAmount = this.experienceManager.addExperience(
                characterId,
                calculationResult.finalAmount,
                context.source
            );

            // 実際に付与された経験値で結果を更新
            calculationResult.finalAmount = actualAmount;

            // UI表示
            if (this.config.showExperiencePopups && actualAmount > 0) {
                try {
                    const character = this.getCharacterById(characterId);
                    if (character) {
                        const position = this.getCharacterScreenPosition(character);
                        this.experienceUI.showExperienceGain({
                            characterId,
                            amount: actualAmount,
                            source: context.source,
                            position
                        });
                    }
                } catch (uiError) {
                    console.warn('Failed to show experience gain UI:', uiError);
                    // UI エラーは致命的ではないので処理を続行
                }
            }

            // 戦闘中の場合はキューに追加
            if (context.battleContext) {
                this.addToBattleExperienceQueue(characterId, calculationResult);
            }

            // 経験値獲得イベントを発行
            this.eventEmitter.emit('experience-awarded', {
                characterId,
                action,
                context,
                result: calculationResult
            });

            return calculationResult;

        } catch (error) {
            console.error(`Failed to award experience to ${characterId}:`, error);
            this.errorHandler.handleError(
                'level_up_failed' as ExperienceError,
                { characterId, operation: 'awardExperience', details: error }
            );
            return null;
        }
    }

    /**
     * レベルアップ判定・実行を実装
     * 要件: 2.1, 2.2, 2.5, 3.4
     */
    public checkAndProcessLevelUp(characterId: string): LevelUpResult | null {
        if (!this.systemState.isInitialized) {
            const recoveryResult = this.errorHandler.handleError(
                'system_not_initialized' as ExperienceError,
                { characterId, operation: 'checkAndProcessLevelUp' }
            );

            if (!recoveryResult.success) {
                return null;
            }
        }

        if (!characterId) {
            this.errorHandler.handleError(
                'invalid_character' as ExperienceError,
                { characterId, operation: 'checkAndProcessLevelUp', details: 'Empty character ID' }
            );
            return null;
        }

        if (!this.experienceManager.hasCharacter(characterId)) {
            this.errorHandler.handleError(
                'invalid_character' as ExperienceError,
                { characterId, operation: 'checkAndProcessLevelUp', details: 'Character not registered' }
            );
            return null;
        }

        try {
            const character = this.getCharacterById(characterId);
            if (!character) {
                this.errorHandler.handleError(
                    'invalid_character' as ExperienceError,
                    { characterId, operation: 'checkAndProcessLevelUp', details: 'Character not found' }
                );
                return null;
            }

            // 最大レベルチェック
            const maxLevel = this.experienceDataLoader.getMaxLevel();
            if (character.level >= maxLevel) {
                this.errorHandler.handleError(
                    'max_level_reached' as ExperienceError,
                    { characterId, operation: 'checkAndProcessLevelUp', details: `Level ${character.level}/${maxLevel}` }
                );
                return null;
            }

            // レベルアップ可能かチェック
            if (!this.levelUpProcessor.canProcessLevelUp(character)) {
                return null;
            }

            // レベルアップ処理を実行（パフォーマンス測定付き）
            const levelUpResult = this.measureLevelUpProcessing('process-levelup', () => {
                return this.levelUpProcessor.processLevelUp(character);
            });

            // エラーハンドラーにバックアップを保存
            const experienceInfo = this.getExperienceInfo(characterId);
            this.errorHandler.saveBackup(characterId, experienceInfo);

            // UI表示
            try {
                if (this.config.autoLevelUp) {
                    this.showLevelUpEffect(character, levelUpResult);
                } else {
                    // 手動レベルアップの場合は保留リストに追加
                    this.addToPendingLevelUps(characterId, levelUpResult);
                }
            } catch (uiError) {
                console.warn('Failed to show level up UI:', uiError);
                // UI エラーは致命的ではないので処理を続行
            }

            // レベルアップイベントを発行
            this.eventEmitter.emit('level-up-processed', {
                characterId,
                result: levelUpResult
            });

            return levelUpResult;

        } catch (error) {
            console.error(`Failed to process level up for ${characterId}:`, error);
            this.errorHandler.handleError(
                'level_up_failed' as ExperienceError,
                { characterId, operation: 'checkAndProcessLevelUp', details: error }
            );
            return null;
        }
    }

    /**
     * 経験値情報取得を実装
     * 要件: 1.1, 6.2, 6.5
     */
    public getExperienceInfo(characterId: string): ExperienceInfo {
        if (!this.systemState.isInitialized) {
            const recoveryResult = this.errorHandler.handleError(
                'system_not_initialized' as ExperienceError,
                { characterId, operation: 'getExperienceInfo' }
            );

            if (!recoveryResult.success) {
                throw new Error('system_not_initialized');
            }
        }

        if (!characterId) {
            const recoveryResult = this.errorHandler.handleError(
                'invalid_character' as ExperienceError,
                { characterId, operation: 'getExperienceInfo', details: 'Empty character ID' }
            );

            if (recoveryResult.success && recoveryResult.recoveredData) {
                return recoveryResult.recoveredData;
            }
            throw new Error('invalid_character');
        }

        if (!this.experienceManager.hasCharacter(characterId)) {
            const recoveryResult = this.errorHandler.handleError(
                'invalid_character' as ExperienceError,
                { characterId, operation: 'getExperienceInfo', details: 'Character not registered' }
            );

            if (recoveryResult.success && recoveryResult.recoveredData) {
                return recoveryResult.recoveredData;
            }
            throw new Error('invalid_character');
        }

        try {
            const baseInfo = this.experienceManager.getExperienceInfo(characterId);

            if (!baseInfo) {
                const recoveryResult = this.errorHandler.handleError(
                    'data_not_found' as ExperienceError,
                    { characterId, operation: 'getExperienceInfo', details: 'Base info not found' }
                );

                if (recoveryResult.success && recoveryResult.recoveredData) {
                    return recoveryResult.recoveredData;
                }
                throw new Error('data_not_found');
            }

            // 追加情報を計算
            const maxLevel = this.experienceDataLoader.getMaxLevel();
            const isMaxLevel = baseInfo.currentLevel >= maxLevel;
            const experienceProgress = isMaxLevel ? 1.0 : this.calculateExperienceProgress(baseInfo);

            return {
                ...baseInfo,
                canLevelUp: this.experienceManager.canLevelUp(characterId),
                isMaxLevel,
                experienceProgress
            };

        } catch (error) {
            console.error(`Failed to get experience info for ${characterId}:`, error);

            const recoveryResult = this.errorHandler.handleError(
                'data_not_found' as ExperienceError,
                { characterId, operation: 'getExperienceInfo', details: error }
            );

            if (recoveryResult.success && recoveryResult.recoveredData) {
                return recoveryResult.recoveredData;
            }

            throw error;
        }
    }

    /**
     * 戦闘中経験値処理を実装
     * 要件: 5.1, 5.2, 5.3, 5.4, 5.5
     */
    public handleBattleExperience(
        characterId: string,
        action: ExperienceAction,
        battleContext: BattleContext
    ): void {
        if (!this.systemState.isInitialized) {
            throw new Error('system_not_initialized');
        }

        try {
            // 戦闘コンテキストを含む経験値コンテキストを作成
            const experienceContext: ExperienceContext = {
                source: this.mapActionToSource(action),
                action,
                battleContext,
                timestamp: Date.now()
            };

            // 経験値を付与
            const result = this.awardExperience(characterId, action, experienceContext);

            if (result && result.finalAmount > 0) {
                // 戦闘中レベルアップチェック
                const levelUpResult = this.checkAndProcessLevelUp(characterId);

                if (levelUpResult) {
                    // 戦闘中レベルアップの場合は即座に能力値を更新
                    this.applyLevelUpInBattle(characterId, levelUpResult);
                }
            }

        } catch (error) {
            console.error(`Failed to handle battle experience for ${characterId}:`, error);
        }
    }

    /**
     * キャラクターを経験値システムに登録
     */
    public registerCharacter(character: Unit, initialLevel?: number, initialExperience?: number): void {
        if (!this.systemState.isInitialized) {
            throw new Error('system_not_initialized');
        }

        try {
            this.experienceManager.initializeCharacterExperience(
                character.id,
                initialLevel,
                initialExperience
            );

            this.systemState.activeCharacters.add(character.id);

            this.eventEmitter.emit('character-registered', {
                characterId: character.id,
                initialLevel,
                initialExperience
            });

        } catch (error) {
            console.error(`Failed to register character ${character.id}:`, error);
            throw error;
        }
    }

    /**
     * キャラクターを経験値システムから削除
     */
    public unregisterCharacter(characterId: string): boolean {
        if (!this.systemState.isInitialized) {
            return false;
        }

        try {
            const removed = this.experienceManager.removeCharacter(characterId);

            if (removed) {
                this.systemState.activeCharacters.delete(characterId);
                this.battleExperienceQueue.delete(characterId);
                this.pendingLevelUps.delete(characterId);

                this.eventEmitter.emit('character-unregistered', { characterId });
            }

            return removed;

        } catch (error) {
            console.error(`Failed to unregister character ${characterId}:`, error);
            return false;
        }
    }

    /**
     * 保留中のレベルアップを処理
     */
    public processPendingLevelUps(characterId?: string): void {
        if (!this.systemState.isInitialized) {
            return;
        }

        try {
            if (characterId) {
                // 特定キャラクターの保留レベルアップを処理
                const pending = this.pendingLevelUps.get(characterId);
                if (pending && pending.length > 0) {
                    const character = this.getCharacterById(characterId);
                    if (character) {
                        pending.forEach(result => {
                            this.showLevelUpEffect(character, result);
                        });
                    }
                    this.pendingLevelUps.delete(characterId);
                }
            } else {
                // 全キャラクターの保留レベルアップを処理
                for (const [charId, results] of this.pendingLevelUps.entries()) {
                    const character = this.getCharacterById(charId);
                    if (character) {
                        results.forEach(result => {
                            this.showLevelUpEffect(character, result);
                        });
                    }
                }
                this.pendingLevelUps.clear();
            }

        } catch (error) {
            console.error('Failed to process pending level ups:', error);
        }
    }

    /**
     * 経験値倍率を設定
     */
    public setExperienceMultiplier(multiplier: number, reason?: string): void {
        if (multiplier < 0) {
            throw new Error('Experience multiplier cannot be negative');
        }

        const oldMultiplier = this.systemState.experienceMultiplier;
        this.systemState.experienceMultiplier = multiplier;

        this.eventEmitter.emit('experience-multiplier-changed', {
            oldMultiplier,
            newMultiplier: multiplier,
            reason: reason || 'Manual change'
        });
    }

    /**
     * システム設定を更新
     */
    public updateConfig(newConfig: Partial<ExperienceSystemConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.systemState.config = this.config;

        this.eventEmitter.emit('experience-system-config-updated', {
            config: this.config
        });
    }

    /**
     * システム状態を取得
     */
    public getSystemState(): ExperienceSystemState {
        return {
            ...this.systemState,
            pendingLevelUps: new Map(this.pendingLevelUps)
        };
    }

    /**
     * 登録されている全キャラクターの経験値情報を取得
     */
    public getAllExperienceInfo(): Map<string, ExperienceInfo> {
        const allInfo = new Map<string, ExperienceInfo>();

        for (const characterId of this.systemState.activeCharacters) {
            try {
                const info = this.getExperienceInfo(characterId);
                allInfo.set(characterId, info);
            } catch (error) {
                console.warn(`Failed to get experience info for ${characterId}:`, error);
            }
        }

        return allInfo;
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
     * データ永続化マネージャーを設定
     */
    public setPersistenceManager(persistenceManager: ExperiencePersistenceManager): void {
        this.persistenceManager = persistenceManager;
    }

    /**
     * データ永続化マネージャーを取得
     */
    public getPersistenceManager(): ExperiencePersistenceManager | undefined {
        return this.persistenceManager;
    }

    /**
     * SaveDataManagerと統合して永続化マネージャーを初期化
     * 要件: 7.1
     */
    public async initializePersistence(saveDataManager: SaveDataManager): Promise<boolean> {
        try {
            if (!this.systemState.isInitialized) {
                console.warn('Experience system must be initialized before persistence');
                return false;
            }

            // 永続化マネージャーを作成・設定
            this.persistenceManager = new ExperiencePersistenceManager(saveDataManager);

            // 永続化マネージャーを初期化
            const initResult = await this.persistenceManager.initialize();
            if (!initResult.success) {
                console.error('Failed to initialize experience persistence:', initResult.message);
                return false;
            }

            // 永続化マネージャーのイベントを監視
            this.setupPersistenceEventListeners();

            console.log('Experience persistence initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize experience persistence:', error);
            return false;
        }
    }

    /**
     * 経験値データを保存
     * 要件: 7.1
     */
    public async saveExperienceData(): Promise<boolean> {
        if (!this.persistenceManager) {
            console.warn('Persistence manager not initialized');
            return false;
        }

        try {
            const experienceMap = this.getAllExperienceInfo();
            const saveResult = await this.persistenceManager.saveCharacterExperienceData(experienceMap);

            if (!saveResult.success) {
                console.error('Failed to save experience data:', saveResult.message);
                return false;
            }

            this.eventEmitter.emit('experience-data-saved', {
                characterCount: experienceMap.size,
                timestamp: Date.now()
            });

            return true;

        } catch (error) {
            console.error('Failed to save experience data:', error);
            return false;
        }
    }

    /**
     * 経験値データを読み込み
     * 要件: 7.3
     */
    public async loadExperienceData(): Promise<boolean> {
        if (!this.persistenceManager) {
            console.warn('Persistence manager not initialized');
            return false;
        }

        try {
            const loadResult = await this.persistenceManager.loadCharacterExperienceData();

            if (!loadResult.success) {
                console.error('Failed to load experience data:', loadResult.message);
                return false;
            }

            const experienceMap = loadResult.data!;

            // 読み込んだデータでキャラクターを再初期化
            for (const [characterId, experienceInfo] of experienceMap) {
                this.experienceManager.initializeCharacterExperience(
                    characterId,
                    experienceInfo.currentLevel,
                    experienceInfo.currentExperience
                );

                this.systemState.activeCharacters.add(characterId);
            }

            this.eventEmitter.emit('experience-data-loaded', {
                characterCount: experienceMap.size,
                timestamp: Date.now()
            });

            return true;

        } catch (error) {
            console.error('Failed to load experience data:', error);
            return false;
        }
    }

    /**
     * 章進行と共に経験値データを保存
     * 要件: 7.2
     */
    public async saveChapterProgressWithExperience(
        chapterId: string,
        stageNumber: number,
        isCompleted: boolean = false
    ): Promise<boolean> {
        if (!this.persistenceManager) {
            console.warn('Persistence manager not initialized');
            return false;
        }

        try {
            const experienceMap = this.getAllExperienceInfo();
            const saveResult = await this.persistenceManager.saveChapterProgressWithExperience(
                chapterId,
                stageNumber,
                experienceMap,
                isCompleted
            );

            if (!saveResult.success) {
                console.error('Failed to save chapter progress with experience:', saveResult.message);
                return false;
            }

            this.eventEmitter.emit('chapter-progress-saved-with-experience', {
                chapterId,
                stageNumber,
                isCompleted,
                characterCount: experienceMap.size,
                timestamp: Date.now()
            });

            return true;

        } catch (error) {
            console.error('Failed to save chapter progress with experience:', error);
            return false;
        }
    }

    /**
     * 新規仲間キャラクターの経験値を初期化
     * 要件: 7.4
     */
    public async initializeNewCharacterExperience(
        characterId: string,
        initialLevel: number = 1,
        initialExperience: number = 0,
        joinChapter: string,
        joinStage: number,
        baseGrowthRates?: GrowthRates,
        isTemporary: boolean = false
    ): Promise<boolean> {
        if (!this.persistenceManager) {
            console.warn('Persistence manager not initialized');
            return false;
        }

        try {
            const settings = {
                characterId,
                initialLevel,
                initialExperience,
                baseGrowthRates,
                joinChapter,
                joinStage,
                isTemporary
            };

            const initResult = await this.persistenceManager.initializeNewCharacterExperience(settings);

            if (!initResult.success) {
                console.error('Failed to initialize new character experience:', initResult.message);
                return false;
            }

            // 経験値システムにも登録
            this.experienceManager.initializeCharacterExperience(
                characterId,
                initialLevel,
                initialExperience
            );

            this.systemState.activeCharacters.add(characterId);

            this.eventEmitter.emit('new-character-experience-initialized', {
                characterId,
                initialLevel,
                initialExperience,
                joinChapter,
                joinStage,
                isTemporary,
                timestamp: Date.now()
            });

            return true;

        } catch (error) {
            console.error('Failed to initialize new character experience:', error);
            return false;
        }
    }

    /**
     * 破損した経験値データを復旧
     * 要件: 7.5
     */
    public async recoverCorruptedExperienceData(
        useBackup: boolean = true,
        useDefaultValues: boolean = false
    ): Promise<boolean> {
        if (!this.persistenceManager) {
            console.warn('Persistence manager not initialized');
            return false;
        }

        try {
            const recoveryOptions = {
                useBackup,
                useSaveDataRecovery: true,
                resetCorruptedData: true,
                useDefaultValues,
                preserveProgress: true,
                attemptPartialRecovery: true,
                notifyUser: true
            };

            const recoveryResult = await this.persistenceManager.recoverCorruptedExperienceData(recoveryOptions);

            if (!recoveryResult.success) {
                console.error('Failed to recover corrupted experience data:', recoveryResult.message);
                return false;
            }

            const recoveredMap = recoveryResult.data!;

            // 復旧したデータでシステムを再初期化
            this.systemState.activeCharacters.clear();

            for (const [characterId, experienceInfo] of recoveredMap) {
                this.experienceManager.initializeCharacterExperience(
                    characterId,
                    experienceInfo.currentLevel,
                    experienceInfo.currentExperience
                );

                this.systemState.activeCharacters.add(characterId);
            }

            this.eventEmitter.emit('experience-data-recovered', {
                characterCount: recoveredMap.size,
                recoveryMethod: useBackup ? 'backup' : 'default',
                timestamp: Date.now()
            });

            return true;

        } catch (error) {
            console.error('Failed to recover corrupted experience data:', error);
            return false;
        }
    }

    /**
     * エラーハンドラーを初期化
     */
    private initializeErrorHandler(): void {
        this.errorHandler.initialize({
            maxRetryAttempts: 3,
            debugMode: this.config.debugMode,
            notificationCallback: (notification: UserNotification) => {
                this.handleUserNotification(notification);
            }
        });
    }

    /**
     * ユーザー通知を処理
     */
    private handleUserNotification(notification: UserNotification): void {
        // UI システムに通知を送信
        this.eventEmitter.emit('experience-error-notification', notification);

        // デバッグモードの場合はコンソールにも出力
        if (this.config.debugMode) {
            console.log('[ExperienceSystem] User notification:', notification);
        }
    }

    /**
     * エラー統計を取得
     */
    public getErrorStatistics() {
        return this.errorHandler.getErrorStatistics();
    }

    /**
     * エラー履歴をクリア
     */
    public clearErrorHistory(): void {
        this.errorHandler.clearErrorHistory();
    }

    /**
     * システム状態を復旧
     */
    public async recoverSystemState(options: {
        useBackup?: boolean;
        useDefaultValues?: boolean;
        resetCorruptedData?: boolean;
        preserveProgress?: boolean;
    } = {}): Promise<boolean> {
        try {
            const recoveryOptions = {
                useBackup: options.useBackup ?? true,
                useSaveDataRecovery: true,
                resetCorruptedData: options.resetCorruptedData ?? false,
                useDefaultValues: options.useDefaultValues ?? true,
                preserveProgress: options.preserveProgress ?? true,
                attemptPartialRecovery: true,
                notifyUser: true
            };

            const recoveryResult = this.errorHandler.recoverSystemState(recoveryOptions);

            if (recoveryResult.success) {
                // システムを再初期化
                this.systemState.isInitialized = false;
                const initResult = await this.initialize();

                if (initResult) {
                    this.eventEmitter.emit('experience-system-recovered', {
                        strategy: recoveryResult.strategy,
                        message: recoveryResult.message,
                        timestamp: Date.now()
                    });
                }

                return initResult;
            }

            return false;

        } catch (error) {
            console.error('Failed to recover system state:', error);
            return false;
        }
    }

    /**
     * システムを破棄
     */
    public destroy(): void {
        // エラーハンドラーを破棄
        this.errorHandler.cleanup();

        // UI要素を破棄
        this.experienceUI.destroy();

        // コンポーネントを破棄
        this.experienceManager.destroy();
        this.levelUpProcessor.destroy();

        // 永続化マネージャーを破棄
        if (this.persistenceManager) {
            this.persistenceManager.destroy();
        }

        // データをクリア
        this.battleExperienceQueue.clear();
        this.pendingLevelUps.clear();
        this.systemState.activeCharacters.clear();

        // イベントエミッターを破棄
        this.eventEmitter.removeAllListeners();

        this.eventEmitter.emit('experience-system-destroyed');
    }

    // プライベートメソッド

    /**
     * デフォルト設定を取得
     */
    private getDefaultConfig(): ExperienceSystemConfig {
        return {
            enableExperienceGain: true,
            experienceMultiplier: 1.0,
            maxLevel: 49,
            debugMode: false,
            autoLevelUp: false,
            showExperiencePopups: true,
            experienceAnimationSpeed: 1.0,
            levelUpAnimationDuration: 2000
        };
    }

    /**
     * デフォルト成長率データを作成
     */
    private createDefaultGrowthRateData(): GrowthRateData {
        return {
            characterGrowthRates: {},
            jobClassGrowthRates: {
                default: {
                    hp: 50,
                    mp: 50,
                    attack: 50,
                    defense: 50,
                    speed: 50,
                    skill: 50,
                    luck: 50
                }
            },
            statLimits: {
                maxHP: 999,
                maxMP: 999,
                attack: 99,
                defense: 99,
                speed: 99,
                skill: 99,
                luck: 99
            }
        };
    }

    /**
     * イベントリスナーを設定
     */
    private setupEventListeners(): void {
        // 経験値獲得イベント
        this.eventEmitter.on('experience-gained', (data) => {
            // 自動レベルアップが有効な場合のみレベルアップ判定を行う
            if (this.config.autoLevelUp) {
                this.checkAndProcessLevelUp(data.characterId);
            }
        });

        // レベルアップ処理イベント
        this.eventEmitter.on('level-up-processed', (data) => {
            try {
                // 経験値バーを更新
                const experienceInfo = this.getExperienceInfo(data.characterId);
                this.experienceUI.updateExperienceBar(data.characterId, experienceInfo);
            } catch (error) {
                console.warn('Failed to update experience bar after level up:', error);
            }
        });

        // エラーハンドラーからのユーザー通知イベント
        this.eventEmitter.on('experience-user-notification', (notification: UserNotification) => {
            try {
                this.experienceUI.showUserNotification(notification);
            } catch (error) {
                console.error('Failed to show user notification:', error);
                // フォールバック: コンソールに通知内容を出力
                console.warn(`[Notification] ${notification.title}: ${notification.message}`);
            }
        });

        // エラー処理完了イベント
        this.eventEmitter.on('experience-error-handled', (eventData) => {
            console.log(`Experience error handled: ${eventData.error} with strategy: ${eventData.strategy}`);

            // 重要なエラーの場合は追加のログ出力
            if (eventData.severity === 'critical' || eventData.severity === 'high') {
                console.warn('Important experience error occurred:', eventData);
            }
        });

        // システム回復完了イベント
        this.eventEmitter.on('system-recovery-completed', (eventData) => {
            if (eventData.success) {
                console.log('Experience system recovery completed successfully');

                // 回復成功の通知を表示
                const notification: UserNotification = {
                    type: NotificationType.SUCCESS,
                    title: 'システム回復完了',
                    message: '経験値システムが正常に回復しました。',
                    autoHide: true,
                    duration: 4000
                };

                this.experienceUI.showUserNotification(notification);
            } else {
                console.error('Experience system recovery failed:', eventData.error);

                // 回復失敗の通知を表示
                const notification: UserNotification = {
                    type: NotificationType.ERROR,
                    title: 'システム回復失敗',
                    message: '経験値システムの回復に失敗しました。ゲームを再起動してください。',
                    actionRequired: true,
                    suggestedActions: ['ゲームを再起動してください'],
                    autoHide: false
                };

                this.experienceUI.showUserNotification(notification);
            }
        });

        // キャラクターデータ修復完了イベント
        this.eventEmitter.on('character-data-repaired', (eventData) => {
            console.log(`Character data repaired for ${eventData.characterId}`);

            const notification: UserNotification = {
                type: NotificationType.SUCCESS,
                title: 'データ修復完了',
                message: `キャラクター「${eventData.characterId}」のデータを修復しました。`,
                autoHide: true,
                duration: 3000
            };

            this.experienceUI.showUserNotification(notification);
        });
    }

    /**
     * 永続化イベントリスナーを設定
     */
    private setupPersistenceEventListeners(): void {
        if (!this.persistenceManager) {
            return;
        }

        // 永続化マネージャーのイベントを監視
        this.persistenceManager.on('experience-data-saved', (data) => {
            this.eventEmitter.emit('experience-persistence-saved', data);
        });

        this.persistenceManager.on('experience-data-loaded', (data) => {
            this.eventEmitter.emit('experience-persistence-loaded', data);
        });

        this.persistenceManager.on('experience-data-recovered', (data) => {
            this.eventEmitter.emit('experience-persistence-recovered', data);
        });

        this.persistenceManager.on('new-character-experience-initialized', (data) => {
            this.eventEmitter.emit('experience-persistence-character-initialized', data);
        });

        this.persistenceManager.on('chapter-progress-saved', (data) => {
            this.eventEmitter.emit('experience-persistence-chapter-saved', data);
        });
    }

    /**
     * 経験値獲得量を計算
     */
    private calculateExperienceGain(
        action: ExperienceAction,
        context: ExperienceContext
    ): ExperienceCalculationResult {
        const source = context.source;
        const baseAmount = this.experienceDataLoader.getExperienceGain(source);
        const multiplier = context.multiplier || this.systemState.experienceMultiplier;
        const bonusAmount = context.bonusAmount || 0;

        const multipliedAmount = Math.floor(baseAmount * multiplier);
        const finalAmount = multipliedAmount + bonusAmount;

        return {
            baseAmount,
            multipliedAmount,
            bonusAmount,
            finalAmount: Math.max(0, finalAmount),
            source,
            action,
            context
        };
    }

    /**
     * アクションを経験値ソースにマッピング
     */
    private mapActionToSource(action: ExperienceAction): ExperienceSource {
        switch (action) {
            case ExperienceAction.ATTACK:
                return ExperienceSource.ATTACK_HIT;
            case ExperienceAction.DEFEAT:
                return ExperienceSource.ENEMY_DEFEAT;
            case ExperienceAction.HEAL:
                return ExperienceSource.HEALING;
            case ExperienceAction.SUPPORT:
            case ExperienceAction.BUFF_APPLY:
            case ExperienceAction.DEBUFF_APPLY:
                return ExperienceSource.ALLY_SUPPORT;
            case ExperienceAction.SKILL_CAST:
                return ExperienceSource.SKILL_USE;
            default:
                return ExperienceSource.ATTACK_HIT;
        }
    }

    /**
     * 経験値進捗率を計算
     */
    private calculateExperienceProgress(experienceInfo: ExperienceInfo): number {
        if (experienceInfo.experienceToNextLevel <= 0) {
            return 1.0;
        }

        const currentLevelExp = this.experienceDataLoader.getRequiredExperience(experienceInfo.currentLevel);
        const nextLevelExp = this.experienceDataLoader.getRequiredExperience(experienceInfo.currentLevel + 1);
        const currentExp = experienceInfo.currentExperience;

        if (nextLevelExp <= currentLevelExp) {
            return 1.0;
        }

        const levelExpRange = nextLevelExp - currentLevelExp;
        const currentProgress = currentExp - currentLevelExp;

        return Math.max(0, Math.min(1, currentProgress / levelExpRange));
    }

    /**
     * キャラクターをIDで取得（ダミー実装）
     */
    private getCharacterById(characterId: string): Unit | null {
        // TODO: 実際のキャラクター管理システムから取得
        // 現在はダミー実装
        return {
            id: characterId,
            name: `Character ${characterId}`,
            position: { x: 0, y: 0 },
            stats: {
                maxHP: 100,
                maxMP: 50,
                attack: 20,
                defense: 15,
                speed: 10,
                movement: 3
            },
            currentHP: 100,
            currentMP: 50,
            faction: 'player',
            hasActed: false,
            hasMoved: false
        };
    }

    /**
     * キャラクターのスクリーン座標を取得
     */
    private getCharacterScreenPosition(character: Unit): { x: number; y: number } {
        // TODO: 実際のマップシステムから座標変換
        return {
            x: character.position.x * 32 + 16,
            y: character.position.y * 32 + 16
        };
    }

    /**
     * 戦闘経験値キューに追加
     */
    private addToBattleExperienceQueue(characterId: string, result: ExperienceCalculationResult): void {
        if (!this.battleExperienceQueue.has(characterId)) {
            this.battleExperienceQueue.set(characterId, []);
        }
        this.battleExperienceQueue.get(characterId)!.push(result);
    }

    /**
     * 保留レベルアップに追加
     */
    private addToPendingLevelUps(characterId: string, result: LevelUpResult): void {
        if (!this.pendingLevelUps.has(characterId)) {
            this.pendingLevelUps.set(characterId, []);
        }
        this.pendingLevelUps.get(characterId)!.push(result);
    }

    /**
     * レベルアップ演出を表示
     */
    private async showLevelUpEffect(character: Unit, result: LevelUpResult): Promise<void> {
        try {
            await this.experienceUI.showLevelUpEffect(character, result);
            this.experienceUI.showGrowthResults(character, result.statGrowth);
        } catch (error) {
            console.error('Failed to show level up effect:', error);
        }
    }

    /**
     * 戦闘中レベルアップを適用
     */
    private applyLevelUpInBattle(characterId: string, result: LevelUpResult): void {
        // 戦闘中の場合は能力値を即座に更新
        const character = this.getCharacterById(characterId);
        if (character) {
            // HP/MPの比例調整
            this.levelUpProcessor.adjustCurrentStats(
                character,
                result.oldStats.maxHP,
                result.oldStats.maxMP
            );

            this.eventEmitter.emit('battle-level-up-applied', {
                characterId,
                result
            });
        }
    }

    /**
     * エラーハンドラーを初期化
     */
    private initializeErrorHandler(): void {
        // エラーハンドラーのイベントリスナーを設定
        this.errorHandler.on('user-notification', (notification: UserNotification) => {
            // UIシステムに通知を転送
            this.eventEmitter.emit('experience-user-notification', notification);
        });

        this.errorHandler.on('experience-error-handled', (eventData: any) => {
            // エラー処理イベントを転送
            this.eventEmitter.emit('experience-error-handled', eventData);
        });

        // 回復オプションを設定
        this.errorHandler.setRecoveryOptions({
            useBackup: true,
            useSaveDataRecovery: true,
            resetCorruptedData: true,
            useDefaultValues: true,
            preserveProgress: true,
            attemptPartialRecovery: true,
            notifyUser: true
        });

        console.log('Experience error handler initialized');
    }

    /**
     * エラーハンドラーを取得
     */
    public getErrorHandler(): ExperienceErrorHandler {
        return this.errorHandler;
    }

    /**
     * エラー統計情報を取得
     */
    public getErrorStatistics(): ErrorStatistics {
        return this.errorHandler.getErrorStatistics();
    }

    /**
     * システム状態の復旧を試行
     */
    public async attemptSystemRecovery(): Promise<boolean> {
        try {
            console.log('Attempting system recovery...');

            // システム状態をクリーンアップ
            this.errorHandler.cleanupSystemState();

            // 初期化状態をリセット
            this.systemState.isInitialized = false;

            // システムを再初期化
            const recoveryResult = await this.initialize();

            if (recoveryResult) {
                console.log('System recovery successful');
                this.eventEmitter.emit('system-recovery-completed', { success: true });
                return true;
            } else {
                console.error('System recovery failed');
                this.eventEmitter.emit('system-recovery-completed', { success: false });
                return false;
            }

        } catch (error) {
            console.error('System recovery failed with error:', error);
            this.eventEmitter.emit('system-recovery-completed', { success: false, error });
            return false;
        }
    }

    /**
     * 破損したキャラクターデータの修復を試行
     */
    public repairCharacterData(characterId: string, corruptedData?: any): boolean {
        try {
            console.log(`Attempting to repair character data for ${characterId}`);

            // エラーハンドラーでデータ修復を試行
            const repairedData = this.errorHandler.attemptDataRepair(characterId, corruptedData);

            if (repairedData) {
                // 修復されたデータでキャラクターを再初期化
                this.experienceManager.initializeCharacterExperience(
                    characterId,
                    repairedData.currentLevel,
                    repairedData.currentExperience
                );

                this.systemState.activeCharacters.add(characterId);

                console.log(`Successfully repaired character data for ${characterId}`);
                this.eventEmitter.emit('character-data-repaired', { characterId, repairedData });
                return true;
            } else {
                console.warn(`Failed to repair character data for ${characterId}`);
                return false;
            }

        } catch (error) {
            console.error(`Error during character data repair for ${characterId}:`, error);
            return false;
        }
    }

    /**
     * デバッグ情報を取得
     */
    public getDebugInfo(): any {
        return {
            systemState: this.systemState,
            config: this.config,
            activeCharacters: Array.from(this.systemState.activeCharacters),
            battleQueueSize: this.battleExperienceQueue.size,
            pendingLevelUpsSize: this.pendingLevelUps.size,
            errorStatistics: this.errorHandler.getErrorStatistics(),
            components: {
                experienceDataLoader: this.experienceDataLoader.isDataLoaded(),
                experienceManager: this.experienceManager.getDebugInfo(),
                levelUpProcessor: this.levelUpProcessor.getDebugInfo(),
                growthCalculator: this.growthCalculator.isDataLoaded(),
                experienceUI: this.experienceUI.getDebugInfo()
            }
        };
    }
}
 /**
     * パフォーマンス最適化を初期化
     * 要件: 8.1, 8.2, 8.3, 8.4, 8.5
     */
    private initializePerformanceOptimization(): void {
    // バッチプロセッサーに経験値システムを設定
    this.batchProcessor.setExperienceSystem(this);

    // パフォーマンスマネージャーに最適化コンポーネントを登録
    this.performanceManager.registerOptimizationComponents({
        cacheManager: this.cache,
        objectPoolManager: this.objectPool,
        batchProcessor: this.batchProcessor
    });

    // パフォーマンス監視を開始
    this.performanceManager.startMonitoring();

    // パフォーマンスアラートのコールバックを設定
    this.performanceManager.onPerformanceAlert((alert) => {
        console.warn(`Experience System Performance Alert [${alert.severity}]: ${alert.message}`);

        // UIにユーザー通知を表示
        const notification: UserNotification = {
            type: alert.type === 'performance' ? 'warning' : 'error',
            title: 'Performance Alert',
            message: alert.message,
            details: alert.suggestions.join(', '),
            autoHide: true,
            duration: 5000
        };

        this.experienceUI.showUserNotification(notification);
    });

    console.log('Experience system performance optimization initialized');
}

    /**
     * 経験値計算のパフォーマンス測定付きラッパー
     * 要件: 8.1
     */
    private measureExperienceCalculation<T>(operation: string, fn: () => T): T {
    this.performanceManager.startTimer('experience-calculation');
    try {
        const result = fn();
        return result;
    } finally {
        this.performanceManager.endTimer('experience-calculation');
    }
}

    /**
     * レベルアップ処理のパフォーマンス測定付きラッパー
     * 要件: 8.2
     */
    private measureLevelUpProcessing<T>(operation: string, fn: () => T): T {
    this.performanceManager.startTimer('levelup-processing');
    try {
        const result = fn();
        return result;
    } finally {
        this.performanceManager.endTimer('levelup-processing');
    }
}

    /**
     * UI更新のパフォーマンス測定付きラッパー
     * 要件: 8.3
     */
    private measureUIUpdate<T>(operation: string, fn: () => T): T {
    this.performanceManager.startTimer('ui-update');
    try {
        const result = fn();
        return result;
    } finally {
        this.performanceManager.endTimer('ui-update');
    }
}

    /**
     * キャッシュ付き経験値テーブル参照
     * 要件: 8.1, 8.4
     */
    private getCachedRequiredExperience(level: number): number {
    return this.cache.getRequiredExperience(level);
}

    /**
     * キャッシュ付き経験値獲得量参照
     * 要件: 8.1, 8.4
     */
    private getCachedExperienceGain(source: string, difficulty: string = 'normal'): number {
    return this.cache.getExperienceGain(source, difficulty);
}

    /**
     * キャッシュ付き成長率参照
     * 要件: 8.1, 8.4
     */
    private getCachedGrowthRates(characterType: string): GrowthRates {
    return this.cache.getGrowthRates(characterType);
}

    /**
     * オブジェクトプール付きレベルアップエフェクト表示
     * 要件: 8.3, 8.5
     */
    private showLevelUpEffectWithPool(character: Unit, result: LevelUpResult): Promise < void> {
    return this.measureUIUpdate('levelup-effect', () => {
        const effect = this.objectPool.getLevelUpEffect();

        try {
            effect.setupEffect(result.oldLevel, result.newLevel);
            const characterPosition = this.getCharacterScreenPosition(character);
            effect.setPosition(characterPosition.x, characterPosition.y);

            // アニメーション完了後にプールに返却
            return new Promise<void>((resolve) => {
                this.scene.time.delayedCall(2000, () => {
                    this.objectPool.returnLevelUpEffect(effect);
                    resolve();
                });
            });
        } catch (error) {
            // エラー時もプールに返却
            this.objectPool.returnLevelUpEffect(effect);
            throw error;
        }
    });
}

    /**
     * バッチ処理で複数キャラクターの経験値を処理
     * 要件: 8.2
     */
    public async processBatchExperience(
    requests: Array<{
        characterId: string;
        action: ExperienceAction;
        context: ExperienceContext;
        priority?: number;
    }>
): Promise < void> {
    const batchRequests = requests.map(req => ({
        characterId: req.characterId,
        action: req.action,
        context: req.context,
        priority: req.priority || 0
    }));

    this.performanceManager.startTimer('batch-processing');

    try {
        this.batchProcessor.addRequests(batchRequests);
        const result = await this.batchProcessor.processBatch();

        console.log(`Batch processing completed: ${result.successfulProcessed}/${result.totalProcessed} successful`);

        if(result.errors.length > 0) {
    console.warn('Batch processing errors:', result.errors);
}
        } finally {
    this.performanceManager.endTimer('batch-processing');
}
    }

    /**
     * パフォーマンス統計を取得
     * 要件: 8.1, 8.2, 8.3, 8.4, 8.5
     */
    public getPerformanceMetrics(): {
    performance: any;
    cache: any;
    objectPool: any;
    batchProcessor: any;
} {
    return {
        performance: this.performanceManager.getMetrics(),
        cache: this.cache.getStatistics(),
        objectPool: this.objectPool.getStatistics(),
        batchProcessor: this.batchProcessor.getStatistics()
    };
}

    /**
     * パフォーマンス最適化を手動実行
     * 要件: 8.1, 8.2, 8.3, 8.4, 8.5
     */
    public async optimizePerformance(): Promise < void> {
    console.log('Starting experience system performance optimization...');

    const results = await Promise.allSettled([
        this.performanceManager.performOptimization(),
        this.cache.optimize(),
        this.objectPool.optimize(),
        this.batchProcessor.optimize()
    ]);

    results.forEach((result, index) => {
        const componentNames = ['PerformanceManager', 'Cache', 'ObjectPool', 'BatchProcessor'];
        if (result.status === 'fulfilled') {
            console.log(`${componentNames[index]} optimization completed`);
        } else {
            console.error(`${componentNames[index]} optimization failed:`, result.reason);
        }
    });

    console.log('Experience system performance optimization completed');
}

    /**
     * パフォーマンスレポートを生成
     * 要件: 8.1, 8.2, 8.3, 8.4, 8.5
     */
    public generatePerformanceReport(): string {
    const performanceReport = this.performanceManager.generatePerformanceReport();
    const cacheStats = this.cache.getStatistics();
    const poolStats = this.objectPool.getStatistics();
    const batchStats = this.batchProcessor.getStatistics();

    const report = [
        performanceReport,
        '',
        '--- Cache Statistics ---',
        `Total Requests: ${cacheStats.totalRequests}`,
        `Cache Hits: ${cacheStats.cacheHits}`,
        `Hit Rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`,
        `Entry Count: ${cacheStats.entryCount}`,
        `Total Size: ${(cacheStats.totalSize / 1024).toFixed(1)}KB`,
        '',
        '--- Object Pool Statistics ---',
        `Total Created: ${poolStats.totalCreated}`,
        `Total Reused: ${poolStats.totalReused}`,
        `Reuse Rate: ${(poolStats.reuseRate * 100).toFixed(1)}%`,
        `Current Active: ${poolStats.currentActive}`,
        `Current Inactive: ${poolStats.currentInactive}`,
        `Peak Usage: ${poolStats.peakUsage}`,
        '',
        '--- Batch Processor Statistics ---',
        `Total Batches: ${batchStats.totalBatches}`,
        `Total Operations: ${batchStats.totalOperations}`,
        `Average Batch Size: ${batchStats.averageBatchSize.toFixed(1)}`,
        `Average Processing Time: ${batchStats.averageProcessingTime.toFixed(2)}ms`,
        `Success Rate: ${(batchStats.successRate * 100).toFixed(1)}%`,
        `Throughput: ${batchStats.throughputPerSecond.toFixed(1)} ops/sec`
    ];

    return report.join('\n');
}

    /**
     * メモリ使用量を記録
     * 要件: 8.5
     */
    private recordMemoryUsage(objectType: string, size: number): void {
    this.performanceManager.recordMemoryUsage(objectType, size);
}

    /**
     * メモリ解放を記録
     * 要件: 8.5
     */
    private recordMemoryRelease(objectType: string, size: number): void {
    this.performanceManager.recordMemoryRelease(objectType, size);
}

    /**
     * システム終了時のリソース解放
     * 要件: 8.5
     */
    public dispose(): void {
    console.log('Disposing experience system...');

    // パフォーマンス監視を停止
    this.performanceManager.stopMonitoring();

    // 各コンポーネントのリソースを解放
    this.cache.dispose();
    this.objectPool.dispose();
    this.batchProcessor.clearQueue();

    // UI要素をクリア
    this.experienceUI.clearAll();

    // イベントリスナーを削除
    this.eventEmitter.removeAllListeners();

    // 内部状態をクリア
    this.battleExperienceQueue.clear();
    this.pendingLevelUps.clear();
    this.systemState.activeCharacters.clear();

    console.log('Experience system disposed');
}
}