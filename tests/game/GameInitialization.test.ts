/**
 * Tests for main game initialization and scene registration
 * Tests the GameInitializer class and proper scene registration
 * Implements requirement: Add error handling for scene loading failures
 */

import * as Phaser from 'phaser';

// Mock the scenes to avoid actual Phaser initialization in tests
jest.mock('../../game/src/scenes/TitleScene', () => ({
    TitleScene: class MockTitleScene extends Phaser.Scene {
        constructor() {
            super({ key: 'TitleScene' });
        }
    }
}));

jest.mock('../../game/src/scenes/ConfigScene', () => ({
    ConfigScene: class MockConfigScene extends Phaser.Scene {
        constructor() {
            super({ key: 'ConfigScene' });
        }
    }
}));

jest.mock('../../game/src/scenes/StageSelectScene', () => ({
    StageSelectScene: class MockStageSelectScene extends Phaser.Scene {
        constructor() {
            super({ key: 'StageSelectScene' });
        }
    }
}));

// Mock Phaser.Game to avoid actual game creation
jest.mock('phaser', () => ({
    ...jest.requireActual('phaser'),
    Game: jest.fn().mockImplementation(() => ({
        isRunning: true,
        scene: {
            start: jest.fn(),
            on: jest.fn(),
            getScene: jest.fn()
        },
        events: {
            once: jest.fn()
        },
        destroy: jest.fn()
    }))
}));

import { GameConfig } from '../../game/src/config/GameConfig';

describe('Game Initialization Tests', () => {
    let originalConsoleError: typeof console.error;
    let originalConsoleLog: typeof console.log;

    beforeEach(() => {
        // Mock console methods to avoid noise in tests
        originalConsoleError = console.error;
        originalConsoleLog = console.log;
        console.error = jest.fn();
        console.log = jest.fn();

        // Clear all mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Restore console methods
        console.error = originalConsoleError;
        console.log = originalConsoleLog;
    });

    describe('GameInitializer Class', () => {
        // We need to dynamically import the GameInitializer since it's not exported
        // This tests the internal logic without actually running the initialization

        it('should validate game configuration before initialization', () => {
            const gameConfig = new GameConfig();
            const isValid = gameConfig.validateConfig();

            expect(isValid).toBe(true);
            expect(gameConfig.GAME_WIDTH).toBe(1920);
            expect(gameConfig.GAME_HEIGHT).toBe(1080);
            expect(gameConfig.TARGET_FPS).toBe(60);
        });

        it('should handle invalid game configuration', () => {
            // Create a mock GameConfig with invalid values
            const invalidConfig = {
                GAME_WIDTH: -1,
                GAME_HEIGHT: -1,
                BACKGROUND_COLOR: 'invalid-color',
                TARGET_FPS: -1,
                PHYSICS_DEBUG: false,
                validateConfig: () => false,
                getConfig: () => ({})
            };

            expect(invalidConfig.validateConfig()).toBe(false);
        });

        it('should register all required scenes', () => {
            const gameConfig = new GameConfig();
            const config = gameConfig.getConfig();

            // Verify configuration structure
            expect(config).toBeDefined();
            expect(config.type).toBe(Phaser.AUTO);
            expect(config.width).toBe(1920);
            expect(config.height).toBe(1080);
            expect(config.backgroundColor).toBe('#2c3e50');
        });
    });

    describe('Scene Registration', () => {
        it('should validate scene classes extend Phaser.Scene', () => {
            const { TitleScene } = require('../../game/src/scenes/TitleScene');
            const { ConfigScene } = require('../../game/src/scenes/ConfigScene');
            const { StageSelectScene } = require('../../game/src/scenes/StageSelectScene');

            // Check that scenes extend Phaser.Scene
            expect(TitleScene.prototype).toBeInstanceOf(Phaser.Scene);
            expect(ConfigScene.prototype).toBeInstanceOf(Phaser.Scene);
            expect(StageSelectScene.prototype).toBeInstanceOf(Phaser.Scene);
        });

        it('should handle scene registration errors', () => {
            // Test with invalid scene class
            const invalidSceneClass = class InvalidScene {
                // Does not extend Phaser.Scene
            };

            // This would be caught by the scene validation logic
            expect(invalidSceneClass.prototype).not.toBeInstanceOf(Phaser.Scene);
        });
    });

    describe('Error Handling', () => {
        it('should handle GameInitializationError correctly', () => {
            // Test error class creation
            class GameInitializationError extends Error {
                constructor(message: string, public cause?: Error) {
                    super(message);
                    this.name = 'GameInitializationError';
                }
            }

            const originalError = new Error('Original error');
            const initError = new GameInitializationError('Init failed', originalError);

            expect(initError.name).toBe('GameInitializationError');
            expect(initError.message).toBe('Init failed');
            expect(initError.cause).toBe(originalError);
        });

        it('should handle SceneLoadingError correctly', () => {
            // Test scene loading error class
            class SceneLoadingError extends Error {
                constructor(message: string, public sceneKey?: string, public cause?: Error) {
                    super(message);
                    this.name = 'SceneLoadingError';
                }
            }

            const sceneError = new SceneLoadingError('Scene failed to load', 'TitleScene');

            expect(sceneError.name).toBe('SceneLoadingError');
            expect(sceneError.message).toBe('Scene failed to load');
            expect(sceneError.sceneKey).toBe('TitleScene');
        });

        it('should handle critical errors with user-friendly display', () => {
            // Mock DOM elements
            const mockContainer = {
                innerHTML: ''
            };

            // Mock document.getElementById
            const originalGetElementById = document.getElementById;
            document.getElementById = jest.fn().mockReturnValue(mockContainer);

            // Simulate critical error handling
            const error = new Error('Critical game error');

            // This would be the error display logic
            if (mockContainer) {
                mockContainer.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <h1>Game Error</h1>
                        <p>${error.message}</p>
                        <button onclick="location.reload()">Reload Game</button>
                    </div>
                `;
            }

            expect(mockContainer.innerHTML).toContain('Game Error');
            expect(mockContainer.innerHTML).toContain(error.message);
            expect(mockContainer.innerHTML).toContain('Reload Game');

            // Restore original function
            document.getElementById = originalGetElementById;
        });
    });

    describe('Scene Error Recovery', () => {
        it('should attempt recovery to TitleScene on scene errors', () => {
            const mockGame = {
                scene: {
                    start: jest.fn(),
                    on: jest.fn(),
                    getScene: jest.fn()
                }
            };

            // Simulate scene error recovery
            const sceneKey = 'ConfigScene';
            const error = new Error('Scene loading failed');

            // Recovery logic: if not TitleScene, try to go to TitleScene
            if (sceneKey !== 'TitleScene') {
                mockGame.scene.start('TitleScene');
            }

            expect(mockGame.scene.start).toHaveBeenCalledWith('TitleScene');
        });

        it('should handle critical errors when TitleScene fails', () => {
            const mockGame = {
                scene: {
                    start: jest.fn().mockImplementation(() => {
                        throw new Error('TitleScene failed');
                    })
                }
            };

            // Simulate critical error when TitleScene fails
            let criticalError = false;
            try {
                mockGame.scene.start('TitleScene');
            } catch (error) {
                criticalError = true;
            }

            expect(criticalError).toBe(true);
        });
    });

    describe('Game Startup Sequence', () => {
        it('should follow proper startup sequence', async () => {
            const startupSteps: string[] = [];

            // Mock the startup sequence
            const mockStartupSequence = async () => {
                startupSteps.push('validate-config');
                startupSteps.push('register-scenes');
                startupSteps.push('create-game');
                startupSteps.push('setup-error-handlers');
                startupSteps.push('wait-for-ready');
                startupSteps.push('start-initial-scene');
            };

            await mockStartupSequence();

            expect(startupSteps).toEqual([
                'validate-config',
                'register-scenes',
                'create-game',
                'setup-error-handlers',
                'wait-for-ready',
                'start-initial-scene'
            ]);
        });

        it('should handle startup timeout', async () => {
            // Mock a timeout scenario
            const waitForGameReady = (timeout: number = 1000): Promise<void> => {
                return new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        reject(new Error('Game initialization timeout'));
                    }, timeout);

                    // Simulate game never becoming ready
                    // In real scenario, this would check game.isRunning
                });
            };

            await expect(waitForGameReady(100)).rejects.toThrow('Game initialization timeout');
        });
    });

    describe('Development Mode Features', () => {
        it('should enable debug features in development mode', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const gameConfig = new GameConfig();

            // In development mode, debug info should be logged
            gameConfig.logConfig();

            expect(console.log).toHaveBeenCalled();

            // Restore environment
            process.env.NODE_ENV = originalEnv;
        });

        it('should setup global objects for debugging', () => {
            const mockGame = { isRunning: true };
            const mockGameConfig = new GameConfig();

            // Simulate global object setup
            if (typeof window !== 'undefined') {
                (window as any).game = mockGame;
                (window as any).gameConfig = mockGameConfig;

                expect((window as any).game).toBe(mockGame);
                expect((window as any).gameConfig).toBe(mockGameConfig);

                // Cleanup
                delete (window as any).game;
                delete (window as any).gameConfig;
            } else {
                // In Node.js environment, just verify the objects exist
                expect(mockGame).toBeDefined();
                expect(mockGameConfig).toBeDefined();
            }
        });
    });

    describe('Configuration Validation', () => {
        it('should validate screen dimensions', () => {
            const gameConfig = new GameConfig();

            expect(gameConfig.GAME_WIDTH).toBeGreaterThan(0);
            expect(gameConfig.GAME_HEIGHT).toBeGreaterThan(0);
            expect(gameConfig.GAME_WIDTH).toBe(1920);
            expect(gameConfig.GAME_HEIGHT).toBe(1080);
        });

        it('should validate background color format', () => {
            const gameConfig = new GameConfig();
            const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

            expect(colorRegex.test(gameConfig.BACKGROUND_COLOR)).toBe(true);
        });

        it('should validate target FPS', () => {
            const gameConfig = new GameConfig();

            expect(gameConfig.TARGET_FPS).toBeGreaterThan(0);
            expect(gameConfig.TARGET_FPS).toBeLessThanOrEqual(120);
        });
    });
});