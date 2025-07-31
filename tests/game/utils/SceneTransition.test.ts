import * as Phaser from 'phaser';
import { SceneTransition, TransitionType, SceneData } from '../../../game/src/utils/SceneTransition';

// Mock Phaser scene for testing
class MockScene extends Phaser.Scene {
    public mockCamera: any;
    public mockTweens: any;
    public mockSceneManager: any;

    constructor(key: string) {
        super({ key });

        // Mock camera
        this.mockCamera = {
            fadeOut: jest.fn(),
            fadeIn: jest.fn(),
            setScroll: jest.fn(),
            setZoom: jest.fn(),
            once: jest.fn(),
            scrollX: 0,
            scrollY: 0,
            zoom: 1
        };

        // Mock tweens
        this.mockTweens = {
            add: jest.fn()
        };

        // Mock scene manager
        this.mockSceneManager = {
            keys: {
                'TitleScene': true,
                'ConfigScene': true,
                'StageSelectScene': true
            },
            start: jest.fn()
        };

        // Override Phaser properties with mocks
        (this as any).cameras = { main: this.mockCamera };
        (this as any).tweens = this.mockTweens;
        (this as any).scene = {
            key: key,
            manager: this.mockSceneManager,
            start: this.mockSceneManager.start
        };
        (this as any).game = {
            config: {
                width: 1920,
                height: 1080
            }
        };
    }
}

describe('SceneTransition', () => {
    let mockScene: MockScene;

    beforeEach(() => {
        mockScene = new MockScene('TestScene');
        jest.clearAllMocks();
    });

    describe('transitionTo', () => {
        it('should execute fade transition by default', async () => {
            // Arrange
            const toSceneKey = 'TitleScene';
            const sceneData = { test: 'data' };

            // Mock fade completion
            mockScene.mockCamera.once.mockImplementation((event: string, callback: () => void) => {
                if (event === 'camerafadeoutcomplete') {
                    setTimeout(callback, 0);
                }
            });

            // Act
            const transitionPromise = SceneTransition.transitionTo(
                mockScene,
                toSceneKey,
                TransitionType.FADE,
                sceneData
            );

            // Assert
            expect(mockScene.mockCamera.fadeOut).toHaveBeenCalledWith(500, 0, 0, 0);

            await transitionPromise;
            expect(mockScene.mockSceneManager.start).toHaveBeenCalledWith(toSceneKey, sceneData);
        });

        it('should execute slide transition correctly', async () => {
            // Arrange
            const toSceneKey = 'ConfigScene';

            // Mock tween completion
            mockScene.mockTweens.add.mockImplementation((config: any) => {
                setTimeout(() => config.onComplete(), 0);
            });

            // Act
            const transitionPromise = SceneTransition.transitionTo(
                mockScene,
                toSceneKey,
                TransitionType.SLIDE_LEFT
            );

            // Assert
            expect(mockScene.mockTweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: mockScene.mockCamera,
                    scrollX: -1920,
                    scrollY: 0,
                    duration: 500,
                    ease: 'Power2'
                })
            );

            await transitionPromise;
            expect(mockScene.mockSceneManager.start).toHaveBeenCalledWith(toSceneKey);
        });

        it('should execute zoom transition correctly', async () => {
            // Arrange
            const toSceneKey = 'StageSelectScene';

            // Mock tween completion
            mockScene.mockTweens.add.mockImplementation((config: any) => {
                setTimeout(() => config.onComplete(), 0);
            });

            // Act
            const transitionPromise = SceneTransition.transitionTo(
                mockScene,
                toSceneKey,
                TransitionType.ZOOM_IN
            );

            // Assert
            expect(mockScene.mockTweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: mockScene.mockCamera,
                    zoom: 2,
                    duration: 500,
                    ease: 'Back.easeIn'
                })
            );

            await transitionPromise;
            expect(mockScene.mockSceneManager.start).toHaveBeenCalledWith(toSceneKey);
        });

        it('should handle custom transition configuration', async () => {
            // Arrange
            const customConfig = {
                duration: 1000,
                color: 0xff0000
            };

            // Mock fade completion
            mockScene.mockCamera.once.mockImplementation((event: string, callback: () => void) => {
                if (event === 'camerafadeoutcomplete') {
                    setTimeout(callback, 0);
                }
            });

            // Act
            await SceneTransition.transitionTo(
                mockScene,
                'TitleScene',
                TransitionType.FADE,
                undefined,
                customConfig
            );

            // Assert
            expect(mockScene.mockCamera.fadeOut).toHaveBeenCalledWith(1000, 255, 0, 0);
        });

        it('should handle transition errors gracefully', async () => {
            // Arrange
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            mockScene.mockCamera.fadeOut.mockImplementation(() => {
                throw new Error('Camera error');
            });

            // Act & Assert
            await expect(
                SceneTransition.transitionTo(mockScene, 'TitleScene')
            ).rejects.toThrow('Camera error');

            expect(consoleSpy).toHaveBeenCalledWith(
                'Error during scene transition:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });
    });

    describe('fadeToScene', () => {
        it('should use fade transition with custom duration', async () => {
            // Arrange
            const duration = 750;

            // Mock fade completion
            mockScene.mockCamera.once.mockImplementation((event: string, callback: () => void) => {
                if (event === 'camerafadeoutcomplete') {
                    setTimeout(callback, 0);
                }
            });

            // Act
            await SceneTransition.fadeToScene(mockScene, 'TitleScene', undefined, duration);

            // Assert
            expect(mockScene.mockCamera.fadeOut).toHaveBeenCalledWith(duration, 0, 0, 0);
        });
    });

    describe('createEntranceTransition', () => {
        it('should create fade in transition', () => {
            // Act
            SceneTransition.createEntranceTransition(mockScene, TransitionType.FADE, 300);

            // Assert
            expect(mockScene.mockCamera.fadeIn).toHaveBeenCalledWith(300);
        });

        it('should create slide in transition', () => {
            // Act
            SceneTransition.createEntranceTransition(mockScene, TransitionType.SLIDE_LEFT, 400);

            // Assert
            expect(mockScene.mockCamera.setScroll).toHaveBeenCalledWith(1920, 0);
            expect(mockScene.mockTweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: mockScene.mockCamera,
                    scrollX: 0,
                    scrollY: 0,
                    duration: 400,
                    ease: 'Power2'
                })
            );
        });

        it('should create zoom in transition', () => {
            // Act
            SceneTransition.createEntranceTransition(mockScene, TransitionType.ZOOM_IN, 500);

            // Assert
            expect(mockScene.mockCamera.setZoom).toHaveBeenCalledWith(0.1);
            expect(mockScene.mockTweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: mockScene.mockCamera,
                    zoom: 1,
                    duration: 500,
                    ease: 'Back.easeOut'
                })
            );
        });

        it('should fallback to fade in on error', () => {
            // Arrange
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            mockScene.mockCamera.setZoom.mockImplementation(() => {
                throw new Error('Zoom error');
            });

            // Act
            SceneTransition.createEntranceTransition(mockScene, TransitionType.ZOOM_IN, 300);

            // Assert
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error creating entrance transition:',
                expect.any(Error)
            );
            expect(mockScene.mockCamera.fadeIn).toHaveBeenCalledWith(300);

            consoleSpy.mockRestore();
        });
    });

    describe('validateSceneKey', () => {
        it('should return true for existing scene', () => {
            // Act
            const result = SceneTransition.validateSceneKey(mockScene, 'TitleScene');

            // Assert
            expect(result).toBe(true);
        });

        it('should return false for non-existing scene', () => {
            // Act
            const result = SceneTransition.validateSceneKey(mockScene, 'NonExistentScene');

            // Assert
            expect(result).toBe(false);
        });

        it('should handle validation errors gracefully', () => {
            // Arrange
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            (mockScene as any).scene.manager = null;

            // Act
            const result = SceneTransition.validateSceneKey(mockScene, 'TitleScene');

            // Assert
            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error validating scene key:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });
    });

    describe('getAvailableScenes', () => {
        it('should return array of available scene keys', () => {
            // Act
            const scenes = SceneTransition.getAvailableScenes(mockScene);

            // Assert
            expect(scenes).toEqual(['TitleScene', 'ConfigScene', 'StageSelectScene']);
        });

        it('should handle errors gracefully', () => {
            // Arrange
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            (mockScene as any).scene.manager = null;

            // Act
            const scenes = SceneTransition.getAvailableScenes(mockScene);

            // Assert
            expect(scenes).toEqual([]);
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error getting available scenes:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });
    });

    describe('transition timing requirements', () => {
        it('should complete transitions within 500ms by default', async () => {
            // Arrange
            const startTime = Date.now();

            // Mock fade completion with realistic timing
            mockScene.mockCamera.once.mockImplementation((event: string, callback: () => void) => {
                if (event === 'camerafadeoutcomplete') {
                    setTimeout(callback, 500);
                }
            });

            // Act
            await SceneTransition.transitionTo(mockScene, 'TitleScene');
            const endTime = Date.now();

            // Assert - Allow some tolerance for test execution time
            expect(endTime - startTime).toBeLessThan(600);
        });

        it('should respect custom duration settings', async () => {
            // Arrange
            const customDuration = 250;
            const startTime = Date.now();

            // Mock fade completion with custom timing
            mockScene.mockCamera.once.mockImplementation((event: string, callback: () => void) => {
                if (event === 'camerafadeoutcomplete') {
                    setTimeout(callback, customDuration);
                }
            });

            // Act
            await SceneTransition.transitionTo(
                mockScene,
                'TitleScene',
                TransitionType.FADE,
                undefined,
                { duration: customDuration }
            );
            const endTime = Date.now();

            // Assert
            expect(endTime - startTime).toBeLessThan(350);
            expect(mockScene.mockCamera.fadeOut).toHaveBeenCalledWith(customDuration, 0, 0, 0);
        });
    });
});