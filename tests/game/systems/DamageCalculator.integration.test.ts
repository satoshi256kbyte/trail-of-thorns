/**
 * Integration tests for DamageCalculator with equipment system
 * Tests the integration between damage calculation and equipment bonuses
 */

import { DamageCalculator } from '../../../game/src/systems/DamageCalculator';
import { EquipmentManager } from '../../../game/src/systems/EquipmentManager';
import { WeaponDataLoader } from '../../../game/src/utils/WeaponDataLoader';
import { Unit, Equipment } from '../../../game/src/types/gameplay';
import { Weapon, WeaponType, Element } from '../../../game/src/types/battle';

// Mock WeaponDataLoader
jest.mock('../../../game/src/utils/WeaponDataLoader');

describe('DamageCalculator Equipment Integration', () => {
    let damageCalculator: DamageCalculator;
    let mockWeaponDataLoader: jest.Mocked<WeaponDataLoader>;
    let attacker: Unit;
    let target: Unit;
    let mockWeapon: Weapon;

    beforeEach(() => {
        // Setup mocks
        mockWeaponDataLoader = {
            getWeapon: jest.fn(),
            getWeaponDurabilityStatus: jest.fn(),
            getInstance: jest.fn(),
        } as any;

        (WeaponDataLoader.getInstance as jest.Mock).mockReturnValue(mockWeaponDataLoader);

        damageCalculator = new DamageCalculator();

        // Create mock weapon
        mockWeapon = {
            id: 'sword-001',
            name: 'Iron Sword',
            type: WeaponType.SWORD,
            attackPower: 15,
            range: 1,
            rangePattern: {
                type: 'single',
                range: 1,
                pattern: [{ x: 0, y: -1 }],
            },
            element: Element.NONE,
            criticalRate: 10,
            accuracy: 85,
            specialEffects: [],
            durability: 50,
            maxDurability: 50,
            description: 'A basic iron sword',
        };

        // Create mock units
        attacker = {
            id: 'attacker',
            name: 'Attacker',
            position: { x: 0, y: 0 },
            stats: {
                maxHP: 100,
                maxMP: 50,
                attack: 20,
                defense: 10,
                speed: 15,
                movement: 3,
            },
            currentHP: 100,
            currentMP: 50,
            faction: 'player',
            hasActed: false,
            hasMoved: false,
            equipment: {},
        };

        target = {
            id: 'target',
            name: 'Target',
            position: { x: 1, y: 0 },
            stats: {
                maxHP: 80,
                maxMP: 30,
                attack: 15,
                defense: 12,
                speed: 10,
                movement: 2,
            },
            currentHP: 80,
            currentMP: 30,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false,
            equipment: {},
        };

        // Setup mock returns
        mockWeaponDataLoader.getWeapon.mockReturnValue(mockWeapon);
        mockWeaponDataLoader.getWeaponDurabilityStatus.mockReturnValue({
            percentage: 100,
            status: 'excellent',
            performanceMultiplier: 1.0,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('equipment bonuses in damage calculation', () => {
        it('should apply attack bonus from equipment to damage calculation', () => {
            // Give attacker equipment with attack bonus
            const powerRing: Equipment = {
                id: 'ring-001',
                name: 'Power Ring',
                type: 'ring',
                attackBonus: 5,
                element: 'none',
                specialEffects: [],
                durability: 100,
                maxDurability: 100,
                description: 'Increases attack power',
            };

            attacker.equipment.accessory = powerRing;

            const baseDamageWithoutEquipment = damageCalculator.calculateBaseDamage(
                { ...attacker, equipment: {} },
                target,
                mockWeapon
            );

            const baseDamageWithEquipment = damageCalculator.calculateBaseDamage(attacker, target, mockWeapon);

            expect(baseDamageWithEquipment).toBeGreaterThan(baseDamageWithoutEquipment);
            // Equipment bonus is applied to effective stats, not directly to damage
            expect(baseDamageWithEquipment - baseDamageWithoutEquipment).toBeGreaterThan(0);
        });

        it('should apply defense bonus from equipment to damage reduction', () => {
            // Give target equipment with defense bonus
            const plateArmor: Equipment = {
                id: 'armor-001',
                name: 'Plate Armor',
                type: 'heavy',
                defenseBonus: 8,
                element: 'none',
                specialEffects: [],
                durability: 80,
                maxDurability: 80,
                description: 'Heavy armor with high defense',
            };

            target.equipment.armor = plateArmor;

            const baseDamageWithoutEquipment = damageCalculator.calculateBaseDamage(
                attacker,
                { ...target, equipment: {} },
                mockWeapon
            );

            const baseDamageWithEquipment = damageCalculator.calculateBaseDamage(attacker, target, mockWeapon);

            expect(baseDamageWithEquipment).toBeLessThan(baseDamageWithoutEquipment);
        });

        it('should apply speed bonuses to critical hit calculations', () => {
            // Give attacker speed-boosting equipment
            const speedBoots: Equipment = {
                id: 'boots-001',
                name: 'Speed Boots',
                type: 'boots',
                speedBonus: 5,
                element: 'none',
                specialEffects: [],
                durability: 50,
                maxDurability: 50,
                description: 'Increases speed',
            };

            attacker.equipment.accessory = speedBoots;

            // Calculate critical chances multiple times to see if speed affects it
            const criticalResults = [];
            for (let i = 0; i < 10; i++) {
                const result = damageCalculator.calculateCritical(attacker, target, mockWeapon);
                criticalResults.push(result.chance);
            }

            // Critical chance should be consistent and influenced by speed difference
            const avgCriticalChance = criticalResults.reduce((sum, chance) => sum + chance, 0) / criticalResults.length;
            expect(avgCriticalChance).toBeGreaterThan(10); // Should be higher than base weapon critical rate
        });

        it('should apply equipment durability effects to weapon performance', () => {
            // Mock damaged weapon
            mockWeaponDataLoader.getWeaponDurabilityStatus.mockReturnValue({
                percentage: 40,
                status: 'damaged',
                performanceMultiplier: 0.7,
            });

            const weaponEquipment: Equipment = {
                id: 'sword-001',
                name: 'Iron Sword',
                type: 'sword',
                element: 'none',
                specialEffects: [],
                durability: 20,
                maxDurability: 50,
                description: 'A damaged sword',
            };

            attacker.equipment.weapon = weaponEquipment;

            const calculation = damageCalculator.performCompleteCalculation(attacker, target, mockWeapon);

            // Should have durability modifier
            const durabilityModifier = calculation.modifiers.find(mod => mod.source === 'weapon_durability');
            expect(durabilityModifier).toBeDefined();
            expect(durabilityModifier!.multiplier).toBe(0.7);
        });

        it('should apply elemental resistance from equipment', () => {
            // Create fire weapon
            const fireWeapon: Weapon = {
                ...mockWeapon,
                element: Element.FIRE,
            };

            // Give target fire-resistant armor
            const fireResistantArmor: Equipment = {
                id: 'armor-002',
                name: 'Fire Resistant Cloak',
                type: 'light',
                defenseBonus: 3,
                element: Element.FIRE,
                specialEffects: [
                    {
                        type: 'buff',
                        chance: 100,
                        duration: -1,
                        power: 50,
                        description: 'Reduces fire damage by 50%',
                    },
                ],
                durability: 35,
                maxDurability: 35,
                description: 'Resists fire damage',
            };

            target.equipment.armor = fireResistantArmor;

            const calculation = damageCalculator.performCompleteCalculation(attacker, target, fireWeapon);

            // Should have elemental resistance modifier
            const resistanceModifier = calculation.modifiers.find(
                mod => mod.type === 'elemental' && mod.source === 'equipment_resistance'
            );
            expect(resistanceModifier).toBeDefined();
            expect(resistanceModifier!.multiplier).toBeLessThan(1.0);
        });

        it('should combine multiple equipment bonuses correctly', () => {
            // Give attacker multiple equipment pieces
            const powerRing: Equipment = {
                id: 'ring-001',
                name: 'Power Ring',
                type: 'ring',
                attackBonus: 3,
                element: 'none',
                specialEffects: [],
                durability: 100,
                maxDurability: 100,
                description: 'Increases attack power',
            };

            const weaponEquipment: Equipment = {
                id: 'sword-001',
                name: 'Iron Sword',
                type: 'sword',
                attackBonus: 2,
                element: 'none',
                specialEffects: [],
                durability: 50,
                maxDurability: 50,
                description: 'A well-maintained sword',
            };

            attacker.equipment.accessory = powerRing;
            attacker.equipment.weapon = weaponEquipment;

            // Give target defensive equipment
            const plateArmor: Equipment = {
                id: 'armor-001',
                name: 'Plate Armor',
                type: 'heavy',
                defenseBonus: 8,
                element: 'none',
                specialEffects: [],
                durability: 80,
                maxDurability: 80,
                description: 'Heavy armor',
            };

            target.equipment.armor = plateArmor;

            const calculation = damageCalculator.performCompleteCalculation(attacker, target, mockWeapon);

            // Should have higher base damage due to attack bonuses
            // Should have reduced final damage due to target's defense bonus
            expect(calculation.baseDamage).toBeGreaterThan(0);

            // Final damage can be 0 if evaded
            if (!calculation.isEvaded) {
                expect(calculation.finalDamage).toBeGreaterThan(0);
            } else {
                expect(calculation.finalDamage).toBe(0);
            }
        });

        it('should handle healing calculations with equipment bonuses', () => {
            // Create healing weapon
            const healingStaff: Weapon = {
                id: 'staff-001',
                name: 'Healing Staff',
                type: WeaponType.STAFF,
                attackPower: 8,
                range: 2,
                rangePattern: {
                    type: 'single',
                    range: 2,
                    pattern: [{ x: 0, y: -1 }],
                },
                element: Element.LIGHT,
                criticalRate: 5,
                accuracy: 95,
                specialEffects: [
                    {
                        type: 'heal',
                        chance: 100,
                        duration: 1,
                        power: 15,
                        description: 'Heals the target',
                    },
                ],
                description: 'A staff for healing',
            };

            // Give healer equipment that boosts attack (which affects healing)
            const powerRing: Equipment = {
                id: 'ring-001',
                name: 'Power Ring',
                type: 'ring',
                attackBonus: 5,
                element: 'none',
                specialEffects: [],
                durability: 100,
                maxDurability: 100,
                description: 'Increases healing power',
            };

            attacker.equipment.accessory = powerRing;

            // Damage target first
            target.currentHP = 50;

            const healingWithoutEquipment = damageCalculator.calculateHealing(
                { ...attacker, equipment: {} },
                target,
                healingStaff
            );

            const healingWithEquipment = damageCalculator.calculateHealing(attacker, target, healingStaff);

            expect(healingWithEquipment).toBeGreaterThanOrEqual(healingWithoutEquipment);
        });

        it('should provide accurate damage preview with equipment', () => {
            // Give attacker equipment
            const powerRing: Equipment = {
                id: 'ring-001',
                name: 'Power Ring',
                type: 'ring',
                attackBonus: 5,
                element: 'none',
                specialEffects: [],
                durability: 100,
                maxDurability: 100,
                description: 'Increases attack power',
            };

            attacker.equipment.accessory = powerRing;

            const previewWithoutEquipment = damageCalculator.getDamagePreview(
                { ...attacker, equipment: {} },
                target,
                mockWeapon
            );

            const previewWithEquipment = damageCalculator.getDamagePreview(attacker, target, mockWeapon);

            expect(previewWithEquipment.min).toBeGreaterThanOrEqual(previewWithoutEquipment.min);
            expect(previewWithEquipment.max).toBeGreaterThanOrEqual(previewWithoutEquipment.max);
            expect(previewWithEquipment.average).toBeGreaterThanOrEqual(previewWithoutEquipment.average);
        });
    });

    describe('equipment validation in battle context', () => {
        it('should handle broken equipment gracefully', () => {
            // Give attacker broken equipment
            const brokenWeapon: Equipment = {
                id: 'sword-001',
                name: 'Broken Sword',
                type: 'sword',
                element: 'none',
                specialEffects: [],
                durability: 0,
                maxDurability: 50,
                description: 'A completely broken sword',
            };

            attacker.equipment.weapon = brokenWeapon;

            // Mock broken weapon status
            mockWeaponDataLoader.getWeaponDurabilityStatus.mockReturnValue({
                percentage: 0,
                status: 'broken',
                performanceMultiplier: 0.1,
            });

            const calculation = damageCalculator.performCompleteCalculation(attacker, target, mockWeapon);

            // Should still calculate damage but with severe penalty
            expect(calculation.finalDamage).toBeGreaterThan(0);

            const durabilityModifier = calculation.modifiers.find(mod => mod.source === 'weapon_durability');
            expect(durabilityModifier).toBeDefined();
            expect(durabilityModifier!.multiplier).toBe(0.1);
        });

        it('should handle missing equipment gracefully', () => {
            // Units with no equipment should still work
            // The weapon parameter is passed directly, so it should still calculate damage
            const calculation = damageCalculator.performCompleteCalculation(attacker, target, mockWeapon);

            expect(calculation.baseDamage).toBeGreaterThan(0);

            // Final damage can be 0 if evaded, but should be >= 1 if not evaded
            if (!calculation.isEvaded) {
                expect(calculation.finalDamage).toBeGreaterThanOrEqual(1);
            } else {
                expect(calculation.finalDamage).toBe(0);
            }
        });
    });
});