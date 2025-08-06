/**
 * NPCStateManager AI Integration Tests
 * 
 * Tests the integration between NPCStateManager and AI systems,
 * focusing on NPC priority calculation and AI targeting behavior.
 */

import { NPCStateManager } from '../../../game/src/systems/recruitment/NPCStateManager';
import { AIController } from '../../../game/src/systems/AIController';
import { Unit } from '../../../game/src/types/gameplay';
import { NPCState, NPCVisualState } from '../../../game/src/types/recruitment';

// Mock Phaser Scene
class MockScene {
    add = {
        container: jest.fn().mockReturnValue({
            add: jest.fn(),
            setDepth: jest.fn(),
            setScale: jest.fn(),
            destroy: jest.fn()
        }),
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn(),
            fillRoundedRect: jest.fn(),
            fillCircle: jest.fn()
        })
    };
    tweens = {
        add: jest.fn()
    };
}

// Mock Event Emitter
class MockEventEmitter {
    emit = jest.fn();
    on = jest.fn();
    off = jest.fn();
    removeAllListeners = jest.fn();
}

// Test utilities
function createMockUnit(overrides: Partial<Unit> = {}): Unit {
    return {
        id: `unit-${Math.random().toString(36).substr(2, 9)}`,
        name: 'Test Unit',
        position: { x: 0, y: 0 },
        stats: {
            maxHP: 100,
            maxMP: 50,
            attack: 20,
            defense: 15,
            speed: 10,
            movement: 3
        },
        currentHP: 100,
        currentMP: 50,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
        sprite: {
            x: 0,
            y: 0,
            setTint: jest.fn(),
            clearTint: jest.fn(),
            setScale: jest.fn()
        },
        ...overrides
    } as Unit;
}

describe('NPCStateManager AI Integration', () => {
    let npcStateManager: NPCStateManager;
    let mockScene: MockScene;
    let mockEventEmitter: MockEventEmitter;

    beforeEach(() => {
        mockScene = new MockScene();
        mockEventEmitter = new MockEventEmitter();

        npcStateManager = new NPCStateManager(
            mockScene as any,
            {
                defaultNPCPriority: 100,
                maxNPCsPerStage: 5,
                enableProtection: true
            },
            mockEventEmitter as any
        );
    });

    describe('NPC Priority Calculation for AI', () => {
        test('should return zero priority for non-NPC units', () => {
            const regularUnit = createMockUnit({ id: 'regular-unit' });

            const priority = npcStateManager.getNPCPriority(regularUnit);

            expect(priority).toBe(0);
        });

        test('should return high priority for NPC units', () => {
            const npcUnit = createMockUnit({ id: 'npc-unit' });

            // Convert to NPC
            const result = npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);
            expect(result.success).toBe(true);

            const priority = npcStateManager.getNPCPriority(npcUnit);

            expect(priority).toBeGreaterThan(0);
            expect(priority).toBeGreaterThanOrEqual(100); // Default priority
        });

        test('should calculate priority based on NPC state', () => {
            const npcUnit1 = createMockUnit({
                id: 'npc-unit-1',
                currentHP: 100
            });

            const npcUnit2 = createMockUnit({
                id: 'npc-unit-2',
                currentHP: 10 // Low HP
            });

            // Convert both to NPCs
            npcStateManager.convertToNPC(npcUnit1, 'test-recruitment-1', 1);
            npcStateManager.convertToNPC(npcUnit2, 'test-recruitment-2', 1);

            const priority1 = npcStateManager.getNPCPriority(npcUnit1);
            const priority2 = npcStateManager.getNPCPriority(npcUnit2);

            // Both should have high priority as NPCs
            expect(priority1).toBeGreaterThan(0);
            expect(priority2).toBeGreaterThan(0);
        });

        test('should handle invalid units gracefully', () => {
            const invalidUnit = null as any;

            const priority = npcStateManager.getNPCPriority(invalidUnit);

            expect(priority).toBe(0);
        });

        test('should handle units without IDs gracefully', () => {
            const unitWithoutId = { ...createMockUnit(), id: undefined } as any;

            const priority = npcStateManager.getNPCPriority(unitWithoutId);

            expect(priority).toBe(0);
        });
    });

    describe('NPC State Management for AI Targeting', () => {
        test('should correctly identify NPC units', () => {
            const regularUnit = createMockUnit({ id: 'regular-unit' });
            const npcUnit = createMockUnit({ id: 'npc-unit' });

            // Initially, neither should be NPCs
            expect(npcStateManager.isNPC(regularUnit)).toBe(false);
            expect(npcStateManager.isNPC(npcUnit)).toBe(false);

            // Convert one to NPC
            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            // Now only the converted unit should be an NPC
            expect(npcStateManager.isNPC(regularUnit)).toBe(false);
            expect(npcStateManager.isNPC(npcUnit)).toBe(true);
        });

        test('should provide list of NPC unit IDs for AI targeting', () => {
            const unit1 = createMockUnit({ id: 'unit-1' });
            const unit2 = createMockUnit({ id: 'unit-2' });
            const unit3 = createMockUnit({ id: 'unit-3' });

            // Convert two units to NPCs
            npcStateManager.convertToNPC(unit1, 'test-recruitment-1', 1);
            npcStateManager.convertToNPC(unit3, 'test-recruitment-3', 1);

            const npcIds = npcStateManager.getNPCUnitIds();

            expect(npcIds).toHaveLength(2);
            expect(npcIds).toContain('unit-1');
            expect(npcIds).toContain('unit-3');
            expect(npcIds).not.toContain('unit-2');
        });

        test('should track NPC count for AI decision making', () => {
            expect(npcStateManager.getNPCCount()).toBe(0);

            const unit1 = createMockUnit({ id: 'unit-1' });
            const unit2 = createMockUnit({ id: 'unit-2' });

            npcStateManager.convertToNPC(unit1, 'test-recruitment-1', 1);
            expect(npcStateManager.getNPCCount()).toBe(1);

            npcStateManager.convertToNPC(unit2, 'test-recruitment-2', 1);
            expect(npcStateManager.getNPCCount()).toBe(2);

            // Remove one NPC
            npcStateManager.removeNPCState(unit1);
            expect(npcStateManager.getNPCCount()).toBe(1);
        });

        test('should enforce NPC limits for AI balance', () => {
            // Create manager with low NPC limit
            const limitedManager = new NPCStateManager(
                mockScene as any,
                { maxNPCsPerStage: 2 },
                mockEventEmitter as any
            );

            const unit1 = createMockUnit({ id: 'unit-1' });
            const unit2 = createMockUnit({ id: 'unit-2' });
            const unit3 = createMockUnit({ id: 'unit-3' });

            // First two conversions should succeed
            const result1 = limitedManager.convertToNPC(unit1, 'test-1', 1);
            const result2 = limitedManager.convertToNPC(unit2, 'test-2', 1);

            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
            expect(limitedManager.isAtNPCLimit()).toBe(true);

            // Third conversion should fail due to limit
            const result3 = limitedManager.convertToNPC(unit3, 'test-3', 1);
            expect(result3.success).toBe(false);
        });
    });

    describe('NPC Damage Handling for AI Combat', () => {
        test('should update NPC state when damaged by AI', () => {
            const npcUnit = createMockUnit({
                id: 'npc-unit',
                currentHP: 100
            });

            // Convert to NPC
            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            // Apply damage
            const damageResult = npcStateManager.handleNPCDamage(npcUnit, 30);

            expect(damageResult.success).toBe(true);
            expect(damageResult.remainingHP).toBe(70);
            expect(damageResult.wasDefeated).toBe(false);
            expect(npcUnit.currentHP).toBe(70);
        });

        test('should handle NPC defeat by AI attacks', () => {
            const npcUnit = createMockUnit({
                id: 'npc-unit',
                currentHP: 20
            });

            // Convert to NPC
            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);
            expect(npcStateManager.isNPC(npcUnit)).toBe(true);

            // Apply fatal damage
            const damageResult = npcStateManager.handleNPCDamage(npcUnit, 25);

            expect(damageResult.success).toBe(true);
            expect(damageResult.remainingHP).toBe(0);
            expect(damageResult.wasDefeated).toBe(true);
            expect(npcUnit.currentHP).toBe(0);

            // NPC state should be removed after defeat
            expect(npcStateManager.isNPC(npcUnit)).toBe(false);
        });

        test('should emit events for AI system integration', () => {
            const npcUnit = createMockUnit({ id: 'npc-unit' });

            // Convert to NPC
            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            // Check that conversion event was emitted
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('npc-converted',
                expect.objectContaining({
                    unitId: 'npc-unit',
                    unit: npcUnit
                })
            );

            // Apply damage
            npcStateManager.handleNPCDamage(npcUnit, 30);

            // Check that damage event was emitted
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('npc-damaged',
                expect.objectContaining({
                    unitId: 'npc-unit',
                    damage: 30,
                    wasDefeated: false
                })
            );
        });
    });

    describe('Visual State Management for AI Feedback', () => {
        test('should update visual indicators for AI targeting', () => {
            const npcUnit = createMockUnit({
                id: 'npc-unit',
                sprite: {
                    x: 100,
                    y: 100,
                    setTint: jest.fn(),
                    clearTint: jest.fn(),
                    setScale: jest.fn()
                }
            });

            // Convert to NPC
            const result = npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);
            expect(result.success).toBe(true);

            // Visual updates should have been applied
            expect(npcUnit.sprite.setTint).toHaveBeenCalled();

            // Container should have been created for indicator
            expect(mockScene.add.container).toHaveBeenCalled();
        });

        test('should remove visual indicators when NPC is defeated', () => {
            const npcUnit = createMockUnit({
                id: 'npc-unit',
                currentHP: 10,
                sprite: {
                    x: 100,
                    y: 100,
                    setTint: jest.fn(),
                    clearTint: jest.fn(),
                    setScale: jest.fn()
                }
            });

            // Convert to NPC
            const conversionResult = npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);
            expect(conversionResult.success).toBe(true);

            // Apply fatal damage
            const damageResult = npcStateManager.handleNPCDamage(npcUnit, 15);
            expect(damageResult.wasDefeated).toBe(true);

            // NPC should no longer be in NPC state
            expect(npcStateManager.isNPC(npcUnit)).toBe(false);
        });

        test('should handle visual updates without scene gracefully', () => {
            // Create manager without scene
            const noSceneManager = new NPCStateManager();

            const npcUnit = createMockUnit({ id: 'npc-unit' });

            // Should not crash without scene
            const result = noSceneManager.convertToNPC(npcUnit, 'test-recruitment', 1);
            expect(result.success).toBe(true);

            // Visual update should not crash
            expect(() => {
                noSceneManager.updateNPCVisuals(npcUnit);
            }).not.toThrow();
        });
    });

    describe('Configuration and AI Behavior Tuning', () => {
        test('should respect custom NPC priority configuration', () => {
            const customManager = new NPCStateManager(
                mockScene as any,
                { defaultNPCPriority: 200 },
                mockEventEmitter as any
            );

            const npcUnit = createMockUnit({ id: 'npc-unit' });
            customManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            const priority = customManager.getNPCPriority(npcUnit);
            expect(priority).toBeGreaterThanOrEqual(200);
        });

        test('should allow disabling NPC protection', () => {
            const unprotectedManager = new NPCStateManager(
                mockScene as any,
                { enableProtection: false },
                mockEventEmitter as any
            );

            const npcUnit = createMockUnit({ id: 'npc-unit' });
            const result = unprotectedManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            expect(result.success).toBe(true);
            expect(result.npcState?.isProtected).toBe(false);
        });

        test('should provide configuration access for AI tuning', () => {
            const config = npcStateManager.getConfig();

            expect(config).toHaveProperty('defaultNPCPriority');
            expect(config).toHaveProperty('maxNPCsPerStage');
            expect(config).toHaveProperty('enableProtection');
            expect(config.defaultNPCPriority).toBe(100);
        });

        test('should allow runtime configuration updates', () => {
            npcStateManager.updateConfig({
                defaultNPCPriority: 150,
                maxNPCsPerStage: 10
            });

            const config = npcStateManager.getConfig();
            expect(config.defaultNPCPriority).toBe(150);
            expect(config.maxNPCsPerStage).toBe(10);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle null or undefined units', () => {
            expect(npcStateManager.isNPC(null as any)).toBe(false);
            expect(npcStateManager.isNPC(undefined as any)).toBe(false);
            expect(npcStateManager.getNPCPriority(null as any)).toBe(0);
            expect(npcStateManager.getNPCPriority(undefined as any)).toBe(0);
        });

        test('should handle units with missing properties', () => {
            const incompleteUnit = { id: 'incomplete' } as Unit;

            expect(npcStateManager.isNPC(incompleteUnit)).toBe(false);
            expect(npcStateManager.getNPCPriority(incompleteUnit)).toBe(0);
        });

        test('should validate NPC state integrity', () => {
            const npcUnit = createMockUnit({ id: 'npc-unit' });
            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            const validationErrors = npcStateManager.validateNPCStates();
            expect(validationErrors).toHaveLength(0);
        });

        test('should provide statistics for AI analysis', () => {
            const unit1 = createMockUnit({ id: 'unit-1', currentHP: 80 });
            const unit2 = createMockUnit({ id: 'unit-2', currentHP: 60 });

            npcStateManager.convertToNPC(unit1, 'test-1', 1);
            npcStateManager.convertToNPC(unit2, 'test-2', 1);

            const stats = npcStateManager.getNPCStatistics();

            expect(stats.totalNPCs).toBe(2);
            expect(stats.averageHP).toBe(70); // (80 + 60) / 2
            expect(stats.protectedNPCs).toBe(2); // Both should be protected by default
        });
    });

    describe('Memory Management and Cleanup', () => {
        test('should clean up resources on destroy', () => {
            const npcUnit = createMockUnit({ id: 'npc-unit' });
            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            expect(npcStateManager.getNPCCount()).toBe(1);

            npcStateManager.destroy();

            expect(npcStateManager.getNPCCount()).toBe(0);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('npc-state-manager-destroyed');
        });

        test('should clear all NPC states when requested', () => {
            const unit1 = createMockUnit({ id: 'unit-1' });
            const unit2 = createMockUnit({ id: 'unit-2' });

            npcStateManager.convertToNPC(unit1, 'test-1', 1);
            npcStateManager.convertToNPC(unit2, 'test-2', 1);

            expect(npcStateManager.getNPCCount()).toBe(2);

            npcStateManager.clearAllNPCStates();

            expect(npcStateManager.getNPCCount()).toBe(0);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('all-npcs-cleared');
        });
    });
});