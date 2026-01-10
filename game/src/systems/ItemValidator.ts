/**
 * ItemValidator - アイテムデータのスキーマ検証を担当するクラス
 * 
 * 要件5.2, 5.3に対応:
 * - アイテムデータのスキーマ検証機能
 * - 不正データの検出とエラーハンドリング
 * - デフォルト値の提供機能
 */

import {
  Item,
  ItemDefinition,
  Equipment,
  Consumable,
  ItemType,
  ItemRarity,
  EquipmentSlotType,
  ConsumableType,
  TargetType,
  EffectType,
  EffectTarget,
  ItemEffect,
  EquipmentStats,
  EquipmentRequirements,
  InventoryTypeValidators,
} from '../types/inventory';

/**
 * バリデーションエラー
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code: string;
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  correctedData?: any;
}

/**
 * ItemValidatorクラス
 * アイテムデータのスキーマ検証、エラー検出、デフォルト値提供を行う
 */
export class ItemValidator {
  private static readonly DEFAULT_ITEM: Partial<Item> = {
    maxStack: 1,
    sellPrice: 0,
    buyPrice: 0,
    iconPath: 'assets/items/default-icon.png',
    rarity: ItemRarity.COMMON,
  };

  private static readonly DEFAULT_EQUIPMENT_STATS: EquipmentStats = {
    hp: 0,
    mp: 0,
    attack: 0,
    defense: 0,
    speed: 0,
    accuracy: 0,
    evasion: 0,
  };

  private static readonly DEFAULT_EQUIPMENT_REQUIREMENTS: EquipmentRequirements = {
    level: 1,
  };

  /**
   * アイテムデータを検証
   * 要件5.2対応
   * 
   * @param data - 検証するデータ
   * @returns バリデーション結果
   */
  static validateItem(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 必須フィールドの検証
    if (!data.id || typeof data.id !== 'string' || data.id.trim() === '') {
      errors.push({
        field: 'id',
        message: 'Item ID is required and must be a non-empty string',
        value: data.id,
        code: 'MISSING_ID',
      });
    }

    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Item name is required and must be a non-empty string',
        value: data.name,
        code: 'MISSING_NAME',
      });
    }
    
    // 数値型のフィールドが文字列の場合もエラーとする
    if (data.id !== undefined && typeof data.id === 'number') {
      errors.push({
        field: 'id',
        message: 'Item ID must be a string, not a number',
        value: data.id,
        code: 'INVALID_ID_TYPE',
      });
    }
    
    if (data.name !== undefined && typeof data.name === 'number') {
      errors.push({
        field: 'name',
        message: 'Item name must be a string, not a number',
        value: data.name,
        code: 'INVALID_NAME_TYPE',
      });
    }

    if (!data.description || typeof data.description !== 'string') {
      warnings.push({
        field: 'description',
        message: 'Item description is missing or invalid',
        value: data.description,
        code: 'MISSING_DESCRIPTION',
      });
    }

    // タイプの検証
    if (!Object.values(ItemType).includes(data.type)) {
      errors.push({
        field: 'type',
        message: `Invalid item type. Must be one of: ${Object.values(ItemType).join(', ')}`,
        value: data.type,
        code: 'INVALID_TYPE',
      });
    }

    // レアリティの検証
    if (!Object.values(ItemRarity).includes(data.rarity)) {
      warnings.push({
        field: 'rarity',
        message: `Invalid rarity. Must be one of: ${Object.values(ItemRarity).join(', ')}. Using default: ${ItemRarity.COMMON}`,
        value: data.rarity,
        code: 'INVALID_RARITY',
      });
    }

    // 数値フィールドの検証
    if (typeof data.maxStack !== 'number' || data.maxStack <= 0) {
      warnings.push({
        field: 'maxStack',
        message: 'maxStack must be a positive number. Using default: 1',
        value: data.maxStack,
        code: 'INVALID_MAX_STACK',
      });
    }

    if (typeof data.sellPrice !== 'number' || data.sellPrice < 0) {
      warnings.push({
        field: 'sellPrice',
        message: 'sellPrice must be a non-negative number. Using default: 0',
        value: data.sellPrice,
        code: 'INVALID_SELL_PRICE',
      });
    }

    if (typeof data.buyPrice !== 'number' || data.buyPrice < 0) {
      warnings.push({
        field: 'buyPrice',
        message: 'buyPrice must be a non-negative number. Using default: 0',
        value: data.buyPrice,
        code: 'INVALID_BUY_PRICE',
      });
    }

    // アイコンパスの検証
    if (!data.iconPath || typeof data.iconPath !== 'string') {
      warnings.push({
        field: 'iconPath',
        message: 'iconPath is missing or invalid. Using default icon',
        value: data.iconPath,
        code: 'MISSING_ICON_PATH',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 装備データを検証
   * 要件5.2対応
   * 
   * @param data - 検証するデータ
   * @returns バリデーション結果
   */
  static validateEquipment(data: any): ValidationResult {
    const baseResult = this.validateItem(data);
    const errors = [...baseResult.errors];
    const warnings = [...baseResult.warnings];

    // 装備スロットの検証
    if (!Object.values(EquipmentSlotType).includes(data.slot)) {
      errors.push({
        field: 'slot',
        message: `Invalid equipment slot. Must be one of: ${Object.values(EquipmentSlotType).join(', ')}`,
        value: data.slot,
        code: 'INVALID_SLOT',
      });
    }

    // 能力値の検証
    if (!data.stats || typeof data.stats !== 'object') {
      warnings.push({
        field: 'stats',
        message: 'Equipment stats are missing or invalid. Using default stats',
        value: data.stats,
        code: 'MISSING_STATS',
      });
    } else {
      const statsResult = this.validateEquipmentStats(data.stats);
      warnings.push(...statsResult.warnings);
      errors.push(...statsResult.errors);
    }

    // 装備条件の検証
    if (!data.requirements || typeof data.requirements !== 'object') {
      warnings.push({
        field: 'requirements',
        message: 'Equipment requirements are missing or invalid. Using default requirements',
        value: data.requirements,
        code: 'MISSING_REQUIREMENTS',
      });
    } else {
      const reqResult = this.validateEquipmentRequirements(data.requirements);
      warnings.push(...reqResult.warnings);
      errors.push(...reqResult.errors);
    }

    // 耐久度の検証
    if (typeof data.durability !== 'number' || data.durability < 0) {
      warnings.push({
        field: 'durability',
        message: 'durability must be a non-negative number. Using maxDurability',
        value: data.durability,
        code: 'INVALID_DURABILITY',
      });
    }

    if (typeof data.maxDurability !== 'number' || data.maxDurability <= 0) {
      errors.push({
        field: 'maxDurability',
        message: 'maxDurability must be a positive number',
        value: data.maxDurability,
        code: 'INVALID_MAX_DURABILITY',
      });
    }

    if (
      typeof data.durability === 'number' &&
      typeof data.maxDurability === 'number' &&
      data.durability > data.maxDurability
    ) {
      warnings.push({
        field: 'durability',
        message: 'durability cannot exceed maxDurability. Setting to maxDurability',
        value: data.durability,
        code: 'DURABILITY_EXCEEDS_MAX',
      });
    }

    // 効果の検証
    if (!Array.isArray(data.effects)) {
      warnings.push({
        field: 'effects',
        message: 'effects must be an array. Using empty array',
        value: data.effects,
        code: 'INVALID_EFFECTS',
      });
    } else {
      for (let i = 0; i < data.effects.length; i++) {
        const effectResult = this.validateItemEffect(data.effects[i]);
        errors.push(
          ...effectResult.errors.map(e => ({
            ...e,
            field: `effects[${i}].${e.field}`,
          }))
        );
        warnings.push(
          ...effectResult.warnings.map(w => ({
            ...w,
            field: `effects[${i}].${w.field}`,
          }))
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 消耗品データを検証
   * 要件5.2対応
   * 
   * @param data - 検証するデータ
   * @returns バリデーション結果
   */
  static validateConsumable(data: any): ValidationResult {
    const baseResult = this.validateItem(data);
    const errors = [...baseResult.errors];
    const warnings = [...baseResult.warnings];

    // 消耗品タイプの検証
    if (!Object.values(ConsumableType).includes(data.consumableType)) {
      errors.push({
        field: 'consumableType',
        message: `Invalid consumable type. Must be one of: ${Object.values(ConsumableType).join(', ')}`,
        value: data.consumableType,
        code: 'INVALID_CONSUMABLE_TYPE',
      });
    }

    // 対象タイプの検証
    if (!Object.values(TargetType).includes(data.targetType)) {
      errors.push({
        field: 'targetType',
        message: `Invalid target type. Must be one of: ${Object.values(TargetType).join(', ')}`,
        value: data.targetType,
        code: 'INVALID_TARGET_TYPE',
      });
    }

    // 戦闘中使用可能フラグの検証
    if (data.usableInBattle !== undefined && typeof data.usableInBattle !== 'boolean') {
      warnings.push({
        field: 'usableInBattle',
        message: 'usableInBattle must be a boolean. Using default: true',
        value: data.usableInBattle,
        code: 'INVALID_USABLE_IN_BATTLE',
      });
    }

    // 効果の検証
    if (!Array.isArray(data.effects)) {
      errors.push({
        field: 'effects',
        message: 'effects must be an array',
        value: data.effects,
        code: 'INVALID_EFFECTS',
      });
    } else if (data.effects.length === 0) {
      warnings.push({
        field: 'effects',
        message: 'Consumable has no effects',
        value: data.effects,
        code: 'NO_EFFECTS',
      });
    } else {
      for (let i = 0; i < data.effects.length; i++) {
        const effectResult = this.validateItemEffect(data.effects[i]);
        errors.push(
          ...effectResult.errors.map(e => ({
            ...e,
            field: `effects[${i}].${e.field}`,
          }))
        );
        warnings.push(
          ...effectResult.warnings.map(w => ({
            ...w,
            field: `effects[${i}].${w.field}`,
          }))
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * アイテム効果を検証
   * 
   * @param data - 検証するデータ
   * @returns バリデーション結果
   */
  static validateItemEffect(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!data.id || typeof data.id !== 'string') {
      errors.push({
        field: 'id',
        message: 'Effect ID is required and must be a string',
        value: data.id,
        code: 'MISSING_EFFECT_ID',
      });
    }

    if (!Object.values(EffectType).includes(data.type)) {
      errors.push({
        field: 'type',
        message: `Invalid effect type. Must be one of: ${Object.values(EffectType).join(', ')}`,
        value: data.type,
        code: 'INVALID_EFFECT_TYPE',
      });
    }

    if (!Object.values(EffectTarget).includes(data.target)) {
      errors.push({
        field: 'target',
        message: `Invalid effect target. Must be one of: ${Object.values(EffectTarget).join(', ')}`,
        value: data.target,
        code: 'INVALID_EFFECT_TARGET',
      });
    }

    if (typeof data.value !== 'number') {
      errors.push({
        field: 'value',
        message: 'Effect value must be a number',
        value: data.value,
        code: 'INVALID_EFFECT_VALUE',
      });
    }

    if (typeof data.duration !== 'number' || data.duration < 0) {
      warnings.push({
        field: 'duration',
        message: 'duration must be a non-negative number. Using default: 0',
        value: data.duration,
        code: 'INVALID_DURATION',
      });
    }

    if (typeof data.isPermanent !== 'boolean') {
      warnings.push({
        field: 'isPermanent',
        message: 'isPermanent must be a boolean. Using default: false',
        value: data.isPermanent,
        code: 'INVALID_IS_PERMANENT',
      });
    }

    if (typeof data.stackable !== 'boolean') {
      warnings.push({
        field: 'stackable',
        message: 'stackable must be a boolean. Using default: false',
        value: data.stackable,
        code: 'INVALID_STACKABLE',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 装備能力値を検証
   * 
   * @param data - 検証するデータ
   * @returns バリデーション結果
   */
  static validateEquipmentStats(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    const statFields = ['hp', 'mp', 'attack', 'defense', 'speed', 'accuracy', 'evasion'];

    for (const field of statFields) {
      if (data[field] !== undefined && typeof data[field] !== 'number') {
        warnings.push({
          field,
          message: `${field} must be a number if provided. Using default: 0`,
          value: data[field],
          code: 'INVALID_STAT_VALUE',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 装備条件を検証
   * 
   * @param data - 検証するデータ
   * @returns バリデーション結果
   */
  static validateEquipmentRequirements(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (data.level !== undefined) {
      if (typeof data.level !== 'number' || data.level <= 0) {
        warnings.push({
          field: 'level',
          message: 'level must be a positive number if provided. Using default: 1',
          value: data.level,
          code: 'INVALID_LEVEL_REQUIREMENT',
        });
      }
    }

    if (data.job !== undefined && typeof data.job !== 'string') {
      warnings.push({
        field: 'job',
        message: 'job must be a string if provided',
        value: data.job,
        code: 'INVALID_JOB_REQUIREMENT',
      });
    }

    if (data.stats !== undefined) {
      const statsResult = this.validateEquipmentStats(data.stats);
      warnings.push(...statsResult.warnings);
      errors.push(...statsResult.errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * データを修正してデフォルト値を適用
   * 要件5.3対応
   * 
   * @param data - 修正するデータ
   * @param validationResult - バリデーション結果
   * @returns 修正されたデータ
   */
  static applyDefaults(data: any, validationResult: ValidationResult): any {
    const corrected = { ...data };

    // 基本アイテムのデフォルト値を適用
    if (!corrected.maxStack || typeof corrected.maxStack !== 'number' || corrected.maxStack <= 0) {
      corrected.maxStack = this.DEFAULT_ITEM.maxStack;
    }

    if (!corrected.sellPrice || typeof corrected.sellPrice !== 'number' || corrected.sellPrice < 0) {
      corrected.sellPrice = this.DEFAULT_ITEM.sellPrice;
    }

    if (!corrected.buyPrice || typeof corrected.buyPrice !== 'number' || corrected.buyPrice < 0) {
      corrected.buyPrice = this.DEFAULT_ITEM.buyPrice;
    }

    if (!corrected.iconPath || typeof corrected.iconPath !== 'string') {
      corrected.iconPath = this.DEFAULT_ITEM.iconPath;
    }

    if (!Object.values(ItemRarity).includes(corrected.rarity)) {
      corrected.rarity = this.DEFAULT_ITEM.rarity;
    }

    if (!corrected.description || typeof corrected.description !== 'string') {
      corrected.description = `${corrected.name || 'Unknown Item'}`;
    }

    // 装備固有のデフォルト値
    if (
      corrected.type === ItemType.WEAPON ||
      corrected.type === ItemType.ARMOR ||
      corrected.type === ItemType.ACCESSORY
    ) {
      if (!corrected.stats || typeof corrected.stats !== 'object') {
        corrected.stats = { ...this.DEFAULT_EQUIPMENT_STATS };
      }

      if (!corrected.requirements || typeof corrected.requirements !== 'object') {
        corrected.requirements = { ...this.DEFAULT_EQUIPMENT_REQUIREMENTS };
      }

      if (typeof corrected.maxDurability !== 'number' || corrected.maxDurability <= 0) {
        corrected.maxDurability = 100;
      }

      if (typeof corrected.durability !== 'number' || corrected.durability < 0) {
        corrected.durability = corrected.maxDurability;
      }

      if (corrected.durability > corrected.maxDurability) {
        corrected.durability = corrected.maxDurability;
      }

      if (!Array.isArray(corrected.effects)) {
        corrected.effects = [];
      }
    }

    // 消耗品固有のデフォルト値
    if (corrected.type === ItemType.CONSUMABLE) {
      if (typeof corrected.usableInBattle !== 'boolean') {
        corrected.usableInBattle = true;
      }

      if (!Array.isArray(corrected.effects)) {
        corrected.effects = [];
      }
    }

    return corrected;
  }

  /**
   * バリデーション結果をログ出力
   * 要件5.3対応
   * 
   * @param itemId - アイテムID
   * @param result - バリデーション結果
   */
  static logValidationResult(itemId: string, result: ValidationResult): void {
    if (result.errors.length > 0) {
      console.error(`[ItemValidator] Validation errors for item ${itemId}:`);
      result.errors.forEach(error => {
        console.error(`  - ${error.field}: ${error.message} (code: ${error.code})`);
      });
    }

    if (result.warnings.length > 0) {
      console.warn(`[ItemValidator] Validation warnings for item ${itemId}:`);
      result.warnings.forEach(warning => {
        console.warn(`  - ${warning.field}: ${warning.message} (code: ${warning.code})`);
      });
    }

    if (result.isValid && result.warnings.length === 0) {
      console.log(`[ItemValidator] Item ${itemId} validated successfully`);
    }
  }

  /**
   * バッチバリデーション
   * 
   * @param items - 検証するアイテムの配列
   * @returns バリデーション結果のマップ
   */
  static validateBatch(items: any[]): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>();
    const unknownIdCounter = { count: 0 };

    for (const item of items) {
      // IDが無効な場合は一意なIDを生成
      let itemId: string;
      if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
        unknownIdCounter.count++;
        itemId = `unknown-${unknownIdCounter.count}`;
      } else {
        itemId = item.id;
      }

      let result: ValidationResult;

      if (
        item.type === ItemType.WEAPON ||
        item.type === ItemType.ARMOR ||
        item.type === ItemType.ACCESSORY
      ) {
        result = this.validateEquipment(item);
      } else if (item.type === ItemType.CONSUMABLE) {
        result = this.validateConsumable(item);
      } else {
        result = this.validateItem(item);
      }

      results.set(itemId, result);
    }

    return results;
  }
}
