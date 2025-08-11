/**
 * AIシステムパフォーマンステスト
 * 
 * AIシステムのパフォーマンス要件を検証するベンチマークテスト
 * - 思考時間の測定
 * - メモリ使用量の監視
 * - 複数AI同時実行のパフォーマンス
 * - フレームレート影響の測定
 */

import { AISystemManager } from '../../game/src/systems/ai/AISystemManager';
import { AIController } from '../../game/src/systems/AIController';
import { ActionEvaluator } from '../../game/src/systems/ActionEvaluator';
import { BehaviorTree } from '../../game/src/systems/ai/BehaviorTree';
import { AIPersonalityFactory } from '../../game/src/systems/ai/AIPersonality';

import {
    AIAction,
    AIActionType,
    AIContext,
    AIPersonalityType,
    DifficultySettings,
    AISystemManagerConfig,
    AIPerformanceMetrics,
} from '../../game/src/types/ai';
import { Unit, MapData, GameState } from '../../game/src/types/gameplay';

// パフォーマンス測定ユーティリティ
class PerformanceMonitor {
    private measurements: Map<string, number[]> = new Map();
    private memorySnapshots: Array<{ timestamp: number; usage: NodeJS.MemoryUsage }> = [];

    startMeasurement(name: string): () => number {
        const startTime = performance.now();
        return () => {
            const duration = performance.now() - startTime;
            if (!this.measurements.has(name)) {
                this.measurements.set(name, []);
            }
            this.measurements.get(name)!.push(duration);
            return duration;
        };
    }

    takeMemorySnapshot(): void {
        this.memorySnapshots.push({
            timestamp: Date.now(),
            usage: process.memoryUsage(),
        });
    }

    getStatistics(name: string) {
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

    getMemoryTrend() {
        if (this.memorySnapshots.length < 2) return { increase: 0, trend: 'stable' };

        const first = this.memorySnapshots[0].usage.heapUsed;
        const last = this.memorySnapshots[this.memorySnapshots.length - 1].usage.heapUsed;
        const increase = last - first;

        return {
            increase,
            trend: increase > 10 * 1024 * 1024 ? 'increasing' : 'stable', // 10MB threshold
            snapshots: this.memorySnapshots.length,
        };
    }

    reset(): void {
        this.measurements.clear();
        this.memorySnapshots = [];
    }
}

// テスト用モック
const createMockScene = () => ({
    events: { on: jest.fn(), emit: jest.fn() },
    add: {
        container: jest.fn(() => ({
            setDepth: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            add: jest.fn(),
            removeAll: jest.fn(),
        })),
        circle: jest.fn(() => ({})),
        text: jest.fn(() => ({ setOrigin: jest.fn().mockReturnThis() })),
        rectangle: jest.fn(() => ({ setOrigin: jest.fn().mockReturnThis() })),
    },
    tweens: { add: jest.fn() },
    time: { delayedCall: jest.fn((delay, callback) => setTimeout(callback, 0)) },
});

const createMockUnit = (overrides: Partial<Unit> = {}): Unit => ({
    id: 'test-unit',
    name: 'Test Unit',
    position: { x: 5, y: 5 },
    stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
    currentHP: 100,
    currentMP: 50,
    faction: 'enemy',
    hasActed: false,
    hasMoved: false,
    ...overrides,
});

const createMockSystems = () => ({
    gameStateManager: {
        getGameState: jest.fn(() => ({ currentTurn: 1, activePlayer: 'enemy', turnOrder: [] })),
        nextTurn: jest.fn(() => ({ success: true })),
    },
    movementSystem: {
        executeMovement: jest.fn(() => Promise.resolve({ success: true })),
        calculateMovementRange: jest.fn(() => [{ x: 4, y: 5 }, { x: 6, y: 5 }]),
        canMoveTo: jest.fn(() => true),
    },
    battleSystem: {
        executeAttack: jest.fn(() => Promise.resolve({ success: true })),
        canAttack: jest.fn(() => true),
        calculateDamage: jest.fn(() => 25),
    },
    skillSystem: {
        executeSkill: jest.fn(() => Promise.resolve({ success: true })),
        getAvailableSkills: jest.fn(() => ['basic-attack']),
        canUseSkill: jest.fn(() => true),
    },
    recruitmentSystem: {
        isNPC: jest.fn(() => false),
    },
});

describe('AIシステムパフォーマンステスト', () => {
    let performanceMonitor: PerformanceMonitor;
    let mockScene: any;
    let mockSystems: any;

    beforeEach(() => {
        performanceMonitor = new PerformanceMonitor();
        mockScene = createMockScene();
        mockSystems = createMockSystems();
    });

    afterEach(() => {
        performanceMonitor.reset();
    });

    describe('1. AI思考時間パフォーマンス', () => {
        test('単一AIの思考時間が2秒以内', async () => {
            const config: AISystemManagerConfig = {
                thinkingTimeLimit: 2000,
                enableDebugLogging: false,
                enableVisualFeedback: false,
                randomFactor: 0.1,
                npcPriorityMultiplier: 50,
            };

            const aiSystem = new AISystemManager(mockScene, config, { on: jest.fn(), emit: jest.fn() });
            aiSystem.initialize(
                mockSystems.gameStateManager,
                mockSystems.movementSystem,
                mockSystems.battleSystem,
                mockSystems.skillSystem,
                mockSystems.recruitmentSystem
            );

            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystem.createAIControllers([enemyUnit]);

            // 複数回実行して平均時間を測定
            for (let i = 0; i < 10; i++) {
                const endMeasurement = performanceMonitor.startMeasurement('ai-thinking');
                await aiSystem.executeAITurn(enemyUnit, gameState, mapData);
                endMeasurement();
            }

            const stats = performanceMonitor.getStatistics('ai-thinking');

            expect(stats.avg).toBeLessThan(2000); // 平均2秒以内
            expect(stats.max).toBeLessThan(2500); // 最大でも2.5秒以内
            expect(stats.min).toBeGreaterThan(0); // 最小でも何らかの時間はかかる

            console.log(`AI思考時間統計: 平均${stats.avg.toFixed(2)}ms, 最小${stats.min.toFixed(2)}ms, 最大${stats.max.toFixed(2)}ms`);
        });

        test('複雑な状況での思考時間', async () => {
            const config: AISystemManagerConfig = {
                thinkingTimeLimit: 2000,
                enableDebugLogging: false,
                enableVisualFeedback: false,
                randomFactor: 0.3,
                npcPriorityMultiplier: 50,
            };

            const aiSystem = new AISystemManager(mockScene, config, { on: jest.fn(), emit: jest.fn() });
            aiSystem.initialize(
                mockSystems.gameStateManager,
                mockSystems.movementSystem,
                mockSystems.battleSystem,
                mockSystems.skillSystem,
                mockSystems.recruitmentSystem
            );

            // 複雑な状況を作成（多数の敵、NPC、スキル選択肢）
            const enemyUnit = createMockUnit({
                id: 'enemy-1',
                faction: 'enemy',
                stats: { maxHP: 100, maxMP: 100, attack: 20, defense: 15, speed: 10, movement: 3 }
            });

            const enemies = Array.from({ length: 10 }, (_, i) =>
                createMockUnit({ id: `player-${i}`, faction: 'player', position: { x: i, y: i } })
            );

            const gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [enemyUnit, ...enemies]
            } as GameState;

            const mapData = {
                width: 20,
                height: 20,
                tileSize: 32,
                tiles: Array(20).fill(null).map(() => Array(20).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            // 多数のスキルを利用可能にする
            mockSystems.skillSystem.getAvailableSkills.mockReturnValue([
                'attack', 'heal', 'fireball', 'shield', 'teleport'
            ]);

            aiSystem.createAIControllers([enemyUnit]);

            const endMeasurement = performanceMonitor.startMeasurement('complex-thinking');
            const result = await aiSystem.executeAITurn(enemyUnit, gameState, mapData);
            const duration = endMeasurement();

            expect(result.success).toBe(true);
            expect(duration).toBeLessThan(2000); // 複雑でも2秒以内

            console.log(`複雑状況での思考時間: ${duration.toFixed(2)}ms`);
        });

        test('思考時間制限の有効性', async () => {
            const shortTimeoutConfig: AISystemManagerConfig = {
                thinkingTimeLimit: 100, // 100ms制限
                enableDebugLogging: false,
                enableVisualFeedback: false,
                randomFactor: 0,
                npcPriorityMultiplier: 50,
            };

            const aiSystem = new AISystemManager(mockScene, shortTimeoutConfig, { on: jest.fn(), emit: jest.fn() });
            aiSystem.initialize(
                mockSystems.gameStateManager,
                mockSystems.movementSystem,
                mockSystems.battleSystem,
                mockSystems.skillSystem,
                mockSystems.recruitmentSystem
            );

            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystem.createAIControllers([enemyUnit]);

            const endMeasurement = performanceMonitor.startMeasurement('timeout-test');
            const result = await aiSystem.executeAITurn(enemyUnit, gameState, mapData);
            const duration = endMeasurement();

            expect(result.success).toBe(true);
            expect(duration).toBeLessThan(500); // タイムアウト + バッファ時間
            expect(result.action.type).toBe(AIActionType.WAIT); // タイムアウト時のフォールバック

            console.log(`タイムアウトテスト実行時間: ${duration.toFixed(2)}ms`);
        });
    });

    describe('2. メモリ使用量パフォーマンス', () => {
        test('メモリ使用量が50MB以下', async () => {
            performanceMonitor.takeMemorySnapshot();

            const config: AISystemManagerConfig = {
                thinkingTimeLimit: 1000,
                enableDebugLogging: false,
                enableVisualFeedback: false,
                randomFactor: 0.1,
                npcPriorityMultiplier: 50,
            };

            const aiSystem = new AISystemManager(mockScene, config, { on: jest.fn(), emit: jest.fn() });
            aiSystem.initialize(
                mockSystems.gameStateManager,
                mockSystems.movementSystem,
                mockSystems.battleSystem,
                mockSystems.skillSystem,
                mockSystems.recruitmentSystem
            );

            // 大量のAIを作成
            const enemies = Array.from({ length: 100 }, (_, i) =>
                createMockUnit({ id: `enemy-${i}`, faction: 'enemy' })
            );

            aiSystem.createAIControllers(enemies);

            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: enemies } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            // 複数回実行
            for (let i = 0; i < 50; i++) {
                await aiSystem.executeAITurn(enemies[i % enemies.length], gameState, mapData);
                if (i % 10 === 0) {
                    performanceMonitor.takeMemorySnapshot();
                }
            }

            performanceMonitor.takeMemorySnapshot();

            const memoryTrend = performanceMonitor.getMemoryTrend();
            const memoryIncreaseMB = memoryTrend.increase / (1024 * 1024);

            expect(memoryIncreaseMB).toBeLessThan(50); // 50MB以下

            console.log(`メモリ使用量増加: ${memoryIncreaseMB.toFixed(2)}MB, トレンド: ${memoryTrend.trend}`);
        });

        test('メモリリークの検出', async () => {
            const config: AISystemManagerConfig = {
                thinkingTimeLimit: 500,
                enableDebugLogging: false,
                enableVisualFeedback: false,
                randomFactor: 0,
                npcPriorityMultiplier: 50,
            };

            performanceMonitor.takeMemorySnapshot();

            // 複数のAIシステムを作成・破棄
            for (let cycle = 0; cycle < 10; cycle++) {
                const aiSystem = new AISystemManager(mockScene, config, { on: jest.fn(), emit: jest.fn() });
                aiSystem.initialize(
                    mockSystems.gameStateManager,
                    mockSystems.movementSystem,
                    mockSystems.battleSystem,
                    mockSystems.skillSystem,
                    mockSystems.recruitmentSystem
                );

                const enemies = Array.from({ length: 20 }, (_, i) =>
                    createMockUnit({ id: `enemy-${cycle}-${i}`, faction: 'enemy' })
                );

                aiSystem.createAIControllers(enemies);

                const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: enemies } as GameState;
                const mapData = {
                    width: 10,
                    height: 10,
                    tileSize: 32,
                    tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
                } as MapData;

                // 実行
                for (let i = 0; i < 5; i++) {
                    await aiSystem.executeAITurn(enemies[i], gameState, mapData);
                }

                performanceMonitor.takeMemorySnapshot();

                // ガベージコレクションを促進
                if (global.gc) {
                    global.gc();
                }
            }

            const memoryTrend = performanceMonitor.getMemoryTrend();
            const memoryIncreaseMB = memoryTrend.increase / (1024 * 1024);

            // 10サイクル後でもメモリ増加が100MB以下であることを確認
            expect(memoryIncreaseMB).toBeLessThan(100);

            console.log(`メモリリークテスト: ${memoryIncreaseMB.toFixed(2)}MB増加 (${performanceMonitor.getMemoryTrend().snapshots}スナップショット)`);
        });
    });

    describe('3. 複数AI同時実行パフォーマンス', () => {
        test('複数AI同時実行が5秒以内', async () => {
            const config: AISystemManagerConfig = {
                thinkingTimeLimit: 1000,
                enableDebugLogging: false,
                enableVisualFeedback: false,
                randomFactor: 0.1,
                npcPriorityMultiplier: 50,
            };

            const aiSystem = new AISystemManager(mockScene, config, { on: jest.fn(), emit: jest.fn() });
            aiSystem.initialize(
                mockSystems.gameStateManager,
                mockSystems.movementSystem,
                mockSystems.battleSystem,
                mockSystems.skillSystem,
                mockSystems.recruitmentSystem
            );

            // 10体の敵AI
            const enemies = Array.from({ length: 10 }, (_, i) =>
                createMockUnit({ id: `enemy-${i}`, faction: 'enemy', position: { x: i, y: i } })
            );

            aiSystem.createAIControllers(enemies);

            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: enemies } as GameState;
            const mapData = {
                width: 15,
                height: 15,
                tileSize: 32,
                tiles: Array(15).fill(null).map(() => Array(15).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            const endMeasurement = performanceMonitor.startMeasurement('concurrent-ai');

            // 並列実行
            const promises = enemies.map(enemy =>
                aiSystem.executeAITurn(enemy, gameState, mapData)
            );

            const results = await Promise.all(promises);
            const totalDuration = endMeasurement();

            // 全て成功することを確認
            results.forEach(result => {
                expect(result.success).toBe(true);
            });

            expect(totalDuration).toBeLessThan(5000); // 5秒以内

            console.log(`10体AI並列実行時間: ${totalDuration.toFixed(2)}ms`);
        });

        test('スケーラビリティテスト', async () => {
            const config: AISystemManagerConfig = {
                thinkingTimeLimit: 500,
                enableDebugLogging: false,
                enableVisualFeedback: false,
                randomFactor: 0,
                npcPriorityMultiplier: 50,
            };

            const aiCounts = [1, 5, 10, 20, 50];
            const results: Array<{ count: number; duration: number; avgPerAI: number }> = [];

            for (const count of aiCounts) {
                const aiSystem = new AISystemManager(mockScene, config, { on: jest.fn(), emit: jest.fn() });
                aiSystem.initialize(
                    mockSystems.gameStateManager,
                    mockSystems.movementSystem,
                    mockSystems.battleSystem,
                    mockSystems.skillSystem,
                    mockSystems.recruitmentSystem
                );

                const enemies = Array.from({ length: count }, (_, i) =>
                    createMockUnit({ id: `enemy-${i}`, faction: 'enemy' })
                );

                aiSystem.createAIControllers(enemies);

                const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: enemies } as GameState;
                const mapData = {
                    width: 10,
                    height: 10,
                    tileSize: 32,
                    tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
                } as MapData;

                const startTime = performance.now();

                // 順次実行（実際のゲームでの動作に近い）
                for (const enemy of enemies) {
                    await aiSystem.executeAITurn(enemy, gameState, mapData);
                }

                const duration = performance.now() - startTime;
                const avgPerAI = duration / count;

                results.push({ count, duration, avgPerAI });

                console.log(`${count}体AI実行: 総時間${duration.toFixed(2)}ms, AI当たり${avgPerAI.toFixed(2)}ms`);
            }

            // スケーラビリティの確認（線形増加に近いことを期待）
            const scalabilityRatio = results[results.length - 1].avgPerAI / results[0].avgPerAI;
            expect(scalabilityRatio).toBeLessThan(3); // 3倍以下の増加率

            console.log(`スケーラビリティ比率: ${scalabilityRatio.toFixed(2)}`);
        });
    });

    describe('4. フレームレート影響測定', () => {
        test('AI実行中のフレームレート維持', async () => {
            const config: AISystemManagerConfig = {
                thinkingTimeLimit: 1000,
                enableDebugLogging: false,
                enableVisualFeedback: true, // 視覚効果を有効にしてより現実的なテスト
                randomFactor: 0.2,
                npcPriorityMultiplier: 50,
            };

            const aiSystem = new AISystemManager(mockScene, config, { on: jest.fn(), emit: jest.fn() });
            aiSystem.initialize(
                mockSystems.gameStateManager,
                mockSystems.movementSystem,
                mockSystems.battleSystem,
                mockSystems.skillSystem,
                mockSystems.recruitmentSystem
            );

            const enemies = Array.from({ length: 5 }, (_, i) =>
                createMockUnit({ id: `enemy-${i}`, faction: 'enemy' })
            );

            aiSystem.createAIControllers(enemies);

            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: enemies } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            // フレーム時間をシミュレート（60fps = 16.67ms per frame）
            const targetFrameTime = 16.67;
            const frameTimings: number[] = [];

            for (let i = 0; i < 5; i++) {
                const frameStart = performance.now();

                // AI実行
                await aiSystem.executeAITurn(enemies[i], gameState, mapData);

                // フレーム処理のシミュレート
                await new Promise(resolve => setTimeout(resolve, 1));

                const frameTime = performance.now() - frameStart;
                frameTimings.push(frameTime);
            }

            const avgFrameTime = frameTimings.reduce((sum, time) => sum + time, 0) / frameTimings.length;
            const maxFrameTime = Math.max(...frameTimings);

            // フレーム時間が33ms（30fps相当）以下であることを確認
            expect(avgFrameTime).toBeLessThan(33);
            expect(maxFrameTime).toBeLessThan(50);

            console.log(`平均フレーム時間: ${avgFrameTime.toFixed(2)}ms, 最大: ${maxFrameTime.toFixed(2)}ms`);
        });
    });

    describe('5. パフォーマンス回帰テスト', () => {
        test('パフォーマンスベースライン', async () => {
            // このテストは将来のパフォーマンス回帰を検出するためのベースライン
            const config: AISystemManagerConfig = {
                thinkingTimeLimit: 1000,
                enableDebugLogging: false,
                enableVisualFeedback: false,
                randomFactor: 0.1,
                npcPriorityMultiplier: 50,
            };

            const aiSystem = new AISystemManager(mockScene, config, { on: jest.fn(), emit: jest.fn() });
            aiSystem.initialize(
                mockSystems.gameStateManager,
                mockSystems.movementSystem,
                mockSystems.battleSystem,
                mockSystems.skillSystem,
                mockSystems.recruitmentSystem
            );

            const enemyUnit = createMockUnit({ id: 'baseline-enemy', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystem.createAIControllers([enemyUnit]);

            // ベースライン測定（100回実行）
            const measurements: number[] = [];
            for (let i = 0; i < 100; i++) {
                const start = performance.now();
                await aiSystem.executeAITurn(enemyUnit, gameState, mapData);
                measurements.push(performance.now() - start);
            }

            const avg = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
            const p95 = measurements.sort((a, b) => a - b)[Math.floor(measurements.length * 0.95)];

            // ベースライン値（これらの値は実際の測定結果に基づいて調整）
            expect(avg).toBeLessThan(100); // 平均100ms以下
            expect(p95).toBeLessThan(200); // 95パーセンタイル200ms以下

            console.log(`パフォーマンスベースライン - 平均: ${avg.toFixed(2)}ms, P95: ${p95.toFixed(2)}ms`);
        });
    });
});