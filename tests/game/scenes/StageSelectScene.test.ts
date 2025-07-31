// Mock the StageButton class
const mockStageButton = jest.fn().mockImplementation((scene, x, y, stage, callback) => {
    return {
        scene,
        x,
        y,
        stage,
        callback,
        destroy: jest.fn(),
        getStage: jest.fn().mockReturnValue(stage),
        isUnlocked: jest.fn().mockReturnValue(stage.isUnlocked),
        getStageId: jest.fn().mockReturnValue(stage.id),
        getDifficulty: jest.fn().mockReturnValue(stage.difficulty)
    };
});

jest.mock('../../../game/src/ui/StageButton', () => ({
    StageButton: mockStageButton
}));

// Mock the MenuButton class
const mockMenuButton = jest.fn().mockImplementation((scene, x, y, text, callback) => {
    return {
        scene,
        x,
        y,
        text,
        callback,
        destroy: jest.fn()
    };
});

jest.mock('../../../game/src/ui/MenuButton', () => ({
    MenuButton: mockMenuButton
}));

// Mock Phaser Scene
jest.mock('phaser', () => ({
    Scene: class MockScene {
        constructor(config: any) { }
        add = {
            graphics: jest.fn().mockReturnValue({
                fillGradientStyle: jest.fn(),
                fillRect: jest.fn(),
                lineStyle: jest.fn(),
                lineBetween: jest.fn(),
                setDepth: jest.fn(),
                destroy: jest.fn()
            }),
            text: jest.fn().mockReturnValue({
                setOrigin: jest.fn().mockReturnThis(),
                destroy: jest.fn()
            }),
            container: jest.fn().mockReturnValue({
                add: jest.fn(),
                destroy: jest.fn()
            }),
            existing: jest.fn()
        };
        load = {
            json: jest.fn()
        };
        cache = {
            json: {
                get: jest.fn()
            }
        };
        cameras = {
            main: {
                fadeOut: jest.fn(),
                once: jest.fn()
            }
        };
        scene = {
            start: jest.fn()
        };
        game = {};
    }
}));

import { StageSelectScene } from '../../../game/src/scenes/StageSelectScene';
import { StageData } from '../../../game/src/types/StageData';

describe('StageSelectScene - Stage Selection Functionality', () => {
    let scene: StageSelectScene;
    let mockStageData: StageData[];

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock stage data
        mockStageData = [
            {
                id: 'stage-001',
                name: 'Forest Path',
                description: 'A peaceful introduction',
                isUnlocked: true,
                difficulty: 1,
                order: 1
            },
            {
                id: 'stage-002',
                name: 'Mountain Pass',
                description: 'Treacherous terrain',
                isUnlocked: false,
                difficulty: 2,
                order: 2
            },
            {
                id: 'stage-003',
                name: 'Dark Cave',
                description: 'Mysterious depths',
                isUnlocked: false,
                difficulty: 3,
                order: 3
            }
        ];

        // Create scene instance
        scene = new StageSelectScene();

        // Mock cache to return our test data
        scene.cache.json.get = jest.fn().mockReturnValue({
            stages: mockStageData
        });

        // Mock cameras for transitions
        scene.cameras.main.once = jest.fn().mockImplementation((event, callback) => {
            // Immediately call the callback for testing
            callback();
        });
    });

    describe('Stage Data Loading and Validation', () => {
        it('should load and validate stage data correctly', () => {
            scene.create();

            expect(scene.cache.json.get).toHaveBeenCalledWith('stagesData');
            expect(scene.getStageData()).toHaveLength(3);
            expect(scene.getStageCount()).toBe(3);
        });

        it('should handle invalid stage data gracefully', () => {
            const invalidStageData = [
                {
                    id: 'invalid-stage',
                    // Missing required fields
                    isUnlocked: true
                }
            ];

            scene.cache.json.get = jest.fn().mockReturnValue({
                stages: invalidStageData
            });

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            scene.create();

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Invalid stage data for invalid-stage')
            );

            consoleSpy.mockRestore();
        });

        it('should sort stages by order property', () => {
            const unorderedStages = [
                { ...mockStageData[2], order: 3 },
                { ...mockStageData[0], order: 1 },
                { ...mockStageData[1], order: 2 }
            ];

            scene.cache.json.get = jest.fn().mockReturnValue({
                stages: unorderedStages
            });

            scene.create();

            const loadedStages = scene.getStageData();
            expect(loadedStages[0].order).toBe(1);
            expect(loadedStages[1].order).toBe(2);
            expect(loadedStages[2].order).toBe(3);
        });
    });

    describe('Stage Button Creation', () => {
        it('should create StageButton components for each stage', () => {
            scene.create();

            expect(mockStageButton).toHaveBeenCalledTimes(3);

            // Check that buttons are created with correct parameters
            expect(mockStageButton).toHaveBeenCalledWith(
                scene,
                expect.any(Number), // x position
                expect.any(Number), // y position
                mockStageData[0],   // stage data
                expect.any(Function) // callback
            );
        });

        it('should limit stage buttons to maximum of 6', () => {
            // Create more than 6 stages
            const manyStages = Array.from({ length: 10 }, (_, i) => ({
                id: `stage-${i + 1}`,
                name: `Stage ${i + 1}`,
                description: `Description ${i + 1}`,
                isUnlocked: true,
                difficulty: 1,
                order: i + 1
            }));

            scene.cache.json.get = jest.fn().mockReturnValue({
                stages: manyStages
            });

            scene.create();

            // Should only create 6 buttons
            expect(mockStageButton).toHaveBeenCalledTimes(6);
        });
    });

    describe('Stage Selection Logic', () => {
        it('should handle stage selection for unlocked stages', () => {
            scene.create();

            // Get the callback function passed to the first StageButton
            const firstButtonCall = mockStageButton.mock.calls[0];
            const selectionCallback = firstButtonCall[4]; // 5th parameter is the callback

            // Mock console.log to verify logging
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            // Simulate stage selection
            selectionCallback(mockStageData[0]);

            expect(consoleSpy).toHaveBeenCalledWith(
                `Stage selected: ${mockStageData[0].name} (${mockStageData[0].id})`
            );
            expect(scene.cameras.main.fadeOut).toHaveBeenCalledWith(300, 0, 0, 0);
            expect(scene.scene.start).toHaveBeenCalledWith('TitleScene');

            consoleSpy.mockRestore();
        });

        it('should handle stage selection errors gracefully', () => {
            scene.create();

            // Mock cameras to throw an error
            scene.cameras.main.fadeOut = jest.fn().mockImplementation(() => {
                throw new Error('Camera error');
            });

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Get the callback and simulate selection
            const selectionCallback = mockStageButton.mock.calls[0][4];
            selectionCallback(mockStageData[0]);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Error handling stage selection:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Stage Availability Checking', () => {
        it('should correctly identify unlocked and locked stages', () => {
            scene.create();

            const stageData = scene.getStageData();

            // First stage should be unlocked
            expect(stageData[0].isUnlocked).toBe(true);

            // Other stages should be locked
            expect(stageData[1].isUnlocked).toBe(false);
            expect(stageData[2].isUnlocked).toBe(false);
        });

        it('should handle mixed unlock states correctly', () => {
            const mixedStages = [
                { ...mockStageData[0], isUnlocked: true },
                { ...mockStageData[1], isUnlocked: true },
                { ...mockStageData[2], isUnlocked: false }
            ];

            scene.cache.json.get = jest.fn().mockReturnValue({
                stages: mixedStages
            });

            scene.create();

            const stageData = scene.getStageData();
            expect(stageData[0].isUnlocked).toBe(true);
            expect(stageData[1].isUnlocked).toBe(true);
            expect(stageData[2].isUnlocked).toBe(false);
        });
    });

    describe('Grid Layout Calculation', () => {
        it('should calculate correct grid positions for stages', () => {
            scene.create();

            // Check positions of created buttons
            const calls = mockStageButton.mock.calls;

            // First button (0,0 in grid)
            // startX = 1920/2 - 320 = 640, startY = 1080/2 - 80 = 460
            expect(calls[0][1]).toBe(640); // x position
            expect(calls[0][2]).toBe(460); // y position

            // Second button (1,0 in grid)
            // x = startX + (1 * horizontalSpacing) = 640 + 320 = 960
            expect(calls[1][1]).toBe(960); // x position
            expect(calls[1][2]).toBe(460); // y position

            // Third button (2,0 in grid)
            // x = startX + (2 * horizontalSpacing) = 640 + 640 = 1280
            expect(calls[2][1]).toBe(1280); // x position
            expect(calls[2][2]).toBe(460); // y position
        });
    });

    describe('Error Handling', () => {
        it('should handle missing JSON data', () => {
            scene.cache.json.get = jest.fn().mockReturnValue(null);

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            scene.create();

            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to load stage data:',
                'Invalid JSON structure: missing stages array'
            );

            consoleSpy.mockRestore();
        });

        it('should handle JSON parsing errors', () => {
            scene.cache.json.get = jest.fn().mockImplementation(() => {
                throw new Error('JSON parse error');
            });

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            scene.create();

            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to load stage data:',
                expect.stringContaining('JSON parsing error')
            );

            consoleSpy.mockRestore();
        });

        it('should provide fallback stage data on error', () => {
            scene.cache.json.get = jest.fn().mockReturnValue({
                stages: [] // Empty stages array
            });

            scene.create();

            // Should have fallback stage
            expect(scene.getStageCount()).toBe(1);
            expect(scene.getStageData()[0].id).toBe('fallback-stage');
        });
    });

    describe('Scene Cleanup', () => {
        it('should cleanup resources when destroyed', () => {
            scene.create();

            const mockGraphics = scene.add.graphics();
            const mockText = scene.add.text(0, 0, 'test');

            scene.destroy();

            expect(mockGraphics.destroy).toHaveBeenCalled();
            expect(mockText.destroy).toHaveBeenCalled();
        });
    });

    describe('Public Interface', () => {
        it('should provide access to stage data through public methods', () => {
            scene.create();

            expect(scene.getStageData()).toEqual(mockStageData);
            expect(scene.getStageCount()).toBe(3);
        });

        it('should return a copy of stage data, not the original array', () => {
            scene.create();

            const returnedData = scene.getStageData();
            expect(returnedData).toEqual(mockStageData);
            expect(returnedData).not.toBe(mockStageData);
        });
    });
});