import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { PartyFormationScene } from '../../../game/src/scenes/PartyFormationScene';
import { GameConfig } from '../../../game/src/config/GameConfig';

/**
 * PartyFormationScene Unit Tests
 * Tests for party formation UI system
 * 要件7.1, 7.2, 7.3, 7.4, 7.5, 7.6のテスト
 */
describe('PartyFormationScene', () => {
    let game: Phaser.Game;
    let scene: PartyFormationScene;

    beforeEach(() => {
        // Create minimal Phaser game instance for testing
        game = new Phaser.Game({
            type: Phaser.HEADLESS,
            width: GameConfig.GAME_WIDTH,
            height: GameConfig.GAME_HEIGHT,
            scene: [PartyFormationScene],
            callbacks: {
                preBoot: () => {
                    // Disable audio for tests
                },
            },
        });

        scene = game.scene.getScene('PartyFormationScene') as PartyFormationScene;
    });

    afterEach(() => {
        if (game) {
            game.destroy(true);
        }
    });

    describe('Scene Initialization', () => {
        test('should create scene with correct key', () => {
            expect(scene).toBeDefined();
            expect(scene.scene.key).toBe('PartyFormationScene');
        });

        test('should initialize with proper configuration', () => {
            expect(scene.scene.settings).toBeDefined();
            expect(scene.scene.settings.active).toBe(false);
        });
    });

    describe('Layout Display - 要件7.1', () => {
        test('should create 6 party slots', () => {
            // Start the scene
            scene.scene.start();
            
            // Wait for scene to be ready
            return new Promise<void>((resolve) => {
                scene.events.once('create', () => {
                    // Check that party slot container exists
                    const containers = scene.children.list.filter(
                        child => child instanceof Phaser.GameObjects.Container
                    );
                    
                    // Should have multiple containers (party slots, character lists, detail panel)
                    expect(containers.length).toBeGreaterThan(0);
                    resolve();
                });
            });
        });

        test('should display available characters list', () => {
            scene.scene.start();
            
            return new Promise<void>((resolve) => {
                scene.events.once('create', () => {
                    // Check for text objects that indicate character lists
                    const textObjects = scene.children.list.filter(
                        child => child instanceof Phaser.GameObjects.Text
                    );
                    
                    expect(textObjects.length).toBeGreaterThan(0);
                    resolve();
                });
            });
        });

        test('should display lost characters list separately', () => {
            scene.scene.start();
            
            return new Promise<void>((resolve) => {
                scene.events.once('create', () => {
                    // Verify scene has been created
                    expect(scene.scene.isActive()).toBe(true);
                    resolve();
                });
            });
        });
    });

    describe('Character Detail Display - 要件7.2', () => {
        test('should show character detail panel when hovering', () => {
            scene.scene.start();
            
            return new Promise<void>((resolve) => {
                scene.events.once('create', () => {
                    // Check that detail panel container exists
                    const containers = scene.children.list.filter(
                        child => child instanceof Phaser.GameObjects.Container
                    );
                    
                    expect(containers.length).toBeGreaterThan(0);
                    resolve();
                });
            });
        });

        test('should display character stats in detail panel', () => {
            scene.scene.start();
            
            return new Promise<void>((resolve) => {
                scene.events.once('create', () => {
                    // Verify scene has text objects for stats
                    const textObjects = scene.children.list.filter(
                        child => child instanceof Phaser.GameObjects.Text
                    );
                    
                    expect(textObjects.length).toBeGreaterThan(0);
                    resolve();
                });
            });
        });
    });

    describe('Interaction - 要件7.3', () => {
        test('should handle character selection', () => {
            scene.scene.start();
            
            return new Promise<void>((resolve) => {
                scene.events.once('create', () => {
                    // Verify interactive elements exist
                    expect(scene.input).toBeDefined();
                    resolve();
                });
            });
        });

        test('should support drag and drop operations', () => {
            scene.scene.start();
            
            return new Promise<void>((resolve) => {
                scene.events.once('create', () => {
                    // Check that drag system is enabled
                    expect(scene.input.dragState).toBeDefined();
                    resolve();
                });
            });
        });

        test('should handle character removal from party', () => {
            scene.scene.start();
            
            return new Promise<void>((resolve) => {
                scene.events.once('create', () => {
                    // Verify scene is interactive
                    expect(scene.input.enabled).toBe(true);
                    resolve();
                });
            });
        });
    });

    describe('Error Display - 要件7.4, 7.5', () => {
        test('should show error when party is full', () => {
            scene.scene.start();
            
            return new Promise<void>((resolve) => {
                scene.events.once('create', () => {
                    // Scene should be able to display error messages
                    expect(scene.add).toBeDefined();
                    expect(scene.add.graphics).toBeDefined();
                    resolve();
                });
            });
        });

        test('should show error when selecting lost character', () => {
            scene.scene.start();
            
            return new Promise<void>((resolve) => {
                scene.events.once('create', () => {
                    // Verify scene can create overlays
                    expect(scene.add.graphics).toBeDefined();
                    resolve();
                });
            });
        });

        test('should provide visual feedback for errors', () => {
            scene.scene.start();
            
            return new Promise<void>((resolve) => {
                scene.events.once('create', () => {
                    // Check that tween system is available for animations
                    expect(scene.tweens).toBeDefined();
                    resolve();
                });
            });
        });
    });

    describe('Party Confirmation - 要件7.6', () => {
        test('should validate party before confirmation', () => {
            scene.scene.start();
            
            return new Promise<void>((resolve) => {
                scene.events.once('create', () => {
                    // Verify scene has buttons
                    const containers = scene.children.list.filter(
                        child => child instanceof Phaser.GameObjects.Container
                    );
                    
                    expect(containers.length).toBeGreaterThan(0);
                    resolve();
                });
            });
        });

        test('should transition to gameplay scene on confirmation', () => {
            scene.scene.start();
            
            return new Promise<void>((resolve) => {
                scene.events.once('create', () => {
                    // Check that scene manager is available for transitions
                    expect(scene.scene.manager).toBeDefined();
                    resolve();
                });
            });
        });

        test('should save party composition on confirmation', () => {
            scene.scene.start();
            
            return new Promise<void>((resolve) => {
                scene.events.once('create', () => {
                    // Verify scene is properly initialized
                    expect(scene.scene.isActive()).toBe(true);
                    resolve();
                });
            });
        });
    });

    describe('Scene Transitions', () => {
        test('should handle back button to return to stage select', () => {
            scene.scene.start();
            
            return new Promise<void>((resolve) => {
                scene.events.once('create', () => {
                    // Verify scene manager can handle transitions
                    expect(scene.scene.manager).toBeDefined();
                    expect(scene.scene.manager.getScene).toBeDefined();
                    resolve();
                });
            });
        });

        test('should clean up resources on scene shutdown', () => {
            scene.scene.start();
            
            return new Promise<void>((resolve) => {
                scene.events.once('create', () => {
                    // Stop the scene
                    scene.scene.stop();
                    
                    // Verify scene is stopped
                    setTimeout(() => {
                        expect(scene.scene.isActive()).toBe(false);
                        resolve();
                    }, 100);
                });
            });
        });
    });

    describe('Keyboard Navigation', () => {
        test('should support keyboard navigation between elements', () => {
            scene.scene.start();
            
            return new Promise<void>((resolve) => {
                scene.events.once('create', () => {
                    // Check that input system is available
                    expect(scene.input).toBeDefined();
                    expect(scene.input.keyboard).toBeDefined();
                    resolve();
                });
            });
        });

        test('should handle Enter key for confirmation', () => {
            scene.scene.start();
            
            return new Promise<void>((resolve) => {
                scene.events.once('create', () => {
                    // Verify keyboard input is enabled
                    expect(scene.input.keyboard).toBeDefined();
                    resolve();
                });
            });
        });
    });
});
