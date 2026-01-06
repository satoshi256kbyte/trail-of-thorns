/**
 * LocalStorage管理システム
 * LocalStorage Management System
 *
 * LocalStorageへのデータ永続化を管理します。
 * オプションで暗号化機能を提供します。
 * Manages data persistence to LocalStorage with optional encryption.
 */

import { ChapterStageError } from '../../types/chapterStage';

/**
 * LocalStorage設定
 * LocalStorage Configuration
 */
export interface LocalStorageConfig {
  /** ストレージキーのプレフィックス */
  keyPrefix: string;
  /** 暗号化を有効にするか */
  enableEncryption: boolean;
  /** 暗号化キー（暗号化有効時に必要） */
  encryptionKey?: string;
  /** データ圧縮を有効にするか */
  enableCompression: boolean;
}

/**
 * LocalStorage操作結果
 * LocalStorage Operation Result
 */
export interface LocalStorageResult<T = unknown> {
  /** 操作が成功したか */
  success: boolean;
  /** データ（読み込み時） */
  data?: T;
  /** エラーメッセージ */
  error?: string;
  /** 詳細情報 */
  details?: Record<string, unknown>;
}

/**
 * LocalStorageManager class
 * LocalStorage管理クラス
 */
export class LocalStorageManager {
  private config: LocalStorageConfig;

  // デフォルト設定
  private static readonly DEFAULT_CONFIG: LocalStorageConfig = {
    keyPrefix: 'trail_of_thorns_',
    enableEncryption: false,
    enableCompression: false,
  };

  /**
   * コンストラクタ
   * Constructor
   *
   * @param config - LocalStorage設定
   */
  constructor(config?: Partial<LocalStorageConfig>) {
    this.config = { ...LocalStorageManager.DEFAULT_CONFIG, ...config };

    // 暗号化が有効な場合、暗号化キーが必要
    if (this.config.enableEncryption && !this.config.encryptionKey) {
      console.warn(
        '[LocalStorageManager] Encryption enabled but no encryption key provided. Disabling encryption.'
      );
      this.config.enableEncryption = false;
    }

    // LocalStorageの利用可能性チェック
    if (!this.isLocalStorageAvailable()) {
      console.error('[LocalStorageManager] LocalStorage is not available');
    }
  }

  /**
   * LocalStorageの利用可能性チェック
   * Check LocalStorage Availability
   *
   * @returns 利用可能な場合true
   */
  public isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * データの保存
   * Save Data
   *
   * @param key - ストレージキー
   * @param data - 保存するデータ
   * @returns 保存結果
   */
  public save<T>(key: string, data: T): LocalStorageResult<void> {
    try {
      if (!this.isLocalStorageAvailable()) {
        return {
          success: false,
          error: 'LocalStorage is not available',
        };
      }

      // データのシリアライズ
      let serializedData = JSON.stringify(data);

      // 圧縮（オプション）
      if (this.config.enableCompression) {
        serializedData = this.compress(serializedData);
      }

      // 暗号化（オプション）
      if (this.config.enableEncryption && this.config.encryptionKey) {
        serializedData = this.encrypt(serializedData, this.config.encryptionKey);
      }

      // LocalStorageに保存
      const storageKey = this.getStorageKey(key);
      localStorage.setItem(storageKey, serializedData);

      return {
        success: true,
        details: {
          key: storageKey,
          size: serializedData.length,
          encrypted: this.config.enableEncryption,
          compressed: this.config.enableCompression,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to save data: ${error instanceof Error ? error.message : String(error)}`,
        details: { key, error },
      };
    }
  }

  /**
   * データの読み込み
   * Load Data
   *
   * @param key - ストレージキー
   * @returns 読み込み結果
   */
  public load<T>(key: string): LocalStorageResult<T> {
    try {
      if (!this.isLocalStorageAvailable()) {
        return {
          success: false,
          error: 'LocalStorage is not available',
        };
      }

      // LocalStorageから読み込み
      const storageKey = this.getStorageKey(key);
      let serializedData = localStorage.getItem(storageKey);

      if (serializedData === null) {
        return {
          success: false,
          error: 'Data not found',
          details: { key: storageKey },
        };
      }

      // 復号化（オプション）
      if (this.config.enableEncryption && this.config.encryptionKey) {
        serializedData = this.decrypt(serializedData, this.config.encryptionKey);
      }

      // 解凍（オプション）
      if (this.config.enableCompression) {
        serializedData = this.decompress(serializedData);
      }

      // データのデシリアライズ
      const data = JSON.parse(serializedData) as T;

      return {
        success: true,
        data,
        details: {
          key: storageKey,
          size: serializedData.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load data: ${error instanceof Error ? error.message : String(error)}`,
        details: { key, error },
      };
    }
  }

  /**
   * データの削除
   * Remove Data
   *
   * @param key - ストレージキー
   * @returns 削除結果
   */
  public remove(key: string): LocalStorageResult<void> {
    try {
      if (!this.isLocalStorageAvailable()) {
        return {
          success: false,
          error: 'LocalStorage is not available',
        };
      }

      const storageKey = this.getStorageKey(key);
      localStorage.removeItem(storageKey);

      return {
        success: true,
        details: { key: storageKey },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to remove data: ${error instanceof Error ? error.message : String(error)}`,
        details: { key, error },
      };
    }
  }

  /**
   * データの存在確認
   * Check Data Existence
   *
   * @param key - ストレージキー
   * @returns データが存在する場合true
   */
  public exists(key: string): boolean {
    try {
      if (!this.isLocalStorageAvailable()) {
        return false;
      }

      const storageKey = this.getStorageKey(key);
      return localStorage.getItem(storageKey) !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * 全データのクリア
   * Clear All Data
   *
   * @returns クリア結果
   */
  public clearAll(): LocalStorageResult<void> {
    try {
      if (!this.isLocalStorageAvailable()) {
        return {
          success: false,
          error: 'LocalStorage is not available',
        };
      }

      // プレフィックスに一致するキーのみを削除
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.config.keyPrefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));

      return {
        success: true,
        details: {
          removedCount: keysToRemove.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to clear data: ${error instanceof Error ? error.message : String(error)}`,
        details: { error },
      };
    }
  }

  /**
   * 全キーの取得
   * Get All Keys
   *
   * @returns キーリスト
   */
  public getAllKeys(): string[] {
    try {
      if (!this.isLocalStorageAvailable()) {
        return [];
      }

      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.config.keyPrefix)) {
          // プレフィックスを除いたキーを返す
          keys.push(key.substring(this.config.keyPrefix.length));
        }
      }

      return keys;
    } catch (error) {
      console.error('[LocalStorageManager] Failed to get all keys:', error);
      return [];
    }
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
    try {
      if (!this.isLocalStorageAvailable()) {
        return { used: 0, total: 0, percentage: 0 };
      }

      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.config.keyPrefix)) {
          const value = localStorage.getItem(key);
          if (value) {
            used += key.length + value.length;
          }
        }
      }

      // LocalStorageの一般的な制限は5MB（ブラウザによって異なる）
      const total = 5 * 1024 * 1024; // 5MB in bytes
      const percentage = (used / total) * 100;

      return {
        used,
        total,
        percentage: Math.round(percentage * 100) / 100,
      };
    } catch (error) {
      console.error('[LocalStorageManager] Failed to get storage usage:', error);
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * ストレージキーの取得
   * Get Storage Key
   *
   * @param key - 元のキー
   * @returns プレフィックス付きストレージキー
   */
  private getStorageKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * データの暗号化（簡易実装）
   * Encrypt Data (Simple Implementation)
   *
   * 注意: これは簡易的な暗号化実装です。
   * 本番環境では、より強力な暗号化ライブラリ（例: crypto-js）の使用を推奨します。
   *
   * @param data - 暗号化するデータ
   * @param key - 暗号化キー
   * @returns 暗号化されたデータ
   */
  private encrypt(data: string, key: string): string {
    try {
      // Base64エンコード + 簡易XOR暗号化
      const keyBytes = this.stringToBytes(key);
      const dataBytes = this.stringToBytes(data);
      const encryptedBytes: number[] = [];

      for (let i = 0; i < dataBytes.length; i++) {
        encryptedBytes.push(dataBytes[i] ^ keyBytes[i % keyBytes.length]);
      }

      return btoa(String.fromCharCode(...encryptedBytes));
    } catch (error) {
      console.error('[LocalStorageManager] Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * データの復号化（簡易実装）
   * Decrypt Data (Simple Implementation)
   *
   * @param encryptedData - 暗号化されたデータ
   * @param key - 暗号化キー
   * @returns 復号化されたデータ
   */
  private decrypt(encryptedData: string, key: string): string {
    try {
      // Base64デコード + 簡易XOR復号化
      const keyBytes = this.stringToBytes(key);
      const encryptedBytes = Array.from(atob(encryptedData)).map((c) => c.charCodeAt(0));
      const decryptedBytes: number[] = [];

      for (let i = 0; i < encryptedBytes.length; i++) {
        decryptedBytes.push(encryptedBytes[i] ^ keyBytes[i % keyBytes.length]);
      }

      return String.fromCharCode(...decryptedBytes);
    } catch (error) {
      console.error('[LocalStorageManager] Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * 文字列をバイト配列に変換
   * Convert String to Bytes
   *
   * @param str - 文字列
   * @returns バイト配列
   */
  private stringToBytes(str: string): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
    return bytes;
  }

  /**
   * データの圧縮（簡易実装）
   * Compress Data (Simple Implementation)
   *
   * 注意: これは簡易的な圧縮実装です。
   * 本番環境では、より効率的な圧縮ライブラリ（例: pako）の使用を推奨します。
   *
   * @param data - 圧縮するデータ
   * @returns 圧縮されたデータ
   */
  private compress(data: string): string {
    try {
      // 簡易的なRLE（Run-Length Encoding）圧縮
      // 実際の実装では、より効率的な圧縮アルゴリズムを使用すべき
      return data; // 現時点では圧縮なし（将来の拡張用）
    } catch (error) {
      console.error('[LocalStorageManager] Compression failed:', error);
      return data;
    }
  }

  /**
   * データの解凍（簡易実装）
   * Decompress Data (Simple Implementation)
   *
   * @param compressedData - 圧縮されたデータ
   * @returns 解凍されたデータ
   */
  private decompress(compressedData: string): string {
    try {
      // 簡易的なRLE解凍
      return compressedData; // 現時点では解凍なし（将来の拡張用）
    } catch (error) {
      console.error('[LocalStorageManager] Decompression failed:', error);
      return compressedData;
    }
  }
}
