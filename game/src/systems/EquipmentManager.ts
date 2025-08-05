/**
 * EquipmentManager - Manages equipment integration with battle calculations
 * Handles equipment effects on character stats and battle performance
 */

import { Unit, Equipment, CharacterEquipment } from '../types/gameplay';
import { Weapon, Element, DamageModifier, WeaponEffect } from '../types/battle';
import { WeaponDataLoader } from '../utils/WeaponDataLoader';

/**
 * Equipment effect calculation result
 */
export interface EquipmentEffectResult {
    attackBonus: number;
    defenseBonus: number;
    speedBonus: number;
    movementBonus: number;
    elementalResistances: Map<Element, number>;
    statusEffectResistances: Map<string, number>;
    specialEffects: WeaponEffect[];
    durabilityMultiplier: number;
}

/**
 * Equipment validation result
 */
export interface EquipmentValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * EquipmentManager class for handling equipment integration
 */
export class EquipmentManager {
    private weaponDataLoader: WeaponDataLoader;

    constructor() {
        this.weaponDataLoader = WeaponDataLoader.getInstance();
    }

    /**
     * Calculate total equipment effects for a unit
     * @param unit - Unit to calculate effects for
     * @returns Equipment effect calculation result
     */
    public calculateEquipmentEffects(unit: Unit): EquipmentEffectResult {
        const result: EquipmentEffectResult = {
            attackBonus: 0,
            defenseBonus: 0,
            speedBonus: 0,
            movementBonus: 0,
            elementalResistances: new Map(),
            statusEffectResistances: new Map(),
            specialEffects: [],
            durabilityMultiplier: 1.0,
        };

        // Process weapon effects
        if (unit.equipment.weapon) {
            this.applyWeaponEffects(unit.equipment.weapon, result);
        }

        // Process armor effects
        if (unit.equipment.armor) {
            this.applyArmorEffects(unit.equipment.armor, result);
        }

        // Process accessory effects
        if (unit.equipment.accessory) {
            this.applyAccessoryEffects(unit.equipment.accessory, result);
        }

        return result;
    }

    /**
     * Get effective weapon for a unit (considering durability and equipment bonuses)
     * @param unit - Unit to get weapon for
     * @returns Effective weapon with all bonuses applied
     */
    public getEffectiveWeapon(unit: Unit): Weapon | null {
        const weaponId = unit.equipment.weapon?.id;
        if (!weaponId) {
            return null;
        }

        const baseWeapon = this.weaponDataLoader.getWeapon(weaponId);
        if (!baseWeapon) {
            console.warn(`Weapon not found: ${weaponId}`);
            return null;
        }

        // Create a copy of the weapon to modify
        const effectiveWeapon: Weapon = { ...baseWeapon };

        // Apply durability effects
        const durabilityStatus = this.weaponDataLoader.getWeaponDurabilityStatus(effectiveWeapon);
        effectiveWeapon.attackPower = Math.floor(effectiveWeapon.attackPower * durabilityStatus.performanceMultiplier);
        effectiveWeapon.accuracy = Math.floor(effectiveWeapon.accuracy * durabilityStatus.performanceMultiplier);

        // Apply equipment bonuses
        const equipmentEffects = this.calculateEquipmentEffects(unit);
        effectiveWeapon.attackPower += equipmentEffects.attackBonus;

        // Ensure minimum values
        effectiveWeapon.attackPower = Math.max(1, effectiveWeapon.attackPower);
        effectiveWeapon.accuracy = Math.max(5, Math.min(100, effectiveWeapon.accuracy));

        return effectiveWeapon;
    }

    /**
     * Get effective stats for a unit (base stats + equipment bonuses)
     * @param unit - Unit to calculate effective stats for
     * @returns Unit stats with equipment bonuses applied
     */
    public getEffectiveStats(unit: Unit): Unit['stats'] {
        const equipmentEffects = this.calculateEquipmentEffects(unit);

        return {
            maxHP: unit.stats.maxHP,
            maxMP: unit.stats.maxMP,
            attack: unit.stats.attack + equipmentEffects.attackBonus,
            defense: unit.stats.defense + equipmentEffects.defenseBonus,
            speed: unit.stats.speed + equipmentEffects.speedBonus,
            movement: unit.stats.movement + equipmentEffects.movementBonus,
        };
    }

    /**
     * Calculate damage modifiers from equipment
     * @param attacker - Attacking unit
     * @param target - Target unit
     * @param attackElement - Element of the attack
     * @returns Array of damage modifiers from equipment
     */
    public getEquipmentDamageModifiers(
        attacker: Unit,
        target: Unit,
        attackElement: Element
    ): DamageModifier[] {
        const modifiers: DamageModifier[] = [];

        // Get attacker equipment effects
        const attackerEffects = this.calculateEquipmentEffects(attacker);

        // Add weapon durability modifier
        if (attackerEffects.durabilityMultiplier !== 1.0) {
            modifiers.push({
                type: 'weapon',
                multiplier: attackerEffects.durabilityMultiplier,
                description: `Weapon condition (${Math.round(attackerEffects.durabilityMultiplier * 100)}%)`,
                source: 'weapon_durability',
            });
        }

        // Get target equipment effects
        const targetEffects = this.calculateEquipmentEffects(target);

        // Add elemental resistance modifier
        const resistance = targetEffects.elementalResistances.get(attackElement);
        if (resistance && resistance !== 0) {
            const resistanceMultiplier = 1.0 - (resistance / 100);
            modifiers.push({
                type: 'elemental',
                multiplier: resistanceMultiplier,
                description: `${attackElement} resistance (${resistance}%)`,
                source: 'equipment_resistance',
            });
        }

        return modifiers;
    }

    /**
     * Check if equipment can be equipped by a unit
     * @param unit - Unit to check
     * @param equipment - Equipment to validate
     * @param slot - Equipment slot to check
     * @returns Validation result
     */
    public validateEquipment(unit: Unit, equipment: Equipment, slot: keyof CharacterEquipment): EquipmentValidationResult {
        const result: EquipmentValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
        };

        // Check if equipment exists
        if (!equipment) {
            result.isValid = false;
            result.errors.push('Equipment is null or undefined');
            return result;
        }

        // Check slot compatibility
        if (slot === 'weapon') {
            // For weapons, check if it's actually a weapon from the weapon data
            const weaponData = this.weaponDataLoader.getWeapon(equipment.id);
            if (!weaponData) {
                result.isValid = false;
                result.errors.push('Equipment is not a valid weapon');
            }
        } else if (slot === 'armor') {
            // Check if equipment type is appropriate for armor slot
            const armorTypes = ['light', 'medium', 'heavy'];
            if (!armorTypes.includes(equipment.type)) {
                result.warnings.push(`Unusual armor type: ${equipment.type}`);
            }
        } else if (slot === 'accessory') {
            // Check if equipment type is appropriate for accessory slot
            const accessoryTypes = ['ring', 'amulet', 'boots', 'gloves'];
            if (!accessoryTypes.includes(equipment.type)) {
                result.warnings.push(`Unusual accessory type: ${equipment.type}`);
            }
        }

        // Check durability
        if (equipment.durability <= 0) {
            result.warnings.push('Equipment is broken and will provide reduced benefits');
        } else if (equipment.durability < equipment.maxDurability * 0.2) {
            result.warnings.push('Equipment is heavily damaged');
        }

        // Check for conflicting equipment (future enhancement)
        // This could check for equipment that shouldn't be worn together

        return result;
    }

    /**
     * Equip an item to a unit
     * @param unit - Unit to equip item to
     * @param equipment - Equipment to equip
     * @param slot - Slot to equip to
     * @returns Updated unit with equipment equipped
     */
    public equipItem(unit: Unit, equipment: Equipment, slot: keyof CharacterEquipment): Unit {
        const validation = this.validateEquipment(unit, equipment, slot);

        if (!validation.isValid) {
            throw new Error(`Cannot equip item: ${validation.errors.join(', ')}`);
        }

        // Create updated unit
        const updatedUnit: Unit = {
            ...unit,
            equipment: {
                ...unit.equipment,
                [slot]: equipment,
            },
        };

        return updatedUnit;
    }

    /**
     * Unequip an item from a unit
     * @param unit - Unit to unequip item from
     * @param slot - Slot to unequip from
     * @returns Updated unit with item unequipped
     */
    public unequipItem(unit: Unit, slot: keyof CharacterEquipment): Unit {
        const updatedUnit: Unit = {
            ...unit,
            equipment: {
                ...unit.equipment,
                [slot]: undefined,
            },
        };

        return updatedUnit;
    }

    /**
     * Damage equipment durability after use
     * @param unit - Unit whose equipment to damage
     * @param slot - Equipment slot to damage
     * @param damage - Amount of durability damage
     * @returns Updated unit with damaged equipment
     */
    public damageEquipmentDurability(unit: Unit, slot: keyof CharacterEquipment, damage: number = 1): Unit {
        const equipment = unit.equipment[slot];
        if (!equipment) {
            return unit;
        }

        const updatedEquipment: Equipment = {
            ...equipment,
            durability: Math.max(0, equipment.durability - damage),
        };

        return this.equipItem(unit, updatedEquipment, slot);
    }

    /**
     * Apply weapon effects to equipment result
     * @param weapon - Weapon equipment
     * @param result - Equipment effect result to modify
     */
    private applyWeaponEffects(weapon: Equipment, result: EquipmentEffectResult): void {
        // Get weapon data for durability calculations
        const weaponData = this.weaponDataLoader.getWeapon(weapon.id);
        if (weaponData) {
            const durabilityStatus = this.weaponDataLoader.getWeaponDurabilityStatus(weaponData);
            result.durabilityMultiplier *= durabilityStatus.performanceMultiplier;
        }

        // Apply weapon bonuses
        if (weapon.attackBonus) {
            result.attackBonus += weapon.attackBonus;
        }

        // Apply special effects
        if (weapon.specialEffects && weapon.specialEffects.length > 0) {
            result.specialEffects.push(...weapon.specialEffects);
        }
    }

    /**
     * Apply armor effects to equipment result
     * @param armor - Armor equipment
     * @param result - Equipment effect result to modify
     */
    private applyArmorEffects(armor: Equipment, result: EquipmentEffectResult): void {
        // Apply defense bonus
        if (armor.defenseBonus) {
            result.defenseBonus += armor.defenseBonus;
        }

        // Apply elemental resistance based on armor element
        if (armor.element && armor.element !== 'none') {
            const element = armor.element as Element;
            const currentResistance = result.elementalResistances.get(element) || 0;
            result.elementalResistances.set(element, currentResistance + 25); // 25% resistance
        }

        // Apply special effects
        if (armor.specialEffects && armor.specialEffects.length > 0) {
            for (const effect of armor.specialEffects) {
                if (effect.type === 'buff' && effect.description.includes('damage')) {
                    // Parse resistance from description (simplified)
                    const resistanceMatch = effect.description.match(/(\d+)%/);
                    if (resistanceMatch) {
                        const resistance = parseInt(resistanceMatch[1]);
                        const element = this.parseElementFromDescription(effect.description);
                        if (element) {
                            const currentResistance = result.elementalResistances.get(element) || 0;
                            result.elementalResistances.set(element, currentResistance + resistance);
                        }
                    }
                }
            }
        }

        // Apply durability effects
        const durabilityPercentage = (armor.durability / armor.maxDurability) * 100;
        if (durabilityPercentage < 50) {
            result.defenseBonus = Math.floor(result.defenseBonus * (durabilityPercentage / 100 + 0.5));
        }
    }

    /**
     * Apply accessory effects to equipment result
     * @param accessory - Accessory equipment
     * @param result - Equipment effect result to modify
     */
    private applyAccessoryEffects(accessory: Equipment, result: EquipmentEffectResult): void {
        // Apply stat bonuses
        if (accessory.attackBonus) {
            result.attackBonus += accessory.attackBonus;
        }

        if (accessory.defenseBonus) {
            result.defenseBonus += accessory.defenseBonus;
        }

        if (accessory.speedBonus) {
            result.speedBonus += accessory.speedBonus;
        }

        if (accessory.movementBonus) {
            result.movementBonus += accessory.movementBonus;
        }

        // Apply special effects
        if (accessory.specialEffects && accessory.specialEffects.length > 0) {
            result.specialEffects.push(...accessory.specialEffects);
        }
    }

    /**
     * Parse element from effect description (helper method)
     * @param description - Effect description
     * @returns Parsed element or null
     */
    private parseElementFromDescription(description: string): Element | null {
        const lowerDesc = description.toLowerCase();

        if (lowerDesc.includes('fire')) return Element.FIRE;
        if (lowerDesc.includes('water')) return Element.WATER;
        if (lowerDesc.includes('earth')) return Element.EARTH;
        if (lowerDesc.includes('air') || lowerDesc.includes('wind')) return Element.AIR;
        if (lowerDesc.includes('light')) return Element.LIGHT;
        if (lowerDesc.includes('dark')) return Element.DARK;

        return null;
    }

    /**
     * Get equipment summary for a unit
     * @param unit - Unit to get equipment summary for
     * @returns Equipment summary string
     */
    public getEquipmentSummary(unit: Unit): string {
        const lines: string[] = [];
        const effects = this.calculateEquipmentEffects(unit);

        lines.push(`=== Equipment Summary for ${unit.name} ===`);

        // Weapon
        if (unit.equipment.weapon) {
            const weaponData = this.weaponDataLoader.getWeapon(unit.equipment.weapon.id);
            if (weaponData) {
                const durabilityStatus = this.weaponDataLoader.getWeaponDurabilityStatus(weaponData);
                lines.push(`Weapon: ${weaponData.name} (${durabilityStatus.status}, ${Math.round(durabilityStatus.percentage)}%)`);
            } else {
                lines.push(`Weapon: ${unit.equipment.weapon.name} (Unknown)`);
            }
        } else {
            lines.push('Weapon: None');
        }

        // Armor
        if (unit.equipment.armor) {
            const durabilityPercentage = Math.round((unit.equipment.armor.durability / unit.equipment.armor.maxDurability) * 100);
            lines.push(`Armor: ${unit.equipment.armor.name} (${durabilityPercentage}%)`);
        } else {
            lines.push('Armor: None');
        }

        // Accessory
        if (unit.equipment.accessory) {
            lines.push(`Accessory: ${unit.equipment.accessory.name}`);
        } else {
            lines.push('Accessory: None');
        }

        // Total bonuses
        lines.push('');
        lines.push('Total Equipment Bonuses:');
        lines.push(`Attack: +${effects.attackBonus}`);
        lines.push(`Defense: +${effects.defenseBonus}`);
        lines.push(`Speed: +${effects.speedBonus}`);
        lines.push(`Movement: +${effects.movementBonus}`);

        // Resistances
        if (effects.elementalResistances.size > 0) {
            lines.push('');
            lines.push('Elemental Resistances:');
            effects.elementalResistances.forEach((resistance, element) => {
                lines.push(`${element}: ${resistance}%`);
            });
        }

        // Special effects
        if (effects.specialEffects.length > 0) {
            lines.push('');
            lines.push('Special Effects:');
            effects.specialEffects.forEach(effect => {
                lines.push(`- ${effect.description}`);
            });
        }

        return lines.join('\n');
    }
}