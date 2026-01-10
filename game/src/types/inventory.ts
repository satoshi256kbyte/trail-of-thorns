/**
 * Inventory and Equipment system type definitions for the SRPG
 * Contains all interfaces, enums, and types related to item management and equipment
 */

/**
 * Item types defining different categories of items
 */
export enum ItemType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  ACCESSORY = 'accessory',
  CONSUMABLE = 'consumable',
  MATERIAL = 'material',
  KEY = 'key',
}

/**
 * Item rarity levels
 */
export enum ItemRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

/**
 * Equipment slot types
 */
export enum EquipmentSlotType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  ACCESSORY1 = 'accessory1',
  ACCESSORY2 = 'accessory2',
}

/**
 * Consumable item types
 */
export enum ConsumableType {
  HEALING = 'healing',
  BUFF = 'buff',
  DEBUFF = 'debuff',
  CURE = 'cure',
  REVIVE = 'revive',
}

/**
 * Target types for item effects
 */
export enum TargetType {
  SELF = 'self',
  SINGLE = 'single',
  ALL = 'all',
  AREA = 'area',
}

/**
 * Effect types for items
 */
export enum EffectType {
  STAT_BOOST = 'stat_boost',
  STAT_REDUCTION = 'stat_reduction',
  HP_RECOVERY = 'hp_recovery',
  MP_RECOVERY = 'mp_recovery',
  STATUS_CURE = 'status_cure',
  STATUS_INFLICT = 'status_inflict',
  DAMAGE = 'damage',
  SHIELD = 'shield',
}

/**
 * Effect target stats
 */
export enum EffectTarget {
  HP = 'hp',
  MP = 'mp',
  ATTACK = 'attack',
  DEFENSE = 'defense',
  SPEED = 'speed',
  ACCURACY = 'accuracy',
  EVASION = 'evasion',
  STATUS = 'status',
}

/**
 * Item sort types
 */
export enum ItemSortType {
  TYPE = 'type',
  RARITY = 'rarity',
  NAME = 'name',
  QUANTITY = 'quantity',
}

/**
 * Base item interface
 */
export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  iconPath: string;
  maxStack: number;
  sellPrice: number;
  buyPrice: number;
}

/**
 * Equipment statistics bonuses
 */
export interface EquipmentStats {
  hp?: number;
  mp?: number;
  attack?: number;
  defense?: number;
  speed?: number;
  accuracy?: number;
  evasion?: number;
}

/**
 * Equipment requirements
 */
export interface EquipmentRequirements {
  level?: number;
  job?: string;
  stats?: Partial<EquipmentStats>;
}

/**
 * Item effect interface
 */
export interface ItemEffect {
  id: string;
  type: EffectType;
  target: EffectTarget;
  value: number;
  duration: number; // 0 = permanent
  isPermanent: boolean;
  stackable: boolean;
}

/**
 * Equipment item interface
 */
export interface Equipment extends Item {
  type: ItemType.WEAPON | ItemType.ARMOR | ItemType.ACCESSORY;
  slot: EquipmentSlotType;
  stats: EquipmentStats;
  requirements: EquipmentRequirements;
  durability: number;
  maxDurability: number;
  effects: ItemEffect[];
}

/**
 * Consumable item interface
 */
export interface Consumable extends Item {
  type: ItemType.CONSUMABLE;
  consumableType: ConsumableType;
  effects: ItemEffect[];
  usableInBattle: boolean;
  targetType: TargetType;
}

/**
 * Inventory slot interface
 */
export interface InventorySlot {
  slotIndex: number;
  item: Item | null;
  quantity: number;
  isEmpty: boolean;
}

/**
 * Equipment set for a character
 */
export interface EquipmentSet {
  weapon: Equipment | null;
  armor: Equipment | null;
  accessory1: Equipment | null;
  accessory2: Equipment | null;
}

/**
 * Inventory data structure
 */
export interface InventoryData {
  slots: InventorySlot[];
  maxSlots: number;
  usedSlots: number;
  gold: number;
}

/**
 * Item definition for data loading
 */
export interface ItemDefinition {
  id: string;
  baseItem: Item;
  equipmentData?: Equipment;
  consumableData?: Consumable;
  dropRate?: number;
  obtainableFrom?: string[];
}

/**
 * Equipment check result
 */
export interface EquipmentCheckResult {
  canEquip: boolean;
  failureReasons: string[];
  missingRequirements: {
    level?: number;
    job?: string;
    stats?: Partial<EquipmentStats>;
  };
}

/**
 * Item use result
 */
export interface ItemUseResult {
  success: boolean;
  effectsApplied: ItemEffect[];
  itemConsumed: boolean;
  remainingQuantity: number;
  message: string;
}

/**
 * Inventory operation result
 */
export interface InventoryOperationResult {
  success: boolean;
  message: string;
  affectedSlots: number[];
  newQuantity?: number;
}

/**
 * Equipment operation result
 */
export interface EquipmentOperationResult {
  success: boolean;
  message: string;
  previousEquipment: Equipment | null;
  newEquipment: Equipment | null;
  statsChanged: EquipmentStats;
}

/**
 * Type guards and validation functions for inventory system
 */
export class InventoryTypeValidators {
  /**
   * Validates item structure
   */
  static isValidItem(item: any): item is Item {
    return (
      typeof item === 'object' &&
      item !== null &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.description === 'string' &&
      Object.values(ItemType).includes(item.type) &&
      Object.values(ItemRarity).includes(item.rarity) &&
      typeof item.iconPath === 'string' &&
      typeof item.maxStack === 'number' &&
      typeof item.sellPrice === 'number' &&
      typeof item.buyPrice === 'number' &&
      item.maxStack > 0 &&
      item.sellPrice >= 0 &&
      item.buyPrice >= 0
    );
  }

  /**
   * Validates equipment structure
   */
  static isValidEquipment(equipment: any): equipment is Equipment {
    return (
      this.isValidItem(equipment) &&
      [ItemType.WEAPON, ItemType.ARMOR, ItemType.ACCESSORY].includes(equipment.type) &&
      Object.values(EquipmentSlotType).includes(equipment.slot) &&
      typeof equipment.stats === 'object' &&
      typeof equipment.requirements === 'object' &&
      typeof equipment.durability === 'number' &&
      typeof equipment.maxDurability === 'number' &&
      Array.isArray(equipment.effects) &&
      equipment.durability >= 0 &&
      equipment.durability <= equipment.maxDurability &&
      equipment.maxDurability > 0 &&
      equipment.effects.every((effect: any) => this.isValidItemEffect(effect))
    );
  }

  /**
   * Validates consumable structure
   */
  static isValidConsumable(consumable: any): consumable is Consumable {
    return (
      this.isValidItem(consumable) &&
      consumable.type === ItemType.CONSUMABLE &&
      Object.values(ConsumableType).includes(consumable.consumableType) &&
      Array.isArray(consumable.effects) &&
      typeof consumable.usableInBattle === 'boolean' &&
      Object.values(TargetType).includes(consumable.targetType) &&
      consumable.effects.every((effect: any) => this.isValidItemEffect(effect))
    );
  }

  /**
   * Validates item effect structure
   */
  static isValidItemEffect(effect: any): effect is ItemEffect {
    return (
      typeof effect === 'object' &&
      effect !== null &&
      typeof effect.id === 'string' &&
      Object.values(EffectType).includes(effect.type) &&
      Object.values(EffectTarget).includes(effect.target) &&
      typeof effect.value === 'number' &&
      typeof effect.duration === 'number' &&
      typeof effect.isPermanent === 'boolean' &&
      typeof effect.stackable === 'boolean' &&
      effect.duration >= 0
    );
  }

  /**
   * Validates inventory slot structure
   */
  static isValidInventorySlot(slot: any): slot is InventorySlot {
    return (
      typeof slot === 'object' &&
      slot !== null &&
      typeof slot.slotIndex === 'number' &&
      (slot.item === null || this.isValidItem(slot.item)) &&
      typeof slot.quantity === 'number' &&
      typeof slot.isEmpty === 'boolean' &&
      slot.slotIndex >= 0 &&
      slot.quantity >= 0 &&
      (slot.isEmpty === (slot.item === null))
    );
  }

  /**
   * Validates equipment set structure
   */
  static isValidEquipmentSet(equipmentSet: any): equipmentSet is EquipmentSet {
    return (
      typeof equipmentSet === 'object' &&
      equipmentSet !== null &&
      (equipmentSet.weapon === null || this.isValidEquipment(equipmentSet.weapon)) &&
      (equipmentSet.armor === null || this.isValidEquipment(equipmentSet.armor)) &&
      (equipmentSet.accessory1 === null || this.isValidEquipment(equipmentSet.accessory1)) &&
      (equipmentSet.accessory2 === null || this.isValidEquipment(equipmentSet.accessory2))
    );
  }

  /**
   * Validates inventory data structure
   */
  static isValidInventoryData(data: any): data is InventoryData {
    return (
      typeof data === 'object' &&
      data !== null &&
      Array.isArray(data.slots) &&
      typeof data.maxSlots === 'number' &&
      typeof data.usedSlots === 'number' &&
      typeof data.gold === 'number' &&
      data.maxSlots > 0 &&
      data.usedSlots >= 0 &&
      data.usedSlots <= data.maxSlots &&
      data.gold >= 0 &&
      data.slots.length === data.maxSlots &&
      data.slots.every((slot: any) => this.isValidInventorySlot(slot))
    );
  }

  /**
   * Validates equipment stats structure
   */
  static isValidEquipmentStats(stats: any): stats is EquipmentStats {
    return (
      typeof stats === 'object' &&
      stats !== null &&
      (stats.hp === undefined || typeof stats.hp === 'number') &&
      (stats.mp === undefined || typeof stats.mp === 'number') &&
      (stats.attack === undefined || typeof stats.attack === 'number') &&
      (stats.defense === undefined || typeof stats.defense === 'number') &&
      (stats.speed === undefined || typeof stats.speed === 'number') &&
      (stats.accuracy === undefined || typeof stats.accuracy === 'number') &&
      (stats.evasion === undefined || typeof stats.evasion === 'number')
    );
  }

  /**
   * Validates equipment requirements structure
   */
  static isValidEquipmentRequirements(requirements: any): requirements is EquipmentRequirements {
    return (
      typeof requirements === 'object' &&
      requirements !== null &&
      (requirements.level === undefined || typeof requirements.level === 'number') &&
      (requirements.job === undefined || typeof requirements.job === 'string') &&
      (requirements.stats === undefined || this.isValidEquipmentStats(requirements.stats)) &&
      (requirements.level === undefined || requirements.level > 0)
    );
  }
}

/**
 * Utility functions for inventory calculations
 */
export class InventoryUtils {
  /**
   * Calculate total stats from equipment set
   */
  static calculateTotalStats(equipmentSet: EquipmentSet): EquipmentStats {
    const totalStats: EquipmentStats = {
      hp: 0,
      mp: 0,
      attack: 0,
      defense: 0,
      speed: 0,
      accuracy: 0,
      evasion: 0,
    };

    const equipments = [
      equipmentSet.weapon,
      equipmentSet.armor,
      equipmentSet.accessory1,
      equipmentSet.accessory2,
    ];

    for (const equipment of equipments) {
      if (equipment) {
        totalStats.hp = (totalStats.hp || 0) + (equipment.stats.hp || 0);
        totalStats.mp = (totalStats.mp || 0) + (equipment.stats.mp || 0);
        totalStats.attack = (totalStats.attack || 0) + (equipment.stats.attack || 0);
        totalStats.defense = (totalStats.defense || 0) + (equipment.stats.defense || 0);
        totalStats.speed = (totalStats.speed || 0) + (equipment.stats.speed || 0);
        totalStats.accuracy = (totalStats.accuracy || 0) + (equipment.stats.accuracy || 0);
        totalStats.evasion = (totalStats.evasion || 0) + (equipment.stats.evasion || 0);
      }
    }

    return totalStats;
  }

  /**
   * Calculate stat difference between two equipment sets
   */
  static calculateStatDifference(
    currentSet: EquipmentSet,
    newSet: EquipmentSet
  ): EquipmentStats {
    const currentStats = this.calculateTotalStats(currentSet);
    const newStats = this.calculateTotalStats(newSet);

    return {
      hp: (newStats.hp || 0) - (currentStats.hp || 0),
      mp: (newStats.mp || 0) - (currentStats.mp || 0),
      attack: (newStats.attack || 0) - (currentStats.attack || 0),
      defense: (newStats.defense || 0) - (currentStats.defense || 0),
      speed: (newStats.speed || 0) - (currentStats.speed || 0),
      accuracy: (newStats.accuracy || 0) - (currentStats.accuracy || 0),
      evasion: (newStats.evasion || 0) - (currentStats.evasion || 0),
    };
  }

  /**
   * Check if inventory has space for item
   */
  static hasSpaceForItem(inventory: InventoryData, item: Item, quantity: number): boolean {
    // Check if item can stack with existing items
    const existingSlot = inventory.slots.find(
      slot => slot.item?.id === item.id && slot.quantity < item.maxStack
    );

    if (existingSlot) {
      const availableSpace = item.maxStack - existingSlot.quantity;
      if (availableSpace >= quantity) {
        return true;
      }
      quantity -= availableSpace;
    }

    // Check for empty slots
    const emptySlots = inventory.slots.filter(slot => slot.isEmpty).length;
    const slotsNeeded = Math.ceil(quantity / item.maxStack);

    return emptySlots >= slotsNeeded;
  }

  /**
   * Get item rarity color
   */
  static getRarityColor(rarity: ItemRarity): string {
    const colors: Record<ItemRarity, string> = {
      [ItemRarity.COMMON]: '#FFFFFF',
      [ItemRarity.UNCOMMON]: '#1EFF00',
      [ItemRarity.RARE]: '#0070DD',
      [ItemRarity.EPIC]: '#A335EE',
      [ItemRarity.LEGENDARY]: '#FF8000',
    };

    return colors[rarity];
  }

  /**
   * Create empty inventory slot
   */
  static createEmptySlot(index: number): InventorySlot {
    return {
      slotIndex: index,
      item: null,
      quantity: 0,
      isEmpty: true,
    };
  }

  /**
   * Create empty equipment set
   */
  static createEmptyEquipmentSet(): EquipmentSet {
    return {
      weapon: null,
      armor: null,
      accessory1: null,
      accessory2: null,
    };
  }

  /**
   * Clone equipment set
   */
  static cloneEquipmentSet(equipmentSet: EquipmentSet): EquipmentSet {
    return {
      weapon: equipmentSet.weapon ? { ...equipmentSet.weapon } : null,
      armor: equipmentSet.armor ? { ...equipmentSet.armor } : null,
      accessory1: equipmentSet.accessory1 ? { ...equipmentSet.accessory1 } : null,
      accessory2: equipmentSet.accessory2 ? { ...equipmentSet.accessory2 } : null,
    };
  }
}
