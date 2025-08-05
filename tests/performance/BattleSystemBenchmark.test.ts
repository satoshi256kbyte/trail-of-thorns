import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { AttackRangeCalculator } from '../../game/src/systems/AttackRangeCalculator';
import { DamageCalculator } from '../../game/src/systems/DamageCalculator';
import { BattleAnimator } from '../../game/src/systems/BattleAnimator';
import { BattlePerformanceManager } from '../../game/src/systems/BattlePerformanceManager';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import { CharacterManager } from '../../game/src/systems/CharacterManager';
import { Unit, Weapon, WeaponType, Element } from '../../game/src/types/battle';
import { createMockUnit, createMockWeapon, createMockStageData } from '../data/mockStageConfigurations';

/**
 * 戦闘システムのパフォーマンスベンチマークテスト
 * 
 * このテストスイートは以下をカバーします：
 * - 大規模戦闘でのパフォーマンス
 * - メモリ使用量の監視
 * - フレームレート維持
 * - 計算処理の最適化確認
 */
describe('Battle System - Performance Benchmark Tests', () => {
    let battleSystem: BattleSystem;
    let gameStateManager: GameStateManager;
    let characterManager: CharacterManager;
    let performanceManager: BattlePerformanceManager;
    let mockScene: any;

    beforeEach(() => {
        // パフォーマンステスト用のモックシーン
        mockScene = {
            add: {
                image: jest.fn().mockReturnValue({
                    setOrigin: jest.fn().mockReturnThis(),
                    setPosition: jest.fn().mockReturnThis(),
                    setScale: jest.fn().mockReturnThis(),
                    setAlpha: jest.fn().mockReturnThis(),
                    destroy: jest.fn()
                }),
                text: jest.fn().mockReturnValue({
                    setOrigin: jest.fn().mockReturnThis(),
                    setPosition: jest.fn().mockReturnThis(),
                    destroy: jest.fn()
                }),
                graphics: jest.fn().mockReturnValue({
                    fillStyle: jest.fn().mockReturnThis(),
                    fillRect: jest.fn().mockReturnThis(),
                    destroy: jest.fn()
                })
            },
            tweens: {
                add: jest.fn().mockImplementation((config) => {
                    // 高速アニメーション完了をシミュレート
                    setTimeout(() => {
                        if (config.onComplete) config.onComplete();
                    }, 1);
                    return { play: jest.fn(), stop: jest.fn() };
                })
            },
            time: {
                delayedCall: jest.fn().mockImplementation((delay, callback) => {
                    setTimeout(callback, 1);
                    return { remove: jest.fn() };
                })
            }
        };

        // システムの初期化
        gameStateManager = new GameStateManager();
        characterManager = new CharacterManager();
        performanceManager = new BattlePerformanceManager();
        battleSystem = new BattleSystem(gameStateManager, characterManager);

        // パフォーマンス監視を有効化
        performanceManager.startMonitoring();
    });

    afterEach(() => {
        performanceManager.stopMonitoring();
        battleSystem.cleanup();
    });

    describe('大規模戦闘パフォーマンス', () => {
        test('50vs50の大規模戦闘でのパフォーマンス', async () => {
            // 大量のユニットを作成
            const playerUnits: Unit[] = [];
            const enemyUnits: Unit[] = [];

            for (let i = 0; i < 50; i++) {
                const playerUnit = createMockUnit({
                    id: `player-${i}`,
                    position: { x: i % 10, y: Math.floor(i / 10) },
                    faction: 'player'
                });
                playerUnits.push(playerUnit);
                characterManager.addUnit(playerUnit);

                const enemyUnit = createMockUnit({
                    id: `enemy-${i}`,
                    position: { x: (i % 10) + 15, y: Math.floor(i / 10) },
                    faction: 'enemy'
                });
                enemyUnits.push(enemyUnit);
                characterManager.addUnit(enemyUnit);
            }

            const startTime = performance.now();
            const initialMemory = process.memoryUsage().heapUsed;

            // 10ターンの戦闘をシミュレート
            for (let turn = 0; turn < 10; turn++) {
                // プレイヤーターン
                for (let i = 0; i < Math.min(5, playerUnits.length); i++) {
                    const attacker = playerUnits[i];
                    const target = enemyUnits[Math.floor(Math.random() * enemyUnits.length)];

                    if (attacker.currentHP > 0 && target.currentHP > 0) {
                        await battleSystem.initiateAttack(attacker);
                        await battleSystem.selectTarget(target);
                    }
                }

                // 敵ターン
                for (let i = 0; i < Math.min(5, enemyUnits.length); i++) {
                    const attacker = enemyUnits[i];
                    const target = playerUnits[Math.floor(Math.random() * playerUnits.length)];

                    if (attacker.currentHP > 0 && target.currentHP > 0) {
                        await battleSystem.initiateAttack(attacker);
                        await battleSystem.selectTarget(target);
                    }
                }
            }

            const endTime = performance.now();
            const finalMemory = process.memoryUsage().heapUsed;

            const totalTime = endTime - startTime;
            const memoryIncrease = finalMemory - initialMemory;

            // パフォーマンス要件の確認
            expect(totalTime).toBeLessThan(30000); // 30秒以内
            expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024); // 200MB以下の増加

            // フレームレートの確認
            const averageFPS = performanceManager.getAverageFrameRate();
            expect(averageFPS).toBeGreaterThan(30); // 30fps以上維持

            console.log(`大規模戦闘パフォーマンス:
        実行時間: ${totalTime.toFixed(2)}ms
        メモリ増加: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB
        平均FPS: ${averageFPS.toFixed(2)}`);
        });

        test('範囲攻撃での大量対象処理パフォーマンス', async () => {
            // 密集した敵配置を作成
            const enemies: Unit[] = [];
            for (let x = 10; x < 20; x++) {
                for (let y = 10; y < 20; y++) {
                    const enemy = createMockUnit({
                        id: `enemy-${x}-${y}`,
                        position: { x, y },
                        faction: 'enemy'
                    });
                    enemies.push(enemy);
                    characterManager.addUnit(enemy);
                }
            }

            const attacker = createMockUnit({
                id: 'area-attacker',
                position: { x: 5, y: 15 },
                faction: 'player'
            });
            characterManager.addUnit(attacker);

            // 広範囲攻撃武器
            const areaWeapon = createMockWeapon({
                type: WeaponType.STAFF,
                range: 15,
                rangePattern: {
                    type: 'area',
                    range: 10,
                    pattern: Array.from({ length: 441 }, (_, i) => ({
                        x: (i % 21) - 10,
                        y: Math.floor(i / 21) - 10
                    }))
                }
            });

            attacker.equipment = { weapon: areaWeapon };

            const startTime = performance.now();

            await battleSystem.initiateAttack(attacker);
            await battleSystem.selectTarget(enemies[50]); // 中央の敵を選択

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            // 範囲攻撃処理時間の確認
            expect(executionTime).toBeLessThan(5000); // 5秒以内

            // 影響を受けた対象数の確認
            const affectedTargets = battleSystem.getLastBattleResult()?.affectedTargets || [];
            expect(affectedTargets.length).toBeGreaterThan(50);

            console.log(`範囲攻撃パフォーマンス:
        実行時間: ${executionTime.toFixed(2)}ms
        影響対象数: ${affectedTargets.length}`);
        });
    });

    describe('計算処理の最適化', () => {
        test('攻撃範囲計算のパフォーマンス', async () => {
            const calculator = new AttackRangeCalculator();
            const attacker = createMockUnit({
                position: { x: 50, y: 50 },
                stats: { movement: 5 }
            });

            // 大きなマップでの範囲計算
            const largeMap = {
                width: 200,
                height: 200,
                tiles: Array(200).fill(null).map(() =>
                    Array(200).fill({ type: 'grass', movementCost: 1 })
                ),
                obstacles: []
            };

            const iterations = 1000;
            const startTime = performance.now();

            for (let i = 0; i < iterations; i++) {
                const weapon = createMockWeapon({
                    range: Math.floor(Math.random() * 10) + 1
                });
                calculator.calculateAttackRange(attacker, weapon, largeMap);
            }

            const endTime = performance.now();
            const averageTime = (endTime - startTime) / iterations;

            // 1回の計算が10ms以内であることを確認
            expect(averageTime).toBeLessThan(10);

            console.log(`攻撃範囲計算パフォーマンス:
        平均計算時間: ${averageTime.toFixed(3)}ms`);
        });

        test('ダメージ計算の最適化', async () => {
            const calculator = new DamageCalculator();
            const attacker = createMockUnit({
                stats: { attack: 25, speed: 12 }
            });
            const target = createMockUnit({
                stats: { defense: 15, evasion: 0.1 }
            });
            const weapon = createMockWeapon({
                attackPower: 20,
                criticalRate: 0.15
            });

            const iterations = 10000;
            const startTime = performance.now();

            for (let i = 0; i < iterations; i++) {
                calculator.calculateFinalDamage(attacker, target, weapon);
            }

            const endTime = performance.now();
            const averageTime = (endTime - startTime) / iterations;

            // 1回の計算が1ms以内であることを確認
            expect(averageTime).toBeLessThan(1);

            console.log(`ダメージ計算パフォーマンス:
        平均計算時間: ${averageTime.toFixed(3)}ms`);
        });

        test('パスファインディングのパフォーマンス', async () => {
            const pathfinder = battleSystem.getPathfindingService();

            // 障害物のある複雑なマップ
            const complexMap = {
                width: 100,
                height: 100,
                tiles: Array(100).fill(null).map(() =>
                    Array(100).fill({ type: 'grass', movementCost: 1 })
                ),
                obstacles: []
            };

            // ランダムに障害物を配置
            for (let i = 0; i < 1000; i++) {
                const x = Math.floor(Math.random() * 100);
                const y = Math.floor(Math.random() * 100);
                complexMap.obstacles.push({ x, y });
            }

            const iterations = 100;
            const startTime = performance.now();

            for (let i = 0; i < iterations; i++) {
                const start = {
                    x: Math.floor(Math.random() * 100),
                    y: Math.floor(Math.random() * 100)
                };
                const end = {
                    x: Math.floor(Math.random() * 100),
                    y: Math.floor(Math.random() * 100)
                };

                pathfinder.findPath(start, end, complexMap);
            }

            const endTime = performance.now();
            const averageTime = (endTime - startTime) / iterations;

            // 1回のパスファインディングが50ms以内であることを確認
            expect(averageTime).toBeLessThan(50);

            console.log(`パスファインディングパフォーマンス:
        平均計算時間: ${averageTime.toFixed(2)}ms`);
        });
    });

    describe('メモリ使用量の監視', () => {
        test('戦闘システムのメモリリーク検出', async () => {
            const initialMemory = process.memoryUsage().heapUsed;

            // 1000回の戦闘を実行
            for (let i = 0; i < 1000; i++) {
                const attacker = createMockUnit({
                    id: `attacker-${i}`,
                    position: { x: 1, y: 1 },
                    faction: 'player'
                });
                const target = createMockUnit({
                    id: `target-${i}`,
                    position: { x: 2, y: 1 },
                    faction: 'enemy'
                });

                characterManager.addUnit(attacker);
                characterManager.addUnit(target);

                await battleSystem.initiateAttack(attacker);
                await battleSystem.selectTarget(target);

                // ユニットを削除
                characterManager.removeUnit(attacker.id);
                characterManager.removeUnit(target.id);

                // 定期的にガベージコレクション実行
                if (i % 100 === 0) {
                    global.gc?.();
                }
            }

            // 最終ガベージコレクション
            global.gc?.();

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;

            // メモリ増加が50MB以下であることを確認
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

            console.log(`メモリリークテスト:
        初期メモリ: ${(initialMemory / 1024 / 1024).toFixed(2)}MB
        最終メモリ: ${(finalMemory / 1024 / 1024).toFixed(2)}MB
        増加量: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        });

        test('アニメーションオブジェクトのメモリ管理', async () => {
            const animator = new BattleAnimator(mockScene);
            const initialMemory = process.memoryUsage().heapUsed;

            // 大量のアニメーションを実行
            const units: Unit[] = [];
            for (let i = 0; i < 100; i++) {
                const unit = createMockUnit({
                    id: `unit-${i}`,
                    position: { x: i % 10, y: Math.floor(i / 10) }
                });
                units.push(unit);
            }

            // 同時に複数のアニメーションを実行
            const animationPromises = units.map(unit =>
                animator.showDamageEffect(unit, 25, 'physical')
            );

            await Promise.all(animationPromises);

            // アニメーションクリーンアップ
            animator.cleanup();

            global.gc?.();

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;

            // アニメーション後のメモリ増加が10MB以下であることを確認
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);

            console.log(`アニメーションメモリ管理:
        メモリ増加: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        });
    });

    describe('フレームレート維持', () => {
        test('連続戦闘でのフレームレート安定性', async () => {
            const frameRateHistory: number[] = [];
            let lastFrameTime = performance.now();

            // フレームレート監視関数
            const recordFrameRate = () => {
                const currentTime = performance.now();
                const deltaTime = currentTime - lastFrameTime;
                const fps = 1000 / deltaTime;
                frameRateHistory.push(fps);
                lastFrameTime = currentTime;
            };

            // 50回の連続戦闘
            for (let i = 0; i < 50; i++) {
                recordFrameRate();

                const attacker = createMockUnit({
                    id: `attacker-${i}`,
                    faction: 'player'
                });
                const target = createMockUnit({
                    id: `target-${i}`,
                    faction: 'enemy'
                });

                characterManager.addUnit(attacker);
                characterManager.addUnit(target);

                await battleSystem.initiateAttack(attacker);
                await battleSystem.selectTarget(target);

                characterManager.removeUnit(attacker.id);
                characterManager.removeUnit(target.id);

                recordFrameRate();
            }

            // フレームレート統計
            const averageFPS = frameRateHistory.reduce((a, b) => a + b) / frameRateHistory.length;
            const minFPS = Math.min(...frameRateHistory);
            const maxFPS = Math.max(...frameRateHistory);
            const stableFrames = frameRateHistory.filter(fps => fps > 30).length;
            const stabilityRate = stableFrames / frameRateHistory.length;

            // フレームレート要件の確認
            expect(averageFPS).toBeGreaterThan(45); // 平均45fps以上
            expect(minFPS).toBeGreaterThan(20); // 最低20fps以上
            expect(stabilityRate).toBeGreaterThan(0.9); // 90%以上が30fps以上

            console.log(`フレームレート安定性:
        平均FPS: ${averageFPS.toFixed(2)}
        最低FPS: ${minFPS.toFixed(2)}
        最高FPS: ${maxFPS.toFixed(2)}
        安定率: ${(stabilityRate * 100).toFixed(1)}%`);
        });

        test('重い処理中のフレームレート維持', async () => {
            const heavyCalculationUnit = createMockUnit({
                id: 'heavy-unit',
                position: { x: 50, y: 50 },
                faction: 'player'
            });

            // 重い計算を含む武器
            const complexWeapon = createMockWeapon({
                type: WeaponType.STAFF,
                range: 20,
                rangePattern: {
                    type: 'custom',
                    range: 20,
                    pattern: Array.from({ length: 1681 }, (_, i) => ({
                        x: (i % 41) - 20,
                        y: Math.floor(i / 41) - 20
                    }))
                }
            });

            heavyCalculationUnit.equipment = { weapon: complexWeapon };
            characterManager.addUnit(heavyCalculationUnit);

            // 大量の敵を配置
            for (let i = 0; i < 200; i++) {
                const enemy = createMockUnit({
                    id: `enemy-${i}`,
                    position: {
                        x: 30 + (i % 20),
                        y: 30 + Math.floor(i / 20)
                    },
                    faction: 'enemy'
                });
                characterManager.addUnit(enemy);
            }

            const frameRates: number[] = [];
            let lastTime = performance.now();

            // フレームレート監視開始
            const monitoringInterval = setInterval(() => {
                const currentTime = performance.now();
                const fps = 1000 / (currentTime - lastTime);
                frameRates.push(fps);
                lastTime = currentTime;
            }, 16);

            // 重い処理を実行
            await battleSystem.initiateAttack(heavyCalculationUnit);
            const enemies = characterManager.getEnemyUnits();
            await battleSystem.selectTarget(enemies[100]);

            clearInterval(monitoringInterval);

            // フレームレート分析
            const averageFPS = frameRates.reduce((a, b) => a + b) / frameRates.length;
            const droppedFrames = frameRates.filter(fps => fps < 30).length;
            const dropRate = droppedFrames / frameRates.length;

            // 重い処理中でもフレームレートが維持されることを確認
            expect(averageFPS).toBeGreaterThan(35); // 平均35fps以上
            expect(dropRate).toBeLessThan(0.2); // フレームドロップ率20%以下

            console.log(`重い処理中のフレームレート:
        平均FPS: ${averageFPS.toFixed(2)}
        フレームドロップ率: ${(dropRate * 100).toFixed(1)}%`);
        });
    });

    describe('キャッシュとパフォーマンス最適化', () => {
        test('攻撃範囲計算のキャッシュ効果', async () => {
            const calculator = new AttackRangeCalculator();
            const attacker = createMockUnit({
                position: { x: 10, y: 10 }
            });
            const weapon = createMockWeapon({
                range: 5
            });

            // キャッシュなしでの計算時間
            calculator.clearCache();
            const noCacheStartTime = performance.now();
            for (let i = 0; i < 100; i++) {
                calculator.calculateAttackRange(attacker, weapon);
            }
            const noCacheTime = performance.now() - noCacheStartTime;

            // キャッシュありでの計算時間
            const cacheStartTime = performance.now();
            for (let i = 0; i < 100; i++) {
                calculator.calculateAttackRange(attacker, weapon);
            }
            const cacheTime = performance.now() - cacheStartTime;

            // キャッシュにより計算時間が短縮されることを確認
            expect(cacheTime).toBeLessThan(noCacheTime * 0.5);

            console.log(`キャッシュ効果:
        キャッシュなし: ${noCacheTime.toFixed(2)}ms
        キャッシュあり: ${cacheTime.toFixed(2)}ms
        改善率: ${((1 - cacheTime / noCacheTime) * 100).toFixed(1)}%`);
        });

        test('オブジェクトプールの効果', async () => {
            const animator = new BattleAnimator(mockScene);

            // オブジェクトプールなしでの実行
            animator.setObjectPoolEnabled(false);
            const noPoolStartTime = performance.now();
            for (let i = 0; i < 1000; i++) {
                const unit = createMockUnit({ id: `unit-${i}` });
                await animator.showDamageEffect(unit, 25, 'physical');
            }
            const noPoolTime = performance.now() - noPoolStartTime;

            // オブジェクトプールありでの実行
            animator.setObjectPoolEnabled(true);
            const poolStartTime = performance.now();
            for (let i = 0; i < 1000; i++) {
                const unit = createMockUnit({ id: `unit-${i}` });
                await animator.showDamageEffect(unit, 25, 'physical');
            }
            const poolTime = performance.now() - poolStartTime;

            // オブジェクトプールにより実行時間が短縮されることを確認
            expect(poolTime).toBeLessThan(noPoolTime * 0.8);

            console.log(`オブジェクトプール効果:
        プールなし: ${noPoolTime.toFixed(2)}ms
        プールあり: ${poolTime.toFixed(2)}ms
        改善率: ${((1 - poolTime / noPoolTime) * 100).toFixed(1)}%`);
        });
    });
});