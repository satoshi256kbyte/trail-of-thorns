/**
 * WeaponDataLoader - Handles loading and validation of weapon and equipment data
 * Provides centralized access to weapon/equipment data with validation and caching
 */

import { Weapon, WeaponType, Element, WeaponEffect, RangePattern, BattleTypeValidators } from '../types/battle';
import { Equipment } from '../types/gameplay';

/**
 * Raw weapon data structure from JSON
 */
interface RawWeaponData {
    id: string;
    name: string;
    type: string;
    attackPower: number;
    range: number;
    rangePattern: any;
    element: string;
    criticalRate: number;
    accuracy: number;
    specialEffects: any[];
    durability?: number;
    maxDurability?: number;
    description: string;
}

/**
 * Raw equipment data structure from JSON
 */
interface RawEquipmentData {
    id: string;
    name: string;
    type: string;
    attackBonus?: number;
    defenseBonus?: number;
    speedBonus?: number;
    movementBonus?: number;
    element: string;
    specialEffects: any[];
    durability: number;
    maxDurability: number;
    description: string;
}

/**
 * Weapon and equipment data container
 */
export interface WeaponEquipmentData {
    weapons: Weapon[];
    armor: Equipment[];
    accessories: Equipment[];
}

/**
 * Data loading result
 */
export interface DataLoadResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    validationErrors?: string[];
}

/**
 * WeaponDataLoader class for managing weapon and equipment data
 */
export class WeaponDataLoader {
    private static instance: WeaponDataLoader;
    private weaponCache: Map<string, Weapon> = new Map();
    private equipmentCache: Map<string, Equipment> = new Map();
    private dataLoaded: boolean = false;

    /**
     * Get singleton instance
     */
    public static getInstance(): WeaponDataLoader {
        if (!WeaponDataLoader.instance) {
            WeaponDataLoader.instance = new WeaponDataLoader();
        }
        return WeaponDataLoader.instance;
    }

    /**
     * Load all weapon and equipment data
     * @returns Promise with loading result
     */
    public async loadAllData(): Promise<DataLoadResult<WeaponEquipmentData>> {
        try {
            // Load weapon data
            const weaponResult = await this.loadWeaponData();
            if (!weaponResult.success) {
                return {
                    success: false,
                    error: `Failed to load weapon data: ${weaponResult.error}`,
                    validationErrors: weaponResult.validationErrors,
                };
            }

            // Load equipment data
            const equipmentResult = await this.loadEquipmentData();
            if (!equipmentResult.success) {
                return {
                    success: false,
                    error: `Failed to load equipment data: ${equipmentResult.error}`,
                    validationErrors: equipmentResult.validationErrors,
                };
            }

            this.dataLoaded = true;

            return {
                success: true,
                data: {
                    weapons: weaponResult.data!,
                    armor: equipmentResult.data!.armor,
                    accessories: equipmentResult.data!.accessories,
                },
            };
        } catch (error) {
            return {
                success: false,
                error: `Unexpected error loading data: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }

    /**
     * Load weapon data from JSON file
     * @returns Promise with weapon loading result
     */
    public async loadWeaponData(): Promise<DataLoadResult<Weapon[]>> {
        try {
            const response = await fetch('/data/weapons.json');
            if (!response.ok) {
                return {
                    success: false,
                    error: `Failed to fetch weapons.json: ${response.status} ${response.statusText}`,
                };
            }

            const rawData = await response.json();

            if (!rawData.weapons || !Array.isArray(rawData.weapons)) {
                return {
                    success: false,
                    error: 'Invalid weapon data format: missing or invalid weapons array',
                };
            }

            const validationErrors: string[] = [];
            const weapons: Weapon[] = [];

            // Process and validate each weapon
            for (const rawWeapon of rawData.weapons) {
                const validationResult = this.validateAndConvertWeapon(rawWeapon);

                if (validationResult.success && validationResult.data) {
                    weapons.push(validationResult.data);
                    // Cache the weapon
                    this.weaponCache.set(validationResult.data.id, validationResult.data);
                } else {
                    validationErrors.push(`Weapon ${rawWeapon.id || 'unknown'}: ${validationResult.error}`);
                }
            }

            if (validationErrors.length > 0 && weapons.length === 0) {
                return {
                    success: false,
                    error: 'No valid weapons found',
                    validationErrors,
                };
            }

            return {
                success: true,
                data: weapons,
                validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
            };
        } catch (error) {
            return {
                success: false,
                error: `Error loading weapon data: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }

    /**
     * Load equipment data from JSON file
     * @returns Promise with equipment loading result
     */
    public async loadEquipmentData(): Promise<DataLoadResult<{ armor: Equipment[]; accessories: Equipment[] }>> {
        try {
            const response = await fetch('/data/equipment.json');
            if (!response.ok) {
                return {
                    success: false,
                    error: `Failed to fetch equipment.json: ${response.status} ${response.statusText}`,
                };
            }

            const rawData = await response.json();

            if (!rawData.armor || !Array.isArray(rawData.armor) ||
                !rawData.accessories || !Array.isArray(rawData.accessories)) {
                return {
                    success: false,
                    error: 'Invalid equipment data format: missing or invalid armor/accessories arrays',
                };
            }

            const validationErrors: string[] = [];
            const armor: Equipment[] = [];
            const accessories: Equipment[] = [];

            // Process armor
            for (const rawArmor of rawData.armor) {
                const validationResult = this.validateAndConvertEquipment(rawArmor);

                if (validationResult.success && validationResult.data) {
                    armor.push(validationResult.data);
                    this.equipmentCache.set(validationResult.data.id, validationResult.data);
                } else {
                    validationErrors.push(`Armor ${rawArmor.id || 'unknown'}: ${validationResult.error}`);
                }
            }

            // Process accessories
            for (const rawAccessory of rawData.accessories) {
                const validationResult = this.validateAndConvertEquipment(rawAccessory);

                if (validationResult.success && validationResult.data) {
                    accessories.push(validationResult.data);
                    this.equipmentCache.set(validationResult.data.id, validationResult.data);
                } else {
                    validationErrors.push(`Accessory ${rawAccessory.id || 'unknown'}: ${validationResult.error}`);
                }
            }

            return {
                success: true,
                data: { armor, accessories },
                validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
            };
        } catch (error) {
            return {
                success: false,
                error: `Error loading equipment data: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }

    /**
     * Get weapon by ID
     * @param weaponId - ID of the weapon to retrieve
     * @returns Weapon object or undefined if not found
     */
    public getWeapon(weaponId: string): Weapon | undefined {
        return this.weaponCache.get(weaponId);
    }

    /**
     * Get equipment by ID
     * @param equipmentId - ID of the equipment to retrieve
     * @returns Equipment object or undefined if not found
     */
    public getEquipment(equipmentId: string): Equipment | undefined {
        return this.equipmentCache.get(equipmentId);
    }

    /**
     * Get all weapons
     * @returns Array of all loaded weapons
     */
    public getAllWeapons(): Weapon[] {
        return Array.from(this.weaponCache.values());
    }

    /**
     * Get all equipment
     * @returns Array of all loaded equipment
     */
    public getAllEquipment(): Equipment[] {
        return Array.from(this.equipmentCache.values());
    }

    /**
     * Get weapons by type
     * @param weaponType - Type of weapons to retrieve
     * @returns Array of weapons of the specified type
     */
    public getWeaponsByType(weaponType: WeaponType): Weapon[] {
        return this.getAllWeapons().filter(weapon => weapon.type === weaponType);
    }

    /**
     * Check if data has been loaded
     * @returns True if data has been loaded
     */
    public isDataLoaded(): boolean {
        return this.dataLoaded;
    }

    /**
     * Clear all cached data
     */
    public clearCache(): void {
        this.weaponCache.clear();
        this.equipmentCache.clear();
        this.dataLoaded = false;
    }

    /**
     * Validate and convert raw weapon data to Weapon interface
     * @param rawWeapon - Raw weapon data from JSON
     * @returns Validation result with converted weapon
     */
    private validateAndConvertWeapon(rawWeapon: RawWeaponData): DataLoadResult<Weapon> {
        try {
            // Validate required fields
            if (!rawWeapon.id || typeof rawWeapon.id !== 'string') {
                return { success: false, error: 'Missing or invalid weapon ID' };
            }

            if (!rawWeapon.name || typeof rawWeapon.name !== 'string') {
                return { success: false, error: 'Missing or invalid weapon name' };
            }

            // Validate weapon type
            if (!Object.values(WeaponType).includes(rawWeapon.type as WeaponType)) {
                return { success: false, error: `Invalid weapon type: ${rawWeapon.type}` };
            }

            // Validate element
            if (!Object.values(Element).includes(rawWeapon.element as Element)) {
                return { success: false, error: `Invalid element: ${rawWeapon.element}` };
            }

            // Validate numeric fields
            if (typeof rawWeapon.attackPower !== 'number' || rawWeapon.attackPower < 0) {
                return { success: false, error: 'Invalid attack power' };
            }

            if (typeof rawWeapon.range !== 'number' || rawWeapon.range <= 0) {
                return { success: false, error: 'Invalid range' };
            }

            if (typeof rawWeapon.criticalRate !== 'number' || rawWeapon.criticalRate < 0 || rawWeapon.criticalRate > 100) {
                return { success: false, error: 'Invalid critical rate (must be 0-100)' };
            }

            if (typeof rawWeapon.accuracy !== 'number' || rawWeapon.accuracy < 0 || rawWeapon.accuracy > 100) {
                return { success: false, error: 'Invalid accuracy (must be 0-100)' };
            }

            // Validate range pattern
            const rangePatternResult = this.validateRangePattern(rawWeapon.rangePattern);
            if (!rangePatternResult.success) {
                return { success: false, error: `Invalid range pattern: ${rangePatternResult.error}` };
            }

            // Validate special effects
            const effectsResult = this.validateWeaponEffects(rawWeapon.specialEffects);
            if (!effectsResult.success) {
                return { success: false, error: `Invalid special effects: ${effectsResult.error}` };
            }

            // Create weapon object
            const weapon: Weapon = {
                id: rawWeapon.id,
                name: rawWeapon.name,
                type: rawWeapon.type as WeaponType,
                attackPower: rawWeapon.attackPower,
                range: rawWeapon.range,
                rangePattern: rangePatternResult.data!,
                element: rawWeapon.element as Element,
                criticalRate: rawWeapon.criticalRate,
                accuracy: rawWeapon.accuracy,
                specialEffects: effectsResult.data!,
                durability: rawWeapon.durability,
                maxDurability: rawWeapon.maxDurability,
                description: rawWeapon.description || '',
            };

            // Final validation using type validators
            if (!BattleTypeValidators.isValidWeapon(weapon)) {
                return { success: false, error: 'Weapon failed final validation' };
            }

            return { success: true, data: weapon };
        } catch (error) {
            return {
                success: false,
                error: `Error validating weapon: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }

    /**
     * Validate and convert raw equipment data to Equipment interface
     * @param rawEquipment - Raw equipment data from JSON
     * @returns Validation result with converted equipment
     */
    private validateAndConvertEquipment(rawEquipment: RawEquipmentData): DataLoadResult<Equipment> {
        try {
            // Validate required fields
            if (!rawEquipment.id || typeof rawEquipment.id !== 'string') {
                return { success: false, error: 'Missing or invalid equipment ID' };
            }

            if (!rawEquipment.name || typeof rawEquipment.name !== 'string') {
                return { success: false, error: 'Missing or invalid equipment name' };
            }

            if (!rawEquipment.type || typeof rawEquipment.type !== 'string') {
                return { success: false, error: 'Missing or invalid equipment type' };
            }

            // Validate element
            if (!Object.values(Element).includes(rawEquipment.element as Element)) {
                return { success: false, error: `Invalid element: ${rawEquipment.element}` };
            }

            // Validate numeric fields (optional bonuses)
            if (rawEquipment.attackBonus !== undefined && (typeof rawEquipment.attackBonus !== 'number' || rawEquipment.attackBonus < 0)) {
                return { success: false, error: 'Invalid attack bonus' };
            }

            if (rawEquipment.defenseBonus !== undefined && (typeof rawEquipment.defenseBonus !== 'number' || rawEquipment.defenseBonus < 0)) {
                return { success: false, error: 'Invalid defense bonus' };
            }

            if (rawEquipment.speedBonus !== undefined && (typeof rawEquipment.speedBonus !== 'number')) {
                return { success: false, error: 'Invalid speed bonus' };
            }

            if (rawEquipment.movementBonus !== undefined && (typeof rawEquipment.movementBonus !== 'number')) {
                return { success: false, error: 'Invalid movement bonus' };
            }

            // Validate durability
            if (typeof rawEquipment.durability !== 'number' || rawEquipment.durability < 0) {
                return { success: false, error: 'Invalid durability' };
            }

            if (typeof rawEquipment.maxDurability !== 'number' || rawEquipment.maxDurability < rawEquipment.durability) {
                return { success: false, error: 'Invalid max durability' };
            }

            // Create equipment object
            const equipment: Equipment = {
                id: rawEquipment.id,
                name: rawEquipment.name,
                type: rawEquipment.type,
                attackBonus: rawEquipment.attackBonus,
                defenseBonus: rawEquipment.defenseBonus,
                speedBonus: rawEquipment.speedBonus,
                movementBonus: rawEquipment.movementBonus,
                element: rawEquipment.element,
                specialEffects: rawEquipment.specialEffects || [],
                durability: rawEquipment.durability,
                maxDurability: rawEquipment.maxDurability,
                description: rawEquipment.description || '',
            };

            return { success: true, data: equipment };
        } catch (error) {
            return {
                success: false,
                error: `Error validating equipment: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }

    /**
     * Validate range pattern data
     * @param rawPattern - Raw range pattern data
     * @returns Validation result with converted range pattern
     */
    private validateRangePattern(rawPattern: any): DataLoadResult<RangePattern> {
        try {
            if (!rawPattern || typeof rawPattern !== 'object') {
                return { success: false, error: 'Range pattern is required' };
            }

            const validTypes = ['single', 'line', 'area', 'cross', 'custom'];
            if (!validTypes.includes(rawPattern.type)) {
                return { success: false, error: `Invalid range pattern type: ${rawPattern.type}` };
            }

            if (typeof rawPattern.range !== 'number' || rawPattern.range <= 0) {
                return { success: false, error: 'Invalid range value' };
            }

            if (!Array.isArray(rawPattern.pattern)) {
                return { success: false, error: 'Pattern must be an array' };
            }

            // Validate pattern positions
            for (const pos of rawPattern.pattern) {
                if (!pos || typeof pos !== 'object' || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
                    return { success: false, error: 'Invalid position in pattern' };
                }
            }

            const rangePattern: RangePattern = {
                type: rawPattern.type,
                range: rawPattern.range,
                pattern: rawPattern.pattern,
                areaOfEffect: rawPattern.areaOfEffect,
            };

            if (!BattleTypeValidators.isValidRangePattern(rangePattern)) {
                return { success: false, error: 'Range pattern failed validation' };
            }

            return { success: true, data: rangePattern };
        } catch (error) {
            return {
                success: false,
                error: `Error validating range pattern: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }

    /**
     * Validate weapon effects array
     * @param rawEffects - Raw weapon effects data
     * @returns Validation result with converted weapon effects
     */
    private validateWeaponEffects(rawEffects: any[]): DataLoadResult<WeaponEffect[]> {
        try {
            if (!Array.isArray(rawEffects)) {
                return { success: false, error: 'Special effects must be an array' };
            }

            const effects: WeaponEffect[] = [];
            const validEffectTypes = ['poison', 'burn', 'freeze', 'stun', 'heal', 'buff', 'debuff'];

            for (const rawEffect of rawEffects) {
                if (!rawEffect || typeof rawEffect !== 'object') {
                    return { success: false, error: 'Invalid effect object' };
                }

                if (!validEffectTypes.includes(rawEffect.type)) {
                    return { success: false, error: `Invalid effect type: ${rawEffect.type}` };
                }

                if (typeof rawEffect.chance !== 'number' || rawEffect.chance < 0 || rawEffect.chance > 100) {
                    return { success: false, error: 'Invalid effect chance (must be 0-100)' };
                }

                if (typeof rawEffect.duration !== 'number' || rawEffect.duration < -1) {
                    return { success: false, error: 'Invalid effect duration' };
                }

                if (typeof rawEffect.power !== 'number' || rawEffect.power < 0) {
                    return { success: false, error: 'Invalid effect power' };
                }

                const effect: WeaponEffect = {
                    type: rawEffect.type,
                    chance: rawEffect.chance,
                    duration: rawEffect.duration,
                    power: rawEffect.power,
                    description: rawEffect.description || '',
                };

                if (!BattleTypeValidators.isValidWeaponEffect(effect)) {
                    return { success: false, error: 'Effect failed validation' };
                }

                effects.push(effect);
            }

            return { success: true, data: effects };
        } catch (error) {
            return {
                success: false,
                error: `Error validating weapon effects: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }

    /**
     * Get weapon durability status
     * @param weapon - Weapon to check
     * @returns Durability status information
     */
    public getWeaponDurabilityStatus(weapon: Weapon): {
        percentage: number;
        status: 'excellent' | 'good' | 'worn' | 'damaged' | 'broken';
        performanceMultiplier: number;
    } {
        if (weapon.durability === undefined || weapon.maxDurability === undefined || weapon.maxDurability === 0) {
            return {
                percentage: 100,
                status: 'excellent',
                performanceMultiplier: 1.0,
            };
        }

        const percentage = (weapon.durability / weapon.maxDurability) * 100;
        let status: 'excellent' | 'good' | 'worn' | 'damaged' | 'broken';
        let performanceMultiplier: number;

        if (percentage >= 80) {
            status = 'excellent';
            performanceMultiplier = 1.0;
        } else if (percentage >= 60) {
            status = 'good';
            performanceMultiplier = 0.95;
        } else if (percentage >= 40) {
            status = 'worn';
            performanceMultiplier = 0.85;
        } else if (percentage >= 20) {
            status = 'damaged';
            performanceMultiplier = 0.7;
        } else if (percentage > 0) {
            status = 'broken';
            performanceMultiplier = 0.5;
        } else {
            status = 'broken';
            performanceMultiplier = 0.1; // Almost unusable
        }

        return {
            percentage,
            status,
            performanceMultiplier,
        };
    }

    /**
     * Apply durability damage to weapon
     * @param weapon - Weapon to damage
     * @param damage - Amount of durability damage
     * @returns Updated weapon with reduced durability
     */
    public damageWeaponDurability(weapon: Weapon, damage: number = 1): Weapon {
        if (!weapon.durability || !weapon.maxDurability) {
            return weapon;
        }

        const updatedWeapon = { ...weapon };
        updatedWeapon.durability = Math.max(0, updatedWeapon.durability - damage);

        return updatedWeapon;
    }

    /**
     * Repair weapon durability
     * @param weapon - Weapon to repair
     * @param repairAmount - Amount to repair (optional, defaults to full repair)
     * @returns Updated weapon with restored durability
     */
    public repairWeapon(weapon: Weapon, repairAmount?: number): Weapon {
        if (!weapon.durability || !weapon.maxDurability) {
            return weapon;
        }

        const updatedWeapon = { ...weapon };
        if (repairAmount !== undefined) {
            updatedWeapon.durability = Math.min(updatedWeapon.maxDurability, updatedWeapon.durability + repairAmount);
        } else {
            updatedWeapon.durability = updatedWeapon.maxDurability;
        }

        return updatedWeapon;
    }
}