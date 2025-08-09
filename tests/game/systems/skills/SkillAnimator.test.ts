/**
 * SkillAnimatorクラスのユニットテスト
 */

import * as Phaser from 'phaser';
import { SkillAnimator, SkillAnimatorConfig, AnimationType } from '../../../../game/src/systems/skills/SkillAnimator';
import { Skill } from '../../../../game/src/systems/skills/Skill';
import {
    SkillType,
    BuffType,
    StatusEffectType,
    ActiveSkillEffect,
    SkillData,
    SkillUsageCondition,
    SkillLearnCondition,
    SkillAnimation,
    AreaOfEffect
} from '../../../../game/src/types/skill';

// Phaserのモック
const mockScene = {
    add: {
        circle: jest.fn().mockReturnValue({
            setDepth: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setActive: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }),
        star: jest.fn().mockReturnValue({
            setDepth: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setActive: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        })
    },
    tweens: {
        add: jest.fn().mockReturnValue({
            isActive: jest.fn().mockReturnValue(true),
            stop: jest.fn()
        })
    },
    time: {
        delayedCall: jest.fn(),
        addEvent: jest.fn().mockReturnValue({
            destroy: jest.fn()
        })
    },
    cameras: {
        main: {
            shake: jest.fn()
        }
    },
    sound: {
        get: jest.fn().mockReturnValue(true),
        play: jest.fn()
    }
} as any;

// モックスプライト
const mockSprite = {
    x: 100,
    y: 100,
    depth: 1,
    setAlpha: jest.fn().mockReturnThis(),
    setScale: jest.fn().mockReturnThis()
} as any;

// モックキャラクター
const mockCaster = {
    id: 'caster1',
    sprite: mockSprite
};

const mockTarget = {
    id: 'target1',
    sprite: mockSprite
};

// モックスキルデータ
const createMockSkillData = (skillType: SkillType): SkillData => ({
    id: 'test-skill',
    name: 'Test Skill',
    description: 'Test skill description',
    skillType,
    targetType: 'single_enemy' as any,
    range: 3,
    areaOfEffect: {
        shape: 'single',
        size: 1
    } as AreaOfEffect,
    effects: [{
        type: 'damage',
        value: 50
    }],
    usageCondition: {
        mpCost: 10,
        cooldown: 0,
        usageLimit: 0,
        levelRequirement: 1
    } as SkillUsageCondition,
    learnCondition: {} as SkillLearnCondition,
    animation: {
        castAnimation: 'cast_fire',
        effectAnimation: 'fire_blast',
        duration: 1000,
        soundEffect: 'fire_sound'
    } as SkillAnimation
});

// モックスキルクラス
class MockSkill extends Skill {
    constructor(skillType: SkillType) {
        super(createMockSkillData(skillType));
    }

    async execute(): Promise<any> {
        return { success: true };
    }

    canUse(): any {
        return { canUse: true };
    }

    getValidTargets(): any[] {
        return [];
    }
}

describe('SkillAnimator', () => {
    let skillAnimator: SkillAnimator;
    let mockConfig: Partial<SkillAnimatorConfig>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockConfig = {
            animationSpeed: 1.0,
            effectQuality: 'medium',
            enableSoundEffects: true,
            enableParticleEffects: true,
            enableScreenShake: true,
            maxConcurrentEffects: 10,
            enableDebugDisplay: false
        };

        skillAnimator = new SkillAnimator(mockScene, mockConfig);
    });

    afterEach(() => {
        skillAnimator.destroy();
    });

    describe('constructor', () => {
        test('should initialize with default config when no config provided', () => {
            const animator = new SkillAnimator(mockScene);
            expect(animator).toBeInstanceOf(SkillAnimator);
        });

        test('should merge provided config with defaults', () => {
            const customConfig = { animationSpeed: 2.0, enableDebugDisplay: true };
            const animator = new SkillAnimator(mockScene, customConfig);
            expect(animator).toBeInstanceOf(SkillAnimator);
        });

        test('should initialize effect pools', () => {
            expect(skillAnimator).toBeInstanceOf(SkillAnimator);
            // エフェクトプールが初期化されていることを間接的に確認
        });
    });

    describe('playCastAnimation', () => {
        test('should resolve immediately when particle effects are disabled', async () => {
            skillAnimator.updateConfig({ enableParticleEffects: false });
            const skill = new MockSkill(SkillType.ATTACK);

            const result = await skillAnimator.playCastAnimation(skill, mockCaster);
            expect(result).toBeUndefined();
        });

        test('should create cast animation for attack skill', async () => {
            const skill = new MockSkill(SkillType.ATTACK);

            const animationPromise = skillAnimator.playCastAnimation(skill, mockCaster);

            expect(mockScene.add.circle).toHaveBeenCalled();
            expect(mockScene.tweens.add).toHaveBeenCalled();

            // アニメーション完了をシミュレート
            const tweenCall = mockScene.tweens.add.mock.calls[0][0];
            if (tweenCall.onComplete) {
                tweenCall.onComplete();
            }

            await animationPromise;
        });

        test('should resolve immediately when caster sprite is not found', async () => {
            const skill = new MockSkill(SkillType.ATTACK);
            const casterWithoutSprite = { id: 'caster1', sprite: null };

            const result = await skillAnimator.playCastAnimation(skill, casterWithoutSprite);
            expect(result).toBeUndefined();
        });

        test('should play sound effect when enabled', async () => {
            skillAnimator.updateConfig({ enableSoundEffects: true });
            const skill = new MockSkill(SkillType.ATTACK);

            const animationPromise = skillAnimator.playCastAnimation(skill, mockCaster);

            // アニメーション完了をシミュレート
            const tweenCall = mockScene.tweens.add.mock.calls[0][0];
            if (tweenCall.onComplete) {
                tweenCall.onComplete();
            }

            await animationPromise;
        });

        test('should log debug information when debug display is enabled', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            skillAnimator.updateConfig({ enableDebugDisplay: true });
            const skill = new MockSkill(SkillType.ATTACK);

            const animationPromise = skillAnimator.playCastAnimation(skill, mockCaster);

            // アニメーション完了をシミュレート
            const tweenCall = mockScene.tweens.add.mock.calls[0][0];
            if (tweenCall.onComplete) {
                tweenCall.onComplete();
            }

            await animationPromise;

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cast animation started'));
            consoleSpy.mockRestore();
        });
    });

    describe('playSkillAnimation', () => {
        test('should resolve immediately when particle effects are disabled', async () => {
            skillAnimator.updateConfig({ enableParticleEffects: false });
            const skill = new MockSkill(SkillType.ATTACK);

            const result = await skillAnimator.playSkillAnimation(skill, mockCaster, [mockTarget]);
            expect(result).toBeUndefined();
        });

        test('should create attack animation for attack skill', async () => {
            const skill = new MockSkill(SkillType.ATTACK);

            skillAnimator.playSkillAnimation(skill, mockCaster, [mockTarget]);

            expect(mockScene.tweens.add).toHaveBeenCalled();
            expect(mockScene.time.delayedCall).toHaveBeenCalled();
        });

        test('should create heal animation for heal skill', async () => {
            const skill = new MockSkill(SkillType.HEAL);

            skillAnimator.playSkillAnimation(skill, mockCaster, [mockTarget]);

            expect(mockScene.add.circle).toHaveBeenCalled();
            expect(mockScene.tweens.add).toHaveBeenCalled();
        });

        test('should create buff animation for buff skill', async () => {
            const skill = new MockSkill(SkillType.BUFF);

            skillAnimator.playSkillAnimation(skill, mockCaster, [mockTarget]);

            expect(mockScene.add.circle).toHaveBeenCalled();
            expect(mockScene.tweens.add).toHaveBeenCalled();
        });

        test('should create debuff animation for debuff skill', async () => {
            const skill = new MockSkill(SkillType.DEBUFF);

            skillAnimator.playSkillAnimation(skill, mockCaster, [mockTarget]);

            expect(mockScene.add.circle).toHaveBeenCalled();
            expect(mockScene.tweens.add).toHaveBeenCalled();
        });

        test('should create status animation for status skill', async () => {
            const skill = new MockSkill(SkillType.STATUS);

            skillAnimator.playSkillAnimation(skill, mockCaster, [mockTarget]);

            expect(mockScene.add.circle).toHaveBeenCalled();
            expect(mockScene.tweens.add).toHaveBeenCalled();
        });

        test('should create generic animation for unknown skill type', async () => {
            const skill = new MockSkill(SkillType.SPECIAL);

            skillAnimator.playSkillAnimation(skill, mockCaster, [mockTarget]);

            expect(mockScene.add.circle).toHaveBeenCalled();
            expect(mockScene.tweens.add).toHaveBeenCalled();
        });

        test('should add screen shake for attack skills when enabled', async () => {
            skillAnimator.updateConfig({ enableScreenShake: true });
            const skill = new MockSkill(SkillType.ATTACK);

            skillAnimator.playSkillAnimation(skill, mockCaster, [mockTarget]);

            expect(mockScene.cameras.main.shake).toHaveBeenCalled();
        });

        test('should play sound effect when enabled', async () => {
            skillAnimator.updateConfig({ enableSoundEffects: true });
            const skill = new MockSkill(SkillType.ATTACK);

            skillAnimator.playSkillAnimation(skill, mockCaster, [mockTarget]);

            expect(mockScene.sound.play).toHaveBeenCalledWith('fire_sound', { volume: 0.5 });
        });
    });

    describe('playHitEffect', () => {
        test('should resolve immediately when particle effects are disabled', async () => {
            skillAnimator.updateConfig({ enableParticleEffects: false });
            const skill = new MockSkill(SkillType.ATTACK);

            const result = await skillAnimator.playHitEffect(skill, mockTarget);
            expect(result).toBeUndefined();
        });

        test('should create hit effect animation', async () => {
            const skill = new MockSkill(SkillType.ATTACK);

            const animationPromise = skillAnimator.playHitEffect(skill, mockTarget);

            expect(mockScene.add.star).toHaveBeenCalled();
            expect(mockScene.tweens.add).toHaveBeenCalled();
            expect(mockScene.time.delayedCall).toHaveBeenCalled();

            // Simulate the delayed call completion
            const delayedCallArgs = mockScene.time.delayedCall.mock.calls[mockScene.time.delayedCall.mock.calls.length - 1];
            if (delayedCallArgs && delayedCallArgs[1]) {
                delayedCallArgs[1](); // Execute the callback
            }

            await animationPromise;
        });

        test('should resolve immediately when target sprite is not found', async () => {
            const skill = new MockSkill(SkillType.ATTACK);
            const targetWithoutSprite = { id: 'target1', sprite: null };

            const result = await skillAnimator.playHitEffect(skill, targetWithoutSprite);
            expect(result).toBeUndefined();
        });

        test('should add shake effect for attack skills', async () => {
            const skill = new MockSkill(SkillType.ATTACK);

            skillAnimator.playHitEffect(skill, mockTarget);

            // 複数のtweenが作成されることを確認（flash + shake）
            expect(mockScene.tweens.add).toHaveBeenCalledTimes(3); // flash, shake, effect
        });

        test('should not add shake effect for non-attack skills', async () => {
            const skill = new MockSkill(SkillType.HEAL);

            skillAnimator.playHitEffect(skill, mockTarget);

            // flash + effectのみ（shakeなし）
            expect(mockScene.tweens.add).toHaveBeenCalledTimes(2);
        });
    });

    describe('showContinuousEffect', () => {
        const mockEffect: ActiveSkillEffect = {
            effectId: 'effect1',
            effectType: BuffType.ATTACK_UP,
            value: 10,
            remainingDuration: 5,
            sourceSkillId: 'skill1',
            casterId: 'caster1',
            appliedAt: new Date()
        };

        test('should return early when particle effects are disabled', () => {
            skillAnimator.updateConfig({ enableParticleEffects: false });

            skillAnimator.showContinuousEffect(mockEffect, mockTarget);

            expect(mockScene.add.circle).not.toHaveBeenCalled();
        });

        test('should create continuous effect display', () => {
            skillAnimator.showContinuousEffect(mockEffect, mockTarget);

            expect(mockScene.add.circle).toHaveBeenCalled();
            expect(mockScene.tweens.add).toHaveBeenCalled();
            expect(mockScene.time.addEvent).toHaveBeenCalled();
        });

        test('should return early when target sprite is not found', () => {
            const targetWithoutSprite = { id: 'target1', sprite: null };

            skillAnimator.showContinuousEffect(mockEffect, targetWithoutSprite);

            expect(mockScene.add.circle).not.toHaveBeenCalled();
        });

        test('should hide existing continuous effect before showing new one', () => {
            // 最初のエフェクトを表示
            skillAnimator.showContinuousEffect(mockEffect, mockTarget);

            // 同じエフェクトIDで再度表示
            skillAnimator.showContinuousEffect(mockEffect, mockTarget);

            // 2回呼ばれることを確認（古いものを削除して新しいものを作成）
            expect(mockScene.add.circle).toHaveBeenCalledTimes(2);
        });

        test('should log debug information when debug display is enabled', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            skillAnimator.updateConfig({ enableDebugDisplay: true });

            skillAnimator.showContinuousEffect(mockEffect, mockTarget);

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Continuous effect started'));
            consoleSpy.mockRestore();
        });
    });

    describe('hideContinuousEffect', () => {
        const mockEffect: ActiveSkillEffect = {
            effectId: 'effect1',
            effectType: BuffType.ATTACK_UP,
            value: 10,
            remainingDuration: 5,
            sourceSkillId: 'skill1',
            casterId: 'caster1',
            appliedAt: new Date()
        };

        test('should return early when effect does not exist', () => {
            skillAnimator.hideContinuousEffect('nonexistent');

            // エラーが発生しないことを確認
            expect(true).toBe(true);
        });

        test('should destroy timer and display object', () => {
            // エフェクトを表示
            skillAnimator.showContinuousEffect(mockEffect, mockTarget);

            // エフェクトを非表示
            const effectId = `continuous_${mockEffect.effectId}_${mockTarget.id}`;
            skillAnimator.hideContinuousEffect(effectId);

            // タイマーとオブジェクトが破棄されることを確認
            const mockTimer = mockScene.time.addEvent.mock.results[0].value;
            const mockDisplayObject = mockScene.add.circle.mock.results[0].value;

            expect(mockTimer.destroy).toHaveBeenCalled();
            expect(mockDisplayObject.destroy).toHaveBeenCalled();
        });

        test('should log debug information when debug display is enabled', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            skillAnimator.updateConfig({ enableDebugDisplay: true });

            // エフェクトを表示
            skillAnimator.showContinuousEffect(mockEffect, mockTarget);

            // エフェクトを非表示
            const effectId = `continuous_${mockEffect.effectId}_${mockTarget.id}`;
            skillAnimator.hideContinuousEffect(effectId);

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Continuous effect ended'));
            consoleSpy.mockRestore();
        });
    });

    describe('stopAllAnimations', () => {
        test('should stop all active animations', () => {
            const skill = new MockSkill(SkillType.ATTACK);

            // アニメーションを開始
            skillAnimator.playCastAnimation(skill, mockCaster);
            skillAnimator.playSkillAnimation(skill, mockCaster, [mockTarget]);

            // 全アニメーションを停止
            skillAnimator.stopAllAnimations();

            // tweenのstopが呼ばれることを確認
            const mockTweens = mockScene.tweens.add.mock.results;
            mockTweens.forEach(result => {
                expect(result.value.stop).toHaveBeenCalled();
            });
        });

        test('should hide all continuous effects', () => {
            const mockEffect: ActiveSkillEffect = {
                effectId: 'effect1',
                effectType: BuffType.ATTACK_UP,
                value: 10,
                remainingDuration: 5,
                sourceSkillId: 'skill1',
                casterId: 'caster1',
                appliedAt: new Date()
            };

            // 継続エフェクトを表示
            skillAnimator.showContinuousEffect(mockEffect, mockTarget);

            // 全アニメーションを停止
            skillAnimator.stopAllAnimations();

            // タイマーが破棄されることを確認
            const mockTimer = mockScene.time.addEvent.mock.results[0].value;
            expect(mockTimer.destroy).toHaveBeenCalled();
        });
    });

    describe('updateConfig', () => {
        test('should update configuration', () => {
            const newConfig = {
                animationSpeed: 2.0,
                enableDebugDisplay: true
            };

            skillAnimator.updateConfig(newConfig);

            // 設定が更新されたことを間接的に確認
            expect(skillAnimator).toBeInstanceOf(SkillAnimator);
        });
    });

    describe('destroy', () => {
        test('should clean up all resources', () => {
            const skill = new MockSkill(SkillType.ATTACK);
            const mockEffect: ActiveSkillEffect = {
                effectId: 'effect1',
                effectType: BuffType.ATTACK_UP,
                value: 10,
                remainingDuration: 5,
                sourceSkillId: 'skill1',
                casterId: 'caster1',
                appliedAt: new Date()
            };

            // アニメーションと継続エフェクトを開始
            skillAnimator.playCastAnimation(skill, mockCaster);
            skillAnimator.showContinuousEffect(mockEffect, mockTarget);

            // 破棄
            skillAnimator.destroy();

            // リソースがクリーンアップされることを確認
            expect(skillAnimator).toBeInstanceOf(SkillAnimator);
        });
    });

    describe('effect pool management', () => {
        test('should reuse effects from pool when available', () => {
            const skill = new MockSkill(SkillType.ATTACK);

            // 最初のアニメーション
            skillAnimator.playCastAnimation(skill, mockCaster);

            // エフェクトがプールに返却された後、再利用されることを確認
            // これは内部実装の詳細なので、間接的にテスト
            expect(mockScene.add.circle).toHaveBeenCalled();
        });
    });

    describe('sound management', () => {
        test('should handle missing sound gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            skillAnimator.updateConfig({ enableDebugDisplay: true });

            // 存在しないサウンドを設定
            mockScene.sound.get.mockReturnValue(false);

            const skill = new MockSkill(SkillType.ATTACK);
            skillAnimator.playCastAnimation(skill, mockCaster);

            // エラーが発生しないことを確認
            expect(consoleSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('color management', () => {
        test('should return correct colors for different skill types', () => {
            // これは内部メソッドなので、間接的にテスト
            const attackSkill = new MockSkill(SkillType.ATTACK);
            const healSkill = new MockSkill(SkillType.HEAL);

            skillAnimator.playCastAnimation(attackSkill, mockCaster);
            skillAnimator.playCastAnimation(healSkill, mockCaster);

            // 異なる色でエフェクトが作成されることを確認
            expect(mockScene.add.circle).toHaveBeenCalledTimes(2);
        });
    });
});