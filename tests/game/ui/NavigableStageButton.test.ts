import * as Phaser from 'phaser';
import { NavigableStageButton } from '../../../game/src/ui/NavigableStageButton';
import { StageData } from '../../../game/src/types/StageData';

// Mock Phaser scene for testing
class MockScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MockScene' });
    }
}

describe('NavigableStageButton', () => {
    let scene: MockScene;
    let button: NavigableStageButton;
    let mockCallback: jest.Mock;
    let mockStageData: StageData;

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
                    setColor: jest.fn(),
                    destroy: jest.fn()
                })
            },
            tweens: {
                add: jest.fn()
            }
        } as any;

        mockCallback = jest.fn();
        mockStageData = {
            id: 'test-stage',
            name: 'Test Stage',
            description: 'A test stage',
            isUnlocked: true,
            difficulty: 2,
            order: 1
        };

        // Mock the parent StageButton constructor
        jest.spyOn(NavigableStageButton.prototype as any, 'createButton').mockImplementation(() => { });
        jest.spyOn(NavigableStageButton.prototype as any, 'setupInteractivity').mockImplementation(() => { });

        button = new NavigableStageButton(
            scene,
            100,
            100,
            mockStageData,
            mockCallback,
            'test-stage-button'
        );
    });

    afterEach(() => {
        button.destroy();
        jest.restoreAllMocks();
    });

    describe('NavigableElement Interface', () => {
        test('should implement NavigableElement interface', () => {
            expect(button.getId()).toBe('test-stage-button');
            expect(button.getDisplayObject()).toBe(button);
            expect(button.isInteractive()).toBeDefined();
        });

        test('should generate ID if not provided', () => {
            const buttonWithoutId = new NavigableStageButton(
                scene,
                100,
                100,
                mockStageData,
                mockCallback
            );

            expect(buttonWithoutId.getId()).toMatch(/stage-button-test-stage-\d+/);
            buttonWithoutId.destroy();
        });

        test('should handle focus state', () => {
            expect(button.isFocusedState()).toBe(false);

            button.onFocus();
            expect(button.isFocusedState()).toBe(true);

            button.onBlur();
            expect(button.isFocusedState()).toBe(false);
        });
    });

    describe('Focus Visual Feedback', () => {
        test('should show enhanced focus effects for unlocked stages', () => {
            const mockOverlay = {
                setVisible: jest.fn(),
                setAlpha: jest.fn()
            };

            // Mock the focus overlay and unlocked state
            (button as any).focusOverlay = mockOverlay;
            button.isUnlocked = jest.fn().mockReturnValue(true);

            button.onFocus();

            expect(mockOverlay.setVisible).toHaveBeenCalledWith(true);
            expect(scene.tweens.add).toHaveBeenCalledTimes(2); // Overlay fade + scale animation
        });

        test('should show basic focus effects for locked stages', () => {
            const mockOverlay = {
                setVisible: jest.fn(),
                setAlpha: jest.fn()
            };

            // Mock the focus overlay and locked state
            (button as any).focusOverlay = mockOverlay;
            button.isUnlocked = jest.fn().mockReturnValue(false);

            button.onFocus();

            expect(mockOverlay.setVisible).toHaveBeenCalledWith(true);
            expect(scene.tweens.add).toHaveBeenCalledTimes(1); // Only overlay fade, no scale
        });

        test('should hide focus overlay and reset scale on blur', () => {
            const mockOverlay = {
                setVisible: jest.fn(),
                setAlpha: jest.fn()
            };

            // Mock the focus overlay and set focused state
            (button as any).focusOverlay = mockOverlay;
            (button as any).isFocused = true;

            button.onBlur();

            expect(scene.tweens.add).toHaveBeenCalledTimes(2); // Overlay fade + scale reset
        });
    });

    describe('Activation Behavior', () => {
        test('should activate unlocked stage', () => {
            button.isInteractive = jest.fn().mockReturnValue(true);
            button.getStage = jest.fn().mockReturnValue(mockStageData);
            button.emit = jest.fn();

            button.onActivate();

            expect(scene.tweens.add).toHaveBeenCalled();

            // Simulate animation completion
            const tweenCall = (scene.tweens.add as jest.Mock).mock.calls[0][0];
            if (tweenCall.onComplete) {
                tweenCall.onComplete();
                expect(button.emit).toHaveBeenCalledWith('stage-selected', mockStageData);
            }
        });

        test('should show locked feedback for locked stage', () => {
            button.isInteractive = jest.fn().mockReturnValue(false);
            button.getStage = jest.fn().mockReturnValue({ ...mockStageData, isUnlocked: false });

            // Mock the x property for shake animation
            Object.defineProperty(button, 'x', {
                value: 100,
                writable: true
            });

            button.onActivate();

            // Should create shake animation
            expect(scene.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: button,
                    x: 95, // x - 5
                    duration: 50,
                    yoyo: true,
                    repeat: 3
                })
            );
        });
    });

    describe('Interactivity', () => {
        test('should be interactive when stage is unlocked', () => {
            button.isUnlocked = jest.fn().mockReturnValue(true);
            expect(button.isInteractive()).toBe(true);
        });

        test('should not be interactive when stage is locked', () => {
            button.isUnlocked = jest.fn().mockReturnValue(false);
            expect(button.isInteractive()).toBe(false);
        });
    });

    describe('Stage Data Management', () => {
        test('should update element ID when stage data changes', () => {
            const newStageData = { ...mockStageData, id: 'new-stage-id' };

            // Mock parent updateStage method
            const parentUpdateStage = jest.fn();
            Object.setPrototypeOf(button, { updateStage: parentUpdateStage });

            button.updateStage(newStageData);

            expect(parentUpdateStage).toHaveBeenCalledWith(newStageData);
            expect(button.getId()).toMatch(/stage-button-new-stage-id-\d+/);
        });

        test('should handle focus state when stage becomes locked', () => {
            // Set up focused state on interactive stage
            (button as any).isFocused = true;
            button.isInteractive = jest.fn()
                .mockReturnValueOnce(true)  // Was interactive
                .mockReturnValue(false);    // Now not interactive
            button.onBlur = jest.fn();

            // Mock parent updateStage method
            const parentUpdateStage = jest.fn();
            Object.setPrototypeOf(button, { updateStage: parentUpdateStage });

            const lockedStageData = { ...mockStageData, isUnlocked: false };
            button.updateStage(lockedStageData);

            expect(button.onBlur).toHaveBeenCalled();
        });
    });

    describe('Accessibility', () => {
        test('should provide accessibility information', () => {
            button.getStage = jest.fn().mockReturnValue(mockStageData);

            const accessibilityInfo = button.getAccessibilityInfo();

            expect(accessibilityInfo).toContain('Test Stage');
            expect(accessibilityInfo).toContain('A test stage');
            expect(accessibilityInfo).toContain('★★'); // 2 stars for difficulty
            expect(accessibilityInfo).toContain('unlocked');
        });

        test('should show locked status in accessibility info', () => {
            const lockedStage = { ...mockStageData, isUnlocked: false };
            button.getStage = jest.fn().mockReturnValue(lockedStage);

            const accessibilityInfo = button.getAccessibilityInfo();

            expect(accessibilityInfo).toContain('locked');
        });
    });

    describe('Element ID Management', () => {
        test('should allow setting element ID', () => {
            button.setElementId('custom-id');
            expect(button.getId()).toBe('custom-id');
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

    describe('Enhanced Visual Effects', () => {
        test('should apply pulse effect on focus for unlocked stages', () => {
            button.isUnlocked = jest.fn().mockReturnValue(true);

            button.onFocus();

            // Should have scale animation for pulse effect
            const scaleAnimation = (scene.tweens.add as jest.Mock).mock.calls.find(call =>
                call[0].scaleX === 1.02 && call[0].scaleY === 1.02
            );

            expect(scaleAnimation).toBeDefined();
        });

        test('should reset scale on blur', () => {
            (button as any).isFocused = true;

            button.onBlur();

            // Should have scale reset animation
            const scaleResetAnimation = (scene.tweens.add as jest.Mock).mock.calls.find(call =>
                call[0].scaleX === 1 && call[0].scaleY === 1
            );

            expect(scaleResetAnimation).toBeDefined();
        });
    });
});