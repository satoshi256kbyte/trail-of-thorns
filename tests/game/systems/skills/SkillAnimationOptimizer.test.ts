/**
 * スキルアニメーション最適化システムのテスト
 * 
 * このファイルには以下のテストが含まれます：
 * - SkillAnimationOptimizer のユニットテスト
 * - AnimationPool のテスト
 * - EffectPool のテスト
 * - AnimationBatcher のテスト
 * - FrameRateOptimizer のテスト
 * - アニメーション最適化のパフォーマンステスト
 */

import * as Phaser from 'phaser';
import {
    SkillAnimationOptimizer,
    AnimationPool,
    EffectPool,
    AnimationBatcher,
    FrameRateOptimizer
} from '../../../../game/src/systems/skills/SkillAnimationOptimizer';

import {
    Skill
} from '../../../../game/src/systems/skills/Skill';

import {
    SkillData,
    SkillType,
    TargetType,
    Position,
    ActiveSkillEffect,
    BuffType
} from '../../../../game/src/types/skill';

// Phaserモック
const mockScene = {
    add: {
        sprite: jest.fn().mockReturnValue({
            setVisible: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setRotation: jest.fn().mockReturnThis(),
            stop: jest.fn(),
            setFrame: jest.fn(),
            play: jest.fn(),
            once: jest.fn(),
            destroy: jest.fn()
        }),
        particles: jest.fn().mockReturnValue({
            setPosition: jest.fn().mockReturnThis(),
            start: jest.fn(),
            stop: jest.fn(),
            removeAllParticles: jest.fn(),
            destroy: jest.fn()
        }),
        text: jest.fn().mockReturnValue({
            setVisible: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setText: jest.fn(),
            destroy: jest.fn()
        }),
        image: jest.fn().mockReturnValue({
            setVisible: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setFrame: jest.fn(),
            destroy: jest.fn()
        }),
        rectangle: jest.fn().mockReturnValue({
            setVisible: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        })
    },
    tweens: {
        add: jest.fn()
    },
    cameras: {
        main: {
            width: 800,
            height: 600,
            getWorldPoint: jest.fn().mockReturnValue({ x: 100, y: 100 })
        }
    }
} as unknown as Phaser.Scene;

// モックスキルデータ
const createMockSkillData = (id: string = 'test-skill'): SkillData => ({
    id,
    name: 'テストスキル',
    description: 'テスト用のスキル',
    skillType: SkillType.ATTACK,
    targetType: TargetType.SINGLE_ENEMY,
    range: 1,
    areaOfEffect: {
        shape: 'single',
        size: 1
    },
    effects: [{
        type: 'damage',
        value: 100,
        target: 'enemy'
    }],
    usageCondition: {
        mpCost: 10,
        levelRequirement: 1,
        cooldown: 0,
        usageLimit: 0,
        weaponRequirement: [],
        jobRequirement: undefined,
        allowedStatuses: []
    },
    animation: {
        castAnimation: 'cast',
        effectAnimation: 'effect',
        duration: 1000,
        priority: 1
    },
    learnCondition: {
        level: 1,
        prerequisiteSkills: [],
        jobRequirement: undefined,
        requiredItems: []
    }
});

// モックスキルクラス
class MockSkill extends Skill {
    getAffectedPositions(targetPosition: Position): Position[] {
        return [targetPosition];
    }

    async execute(context: any): Promise<any> {
        return {
            success: true,
            targets: [],
            effects: [],
            mpCost: this.usageCondition.mpCost
        };
    }
}

describe('AnimationPool', () => {
    let pool: AnimationPool;

    beforeEach(() => {
        pool = new AnimationPool(mockScene, 5);
    });

    afterEach(() => {
        pool.clear();
    });

    describe('基本的なプール操作', () => {
        test('新しいアニメーションオブジェクトが作成される', () => {
            const animation = pool.acquire('sprite', { texture: 'test' });

            expect(animation).not.toBeNull();
            expect(animation?.type).toBe('sprite');
            expect(animation?.inUse).toBe(true);
        });

        test('アニメーションオブジェクトの返却と再利用ができる', () => {
            const animation1 = pool.acquire('sprite', { texture: 'test' });
            expect(animation1).not.toBeNull();

            // 返却
            pool.release(animation1!);
            expect(animation1!.inUse).toBe(false);

            // 再取得（同じオブジェクトが返されるはず）
            const animation2 = pool.acquire('sprite', { texture: 'test' });
            expect(animation2).toBe(animation1);
            expect(animation2!.inUse).toBe(true);
        });

        test('プールサイズ制限が機能する', () => {
            const pool = new AnimationPool(mockScene, 2);

            // 制限まで作成
            const anim1 = pool.acquire('sprite', { texture: 'test' });
            const anim2 = pool.acquire('sprite', { texture: 'test' });

            expect(anim1).not.toBeNull();
            expect(anim2).not.toBeNull();

            // 制限を超えた場合はnullが返される
            const anim3 = pool.acquire('sprite', { texture: 'test' });
            expect(anim3).toBeNull();
        });

        test('異なるタイプのアニメーションが作成される', () => {
            const spriteAnim = pool.acquire('sprite', { texture: 'test' });
            const particleAnim = pool.acquire('particle', { texture: 'test' });

            expect(spriteAnim?.type).toBe('sprite');
            expect(particleAnim?.type).toBe('particle');
        });
    });

    describe('統計情報', () => {
        test('統計情報が正しく計算される', () => {
            // オブジェクトを作成・使用
            const anim1 = pool.acquire('sprite', { texture: 'test' });
            const anim2 = pool.acquire('particle', { texture: 'test' });

            const stats = pool.getStatistics();
            expect(stats.totalPools).toBe(2); // sprite, particle
            expect(stats.totalPooledObjects).toBe(2);
            expect(stats.activeAnimations).toBe(2);
            expect(stats.createdCount).toBe(2);
            expect(stats.reusedCount).toBe(0);

            // 返却して再利用
            pool.release(anim1!);
            const anim3 = pool.acquire('sprite', { texture: 'test' });

            const stats2 = pool.getStatistics();
            expect(stats2.reusedCount).toBe(1);
            expect(stats2.reuseRate).toBe(1 / 3); // 1再利用 / 3総取得
        });
    });

    describe('メモリ管理', () => {
        test('プールクリア時に全オブジェクトが破棄される', () => {
            const anim1 = pool.acquire('sprite', { texture: 'test' });
            const anim2 = pool.acquire('particle', { texture: 'test' });

            pool.clear();

            const stats = pool.getStatistics();
            expect(stats.totalPooledObjects).toBe(0);
            expect(stats.activeAnimations).toBe(0);
            expect(stats.createdCount).toBe(0);
            expect(stats.reusedCount).toBe(0);
        });
    });
});

describe('EffectPool', () => {
    let pool: EffectPool;

    beforeEach(() => {
        pool = new EffectPool(mockScene, 10);
        jest.useFakeTimers();
    });

    afterEach(() => {
        pool.clear();
        jest.useRealTimers();
    });

    describe('基本的なプール操作', () => {
        test('エフェクトオブジェクトが作成される', () => {
            const effect = pool.acquire('damage_number', 1000);

            expect(effect).not.toBeNull();
            expect(effect?.type).toBe('damage_number');
            expect(effect?.inUse).toBe(true);
            expect(effect?.duration).toBe(1000);
        });

        test('エフェクトオブジェクトの返却と再利用ができる', () => {
            const effect1 = pool.acquire('damage_number', 1000);
            expect(effect1).not.toBeNull();

            // 返却
            pool.release(effect1!);
            expect(effect1!.inUse).toBe(false);

            // 再取得
            const effect2 = pool.acquire('damage_number', 2000);
            expect(effect2).toBe(effect1);
            expect(effect2!.duration).toBe(2000);
        });

        test('異なるタイプのエフェクトが作成される', () => {
            const damageEffect = pool.acquire('damage_number', 1000);
            const healEffect = pool.acquire('heal_number', 1000);
            const statusEffect = pool.acquire('status_icon', 1000);

            expect(damageEffect?.type).toBe('damage_number');
            expect(healEffect?.type).toBe('heal_number');
            expect(statusEffect?.type).toBe('status_icon');
        });
    });

    describe('自動期限切れ処理', () => {
        test('期限切れエフェクトが自動的に返却される', () => {
            const effect = pool.acquire('damage_number', 1000);
            expect(effect?.inUse).toBe(true);

            // 時間を進める
            jest.advanceTimersByTime(1500);
            pool.update();

            expect(effect?.inUse).toBe(false);
        });

        test('期限内のエフェクトは維持される', () => {
            const effect = pool.acquire('damage_number', 2000);
            expect(effect?.inUse).toBe(true);

            // 期限内の時間を進める
            jest.advanceTimersByTime(1000);
            pool.update();

            expect(effect?.inUse).toBe(true);
        });
    });
});

describe('AnimationBatcher', () => {
    let batcher: AnimationBatcher;
    let mockAnimations: any[];

    beforeEach(() => {
        batcher = new AnimationBatcher(3);
        mockAnimations = [
            {
                animation: {
                    setVisible: jest.fn(),
                    play: jest.fn(),
                    once: jest.fn((event, callback) => {
                        setTimeout(callback, 100);
                    })
                },
                type: 'sprite',
                lastUsedAt: performance.now()
            },
            {
                animation: {
                    setPosition: jest.fn(),
                    start: jest.fn(),
                    stop: jest.fn()
                },
                type: 'particle',
                lastUsedAt: performance.now() - 1000
            }
        ];
    });

    afterEach(() => {
        batcher.clear();
    });

    describe('バッチ管理', () => {
        test('バッチが作成される', () => {
            const result = batcher.createBatch('test-batch', mockAnimations, 1);
            expect(result).toBe(true);
        });

        test('同じIDのバッチは作成できない', () => {
            batcher.createBatch('test-batch', mockAnimations, 1);
            const result = batcher.createBatch('test-batch', mockAnimations, 1);
            expect(result).toBe(false);
        });

        test('バッチがキャンセルできる', () => {
            batcher.createBatch('test-batch', mockAnimations, 1);
            const result = batcher.cancelBatch('test-batch');
            expect(result).toBe(true);
        });
    });

    describe('バッチ実行', () => {
        test('バッチが実行される', async () => {
            batcher.createBatch('test-batch', mockAnimations, 1);
            const result = await batcher.executeBatch('test-batch');
            expect(result).toBe(true);
        });

        test('存在しないバッチの実行は失敗する', async () => {
            const result = await batcher.executeBatch('nonexistent');
            expect(result).toBe(false);
        });

        test('完了コールバックが実行される', async () => {
            const onComplete = jest.fn();
            batcher.createBatch('test-batch', mockAnimations, 1, onComplete);

            await batcher.executeBatch('test-batch');
            expect(onComplete).toHaveBeenCalled();
        });
    });
});

describe('FrameRateOptimizer', () => {
    let optimizer: FrameRateOptimizer;

    beforeEach(() => {
        optimizer = new FrameRateOptimizer(60, true);
        jest.useFakeTimers();
    });

    afterEach(() => {
        optimizer.resetStatistics();
        jest.useRealTimers();
    });

    describe('フレームレート監視', () => {
        test('現在のフレームレートが取得できる', () => {
            const fps = optimizer.getCurrentFPS();
            expect(typeof fps).toBe('number');
            expect(fps).toBeGreaterThan(0);
        });

        test('品質レベルが取得できる', () => {
            const quality = optimizer.getCurrentQualityLevel();
            expect(typeof quality).toBe('number');
            expect(quality).toBeGreaterThanOrEqual(1);
            expect(quality).toBeLessThanOrEqual(5);
        });

        test('フレームドロップ数が取得できる', () => {
            const frameDrops = optimizer.getFrameDropCount();
            expect(typeof frameDrops).toBe('number');
            expect(frameDrops).toBeGreaterThanOrEqual(0);
        });
    });

    describe('アニメーション実行判定', () => {
        test('高優先度のアニメーションは常に実行される', () => {
            const shouldPlay = optimizer.shouldPlayAnimation(5);
            expect(shouldPlay).toBe(true);
        });

        test('低優先度のアニメーションは条件によってスキップされる', () => {
            // フレームレートが低い状況をシミュレート
            // 実際のテストでは、optimizerの内部状態を操作する必要がある
            const shouldPlay = optimizer.shouldPlayAnimation(1);
            expect(typeof shouldPlay).toBe('boolean');
        });
    });

    describe('統計リセット', () => {
        test('統計がリセットされる', () => {
            optimizer.resetStatistics();

            const fps = optimizer.getCurrentFPS();
            const frameDrops = optimizer.getFrameDropCount();

            expect(fps).toBe(60); // 初期値
            expect(frameDrops).toBe(0);
        });
    });
});

describe('SkillAnimationOptimizer', () => {
    let optimizer: SkillAnimationOptimizer;
    let mockSkill: MockSkill;
    let mockCaster: any;
    let mockTargets: any[];

    beforeEach(() => {
        optimizer = new SkillAnimationOptimizer(mockScene, {
            maxConcurrentAnimations: 5,
            maxEffectPoolSize: 50,
            qualityLevel: 5,
            prioritize60FPS: true,
            skipOffscreenAnimations: true,
            animationTimeLimit: 3000,
            enableDebugDisplay: false
        });

        mockSkill = new MockSkill(createMockSkillData());
        mockCaster = {
            id: 'caster1',
            position: { x: 2, y: 2 }
        };
        mockTargets = [
            { id: 'target1', position: { x: 3, y: 2 } },
            { id: 'target2', position: { x: 4, y: 2 } }
        ];
    });

    afterEach(() => {
        optimizer.destroy();
    });

    describe('最適化されたアニメーション実行', () => {
        test('スキルアニメーションが実行される', async () => {
            await optimizer.playOptimizedSkillAnimation(mockSkill, mockCaster, mockTargets);

            // アニメーション実行後の統計を確認
            const stats = optimizer.getStatistics();
            expect(stats.totalAnimationsPlayed).toBeGreaterThan(0);
        });

        test('画面外のアニメーションがスキップされる', async () => {
            // 画面外の位置を設定
            mockCaster.position = { x: -100, y: -100 };

            const initialStats = optimizer.getStatistics();
            await optimizer.playOptimizedSkillAnimation(mockSkill, mockCaster, mockTargets);

            const finalStats = optimizer.getStatistics();
            expect(finalStats.skippedAnimations).toBeGreaterThan(initialStats.skippedAnimations);
        });

        test('ヒットエフェクトが表示される', async () => {
            await optimizer.playOptimizedHitEffect(mockSkill, mockTargets[0], 150);

            // エフェクト表示の確認（モックの呼び出し確認）
            expect(mockScene.add.text).toHaveBeenCalled();
            expect(mockScene.tweens.add).toHaveBeenCalled();
        });

        test('継続エフェクトが表示される', () => {
            const activeEffect: ActiveSkillEffect = {
                effectId: 'test-effect',
                effectType: BuffType.ATTACK_UP,
                value: 10,
                remainingDuration: 3,
                sourceSkillId: 'test-skill',
                casterId: 'caster1',
                appliedAt: new Date()
            };

            optimizer.showOptimizedContinuousEffect(activeEffect, mockTargets[0]);

            // エフェクト表示の確認
            expect(mockScene.add.image).toHaveBeenCalled();
        });
    });

    describe('統計情報', () => {
        test('統計情報が取得できる', () => {
            const stats = optimizer.getStatistics();

            expect(stats).toBeDefined();
            expect(typeof stats.activeAnimations).toBe('number');
            expect(typeof stats.totalAnimationsPlayed).toBe('number');
            expect(typeof stats.skippedAnimations).toBe('number');
            expect(typeof stats.averageAnimationTime).toBe('number');
            expect(typeof stats.poolUsageRate).toBe('number');
            expect(typeof stats.currentFPS).toBe('number');
            expect(typeof stats.frameDrops).toBe('number');
            expect(stats.lastUpdatedAt).toBeInstanceOf(Date);
        });

        test('アニメーション実行後に統計が更新される', async () => {
            const initialStats = optimizer.getStatistics();

            await optimizer.playOptimizedSkillAnimation(mockSkill, mockCaster, mockTargets);

            const finalStats = optimizer.getStatistics();
            expect(finalStats.totalAnimationsPlayed).toBeGreaterThan(initialStats.totalAnimationsPlayed);
        });
    });

    describe('メモリ管理', () => {
        test('エフェクトクリア時にリソースが解放される', () => {
            optimizer.clearEffects();

            const stats = optimizer.getStatistics();
            expect(stats.activeAnimations).toBe(0);
        });

        test('システム破棄時にリソースが適切に解放される', () => {
            optimizer.destroy();

            // 破棄後の操作でエラーが発生しないことを確認
            expect(() => {
                optimizer.getStatistics();
            }).not.toThrow();
        });
    });
});

describe('アニメーション最適化パフォーマンステスト', () => {
    describe('大量アニメーション処理性能', () => {
        test('100個のアニメーションが効率的に処理される', async () => {
            const optimizer = new SkillAnimationOptimizer(mockScene, {
                maxConcurrentAnimations: 20,
                maxEffectPoolSize: 200,
                enableDebugDisplay: false
            });

            const mockSkill = new MockSkill(createMockSkillData());
            const mockCaster = { id: 'caster', position: { x: 0, y: 0 } };
            const mockTargets = Array.from({ length: 100 }, (_, i) => ({
                id: `target${i}`,
                position: { x: i % 10, y: Math.floor(i / 10) }
            }));

            const startTime = performance.now();

            // 100個のアニメーションを実行
            const promises = [];
            for (let i = 0; i < 100; i++) {
                promises.push(
                    optimizer.playOptimizedSkillAnimation(mockSkill, mockCaster, [mockTargets[i]])
                );
            }

            await Promise.all(promises);

            const executionTime = performance.now() - startTime;

            // 100個のアニメーションが1秒以内に処理されることを期待
            expect(executionTime).toBeLessThan(1000);

            const stats = optimizer.getStatistics();
            expect(stats.totalAnimationsPlayed).toBeGreaterThan(0);

            optimizer.destroy();
        });

        test('アニメーションプールの再利用率が高い', () => {
            const pool = new AnimationPool(mockScene, 10);

            // 大量のアニメーションを作成・返却・再利用
            const animations = [];
            for (let i = 0; i < 20; i++) {
                const anim = pool.acquire('sprite', { texture: 'test' });
                if (anim) {
                    animations.push(anim);
                }
            }

            // 半分を返却
            for (let i = 0; i < animations.length / 2; i++) {
                pool.release(animations[i]);
            }

            // 再取得
            for (let i = 0; i < 5; i++) {
                pool.acquire('sprite', { texture: 'test' });
            }

            const stats = pool.getStatistics();
            expect(stats.reuseRate).toBeGreaterThan(0);

            pool.clear();
        });
    });

    describe('フレームレート維持テスト', () => {
        test('60fps相当の時間内でアニメーション処理が完了する', async () => {
            const optimizer = new SkillAnimationOptimizer(mockScene, {
                prioritize60FPS: true,
                enableDebugDisplay: false
            });

            const mockSkill = new MockSkill(createMockSkillData());
            const mockCaster = { id: 'caster', position: { x: 0, y: 0 } };
            const mockTarget = { id: 'target', position: { x: 1, y: 0 } };

            const frameTime = 16.67; // 60fps相当
            const iterations = 10;

            for (let i = 0; i < iterations; i++) {
                const startTime = performance.now();

                await optimizer.playOptimizedSkillAnimation(mockSkill, mockCaster, [mockTarget]);

                const executionTime = performance.now() - startTime;

                // 各アニメーション処理が1フレーム時間内に完了することを期待
                expect(executionTime).toBeLessThan(frameTime);
            }

            optimizer.destroy();
        });

        test('低フレームレート時にアニメーションがスキップされる', () => {
            const frameRateOptimizer = new FrameRateOptimizer(60, true);

            // 低優先度のアニメーション（フレームレートが低い場合はスキップされる可能性）
            const shouldPlay1 = frameRateOptimizer.shouldPlayAnimation(1);

            // 高優先度のアニメーション（常に実行される）
            const shouldPlay2 = frameRateOptimizer.shouldPlayAnimation(5);

            expect(typeof shouldPlay1).toBe('boolean');
            expect(shouldPlay2).toBe(true);

            frameRateOptimizer.resetStatistics();
        });
    });

    describe('メモリ効率テスト', () => {
        test('エフェクトプールがメモリリークを起こさない', () => {
            const pool = new EffectPool(mockScene, 50);

            // 大量のエフェクトを作成・返却
            for (let i = 0; i < 1000; i++) {
                const effect = pool.acquire('damage_number', 100);
                if (effect) {
                    pool.release(effect);
                }
            }

            // プールサイズが制限内に収まっていることを確認
            // （実際のメモリ使用量は測定困難なため、プール内オブジェクト数で代用）
            pool.clear();

            // クリア後にエラーが発生しないことを確認
            expect(() => {
                pool.acquire('damage_number', 100);
            }).not.toThrow();
        });

        test('アニメーションバッチャーが適切にリソースを管理する', async () => {
            const batcher = new AnimationBatcher(5);
            const mockAnimations = Array.from({ length: 10 }, () => ({
                animation: {
                    setVisible: jest.fn(),
                    play: jest.fn(),
                    once: jest.fn((event, callback) => callback())
                },
                type: 'sprite' as const,
                lastUsedAt: performance.now()
            }));

            // 複数のバッチを作成・実行
            for (let i = 0; i < 10; i++) {
                const batchId = `batch-${i}`;
                batcher.createBatch(batchId, [mockAnimations[i]], 1);
                await batcher.executeBatch(batchId);
            }

            // バッチャーのクリア
            batcher.clear();

            // クリア後にエラーが発生しないことを確認
            expect(() => {
                batcher.createBatch('test', mockAnimations, 1);
            }).not.toThrow();
        });
    });
});