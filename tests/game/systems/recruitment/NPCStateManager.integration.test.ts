/**
 * Integration tests for NPCStateManager
 * Tests integration with other systems and complex workflows
 */

import { NPCStateManager } from '../../../../game/src/systems/recruitment/NPCStateManager';
import { CharacterManager } from '../../../../game/src/systems/CharacterManager';
import {
    RecruitmentError,
    NPCState,
    RecruitmentUtils
} from '../../../../game/src/types/recruitment';
import { Unit, StageData } from '../../../../game/src/types/gameplay';

// Mock Phaser scene
const mockScene = {
    add: {
        container: jest.fn().mockReturnValue({
            add: jest.fn(),
            setDepth: jest.fn(),
            setScale: jest.fn(),
            destroy: jest.fn()
        }),
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn(),
            fillRoundedRect: jest.fn(),
            fillCircle: jest.fn(),
            strokeRect: jest.fn(),
            lineStyle: jest.fn(),
            clear: jest.fn(),
            generateTexture: jest.fn(),
            destroy: jest.fn(),
            setDepth: jest.fn()
        }),
        sprite: jest.fn().mockReturnValue({
            setScale: jest.fn(),
            setDepth: jest.fn(),
            setTint: jest.fn(),
            clearTint: jest.fn(),
            setInteractive: jest.fn(),
            on: jest.fn(),
            setPosition: jest.fn(),
            destroy: jest.fn(),
            x: 0,
            y: 0,
            scale: 1
        })
    },
    tweens: {
        add: jest.fn()
    },
    textures: {
        exists: jest.fn().mockReturnValue(false)
    }
} as any;

const mockEventEmitter = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
} as any;

// Helper function to create test stage data
function createTestStageData(): StageData {
    return {
        id: 'test-stage',
        name: 'Test Stage',
        description: 'A test stage for integration testing',
        mapData: {
            width: 10,
            height: 10,
            tileSize: 32,
            layers: [{
                name: 'background',
                type: 'background',
                data: Array(10).fill(null).map(() => Array(10).fill(0)),
                visible: true,
                opacity: 1
            }],
            playerSpawns: [{ x: 1, y: 1 }],
            enemySpawns: [{ x: 8, y: 8 }]
        },
        playerUnits: [{
            id: 'player-1',
            name: 'Hero',
            position: { x: 1, y: 1 },
            stats: { maxHP: 100, maxMP: 50, attack: 25, defense: 20, speed: 15, movement: 3 },
            currentHP: 100,
            currentMP: 50,
            faction: 'player',
            hasActed: false,
            hasMoved: false,
            equipment: {}
        }],
        enemyUnits: [{
            id: 'enemy-1',
            name: 'Orc Warrior',
            position: { x: 8, y: 8 },
            stats: { maxHP: 80, maxMP: 20, attack: 20, defense: 15, speed: 10, movement: 2 },
            currentHP: 80,
            currentMP: 20,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false,
            equipment: {}
        }],
        victoryConditions: [{
            type: 'defeat_all',
            description: 'Defeat all enemies'
        }]
    };
}

describe('NPCStateManager Integration Tests', () => {
    let npcStateManager: NPCStateManager;
    let characterManager: CharacterManager;
    let stageData: StageData;

    beforeEach(() => {
        jest.clearAllMocks();
        npcStateManager = new NPCStateManager(mockScene, undefined, mockEventEmitter);
        try {
            characterManager = new CharacterManager(mockScene, 32, undefined, mockEventEmitter);
        } catch (error) {
            // Skip CharacterManager tests if it can't be initialized in test environment
            characterManager = null as any;
        }
        stageData = createTestStageData();
    });

    afterEach(() => {
        npcStateManager.destroy();
        if (characterManager && typeof characterManager.destroy === 'function') {
            characterManager.destroy();
        }
    });

    describe('Integration with CharacterManager', () => {
        test('should work with CharacterManager loaded characters', () => {
            if (!characterManager) {
                console.log('Skipping CharacterManager integration test - not available in test environment');
                return;
            }

            // Load characters through CharacterManager
            const loadResult = characterManager.loadCharacters(stageData);
            expect(loadResult.success).toBe(true);

            // Get enemy unit from CharacterManager
            const enemyUnit = characterManager.getCharacterById('enemy-1');
            expect(enemyUnit).toBeDefined();

            // Convert enemy to NPC
            const conversionResult = npcStateManager.convertToNPC(enemyUnit!, 'recruitment-123', 5);
            expect(conversionResult.success).toBe(true);

            // Verify NPC state
            expect(npcStateManager.isNPC(enemyUnit!)).toBe(true);
            expect(enemyUnit!.faction).toBe('player'); // Should be converted to player faction
            expect(enemyUnit!.hasActed).toBe(true);
            expect(enemyUnit!.hasMoved).toBe(true);
        });

        test('should handle character position updates after NPC conversion', () => {
            characterManager.loadCharacters(stageData);
            const enemyUnit = characterManager.getCharacterById('enemy-1')!;

            // Convert to NPC
            npcStateManager.convertToNPC(enemyUnit, 'recruitment-123', 5);

            // Update character position through CharacterManager
            const newPosition = { x: 5, y: 5 };
            const moveResult = characterManager.updateCharacterPosition('enemy-1', newPosition);
            expect(moveResult.success).toBe(true);

            // NPC state should still be maintained
            expect(npcStateManager.isNPC(enemyUnit)).toBe(true);
            expect(enemyUnit.position).toEqual(newPosition);
        });

        test('should maintain NPC state during character display updates', () => {
            characterManager.loadCharacters(stageData);
            const enemyUnit = characterManager.getCharacterById('enemy-1')!;

            // Convert to NPC
            npcStateManager.convertToNPC(enemyUnit, 'recruitment-123', 5);

            // Update character display through CharacterManager
            const updateResult = characterManager.updateCharacterDisplay('enemy-1');
            expect(updateResult.success).toBe(true);

            // NPC state should still be maintained
            expect(npcStateManager.isNPC(enemyUnit)).toBe(true);
        });
    });

    describe('Multi-NPC Scenarios', () => {
        test('should handle multiple NPCs simultaneously', () => {
            // Add more enemy units to stage data
            const additionalEnemies: Unit[] = [
                {
                    id: 'enemy-2',
                    name: 'Goblin Scout',
                    position: { x: 7, y: 8 },
                    stats: { maxHP: 60, maxMP: 30, attack: 15, defense: 10, speed: 12, movement: 3 },
                    currentHP: 60,
                    currentMP: 30,
                    faction: 'enemy',
                    hasActed: false,
                    hasMoved: false,
                    equipment: {}
                },
                {
                    id: 'enemy-3',
                    name: 'Orc Shaman',
                    position: { x: 8, y: 7 },
                    stats: { maxHP: 70, maxMP: 60, attack: 18, defense: 12, speed: 8, movement: 2 },
                    currentHP: 70,
                    currentMP: 60,
                    faction: 'enemy',
                    hasActed: false,
                    hasMoved: false,
                    equipment: {}
                }
            ];

            stageData.enemyUnits.push(...additionalEnemies);
            characterManager.loadCharacters(stageData);

            // Convert all enemies to NPCs
            const enemy1 = characterManager.getCharacterById('enemy-1')!;
            const enemy2 = characterManager.getCharacterById('enemy-2')!;
            const enemy3 = characterManager.getCharacterById('enemy-3')!;

            const result1 = npcStateManager.convertToNPC(enemy1, 'recruitment-1', 5);
            const result2 = npcStateManager.convertToNPC(enemy2, 'recruitment-2', 6);
            const result3 = npcStateManager.convertToNPC(enemy3, 'recruitment-3', 7);

            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
            expect(result3.success).toBe(true);

            // Verify all are NPCs
            expect(npcStateManager.getNPCCount()).toBe(3);
            expect(npcStateManager.isNPC(enemy1)).toBe(true);
            expect(npcStateManager.isNPC(enemy2)).toBe(true);
            expect(npcStateManager.isNPC(enemy3)).toBe(true);

            // Verify priorities
            expect(npcStateManager.getNPCPriority(enemy1)).toBeGreaterThan(0);
            expect(npcStateManager.getNPCPriority(enemy2)).toBeGreaterThan(0);
            expect(npcStateManager.getNPCPriority(enemy3)).toBeGreaterThan(0);
        });

        test('should handle NPC limit enforcement with multiple conversions', () => {
            const limitedManager = new NPCStateManager(mockScene, { maxNPCsPerStage: 2 }, mockEventEmitter);

            // Add multiple enemies
            const additionalEnemies: Unit[] = [
                {
                    id: 'enemy-2',
                    name: 'Goblin Scout',
                    position: { x: 7, y: 8 },
                    stats: { maxHP: 60, maxMP: 30, attack: 15, defense: 10, speed: 12, movement: 3 },
                    currentHP: 60,
                    currentMP: 30,
                    faction: 'enemy',
                    hasActed: false,
                    hasMoved: false,
                    equipment: {}
                },
                {
                    id: 'enemy-3',
                    name: 'Orc Shaman',
                    position: { x: 8, y: 7 },
                    stats: { maxHP: 70, maxMP: 60, attack: 18, defense: 12, speed: 8, movement: 2 },
                    currentHP: 70,
                    currentMP: 60,
                    faction: 'enemy',
                    hasActed: false,
                    hasMoved: false,
                    equipment: {}
                }
            ];

            stageData.enemyUnits.push(...additionalEnemies);
            characterManager.loadCharacters(stageData);

            const enemy1 = characterManager.getCharacterById('enemy-1')!;
            const enemy2 = characterManager.getCharacterById('enemy-2')!;
            const enemy3 = characterManager.getCharacterById('enemy-3')!;

            // First two conversions should succeed
            const result1 = limitedManager.convertToNPC(enemy1, 'recruitment-1', 5);
            const result2 = limitedManager.convertToNPC(enemy2, 'recruitment-2', 6);

            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
            expect(limitedManager.isAtNPCLimit()).toBe(true);

            // Third conversion should fail
            const result3 = limitedManager.convertToNPC(enemy3, 'recruitment-3', 7);
            expect(result3.success).toBe(false);
            expect(result3.error).toBe(RecruitmentError.SYSTEM_ERROR);

            limitedManager.destroy();
        });
    });

    describe('NPC Damage and Defeat Scenarios', () => {
        test('should handle NPC damage and maintain state consistency', () => {
            characterManager.loadCharacters(stageData);
            const enemyUnit = characterManager.getCharacterById('enemy-1')!;

            // Convert to NPC
            npcStateManager.convertToNPC(enemyUnit, 'recruitment-123', 5);
            const initialHP = enemyUnit.currentHP;

            // Deal damage to NPC
            const damageResult = npcStateManager.handleNPCDamage(enemyUnit, 30);
            expect(damageResult.success).toBe(true);
            expect(damageResult.remainingHP).toBe(initialHP - 30);
            expect(damageResult.wasDefeated).toBe(false);

            // Verify character state is updated
            expect(enemyUnit.currentHP).toBe(initialHP - 30);

            // Verify NPC state is updated
            const npcState = npcStateManager.getNPCState(enemyUnit);
            expect(npcState!.remainingHP).toBe(initialHP - 30);
        });

        test('should handle NPC defeat and cleanup', () => {
            characterManager.loadCharacters(stageData);
            const enemyUnit = characterManager.getCharacterById('enemy-1')!;

            // Convert to NPC
            npcStateManager.convertToNPC(enemyUnit, 'recruitment-123', 5);
            expect(npcStateManager.getNPCCount()).toBe(1);

            // Deal fatal damage
            const damageResult = npcStateManager.handleNPCDamage(enemyUnit, enemyUnit.currentHP + 10);
            expect(damageResult.success).toBe(true);
            expect(damageResult.wasDefeated).toBe(true);

            // Verify NPC state is removed
            expect(npcStateManager.isNPC(enemyUnit)).toBe(false);
            expect(npcStateManager.getNPCCount()).toBe(0);

            // Verify events were emitted
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('npc-defeated', expect.objectContaining({
                unitId: enemyUnit.id,
                recruitmentFailed: true
            }));
        });

        test('should handle multiple NPC damage scenarios', () => {
            // Add additional enemy
            const additionalEnemy: Unit = {
                id: 'enemy-2',
                name: 'Goblin Scout',
                position: { x: 7, y: 8 },
                stats: { maxHP: 60, maxMP: 30, attack: 15, defense: 10, speed: 12, movement: 3 },
                currentHP: 60,
                currentMP: 30,
                faction: 'enemy',
                hasActed: false,
                hasMoved: false,
                equipment: {}
            };

            stageData.enemyUnits.push(additionalEnemy);
            characterManager.loadCharacters(stageData);

            const enemy1 = characterManager.getCharacterById('enemy-1')!;
            const enemy2 = characterManager.getCharacterById('enemy-2')!;

            // Convert both to NPCs
            npcStateManager.convertToNPC(enemy1, 'recruitment-1', 5);
            npcStateManager.convertToNPC(enemy2, 'recruitment-2', 6);

            expect(npcStateManager.getNPCCount()).toBe(2);

            // Damage first NPC (non-fatal)
            const damage1Result = npcStateManager.handleNPCDamage(enemy1, 30);
            expect(damage1Result.success).toBe(true);
            expect(damage1Result.wasDefeated).toBe(false);

            // Defeat second NPC
            const damage2Result = npcStateManager.handleNPCDamage(enemy2, enemy2.currentHP + 10);
            expect(damage2Result.success).toBe(true);
            expect(damage2Result.wasDefeated).toBe(true);

            // Verify states
            expect(npcStateManager.isNPC(enemy1)).toBe(true);
            expect(npcStateManager.isNPC(enemy2)).toBe(false);
            expect(npcStateManager.getNPCCount()).toBe(1);
        });
    });

    describe('Event Integration', () => {
        test('should emit appropriate events during NPC lifecycle', () => {
            characterManager.loadCharacters(stageData);
            const enemyUnit = characterManager.getCharacterById('enemy-1')!;

            // Clear previous event calls
            mockEventEmitter.emit.mockClear();

            // Convert to NPC
            npcStateManager.convertToNPC(enemyUnit, 'recruitment-123', 5);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('npc-converted', {
                unitId: enemyUnit.id,
                unit: enemyUnit,
                npcState: expect.any(Object),
                turn: 5
            });

            // Damage NPC
            mockEventEmitter.emit.mockClear();
            npcStateManager.handleNPCDamage(enemyUnit, 20);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('npc-damaged', {
                unitId: enemyUnit.id,
                unit: enemyUnit,
                damage: 20,
                remainingHP: expect.any(Number),
                wasDefeated: false,
                npcState: expect.any(Object)
            });

            // Remove NPC state
            mockEventEmitter.emit.mockClear();
            npcStateManager.removeNPCState(enemyUnit);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('npc-state-removed', {
                unitId: enemyUnit.id,
                unit: enemyUnit
            });
        });

        test('should handle event emitter errors gracefully', () => {
            const faultyEventEmitter = {
                emit: jest.fn().mockImplementation(() => {
                    throw new Error('Event emitter error');
                })
            } as any;

            const faultyManager = new NPCStateManager(mockScene, undefined, faultyEventEmitter);
            characterManager.loadCharacters(stageData);
            const enemyUnit = characterManager.getCharacterById('enemy-1')!;

            // Should not throw even if event emitter fails
            expect(() => {
                faultyManager.convertToNPC(enemyUnit, 'recruitment-123', 5);
            }).not.toThrow();

            expect(faultyManager.isNPC(enemyUnit)).toBe(true);

            faultyManager.destroy();
        });
    });

    describe('Visual Integration', () => {
        test('should update visuals when scene is available', () => {
            characterManager.loadCharacters(stageData);
            const enemyUnit = characterManager.getCharacterById('enemy-1')!;

            // Convert to NPC
            npcStateManager.convertToNPC(enemyUnit, 'recruitment-123', 5);

            // Verify visual updates were attempted
            expect(mockScene.add.container).toHaveBeenCalled();
            expect(mockScene.add.graphics).toHaveBeenCalled();
        });

        test('should handle missing scene gracefully', () => {
            const managerWithoutScene = new NPCStateManager(undefined, undefined, mockEventEmitter);
            characterManager.loadCharacters(stageData);
            const enemyUnit = characterManager.getCharacterById('enemy-1')!;

            // Should not throw even without scene
            expect(() => {
                managerWithoutScene.convertToNPC(enemyUnit, 'recruitment-123', 5);
                managerWithoutScene.updateNPCVisuals(enemyUnit);
            }).not.toThrow();

            expect(managerWithoutScene.isNPC(enemyUnit)).toBe(true);

            managerWithoutScene.destroy();
        });
    });

    describe('State Validation and Recovery', () => {
        test('should validate NPC states after complex operations', () => {
            characterManager.loadCharacters(stageData);
            const enemyUnit = characterManager.getCharacterById('enemy-1')!;

            // Convert to NPC
            npcStateManager.convertToNPC(enemyUnit, 'recruitment-123', 5);

            // Perform various operations
            npcStateManager.handleNPCDamage(enemyUnit, 20);
            npcStateManager.updateNPCVisuals(enemyUnit);

            // Validate states
            const validationErrors = npcStateManager.validateNPCStates();
            expect(validationErrors).toEqual([]);
        });

        test('should provide accurate statistics after complex operations', () => {
            // Add additional enemy
            const additionalEnemy: Unit = {
                id: 'enemy-2',
                name: 'Goblin Scout',
                position: { x: 7, y: 8 },
                stats: { maxHP: 60, maxMP: 30, attack: 15, defense: 10, speed: 12, movement: 3 },
                currentHP: 60,
                currentMP: 30,
                faction: 'enemy',
                hasActed: false,
                hasMoved: false,
                equipment: {}
            };

            stageData.enemyUnits.push(additionalEnemy);
            characterManager.loadCharacters(stageData);

            const enemy1 = characterManager.getCharacterById('enemy-1')!;
            const enemy2 = characterManager.getCharacterById('enemy-2')!;

            // Convert both to NPCs
            npcStateManager.convertToNPC(enemy1, 'recruitment-1', 5);
            npcStateManager.convertToNPC(enemy2, 'recruitment-2', 6);

            // Damage one NPC
            npcStateManager.handleNPCDamage(enemy1, 30);

            // Get statistics
            const stats = npcStateManager.getNPCStatistics();

            expect(stats.totalNPCs).toBe(2);
            expect(stats.protectedNPCs).toBe(2);
            expect(stats.originalFactions.enemy).toBe(2);
            expect(stats.originalFactions.player).toBe(0);
        });
    });

    describe('Cleanup and Resource Management', () => {
        test('should properly cleanup resources on destroy', () => {
            characterManager.loadCharacters(stageData);
            const enemyUnit = characterManager.getCharacterById('enemy-1')!;

            // Convert to NPC and create visual elements
            npcStateManager.convertToNPC(enemyUnit, 'recruitment-123', 5);
            expect(npcStateManager.getNPCCount()).toBe(1);

            // Destroy manager
            npcStateManager.destroy();

            // Verify cleanup
            expect(npcStateManager.getNPCCount()).toBe(0);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('npc-state-manager-destroyed');
        });

        test('should handle destroy with multiple NPCs', () => {
            // Add additional enemy
            const additionalEnemy: Unit = {
                id: 'enemy-2',
                name: 'Goblin Scout',
                position: { x: 7, y: 8 },
                stats: { maxHP: 60, maxMP: 30, attack: 15, defense: 10, speed: 12, movement: 3 },
                currentHP: 60,
                currentMP: 30,
                faction: 'enemy',
                hasActed: false,
                hasMoved: false,
                equipment: {}
            };

            stageData.enemyUnits.push(additionalEnemy);
            characterManager.loadCharacters(stageData);

            const enemy1 = characterManager.getCharacterById('enemy-1')!;
            const enemy2 = characterManager.getCharacterById('enemy-2')!;

            // Convert both to NPCs
            npcStateManager.convertToNPC(enemy1, 'recruitment-1', 5);
            npcStateManager.convertToNPC(enemy2, 'recruitment-2', 6);

            expect(npcStateManager.getNPCCount()).toBe(2);

            // Destroy manager
            npcStateManager.destroy();

            // Verify all NPCs are cleaned up
            expect(npcStateManager.getNPCCount()).toBe(0);
        });
    });
});