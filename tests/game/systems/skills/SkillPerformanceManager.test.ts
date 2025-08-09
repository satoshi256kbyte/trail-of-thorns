/**
 * スキルパフォーマンス管理システムのテスト
 * 
 * このファイルには以下のテストが含まれます：
 * - SkillPerformanceManager のユニットテスト
 * - SkillDataCache のテスト
 * - SkillObjectPool のテスト
 * - OptimizedConditionChecker のテスト
 * - PerformanceMonitor のテスト
 * - メモリ使用量監視のテスト
 */

import {
    SkillPerformanceManager,
    SkillDataCache,
    SkillObjectPool,
    OptimizedConditionChecker,
    PerformanceMonitor
} from '../../../../game/src/systems/skills/SkillPerformanceManager';

import {
    Skill,
    AttackSkill
} from '../../../../game/src/systems/skills/Skill';

import {
    SkillData,
    SkillType,
    TargetType,
    Position,
    CharacterSkillData
} from '../../../../game/src/types/skill';

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
    updateData(skillData: SkillData): void {
        // 読み取り専用プロパティを除いて更新
        const { id, ...updateableData } = skillData;
        Object.assign(this, updateableData);
    }

    reset(): void {
        // リセット処理
    }

    destroy(): void {
        // 破棄処理
    }

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

describe('SkillDataCache', () => {
    let cache: SkillDataCache;

    beforeEach(() => {
        cache = new SkillDataCache(10);
    });

    afterEach(() => {
        cache.clear();
    });

    describe('基本的なキャッシュ操作', () => {
        test('データの保存と取得ができる', () => {
            const testData = { value: 'test' };
            cache.set('key1', testData, 1);

            const retrieved = cache.get('key1');
            expect(retrieved).toEqual(testData);
        });

        test('存在しないキーに対してnullを返す', () => {
            const result = cache.get('nonexistent');
            expect(result).toBeNull();
        });

        test('データの削除ができる', () => {
            cache.set('key1', { value: 'test' }, 1);
            expect(cache.get('key1')).not.toBeNull();

            cache.delete('key1');
            expect(cache.get('key1')).toBeNull();
        });

        test('キャッシュのクリアができる', () => {
            cache.set('key1', { value: 'test1' }, 1);
            cache.set('key2', { value: 'test2' }, 1);

            cache.clear();
            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).toBeNull();
        });
    });

    describe('LRU（Least Recently Used）機能', () => {
        test('キャッシュサイズ制限を超えた場合、最も古いエントリが削除される', () => {
            const cache = new SkillDataCache(3);

            // キャッシュを満杯にする
            cache.set('key1', { value: 'test1' }, 1);
            cache.set('key2', { value: 'test2' }, 1);
            cache.set('key3', { value: 'test3' }, 1);

            // 新しいエントリを追加（key1が削除されるはず）
            cache.set('key4', { value: 'test4' }, 1);

            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).not.toBeNull();
            expect(cache.get('key3')).not.toBeNull();
            expect(cache.get('key4')).not.toBeNull();
        });

        test('アクセスされたエントリは削除されにくくなる', () => {
            const cache = new SkillDataCache(3);

            cache.set('key1', { value: 'test1' }, 1);
            cache.set('key2', { value: 'test2' }, 1);
            cache.set('key3', { value: 'test3' }, 1);

            // key1にアクセス（最近使用されたことになる）
            cache.get('key1');

            // 新しいエントリを追加（key2が削除されるはず）
            cache.set('key4', { value: 'test4' }, 1);

            expect(cache.get('key1')).not.toBeNull();
            expect(cache.get('key2')).toBeNull();
            expect(cache.get('key3')).not.toBeNull();
            expect(cache.get('key4')).not.toBeNull();
        });
    });

    describe('統計情報', () => {
        test('ヒット率が正しく計算される', () => {
            cache.set('key1', { value: 'test' }, 1);

            // ヒット
            cache.get('key1');
            cache.get('key1');

            // ミス
            cache.get('nonexistent');

            const stats = cache.getStatistics();
            expect(stats.hits).toBe(2);
            expect(stats.misses).toBe(1);
            expect(stats.hitRate).toBeCloseTo(2 / 3);
        });

        test('キャッシュサイズが正しく追跡される', () => {
            cache.set('key1', { value: 'test1' }, 5);
            cache.set('key2', { value: 'test2' }, 3);

            const stats = cache.getStatistics();
            expect(stats.size).toBe(2);
            expect(stats.totalSize).toBe(8);
        });
    });
});

describe('SkillObjectPool', () => {
    let pool: SkillObjectPool;

    beforeEach(() => {
        pool = new SkillObjectPool(5);
    });

    afterEach(() => {
        pool.clear();
    });

    describe('オブジェクトプール操作', () => {
        test('新規オブジェクト取得時はnullを返す', () => {
            const skillData = createMockSkillData();
            const skill = pool.acquire('attack', skillData);
            expect(skill).toBeNull();
        });

        test('オブジェクトの返却と再取得ができる', () => {
            const skillData = createMockSkillData();
            const mockSkill = new MockSkill(skillData);

            // プールに返却
            pool.release(mockSkill);

            // 再取得
            const reusedSkill = pool.acquire('attack', skillData);
            expect(reusedSkill).toBe(mockSkill);
        });

        test('プールサイズ制限が機能する', () => {
            const pool = new SkillObjectPool(2);
            const skillData = createMockSkillData();

            const skill1 = new MockSkill(skillData);
            const skill2 = new MockSkill(skillData);
            const skill3 = new MockSkill(skillData);

            pool.release(skill1);
            pool.release(skill2);
            pool.release(skill3); // これは制限により無視される

            // プールから取得できるのは2つまで
            const reused1 = pool.acquire('attack', skillData);
            const reused2 = pool.acquire('attack', skillData);
            const reused3 = pool.acquire('attack', skillData);

            expect(reused1).not.toBeNull();
            expect(reused2).not.toBeNull();
            expect(reused3).toBeNull();
        });
    });

    describe('統計情報', () => {
        test('作成・再利用カウントが正しく追跡される', () => {
            const skillData = createMockSkillData();
            const mockSkill = new MockSkill(skillData);

            // 新規作成をシミュレート
            pool.incrementCreatedCount();

            // 返却と再取得
            pool.release(mockSkill);
            const reused = pool.acquire('attack', skillData);

            const stats = pool.getStatistics();
            expect(stats.createdObjects).toBe(1);
            expect(stats.reusedObjects).toBe(1);
            expect(stats.reuseRate).toBe(0.5);
        });

        test('プール統計が正しく計算される', () => {
            const skillData = createMockSkillData();
            const skill1 = new MockSkill(skillData);
            const skill2 = new MockSkill(skillData);

            pool.release(skill1);
            pool.release(skill2);

            const stats = pool.getStatistics();
            expect(stats.totalPools).toBe(1); // 'attack' タイプのプール
            expect(stats.totalPooledObjects).toBe(2);
        });
    });
});

describe('OptimizedConditionChecker', () => {
    let cache: SkillDataCache;
    let checker: OptimizedConditionChecker;
    let mockSkill: MockSkill;
    let mockBattlefieldState: any;
    let mockCaster: any;

    beforeEach(() => {
        cache = new SkillDataCache(100);
        checker = new OptimizedConditionChecker(cache);
        mockSkill = new MockSkill(createMockSkillData());

        mockCaster = {
            id: 'caster1',
            level: 5,
            currentMP: 20,
            currentHP: 100,
            position: { x: 0, y: 0 },
            faction: 'player',
            hasActed: false,
            job: 'warrior',
            equipment: { weapon: 'sword' },
            statusEffects: [],
            stats: {
                maxHP: 100,
                maxMP: 50,
                attack: 20,
                defense: 15,
                magicAttack: 10,
                magicDefense: 10,
                speed: 12
            }
        };

        mockBattlefieldState = {
            getCharacter: jest.fn().mockReturnValue(mockCaster),
            getCharacterAt: jest.fn().mockReturnValue(null),
            getCurrentTurn: jest.fn().mockReturnValue(1),
            isValidPosition: jest.fn().mockReturnValue(true),
            isObstacle: jest.fn().mockReturnValue(false)
        };
    });

    afterEach(() => {
        checker.clear();
        cache.clear();
    });

    describe('早期リターン最適化', () => {
        test('MP不足の場合、早期にfalseを返す', () => {
            mockCaster.currentMP = 5; // 必要MP(10)より少ない

            const result = checker.canUseSkillOptimized(
                mockSkill,
                'caster1',
                { x: 1, y: 0 },
                mockBattlefieldState
            );

            expect(result.canUse).toBe(false);
            expect(result.message).toContain('MP不足');
        });

        test('行動済みの場合、早期にfalseを返す', () => {
            mockCaster.hasActed = true;

            const result = checker.canUseSkillOptimized(
                mockSkill,
                'caster1',
                { x: 1, y: 0 },
                mockBattlefieldState
            );

            expect(result.canUse).toBe(false);
            expect(result.message).toContain('行動済み');
        });

        test('レベル不足の場合、早期にfalseを返す', () => {
            mockCaster.level = 0; // 必要レベル(1)より少ない

            const result = checker.canUseSkillOptimized(
                mockSkill,
                'caster1',
                { x: 1, y: 0 },
                mockBattlefieldState
            );

            expect(result.canUse).toBe(false);
            expect(result.message).toContain('レベル不足');
        });

        test('射程外の場合、早期にfalseを返す', () => {
            const result = checker.canUseSkillOptimized(
                mockSkill,
                'caster1',
                { x: 5, y: 5 }, // 射程(1)を超えた位置
                mockBattlefieldState
            );

            expect(result.canUse).toBe(false);
            expect(result.message).toContain('射程外');
        });
    });

    describe('キャッシュ機能', () => {
        test('同じ条件での連続チェックはキャッシュされる', () => {
            const targetPosition = { x: 1, y: 0 };

            // 最初のチェック
            const result1 = checker.canUseSkillOptimized(
                mockSkill,
                'caster1',
                targetPosition,
                mockBattlefieldState
            );

            // 同じ条件での2回目のチェック（キャッシュから取得されるはず）
            const result2 = checker.canUseSkillOptimized(
                mockSkill,
                'caster1',
                targetPosition,
                mockBattlefieldState
            );

            expect(result1).toEqual(result2);
        });

        test('条件が変わった場合は新しくチェックされる', () => {
            const targetPosition = { x: 1, y: 0 };

            // 最初のチェック
            checker.canUseSkillOptimized(
                mockSkill,
                'caster1',
                targetPosition,
                mockBattlefieldState
            );

            // 条件を変更
            mockCaster.currentMP = 5;

            // 2回目のチェック（新しい結果が返されるはず）
            const result2 = checker.canUseSkillOptimized(
                mockSkill,
                'caster1',
                targetPosition,
                mockBattlefieldState
            );

            expect(result2.canUse).toBe(false);
        });
    });

    describe('パフォーマンス最適化', () => {
        test('大量のチェックが高速に実行される', () => {
            const startTime = performance.now();

            // 1000回のチェックを実行
            for (let i = 0; i < 1000; i++) {
                checker.canUseSkillOptimized(
                    mockSkill,
                    'caster1',
                    { x: i % 3, y: 0 },
                    mockBattlefieldState
                );
            }

            const executionTime = performance.now() - startTime;

            // 1000回のチェックが100ms以内に完了することを期待
            expect(executionTime).toBeLessThan(100);
        });
    });
});

describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
        monitor = new PerformanceMonitor(100); // 100ms間隔
    });

    afterEach(() => {
        monitor.destroy();
    });

    describe('メトリクス記録', () => {
        test('実行時間が記録される', async () => {
            monitor.recordExecutionTime(50);
            monitor.recordExecutionTime(100);
            monitor.recordExecutionTime(75);

            // 少し待ってからメトリクスを確認
            await new Promise(resolve => setTimeout(resolve, 150));

            const metrics = monitor.getMetrics();
            expect(metrics.averageExecutionTime).toBeCloseTo(75);
            expect(metrics.maxExecutionTime).toBe(100);
        });

        test('キャッシュヒット・ミスが記録される', () => {
            monitor.recordCacheHit();
            monitor.recordCacheHit();
            monitor.recordCacheMiss();

            const metrics = monitor.getMetrics();
            expect(metrics.cacheHits).toBe(2);
            expect(metrics.cacheMisses).toBe(1);
        });

        test('オブジェクト作成・再利用が記録される', () => {
            monitor.recordObjectCreation();
            monitor.recordObjectReuse();
            monitor.recordObjectReuse();

            const metrics = monitor.getMetrics();
            expect(metrics.objectCreations).toBe(1);
            expect(metrics.objectReuses).toBe(2);
        });
    });

    describe('メトリクスリセット', () => {
        test('メトリクスがリセットされる', () => {
            monitor.recordExecutionTime(100);
            monitor.recordCacheHit();
            monitor.recordObjectCreation();

            monitor.resetMetrics();

            const metrics = monitor.getMetrics();
            expect(metrics.averageExecutionTime).toBe(0);
            expect(metrics.cacheHits).toBe(0);
            expect(metrics.objectCreations).toBe(0);
        });
    });
});

describe('SkillPerformanceManager', () => {
    let performanceManager: SkillPerformanceManager;
    let mockSkill: MockSkill;

    beforeEach(() => {
        performanceManager = new SkillPerformanceManager({
            maxCacheSize: 100,
            maxPoolSize: 50,
            memoryLimitMB: 10,
            monitoringInterval: 100,
            enableAutoCleanup: false, // テスト中は無効
            enableDetailedLogging: false
        });

        mockSkill = new MockSkill(createMockSkillData());
    });

    afterEach(() => {
        performanceManager.destroy();
    });

    describe('統合機能', () => {
        test('最適化された条件チェックが実行される', () => {
            const mockBattlefieldState = {
                getCharacter: jest.fn().mockReturnValue({
                    id: 'caster1',
                    level: 5,
                    currentMP: 20,
                    currentHP: 100,
                    position: { x: 0, y: 0 },
                    faction: 'player',
                    hasActed: false,
                    job: 'warrior',
                    equipment: { weapon: 'sword' },
                    statusEffects: [],
                    stats: { maxHP: 100, maxMP: 50 }
                }),
                getCurrentTurn: jest.fn().mockReturnValue(1)
            };

            const result = performanceManager.canUseSkillOptimized(
                mockSkill,
                'caster1',
                { x: 1, y: 0 },
                mockBattlefieldState
            );

            expect(result).toBeDefined();
            expect(typeof result.canUse).toBe('boolean');
        });

        test('スキルオブジェクトプールが機能する', () => {
            const skillData = createMockSkillData();

            // 最初の取得（新規作成が必要）
            const skill1 = performanceManager.acquireSkillObject('attack', skillData);
            expect(skill1).toBeNull(); // プールが空なのでnull

            // オブジェクトを返却
            const mockSkill = new MockSkill(skillData);
            performanceManager.releaseSkillObject(mockSkill);

            // 再取得（プールから取得）
            const skill2 = performanceManager.acquireSkillObject('attack', skillData);
            expect(skill2).toBe(mockSkill);
        });

        test('データキャッシュが機能する', () => {
            const testData = { value: 'test' };

            // データをキャッシュ
            performanceManager.cacheData('test-key', testData, 1);

            // キャッシュから取得
            const cachedData = performanceManager.getCachedData('test-key');
            expect(cachedData).toEqual(testData);

            // 存在しないキー
            const nonexistent = performanceManager.getCachedData('nonexistent');
            expect(nonexistent).toBeNull();
        });
    });

    describe('メモリ使用量監視', () => {
        test('メモリ使用量情報が取得できる', () => {
            const memoryUsage = performanceManager.getMemoryUsage();

            expect(memoryUsage).toBeDefined();
            expect(typeof memoryUsage.totalMemoryMB).toBe('number');
            expect(typeof memoryUsage.skillCacheMemoryMB).toBe('number');
            expect(typeof memoryUsage.objectPoolMemoryMB).toBe('number');
            expect(typeof memoryUsage.cacheHitRate).toBe('number');
            expect(typeof memoryUsage.poolUsageRate).toBe('number');
            expect(memoryUsage.lastMeasuredAt).toBeInstanceOf(Date);
        });

        test('パフォーマンスメトリクスが取得できる', () => {
            const metrics = performanceManager.getPerformanceMetrics();

            expect(metrics).toBeDefined();
            expect(typeof metrics.averageExecutionTime).toBe('number');
            expect(typeof metrics.maxExecutionTime).toBe('number');
            expect(typeof metrics.currentFPS).toBe('number');
            expect(metrics.lastUpdatedAt).toBeInstanceOf(Date);
        });

        test('統計情報が統合的に取得できる', () => {
            const statistics = performanceManager.getStatistics();

            expect(statistics.cache).toBeDefined();
            expect(statistics.pool).toBeDefined();
            expect(statistics.performance).toBeDefined();
            expect(statistics.memory).toBeDefined();
        });
    });

    describe('システムリセット', () => {
        test('全システムがリセットされる', () => {
            // データを設定
            performanceManager.cacheData('test', { value: 'test' }, 1);
            const mockSkill = new MockSkill(createMockSkillData());
            performanceManager.releaseSkillObject(mockSkill);

            // リセット実行
            performanceManager.reset();

            // データがクリアされていることを確認
            const cachedData = performanceManager.getCachedData('test');
            expect(cachedData).toBeNull();

            const statistics = performanceManager.getStatistics();
            expect(statistics.cache.size).toBe(0);
            expect(statistics.pool.totalPooledObjects).toBe(0);
        });
    });
});

describe('パフォーマンステスト', () => {
    describe('大量データ処理性能', () => {
        test('1000個のスキルデータキャッシュが高速に処理される', () => {
            const cache = new SkillDataCache(1000);
            const startTime = performance.now();

            // 1000個のデータをキャッシュ
            for (let i = 0; i < 1000; i++) {
                const skillData = createMockSkillData(`skill-${i}`);
                cache.set(`skill-${i}`, skillData, 1);
            }

            // 1000回の取得
            for (let i = 0; i < 1000; i++) {
                cache.get(`skill-${i}`);
            }

            const executionTime = performance.now() - startTime;

            // 2000回の操作が50ms以内に完了することを期待
            expect(executionTime).toBeLessThan(50);

            cache.clear();
        });

        test('大量の条件チェックが1フレーム以内に完了する', () => {
            const cache = new SkillDataCache(1000);
            const checker = new OptimizedConditionChecker(cache);
            const mockSkill = new MockSkill(createMockSkillData());

            const mockBattlefieldState = {
                getCharacter: jest.fn().mockReturnValue({
                    id: 'caster1',
                    level: 5,
                    currentMP: 20,
                    currentHP: 100,
                    position: { x: 0, y: 0 },
                    faction: 'player',
                    hasActed: false,
                    job: 'warrior',
                    equipment: { weapon: 'sword' },
                    statusEffects: [],
                    stats: { maxHP: 100, maxMP: 50 }
                }),
                getCurrentTurn: jest.fn().mockReturnValue(1)
            };

            const startTime = performance.now();

            // 100回の条件チェック
            for (let i = 0; i < 100; i++) {
                checker.canUseSkillOptimized(
                    mockSkill,
                    'caster1',
                    { x: i % 5, y: 0 },
                    mockBattlefieldState
                );
            }

            const executionTime = performance.now() - startTime;

            // 100回のチェックが16.67ms（60fps相当）以内に完了することを期待
            expect(executionTime).toBeLessThan(16.67);

            checker.clear();
        });
    });

    describe('メモリ使用量テスト', () => {
        test('メモリリークが発生しない', () => {
            const performanceManager = new SkillPerformanceManager({
                maxCacheSize: 100,
                maxPoolSize: 50,
                enableAutoCleanup: false
            });

            const initialMemory = performanceManager.getMemoryUsage();

            // 大量のデータを処理
            for (let i = 0; i < 1000; i++) {
                const skillData = createMockSkillData(`skill-${i}`);
                performanceManager.cacheData(`skill-${i}`, skillData, 1);

                const mockSkill = new MockSkill(skillData);
                performanceManager.releaseSkillObject(mockSkill);
            }

            // システムをリセット
            performanceManager.reset();

            const finalMemory = performanceManager.getMemoryUsage();

            // メモリ使用量が初期状態に戻ることを期待
            expect(finalMemory.totalMemoryMB).toBeLessThanOrEqual(initialMemory.totalMemoryMB + 1);

            performanceManager.destroy();
        });

        test('キャッシュサイズ制限が機能する', () => {
            const cache = new SkillDataCache(10);

            // 制限を超えるデータを追加
            for (let i = 0; i < 20; i++) {
                cache.set(`key-${i}`, { value: i }, 1);
            }

            const stats = cache.getStatistics();
            expect(stats.size).toBeLessThanOrEqual(10);

            cache.clear();
        });
    });

    describe('フレームレート維持テスト', () => {
        test('60fps相当の処理時間内でスキル処理が完了する', async () => {
            const performanceManager = new SkillPerformanceManager();
            const mockSkill = new MockSkill(createMockSkillData());

            const frameTime = 16.67; // 60fps相当
            const iterations = 10;

            for (let i = 0; i < iterations; i++) {
                const startTime = performance.now();

                // スキル関連の処理をシミュレート
                performanceManager.canUseSkillOptimized(
                    mockSkill,
                    'caster1',
                    { x: 1, y: 0 },
                    {
                        getCharacter: () => ({
                            id: 'caster1',
                            level: 5,
                            currentMP: 20,
                            currentHP: 100,
                            position: { x: 0, y: 0 },
                            faction: 'player',
                            hasActed: false,
                            job: 'warrior',
                            equipment: { weapon: 'sword' },
                            statusEffects: [],
                            stats: { maxHP: 100, maxMP: 50 }
                        }),
                        getCurrentTurn: () => 1
                    }
                );

                const executionTime = performance.now() - startTime;
                expect(executionTime).toBeLessThan(frameTime);
            }

            performanceManager.destroy();
        });
    });
});