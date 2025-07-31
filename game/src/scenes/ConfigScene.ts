import * as Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { NavigableMenuButton } from '../ui/NavigableMenuButton';
import { KeyboardNavigationManager, NavigableElement } from '../utils/KeyboardNavigationManager';
import { SceneTransition, TransitionType, SceneData } from '../utils/SceneTransition';

/**
 * Configuration options interface
 * Defines the structure for mock configuration data
 */
export interface ConfigOptions {
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
    fullscreen: boolean;
    keyBindings: KeyBindings;
}

/**
 * Key bindings interface
 * Defines the structure for keyboard controls
 */
export interface KeyBindings {
    up: string;
    down: string;
    left: string;
    right: string;
    action: string;
    menu: string;
}
/**
 * Volume slider component
 * Reusable slider for volume controls with keyboard navigation support
 */
class VolumeSlider extends Phaser.GameObjects.Container implements NavigableElement {
    private background!: Phaser.GameObjects.Rectangle;
    private handle!: Phaser.GameObjects.Rectangle;
    private label!: Phaser.GameObjects.Text;
    private valueText!: Phaser.GameObjects.Text;
    private isDragging: boolean = false;
    private value: number = 0.5;
    private callback: (value: number) => void;
    private elementId: string;
    private isFocused: boolean = false;
    private focusOverlay?: Phaser.GameObjects.Rectangle;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        label: string,
        initialValue: number,
        callback: (value: number) => void
    ) {
        super(scene, x, y);
        this.value = initialValue;
        this.callback = callback;
        this.elementId = `volume-slider-${label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
        this.setupSlider(label);
        this.createFocusOverlay();
        scene.add.existing(this);
    }

    private setupSlider(labelText: string): void {
        // Create label
        this.label = this.scene.add.text(-150, -20, labelText, {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: 'Arial',
        });
        this.add(this.label);

        // Create slider background
        this.background = this.scene.add.rectangle(0, 0, 200, 10, 0x34495e);
        this.background.setStrokeStyle(1, 0x2c3e50);
        this.add(this.background);

        // Create slider handle
        this.handle = this.scene.add.rectangle(
            (this.value - 0.5) * 200, 0, 20, 20, 0x3498db
        );
        this.handle.setInteractive({ draggable: true });
        this.add(this.handle);

        // Create value text
        this.valueText = this.scene.add.text(120, -8, `${Math.round(this.value * 100)}%`, {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'Arial',
        });
        this.add(this.valueText);

        // Setup interactions
        this.setupInteractions();
    }

    private setupInteractions(): void {
        this.handle.on('dragstart', () => {
            this.isDragging = true;
        });

        this.handle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
            if (this.isDragging) {
                // Constrain handle position
                const constrainedX = Phaser.Math.Clamp(dragX, -100, 100);
                this.handle.x = constrainedX;

                // Update value (0 to 1)
                this.value = (constrainedX + 100) / 200;
                this.valueText.setText(`${Math.round(this.value * 100)}%`);

                // Call callback
                this.callback(this.value);
            }
        });

        this.handle.on('dragend', () => {
            this.isDragging = false;
        });
    }

    public getValue(): number {
        return this.value;
    }

    public setValue(value: number): void {
        this.value = Phaser.Math.Clamp(value, 0, 1);
        this.handle.x = (this.value - 0.5) * 200;
        this.valueText.setText(`${Math.round(this.value * 100)}%`);
    }

    private createFocusOverlay(): void {
        this.focusOverlay = this.scene.add.rectangle(0, 0, 350, 40, 0x3498db, 0.2);
        this.focusOverlay.setStrokeStyle(2, 0x3498db);
        this.focusOverlay.setVisible(false);
        this.add(this.focusOverlay);
        this.sendToBack(this.focusOverlay);
    }

    // NavigableElement interface implementation
    public getDisplayObject(): Phaser.GameObjects.GameObject {
        return this;
    }

    public onFocus(): void {
        this.isFocused = true;
        if (this.focusOverlay) {
            this.focusOverlay.setVisible(true);
        }
    }

    public onBlur(): void {
        this.isFocused = false;
        if (this.focusOverlay) {
            this.focusOverlay.setVisible(false);
        }
    }

    public onActivate(): void {
        // For sliders, activation could adjust value by small increments
        const increment = 0.1;
        const newValue = Math.min(1, this.value + increment);
        this.setValue(newValue);
        this.callback(newValue);
    }

    public isInteractive(): boolean {
        return true;
    }

    public getId(): string {
        return this.elementId;
    }

    public isFocusedState(): boolean {
        return this.isFocused;
    }
}

/**
 * Toggle button component
 * Reusable toggle for boolean settings with keyboard navigation support
 */
class ToggleButton extends Phaser.GameObjects.Container implements NavigableElement {
    private background!: Phaser.GameObjects.Rectangle;
    private label!: Phaser.GameObjects.Text;
    private statusText!: Phaser.GameObjects.Text;
    private isEnabled: boolean = false;
    private callback: (enabled: boolean) => void;
    private elementId: string;
    private isFocused: boolean = false;
    private focusOverlay?: Phaser.GameObjects.Rectangle;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        label: string,
        initialValue: boolean,
        callback: (enabled: boolean) => void
    ) {
        super(scene, x, y);
        this.isEnabled = initialValue;
        this.callback = callback;
        this.elementId = `toggle-button-${label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
        this.setupToggle(label);
        this.createFocusOverlay();
        scene.add.existing(this);
    }

    private setupToggle(labelText: string): void {
        // Create label
        this.label = this.scene.add.text(-150, -10, labelText, {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: 'Arial',
        });
        this.add(this.label);

        // Create toggle background
        this.background = this.scene.add.rectangle(50, 0, 80, 30, this.getBackgroundColor());
        this.background.setStrokeStyle(2, 0x2c3e50);
        this.background.setInteractive();
        this.add(this.background);

        // Create status text
        this.statusText = this.scene.add.text(50, -8, this.getStatusText(), {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'Arial',
        });
        this.statusText.setOrigin(0.5, 0.5);
        this.add(this.statusText);

        // Setup interactions
        this.background.on('pointerdown', this.toggle, this);
    }

    private toggle(): void {
        this.isEnabled = !this.isEnabled;
        this.background.setFillStyle(this.getBackgroundColor());
        this.statusText.setText(this.getStatusText());
        this.callback(this.isEnabled);
    }

    private getBackgroundColor(): number {
        return this.isEnabled ? 0x27ae60 : 0xe74c3c;
    }

    private getStatusText(): string {
        return this.isEnabled ? 'ON' : 'OFF';
    }

    public getValue(): boolean {
        return this.isEnabled;
    }

    public setValue(value: boolean): void {
        this.isEnabled = value;
        this.background.setFillStyle(this.getBackgroundColor());
        this.statusText.setText(this.getStatusText());
    }

    private createFocusOverlay(): void {
        this.focusOverlay = this.scene.add.rectangle(0, 0, 230, 40, 0x3498db, 0.2);
        this.focusOverlay.setStrokeStyle(2, 0x3498db);
        this.focusOverlay.setVisible(false);
        this.add(this.focusOverlay);
        this.sendToBack(this.focusOverlay);
    }

    // NavigableElement interface implementation
    public getDisplayObject(): Phaser.GameObjects.GameObject {
        return this;
    }

    public onFocus(): void {
        this.isFocused = true;
        if (this.focusOverlay) {
            this.focusOverlay.setVisible(true);
        }
    }

    public onBlur(): void {
        this.isFocused = false;
        if (this.focusOverlay) {
            this.focusOverlay.setVisible(false);
        }
    }

    public onActivate(): void {
        this.toggle();
    }

    public isInteractive(): boolean {
        return true;
    }

    public getId(): string {
        return this.elementId;
    }

    public isFocusedState(): boolean {
        return this.isFocused;
    }
}/*
*
 * ConfigScene class
 * Configuration screen scene with mock settings options
 * Implements requirements 3.2, 3.3, 3.4 from the title-menu-screen specification
 */
export class ConfigScene extends Phaser.Scene {
    // Private properties for scene elements
    private backgroundGraphics?: Phaser.GameObjects.Graphics;
    private titleText?: Phaser.GameObjects.Text;
    private backButton?: NavigableMenuButton;
    private keyboardNavigation?: KeyboardNavigationManager;

    // Configuration controls
    private masterVolumeSlider?: VolumeSlider;
    private sfxVolumeSlider?: VolumeSlider;
    private musicVolumeSlider?: VolumeSlider;
    private fullscreenToggle?: ToggleButton;

    // Configuration data
    private configOptions: ConfigOptions;

    /**
     * Constructor
     * Initialize the scene with the key 'ConfigScene'
     */
    constructor() {
        super({ key: 'ConfigScene' });

        // Initialize mock configuration data
        this.configOptions = this.getDefaultConfig();
    }

    /**
     * Get default configuration options
     * Returns mock configuration data for testing
     */
    private getDefaultConfig(): ConfigOptions {
        return {
            masterVolume: 0.8,
            sfxVolume: 0.7,
            musicVolume: 0.6,
            fullscreen: false,
            keyBindings: {
                up: 'W',
                down: 'S',
                left: 'A',
                right: 'D',
                action: 'SPACE',
                menu: 'ESC'
            }
        };
    }

    /**
     * Phaser lifecycle method: preload
     * Load assets for the config screen (currently empty for basic implementation)
     */
    public preload(): void {
        console.log('ConfigScene: preload phase');
        // Future asset loading will be implemented here
    }

    /**
     * Phaser lifecycle method: create
     * Initialize the scene and create all game objects
     * @param data - Optional data passed from previous scene
     */
    public create(data?: SceneData): void {
        console.log('ConfigScene: create phase', data ? 'with data' : '');

        // Create entrance transition effect
        SceneTransition.createEntranceTransition(this, TransitionType.SLIDE_UP, 300);

        // Setup background
        this.setupBackground();

        // Create title
        this.createTitle();

        // Create configuration controls
        this.createConfigurationControls();

        // Create back button
        this.createBackButton();

        // Setup keyboard navigation
        this.setupKeyboardNavigation();

        console.log('ConfigScene: initialization completed');
    }
    /**
        * Phaser lifecycle method: update
        * Game loop processing (currently empty)
        * @param _time - Time elapsed since game start (milliseconds)
        * @param _delta - Time elapsed since last frame (milliseconds)
        */
    public update(_time: number, _delta: number): void {
        // Currently no update logic needed for config screen
    }

    /**
     * Private helper method: Setup background
     * Create visually appealing background for the config screen
     */
    private setupBackground(): void {
        try {
            // Create graphics object for background
            this.backgroundGraphics = this.add.graphics();

            // Create gradient background effect (similar to title screen)
            const topColor = 0x1a252f;
            const bottomColor = 0x2c3e50;

            this.backgroundGraphics.fillGradientStyle(
                topColor, topColor,
                bottomColor, bottomColor,
                1
            );

            this.backgroundGraphics.fillRect(0, 0, GameConfig.GAME_WIDTH, GameConfig.GAME_HEIGHT);

            // Set background to lowest depth
            this.backgroundGraphics.setDepth(-10);

            console.log('Config screen background setup completed');
        } catch (error) {
            console.error('Error setting up background:', error);
        }
    }

    /**
     * Private helper method: Create title text
     * Display the configuration screen title
     */
    private createTitle(): void {
        try {
            const centerX = GameConfig.GAME_WIDTH / 2;
            const titleY = GameConfig.GAME_HEIGHT * 0.15;

            const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
                fontSize: '48px',
                color: '#ffffff',
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
                stroke: '#2c3e50',
                strokeThickness: 3,
                align: 'center',
            };

            this.titleText = this.add.text(centerX, titleY, 'Configuration', titleStyle);
            this.titleText.setOrigin(0.5, 0.5);

            console.log(`Config title created at position: (${centerX}, ${titleY})`);
        } catch (error) {
            console.error('Error creating config title:', error);
        }
    }
    /**
         * Private helper method: Create configuration controls
         * Create volume sliders and settings toggles
         * Implements requirement 3.3: Show mock settings options
         */
    private createConfigurationControls(): void {
        try {
            const centerX = GameConfig.GAME_WIDTH / 2;
            const startY = GameConfig.GAME_HEIGHT * 0.35;
            const spacing = 80;

            // Create volume sliders
            this.masterVolumeSlider = new VolumeSlider(
                this,
                centerX,
                startY,
                'Master Volume:',
                this.configOptions.masterVolume,
                (value) => this.onMasterVolumeChange(value)
            );

            this.sfxVolumeSlider = new VolumeSlider(
                this,
                centerX,
                startY + spacing,
                'SFX Volume:',
                this.configOptions.sfxVolume,
                (value) => this.onSfxVolumeChange(value)
            );

            this.musicVolumeSlider = new VolumeSlider(
                this,
                centerX,
                startY + spacing * 2,
                'Music Volume:',
                this.configOptions.musicVolume,
                (value) => this.onMusicVolumeChange(value)
            );

            // Create fullscreen toggle
            this.fullscreenToggle = new ToggleButton(
                this,
                centerX,
                startY + spacing * 3,
                'Fullscreen:',
                this.configOptions.fullscreen,
                (enabled) => this.onFullscreenToggle(enabled)
            );

            console.log('Configuration controls created successfully');
        } catch (error) {
            console.error('Error creating configuration controls:', error);
        }
    }

    /**
     * Private helper method: Setup keyboard navigation
     * Initialize keyboard navigation manager and add navigable elements
     * Implements requirements 5.2, 5.3, 5.4: Keyboard navigation support
     */
    private setupKeyboardNavigation(): void {
        try {
            // Create keyboard navigation manager
            this.keyboardNavigation = new KeyboardNavigationManager(this);

            // Add navigable elements in order
            if (this.masterVolumeSlider) {
                this.keyboardNavigation.addElement(this.masterVolumeSlider);
            }
            if (this.sfxVolumeSlider) {
                this.keyboardNavigation.addElement(this.sfxVolumeSlider);
            }
            if (this.musicVolumeSlider) {
                this.keyboardNavigation.addElement(this.musicVolumeSlider);
            }
            if (this.fullscreenToggle) {
                this.keyboardNavigation.addElement(this.fullscreenToggle);
            }
            if (this.backButton) {
                this.keyboardNavigation.addElement(this.backButton);
            }

            console.log('ConfigScene: Keyboard navigation setup completed');
        } catch (error) {
            console.error('Error setting up keyboard navigation:', error);
        }
    }

    /**
     * Private helper method: Create back button
     * Create button to return to title screen
     * Implements requirement 3.4: Provide way to return to title screen
     */
    private createBackButton(): void {
        try {
            const centerX = GameConfig.GAME_WIDTH / 2;
            const buttonY = GameConfig.GAME_HEIGHT * 0.85;

            this.backButton = new NavigableMenuButton(
                this,
                centerX,
                buttonY,
                'Back',
                () => this.handleBack(),
                150, // width
                50,  // height
                'config-back-button'
            );

            console.log(`Back button created at position: (${centerX}, ${buttonY})`);
        } catch (error) {
            console.error('Error creating back button:', error);
        }
    }
    /**
       * Event handler: Master volume change
       * Handle master volume slider changes
       */
    private onMasterVolumeChange(value: number): void {
        this.configOptions.masterVolume = value;
        console.log(`Master volume changed to: ${Math.round(value * 100)}%`);
    }

    /**
     * Event handler: SFX volume change
     * Handle SFX volume slider changes
     */
    private onSfxVolumeChange(value: number): void {
        this.configOptions.sfxVolume = value;
        console.log(`SFX volume changed to: ${Math.round(value * 100)}%`);
    }

    /**
     * Event handler: Music volume change
     * Handle music volume slider changes
     */
    private onMusicVolumeChange(value: number): void {
        this.configOptions.musicVolume = value;
        console.log(`Music volume changed to: ${Math.round(value * 100)}%`);
    }

    /**
     * Event handler: Fullscreen toggle
     * Handle fullscreen toggle changes
     */
    private onFullscreenToggle(enabled: boolean): void {
        this.configOptions.fullscreen = enabled;
        console.log(`Fullscreen ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Private helper method: Handle back button click
     * Return to title screen
     * Implements requirement 3.4: Return to title screen
     */
    private async handleBack(): Promise<void> {
        try {
            console.log('Back button clicked - returning to title screen');

            // Validate target scene exists
            if (!SceneTransition.validateSceneKey(this, 'TitleScene')) {
                console.error('TitleScene not found');
                return;
            }

            // Use smooth transition back to title screen
            await SceneTransition.transitionTo(
                this,
                'TitleScene',
                TransitionType.SLIDE_UP,
                { fromScene: 'ConfigScene', action: 'back' }
            );
        } catch (error) {
            console.error('Error handling back button:', error);
        }
    }
    /**
      * Get current configuration options
      * Returns the current configuration state
      */
    public getConfigOptions(): ConfigOptions {
        return { ...this.configOptions };
    }

    /**
     * Set configuration options
     * Updates the configuration state and UI controls
     */
    public setConfigOptions(options: ConfigOptions): void {
        this.configOptions = { ...options };

        // Update UI controls if they exist
        if (this.masterVolumeSlider) {
            this.masterVolumeSlider.setValue(options.masterVolume);
        }
        if (this.sfxVolumeSlider) {
            this.sfxVolumeSlider.setValue(options.sfxVolume);
        }
        if (this.musicVolumeSlider) {
            this.musicVolumeSlider.setValue(options.musicVolume);
        }
        if (this.fullscreenToggle) {
            this.fullscreenToggle.setValue(options.fullscreen);
        }
    }

    /**
     * Scene cleanup method
     * Called when the scene is destroyed to prevent memory leaks
     */
    public destroy(): void {
        // Clean up keyboard navigation
        if (this.keyboardNavigation) {
            this.keyboardNavigation.destroy();
            this.keyboardNavigation = undefined;
        }

        // Clean up background graphics
        if (this.backgroundGraphics) {
            this.backgroundGraphics.destroy();
            this.backgroundGraphics = undefined;
        }

        // Clean up title text
        if (this.titleText) {
            this.titleText.destroy();
            this.titleText = undefined;
        }

        // Clean up back button
        if (this.backButton) {
            this.backButton.destroy();
            this.backButton = undefined;
        }

        // Clean up sliders
        if (this.masterVolumeSlider) {
            this.masterVolumeSlider.destroy();
            this.masterVolumeSlider = undefined;
        }

        if (this.sfxVolumeSlider) {
            this.sfxVolumeSlider.destroy();
            this.sfxVolumeSlider = undefined;
        }

        if (this.musicVolumeSlider) {
            this.musicVolumeSlider.destroy();
            this.musicVolumeSlider = undefined;
        }

        // Clean up toggle
        if (this.fullscreenToggle) {
            this.fullscreenToggle.destroy();
            this.fullscreenToggle = undefined;
        }

        console.log('ConfigScene: cleanup completed');
    }
}