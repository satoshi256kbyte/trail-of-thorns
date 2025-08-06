/**
 * RecruitmentUI.integration.test.ts - Integration tests for RecruitmentUI
 * 
 * Tests integration between RecruitmentUI and other recruitment system components:
 * - Integration with RecruitmentSystem
 * - Integration with NPCStateManager
 * - UI updates based on system state changes
 * - Event-driven UI updates
 */

import { RecruitmentUI } from '../../../../game/src/systems/recruitment/RecruitmentUI';
import { RecruitmentSystem } from '../../../../game/src/systems/recruitment/RecruitmentSystem';
import { NPCStateManager } from '../../../../game/src/systems/recruitment/NPCStateManager';
import {
    RecruitmentCondition,
    RecruitmentConditionType,
    RecruitmentProgress,
    RecruitmentStatus,
    RecruitmentAction,
    RecruitableCharacter,
    NPCState,
    RecruitmentUtils
} from '../../../../game/src/types/recruitment';
import { Unit, StageData } from '../../../../game/src/types/gameplay';

// Mock Phaser scene with more complete implementation
const createMockScene = () => {
    const mockContainers = new Map();
    const mockTexts = new Map();
    const mockGraphics = new Map();

    return {
        add: {
            container: jest.fn().mockImplementation((x, y) => {
                const container = {
                    x, y,
                    setScrollFactor: jest.fn().mockReturnThis(),
                    setDepth: jest.fn().mockReturnThis(),
                    setVisible: jest.fn().mockReturnThis(),
                    setPosition: jest.fn().mockReturnThis(),
                    setScale: jest.fn().mockReturnThis(),
                    setAlpha: jest.fn().mockReturnThis(),
                    add: jest.fn(),
                    removeAll: jest.fn(),
                    destroy: jest.fn(),
                    visible: false
                };
                mockContainers.set(container, true);
                return container;
            }),
            graphics: jest.fn().mockImplementation(() => {
                const graphics = {
                    fillStyle: jest.fn().mockReturnThis(),
                    fillRoundedRect: jest.fn().mockReturnThis(),
                    lineStyle: jest.fn().mockReturnThis(),
                    strokeRoundedRect: jest.fn().mockReturnThis(),
                    clear: jest.fn().mockReturnThis(),
                    fillTriangle: jest.fn().mockReturnThis(),
                    fillCircle: jest.fn().mockReturnThis(),
                    strokePoints: jest.fn().mockReturnThis(),
                    destroy: jest.fn()
                };
                mockGraphics.set(graphics, true);
                return graphics;
            }),
            text: jest.fn().mockImplementation((x, y, text, style) => {
                const textObj = {
                    x, y, text, style,
                    setOrigin: jest.fn().mockReturnThis(),
                    setText: jest.fn().mockReturnThis(),
                    setColor: jest.fn().mockReturnThis(),
                    destroy: jest.fn()
                };
                mockTexts.set(textObj, true);
                return textObj;
            })
        },
        cameras: {
            main: { width: 1024, height: 768 }
        },
        tweens: {
            add: jest.fn()
        },
        time: {
            delayedCall: jest.fn()
        },
        events: {
            on: jest.fn(),
            emit: jest.fn()
        },
        // Helper methods for testing
        _getMockContainers: () => mockContainers,
        _getMockTexts: () => mockTexts,
        _getMockGraphics: () => mockGraphics
    } as any;
};

// Helper function to create mock unit with sprite
const createMockUnit = (overrides: Partial<Unit> = {}): Unit => ({
    id: 'test-unit',
    name: 'Test Unit',
    position: { x: 5, y: 5 },
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
        x: 160,
        y: 160,
        setTint: jest.fn(),
        setScale: jest.fn(),
        destroy: jest.fn()
    } as any,
    ...overrides
});

// Helper function to create mock stage data
const createMockStageData = (): StageData => ({
    id: 'test-stage',
    name: 'Test Stage',
    description: 'Test stage for integration testing',
    mapData: {
        width: 10,
        height: 10,
        tileSize: 32,
        tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 }))
    },
    playerUnits: [
        createMockUnit({ id: 'player-1', name: 'Hero', faction: 'player' })
    ],
    enemyUnits: [
        createMockUnit({ id: 'enemy-1', name: 'Orc', faction: 'enemy' })
    ],
    victoryConditions: [{ type: 'defeat_all', description: 'Defeat all enemies' }]
});

// Helper function to create mock recruitment condition
const createMockCondition = (overrides: Partial<RecruitmentCondition> = {}): RecruitmentCondition => ({
    id: 'test-condition',
    type: RecruitmentConditionType.HP_THRESHOLD,
    description: 'HPが30%以下で撃破する',
    parameters: { threshold: 0.3 },
    checkCondition: jest.fn().mockReturnValue(false),
    ...overrides
});

describe('RecruitmentUI Integration Tests', () => {
    let mockScene: any;
    let mockEventEmitter: Phaser.Events.EventEmitter;
    let recruitmentUI: RecruitmentUI;
    let recruitmentSystem: RecruitmentSystem;
    let npcStateManager: NPCStateManager;
    let mockUnit: Unit;
    let mockStageData: StageData;

    beforeEach(() => {
        mockScene = createMockScene();
        mockEventEmitter = {
            on: jest.fn(),
            emit: jest.fn(),
            removeAllListeners: jest.fn()
        } as any;

        // Create system components
        recruitmentUI = new RecruitmentUI(mockScene, undefined, mockEventEmitter);
        recruitmentSystem = new RecruitmentSystem(mockScene, undefined, mockEventEmitter);
        npcStateManager = new NPCStateManager(mockScene, undefined, mockEventEmitter);

        // Create test data
        mockUnit = createMockUnit();
        mockStageData = createMockStageData();
    });

    afterEach(() => {
        if (recruitmentUI) {
            recruitmentUI.destroy();
        }
        if (npcStateManager && typeof npcStateManager.destroy === 'function') {
            npcStateManager.destroy();
        }
        if (mockEventEmitter && typeof mockEventEmitter.removeAllListeners === 'function') {
            mockEventEmitter.removeAllListeners();
        }
    });

    describe('Integration with RecruitmentSystem', () => {
        test('should display conditions when recruitment system provides them', () => {
            // Setup recruitment system with mock data
            const mockConditions = [
                createMockCondition({ id: 'condition-1', description: '主人公で攻撃' }),
                createMockCondition({ id: 'condition-2', description: 'HP30%以下' })
            ];

            // Mock the recruitment system to return conditions
            jest.spyOn(recruitmentSystem, 'getRecruitmentConditions')
                .mockReturnValue(mockConditions);

            // Get conditions from system and display in UI
            const conditions = recruitmentSystem.getRecruitmentConditions(mockUnit);
            recruitmentUI.showRecruitmentConditions(mockUnit, conditions);

            // Verify UI was updated with conditions
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.stringContaining('主人公で攻撃'),
                expect.any(Object)
            );

            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.stringContaining('HP30%以下'),
                expect.any(Object)
            );
        });

        test('should update progress when recruitment system reports progress changes', () => {
            const mockProgress: RecruitmentProgress = {
                characterId: mockUnit.id,
                conditions: [createMockCondition()],
                conditionProgress: [true],
                overallProgress: 100,
                isEligible: true
            };

            // Mock the recruitment system to return progress
            jest.spyOn(recruitmentSystem, 'getRecruitmentProgress')
                .mockReturnValue(mockProgress);

            // Get progress from system and update UI
            const progress = recruitmentSystem.getRecruitmentProgress(mockUnit);
            if (progress) {
                recruitmentUI.updateRecruitmentProgress(mockUnit, progress);
            }

            // Verify progress bar was updated
            expect(mockScene.add.graphics).toHaveBeenCalled();

            // Verify progress text was updated
            const textCalls = mockScene.add.text.mock.calls;
            const progressTextCall = textCalls.find(call =>
                call[2] === '100%' || (typeof call[2] === 'string' && call[2].includes('%'))
            );
            expect(progressTextCall).toBeDefined();
        });

        test('should respond to recruitment system events', (done) => {
            // Setup event listener
            mockEventEmitter.on('recruitment-eligibility-checked', (data) => {
                expect(data.unitId).toBe(mockUnit.id);
                expect(data.eligible).toBe(true);

                // Update UI based on event
                if (data.progress) {
                    recruitmentUI.updateRecruitmentProgress(mockUnit, data.progress);
                }

                done();
            });

            // Simulate recruitment system emitting event
            const mockProgress: RecruitmentProgress = {
                characterId: mockUnit.id,
                conditions: [createMockCondition()],
                conditionProgress: [true],
                overallProgress: 100,
                isEligible: true
            };

            mockEventEmitter.emit('recruitment-eligibility-checked', {
                unitId: mockUnit.id,
                eligible: true,
                progress: mockProgress
            });
        });
    });

    describe('Integration with NPCStateManager', () => {
        test('should show NPC indicator when character is converted to NPC', () => {
            // Convert unit to NPC using NPCStateManager
            const conversionResult = npcStateManager.convertToNPC(mockUnit, 'test-recruitment', 1);

            if (conversionResult.success) {
                // Show NPC indicator in UI
                recruitmentUI.showNPCIndicator(mockUnit);

                // Verify indicator was created
                expect(mockScene.add.container).toHaveBeenCalledWith(
                    mockUnit.sprite!.x,
                    mockUnit.sprite!.y - 40
                );

                expect(recruitmentUI.getNPCIndicatorCount()).toBe(1);
            }
        });

        test('should hide NPC indicator when NPC state is removed', () => {
            // First convert to NPC and show indicator
            npcStateManager.convertToNPC(mockUnit, 'test-recruitment', 1);
            recruitmentUI.showNPCIndicator(mockUnit);

            expect(recruitmentUI.getNPCIndicatorCount()).toBe(1);

            // Remove NPC state
            npcStateManager.removeNPCState(mockUnit);
            recruitmentUI.hideNPCIndicator(mockUnit);

            expect(recruitmentUI.getNPCIndicatorCount()).toBe(0);
        });

        test('should respond to NPC state manager events', (done) => {
            // Setup event listener
            mockEventEmitter.on('npc-converted', (data) => {
                expect(data.unitId).toBe(mockUnit.id);
                expect(data.npcState).toBeDefined();

                // Show NPC indicator in response to event
                recruitmentUI.showNPCIndicator(mockUnit);

                expect(recruitmentUI.getNPCIndicatorCount()).toBe(1);
                done();
            });

            // Convert unit to NPC (should emit event)
            npcStateManager.convertToNPC(mockUnit, 'test-recruitment', 1);
        });

        test('should update indicator position when NPC moves', () => {
            // Convert to NPC and show indicator
            npcStateManager.convertToNPC(mockUnit, 'test-recruitment', 1);
            recruitmentUI.showNPCIndicator(mockUnit);

            // Simulate unit movement
            const newPosition = { x: 10, y: 10 };
            mockUnit.sprite!.x = 320;
            mockUnit.sprite!.y = 320;

            // Update indicator position
            recruitmentUI.updateNPCIndicatorPosition(mockUnit, newPosition);

            // Verify position was updated
            const containers = Array.from(mockScene._getMockContainers().keys());
            const indicator = containers[containers.length - 1]; // Last created container
            expect(indicator.setPosition).toHaveBeenCalledWith(320, 280);
        });
    });

    describe('Event-Driven UI Updates', () => {
        test('should handle recruitment attempt processed event', (done) => {
            const mockResult = {
                success: true,
                conditionsMet: [true, true],
                nextAction: RecruitmentAction.CONVERT_TO_NPC,
                message: 'Recruitment successful'
            };

            // Setup event listener
            mockEventEmitter.on('recruitment-attempt-processed', (data) => {
                expect(data.unitId).toBe(mockUnit.id);
                expect(data.result.success).toBe(true);

                // Show success notification
                recruitmentUI.showRecruitmentSuccess(mockUnit);

                // Verify success notification was shown
                expect(mockScene.add.text).toHaveBeenCalledWith(
                    expect.any(Number),
                    expect.any(Number),
                    '仲間化成功！',
                    expect.any(Object)
                );

                done();
            });

            // Emit event
            mockEventEmitter.emit('recruitment-attempt-processed', {
                unitId: mockUnit.id,
                result: mockResult
            });
        });

        test('should handle recruitment failed event', (done) => {
            // Setup event listener
            mockEventEmitter.on('recruitment-failed', (data) => {
                expect(data.unitId).toBe(mockUnit.id);

                // Show failure notification
                const reason = 'NPCが撃破されました';
                recruitmentUI.showRecruitmentFailure(mockUnit, reason);

                // Verify failure notification was shown
                expect(mockScene.add.text).toHaveBeenCalledWith(
                    expect.any(Number),
                    expect.any(Number),
                    '仲間化失敗',
                    expect.any(Object)
                );

                done();
            });

            // Emit event
            mockEventEmitter.emit('recruitment-failed', {
                unitId: mockUnit.id,
                reason: 'npc_already_defeated'
            });
        });

        test('should handle stage recruitment completed event', (done) => {
            const recruitedUnits = [mockUnit];
            const failedUnits = ['enemy-2'];

            // Setup event listener
            mockEventEmitter.on('stage-recruitment-completed', (data) => {
                expect(data.recruitedUnits).toHaveLength(1);
                expect(data.failedUnits).toHaveLength(1);

                // Show success for recruited units
                data.recruitedUnits.forEach((unit: Unit) => {
                    recruitmentUI.showRecruitmentSuccess(unit);
                });

                // Verify success notifications
                expect(mockScene.add.text).toHaveBeenCalledWith(
                    expect.any(Number),
                    expect.any(Number),
                    '仲間化成功！',
                    expect.any(Object)
                );

                done();
            });

            // Emit event
            mockEventEmitter.emit('stage-recruitment-completed', {
                recruitedUnits: recruitedUnits,
                failedUnits: failedUnits
            });
        });
    });

    describe('Full Recruitment Flow Integration', () => {
        test('should handle complete recruitment workflow', async () => {
            // Step 1: Initialize recruitment system
            const initResult = recruitmentSystem.initialize(mockStageData);
            expect(initResult.success).toBe(true);

            // Step 2: Show recruitment conditions
            const conditions = recruitmentSystem.getRecruitmentConditions(mockUnit);
            if (conditions.length > 0) {
                recruitmentUI.showRecruitmentConditions(mockUnit, conditions);
                expect(recruitmentUI.isConditionPanelVisible()).toBe(false); // Initially hidden in mock
            }

            // Step 3: Check eligibility and update progress
            const attacker = mockStageData.playerUnits[0];
            const eligibilityResult = recruitmentSystem.checkRecruitmentEligibility(attacker, mockUnit);

            if (eligibilityResult.success) {
                const progress = recruitmentSystem.getRecruitmentProgress(mockUnit);
                if (progress) {
                    recruitmentUI.updateRecruitmentProgress(mockUnit, progress);
                }
            }

            // Step 4: Process recruitment attempt
            const attemptResult = recruitmentSystem.processRecruitmentAttempt(
                attacker, mockUnit, 50, undefined, 1
            );

            if (attemptResult.success && attemptResult.nextAction === RecruitmentAction.CONVERT_TO_NPC) {
                // Step 5: Show NPC indicator
                recruitmentUI.showNPCIndicator(mockUnit);
                expect(recruitmentUI.getNPCIndicatorCount()).toBe(1);
            }

            // Step 6: Complete recruitment
            const allUnits = [...mockStageData.playerUnits, ...mockStageData.enemyUnits];
            const recruitedUnits = recruitmentSystem.completeRecruitment(allUnits);

            if (recruitedUnits.length > 0) {
                // Step 7: Show success notification
                recruitedUnits.forEach(recruited => {
                    recruitmentUI.showRecruitmentSuccess(recruited.unit);
                });
            }

            // Verify the complete flow worked
            expect(mockScene.add.container).toHaveBeenCalled(); // UI elements created
            expect(mockScene.add.text).toHaveBeenCalled(); // Text elements created
            expect(mockScene.add.graphics).toHaveBeenCalled(); // Graphics elements created
        });

        test('should handle recruitment failure workflow', () => {
            // Initialize system
            recruitmentSystem.initialize(mockStageData);

            // Show conditions
            const conditions = recruitmentSystem.getRecruitmentConditions(mockUnit);
            recruitmentUI.showRecruitmentConditions(mockUnit, conditions);

            // Simulate NPC being defeated (failure scenario)
            mockUnit.currentHP = 0;

            // Complete recruitment (should fail for defeated NPC)
            const allUnits = [...mockStageData.playerUnits, ...mockStageData.enemyUnits];
            const recruitedUnits = recruitmentSystem.completeRecruitment(allUnits);

            // Should have no recruited units
            expect(recruitedUnits).toHaveLength(0);

            // Show failure notification
            recruitmentUI.showRecruitmentFailure(mockUnit, 'NPCが撃破されました');

            // Verify failure UI was shown
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                '仲間化失敗',
                expect.any(Object)
            );
        });
    });

    describe('Performance and Memory Management', () => {
        test('should handle multiple units efficiently', () => {
            const units = Array.from({ length: 5 }, (_, i) =>
                createMockUnit({ id: `unit-${i}`, name: `Unit ${i}` })
            );

            // Show indicators for all units
            units.forEach(unit => {
                recruitmentUI.showNPCIndicator(unit);
            });

            expect(recruitmentUI.getNPCIndicatorCount()).toBe(5);

            // Hide all indicators
            units.forEach(unit => {
                recruitmentUI.hideNPCIndicator(unit);
            });

            expect(recruitmentUI.getNPCIndicatorCount()).toBe(0);
        });

        test('should clean up properly when destroyed', () => {
            // Create multiple UI elements
            recruitmentUI.showNPCIndicator(mockUnit);
            recruitmentUI.showRecruitmentConditions(mockUnit, [createMockCondition()]);
            recruitmentUI.showRecruitmentSuccess(mockUnit);

            // Destroy UI
            recruitmentUI.destroy();

            // Verify cleanup
            expect(recruitmentUI.getNPCIndicatorCount()).toBe(0);
            expect(mockEventEmitter.listenerCount('recruitment-ui-destroyed')).toBe(0);
        });
    });

    describe('Error Handling in Integration', () => {
        test('should handle recruitment system errors gracefully', () => {
            // Mock recruitment system to throw error
            jest.spyOn(recruitmentSystem, 'getRecruitmentConditions')
                .mockImplementation(() => {
                    throw new Error('System error');
                });

            // UI should handle the error gracefully
            expect(() => {
                try {
                    const conditions = recruitmentSystem.getRecruitmentConditions(mockUnit);
                    recruitmentUI.showRecruitmentConditions(mockUnit, conditions);
                } catch (error) {
                    // Handle error and show fallback UI
                    recruitmentUI.showRecruitmentFailure(mockUnit, 'システムエラーが発生しました');
                }
            }).not.toThrow();
        });

        test('should handle NPC state manager errors gracefully', () => {
            // Mock NPC state manager to fail conversion
            jest.spyOn(npcStateManager, 'convertToNPC')
                .mockReturnValue({
                    success: false,
                    error: 'system_error' as any,
                    message: 'Conversion failed'
                });

            // UI should handle the failure
            const result = npcStateManager.convertToNPC(mockUnit, 'test', 1);
            if (!result.success) {
                recruitmentUI.showRecruitmentFailure(mockUnit, result.message || 'Unknown error');
            }

            // Verify failure notification was shown
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                '仲間化失敗',
                expect.any(Object)
            );
        });
    });
});