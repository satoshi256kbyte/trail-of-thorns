import * as Phaser from 'phaser';
import { MenuButton } from './MenuButton';
import { NavigableElement } from '../utils/KeyboardNavigationManager';

/**
 * NavigableMenuButton - MenuButton with keyboard navigation support
 * Extends MenuButton to implement NavigableElement interface
 * Provides keyboard focus management and visual feedback
 */
export class NavigableMenuButton extends MenuButton implements NavigableElement {
    private elementId: string;
    private isFocused: boolean = false;
    private focusOverlay?: Phaser.GameObjects.Rectangle;

    // Focus visual configuration
    private static readonly FOCUS_STYLE = {
        overlayColor: 0x3498db,
        overlayAlpha: 0.2,
        borderColor: 0x3498db,
        borderWidth: 3,
        animationDuration: 200,
    };

    /**
     * Constructor
     * @param scene - Phaser scene instance
     * @param x - X position
     * @param y - Y position
     * @param text - Button text
     * @param callback - Click callback function
     * @param width - Button width
     * @param height - Button height
     * @param id - Unique identifier for navigation
     */
    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        text: string,
        callback: () => void,
        width?: number,
        height?: number,
        id?: string
    ) {
        super(scene, x, y, text, callback, width, height);

        this.elementId = id || `menu-button-${text.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
        this.createFocusOverlay(width || 200, height || 50);

        console.log(`NavigableMenuButton created with ID: ${this.elementId}`);
    }

    /**
     * Create focus overlay for visual feedback
     * @param width - Button width
     * @param height - Button height
     */
    private createFocusOverlay(width: number, height: number): void {
        this.focusOverlay = this.scene.add.rectangle(
            0, 0, width, height,
            NavigableMenuButton.FOCUS_STYLE.overlayColor,
            NavigableMenuButton.FOCUS_STYLE.overlayAlpha
        );

        this.focusOverlay.setStrokeStyle(
            NavigableMenuButton.FOCUS_STYLE.borderWidth,
            NavigableMenuButton.FOCUS_STYLE.borderColor
        );

        this.focusOverlay.setVisible(false);
        this.add(this.focusOverlay);

        // Ensure focus overlay is behind other elements
        this.sendToBack(this.focusOverlay);
    }

    // NavigableElement interface implementation

    /**
     * Get the display object for visual focus indication
     * @returns This container as the display object
     */
    public getDisplayObject(): Phaser.GameObjects.GameObject {
        return this;
    }

    /**
     * Called when element receives focus
     * Shows visual focus indicator
     */
    public onFocus(): void {
        if (this.isFocused) return;

        this.isFocused = true;

        if (this.focusOverlay) {
            this.focusOverlay.setVisible(true);
            this.focusOverlay.setAlpha(0);

            // Animate focus appearance
            this.scene.tweens.add({
                targets: this.focusOverlay,
                alpha: NavigableMenuButton.FOCUS_STYLE.overlayAlpha,
                duration: NavigableMenuButton.FOCUS_STYLE.animationDuration,
                ease: 'Power2',
            });
        }

        console.log(`MenuButton focused: ${this.elementId}`);
    }

    /**
     * Called when element loses focus
     * Hides visual focus indicator
     */
    public onBlur(): void {
        if (!this.isFocused) return;

        this.isFocused = false;

        if (this.focusOverlay) {
            // Animate focus disappearance
            this.scene.tweens.add({
                targets: this.focusOverlay,
                alpha: 0,
                duration: NavigableMenuButton.FOCUS_STYLE.animationDuration,
                ease: 'Power2',
                onComplete: () => {
                    if (this.focusOverlay) {
                        this.focusOverlay.setVisible(false);
                    }
                }
            });
        }

        console.log(`MenuButton blurred: ${this.elementId}`);
    }

    /**
     * Called when element is activated (Enter/Space pressed)
     * Triggers the button's callback function
     */
    public onActivate(): void {
        if (this.isInteractive()) {
            // Add activation animation
            this.scene.tweens.add({
                targets: this,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 100,
                yoyo: true,
                onComplete: () => {
                    // Trigger the button's callback
                    this.emit('pointerup');
                }
            });

            console.log(`MenuButton activated: ${this.elementId}`);
        }
    }

    /**
     * Check if element is currently interactive/enabled
     * @returns True if interactive, false otherwise
     */
    public isInteractive(): boolean {
        return this.input !== null && this.input.enabled;
    }

    /**
     * Get unique identifier for this element
     * @returns Element ID
     */
    public getId(): string {
        return this.elementId;
    }

    // Additional methods

    /**
     * Check if button is currently focused
     * @returns True if focused, false otherwise
     */
    public isFocusedState(): boolean {
        return this.isFocused;
    }

    /**
     * Set the element ID
     * @param id - New element ID
     */
    public setElementId(id: string): void {
        this.elementId = id;
    }

    /**
     * Override setEnabled to handle focus state
     * @param enabled - Whether button should be enabled
     */
    public setEnabled(enabled: boolean): void {
        super.setEnabled(enabled);

        // If disabled while focused, trigger blur
        if (!enabled && this.isFocused) {
            this.onBlur();
        }
    }

    /**
     * Cleanup method to remove focus overlay and event listeners
     */
    public destroy(fromScene?: boolean): void {
        // Clean up focus state
        if (this.isFocused) {
            this.onBlur();
        }

        // Destroy focus overlay
        if (this.focusOverlay) {
            this.focusOverlay.destroy();
            this.focusOverlay = undefined;
        }

        console.log(`NavigableMenuButton destroyed: ${this.elementId}`);

        // Call parent destroy
        super.destroy(fromScene);
    }
}