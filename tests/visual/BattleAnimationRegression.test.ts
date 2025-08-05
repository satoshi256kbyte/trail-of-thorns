import { BattleAnimator } from '../../game/src/systems/BattleAnimator';
import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import { CharacterManager } from '../../game/src/systems/CharacterManager';
import { MapRenderer } from '../../game/src/rendering/MapRenderer';
import { Unit, Weapon, WeaponType, Element, DamageType } from '../../game/src/types/battle';
import { createMockUnit, createMockWeapon } from '../data/mockStageConfigurations';

/**
 * 戦闘アニメーションと状態同期のビジュアル回帰テスト
 * 
 * このテストスイートは以下をカバーします：
 * - アニメーションの視覚的整合性
 * - 状態変更とアニメーションの同期
 * - フレームレート維持
 * - 視覚的フィードバックの品質
 */
describe('Battle Animation - Visual Regression Tests', () => {
    let battleAnimator: BattleAnimator;
    let battleSystem: BattleSystem;
    let gameStateManager: GameStateManager;
    let characterManager: CharacterManager;
    let mapRenderer: MapRenderer;
    let mockScene: any;
    let mockAttacker: Unit;
    let mockTarget: Unit;
    let mockWeapon: Weapon;

    beforeEach(() => {
        // モックPhaserシーンの準備
        mockScene = {
            add: {
                image: jest.fn().mockReturnValue({
                    setOrigin: jest.fn().mockReturnThis(),
                    setPosition: jest.fn().mockReturnThis(),
                    setScale: jest.fn().mockReturnThis(),
                    setAlpha: jest.fn().mockReturnThis(),
                    setVisible: jest.fn().mockReturnThis(),
                    destroy: jest.fn()
                }),
                text: jest.fn().mockReturnValue({
                    setOrigin: jest.fn().mockReturnThis(),
                    setPosition: jest.fn().mockReturnThis(),
                    setStyle: jest.fn().mockReturnThis(),
                    setAlpha: jest.fn().mockReturnThis(),
                    destroy: jest.fn()
                }),
                graphics: jest.fn().mockReturnValue({
                    fillStyle: jest.fn().mockReturnThis(),
                    fillRect: jest.fn().mockReturnThis(),
                    strokeLineShape: jest.fn().mockReturnThis(),
                    clear: jest.fn().mockReturnThis(),
                    destroy: jest.fn()
                }),
                tween: jest.fn().mockReturnValue({
                    on: jest.fn().mockReturnThis(),
                    play: jest.fn()
                })
            },
            tweens: {
                add: jest.fn().mockImplementation((config) => {
                    // アニメーション完了をシミュレート
                    setTimeout(() => {
                        if (config.onComplete) config.onComplete();
                    }, config.duration || 100);
                    return {
                        play: jest.fn(),
                        stop: jest.fn(),
                        pause: jest.fn(),
                        resume: jest.fn()
                    };
                }),
                timeline: jest.fn().mockReturnValue({
                    add: jest.fn().mockReturnThis(),
                    play: jest.fn(),
                    on: jest.fn().mockReturnThis()
                })
            },
            time: {
                delayedCall: jest.fn().mockImplementation((delay, callback) => {
                    setTimeout(callback, delay);
                    return { remove: jest.fn() };
                })
            },
            cameras: {
                main: {
                    scrollX: 0,
                    scrollY: 0,
                    zoom: 1,
                    shake: jest.fn()
                }
            }
        };

        // システムの初期化
        gameStateManager = new GameStateManager();
        characterManager = new CharacterManager();
        mapRenderer = new MapRenderer(mockScene);
        battleAnimator = new BattleAnimator(mockScene);
        battleSystem = new BattleSystem(gameStateManager, characterManager);

        // テストデータの準備
        mockAttacker = createMockUnit({
            id: 'attacker-1',
            name: 'Test Attacker',
            position: { x: 2, y: 2 },
            stats: {
                maxHP: 100,
                maxMP: 50,
                attack: 25,
                defense: 15,
                speed: 12,
                movement: 3
            },
            currentHP: 100,
            currentMP: 50,
            faction: 'player'
        });

        mockTarget = createMockUnit({
            id: 'target-1',
            name: 'Test Target',
            position: { x: 3, y: 2 },
            stats: {
                maxHP: 80,
                maxMP: 30,
                attack: 20,
                defense: 12,
                speed: 10,
                movement: 2
            },
            currentHP: 80,
            currentMP: 30,
            faction: 'enemy'
        });

        mockWeapon = createMockWeapon({
            id: 'sword-1',
            name: 'Test Sword',
            type: WeaponType.SWORD,
            attackPower: 15,
            range: 1,
            element: Element.NONE
        });

        characterManager.addUnit(mockAttacker);
        characterManager.addUnit(mockTarget);
    });

    afterEach(() => {
        battleAnimator.cleanup();
    });

    describe('攻撃アニメーションの視覚的整合性', () => {
        test('近接攻撃アニメーションの基本フロー', async () => {
            const animationStartTime = performance.now();

            // 攻撃アニメーション実行
            const animationPromise = battleAnimator.playAttackAnimation(
                mockAttacker,
                mockTarget,
                mockWeapon
            );

            // アニメーション開始の確認
            expect(battleAnimator.isAnimationPlaying()).toBe(true);
            expect(battleAnimator.getCurrentAnimation()).toBe('attack');

            // 攻撃者の移動アニメーション確認
            expect(mockScene.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: expect.any(Object),
                    x: expect.any(Number),
                    y: expect.any(Number),
                    duration: expect.any(Number)
                })
            );

            await animationPromise;

            const animationEndTime = performance.now();
            const animationDuration = animationEndTime - animationStartTime;

            // アニメーション時間が適切であることを確認
            expect(animationDuration).toBeGreaterThan(500); // 最低0.5秒
            expect(animationDuration).toBeLessThan(3000); // 最大3秒

            // アニメーション完了後の状態確認
            expect(battleAnimator.isAnimationPlaying()).toBe(false);
            expect(battleAnimator.getCurrentAnimation()).toBeNull();
        });

        test('遠距離攻撃アニメーションの弾道表現', async () => {
            const bowWeapon = createMockWeapon({
                type: WeaponType.BOW,
                range: 3,
                element: Element.NONE
            });

            // 遠距離攻撃アニメーション実行
            await battleAnimator.playAttackAnimation(mockAttacker, mockTarget, bowWeapon);

            // 弾道オブジェクトが作成されることを確認
            expect(mockScene.add.image).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                'projectile'
            );

            // 弾道の移動アニメーションが実行されることを確認
            expect(mockScene.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: expect.any(Object),
                    x: mockTarget.position.x * 32,
                    y: mockTarget.position.y * 32,
                    duration: expect.any(Number)
                })
            );
        });

        test('魔法攻撃アニメーションのエフェクト表現', async () => {
            const staffWeapon = createMockWeapon({
                type: WeaponType.STAFF,
                range: 2,
                element: Element.FIRE
            });

            await battleAnimator.playAttackAnimation(mockAttacker, mockTarget, staffWeapon);

            // 魔法エフェクトが作成されることを確認
            expect(mockScene.add.graphics).toHaveBeenCalled();

            // 属性に応じたエフェクトカラーが設定されることを確認
            const graphicsCall = mockScene.add.graphics.mock.calls[0];
            expect(graphicsCall).toBeDefined();
        });
    });

    describe('ダメージエフェクトと状態同期', () => {
        test('ダメージ数値表示とHPバー更新の同期', async () => {
            const initialHP = mockTarget.currentHP;
            const damage = 25;

            // ダメージエフェクト実行
            const effectPromise = battleAnimator.showDamageEffect(
                mockTarget,
                damage,
                DamageType.PHYSICAL
            );

            // ダメージ数値が表示されることを確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                damage.toString(),
                expect.any(Object)
            );

            // HPバー更新アニメーション実行
            const hpAnimationPromise = battleAnimator.animateHPChange(
                mockTarget,
                initialHP,
                initialHP - damage
            );

            // 両方のアニメーションが同期して実行されることを確認
            await Promise.all([effectPromise, hpAnimationPromise]);

            // HPが正しく更新されていることを確認
            expect(mockTarget.currentHP).toBe(initialHP - damage);

            // 視覚的なHPバーが正しい値を表示することを確認
            const displayedHP = battleAnimator.getDisplayedHP(mockTarget);
            expect(displayedHP).toBe(mockTarget.currentHP);
        });

        test('クリティカルヒット時の特殊エフェクト', async () => {
            const damage = 40;

            await battleAnimator.showDamageEffect(
                mockTarget,
                damage,
                DamageType.CRITICAL
            );

            // クリティカル専用エフェクトが実行されることを確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.stringContaining('CRITICAL'),
                expect.objectContaining({
                    fontSize: expect.stringMatching(/\d+px/),
                    color: expect.any(String)
                })
            );

            // 画面シェイクエフェクトが実行されることを確認
            expect(mockScene.cameras.main.shake).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number)
            );
        });

        test('回復エフェクトの視覚表現', async () => {
            const healAmount = 30;
            mockTarget.currentHP = 50;

            await battleAnimator.showDamageEffect(
                mockTarget,
                healAmount,
                DamageType.HEALING
            );

            // 回復数値が緑色で表示されることを確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                `+${healAmount}`,
                expect.objectContaining({
                    color: '#00ff00'
                })
            );

            // HPバーが増加アニメーションを実行することを確認
            await battleAnimator.animateHPChange(mockTarget, 50, 80);
            expect(mockTarget.currentHP).toBe(80);
        });
    });

    describe('戦闘不能演出の品質', () => {
        test('戦闘不能アニメーションの段階的実行', async () => {
            mockTarget.currentHP = 0;
            mockTarget.isDefeated = true;

            const defeatAnimationPromise = battleAnimator.playDefeatedAnimation(mockTarget);

            // フェードアウトアニメーションが実行されることを確認
            expect(mockScene.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: expect.any(Object),
                    alpha: 0,
                    duration: expect.any(Number)
                })
            );

            await defeatAnimationPromise;

            // キャラクターが非表示になることを確認
            expect(battleAnimator.isUnitVisible(mockTarget)).toBe(false);

            // 戦闘不能マーカーが表示されることを確認
            expect(mockScene.add.image).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                'defeated_marker'
            );
        });

        test('戦闘不能時の特殊エフェクト', async () => {
            await battleAnimator.playDefeatedAnimation(mockTarget);

            // 消失エフェクトが実行されることを確認
            expect(mockScene.add.graphics).toHaveBeenCalled();

            // サウンドエフェクトが再生されることを確認（モック）
            expect(battleAnimator.getLastPlayedSound()).toBe('unit_defeated');
        });
    });

    describe('アニメーション品質とパフォーマンス', () => {
        test('フレームレート維持の確認', async () => {
            const frameRateMonitor = {
                frames: [] as number[],
                startTime: performance.now(),

                recordFrame() {
                    const currentTime = performance.now();
                    const deltaTime = currentTime - this.startTime;
                    this.frames.push(deltaTime);
                    this.startTime = currentTime;
                },

                getAverageFPS() {
                    if (this.frames.length === 0) return 0;
                    const averageDelta = this.frames.reduce((a, b) => a + b) / this.frames.length;
                    return 1000 / averageDelta;
                }
            };

            // アニメーション実行中のフレームレート監視
            const animationPromise = battleAnimator.playAttackAnimation(
                mockAttacker,
                mockTarget,
                mockWeapon
            );

            // フレームレート監視開始
            const monitoringInterval = setInterval(() => {
                frameRateMonitor.recordFrame();
            }, 16); // 60fps想定

            await animationPromise;
            clearInterval(monitoringInterval);

            // 平均フレームレートが55fps以上であることを確認
            const averageFPS = frameRateMonitor.getAverageFPS();
            expect(averageFPS).toBeGreaterThan(55);
        });

        test('複数同時アニメーションでのパフォーマンス', async () => {
            const enemies = Array.from({ length: 5 }, (_, i) =>
                createMockUnit({
                    id: `enemy-${i}`,
                    position: { x: 4 + i, y: 2 },
                    faction: 'enemy'
                })
            );

            enemies.forEach(enemy => characterManager.addUnit(enemy));

            const startTime = performance.now();

            // 複数の敵に対して同時にダメージエフェクトを実行
            const animationPromises = enemies.map(enemy =>
                battleAnimator.showDamageEffect(enemy, 20, DamageType.PHYSICAL)
            );

            await Promise.all(animationPromises);

            const endTime = performance.now();
            const totalTime = endTime - startTime;

            // 実行時間が許容範囲内であることを確認（2秒以内）
            expect(totalTime).toBeLessThan(2000);

            // メモリ使用量が適切であることを確認
            const memoryUsage = process.memoryUsage().heapUsed;
            expect(memoryUsage).toBeLessThan(100 * 1024 * 1024); // 100MB以下
        });

        test('アニメーションオブジェクトの適切な破棄', async () => {
            const initialObjectCount = battleAnimator.getActiveAnimationCount();

            // 複数のアニメーションを実行
            await battleAnimator.playAttackAnimation(mockAttacker, mockTarget, mockWeapon);
            await battleAnimator.showDamageEffect(mockTarget, 25, DamageType.PHYSICAL);
            await battleAnimator.animateHPChange(mockTarget, 80, 55);

            // アニメーション完了後にオブジェクトが破棄されることを確認
            const finalObjectCount = battleAnimator.getActiveAnimationCount();
            expect(finalObjectCount).toBe(initialObjectCount);

            // メモリリークがないことを確認
            battleAnimator.cleanup();
            expect(battleAnimator.getActiveAnimationCount()).toBe(0);
        });
    });

    describe('視覚的フィードバックの品質', () => {
        test('攻撃範囲ハイライトの視覚的明瞭性', async () => {
            const attackRange = [
                { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 },
                { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 },
                { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }
            ];

            battleAnimator.showAttackRangeHighlight(attackRange);

            // 各範囲タイルにハイライトが表示されることを確認
            expect(mockScene.add.graphics).toHaveBeenCalledTimes(attackRange.length);

            // ハイライトの色と透明度が適切であることを確認
            attackRange.forEach((_, index) => {
                expect(mockScene.add.graphics).toHaveBeenNthCalledWith(
                    index + 1,
                    expect.any(Object)
                );
            });
        });

        test('対象選択時のハイライト効果', async () => {
            battleAnimator.highlightTarget(mockTarget, true);

            // 対象ハイライトが表示されることを確認
            expect(mockScene.add.graphics).toHaveBeenCalledWith(
                expect.objectContaining({
                    fillStyle: expect.any(Function),
                    strokeLineShape: expect.any(Function)
                })
            );

            // ハイライト解除
            battleAnimator.highlightTarget(mockTarget, false);

            // ハイライトが非表示になることを確認
            expect(battleAnimator.isTargetHighlighted(mockTarget)).toBe(false);
        });

        test('UI要素の視認性確保', async () => {
            // ダメージ数値の視認性テスト
            await battleAnimator.showDamageEffect(mockTarget, 42, DamageType.PHYSICAL);

            // テキストのサイズと色が適切であることを確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                '42',
                expect.objectContaining({
                    fontSize: expect.stringMatching(/^[2-9]\d+px$/), // 20px以上
                    color: expect.stringMatching(/^#[0-9a-fA-F]{6}$/), // 有効な色コード
                    stroke: expect.any(String), // アウトライン有り
                    strokeThickness: expect.any(Number)
                })
            );
        });
    });

    describe('アクセシビリティ対応', () => {
        test('色覚異常対応の色選択', async () => {
            // 異なる属性のダメージエフェクトをテスト
            const elements = [
                { element: Element.FIRE, expectedColor: '#ff4444' },
                { element: Element.WATER, expectedColor: '#4444ff' },
                { element: Element.EARTH, expectedColor: '#44ff44' },
                { element: Element.LIGHT, expectedColor: '#ffff44' },
                { element: Element.DARK, expectedColor: '#8844ff' }
            ];

            for (const { element, expectedColor } of elements) {
                const weapon = createMockWeapon({ element });
                await battleAnimator.playAttackAnimation(mockAttacker, mockTarget, weapon);

                // 色覚異常でも区別可能な色が使用されることを確認
                expect(battleAnimator.getElementColor(element)).toBe(expectedColor);
            }
        });

        test('アニメーション速度の調整可能性', async () => {
            // 通常速度
            battleAnimator.setAnimationSpeed(1.0);
            const normalStartTime = performance.now();
            await battleAnimator.playAttackAnimation(mockAttacker, mockTarget, mockWeapon);
            const normalDuration = performance.now() - normalStartTime;

            // 高速モード
            battleAnimator.setAnimationSpeed(2.0);
            const fastStartTime = performance.now();
            await battleAnimator.playAttackAnimation(mockAttacker, mockTarget, mockWeapon);
            const fastDuration = performance.now() - fastStartTime;

            // 高速モードで実行時間が短縮されることを確認
            expect(fastDuration).toBeLessThan(normalDuration * 0.7);
        });

        test('アニメーション無効化オプション', async () => {
            battleAnimator.setAnimationsEnabled(false);

            const startTime = performance.now();
            await battleAnimator.playAttackAnimation(mockAttacker, mockTarget, mockWeapon);
            const duration = performance.now() - startTime;

            // アニメーション無効時は即座に完了することを確認
            expect(duration).toBeLessThan(100);

            // 状態変更は正常に実行されることを確認
            expect(battleAnimator.getLastExecutedAction()).toBe('attack');
        });
    });
});