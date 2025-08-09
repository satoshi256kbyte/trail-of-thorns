/**
 * スキルシステム パフォーマンスベンチマークテスト
 * 
 * このテストファイルは以下をテストします：
 * - スキル実行のパフォーマンス測定
 * - メモリ使用量の監視
 * - 大量データ処理のベンチマーク
 * - フレームレート維持の確認
 * - システム負荷テスト
 */

import { SkillSystem } from '../../game/src/systems/skills/SkillSystem';
import { SkillManager } from '../../game/src/systems/skills/SkillManager';
import { SkillExecutor } from '../../game/src/systems/skills/SkillExecutor';
import { SkillConditionChecker } from '../../game/src/systems/skills/SkillConditionChecker';
import { SkillDataLoader } from '../../game/src/systems/skills/SkillDataLoader';
import { SkillData, SkillType, TargetType, CharacterSkillData } from '../../game/src/types/skill';

// パフォーマンス測定ユーティリティ
class PerformanceMeasurer {
    private measurements: Map<string, number[]> = new Map();

    measure<T>(name: string, fn: () => T): T {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        const duration = end - start;

        if (!this.measurements.has(name)) {
            this.measurements.set(name, []);
        }
        this.measurements.get(name)!.push(duration);

        return result;
    }

    async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        const duration = end - start;

        if (!this.measurements.has(name)) {
            this.measurements.set(name, []);
        }
        this.measurements.get(name)!.push(duration);

        return result;
    }

    getStats(name: string) {
        const measurements = this.measurements.get(name) || [];
        if (measurements.length === 0) {
            return { count: 0, avg: 0, min: 0, max: 0, total: 0 };
        }

        const total = measurements.reduce((sum, val) => sum + val, 0);
        const avg = total / measurements.length;
        const min = Math.min(...measurements);
        const max = Math.max(...measurements);

        return { count: measurements.length, avg, min, max, total };
    }

    clear() {
        this.measurements.clear();
    }
}

// メモリ使用量測定ユーティリティ
class MemoryMonitor {
    private initialMemory: number;

    constructor() {
        this.initialMemory = this.getCurrentMemoryUsage();
    }

    private getCurrentMemoryUsage(): number {
        if (typeof performance !== 'undefined' && performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    getMemoryIncrease(): number {
        return this.getCurrentMemoryUsage() - this.initialMemory;
    }

    getMemoryUsage() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return { used: 0, total: 0, limit: 0 };
    }
}

// Phaserのモック（パフォーマンステスト用）
const mockScene = {
    add: {
        container: jest.fn().mockReturnValue({
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            add: jest.fn(),
            setAlpha: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }),
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn().mockReturnThis(),
            fillRoundedRect: jest.fn().mockReturnThis(),
            lineStyle: jest.fn().mockReturnThis(),
            strokeRoundedRect: jest.fn().mockReturnThis(),
            clear: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }),
        text: jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            on: jest.fn(),
            setColor: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }),
        sprite: jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        })
    },
    events: {
        on: jest.fn(),
        emit: jest.fn(),
        removeAllListeners: jest.fn()
    },
    input: {
        keyboard: {
            on: jest.fn(),
            addKey: jest.fn().mockReturnValue({
                once: jest.fn(),
                destroy: jest.fn()
            })
        },
        on: jest.fn()
    },
    tweens: {
        add: jest.fn().mockReturnValue({
            destroy: jest.fn()
        })
    },
    time: {
        delayedCall: jest.fn()
    },
    cameras: {
        main: {
            width: 800,
            height: 600,
            scrollX: 0,
            scrollY: 0,
            zoom: 1
        }
    }
};

// テスト用データ生成
const createBenchmarkSkillData = (id: string, complexity: 'simple' | 'medium' | 'complex' = 'simple'): SkillData => {
    const baseSkill: SkillData = {
        id,
        name: `Benchmark Skill ${id}`,
        description: `Benchmark skill for performance testing ${id}`,
        skillType: SkillType.ATTACK,
        targetType: TargetType.SINGLE_ENEMY,
        range: 2,
        areaOfEffect: {
            shape: 'single',
            size: 1
        },
        effects: [{
            type: 'damage',
            value: 50,
            duration: 0
        }],
        usageCondition: {
            mpCost: 10,
            cooldown: 0,
            usageLimit: 0,
            levelRequirement: 1,
            weaponRequirement: [],
            jobRequirement: undefined
        },
        learnCondition: {
            level: 1,
            prerequisiteSkills: [],
            jobRequirement: undefined
        },
        animation: {
            castAnimation: 'cast',
            effectAnimation: 'effect',
            duration: 100 // 短いアニメーション時間
        }
    };

    switch (complexity) {
        case 'medium':
            return {
                ...baseSkill,
                areaOfEffect: { shape: 'square', size: 2 },
                effects: [
                    { type: 'damage', value: 50, duration: 0 },
                    { type: 'debuff', value: -10, duration: 3 }
                ]
            };
        case 'complex':
            return {
                ...baseSkill,
                areaOfEffect: { shape: 'circle', size: 3 },
                effects: [
                    { type: 'damage', value: 50, duration: 0 },
                    { type: 'debuff', value: -10, duration: 3 },
                    { type: 'status', value: 5, duration: 2 },
                    { type: 'heal', value: 20, duration: 0 }
                ]
            };
        default:
            return baseSkill;
    }
};

const createBenchmarkCharacterData = (id: string, skillCount: number = 10): CharacterSkillData => ({
    characterId: id,
    learnedSkills: Array.from({ length: skillCount }, (_, i) => `skill-${i}`),
    skillCooldowns: new Map(),
    skillUsageCounts: new Map(),
    skillLearnHistory: [],
    activeEffects: []
});

const createBenchmarkBattlefield = () => ({
    getCurrentTurn: jest.fn().mockReturnValue(1),
    getCharacterAt: jest.fn().mockReturnValue(null),
    getCharacterById: jest.fn().mockReturnValue({
        id: 'benchmark-character',
        position: { x: 1, y: 1 },
        stats: { maxHP: 100, maxMP: 50, attack: 25, defense: 15, speed: 12, movement: 3 },
        currentHP: 100,
        currentMP: 50,
        faction: 'player'
    }),
    isValidPosition: jest.fn().mockReturnValue(true),
    getUnitsInRange: jest.fn().mockReturnValue([]),
    updateCharacter: jest.fn(),
    applyDamage: jest.fn(),
    applyHealing: jest.fn(),
    applyStatusEffect: jest.fn()
});

describe('SkillSystem Performance Benchmark Tests', () => {
    let skillSystem: SkillSystem;
    let performanceMeasurer: PerformanceMeasurer;
    let memoryMonitor: MemoryMonitor;
    let mockBattlefield: any;

    beforeEach(() => {
        performanceMeasurer = new PerformanceMeasurer();
        memoryMonitor = new MemoryMonitor();
        mockBattlefield = createBenchmarkBattlefield();

        skillSystem = new SkillSystem(mockScene as any, {
            debugMode: false, // デバッグモードを無効にしてパフォーマンス測定
            performanceMonitoring: true,
            autoErrorRecovery: true
        });

        skillSystem.setBattlefieldState(mockBattlefield);
    });

    afterEach(() => {
        if (skillSystem) {
            skillSystem.destroy();
        }
        performanceMeasurer.clear();
    });

    describe('基本スキル実行パフォーマンス', () => {
        test('単一スキル実行の基準時間測定', async () => {
            const skill = createBenchmarkSkillData('perf-basic');
            skillSystem.registerSkill(skill);
            skillSystem.learnSkill('test-character', 'perf-basic', createBenchmarkCharacterData('test-character'));

            // ウォームアップ実行
            await skillSystem.useSkill('perf-basic', 'test-character', { x: 2, y: 1 }, true);

            // 実際の測定
            const iterations = 100;
            for (let i = 0; i < iterations; i++) {
                await performanceMeasurer.measureAsync('single-skill-execution', async () => {
                    return await skillSystem.useSkill('perf-basic', 'test-character', { x: 2, y: 1 }, true);
                });
            }

            const stats = performanceMeasurer.getStats('single-skill-execution');

            // パフォーマンス要件の確認
            expect(stats.avg).toBeLessThan(16.67); // 1フレーム以内 (60fps)
            expect(stats.max).toBeLessThan(33.33); // 最大でも2フレーム以内
            expect(stats.min).toBeGreaterThan(0); // 実際に処理時間がかかっている

            console.log(`Single skill execution stats:`, stats);
        });

        test('複雑なスキル実行のパフォーマンス', async () => {
            const complexSkill = createBenchmarkSkillData('perf-complex', 'complex');
            skillSystem.registerSkill(complexSkill);
            skillSystem.learnSkill('test-character', 'perf-complex', createBenchmarkCharacterData('test-character'));

            // 複数の敵を配置
            mockBattlefield.getUnitsInRange.mockReturnValue([
                { id: 'enemy1', position: { x: 2, y: 1 } },
                { id: 'enemy2', position: { x: 3, y: 1 } },
                { id: 'enemy3', position: { x: 2, y: 2 } }
            ]);

            const iterations = 50;
            for (let i = 0; i < iterations; i++) {
                await performanceMeasurer.measureAsync('complex-skill-execution', async () => {
                    return await skillSystem.useSkill('perf-complex', 'test-character', { x: 2, y: 1 }, true);
                });
            }

            const stats = performanceMeasurer.getStats('complex-skill-execution');

            // 複雑なスキルでも許容時間内
            expect(stats.avg).toBeLessThan(50); // 50ms以内
            expect(stats.max).toBeLessThan(100); // 最大100ms以内

            console.log(`Complex skill execution stats:`, stats);
        });

        test('範囲攻撃スキルのパフォーマンス', async () => {
            const areaSkill = createBenchmarkSkillData('perf-area', 'medium');
            skillSystem.registerSkill(areaSkill);
            skillSystem.learnSkill('test-character', 'perf-area', createBenchmarkCharacterData('test-character'));

            // 大量の敵を配置
            const enemies = Array.from({ length: 20 }, (_, i) => ({
                id: `enemy-${i}`,
                position: { x: 2 + (i % 5), y: 1 + Math.floor(i / 5) }
            }));
            mockBattlefield.getUnitsInRange.mockReturnValue(enemies);

            const iterations = 30;
            for (let i = 0; i < iterations; i++) {
                await performanceMeasurer.measureAsync('area-skill-execution', async () => {
                    return await skillSystem.useSkill('perf-area', 'test-character', { x: 3, y: 2 }, true);
                });
            }

            const stats = performanceMeasurer.getStats('area-skill-execution');

            // 大量の対象でも許容時間内
            expect(stats.avg).toBeLessThan(100); // 100ms以内
            expect(stats.max).toBeLessThan(200); // 最大200ms以内

            console.log(`Area skill execution stats:`, stats);
        });
    });

    describe('大量データ処理パフォーマンス', () => {
        test('大量スキル登録のパフォーマンス', () => {
            const skillCount = 1000;
            const skills = Array.from({ length: skillCount }, (_, i) =>
                createBenchmarkSkillData(`mass-skill-${i}`)
            );

            performanceMeasurer.measure('mass-skill-registration', () => {
                skills.forEach(skill => {
                    skillSystem.registerSkill(skill);
                });
            });

            const stats = performanceMeasurer.getStats('mass-skill-registration');

            // 大量登録でも許容時間内
            expect(stats.avg).toBeLessThan(1000); // 1秒以内
            expect(stats.avg / skillCount).toBeLessThan(1); // 1スキルあたり1ms以内

            console.log(`Mass skill registration stats:`, stats);
        });

        test('大量キャラクターのスキル習得パフォーマンス', () => {
            // スキルを事前登録
            const skills = Array.from({ length: 50 }, (_, i) =>
                createBenchmarkSkillData(`learn-skill-${i}`)
            );
            skills.forEach(skill => skillSystem.registerSkill(skill));

            const characterCount = 100;
            const characters = Array.from({ length: characterCount }, (_, i) =>
                createBenchmarkCharacterData(`character-${i}`, 10)
            );

            performanceMeasurer.measure('mass-skill-learning', () => {
                characters.forEach(character => {
                    skills.slice(0, 10).forEach(skill => {
                        skillSystem.learnSkill(character.characterId, skill.id, character);
                    });
                });
            });

            const stats = performanceMeasurer.getStats('mass-skill-learning');

            // 大量習得でも許容時間内
            expect(stats.avg).toBeLessThan(2000); // 2秒以内

            console.log(`Mass skill learning stats:`, stats);
        });

        test('使用可能スキル大量取得のパフォーマンス', () => {
            // 大量のスキルを登録・習得
            const skillCount = 200;
            const skills = Array.from({ length: skillCount }, (_, i) =>
                createBenchmarkSkillData(`available-skill-${i}`)
            );

            skills.forEach(skill => skillSystem.registerSkill(skill));

            const characterData = createBenchmarkCharacterData('perf-character', skillCount);
            skills.forEach(skill => {
                skillSystem.learnSkill('perf-character', skill.id, characterData);
            });

            const iterations = 100;
            for (let i = 0; i < iterations; i++) {
                performanceMeasurer.measure('get-available-skills', () => {
                    return skillSystem.getAvailableSkills('perf-character');
                });
            }

            const stats = performanceMeasurer.getStats('get-available-skills');

            // 大量スキルでも高速取得
            expect(stats.avg).toBeLessThan(10); // 10ms以内
            expect(stats.max).toBeLessThan(50); // 最大50ms以内

            console.log(`Get available skills stats:`, stats);
        });
    });

    describe('メモリ使用量テスト', () => {
        test('スキルシステムのメモリ使用量', () => {
            const initialMemory = memoryMonitor.getMemoryUsage();

            // 大量のスキルを作成
            const skillCount = 500;
            const skills = Array.from({ length: skillCount }, (_, i) =>
                createBenchmarkSkillData(`memory-skill-${i}`, 'complex')
            );

            skills.forEach(skill => {
                skillSystem.registerSkill(skill);
            });

            const afterRegistrationMemory = memoryMonitor.getMemoryUsage();
            const registrationIncrease = afterRegistrationMemory.used - initialMemory.used;

            // キャラクターにスキルを習得させる
            const characterCount = 50;
            Array.from({ length: characterCount }, (_, i) => {
                const characterData = createBenchmarkCharacterData(`memory-character-${i}`, 20);
                skills.slice(0, 20).forEach(skill => {
                    skillSystem.learnSkill(characterData.characterId, skill.id, characterData);
                });
            });

            const finalMemory = memoryMonitor.getMemoryUsage();
            const totalIncrease = finalMemory.used - initialMemory.used;

            // メモリ使用量の確認
            expect(registrationIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB以下
            expect(totalIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB以下

            console.log(`Memory usage - Registration: ${registrationIncrease / 1024 / 1024}MB, Total: ${totalIncrease / 1024 / 1024}MB`);
        });

        test('メモリリークの検出', () => {
            const iterations = 100;
            const memorySnapshots: number[] = [];

            for (let i = 0; i < iterations; i++) {
                // スキルシステムを作成・使用・破棄
                const tempSkillSystem = new SkillSystem(mockScene as any, {
                    debugMode: false,
                    performanceMonitoring: false
                });

                const skill = createBenchmarkSkillData(`leak-test-${i}`);
                tempSkillSystem.registerSkill(skill);
                tempSkillSystem.learnSkill('leak-character', skill.id, createBenchmarkCharacterData('leak-character'));

                tempSkillSystem.destroy();

                // 10回ごとにメモリ使用量を記録
                if (i % 10 === 0) {
                    // ガベージコレクションを強制実行（可能な場合）
                    if (global.gc) {
                        global.gc();
                    }
                    memorySnapshots.push(memoryMonitor.getMemoryUsage().used);
                }
            }

            // メモリリークの検出
            if (memorySnapshots.length > 2) {
                const initialMemory = memorySnapshots[0];
                const finalMemory = memorySnapshots[memorySnapshots.length - 1];
                const memoryIncrease = finalMemory - initialMemory;

                // メモリ増加が許容範囲内
                expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB以下

                console.log(`Memory leak test - Initial: ${initialMemory / 1024 / 1024}MB, Final: ${finalMemory / 1024 / 1024}MB, Increase: ${memoryIncrease / 1024 / 1024}MB`);
            }
        });
    });

    describe('フレームレート維持テスト', () => {
        test('60fps維持でのスキル実行', async () => {
            const skill = createBenchmarkSkillData('fps-test');
            skillSystem.registerSkill(skill);
            skillSystem.learnSkill('fps-character', 'fps-test', createBenchmarkCharacterData('fps-character'));

            const frameTime = 16.67; // 60fps = 16.67ms per frame
            const testDuration = 1000; // 1秒間
            const expectedFrames = Math.floor(testDuration / frameTime);

            let frameCount = 0;
            const startTime = performance.now();

            // フレームループをシミュレート
            while (performance.now() - startTime < testDuration) {
                const frameStart = performance.now();

                // スキル実行
                await skillSystem.useSkill('fps-test', 'fps-character', { x: 2, y: 1 }, true);

                const frameEnd = performance.now();
                const frameExecutionTime = frameEnd - frameStart;

                // フレーム時間内に完了することを確認
                expect(frameExecutionTime).toBeLessThan(frameTime);

                frameCount++;

                // 次のフレームまで待機
                const remainingFrameTime = frameTime - frameExecutionTime;
                if (remainingFrameTime > 0) {
                    await new Promise(resolve => setTimeout(resolve, remainingFrameTime));
                }
            }

            // 期待されるフレーム数に近いことを確認
            expect(frameCount).toBeGreaterThan(expectedFrames * 0.9); // 90%以上

            console.log(`FPS test - Expected frames: ${expectedFrames}, Actual frames: ${frameCount}`);
        });

        test('アニメーション付きスキルのフレームレート', async () => {
            const animatedSkill = createBenchmarkSkillData('animated-fps-test', 'complex');
            animatedSkill.animation.duration = 500; // 0.5秒のアニメーション

            skillSystem.registerSkill(animatedSkill);
            skillSystem.learnSkill('anim-character', 'animated-fps-test', createBenchmarkCharacterData('anim-character'));

            const frameTime = 16.67;
            const animationFrames = Math.ceil(animatedSkill.animation.duration / frameTime);
            const frameExecutionTimes: number[] = [];

            // アニメーション期間中のフレーム実行時間を測定
            for (let frame = 0; frame < animationFrames; frame++) {
                const frameStart = performance.now();

                // スキル実行（アニメーション付き）
                await skillSystem.useSkill('animated-fps-test', 'anim-character', { x: 2, y: 1 }, true);

                const frameEnd = performance.now();
                frameExecutionTimes.push(frameEnd - frameStart);
            }

            // 全フレームが時間内に完了することを確認
            frameExecutionTimes.forEach(time => {
                expect(time).toBeLessThan(frameTime);
            });

            const avgFrameTime = frameExecutionTimes.reduce((sum, time) => sum + time, 0) / frameExecutionTimes.length;
            expect(avgFrameTime).toBeLessThan(frameTime * 0.8); // フレーム時間の80%以内

            console.log(`Animated skill FPS test - Avg frame time: ${avgFrameTime}ms`);
        });
    });

    describe('システム負荷テスト', () => {
        test('同時多重スキル実行の負荷テスト', async () => {
            const concurrentSkills = Array.from({ length: 10 }, (_, i) =>
                createBenchmarkSkillData(`concurrent-${i}`)
            );

            concurrentSkills.forEach(skill => {
                skillSystem.registerSkill(skill);
                skillSystem.learnSkill('concurrent-character', skill.id, createBenchmarkCharacterData('concurrent-character'));
            });

            const startTime = performance.now();

            // 同時実行
            const promises = concurrentSkills.map(skill =>
                skillSystem.useSkill(skill.id, 'concurrent-character', { x: 2, y: 1 }, true)
            );

            const results = await Promise.all(promises);
            const endTime = performance.now();
            const totalTime = endTime - startTime;

            // 全て成功することを確認
            results.forEach(result => {
                expect(result.success).toBe(true);
            });

            // 同時実行でも許容時間内
            expect(totalTime).toBeLessThan(500); // 500ms以内

            console.log(`Concurrent execution test - Total time: ${totalTime}ms`);
        });

        test('長時間実行での安定性テスト', async () => {
            const stressSkill = createBenchmarkSkillData('stress-test');
            skillSystem.registerSkill(stressSkill);
            skillSystem.learnSkill('stress-character', 'stress-test', createBenchmarkCharacterData('stress-character'));

            const testDuration = 5000; // 5秒間
            const startTime = performance.now();
            let executionCount = 0;
            let errorCount = 0;

            while (performance.now() - startTime < testDuration) {
                try {
                    const result = await skillSystem.useSkill('stress-test', 'stress-character', { x: 2, y: 1 }, true);
                    if (!result.success) {
                        errorCount++;
                    }
                    executionCount++;
                } catch (error) {
                    errorCount++;
                    executionCount++;
                }

                // 短い間隔で実行
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            const errorRate = errorCount / executionCount;

            // エラー率が低いことを確認
            expect(errorRate).toBeLessThan(0.01); // 1%未満

            // 十分な回数実行されていることを確認
            expect(executionCount).toBeGreaterThan(100);

            console.log(`Stress test - Executions: ${executionCount}, Errors: ${errorCount}, Error rate: ${(errorRate * 100).toFixed(2)}%`);
        });

        test('メモリ圧迫下でのパフォーマンス', () => {
            // 大量のデータを作成してメモリを圧迫
            const memoryPressure: any[] = [];
            for (let i = 0; i < 1000; i++) {
                memoryPressure.push(new Array(1000).fill(Math.random()));
            }

            const skill = createBenchmarkSkillData('memory-pressure-test');
            skillSystem.registerSkill(skill);
            skillSystem.learnSkill('pressure-character', 'memory-pressure-test', createBenchmarkCharacterData('pressure-character'));

            const iterations = 50;
            const executionTimes: number[] = [];

            for (let i = 0; i < iterations; i++) {
                const start = performance.now();
                skillSystem.useSkill('memory-pressure-test', 'pressure-character', { x: 2, y: 1 }, true);
                const end = performance.now();
                executionTimes.push(end - start);
            }

            const avgTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
            const maxTime = Math.max(...executionTimes);

            // メモリ圧迫下でも許容時間内
            expect(avgTime).toBeLessThan(50); // 50ms以内
            expect(maxTime).toBeLessThan(200); // 最大200ms以内

            console.log(`Memory pressure test - Avg: ${avgTime}ms, Max: ${maxTime}ms`);

            // メモリ圧迫データをクリア
            memoryPressure.length = 0;
        });
    });

    describe('最適化効果の検証', () => {
        test('キャッシュ効果の測定', () => {
            const skill = createBenchmarkSkillData('cache-test');
            skillSystem.registerSkill(skill);
            skillSystem.learnSkill('cache-character', 'cache-test', createBenchmarkCharacterData('cache-character'));

            // 初回実行（キャッシュなし）
            const firstExecutionTime = performanceMeasurer.measure('first-execution', () => {
                return skillSystem.getAvailableSkills('cache-character');
            });

            // 2回目以降の実行（キャッシュあり）
            const cachedExecutionTimes: number[] = [];
            for (let i = 0; i < 10; i++) {
                const time = performanceMeasurer.measure('cached-execution', () => {
                    return skillSystem.getAvailableSkills('cache-character');
                });
                cachedExecutionTimes.push(time);
            }

            const avgCachedTime = cachedExecutionTimes.reduce((sum, time) => sum + time, 0) / cachedExecutionTimes.length;

            // キャッシュ効果があることを確認
            expect(avgCachedTime).toBeLessThan(firstExecutionTime * 0.8); // 20%以上の改善

            console.log(`Cache effect - First: ${firstExecutionTime}ms, Cached avg: ${avgCachedTime}ms`);
        });

        test('バッチ処理の効果測定', async () => {
            const batchSkills = Array.from({ length: 20 }, (_, i) =>
                createBenchmarkSkillData(`batch-${i}`)
            );

            batchSkills.forEach(skill => {
                skillSystem.registerSkill(skill);
                skillSystem.learnSkill('batch-character', skill.id, createBenchmarkCharacterData('batch-character'));
            });

            // 個別実行
            const individualStart = performance.now();
            for (const skill of batchSkills) {
                await skillSystem.useSkill(skill.id, 'batch-character', { x: 2, y: 1 }, true);
            }
            const individualTime = performance.now() - individualStart;

            // バッチ実行（同時実行）
            const batchStart = performance.now();
            const batchPromises = batchSkills.map(skill =>
                skillSystem.useSkill(skill.id, 'batch-character', { x: 2, y: 1 }, true)
            );
            await Promise.all(batchPromises);
            const batchTime = performance.now() - batchStart;

            // バッチ処理の効果を確認
            expect(batchTime).toBeLessThan(individualTime * 0.7); // 30%以上の改善

            console.log(`Batch processing - Individual: ${individualTime}ms, Batch: ${batchTime}ms`);
        });
    });

    describe('パフォーマンス回帰テスト', () => {
        test('基準パフォーマンスとの比較', async () => {
            // 基準となるシンプルなスキル実行
            const baselineSkill = createBenchmarkSkillData('baseline');
            skillSystem.registerSkill(baselineSkill);
            skillSystem.learnSkill('baseline-character', 'baseline', createBenchmarkCharacterData('baseline-character'));

            const iterations = 100;
            const executionTimes: number[] = [];

            for (let i = 0; i < iterations; i++) {
                const start = performance.now();
                await skillSystem.useSkill('baseline', 'baseline-character', { x: 2, y: 1 }, true);
                const end = performance.now();
                executionTimes.push(end - start);
            }

            const avgTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
            const p95Time = executionTimes.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];

            // パフォーマンス基準値
            const BASELINE_AVG_TIME = 10; // 10ms
            const BASELINE_P95_TIME = 20; // 20ms

            expect(avgTime).toBeLessThan(BASELINE_AVG_TIME);
            expect(p95Time).toBeLessThan(BASELINE_P95_TIME);

            console.log(`Performance baseline - Avg: ${avgTime}ms, P95: ${p95Time}ms`);
        });

        test('パフォーマンス劣化の検出', async () => {
            // 複数の複雑度のスキルでパフォーマンスを測定
            const complexities: Array<'simple' | 'medium' | 'complex'> = ['simple', 'medium', 'complex'];
            const performanceResults: Record<string, number> = {};

            for (const complexity of complexities) {
                const skill = createBenchmarkSkillData(`regression-${complexity}`, complexity);
                skillSystem.registerSkill(skill);
                skillSystem.learnSkill('regression-character', skill.id, createBenchmarkCharacterData('regression-character'));

                const iterations = 50;
                const times: number[] = [];

                for (let i = 0; i < iterations; i++) {
                    const start = performance.now();
                    await skillSystem.useSkill(skill.id, 'regression-character', { x: 2, y: 1 }, true);
                    const end = performance.now();
                    times.push(end - start);
                }

                performanceResults[complexity] = times.reduce((sum, time) => sum + time, 0) / times.length;
            }

            // 複雑度に応じた適切なパフォーマンス劣化
            expect(performanceResults.simple).toBeLessThan(15); // 15ms以内
            expect(performanceResults.medium).toBeLessThan(30); // 30ms以内
            expect(performanceResults.complex).toBeLessThan(60); // 60ms以内

            // 複雑度の増加に対する線形的な劣化
            expect(performanceResults.medium).toBeGreaterThan(performanceResults.simple);
            expect(performanceResults.complex).toBeGreaterThan(performanceResults.medium);

            console.log(`Performance regression test:`, performanceResults);
        });
    });
});