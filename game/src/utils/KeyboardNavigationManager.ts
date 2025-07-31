import * as Phaser from 'phaser';

/**
 * Interface for navigable elements
 * Elements that can be focused and activated via keyboard
 */
export interface NavigableElement {
    /** Get the display object for visual focus indication */
    getDisplayObject(): Phaser.GameObjects.GameObject;
    /** Called when element receives focus */
    onFocus(): void;
    /** Called when element loses focus */
    onBlur(): void;
    /** Called when element is activated (Enter/Space pressed) */
    onActivate(): void;
    /** Check if element is currently interactive/enabled */
    isInteractive(): boolean;
    /** Get unique identifier for this element */
    getId(): string;
}

/**
 * Keyboard navigation manager
 * Handles focus management and keyboard navigation between UI elements
 * Implements requirements 5.2, 5.3, 5.4 from the title-menu-screen specification
 */
export class KeyboardNavigationManager {
    private scene: Phaser.Scene;
    private navigableElements: NavigableElement[] = [];
    private currentFocusIndex: number = -1;
    private isEnabled: boolean = true;
    private focusIndicator?: Phaser.GameObjects.Graphics;
    private keys: {
        up?: Phaser.Input.Keyboard.Key;
        down?: Phaser.Input.Keyboard.Key;
        left?: Phaser.Input.Keyboard.Key;
        right?: Phaser.Input.Keyboard.Key;
        tab?: Phaser.Input.Keyboard.Key;
        enter?: Phaser.Input.Keyboard.Key;
        space?: Phaser.Input.Keyboard.Key;
        escape?: Phaser.Input.Keyboard.Key;
    } = {};

    // Visual configuration for focus indicator
    private static readonly FOCUS_STYLE = {
        color: 0x3498db,
        alpha: 0.8,
        thickness: 3,
        padding: 8,
        animationDuration: 300,
    };

    /**
     * Constructor
     * @param scene - Phaser scene instance
     */
    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.setupKeyboardInput();
        this.createFocusIndicator();

        console.log('KeyboardNavigationManager initialized');
    }

    /**
     * Setup keyboard input handling
     * Implements requirement 5.2: Allow arrow keys or tab to navigate between options
     */
    private setupKeyboardInput(): void {
        if (!this.scene.input.keyboard) {
            console.warn('Keyboard input not available');
            return;
        }

        // Create key objects
        this.keys.up = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.keys.down = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.keys.left = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.keys.right = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this.keys.tab = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
        this.keys.enter = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.keys.space = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keys.escape = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // Setup key event handlers
        this.keys.up?.on('down', () => this.navigateUp());
        this.keys.down?.on('down', () => this.navigateDown());
        this.keys.left?.on('down', () => this.navigateLeft());
        this.keys.right?.on('down', () => this.navigateRight());
        this.keys.tab?.on('down', (event: KeyboardEvent) => this.navigateTab(event));
        this.keys.enter?.on('down', () => this.activateCurrentElement());
        this.keys.space?.on('down', () => this.activateCurrentElement());
        this.keys.escape?.on('down', () => this.handleEscape());
    }

    /**
     * Create visual focus indicator
     * Implements requirement 5.4: Clearly indicate which option is currently selected
     */
    private createFocusIndicator(): void {
        this.focusIndicator = this.scene.add.graphics();
        this.focusIndicator.setDepth(1000); // Ensure it's on top
        this.focusIndicator.setVisible(false);
    }

    /**
     * Add a navigable element to the manager
     * @param element - Element to add to navigation
     */
    public addElement(element: NavigableElement): void {
        if (!this.navigableElements.find(el => el.getId() === element.getId())) {
            this.navigableElements.push(element);
            console.log(`Added navigable element: ${element.getId()}`);

            // If this is the first element, focus it
            if (this.navigableElements.length === 1 && this.isEnabled) {
                this.setFocus(0);
            }
        }
    }

    /**
     * Remove a navigable element from the manager
     * @param elementId - ID of element to remove
     */
    public removeElement(elementId: string): void {
        const index = this.navigableElements.findIndex(el => el.getId() === elementId);
        if (index !== -1) {
            // If removing the currently focused element, adjust focus
            if (index === this.currentFocusIndex) {
                this.clearFocus();

                // Remove the element first
                this.navigableElements.splice(index, 1);

                // Focus next available interactive element
                if (this.navigableElements.length > 0) {
                    const nextIndex = index < this.navigableElements.length ? index : this.navigableElements.length - 1;
                    const nextInteractiveIndex = this.findNextInteractiveElementFromIndex(nextIndex);
                    if (nextInteractiveIndex !== -1) {
                        this.setFocus(nextInteractiveIndex);
                    }
                }

                console.log(`Removed navigable element: ${elementId}`);
                return; // Early return to avoid double removal
            } else if (index < this.currentFocusIndex) {
                // Adjust current focus index if removing element before it
                this.currentFocusIndex--;
            }

            this.navigableElements.splice(index, 1);
            console.log(`Removed navigable element: ${elementId}`);
        }
    }

    /**
     * Clear all navigable elements
     */
    public clearElements(): void {
        this.clearFocus();
        this.navigableElements = [];
        this.currentFocusIndex = -1;
        console.log('Cleared all navigable elements');
    }

    /**
     * Navigate up (previous element in vertical layout)
     */
    private navigateUp(): void {
        if (!this.isEnabled || this.navigableElements.length === 0) return;

        const nextIndex = this.findPreviousInteractiveElement();
        if (nextIndex !== -1) {
            this.setFocus(nextIndex);
        }
    }

    /**
     * Navigate down (next element in vertical layout)
     */
    private navigateDown(): void {
        if (!this.isEnabled || this.navigableElements.length === 0) return;

        const nextIndex = this.findNextInteractiveElement();
        if (nextIndex !== -1) {
            this.setFocus(nextIndex);
        }
    }

    /**
     * Navigate left (previous element in horizontal layout)
     */
    private navigateLeft(): void {
        if (!this.isEnabled || this.navigableElements.length === 0) return;

        const nextIndex = this.findPreviousInteractiveElement();
        if (nextIndex !== -1) {
            this.setFocus(nextIndex);
        }
    }

    /**
     * Navigate right (next element in horizontal layout)
     */
    private navigateRight(): void {
        if (!this.isEnabled || this.navigableElements.length === 0) return;

        const nextIndex = this.findNextInteractiveElement();
        if (nextIndex !== -1) {
            this.setFocus(nextIndex);
        }
    }

    /**
     * Navigate with Tab key
     * @param event - Keyboard event to check for Shift modifier
     */
    private navigateTab(event: KeyboardEvent): void {
        if (!this.isEnabled || this.navigableElements.length === 0) return;

        event.preventDefault(); // Prevent default tab behavior

        const nextIndex = event.shiftKey
            ? this.findPreviousInteractiveElement()
            : this.findNextInteractiveElement();

        if (nextIndex !== -1) {
            this.setFocus(nextIndex);
        }
    }

    /**
     * Find the next interactive element
     * @returns Index of next interactive element, or -1 if none found
     */
    private findNextInteractiveElement(): number {
        if (this.navigableElements.length === 0) return -1;

        let startIndex = this.currentFocusIndex + 1;

        // Search from current position to end
        for (let i = startIndex; i < this.navigableElements.length; i++) {
            if (this.navigableElements[i].isInteractive()) {
                return i;
            }
        }

        // Wrap around to beginning
        for (let i = 0; i < startIndex; i++) {
            if (this.navigableElements[i].isInteractive()) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Find the next interactive element starting from a specific index
     * @param startIndex - Index to start searching from
     * @returns Index of next interactive element, or -1 if none found
     */
    private findNextInteractiveElementFromIndex(startIndex: number): number {
        if (this.navigableElements.length === 0) return -1;

        // Search from start index to end
        for (let i = startIndex; i < this.navigableElements.length; i++) {
            if (this.navigableElements[i].isInteractive()) {
                return i;
            }
        }

        // Wrap around to beginning
        for (let i = 0; i < startIndex; i++) {
            if (this.navigableElements[i].isInteractive()) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Find the previous interactive element
     * @returns Index of previous interactive element, or -1 if none found
     */
    private findPreviousInteractiveElement(): number {
        if (this.navigableElements.length === 0) return -1;

        let startIndex = this.currentFocusIndex - 1;

        // Search from current position to beginning
        for (let i = startIndex; i >= 0; i--) {
            if (this.navigableElements[i].isInteractive()) {
                return i;
            }
        }

        // Wrap around to end
        for (let i = this.navigableElements.length - 1; i > startIndex; i--) {
            if (this.navigableElements[i].isInteractive()) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Set focus to element at specified index
     * @param index - Index of element to focus
     */
    private setFocus(index: number): void {
        if (index < 0 || index >= this.navigableElements.length) return;

        const element = this.navigableElements[index];
        if (!element.isInteractive()) return;

        // Clear previous focus
        this.clearFocus();

        // Set new focus
        this.currentFocusIndex = index;
        element.onFocus();
        this.updateFocusIndicator(element);

        console.log(`Focus set to element: ${element.getId()}`);
    }

    /**
     * Clear current focus
     */
    private clearFocus(): void {
        if (this.currentFocusIndex >= 0 && this.currentFocusIndex < this.navigableElements.length) {
            this.navigableElements[this.currentFocusIndex].onBlur();
        }

        this.currentFocusIndex = -1;
        this.hideFocusIndicator();
    }

    /**
     * Update visual focus indicator position and appearance
     * @param element - Element that now has focus
     */
    private updateFocusIndicator(element: NavigableElement): void {
        if (!this.focusIndicator) return;

        const displayObject = element.getDisplayObject();
        if (!displayObject) return;

        // Get bounds of the focused element
        const bounds = (displayObject as any).getBounds ? (displayObject as any).getBounds() : { x: 0, y: 0, width: 100, height: 50 };

        // Clear previous indicator
        this.focusIndicator.clear();

        // Draw focus rectangle with padding
        const padding = KeyboardNavigationManager.FOCUS_STYLE.padding;
        this.focusIndicator.lineStyle(
            KeyboardNavigationManager.FOCUS_STYLE.thickness,
            KeyboardNavigationManager.FOCUS_STYLE.color,
            KeyboardNavigationManager.FOCUS_STYLE.alpha
        );

        this.focusIndicator.strokeRoundedRect(
            bounds.x - padding,
            bounds.y - padding,
            bounds.width + (padding * 2),
            bounds.height + (padding * 2),
            8
        );

        // Show indicator with animation
        this.focusIndicator.setVisible(true);
        this.focusIndicator.setAlpha(0);

        this.scene.tweens.add({
            targets: this.focusIndicator,
            alpha: KeyboardNavigationManager.FOCUS_STYLE.alpha,
            duration: KeyboardNavigationManager.FOCUS_STYLE.animationDuration,
            ease: 'Power2',
        });
    }

    /**
     * Hide focus indicator
     */
    private hideFocusIndicator(): void {
        if (this.focusIndicator) {
            this.focusIndicator.setVisible(false);
        }
    }

    /**
     * Activate the currently focused element
     * Implements requirement 5.3: Allow Enter or Space to select the highlighted option
     */
    private activateCurrentElement(): void {
        if (!this.isEnabled || this.currentFocusIndex < 0 || this.currentFocusIndex >= this.navigableElements.length) {
            return;
        }

        const element = this.navigableElements[this.currentFocusIndex];
        if (element.isInteractive()) {
            element.onActivate();
            console.log(`Activated element: ${element.getId()}`);
        }
    }

    /**
     * Handle Escape key press
     * Can be overridden by scenes for custom behavior
     */
    private handleEscape(): void {
        console.log('Escape key pressed');
        // Default behavior - scenes can override this
    }

    /**
     * Enable or disable keyboard navigation
     * @param enabled - Whether navigation should be enabled
     */
    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;

        if (!enabled) {
            this.clearFocus();
        } else if (this.navigableElements.length > 0) {
            // Focus first interactive element when re-enabled
            const firstInteractive = this.navigableElements.findIndex(el => el.isInteractive());
            if (firstInteractive !== -1) {
                this.setFocus(firstInteractive);
            }
        }

        console.log(`Keyboard navigation ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Check if keyboard navigation is enabled
     * @returns True if enabled, false otherwise
     */
    public isNavigationEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * Get currently focused element
     * @returns Currently focused element or undefined
     */
    public getCurrentFocusedElement(): NavigableElement | undefined {
        if (this.currentFocusIndex >= 0 && this.currentFocusIndex < this.navigableElements.length) {
            return this.navigableElements[this.currentFocusIndex];
        }
        return undefined;
    }

    /**
     * Get index of currently focused element
     * @returns Index of focused element or -1 if none
     */
    public getCurrentFocusIndex(): number {
        return this.currentFocusIndex;
    }

    /**
     * Get all navigable elements
     * @returns Array of all navigable elements
     */
    public getNavigableElements(): NavigableElement[] {
        return [...this.navigableElements];
    }

    /**
     * Focus element by ID
     * @param elementId - ID of element to focus
     * @returns True if element was found and focused, false otherwise
     */
    public focusElementById(elementId: string): boolean {
        const index = this.navigableElements.findIndex(el => el.getId() === elementId);
        if (index !== -1 && this.navigableElements[index].isInteractive()) {
            this.setFocus(index);
            return true;
        }
        return false;
    }

    /**
     * Cleanup method to remove event listeners and graphics
     */
    public destroy(): void {
        // Remove key event listeners
        Object.values(this.keys).forEach(key => {
            if (key && typeof key.removeAllListeners === 'function') {
                key.removeAllListeners();
            }
        });

        // Clear focus and elements
        this.clearFocus();
        this.navigableElements = [];

        // Destroy focus indicator
        if (this.focusIndicator) {
            this.focusIndicator.destroy();
            this.focusIndicator = undefined;
        }

        console.log('KeyboardNavigationManager destroyed');
    }
}