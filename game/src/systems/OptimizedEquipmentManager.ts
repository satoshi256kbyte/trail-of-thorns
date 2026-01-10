/**
 * OptimizedEquipmentManager - 能力値計算のキャッシュを使用した最適化版EquipmentManager
 * 
 * パフォーマンス最適化:
 * - 能力値計算のキャッシュ: 装備変更時のみ再計算
 * - 不要な再計算の削減: キャッシュヒット率の向上
 * - メモリ効率: 必要最小限のキャッシュデータ
 * 
 * 要件11.2, 11.4対応:
 * - アイテムの使用・装備操作を100ms以内に完了
 * - 装備変更時の能力値再計算を50ms以内に完了
 */

import {
  Equipment,
  EquipmentSet,
  EquipmentSlotType,
  EquipmentStats,
  InventoryUtils,
} from '../types/inventory';
import { EquipmentManager, CharacterEquipmentData } from './EquipmentManager';
import { ItemEffectSystem, Character } from './ItemEffectSystem';
import { InventoryManager } from './InventoryManager';
import { InventoryErrorHandler } from './inventory/InventoryErrorHandler';

/**
 * 能力値キャッシュエントリ
 */
interface StatsCacheEntry {
  /** キャッシュされた能力値 */
  stats: EquipmentStats;
  /** 最終更新時刻 */
  lastUpdated: number;
  /** 装備セットのハッシュ値（変更検出用） */
  equipmentHash: string;
}

/**
 * OptimizedEquipmentManager クラス
 * 能力値計算のキャッシュを使用した最適化版
 */
export class OptimizedEquipmentManager extends EquipmentManager {
  // 能力値キャッシュ
  private statsCache: Map<string, StatsCacheEntry> = new Map();

  // パフォーマンス測定
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private totalCalculationTime: number = 0;
  private calculationCount: number = 0;

  constructor(
    itemEffectSystem: ItemEffectSystem,
    inventoryManager: InventoryManager,
    errorHandler?: InventoryErrorHandler
  ) {
    super(itemEffectSystem, inventoryManager, errorHandler);
  }

  /**
   * 装備セットのハッシュ値を計算
   * 装備の変更を検出するために使用
   */
  private calculateEquipmentHash(equipmentSet: EquipmentSet): string {
    const ids = [
      equipmentSet.weapon?.id || 'null',
      equipmentSet.armor?.id || 'null',
      equipmentSet.accessory1?.id || 'null',
      equipmentSet.accessory2?.id || 'null',
    ];

    return ids.join('|');
  }

  /**
   * キャラクターの総合能力値を取得（キャッシュ使用）
   * 要件11.2, 11.4対応: 装備変更時の能力値再計算を50ms以内に完了
   * 
   * @param characterId キャラクターID
   * @returns 総合能力値
   */
  getTotalStats(characterId: string): EquipmentStats {
    const startTime = performance.now();

    const equipmentSet = this.getAllEquipment(characterId);
    const equipmentHash = this.calculateEquipmentHash(equipmentSet);

    // キャッシュをチェック
    const cacheEntry = this.statsCache.get(characterId);

    if (cacheEntry && cacheEntry.equipmentHash === equipmentHash) {
      // キャッシュヒット
      this.cacheHits++;
      console.log(`[OptimizedEquipmentManager] Cache hit for ${characterId}`);
      return { ...cacheEntry.stats };
    }

    // キャッシュミス - 能力値を再計算
    this.cacheMisses++;
    const stats = InventoryUtils.calculateTotalStats(equipmentSet);

    // キャッシュを更新
    this.statsCache.set(characterId, {
      stats,
      lastUpdated: Date.now(),
      equipmentHash,
    });

    const calculationTime = performance.now() - startTime;
    this.totalCalculationTime += calculationTime;
    this.calculationCount++;

    console.log(
      `[OptimizedEquipmentManager] Stats calculated for ${characterId} in ${calculationTime.toFixed(2)}ms`
    );

    // パフォーマンス要件チェック（50ms以内）
    if (calculationTime > 50) {
      console.warn(
        `[OptimizedEquipmentManager] Calculation time exceeded 50ms: ${calculationTime.toFixed(2)}ms`
      );
    }

    return { ...stats };
  }

  /**
   * キャッシュを無効化
   * 
   * @param characterId キャラクターID（省略時は全キャッシュをクリア）
   */
  invalidateCache(characterId?: string): void {
    if (characterId) {
      this.statsCache.delete(characterId);
      console.log(`[OptimizedEquipmentManager] Cache invalidated for ${characterId}`);
    } else {
      this.statsCache.clear();
      console.log('[OptimizedEquipmentManager] All cache cleared');
    }
  }

  /**
   * キャッシュ統計を取得
   * 
   * @returns キャッシュ統計
   */
  getCacheStats(): {
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    averageCalculationTime: number;
    cacheSize: number;
  } {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;
    const averageCalculationTime =
      this.calculationCount > 0 ? this.totalCalculationTime / this.calculationCount : 0;

    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate,
      averageCalculationTime,
      cacheSize: this.statsCache.size,
    };
  }

  /**
   * キャッシュ統計をリセット
   */
  resetCacheStats(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.totalCalculationTime = 0;
    this.calculationCount = 0;

    console.log('[OptimizedEquipmentManager] Cache stats reset');
  }

  /**
   * システムをクリア（オーバーライド）
   */
  clear(): void {
    super.clear();
    this.invalidateCache();
    this.resetCacheStats();
  }

  /**
   * デバッグ情報を取得（オーバーライド）
   */
  getDebugInfo(): {
    totalCharacters: number;
    charactersWithEquipment: number;
    cacheStats: ReturnType<typeof this.getCacheStats>;
  } {
    const baseInfo = super.getDebugInfo();
    const cacheStats = this.getCacheStats();

    return {
      ...baseInfo,
      cacheStats,
    };
  }
}
