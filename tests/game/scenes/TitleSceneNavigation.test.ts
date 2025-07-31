// Mock Phaser before importing TitleScene
const mockAdd = {
    text: jest.fn().mockReturnValue({
        setOrigin: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
    }),
    graphics: jest.fn().mockReturnValue({
        fillGradientStyle: jest.fn(),
        fillRect: jest.fn(),
        lineStyle: jest.fn(),
        lineBetween: jest.fn(),
        setDepth: jest.fn(),
        destroy: jest.fn(),
    }),
    existing: jest.fn(),
};

const mockTweens = {
    add: jest.fn(),
};

const mockCameras = {
    main: {
        fadeOut: jest.fn(),
        once: jest.fn(),
    },
};

const mockSceneManager = {
    start: jest.fn(),
};

jest.mock('phaser', () => ({
    Scene: jest.fn().mockImplementation(function (this: any, config: any) {
        this.scene = { key: config.key, start: mockSceneManager.start };
        this.add = mockAdd;
        this.tweens = mockTweens;
        this.cameras = mockCameras;
        return this;
    }),
}));

// Mock MenuButton
jest.mock('../../../game/src/ui/MenuButton', () => {
    return {
        MenuButton: jest.fn().mockImplementation((scene, x, y, text, callback) => {
            return {
                scene,
                x,
                y,
                text,
                callback,
                destroy: jest.fn(),
            };
        }),
    };
});

// Mock GameConfig
jest.mock('../../../game/src/config/GameConfig', () => ({
    GameConfig: {
        GAME_WIDTH: 1920,
        GAME_HEIGHT: 1080,
    },
}));

import { TitleScene } from '../../../game/src/scenes/TitleScene';
import { MenuButton } from '../../../game/src/ui/MenuButton';

/**
 * Tests for TitleScene navigation functionality
 * Covers button creation, positioning, and scene transitions
 */
describe('TitleScene Navigation', () => {
    let titleScene: TitleScene;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        titleScene = new TitleScene();
    });

    describe('Button Creation', () => {
        test('should create Game Start button with correct parameters', () => {
            titleScene.create();

            expect(MenuButton).toHaveBeenCalledWith(
                titleScene,
                960, // GAME_WIDTH / 2
                648, // GAME_HEIGHT * 0.6
                'Game Start',
                expect.any(Function),
                220,
                60
            );
        });

        test('should create Config button with correct parameters', () => {
            titleScene.create();

            expect(MenuButton).toHaveBeenCalledWith(
                titleScene,
                960, // GAME_WIDTH / 2
                728, // GAME_HEIGHT * 0.6 + 80
                'Config',
                expect.any(Function),
                220,
                60
            );
        });

        test('should create both navigation buttons', () => {
            titleScene.create();

            expect(MenuButton).toHaveBeenCalledTimes(2);
        });
    });

    describe('Button Positioning', () => {
        test('should position buttons in the center horizontally', () => {
            titleScene.create();

            const calls = (MenuButton as jest.Mock).mock.calls;
            calls.forEach(call => {
                expect(call[1]).toBe(960); // x position should be center
            });
        });

        test('should position buttons with proper vertical spacing', () => {
            titleScene.create();

            const calls = (MenuButton as jest.Mock).mock.calls;
            const gameStartY = calls[0][2]; // y position of first button
            const configY = calls[1][2]; // y position of second button

            expect(configY - gameStartY).toBe(80); // 80px spacing
        });

        test('should position buttons in lower half of screen', () => {
            titleScene.create();

            const calls = (MenuButton as jest.Mock).mock.calls;
            calls.forEach(call => {
                expect(call[2]).toBeGreaterThan(540); // Greater than GAME_HEIGHT / 2
            });
        });
    });

    describe('Scene Transitions', () => {
        test('should handle Game Start button click with fade transition', () => {
            titleScene.create();

            // Get the callback function for Game Start button
            const gameStartCallback = (MenuButton as jest.Mock).mock.calls[0][4];

            // Execute the callback
            gameStartCallback();

            expect(mockCameras.main.fadeOut).toHaveBeenCalledWith(300, 0, 0, 0);
            expect(mockCameras.main.once).toHaveBeenCalledWith(
                'camerafadeoutcomplete',
                expect.any(Function)
            );
        });

        test('should transition to StageSelectScene after Game Start fade', () => {
            titleScene.create();

            // Get the callback function for Game Start button
            const gameStartCallback = (MenuButton as jest.Mock).mock.calls[0][4];

            // Execute the callback
            gameStartCallback();

            // Get the fade complete callback and execute it
            const fadeCompleteCallback = mockCameras.main.once.mock.calls[0][1];
            fadeCompleteCallback();

            expect(mockSceneManager.start).toHaveBeenCalledWith('StageSelectScene');
        });

        test('should handle Config button click with fade transition', () => {
            titleScene.create();

            // Get the callback function for Config button
            const configCallback = (MenuButton as jest.Mock).mock.calls[1][4];

            // Execute the callback
            configCallback();

            expect(mockCameras.main.fadeOut).toHaveBeenCalledWith(300, 0, 0, 0);
            expect(mockCameras.main.once).toHaveBeenCalledWith(
                'camerafadeoutcomplete',
                expect.any(Function)
            );
        });

        test('should transition to ConfigScene after Config fade', () => {
            titleScene.create();

            // Get the callback function for Config button
            const configCallback = (MenuButton as jest.Mock).mock.calls[1][4];

            // Execute the callback
            configCallback();

            // Get the fade complete callback and execute it
            const fadeCompleteCallback = mockCameras.main.once.mock.calls[0][1];
            fadeCompleteCallback();

            expect(mockSceneManager.start).toHaveBeenCalledWith('ConfigScene');
        });
    });

    describe('Requirements Compliance', () => {
        test('should satisfy requirement 2.1: Show Game Start button', () => {
            titleScene.create();

            const gameStartCall = (MenuButton as jest.Mock).mock.calls.find(
                call => call[3] === 'Game Start'
            );
            expect(gameStartCall).toBeDefined();
        });

        test('should satisfy requirement 2.2: Transition to stage selection', () => {
            titleScene.create();

            const gameStartCallback = (MenuButton as jest.Mock).mock.calls[0][4];
            gameStartCallback();

            const fadeCompleteCallback = mockCameras.main.once.mock.calls[0][1];
            fadeCompleteCallback();

            expect(mockSceneManager.start).toHaveBeenCalledWith('StageSelectScene');
        });

        test('should satisfy requirement 3.1: Show Config button', () => {
            titleScene.create();

            const configCall = (MenuButton as jest.Mock).mock.calls.find(
                call => call[3] === 'Config'
            );
            expect(configCall).toBeDefined();
        });

        test('should satisfy requirement 3.2: Display configuration menu', () => {
            titleScene.create();

            const configCallback = (MenuButton as jest.Mock).mock.calls[1][4];
            configCallback();

            const fadeCompleteCallback = mockCameras.main.once.mock.calls[0][1];
            fadeCompleteCallback();

            expect(mockSceneManager.start).toHaveBeenCalledWith('ConfigScene');
        });
    });

    describe('Error Handling', () => {
        test('should handle button creation errors gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            (MenuButton as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Button creation failed');
            });

            expect(() => titleScene.create()).not.toThrow();
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error creating navigation buttons:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });

        test('should handle Game Start transition errors gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            mockCameras.main.fadeOut.mockImplementationOnce(() => {
                throw new Error('Fade transition failed');
            });

            titleScene.create();
            const gameStartCallback = (MenuButton as jest.Mock).mock.calls[0][4];

            expect(() => gameStartCallback()).not.toThrow();
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error handling game start:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });

        test('should handle Config transition errors gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            mockCameras.main.fadeOut.mockImplementationOnce(() => {
                throw new Error('Fade transition failed');
            });

            titleScene.create();
            const configCallback = (MenuButton as jest.Mock).mock.calls[1][4];

            expect(() => configCallback()).not.toThrow();
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error handling config:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Cleanup', () => {
        test('should destroy navigation buttons on scene cleanup', () => {
            titleScene.create();

            // Get the created button instances from the mock calls
            const buttonInstances = (MenuButton as jest.Mock).mock.results.map(
                result => result.value
            );

            titleScene.destroy();

            buttonInstances.forEach(button => {
                expect(button.destroy).toHaveBeenCalled();
            });
        });

        test('should handle cleanup when buttons are undefined', () => {
            // Don't call create() so buttons remain undefined
            expect(() => titleScene.destroy()).not.toThrow();
        });
    });
});