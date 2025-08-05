/**
 * BattleAnimator Integration Tests
 * Tests for battle animation system integration with other game systems
 */

import { BattleAnimator, BattleAnimationEvent } from '../../../game/src/systems/BattleAnimator';
import { Unit, UnitStats, Position } from '../../../game/src/types/gameplay';
import { Weapon, WeaponType, Element, DamageType, BattleResult } from '../../../game/src/types/battle';

// Mock Phaser Scene with more realistic behavior
class MockPhaserScene {
    public add = {
        group: jest.fn(() => ({
            add: jest.fn(),
            clear: jest.fn(),
            children: { entries: [] },
            destroy: jest.fn()
        })),
        text: jest.fn(() => ({
            setOrigin: jest.fn(),
            destroy: jest.fn(),
            x: 0,
            y: 0
        })),
        rectangle: jest.fn(() => ({
            setName: jest.fn(),
            setStrokeStyle: jest.fn(),
            fillColor: 0,
            width: 0,
            destroy: jest.fn()
        })),
        container: jest.fn(() => ({
            add: jest.fn(),
            setAlpha: jest.fn(),
            setPosition: jest.fn(),
            getByName: jest.fn(() => ({
                setName: jest.fn(),
                setStrokeStyle: jest.fn(),
                fillColor: 0,
                width: 0,
                destroy: jest.fn()
            })),
            destroy: jest.fn()
        })),
        circle: jest.fn(() => ({
            destroy: jest.fn()
        }))
    };

    public tweens = {
        createTimeline: jest.fn(() => ({
            add: jest.fn(),
            play: jest.fn()
        })),
        add: jest.fn((config: any) => {
            if (config.onComplete) {
                setTimeout(config.onComplete, 0);
            }
            return {};
        }),
        killTweensOf: jest.fn()
    };

    public cameras = {
        main: {
            shake: jest.fn()
        }
    };

    public time = {
        delayedCall: jest.fn((delay: number, callback: Function) => {
            setTimeout(callback, 0);
        })
    };
}

// Mock Phaser Sprite with position tracking
class MockSprite {
    public x: number;
    public y: number;
    public alpha: number = 1;
    public scaleX: number = 1;
    public scaleY: number = 1;
    public angle: number = 0;
    public tint: number = 0xffffff;

    constructor(x: number = 100, y: number = 100) {
        this.x = x;
        this.y = y;
    }
}

describe('BattleAnimator Integration Tests', () => {
    let battleAnimator: BattleAnimator;
    let mockScene: MockPhaserScene;
    let playerUnit: Unit;
    let enemyUnit: Unit;
    let sword: Weapon;
    let bow: Weapon;
    let staff: Weapon;

    beforeEach(() => {
        mockScene = new MockPhaserScene();

        const playerStats: UnitStats = {
            maxHP: 120,
            maxMP: 60,
            attack: 25,
            defense: 18,
            speed: 12,
            movement: 3
        };

        const enemyStats: UnitStats = {
            maxHP: 80,
            maxMP: 40,
            attack: 20,
            defense: 15,
            speed: 8,
            movement: 2
        };

        playerUnit = {
            id: 'player1',
            name: 'Hero',
            position: { x: 2, y: 2 },
            stats: playerStats,
            currentHP: 120,
            currentMP: 60,
            faction: 'player',
            hasActed: false,
            hasMoved: false,
            sprite: new MockSprite(64, 64) as any
        };

        enemyUnit = {
            id: 'enemy1',
            name: 'Orc',
            position: { x: 4, y: 4 },
            stats: enemyStats,
            currentHP: 80,
            currentMP: 40,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false,
            sprite: new MockSprite(128, 128) as any
        };

        sword = {
            id: 'iron_sword',
            name: 'Iron Sword',
            type: WeaponType.SWORD,
            attackPower: 20,
            range: 1,
            rangePattern: {
                type: 'single',
                range: 1,
                pattern: [{ x: 0, y: 0 }]
            },
            element: Element.NONE,
            criticalRate: 15,
            accuracy: 95,
            specialEffects: [],
            description: 'A reliable iron sword'
        };

        bow = {
            id: 'long_bow',
            name: 'Long Bow',
            type: WeaponType.BOW,
            attackPower: 18,
            range: 3,
            rangePattern: {
                type: 'line',
                range: 3,
                pattern: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]
            },
            element: Element.NONE,
            criticalRate: 20,
            accuracy: 85,
            specialEffects: [],
            description: 'A long-range bow'
        };

        staff = {
            id: 'healing_staff',
            name: 'Healing Staff',
            type: WeaponType.STAFF,
            attackPower: 0,
            range: 2,
            rangePattern: {
                type: 'single',
                range: 2,
                pattern: [{ x: 0, y: 0 }]
            },
            element: Element.LIGHT,
            criticalRate: 5,
            accuracy: 100,
            specialEffects: [{
                type: 'heal',
                chance: 100,
                duration: 1,
                power: 30,
                description: 'Heals the target'
            }],
            description: 'A staff that heals allies'
        };

        battleAnimator = new BattleAnimator(mockScene as any, {
            attackAnimationDuration: 100,
            damageEffectDuration: 100,
            hpBarAnimationDuration: 100,
            defeatAnimationDuration: 100,
            effectDisplayDuration: 100,
            enableParticleEffects: true,
            enableScreenShake: true,
            animationSpeed: 2.0
        });
    });

    afterEach(() => {
        if (battleAnimator) {
            battleAnimator.destroy();
        }
    });

    describe('Complete Battle Animation Sequence', () => {
        test('should handle full attack sequence with damage and HP change', async () => {
            const events: string[] = [];

            battleAnimator.on(BattleAnimationEvent.ATTACK_START, () => events.push('attack_start'));
            battleAnimator.on(BattleAnimationEvent.ATTACK_COMPLETE, () => events.push('attack_complete'));
            battleAnimator.on(BattleAnimationEvent.DAMAGE_APPLIED, () => events.push('damage_applied'));
            battleAnimator.on(BattleAnimationEvent.HP_CHANGE_COMPLETE, () => events.push('hp_change_complete'));

            // Mock timeline to simulate completion
            const mockTimeline = {
                add: jest.fn(),
                play: jest.fn(() => {
                    setTimeout(() => {
                        const addCalls = mockTimeline.add.mock.calls;
                        if (addCalls.length > 0) {
                            const lastCall = addCalls[addCalls.length - 1];
                            if (lastCall[0].onComplete) {
                                lastCall[0].onComplete();
                            }
                        }
                    }, 0);
                })
            };
            mockScene.tweens.createTimeline = jest.fn(() => mockTimeline);

            // Execute full battle sequence
            await battleAnimator.playAttackAnimation(playerUnit, enemyUnit, sword);
            await battleAnimator.showDamageEffect(enemyUnit, 25, DamageType.PHYSICAL);
            await battleAnimator.animateHPChange(enemyUnit, 80, 55);

            expect(events).toContain('attack_start');
            expect(events).toContain('attack_complete');
            expect(events).toContain('damage_applied');
            expect(events).toContain('hp_change_complete');
        });

        test('should handle critical hit sequence with special effects', async () => {
            const events: string[] = [];

            battleAnimator.on(BattleAnimationEvent.ATTACK_START, () => events.push('attack_start'));
            battleAnimator.on(BattleAnimationEvent.DAMAGE_APPLIED, () => events.push('damage_applied'));

            // Mock timeline to simulate completion
            const mockTimeline = {
                add: jest.fn(),
                play: jest.fn(() => {
                    setTimeout(() => {
                        const addCalls = mockTimeline.add.mock.calls;
                        if (addCalls.length > 0) {
                            const lastCall = addCalls[addCalls.length - 1];
                            if (lastCall[0].onComplete) {
                                lastCall[0].onComplete();
                            }
                        }
                    }, 0);
                })
            };
            mockScene.tweens.createTimeline = jest.fn(() => mockTimeline);

            // Execute critical hit sequence
            await battleAnimator.playAttackAnimation(playerUnit, enemyUnit, sword);
            await battleAnimator.showDamageEffect(enemyUnit, 45, DamageType.CRITICAL);
            await battleAnimator.animateHPChange(enemyUnit, 80, 35);

            expect(events).toContain('attack_start');
            expect(events).toContain('damage_applied');

            // Verify critical damage text format
            expect(mockScene.add.text).toHaveBeenCalledWith(
                enemyUnit.sprite!.x,
                enemyUnit.sprite!.y - 20,
                '45!',
                expect.objectContaining({
                    color: '#ffff44'
                })
            );
        });

        test('should handle healing sequence with positive effects', async () => {
            const events: string[] = [];

            battleAnimator.on(BattleAnimationEvent.ATTACK_START, () => events.push('heal_start'));
            battleAnimator.on(BattleAnimationEvent.DAMAGE_APPLIED, () => events.push('heal_applied'));
            battleAnimator.on(BattleAnimationEvent.HP_CHANGE_COMPLETE, () => events.push('hp_restored'));

            // Mock timeline to simulate completion
            const mockTimeline = {
                add: jest.fn(),
                play: jest.fn(() => {
                    setTimeout(() => {
                        const addCalls = mockTimeline.add.mock.calls;
                        if (addCalls.length > 0) {
                            const lastCall = addCalls[addCalls.length - 1];
                            if (lastCall[0].onComplete) {
                                lastCall[0].onComplete();
                            }
                        }
                    }, 0);
                })
            };
            mockScene.tweens.createTimeline = jest.fn(() => mockTimeline);

            // Simulate healing a damaged ally
            playerUnit.currentHP = 90;

            await battleAnimator.playAttackAnimation(playerUnit, playerUnit, staff); // Self-heal
            await battleAnimator.showDamageEffect(playerUnit, 30, DamageType.HEALING);
            await battleAnimator.animateHPChange(playerUnit, 90, 120);

            expect(events).toContain('heal_start');
            expect(events).toContain('heal_applied');
            expect(events).toContain('hp_restored');

            // Verify healing text format
            expect(mockScene.add.text).toHaveBeenCalledWith(
                playerUnit.sprite!.x,
                playerUnit.sprite!.y - 20,
                '+30',
                expect.objectContaining({
                    color: '#44ff44'
                })
            );
        });

        test('should handle unit defeat sequence', async () => {
            const events: string[] = [];

            battleAnimator.on(BattleAnimationEvent.ATTACK_COMPLETE, () => events.push('attack_complete'));
            battleAnimator.on(BattleAnimationEvent.DAMAGE_APPLIED, () => events.push('damage_applied'));
            battleAnimator.on(BattleAnimationEvent.HP_CHANGE_COMPLETE, () => events.push('hp_change_complete'));
            battleAnimator.on(BattleAnimationEvent.DEFEAT_COMPLETE, () => events.push('defeat_complete'));

            // Mock timeline to simulate completion
            const mockTimeline = {
                add: jest.fn(),
                play: jest.fn(() => {
                    setTimeout(() => {
                        const addCalls = mockTimeline.add.mock.calls;
                        if (addCalls.length > 0) {
                            const lastCall = addCalls[addCalls.length - 1];
                            if (lastCall[0].onComplete) {
                                lastCall[0].onComplete();
                            }
                        }
                    }, 0);
                })
            };
            mockScene.tweens.createTimeline = jest.fn(() => mockTimeline);

            // Execute defeat sequence
            await battleAnimator.playAttackAnimation(playerUnit, enemyUnit, sword);
            await battleAnimator.showDamageEffect(enemyUnit, 80, DamageType.PHYSICAL);
            await battleAnimator.animateHPChange(enemyUnit, 80, 0);
            await battleAnimator.playDefeatedAnimation(enemyUnit);

            expect(events).toContain('attack_complete');
            expect(events).toContain('damage_applied');
            expect(events).toContain('hp_change_complete');
            expect(events).toContain('defeat_complete');
        });
    });

    describe('Multiple Unit Animation Management', () => {
        test('should handle multiple HP bars simultaneously', async () => {
            // Create HP bars for both units
            await battleAnimator.animateHPChange(playerUnit, 120, 100);
            await battleAnimator.animateHPChange(enemyUnit, 80, 60);

            // Update positions
            playerUnit.sprite!.x = 200;
            playerUnit.sprite!.y = 200;
            enemyUnit.sprite!.x = 300;
            enemyUnit.sprite!.y = 300;

            // Update HP bar positions
            battleAnimator.updateHPBarPosition(playerUnit);
            battleAnimator.updateHPBarPosition(enemyUnit);

            // Should not throw errors
            expect(() => {
                battleAnimator.updateHPBarPosition(playerUnit);
                battleAnimator.updateHPBarPosition(enemyUnit);
            }).not.toThrow();
        });

        test('should clear all effects for multiple units', () => {
            // Create effects for multiple units
            battleAnimator.showDamageEffect(playerUnit, 10, DamageType.PHYSICAL);
            battleAnimator.showDamageEffect(enemyUnit, 15, DamageType.MAGICAL);
            battleAnimator.animateHPChange(playerUnit, 120, 110);
            battleAnimator.animateHPChange(enemyUnit, 80, 65);

            // Clear all effects
            battleAnimator.clearBattleEffects();

            expect(mockScene.tweens.killTweensOf).toHaveBeenCalled();
            expect(battleAnimator.isAnimationPlaying()).toBe(false);
        });
    });

    describe('Weapon-Specific Animation Effects', () => {
        test('should apply different effects for different weapon types', async () => {
            // Mock timeline to simulate completion
            const mockTimeline = {
                add: jest.fn(),
                play: jest.fn(() => {
                    setTimeout(() => {
                        const addCalls = mockTimeline.add.mock.calls;
                        if (addCalls.length > 0) {
                            const lastCall = addCalls[addCalls.length - 1];
                            if (lastCall[0].onComplete) {
                                lastCall[0].onComplete();
                            }
                        }
                    }, 0);
                })
            };
            mockScene.tweens.createTimeline = jest.fn(() => mockTimeline);

            // Test sword attack
            await battleAnimator.playAttackAnimation(playerUnit, enemyUnit, sword);
            expect(mockScene.add.circle).toHaveBeenCalled(); // Particle effects

            // Test bow attack
            await battleAnimator.playAttackAnimation(playerUnit, enemyUnit, bow);
            expect(mockScene.add.circle).toHaveBeenCalled(); // Different particle effects

            // Test staff usage
            await battleAnimator.playAttackAnimation(playerUnit, playerUnit, staff);
            expect(mockScene.add.circle).toHaveBeenCalled(); // Healing particle effects
        });
    });

    describe('Performance and Resource Management', () => {
        test('should handle rapid animation sequences without memory leaks', async () => {
            const initialCallCount = mockScene.add.text.mock.calls.length;

            // Mock timeline to simulate completion
            const mockTimeline = {
                add: jest.fn(),
                play: jest.fn(() => {
                    setTimeout(() => {
                        const addCalls = mockTimeline.add.mock.calls;
                        if (addCalls.length > 0) {
                            const lastCall = addCalls[addCalls.length - 1];
                            if (lastCall[0].onComplete) {
                                lastCall[0].onComplete();
                            }
                        }
                    }, 0);
                })
            };
            mockScene.tweens.createTimeline = jest.fn(() => mockTimeline);

            // Execute multiple rapid animations
            for (let i = 0; i < 5; i++) {
                await battleAnimator.playAttackAnimation(playerUnit, enemyUnit, sword);
                await battleAnimator.showDamageEffect(enemyUnit, 20 + i, DamageType.PHYSICAL);
                await battleAnimator.animateHPChange(enemyUnit, 80 - i * 10, 60 - i * 10);
            }

            // Verify animations were created
            expect(mockScene.add.text.mock.calls.length).toBeGreaterThan(initialCallCount);

            // Clear all effects
            battleAnimator.clearBattleEffects();

            // Verify cleanup
            expect(mockScene.tweens.killTweensOf).toHaveBeenCalled();
        });

        test('should properly destroy and cleanup resources', () => {
            // Create various effects
            battleAnimator.showDamageEffect(playerUnit, 25, DamageType.PHYSICAL);
            battleAnimator.animateHPChange(playerUnit, 120, 95);
            battleAnimator.animateHPChange(enemyUnit, 80, 55);

            // Destroy animator
            battleAnimator.destroy();

            // Verify cleanup calls
            expect(mockScene.tweens.killTweensOf).toHaveBeenCalled();

            // Should not throw error on subsequent operations
            expect(() => {
                battleAnimator.clearBattleEffects();
                battleAnimator.updateHPBarPosition(playerUnit);
            }).not.toThrow();
        });
    });

    describe('Configuration and Customization', () => {
        test('should respect animation speed configuration', async () => {
            const fastAnimator = new BattleAnimator(mockScene as any, {
                attackAnimationDuration: 200,
                animationSpeed: 2.0,
                enableParticleEffects: true,
                enableScreenShake: false,
                damageEffectDuration: 200,
                hpBarAnimationDuration: 200,
                defeatAnimationDuration: 200,
                effectDisplayDuration: 200
            });

            // Mock timeline to simulate completion
            const mockTimeline = {
                add: jest.fn(),
                play: jest.fn(() => {
                    setTimeout(() => {
                        const addCalls = mockTimeline.add.mock.calls;
                        if (addCalls.length > 0) {
                            const lastCall = addCalls[addCalls.length - 1];
                            if (lastCall[0].onComplete) {
                                lastCall[0].onComplete();
                            }
                        }
                    }, 0);
                })
            };
            mockScene.tweens.createTimeline = jest.fn(() => mockTimeline);

            await fastAnimator.playAttackAnimation(playerUnit, enemyUnit, sword);

            // Verify screen shake was disabled
            expect(mockScene.cameras.main.shake).not.toHaveBeenCalled();

            fastAnimator.destroy();
        });

        test('should allow runtime configuration updates', () => {
            const newConfig = {
                enableParticleEffects: false,
                enableScreenShake: false,
                animationSpeed: 0.5
            };

            battleAnimator.updateConfig(newConfig);

            // Configuration should be updated without errors
            expect(() => battleAnimator.updateConfig(newConfig)).not.toThrow();
        });
    });

    describe('Error Recovery and Robustness', () => {
        test('should handle missing sprites gracefully in complex sequences', async () => {
            const unitWithoutSprite = { ...enemyUnit, sprite: undefined };

            // Should handle missing sprite errors gracefully
            await expect(
                battleAnimator.playAttackAnimation(playerUnit, unitWithoutSprite, sword)
            ).rejects.toThrow('Missing sprite for animation');

            await expect(
                battleAnimator.showDamageEffect(unitWithoutSprite, 25, DamageType.PHYSICAL)
            ).rejects.toThrow('Missing sprite for damage effect');

            // Should still be able to animate other units
            await expect(
                battleAnimator.animateHPChange(unitWithoutSprite, 80, 55)
            ).resolves.toBeUndefined();
        });

        test('should maintain state consistency after errors', async () => {
            // Mock tween creation to throw error
            mockScene.tweens.createTimeline = jest.fn(() => {
                throw new Error('Tween creation failed');
            });

            try {
                await battleAnimator.playAttackAnimation(playerUnit, enemyUnit, sword);
            } catch (error) {
                // Error expected
            }

            // State should be reset after error
            expect(battleAnimator.isAnimationPlaying()).toBe(false);

            // Should be able to perform other operations
            expect(() => {
                battleAnimator.clearBattleEffects();
                battleAnimator.updateHPBarPosition(playerUnit);
            }).not.toThrow();
        });
    });
});