/**
 * LocalStorageManager テスト
 * LocalStorageManager Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { LocalStorageManager } from '../../../../game/src/systems/chapterStage/LocalStorageManager';

describe('LocalStorageManager', () => {
  let storageManager: LocalStorageManager;
  const testKey = 'test_key';
  const testData = { name: 'Test', value: 123, nested: { data: 'nested' } };

  beforeEach(() => {
    // LocalStorageをクリア
    localStorage.clear();
    storageManager = new LocalStorageManager({
      keyPrefix: 'test_',
      enableEncryption: false,
      enableCompression: false,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('基本操作', () => {
    test('データの保存と読み込みができる', () => {
      // 保存
      const saveResult = storageManager.save(testKey, testData);
      expect(saveResult.success).toBe(true);

      // 読み込み
      const loadResult = storageManager.load<typeof testData>(testKey);
      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toEqual(testData);
    });

    test('存在しないキーの読み込みは失敗する', () => {
      const loadResult = storageManager.load('nonexistent_key');
      expect(loadResult.success).toBe(false);
      expect(loadResult.error).toContain('not found');
    });

    test('データの削除ができる', () => {
      // 保存
      storageManager.save(testKey, testData);

      // 削除
      const removeResult = storageManager.remove(testKey);
      expect(removeResult.success).toBe(true);

      // 削除後は読み込めない
      const loadResult = storageManager.load(testKey);
      expect(loadResult.success).toBe(false);
    });

    test('データの存在確認ができる', () => {
      // 保存前
      expect(storageManager.exists(testKey)).toBe(false);

      // 保存
      storageManager.save(testKey, testData);

      // 保存後
      expect(storageManager.exists(testKey)).toBe(true);
    });
  });

  describe('複数データの管理', () => {
    test('複数のデータを保存・読み込みできる', () => {
      const data1 = { id: 1, name: 'Data 1' };
      const data2 = { id: 2, name: 'Data 2' };
      const data3 = { id: 3, name: 'Data 3' };

      storageManager.save('key1', data1);
      storageManager.save('key2', data2);
      storageManager.save('key3', data3);

      expect(storageManager.load('key1').data).toEqual(data1);
      expect(storageManager.load('key2').data).toEqual(data2);
      expect(storageManager.load('key3').data).toEqual(data3);
    });

    test('全キーの取得ができる', () => {
      storageManager.save('key1', { data: 1 });
      storageManager.save('key2', { data: 2 });
      storageManager.save('key3', { data: 3 });

      const keys = storageManager.getAllKeys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    test('全データのクリアができる', () => {
      storageManager.save('key1', { data: 1 });
      storageManager.save('key2', { data: 2 });
      storageManager.save('key3', { data: 3 });

      const clearResult = storageManager.clearAll();
      expect(clearResult.success).toBe(true);

      expect(storageManager.exists('key1')).toBe(false);
      expect(storageManager.exists('key2')).toBe(false);
      expect(storageManager.exists('key3')).toBe(false);
    });
  });

  describe('暗号化機能', () => {
    test('暗号化を有効にしてデータを保存・読み込みできる', () => {
      const encryptedManager = new LocalStorageManager({
        keyPrefix: 'encrypted_',
        enableEncryption: true,
        encryptionKey: 'test_encryption_key_12345',
        enableCompression: false,
      });

      const saveResult = encryptedManager.save(testKey, testData);
      expect(saveResult.success).toBe(true);

      const loadResult = encryptedManager.load<typeof testData>(testKey);
      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toEqual(testData);
    });

    test('暗号化キーなしで暗号化を有効にすると警告が出る', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn');

      new LocalStorageManager({
        keyPrefix: 'test_',
        enableEncryption: true,
        // encryptionKey を指定しない
      });

      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('ストレージ使用量', () => {
    test('ストレージ使用量を取得できる', () => {
      storageManager.save('key1', { data: 'test data 1' });
      storageManager.save('key2', { data: 'test data 2' });

      const usage = storageManager.getStorageUsage();
      expect(usage.used).toBeGreaterThan(0);
      expect(usage.total).toBeGreaterThan(0);
      expect(usage.percentage).toBeGreaterThanOrEqual(0);
      expect(usage.percentage).toBeLessThanOrEqual(100);
    });
  });

  describe('エラーハンドリング', () => {
    test('無効なJSONデータの読み込みは失敗する', () => {
      // 直接LocalStorageに無効なデータを保存
      localStorage.setItem('test_invalid', 'invalid json {');

      const loadResult = storageManager.load('invalid');
      expect(loadResult.success).toBe(false);
      expect(loadResult.error).toBeTruthy();
    });

    test('LocalStorageが利用可能かチェックできる', () => {
      expect(storageManager.isLocalStorageAvailable()).toBe(true);
    });
  });

  describe('データ型のサポート', () => {
    test('文字列データを保存・読み込みできる', () => {
      const stringData = 'test string';
      storageManager.save(testKey, stringData);
      const result = storageManager.load<string>(testKey);
      expect(result.data).toBe(stringData);
    });

    test('数値データを保存・読み込みできる', () => {
      const numberData = 12345;
      storageManager.save(testKey, numberData);
      const result = storageManager.load<number>(testKey);
      expect(result.data).toBe(numberData);
    });

    test('配列データを保存・読み込みできる', () => {
      const arrayData = [1, 2, 3, 'test', { nested: true }];
      storageManager.save(testKey, arrayData);
      const result = storageManager.load<typeof arrayData>(testKey);
      expect(result.data).toEqual(arrayData);
    });

    test('複雑なオブジェクトを保存・読み込みできる', () => {
      const complexData = {
        id: 'test-id',
        name: 'Test Object',
        values: [1, 2, 3],
        nested: {
          level1: {
            level2: {
              data: 'deep nested data',
            },
          },
        },
        timestamp: Date.now(),
      };

      storageManager.save(testKey, complexData);
      const result = storageManager.load<typeof complexData>(testKey);
      expect(result.data).toEqual(complexData);
    });
  });

  describe('プレフィックス機能', () => {
    test('異なるプレフィックスのマネージャーは独立している', () => {
      const manager1 = new LocalStorageManager({ keyPrefix: 'prefix1_' });
      const manager2 = new LocalStorageManager({ keyPrefix: 'prefix2_' });

      const data1 = { value: 'data1' };
      const data2 = { value: 'data2' };

      manager1.save('key', data1);
      manager2.save('key', data2);

      expect(manager1.load('key').data).toEqual(data1);
      expect(manager2.load('key').data).toEqual(data2);
    });

    test('プレフィックスに一致するキーのみクリアされる', () => {
      const manager1 = new LocalStorageManager({ keyPrefix: 'prefix1_' });
      const manager2 = new LocalStorageManager({ keyPrefix: 'prefix2_' });

      manager1.save('key1', { data: 1 });
      manager2.save('key2', { data: 2 });

      manager1.clearAll();

      expect(manager1.exists('key1')).toBe(false);
      expect(manager2.exists('key2')).toBe(true);
    });
  });
});
