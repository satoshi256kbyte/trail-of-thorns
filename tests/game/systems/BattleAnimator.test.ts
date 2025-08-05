/**
 * BattleAnimator Unit Tests
 * Tests for battle animation and visual effects system
 */

import { BattleAnimator, BattleAnimationEvent } from '../../../game/src/systems/BattleAnimator';
import { Unit, UnitStats, Position } from '../../../game/src/types/gameplay';
import { Weapon, WeaponType, Element, DamageType, BattleAnimationConfig } from '../../../game/src/types/battle';

// Mock Phaser Scene
class MockScene {
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
            // Immediately call onComplete if it exists
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

// Mock Phaser Sprite
class MockSprite {
    public x: number = 100;
    public y: number = 100;
    public alpha: number = 1;
    public scaleX: number = 1;
    public scaleY: number = 1;
    public angle: number = 0;
    public tint: number = 0xffffff;
}

describe('BattleAnimator', () => {
    let battleAnimator: BattleAnimator;
    let mockScene: MockScene;
    let mockUnit1: Unit;
    let mockUnit2: Unit;
    let mockWeapon: Weapon;
    let mockConfig: BattleAnimationConfig;

    beforeEach(() => {
        mockScene = new MockScene();

        mockConfig = {
            attackAnimationDuration: 800,
            damageEffectDuration: 1200,
            hpBarAnimationDuration: 600,
            defeatAnimationDuration: 1500,
            effectDisplayDuration: 2000,
            enableParticleEffects: true,
            enableScreenShake: true,
            animationSpeed: 1.0
        };

        const mockStats: UnitStats = {
            maxHP: 100,
            maxMP: 50,
            attack: 20,
            defense: 15,
            speed: 10,
            movement: 3
        };

        const mockPosition: Position = { x: 5, y: 5 };

        mockUnit1 = {
            id: 'unit1',
            name: 'Test Unit 1',
            position: mockPosition,
            stats: mockStats,
            currentHP: 100,
            currentMP: 50,
            faction: 'player',
            hasActed: false,
            hasMoved: false,
            sprite: new MockSprite() as any
        };

        mockUnit2 = {
            id: 'unit2',
            name: 'Test Unit 2',
            position: { x: 7, y: 7 },
            stats: mockStats,
            currentHP: 80,
            currentMP: 30,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false,
            sprite: new MockSprite() as any
        };

        mockWeapon = {
            id: 'sword1',
            name: 'Iron Sword',
            type: WeaponType.SWORD,
            attackPower: 15,
            range: 1,
            rangePattern: {
                type: 'single',
                range: 1,
                pattern: [{ x: 0, y: 0 }]
            },
            element: Element.NONE,
            criticalRate: 10,
            accuracy: 90,
            specialEffects: [],
            description: 'A basic iron sword'
        };

        battleAnimator = new BattleAnimator(mockScene as any, mockConfig);
    });

    afterEach(() => {
        if (battleAnimator) {
            battleAnimator.destroy();
        }
    });

    describe('Constructor', () => {
        test('should initialize with default configuration', () => {
            const animator = new BattleAnimator(mockScene as any);
            expect(animator).toBeDefined();
            expect(animator.isAnimationPlaying()).toBe(false);
        });

        test('should initialize with custom configuration', () => {
            const customConfig = { attackAnimationDuration: 1000 };
            const animator = new BattleAnimator(mockScene as any, customConfig);
            expect(animator).toBeDefined();
            animator.destroy();
        });

        test('should initialize animation groups', () => {
            expect(mockScene.add.group).toHaveBeenCalledTimes(4); // 4 animation groups
        });
    });

    describe('playAttackAnimation', () => {
        test('should play attack animation successfully', async () => {
            // Mock timeline to simulate completion
            const mockTimeline = {
                add: jest.fn(),
                play: jest.fn(() => {
                    // Simulate completion after timeline.play()
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

            const animationPromise = battleAnimator.playAttackAnimation(mockUnit1, mockUnit2, mockWeapon);

            expect(battleAnimator.isAnimationPlaying()).toBe(true);

            await animationPromise;
            expect(battleAnimator.isAnimationPlaying()).toBe(false);
        });

        test('should throw error if sprite is missing', async () => {
            const unitWithoutSprite = { ...mockUnit1, sprite: undefined };

            await expect(
                battleAnimator.playAttackAnimation(unitWithoutSprite, mockUnit2, mockWeapon)
            ).rejects.toThrow('Missing sprite for animation');
        });

        test('should emit attack events', async () => {
            const startSpy = jest.fn();
            const completeSpy = jest.fn();

            battleAnimator.on(BattleAnimationEvent.ATTACK_START, startSpy);
            battleAnimator.on(BattleAnimationEvent.ATTACK_COMPLETE, completeSpy);

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

            const animationPromise = battleAnimator.playAttackAnimation(mockUnit1, mockUnit2, mockWeapon);

            expect(startSpy).toHaveBeenCalledWith({
                attacker: mockUnit1,
                target: mockUnit2,
                weapon: mockWeapon
            });

            await animationPromise;
            expect(completeSpy).toHaveBeenCalled();
        });

        test('should trigger screen shake when enabled', async () => {
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

            const animationPromise = battleAnimator.playAttackAnimation(mockUnit1, mockUnit2, mockWeapon);

            expect(mockScene.cameras.main.shake).toHaveBeenCalledWith(200, 0.01);

            await animationPromise;
        });
    });

    describe('showDamageEffect', () => {
        test('should show damage effect for physical damage', async () => {
            const damagePromise = battleAnimator.showDamageEffect(mockUnit2, 25, DamageType.PHYSICAL);

            expect(mockScene.add.text).toHaveBeenCalledWith(
                mockUnit2.sprite!.x,
                mockUnit2.sprite!.y - 20,
                '25',
                expect.objectContaining({
                    fontSize: '24px',
                    color: '#ff4444'
                })
            );

            await damagePromise;
        });

        test('should show different colors for different damage types', async () => {
            // Test critical damage
            const criticalPromise = battleAnimator.showDamageEffect(mockUnit2, 50, DamageType.CRITICAL);

            expect(mockScene.add.text).toHaveBeenCalledWith(
                mockUnit2.sprite!.x,
                mockUnit2.sprite!.y - 20,
                '50!',
                expect.objectContaining({
                    color: '#ffff44'
                })
            );

            await criticalPromise;
        });

        test('should show healing effect with positive sign', async () => {
            const healingPromise = battleAnimator.showDamageEffect(mockUnit1, 20, DamageType.HEALING);

            expect(mockScene.add.text).toHaveBeenCalledWith(
                mockUnit1.sprite!.x,
                mockUnit1.sprite!.y - 20,
                '+20',
                expect.objectContaining({
                    color: '#44ff44'
                })
            );

            await healingPromise;
        });

        test('should throw error if sprite is missing', async () => {
            const unitWithoutSprite = { ...mockUnit2, sprite: undefined };

            await expect(
                battleAnimator.showDamageEffect(unitWithoutSprite, 25, DamageType.PHYSICAL)
            ).rejects.toThrow('Missing sprite for damage effect');
        });
    });

    describe('animateHPChange', () => {
        test('should animate HP bar change', async () => {
            const hpChangePromise = battleAnimator.animateHPChange(mockUnit1, 100, 75);

            expect(mockScene.add.container).toHaveBeenCalled();
            expect(mockScene.add.rectangle).toHaveBeenCalled();

            await hpChangePromise;
        });

        test('should handle unit without sprite gracefully', async () => {
            const unitWithoutSprite = { ...mockUnit1, sprite: undefined };

            await expect(
                battleAnimator.animateHPChange(unitWithoutSprite, 100, 75)
            ).resolves.toBeUndefined();
        });

        test('should emit HP change complete event', async () => {
            const completeSpy = jest.fn();
            battleAnimator.on(BattleAnimationEvent.HP_CHANGE_COMPLETE, completeSpy);

            const hpChangePromise = battleAnimator.animateHPChange(mockUnit1, 100, 50);

            await hpChangePromise;
            expect(completeSpy).toHaveBeenCalledWith({
                unit: mockUnit1,
                oldHP: 100,
                newHP: 50
            });
        });
    });

    describe('playDefeatedAnimation', () => {
        test('should play defeat animation', async () => {
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

            const defeatPromise = battleAnimator.playDefeatedAnimation(mockUnit2);

            expect(battleAnimator.isAnimationPlaying()).toBe(true);

            await defeatPromise;
            expect(battleAnimator.isAnimationPlaying()).toBe(false);
        });

        test('should throw error if sprite is missing', async () => {
            const unitWithoutSprite = { ...mockUnit2, sprite: undefined };

            await expect(
                battleAnimator.playDefeatedAnimation(unitWithoutSprite)
            ).rejects.toThrow('Missing sprite for defeat animation');
        });

        test('should emit defeat complete event', async () => {
            const completeSpy = jest.fn();
            battleAnimator.on(BattleAnimationEvent.DEFEAT_COMPLETE, completeSpy);

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

            const defeatPromise = battleAnimator.playDefeatedAnimation(mockUnit2);

            await defeatPromise;
            expect(completeSpy).toHaveBeenCalledWith({ unit: mockUnit2 });
        });
    });

    describe('clearBattleEffects', () => {
        test('should clear all active effects', () => {
            battleAnimator.clearBattleEffects();

            expect(mockScene.tweens.killTweensOf).toHaveBeenCalled();
            expect(battleAnimator.isAnimationPlaying()).toBe(false);
        });

        test('should emit effects cleared event', () => {
            const clearedSpy = jest.fn();
            battleAnimator.on(BattleAnimationEvent.EFFECTS_CLEARED, clearedSpy);

            battleAnimator.clearBattleEffects();

            expect(clearedSpy).toHaveBeenCalled();
        });

        test('should reset animation state', () => {
            battleAnimator.clearBattleEffects();

            const state = battleAnimator.getAnimationState();
            expect(state.isPlaying).toBe(false);
            expect(state.type).toBe('idle');
        });
    });

    describe('Animation State Management', () => {
        test('should track animation state correctly', () => {
            const initialState = battleAnimator.getAnimationState();
            expect(initialState.isPlaying).toBe(false);
            expect(initialState.type).toBe('idle');
        });

        test('should update animation state during attack', async () => {
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

            const animationPromise = battleAnimator.playAttackAnimation(mockUnit1, mockUnit2, mockWeapon);

            const duringState = battleAnimator.getAnimationState();
            expect(duringState.isPlaying).toBe(true);
            expect(duringState.type).toBe('attack');
            expect(duringState.attacker).toBe(mockUnit1);
            expect(duringState.target).toBe(mockUnit2);

            await animationPromise;

            const afterState = battleAnimator.getAnimationState();
            expect(afterState.isPlaying).toBe(false);
            expect(afterState.type).toBe('idle');
        });
    });

    describe('Configuration Management', () => {
        test('should update configuration', () => {
            const newConfig = { attackAnimationDuration: 1000 };
            battleAnimator.updateConfig(newConfig);

            // Configuration update should not throw error
            expect(() => battleAnimator.updateConfig(newConfig)).not.toThrow();
        });
    });

    describe('HP Bar Management', () => {
        test('should update HP bar position', () => {
            // First create HP bar
            battleAnimator.animateHPChange(mockUnit1, 100, 75);

            // Update position
            mockUnit1.sprite!.x = 200;
            mockUnit1.sprite!.y = 200;

            battleAnimator.updateHPBarPosition(mockUnit1);

            // Should not throw error
            expect(() => battleAnimator.updateHPBarPosition(mockUnit1)).not.toThrow();
        });

        test('should handle missing HP bar gracefully', () => {
            battleAnimator.updateHPBarPosition(mockUnit1);

            // Should not throw error even if HP bar doesn't exist
            expect(() => battleAnimator.updateHPBarPosition(mockUnit1)).not.toThrow();
        });
    });

    describe('Cleanup and Destruction', () => {
        test('should destroy properly', () => {
            battleAnimator.destroy();

            expect(mockScene.tweens.killTweensOf).toHaveBeenCalled();
        });

        test('should clear all resources on destroy', () => {
            // Create some effects first
            battleAnimator.animateHPChange(mockUnit1, 100, 75);

            battleAnimator.destroy();

            // Should not throw error
            expect(() => battleAnimator.destroy()).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('should handle animation errors gracefully', async () => {
            // Mock tween creation to throw error
            mockScene.tweens.createTimeline = jest.fn(() => {
                throw new Error('Tween creation failed');
            });

            await expect(
                battleAnimator.playAttackAnimation(mockUnit1, mockUnit2, mockWeapon)
            ).rejects.toThrow('ANIMATION_FAILED');
        });

        test('should reset state after animation error', async () => {
            // Mock tween creation to throw error
            mockScene.tweens.createTimeline = jest.fn(() => {
                throw new Error('Tween creation failed');
            });

            try {
                await battleAnimator.playAttackAnimation(mockUnit1, mockUnit2, mockWeapon);
            } catch (error) {
                // Error expected
            }

            expect(battleAnimator.isAnimationPlaying()).toBe(false);
        });
    });

    describe('Particle Effects', () => {
        test('should create particle effects when enabled', async () => {
            const damagePromise = battleAnimator.showDamageEffect(mockUnit2, 25, DamageType.PHYSICAL);

            expect(mockScene.add.circle).toHaveBeenCalled();

            await damagePromise;
        });

        test('should not create particle effects when disabled', async () => {
            const configWithoutParticles = { ...mockConfig, enableParticleEffects: false };
            const animatorWithoutParticles = new BattleAnimator(mockScene as any, configWithoutParticles);

            const damagePromise = animatorWithoutParticles.showDamageEffect(mockUnit2, 25, DamageType.PHYSICAL);

            await damagePromise;

            animatorWithoutParticles.destroy();
        });
    });
});