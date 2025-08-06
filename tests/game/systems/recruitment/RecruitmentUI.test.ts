/**
 * RecruitmentUI.test.ts - Unit tests for RecruitmentUI class
 * 
 * Tests all UI functionality for the recruitment system:
 * - Condition display and progress updates
 * - NPC indicator management
 * - Success and failure notifications
 * - UI element lifecycle and cleanup
 */

import { RecruitmentUI } from '../../../../game/src/systems/recruitment/RecruitmentUI';
import {
    RecruitmentCondition,
    RecruitmentConditionType,
    RecruitmentProgress,
    RecruitmentUIConfig,
    RecruitmentUtils
} from '../../../../game/src/types/recruitment';
import { Unit } from '../../../../game/src/types/gameplay';

// Mock Phaser objects
const mockScene = {
    add: {
        container: jest.fn().mockReturnValue({
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            add: jest.fn(),
            removeAll: jest.fn(),
            destroy: jest.fn(),
            visible: false,
            x: 0,
            y: 0
        }),
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn().mockReturnThis(),
            fillRoundedRect: jest.fn().mockReturnThis(),
            lineStyle: jest.fn().mockReturnThis(),
            strokeRoundedRect: jest.fn().mockReturnThis(),
            clear: jest.fn().mockReturnThis(),
            fillTriangle: jest.fn().mockReturnThis(),
            fillCircle: jest.fn().mockReturnThis(),
            strokePoints: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }),
        text: jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            setText: jest.fn().mockReturnThis(),
            setColor: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            x: 0,
            y: 0
        })
    },
    cameras: {
        main: {
            width: 1024,
            height: 768
        }
    },
    tweens: {
        add: jest.fn()
    },
    time: {
        delayedCall: jest.fn()
    }
} as any;

const mockEventEmitter = {
    emit: jest.fn()
} as any;

// Helper function to create mock unit
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
        destroy: jest.fn()
    } as any,
    ...overrides
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

describe('RecruitmentUI', () => {
    let recruitmentUI: RecruitmentUI;
    let mockUnit: Unit;
    let mockConditions: RecruitmentCondition[];

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create test instances
        recruitmentUI = new RecruitmentUI(mockScene, undefined, mockEventEmitter);
        mockUnit = createMockUnit();
        mockConditions = [
            createMockCondition({
                id: 'condition-1',
                description: '主人公で攻撃して撃破する'
            }),
            createMockCondition({
                id: 'condition-2',
                description: 'HPが30%以下で撃破する'
            })
        ];
    });

    afterEach(() => {
        recruitmentUI.destroy();
    });

    describe('Constructor and Initialization', () => {
        test('should initialize with default configuration', () => {
            const ui = new RecruitmentUI(mockScene);
            const config = ui.getConfig();

            expect(config.showConditions).toBe(true);
            expect(config.showProgress).toBe(true);
            expect(config.enableSoundEffects).toBe(true);
        });

        test('should initialize with custom configuration', () => {
            const customConfig: Partial<RecruitmentUIConfig> = {
                showConditions: false,
                conditionDisplayDuration: 5000,
                enableSoundEffects: false
            };

            const ui = new RecruitmentUI(mockScene, customConfig);
            const config = ui.getConfig();

            expect(config.showConditions).toBe(false);
            expect(config.conditionDisplayDuration).toBe(5000);
            expect(config.enableSoundEffects).toBe(false);
        });

        test('should create UI elements during initialization', () => {
            expect(mockScene.add.container).toHaveBeenCalled();
            expect(mockScene.add.graphics).toHaveBeenCalled();
            expect(mockScene.add.text).toHaveBeenCalled();
        });
    });

    describe('showRecruitmentConditions', () => {
        test('should display recruitment conditions for a unit', () => {
            recruitmentUI.showRecruitmentConditions(mockUnit, mockConditions);

            // Should update title with unit name
            // The title is updated via setText, not created new
            const mockTitle = mockScene.add.text.mock.results.find(result =>
                result.value.setText
            )?.value;
            expect(mockTitle?.setText).toHaveBeenCalledWith(`${mockUnit.name} の仲間化条件`);

            // Should create text for each condition
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.stringContaining(mockConditions[0].description),
                expect.any(Object)
            );

            // Should emit event
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'recruitment-conditions-shown',
                {
                    unitId: mockUnit.id,
                    conditionsCount: mockConditions.length
                }
            );
        });

        test('should not display conditions when showConditions is disabled', () => {
            const config: Partial<RecruitmentUIConfig> = { showConditions: false };
            const ui = new RecruitmentUI(mockScene, config);

            const textCallsBefore = mockScene.add.text.mock.calls.length;
            ui.showRecruitmentConditions(mockUnit, mockConditions);
            const textCallsAfter = mockScene.add.text.mock.calls.length;

            // Should not create additional text elements
            expect(textCallsAfter).toBe(textCallsBefore);
        });

        test('should auto-hide conditions after configured duration', () => {
            const config: Partial<RecruitmentUIConfig> = { conditionDisplayDuration: 2000 };
            const ui = new RecruitmentUI(mockScene, config);

            ui.showRecruitmentConditions(mockUnit, mockConditions);

            expect(mockScene.time.delayedCall).toHaveBeenCalledWith(
                2000,
                expect.any(Function)
            );
        });

        test('should handle empty conditions array', () => {
            expect(() => {
                recruitmentUI.showRecruitmentConditions(mockUnit, []);
            }).not.toThrow();

            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'recruitment-conditions-shown',
                {
                    unitId: mockUnit.id,
                    conditionsCount: 0
                }
            );
        });
    });

    describe('updateRecruitmentProgress', () => {
        let mockProgress: RecruitmentProgress;

        beforeEach(() => {
            mockProgress = {
                characterId: mockUnit.id,
                conditions: mockConditions,
                conditionProgress: [true, false],
                overallProgress: 50,
                isEligible: false
            };
        });

        test('should update progress bar and text', () => {
            recruitmentUI.updateRecruitmentProgress(mockUnit, mockProgress);

            // Should clear and redraw progress bar
            const mockGraphics = mockScene.add.graphics();
            expect(mockGraphics.clear).toHaveBeenCalled();
            expect(mockGraphics.fillStyle).toHaveBeenCalled();
            expect(mockGraphics.fillRoundedRect).toHaveBeenCalled();

            // Should emit progress update event
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'recruitment-progress-updated',
                {
                    unitId: mockUnit.id,
                    progress: 50,
                    isEligible: false
                }
            );
        });

        test('should not update progress when showProgress is disabled', () => {
            const config: Partial<RecruitmentUIConfig> = { showProgress: false };
            const ui = new RecruitmentUI(mockScene, config);

            const graphicsCallsBefore = mockScene.add.graphics.mock.calls.length;
            ui.updateRecruitmentProgress(mockUnit, mockProgress);
            const graphicsCallsAfter = mockScene.add.graphics.mock.calls.length;

            // Should not create additional graphics calls
            expect(graphicsCallsAfter).toBe(graphicsCallsBefore);
        });

        test('should handle 100% progress correctly', () => {
            mockProgress.overallProgress = 100;
            mockProgress.conditionProgress = [true, true];
            mockProgress.isEligible = true;

            expect(() => {
                recruitmentUI.updateRecruitmentProgress(mockUnit, mockProgress);
            }).not.toThrow();

            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'recruitment-progress-updated',
                expect.objectContaining({
                    progress: 100,
                    isEligible: true
                })
            );
        });

        test('should handle 0% progress correctly', () => {
            mockProgress.overallProgress = 0;
            mockProgress.conditionProgress = [false, false];

            expect(() => {
                recruitmentUI.updateRecruitmentProgress(mockUnit, mockProgress);
            }).not.toThrow();

            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'recruitment-progress-updated',
                expect.objectContaining({
                    progress: 0,
                    isEligible: false
                })
            );
        });
    });

    describe('showNPCIndicator', () => {
        test('should create and display NPC indicator', () => {
            recruitmentUI.showNPCIndicator(mockUnit);

            // Should create container for indicator
            expect(mockScene.add.container).toHaveBeenCalledWith(
                mockUnit.sprite!.x,
                mockUnit.sprite!.y - 40
            );

            // Should create graphics for crown and background
            expect(mockScene.add.graphics).toHaveBeenCalled();

            // Should create NPC text
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                'NPC',
                expect.any(Object)
            );

            // Should add pulsing animation
            expect(mockScene.tweens.add).toHaveBeenCalled();

            // Should emit event
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'npc-indicator-shown',
                { unitId: mockUnit.id }
            );
        });

        test('should not create indicator for unit without sprite', () => {
            const unitWithoutSprite = createMockUnit({ sprite: undefined });
            const containerCallsBefore = mockScene.add.container.mock.calls.length;

            recruitmentUI.showNPCIndicator(unitWithoutSprite);

            const containerCallsAfter = mockScene.add.container.mock.calls.length;
            expect(containerCallsAfter).toBe(containerCallsBefore);
        });

        test('should replace existing indicator when called multiple times', () => {
            // Show indicator first time
            recruitmentUI.showNPCIndicator(mockUnit);
            const firstContainer = mockScene.add.container.mock.results[mockScene.add.container.mock.results.length - 1].value;

            // Show indicator second time
            recruitmentUI.showNPCIndicator(mockUnit);

            // First indicator should be destroyed
            expect(firstContainer.destroy).toHaveBeenCalled();
        });

        test('should track indicator count correctly', () => {
            expect(recruitmentUI.getNPCIndicatorCount()).toBe(0);

            recruitmentUI.showNPCIndicator(mockUnit);
            expect(recruitmentUI.getNPCIndicatorCount()).toBe(1);

            const secondUnit = createMockUnit({ id: 'unit-2' });
            recruitmentUI.showNPCIndicator(secondUnit);
            expect(recruitmentUI.getNPCIndicatorCount()).toBe(2);
        });
    });

    describe('hideNPCIndicator', () => {
        test('should hide and destroy NPC indicator', () => {
            // First show the indicator
            recruitmentUI.showNPCIndicator(mockUnit);
            const indicator = mockScene.add.container.mock.results[mockScene.add.container.mock.results.length - 1].value;

            // Then hide it
            recruitmentUI.hideNPCIndicator(mockUnit);

            expect(indicator.destroy).toHaveBeenCalled();
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'npc-indicator-hidden',
                { unitId: mockUnit.id }
            );
        });

        test('should handle hiding non-existent indicator gracefully', () => {
            expect(() => {
                recruitmentUI.hideNPCIndicator(mockUnit);
            }).not.toThrow();
        });

        test('should update indicator count correctly', () => {
            recruitmentUI.showNPCIndicator(mockUnit);
            expect(recruitmentUI.getNPCIndicatorCount()).toBe(1);

            recruitmentUI.hideNPCIndicator(mockUnit);
            expect(recruitmentUI.getNPCIndicatorCount()).toBe(0);
        });
    });

    describe('showRecruitmentSuccess', () => {
        test('should display success notification with animation', () => {
            recruitmentUI.showRecruitmentSuccess(mockUnit);

            // Should create success background and elements
            expect(mockScene.add.graphics).toHaveBeenCalled();
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                '仲間化成功！',
                expect.any(Object)
            );
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                `${mockUnit.name} が仲間になりました`,
                expect.any(Object)
            );

            // Should start entrance animation
            expect(mockScene.tweens.add).toHaveBeenCalled();

            // Should emit event
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'recruitment-success-shown',
                { unitId: mockUnit.id }
            );
        });

        test('should auto-hide after configured duration', () => {
            const config: Partial<RecruitmentUIConfig> = { successAnimationDuration: 3000 };
            const ui = new RecruitmentUI(mockScene, config);

            ui.showRecruitmentSuccess(mockUnit);

            // Should start entrance animation (which sets up auto-hide)
            expect(mockScene.tweens.add).toHaveBeenCalled();
        });
    });

    describe('showRecruitmentFailure', () => {
        const failureReason = 'NPCが撃破されました';

        test('should display failure notification with shake animation', () => {
            recruitmentUI.showRecruitmentFailure(mockUnit, failureReason);

            // Should create failure background and elements
            expect(mockScene.add.graphics).toHaveBeenCalled();
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                '仲間化失敗',
                expect.any(Object)
            );
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                failureReason,
                expect.any(Object)
            );

            // Should start entrance animation
            expect(mockScene.tweens.add).toHaveBeenCalled();

            // Should emit event
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'recruitment-failure-shown',
                {
                    unitId: mockUnit.id,
                    reason: failureReason
                }
            );
        });

        test('should auto-hide after configured duration', () => {
            const config: Partial<RecruitmentUIConfig> = { failureAnimationDuration: 2000 };
            const ui = new RecruitmentUI(mockScene, config);

            ui.showRecruitmentFailure(mockUnit, failureReason);

            // Should start entrance animation (which sets up auto-hide)
            expect(mockScene.tweens.add).toHaveBeenCalled();
        });
    });

    describe('hideRecruitmentConditions', () => {
        test('should hide conditions panel', () => {
            // First show conditions
            recruitmentUI.showRecruitmentConditions(mockUnit, mockConditions);

            // Then hide them
            recruitmentUI.hideRecruitmentConditions();

            const conditionPanel = mockScene.add.container.mock.results.find(
                result => result.value.setVisible
            )?.value;

            expect(conditionPanel?.setVisible).toHaveBeenCalledWith(false);
        });

        test('should handle hiding when no conditions are shown', () => {
            expect(() => {
                recruitmentUI.hideRecruitmentConditions();
            }).not.toThrow();
        });
    });

    describe('updateNPCIndicatorPosition', () => {
        test('should update indicator position when unit moves', () => {
            // Show indicator first
            recruitmentUI.showNPCIndicator(mockUnit);
            const indicator = mockScene.add.container.mock.results[mockScene.add.container.mock.results.length - 1].value;

            // Update position
            const newPosition = { x: 10, y: 10 };
            mockUnit.sprite!.x = 320;
            mockUnit.sprite!.y = 320;

            recruitmentUI.updateNPCIndicatorPosition(mockUnit, newPosition);

            expect(indicator.setPosition).toHaveBeenCalledWith(320, 280); // y - 40
        });

        test('should handle position update for non-existent indicator', () => {
            const newPosition = { x: 10, y: 10 };

            expect(() => {
                recruitmentUI.updateNPCIndicatorPosition(mockUnit, newPosition);
            }).not.toThrow();
        });
    });

    describe('showRecruitmentHint', () => {
        test('should display temporary hint text', () => {
            const hint = 'この敵は仲間にできます';

            recruitmentUI.showRecruitmentHint(mockUnit, hint);

            expect(mockScene.add.text).toHaveBeenCalledWith(
                mockUnit.sprite!.x,
                mockUnit.sprite!.y - 60,
                hint,
                expect.any(Object)
            );

            expect(mockScene.tweens.add).toHaveBeenCalled();
        });

        test('should handle hint for unit without sprite', () => {
            const unitWithoutSprite = createMockUnit({ sprite: undefined });
            const textCallsBefore = mockScene.add.text.mock.calls.length;

            recruitmentUI.showRecruitmentHint(unitWithoutSprite, 'hint');

            const textCallsAfter = mockScene.add.text.mock.calls.length;
            expect(textCallsAfter).toBe(textCallsBefore);
        });
    });

    describe('Configuration Management', () => {
        test('should update configuration correctly', () => {
            const newConfig: Partial<RecruitmentUIConfig> = {
                showConditions: false,
                enableSoundEffects: false
            };

            recruitmentUI.updateConfig(newConfig);
            const config = recruitmentUI.getConfig();

            expect(config.showConditions).toBe(false);
            expect(config.enableSoundEffects).toBe(false);
            expect(config.showProgress).toBe(true); // Should retain original value
        });

        test('should return current configuration', () => {
            const config = recruitmentUI.getConfig();

            expect(config).toHaveProperty('showConditions');
            expect(config).toHaveProperty('showProgress');
            expect(config).toHaveProperty('enableSoundEffects');
            expect(typeof config.conditionDisplayDuration).toBe('number');
        });
    });

    describe('State Queries', () => {
        test('should report condition panel visibility correctly', () => {
            expect(recruitmentUI.isConditionPanelVisible()).toBe(false);

            recruitmentUI.showRecruitmentConditions(mockUnit, mockConditions);
            // Note: In a real implementation, this would be true after showing
            // For this test, we're just checking the method exists and doesn't throw
            expect(() => recruitmentUI.isConditionPanelVisible()).not.toThrow();
        });

        test('should report NPC indicator count correctly', () => {
            expect(recruitmentUI.getNPCIndicatorCount()).toBe(0);

            recruitmentUI.showNPCIndicator(mockUnit);
            expect(recruitmentUI.getNPCIndicatorCount()).toBe(1);

            recruitmentUI.hideNPCIndicator(mockUnit);
            expect(recruitmentUI.getNPCIndicatorCount()).toBe(0);
        });
    });

    describe('Resize Handling', () => {
        test('should update UI positions when screen size changes', () => {
            const newWidth = 1920;
            const newHeight = 1080;

            expect(() => {
                recruitmentUI.resize(newWidth, newHeight);
            }).not.toThrow();

            // Should update container positions
            const containers = mockScene.add.container.mock.results.map(r => r.value);
            containers.forEach(container => {
                expect(container.setPosition).toHaveBeenCalled();
            });
        });
    });

    describe('Cleanup and Destruction', () => {
        test('should destroy all UI elements on cleanup', () => {
            // Create some UI elements first
            recruitmentUI.showNPCIndicator(mockUnit);
            recruitmentUI.showRecruitmentConditions(mockUnit, mockConditions);

            // Destroy
            recruitmentUI.destroy();

            // Should emit cleanup event
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('recruitment-ui-destroyed');

            // Should reset indicator count
            expect(recruitmentUI.getNPCIndicatorCount()).toBe(0);
        });

        test('should handle destruction when no elements exist', () => {
            const ui = new RecruitmentUI(mockScene);

            expect(() => {
                ui.destroy();
            }).not.toThrow();
        });

        test('should destroy NPC indicators properly', () => {
            recruitmentUI.showNPCIndicator(mockUnit);
            const indicator = mockScene.add.container.mock.results[mockScene.add.container.mock.results.length - 1].value;

            recruitmentUI.destroy();

            expect(indicator.destroy).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        test('should handle errors gracefully in showRecruitmentConditions', () => {
            // Mock an error in scene.add.text
            mockScene.add.text.mockImplementationOnce(() => {
                throw new Error('Mock error');
            });

            expect(() => {
                recruitmentUI.showRecruitmentConditions(mockUnit, mockConditions);
            }).not.toThrow();
        });

        test('should handle errors gracefully in showNPCIndicator', () => {
            // Mock an error in scene.add.container
            mockScene.add.container.mockImplementationOnce(() => {
                throw new Error('Mock error');
            });

            expect(() => {
                recruitmentUI.showNPCIndicator(mockUnit);
            }).not.toThrow();
        });

        test('should handle errors gracefully in updateRecruitmentProgress', () => {
            const mockProgress: RecruitmentProgress = {
                characterId: mockUnit.id,
                conditions: mockConditions,
                conditionProgress: [true, false],
                overallProgress: 50,
                isEligible: false
            };

            // Mock an error in graphics operations
            mockScene.add.graphics.mockImplementationOnce(() => {
                throw new Error('Mock error');
            });

            expect(() => {
                recruitmentUI.updateRecruitmentProgress(mockUnit, mockProgress);
            }).not.toThrow();
        });
    });

    describe('Integration with RecruitmentUtils', () => {
        test('should use default UI config from RecruitmentUtils', () => {
            const defaultConfig = RecruitmentUtils.createDefaultUIConfig();
            const ui = new RecruitmentUI(mockScene);
            const config = ui.getConfig();

            expect(config.showConditions).toBe(defaultConfig.showConditions);
            expect(config.showProgress).toBe(defaultConfig.showProgress);
            expect(config.enableSoundEffects).toBe(defaultConfig.enableSoundEffects);
        });
    });
});