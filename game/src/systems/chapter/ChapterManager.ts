/**
 * ChapterManager - 章管理システム
 * 
 * 章の進行状況とキャラクター状態を一元管理します。
 * 
 * 主な機能:
 * - 章データの読み込みと初期化
 * - キャラクターロスト処理
 * - 章完了とキャラクター状態リセット
 * - 章状態の永続化
 * 
 * 要件: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2
 */

import {
  ChapterData,
  ChapterState,
  ChapterStateData,
  ChapterError,
  ChapterResult,
} from '../../types/chapter';

/**
 * ChapterManager class
 * 章管理システムのメインクラス
 */
export class ChapterManager {
  private currentChapter: ChapterState | null = null;
  private chapterData: Map<string, ChapterData> = new Map();
  private readonly STORAGE_KEY_PREFIX = 'chapter_state_';
  private readonly VERSION = '1.0.0';

  /**
   * Constructor
   */
  constructor() {
    this.log('ChapterManager initialized');
  }

  /**
   * 章データを直接設定（テスト用）
   * Set chapter data directly (for testing)
   * 
   * @param chapterData - 章データ
   */
  public setChapterDataForTesting(chapterData: ChapterData): void {
    this.chapterData.set(chapterData.id, chapterData);
  }

  /**
   * 章データの読み込み
   * Load chapter data from JSON
   * 
   * @param chapterId - 章ID
   * @returns ChapterResult
   * 
   * 要件: 1.1
   */
  public async loadChapterData(chapterId: string): Promise<ChapterResult> {
    try {
      this.log(`Loading chapter data: ${chapterId}`);

      // JSONファイルから章データを読み込む
      const response = await fetch(`/data/chapters/${chapterId}.json`);
      
      if (!response.ok) {
        return {
          success: false,
          error: ChapterError.CHAPTER_DATA_LOAD_FAILED,
          message: `Failed to load chapter data: ${chapterId}`,
          details: { status: response.status },
        };
      }

      const data = await response.json();

      // データ検証
      if (!this.validateChapterData(data)) {
        return {
          success: false,
          error: ChapterError.INVALID_CHAPTER_DATA,
          message: `Invalid chapter data structure: ${chapterId}`,
        };
      }

      // キャッシュに保存
      this.chapterData.set(chapterId, data);

      this.log(`Chapter data loaded successfully: ${chapterId}`);
      return {
        success: true,
        message: `Chapter data loaded: ${chapterId}`,
        details: { chapterId, stageCount: data.stages.length },
      };
    } catch (error) {
      this.logError('Failed to load chapter data', error);
      return {
        success: false,
        error: ChapterError.CHAPTER_DATA_LOAD_FAILED,
        message: `Exception while loading chapter data: ${chapterId}`,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * 章の開始
   * Start a new chapter
   * 
   * @param chapterId - 章ID
   * @param availableCharacterIds - 利用可能なキャラクターIDリスト
   * @returns ChapterResult
   * 
   * 要件: 1.1
   */
  public startChapter(chapterId: string, availableCharacterIds: string[]): ChapterResult {
    try {
      this.log(`Starting chapter: ${chapterId}`);

      // 既に章が開始されているかチェック
      if (this.currentChapter !== null) {
        return {
          success: false,
          error: ChapterError.CHAPTER_ALREADY_STARTED,
          message: 'A chapter is already in progress',
          details: { currentChapterId: this.currentChapter.chapterId },
        };
      }

      // 章データが読み込まれているかチェック
      if (!this.chapterData.has(chapterId)) {
        return {
          success: false,
          error: ChapterError.CHAPTER_NOT_FOUND,
          message: `Chapter data not found: ${chapterId}`,
        };
      }

      // 章状態の初期化
      this.currentChapter = {
        chapterId,
        currentStageIndex: 0,
        lostCharacterIds: [],
        availableCharacterIds: [...availableCharacterIds],
        completedStageIds: [],
        isCompleted: false,
        startTime: Date.now(),
        playTime: 0,
      };

      this.log(`Chapter started successfully: ${chapterId}`);
      return {
        success: true,
        message: `Chapter started: ${chapterId}`,
        details: {
          chapterId,
          availableCharacters: availableCharacterIds.length,
        },
      };
    } catch (error) {
      this.logError('Failed to start chapter', error);
      return {
        success: false,
        error: ChapterError.CHAPTER_NOT_INITIALIZED,
        message: `Failed to start chapter: ${chapterId}`,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * 章状態の取得
   * Get current chapter state
   * 
   * @returns ChapterState | null
   */
  public getCurrentChapterState(): ChapterState | null {
    return this.currentChapter;
  }

  /**
   * 利用可能なキャラクターの取得
   * Get available character IDs
   * 
   * @returns string[]
   */
  public getAvailableCharacters(): string[] {
    if (!this.currentChapter) {
      return [];
    }
    return [...this.currentChapter.availableCharacterIds];
  }

  /**
   * ロストキャラクターの取得
   * Get lost character IDs
   * 
   * @returns string[]
   */
  public getLostCharacters(): string[] {
    if (!this.currentChapter) {
      return [];
    }
    return [...this.currentChapter.lostCharacterIds];
  }

  /**
   * 章の完了
   * Complete current chapter
   * 
   * @returns ChapterResult
   * 
   * 要件: 1.3, 4.1, 4.2
   */
  public completeChapter(): ChapterResult {
    try {
      this.log('Completing chapter');

      // 章が初期化されているかチェック
      if (!this.currentChapter) {
        return {
          success: false,
          error: ChapterError.CHAPTER_NOT_INITIALIZED,
          message: 'No chapter is currently active',
        };
      }

      const chapterId = this.currentChapter.chapterId;

      // 章完了状態を記録
      this.currentChapter.isCompleted = true;

      // プレイ時間を更新
      const currentTime = Date.now();
      this.currentChapter.playTime = currentTime - this.currentChapter.startTime;

      this.log(`Chapter completed: ${chapterId}`);
      return {
        success: true,
        message: `Chapter completed: ${chapterId}`,
        details: {
          chapterId,
          playTime: this.currentChapter.playTime,
          completedStages: this.currentChapter.completedStageIds.length,
          lostCharacters: this.currentChapter.lostCharacterIds.length,
        },
      };
    } catch (error) {
      this.logError('Failed to complete chapter', error);
      return {
        success: false,
        error: ChapterError.CHAPTER_NOT_INITIALIZED,
        message: 'Failed to complete chapter',
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * 次章の開始準備（キャラクター状態リセット）
   * Prepare for next chapter (reset character states)
   * 
   * @param nextChapterId - 次の章ID
   * @param allCharacterIds - 全キャラクターIDリスト
   * @returns ChapterResult
   * 
   * 要件: 4.1, 4.2
   */
  public prepareNextChapter(nextChapterId: string, allCharacterIds: string[]): ChapterResult {
    try {
      this.log(`Preparing next chapter: ${nextChapterId}`);

      // 現在の章が完了しているかチェック
      if (this.currentChapter && !this.currentChapter.isCompleted) {
        return {
          success: false,
          error: ChapterError.CHAPTER_NOT_INITIALIZED,
          message: 'Current chapter is not completed',
        };
      }

      // 現在の章をクリア
      this.currentChapter = null;

      this.log(`Next chapter prepared: ${nextChapterId}`);
      return {
        success: true,
        message: `Ready to start next chapter: ${nextChapterId}`,
        details: {
          nextChapterId,
          availableCharacters: allCharacterIds.length,
        },
      };
    } catch (error) {
      this.logError('Failed to prepare next chapter', error);
      return {
        success: false,
        error: ChapterError.CHAPTER_NOT_INITIALIZED,
        message: `Failed to prepare next chapter: ${nextChapterId}`,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * ステージ完了の記録
   * Record stage completion
   * 
   * @param stageId - 完了したステージID
   * @returns ChapterResult
   */
  public recordStageCompletion(stageId: string): ChapterResult {
    try {
      this.log(`Recording stage completion: ${stageId}`);

      // 章が初期化されているかチェック
      if (!this.currentChapter) {
        return {
          success: false,
          error: ChapterError.CHAPTER_NOT_INITIALIZED,
          message: 'No chapter is currently active',
        };
      }

      // 既に完了済みかチェック
      if (this.currentChapter.completedStageIds.includes(stageId)) {
        return {
          success: true,
          message: `Stage already completed: ${stageId}`,
          details: { stageId, alreadyCompleted: true },
        };
      }

      // 完了ステージリストに追加
      this.currentChapter.completedStageIds.push(stageId);

      // 現在のステージインデックスを進める
      this.currentChapter.currentStageIndex++;

      this.log(`Stage completion recorded: ${stageId}`);
      return {
        success: true,
        message: `Stage completed: ${stageId}`,
        details: {
          stageId,
          completedStages: this.currentChapter.completedStageIds.length,
          currentStageIndex: this.currentChapter.currentStageIndex,
        },
      };
    } catch (error) {
      this.logError('Failed to record stage completion', error);
      return {
        success: false,
        error: ChapterError.CHAPTER_NOT_INITIALIZED,
        message: `Failed to record stage completion: ${stageId}`,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * キャラクターロスト処理
   * Mark character as lost
   * 
   * @param characterId - ロストするキャラクターID
   * @returns ChapterResult
   * 
   * 要件: 1.2
   */
  public markCharacterAsLost(characterId: string): ChapterResult {
    try {
      this.log(`Marking character as lost: ${characterId}`);

      // 章が初期化されているかチェック
      if (!this.currentChapter) {
        return {
          success: false,
          error: ChapterError.CHAPTER_NOT_INITIALIZED,
          message: 'No chapter is currently active',
        };
      }

      // 既にロストしているかチェック
      if (this.currentChapter.lostCharacterIds.includes(characterId)) {
        return {
          success: true,
          message: `Character already marked as lost: ${characterId}`,
          details: { characterId, alreadyLost: true },
        };
      }

      // ロストキャラクターリストに追加
      this.currentChapter.lostCharacterIds.push(characterId);

      // 利用可能なキャラクターリストから除外
      const index = this.currentChapter.availableCharacterIds.indexOf(characterId);
      if (index !== -1) {
        this.currentChapter.availableCharacterIds.splice(index, 1);
      }

      this.log(`Character marked as lost successfully: ${characterId}`);
      return {
        success: true,
        message: `Character marked as lost: ${characterId}`,
        details: {
          characterId,
          remainingCharacters: this.currentChapter.availableCharacterIds.length,
        },
      };
    } catch (error) {
      this.logError('Failed to mark character as lost', error);
      return {
        success: false,
        error: ChapterError.CHAPTER_NOT_INITIALIZED,
        message: `Failed to mark character as lost: ${characterId}`,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * キャラクターがロストしているかチェック
   * Check if character is lost
   * 
   * @param characterId - チェックするキャラクターID
   * @returns boolean
   */
  public isCharacterLost(characterId: string): boolean {
    if (!this.currentChapter) {
      return false;
    }
    return this.currentChapter.lostCharacterIds.includes(characterId);
  }

  /**
   * キャラクターが利用可能かチェック
   * Check if character is available
   * 
   * @param characterId - チェックするキャラクターID
   * @returns boolean
   */
  public isCharacterAvailable(characterId: string): boolean {
    if (!this.currentChapter) {
      return false;
    }
    return this.currentChapter.availableCharacterIds.includes(characterId);
  }

  /**
   * 章データの取得
   * Get chapter data
   * 
   * @param chapterId - 章ID
   * @returns ChapterData | null
   */
  public getChapterData(chapterId: string): ChapterData | null {
    return this.chapterData.get(chapterId) || null;
  }

  /**
   * 現在の章IDの取得
   * Get current chapter ID
   * 
   * @returns string | null
   */
  public getCurrentChapterId(): string | null {
    return this.currentChapter?.chapterId || null;
  }

  /**
   * 章状態の保存
   * Save chapter state to storage
   * 
   * @returns ChapterResult
   * 
   * 要件: 1.4
   */
  public saveChapterState(): ChapterResult {
    try {
      this.log('Saving chapter state');

      // 章が初期化されているかチェック
      if (!this.currentChapter) {
        return {
          success: false,
          error: ChapterError.CHAPTER_NOT_INITIALIZED,
          message: 'No chapter is currently active',
        };
      }

      // シリアライズ用データの作成
      const stateData: ChapterStateData = {
        ...this.currentChapter,
        version: this.VERSION,
        timestamp: Date.now(),
      };

      // LocalStorageに保存
      const storageKey = this.getStorageKey(this.currentChapter.chapterId);
      const serialized = JSON.stringify(stateData);
      localStorage.setItem(storageKey, serialized);

      this.log(`Chapter state saved: ${this.currentChapter.chapterId}`);
      return {
        success: true,
        message: `Chapter state saved: ${this.currentChapter.chapterId}`,
        details: {
          chapterId: this.currentChapter.chapterId,
          timestamp: stateData.timestamp,
        },
      };
    } catch (error) {
      this.logError('Failed to save chapter state', error);
      return {
        success: false,
        error: ChapterError.CHAPTER_STATE_SAVE_FAILED,
        message: 'Failed to save chapter state',
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * 章状態の復元
   * Restore chapter state from storage
   * 
   * @param chapterId - 復元する章ID
   * @returns ChapterResult
   * 
   * 要件: 1.5
   */
  public restoreChapterState(chapterId: string): ChapterResult {
    try {
      this.log(`Restoring chapter state: ${chapterId}`);

      // LocalStorageから読み込み
      const storageKey = this.getStorageKey(chapterId);
      const serialized = localStorage.getItem(storageKey);

      if (!serialized) {
        return {
          success: false,
          error: ChapterError.CHAPTER_STATE_LOAD_FAILED,
          message: `No saved state found for chapter: ${chapterId}`,
        };
      }

      // デシリアライズ
      const stateData: ChapterStateData = JSON.parse(serialized);

      // データ検証
      if (!this.validateChapterStateData(stateData)) {
        return {
          success: false,
          error: ChapterError.INVALID_CHAPTER_STATE,
          message: `Invalid chapter state data: ${chapterId}`,
        };
      }

      // 章状態を復元
      this.currentChapter = {
        chapterId: stateData.chapterId,
        currentStageIndex: stateData.currentStageIndex,
        lostCharacterIds: [...stateData.lostCharacterIds],
        availableCharacterIds: [...stateData.availableCharacterIds],
        completedStageIds: [...stateData.completedStageIds],
        isCompleted: stateData.isCompleted,
        startTime: stateData.startTime,
        playTime: stateData.playTime,
      };

      this.log(`Chapter state restored: ${chapterId}`);
      return {
        success: true,
        message: `Chapter state restored: ${chapterId}`,
        details: {
          chapterId,
          currentStageIndex: stateData.currentStageIndex,
          completedStages: stateData.completedStageIds.length,
          lostCharacters: stateData.lostCharacterIds.length,
        },
      };
    } catch (error) {
      this.logError('Failed to restore chapter state', error);
      return {
        success: false,
        error: ChapterError.CHAPTER_STATE_LOAD_FAILED,
        message: `Failed to restore chapter state: ${chapterId}`,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * 章状態データの検証
   * Validate chapter state data
   * 
   * @param data - 検証するデータ
   * @returns boolean
   */
  private validateChapterStateData(data: any): data is ChapterStateData {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.chapterId === 'string' &&
      typeof data.currentStageIndex === 'number' &&
      Array.isArray(data.lostCharacterIds) &&
      Array.isArray(data.availableCharacterIds) &&
      Array.isArray(data.completedStageIds) &&
      typeof data.isCompleted === 'boolean' &&
      typeof data.startTime === 'number' &&
      typeof data.playTime === 'number' &&
      typeof data.version === 'string' &&
      typeof data.timestamp === 'number'
    );
  }

  /**
   * ストレージキーの取得
   * Get storage key for chapter
   * 
   * @param chapterId - 章ID
   * @returns string
   */
  private getStorageKey(chapterId: string): string {
    return `${this.STORAGE_KEY_PREFIX}${chapterId}`;
  }

  /**
   * 章データの検証
   * Validate chapter data structure
   * 
   * @param data - 検証するデータ
   * @returns boolean
   */
  private validateChapterData(data: any): data is ChapterData {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.id === 'string' &&
      typeof data.name === 'string' &&
      typeof data.storyDescription === 'string' &&
      Array.isArray(data.stages) &&
      typeof data.recommendedLevel === 'number' &&
      data.stages.length > 0
    );
  }

  /**
   * ログ出力
   * Log message
   * 
   * @param message - ログメッセージ
   */
  private log(message: string): void {
    console.log(`[ChapterManager] ${message}`);
  }

  /**
   * エラーログ出力
   * Log error message
   * 
   * @param message - エラーメッセージ
   * @param error - エラーオブジェクト
   */
  private logError(message: string, error: unknown): void {
    console.error(`[ChapterManager] ${message}`, error);
  }
}
