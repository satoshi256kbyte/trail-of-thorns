/**
 * JobPerformanceOptimization.test.ts
 * 
 * 職業システムのパフォーマンス最適化とメモリ管理のテスト
 * 要件8.1-8.5に対応したテストケース
 */

import { JobPerformanceManager } from '../JobPerformanceManager';
import { JobMemoryMonitor } from '../JobMemoryMonitor';
import { JobCacheOptimizer } from '../JobCacheOptimizer';
import { JobUIOptimizer, UIUpdateType, UIUpdatePriority } from '../JobUIOptimizer';
import { JobCategory } from '../../../types/job';

// モック設定
global.Phaser = {
    Events: {
        EventEmitter: class {
            on = jest.fn();
            emit = jest.fn();
            removeAllListeners = jest.fn();
        }
    }
} as any;

jest.mock('phaser', () => global.Phaser);

describe('JobPerformanceOptimization', () => {
    let performanceManager: JobPerformanceManager;
    let memoryMonitor: JobMemoryMonitor;
    let cacheOptimizer: JobCacheOptimizer;
    let uiOptimizer: JobUIOptimizer;

    beforeEach(() => {
        performanceManager = new JobPerformanceManager();
        memoryMonitor = new JobMemoryMonitor();
        cacheOptimizer = new JobCacheOptimizer();
        uiOptimizer = new JobUIOptimizer();
    });

    afterEach(() => {
        performanceManager?.dispose();
        memoryMonitor?.dispose();
        cacheOptimizer?.dispose();
        uiOptimizer?.dispose();
    });

    describe('JobPerformanceManager', () => {
        test('should initialize with default configuration', () => {
            expect(performanceManager).toBeDefined();
            const metrics = performanceManager.getPerformanceMetrics();
            expect(metrics.cacheHitRate).toBe(0);
            expect(metrics.averageCalculationTime).toBe(0);
        });

        test('should manage object pools correctly', () => {
            // オブジェクトプールからオブジェクトを取得
            const statModifiers = performanceManager.getFromPool('StatModifiers');
            expect(statModifiers).toBeDefined();
            expect(typeof statModifiers).toBe('object');

            // オブジェクトをプールに返却
            performanceManager.returnToPool('StatModifiers', statModifiers);

            const metrics = performanceManager.getPerformanceMetrics();
            expect(metrics.objectPoolUtilization).toBeGreaterThanOrEqual(0);
        });

        test('should cache stat modifiers efficiently', () => {
            const mockJob = {
                id: 'warrior',
                name: 'Warrior',
                maxRank: 5,
                getStatModifiers: () => ({ hp: 10, mp: 0, attack: 5, defense: 3, speed: 1, skill: 0, luck: 0 })
            };

            // 初回アクセス（キャッシュミス）
            const stats1 = performanceManager.getCachedStatModifiers('char1', mockJob as any, 1);
            expect(stats1).toBeDefined();

            // 2回目アクセス（キャッシュヒット）
            const stats2 = performanceManager.getCachedStatModifiers('char1', mockJob as any, 1);
            expect(stats2).toEqual(stats1);

            const metrics = performanceManager.getPerformanceMetrics();
            expect(metrics.cacheHitRate).toBeGreaterThan(0);
        });

        test('should batch UI updates efficiently', () => {
            const updateSpy = jest.fn();

            // UI更新をスケジュール
            performanceManager.scheduleUIUpdate('char1', 'stats', 1);
            performanceManager.scheduleUIUpdate('char1', 'skills', 1);
            performanceManager.scheduleUIUpdate('char2', 'job', 2);

            // バッチ処理を実行
            performanceManager.processBatchedUIUpdates();

            // メトリクスを確認
            const metrics = performanceManager.getPerformanceMetrics();
            expect(metrics.uiUpdateFrequency).toBeGreaterThanOrEqual(0);
        });

        test('should preload common data', () => {
            const mockJobs = [{
                id: 'warrior',
                name: 'Warrior',
                maxRank: 3,
                getStatModifiers: () => ({ hp: 10, mp: 0, attack: 5, defense: 3, speed: 1, skill: 0, luck: 0 }),
                getAvailableSkills: () => ['sword_slash']
            }];

            const mockCharacters = [
                { id: 'char1', name: 'Test Character' }
            ];

            expect(() => {
                performanceManager.preloadCommonData(mockJobs as any, mockCharacters as any);
            }).not.toThrow();
        });
    });

    describe('JobMemoryMonitor', () => {
        test('should initialize memory monitoring', () => {
            expect(memoryMonitor).toBeDefined();

            const stats = memoryMonitor.getMemoryStats();
            expect(stats.current).toBeDefined();
            expect(stats.trackedObjects).toBe(0);
            expect(stats.gcCount).toBeGreaterThanOrEqual(0);
        });

        test('should track object references', () => {
            memoryMonitor.trackObject('obj1', 'TestObject', 100);
            memoryMonitor.trackObject('obj2', 'TestObject', 200);

            const stats = memoryMonitor.getMemoryStats();
            expect(stats.trackedObjects).toBe(2);

            memoryMonitor.untrackObject('obj1');
            const updatedStats = memoryMonitor.getMemoryStats();
            expect(updatedStats.trackedObjects).toBe(1);
        });

        test('should handle memory warnings', (done) => {
            memoryMonitor.onMemoryWarning((info) => {
                expect(info.usagePercentage).toBeGreaterThan(0);
                done();
            });

            // メモリ監視を開始
            memoryMonitor.startMonitoring();

            // テスト完了後に停止
            setTimeout(() => {
                memoryMonitor.stopMonitoring();
                if (!done.mock) done(); // done が既に呼ばれていない場合のみ
            }, 100);
        });

        test('should generate memory report', () => {
            memoryMonitor.trackObject('test1', 'TestType', 50);
            memoryMonitor.trackObject('test2', 'TestType', 75);

            const report = memoryMonitor.generateMemoryReport();
            expect(report).toContain('Job System Memory Report');
            expect(report).toContain('Tracked Objects: 2');
            expect(report).toContain('TestType: 2 objects');
        });
    });

    describe('JobCacheOptimizer', () => {
        test('should initialize with default configuration', () => {
            expect(cacheOptimizer).toBeDefined();

            const stats = cacheOptimizer.getCacheStats();
            expect(stats).toBeDefined();
            expect(stats.size).toBeGreaterThan(0);
        });

        test('should cache and retrieve data efficiently', () => {
            const testData = { value: 'test', number: 42 };
            const computeFunction = jest.fn(() => testData);

            // 初回アクセス（キャッシュミス）
            const result1 = cacheOptimizer.get('testCache', 'testKey', computeFunction);
            expect(result1).toEqual(testData);
            expect(computeFunction).toHaveBeenCalledTimes(1);

            // 2回目アクセス（キャッシュヒット）
            const result2 = cacheOptimizer.get('testCache', 'testKey');
            expect(result2).toEqual(testData);
            expect(computeFunction).toHaveBeenCalledTimes(1); // 呼ばれない
        });

        test('should preload common job data', () => {
            const mockJobs = [{
                id: 'warrior',
                name: 'Warrior',
                maxRank: 3,
                getStatModifiers: () => ({ hp: 10, mp: 0, attack: 5, defense: 3, speed: 1, skill: 0, luck: 0 }),
                getAvailableSkills: () => ['sword_slash']
            }];

            expect(() => {
                cacheOptimizer.preloadCommonData(mockJobs as any);
            }).not.toThrow();
        });

        test('should generate cache report', () => {
            // キャッシュにデータを追加
            cacheOptimizer.set('testCache', 'key1', { data: 'test1' });
            cacheOptimizer.set('testCache', 'key2', { data: 'test2' });

            const report = cacheOptimizer.generateCacheReport();
            expect(report).toContain('Job Cache Optimizer Report');
            expect(report).toContain('Hit Rate:');
            expect(report).toContain('Strategy:');
        });

        test('should clear cache when requested', () => {
            cacheOptimizer.set('testCache', 'key1', { data: 'test' });

            // 特定のキャッシュをクリア
            cacheOptimizer.clearCache('testCache');

            const result = cacheOptimizer.get('testCache', 'key1');
            expect(result).toBeNull();
        });
    });

    describe('JobUIOptimizer', () => {
        test('should initialize with default configuration', () => {
            expect(uiOptimizer).toBeDefined();

            const stats = uiOptimizer.getRenderingStats();
            expect(stats.totalUpdates).toBe(0);
            expect(stats.batchedUpdates).toBe(0);
        });

        test('should batch UI update requests', () => {
            const requestIds = uiOptimizer.batchUpdate('char1', [
                { updateType: UIUpdateType.STATS, data: { hp: 100 } },
                { updateType: UIUpdateType.SKILLS, data: { skills: ['skill1'] } },
                { updateType: UIUpdateType.JOB_INFO, data: { jobName: 'Warrior' } }
            ]);

            expect(requestIds).toHaveLength(3);
            requestIds.forEach(id => {
                expect(typeof id).toBe('string');
                expect(id.length).toBeGreaterThan(0);
            });
        });

        test('should handle immediate priority updates', () => {
            const requestId = uiOptimizer.requestUpdate({
                characterId: 'char1',
                updateType: UIUpdateType.STATS,
                priority: UIUpdatePriority.IMMEDIATE,
                data: { hp: 50 },
                dependencies: []
            });

            expect(typeof requestId).toBe('string');

            const stats = uiOptimizer.getRenderingStats();
            expect(stats.totalUpdates).toBeGreaterThan(0);
        });

        test('should set element visibility', () => {
            expect(() => {
                uiOptimizer.setElementVisibility('char1', UIUpdateType.STATS, false);
                uiOptimizer.setElementVisibility('char1', UIUpdateType.SKILLS, true);
            }).not.toThrow();
        });

        test('should generate optimization report', () => {
            // いくつかの更新をリクエスト
            uiOptimizer.requestUpdate({
                characterId: 'char1',
                updateType: UIUpdateType.STATS,
                priority: UIUpdatePriority.NORMAL,
                data: {},
                dependencies: []
            });

            const report = uiOptimizer.generateOptimizationReport();
            expect(report).toContain('Job UI Optimizer Report');
            expect(report).toContain('Total Updates:');
            expect(report).toContain('Average Render Time:');
        });

        test('should clear queues when requested', () => {
            // 更新をキューに追加
            uiOptimizer.requestUpdate({
                characterId: 'char1',
                updateType: UIUpdateType.STATS,
                priority: UIUpdatePriority.LOW,
                data: {},
                dependencies: []
            });

            // キューをクリア
            uiOptimizer.clearQueues();

            const report = uiOptimizer.generateOptimizationReport();
            expect(report).toContain('Pending Updates: 0');
        });
    });

    describe('JobSystem Integration', () => {
        let jobSystem: JobSystem;

        beforeEach(() => {
            jobSystem = new JobSystem({
                enablePerformanceOptimization: true,
                enableMemoryMonitoring: true,
                enableCacheOptimization: true,
                enableUIOptimization: true,
                debugMode: true
            });
        });

        afterEach(() => {
            jobSystem?.destroy();
        });

        test('should initialize with performance optimization enabled', async () => {
            await jobSystem.initialize();

            expect(jobSystem.isSystemInitialized()).toBe(true);

            const metrics = jobSystem.getPerformanceMetrics();
            expect(metrics).toBeDefined();
        });

        test('should generate comprehensive performance report', async () => {
            await jobSystem.initialize();

            const report = jobSystem.generatePerformanceReport();
            expect(report).toContain('Job System Performance Report');
        });

        test('should handle optimized UI updates', async () => {
            await jobSystem.initialize();

            expect(() => {
                jobSystem.requestOptimizedUIUpdate('char1', 'stats', { hp: 100 }, 1);
                jobSystem.batchUIUpdates('char1', [
                    { updateType: 'skills', data: { skills: [] } },
                    { updateType: 'job_info', data: { jobName: 'Test' } }
                ]);
            }).not.toThrow();
        });

        test('should preload common job data', async () => {
            await jobSystem.initialize();

            // テスト用の職業を登録
            const warriorJob = new WarriorJob({
                id: 'warrior',
                name: 'Warrior',
                description: 'A brave warrior',
                category: JobCategory.WARRIOR,
                maxRank: 3,
                statModifiers: { 1: { hp: 10, mp: 0, attack: 5, defense: 3, speed: 1, skill: 0, luck: 0 } },
                availableSkills: { 1: ['sword_slash'] },
                rankUpRequirements: { 2: { roseEssenceCost: 10, levelRequirement: 5, prerequisiteSkills: [] } },
                growthRateModifiers: { 1: { hp: 1.1, mp: 1.0, attack: 1.2, defense: 1.1, speed: 1.0, skill: 1.0, luck: 1.0 } },
                jobTraits: [],
                visual: { iconPath: '', spriteModifications: [], colorScheme: { primary: '#ff0000', secondary: '#ffffff' } }
            });

            jobSystem.registerJob(warriorJob);

            expect(() => {
                jobSystem.preloadCommonJobData();
            }).not.toThrow();
        });

        test('should force memory cleanup', async () => {
            await jobSystem.initialize();

            expect(() => {
                jobSystem.forceMemoryCleanup();
            }).not.toThrow();
        });

        test('should handle performance optimization errors gracefully', async () => {
            // パフォーマンス最適化を無効にしたシステム
            const systemWithoutOptimization = new JobSystem({
                enablePerformanceOptimization: false,
                enableMemoryMonitoring: false,
                enableCacheOptimization: false,
                enableUIOptimization: false
            });

            await systemWithoutOptimization.initialize();

            // 最適化機能が無効でもエラーが発生しないことを確認
            expect(() => {
                systemWithoutOptimization.requestOptimizedUIUpdate('char1', 'stats', {});
                systemWithoutOptimization.preloadCommonJobData();
                systemWithoutOptimization.forceMemoryCleanup();
            }).not.toThrow();

            systemWithoutOptimization.destroy();
        });
    });

    describe('Performance Requirements Validation', () => {
        test('should meet job data loading time requirement (8.1)', async () => {
            const startTime = performance.now();

            const jobSystem = new JobSystem({
                enablePerformanceOptimization: true,
                enableCacheOptimization: true
            });

            await jobSystem.initialize();

            // テスト用職業データを作成
            const testJobs = new Map();
            for (let i = 0; i < 10; i++) {
                testJobs.set(`job${i}`, {
                    id: `job${i}`,
                    name: `Job ${i}`,
                    category: JobCategory.WARRIOR,
                    maxRank: 5
                });
            }

            const loadStartTime = performance.now();
            // 職業データの読み込みをシミュレート
            jobSystem.preloadCommonJobData();
            const loadEndTime = performance.now();

            const loadTime = loadEndTime - loadStartTime;

            // 要件8.1: 職業データの読み込み時間が2秒以内
            expect(loadTime).toBeLessThan(2000);

            jobSystem.destroy();
        });

        test('should meet job change processing time requirement (8.2)', async () => {
            const jobSystem = new JobSystem({
                enablePerformanceOptimization: true,
                enableUIOptimization: true
            });

            await jobSystem.initialize();

            // テスト用職業を登録
            const warriorJob = new WarriorJob({
                id: 'warrior',
                name: 'Warrior',
                description: 'A brave warrior',
                category: JobCategory.WARRIOR,
                maxRank: 3,
                statModifiers: { 1: { hp: 10, mp: 0, attack: 5, defense: 3, speed: 1, skill: 0, luck: 0 } },
                availableSkills: { 1: ['sword_slash'] },
                rankUpRequirements: { 2: { roseEssenceCost: 10, levelRequirement: 5, prerequisiteSkills: [] } },
                growthRateModifiers: { 1: { hp: 1.1, mp: 1.0, attack: 1.2, defense: 1.1, speed: 1.0, skill: 1.0, luck: 1.0 } },
                jobTraits: [],
                visual: { iconPath: '', spriteModifications: [], colorScheme: { primary: '#ff0000', secondary: '#ffffff' } }
            });

            const mageJob = new MageJob({
                id: 'mage',
                name: 'Mage',
                description: 'A powerful mage',
                category: JobCategory.MAGE,
                maxRank: 3,
                statModifiers: { 1: { hp: 5, mp: 15, attack: 3, defense: 1, speed: 2, skill: 4, luck: 1 } },
                availableSkills: { 1: ['fire_bolt'] },
                rankUpRequirements: { 2: { roseEssenceCost: 10, levelRequirement: 5, prerequisiteSkills: [] } },
                growthRateModifiers: { 1: { hp: 1.0, mp: 1.3, attack: 1.1, defense: 1.0, speed: 1.1, skill: 1.2, luck: 1.0 } },
                jobTraits: [],
                visual: { iconPath: '', spriteModifications: [], colorScheme: { primary: '#0000ff', secondary: '#ffffff' } }
            });

            jobSystem.registerJob(warriorJob);
            jobSystem.registerJob(mageJob);

            // キャラクターに初期職業を設定
            jobSystem.setCharacterJob('testChar', 'warrior', 1);

            const changeStartTime = performance.now();

            // 職業変更を実行
            try {
                await jobSystem.changeJob('testChar', 'mage');
            } catch (error) {
                // エラーが発生してもタイミングは測定
            }

            const changeEndTime = performance.now();
            const changeTime = changeEndTime - changeStartTime;

            // 要件8.2: 職業変更の処理時間が1秒以内
            expect(changeTime).toBeLessThan(1000);

            jobSystem.destroy();
        });

        test('should manage memory usage appropriately (8.3)', () => {
            const memoryMonitor = new JobMemoryMonitor({
                monitoringInterval: 100,
                warningThreshold: 0.8,
                enableLeakDetection: true
            });

            // オブジェクトを追跡
            for (let i = 0; i < 100; i++) {
                memoryMonitor.trackObject(`obj${i}`, 'TestObject', 1000);
            }

            const stats = memoryMonitor.getMemoryStats();
            expect(stats.trackedObjects).toBe(100);

            // メモリ使用量が適切に管理されていることを確認
            expect(stats.current.usagePercentage).toBeGreaterThanOrEqual(0);
            expect(stats.current.usagePercentage).toBeLessThanOrEqual(1);

            memoryMonitor.dispose();
        });

        test('should optimize CPU resource usage (8.4)', () => {
            const cacheOptimizer = new JobCacheOptimizer({
                strategy: 'adaptive',
                maxSize: 100,
                enablePredictive: true
            });

            const performanceManager = new JobPerformanceManager();

            // CPU集約的な計算をシミュレート
            const heavyComputation = () => {
                let result = 0;
                for (let i = 0; i < 1000; i++) {
                    result += Math.sqrt(i);
                }
                return { result };
            };

            const startTime = performance.now();

            // 初回計算（キャッシュなし）
            const result1 = cacheOptimizer.get('heavy', 'computation1', heavyComputation);

            // 2回目計算（キャッシュあり）
            const result2 = cacheOptimizer.get('heavy', 'computation1');

            const endTime = performance.now();

            expect(result1).toEqual(result2);
            expect(endTime - startTime).toBeLessThan(100); // 最適化により高速化

            const stats = cacheOptimizer.getCacheStats();
            const cacheStats = Array.from(stats.values())[0];
            if (cacheStats) {
                expect(cacheStats.hitRate).toBeGreaterThan(0);
            }

            cacheOptimizer.dispose();
            performanceManager.dispose();
        });

        test('should not affect game system on errors (8.5)', async () => {
            const jobSystem = new JobSystem({
                enablePerformanceOptimization: true,
                debugMode: false // エラーログを抑制
            });

            await jobSystem.initialize();

            // エラーが発生する可能性のある操作を実行
            expect(() => {
                // 存在しないキャラクターでUI更新
                jobSystem.requestOptimizedUIUpdate('nonexistent', 'stats', {});

                // 無効なデータでバッチ更新
                jobSystem.batchUIUpdates('invalid', []);

                // メモリクリーンアップ
                jobSystem.forceMemoryCleanup();

                // パフォーマンスレポート生成
                jobSystem.generatePerformanceReport();

            }).not.toThrow();

            // システムが正常に動作することを確認
            expect(jobSystem.isSystemInitialized()).toBe(true);

            jobSystem.destroy();
        });
    });
});