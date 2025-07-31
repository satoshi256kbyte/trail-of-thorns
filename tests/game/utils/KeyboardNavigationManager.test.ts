import * as Phaser from 'phaser';
import { KeyboardNavigationManager, NavigableElement } from '../../../game/src/utils/KeyboardNavigationManager';

// Mock Phaser scene for testing
class MockScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MockScene' });
    }
}

// Mock navigable element for testing
class MockNavigableElement implements NavigableElement {
    private id: string;
    private interactive: boolean = true;
    private focused: boolean = false;
    private mockDisplayObject: Phaser.GameObjects.GameObject;

    constructor(id: string, interactive: boolean = true) {
        this.id = id;
        this.interactive = interactive;
        // Create a mock display object
        this.mockDisplayObject = {
            getBounds: () => ({ x: 0, y: 0, width: 100, height: 50 })
        } as any;
    }

    getDisplayObject(): Phaser.GameObjects.GameObject {
        return this.mockDisplayObject;
    }

    onFocus(): void {
        this.focused = true;
    }

    onBlur(): void {
        this.focused = false;
    }

    onActivate(): void {
        // Mock activation
    }

    isInteractive(): boolean {
        return this.interactive;
    }

    getId(): string {
        return this.id;
    }

    isFocused(): boolean {
        return this.focused;
    }

    setInteractive(interactive: boolean): void {
        this.interactive = interactive;
    }
}

describe('KeyboardNavigationManager', () => {
    let scene: MockScene;
    let navigationManager: KeyboardNavigationManager;
    let mockElement1: MockNavigableElement;
    let mockElement2: MockNavigableElement;
    let mockElement3: MockNavigableElement;

    beforeEach(() => {
        // Create mock scene with minimal required properties
        scene = {
            input: {
                keyboard: {
                    addKey: jest.fn().mockReturnValue({
                        on: jest.fn()
                    })
                }
            },
            add: {
                graphics: jest.fn().mockReturnValue({
                    setDepth: jest.fn().mockReturnThis(),
                    setVisible: jest.fn().mockReturnThis(),
                    clear: jest.fn(),
                    lineStyle: jest.fn(),
                    strokeRoundedRect: jest.fn(),
                    setAlpha: jest.fn(),
                    destroy: jest.fn()
                })
            },
            tweens: {
                add: jest.fn()
            }
        } as any;

        navigationManager = new KeyboardNavigationManager(scene);
        mockElement1 = new MockNavigableElement('element1');
        mockElement2 = new MockNavigableElement('element2');
        mockElement3 = new MockNavigableElement('element3', false); // Not interactive
    });

    afterEach(() => {
        navigationManager.destroy();
    });

    describe('Element Management', () => {
        test('should add navigable elements', () => {
            navigationManager.addElement(mockElement1);
            navigationManager.addElement(mockElement2);

            const elements = navigationManager.getNavigableElements();
            expect(elements).toHaveLength(2);
            expect(elements[0].getId()).toBe('element1');
            expect(elements[1].getId()).toBe('element2');
        });

        test('should not add duplicate elements', () => {
            navigationManager.addElement(mockElement1);
            navigationManager.addElement(mockElement1); // Duplicate

            const elements = navigationManager.getNavigableElements();
            expect(elements).toHaveLength(1);
        });

        test('should remove elements', () => {
            navigationManager.addElement(mockElement1);
            navigationManager.addElement(mockElement2);
            navigationManager.removeElement('element1');

            const elements = navigationManager.getNavigableElements();
            expect(elements).toHaveLength(1);
            expect(elements[0].getId()).toBe('element2');
        });

        test('should clear all elements', () => {
            navigationManager.addElement(mockElement1);
            navigationManager.addElement(mockElement2);
            navigationManager.clearElements();

            const elements = navigationManager.getNavigableElements();
            expect(elements).toHaveLength(0);
        });
    });

    describe('Focus Management', () => {
        beforeEach(() => {
            navigationManager.addElement(mockElement1);
            navigationManager.addElement(mockElement2);
        });

        test('should focus first element when added', () => {
            expect(mockElement1.isFocused()).toBe(true);
            expect(mockElement2.isFocused()).toBe(false);
        });

        test('should focus element by ID', () => {
            const result = navigationManager.focusElementById('element2');

            expect(result).toBe(true);
            expect(mockElement1.isFocused()).toBe(false);
            expect(mockElement2.isFocused()).toBe(true);
        });

        test('should not focus non-existent element', () => {
            const result = navigationManager.focusElementById('nonexistent');

            expect(result).toBe(false);
        });

        test('should not focus non-interactive element', () => {
            navigationManager.addElement(mockElement3);
            const result = navigationManager.focusElementById('element3');

            expect(result).toBe(false);
        });

        test('should get currently focused element', () => {
            const focused = navigationManager.getCurrentFocusedElement();
            expect(focused?.getId()).toBe('element1');
        });

        test('should get current focus index', () => {
            const index = navigationManager.getCurrentFocusIndex();
            expect(index).toBe(0);
        });
    });

    describe('Navigation State', () => {
        test('should be enabled by default', () => {
            expect(navigationManager.isNavigationEnabled()).toBe(true);
        });

        test('should disable navigation', () => {
            navigationManager.addElement(mockElement1);
            navigationManager.setEnabled(false);

            expect(navigationManager.isNavigationEnabled()).toBe(false);
            expect(mockElement1.isFocused()).toBe(false);
        });

        test('should re-enable navigation and focus first interactive element', () => {
            navigationManager.addElement(mockElement1);
            navigationManager.addElement(mockElement2);
            navigationManager.setEnabled(false);
            navigationManager.setEnabled(true);

            expect(navigationManager.isNavigationEnabled()).toBe(true);
            expect(mockElement1.isFocused()).toBe(true);
        });
    });

    describe('Interactive Element Filtering', () => {
        beforeEach(() => {
            navigationManager.addElement(mockElement1);
            navigationManager.addElement(mockElement3); // Not interactive
            navigationManager.addElement(mockElement2);
        });

        test('should skip non-interactive elements during navigation', () => {
            // Focus should start on first interactive element (element1)
            expect(mockElement1.isFocused()).toBe(true);
            expect(mockElement3.isFocused()).toBe(false);
            expect(mockElement2.isFocused()).toBe(false);
        });

        test('should handle focus adjustment when removing focused element', () => {
            // Start with element1 focused
            expect(mockElement1.isFocused()).toBe(true);

            // Remove the focused element
            navigationManager.removeElement('element1');

            // Should focus next interactive element (element2)
            expect(mockElement2.isFocused()).toBe(true);
            expect(mockElement3.isFocused()).toBe(false);
        });
    });

    describe('Cleanup', () => {
        test('should destroy properly', () => {
            navigationManager.addElement(mockElement1);
            navigationManager.addElement(mockElement2);

            navigationManager.destroy();

            // Should clear all elements
            expect(navigationManager.getNavigableElements()).toHaveLength(0);
            expect(navigationManager.getCurrentFocusIndex()).toBe(-1);
        });
    });
});

describe('NavigableElement Interface', () => {
    test('MockNavigableElement should implement all required methods', () => {
        const element = new MockNavigableElement('test');

        expect(element.getId()).toBe('test');
        expect(element.isInteractive()).toBe(true);
        expect(element.getDisplayObject()).toBeDefined();

        // Test focus methods
        expect(element.isFocused()).toBe(false);
        element.onFocus();
        expect(element.isFocused()).toBe(true);
        element.onBlur();
        expect(element.isFocused()).toBe(false);

        // Test activation (should not throw)
        expect(() => element.onActivate()).not.toThrow();
    });

    test('should handle interactive state changes', () => {
        const element = new MockNavigableElement('test', false);

        expect(element.isInteractive()).toBe(false);
        element.setInteractive(true);
        expect(element.isInteractive()).toBe(true);
    });
});