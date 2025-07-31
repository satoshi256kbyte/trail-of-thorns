import * as Phaser from 'phaser';
import { TitleScene } from '../../../game/src/scenes/TitleScene';
import { ConfigScene } from '../../../game/src/scenes/ConfigScene';
import { StageSelectScene } from '../../../game/src/scenes/StageSelectScene';
import { KeyboardNavigationManager } from '../../../game/src/utils/KeyboardNavigationManager';

// Mock Phaser Game for testing
class MockGame extends Phaser.Game {
    constructor() {
        super({
            type: Phaser.HEADLESS,
            width: 1920,
            height: 1080,
            scene: []
        });
    }
}

describe('Keyboard Navigation Integration', () => {
    let game: MockGame;

    beforeAll(() => {
        // Mock Phaser dependencies
        global.Phaser = Phaser;
        game = new MockGame();
    });

    afterAll(() => {
        if (game) {
            game.destroy(true);
        }
    });

    describe('TitleScene Keyboard Navigation', () => {
        let titleScene: TitleScene;

        beforeEach(() => {
            titleScene = new TitleScene();

            // Mock scene dependencies
            titleScene.add = {
                existing: jest.fn(),
                text: jest.fn().mockReturnValue({
                    setOrigin: jest.fn().mockReturnThis(),
                    destroy: jest.fn()
                }),
                graphics: jest.fn().mockReturnValue({
                    fillGradientStyle: jest.fn(),
                    fillRect: jest.fn(),
                    lineStyle: jest.fn(),
                    lineBetween: jest.fn(),
                    setDepth: jest.fn().mockReturnThis(),
                    destroy: jest.fn()
                })
            } as any;

            titleScene.tweens = {
                add: jest.fn()
            } as any;

            titleScene.input = {
                keyboard: {
                    addKey: jest.fn().mockReturnValue({
                        on: jest.fn()
                    })
                }
            } as any;

            titleScene.cameras = {
                main: {
                    fadeIn: jest.fn()
                }
            } as any;
        });

        afterEach(() => {
            if (titleScene) {
                titleScene.destroy();
            }
        });

        test('should initialize keyboard navigation with menu buttons', () => {
            titleScene.create();

            // Should have created keyboard navigation manager
            const keyboardNav = (titleScene as any).keyboardNavigation;
            expect(keyboardNav).toBeInstanceOf(KeyboardNavigationManager);

            // Should have added navigable elements
            const elements = keyboardNav.getNavigableElements();
            expect(elements.length).toBeGreaterThan(0);

            // Should have game start and config buttons
            const elementIds = elements.map((el: any) => el.getId());
            expect(elementIds).toContain('title-game-start-button');
            expect(elementIds).toContain('title-config-button');
        });

        test('should focus first button by default', () => {
            titleScene.create();

            const keyboardNav = (titleScene as any).keyboardNavigation;
            const focusedElement = keyboardNav.getCurrentFocusedElement();

            expect(focusedElement).toBeDefined();
            expect(focusedElement.getId()).toBe('title-game-start-button');
        });

        test('should cleanup keyboard navigation on destroy', () => {
            titleScene.create();

            const keyboardNav = (titleScene as any).keyboardNavigation;
            keyboardNav.destroy = jest.fn();

            titleScene.destroy();

            expect(keyboardNav.destroy).toHaveBeenCalled();
        });
    });

    describe('ConfigScene Keyboard Navigation', () => {
        let configScene: ConfigScene;

        beforeEach(() => {
            configScene = new ConfigScene();

            // Mock scene dependencies
            configScene.add = {
                existing: jest.fn(),
                text: jest.fn().mockReturnValue({
                    setOrigin: jest.fn().mockReturnThis(),
                    setText: jest.fn(),
                    destroy: jest.fn()
                }),
                graphics: jest.fn().mockReturnValue({
                    fillGradientStyle: jest.fn(),
                    fillRect: jest.fn(),
                    setDepth: jest.fn().mockReturnThis(),
                    destroy: jest.fn()
                }),
                rectangle: jest.fn().mockReturnValue({
                    setStrokeStyle: jest.fn().mockReturnThis(),
                    setInteractive: jest.fn().mockReturnThis(),
                    setFillStyle: jest.fn(),
                    setVisible: jest.fn().mockReturnThis(),
                    setAlpha: jest.fn().mockReturnThis(),
                    on: jest.fn(),
                    destroy: jest.fn()
                })
            } as any;

            configScene.tweens = {
                add: jest.fn()
            } as any;

            configScene.input = {
                keyboard: {
                    addKey: jest.fn().mockReturnValue({
                        on: jest.fn()
                    })
                }
            } as any;

            configScene.cameras = {
                main: {
                    fadeIn: jest.fn()
                }
            } as any;
        });

        afterEach(() => {
            if (configScene) {
                configScene.destroy();
            }
        });

        test('should initialize keyboard navigation with config controls', () => {
            configScene.create();

            const keyboardNav = (configScene as any).keyboardNavigation;
            expect(keyboardNav).toBeInstanceOf(KeyboardNavigationManager);

            // Should have added all config controls
            const elements = keyboardNav.getNavigableElements();
            expect(elements.length).toBeGreaterThanOrEqual(4); // 3 sliders + 1 toggle + back button
        });

        test('should include all config elements in navigation order', () => {
            configScene.create();

            const keyboardNav = (configScene as any).keyboardNavigation;
            const elements = keyboardNav.getNavigableElements();

            // Should have volume sliders, fullscreen toggle, and back button
            expect(elements.length).toBeGreaterThanOrEqual(5);

            // Last element should be back button
            const lastElement = elements[elements.length - 1];
            expect(lastElement.getId()).toBe('config-back-button');
        });
    });

    describe('StageSelectScene Keyboard Navigation', () => {
        let stageSelectScene: StageSelectScene;

        beforeEach(() => {
            stageSelectScene = new StageSelectScene();

            // Mock scene dependencies
            stageSelectScene.add = {
                existing: jest.fn(),
                text: jest.fn().mockReturnValue({
                    setOrigin: jest.fn().mockReturnThis(),
                    destroy: jest.fn()
                }),
                graphics: jest.fn().mockReturnValue({
                    fillGradientStyle: jest.fn(),
                    fillRect: jest.fn(),
                    lineStyle: jest.fn(),
                    lineBetween: jest.fn(),
                    setDepth: jest.fn().mockReturnThis(),
                    setVisible: jest.fn().mockReturnThis(),
                    clear: jest.fn(),
                    strokeRoundedRect: jest.fn(),
                    setAlpha: jest.fn(),
                    destroy: jest.fn()
                })
            } as any;

            stageSelectScene.tweens = {
                add: jest.fn()
            } as any;

            stageSelectScene.input = {
                keyboard: {
                    addKey: jest.fn().mockReturnValue({
                        on: jest.fn()
                    })
                }
            } as any;

            stageSelectScene.load = {
                json: jest.fn()
            } as any;

            stageSelectScene.cache = {
                json: {
                    get: jest.fn().mockReturnValue({
                        stages: [
                            {
                                id: 'stage-1',
                                name: 'Test Stage 1',
                                description: 'First test stage',
                                isUnlocked: true,
                                difficulty: 1,
                                order: 1
                            },
                            {
                                id: 'stage-2',
                                name: 'Test Stage 2',
                                description: 'Second test stage',
                                isUnlocked: false,
                                difficulty: 2,
                                order: 2
                            }
                        ]
                    })
                }
            } as any;

            stageSelectScene.cameras = {
                main: {
                    fadeIn: jest.fn()
                }
            } as any;
        });

        afterEach(() => {
            if (stageSelectScene) {
                stageSelectScene.destroy();
            }
        });

        test('should initialize keyboard navigation with stage buttons', () => {
            stageSelectScene.preload();
            stageSelectScene.create();

            const keyboardNav = (stageSelectScene as any).keyboardNavigation;
            expect(keyboardNav).toBeInstanceOf(KeyboardNavigationManager);

            // Should have stage buttons and back button
            const elements = keyboardNav.getNavigableElements();
            expect(elements.length).toBeGreaterThan(0);
        });

        test('should include stage buttons in navigation order', () => {
            stageSelectScene.preload();
            stageSelectScene.create();

            const keyboardNav = (stageSelectScene as any).keyboardNavigation;
            const elements = keyboardNav.getNavigableElements();

            // Should have stage buttons first, then back button
            const stageButtonElements = elements.filter((el: any) =>
                el.getId().startsWith('stage-button-')
            );
            const backButtonElements = elements.filter((el: any) =>
                el.getId() === 'stage-select-back-button'
            );

            expect(stageButtonElements.length).toBeGreaterThan(0);
            expect(backButtonElements.length).toBe(1);
        });

        test('should handle empty stage data gracefully', () => {
            // Mock empty stage data
            stageSelectScene.cache = {
                json: {
                    get: jest.fn().mockReturnValue({ stages: [] })
                }
            } as any;

            stageSelectScene.preload();
            stageSelectScene.create();

            const keyboardNav = (stageSelectScene as any).keyboardNavigation;
            const elements = keyboardNav.getNavigableElements();

            // Should still have back button even with no stages
            expect(elements.length).toBeGreaterThanOrEqual(1);
            expect(elements.some((el: any) => el.getId() === 'stage-select-back-button')).toBe(true);
        });
    });

    describe('Cross-Scene Navigation Consistency', () => {
        test('should maintain consistent keyboard navigation patterns', () => {
            const scenes = [
                new TitleScene(),
                new ConfigScene(),
                new StageSelectScene()
            ];

            scenes.forEach(scene => {
                // Mock common dependencies
                scene.add = {
                    existing: jest.fn(),
                    text: jest.fn().mockReturnValue({
                        setOrigin: jest.fn().mockReturnThis(),
                        setText: jest.fn(),
                        destroy: jest.fn()
                    }),
                    graphics: jest.fn().mockReturnValue({
                        fillGradientStyle: jest.fn(),
                        fillRect: jest.fn(),
                        lineStyle: jest.fn(),
                        lineBetween: jest.fn(),
                        setDepth: jest.fn().mockReturnThis(),
                        setVisible: jest.fn().mockReturnThis(),
                        clear: jest.fn(),
                        strokeRoundedRect: jest.fn(),
                        setAlpha: jest.fn(),
                        destroy: jest.fn()
                    }),
                    rectangle: jest.fn().mockReturnValue({
                        setStrokeStyle: jest.fn().mockReturnThis(),
                        setInteractive: jest.fn().mockReturnThis(),
                        setFillStyle: jest.fn(),
                        setVisible: jest.fn().mockReturnThis(),
                        setAlpha: jest.fn().mockReturnThis(),
                        on: jest.fn(),
                        destroy: jest.fn()
                    })
                } as any;

                scene.tweens = { add: jest.fn() } as any;
                scene.input = {
                    keyboard: {
                        addKey: jest.fn().mockReturnValue({ on: jest.fn() })
                    }
                } as any;
                scene.cameras = {
                    main: {
                        fadeIn: jest.fn()
                    }
                } as any;

                if (scene instanceof StageSelectScene) {
                    scene.load = { json: jest.fn() } as any;
                    scene.cache = {
                        json: {
                            get: jest.fn().mockReturnValue({ stages: [] })
                        }
                    } as any;
                    scene.preload();
                }

                scene.create();

                // Each scene should have keyboard navigation
                const keyboardNav = (scene as any).keyboardNavigation;
                expect(keyboardNav).toBeInstanceOf(KeyboardNavigationManager);
                expect(keyboardNav.isNavigationEnabled()).toBe(true);

                scene.destroy();
            });
        });
    });
});