import * as Phaser from 'phaser';
import { NavigableMenuButton } from '../../../game/src/ui/NavigableMenuButton';

// Mock Phaser scene for testing
class MockScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MockScene' });
    }
}

describe('NavigableMenuButton', () => {
    let scene: MockScene;
    let button: NavigableMenuButton;
    let mockCallback: jest.Mock;

    beforeEach(() => {
        // Create mock scene with required properties
        scene = {
            add: {
                existing: jest.fn(),
                rectangle: jest.fn().mockReturnValue({
                    setStrokeStyle: jest.fn().mockReturnThis(),
                    setVisible: jest.fn().mockReturnThis(),
                    setAlpha: jest.fn().mockReturnThis(),
                    destroy: jest.fn()
                }),
                text: jest.fn().mockReturnValue({
                    setOrigin: jest.fn().mockReturnThis(),
                    setText: jest.fn(),
                    destroy: jest.fn()
                })
            },
            tweens: {
                add: jest.fn()
            }
        } as any;

        mockCallback = jest.fn();

        // Mock the parent MenuButton constructor
        jest.spyOn(NavigableMenuButton.prototype as any, 'setupButton').mockImplementation(() => { });
        jest.spyOn(NavigableMenuButton.prototype as any, 'setupInteractions').mockImplementation(() => { });

        button = new NavigableMenuButton(
            scene,
            100,
            100,
            'Test Button',
            mockCallback,
            200,
            50,
            'test-button'
        );
    });

    afterEach(() => {
        button.destroy();
        jest.restoreAllMocks();
    });

    describe('NavigableElement Interface', () => {
        test('should implement NavigableElement interface', () => {
            expect(button.getId()).toBe('test-button');
            expect(button.getDisplayObject()).toBe(button);
            expect(button.isInteractive()).toBeDefined();
        });

        test('should generate ID if not provided', () => {
            const buttonWithoutId = new NavigableMenuButton(
                scene,
                100,
                100,
                'Another Button',
                mockCallback
            );

            expect(buttonWithoutId.getId()).toMatch(/menu-button-another-button-\d+/);
            buttonWithoutId.destroy();
        });

        test('should handle focus state', () => {
            expect(button.isFocusedState()).toBe(false);

            button.onFocus();
            expect(button.isFocusedState()).toBe(true);

            button.onBlur();
            expect(button.isFocusedState()).toBe(false);
        });

        test('should handle activation', () => {
            // Mock the emit method
            button.emit = jest.fn();

            button.onActivate();

            // Should trigger animation and emit pointerup event
            expect(scene.tweens.add).toHaveBeenCalled();

            // Simulate animation completion
            const tweenCall = (scene.tweens.add as jest.Mock).mock.calls[0][0];
            if (tweenCall.onComplete) {
                tweenCall.onComplete();
                expect(button.emit).toHaveBeenCalledWith('pointerup');
            }
        });
    });

    describe('Focus Visual Feedback', () => {
        test('should show focus overlay on focus', () => {
            const mockOverlay = {
                setVisible: jest.fn(),
                setAlpha: jest.fn()
            };

            // Mock the focus overlay
            (button as any).focusOverlay = mockOverlay;

            button.onFocus();

            expect(mockOverlay.setVisible).toHaveBeenCalledWith(true);
            expect(mockOverlay.setAlpha).toHaveBeenCalledWith(0);
            expect(scene.tweens.add).toHaveBeenCalled();
        });

        test('should hide focus overlay on blur', () => {
            const mockOverlay = {
                setVisible: jest.fn(),
                setAlpha: jest.fn()
            };

            // Mock the focus overlay and set focused state
            (button as any).focusOverlay = mockOverlay;
            (button as any).isFocused = true;

            button.onBlur();

            expect(scene.tweens.add).toHaveBeenCalled();

            // Simulate animation completion
            const tweenCall = (scene.tweens.add as jest.Mock).mock.calls[0][0];
            if (tweenCall.onComplete) {
                tweenCall.onComplete();
                expect(mockOverlay.setVisible).toHaveBeenCalledWith(false);
            }
        });
    });

    describe('Interactivity', () => {
        test('should be interactive by default', () => {
            // Mock input property
            button.input = { enabled: true } as any;

            expect(button.isInteractive()).toBe(true);
        });

        test('should not be interactive when disabled', () => {
            button.input = null;

            expect(button.isInteractive()).toBe(false);
        });

        test('should handle enabled state changes', () => {
            // Mock the parent setEnabled method
            const parentSetEnabled = jest.fn();
            Object.setPrototypeOf(button, { setEnabled: parentSetEnabled });

            // Mock focused state
            (button as any).isFocused = true;
            button.onBlur = jest.fn();

            button.setEnabled(false);

            expect(parentSetEnabled).toHaveBeenCalledWith(false);
            expect(button.onBlur).toHaveBeenCalled();
        });
    });

    describe('Element ID Management', () => {
        test('should allow setting element ID', () => {
            button.setElementId('new-id');
            expect(button.getId()).toBe('new-id');
        });
    });

    describe('Cleanup', () => {
        test('should cleanup focus state on destroy', () => {
            const mockOverlay = {
                destroy: jest.fn()
            };

            // Set up focused state
            (button as any).isFocused = true;
            (button as any).focusOverlay = mockOverlay;
            button.onBlur = jest.fn();

            button.destroy();

            expect(button.onBlur).toHaveBeenCalled();
            expect(mockOverlay.destroy).toHaveBeenCalled();
        });
    });

    describe('Keyboard Activation Animation', () => {
        test('should animate on activation', () => {
            button.emit = jest.fn();

            button.onActivate();

            // Should create scale animation
            expect(scene.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: button,
                    scaleX: 0.95,
                    scaleY: 0.95,
                    duration: 100,
                    yoyo: true
                })
            );
        });

        test('should only activate if interactive', () => {
            button.input = null; // Make non-interactive
            button.emit = jest.fn();

            button.onActivate();

            // Should not create animation or emit event
            expect(scene.tweens.add).not.toHaveBeenCalled();
        });
    });
});