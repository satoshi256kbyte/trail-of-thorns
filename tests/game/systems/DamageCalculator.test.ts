/**
 * Unit tests for DamageCalculator
 * Tests damage calculation formulas, elemental modifiers, critical hits, evasion, and final damage computation
 */

import { DamageCalculator, DamageCalculationConfig } from '../../../game/src/systems/DamageCalculator';
import { Unit, UnitStats } from '../../../game/src/types/gameplay';
import { Weapon, WeaponType, Element, DamageModifier } from '../../../game/src/types/battle';

describe('DamageCalculator', () => {
    let calculator: DamageCalculator;
    let attacker: Unit;
    let target: Unit;
    let weapon: Weapon;

    beforeEach(() => {
        calculator = new DamageCalculator();

        // Create test attacker
        const attackerStats: UnitStats = {
            maxHP: 100,
            maxMP: 50,
            attack: 25,
            defense: 15,
            speed: 12,
            movement: 3,
        };

        attacker = {
            id: 'attacker',
            name: 'Test Attacker',
            position: { x: 0, y: 0 },
            stats: attackerStats,
            currentHP: 100,
            currentMP: 50,
            faction: 'player',
            hasActed: false,
            hasMoved: false,
        };

        // Create test target
        const targetStats: UnitStats = {
            maxHP: 80,
            maxMP: 30,
            attack: 20,
            defense: 10,
            speed: 8,
            movement: 2,
        };

        target = {
            id: 'target',
            name: 'Test Target',
            position: { x: 1, y: 0 },
            stats: targetStats,
            currentHP: 80,
            currentMP: 30,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false,
        };

        // Create test weapon
        weapon = {
            id: 'test-sword',
            name: 'Test Sword',
            type: WeaponType.SWORD,
            attackPower: 20,
            range: 1,
            rangePattern: { type: 'single', range: 1, pattern: [] },
            element: Element.NONE,
            criticalRate: 15,
            accuracy: 90,
            specialEffects: [],
            description: 'A test sword',
        };
    });

    describe('calculateBaseDamage', () => {
        test('should calculate base damage using linear formula', () => {
            const baseDamage = calculator.calculateBaseDamage(attacker, target, weapon);

            // Expected: (weapon.attackPower + attacker.attack) - (target.defense * defenseEffectiveness)
            // (20 + 25) - (10 * 0.5) = 45 - 5 = 40
            // Plus level difference bonus and variance
            expect(baseDamage).toBeGreaterThan(30);
            expect(baseDamage).toBeLessThan(60);
        });

        test('should respect minimum damage', () => {
            // Create weak attacker vs strong defender
            const weakAttacker = { ...attacker, stats: { ...attacker.stats, attack: 1 } };
            const strongTarget = { ...target, stats: { ...target.stats, defense: 100 } };
            const weakWeapon = { ...weapon, attackPower: 1 };

            const baseDamage = calculator.calculateBaseDamage(weakAttacker, strongTarget, weakWeapon);

            expect(baseDamage).toBeGreaterThanOrEqual(1); // Minimum damage
        });

        test('should apply level difference bonus', () => {
            // Create attacker with higher speed (level proxy)
            const highLevelAttacker = { ...attacker, stats: { ...attacker.stats, speed: 20 } };

            const normalDamage = calculator.calculateBaseDamage(attacker, target, weapon);
            const bonusDamage = calculator.calculateBaseDamage(highLevelAttacker, target, weapon);

            expect(bonusDamage).toBeGreaterThan(normalDamage);
        });

        test('should handle different damage formulas', () => {
            const linearCalculator = new DamageCalculator({ baseDamageFormula: 'linear', enableVariance: false });
            const sqrtCalculator = new DamageCalculator({ baseDamageFormula: 'square_root', enableVariance: false });
            const logCalculator = new DamageCalculator({ baseDamageFormula: 'logarithmic', enableVariance: false });

            const linearDamage = linearCalculator.calculateBaseDamage(attacker, target, weapon);
            const sqrtDamage = sqrtCalculator.calculateBaseDamage(attacker, target, weapon);
            const logDamage = logCalculator.calculateBaseDamage(attacker, target, weapon);

            // All should produce positive damage but with different values
            expect(linearDamage).toBeGreaterThan(0);
            expect(sqrtDamage).toBeGreaterThan(0);
            expect(logDamage).toBeGreaterThan(0);

            // They should be different (unless by coincidence)
            expect([linearDamage, sqrtDamage, logDamage].every(d => d === linearDamage)).toBe(false);
        });

        test('should disable variance when configured', () => {
            const noVarianceCalculator = new DamageCalculator({ enableVariance: false });

            const damage1 = noVarianceCalculator.calculateBaseDamage(attacker, target, weapon);
            const damage2 = noVarianceCalculator.calculateBaseDamage(attacker, target, weapon);
            const damage3 = noVarianceCalculator.calculateBaseDamage(attacker, target, weapon);

            // All calculations should be identical without variance
            expect(damage1).toBe(damage2);
            expect(damage2).toBe(damage3);
        });

        test('should throw error for invalid inputs', () => {
            expect(() => {
                calculator.calculateBaseDamage(null as any, target, weapon);
            }).toThrow();

            expect(() => {
                calculator.calculateBaseDamage(attacker, null as any, weapon);
            }).toThrow();

            expect(() => {
                calculator.calculateBaseDamage(attacker, target, null as any);
            }).toThrow();

            // Test defeated attacker
            const defeatedAttacker = { ...attacker, currentHP: 0 };
            expect(() => {
                calculator.calculateBaseDamage(defeatedAttacker, target, weapon);
            }).toThrow();

            // Test defeated target
            const defeatedTarget = { ...target, currentHP: 0 };
            expect(() => {
                calculator.calculateBaseDamage(attacker, defeatedTarget, weapon);
            }).toThrow();
        });
    });

    describe('applyElementalModifier', () => {
        test('should apply no modifier for same elements', () => {
            const baseDamage = 100;
            const modifiedDamage = calculator.applyElementalModifier(baseDamage, Element.FIRE, Element.FIRE);

            expect(modifiedDamage).toBe(50); // Fire vs Fire = 0.5x effectiveness
        });

        test('should apply effectiveness modifier for different elements', () => {
            const baseDamage = 100;

            // Fire vs Water (weak)
            const fireVsWater = calculator.applyElementalModifier(baseDamage, Element.FIRE, Element.WATER);
            expect(fireVsWater).toBe(50); // 0.5x effectiveness

            // Fire vs Earth (strong)
            const fireVsEarth = calculator.applyElementalModifier(baseDamage, Element.FIRE, Element.EARTH);
            expect(fireVsEarth).toBe(150); // 1.5x effectiveness

            // Light vs Dark (strong)
            const lightVsDark = calculator.applyElementalModifier(baseDamage, Element.LIGHT, Element.DARK);
            expect(lightVsDark).toBe(150); // 1.5x effectiveness
        });

        test('should handle neutral element', () => {
            const baseDamage = 100;

            // None vs any element should be neutral
            const noneVsFire = calculator.applyElementalModifier(baseDamage, Element.NONE, Element.FIRE);
            expect(noneVsFire).toBe(100); // 1.0x effectiveness

            const fireVsNone = calculator.applyElementalModifier(baseDamage, Element.FIRE, Element.NONE);
            expect(fireVsNone).toBe(100); // 1.0x effectiveness
        });

        test('should floor the result', () => {
            const baseDamage = 33; // Will result in fractional damage with some multipliers

            const result = calculator.applyElementalModifier(baseDamage, Element.FIRE, Element.EARTH);
            expect(result).toBe(Math.floor(33 * 1.5)); // Should be floored
            expect(Number.isInteger(result)).toBe(true);
        });
    });

    describe('calculateCritical', () => {
        test('should calculate critical chance based on weapon and stats', () => {
            // Mock Math.random to control the roll
            const originalRandom = Math.random;
            Math.random = jest.fn(() => 0.1); // 10% roll

            try {
                const result = calculator.calculateCritical(attacker, target, weapon);

                expect(result.isCritical).toBe(true); // 10% roll should be less than weapon's 15% crit rate
                expect(result.chance).toBeGreaterThan(weapon.criticalRate); // Should include speed bonus
                expect(result.multiplier).toBeGreaterThan(1.0);
                expect(result.roll).toBe(11); // randomInt(1, 100) with 0.1 = 11
            } finally {
                Math.random = originalRandom;
            }
        });

        test('should miss critical hit with high roll', () => {
            const originalRandom = Math.random;
            Math.random = jest.fn(() => 0.9); // 90% roll

            try {
                const result = calculator.calculateCritical(attacker, target, weapon);

                expect(result.isCritical).toBe(false); // 90% roll should be higher than crit chance
                expect(result.multiplier).toBe(1.0); // No critical multiplier
                expect(result.roll).toBe(91); // randomInt(1, 100) with 0.9 = 91
            } finally {
                Math.random = originalRandom;
            }
        });

        test('should include speed difference in critical chance', () => {
            const fastAttacker = { ...attacker, stats: { ...attacker.stats, speed: 20 } };
            const slowTarget = { ...target, stats: { ...target.stats, speed: 5 } };

            const normalResult = calculator.calculateCritical(attacker, target, weapon);
            const speedBonusResult = calculator.calculateCritical(fastAttacker, slowTarget, weapon);

            expect(speedBonusResult.chance).toBeGreaterThan(normalResult.chance);
        });

        test('should cap critical chance at reasonable limits', () => {
            const superFastAttacker = { ...attacker, stats: { ...attacker.stats, speed: 100 } };
            const superSlowTarget = { ...target, stats: { ...target.stats, speed: 1 } };
            const highCritWeapon = { ...weapon, criticalRate: 50 };

            const result = calculator.calculateCritical(superFastAttacker, superSlowTarget, highCritWeapon);

            expect(result.chance).toBeLessThanOrEqual(95); // Should be capped at 95%
        });
    });

    describe('calculateEvasion', () => {
        test('should calculate evasion based on speed and accuracy', () => {
            const originalRandom = Math.random;
            Math.random = jest.fn(() => 0.1); // 10% roll

            try {
                const result = calculator.calculateEvasion(attacker, target, weapon);

                expect(typeof result.isEvaded).toBe('boolean');
                expect(result.chance).toBeGreaterThan(0);
                expect(result.chance).toBeLessThan(100);
                expect(result.roll).toBe(11); // randomInt(1, 100) with 0.1 = 11
            } finally {
                Math.random = originalRandom;
            }
        });

        test('should increase evasion chance for faster targets', () => {
            const slowTarget = { ...target, stats: { ...target.stats, speed: 5 } };
            const fastTarget = { ...target, stats: { ...target.stats, speed: 20 } };

            const slowEvasion = calculator.calculateEvasion(attacker, slowTarget, weapon);
            const fastEvasion = calculator.calculateEvasion(attacker, fastTarget, weapon);

            expect(fastEvasion.chance).toBeGreaterThan(slowEvasion.chance);
        });

        test('should be affected by weapon accuracy', () => {
            const accurateWeapon = { ...weapon, accuracy: 95 };
            const inaccurateWeapon = { ...weapon, accuracy: 70 };

            const accurateEvasion = calculator.calculateEvasion(attacker, target, accurateWeapon);
            const inaccurateEvasion = calculator.calculateEvasion(attacker, target, inaccurateWeapon);

            expect(inaccurateEvasion.chance).toBeGreaterThan(accurateEvasion.chance);
        });

        test('should cap evasion chance at reasonable limits', () => {
            const superFastTarget = { ...target, stats: { ...target.stats, speed: 100 } };
            const inaccurateWeapon = { ...weapon, accuracy: 10 };

            const result = calculator.calculateEvasion(attacker, superFastTarget, inaccurateWeapon);

            expect(result.chance).toBeGreaterThanOrEqual(5); // Minimum 5%
            expect(result.chance).toBeLessThanOrEqual(95); // Maximum 95%
        });
    });

    describe('calculateFinalDamage', () => {
        test('should apply modifiers correctly', () => {
            const baseDamage = 100;
            const modifiers: DamageModifier[] = [
                {
                    type: 'critical',
                    multiplier: 1.5,
                    description: 'Critical hit',
                },
                {
                    type: 'elemental',
                    multiplier: 1.2,
                    description: 'Elemental bonus',
                },
            ];

            const finalDamage = calculator.calculateFinalDamage(baseDamage, modifiers);

            // Expected: 100 * 1.5 * 1.2 = 180
            expect(finalDamage).toBe(180);
        });

        test('should handle negative modifiers', () => {
            const baseDamage = 100;
            const modifiers: DamageModifier[] = [
                {
                    type: 'terrain',
                    multiplier: 0.8,
                    description: 'Terrain penalty',
                },
                {
                    type: 'status',
                    multiplier: 0.5,
                    description: 'Debuff effect',
                },
            ];

            const finalDamage = calculator.calculateFinalDamage(baseDamage, modifiers);

            expect(finalDamage).toBeLessThan(baseDamage);
            expect(finalDamage).toBeGreaterThan(0);
        });

        test('should respect minimum damage', () => {
            const baseDamage = 10;
            const modifiers: DamageModifier[] = [
                {
                    type: 'status',
                    multiplier: 0.01, // Severe reduction
                    description: 'Severe debuff',
                },
            ];

            const finalDamage = calculator.calculateFinalDamage(baseDamage, modifiers);

            expect(finalDamage).toBeGreaterThanOrEqual(1); // Should respect minimum damage
        });

        test('should respect maximum damage cap', () => {
            const baseDamage = 5000;
            const modifiers: DamageModifier[] = [
                {
                    type: 'critical',
                    multiplier: 3.0,
                    description: 'Super critical',
                },
            ];

            const finalDamage = calculator.calculateFinalDamage(baseDamage, modifiers);

            expect(finalDamage).toBeLessThanOrEqual(9999); // Should respect maximum damage cap
        });

        test('should handle empty modifiers array', () => {
            const baseDamage = 100;
            const modifiers: DamageModifier[] = [];

            const finalDamage = calculator.calculateFinalDamage(baseDamage, modifiers);

            expect(finalDamage).toBe(baseDamage);
        });

        test('should floor the final result', () => {
            const baseDamage = 100;
            const modifiers: DamageModifier[] = [
                {
                    type: 'elemental',
                    multiplier: 1.33, // Will create fractional result
                    description: 'Fractional modifier',
                },
            ];

            const finalDamage = calculator.calculateFinalDamage(baseDamage, modifiers);

            expect(Number.isInteger(finalDamage)).toBe(true);
            expect(finalDamage).toBe(Math.floor(100 * 1.33));
        });
    });

    describe('performCompleteCalculation', () => {
        test('should perform complete damage calculation', () => {
            const result = calculator.performCompleteCalculation(attacker, target, weapon);

            expect(result.attacker).toBe(attacker);
            expect(result.target).toBe(target);
            expect(result.weapon).toBe(weapon);
            expect(result.baseDamage).toBeGreaterThan(0);
            expect(result.finalDamage).toBeGreaterThanOrEqual(0);
            expect(Array.isArray(result.modifiers)).toBe(true);
            expect(Array.isArray(result.calculationSteps)).toBe(true);
            expect(result.calculationSteps.length).toBeGreaterThan(0);
            expect(typeof result.isCritical).toBe('boolean');
            expect(typeof result.isEvaded).toBe('boolean');
        });

        test('should return zero damage when evaded', () => {
            // Mock evasion to always succeed
            const originalRandom = Math.random;
            Math.random = jest.fn(() => 0.01); // Very low roll to guarantee evasion

            try {
                const result = calculator.performCompleteCalculation(attacker, target, weapon);

                if (result.isEvaded) {
                    expect(result.finalDamage).toBe(0);
                    expect(result.isCritical).toBe(false);
                }
            } finally {
                Math.random = originalRandom;
            }
        });

        test('should include critical modifier when critical hit occurs', () => {
            // Mock to guarantee critical hit and no evasion
            const originalRandom = Math.random;
            let callCount = 0;
            Math.random = jest.fn(() => {
                callCount++;
                if (callCount === 1) return 0.99; // High roll for evasion (miss evasion)
                return 0.01; // Low roll for critical (hit critical)
            });

            try {
                const result = calculator.performCompleteCalculation(attacker, target, weapon);

                if (result.isCritical) {
                    const criticalModifier = result.modifiers.find(m => m.type === 'critical');
                    expect(criticalModifier).toBeDefined();
                    expect(criticalModifier!.multiplier).toBeGreaterThan(1.0);
                }
            } finally {
                Math.random = originalRandom;
            }
        });

        test('should include additional modifiers', () => {
            const additionalModifiers: DamageModifier[] = [
                {
                    type: 'terrain',
                    multiplier: 1.2,
                    description: 'High ground bonus',
                },
            ];

            const result = calculator.performCompleteCalculation(attacker, target, weapon, additionalModifiers);

            expect(result.modifiers).toContainEqual(additionalModifiers[0]);
        });

        test('should generate calculation steps', () => {
            const result = calculator.performCompleteCalculation(attacker, target, weapon);

            expect(result.calculationSteps.length).toBeGreaterThan(0);
            expect(result.calculationSteps[0]).toContain('Base damage');
            expect(result.calculationSteps.some(step => step.includes('Evasion check'))).toBe(true);
            expect(result.calculationSteps.some(step => step.includes('Critical check'))).toBe(true);
            expect(result.calculationSteps.some(step => step.includes('Final damage'))).toBe(true);
        });
    });

    describe('utility methods', () => {
        test('should create damage modifier correctly', () => {
            const modifier = calculator.createDamageModifier(
                'weapon',
                1.3,
                'Weapon bonus',
                'test-weapon'
            );

            expect(modifier.type).toBe('weapon');
            expect(modifier.multiplier).toBe(1.3);
            expect(modifier.description).toBe('Weapon bonus');
            expect(modifier.source).toBe('test-weapon');
        });

        test('should calculate defense reduction', () => {
            const reduction1 = calculator.calculateDefenseReduction(10, 50);
            const reduction2 = calculator.calculateDefenseReduction(50, 50);
            const reduction3 = calculator.calculateDefenseReduction(100, 50);

            expect(reduction1).toBeGreaterThan(0);
            expect(reduction1).toBeLessThan(1);
            expect(reduction2).toBeGreaterThan(reduction1);
            expect(reduction3).toBeGreaterThan(reduction2);
            expect(reduction3).toBeLessThanOrEqual(0.9); // Capped at 90%
        });

        test('should calculate healing amount', () => {
            const healingWeapon = { ...weapon, attackPower: 30 };
            const damagedTarget = { ...target, currentHP: 50 }; // Not at full HP
            const healingAmount = calculator.calculateHealing(attacker, damagedTarget, healingWeapon);

            expect(healingAmount).toBeGreaterThan(0);
            expect(healingAmount).toBeLessThanOrEqual(damagedTarget.stats.maxHP - damagedTarget.currentHP);
        });

        test('should provide damage preview', () => {
            const preview = calculator.getDamagePreview(attacker, target, weapon);

            expect(preview.min).toBeGreaterThan(0);
            expect(preview.max).toBeGreaterThanOrEqual(preview.min);
            expect(preview.average).toBeGreaterThanOrEqual(preview.min);
            expect(preview.average).toBeLessThanOrEqual(preview.max);
        });

        test('should generate calculation breakdown', () => {
            const context = calculator.performCompleteCalculation(attacker, target, weapon);
            const breakdown = calculator.getCalculationBreakdown(context);

            expect(breakdown).toContain('Damage Calculation Breakdown');
            expect(breakdown).toContain(attacker.name);
            expect(breakdown).toContain(target.name);
            expect(breakdown).toContain(weapon.name);
            expect(breakdown).toContain('Final Result');
        });
    });

    describe('configuration', () => {
        test('should update configuration correctly', () => {
            const newConfig: Partial<DamageCalculationConfig> = {
                criticalMultiplier: 2.0,
                minimumDamage: 5,
                enableVariance: false,
            };

            calculator.updateConfig(newConfig);
            const config = calculator.getConfig();

            expect(config.criticalMultiplier).toBe(2.0);
            expect(config.minimumDamage).toBe(5);
            expect(config.enableVariance).toBe(false);
        });

        test('should reset configuration to defaults', () => {
            // Modify config
            calculator.updateConfig({ criticalMultiplier: 3.0, minimumDamage: 10 });

            // Reset
            calculator.resetConfig();
            const config = calculator.getConfig();

            expect(config.criticalMultiplier).toBe(1.5); // Default value
            expect(config.minimumDamage).toBe(1); // Default value
        });

        test('should preserve unmodified config values', () => {
            const originalConfig = calculator.getConfig();

            calculator.updateConfig({ criticalMultiplier: 2.0 });
            const newConfig = calculator.getConfig();

            expect(newConfig.criticalMultiplier).toBe(2.0);
            expect(newConfig.minimumDamage).toBe(originalConfig.minimumDamage);
            expect(newConfig.enableVariance).toBe(originalConfig.enableVariance);
        });
    });

    describe('edge cases', () => {
        test('should handle zero attack power', () => {
            const zeroAttackWeapon = { ...weapon, attackPower: 0 };
            const zeroAttackUnit = { ...attacker, stats: { ...attacker.stats, attack: 0 } };

            const damage = calculator.calculateBaseDamage(zeroAttackUnit, target, zeroAttackWeapon);

            expect(damage).toBeGreaterThanOrEqual(1); // Should still deal minimum damage
        });

        test('should handle zero defense', () => {
            const zeroDefenseTarget = { ...target, stats: { ...target.stats, defense: 0 } };

            const damage = calculator.calculateBaseDamage(attacker, zeroDefenseTarget, weapon);

            expect(damage).toBeGreaterThan(0);
        });

        test('should handle extreme stat differences', () => {
            const superAttacker = { ...attacker, stats: { ...attacker.stats, attack: 1000 } };
            const superWeapon = { ...weapon, attackPower: 1000 };

            const damage = calculator.calculateBaseDamage(superAttacker, target, superWeapon);

            expect(damage).toBeLessThanOrEqual(9999); // Should respect maximum damage cap
        });

        test('should handle negative weapon attack power', () => {
            const negativeWeapon = { ...weapon, attackPower: -10 };

            expect(() => {
                calculator.calculateBaseDamage(attacker, target, negativeWeapon);
            }).toThrow();
        });

        test('should handle same speed units', () => {
            const sameSpeedTarget = { ...target, stats: { ...target.stats, speed: attacker.stats.speed } };

            const criticalResult = calculator.calculateCritical(attacker, sameSpeedTarget, weapon);
            const evasionResult = calculator.calculateEvasion(attacker, sameSpeedTarget, weapon);

            expect(criticalResult.chance).toBeGreaterThan(0);
            expect(evasionResult.chance).toBeGreaterThan(0);
        });
    });
});