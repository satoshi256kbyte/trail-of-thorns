/**
 * Performance tests for GameplayScene rendering and update loop efficiency
 * Tests frame rate, memory usage, and rendering performance
 * 
 * Implements requirement 6.5: Add performance tests for rendering and update loop efficiency
 */

import { GameplayScene } from '../../../game/src/scenes/GameplayScene';
import { StageData } from '../../../game/src/types/gameplay';

// Performance monitoring utilities
interface PerformanceMetrics {
    frameCount: number;
    totalUpdateTime: number;
    maxUpdateTime: number;
    minUpdateTime: number;
    averageUpdateTime: number;
    memoryUsage: {
        initial: number;
        current: number;
        peak: number;
    };
}

class PerformanceMonitor {
    private metrics: PerformanceMetrics = {
        frameCount: 0,
        totalUpdateTime: 0,
        maxUpdateTime: 0,
        minUpdateTime: Infinity,
        averageUpdateTime: 0,
        memoryUsage: {
            initial: 0,
            current: 0,
            peak: 0
        }
    };

    reset(): void {
        this.metrics = {
            frameCount: 0,
            totalUpdateTime: 0,
            maxUpdateTime: 0,
            minUpdateTime: Infinity,
            averageUpdateTime: 0,
            memoryUsage: {
                initial: process.memoryUsage().heapUsed,
                current: process.memoryUsage().heapUsed,
                peak: process.memoryUsage().heapUsed
            }
        };
    }

    measureUpdate(updateFn: () => void): number {
        const start = performance.now();
        updateFn();
        const end = performance.now();
        const duration = end - start;

        this.metrics.frameCount++;
        this.metrics.totalUpdateTime += duration;
        this.metrics.maxUpdateTime = Math.max(this.metrics.maxUpdateTime, duration);
        this.metrics.minUpdateTime = Math.min(this.metrics.minUpdateTime, duration);
        this.metrics.averageUpdateTime = this.metrics.totalUpdateTime / this.metrics.frameCount;

        // Update memory usage
        const currentMemory = process.memoryUsage().heapUsed;
        this.metrics.memoryUsage.current = currentMemory;
        this.metrics.memoryUsage.peak = Math.max(this.metrics.memoryUsage.peak, currentMemory);

        return duration;
    }

    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    getMemoryGrowth(): number {
        return this.metrics.memoryUsage.current - this.metrics.memoryUsage.initial;
    }

    getFPS(): number {
        return this.metrics.averageUpdateTime > 0 ? 1000 / this.metrics.averageUpdateTime : 0;
    }
}

// Mock Phaser with performance-focused implementations
const createPerformanceMocks = () => {
    const renderCallCount = { count: 0 };
    const updateCallCount = { count: 0 };

    const mockAdd = {
        text: jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            setText: jest.fn().mockReturnThis(),
            setColor: jest.fn().mockReturnThis(),
        }),
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn().mockReturnThis(),
            fillRect: jest.fn((...args) => {
                renderCallCount.count++;
                return this;
            }),
            setDepth: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            clear: jest.fn().mockReturnThis(),
            lineStyle: jest.fn().mockReturnThis(),
            strokeRect: jest.fn().mockReturnThis(),
        }),
        sprite: jest.fn().mockReturnValue({
            setScale: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setTint: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
        }),
        container: jest.fn().mockReturnValue({
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            add: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
        }),
    };

    return { mockAdd, renderCallCount, updateCallCount };
};

// Mock all dependencies with performance tracking
jest.mock('../../../game/src/systems/GameStateManager', () => ({
    GameStateManager: jest.fn().mockImplementation(() => ({
        initializeTurnOrder: jest.fn().mockReturnValue({ success: true }),
        getGameState: jest.fn().mockReturnValue({
            currentTurn: 1,
            activePlayer: 'player',
            phase: 'select',
            selectedUnit: undefined,
            gameResult: null,
            turnOrder: [],
            activeUnitIndex: 0,
        }),
        selectUnit: jest.fn().mockReturnValue({ success: true }),
        getSelectedUnit: jest.fn().mockReturnValue(undefined),
        isPlayerTurn: jest.fn().mockReturnValue(true),
        nextTurn: jest.fn().mockReturnValue({ success: true }),
        getPlayerUnits: jest.fn().mockReturnValue([]),
        reset: jest.fn(),
    })),
}));

jest.mock('../../../game/src/systems/CameraController', () => ({
    CameraController: jest.fn().mockImplementation(() => ({
        setMapBounds: jest.fn().mockReturnValue({ success: true }),
        enableKeyboardControls: jest.fn().mockReturnValue({ success: true }),
        enableMouseControls: jest.fn().mockReturnValue({ success: true }),
        update: jest.fn((delta) => {
            // Simulate some processing time
            const start = performance.now();
            while (performance.now() - start < 0.1) { } // 0.1ms processing
        }),
        moveCamera: jest.fn().mockReturnValue({ success: true }),
        focusOnPosition: jest.fn().mockReturnValue({ success: true }),
        destroy: jest.fn(),
    })),
}));

jest.mock('../../../game/src/ui/UIManager', () => ({
    UIManager: jest.fn().mockImplementation(() => ({
        createUI: jest.fn(),
        updateUI: jest.fn(),
        updateTurnDisplay: jest.fn(),
        showCharacterInfo: jest.fn(),
        hideCharacterInfo: jest.fn(),
        destroy: jest.fn(),
    })),
}));

jest.mock('../../../game/src/input/InputHandler', () => ({
    InputHandler: jest.fn().mockImplementation(() => ({
        setTileSize: jest.fn().mockReturnValue({ success: true }),
        setGameState: jest.fn(),
        setCharacterSelectionCallback: jest.fn(),
        setCameraControlCallback: jest.fn(),
        setShortcutCallback: jest.fn(),
        destroy: jest.fn(),
    })),
}));

jest.mock('../../../game/src/rendering/MapRenderer', () => ({
    MapRenderer: jest.fn().mockImplementation(() => ({
        loadMap: jest.fn().mockImplementation(() => Promise.resolve({ success: true })),
        renderGrid: jest.fn(),
        highlightTiles: jest.fn(),
        clearHighlights: jest.fn(),
        destroy: jest.fn(),
    })),
}));

jest.mock('../../../game/src/systems/CharacterManager', () => ({
    CharacterManager: jest.fn().mockImplementation(() => ({
        loadCharacters: jest.fn().mockReturnValue({ success: true }),
        selectCharacter: jest.fn().mockReturnValue({ success: true }),
        getCharacterById: jest.fn().mockReturnValue(undefined),
        destroy: jest.fn(),
    })),
}));

jest.mock('../../../game/src/debug/DebugManager', () => ({
    DebugManager: jest.fn().mockImplementation(() => ({
        enableDebugMode: jest.fn(),
        setMapData: jest.fn(),
        setCharacters: jest.fn(),
        setGameState: jest.fn(),
        update: jest.fn((time, delta) => {
            // Simulate debug processing
            const start = performance.now();
            while (performance.now() - start < 0.05) { } // 0.05ms processing
        }),
        destroy: jest.fn(),
    })),
}));

jest.mock('../../../game/src/utils/SceneTransition', () => ({
    SceneTransition: {
        createEntranceTransition: jest.fn(),
        transitionTo: jest.fn().mockResolvedValue(undefined),
    },
    TransitionType: {
        FADE_IN: 'FADE_IN',
        FADE_OUT: 'FADE_OUT',
        SLIDE_RIGHT: 'SLIDE_RIGHT',
        ZOOM_IN: 'ZOOM_IN',
    },
}));

// Mock Phaser with performance tracking
jest.mock('phaser', () => {
    const { mockAdd } = createPerformanceMocks();

    return {
        Scene: jest.fn().mockImplementation(function (this: any, config: any) {
            this.scene = { key: config.key, start: jest.fn() };
            this.add = mockAdd;
            this.cameras = {
                main: {
                    width: 1920,
                    height: 1080,
                    setZoom: jest.fn(),
                    setBounds: jest.fn(),
                    setScroll: jest.fn(),
                    scrollX: 0,
                    scrollY: 0,
                    zoom: 1,
                },
            };
            this.input = {
                keyboard: {
                    createCursorKeys: jest.fn().mockReturnValue({}),
                    addKeys: jest.fn().mockReturnValue({}),
                    on: jest.fn(),
                    off: jest.fn(),
                    once: jest.fn(),
                },
                on: jest.fn(),
                off: jest.fn(),
                activePointer: {
                    x: 0,
                    y: 0,
                    isDown: false,
                    button: 0,
                    rightButtonDown: jest.fn().mockReturnValue(false),
                },
            };
            this.load = {
                json: jest.fn(),
                on: jest.fn(),
            };
            this.cache = {
                json: {
                    get: jest.fn().mockReturnValue({
                        width: 12,
                        height: 8,
                        tileSize: 32,
                        layers: [
                            {
                                name: 'background',
                                type: 'background',
                                data: Array(8).fill(null).map(() => Array(12).fill(1)),
                                visible: true,
                                opacity: 1.0,
                            },
                        ],
                        playerSpawns: [{ x: 1, y: 6 }],
                        enemySpawns: [{ x: 9, y: 1 }],
                    }),
                },
            };
            this.events = {
                emit: jest.fn(),
                on: jest.fn(),
                off: jest.fn(),
                removeAllListeners: jest.fn(),
            };
            this.data = {
                set: jest.fn(),
                get: jest.fn(),
                remove: jest.fn(),
            };
            this.scale = { width: 1920, height: 1080 };
            this.tweens = { add: jest.fn().mockReturnValue({ stop: jest.fn(), progress: 0 }) };
            this.make = {
                tilemap: jest.fn().mockReturnValue({
                    addTilesetImage: jest.fn().mockReturnValue({}),
                    createLayer: jest.fn().mockReturnValue({
                        setAlpha: jest.fn(),
                        setDepth: jest.fn(),
                    }),
                    destroy: jest.fn(),
                }),
            };
            this.textures = { exists: jest.fn().mockReturnValue(false) };
            return this;
        }),
    };
});

describe('GameplayScene Performance Tests', () => {
    let scene: GameplayScene;
    let performanceMonitor: PerformanceMonitor;
    let consoleSpy: jest.SpyInstance;

    const createLargeStageData = (): StageData => ({
        id: 'performance-test-stage',
        name: 'Performance Test Stage',
        description: 'Large stage for performance testing',
        mapData: {
            width: 20,
            height: 15,
            tileSize: 32,
            layers: [
                {
                    name: 'background',
                    type: 'background',
                    data: Array(15).fill(null).map(() => Array(20).fill(1)),
                    visible: true,
                    opacity: 1.0,
                },
                {
                    name: 'terrain',
                    type: 'terrain',
                    data: Array(15).fill(null).map(() => Array(20).fill(0)),
                    visible: true,
                    opacity: 1.0,
                }
            ],
            playerSpawns: Array(5).fill(null).map((_, i) => ({ x: i + 1, y: 10 })),
            enemySpawns: Array(5).fill(null).map((_, i) => ({ x: i + 15, y: 5 })),
        },
        playerUnits: Array(5).fill(null).map((_, i) => ({
            id: `player-${i}`,
            name: `Player ${i}`,
            position: { x: i + 1, y: 10 },
            stats: { maxHP: 100, maxMP: 50, attack: 25, defense: 15, speed: 12, movement: 3 },
            currentHP: 100,
            currentMP: 50,
            faction: 'player' as const,
            hasActed: false,
            hasMoved: false
        })),
        enemyUnits: Array(5).fill(null).map((_, i) => ({
            id: `enemy-${i}`,
            name: `Enemy ${i}`,
            position: { x: i + 15, y: 5 },
            stats: { maxHP: 90, maxMP: 20, attack: 20, defense: 12, speed: 8, movement: 2 },
            currentHP: 90,
            currentMP: 20,
            faction: 'enemy' as const,
            hasActed: false,
            hasMoved: false
        })),
        victoryConditions: [
            {
                type: 'defeat_all',
                description: 'Defeat all enemy units'
            }
        ]
    });

    const waitForInitialization = async (scene: GameplayScene, timeout = 1000): Promise<void> => {
        const startTime = Date.now();
        while (!scene.isSceneInitialized() && (Date.now() - startTime) < timeout) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    };

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        jest.clearAllMocks();
        scene = new GameplayScene();
        performanceMonitor = new PerformanceMonitor();
        performanceMonitor.reset();
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    describe('Update Loop Performance', () => {
        test('should maintain 60fps target during normal gameplay', async () => {
            const stageData = createLargeStageData();

            scene.create({ selectedStage: stageData });
            await waitForInitialization(scene);

            const targetFPS = 60;
            const maxUpdateTime = 1000 / targetFPS; // ~16.67ms
            const updateCycles = 300; // 5 seconds at 60fps

            // Run update cycles and measure performance
            for (let i = 0; i < updateCycles; i++) {
                const updateTime = performanceMonitor.measureUpdate(() => {
                    scene.update(i * 16, 16);
                });

                // Each update should be within frame budget
                expect(updateTime).toBeLessThan(maxUpdateTime);
            }

            const metrics = performanceMonitor.getMetrics();

            // Average performance should be well within limits
            expect(metrics.averageUpdateTime).toBeLessThan(maxUpdateTime * 0.8); // 80% of frame budget
            expect(metrics.maxUpdateTime).toBeLessThan(maxUpdateTime);
            expect(performanceMonitor.getFPS()).toBeGreaterThan(50); // Allow some variance
        });

        test('should handle high-frequency updates efficiently', async () => {
            const stageData = createLargeStageData();

            scene.create({ selectedStage: stageData });
            await waitForInitialization(scene);

            const highFrequencyUpdates = 1000;
            const deltaTime = 8; // 120fps equivalent

            // Run high-frequency updates
            for (let i = 0; i < highFrequencyUpdates; i++) {
                performanceMonitor.measureUpdate(() => {
                    scene.update(i * deltaTime, deltaTime);
                });
            }

            const metrics = performanceMonitor.getMetrics();

            // Should maintain performance even at high frequency
            expect(metrics.averageUpdateTime).toBeLessThan(5); // 5ms average
            expect(metrics.maxUpdateTime).toBeLessThan(10); // 10ms max
        });

        test('should handle variable frame rates gracefully', async () => {
            const stageData = createLargeStageData();

            scene.create({ selectedStage: stageData });
            await waitForInitialization(scene);

            const variableDeltas = [8, 16, 33, 16, 8, 50, 16, 16]; // Variable frame times
            let totalTime = 0;

            // Run with variable frame rates
            for (let i = 0; i < 100; i++) {
                const delta = variableDeltas[i % variableDeltas.length];
                totalTime += delta;

                performanceMonitor.measureUpdate(() => {
                    scene.update(totalTime, delta);
                });
            }

            const metrics = performanceMonitor.getMetrics();

            // Should handle variable frame rates without performance degradation
            expect(metrics.averageUpdateTime).toBeLessThan(8);
            expect(metrics.maxUpdateTime).toBeLessThan(15);
        });
    });

    describe('Memory Usage Performance', () => {
        test('should maintain stable memory usage during extended gameplay', async () => {
            const stageData = createLargeStageData();

            scene.create({ selectedStage: stageData });
            await waitForInitialization(scene);

            const extendedUpdateCycles = 2000; // Extended session
            const memoryCheckInterval = 100;
            const memorySnapshots: number[] = [];

            // Run extended gameplay session
            for (let i = 0; i < extendedUpdateCycles; i++) {
                performanceMonitor.measureUpdate(() => {
                    scene.update(i * 16, 16);
                });

                // Take memory snapshots periodically
                if (i % memoryCheckInterval === 0) {
                    memorySnapshots.push(process.memoryUsage().heapUsed);
                }
            }

            const memoryGrowth = performanceMonitor.getMemoryGrowth();

            // Memory growth should be minimal (< 5MB for extended session)
            expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024);

            // Memory usage should be relatively stable
            const maxSnapshot = Math.max(...memorySnapshots);
            const minSnapshot = Math.min(...memorySnapshots);
            const memoryVariance = maxSnapshot - minSnapshot;

            expect(memoryVariance).toBeLessThan(10 * 1024 * 1024); // < 10MB variance
        });

        test('should handle rapid scene creation and destruction without memory leaks', () => {
            const iterations = 20;
            const initialMemory = process.memoryUsage().heapUsed;

            for (let i = 0; i < iterations; i++) {
                const testScene = new GameplayScene();

                // Create and immediately destroy
                testScene.create();
                testScene.destroy();
            }

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryGrowth = finalMemory - initialMemory;

            // Memory growth should be minimal after cleanup
            expect(memoryGrowth).toBeLessThan(2 * 1024 * 1024); // < 2MB growth
        });

        test('should efficiently manage large numbers of game objects', async () => {
            // Create stage with many units
            const largeStageData = {
                ...createLargeStageData(),
                playerUnits: Array(20).fill(null).map((_, i) => ({
                    id: `player-${i}`,
                    name: `Player ${i}`,
                    position: { x: i % 10, y: Math.floor(i / 10) + 10 },
                    stats: { maxHP: 100, maxMP: 50, attack: 25, defense: 15, speed: 12, movement: 3 },
                    currentHP: 100,
                    currentMP: 50,
                    faction: 'player' as const,
                    hasActed: false,
                    hasMoved: false
                })),
                enemyUnits: Array(20).fill(null).map((_, i) => ({
                    id: `enemy-${i}`,
                    name: `Enemy ${i}`,
                    position: { x: i % 10, y: Math.floor(i / 10) + 5 },
                    stats: { maxHP: 90, maxMP: 20, attack: 20, defense: 12, speed: 8, movement: 2 },
                    currentHP: 90,
                    currentMP: 20,
                    faction: 'enemy' as const,
                    hasActed: false,
                    hasMoved: false
                }))
            };

            scene.create({ selectedStage: largeStageData });
            await waitForInitialization(scene);

            // Run updates with many objects
            for (let i = 0; i < 500; i++) {
                performanceMonitor.measureUpdate(() => {
                    scene.update(i * 16, 16);
                });
            }

            const metrics = performanceMonitor.getMetrics();

            // Should handle many objects efficiently
            expect(metrics.averageUpdateTime).toBeLessThan(20); // 20ms average with many objects
            expect(performanceMonitor.getMemoryGrowth()).toBeLessThan(15 * 1024 * 1024); // < 15MB growth
        });
    });

    describe('Rendering Performance', () => {
        test('should minimize rendering calls during static scenes', async () => {
            const stageData = createLargeStageData();

            scene.create({ selectedStage: stageData });
            await waitForInitialization(scene);

            // Count rendering operations during static scene
            const { mockAdd } = createPerformanceMocks();
            let renderCallsBefore = 0;
            let renderCallsAfter = 0;

            // Measure rendering calls
            renderCallsBefore = mockAdd.graphics().fillRect.mock?.calls?.length || 0;

            // Run updates without changes
            for (let i = 0; i < 100; i++) {
                scene.update(i * 16, 16);
            }

            renderCallsAfter = mockAdd.graphics().fillRect.mock?.calls?.length || 0;

            // Rendering calls should be minimal for static scenes
            const additionalRenderCalls = renderCallsAfter - renderCallsBefore;
            expect(additionalRenderCalls).toBeLessThan(50); // Minimal additional rendering
        });

        test('should handle scene initialization efficiently', async () => {
            const stageData = createLargeStageData();

            const initStartTime = performance.now();
            scene.create({ selectedStage: stageData });
            await waitForInitialization(scene);
            const initEndTime = performance.now();

            const initializationTime = initEndTime - initStartTime;

            // Initialization should be reasonably fast (< 500ms)
            expect(initializationTime).toBeLessThan(500);
            expect(scene.isSceneInitialized()).toBe(true);
        });

        test('should handle rapid state changes efficiently', async () => {
            const stageData = createLargeStageData();

            scene.create({ selectedStage: stageData });
            await waitForInitialization(scene);

            const gameStateManager = scene.getGameStateManager();

            // Perform rapid state changes
            for (let i = 0; i < 50; i++) {
                const updateTime = performanceMonitor.measureUpdate(() => {
                    // Simulate rapid unit selection/deselection
                    if (i % 2 === 0) {
                        gameStateManager.selectUnit(stageData.playerUnits[0]);
                    } else {
                        gameStateManager.selectUnit(null);
                    }

                    scene.update(i * 16, 16);
                });

                // Each update with state changes should still be fast
                expect(updateTime).toBeLessThan(25); // 25ms max for state changes
            }

            const metrics = performanceMonitor.getMetrics();
            expect(metrics.averageUpdateTime).toBeLessThan(15);
        });
    });

    describe('Stress Testing', () => {
        test('should handle maximum expected load', async () => {
            // Create maximum size stage
            const maxStageData = {
                ...createLargeStageData(),
                mapData: {
                    ...createLargeStageData().mapData,
                    width: 30,
                    height: 20,
                    layers: Array(4).fill(null).map((_, i) => ({
                        name: `layer-${i}`,
                        type: i === 0 ? 'background' : 'terrain' as any,
                        data: Array(20).fill(null).map(() => Array(30).fill(i)),
                        visible: true,
                        opacity: 1.0,
                    }))
                }
            };

            scene.create({ selectedStage: maxStageData });
            await waitForInitialization(scene);

            // Run stress test
            const stressTestCycles = 1000;
            let maxUpdateTime = 0;

            for (let i = 0; i < stressTestCycles; i++) {
                const updateTime = performanceMonitor.measureUpdate(() => {
                    scene.update(i * 16, 16);
                });
                maxUpdateTime = Math.max(maxUpdateTime, updateTime);
            }

            const metrics = performanceMonitor.getMetrics();

            // Should handle maximum load within acceptable limits
            expect(metrics.averageUpdateTime).toBeLessThan(30); // 30ms average under max load
            expect(maxUpdateTime).toBeLessThan(50); // 50ms max spike
            expect(performanceMonitor.getMemoryGrowth()).toBeLessThan(20 * 1024 * 1024); // < 20MB growth
        });

        test('should recover from performance spikes', async () => {
            const stageData = createLargeStageData();

            scene.create({ selectedStage: stageData });
            await waitForInitialization(scene);

            // Simulate performance spike by adding artificial delay
            const { CameraController } = require('../../../game/src/systems/CameraController');
            const cameraInstance = CameraController.mock.instances[0];

            let spikeActive = false;
            cameraInstance.update.mockImplementation((delta: number) => {
                if (spikeActive) {
                    // Simulate heavy processing
                    const start = performance.now();
                    while (performance.now() - start < 20) { } // 20ms spike
                }
            });

            // Normal performance baseline
            for (let i = 0; i < 50; i++) {
                performanceMonitor.measureUpdate(() => {
                    scene.update(i * 16, 16);
                });
            }

            const baselineMetrics = performanceMonitor.getMetrics();
            performanceMonitor.reset();

            // Introduce performance spike
            spikeActive = true;
            for (let i = 0; i < 10; i++) {
                performanceMonitor.measureUpdate(() => {
                    scene.update(i * 16, 16);
                });
            }

            // Return to normal
            spikeActive = false;
            for (let i = 0; i < 50; i++) {
                performanceMonitor.measureUpdate(() => {
                    scene.update(i * 16, 16);
                });
            }

            const recoveryMetrics = performanceMonitor.getMetrics();

            // Should recover to baseline performance
            expect(recoveryMetrics.averageUpdateTime).toBeLessThan(baselineMetrics.averageUpdateTime * 1.5);
        });
    });

    describe('Performance Regression Detection', () => {
        test('should detect performance regressions in update loop', async () => {
            const stageData = createLargeStageData();

            scene.create({ selectedStage: stageData });
            await waitForInitialization(scene);

            // Establish performance baseline
            const baselineCycles = 100;
            const baselineMonitor = new PerformanceMonitor();
            baselineMonitor.reset();

            for (let i = 0; i < baselineCycles; i++) {
                baselineMonitor.measureUpdate(() => {
                    scene.update(i * 16, 16);
                });
            }

            const baselineMetrics = baselineMonitor.getMetrics();

            // Performance thresholds (these would be updated based on actual measurements)
            const performanceThresholds = {
                maxAverageUpdateTime: 10, // 10ms average
                maxUpdateTime: 20, // 20ms max
                maxMemoryGrowth: 5 * 1024 * 1024, // 5MB
                minFPS: 50 // 50fps minimum
            };

            // Verify performance meets thresholds
            expect(baselineMetrics.averageUpdateTime).toBeLessThan(performanceThresholds.maxAverageUpdateTime);
            expect(baselineMetrics.maxUpdateTime).toBeLessThan(performanceThresholds.maxUpdateTime);
            expect(baselineMonitor.getMemoryGrowth()).toBeLessThan(performanceThresholds.maxMemoryGrowth);
            expect(baselineMonitor.getFPS()).toBeGreaterThan(performanceThresholds.minFPS);
        });
    });
});