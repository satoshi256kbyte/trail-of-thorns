/**
 * ChapterStageIntegration - GameplaySceneとの統合システム
 * 
 * 章・ステージ管理システムとGameplaySceneの統合を管理します。
 * 
 * 主な機能:
 * - ステージ開始時のパーティ設定
 * - ステージクリア時の進行状況更新
 * - キャラクターロスト時の状態更新
 * - 章完了時の処理
 * 
 * 要件: 全体
 */

import { ChapterManager } from '../chapter/ChapterManager';
import { PartyManager } from '../chapter/PartyManager';
import { StageProgressManager } from './StageProgressManager';
import { SaveLoadManager } from './SaveLoadManager';
import {
  ChapterState,
  ChapterStateData,
  PartyComposition,
  StageProgressData,
  StageReward,
  ChapterStageError,
  ChapterStageResult,
} from '../../types/chapterStage';
import { Unit, StageData } from '../../types/gameplay';

/**
 * 統合システム設定
 * Integration System Configuration
 */
export interface ChapterStageIntegrationConfig {
  /** オートセーブを有効にする */
  enableAutoSave: boolean;
  /** デバッグモードを有効にする */
  debugMode: boolean;
}

/**
 * ステージ開始データ
 * Stage Start Data
 */
export interface StageStartData {
  /** ステージID */
  stageId: string;
  /** パーティ編成 */
  party: PartyComposition;
  /** ステージデータ */
  stageData: StageData;
}

/**
 * ステージクリアデータ
 * Stage Clear Data
 */
export interface StageClearData {
  /** ステージID */
  stageId: string;
  /** 獲得報酬 */
  rewards: StageReward[];
  /** クリア時間（ミリ秒） */
  clearTime: number;
  /** 生存キャラクター */
  survivingCharacters: string[];
  /** ロストキャラクター */
  lostCharacters: string[];
}

/**
 * ChapterStageIntegration class
 * 章・ステージ管理統合クラス
 */
export class ChapterStageIntegration {
  private chapterManager: ChapterManager;
  private partyManager: PartyManager;
  private stageProgressManager: StageProgressManager;
  private saveLoadManager: SaveLoadManager;
  private config: ChapterStageIntegrationConfig;

  /** 現在のステージID */
  private currentStageId: string | null = null;
  /** ステージ開始時刻 */
  private stageStartTime: number = 0;

  /**
   * Constructor
   * 
   * @param config - 統合システム設定
   */
  constructor(config: Partial<ChapterStageIntegrationConfig> = {}) {
    this.config = {
      enableAutoSave: true,
      debugMode: false,
      ...config,
    };

    this.chapterManager = new ChapterManager();
    this.partyManager = new PartyManager();
    this.stageProgressManager = new StageProgressManager();
    this.saveLoadManager = new SaveLoadManager();

    // オートセーブ設定
    this.saveLoadManager.setAutoSaveEnabled(this.config.enableAutoSave);

    this.log('ChapterStageIntegration initialized');
  }

  /**
   * 章の開始
   * Start Chapter
   * 
   * @param chapterId - 章ID
   * @param availableCharacterIds - 利用可能なキャラクターIDリスト
   * @returns 処理結果
   */
  public async startChapter(
    chapterId: string,
    availableCharacterIds: string[]
  ): Promise<ChapterStageResult> {
    try {
      this.log(`Starting chapter: ${chapterId}`);

      // 章データの読み込み
      const loadResult = await this.chapterManager.loadChapterData(chapterId);
      if (!loadResult.success) {
        return {
          success: false,
          error: loadResult.error,
          message: `Failed to load chapter data: ${loadResult.message}`,
        };
      }

      // 章の開始
      const startResult = this.chapterManager.startChapter(chapterId, availableCharacterIds);
      if (!startResult.success) {
        return {
          success: false,
          error: startResult.error,
          message: `Failed to start chapter: ${startResult.message}`,
        };
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
      const stageMetadataList = chapterData.stages.map(stage => ({
        id: stage.id,
        name: stage.name,
        chapterId: chapterId,
        difficulty: stage.difficulty,
        recommendedLevel: stage.recommendedLevel,
        unlockCondition: stage.unlockCondition,
        rewards: stage.rewards || [],
      }));

      this.stageProgressManager.registerStageMetadataList(stageMetadataList);

      // 最初のステージを解放
      if (chapterData.stages.length > 0) {
        this.stageProgressManager.unlockStage(chapterData.stages[0].id);
      }

      this.log(`Chapter started successfully: ${chapterId}`);
      return {
        success: true,
        message: `Chapter started: ${chapterId}`,
        details: {
          chapterId,
          stageCount: chapterData.stages.length,
          availableCharacters: availableCharacterIds.length,
        },
      };
    } catch (error) {
      this.logError('Failed to start chapter', error);
      return {
        success: false,
        error: ChapterStageError.CHAPTER_NOT_INITIALIZED,
        message: `Exception while starting chapter: ${chapterId}`,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * ステージ開始時のパーティ設定
   * Setup Party for Stage Start
   * 
   * @param stageStartData - ステージ開始データ
   * @returns 処理結果
   * 
   * 要件: 全体
   */
  public setupStageStart(stageStartData: StageStartData): ChapterStageResult {
    try {
      this.log(`Setting up stage start: ${stageStartData.stageId}`);

      // 章が開始されているかチェック
      const chapterState = this.chapterManager.getCurrentChapterState();
      if (!chapterState) {
        return {
          success: false,
          error: ChapterStageError.CHAPTER_NOT_INITIALIZED,
          message: 'No chapter is currently active',
        };
      }

      // ステージが解放されているかチェック
      if (!this.stageProgressManager.isStageUnlocked(stageStartData.stageId)) {
        return {
          success: false,
          error: ChapterStageError.STAGE_NOT_UNLOCKED,
          message: `Stage is not unlocked: ${stageStartData.stageId}`,
        };
      }

      // パーティ編成の検証
      const validationResult = this.partyManager.validateParty(
        chapterState.lostCharacterIds,
        chapterState.availableCharacterIds
      );

      if (!validationResult.isValid) {
        return {
          success: false,
          error: ChapterStageError.INVALID_PARTY_COMPOSITION,
          message: 'Invalid party composition',
          details: { errors: validationResult.errors },
        };
      }

      // パーティ編成を設定
      this.partyManager.setParty(stageStartData.party);

      // 現在のステージIDを記録
      this.currentStageId = stageStartData.stageId;
      this.stageStartTime = Date.now();

      this.log(`Stage start setup completed: ${stageStartData.stageId}`);
      return {
        success: true,
        message: `Stage start setup completed: ${stageStartData.stageId}`,
        details: {
          stageId: stageStartData.stageId,
          partySize: stageStartData.party.members.length,
        },
      };
    } catch (error) {
      this.logError('Failed to setup stage start', error);
      return {
        success: false,
        error: ChapterStageError.STAGE_NOT_INITIALIZED,
        message: `Failed to setup stage start: ${stageStartData.stageId}`,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * ステージクリア時の進行状況更新
   * Update Progress on Stage Clear
   * 
   * @param stageClearData - ステージクリアデータ
   * @returns 処理結果
   * 
   * 要件: 全体
   */
  public handleStageClear(stageClearData: StageClearData): ChapterStageResult {
    try {
      this.log(`Handling stage clear: ${stageClearData.stageId}`);

      // 章が開始されているかチェック
      const chapterState = this.chapterManager.getCurrentChapterState();
      if (!chapterState) {
        return {
          success: false,
          error: ChapterStageError.CHAPTER_NOT_INITIALIZED,
          message: 'No chapter is currently active',
        };
      }

      // ステージ完了を記録
      this.stageProgressManager.completeStage(
        stageClearData.stageId,
        stageClearData.rewards
      );

      // 章マネージャーにステージ完了を記録
      const recordResult = this.chapterManager.recordStageCompletion(stageClearData.stageId);
      if (!recordResult.success) {
        this.logError('Failed to record stage completion in chapter manager', recordResult.message);
      }

      // ロストキャラクターの処理
      for (const characterId of stageClearData.lostCharacters) {
        const lostResult = this.chapterManager.markCharacterAsLost(characterId);
        if (!lostResult.success) {
          this.logError(`Failed to mark character as lost: ${characterId}`, lostResult.message);
        }

        // パーティから除外
        this.partyManager.removeCharacter(characterId);
      }

      // 章が完了したかチェック
      const isChapterCompleted = this.stageProgressManager.isChapterCompleted(chapterState.chapterId);

      let chapterCompletionResult: ChapterStageResult | null = null;
      if (isChapterCompleted) {
        chapterCompletionResult = this.handleChapterCompletion();
      }

      // オートセーブ
      if (this.config.enableAutoSave) {
        this.performAutoSave();
      }

      this.log(`Stage clear handled successfully: ${stageClearData.stageId}`);
      return {
        success: true,
        message: `Stage cleared: ${stageClearData.stageId}`,
        details: {
          stageId: stageClearData.stageId,
          clearTime: stageClearData.clearTime,
          rewards: stageClearData.rewards,
          lostCharacters: stageClearData.lostCharacters.length,
          chapterCompleted: isChapterCompleted,
          chapterCompletionResult,
        },
      };
    } catch (error) {
      this.logError('Failed to handle stage clear', error);
      return {
        success: false,
        error: ChapterStageError.STAGE_NOT_INITIALIZED,
        message: `Failed to handle stage clear: ${stageClearData.stageId}`,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * キャラクターロスト時の状態更新
   * Update State on Character Loss
   * 
   * @param characterId - ロストしたキャラクターID
   * @returns 処理結果
   * 
   * 要件: 全体
   */
  public handleCharacterLoss(characterId: string): ChapterStageResult {
    try {
      this.log(`Handling character loss: ${characterId}`);

      // 章が開始されているかチェック
      const chapterState = this.chapterManager.getCurrentChapterState();
      if (!chapterState) {
        return {
          success: false,
          error: ChapterStageError.CHAPTER_NOT_INITIALIZED,
          message: 'No chapter is currently active',
        };
      }

      // キャラクターをロスト状態にする
      const lostResult = this.chapterManager.markCharacterAsLost(characterId);
      if (!lostResult.success) {
        return {
          success: false,
          error: lostResult.error,
          message: `Failed to mark character as lost: ${lostResult.message}`,
        };
      }

      // パーティから除外
      const removed = this.partyManager.removeCharacter(characterId);
      if (!removed) {
        this.log(`Character ${characterId} was not in party`);
      }

      this.log(`Character loss handled successfully: ${characterId}`);
      return {
        success: true,
        message: `Character marked as lost: ${characterId}`,
        details: {
          characterId,
          remainingPartySize: this.partyManager.getPartySize(),
          remainingAvailableCharacters: chapterState.availableCharacterIds.length - 1,
        },
      };
    } catch (error) {
      this.logError('Failed to handle character loss', error);
      return {
        success: false,
        error: ChapterStageError.CHAPTER_NOT_INITIALIZED,
        message: `Failed to handle character loss: ${characterId}`,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * 章完了時の処理
   * Handle Chapter Completion
   * 
   * @returns 処理結果
   * 
   * 要件: 全体
   */
  public handleChapterCompletion(): ChapterStageResult {
    try {
      this.log('Handling chapter completion');

      // 章が開始されているかチェック
      const chapterState = this.chapterManager.getCurrentChapterState();
      if (!chapterState) {
        return {
          success: false,
          error: ChapterStageError.CHAPTER_NOT_INITIALIZED,
          message: 'No chapter is currently active',
        };
      }

      // 章を完了状態にする
      const completeResult = this.chapterManager.completeChapter();
      if (!completeResult.success) {
        return {
          success: false,
          error: completeResult.error,
          message: `Failed to complete chapter: ${completeResult.message}`,
        };
      }

      // オートセーブ
      if (this.config.enableAutoSave) {
        this.performAutoSave();
      }

      this.log(`Chapter completion handled successfully: ${chapterState.chapterId}`);
      return {
        success: true,
        message: `Chapter completed: ${chapterState.chapterId}`,
        details: {
          chapterId: chapterState.chapterId,
          completedStages: chapterState.completedStageIds.length,
          lostCharacters: chapterState.lostCharacterIds.length,
          playTime: completeResult.details?.playTime,
        },
      };
    } catch (error) {
      this.logError('Failed to handle chapter completion', error);
      return {
        success: false,
        error: ChapterStageError.CHAPTER_NOT_INITIALIZED,
        message: 'Failed to handle chapter completion',
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * オートセーブの実行
   * Perform Auto Save
   */
  private performAutoSave(): void {
    try {
      const chapterState = this.chapterManager.getCurrentChapterState();
      if (!chapterState) {
        this.log('Cannot auto save: no active chapter');
        return;
      }

      // 章状態データの作成
      const chapterStateData: ChapterStateData = {
        ...chapterState,
        version: '1.0.0',
        timestamp: Date.now(),
      };

      // ステージ進行状況データの取得
      const stageProgressData = this.stageProgressManager.saveProgress();

      // パーティ編成の取得
      const partyComposition = this.partyManager.getParty();

      // プレイ時間の計算
      const playTime = Date.now() - chapterState.startTime;

      // オートセーブ実行
      this.saveLoadManager.autoSave(
        chapterStateData,
        stageProgressData,
        partyComposition,
        playTime
      );

      this.log('Auto save completed');
    } catch (error) {
      this.logError('Auto save failed', error);
    }
  }

  /**
   * 手動セーブ
   * Manual Save
   * 
   * @param slotId - セーブスロットID
   * @returns 保存成功の場合true
   */
  public saveGame(slotId: number): boolean {
    try {
      const chapterState = this.chapterManager.getCurrentChapterState();
      if (!chapterState) {
        this.log('Cannot save: no active chapter');
        return false;
      }

      // 章状態データの作成
      const chapterStateData: ChapterStateData = {
        ...chapterState,
        version: '1.0.0',
        timestamp: Date.now(),
      };

      // ステージ進行状況データの取得
      const stageProgressData = this.stageProgressManager.saveProgress();

      // パーティ編成の取得
      const partyComposition = this.partyManager.getParty();

      // プレイ時間の計算
      const playTime = Date.now() - chapterState.startTime;

      // セーブ実行
      const success = this.saveLoadManager.saveGame(
        slotId,
        chapterStateData,
        stageProgressData,
        partyComposition,
        playTime
      );

      if (success) {
        this.log(`Game saved to slot ${slotId}`);
      } else {
        this.logError(`Failed to save game to slot ${slotId}`, 'Save operation returned false');
      }

      return success;
    } catch (error) {
      this.logError('Save game failed', error);
      return false;
    }
  }

  /**
   * ゲームのロード
   * Load Game
   * 
   * @param slotId - セーブスロットID
   * @returns ロード成功の場合true
   */
  public loadGame(slotId: number): boolean {
    try {
      // セーブデータの読み込み
      const saveData = this.saveLoadManager.loadGame(slotId);
      if (!saveData) {
        this.log(`No save data found in slot ${slotId}`);
        return false;
      }

      // 章状態の復元
      const restoreResult = this.chapterManager.restoreChapterState(saveData.chapterState.chapterId);
      if (!restoreResult.success) {
        this.logError('Failed to restore chapter state', restoreResult.message);
        return false;
      }

      // ステージ進行状況の復元
      this.stageProgressManager.restoreProgress(saveData.stageProgress);

      // パーティ編成の復元
      this.partyManager.setParty(saveData.partyComposition);

      this.log(`Game loaded from slot ${slotId}`);
      return true;
    } catch (error) {
      this.logError('Load game failed', error);
      return false;
    }
  }

  /**
   * 現在の章状態を取得
   * Get Current Chapter State
   * 
   * @returns 章状態（存在しない場合はnull）
   */
  public getCurrentChapterState(): ChapterState | null {
    return this.chapterManager.getCurrentChapterState();
  }

  /**
   * 現在のパーティ編成を取得
   * Get Current Party Composition
   * 
   * @returns パーティ編成
   */
  public getCurrentParty(): PartyComposition {
    return this.partyManager.getParty();
  }

  /**
   * 利用可能なキャラクターリストを取得
   * Get Available Characters
   * 
   * @returns 利用可能なキャラクターIDリスト
   */
  public getAvailableCharacters(): string[] {
    return this.chapterManager.getAvailableCharacters();
  }

  /**
   * ロストキャラクターリストを取得
   * Get Lost Characters
   * 
   * @returns ロストキャラクターIDリスト
   */
  public getLostCharacters(): string[] {
    return this.chapterManager.getLostCharacters();
  }

  /**
   * ステージが解放されているかチェック
   * Check if Stage is Unlocked
   * 
   * @param stageId - ステージID
   * @returns 解放済みの場合true
   */
  public isStageUnlocked(stageId: string): boolean {
    return this.stageProgressManager.isStageUnlocked(stageId);
  }

  /**
   * ステージが完了しているかチェック
   * Check if Stage is Completed
   * 
   * @param stageId - ステージID
   * @returns 完了済みの場合true
   */
  public isStageCompleted(stageId: string): boolean {
    return this.stageProgressManager.isStageCompleted(stageId);
  }

  /**
   * キャラクターがロストしているかチェック
   * Check if Character is Lost
   * 
   * @param characterId - キャラクターID
   * @returns ロストしている場合true
   */
  public isCharacterLost(characterId: string): boolean {
    return this.chapterManager.isCharacterLost(characterId);
  }

  /**
   * ログ出力
   * Log message
   * 
   * @param message - ログメッセージ
   */
  private log(message: string): void {
    if (this.config.debugMode) {
      console.log(`[ChapterStageIntegration] ${message}`);
    }
  }

  /**
   * エラーログ出力
   * Log error message
   * 
   * @param message - エラーメッセージ
   * @param error - エラーオブジェクト
   */
  private logError(message: string, error: unknown): void {
    console.error(`[ChapterStageIntegration] ${message}`, error);
  }
}
