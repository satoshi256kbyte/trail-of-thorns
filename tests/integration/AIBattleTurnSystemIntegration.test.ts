/**
 * Integration tests for AI system with battle system and turn-based system
 * Tests the complete workflow of AI thinking, action execution, and turn management
 */

import { GameplayScene } from '../../game/src/scenes/GameplayScene';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { AISystemManager } from '../../game/src/systems/ai/AISystemManager';
import { Unit, GameState } from '../../game/src/types/gameplay';
import { AIAction, AIActionType, AIExecutionResult } from '../../game/src/types/ai';
import { BattleResult } from '../../game/src/types/battle';

// Mock Phaser scene for testing
class MockScene {
    public events = {
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        once: jest.fn()
    };
    public time = {
        delayedCall: jest.fn((delay: number, callback: () => void) => {
            setTimeout(callback, delay);
        }),
        addEvent: jest.fn(() => ({
            remove: jest.fn()
        }))
    };
    public add = {
        graphics: jest.fn(() => ({
            fillStyle: jest.fn(),
            lineStyle: jest.fn(),
            fillRect: jest.fn(),
            strokeRect: jest.fn()
        }))
    };
}

describe('AI Battle Turn System Integration', () => {
    let gameStateManager: GameStateManager;
    let battleSystem: BattleSystem;
    let aiSystemManager: AISystemManager;
    let mockScene: MockScene;
    let playerUnit: Unit;
    let enemyUnit: Unit;
    let allUnits: Unit[];

    beforeEach(() => {
        // Create mock scene
        mockScene = new MockScene();

        // Create test units
        playerUnit = {
            id: 'player-1',
            name: 'Player Hero',
            position: { x: 1, y: 1 },
            stats: {
                maxHP: 100,
                maxMP: 50,
                attack: 20,
                defense: 15,
                speed: 12,
                movement: 3
            },
            currentHP: 100,
            currentMP: 50,
            faction: 'player',
            hasActed: false,
            hasMoved: false
        };

        enemyUnit = {
            id: 'enemy-1',
            name: 'Enemy Orc',
            position: { x: 5, y: 5 },
            stats: {
                maxHP: 80,
                maxMP: 30,
                attack: 18,
                defense: 12,
                speed: 10,
                movement: 2
            },
            currentHP: 80,
            currentMP: 30,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false
        };

        allUnits = [playerUnit, enemyUnit];

        // Initialize systems
        gameStateManager = new GameStateManager(mockScene.events as any);
        battleSystem = new BattleSystem(mockScene as any);
        aiSystemManager = new AISystemManager(mockScene as any, {
            thinkingTimeLimit: 2000,
            enableDebugLogging: false,
            enableVisualFeedback: false,
            randomFactor: 0.1,
            npcPriorityMultiplier: 2.0
        }, mockScene.events as any);

        // Initialize turn order
        gameStateManager.initializeTurnOrder(allUnits);

        // Set up AI system integration
        battleSystem.setAISystemManager(aiSystemManager);
        aiSystemManager.initialize(
            gameStateManager,
            null, // movementSystem
            battleSystem,
            null, // skillSystem
            null  // recruitmentSystem
        );
    });

    describe('AI Thinking Phase Integration', () => {
        test('should start AI thinking phase for enemy turn', async () => {
            // Arrange
            const gameState = gameStateManager.getGameState();
            expect(gameState.activePlayer).toBe('player'); // Player goes first due to higher speed

            // Advance to enemy turn
            gameStateManager.nextTurn();
            const updatedState = gameStateManager.getGameState();
            expect(updatedState.activePlayer).toBe('enemy');

            // Act
            const result = gameStateManager.startAIThinkingPhase(enemyUnit);

            // Assert
            expect(result.success).toBe(true);
            expect(gameStateManager.getCurrentPhase()).toBe('ai_thinking');
            expect(mockScene.events.emit).toHaveBeenCalledWith('ai-thinking-started', {
                aiUnit: enemyUnit,
                currentTurn: updatedState.currentTurn,
                activePlayer: 'enemy'
            });
        });

        test('should complete AI thinking phase and return to enemy phase', async () => {
            // Arrange
            gameStateManager.nextTurn(); // Move to enemy turn
            gameStateManager.startAIThinkingPhase(enemyUnit);
            expect(gameStateManager.getCurrentPhase()).toBe('ai_thinking');

            // Act
            const result = gameStateManager.completeAIThinkingPhase(enemyUnit);

            // Assert
            expect(result.success).toBe(true);
            expect(gameStateManager.getCurrentPhase()).toBe('enemy');
            expect(mockScene.events.emit).toHaveBeenCalledWith('ai-thinking-completed', {
                aiUnit: enemyUnit,
                currentTurn: expect.any(Number),
                activePlayer: 'enemy'
            });
        });

        test('should update AI unit state at turn start', async () => {
            // Arrange
            enemyUnit.hasActed = true;
            enemyUnit.hasMoved = true;

            // Act
            const result = gameStateManager.updateAIUnitAtTurnStart(enemyUnit);

            // Assert
            expect(result.success).toBe(true);
            expect(enemyUnit.hasActed).toBe(false);
            expect(enemyUnit.hasMoved).toBe(false);
            expect(mockScene.events.emit).toHaveBeenCalledWith('ai-unit-turn-started', {
                aiUnit: enemyUnit,
                currentTurn: expect.any(Number),
                skillStatesUpdated: true
            });
        });
    });

    describe('AI Action Execution Integration', () => {
        test('should execute AI attack action through battle system', async () => {
            // Arrange
            const aiAction: AIAction = {
                type: AIActionType.ATTACK,
                character: enemyUnit,
                target: playerUnit,
                priority: 50,
                reasoning: 'Attack nearest enemy'
            };

            // Mock battle system methods
            const mockBattleResult: BattleResult = {
                attacker: enemyUnit,
                target: playerUnit,
                weapon: {
                    id: 'basic-sword',
                    name: 'Basic Sword',
                    attackPower: 15,
                    range: 1,
                    weaponType: 'sword' as any,
                    element: 'physical' as any,
                    durability: 100,
                    maxDurability: 100,
                    description: 'A basic sword'
                },
                damage: 25,
                isCritical: false,
                isEvaded: false,
                experienceGained: 10,
                targetDefeated: false,
                effectsApplied: []
            };

            // Mock the executeBattle method
            jest.spyOn(battleSystem, 'executeAIAction').mockResolvedValue(mockBattleResult);

            // Act
            const result = await battleSystem.executeAIAction(aiAction);

            // Assert
            expect(result).toBeDefined();
            expect(result?.attacker).toBe(enemyUnit);
            expect(result?.target).toBe(playerUnit);
            expect(result?.damage).toBe(25);
        });

        test('should execute AI skill action through battle system', async () => {
            // Arrange
            const aiAction: AIAction = {
                type: AIActionType.SKILL,
                character: enemyUnit,
                target: playerUnit,
                skillId: 'fireball',
                priority: 60,
                reasoning: 'Use fireball skill'
            };

            // Mock skill action result
            const mockSkillResult = {
                success: true,
                battleResults: [{
                    attacker: enemyUnit,
                    target: playerUnit,
                    weapon: null,
                    damage: 30,
                    isCritical: false,
                    isEvaded: false,
                    experienceGained: 15,
                    targetDefeated: false,
                    effectsApplied: ['burn']
                }]
            };

            // Mock the executeSkillAction method
            jest.spyOn(battleSystem, 'executeSkillAction').mockResolvedValue(mockSkillResult);

            // Act
            const result = await battleSystem.executeAIAction(aiAction);

            // Assert
            expect(result).toBeDefined();
            expect(result?.damage).toBe(30);
            expect(result?.effectsApplied).toContain('burn');
        });

        test('should handle AI wait action', async () => {
            // Arrange
            const aiAction: AIAction = {
                type: AIActionType.WAIT,
                character: enemyUnit,
                priority: 10,
                reasoning: 'No good actions available'
            };

            // Act
            const result = await battleSystem.executeAIAction(aiAction);

            // Assert
            expect(result).toBeNull(); // Wait action returns null
        });
    });

    describe('Turn Management Integration', () => {
        test('should complete AI action and update turn state', async () => {
            // Arrange
            gameStateManager.nextTurn(); // Move to enemy turn
            expect(enemyUnit.hasActed).toBe(false);

            // Act
            const result = gameStateManager.completeAIAction(enemyUnit, 'attack');

            // Assert
            expect(result.success).toBe(true);
            expect(enemyUnit.hasActed).toBe(true);
            expect(mockScene.events.emit).toHaveBeenCalledWith('ai-action-completed', {
                aiUnit: enemyUnit,
                actionType: 'attack',
                turnComplete: false, // Only acted, not moved
                currentTurn: expect.any(Number)
            });
        });

        test('should advance turn when AI completes both move and action', async () => {
            // Arrange
            gameStateManager.nextTurn(); // Move to enemy turn
            enemyUnit.hasMoved = true;

            // Act
            const result = gameStateManager.completeAIAction(enemyUnit, 'attack');

            // Assert
            expect(result.success).toBe(true);
            expect(enemyUnit.hasActed).toBe(true);
            expect(mockScene.events.emit).toHaveBeenCalledWith('ai-action-completed', {
                aiUnit: enemyUnit,
                actionType: 'attack',
                turnComplete: true, // Both moved and acted
                currentTurn: expect.any(Number)
            });

            // Should automatically advance turn after delay
            await new Promise(resolve => setTimeout(resolve, 600));
            expect(gameStateManager.getCurrentPlayer()).toBe('player');
        });
    });

    describe('Battle System AI Integration', () => {
        test('should notify battle system of AI action completion', async () => {
            // Arrange
            const aiAction: AIAction = {
                type: AIActionType.ATTACK,
                character: enemyUnit,
                target: playerUnit,
                priority: 50,
                reasoning: 'Test action'
            };

            const actionResult = { success: true, damage: 20 };

            // Spy on the notification method
            const notifySpy = jest.spyOn(battleSystem, 'notifyAIActionComplete');

            // Act
            battleSystem.notifyAIActionComplete(aiAction, actionResult);

            // Assert
            expect(notifySpy).toHaveBeenCalledWith(aiAction, actionResult);
            expect(mockScene.events.emit).toHaveBeenCalledWith('ai-action-completed', {
                action: aiAction,
                result: actionResult,
                timestamp: expect.any(Number)
            });
        });

        test('should check AI system manager integration', () => {
            // Act & Assert
            expect(battleSystem.hasAISystemManager()).toBe(true);
        });
    });

    describe('Error Handling Integration', () => {
        test('should handle AI action execution errors gracefully', async () => {
            // Arrange
            const aiAction: AIAction = {
                type: AIActionType.ATTACK,
                character: enemyUnit,
                target: playerUnit,
                priority: 50,
                reasoning: 'Test error handling'
            };

            // Mock battle system to throw error
            jest.spyOn(battleSystem, 'executeAIAction').mockRejectedValue(new Error('Battle system error'));

            // Act & Assert
            await expect(battleSystem.executeAIAction(aiAction)).rejects.toThrow('Battle system error');
        });

        test('should handle invalid AI thinking phase transitions', () => {
            // Arrange - not in enemy turn
            expect(gameStateManager.getCurrentPlayer()).toBe('player');

            // Act
            const result = gameStateManager.startAIThinkingPhase(enemyUnit);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toContain('Invalid AI unit for thinking phase');
        });

        test('should handle completing AI thinking phase when not in thinking phase', () => {
            // Arrange - not in AI thinking phase
            expect(gameStateManager.getCurrentPhase()).not.toBe('ai_thinking');

            // Act
            const result = gameStateManager.completeAIThinkingPhase(enemyUnit);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toContain('Not currently in AI thinking phase');
        });
    });

    describe('Complete AI Turn Workflow', () => {
        test('should execute complete AI turn workflow', async () => {
            // Arrange
            gameStateManager.nextTurn(); // Move to enemy turn
            const initialPhase = gameStateManager.getCurrentPhase();
            expect(initialPhase).toBe('enemy');

            // Act - Simulate complete AI turn workflow

            // 1. Update AI unit at turn start
            const updateResult = gameStateManager.updateAIUnitAtTurnStart(enemyUnit);
            expect(updateResult.success).toBe(true);

            // 2. Start AI thinking phase
            const thinkingResult = gameStateManager.startAIThinkingPhase(enemyUnit);
            expect(thinkingResult.success).toBe(true);
            expect(gameStateManager.getCurrentPhase()).toBe('ai_thinking');

            // 3. Complete AI thinking phase
            const completeThinkingResult = gameStateManager.completeAIThinkingPhase(enemyUnit);
            expect(completeThinkingResult.success).toBe(true);
            expect(gameStateManager.getCurrentPhase()).toBe('enemy');

            // 4. Execute AI action
            const aiAction: AIAction = {
                type: AIActionType.WAIT,
                character: enemyUnit,
                priority: 10,
                reasoning: 'Complete workflow test'
            };

            const actionResult = await battleSystem.executeAIAction(aiAction);
            expect(actionResult).toBeNull(); // Wait action returns null

            // 5. Complete AI action
            const completeActionResult = gameStateManager.completeAIAction(enemyUnit, 'wait');
            expect(completeActionResult.success).toBe(true);

            // Assert - Verify final state
            expect(enemyUnit.hasActed).toBe(true);
            expect(mockScene.events.emit).toHaveBeenCalledWith('ai-action-completed', expect.any(Object));
        });
    });
});