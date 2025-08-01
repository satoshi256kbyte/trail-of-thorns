/**
 * DebugManager test suite
 * Tests debug functionality and performance metrics
 */

import { DebugManager, DebugConfig, PerformanceMetrics, ConsoleCommand } from '../../../game/src/debug/DebugManager';
import { Unit, MapData, GameState } from '../../../game/src/types/gameplay';

// Mock Phaser scene
const mockScene = {
    add: {
        container: jest.fn().mockReturnValue({
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            add: jest.fn(),
            destroy: jest.fn(),
            setPosition: jest.fn().mockReturnThis(),
            getAt: jest.fn().mockReturnValue({
                setText: jest.fn()
            })
        }),
        text: jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setText: jest.fn(),
            destroy: jest.fn()
        }),
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn().mockReturnThis(),
            lineStyle: jest.fn().mockReturnThis(),
            fillRoundedRect: jest.fn().mockReturnThis(),
            strokeRoundedRect: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        })
    },
    cameras: {
        main: {
            scrollX: 0,
            scrollY: 0,
            width: 800,
            height: 600,
            zoom: 1,
            setScroll: jest.fn(),
            setZoom: jest.fn()
        }
    },
    input: {
        keyboard: {
            addKey: jest.fn().mockReturnValue({
                on: jest.fn().mockReturnThis()
            })
        }
    },
    events: {
        emit: jest.fn()
    },
    data: {
        get: jest.fn(),
        set: jest.fn()
    },
    time: {
        now: 1000
    }
} as any;

// Mock performance object
Object.defineProperty(global, 'performance', {
    value: {
        now: jest.fn(() => 1000),
        memory: {
            usedJSHeapSize: 50 * 1024 * 1024 // 50MB
        }
    }
});

describe('DebugManager', () => {
    let debugManager: DebugManager;
    let mockMapData: MapData;
    let mockCharacters: Unit[];
    let mockGameState: GameState;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock data
        mockMapData = {
            width: 10,
            height: 10,
            tileSize: 32,
            layers: [{
                name: 'background',
                type: 'background',
                data: Array(10).fill(Array(10).fill(0)),
                visible: true,
                opacity: 1
            }],
            playerSpawns: [{ x: 1, y: 1 }],
            enemySpawns: [{ x: 8, y: 8 }]
        };

        mockCharacters = [
            {
                id: 'player-1',
                name: 'Hero',
                position: { x: 1, y: 1 },
                stats: {
                    maxHP: 100,
                    maxMP: 50,
                    attack: 25,
                    defense: 15,
                    speed: 12,
                    movement: 3
                },
                currentHP: 80,
                currentMP: 30,
                faction: 'player',
                hasActed: false,
                hasMoved: false
            },
            {
                id: 'enemy-1',
                name: 'Orc',
                position: { x: 8, y: 8 },
                stats: {
                    maxHP: 90,
                    maxMP: 20,
                    attack: 20,
                    defense: 12,
                    speed: 8,
                    movement: 2
                },
                currentHP: 90,
                currentMP: 20,
                faction: 'enemy',
                hasActed: false,
                hasMoved: false
            }
        ];

        mockGameState = {
            currentTurn: 1,
            activePlayer: 'player',
            phase: 'select',
            selectedUnit: mockCharacters[0],
            gameResult: null,
            turnOrder: mockCharacters,
            activeUnitIndex: 0
        };

        debugManager = new DebugManager(mockScene);
    });

    describe('Initialization', () => {
        test('should initialize with default configuration', () => {
            expect(debugManager).toBeDefined();
            expect(mockScene.input.keyboard.addKey).toHaveBeenCalledWith('F12');
            expect(mockScene.input.keyboard.addKey).toHaveBeenCalledWith('F11');
            expect(mockScene.input.keyboard.addKey).toHaveBeenCalledWith('F10');
            expect(mockScene.input.keyboard.addKey).toHaveBeenCalledWith('F9');
        });

        test('should initialize with custom configuration', () => {
            const customConfig: Partial<DebugConfig> = {
                showGridCoordinates: false,
                textColor: '#ff0000',
                performanceUpdateInterval: 500
            };

            const customDebugManager = new DebugManager(mockScene, customConfig);
            expect(customDebugManager).toBeDefined();
        });
    });

    describe('Debug Mode Toggle', () => {
        test('should enable debug mode', () => {
            debugManager.enableDebugMode();

            expect(mockScene.add.container).toHaveBeenCalled();
            expect(mockScene.events.emit).toHaveBeenCalledWith('debug-mode-enabled');
        });

        test('should disable debug mode', () => {
            debugManager.enableDebugMode();
            debugManager.disableDebugMode();

            expect(mockScene.events.emit).toHaveBeenCalledWith('debug-mode-disabled');
        });

        test('should toggle debug mode', () => {
            // Initially disabled
            debugManager.toggleDebugMode();
            expect(mockScene.events.emit).toHaveBeenCalledWith('debug-mode-enabled');

            // Now enabled, should disable
            debugManager.toggleDebugMode();
            expect(mockScene.events.emit).toHaveBeenCalledWith('debug-mode-disabled');
        });

        test('should not enable debug mode twice', () => {
            debugManager.enableDebugMode();
            const firstCallCount = mockScene.add.container.mock.calls.length;

            debugManager.enableDebugMode();
            expect(mockScene.add.container.mock.calls.length).toBe(firstCallCount);
        });
    });

    describe('Grid Coordinates', () => {
        beforeEach(() => {
            debugManager.setMapData(mockMapData);
            debugManager.enableDebugMode();
        });

        test('should show grid coordinates when map data is set', () => {
            expect(mockScene.add.text).toHaveBeenCalled();
        });

        test('should update grid coordinates when camera moves', () => {
            const initialTextCalls = mockScene.add.text.mock.calls.length;

            // Simulate camera movement
            mockScene.cameras.main.scrollX = 100;
            mockScene.cameras.main.scrollY = 100;

            debugManager.update(2000, 16);

            // Should create new coordinate texts
            expect(mockScene.add.text.mock.calls.length).toBeGreaterThan(initialTextCalls);
        });
    });

    describe('Character Stats', () => {
        beforeEach(() => {
            debugManager.setMapData(mockMapData);
            debugManager.setCharacters(mockCharacters);
            debugManager.enableDebugMode();
        });

        test('should show character stats', () => {
            expect(mockScene.add.container).toHaveBeenCalled();
            expect(mockScene.add.text).toHaveBeenCalled();
            expect(mockScene.add.graphics).toHaveBeenCalled();
        });

        test('should update character stats on update', () => {
            debugManager.setMapData(mockMapData);
            debugManager.setCharacters(mockCharacters);
            debugManager.enableDebugMode();
            debugManager.update(1000, 16);

            // Should not throw and should have created character displays
            expect(mockScene.add.container).toHaveBeenCalled();
        });
    });

    describe('Performance Metrics', () => {
        beforeEach(() => {
            debugManager.enableDebugMode();
        });

        test('should show performance metrics', () => {
            expect(mockScene.add.text).toHaveBeenCalled();
        });

        test('should update performance metrics', () => {
            debugManager.enableDebugMode();

            // Just verify that performance metrics are being tracked
            debugManager.update(1000, 16);

            const metrics = debugManager.getPerformanceMetrics();
            expect(metrics).toHaveProperty('fps');
            expect(metrics).toHaveProperty('frameTime');
            expect(metrics).toHaveProperty('memoryUsage');
            expect(metrics).toHaveProperty('updateTime');
            expect(metrics).toHaveProperty('lastUpdateDuration');
        });

        test('should get performance metrics', () => {
            debugManager.update(1000, 16);
            const metrics = debugManager.getPerformanceMetrics();

            expect(metrics).toHaveProperty('fps');
            expect(metrics).toHaveProperty('frameTime');
            expect(metrics).toHaveProperty('memoryUsage');
            expect(metrics).toHaveProperty('updateTime');
            expect(metrics).toHaveProperty('lastUpdateDuration');
        });

        test('should calculate FPS correctly', () => {
            // Simulate 60 FPS (16.67ms per frame)
            for (let i = 0; i < 60; i++) {
                debugManager.update(1000 + (i * 16.67), 16.67);
            }

            // Trigger FPS calculation after 1 second
            debugManager.update(2000, 16.67);

            const metrics = debugManager.getPerformanceMetrics();
            expect(metrics.fps).toBeGreaterThan(0);
        });
    });

    describe('Console Commands', () => {
        beforeEach(() => {
            debugManager.enableDebugMode();
        });

        test('should execute help command', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            debugManager.executeConsoleCommand('help');

            expect(consoleSpy).toHaveBeenCalledWith('Available debug commands:');
            consoleSpy.mockRestore();
        });

        test('should execute grid command', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            debugManager.executeConsoleCommand('grid on');
            expect(consoleSpy).toHaveBeenCalledWith('Grid coordinates: ON');

            debugManager.executeConsoleCommand('grid off');
            expect(consoleSpy).toHaveBeenCalledWith('Grid coordinates: OFF');

            consoleSpy.mockRestore();
        });

        test('should execute stats command', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            debugManager.executeConsoleCommand('stats toggle');
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Character stats:'));

            consoleSpy.mockRestore();
        });

        test('should execute camera command', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            debugManager.executeConsoleCommand('camera pos 100 200');
            expect(consoleSpy).toHaveBeenCalledWith('Camera position set to: 100, 200');
            expect(mockScene.cameras.main.setScroll).toHaveBeenCalledWith(100, 200);

            debugManager.executeConsoleCommand('camera zoom x y 2');
            expect(consoleSpy).toHaveBeenCalledWith('Camera zoom set to: 2');
            expect(mockScene.cameras.main.setZoom).toHaveBeenCalledWith(2);

            debugManager.executeConsoleCommand('camera reset');
            expect(consoleSpy).toHaveBeenCalledWith('Camera reset to origin');
            expect(mockScene.cameras.main.setScroll).toHaveBeenCalledWith(0, 0);
            expect(mockScene.cameras.main.setZoom).toHaveBeenCalledWith(1);

            consoleSpy.mockRestore();
        });

        test('should execute gamestate command', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            debugManager.setGameState(mockGameState);
            debugManager.executeConsoleCommand('gamestate');

            expect(consoleSpy).toHaveBeenCalledWith('Current game state:', mockGameState);
            consoleSpy.mockRestore();
        });

        test('should execute character command', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            debugManager.setCharacters(mockCharacters);

            // List all characters
            debugManager.executeConsoleCommand('character');
            expect(consoleSpy).toHaveBeenCalledWith('Available characters:');

            // Get specific character
            debugManager.executeConsoleCommand('character player-1');
            expect(consoleSpy).toHaveBeenCalledWith('Character player-1:', mockCharacters[0]);

            // Non-existent character
            debugManager.executeConsoleCommand('character invalid-id');
            expect(consoleSpy).toHaveBeenCalledWith('Character invalid-id not found');

            consoleSpy.mockRestore();
        });

        test('should handle unknown commands', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            debugManager.executeConsoleCommand('unknown-command');

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining("Unknown command 'unknown-command'")
            );
            consoleSpy.mockRestore();
        });

        test('should add custom console command', () => {
            const customHandler = jest.fn();
            const customCommand: ConsoleCommand = {
                name: 'test',
                description: 'Test command',
                parameters: ['param1'],
                handler: customHandler
            };

            debugManager.addConsoleCommand(customCommand);
            debugManager.executeConsoleCommand('test arg1');

            expect(customHandler).toHaveBeenCalledWith('arg1');
        });

        test('should handle command execution errors', () => {
            const errorHandler = jest.fn(() => {
                throw new Error('Test error');
            });
            const errorCommand: ConsoleCommand = {
                name: 'error',
                description: 'Error command',
                parameters: [],
                handler: errorHandler
            };

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            debugManager.addConsoleCommand(errorCommand);
            debugManager.executeConsoleCommand('error');

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining("Error executing command 'error'"),
                expect.any(Error)
            );
            consoleSpy.mockRestore();
        });
    });

    describe('Data Management', () => {
        test('should set map data', () => {
            debugManager.setMapData(mockMapData);
            // Should not throw and should enable grid coordinates if debug mode is on
            debugManager.enableDebugMode();
            expect(mockScene.add.text).toHaveBeenCalled();
        });

        test('should set game state', () => {
            debugManager.setGameState(mockGameState);
            // Should not throw
            expect(() => debugManager.setGameState(mockGameState)).not.toThrow();
        });

        test('should set characters', () => {
            debugManager.setCharacters(mockCharacters);
            debugManager.enableDebugMode();
            // Should create character stat displays
            expect(mockScene.add.container).toHaveBeenCalled();
        });
    });

    describe('Update Loop', () => {
        test('should not update when disabled', () => {
            const setText = jest.fn();
            mockScene.add.text.mockReturnValue({
                setOrigin: jest.fn().mockReturnThis(),
                setDepth: jest.fn().mockReturnThis(),
                setScrollFactor: jest.fn().mockReturnThis(),
                setText: setText,
                destroy: jest.fn()
            });

            debugManager.update(1000, 16);

            // Should not update performance text when disabled
            expect(setText).not.toHaveBeenCalled();
        });

        test('should update when enabled', () => {
            debugManager.setMapData(mockMapData);
            debugManager.setCharacters(mockCharacters);
            debugManager.enableDebugMode();

            expect(() => debugManager.update(1000, 16)).not.toThrow();
        });

        test('should measure update duration', () => {
            debugManager.enableDebugMode();
            debugManager.update(1000, 16);

            const metrics = debugManager.getPerformanceMetrics();
            expect(metrics.lastUpdateDuration).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Memory Management', () => {
        test('should clean up resources when disabled', () => {
            const destroyMock = jest.fn();
            mockScene.add.container.mockReturnValue({
                setScrollFactor: jest.fn().mockReturnThis(),
                setDepth: jest.fn().mockReturnThis(),
                add: jest.fn(),
                destroy: destroyMock
            });

            debugManager.enableDebugMode();
            debugManager.disableDebugMode();

            expect(destroyMock).toHaveBeenCalled();
        });

        test('should handle multiple enable/disable cycles', () => {
            for (let i = 0; i < 5; i++) {
                debugManager.enableDebugMode();
                debugManager.disableDebugMode();
            }

            // Should not throw errors
            expect(() => debugManager.toggleDebugMode()).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('should handle missing map data gracefully', () => {
            debugManager.enableDebugMode();
            // Should not throw when map data is not set
            expect(() => debugManager.update(1000, 16)).not.toThrow();
        });

        test('should handle empty character array', () => {
            debugManager.setCharacters([]);
            debugManager.enableDebugMode();

            expect(() => debugManager.update(1000, 16)).not.toThrow();
        });

        test('should handle invalid performance memory object', () => {
            // Remove memory property
            delete (performance as any).memory;

            debugManager.enableDebugMode();
            debugManager.update(1000, 16);

            const metrics = debugManager.getPerformanceMetrics();
            expect(metrics.memoryUsage).toBe(0);
        });
    });
});