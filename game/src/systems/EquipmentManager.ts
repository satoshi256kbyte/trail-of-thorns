/**
 * EquipmentManager - キャラクターの装備管理システム
 * 
 * このシステムは以下の機能を提供します：
 * - 装備の装着・解除
 * - 装備条件のチェック
 * - 装備効果の適用・除去
 * - 装備スロットの管理
 * 
 * 要件: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.3, 4.4
 */

import {
  Equipment,
  EquipmentSet,
  EquipmentSlotType,
  EquipmentCheckResult,
  EquipmentOperationResult,
  EquipmentStats,
  EquipmentRequirements,
  InventoryUtils,
  InventoryTypeValidators,
} from '../types/inventory';
import { ItemEffectSystem, Character } from './ItemEffectSystem';
import { InventoryManager } from './InventoryManager';
import { InventoryErrorHandler, ErrorSeverity } from './inventory/InventoryErrorHandler';

/**
 * キャラクター装備データ
 */
export interface CharacterEquipmentData {
  characterId: string;
  equipmentSet: EquipmentSet;
  appliedStats: EquipmentStats;
}

/**
 * EquipmentManager クラス
 * キャラクターの装備管理を担当
 */
export class EquipmentManager {
  private characterEquipments: Map<string, CharacterEquipmentData>;
  private itemEffectSystem: ItemEffectSystem;
  private inventoryManager: InventoryManager;
  private errorHandler: InventoryErrorHandler;

  constructor(itemEffectSystem: ItemEffectSystem, inventoryManager: InventoryManager, errorHandler?: InventoryErrorHandler) {
    this.characterEquipments = new Map();
    this.itemEffectSystem = itemEffectSystem;
    this.inventoryManager = inventoryManager;
    this.errorHandler = errorHandler || inventoryManager.getErrorHandler();
  }

  /**
   * 装備を装着する
   * 要件: 2.1, 2.2, 2.3, 2.4, 2.6
   * 
   * @param characterId キャラクターID
   * @param item 装備アイテム
   * @param slot 装備スロット
   * @param character キャラクター情報（条件チェック用）
   * @returns 装備操作結果
   */
  equipItem(
    characterId: string,
    item: Equipment,
    slot: EquipmentSlotType,
    character: Character
  ): EquipmentOperationResult {
    try {
      // 装備の検証
      if (!InventoryTypeValidators.isValidEquipment(item)) {
        this.errorHandler.handleEquipmentFailureError(
          characterId,
          item?.id ?? 'unknown',
          '無効な装備データです'
        );
        return {
          success: false,
          message: '無効な装備データです',
          previousEquipment: null,
          newEquipment: null,
          statsChanged: {},
        };
      }

      // スロットの検証
      if (item.slot !== slot) {
        this.errorHandler.handleEquipmentFailureError(
          characterId,
          item.id,
          `この装備は${slot}スロットに装着できません`
        );
        return {
          success: false,
          message: `この装備は${slot}スロットに装着できません`,
          previousEquipment: null,
          newEquipment: null,
          statsChanged: {},
        };
      }

      // 装備条件のチェック（要件: 2.7, 4.3, 4.4）
      const checkResult = this.checkEquipmentRequirements(characterId, item, character);
      if (!checkResult.canEquip) {
        this.errorHandler.handleEquipmentFailureError(
          characterId,
          item.id,
          `装備条件を満たしていません: ${checkResult.failureReasons.join(', ')}`
        );
        return {
          success: false,
          message: `装備条件を満たしていません: ${checkResult.failureReasons.join(', ')}`,
          previousEquipment: null,
          newEquipment: null,
          statsChanged: {},
        };
      }

      // キャラクターの装備データを取得または作成
      let equipmentData = this.characterEquipments.get(characterId);
      if (!equipmentData) {
        equipmentData = {
          characterId,
          equipmentSet: InventoryUtils.createEmptyEquipmentSet(),
          appliedStats: {},
        };
        this.characterEquipments.set(characterId, equipmentData);
      }

      // 既存の装備を取得
      const previousEquipment = this.getEquipmentFromSlot(equipmentData.equipmentSet, slot);

      // 既存の装備がある場合、インベントリに戻す（要件: 2.6）
      if (previousEquipment) {
        // 装備効果を除去
        this.removeEquipmentEffects(characterId, slot, character);

        // インベントリに追加
        const addResult = this.inventoryManager.addItem(previousEquipment, 1);
        if (!addResult.success) {
          return {
            success: false,
            message: 'インベントリに空きがありません',
            previousEquipment,
            newEquipment: null,
            statsChanged: {},
          };
        }
      }

      // 新しい装備をインベントリから削除（要件: 2.6）
      const removeResult = this.inventoryManager.removeItem(item.id, 1);
      if (!removeResult.success) {
        // インベントリから削除できなかった場合、既存装備を戻す
        if (previousEquipment) {
          this.inventoryManager.removeItem(previousEquipment.id, 1);
          this.setEquipmentToSlot(equipmentData.equipmentSet, slot, previousEquipment);
          this.applyEquipmentEffects(characterId, slot, previousEquipment, character);
        }
        return {
          success: false,
          message: 'インベントリにアイテムが存在しません',
          previousEquipment,
          newEquipment: null,
          statsChanged: {},
        };
      }

      // 新しい装備を装着
      this.setEquipmentToSlot(equipmentData.equipmentSet, slot, item);

      // 装備効果を適用（要件: 2.4）
      const statsChanged = this.applyEquipmentEffects(characterId, slot, item, character);

      // 適用済み能力値を更新
      equipmentData.appliedStats = InventoryUtils.calculateTotalStats(equipmentData.equipmentSet);

      console.log(`[EquipmentManager] Equipped ${item.name} to ${characterId} ${slot}`);

      return {
        success: true,
        message: `${item.name}を装備しました`,
        previousEquipment,
        newEquipment: item,
        statsChanged,
      };
    } catch (error) {
      this.errorHandler.createAndLogError(
        'EQUIP_ITEM_FAILED',
        'Failed to equip item',
        ErrorSeverity.ERROR,
        { characterId, itemId: item?.id ?? 'unknown', slot, error: (error as Error).message }
      );
      console.error('[EquipmentManager] Error equipping item:', error);
      return {
        success: false,
        message: '装備の装着に失敗しました',
        previousEquipment: null,
        newEquipment: null,
        statsChanged: {},
      };
    }
  }

  /**
   * 装備を解除する
   * 要件: 2.5
   * 
   * @param characterId キャラクターID
   * @param slot 装備スロット
   * @param character キャラクター情報
   * @returns 解除された装備、存在しない場合はnull
   */
  unequipItem(
    characterId: string,
    slot: EquipmentSlotType,
    character: Character
  ): Equipment | null {
    try {
      const equipmentData = this.characterEquipments.get(characterId);
      if (!equipmentData) {
        console.warn(`[EquipmentManager] No equipment data for character ${characterId}`);
        return null;
      }

      const equipment = this.getEquipmentFromSlot(equipmentData.equipmentSet, slot);
      if (!equipment) {
        console.warn(`[EquipmentManager] No equipment in slot ${slot} for character ${characterId}`);
        return null;
      }

      // 装備効果を除去（要件: 2.5）
      this.removeEquipmentEffects(characterId, slot, character);

      // 装備を解除
      this.setEquipmentToSlot(equipmentData.equipmentSet, slot, null);

      // 適用済み能力値を更新
      equipmentData.appliedStats = InventoryUtils.calculateTotalStats(equipmentData.equipmentSet);

      // インベントリに追加
      const addResult = this.inventoryManager.addItem(equipment, 1);
      if (!addResult.success) {
        console.error('[EquipmentManager] Failed to add equipment to inventory');
        // 装備は解除されたが、インベントリに追加できなかった
        // 実際のゲームでは、この状況を適切に処理する必要がある
      }

      console.log(`[EquipmentManager] Unequipped ${equipment.name} from ${characterId} ${slot}`);

      return equipment;
    } catch (error) {
      this.errorHandler.createAndLogError(
        'UNEQUIP_ITEM_FAILED',
        'Failed to unequip item',
        ErrorSeverity.ERROR,
        { characterId, slot, error: (error as Error).message }
      );
      console.error('[EquipmentManager] Error unequipping item:', error);
      return null;
    }
  }

  /**
   * 装備を取得する
   * 
   * @param characterId キャラクターID
   * @param slot 装備スロット
   * @returns 装備、存在しない場合はnull
   */
  getEquipment(characterId: string, slot: EquipmentSlotType): Equipment | null {
    const equipmentData = this.characterEquipments.get(characterId);
    if (!equipmentData) {
      return null;
    }

    return this.getEquipmentFromSlot(equipmentData.equipmentSet, slot);
  }

  /**
   * 全装備を取得する
   * 要件: 2.1, 2.2, 2.3
   * 
   * @param characterId キャラクターID
   * @returns 装備セット
   */
  getAllEquipment(characterId: string): EquipmentSet {
    const equipmentData = this.characterEquipments.get(characterId);
    if (!equipmentData) {
      return InventoryUtils.createEmptyEquipmentSet();
    }

    return InventoryUtils.cloneEquipmentSet(equipmentData.equipmentSet);
  }

  /**
   * 装備可能かチェックする
   * 要件: 2.7, 4.3, 4.4
   * 
   * @param characterId キャラクターID
   * @param item 装備アイテム
   * @param character キャラクター情報
   * @returns 装備可能フラグ
   */
  canEquip(characterId: string, item: Equipment, character: Character): boolean {
    const checkResult = this.checkEquipmentRequirements(characterId, item, character);
    return checkResult.canEquip;
  }

  /**
   * 装備条件をチェックする
   * 要件: 2.7, 4.3, 4.4
   * 
   * @param characterId キャラクターID
   * @param item 装備アイテム
   * @param character キャラクター情報
   * @returns 装備条件チェック結果
   */
  checkEquipmentRequirements(
    characterId: string,
    item: Equipment,
    character: Character
  ): EquipmentCheckResult {
    const failureReasons: string[] = [];
    const missingRequirements: {
      level?: number;
      job?: string;
      stats?: Partial<EquipmentStats>;
    } = {};

    const requirements = item.requirements;

    // レベル条件チェック（要件: 4.3）
    if (requirements.level !== undefined && character.level < requirements.level) {
      failureReasons.push(`レベル${requirements.level}以上が必要です`);
      missingRequirements.level = requirements.level;
    }

    // 職業条件チェック（要件: 4.4）
    // 注: 実際のゲームでは、characterに職業情報が必要
    // ここでは簡易的な実装として、職業情報がない場合はチェックをスキップ
    if (requirements.job !== undefined) {
      // TODO: キャラクターの職業情報を取得してチェック
      // 現在は常に条件を満たすものとする
    }

    // 能力値条件チェック
    if (requirements.stats) {
      const missingStats: Partial<EquipmentStats> = {};

      if (requirements.stats.attack !== undefined && character.stats.attack < requirements.stats.attack) {
        failureReasons.push(`攻撃力${requirements.stats.attack}以上が必要です`);
        missingStats.attack = requirements.stats.attack;
      }

      if (requirements.stats.defense !== undefined && character.stats.defense < requirements.stats.defense) {
        failureReasons.push(`防御力${requirements.stats.defense}以上が必要です`);
        missingStats.defense = requirements.stats.defense;
      }

      if (requirements.stats.speed !== undefined && character.stats.speed < requirements.stats.speed) {
        failureReasons.push(`速度${requirements.stats.speed}以上が必要です`);
        missingStats.speed = requirements.stats.speed;
      }

      if (Object.keys(missingStats).length > 0) {
        missingRequirements.stats = missingStats;
      }
    }

    return {
      canEquip: failureReasons.length === 0,
      failureReasons,
      missingRequirements,
    };
  }

  /**
   * 装備効果を適用する
   * 要件: 2.4, 3.1
   * 
   * @param characterId キャラクターID
   * @param slot 装備スロット
   * @param equipment 装備
   * @param character キャラクター情報
   * @returns 変更された能力値
   */
  private applyEquipmentEffects(
    characterId: string,
    slot: EquipmentSlotType,
    equipment: Equipment,
    character: Character
  ): EquipmentStats {
    const statsChanged: EquipmentStats = {};

    // 能力値ボーナスを適用
    if (equipment.stats.hp) {
      character.maxHP += equipment.stats.hp;
      statsChanged.hp = equipment.stats.hp;
    }

    if (equipment.stats.mp) {
      character.maxMP += equipment.stats.mp;
      statsChanged.mp = equipment.stats.mp;
    }

    if (equipment.stats.attack) {
      character.stats.attack += equipment.stats.attack;
      statsChanged.attack = equipment.stats.attack;
    }

    if (equipment.stats.defense) {
      character.stats.defense += equipment.stats.defense;
      statsChanged.defense = equipment.stats.defense;
    }

    if (equipment.stats.speed) {
      character.stats.speed += equipment.stats.speed;
      statsChanged.speed = equipment.stats.speed;
    }

    if (equipment.stats.accuracy) {
      character.stats.accuracy += equipment.stats.accuracy;
      statsChanged.accuracy = equipment.stats.accuracy;
    }

    if (equipment.stats.evasion) {
      character.stats.evasion += equipment.stats.evasion;
      statsChanged.evasion = equipment.stats.evasion;
    }

    // アイテム効果を適用
    for (const effect of equipment.effects) {
      this.itemEffectSystem.applyEffect(effect, characterId, character);
    }

    return statsChanged;
  }

  /**
   * 装備効果を除去する
   * 要件: 2.5, 3.1
   * 
   * @param characterId キャラクターID
   * @param slot 装備スロット
   * @param character キャラクター情報
   */
  private removeEquipmentEffects(
    characterId: string,
    slot: EquipmentSlotType,
    character: Character
  ): void {
    const equipment = this.getEquipment(characterId, slot);
    if (!equipment) {
      return;
    }

    // 能力値ボーナスを除去
    if (equipment.stats.hp) {
      character.maxHP -= equipment.stats.hp;
      character.currentHP = Math.min(character.currentHP, character.maxHP);
    }

    if (equipment.stats.mp) {
      character.maxMP -= equipment.stats.mp;
      character.currentMP = Math.min(character.currentMP, character.maxMP);
    }

    if (equipment.stats.attack) {
      character.stats.attack -= equipment.stats.attack;
    }

    if (equipment.stats.defense) {
      character.stats.defense -= equipment.stats.defense;
    }

    if (equipment.stats.speed) {
      character.stats.speed -= equipment.stats.speed;
    }

    if (equipment.stats.accuracy) {
      character.stats.accuracy -= equipment.stats.accuracy;
    }

    if (equipment.stats.evasion) {
      character.stats.evasion -= equipment.stats.evasion;
    }

    // アイテム効果を除去
    for (const effect of equipment.effects) {
      this.itemEffectSystem.removeEffect(effect.id, characterId);
    }
  }

  /**
   * スロットから装備を取得する
   * 
   * @param equipmentSet 装備セット
   * @param slot スロット
   * @returns 装備
   */
  private getEquipmentFromSlot(equipmentSet: EquipmentSet, slot: EquipmentSlotType): Equipment | null {
    switch (slot) {
      case EquipmentSlotType.WEAPON:
        return equipmentSet.weapon;
      case EquipmentSlotType.ARMOR:
        return equipmentSet.armor;
      case EquipmentSlotType.ACCESSORY1:
        return equipmentSet.accessory1;
      case EquipmentSlotType.ACCESSORY2:
        return equipmentSet.accessory2;
      default:
        return null;
    }
  }

  /**
   * スロットに装備を設定する
   * 
   * @param equipmentSet 装備セット
   * @param slot スロット
   * @param equipment 装備
   */
  private setEquipmentToSlot(
    equipmentSet: EquipmentSet,
    slot: EquipmentSlotType,
    equipment: Equipment | null
  ): void {
    switch (slot) {
      case EquipmentSlotType.WEAPON:
        equipmentSet.weapon = equipment;
        break;
      case EquipmentSlotType.ARMOR:
        equipmentSet.armor = equipment;
        break;
      case EquipmentSlotType.ACCESSORY1:
        equipmentSet.accessory1 = equipment;
        break;
      case EquipmentSlotType.ACCESSORY2:
        equipmentSet.accessory2 = equipment;
        break;
    }
  }

  /**
   * キャラクターの装備データを初期化する
   * 
   * @param characterId キャラクターID
   */
  initializeCharacterEquipment(characterId: string): void {
    if (!this.characterEquipments.has(characterId)) {
      this.characterEquipments.set(characterId, {
        characterId,
        equipmentSet: InventoryUtils.createEmptyEquipmentSet(),
        appliedStats: {},
      });
    }
  }

  /**
   * 装備データをシリアライズ
   * 要件9.2対応: 各キャラクターの装備状態をシリアライズ
   * 
   * @returns シリアライズされた装備データ
   */
  serializeEquipmentData(): string {
    try {
      const saveData = {
        version: '1.0.0',
        characters: Array.from(this.characterEquipments.entries()).map(([characterId, data]) => ({
          characterId,
          equipment: {
            weapon: data.equipmentSet.weapon?.id || null,
            armor: data.equipmentSet.armor?.id || null,
            accessory1: data.equipmentSet.accessory1?.id || null,
            accessory2: data.equipmentSet.accessory2?.id || null,
          },
          appliedStats: data.appliedStats,
        })),
        timestamp: Date.now(),
      };

      return JSON.stringify(saveData);
    } catch (error) {
      this.errorHandler.handleStorageError('save', error as Error);
      console.error('[EquipmentManager] Error serializing equipment data:', error);
      throw new Error('Failed to serialize equipment data');
    }
  }

  /**
   * 装備データをデシリアライズ
   * 要件9.4対応: シリアライズされたデータから装備状態を復元
   * 
   * @param serializedData シリアライズされたデータ
   * @param itemDataLoader アイテムデータローダー（アイテム定義取得用）
   * @returns デシリアライズ成功フラグ
   */
  deserializeEquipmentData(serializedData: string, itemDataLoader: any): boolean {
    try {
      const saveData = JSON.parse(serializedData);

      // バージョンチェック
      if (!saveData.version) {
        console.warn('[EquipmentManager] No version information in save data');
      }

      // 装備データをクリア
      this.clear();

      // 各キャラクターの装備を復元
      if (Array.isArray(saveData.characters)) {
        for (const characterData of saveData.characters) {
          const characterId = characterData.characterId;

          // キャラクター装備データを初期化
          this.initializeCharacterEquipment(characterId);

          const equipmentData = this.characterEquipments.get(characterId);
          if (!equipmentData) {
            console.warn(`[EquipmentManager] Failed to initialize equipment for ${characterId}`);
            continue;
          }

          // 各スロットの装備を復元
          const equipmentIds = characterData.equipment;

          if (equipmentIds.weapon) {
            const itemDef = itemDataLoader.getItemDefinition(equipmentIds.weapon);
            if (itemDef && itemDef.equipmentData) {
              equipmentData.equipmentSet.weapon = itemDef.equipmentData;
            }
          }

          if (equipmentIds.armor) {
            const itemDef = itemDataLoader.getItemDefinition(equipmentIds.armor);
            if (itemDef && itemDef.equipmentData) {
              equipmentData.equipmentSet.armor = itemDef.equipmentData;
            }
          }

          if (equipmentIds.accessory1) {
            const itemDef = itemDataLoader.getItemDefinition(equipmentIds.accessory1);
            if (itemDef && itemDef.equipmentData) {
              equipmentData.equipmentSet.accessory1 = itemDef.equipmentData;
            }
          }

          if (equipmentIds.accessory2) {
            const itemDef = itemDataLoader.getItemDefinition(equipmentIds.accessory2);
            if (itemDef && itemDef.equipmentData) {
              equipmentData.equipmentSet.accessory2 = itemDef.equipmentData;
            }
          }

          // 適用済み能力値を復元
          if (characterData.appliedStats) {
            equipmentData.appliedStats = characterData.appliedStats;
          }
        }
      }

      console.log('[EquipmentManager] Equipment data deserialized successfully');
      return true;
    } catch (error) {
      this.errorHandler.handleStorageError('load', error as Error);
      console.error('[EquipmentManager] Error deserializing equipment data:', error);
      throw new Error('Failed to deserialize equipment data');
    }
  }

  /**
   * 装備をLocalStorageに保存
   * 要件9.2対応: LocalStorageへの保存
   * 
   * @param key 保存キー（デフォルト: 'equipment_data'）
   * @returns 保存成功フラグ
   */
  saveToLocalStorage(key: string = 'equipment_data'): boolean {
    try {
      const serializedData = this.serializeEquipmentData();
      localStorage.setItem(key, serializedData);

      console.log(`[EquipmentManager] Equipment saved to localStorage: ${key}`);
      return true;
    } catch (error) {
      this.errorHandler.handleStorageError('save', error as Error);
      console.error('[EquipmentManager] Error saving to localStorage:', error);

      if (error instanceof DOMException && error.code === 22) {
        throw new Error('Storage quota exceeded');
      }

      throw new Error('Failed to save to localStorage');
    }
  }

  /**
   * 装備をLocalStorageから読み込み
   * 要件9.4対応: LocalStorageからの読み込み
   * 
   * @param key 読み込みキー（デフォルト: 'equipment_data'）
   * @param itemDataLoader アイテムデータローダー
   * @returns 読み込み成功フラグ
   */
  loadFromLocalStorage(key: string = 'equipment_data', itemDataLoader: any): boolean {
    try {
      const serializedData = localStorage.getItem(key);

      if (!serializedData) {
        console.warn(`[EquipmentManager] No save data found: ${key}`);
        return false;
      }

      const success = this.deserializeEquipmentData(serializedData, itemDataLoader);

      if (success) {
        console.log(`[EquipmentManager] Equipment loaded from localStorage: ${key}`);
      }

      return success;
    } catch (error) {
      this.errorHandler.handleStorageError('load', error as Error);
      console.error('[EquipmentManager] Error loading from localStorage:', error);
      throw new Error('Failed to load from localStorage');
    }
  }

  /**
   * エラーハンドラーを取得
   * 
   * @returns エラーハンドラー
   */
  getErrorHandler(): InventoryErrorHandler {
    return this.errorHandler;
  }

  /**
   * システムをクリアする（テスト用）
   */
  clear(): void {
    this.characterEquipments.clear();
  }

  /**
   * デバッグ情報を取得する
   * 
   * @returns デバッグ情報
   */
  getDebugInfo(): {
    totalCharacters: number;
    charactersWithEquipment: number;
  } {
    let charactersWithEquipment = 0;

    for (const [characterId, data] of this.characterEquipments.entries()) {
      const equipmentSet = data.equipmentSet;
      if (
        equipmentSet.weapon ||
        equipmentSet.armor ||
        equipmentSet.accessory1 ||
        equipmentSet.accessory2
      ) {
        charactersWithEquipment++;
      }
    }

    return {
      totalCharacters: this.characterEquipments.size,
      charactersWithEquipment,
    };
  }
}
