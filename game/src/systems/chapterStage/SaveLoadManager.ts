/**
 * セーブ・ロード管理システム
 * Save-Load Management System
 *
 * ゲーム進行状況の永続化を管理します。
 * Manages game progress persistence.
 */

import {
  SaveData,
  SaveSlot,
  ChapterStateData,
  StageProgressData,
  PartyComposition,
  ChapterStageError,
} from '../../types/chapterStage';
import { SaveDataValidator } from './SaveDataValidator';
import { LocalStorageManager } from './LocalStorageManager';

/**
 * セーブ・ロード管理クラス
 * Save-Load Manager Class
 */
export class SaveLoadManager {
  private static readonly SAVE_VERSION = '1.0.0';
  private static readonly MAX_SAVE_SLOTS = 10;
  private static readonly STORAGE_KEY_PREFIX = 'trail_of_thorns_save_';

  private saveSlots: SaveSlot[] = [];
  private autoSaveEnabled: boolean = true;
  private autoSaveSlotId: number = 0; // スロット0をオートセーブ用に予約
  private validator: SaveDataValidator;
  private storageManager: LocalStorageManager;

  /**
   * コンストラクタ
   * Constructor
   *
   * @param enableEncryption - 暗号化を有効にするか（オプション）
   * @param encryptionKey - 暗号化キー（暗号化有効時に必要）
   */
  constructor(enableEncryption: boolean = false, encryptionKey?: string) {
    this.validator = new SaveDataValidator();
    this.storageManager = new LocalStorageManager({
      keyPrefix: SaveLoadManager.STORAGE_KEY_PREFIX,
      enableEncryption,
      encryptionKey,
      enableCompression: false,
    });
    this.initializeSaveSlots();
  }

  /**
   * セーブスロットの初期化
   * Initialize Save Slots
   */
  private initializeSaveSlots(): void {
    for (let i = 0; i < SaveLoadManager.MAX_SAVE_SLOTS; i++) {
      this.saveSlots.push({
        slotId: i,
        saveData: null,
        lastSaved: 0,
      });
    }
  }

  /**
   * セーブデータのシリアライズ
   * Serialize Save Data
   *
   * @param chapterState - 章状態データ
   * @param stageProgress - ステージ進行状況データ
   * @param partyComposition - パーティ編成
   * @param playTime - プレイ時間（ミリ秒）
   * @returns シリアライズされたJSON文字列
   */
  public serializeSaveData(
    chapterState: ChapterStateData,
    stageProgress: StageProgressData,
    partyComposition: PartyComposition,
    playTime: number
  ): string {
    const saveData: SaveData = {
      version: SaveLoadManager.SAVE_VERSION,
      timestamp: Date.now(),
      chapterState,
      stageProgress,
      partyComposition,
      playTime,
    };

    try {
      return JSON.stringify(saveData, null, 2);
    } catch (error) {
      console.error('セーブデータのシリアライズに失敗:', error);
      throw new Error(ChapterStageError.SAVE_FAILED);
    }
  }

  /**
   * セーブデータのデシリアライズ
   * Deserialize Save Data
   *
   * @param jsonString - JSON文字列
   * @returns デシリアライズされたセーブデータ
   * @throws セーブデータが無効な場合
   */
  public deserializeSaveData(jsonString: string): SaveData {
    try {
      const saveData = JSON.parse(jsonString) as SaveData;

      // 基本的な構造チェック
      if (!this.isValidSaveDataStructure(saveData)) {
        throw new Error('無効なセーブデータ構造');
      }

      return saveData;
    } catch (error) {
      console.error('セーブデータのデシリアライズに失敗:', error);
      throw new Error(ChapterStageError.SAVE_DATA_CORRUPTED);
    }
  }

  /**
   * セーブデータ構造の基本検証
   * Basic Save Data Structure Validation
   *
   * @param data - 検証するデータ
   * @returns 有効な構造の場合true
   */
  private isValidSaveDataStructure(data: unknown): data is SaveData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const saveData = data as Partial<SaveData>;

    return (
      typeof saveData.version === 'string' &&
      typeof saveData.timestamp === 'number' &&
      saveData.chapterState !== undefined &&
      saveData.stageProgress !== undefined &&
      saveData.partyComposition !== undefined &&
      typeof saveData.playTime === 'number'
    );
  }

  /**
   * ゲームの保存
   * Save Game
   *
   * @param slotId - セーブスロットID
   * @param chapterState - 章状態データ
   * @param stageProgress - ステージ進行状況データ
   * @param partyComposition - パーティ編成
   * @param playTime - プレイ時間（ミリ秒）
   * @returns 保存成功の場合true
   */
  public saveGame(
    slotId: number,
    chapterState: ChapterStateData,
    stageProgress: StageProgressData,
    partyComposition: PartyComposition,
    playTime: number
  ): boolean {
    try {
      // スロットIDの検証
      if (slotId < 0 || slotId >= SaveLoadManager.MAX_SAVE_SLOTS) {
        throw new Error(ChapterStageError.SAVE_SLOT_NOT_FOUND);
      }

      // セーブデータの作成
      const saveData: SaveData = {
        version: SaveLoadManager.SAVE_VERSION,
        timestamp: Date.now(),
        chapterState,
        stageProgress,
        partyComposition,
        playTime,
      };

      // LocalStorageManagerを使用して保存
      const storageKey = `save_${slotId}`;
      const result = this.storageManager.save(storageKey, saveData);

      if (!result.success) {
        console.error(`セーブ失敗: ${result.error}`);
        return false;
      }

      // セーブスロット情報の更新
      this.saveSlots[slotId] = {
        slotId,
        saveData,
        lastSaved: Date.now(),
      };

      console.log(`セーブ完了: スロット${slotId}`);
      return true;
    } catch (error) {
      console.error(`セーブ失敗: スロット${slotId}`, error);
      return false;
    }
  }

  /**
   * ゲームの読み込み
   * Load Game
   *
   * @param slotId - セーブスロットID
   * @returns 読み込んだセーブデータ、失敗時はnull
   */
  public loadGame(slotId: number): SaveData | null {
    try {
      // スロットIDの検証
      if (slotId < 0 || slotId >= SaveLoadManager.MAX_SAVE_SLOTS) {
        throw new Error(ChapterStageError.SAVE_SLOT_NOT_FOUND);
      }

      // LocalStorageManagerを使用して読み込み
      const storageKey = `save_${slotId}`;
      const result = this.storageManager.load<SaveData>(storageKey);

      if (!result.success || !result.data) {
        console.warn(`セーブデータが存在しません: スロット${slotId}`);
        return null;
      }

      const saveData = result.data;

      // セーブデータの検証
      if (!this.validateSaveData(saveData)) {
        throw new Error(ChapterStageError.SAVE_DATA_CORRUPTED);
      }

      // セーブスロット情報の更新
      this.saveSlots[slotId] = {
        slotId,
        saveData,
        lastSaved: saveData.timestamp,
      };

      console.log(`ロード完了: スロット${slotId}`);
      return saveData;
    } catch (error) {
      console.error(`ロード失敗: スロット${slotId}`, error);
      return null;
    }
  }

  /**
   * セーブスロットの取得
   * Get Save Slots
   *
   * @returns 全セーブスロット情報
   */
  public getSaveSlots(): SaveSlot[] {
    // LocalStorageから最新情報を読み込み
    this.refreshSaveSlots();
    return [...this.saveSlots];
  }

  /**
   * セーブスロット情報の更新
   * Refresh Save Slots
   */
  private refreshSaveSlots(): void {
    for (let i = 0; i < SaveLoadManager.MAX_SAVE_SLOTS; i++) {
      const storageKey = `save_${i}`;
      const result = this.storageManager.load<SaveData>(storageKey);

      if (result.success && result.data) {
        try {
          const saveData = result.data;
          this.saveSlots[i] = {
            slotId: i,
            saveData,
            lastSaved: saveData.timestamp,
          };
        } catch (error) {
          console.error(`スロット${i}のデータ読み込みエラー:`, error);
          this.saveSlots[i] = {
            slotId: i,
            saveData: null,
            lastSaved: 0,
          };
        }
      } else {
        this.saveSlots[i] = {
          slotId: i,
          saveData: null,
          lastSaved: 0,
        };
      }
    }
  }

  /**
   * セーブデータの削除
   * Delete Save Data
   *
   * @param slotId - セーブスロットID
   * @returns 削除成功の場合true
   */
  public deleteSaveData(slotId: number): boolean {
    try {
      // スロットIDの検証
      if (slotId < 0 || slotId >= SaveLoadManager.MAX_SAVE_SLOTS) {
        throw new Error(ChapterStageError.SAVE_SLOT_NOT_FOUND);
      }

      // LocalStorageManagerを使用して削除
      const storageKey = `save_${slotId}`;
      const result = this.storageManager.remove(storageKey);

      if (!result.success) {
        console.error(`セーブデータ削除失敗: ${result.error}`);
        return false;
      }

      // セーブスロット情報の更新
      this.saveSlots[slotId] = {
        slotId,
        saveData: null,
        lastSaved: 0,
      };

      console.log(`セーブデータ削除完了: スロット${slotId}`);
      return true;
    } catch (error) {
      console.error(`セーブデータ削除失敗: スロット${slotId}`, error);
      return false;
    }
  }

  /**
   * オートセーブ
   * Auto Save
   *
   * @param chapterState - 章状態データ
   * @param stageProgress - ステージ進行状況データ
   * @param partyComposition - パーティ編成
   * @param playTime - プレイ時間（ミリ秒）
   */
  public autoSave(
    chapterState: ChapterStateData,
    stageProgress: StageProgressData,
    partyComposition: PartyComposition,
    playTime: number
  ): void {
    if (!this.autoSaveEnabled) {
      return;
    }

    const success = this.saveGame(
      this.autoSaveSlotId,
      chapterState,
      stageProgress,
      partyComposition,
      playTime
    );

    if (success) {
      console.log('オートセーブ完了');
    } else {
      console.error('オートセーブ失敗');
    }
  }

  /**
   * オートセーブの有効/無効切り替え
   * Toggle Auto Save
   *
   * @param enabled - 有効にする場合true
   */
  public setAutoSaveEnabled(enabled: boolean): void {
    this.autoSaveEnabled = enabled;
    console.log(`オートセーブ: ${enabled ? '有効' : '無効'}`);
  }

  /**
   * オートセーブの有効状態取得
   * Get Auto Save Enabled Status
   *
   * @returns オートセーブが有効な場合true
   */
  public isAutoSaveEnabled(): boolean {
    return this.autoSaveEnabled;
  }

  /**
   * セーブデータの検証
   * Validate Save Data
   *
   * @param saveData - 検証するセーブデータ
   * @returns 検証が成功した場合true
   */
  public validateSaveData(saveData: SaveData): boolean {
    const result = this.validator.validateSaveData(saveData);

    if (!result.isValid) {
      console.error('セーブデータ検証エラー:', result.errors);
      return false;
    }

    if (result.warnings.length > 0) {
      console.warn('セーブデータ検証警告:', result.warnings);
    }

    return true;
  }

  /**
   * 全セーブデータのクリア（デバッグ用）
   * Clear All Save Data (for debugging)
   */
  public clearAllSaveData(): void {
    for (let i = 0; i < SaveLoadManager.MAX_SAVE_SLOTS; i++) {
      this.deleteSaveData(i);
    }
    console.log('全セーブデータをクリアしました');
  }

  /**
   * LocalStorageの利用可能性チェック
   * Check LocalStorage Availability
   *
   * @returns 利用可能な場合true
   */
  public isLocalStorageAvailable(): boolean {
    return this.storageManager.isLocalStorageAvailable();
  }

  /**
   * ストレージ使用量の取得
   * Get Storage Usage
   *
   * @returns 使用量情報
   */
  public getStorageUsage(): {
    used: number;
    total: number;
    percentage: number;
  } {
    return this.storageManager.getStorageUsage();
  }

  /**
   * LocalStorageManagerの取得
   * Get LocalStorage Manager
   *
   * @returns LocalStorageManager
   */
  public getStorageManager(): LocalStorageManager {
    return this.storageManager;
  }
}

