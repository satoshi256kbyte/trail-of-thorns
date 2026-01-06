/**
 * ChapterStageManagementSystem - 章・ステージ管理システムメインコントローラー
 * Chapter-Stage Management System Main Controller
 *
 * 各マネージャーを統合し、システム全体の初期化と状態管理を行います。
 * Integrates all managers and handles system-wide initialization and state management.
 *
 * 主な機能:
 * - 各マネージャーの統合と初期化
 * - システム全体の状態管理
 * - 章・ステージ進行の統合管理
 * - セーブ・ロードの統合処理
 *
 * 要件: 全体
 */

import * as Phaser from 'phaser';
import { ChapterManager } from '../chapter/ChapterManager';
import { PartyManager } from '../PartyManager';
import { StageProgressManager } from './StageProgressManager';
import { SaveLoadManager } from './SaveLoadManager';
import {
  ChapterStageError,
  ChapterStageResult,
  ChapterData,
  ChapterState,
  StageMetadata,
  StageProgress,
  PartyComposition,
  SaveData,
  SaveSlot,
  StageReward,
} from '../../types/chapterStage';
import { Unit } from '../../types/gameplay';

/**
 * システム初期化設定
 * System Initialization Configuration
 */
export interface ChapterStageSystemConfig {
  /** オートセーブを有効にするか */
  autoSaveEnabled?: boolean;
  /** パーティの最大サイズ */
  maxPartySize?: number;
  /** パーティの最小サイズ */
  minPartySize?: number;
  /** デバッグモードを有効にするか */
  debugMode?: boolean;
}

/**
 * システム状態
 * System State
 */
export interface ChapterStageSystemState {
  /** システムが初期化済みか */
  isInitialized: boolean;
  /** 現在の章ID */
  currentChapterId: string | null;
  /** 現在のステージID */
  currentStageId: string | null;
  /** パーティメンバー数 */
  partyMemberCount: number;
  /** 利用可能なキャラクター数 */
  availableCharacterCount: number;
  /** ロストキャラクター数 */
  lostCharacterCount: number;
  /** 完了済みステージ数 */
  completedStageCount: number;
}

/**
 * ChapterStageManagementSystem class
 * 章・ステージ管理システムメインコントローラークラス
 */
export class ChapterStageManagementSystem extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private config: ChapterStageSystemConfig;

  // 各マネージャー
  private chapterManager: ChapterManager;
  private partyManager: PartyManager;
  private stageProgressManager: StageProgressManager;
  private saveLoadManager: SaveLoadManager;

  // システム状態
  private isInitialized: boolean = false;
  private currentChapterId: string | null = null;
  private currentStageId: string | null = null;
  private allCharacters: Map<string, Unit> = new Map();

  // デフォルト設定
  private static readonly DEFAULT_CONFIG: ChapterStageSystemConfig = {
    autoSaveEnabled: true,
    maxPartySize: 6,
    minPartySize: 1,
    debugMode: false,
  };

  /**
   * コンストラクタ
   * Constructor
   *
   * @param scene - Phaserシーン
   * @param config - システム設定
   */
  constructor(scene: Phaser.Scene, config?: ChapterStageSystemConfig) {
    super();

    this.scene = scene;
    this.config = { ...ChapterStageManagementSystem.DEFAULT_CONFIG, ...config };

    // 各マネージャーの初期化
    this.chapterManager = new ChapterManager();
    this.partyManager = new PartyManager(scene, {
      maxPartySize: this.config.maxPartySize,
      minPartySize: this.config.minPartySize,
    });
    this.stageProgressManager = new StageProgressManager();
    this.saveLoadManager = new SaveLoadManager();

    // オートセーブ設定
    if (this.config.autoSaveEnabled !== undefined) {
      this.saveLoadManager.setAutoSaveEnabled(this.config.autoSaveEnabled);
    }

    this.setupEventListeners();
    this.log('ChapterStageManagementSystem created');
  }

  /**
   * システムの初期化
   * Initialize System
   *
   * @param allCharacters - 全キャラクターリスト
   * @returns 初期化結果
   */
  public async initialize(allCharacters: Unit[]): Promise<ChapterStageResult> {
    try {
      this.log('Initializing ChapterStageManagementSystem');

      // キャラクターデータの保存
      this.allCharacters.clear();
      for (const character of allCharacters) {
        this.allCharacters.set(character.id, character);
      }

      // パーティマネージャーの初期化
      const partyInitResult = this.partyManager.initializeCharacters(allCharacters);
      if (!partyInitResult.success) {
        return {
          success: false,
          error: ChapterStageError.DATA_VALIDATION_FAILED,
          message: 'Failed to initialize party manager',
          details: partyInitResult,
        };
      }

      this.isInitialized = true;

      this.emit('system-initialized', {
        characterCount: allCharacters.length,
      });

      this.log('ChapterStageManagementSystem initialized successfully');
      return {
        success: true,
        message: 'System initialized successfully',
        details: {
          characterCount: allCharacters.length,
        },
      };
    } catch (error) {
      this.logError('Failed to initialize system', error);
      return {
        success: false,
        error: ChapterStageError.DATA_LOAD_FAILED,
        message: 'System initialization failed',
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * 章データの読み込みと開始
   * Load and Start Chapter
   *
   * @param chapterId - 章ID
   * @returns 処理結果
   */
  public async loadAndStartChapter(chapterId: string): Promise<ChapterStageResult> {
    try {
      this.log(`Loading and starting chapter: ${chapterId}`);

      if (!this.isInitialized) {
        return {
          success: false,
          error: ChapterStageError.CHAPTER_NOT_INITIALIZED,
          message: 'System not initialized',
        };
      }

      // 章データの読み込み
      const loadResult = await this.chapterManager.loadChapterData(chapterId);
      if (!loadResult.success) {
        return loadResult;
      }

      // 利用可能なキャラクターIDリストを取得
      const availableCharacterIds = Array.from(this.allCharacters.keys());

      // 章の開始
      const startResult = this.chapterManager.startChapter(chapterId, availableCharacterIds);
      if (!startResult.success) {
        return startResult;
      }

      // 章データの取得
      const chapterData = this.chapterManager.getChapterData(chapterId);
      if (!chapterData) {
        return {
          success: false,
          error: ChapterStageError.CHAPTER_NOT_FOUND,
          message: `Chapter data not found: ${chapterId}`,
        };
      }

      // ステージメタデータの登録
      // Note: ステージデータの構造に応じて調整が必要
      // この実装では、ChapterDataにstageIdsがあると仮定
      // 実際のステージメタデータは別途読み込む必要がある場合がある

      this.currentChapterId = chapterId;

      this.emit('chapter-started', {
        chapterId,
        stageCount: chapterData.stageIds?.length || 0,
      });

      this.log(`Chapter started successfully: ${chapterId}`);
      return {
        success: true,
        message: `Chapter started: ${chapterId}`,
        details: {
          chapterId,
          stageCount: chapterData.stageIds?.length || 0,
        },
      };
    } catch (error) {
      this.logError('Failed to load and start chapter', error);
      return {
        success: false,
        error: ChapterStageError.CHAPTER_NOT_INITIALIZED,
        message: 'Failed to load and start chapter',
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * ステージの開始
   * Start Stage
   *
   * @param stageId - ステージID
   * @param partyMembers - パーティメンバーのキャラクターIDリスト
   * @returns 処理結果
   */
  public startStage(stageId: string, partyMembers: string[]): ChapterStageResult {
    try {
      this.log(`Starting stage: ${stageId}`);

      if (!this.isInitialized) {
        return {
          success: false,
          error: ChapterStageError.STAGE_NOT_INITIALIZED,
          message: 'System not initialized',
        };
      }

      // ステージが解放されているかチェック
      if (!this.stageProgressManager.isStageUnlocked(stageId)) {
        return {
          success: false,
          error: ChapterStageError.STAGE_NOT_UNLOCKED,
          message: `Stage not unlocked: ${stageId}`,
        };
      }

      // パーティ編成の検証と設定
      const partyResult = this.partyManager.setPartyComposition(partyMembers, true);
      if (!partyResult.success) {
        return {
          success: false,
          error: ChapterStageError.INVALID_PARTY_COMPOSITION,
          message: 'Invalid party composition',
          details: partyResult,
        };
      }

      this.currentStageId = stageId;

      this.emit('stage-started', {
        stageId,
        partySize: partyMembers.length,
      });

      this.log(`Stage started successfully: ${stageId}`);
      return {
        success: true,
        message: `Stage started: ${stageId}`,
        details: {
          stageId,
          partySize: partyMembers.length,
        },
      };
    } catch (error) {
      this.logError('Failed to start stage', error);
      return {
        success: false,
        error: ChapterStageError.STAGE_NOT_INITIALIZED,
        message: 'Failed to start stage',
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * ステージのクリア
   * Complete Stage
   *
   * @param stageId - ステージID
   * @param rewards - 獲得報酬リスト
   * @returns 処理結果
   */
  public completeStage(stageId: string, rewards: StageReward[]): ChapterStageResult {
    try {
      this.log(`Completing stage: ${stageId}`);

      if (!this.isInitialized) {
        return {
          success: false,
          error: ChapterStageError.STAGE_NOT_INITIALIZED,
          message: 'System not initialized',
        };
      }

      // ステージ進行状況の更新
      this.stageProgressManager.completeStage(stageId, rewards);

      // 章マネージャーにステージ完了を記録
      const recordResult = this.chapterManager.recordStageCompletion(stageId);
      if (!recordResult.success) {
        this.logError('Failed to record stage completion in chapter manager', recordResult);
      }

      // 章が完了したかチェック
      const chapterState = this.chapterManager.getCurrentChapterState();
      if (chapterState && this.stageProgressManager.isChapterCompleted(chapterState.chapterId)) {
        this.completeChapter();
      }

      // オートセーブ
      if (this.saveLoadManager.isAutoSaveEnabled()) {
        this.autoSave();
      }

      this.emit('stage-completed', {
        stageId,
        rewards,
      });

      this.log(`Stage completed successfully: ${stageId}`);
      return {
        success: true,
        message: `Stage completed: ${stageId}`,
        details: {
          stageId,
          rewardCount: rewards.length,
        },
      };
    } catch (error) {
      this.logError('Failed to complete stage', error);
      return {
        success: false,
        error: ChapterStageError.STAGE_NOT_INITIALIZED,
        message: 'Failed to complete stage',
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * キャラクターロスト処理
   * Handle Character Loss
   *
   * @param characterId - ロストしたキャラクターID
   * @returns 処理結果
   */
  public handleCharacterLoss(characterId: string): ChapterStageResult {
    try {
      this.log(`Handling character loss: ${characterId}`);

      if (!this.isInitialized) {
        return {
          success: false,
          error: ChapterStageError.CHAPTER_NOT_INITIALIZED,
          message: 'System not initialized',
        };
      }

      // 章マネージャーにキャラクターロストを記録
      const lossResult = this.chapterManager.markCharacterAsLost(characterId);
      if (!lossResult.success) {
        return lossResult;
      }

      // パーティマネージャーに通知（パーティから自動除外される）
      // PartyManagerは既にCharacterLossManagerと統合されているため、
      // ここでは明示的な処理は不要

      this.emit('character-lost', {
        characterId,
        remainingCharacters: this.chapterManager.getAvailableCharacters().length,
      });

      this.log(`Character loss handled successfully: ${characterId}`);
      return {
        success: true,
        message: `Character marked as lost: ${characterId}`,
        details: {
          characterId,
          remainingCharacters: this.chapterManager.getAvailableCharacters().length,
        },
      };
    } catch (error) {
      this.logError('Failed to handle character loss', error);
      return {
        success: false,
        error: ChapterStageError.CHAPTER_NOT_INITIALIZED,
        message: 'Failed to handle character loss',
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * 章の完了
   * Complete Chapter
   *
   * @returns 処理結果
   */
  public completeChapter(): ChapterStageResult {
    try {
      this.log('Completing chapter');

      if (!this.isInitialized) {
        return {
          success: false,
          error: ChapterStageError.CHAPTER_NOT_INITIALIZED,
          message: 'System not initialized',
        };
      }

      // 章マネージャーで章を完了
      const completeResult = this.chapterManager.completeChapter();
      if (!completeResult.success) {
        return completeResult;
      }

      // オートセーブ
      if (this.saveLoadManager.isAutoSaveEnabled()) {
        this.autoSave();
      }

      this.emit('chapter-completed', {
        chapterId: this.currentChapterId,
      });

      this.log('Chapter completed successfully');
      return {
        success: true,
        message: 'Chapter completed',
        details: completeResult.details,
      };
    } catch (error) {
      this.logError('Failed to complete chapter', error);
      return {
        success: false,
        error: ChapterStageError.CHAPTER_NOT_INITIALIZED,
        message: 'Failed to complete chapter',
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * ゲームの保存
   * Save Game
   *
   * @param slotId - セーブスロットID
   * @returns 保存成功の場合true
   */
  public saveGame(slotId: number): boolean {
    try {
      this.log(`Saving game to slot: ${slotId}`);

      if (!this.isInitialized) {
        this.logError('Cannot save: system not initialized', null);
        return false;
      }

      const chapterState = this.chapterManager.getCurrentChapterState();
      if (!chapterState) {
        this.logError('Cannot save: no active chapter', null);
        return false;
      }

      // 章状態データの作成
      const chapterStateData = {
        ...chapterState,
        version: '1.0.0',
        timestamp: Date.now(),
      };

      // ステージ進行状況データの取得
      const stageProgressData = this.stageProgressManager.saveProgress();

      // パーティ編成の取得
      const currentParty = this.partyManager.getCurrentParty();
      const partyComposition: PartyComposition = {
        members: currentParty.members,
        formation: 'BALANCED', // デフォルト値
      };

      // セーブ実行
      const success = this.saveLoadManager.saveGame(
        slotId,
        chapterStateData,
        stageProgressData,
        partyComposition,
        chapterState.playTime
      );

      if (success) {
        this.emit('game-saved', { slotId });
        this.log(`Game saved successfully to slot: ${slotId}`);
      } else {
        this.logError(`Failed to save game to slot: ${slotId}`, null);
      }

      return success;
    } catch (error) {
      this.logError('Failed to save game', error);
      return false;
    }
  }

  /**
   * ゲームの読み込み
   * Load Game
   *
   * @param slotId - セーブスロットID
   * @returns 読み込み成功の場合true
   */
  public loadGame(slotId: number): boolean {
    try {
      this.log(`Loading game from slot: ${slotId}`);

      // セーブデータの読み込み
      const saveData = this.saveLoadManager.loadGame(slotId);
      if (!saveData) {
        this.logError(`Failed to load game from slot: ${slotId}`, null);
        return false;
      }

      // 章状態の復元
      const restoreResult = this.chapterManager.restoreChapterState(
        saveData.chapterState.chapterId
      );
      if (!restoreResult.success) {
        this.logError('Failed to restore chapter state', restoreResult);
        return false;
      }

      // ステージ進行状況の復元
      this.stageProgressManager.restoreProgress(saveData.stageProgress);

      // パーティ編成の復元
      const partyResult = this.partyManager.setPartyComposition(
        saveData.partyComposition.members,
        false // 検証をスキップ（保存時に検証済み）
      );
      if (!partyResult.success) {
        this.logError('Failed to restore party composition', partyResult);
      }

      this.currentChapterId = saveData.chapterState.chapterId;

      this.emit('game-loaded', { slotId, chapterId: this.currentChapterId });
      this.log(`Game loaded successfully from slot: ${slotId}`);

      return true;
    } catch (error) {
      this.logError('Failed to load game', error);
      return false;
    }
  }

  /**
   * オートセーブ
   * Auto Save
   */
  private autoSave(): void {
    try {
      const chapterState = this.chapterManager.getCurrentChapterState();
      if (!chapterState) {
        return;
      }

      const chapterStateData = {
        ...chapterState,
        version: '1.0.0',
        timestamp: Date.now(),
      };

      const stageProgressData = this.stageProgressManager.saveProgress();
      const currentParty = this.partyManager.getCurrentParty();
      const partyComposition: PartyComposition = {
        members: currentParty.members,
        formation: 'BALANCED',
      };

      this.saveLoadManager.autoSave(
        chapterStateData,
        stageProgressData,
        partyComposition,
        chapterState.playTime
      );

      this.emit('auto-saved');
    } catch (error) {
      this.logError('Auto save failed', error);
    }
  }

  /**
   * システム状態の取得
   * Get System State
   *
   * @returns システム状態
   */
  public getSystemState(): ChapterStageSystemState {
    const chapterState = this.chapterManager.getCurrentChapterState();
    const partyStats = this.partyManager.getPartyStats();

    return {
      isInitialized: this.isInitialized,
      currentChapterId: this.currentChapterId,
      currentStageId: this.currentStageId,
      partyMemberCount: partyStats.currentPartySize,
      availableCharacterCount: partyStats.totalAvailable,
      lostCharacterCount: partyStats.totalLost,
      completedStageCount: chapterState?.completedStageIds.length || 0,
    };
  }

  /**
   * 章マネージャーの取得
   * Get Chapter Manager
   *
   * @returns ChapterManager
   */
  public getChapterManager(): ChapterManager {
    return this.chapterManager;
  }

  /**
   * パーティマネージャーの取得
   * Get Party Manager
   *
   * @returns PartyManager
   */
  public getPartyManager(): PartyManager {
    return this.partyManager;
  }

  /**
   * ステージ進行マネージャーの取得
   * Get Stage Progress Manager
   *
   * @returns StageProgressManager
   */
  public getStageProgressManager(): StageProgressManager {
    return this.stageProgressManager;
  }

  /**
   * セーブ・ロードマネージャーの取得
   * Get Save-Load Manager
   *
   * @returns SaveLoadManager
   */
  public getSaveLoadManager(): SaveLoadManager {
    return this.saveLoadManager;
  }

  /**
   * セーブスロット一覧の取得
   * Get Save Slots
   *
   * @returns セーブスロット一覧
   */
  public getSaveSlots(): SaveSlot[] {
    return this.saveLoadManager.getSaveSlots();
  }

  /**
   * イベントリスナーのセットアップ
   * Setup Event Listeners
   */
  private setupEventListeners(): void {
    // シーンイベントのリスニング
    this.scene.events.on('shutdown', this.onSceneShutdown.bind(this));
    this.scene.events.on('destroy', this.onSceneDestroy.bind(this));
  }

  /**
   * シーンシャットダウン時の処理
   * Handle Scene Shutdown
   */
  private onSceneShutdown(): void {
    this.emit('system-shutdown');
    this.log('System shutdown');
  }

  /**
   * シーン破棄時の処理
   * Handle Scene Destroy
   */
  private onSceneDestroy(): void {
    this.destroy();
  }

  /**
   * ログ出力
   * Log Message
   *
   * @param message - ログメッセージ
   */
  private log(message: string): void {
    if (this.config.debugMode) {
      console.log(`[ChapterStageManagementSystem] ${message}`);
    }
  }

  /**
   * エラーログ出力
   * Log Error Message
   *
   * @param message - エラーメッセージ
   * @param error - エラーオブジェクト
   */
  private logError(message: string, error: unknown): void {
    console.error(`[ChapterStageManagementSystem] ${message}`, error);
  }

  /**
   * システムの破棄
   * Destroy System
   */
  public destroy(): void {
    this.log('Destroying ChapterStageManagementSystem');

    // パーティマネージャーの破棄
    this.partyManager.destroy();

    // ステージ進行マネージャーのリセット
    this.stageProgressManager.reset();

    // 状態のクリア
    this.isInitialized = false;
    this.currentChapterId = null;
    this.currentStageId = null;
    this.allCharacters.clear();

    this.emit('system-destroyed');
    this.removeAllListeners();

    this.log('ChapterStageManagementSystem destroyed');
  }
}
