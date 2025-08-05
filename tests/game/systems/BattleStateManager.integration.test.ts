/**
 * Integration tests for BattleStateManager
 * Tests integration with other battle system components
 */

import { BattleStateManager } from '../../../game/src/systems/BattleStateManager';
import { DamageCalculator } from '../../../game/src/systems/DamageCalculator';
import { Unit } from '../../../game/src/types/gameplay';
import { BattleResult, BattleUnit, Element, WeaponType } from '../../../game/src/types/battle';

// Mock Phaser EventEmitter
class MockEventEmitter {
    private events: { [key: string]: Function[] } = {};

    emit(event: string, data?: any): void {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }

    on(event: string, callback: Function): void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }
}

describe('BattleStateManager Integration', () => {
    let battleStateManager: BattleStateManager;
    let damageCalculator: DamageCalculator;
    let mockEventEmitter: MockEventEmitter;
    let playerUnit: BattleUnit;
    let enemyUnit: BattleUnit;

    beforeEach(() => {
        mockEventEmitter = new MockEventEmitter();
        battleStateManager = new BattleStateManager(mockEventEmitter as any);
        damageCalculator = new DamageCalculator();

        // Create mock battle units
        playerUnit = {
            id: 'player-1',
            name: 'Test Player',
            position: { x: 0, y: 0 },
            stats: {
                maxHP: 100,
                maxMP: 50,
                attack: 20,
                defense: 15,
                speed: 10,
                movement: 3,
            },
            currentHP: 100,
            currentMP: 50,
            faction: 'player',
            hasActed: false,
            hasMoved: false,
            weapon: {
                id: 'sword-1',
                name: 'Test Sword',
                type: WeaponType.SWORD,
                attackPower: 25,
                range: 1,
                rangePattern: {
                    type: 'single',
                    range: 1,
                    pattern: [{ x: 0, y: 0 }],
                },
                element: Element.NONE,
                criticalRate: 10,
                accuracy: 90,
                specialEffects: [],
                description: 'A test sword',
            },
            statusEffects: [],
            battleStats: {
                totalDamageDealt: 0,
                totalDamageReceived: 0,
                criticalHitsLanded: 0,
                criticalHitsReceived: 0,
                attacksLanded: 0,
                attacksMissed: 0,
                attacksEvaded: 0,
                unitsDefeated: 0,
                experienceGained: 0,
                battlesParticipated: 0,
            },
            canAttack: true,
            attacksRemaining: 1,
        };

        enemyUnit = {
            id: 'enemy-1',
            name: 'Test Enemy',
            position: { x: 5, y: 5 },
            stats: {
                maxHP: 120, // Higher than player to ensure positive experience multiplier
                maxMP: 30,
                attack: 18,
                defense: 12,
                speed: 8,
                movement: 2,
            },
            currentHP: 120,
            currentMP: 30,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false,
            weapon: {
                id: 'axe-1',
                name: 'Test Axe',
                type: WeaponType.AXE,
                attackPower: 22,
                range: 1,
                rangePattern: {
                    type: 'single',
                    range: 1,
                    pattern: [{ x: 0, y: 0 }],
                },
                element: Element.NONE,
                criticalRate: 15,
                accuracy: 85,
                specialEffects: [],
                description: 'A test axe',
            },
            statusEffects: [],
            battleStats: {
                totalDamageDealt: 0,
                totalDamageReceived: 0,
                criticalHitsLanded: 0,
                criticalHitsReceived: 0,
                attacksLanded: 0,
                attacksMissed: 0,
                attacksEvaded: 0,
                unitsDefeated: 0,
                experienceGained: 0,
                battlesParticipated: 0,
            },
            canAttack: true,
            attacksRemaining: 1,
        };
    });

    describe('complete battle flow integration', () => {
        test('should handle complete battle sequence with damage calculation', () => {
            // Calculate damage using DamageCalculator
            const baseDamage = damageCalculator.calculateBaseDamage(playerUnit, enemyUnit, playerUnit.weapon!);
            const finalDamage = damageCalculator.calculateFinalDamage(baseDamage, []);

            // Create battle result
            const battleResult: BattleResult = {
                attacker: playerUnit,
                target: enemyUnit,
                weapon: playerUnit.weapon!,
                baseDamage: baseDamage,
                finalDamage: finalDamage,
                modifiers: [],
                isCritical: false,
                isEvaded: false,
                experienceGained: 0,
                targetDefeated: false,
                effectsApplied: [],
                timestamp: Date.now(),
            };

            // Apply damage
            const damageResult = battleStateManager.applyDamage(enemyUnit, finalDamage);
            expect(damageResult.success).toBe(true);
            expect(enemyUnit.currentHP).toBe(enemyUnit.stats.maxHP - finalDamage);

            // Record battle result
            const recordResult = battleStateManager.recordBattleResult(battleResult);
            expect(recordResult.success).toBe(true);

            // Grant experience
            const expResult = battleStateManager.grantExperience(playerUnit, 50, battleResult);
            expect(expResult.success).toBe(true);

            // Update post-battle state
            const postBattleResult = battleStateManager.updatePostBattle(battleResult, [playerUnit, enemyUnit]);
            expect(postBattleResult.success).toBe(true);

            // Verify statistics were updated
            const stats = battleStateManager.getBattleStatsSummary();
            expect(stats.totalBattles).toBe(1);
            expect(stats.totalDamageDealt).toBe(finalDamage);
            expect(playerUnit.battleStats.totalDamageDealt).toBe(finalDamage);
            expect(enemyUnit.battleStats.totalDamageReceived).toBe(finalDamage);
        });

        test('should handle unit defeat and experience granting', () => {
            // Set enemy to low HP
            enemyUnit.currentHP = 10;

            // Calculate lethal damage
            const baseDamage = damageCalculator.calculateBaseDamage(playerUnit, enemyUnit, playerUnit.weapon!);
            const finalDamage = Math.max(baseDamage, enemyUnit.currentHP + 5); // Ensure lethal

            // Create battle result with defeat
            const battleResult: BattleResult = {
                attacker: playerUnit,
                target: enemyUnit,
                weapon: playerUnit.weapon!,
                baseDamage: baseDamage,
                finalDamage: finalDamage,
                modifiers: [],
                isCritical: false,
                isEvaded: false,
                experienceGained: 0,
                targetDefeated: true,
                effectsApplied: [],
                timestamp: Date.now(),
            };

            // Track events
            let unitDefeatedEmitted = false;
            let experienceGrantedEmitted = false;
            let victoryConditionEmitted = false;

            mockEventEmitter.on('unit-defeated', () => {
                unitDefeatedEmitted = true;
            });

            mockEventEmitter.on('experience-granted', () => {
                experienceGrantedEmitted = true;
            });

            mockEventEmitter.on('battle-victory-condition-met', () => {
                victoryConditionEmitted = true;
            });

            // Apply lethal damage
            const damageResult = battleStateManager.applyDamage(enemyUnit, finalDamage);
            expect(damageResult.success).toBe(true);
            expect(enemyUnit.currentHP).toBe(0);
            expect(unitDefeatedEmitted).toBe(true);

            // Record battle result
            const recordResult = battleStateManager.recordBattleResult(battleResult);
            expect(recordResult.success).toBe(true);

            // Grant experience with defeat bonus
            const expResult = battleStateManager.grantExperience(playerUnit, 50, battleResult);
            expect(expResult.success).toBe(true);
            expect(experienceGrantedEmitted).toBe(true);

            // Update post-battle state (should trigger victory condition)
            const postBattleResult = battleStateManager.updatePostBattle(battleResult, [playerUnit, enemyUnit]);
            expect(postBattleResult.success).toBe(true);
            expect(victoryConditionEmitted).toBe(true);

            // Verify defeated unit state
            expect(enemyUnit.hasActed).toBe(true);
            expect(enemyUnit.hasMoved).toBe(true);
            expect(enemyUnit.canAttack).toBe(false);
            expect(enemyUnit.attacksRemaining).toBe(0);

            // Verify experience includes defeat bonus
            const expConfig = battleStateManager.getExperienceConfig();
            expect((playerUnit as any).experience).toBeGreaterThanOrEqual(50 + expConfig.defeatExperience);
        });

        test('should handle critical hit battle with bonus experience', () => {
            // Create critical hit battle result
            const battleResult: BattleResult = {
                attacker: playerUnit,
                target: enemyUnit,
                weapon: playerUnit.weapon!,
                baseDamage: 20,
                finalDamage: 30, // Critical damage
                modifiers: [
                    {
                        type: 'critical',
                        multiplier: 1.5,
                        description: 'Critical hit',
                    },
                ],
                isCritical: true,
                isEvaded: false,
                experienceGained: 0,
                targetDefeated: false,
                effectsApplied: [],
                timestamp: Date.now(),
            };

            // Apply damage
            const damageResult = battleStateManager.applyDamage(enemyUnit, battleResult.finalDamage);
            expect(damageResult.success).toBe(true);

            // Record battle result
            const recordResult = battleStateManager.recordBattleResult(battleResult);
            expect(recordResult.success).toBe(true);

            // Grant experience (should include critical bonus)
            const expResult = battleStateManager.grantExperience(playerUnit, 50, battleResult);
            expect(expResult.success).toBe(true);

            // Verify critical hit statistics
            expect(playerUnit.battleStats.criticalHitsLanded).toBe(1);
            expect(enemyUnit.battleStats.criticalHitsReceived).toBe(1);

            // Verify experience bonus for critical hit
            expect((playerUnit as any).experience).toBeGreaterThan(50);

            const stats = battleStateManager.getBattleStatsSummary();
            expect(stats.criticalHits).toBe(1);
        });

        test('should handle status effects during post-battle processing', () => {
            // Add poison status effect to player
            playerUnit.statusEffects = [
                {
                    id: 'poison-1',
                    type: 'poison',
                    name: 'Poison',
                    description: 'Taking poison damage',
                    duration: 2,
                    power: 5,
                    source: 'enemy-attack',
                    stackable: false,
                },
            ];

            // Create battle result
            const battleResult: BattleResult = {
                attacker: playerUnit,
                target: enemyUnit,
                weapon: playerUnit.weapon!,
                baseDamage: 20,
                finalDamage: 25,
                modifiers: [],
                isCritical: false,
                isEvaded: false,
                experienceGained: 0,
                targetDefeated: false,
                effectsApplied: [],
                timestamp: Date.now(),
            };

            const initialHP = playerUnit.currentHP;

            // Update post-battle state (should process status effects)
            const postBattleResult = battleStateManager.updatePostBattle(battleResult, [playerUnit, enemyUnit]);
            expect(postBattleResult.success).toBe(true);

            // Verify poison damage was applied
            expect(playerUnit.currentHP).toBe(initialHP - 5);

            // Verify status effect duration was reduced
            expect(playerUnit.statusEffects[0].duration).toBe(1);
        });

        test('should handle multiple battles and maintain statistics', () => {
            const battles = 3;
            let totalDamage = 0;

            for (let i = 0; i < battles; i++) {
                const damage = 15 + i * 5; // Varying damage
                totalDamage += damage;

                const battleResult: BattleResult = {
                    attacker: playerUnit,
                    target: enemyUnit,
                    weapon: playerUnit.weapon!,
                    baseDamage: damage,
                    finalDamage: damage,
                    modifiers: [],
                    isCritical: i === 1, // Second battle is critical
                    isEvaded: false,
                    experienceGained: 0,
                    targetDefeated: false,
                    effectsApplied: [],
                    timestamp: Date.now() + i,
                };

                // Apply damage
                battleStateManager.applyDamage(enemyUnit, damage);

                // Record battle result
                battleStateManager.recordBattleResult(battleResult);

                // Grant experience
                battleStateManager.grantExperience(playerUnit, 30, battleResult);
            }

            // Verify accumulated statistics
            const stats = battleStateManager.getBattleStatsSummary();
            expect(stats.totalBattles).toBe(battles);
            expect(stats.totalDamageDealt).toBe(totalDamage);
            expect(stats.criticalHits).toBe(1);
            expect(stats.averageDamagePerBattle).toBe(totalDamage / battles);

            // Verify unit statistics
            expect(playerUnit.battleStats.totalDamageDealt).toBe(totalDamage);
            expect(playerUnit.battleStats.battlesParticipated).toBe(battles);
            expect(playerUnit.battleStats.criticalHitsLanded).toBe(1);

            // Verify battle history
            const history = battleStateManager.getBattleHistory();
            expect(history).toHaveLength(battles);

            // Verify recent battles
            const recent = battleStateManager.getRecentBattles(2);
            expect(recent).toHaveLength(2);
            expect(recent[1].finalDamage).toBe(25); // Last battle damage
        });
    });

    describe('error handling in integration scenarios', () => {
        test('should handle invalid battle sequence gracefully', () => {
            // Try to grant experience to defeated unit
            enemyUnit.currentHP = 0;
            const expResult = battleStateManager.grantExperience(enemyUnit, 50);
            expect(expResult.success).toBe(false);

            // Try to apply negative damage
            const damageResult = battleStateManager.applyDamage(playerUnit, -10);
            expect(damageResult.success).toBe(false);

            // Try to record invalid battle result
            const invalidResult = {
                attacker: null,
                target: enemyUnit,
            };
            const recordResult = battleStateManager.recordBattleResult(invalidResult as any);
            expect(recordResult.success).toBe(false);

            // Verify no statistics were corrupted
            const stats = battleStateManager.getBattleStatsSummary();
            expect(stats.totalBattles).toBe(0);
            expect(stats.totalDamageDealt).toBe(0);
        });

        test('should maintain consistency after errors', () => {
            // Perform valid battle first
            const validBattleResult: BattleResult = {
                attacker: playerUnit,
                target: enemyUnit,
                weapon: playerUnit.weapon!,
                baseDamage: 20,
                finalDamage: 25,
                modifiers: [],
                isCritical: false,
                isEvaded: false,
                experienceGained: 0,
                targetDefeated: false,
                effectsApplied: [],
                timestamp: Date.now(),
            };

            battleStateManager.applyDamage(enemyUnit, 25);
            battleStateManager.recordBattleResult(validBattleResult);
            battleStateManager.grantExperience(playerUnit, 50, validBattleResult);

            // Attempt invalid operations
            battleStateManager.applyDamage(null as any, 10);
            battleStateManager.recordBattleResult(null as any);

            // Verify valid data is still intact
            const stats = battleStateManager.getBattleStatsSummary();
            expect(stats.totalBattles).toBe(1);
            expect(stats.totalDamageDealt).toBe(25);

            const history = battleStateManager.getBattleHistory();
            expect(history).toHaveLength(1);
            expect(history[0]).toEqual(validBattleResult);

            // Experience should be greater than base amount due to level difference multiplier
            expect((playerUnit as any).experience).toBeGreaterThan(50);
            expect(enemyUnit.currentHP).toBe(enemyUnit.stats.maxHP - 25);
        });
    });
});