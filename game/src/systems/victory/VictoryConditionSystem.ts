/**
 * VictoryConditionSystem - メインコントローラークラス
 * 
 * ボス戦・勝利条件システム全体を統合管理するメインコントローラー
 * 
 * 主な責務:
 * - システム初期化とステージデータ読み込み
 * - 目標進捗更新の統合
 * - 勝利・敗北判定の統合
 * - ボス撃破処理の統合
 * - ステージクリア/失敗処理の統合
 * - 報酬配布の統合
 * 
 * 要件: 1.1, 2.8, 3.3, 3.4, 4.1, 4.7
 */

import Phaser from 'phaser';
import { ObjectiveManager } from './ObjectiveManager';
import { BossSystem } from './BossSystem';
import { VictoryConditionManager } from './VictoryConditionManager';
import { RewardCalculator, StageData as RewardStageData } from './RewardCalculator';
import { VictoryConditionPersistenceManager } from './VictoryConditionPersistenceManager';
import { VictoryConditionPerformanceManager } from './VictoryConditionPerformanceManager';
import { BossEffectPool } from './BossEffectPool';
import {
  Objective,
  ObjectiveType,
  VictoryCondition,
  DefeatCondition,
  VictoryCheckResult,
  DefeatCheckResult,
} from '../../types/victory';
import { BossData, BossDefeatResult } from '../../types/boss';
import { Unit, GameState } from '../../types/gameplay';
import {
  StageRewards,
  StagePerformance,
  StageCompleteResult,
  StageFailureResult,
} from '../../types/reward';
import { SaveDataManager } from '../SaveDataManager';

/**
 * ステージデータ（VictoryConditionSystem用）
 */
export interface VictoryStageData {
  id: string;
  name: string;
  description: string;
  
  // 目標データ
  objectives: Objective[];
  
  // 勝利・敗北条件
  victoryConditions: VictoryCondition[];
  defeatConditions: DefeatCondition[];
  
  // ボスデータ
  bosses: BossData[];
  
  // 報酬計算用データ
  baseExperienceReward: number;
  targetTurns: number;
  maxTurns: number;
}

/**
 * VictoryConditionSystem設定
 */
export interface VictoryConditionSystemConfig {
  /** デバッグログを有効化 */
  enableDebugLogs: boolean;
  
  /** 自動的に勝利・敗北判定を実行 */
  autoCheckConditions: boolean;
  
  /** ターン終了時に自動判定 */
  checkOnTurnEnd: boolean;
  
  /** ボス撃破時に自動判定 */
  checkOnBossDefeat: boolean;
}

/**
 * システム初期化結果
 */
export interface SystemInitResult {
  success: boolean;
  message?: string;
  error?: string;
  objectivesRegistered?: number;
  conditionsRegistered?: number;
  bossesRegistered?: number;
}

/**
 * VictoryConditionSystem - メインコントローラー
 */
export class VictoryConditionSystem extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private config: VictoryConditionSystemConfig;
  
  // サブシステム
  private objectiveManager: ObjectiveManager;
  private bossSystem: BossSystem;
  private victoryConditionManager: VictoryConditionManager;
  private rewardCalculator: RewardCalculator;
  private persistenceManager?: VictoryConditionPersistenceManager;
  private performanceManager: VictoryConditionPerformanceManager;
  private bossEffectPool: BossEffectPool;
  
  // 外部システム参照
  private recruitmentSystem?: any; // RecruitmentSystemへの参照
  
  // ステージデータ
  private currentStageData: VictoryStageData | null = null;
  
  // パフォーマンストラッキング
  private stagePerformance: StagePerformance = {
    turnsUsed: 0,
    unitsLost: 0,
    enemiesDefeated: 0,
    bossesDefeated: 0,
    recruitmentSuccesses: 0,
    damageDealt: 0,
    damageTaken: 0,
    healingDone: 0,
  };
  
  // 状態管理
  private isInitialized: boolean = false;
  private isStageComplete: boolean = false;
  private isStageFailed: boolean = false;
  
  // デフォルト設定
  private static readonly DEFAULT_CONFIG: VictoryConditionSystemConfig = {
    enableDebugLogs: false,
    autoCheckConditions: true,
    checkOnTurnEnd: true,
    checkOnBossDefeat: true,
  };

  /**
   * コンストラクタ
   * @param scene Phaserシーン
   * @param config システム設定
   */
  constructor(scene: Phaser.Scene, config?: Partial<VictoryConditionSystemConfig>) {
    super();
    
    this.scene = scene;
    this.config = { ...VictoryConditionSystem.DEFAULT_CONFIG, ...config };
    
    // サブシステムの初期化
    this.objectiveManager = new ObjectiveManager(scene, {
      enableDebugLogs: this.config.enableDebugLogs,
    });
    
    this.bossSystem = new BossSystem();
    this.victoryConditionManager = new VictoryConditionManager();
    this.rewardCalculator = new RewardCalculator();
    
    // パフォーマンスマネージャーの初期化
    this.performanceManager = new VictoryConditionPerformanceManager({
      enableDebugLogs: this.config.enableDebugLogs,
    });
    
    // ボスエフェクトプールの初期化
    this.bossEffectPool = new BossEffectPool(scene);
    
    this.setupEventListeners();
    this.log('VictoryConditionSystem created');
  }

  /**
   * システムを初期化してステージデータを読み込む
   * 要件1.1: ステージの勝利条件・敗北条件を読み込む
   * 
   * @param stageData ステージデータ
   * @returns 初期化結果
   */
  public initialize(stageData: VictoryStageData): SystemInitResult {
    try {
      this.log('Initializing VictoryConditionSystem...');
      
      // ステージデータの検証
      if (!this.validateStageData(stageData)) {
        return {
          success: false,
          error: 'INVALID_STAGE_DATA',
          message: 'Stage data validation failed',
        };
      }
      
      // 既存データのクリア
      this.reset();
      
      // ステージデータを保存
      this.currentStageData = stageData;
      
      // 目標を登録
      let objectivesRegistered = 0;
      for (const objective of stageData.objectives) {
        const result = this.objectiveManager.registerObjective(objective);
        if (result.success) {
          objectivesRegistered++;
        } else {
          this.log(`Warning: Failed to register objective ${objective.id}: ${result.message}`);
        }
      }
      
      // 勝利・敗北条件を登録
      this.victoryConditionManager.registerVictoryConditions(stageData.victoryConditions);
      this.victoryConditionManager.registerDefeatConditions(stageData.defeatConditions);
      
      // ボスを登録（実際のユニットは後で登録）
      const bossesRegistered = stageData.bosses.length;
      
      // 初期化完了
      this.isInitialized = true;
      this.isStageComplete = false;
      this.isStageFailed = false;
      
      // パフォーマンスデータをリセット
      this.resetPerformanceTracking();
      
      // イベント発行
      this.emit('system-initialized', {
        stageId: stageData.id,
        objectivesRegistered,
        conditionsRegistered: stageData.victoryConditions.length + stageData.defeatConditions.length,
        bossesRegistered,
      });
      
      this.log(`System initialized: ${objectivesRegistered} objectives, ${bossesRegistered} bosses`);
      
      return {
        success: true,
        message: 'System initialized successfully',
        objectivesRegistered,
        conditionsRegistered: stageData.victoryConditions.length + stageData.defeatConditions.length,
        bossesRegistered,
      };
    } catch (error) {
      console.error('Error initializing VictoryConditionSystem:', error);
      return {
        success: false,
        error: 'INITIALIZATION_ERROR',
        message: `Failed to initialize system: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 目標進捗を更新
   * 要件1.4: 目標の進捗が変化するとき、進捗状況を更新する
   * 要件13.2: 目標進捗更新の効率的なバッチ処理
   * 
   * @param objectiveId 目標ID
   * @param current 現在値
   * @param target 目標値（オプション）
   */
  public updateObjectiveProgress(objectiveId: string, current: number, target?: number): void {
    if (!this.isInitialized) {
      this.log('Warning: System not initialized, cannot update objective progress');
      return;
    }
    
    // バッチキューに追加
    this.performanceManager.queueObjectiveUpdate(objectiveId, current, target);
  }
  
  /**
   * バッチ更新をフラッシュして実際に目標を更新
   * 要件13.2: バッチ処理の実行
   */
  public flushObjectiveUpdates(): void {
    const updates = this.performanceManager.flushBatchUpdates();
    
    for (const update of updates) {
      const progress: any = { current: update.current };
      if (update.target !== undefined) {
        progress.target = update.target;
      }
      
      const result = this.objectiveManager.updateProgress(update.objectiveId, progress);
      
      if (result.success) {
        this.log(`Objective progress updated: ${update.objectiveId} (${result.newProgress.current}/${result.newProgress.target})`);
        
        // 目標達成時の自動判定
        if (result.isComplete && this.config.autoCheckConditions) {
          this.checkVictoryConditions();
        }
      } else {
        this.log(`Warning: Failed to update objective progress: ${result.error}`);
      }
    }
  }

  /**
   * 勝利条件をチェック
   * 要件3.3: すべての勝利条件が満たされるとき、勝利状態に遷移する
   * 要件13.1: 勝利・敗北条件判定のキャッシュシステム
   * 
   * @param gameState 現在のゲーム状態
   * @returns 勝利判定結果
   */
  public checkVictoryConditions(gameState?: GameState): VictoryCheckResult {
    if (!this.isInitialized) {
      this.log('Warning: System not initialized, cannot check victory conditions');
      return {
        isVictory: false,
        satisfiedConditions: [],
        unsatisfiedConditions: [],
        message: 'System not initialized',
      };
    }
    
    if (this.isStageComplete || this.isStageFailed) {
      this.log('Warning: Stage already complete or failed');
      return {
        isVictory: this.isStageComplete,
        satisfiedConditions: [],
        unsatisfiedConditions: [],
        message: 'Stage already complete',
      };
    }
    
    // ゲーム状態が提供されていない場合はダミーを使用
    const state = gameState || this.createDummyGameState();
    
    // キャッシュから取得を試みる
    const cachedResult = this.performanceManager.getCachedVictoryCheck(state);
    if (cachedResult) {
      this.log('Using cached victory check result');
      return cachedResult;
    }
    
    // キャッシュにない場合は判定を実行
    const result = this.victoryConditionManager.checkVictory(state);
    
    // 結果をキャッシュ
    this.performanceManager.cacheVictoryCheck(state, result);
    
    if (result.isVictory) {
      this.log('Victory conditions satisfied!');
      this.emit('victory-conditions-met', result);
    }
    
    return result;
  }

  /**
   * 敗北条件をチェック
   * 要件3.4: いずれかの敗北条件が満たされるとき、敗北状態に遷移する
   * 要件13.1: 勝利・敗北条件判定のキャッシュシステム
   * 
   * @param gameState 現在のゲーム状態
   * @returns 敗北判定結果
   */
  public checkDefeatConditions(gameState?: GameState): DefeatCheckResult {
    if (!this.isInitialized) {
      this.log('Warning: System not initialized, cannot check defeat conditions');
      return {
        isDefeat: false,
        triggeredConditions: [],
        message: 'System not initialized',
      };
    }
    
    if (this.isStageComplete || this.isStageFailed) {
      this.log('Warning: Stage already complete or failed');
      return {
        isDefeat: this.isStageFailed,
        triggeredConditions: [],
        message: 'Stage already complete',
      };
    }
    
    // ゲーム状態が提供されていない場合はダミーを使用
    const state = gameState || this.createDummyGameState();
    
    // キャッシュから取得を試みる
    const cachedResult = this.performanceManager.getCachedDefeatCheck(state);
    if (cachedResult) {
      this.log('Using cached defeat check result');
      return cachedResult;
    }
    
    // キャッシュにない場合は判定を実行
    const result = this.victoryConditionManager.checkDefeat(state);
    
    // 結果をキャッシュ
    this.performanceManager.cacheDefeatCheck(state, result);
    
    if (result.isDefeat) {
      this.log('Defeat conditions triggered!');
      this.emit('defeat-conditions-met', result);
    }
    
    return result;
  }

  /**
   * ボス撃破処理
   * 要件2.8: ボスが撃破されるとき、ボス撃破イベントを発行する
   * 
   * @param boss 撃破されたボスユニット
   * @returns ボス撃破結果
   */
  public async handleBossDefeat(boss: Unit): Promise<BossDefeatResult> {
    if (!this.isInitialized) {
      throw new Error('System not initialized');
    }
    
    this.log(`Handling boss defeat: ${boss.id}`);
    
    // ボスシステムで撃破処理
    const defeatResult = await this.bossSystem.handleBossDefeat(boss);
    
    // パフォーマンストラッキング更新
    this.stagePerformance.bossesDefeated++;
    this.stagePerformance.enemiesDefeated++;
    
    // ボス撃破目標の更新
    this.updateBossDefeatObjectives(boss.id);
    
    // イベント発行
    this.emit('boss-defeated-integrated', defeatResult);
    
    // 自動判定
    if (this.config.checkOnBossDefeat) {
      this.checkVictoryConditions();
    }
    
    return defeatResult;
  }

  /**
   * RecruitmentSystemへの参照を設定
   * 要件8.1: Recruitment_Systemから仲間化状態を取得する
   * 
   * @param recruitmentSystem RecruitmentSystemインスタンス
   */
  public setRecruitmentSystem(recruitmentSystem: any): void {
    this.recruitmentSystem = recruitmentSystem;
    this.log('RecruitmentSystem reference set');
  }

  /**
   * PersistenceManagerを設定
   * 要件11.1-11.5: データ永続化機能を統合
   * 
   * @param saveDataManager SaveDataManagerインスタンス
   */
  public setPersistenceManager(saveDataManager: SaveDataManager): void {
    this.persistenceManager = new VictoryConditionPersistenceManager(saveDataManager, {
      logPersistenceOperations: this.config.enableDebugLogs
    });
    this.log('PersistenceManager set');
  }

  /**
   * PersistenceManagerを初期化
   * 要件11.5: セーブデータとの整合性を保つ
   */
  public async initializePersistence(): Promise<boolean> {
    if (!this.persistenceManager) {
      this.log('Warning: PersistenceManager not set');
      return false;
    }

    const result = await this.persistenceManager.initialize();
    if (result.success) {
      this.log('PersistenceManager initialized successfully');
      return true;
    } else {
      this.log(`Warning: Failed to initialize PersistenceManager: ${result.message}`);
      return false;
    }
  }

  /**
   * ステージクリア処理
   * 要件4.1: ステージがクリアされるとき、報酬計算を実行する
   * 要件8.1: ステージクリア時の仲間化状態取得を統合
   * 
   * @param gameState 最終ゲーム状態
   * @param allUnits ステージ内の全ユニット
   * @returns ステージクリア結果
   */
  public async handleStageComplete(
    gameState: GameState,
    allUnits: Unit[] = []
  ): Promise<StageCompleteResult> {
    if (!this.isInitialized || !this.currentStageData) {
      throw new Error('System not initialized or no stage data');
    }
    
    if (this.isStageComplete) {
      throw new Error('Stage already complete');
    }
    
    if (this.isStageFailed) {
      throw new Error('Stage already failed');
    }
    
    this.log('Handling stage complete...');
    
    // ステージ完了フラグを設定
    this.isStageComplete = true;
    
    // パフォーマンスデータを更新
    this.stagePerformance.turnsUsed = gameState.currentTurn;
    
    // RecruitmentSystemから仲間化状態を取得
    // 要件8.1: ステージクリア時の仲間化状態取得を統合
    let recruitedCharacterIds: string[] = [];
    if (this.recruitmentSystem && typeof this.recruitmentSystem.completeRecruitment === 'function') {
      try {
        const recruitedUnits = this.recruitmentSystem.completeRecruitment(allUnits);
        recruitedCharacterIds = recruitedUnits.map((ru: any) => ru.unit.id);
        
        // 仲間化成功数を記録
        this.stagePerformance.recruitmentSuccesses = recruitedCharacterIds.length;
        
        this.log(`Recruitment completed: ${recruitedCharacterIds.length} characters recruited`);
        
        // 仲間化完了イベントを発行
        this.emit('recruitment-completed-on-stage-clear', {
          recruitedUnits,
          recruitedCharacterIds,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Error completing recruitment:', error);
        this.log(`Warning: Failed to complete recruitment: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      this.log('Warning: RecruitmentSystem not available or completeRecruitment method not found');
    }
    
    // 報酬を計算
    const rewards = this.calculateStageRewards(recruitedCharacterIds);
    
    // ステージクリア結果を作成
    const result: StageCompleteResult = {
      stageId: this.currentStageData.id,
      stageName: this.currentStageData.name,
      clearRating: rewards.clearRatingBonus.rating,
      rewards,
      performance: { ...this.stagePerformance },
      timestamp: Date.now(),
    };

    // データ永続化: ステージクリア状態を保存
    // 要件11.1: ステージがクリアされるとき、クリア状態を保存する
    if (this.persistenceManager) {
      const stageClearData = {
        stageId: result.stageId,
        stageName: result.stageName,
        clearedAt: result.timestamp,
        clearRating: result.clearRating,
        turnsUsed: this.stagePerformance.turnsUsed,
        unitsLost: this.stagePerformance.unitsLost,
        bossesDefeated: this.stagePerformance.bossesDefeated,
        recruitmentSuccesses: this.stagePerformance.recruitmentSuccesses
      };

      const saveResult = await this.persistenceManager.saveStageClearData(stageClearData);
      if (!saveResult.success) {
        this.log(`Warning: Failed to save stage clear data: ${saveResult.message}`);
      }

      // 報酬情報を保存
      // 要件11.3: 報酬が付与されるとき、報酬情報を保存する
      const rewardData = {
        stageId: result.stageId,
        rewards: result.rewards,
        distributedAt: result.timestamp
      };

      const rewardSaveResult = await this.persistenceManager.saveRewardData(rewardData);
      if (!rewardSaveResult.success) {
        this.log(`Warning: Failed to save reward data: ${rewardSaveResult.message}`);
      }

      // 前ステージ状態を保存
      // 要件11.4: 次ステージに進むとき、前ステージの状態を読み込む
      const previousStageState = {
        stageId: result.stageId,
        performance: result.performance,
        rewards: result.rewards,
        completedAt: result.timestamp
      };

      const stateSaveResult = await this.persistenceManager.savePreviousStageState(previousStageState);
      if (!stateSaveResult.success) {
        this.log(`Warning: Failed to save previous stage state: ${stateSaveResult.message}`);
      }

      // 薔薇の力総量を保存
      // 要件11.2: 薔薇の力が付与されるとき、薔薇の力の総量を保存する
      if (rewards.bossRewards.length > 0) {
        const roseEssenceData = await this.calculateTotalRoseEssence(rewards.bossRewards);
        const roseEssenceSaveResult = await this.persistenceManager.saveRoseEssenceData(roseEssenceData);
        if (!roseEssenceSaveResult.success) {
          this.log(`Warning: Failed to save rose essence data: ${roseEssenceSaveResult.message}`);
        }
      }
    }
    
    // イベント発行
    this.emit('stage-complete', result);
    
    this.log(`Stage complete: ${result.stageName} (Rating: ${result.clearRating})`);
    
    return result;
  }

  /**
   * ステージ失敗処理
   * 要件3.8: 敗北状態に遷移するとき、ゲーム進行を停止する
   * 
   * @param defeatReason 敗北理由
   * @param gameState 最終ゲーム状態
   * @returns ステージ失敗結果
   */
  public async handleStageFailure(
    defeatReason: string,
    gameState?: GameState
  ): Promise<StageFailureResult> {
    if (!this.isInitialized || !this.currentStageData) {
      throw new Error('System not initialized or no stage data');
    }
    
    if (this.isStageFailed) {
      throw new Error('Stage already failed');
    }
    
    if (this.isStageComplete) {
      throw new Error('Stage already complete');
    }
    
    this.log(`Handling stage failure: ${defeatReason}`);
    
    // ステージ失敗フラグを設定
    this.isStageFailed = true;
    
    // ステージ失敗結果を作成
    const result: StageFailureResult = {
      stageId: this.currentStageData.id,
      stageName: this.currentStageData.name,
      defeatReason,
      turnsPlayed: gameState?.currentTurn || this.stagePerformance.turnsUsed,
      timestamp: Date.now(),
    };
    
    // イベント発行
    this.emit('stage-failure', result);
    
    this.log(`Stage failed: ${result.stageName} - ${defeatReason}`);
    
    return result;
  }

  /**
   * 報酬を配布
   * 要件4.7: プレイヤーが報酬を確認するとき、報酬受け取り処理を実行する
   * 
   * @param rewards 配布する報酬
   */
  public async distributeRewards(rewards: StageRewards): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('System not initialized');
    }
    
    this.log('Distributing rewards...');
    
    // イベント発行（実際の配布は他システムが処理）
    this.emit('distribute-rewards', {
      rewards,
      timestamp: Date.now(),
    });
    
    this.log('Rewards distribution initiated');
  }

  /**
   * ボスユニットを登録
   * @param unit ボスユニット
   * @param bossData ボスデータ
   */
  public registerBossUnit(unit: Unit, bossData: BossData): void {
    const result = this.bossSystem.registerBoss(unit, bossData);
    if (!result.success) {
      this.log(`Warning: Failed to register boss unit: ${result.message}`);
    } else {
      this.log(`Boss unit registered: ${unit.id}`);
    }
  }

  /**
   * 敵撃破を記録
   * @param unitId 撃破された敵のID
   */
  public recordEnemyDefeat(unitId: string): void {
    this.stagePerformance.enemiesDefeated++;
    this.updateEnemyDefeatObjectives();
  }

  /**
   * ユニットロストを記録
   * @param unitId ロストしたユニットのID
   */
  public recordUnitLost(unitId: string): void {
    this.stagePerformance.unitsLost++;
  }

  /**
   * 仲間化成功を記録
   * @param characterId 仲間化したキャラクターID
   */
  public recordRecruitmentSuccess(characterId: string): void {
    this.stagePerformance.recruitmentSuccesses++;
  }

  /**
   * ダメージを記録
   * @param dealt 与えたダメージ
   * @param taken 受けたダメージ
   */
  public recordDamage(dealt: number, taken: number): void {
    this.stagePerformance.damageDealt += dealt;
    this.stagePerformance.damageTaken += taken;
  }

  /**
   * 回復を記録
   * @param amount 回復量
   */
  public recordHealing(amount: number): void {
    this.stagePerformance.healingDone += amount;
  }

  /**
   * ターン終了時の処理
   * 要件1.4: 目標の進捗が変化するとき、進捗状況を更新する
   * 要件3.1: 各ターン終了時、すべての勝利条件をチェックする
   * 要件3.2: 各ターン終了時、すべての敗北条件をチェックする
   * 要件13.2: バッチ更新のフラッシュ
   * 
   * @param gameState 現在のゲーム状態
   */
  public onTurnEnd(gameState: GameState): void {
    if (!this.isInitialized) {
      this.log('Warning: System not initialized, skipping turn end processing');
      return;
    }
    
    if (this.isStageComplete || this.isStageFailed) {
      this.log('Warning: Stage already complete or failed, skipping turn end processing');
      return;
    }
    
    this.log(`Turn ${gameState.currentTurn} ended`);
    
    // ターン数を記録
    this.stagePerformance.turnsUsed = gameState.currentTurn;
    
    // バッチ更新をフラッシュ
    this.flushObjectiveUpdates();
    
    // ターン制限目標の自動更新
    this.updateTurnLimitObjectives(gameState.currentTurn);
    
    // 生存ターン目標の追跡
    this.updateSurviveTurnObjectives(gameState.currentTurn);
    
    // ターン終了時の勝利・敗北判定
    if (this.config.checkOnTurnEnd) {
      const victoryResult = this.checkVictoryConditions(gameState);
      const defeatResult = this.checkDefeatConditions(gameState);
      
      if (victoryResult.isVictory) {
        this.emit('auto-victory-detected', victoryResult);
      }
      
      if (defeatResult.isDefeat) {
        this.emit('auto-defeat-detected', defeatResult);
      }
    }
    
    // ターン終了イベントを発行
    this.emit('turn-end-processed', {
      turn: gameState.currentTurn,
      performance: { ...this.stagePerformance },
      timestamp: Date.now(),
    });
  }

  /**
   * ターン制限目標を自動更新
   * ターン制限を超えた場合に目標を失敗状態にする
   * 
   * @param currentTurn 現在のターン数
   */
  private updateTurnLimitObjectives(currentTurn: number): void {
    const objectives = this.objectiveManager.getAllObjectives();
    
    for (const objective of objectives) {
      // ターン制限目標を探す
      if (objective.targetData?.turnLimit !== undefined) {
        const turnLimit = objective.targetData.turnLimit;
        
        // ターン制限を超えた場合
        if (currentTurn > turnLimit && !objective.isComplete) {
          this.log(`Turn limit exceeded for objective ${objective.id}: ${currentTurn} > ${turnLimit}`);
          
          // 目標を失敗状態にマーク
          this.emit('objective-failed', {
            objectiveId: objective.id,
            reason: 'TURN_LIMIT_EXCEEDED',
            turnLimit,
            currentTurn,
            timestamp: Date.now(),
          });
        }
        
        // 進捗を更新（残りターン数を表示するため）
        const remainingTurns = Math.max(0, turnLimit - currentTurn);
        this.objectiveManager.updateProgress(objective.id, {
          current: currentTurn,
          target: turnLimit,
        });
        
        this.log(`Turn limit objective ${objective.id}: ${currentTurn}/${turnLimit} (${remainingTurns} turns remaining)`);
      }
    }
  }

  /**
   * 生存ターン目標を追跡
   * 指定ターン数生存することが目標の場合に進捗を更新
   * 
   * @param currentTurn 現在のターン数
   */
  private updateSurviveTurnObjectives(currentTurn: number): void {
    const objectives = this.objectiveManager.getObjectivesByType(
      ObjectiveType.SURVIVE_TURNS
    );
    
    for (const objective of objectives) {
      if (objective.targetData?.surviveTurns !== undefined) {
        const targetTurns = objective.targetData.surviveTurns;
        
        // 進捗を更新
        this.objectiveManager.updateProgress(objective.id, {
          current: currentTurn,
          target: targetTurns,
        });
        
        // 目標達成判定
        if (currentTurn >= targetTurns && !objective.isComplete) {
          this.log(`Survive turns objective ${objective.id} completed: ${currentTurn}/${targetTurns}`);
          this.objectiveManager.completeObjective(objective.id);
        }
      }
    }
  }

  /**
   * システムをリセット
   * 要件13.5: メモリリーク防止のための適切なリソース解放
   */
  public reset(): void {
    // バッチ更新をフラッシュ
    this.flushObjectiveUpdates();
    
    // サブシステムをリセット
    this.objectiveManager.clearAllObjectives();
    this.bossSystem.clearAllBosses();
    this.victoryConditionManager.clearAllConditions();
    
    // パフォーマンスマネージャーをクリア
    this.performanceManager.clearAll();
    
    // ボスエフェクトプールをクリア
    this.bossEffectPool.releaseAllPools();
    
    this.currentStageData = null;
    this.isInitialized = false;
    this.isStageComplete = false;
    this.isStageFailed = false;
    
    this.resetPerformanceTracking();
    
    this.log('System reset');
  }

  /**
   * システムを破棄
   * 要件13.5: メモリリーク防止のための適切なリソース解放
   */
  public destroy(): void {
    // バッチ更新をフラッシュ
    this.flushObjectiveUpdates();
    
    // システムをリセット
    this.reset();
    
    // サブシステムを破棄
    this.objectiveManager.destroy();
    this.bossSystem.destroy();
    this.victoryConditionManager.destroy();
    
    // パフォーマンスマネージャーを破棄
    this.performanceManager.destroy();
    
    // ボスエフェクトプールを破棄
    this.bossEffectPool.destroy();
    
    // イベントリスナーを削除
    this.removeAllListeners();
    
    this.log('System destroyed');
  }

  // ========== プライベートメソッド ==========

  /**
   * ステージデータを検証
   */
  private validateStageData(stageData: VictoryStageData): boolean {
    if (!stageData || !stageData.id || !stageData.name) {
      return false;
    }
    
    if (!Array.isArray(stageData.objectives) || stageData.objectives.length === 0) {
      return false;
    }
    
    if (!Array.isArray(stageData.victoryConditions) || stageData.victoryConditions.length === 0) {
      return false;
    }
    
    if (!Array.isArray(stageData.defeatConditions)) {
      return false;
    }
    
    return true;
  }

  /**
   * ステージ報酬を計算
   * 要件13.4: 報酬計算の最適化と遅延評価
   */
  private calculateStageRewards(recruitedCharacterIds: string[]): StageRewards {
    if (!this.currentStageData) {
      throw new Error('No stage data available');
    }
    
    // パフォーマンスハッシュを生成
    const performanceHash = this.performanceManager.generatePerformanceHash(this.stagePerformance);
    
    // キャッシュから取得を試みる
    const cachedRewards = this.performanceManager.getCachedRewardCalculation(
      this.currentStageData.id,
      performanceHash
    );
    
    if (cachedRewards) {
      this.log('Using cached reward calculation');
      return cachedRewards;
    }
    
    // キャッシュにない場合は計算を実行
    this.log('Calculating rewards...');
    
    // 報酬計算用のステージデータを作成
    const rewardStageData: RewardStageData = {
      id: this.currentStageData.id,
      name: this.currentStageData.name,
      baseExperienceReward: this.currentStageData.baseExperienceReward,
      targetTurns: this.currentStageData.targetTurns,
      maxTurns: this.currentStageData.maxTurns,
    };
    
    // 撃破したボスデータを取得
    const defeatedBosses = this.currentStageData.bosses.filter(boss =>
      !this.bossSystem.isBoss(boss.id)
    );
    
    // 報酬を計算
    const rewards = this.rewardCalculator.calculateRewards(
      rewardStageData,
      this.stagePerformance,
      defeatedBosses,
      recruitedCharacterIds
    );
    
    // 結果をキャッシュ
    this.performanceManager.cacheRewardCalculation(
      this.currentStageData.id,
      performanceHash,
      rewards
    );
    
    return rewards;
  }

  /**
   * ボス撃破目標を更新
   */
  private updateBossDefeatObjectives(bossId: string): void {
    const objectives = this.objectiveManager.getAllObjectives();
    
    for (const objective of objectives) {
      if (objective.targetData?.bossId === bossId) {
        this.objectiveManager.completeObjective(objective.id);
      }
    }
  }

  /**
   * 敵撃破目標を更新
   */
  private updateEnemyDefeatObjectives(): void {
    const objectives = this.objectiveManager.getObjectivesByType(
      ObjectiveType.DEFEAT_ALL_ENEMIES
    );
    
    for (const objective of objectives) {
      this.objectiveManager.updateProgress(
        objective.id,
        { current: this.stagePerformance.enemiesDefeated }
      );
    }
  }

  /**
   * パフォーマンストラッキングをリセット
   */
  private resetPerformanceTracking(): void {
    this.stagePerformance = {
      turnsUsed: 0,
      unitsLost: 0,
      enemiesDefeated: 0,
      bossesDefeated: 0,
      recruitmentSuccesses: 0,
      damageDealt: 0,
      damageTaken: 0,
      healingDone: 0,
    };
  }

  /**
   * ダミーのゲーム状態を作成
   */
  private createDummyGameState(): GameState {
    return {
      currentTurn: this.stagePerformance.turnsUsed,
      activePlayer: 'player',
      phase: 'select',
      gameResult: null,
      turnOrder: [],
      activeUnitIndex: 0,
    };
  }

  /**
   * イベントリスナーをセットアップ
   */
  private setupEventListeners(): void {
    // ObjectiveManagerのイベント
    this.objectiveManager.on('objective-completed', (data: any) => {
      this.emit('objective-completed', data);
    });
    
    // BossSystemのイベント
    this.bossSystem.on('boss-defeated', (data: any) => {
      this.emit('boss-defeated', data);
    });
    
    // VictoryConditionManagerのイベント
    this.victoryConditionManager.on('victory-achieved', (data: any) => {
      this.emit('victory-achieved', data);
    });
    
    this.victoryConditionManager.on('defeat-triggered', (data: any) => {
      this.emit('defeat-triggered', data);
    });
  }

  /**
   * ログ出力
   */
  private log(message: string): void {
    if (this.config.enableDebugLogs) {
      console.log(`[VictoryConditionSystem] ${message}`);
    }
  }

  /**
   * 薔薇の力の総量を計算
   * 要件11.2: 薔薇の力の総量を保存する
   */
  private async calculateTotalRoseEssence(bossRewards: any[]): Promise<any> {
    // 既存の薔薇の力データを読み込み
    let totalAmount = 0;
    const earnedFromBosses: Record<string, number> = {};

    if (this.persistenceManager) {
      const loadResult = await this.persistenceManager.loadRoseEssenceData();
      if (loadResult.success && loadResult.data) {
        totalAmount = loadResult.data.totalAmount;
        Object.assign(earnedFromBosses, loadResult.data.earnedFromBosses);
      }
    }

    // 新しいボス報酬を追加
    for (const bossReward of bossRewards) {
      totalAmount += bossReward.roseEssenceAmount;
      
      if (!earnedFromBosses[bossReward.bossId]) {
        earnedFromBosses[bossReward.bossId] = 0;
      }
      earnedFromBosses[bossReward.bossId] += bossReward.roseEssenceAmount;
    }

    return {
      totalAmount,
      earnedFromBosses,
      lastUpdatedAt: Date.now()
    };
  }

  // ========== ゲッター ==========

  public getObjectiveManager(): ObjectiveManager {
    return this.objectiveManager;
  }

  public getBossSystem(): BossSystem {
    return this.bossSystem;
  }

  public getVictoryConditionManager(): VictoryConditionManager {
    return this.victoryConditionManager;
  }

  public getRewardCalculator(): RewardCalculator {
    return this.rewardCalculator;
  }

  public getPersistenceManager(): VictoryConditionPersistenceManager | undefined {
    return this.persistenceManager;
  }

  public getPerformanceManager(): VictoryConditionPerformanceManager {
    return this.performanceManager;
  }

  public getBossEffectPool(): BossEffectPool {
    return this.bossEffectPool;
  }

  public getCurrentStageData(): VictoryStageData | null {
    return this.currentStageData;
  }

  /**
   * 前ステージの状態を読み込む
   * 要件11.4: 次ステージに進むとき、前ステージの状態を読み込む
   */
  public async loadPreviousStageState(stageId?: string): Promise<any> {
    if (!this.persistenceManager) {
      this.log('Warning: PersistenceManager not available');
      return null;
    }

    const result = await this.persistenceManager.loadPreviousStageState(stageId);
    if (result.success && result.data) {
      this.log(`Loaded previous stage state: ${result.data.stageId}`);
      return result.data;
    } else {
      this.log(`No previous stage state found`);
      return null;
    }
  }

  /**
   * データ整合性を検証
   * 要件11.5: セーブデータとの整合性を保つ
   */
  public async validateDataIntegrity(): Promise<boolean> {
    if (!this.persistenceManager) {
      this.log('Warning: PersistenceManager not available');
      return false;
    }

    const result = await this.persistenceManager.validateDataIntegrity();
    if (result.success) {
      this.log('Data integrity validation passed');
      return true;
    } else {
      this.log(`Data integrity validation failed: ${result.message}`);
      return false;
    }
  }

  public getStagePerformance(): StagePerformance {
    return { ...this.stagePerformance };
  }

  public isSystemInitialized(): boolean {
    return this.isInitialized;
  }

  public isStageCompleted(): boolean {
    return this.isStageComplete;
  }

  public isStageFailedStatus(): boolean {
    return this.isStageFailed;
  }
}
