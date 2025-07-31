import * as Phaser from 'phaser';
import { StageButton } from './StageButton';
import { StageData } from '../types/StageData';
import { NavigableElement } from '../utils/KeyboardNavigationManager';

/**
 * NavigableStageButton - StageButton with keyboard navigation support
 * Extends StageButton to implement NavigableElement interface
 * Provides keyboard focus management and visual feedback for stage selection
 */
export class NavigableStageButton extends StageButton implements NavigableElement {
    private elementId: string;
    private isFocused: boolean = false;
    private focusOverlay?: Phaser.GameObjects.Rectangle;

    // Focus visual configuration
    private static readonly FOCUS_STYLE = {
        overlayColor: 0x3498db,
        overlayAlpha: 0.15,
        borderColor: 0x3498db,
        borderWidth: 4,
        animationDuration: 250,
        pulseScale: 1.02,
    };

    /**
     * Constructor
     * @param scene - Phaser scene instance
     * @param x - X position
     * @param y - Y position
     * @param stage - Stage data for this button
     * @param onSelect - Callback function when stage is selected
     * @param id - Unique identifier for navigation
     */
    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        stage: StageData,
        onSelect: (stage: StageData) => void,
        id?: string
    ) {
        super(scene, x, y, stage, onSelect);

        this.elementId = id || `stage-button-${stage.id}-${Date.now()}`;
        this.createFocusOverlay();

        console.log(`NavigableStageButton created with ID: ${this.elementId}`);
    }

    /**
     * Create focus overlay for visual feedback
     */
    private createFocusOverlay(): void {
        this.focusOverlay = this.scene.add.rectangle(
            0, 0, 280, 160, // StageButton dimensions
            NavigableStageButton.FOCUS_STYLE.overlayColor,
            NavigableStageButton.FOCUS_STYLE.overlayAlpha
        );

        this.focusOverlay.setStrokeStyle(
            NavigableStageButton.FOCUS_STYLE.borderWidth,
            NavigableStageButton.FOCUS_STYLE.borderColor
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
     * Shows visual focus indicator with enhanced effects for stage buttons
     */
    public onFocus(): void {
        if (this.isFocused) return;

        this.isFocused = true;

        if (this.focusOverlay) {
            this.focusOverlay.setVisible(true);
            this.focusOverlay.setAlpha(0);

            // Animate focus appearance with subtle scale
            this.scene.tweens.add({
                targets: this.focusOverlay,
                alpha: NavigableStageButton.FOCUS_STYLE.overlayAlpha,
                duration: NavigableStageButton.FOCUS_STYLE.animationDuration,
                ease: 'Power2',
            });

            // Add subtle pulse effect for focused stage buttons
            if (this.isUnlocked()) {
                this.scene.tweens.add({
                    targets: this,
                    scaleX: NavigableStageButton.FOCUS_STYLE.pulseScale,
                    scaleY: NavigableStageButton.FOCUS_STYLE.pulseScale,
                    duration: NavigableStageButton.FOCUS_STYLE.animationDuration,
                    ease: 'Power2',
                });
            }
        }

        console.log(`StageButton focused: ${this.elementId} (${this.getStage().name})`);
    }

    /**
     * Called when element loses focus
     * Hides visual focus indicator and resets scale
     */
    public onBlur(): void {
        if (!this.isFocused) return;

        this.isFocused = false;

        if (this.focusOverlay) {
            // Animate focus disappearance
            this.scene.tweens.add({
                targets: this.focusOverlay,
                alpha: 0,
                duration: NavigableStageButton.FOCUS_STYLE.animationDuration,
                ease: 'Power2',
                onComplete: () => {
                    if (this.focusOverlay) {
                        this.focusOverlay.setVisible(false);
                    }
                }
            });

            // Reset scale
            this.scene.tweens.add({
                targets: this,
                scaleX: 1,
                scaleY: 1,
                duration: NavigableStageButton.FOCUS_STYLE.animationDuration,
                ease: 'Power2',
            });
        }

        console.log(`StageButton blurred: ${this.elementId} (${this.getStage().name})`);
    }

    /**
     * Called when element is activated (Enter/Space pressed)
     * Triggers stage selection if the stage is unlocked
     */
    public onActivate(): void {
        if (this.isInteractive()) {
            const stage = this.getStage();

            // Add activation animation
            this.scene.tweens.add({
                targets: this,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 100,
                yoyo: true,
                onComplete: () => {
                    // Trigger stage selection
                    console.log(`StageButton activated via keyboard: ${stage.name} (${stage.id})`);
                    // Call the private onClick method by simulating a click
                    this.emit('stage-selected', stage);
                }
            });

            console.log(`StageButton activated: ${this.elementId} (${stage.name})`);
        } else {
            // Provide feedback for locked stages
            this.showLockedFeedback();
        }
    }

    /**
     * Show visual feedback when trying to activate a locked stage
     */
    private showLockedFeedback(): void {
        // Shake animation to indicate locked state
        this.scene.tweens.add({
            targets: this,
            x: this.x - 5,
            duration: 50,
            yoyo: true,
            repeat: 3,
            ease: 'Power2',
            onComplete: () => {
                this.x = this.x; // Reset position
            }
        });

        console.log(`Attempted to activate locked stage: ${this.getStage().name}`);
    }

    /**
     * Check if element is currently interactive/enabled
     * @returns True if stage is unlocked, false otherwise
     */
    public isInteractive(): boolean {
        return this.isUnlocked();
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
     * Override updateStage to handle focus state changes
     * @param newStageData - Updated stage data
     */
    public updateStage(newStageData: StageData): void {
        const wasInteractive = this.isInteractive();

        // Call parent update
        super.updateStage(newStageData);

        // If interactivity changed while focused, handle appropriately
        if (this.isFocused && wasInteractive && !this.isInteractive()) {
            // Stage became locked while focused - provide visual feedback
            this.onBlur();
        }

        // Update element ID if stage ID changed
        this.elementId = `stage-button-${newStageData.id}-${Date.now()}`;

        console.log(`NavigableStageButton updated: ${this.elementId} (${newStageData.name})`);
    }

    /**
     * Get stage information for accessibility
     * @returns Formatted string with stage information
     */
    public getAccessibilityInfo(): string {
        const stage = this.getStage();
        const status = stage.isUnlocked ? 'unlocked' : 'locked';
        const difficulty = '★'.repeat(stage.difficulty);

        return `${stage.name}, ${stage.description}, Difficulty: ${difficulty}, Status: ${status}`;
    }

    /**
     * Cleanup method to remove focus overlay and event listeners
     */
    public destroy(): void {
        // Clean up focus state
        if (this.isFocused) {
            this.onBlur();
        }

        // Destroy focus overlay
        if (this.focusOverlay) {
            this.focusOverlay.destroy();
            this.focusOverlay = undefined;
        }

        console.log(`NavigableStageButton destroyed: ${this.elementId}`);

        // Call parent destroy
        super.destroy();
    }
}