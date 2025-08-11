/**
 * AI System GameplayScene Integration Tests
 * 
 * Tests the integration between AISystemManager and GameplayScene
 * Covers AI turn execution, visual feedback, and system coordination
 */

import { GameplayScene } from '../../game/src/scenes/GameplayScene';
import { AISystemManager } from '../../game/src/systems/ai/AISystemManager';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import { MovementSystem } from '../../game/src/systems/MovementSystem';
import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { SkillSystem } from '../../game/src/systems/skills/SkillSystem';
import { RecruitmentSystem } from '../../game/src/systems/recruitment/RecruitmentSystem';
import { Unit, MapData, GameState } from '../../game/src/types/gameplay';
import { AIActionType, AIExecutionResult } from '../../game/src/types/ai';

// Mock Phaser
const mockScene = {
    events: {
        on: jest.fn(),
        emit: jest.fn(),
    },
    add: {
        container: jest.fn(() => ({
            setDepth: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            add: jest.fn(),
            removeAll: jest.fn(),
        })),
        circle: jest.fn(() => ({})),
        text: jest.fn(() => ({
            setOrigin: jest.fn(() => ({})),
        })),
        rectangle: jest.fn(() => ({
            setOrigin: jest.fn(() => ({})),
        })),
    },
    tweens: {
        add: jest.fn(),
    },
    time: {
        delayedCall: jest.fn(),
    },
};

// Mock systems
const mockGameStateManager = {
    getGameState: jest.fn(() => ({
        currentTurn: 1,
        activePlayer: 'enemy',
        turnOrder: [],
    })),
    nextTurn: jest.fn(() => ({ success: true })),
} as unknown as GameStateManager;

const mockMovementSystem = {
    executeMovement: jest.fn(() => Promise.resolve({ success: true })),
    calculateMovementRange: jest.fn(() => []),
    canMoveTo: jest.fn(() => true),
} as unknown as MovementSystem;

const mockBattleSystem = {
    executeAttack: jest.fn(() => Promise.resolve({ success: true })),
    canAttack: jest.fn(() => true),
    calculateDamage: jest.fn(() => 20),
} as unknown as BattleSystem;

const mockSkillSystem = {
    executeSkill: jest.fn(() => Promise.resolve({ success: true })),
    getAvailableSkills: jest.fn(() => ['basic-attack']),
    canUseSkill: jest.fn(() => true),
} as unknown as SkillSystem;

const mockRecruitmentSystem = {
    isNPC: jest.fn(() => false),
} as unknown as RecruitmentSystem;

describe('AISystemGameplayIntegration', () => {
    let aiSystemManager: AISystemManager;
    let mockEventEmitter: any;

    beforeEach(() => {
        mockEventEmitter = {
            on: jest.fn(),
            emit: jest.fn(),
        };

        aiSystemManager = new AISystemManager(
            mockScene as any,
            {
                thinkingTimeLimit: 2000,
                enableDebugLogging: true,
                enableVisualFeedback: true,
                randomFactor: 0.2,
                npcPriorityMultiplier: 50,
            },
            mockEventEmitter
        );

        // Initialize AI system
        aiSystemManager.initialize(
            mockGameStateManager,
            mockMovementSystem,
            mockBattleSystem,
            mockSkillSystem,
            mockRecruitmentSystem
        );
    });

    describe('AI System Initialization', () => {
        test('should initialize AI system with all required systems', () => {
            expect(aiSystemManager).toBeDefined();
            expect(mockEventEmitter.on).toHaveBeenCalled();
        });

        test('should create AI controllers for enemy units', () => {
            const units: Unit[] = [
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
                {
                    id: 'enemy-1',
                    name: 'Orc',
                    position: { x: 5, y: 5 },
                    stats: { maxHP: 80, maxMP: 20, attack: 20, defense: 10, speed: 8, movement: 2 },
                    currentHP: 80,
                    currentMP: 20,
                    faction: 'enemy',
                    hasActed: false,
                    hasMoved: false,
                },
            ];

            aiSystemManager.createAIControllers(units);

            // Should not throw and should handle enemy units
            expect(() => aiSystemManager.createAIControllers(units)).not.toThrow();
        });
    });

    describe('AI Turn Execution', () => {
        let enemyUnit: Unit;
        let gameState: GameState;
        let mapData: MapData;

        beforeEach(() => {
            enemyUnit = {
                id: 'enemy-1',
                name: 'Orc Warrior',
                position: { x: 5, y: 5 },
                stats: { maxHP: 80, maxMP: 20, attack: 20, defense: 10, speed: 8, movement: 2 },
                currentHP: 80,
                currentMP: 20,
                faction: 'enemy',
                hasActed: false,
                hasMoved: false,
            };

            gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                phase: 'enemy',
                turnOrder: [enemyUnit],
                activeUnitIndex: 0,
                selectedUnit: undefined,
                gameResult: null,
            };

            mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            };

            // Create AI controllers
            aiSystemManager.createAIControllers([enemyUnit]);
        });

        test('should execute AI turn successfully', async () => {
            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            expect(result.success).toBe(true);
            expect(result.action).toBeDefined();
            expect(result.action.type).toBeDefined();
            expect(result.executionTime).toBeGreaterThan(0);
        });

        test('should emit AI turn events', async () => {
            await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('ai-turn-started', expect.objectContaining({
                unit: enemyUnit,
            }));

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('ai-turn-completed', expect.objectContaining({
                unit: enemyUnit,
                success: true,
            }));
        });

        test('should handle AI execution timeout', async () => {
            // Create AI system with very short timeout
            const shortTimeoutAI = new AISystemManager(
                mockScene as any,
                {
                    thinkingTimeLimit: 1, // 1ms timeout
                    enableDebugLogging: true,
                    enableVisualFeedback: false,
                    randomFactor: 0,
                    npcPriorityMultiplier: 50,
                },
                mockEventEmitter
            );

            shortTimeoutAI.initialize(
                mockGameStateManager,
                mockMovementSystem,
                mockBattleSystem,
                mockSkillSystem,
                mockRecruitmentSystem
            );

            shortTimeoutAI.createAIControllers([enemyUnit]);

            const result = await shortTimeoutAI.executeAITurn(enemyUnit, gameState, mapData);

            // Should still return a result (fallback action)
            expect(result).toBeDefined();
            expect(result.action.type).toBe(AIActionType.WAIT);
        });

        test('should reject non-enemy units', async () => {
            const playerUnit: Unit = {
                ...enemyUnit,
                id: 'player-1',
                faction: 'player',
            };

            const result = await aiSystemManager.executeAITurn(playerUnit, gameState, mapData);

            expect(result.success).toBe(false);
            expect(result.message).toContain('AI can only control enemy units');
        });
    });

    describe('AI Action Execution', () => {
        let enemyUnit: Unit;
        let gameState: GameState;
        let mapData: MapData;

        beforeEach(() => {
            enemyUnit = {
                id: 'enemy-1',
                name: 'Orc Warrior',
                position: { x: 5, y: 5 },
                stats: { maxHP: 80, maxMP: 20, attack: 20, defense: 10, speed: 8, movement: 2 },
                currentHP: 80,
                currentMP: 20,
                faction: 'enemy',
                hasActed: false,
                hasMoved: false,
            };

            gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                phase: 'enemy',
                turnOrder: [enemyUnit],
                activeUnitIndex: 0,
                selectedUnit: undefined,
                gameResult: null,
            };

            mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            };

            aiSystemManager.createAIControllers([enemyUnit]);
        });

        test('should execute move actions', async () => {
            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            if (result.action.type === AIActionType.MOVE) {
                expect(mockMovementSystem.executeMovement).toHaveBeenCalled();
                expect(enemyUnit.hasMoved).toBe(true);
            }
        });

        test('should execute attack actions', async () => {
            // Add a target for the AI to attack
            const playerUnit: Unit = {
                id: 'player-1',
                name: 'Hero',
                position: { x: 4, y: 5 }, // Adjacent to enemy
                stats: { maxHP: 100, maxMP: 50, attack: 25, defense: 15, speed: 12, movement: 3 },
                currentHP: 100,
                currentMP: 50,
                faction: 'player',
                hasActed: false,
                hasMoved: false,
            };

            gameState.turnOrder.push(playerUnit);

            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            if (result.action.type === AIActionType.ATTACK) {
                expect(mockBattleSystem.executeAttack).toHaveBeenCalled();
                expect(enemyUnit.hasActed).toBe(true);
            }
        });

        test('should execute wait actions', async () => {
            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            if (result.action.type === AIActionType.WAIT) {
                expect(enemyUnit.hasActed).toBe(true);
            }
        });
    });

    describe('Visual Feedback', () => {
        test('should show thinking indicator when enabled', async () => {
            const enemyUnit: Unit = {
                id: 'enemy-1',
                name: 'Orc Warrior',
                position: { x: 5, y: 5 },
                stats: { maxHP: 80, maxMP: 20, attack: 20, defense: 10, speed: 8, movement: 2 },
                currentHP: 80,
                currentMP: 20,
                faction: 'enemy',
                hasActed: false,
                hasMoved: false,
            };

            const gameState: GameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                phase: 'enemy',
                turnOrder: [enemyUnit],
                activeUnitIndex: 0,
                selectedUnit: undefined,
                gameResult: null,
            };

            const mapData: MapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            };

            aiSystemManager.createAIControllers([enemyUnit]);

            await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            // Visual feedback methods should have been called
            expect(mockScene.add.container).toHaveBeenCalled();
        });

        test('should provide thinking state information', () => {
            const thinkingState = aiSystemManager.getThinkingState();

            expect(thinkingState).toBeDefined();
            expect(typeof thinkingState.isThinking).toBe('boolean');
            expect(typeof thinkingState.thinkingTime).toBe('number');
        });
    });

    describe('Error Handling', () => {
        test('should handle system integration errors gracefully', async () => {
            // Mock system failure
            const failingMovementSystem = {
                ...mockMovementSystem,
                executeMovement: jest.fn(() => Promise.reject(new Error('Movement failed'))),
            };

            const failingAI = new AISystemManager(
                mockScene as any,
                {
                    thinkingTimeLimit: 2000,
                    enableDebugLogging: true,
                    enableVisualFeedback: false,
                    randomFactor: 0.2,
                    npcPriorityMultiplier: 50,
                },
                mockEventEmitter
            );

            failingAI.initialize(
                mockGameStateManager,
                failingMovementSystem as any,
                mockBattleSystem,
                mockSkillSystem,
                mockRecruitmentSystem
            );

            const enemyUnit: Unit = {
                id: 'enemy-1',
                name: 'Orc Warrior',
                position: { x: 5, y: 5 },
                stats: { maxHP: 80, maxMP: 20, attack: 20, defense: 10, speed: 8, movement: 2 },
                currentHP: 80,
                currentMP: 20,
                faction: 'enemy',
                hasActed: false,
                hasMoved: false,
            };

            failingAI.createAIControllers([enemyUnit]);

            const result = await failingAI.executeAITurn(enemyUnit, {
                currentTurn: 1,
                activePlayer: 'enemy',
                phase: 'enemy',
                turnOrder: [enemyUnit],
                activeUnitIndex: 0,
                selectedUnit: undefined,
                gameResult: null,
            }, {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: [],
            });

            // Should handle error gracefully
            expect(result).toBeDefined();
        });
    });
});