/**
 * 職業システムと戦闘システムの統合テスト
 * 
 * このテストファイルは以下の統合機能をテストします：
 * - ボス撃破時の薔薇の力獲得処理
 * - 職業による戦闘能力修正
 * - 職業特性の戦闘への適用
 * - 薔薇の力獲得演出の統合
 */

import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { JobSystem } from '../../game/src/systems/jobs/JobSystem';
import { BattleJobIntegration } from '../../game/src/systems/jobs/BattleJobIntegration';
import { Unit } from '../../game/src/types/gameplay';
import { Weapon, WeaponType, Element } from '../../game/src/types/battle';
import { JobCategory } from '../../game/src/types/job';

// Mock Phaser scene
class MockScene extends Phaser.Events.EventEmitter {
    public cameras = {
        main: {
            centerX: 400,
            centerY: 300
        }
    };

    public add = {
        text: jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }),
        circle: jest.fn().mockReturnValue({
            destroy: jest.fn()
        }),
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn(),
            lineStyle: jest.fn(),
            fillRect: jest.fn(),
            strokeRect: jest.fn()
        })
    };

    public tweens = {
        add: jest.fn().mockImplementation((config) => {
            // Simulate immediate completion for tests
            setTimeout(() => {
                if (config.onComplete) {
                    config.onComplete();
                }
            }, 0);
        })
    };

    public time = {
        delayedCall: jest.fn().mockImplementation((delay, callback) => {
            setTimeout(callback, 0); // Immediate execution for tests
        })
    };

    public sound = {
        exists: jest.fn().mockReturnValue(false),
        play: jest.fn()
    };
}

describe('JobBattleSystemIntegration', () => {
    let battleSystem: BattleSystem;
    let jobSystem: JobSystem;
    let battleJobIntegration: BattleJobIntegration;
    let mockScene: MockScene;

    // Test units
    let playerWarrior: Unit;
    let enemyBoss: Unit;
    let testWeapon: Weapon;

    beforeEach(async () => {
        // Create mock scene
        mockScene = new MockScene() as any;

        // Initialize systems
        battleSystem = new BattleSystem(mockScene as any);
        jobSystem = new JobSystem();

        // Initialize job system
        await jobSystem.initialize(mockScene as any);

        // Set up battle-job integration
        battleSystem.setJobSystem(jobSystem);
        battleJobIntegration = new BattleJobIntegration(jobSystem, mockScene as any);

        // Create test units
        playerWarrior = {
            id: 'warrior_1',
            name: 'Test Warrior',
            position: { x: 1, y: 1 },
            stats: {
                maxHP: 100,
                maxMP: 20,
                attack: 25,
                defense: 20,
                speed: 15,
                skill: 10,
                luck: 8,
                movement: 3
            },
            currentHP: 100,
            currentMP: 20,
            faction: 'player',
            hasActed: false,
            hasMoved: false
        };

        enemyBoss = {
            id: 'boss_1',
            name: '魔性の薔薇ボス',
            position: { x: 5, y: 5 },
            stats: {
                maxHP: 300,
                maxMP: 50,
                attack: 35,
                defense: 25,
                speed: 10,
                skill: 15,
                luck: 5,
                movement: 2
            },
            currentHP: 300,
            currentMP: 50,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false,
            isBoss: true
        } as any;

        testWeapon = {
            id: 'sword_1',
            name: 'Test Sword',
            type: WeaponType.SWORD,
            attackPower: 20,
            range: 1,
            rangePattern: {
                type: 'single',
                range: 1,
                pattern: [{ x: 0, y: 0 }]
            },
            element: Element.NONE,
            criticalRate: 10,
            accuracy: 85,
            specialEffects: [],
            description: 'A test sword'
        };

        // Set up warrior job for player
        jobSystem.setCharacterJob(playerWarrior.id, 'warrior', 2);
    });

    afterEach(() => {
        battleSystem.destroy?.();
        jobSystem.destroy?.();
        battleJobIntegration.destroy?.();
    });

    describe('Boss Defeat and Rose Essence Gain', () => {
        test('should award rose essence when boss is defeated', async () => {
            // Arrange
            const initialRoseEssence = jobSystem.getCurrentRoseEssence();
            const bossInfo = {
                id: enemyBoss.id,
                name: enemyBoss.name,
                type: 'major_boss' as const,
                roseEssenceReward: 15,
                isFirstTimeDefeat: true
            };

            // Act
            const gainedAmount = await battleJobIntegration.handleBossDefeat(bossInfo, playerWarrior);

            // Assert
            expect(gainedAmount).toBeGreaterThan(0);
            expect(jobSystem.getCurrentRoseEssence()).toBe(initialRoseEssence + gainedAmount);
        });

        test('should emit rose essence gained event', async () => {
            // Arrange
            const eventSpy = jest.fn();
            battleJobIntegration.on('rose_essence_gained', eventSpy);

            const bossInfo = {
                id: enemyBoss.id,
                name: enemyBoss.name,
                type: 'chapter_boss' as const,
                roseEssenceReward: 25,
                isFirstTimeDefeat: true
            };

            // Act
            await battleJobIntegration.handleBossDefeat(bossInfo, playerWarrior);

            // Assert
            expect(eventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    amount: expect.any(Number),
                    bossInfo: expect.objectContaining({
                        id: enemyBoss.id,
                        name: enemyBoss.name
                    })
                })
            );
        });

        test('should check for rank up candidates after boss defeat', async () => {
            // Arrange
            const eventSpy = jest.fn();
            battleJobIntegration.on('rank_up_available', eventSpy);

            // Add enough rose essence to make rank up possible
            await jobSystem.awardRoseEssence(50, 'test_setup');

            const bossInfo = {
                id: enemyBoss.id,
                name: enemyBoss.name,
                type: 'final_boss' as const,
                roseEssenceReward: 50,
                isFirstTimeDefeat: true
            };

            // Act
            await battleJobIntegration.handleBossDefeat(bossInfo, playerWarrior);

            // Assert - Should emit rank up available if candidates exist
            const candidates = jobSystem.getRankUpCandidates();
            if (candidates.length > 0) {
                expect(eventSpy).toHaveBeenCalled();
            }
        });
    });

    describe('Job Battle Modifications', () => {
        test('should apply job stat modifiers to battle', () => {
            // Act
            const modifications = battleJobIntegration.applyJobBattleModifications(
                playerWarrior,
                testWeapon,
                enemyBoss
            );

            // Assert
            expect(modifications).toHaveProperty('statModifiers');
            expect(modifications).toHaveProperty('damageModifiers');
            expect(modifications).toHaveProperty('accuracyModifier');
            expect(modifications).toHaveProperty('criticalRateModifier');
            expect(modifications).toHaveProperty('evasionModifier');
            expect(modifications).toHaveProperty('specialEffects');
        });

        test('should provide weapon compatibility bonuses for warrior with sword', () => {
            // Act
            const modifications = battleJobIntegration.applyJobBattleModifications(
                playerWarrior,
                testWeapon,
                enemyBoss
            );

            // Assert - Warriors should have good compatibility with swords
            const weaponModifiers = modifications.damageModifiers.filter(
                mod => mod.type === 'weapon' && mod.multiplier > 1.0
            );
            expect(weaponModifiers.length).toBeGreaterThan(0);
        });

        test('should apply rank-based damage bonuses', () => {
            // Arrange - Set warrior to rank 3
            jobSystem.setCharacterJob(playerWarrior.id, 'warrior', 3);

            // Act
            const modifications = battleJobIntegration.applyJobBattleModifications(
                playerWarrior,
                testWeapon,
                enemyBoss
            );

            // Assert - Should have rank-based damage bonus
            const rankModifiers = modifications.damageModifiers.filter(
                mod => mod.description.includes('ランク')
            );
            expect(rankModifiers.length).toBeGreaterThan(0);
        });

        test('should emit job battle modification applied event', () => {
            // Arrange
            const eventSpy = jest.fn();
            battleJobIntegration.on('job_battle_modification_applied', eventSpy);

            // Act
            battleJobIntegration.applyJobBattleModifications(
                playerWarrior,
                testWeapon,
                enemyBoss
            );

            // Assert
            expect(eventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    unit: playerWarrior,
                    job: expect.any(Object),
                    modification: expect.any(Object)
                })
            );
        });
    });

    describe('Job Effects on Battle Results', () => {
        test('should apply job effects to battle result', () => {
            // Arrange
            const battleResult = {
                attacker: playerWarrior,
                target: enemyBoss,
                weapon: testWeapon,
                baseDamage: 30,
                finalDamage: 30,
                modifiers: [],
                isCritical: false,
                isEvaded: false,
                experienceGained: 10,
                targetDefeated: false,
                effectsApplied: [],
                timestamp: Date.now()
            };

            // Act
            const modifiedResult = battleJobIntegration.applyJobEffectsToBattleResult(battleResult);

            // Assert
            expect(modifiedResult).toBeDefined();
            expect(modifiedResult.experienceGained).toBeGreaterThanOrEqual(battleResult.experienceGained);
        });

        test('should add job experience bonus to battle result', () => {
            // Arrange
            const initialExp = 10;
            const battleResult = {
                attacker: playerWarrior,
                target: enemyBoss,
                weapon: testWeapon,
                baseDamage: 30,
                finalDamage: 30,
                modifiers: [],
                isCritical: false,
                isEvaded: false,
                experienceGained: initialExp,
                targetDefeated: false,
                effectsApplied: [],
                timestamp: Date.now()
            };

            // Act
            const modifiedResult = battleJobIntegration.applyJobEffectsToBattleResult(battleResult);

            // Assert - Should have additional experience from job bonus
            expect(modifiedResult.experienceGained).toBeGreaterThan(initialExp);
        });
    });

    describe('Rose Essence Gain Effects', () => {
        test('should integrate rose essence gain effect', async () => {
            // Arrange
            const gainEvent = {
                amount: 20,
                source: {
                    type: 'boss_defeat' as const,
                    sourceId: 'boss_1',
                    bossId: 'boss_1'
                },
                bossInfo: {
                    id: 'boss_1',
                    name: 'Test Boss',
                    type: 'major_boss' as const,
                    roseEssenceReward: 20,
                    isFirstTimeDefeat: true
                },
                position: { x: 100, y: 100 },
                showAnimation: true
            };

            // Act & Assert - Should not throw
            await expect(
                battleJobIntegration.integrateRoseEssenceGainEffect(gainEvent)
            ).resolves.not.toThrow();
        });

        test('should emit rose essence effect completed event', async () => {
            // Arrange
            const eventSpy = jest.fn();
            battleJobIntegration.on('rose_essence_effect_completed', eventSpy);

            const gainEvent = {
                amount: 15,
                source: {
                    type: 'boss_defeat' as const,
                    sourceId: 'boss_1',
                    bossId: 'boss_1'
                },
                bossInfo: {
                    id: 'boss_1',
                    name: 'Test Boss',
                    type: 'minor_boss' as const,
                    roseEssenceReward: 15,
                    isFirstTimeDefeat: false
                },
                showAnimation: true
            };

            // Act
            await battleJobIntegration.integrateRoseEssenceGainEffect(gainEvent);

            // Assert
            expect(eventSpy).toHaveBeenCalledWith(gainEvent);
        });
    });

    describe('Job Aura in Battle', () => {
        test('should show job aura during battle', () => {
            // Arrange
            const showAuraSpy = jest.spyOn(jobSystem, 'showJobAura');
            const hideAuraSpy = jest.spyOn(jobSystem, 'hideJobAura');

            // Act
            battleJobIntegration.showJobAuraInBattle(playerWarrior, 1000);

            // Assert
            expect(showAuraSpy).toHaveBeenCalledWith(playerWarrior.id);

            // Wait for hide to be called
            setTimeout(() => {
                expect(hideAuraSpy).toHaveBeenCalledWith(playerWarrior.id);
            }, 50);
        });

        test('should emit job aura shown event', () => {
            // Arrange
            const eventSpy = jest.fn();
            battleJobIntegration.on('job_aura_shown_in_battle', eventSpy);

            // Act
            battleJobIntegration.showJobAuraInBattle(playerWarrior, 2000);

            // Assert
            expect(eventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    unit: playerWarrior,
                    duration: 2000
                })
            );
        });
    });

    describe('Battle System Integration', () => {
        test('should detect boss units correctly', () => {
            // Act & Assert
            expect(battleSystem['isBossUnit'](enemyBoss)).toBe(true);
            expect(battleSystem['isBossUnit'](playerWarrior)).toBe(false);
        });

        test('should create boss info from defeated unit', () => {
            // Act
            const bossInfo = battleSystem['createBossInfo'](enemyBoss);

            // Assert
            expect(bossInfo).toHaveProperty('id', enemyBoss.id);
            expect(bossInfo).toHaveProperty('name', enemyBoss.name);
            expect(bossInfo).toHaveProperty('type');
            expect(bossInfo).toHaveProperty('roseEssenceReward');
            expect(bossInfo.roseEssenceReward).toBeGreaterThan(0);
        });

        test('should apply job modifications to battle parameters', () => {
            // Act
            const result = battleSystem.applyJobModificationsToBattle(
                playerWarrior,
                enemyBoss,
                testWeapon
            );

            // Assert
            expect(result).toHaveProperty('attackerMods');
            expect(result).toHaveProperty('defenderMods');
            expect(result).toHaveProperty('modifiedWeapon');
            expect(result.modifiedWeapon).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        test('should handle boss defeat processing errors gracefully', async () => {
            // Arrange
            const invalidBossInfo = {
                id: 'invalid_boss',
                name: 'Invalid Boss',
                type: 'invalid_type' as any,
                roseEssenceReward: -10, // Invalid negative reward
                isFirstTimeDefeat: true
            };

            // Act & Assert - Should not throw
            await expect(
                battleJobIntegration.handleBossDefeat(invalidBossInfo, playerWarrior)
            ).resolves.not.toThrow();
        });

        test('should handle job modification errors gracefully', () => {
            // Arrange - Create unit without job
            const unitWithoutJob = { ...playerWarrior, id: 'no_job_unit' };

            // Act & Assert - Should not throw and return default modifications
            expect(() => {
                const result = battleJobIntegration.applyJobBattleModifications(
                    unitWithoutJob,
                    testWeapon,
                    enemyBoss
                );
                expect(result).toBeDefined();
                expect(result.damageModifiers).toEqual([]);
            }).not.toThrow();
        });

        test('should emit error events when rose essence gain fails', async () => {
            // Arrange
            const errorSpy = jest.fn();
            battleJobIntegration.on('rose_essence_gain_error', errorSpy);

            // Mock jobSystem to throw error
            jest.spyOn(jobSystem, 'awardRoseEssence').mockRejectedValue(new Error('Test error'));

            const bossInfo = {
                id: 'error_boss',
                name: 'Error Boss',
                type: 'minor_boss' as const,
                roseEssenceReward: 10,
                isFirstTimeDefeat: true
            };

            // Act
            await battleJobIntegration.handleBossDefeat(bossInfo, playerWarrior);

            // Assert
            expect(errorSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    bossInfo,
                    error: expect.any(String)
                })
            );
        });
    });
});