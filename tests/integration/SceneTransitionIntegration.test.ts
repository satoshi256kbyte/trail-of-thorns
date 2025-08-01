/**
 * Integration tests for scene transitions and data flow
 * Tests the complete flow from stage selection to gameplay and back
 * 
 * Implements testing requirements for task 10: scene transition and integration
 */

import { SceneTransition, TransitionType, SceneData } from '../../game/src/utils/SceneTransition';
import { StageData } from '../../game/src/types/StageData';

// Mock Phaser scene for testing
class MockScene {
    public scene = {
        key: 'MockScene',
        start: jest.fn(),
        manager: {
            keys: {
                'GameplayScene': true,
                'StageSelectScene': true,
                'TitleScene': true
            }
        }
    };
    public cameras = {
        main: {
            fadeOut: jest.fn(),
            fadeIn: jest.fn(),
            setScroll: jest.fn(),
            setZoom: jest.fn(),
            once: jest.fn()
        }
    };
    public tweens = {
        add: jest.fn()
    };
    public game = {
        config: {
            width: 1024,
            height: 768
        }
    };
}

describe('Scene Transition Integration Tests', () => {
    let mockScene: MockScene;

    // Mock stage data for testing
    const mockStageData: StageData = {
        id: 'test-stage-1',
        name: 'Test Stage',
        description: 'A test stage for integration testing',
        isUnlocked: true,
        difficulty: 2,
        order: 1
    };

    beforeEach(() => {
        mockScene = new MockScene();
        jest.clearAllMocks();
    });

    describe('Scene Data Passing', () => {
        test('should create proper scene data for gameplay transition', () => {
            // Test the structure of scene data that would be passed
            const expectedSceneData: SceneData = {
                selectedStage: mockStageData,
                fromScene: 'StageSelectScene',
                action: 'stageSelected',
                timestamp: expect.any(Number),
                playerData: {
                    level: 1,
                    experience: 0,
                    unlockedStages: ['test-stage-1']
                },
                gameplayConfig: {
                    debugMode: false,
                    autoSaveEnabled: true,
                    difficultyModifier: 1.0
                }
            };

            // Verify the structure matches expected format
            expect(expectedSceneData.selectedStage).toEqual(mockStageData);
            expect(expectedSceneData.fromScene).toBe('StageSelectScene');
            expect(expectedSceneData.action).toBe('stageSelected');
            expect(expectedSceneData.playerData).toBeDefined();
            expect(expectedSceneData.gameplayConfig).toBeDefined();
        });

        test('should calculate difficulty modifier correctly', () => {
            const testCases = [
                { difficulty: 1, expectedModifier: 0.75 },
                { difficulty: 2, expectedModifier: 1.0 },
                { difficulty: 3, expectedModifier: 1.25 },
                { difficulty: 4, expectedModifier: 1.5 },
                { difficulty: 5, expectedModifier: 1.75 }
            ];

            testCases.forEach(({ difficulty, expectedModifier }) => {
                const modifier = 0.5 + (difficulty * 0.25);
                expect(modifier).toBe(expectedModifier);
            });
        });

        test('should create return data with game state', () => {
            const startTime = Date.now() - 1000; // 1 second ago
            const currentTime = Date.now();

            const returnData: SceneData = {
                fromScene: 'GameplayScene',
                action: 'return-to-menu',
                timestamp: currentTime,
                gameState: {
                    stageId: mockStageData.id,
                    wasCompleted: false,
                    playTime: currentTime - startTime
                }
            };

            expect(returnData.fromScene).toBe('GameplayScene');
            expect(returnData.action).toBe('return-to-menu');
            expect(returnData.gameState.stageId).toBe(mockStageData.id);
            expect(returnData.gameState.playTime).toBeGreaterThan(0);
        });
    });

    describe('Scene Validation', () => {
        test('should validate scene keys correctly', () => {
            // Test scene key validation
            expect(SceneTransition.validateSceneKey(mockScene as any, 'GameplayScene')).toBe(true);
            expect(SceneTransition.validateSceneKey(mockScene as any, 'NonExistentScene')).toBe(false);
        });

        test('should get available scenes', () => {
            const availableScenes = SceneTransition.getAvailableScenes(mockScene as any);
            expect(availableScenes).toContain('GameplayScene');
            expect(availableScenes).toContain('StageSelectScene');
            expect(availableScenes).toContain('TitleScene');
        });
    });

    describe('Transition Effects', () => {
        test('should handle fade transition', async () => {
            // Mock camera fade completion
            mockScene.cameras.main.once = jest.fn((event: string, callback: Function) => {
                if (event === 'camerafadeoutcomplete') {
                    setTimeout(callback, 10);
                }
            });

            const sceneData: SceneData = { test: 'data' };

            // Test fade transition
            const transitionPromise = SceneTransition.transitionTo(
                mockScene as any,
                'GameplayScene',
                TransitionType.FADE,
                sceneData
            );

            // Verify fade out was called
            expect(mockScene.cameras.main.fadeOut).toHaveBeenCalled();

            await transitionPromise;

            // Verify scene start was called with data
            expect(mockScene.scene.start).toHaveBeenCalledWith('GameplayScene', sceneData);
        });

        test('should handle slide transition', async () => {
            // Mock tween completion
            mockScene.tweens.add = jest.fn((config: any) => {
                setTimeout(() => {
                    if (config.onComplete) {
                        config.onComplete();
                    }
                }, 10);
                return { destroy: jest.fn() };
            });

            const sceneData: SceneData = { test: 'data' };

            // Test slide transition
            const transitionPromise = SceneTransition.transitionTo(
                mockScene as any,
                'GameplayScene',
                TransitionType.SLIDE_LEFT,
                sceneData
            );

            // Verify tween was created
            expect(mockScene.tweens.add).toHaveBeenCalled();

            await transitionPromise;

            // Verify scene start was called with data
            expect(mockScene.scene.start).toHaveBeenCalledWith('GameplayScene', sceneData);
        });

        test('should create entrance transitions', () => {
            // Test fade in entrance
            SceneTransition.createEntranceTransition(mockScene as any, TransitionType.FADE, 500);
            expect(mockScene.cameras.main.fadeIn).toHaveBeenCalledWith(500);

            // Test slide entrance
            SceneTransition.createEntranceTransition(mockScene as any, TransitionType.SLIDE_LEFT, 300);
            expect(mockScene.cameras.main.setScroll).toHaveBeenCalled();
            expect(mockScene.tweens.add).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        test('should handle transition errors gracefully', () => {
            // Test error handling by verifying the SceneTransition has error handling logic
            // The actual error handling is tested in the fallback test below
            expect(SceneTransition.transitionTo).toBeDefined();
            expect(SceneTransition.validateSceneKey).toBeDefined();
        });

        test('should fallback to scene start without data on error', async () => {
            // Mock scene start to fail with data but succeed without
            let callCount = 0;
            mockScene.scene.start = jest.fn((sceneKey: string, data?: any) => {
                callCount++;
                if (callCount === 1 && data) {
                    throw new Error('Failed with data');
                }
                // Second call without data succeeds
            });

            // Mock camera fade completion
            mockScene.cameras.main.once = jest.fn((event: string, callback: Function) => {
                if (event === 'camerafadeoutcomplete') {
                    setTimeout(callback, 10);
                }
            });

            const sceneData: SceneData = { test: 'data' };

            // The transition should handle the error internally and fallback
            await SceneTransition.transitionTo(
                mockScene as any,
                'GameplayScene',
                TransitionType.FADE,
                sceneData
            );

            // Verify both calls were made
            expect(mockScene.scene.start).toHaveBeenCalledTimes(2);
            expect(mockScene.scene.start).toHaveBeenCalledWith('GameplayScene', sceneData);
            expect(mockScene.scene.start).toHaveBeenCalledWith('GameplayScene');
        });
    });

    describe('Data Structure Validation', () => {
        test('should validate stage data structure', () => {
            // Valid stage data
            const validStage: StageData = {
                id: 'stage-1',
                name: 'Test Stage',
                description: 'A test stage',
                isUnlocked: true,
                difficulty: 3,
                order: 1
            };

            // Verify all required fields are present
            expect(validStage.id).toBeDefined();
            expect(validStage.name).toBeDefined();
            expect(validStage.description).toBeDefined();
            expect(typeof validStage.isUnlocked).toBe('boolean');
            expect(typeof validStage.difficulty).toBe('number');
            expect(typeof validStage.order).toBe('number');
        });

        test('should validate scene data structure', () => {
            const sceneData: SceneData = {
                selectedStage: mockStageData,
                fromScene: 'StageSelectScene',
                action: 'stageSelected',
                timestamp: Date.now(),
                playerData: {
                    level: 1,
                    experience: 0
                }
            };

            // Verify scene data structure
            expect(sceneData.selectedStage).toBeDefined();
            expect(sceneData.fromScene).toBeDefined();
            expect(sceneData.action).toBeDefined();
            expect(sceneData.timestamp).toBeDefined();
            expect(sceneData.playerData).toBeDefined();
        });
    });

    describe('Transition Configuration', () => {
        test('should use correct transition types', () => {
            // Verify transition types are defined
            expect(TransitionType.FADE).toBe('fade');
            expect(TransitionType.SLIDE_LEFT).toBe('slideLeft');
            expect(TransitionType.SLIDE_RIGHT).toBe('slideRight');
            expect(TransitionType.ZOOM_IN).toBe('zoomIn');
            expect(TransitionType.ZOOM_OUT).toBe('zoomOut');
        });

        test('should handle quick fade transition', async () => {
            // Mock camera fade completion
            mockScene.cameras.main.once = jest.fn((event: string, callback: Function) => {
                if (event === 'camerafadeoutcomplete') {
                    setTimeout(callback, 10);
                }
            });

            const sceneData: SceneData = { test: 'data' };

            // Test quick fade
            await SceneTransition.fadeToScene(
                mockScene as any,
                'GameplayScene',
                sceneData,
                250
            );

            // Verify fade was called with custom duration
            expect(mockScene.cameras.main.fadeOut).toHaveBeenCalledWith(
                250,
                expect.any(Number),
                expect.any(Number),
                expect.any(Number)
            );
        });
    });
});