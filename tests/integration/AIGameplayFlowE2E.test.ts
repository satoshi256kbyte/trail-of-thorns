/**
 * AI Gameplay Flow End-to-End Tests
 * 
 * Tests the complete AI gameplay flow from turn start to completion
 * Covers the integration of AI system with GameplayScene and all related systems
 */

import { GameplayScene } from '../../game/src/scenes/GameplayScene';
import { Unit, StageData, MapData } from '../../game/src/types/gameplay';

// Mock Phaser Scene
class MockPhaserScene {
    public events: any;
    public add: any;
    public load: any;
    public cache: any;
    public cameras: any;
    public tweens: any;
    public time: any;
    public data: any;

    constructor() {
        this.events = {
            on: jest.fn(),
            emit: jest.fn(),
        };

        this.add = {
            container: jest.fn(() => ({
                setDepth: jest.fn(() => ({ setVisible: jest.fn() })),
                add: jest.fn(),
                removeAll: jest.fn(),
            })),
            graphics: jest.fn(() => ({
                fillStyle: jest.fn(() => ({ fillRect: jest.fn(() => ({ setScrollFactor: jest.fn(() => ({ setDepth: jest.fn() })) })) })),
                lineStyle: jest.fn(() => ({ strokeCircle: jest.fn(() => ({ setScrollFactor: jest.fn(() => ({ setDepth: jest.fn() })) })) })),
                setPosition: jest.fn(),
                destroy: jest.fn(),
            })),
            text: jest.fn(() => ({
                setOrigin: jest.fn(() => ({ setScrollFactor: jest.fn(() => ({ setDepth: jest.fn() })) })),
                setText: jest.fn(),
                destroy: jest.fn(),
            })),
            circle: jest.fn(() => ({})),
            rectangle: jest.fn(() => ({
                setOrigin: jest.fn(() => ({})),
            })),
        };

        this.load = {
            json: jest.fn(),
            on: jest.fn(),
        };

        this.cache = {
            json: {
                get: jest.fn(() => ({
                    width: 10,
                    height: 10,
                    tileSize: 32,
                    tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
                })),
            },
        };

        this.cameras = {
            main: {
                width: 800,
                height: 600,
            },
        };

        this.tweens = {
            add: jest.fn(),
        };

        this.time = {
            delayedCall: jest.fn((delay, callback) => {
                // Execute callback immediately for testing
                setTimeout(callback, 0);
            }),
        };

        this.data = new Map();
        this.data.set = jest.fn((key, value) => Map.prototype.set.call(this.data, key, value));
        this.data.get = jest.fn((key) => Map.prototype.get.call(this.data, key));
        this.data.remove = jest.fn((key) => Map.prototype.delete.call(this.data, key));
    }
}

describe('AIGameplayFlowE2E', () => {
    let gameplayScene: GameplayScene;
    let mockScene: MockPhaserScene;

    beforeEach(() => {
        mockScene = new MockPhaserScene();

        // Create GameplayScene with mocked Phaser scene
        gameplayScene = new GameplayScene({ debugMode: true });

        // Replace Phaser scene properties with mocks
        Object.assign(gameplayScene, mockScene);
    });

    describe('Complete AI Turn Flow', () => {
        test('should execute complete AI turn from start to finish', async () => {
            // Setup stage data
            const stageData: StageData = {
                id: 'test-stage',
                name: 'Test Stage',
                description: 'Test stage for AI flow',
                mapData: {
                    width: 10,
                    height: 10,
                    tileSize: 32,
                    tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
                },
                playerUnits: [
                    {
                        id: 'player-1',
                        name: 'Hero',
                        position: { x: 1, y: 1 },
                        stats: { maxHP: 100, maxMP: 50, attack: 25, defense: 15, speed: 12, movement: 3 },
                        currentHP: 100,
                        currentMP: 50,
                        faction: 'player',
                        hasActed: false,
                        hasMoved: false,
                    },
                ],
                enemyUnits: [
                    {
                        id: 'enemy-1',
                        name: 'Orc Warrior',
                        position: { x: 8, y: 8 },
                        stats: { maxHP: 80, maxMP: 20, attack: 20, defense: 10, speed: 8, movement: 2 },
                        currentHP: 80,
                        currentMP: 20,
                        faction: 'enemy',
                        hasActed: false,
                        hasMoved: false,
                    },
                ],
                victoryConditions: [
                    {
                        type: 'defeat_all',
                        description: 'Defeat all enemies',
                    },
                ],
            };

            // Initialize scene with stage data
            gameplayScene.preload();
            gameplayScene.create({ selectedStage: stageData });

            // Wait for initialization to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify AI system was initialized
            expect(mockScene.events.on).toHaveBeenCalledWith('turn-changed', expect.any(Function));
            expect(mockScene.events.on).toHaveBeenCalledWith('ai-turn-started', expect.any(Function));
            expect(mockScene.events.on).toHaveBeenCalledWith('ai-turn-completed', expect.any(Function));
        });

        test('should handle turn transition to AI player', async () => {
            // Setup scene
            gameplayScene.preload();
            gameplayScene.create();

            await new Promise(resolve => setTimeout(resolve, 100));

            // Simulate turn change to enemy
            const turnChangeHandler = mockScene.events.on.mock.calls
                .find(call => call[0] === 'turn-changed')?.[1];

            if (turnChangeHandler) {
                turnChangeHandler({
                    currentTurn: 1,
                    activePlayer: 'enemy',
                    activeUnit: {
                        id: 'enemy-1',
                        name: 'Orc Warrior',
                        faction: 'enemy',
                        position: { x: 8, y: 8 },
                        stats: { maxHP: 80, maxMP: 20, attack: 20, defense: 10, speed: 8, movement: 2 },
                        currentHP: 80,
                        currentMP: 20,
                        hasActed: false,
                        hasMoved: false,
                    },
                    phase: 'enemy',
                });

                // Wait for AI execution
                await new Promise(resolve => setTimeout(resolve, 200));

                // Verify AI turn started event was emitted
                expect(mockScene.events.emit).toHaveBeenCalledWith('ai-turn-started', expect.objectContaining({
                    unit: expect.objectContaining({
                        id: 'enemy-1',
                        faction: 'enemy',
                    }),
                }));
            }
        });

        test('should block player input during AI execution', async () => {
            // Setup scene
            gameplayScene.preload();
            gameplayScene.create();

            await new Promise(resolve => setTimeout(resolve, 100));

            // Simulate AI turn start
            const aiTurnStartHandler = mockScene.events.on.mock.calls
                .find(call => call[0] === 'ai-turn-started')?.[1];

            if (aiTurnStartHandler) {
                aiTurnStartHandler({
                    unit: {
                        id: 'enemy-1',
                        name: 'Orc Warrior',
                        faction: 'enemy',
                    },
                });

                // Try to perform player input (should be blocked)
                // This would normally be tested through actual input simulation
                // For now, we verify the state flags are set correctly
                expect(gameplayScene['isAIExecuting']).toBe(true);
                expect(gameplayScene['aiTurnInProgress']).toBe(true);
            }
        });

        test('should restore player input after AI turn completion', async () => {
            // Setup scene
            gameplayScene.preload();
            gameplayScene.create();

            await new Promise(resolve => setTimeout(resolve, 100));

            // Simulate AI turn completion
            const aiTurnCompleteHandler = mockScene.events.on.mock.calls
                .find(call => call[0] === 'ai-turn-completed')?.[1];

            if (aiTurnCompleteHandler) {
                aiTurnCompleteHandler({
                    unit: {
                        id: 'enemy-1',
                        name: 'Orc Warrior',
                        faction: 'enemy',
                    },
                    success: true,
                    action: {
                        type: 'wait',
                        priority: 0,
                        reasoning: 'No valid actions available',
                    },
                });

                // Wait for state update
                await new Promise(resolve => setTimeout(resolve, 100));

                // Verify input is restored
                expect(gameplayScene['isAIExecuting']).toBe(false);
                expect(gameplayScene['aiTurnInProgress']).toBe(false);
            }
        });
    });

    describe('AI Visual Feedback', () => {
        test('should show thinking indicator during AI execution', async () => {
            // Setup scene
            gameplayScene.preload();
            gameplayScene.create();

            await new Promise(resolve => setTimeout(resolve, 100));

            // Simulate AI turn start
            const aiTurnStartHandler = mockScene.events.on.mock.calls
                .find(call => call[0] === 'ai-turn-started')?.[1];

            if (aiTurnStartHandler) {
                aiTurnStartHandler({
                    unit: {
                        id: 'enemy-1',
                        name: 'Orc Warrior',
                        faction: 'enemy',
                        position: { x: 5, y: 5 },
                    },
                });

                // Verify visual elements were created
                expect(mockScene.add.container).toHaveBeenCalled();
            }
        });

        test('should hide thinking indicator after AI completion', async () => {
            // Setup scene
            gameplayScene.preload();
            gameplayScene.create();

            await new Promise(resolve => setTimeout(resolve, 100));

            // Simulate complete AI turn cycle
            const aiTurnStartHandler = mockScene.events.on.mock.calls
                .find(call => call[0] === 'ai-turn-started')?.[1];
            const aiTurnCompleteHandler = mockScene.events.on.mock.calls
                .find(call => call[0] === 'ai-turn-completed')?.[1];

            if (aiTurnStartHandler && aiTurnCompleteHandler) {
                // Start AI turn
                aiTurnStartHandler({
                    unit: {
                        id: 'enemy-1',
                        name: 'Orc Warrior',
                        faction: 'enemy',
                        position: { x: 5, y: 5 },
                    },
                });

                // Complete AI turn
                aiTurnCompleteHandler({
                    unit: {
                        id: 'enemy-1',
                        name: 'Orc Warrior',
                        faction: 'enemy',
                    },
                    success: true,
                    action: {
                        type: 'wait',
                        priority: 0,
                        reasoning: 'Test action',
                    },
                });

                // Verify cleanup was called
                const containerMock = mockScene.add.container();
                expect(containerMock.removeAll).toHaveBeenCalled();
            }
        });
    });

    describe('AI Timeout Handling', () => {
        test('should handle AI thinking timeout gracefully', async () => {
            // Setup scene
            gameplayScene.preload();
            gameplayScene.create();

            await new Promise(resolve => setTimeout(resolve, 100));

            // Simulate long AI thinking time
            gameplayScene['isAIExecuting'] = true;
            gameplayScene['aiTurnInProgress'] = true;

            // Mock AI system manager with long thinking time
            const mockAIManager = {
                getThinkingState: jest.fn(() => ({
                    isThinking: true,
                    thinkingTime: 11000, // 11 seconds (over timeout)
                })),
            };

            gameplayScene['aiSystemManager'] = mockAIManager as any;

            // Run update loop to trigger timeout handling
            gameplayScene.update(Date.now(), 16);

            // Wait for timeout handling
            await new Promise(resolve => setTimeout(resolve, 200));

            // Verify timeout was handled
            expect(gameplayScene['isAIExecuting']).toBe(false);
            expect(gameplayScene['aiTurnInProgress']).toBe(false);
        });
    });

    describe('Error Recovery', () => {
        test('should recover from AI execution errors', async () => {
            // Setup scene
            gameplayScene.preload();
            gameplayScene.create();

            await new Promise(resolve => setTimeout(resolve, 100));

            // Mock AI system manager that throws error
            const mockAIManager = {
                executeAITurn: jest.fn(() => Promise.reject(new Error('AI execution failed'))),
                initialize: jest.fn(),
                createAIControllers: jest.fn(),
                getThinkingState: jest.fn(() => ({
                    isThinking: false,
                    thinkingTime: 0,
                })),
            };

            gameplayScene['aiSystemManager'] = mockAIManager as any;

            // Simulate AI turn start with error
            const enemyUnit = {
                id: 'enemy-1',
                name: 'Orc Warrior',
                faction: 'enemy',
                position: { x: 5, y: 5 },
                stats: { maxHP: 80, maxMP: 20, attack: 20, defense: 10, speed: 8, movement: 2 },
                currentHP: 80,
                currentMP: 20,
                hasActed: false,
                hasMoved: false,
            };

            // Call startAITurn directly to test error handling
            await gameplayScene['startAITurn'](enemyUnit);

            // Wait for error recovery
            await new Promise(resolve => setTimeout(resolve, 600));

            // Verify system recovered gracefully
            expect(mockScene.time.delayedCall).toHaveBeenCalled();
        });
    });

    describe('System Integration', () => {
        test('should integrate with all required game systems', async () => {
            // Setup scene
            gameplayScene.preload();
            gameplayScene.create();

            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify all systems are initialized
            expect(gameplayScene['gameStateManager']).toBeDefined();
            expect(gameplayScene['movementSystem']).toBeDefined();
            expect(gameplayScene['battleSystem']).toBeDefined();
            expect(gameplayScene['skillSystem']).toBeDefined();
            expect(gameplayScene['recruitmentSystem']).toBeDefined();
            expect(gameplayScene['aiSystemManager']).toBeDefined();
        });

        test('should coordinate turn advancement with game state', async () => {
            // Setup scene
            gameplayScene.preload();
            gameplayScene.create();

            await new Promise(resolve => setTimeout(resolve, 100));

            // Mock game state manager
            const mockGameStateManager = {
                nextTurn: jest.fn(() => ({ success: true })),
                getGameState: jest.fn(() => ({
                    currentTurn: 1,
                    activePlayer: 'player',
                })),
            };

            gameplayScene['gameStateManager'] = mockGameStateManager as any;

            // Call advanceToNextTurn
            gameplayScene['advanceToNextTurn']();

            // Verify turn was advanced
            expect(mockGameStateManager.nextTurn).toHaveBeenCalled();
        });
    });
});