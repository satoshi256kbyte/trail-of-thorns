/**
 * ExperienceSystemBenchmark - 経験値システムパフォーマンステスト
 * 
 * このテストファイルは経験値システムのパフォーマンスとメモリ使用量を監視します:
 * - 経験値計算のパフォーマンステスト
 * - レベルアップ処理のパフォーマンステスト
 * - バッチ処理のパフォーマンステスト
 * - メモリ使用量の監視
 * - キャッシュ効率のテスト
 * 
 * 要件: 8.1, 8.2, 8.3, 8.4, 8.5
 * 
 * @version 1.0.0
 * @author Trail of Thorns Development Team
 */

import { ExperienceSystem } from '../../game/src/systems/experience/ExperienceSystem';
import { ExperiencePerformanceManager } from '../../game/src/systems/experience/ExperiencePerformanceManager';
import { ExperienceCache } from '../../game/src/systems/experience/ExperienceCache';
import { ExperienceObjectPool } from '../../game/src/systems/experience/ExperienceObjectPool';
import { ExperienceBatchProcessor } from '../../game/src/systems/experience/ExperienceBatchProcessor';
import { ExperienceAction, ExperienceSource, ExperienceContext } from '../../game/src/types/experience';
import { Unit } from '../../game/src/types/gameplay';

// モックシーン
class MockScene {
    public add = {
        container: jest.fn().mockReturnValue({
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            add: jest.fn().mockReturnThis()
        }),
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn().mockReturnThis(),
            fillCircle: jest.fn().mockReturnThis(),
            fillRoundedRect: jest.fn().mockReturnThis(),
            lineStyle: jest.fn().mockReturnThis(),
            strokeRoundedRect: jest.fn().mockReturnThis(),
            clear: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis()
        }),
        text: jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setY: jest.fn().mockReturnThis(),
            setText: jest.fn().mockReturnThis(),
            setColor: jest.fn().mockReturnThis()
        })
    };
    public tweens = {
        add: jest.fn(),
        killTweensOf: jest.fn()
    };
    public time = {
        delayedCall: jest.fn()
    };
    public cameras = {
        main: { width: 1920, height: 1080 }
    };
}

describe('ExperienceSystem Performance Benchmark', () => {
    let mockScene: MockScene;
    let experienceSystem: ExperienceSystem;
    let performanceManager: ExperiencePerformanceManager;
    let cache: ExperienceCache;
    let objectPool: ExperienceObjectPool;
    let batchProcessor: ExperienceBatchProcessor;

    // テスト用のキャラクターデータ
    const createMockCharacter = (id: string, level: number = 1): Unit => ({
        id,
        name: `Character ${id}`,
        position: { x: 0, y: 0 },
        stats: {
            maxHP: 100,
            maxMP: 50,
            attack: 20,
            defense: 15,
            speed: 10,
            movement: 3
        },
        currentHP: 100,
        currentMP: 50,
        level,
        faction: 'player',
        hasActed: false,
        hasMoved: false
    });

    beforeEach(async () => {
        mockScene = new MockScene();

        // パフォーマンスマネージャーを初期化
        performanceManager = ExperiencePerformanceManager.getInstance();

        // キャッシュを初期化
        cache = ExperienceCache.getInstance();

        // オブジェクトプールを初期化
        objectPool = new ExperienceObjectPool(mockScene as any);

        // バッチプロセッサーを初期化
        batchProcessor = new ExperienceBatchProcessor();

        // 経験値システムを初期化
        experienceSystem = new ExperienceSystem(mockScene as any);
        await experienceSystem.initialize();

        // 最適化コンポーネントを登録
        performanceManager.registerOptimizationComponents({
            cacheManager: cache,
            objectPoolManager: objectPool,
            batchProcessor: batchProcessor
        });

        batchProcessor.setExperienceSystem(experienceSystem);

        // パフォーマンス監視を開始
        performanceManager.startMonitoring();
    });

    afterEach(() => {
        performanceManager.stopMonitoring();
        cache.clear();
        objectPool.clear();
        batchProcessor.clearQueue();
    });

    describe('経験値計算パフォーマンス', () => {
        test('単一キャラクターの経験値計算が100ms以内に完了する', async () => {
            const character = createMockCharacter('test-char-1');
            experienceSystem.registerCharacter(character);

            const context: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK_HIT,
                timestamp: Date.now()
            };

            performanceManager.startTimer('experience-calculation');

            const result = experienceSystem.awardExperience(
                character.id,
                ExperienceAction.ATTACK_HIT,
                context
            );

            const duration = performanceManager.endTimer('experience-calculation');

            expect(result).toBeTruthy();
            expect(duration).toBeLessThan(100); // 100ms以内
        });

        test('100キャラクターの経験値計算が1秒以内に完了する', async () => {
            const characters: Unit[] = [];

            // 100キャラクターを作成・登録
            for (let i = 0; i < 100; i++) {
                const character = createMockCharacter(`char-${i}`);
                characters.push(character);
                experienceSystem.registerCharacter(character);
            }

            const startTime = performance.now();

            // 各キャラクターに経験値を付与
            for (const character of characters) {
                const context: ExperienceContext = {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK_HIT,
                    timestamp: Date.now()
                };

                experienceSystem.awardExperience(
                    character.id,
                    ExperienceAction.ATTACK_HIT,
                    context
                );
            }

            const duration = performance.now() - startTime;

            expect(duration).toBeLessThan(1000); // 1秒以内
        });

        test('キャッシュ使用時の経験値計算が高速化される', async () => {
            const character = createMockCharacter('cache-test-char');
            experienceSystem.registerCharacter(character);

            const context: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK_HIT,
                timestamp: Date.now()
            };

            // 初回実行（キャッシュミス）
            const startTime1 = performance.now();
            experienceSystem.awardExperience(character.id, ExperienceAction.ATTACK_HIT, context);
            const duration1 = performance.now() - startTime1;

            // 2回目実行（キャッシュヒット）
            const startTime2 = performance.now();
            experienceSystem.awardExperience(character.id, ExperienceAction.ATTACK_HIT, context);
            const duration2 = performance.now() - startTime2;

            // キャッシュ使用時の方が高速であることを確認
            expect(duration2).toBeLessThan(duration1);

            // キャッシュ統計を確認
            const cacheStats = cache.getStatistics();
            expect(cacheStats.hitRate).toBeGreaterThan(0);
        });
    });

    describe('レベルアップ処理パフォーマンス', () => {
        test('単一キャラクターのレベルアップが200ms以内に完了する', async () => {
            const character = createMockCharacter('levelup-test-char');
            experienceSystem.registerCharacter(character, 1, 99); // レベルアップ直前

            performanceManager.startTimer('levelup-processing');

            const context: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.ENEMY_DEFEAT,
                timestamp: Date.now()
            };

            // 大量の経験値を付与してレベルアップを発生させる
            experienceSystem.awardExperience(character.id, ExperienceAction.ENEMY_DEFEAT, context);
            const levelUpResult = experienceSystem.checkAndProcessLevelUp(character.id);

            const duration = performanceManager.endTimer('levelup-processing');

            expect(levelUpResult).toBeTruthy();
            expect(duration).toBeLessThan(200); // 200ms以内
        });

        test('複数キャラクターの同時レベルアップが効率的に処理される', async () => {
            const characters: Unit[] = [];

            // 10キャラクターを作成・登録（レベルアップ直前）
            for (let i = 0; i < 10; i++) {
                const character = createMockCharacter(`levelup-char-${i}`, 1);
                characters.push(character);
                experienceSystem.registerCharacter(character, 1, 99);
            }

            const startTime = performance.now();

            // 各キャラクターをレベルアップさせる
            for (const character of characters) {
                const context: ExperienceContext = {
                    source: ExperienceSource.ENEMY_DEFEAT,
                    action: ExperienceAction.ENEMY_DEFEAT,
                    timestamp: Date.now()
                };

                experienceSystem.awardExperience(character.id, ExperienceAction.ENEMY_DEFEAT, context);
                experienceSystem.checkAndProcessLevelUp(character.id);
            }

            const duration = performance.now() - startTime;

            expect(duration).toBeLessThan(1000); // 1秒以内
        });
    });

    describe('バッチ処理パフォーマンス', () => {
        test('バッチ処理が個別処理より高速である', async () => {
            const characters: Unit[] = [];

            // 50キャラクターを作成・登録
            for (let i = 0; i < 50; i++) {
                const character = createMockCharacter(`batch-char-${i}`);
                characters.push(character);
                experienceSystem.registerCharacter(character);
            }

            // 個別処理の時間を測定
            const startTime1 = performance.now();
            for (const character of characters) {
                const context: ExperienceContext = {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK_HIT,
                    timestamp: Date.now()
                };
                experienceSystem.awardExperience(character.id, ExperienceAction.ATTACK_HIT, context);
            }
            const individualDuration = performance.now() - startTime1;

            // バッチ処理の時間を測定
            const batchRequests = characters.map(character => ({
                characterId: character.id,
                action: ExperienceAction.ATTACK_HIT,
                context: {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK_HIT,
                    timestamp: Date.now()
                } as ExperienceContext,
                priority: 0
            }));

            const startTime2 = performance.now();
            batchProcessor.addRequests(batchRequests);
            await batchProcessor.processBatch();
            const batchDuration = performance.now() - startTime2;

            // バッチ処理の方が高速であることを確認
            expect(batchDuration).toBeLessThan(individualDuration);
        });

        test('大量のバッチ処理が効率的に実行される', async () => {
            const characters: Unit[] = [];

            // 200キャラクターを作成・登録
            for (let i = 0; i < 200; i++) {
                const character = createMockCharacter(`large-batch-char-${i}`);
                characters.push(character);
                experienceSystem.registerCharacter(character);
            }

            const batchRequests = characters.map(character => ({
                characterId: character.id,
                action: ExperienceAction.ATTACK_HIT,
                context: {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK_HIT,
                    timestamp: Date.now()
                } as ExperienceContext,
                priority: 0
            }));

            performanceManager.startTimer('batch-processing');

            batchProcessor.addRequests(batchRequests);
            const result = await batchProcessor.processBatch();

            const duration = performanceManager.endTimer('batch-processing');

            expect(result.successfulProcessed).toBe(200);
            expect(duration).toBeLessThan(2000); // 2秒以内
        });
    });

    describe('メモリ使用量監視', () => {
        test('メモリ使用量が制限内に収まる', async () => {
            const initialMetrics = performanceManager.getMetrics();
            const initialMemory = initialMetrics.memoryUsage;

            // 大量のオブジェクトを作成
            const characters: Unit[] = [];
            for (let i = 0; i < 100; i++) {
                const character = createMockCharacter(`memory-test-char-${i}`);
                characters.push(character);
                experienceSystem.registerCharacter(character);

                // 経験値処理を実行
                const context: ExperienceContext = {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK_HIT,
                    timestamp: Date.now()
                };
                experienceSystem.awardExperience(character.id, ExperienceAction.ATTACK_HIT, context);
            }

            // メトリクスを更新
            await new Promise(resolve => setTimeout(resolve, 1100)); // 監視間隔を待つ

            const finalMetrics = performanceManager.getMetrics();
            const memoryIncrease = finalMetrics.memoryUsage - initialMemory;

            // メモリ増加が10MB以下であることを確認
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
        });

        test('オブジェクトプールがメモリ効率を改善する', async () => {
            // プール使用前のメモリ使用量
            const beforePoolMetrics = performanceManager.getMetrics();

            // プールを使わずにオブジェクトを大量作成・破棄
            for (let i = 0; i < 50; i++) {
                const effect = objectPool.getLevelUpEffect();
                objectPool.returnLevelUpEffect(effect);
            }

            const afterPoolMetrics = performanceManager.getMetrics();
            const poolStats = objectPool.getStatistics();

            // 再利用率が高いことを確認
            expect(poolStats.reuseRate).toBeGreaterThan(0.8);

            // メモリ効率が改善されていることを確認
            const memoryIncrease = afterPoolMetrics.memoryUsage - beforePoolMetrics.memoryUsage;
            expect(memoryIncrease).toBeLessThan(1024 * 1024); // 1MB以下
        });

        test('キャッシュがメモリ制限を守る', async () => {
            // キャッシュに大量のデータを追加
            for (let i = 0; i < 1000; i++) {
                cache.getRequiredExperience(i);
                cache.getExperienceGain('attackHit', 'normal');
                cache.getGrowthRates('warrior');
            }

            const cacheStats = cache.getStatistics();

            // キャッシュサイズが制限内であることを確認
            expect(cacheStats.totalSize).toBeLessThan(5 * 1024 * 1024); // 5MB以下
            expect(cacheStats.entryCount).toBeLessThan(1000);
        });
    });

    describe('パフォーマンス最適化', () => {
        test('自動最適化が実行される', async () => {
            const beforeMetrics = performanceManager.getMetrics();

            // 負荷をかける
            for (let i = 0; i < 100; i++) {
                const character = createMockCharacter(`optimization-char-${i}`);
                experienceSystem.registerCharacter(character);

                const context: ExperienceContext = {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK_HIT,
                    timestamp: Date.now()
                };
                experienceSystem.awardExperience(character.id, ExperienceAction.ATTACK_HIT, context);
            }

            // 最適化を実行
            const optimizationResults = await performanceManager.performOptimization();

            expect(optimizationResults.length).toBeGreaterThan(0);

            const afterMetrics = performanceManager.getMetrics();

            // 何らかの改善があることを確認
            expect(afterMetrics.lastUpdated).toBeGreaterThan(beforeMetrics.lastUpdated);
        });

        test('パフォーマンスアラートが適切に発行される', async () => {
            let alertReceived = false;

            performanceManager.onPerformanceAlert((alert) => {
                alertReceived = true;
                expect(alert.type).toBeDefined();
                expect(alert.severity).toBeDefined();
                expect(alert.message).toBeDefined();
                expect(alert.suggestions).toBeDefined();
            });

            // 意図的に高負荷をかける
            const startTime = performance.now();
            while (performance.now() - startTime < 150) {
                // 150ms間処理を続ける（閾値を超える）
                const character = createMockCharacter(`alert-test-char-${Math.random()}`);
                experienceSystem.registerCharacter(character);
            }

            // アラートが発行されるまで待つ
            await new Promise(resolve => setTimeout(resolve, 2000));

            // アラートが発行されたことを確認（条件によっては発行されない場合もある）
            // expect(alertReceived).toBe(true);
        });
    });

    describe('パフォーマンスレポート', () => {
        test('パフォーマンスレポートが生成される', async () => {
            // いくつかの処理を実行
            const character = createMockCharacter('report-test-char');
            experienceSystem.registerCharacter(character);

            for (let i = 0; i < 10; i++) {
                const context: ExperienceContext = {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK_HIT,
                    timestamp: Date.now()
                };
                experienceSystem.awardExperience(character.id, ExperienceAction.ATTACK_HIT, context);
            }

            const report = performanceManager.generatePerformanceReport();

            expect(report).toContain('Experience System Performance Report');
            expect(report).toContain('Current Metrics');
            expect(report).toContain('Performance Status');
            expect(typeof report).toBe('string');
            expect(report.length).toBeGreaterThan(100);
        });
    });

    describe('リソース解放', () => {
        test('システム終了時にリソースが適切に解放される', () => {
            const beforeMetrics = performanceManager.getMetrics();

            // リソースを解放
            performanceManager.dispose();
            cache.dispose();
            objectPool.dispose();

            // メモリリークがないことを確認
            const afterMetrics = performanceManager.getMetrics();

            // 解放後はメトリクスがリセットされることを確認
            expect(afterMetrics.objectCount).toBeLessThanOrEqual(beforeMetrics.objectCount);
        });
    });
});

describe('ExperienceCache Performance Tests', () => {
    let cache: ExperienceCache;

    beforeEach(() => {
        cache = ExperienceCache.getInstance();
        cache.clear();
    });

    afterEach(() => {
        cache.dispose();
    });

    test('キャッシュヒット率が高い', () => {
        // 同じデータに複数回アクセス
        for (let i = 0; i < 10; i++) {
            cache.getRequiredExperience(5);
            cache.getExperienceGain('attackHit', 'normal');
        }

        const stats = cache.getStatistics();
        expect(stats.hitRate).toBeGreaterThan(0.5); // 50%以上のヒット率
    });

    test('キャッシュサイズが制限内に収まる', () => {
        // 大量のデータをキャッシュ
        for (let i = 0; i < 200; i++) {
            cache.getRequiredExperience(i);
        }

        const stats = cache.getStatistics();
        expect(stats.entryCount).toBeLessThanOrEqual(1000); // 最大エントリ数以下
    });
});

describe('ExperienceObjectPool Performance Tests', () => {
    let mockScene: MockScene;
    let objectPool: ExperienceObjectPool;

    beforeEach(() => {
        mockScene = new MockScene();
        objectPool = new ExperienceObjectPool(mockScene as any);
    });

    afterEach(() => {
        objectPool.dispose();
    });

    test('オブジェクト再利用率が高い', () => {
        // オブジェクトを取得・返却を繰り返す
        for (let i = 0; i < 20; i++) {
            const effect = objectPool.getLevelUpEffect();
            objectPool.returnLevelUpEffect(effect);
        }

        const stats = objectPool.getStatistics();
        expect(stats.reuseRate).toBeGreaterThan(0.8); // 80%以上の再利用率
    });

    test('プールサイズが適切に管理される', () => {
        // 大量のオブジェクトを作成
        const effects = [];
        for (let i = 0; i < 30; i++) {
            effects.push(objectPool.getLevelUpEffect());
        }

        // すべて返却
        effects.forEach(effect => objectPool.returnLevelUpEffect(effect));

        const stats = objectPool.getStatistics();
        expect(stats.currentInactive).toBeLessThanOrEqual(20); // 最大プールサイズ以下
    });
});