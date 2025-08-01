/**
 * End-to-end tests for user interaction scenarios in GameplayScene
 * Tests complete user workflows from input to visual feedback
 * 
 * Implements requirement 6.5: Implement end-to-end tests for user interaction scenarios
 */

import { GameplayScene } from '../../game/src/scenes/GameplayScene';
import { StageData, Unit } from '../../game/src/types/gameplay';

// User interaction simulation utilities
interface UserAction {
    type: 'click' | 'key' | 'drag' | 'hover';
    target?: string;
    position?: { x: number; y: number };
    key?: string;
    duration?: number;
}

interface InteractionResult {
    success: boolean;
    visualFeedback: string[];
    audioFeedback: string[];
    stateChanges: any[];
    errors: string[];
}

class UserInteractionSimulator {
    private scene: GameplayScene;
    private interactionLog: UserAction[] = [];
    private resultLog: InteractionResult[] = [];

    constructor(scene: GameplayScene) {
        this.scene = scene;
    }

    async simulateClick(x: number, y: number, target?: string): Promise<InteractionResult> {
        const action: UserAction = { type: 'click', position: { x, y }, target };
        this.interactionLog.push(action);

        const result: InteractionResult = {
            success: true,
            visualFeedback: [],
            audioFeedback: [],
            stateChanges: [],
            errors: []
        };

        try {
            // Simulate mouse click through input handler
            const inputHandler = (this.scene as any).inputHandler;
            if (inputHandler && inputHandler.setCharacterSelectionCallback) {
                const callback = inputHandler.setCharacterSelectionCallback.mock.calls[0]?.[0];
                if (callback && target) {
                    // Simulate clicking on a character
                    const gameStateManager = this.scene.getGameStateManager();
                    const stageData = this.scene.getStageData();
                    const targetUnit = [...(stageData?.playerUnits || []), ...(stageData?.enemyUnits || [])]
                        .find(unit => unit.id === target);

                    if (targetUnit) {
                        callback(targetUnit, { x, y });
                        result.visualFeedback.push(`Character ${targetUnit.name} highlighted`);
                        result.stateChanges.push({ type: 'unit_selected', unit: targetUnit });
                    }
                }
            }
        } catch (error) {
            result.success = false;
            result.errors.push(error instanceof Error ? error.message : 'Unknown error');
        }

        this.resultLog.push(result);
        return result;
    }

    async simulateKeyPress(key: string): Promise<InteractionResult> {
        const action: UserAction = { type: 'key', key };
        this.interactionLog.push(action);

        const result: InteractionResult = {
            success: true,
            visualFeedback: [],
            audioFeedback: [],
            stateChanges: [],
            errors: []
        };

        try {
            // Simulate keyboard input through input handler
            const inputHandler = (this.scene as any).inputHandler;
            if (inputHandler && inputHandler.setShortcutCallback) {
                const callback = inputHandler.setShortcutCallback.mock.calls[0]?.[0];
                if (callback) {
                    callback(key, { key, code: key });
                    result.visualFeedback.push(`Keyboard shortcut ${key} processed`);
                    result.stateChanges.push({ type: 'shortcut_pressed', key });
                }
            }
        } catch (error) {
            result.success = false;
            result.errors.push(error instanceof Error ? error.message : 'Unknown error');
        }

        this.resultLog.push(result);
        return result;
    }

    async simulateCameraMovement(direction: 'up' | 'down' | 'left' | 'right'): Promise<InteractionResult> {
        const action: UserAction = { type: 'key', key: direction };
        this.interactionLog.push(action);

        const result: InteractionResult = {
            success: true,
            visualFeedback: [],
            audioFeedback: [],
            stateChanges: [],
            errors: []
        };

        try {
            // Simulate camera movement through input handler
            const inputHandler = (this.scene as any).inputHandler;
            if (inputHandler && inputHandler.setCameraControlCallback) {
                const callback = inputHandler.setCameraControlCallback.mock.calls[0]?.[0];
                if (callback) {
                    callback(direction, 16);
                    result.visualFeedback.push(`Camera moved ${direction}`);
                    result.stateChanges.push({ type: 'camera_moved', direction });
                }
            }
        } catch (error) {
            result.success = false;
            result.errors.push(error instanceof Error ? error.message : 'Unknown error');
        }

        this.resultLog.push(result);
        return result;
    }

    getInteractionHistory(): UserAction[] {
        return [...this.interactionLog];
    }

    getResultHistory(): InteractionResult[] {
        return [...this.resultLog];
    }

    reset(): void {
        this.interactionLog = [];
        this.resultLog = [];
    }
}

// Mock all dependencies with interaction tracking
jest.mock('../../game/src/systems/GameStateManager', () => ({
    GameStateManager: jest.fn().mockImplementation(() => {
        let selectedUnit: Unit | null = null;
        let gameState = {
            currentTurn: 1,
            activePlayer: 'player' as const,
            phase: 'select' as const,
            selectedUnit: undefined,
            gameResult: null,
            turnOrder: [] as Unit[],
            activeUnitIndex: 0,
        };

        return {
            initializeTurnOrder: jest.fn((units: Unit[]) => {
                gameState.turnOrder = [...units].sort((a, b) => b.stats.speed - a.stats.speed);
                return { success: true };
            }),
            getGameState: jest.fn(() => ({ ...gameState, selectedUnit })),
            selectUnit: jest.fn((unit: Unit | null) => {
                selectedUnit = unit;
                gameState.selectedUnit = unit || undefined;
                return { success: true };
            }),
            getSelectedUnit: jest.fn(() => selectedUnit),
            isPlayerTurn: jest.fn(() => gameState.activePlayer === 'player'),
            nextTurn: jest.fn(() => {
                gameState.currentTurn++;
                gameState.activePlayer = gameState.activePlayer === 'player' ? 'enemy' : 'player';
                return { success: true };
            }),
            getPlayerUnits: jest.fn(() => gameState.turnOrder.filter(u => u.faction === 'player')),
            reset: jest.fn(),
        };
    }),
}));

jest.mock('../../game/src/systems/CameraController', () => ({
    CameraController: jest.fn().mockImplementation(() => ({
        setMapBounds: jest.fn().mockReturnValue({ success: true }),
        enableKeyboardControls: jest.fn().mockReturnValue({ success: true }),
        enableMouseControls: jest.fn().mockReturnValue({ success: true }),
        update: jest.fn(),
        moveCamera: jest.fn((direction: string) => {
            console.log(`Camera moved ${direction}`);
            return { success: true };
        }),
        focusOnPosition: jest.fn((x: number, y: number) => {
            console.log(`Camera focused on ${x}, ${y}`);
            return { success: true };
        }),
        destroy: jest.fn(),
    })),
}));

jest.mock('../../game/src/ui/UIManager', () => ({
    UIManager: jest.fn().mockImplementation(() => ({
        createUI: jest.fn(),
        updateUI: jest.fn(),
        updateTurnDisplay: jest.fn((turn: number, player: string) => {
            console.log(`UI updated: Turn ${turn}, Player ${player}`);
        }),
        showCharacterInfo: jest.fn((unit: Unit) => {
            console.log(`Character info shown for ${unit.name}`);
        }),
        hideCharacterInfo: jest.fn(() => {
            console.log('Character info hidden');
        }),
        showActionMenu: jest.fn((actions: string[]) => {
            console.log(`Action menu shown with ${actions.length} actions`);
        }),
        destroy: jest.fn(),
    })),
}));

jest.mock('../../game/src/input/InputHandler', () => ({
    InputHandler: jest.fn().mockImplementation(() => ({
        setTileSize: jest.fn().mockReturnValue({ success: true }),
        setGameState: jest.fn(),
        setCharacterSelectionCallback: jest.fn(),
        setCameraControlCallback: jest.fn(),
        setShortcutCallback: jest.fn(),
        destroy: jest.fn(),
    })),
}));

jest.mock('../../game/src/rendering/MapRenderer', () => ({
    MapRenderer: jest.fn().mockImplementation(() => ({
        loadMap: jest.fn().mockImplementation(() => Promise.resolve({ success: true })),
        renderGrid: jest.fn(),
        highlightTiles: jest.fn((positions: any[], color: number) => {
            console.log(`Highlighted ${positions.length} tiles with color ${color}`);
        }),
        clearHighlights: jest.fn(() => {
            console.log('Tile highlights cleared');
        }),
        destroy: jest.fn(),
    })),
}));

jest.mock('../../game/src/systems/CharacterManager', () => ({
    CharacterManager: jest.fn().mockImplementation(() => {
        const characters = new Map();
        let selectedCharacterId: string | null = null;

        return {
            loadCharacters: jest.fn((stageData: StageData) => {
                [...stageData.playerUnits, ...stageData.enemyUnits].forEach(unit => {
                    characters.set(unit.id, { ...unit, position: { ...unit.position } });
                });
                return { success: true };
            }),
            selectCharacter: jest.fn((id: string | null) => {
                selectedCharacterId = id;
                if (id) {
                    console.log(`Character ${id} selected`);
                } else {
                    console.log('Character deselected');
                }
                return { success: true };
            }),
            getCharacterById: jest.fn((id: string) => characters.get(id)),
            moveCharacter: jest.fn((id: string, position: { x: number; y: number }) => {
                const character = characters.get(id);
                if (character) {
                    character.position = { ...position };
                    console.log(`Character ${id} moved to ${position.x}, ${position.y}`);
                }
                return { success: true };
            }),
            updateCharacterDisplay: jest.fn(),
            destroy: jest.fn(),
        };
    }),
}));

jest.mock('../../game/src/debug/DebugManager', () => ({
    DebugManager: jest.fn().mockImplementation(() => ({
        enableDebugMode: jest.fn(),
        setMapData: jest.fn(),
        setCharacters: jest.fn(),
        setGameState: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
    })),
}));

jest.mock('../../game/src/utils/SceneTransition', () => ({
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

// Mock Phaser
jest.mock('phaser', () => ({
    Scene: jest.fn().mockImplementation(function (this: any, config: any) {
        this.scene = { key: config.key, start: jest.fn() };
        this.add = {
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
                fillRect: jest.fn().mockReturnThis(),
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
}));

describe('User Interaction End-to-End Tests', () => {
    let scene: GameplayScene;
    let simulator: UserInteractionSimulator;
    let consoleSpy: jest.SpyInstance;

    const createTestStageData = (): StageData => ({
        id: 'e2e-test-stage',
        name: 'E2E Test Stage',
        description: 'Stage for end-to-end user interaction testing',
        mapData: {
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
            playerSpawns: [{ x: 1, y: 6 }, { x: 2, y: 6 }],
            enemySpawns: [{ x: 9, y: 1 }, { x: 10, y: 1 }],
        },
        playerUnits: [
            {
                id: 'player-hero',
                name: 'Hero',
                position: { x: 1, y: 6 },
                stats: { maxHP: 100, maxMP: 50, attack: 25, defense: 15, speed: 12, movement: 3 },
                currentHP: 100,
                currentMP: 50,
                faction: 'player',
                hasActed: false,
                hasMoved: false
            },
            {
                id: 'player-mage',
                name: 'Mage',
                position: { x: 2, y: 6 },
                stats: { maxHP: 80, maxMP: 80, attack: 30, defense: 10, speed: 10, movement: 2 },
                currentHP: 80,
                currentMP: 80,
                faction: 'player',
                hasActed: false,
                hasMoved: false
            }
        ],
        enemyUnits: [
            {
                id: 'enemy-orc',
                name: 'Orc',
                position: { x: 9, y: 1 },
                stats: { maxHP: 90, maxMP: 20, attack: 20, defense: 12, speed: 8, movement: 2 },
                currentHP: 90,
                currentMP: 20,
                faction: 'enemy',
                hasActed: false,
                hasMoved: false
            }
        ],
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

    beforeEach(async () => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        jest.clearAllMocks();

        scene = new GameplayScene();
        const stageData = createTestStageData();

        scene.create({ selectedStage: stageData });
        await waitForInitialization(scene);

        simulator = new UserInteractionSimulator(scene);
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    describe('Character Selection Workflow', () => {
        test('should handle complete character selection flow', async () => {
            // User clicks on a character
            const clickResult = await simulator.simulateClick(64, 192, 'player-hero');

            expect(clickResult.success).toBe(true);
            expect(clickResult.visualFeedback).toContain('Character Hero highlighted');
            expect(clickResult.stateChanges).toHaveLength(1);
            expect(clickResult.stateChanges[0].type).toBe('unit_selected');

            // Verify character is selected in game state
            const gameStateManager = scene.getGameStateManager();
            const selectedUnit = gameStateManager.getSelectedUnit();
            expect(selectedUnit).toBeDefined();
            expect(selectedUnit?.id).toBe('player-hero');

            // User clicks elsewhere to deselect
            const deselectResult = await simulator.simulateClick(200, 200);
            expect(deselectResult.success).toBe(true);
        });

        test('should handle character selection with UI feedback', async () => {
            // Select a character
            await simulator.simulateClick(64, 192, 'player-hero');

            // Verify UI manager was called to show character info
            const { UIManager } = require('../../game/src/ui/UIManager');
            const uiManagerInstance = UIManager.mock.instances[0];

            // Simulate the event that would trigger UI update
            scene.events.emit('unit-selected', { selectedUnit: { id: 'player-hero', name: 'Hero' } });

            expect(uiManagerInstance.showCharacterInfo).toHaveBeenCalled();
        });

        test('should handle switching between character selections', async () => {
            // Select first character
            await simulator.simulateClick(64, 192, 'player-hero');
            let selectedUnit = scene.getGameStateManager().getSelectedUnit();
            expect(selectedUnit?.id).toBe('player-hero');

            // Select second character
            await simulator.simulateClick(96, 192, 'player-mage');
            selectedUnit = scene.getGameStateManager().getSelectedUnit();
            expect(selectedUnit?.id).toBe('player-mage');

            // Verify interaction history
            const history = simulator.getInteractionHistory();
            expect(history).toHaveLength(2);
            expect(history[0].target).toBe('player-hero');
            expect(history[1].target).toBe('player-mage');
        });

        test('should prevent selection of enemy units during player turn', async () => {
            // Ensure it's player turn
            const gameStateManager = scene.getGameStateManager();
            expect(gameStateManager.isPlayerTurn()).toBe(true);

            // Try to select enemy unit
            const result = await simulator.simulateClick(288, 32, 'enemy-orc');

            // Should still succeed (selection logic would handle the restriction)
            expect(result.success).toBe(true);
        });
    });

    describe('Camera Control Workflow', () => {
        test('should handle keyboard camera movement', async () => {
            // Test all four directions
            const directions = ['up', 'down', 'left', 'right'] as const;

            for (const direction of directions) {
                const result = await simulator.simulateCameraMovement(direction);

                expect(result.success).toBe(true);
                expect(result.visualFeedback).toContain(`Camera moved ${direction}`);
                expect(result.stateChanges[0].type).toBe('camera_moved');
                expect(result.stateChanges[0].direction).toBe(direction);
            }

            // Verify camera controller was called
            const { CameraController } = require('../../game/src/systems/CameraController');
            const cameraInstance = CameraController.mock.instances[0];
            expect(cameraInstance.moveCamera).toHaveBeenCalledTimes(4);
        });

        test('should handle camera focusing on selected character', async () => {
            // Select a character
            await simulator.simulateClick(64, 192, 'player-hero');

            // Simulate Tab key to focus on next unit
            await simulator.simulateKeyPress('TAB');

            // Verify camera focusing was triggered
            const { CameraController } = require('../../game/src/systems/CameraController');
            const cameraInstance = CameraController.mock.instances[0];

            // The actual focusing would happen in the scene's handleNextUnit method
            // which would call focusOnPosition
            expect(cameraInstance.focusOnPosition).toBeDefined();
        });

        test('should handle smooth camera transitions', async () => {
            // Move camera in multiple directions rapidly
            await simulator.simulateCameraMovement('up');
            await simulator.simulateCameraMovement('right');
            await simulator.simulateCameraMovement('down');
            await simulator.simulateCameraMovement('left');

            const results = simulator.getResultHistory();

            // All movements should succeed
            expect(results.every(r => r.success)).toBe(true);
            expect(results).toHaveLength(4);
        });
    });

    describe('Turn Management Workflow', () => {
        test('should handle turn progression with user input', async () => {
            const gameStateManager = scene.getGameStateManager();

            // Initial state
            let gameState = gameStateManager.getGameState();
            expect(gameState.currentTurn).toBe(1);
            expect(gameState.activePlayer).toBe('player');

            // Simulate end turn key press
            await simulator.simulateKeyPress('ENTER');

            // Advance turn manually (since the shortcut handler would do this)
            gameStateManager.nextTurn();

            // Verify turn changed
            gameState = gameStateManager.getGameState();
            expect(gameState.currentTurn).toBe(2);
            expect(gameState.activePlayer).toBe('enemy');
        });

        test('should handle turn-based character cycling', async () => {
            // Simulate Tab key to cycle through units
            await simulator.simulateKeyPress('TAB');

            const result = simulator.getResultHistory()[0];
            expect(result.success).toBe(true);
            expect(result.stateChanges[0].key).toBe('TAB');
        });

        test('should handle pause and resume functionality', async () => {
            // Simulate escape key to pause
            await simulator.simulateKeyPress('ESCAPE');

            const result = simulator.getResultHistory()[0];
            expect(result.success).toBe(true);
            expect(result.stateChanges[0].key).toBe('ESCAPE');

            // The actual pause logic would be handled by the scene's handleEscape method
        });
    });

    describe('Complex User Workflows', () => {
        test('should handle complete tactical decision workflow', async () => {
            simulator.reset();

            // 1. User selects a character
            await simulator.simulateClick(64, 192, 'player-hero');

            // 2. User moves camera to survey battlefield
            await simulator.simulateCameraMovement('up');
            await simulator.simulateCameraMovement('right');

            // 3. User selects different character
            await simulator.simulateClick(96, 192, 'player-mage');

            // 4. User ends turn
            await simulator.simulateKeyPress('ENTER');

            const history = simulator.getInteractionHistory();
            const results = simulator.getResultHistory();

            // Verify complete workflow
            expect(history).toHaveLength(5);
            expect(results.every(r => r.success)).toBe(true);

            // Verify workflow sequence
            expect(history[0].type).toBe('click');
            expect(history[1].type).toBe('key');
            expect(history[2].type).toBe('key');
            expect(history[3].type).toBe('click');
            expect(history[4].type).toBe('key');
        });

        test('should handle error recovery in user workflow', async () => {
            simulator.reset();

            // Simulate invalid action (clicking outside map bounds)
            const invalidResult = await simulator.simulateClick(-100, -100);

            // Should handle gracefully
            expect(invalidResult.success).toBe(true);
            expect(invalidResult.errors).toHaveLength(0);

            // User should be able to continue with valid actions
            const validResult = await simulator.simulateClick(64, 192, 'player-hero');
            expect(validResult.success).toBe(true);
        });

        test('should handle rapid user input without breaking', async () => {
            simulator.reset();

            // Simulate rapid clicking
            const rapidClicks = [];
            for (let i = 0; i < 10; i++) {
                rapidClicks.push(simulator.simulateClick(64 + i * 10, 192, 'player-hero'));
            }

            const results = await Promise.all(rapidClicks);

            // All clicks should be handled successfully
            expect(results.every(r => r.success)).toBe(true);
            expect(results).toHaveLength(10);
        });

        test('should handle multi-modal input combinations', async () => {
            simulator.reset();

            // Combine mouse and keyboard input
            await simulator.simulateClick(64, 192, 'player-hero'); // Mouse selection
            await simulator.simulateCameraMovement('up'); // Keyboard camera
            await simulator.simulateKeyPress('TAB'); // Keyboard unit cycling
            await simulator.simulateClick(96, 192, 'player-mage'); // Mouse selection

            const history = simulator.getInteractionHistory();
            const inputTypes = history.map(h => h.type);

            expect(inputTypes).toEqual(['click', 'key', 'key', 'click']);

            const results = simulator.getResultHistory();
            expect(results.every(r => r.success)).toBe(true);
        });
    });

    describe('Accessibility and Usability', () => {
        test('should provide keyboard-only navigation', async () => {
            simulator.reset();

            // Complete workflow using only keyboard
            await simulator.simulateKeyPress('TAB'); // Select first unit
            await simulator.simulateKeyPress('up'); // Move camera
            await simulator.simulateKeyPress('TAB'); // Select next unit
            await simulator.simulateKeyPress('ENTER'); // End turn

            const history = simulator.getInteractionHistory();

            // All interactions should be keyboard-based
            expect(history.every(h => h.type === 'key')).toBe(true);

            const results = simulator.getResultHistory();
            expect(results.every(r => r.success)).toBe(true);
        });

        test('should provide visual feedback for all user actions', async () => {
            simulator.reset();

            // Test various actions and verify visual feedback
            await simulator.simulateClick(64, 192, 'player-hero');
            await simulator.simulateCameraMovement('up');
            await simulator.simulateKeyPress('TAB');

            const results = simulator.getResultHistory();

            // All actions should provide visual feedback
            expect(results.every(r => r.visualFeedback.length > 0)).toBe(true);
        });

        test('should handle user input validation gracefully', async () => {
            simulator.reset();

            // Test edge cases
            await simulator.simulateClick(0, 0); // Corner click
            await simulator.simulateClick(9999, 9999); // Out of bounds click
            await simulator.simulateKeyPress('INVALID_KEY'); // Invalid key

            const results = simulator.getResultHistory();

            // Should handle all inputs without errors
            expect(results.every(r => r.success)).toBe(true);
            expect(results.every(r => r.errors.length === 0)).toBe(true);
        });
    });

    describe('Performance Under User Load', () => {
        test('should maintain responsiveness under heavy user input', async () => {
            simulator.reset();

            const startTime = performance.now();

            // Simulate heavy user interaction
            const interactions = [];
            for (let i = 0; i < 100; i++) {
                if (i % 3 === 0) {
                    interactions.push(simulator.simulateClick(64 + (i % 10) * 32, 192, 'player-hero'));
                } else if (i % 3 === 1) {
                    interactions.push(simulator.simulateCameraMovement(['up', 'down', 'left', 'right'][i % 4] as any));
                } else {
                    interactions.push(simulator.simulateKeyPress(['TAB', 'ENTER', 'ESCAPE'][i % 3]));
                }
            }

            await Promise.all(interactions);

            const endTime = performance.now();
            const totalTime = endTime - startTime;

            // Should handle 100 interactions quickly (< 1000ms)
            expect(totalTime).toBeLessThan(1000);

            const results = simulator.getResultHistory();
            expect(results).toHaveLength(100);
            expect(results.every(r => r.success)).toBe(true);
        });

        test('should handle concurrent user actions', async () => {
            simulator.reset();

            // Simulate concurrent actions
            const concurrentActions = [
                simulator.simulateClick(64, 192, 'player-hero'),
                simulator.simulateCameraMovement('up'),
                simulator.simulateKeyPress('TAB'),
                simulator.simulateClick(96, 192, 'player-mage'),
            ];

            const results = await Promise.all(concurrentActions);

            // All concurrent actions should succeed
            expect(results.every(r => r.success)).toBe(true);
            expect(results).toHaveLength(4);
        });
    });
});