import * as Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { NavigableMenuButton } from '../ui/NavigableMenuButton';
import { KeyboardNavigationManager } from '../utils/KeyboardNavigationManager';
import { SceneTransition, TransitionType, SceneData } from '../utils/SceneTransition';

/**
 * TitleScene class
 * Main title screen scene that displays the game title and provides navigation options
 * Implements requirements 1.1, 1.2, 1.3 from the title-menu-screen specification
 */
export class TitleScene extends Phaser.Scene {
    // Private properties for scene elements
    private gameTitle?: Phaser.GameObjects.Text;
    private backgroundGraphics?: Phaser.GameObjects.Graphics;
    private gameStartButton?: NavigableMenuButton;
    private configButton?: NavigableMenuButton;
    private keyboardNavigation?: KeyboardNavigationManager;

    /**
     * Constructor
     * Initialize the scene with the key 'TitleScene'
     */
    constructor() {
        super({ key: 'TitleScene' });
    }

    /**
     * Phaser lifecycle method: preload
     * Load assets for the title screen (currently empty for basic implementation)
     */
    public preload(): void {
        console.log('TitleScene: preload phase');
        // Future asset loading will be implemented here
    }

    /**
     * Phaser lifecycle method: create
     * Initialize the scene and create all game objects
     * @param data - Optional data passed from previous scene
     */
    public create(data?: SceneData): void {
        console.log('TitleScene: create phase', data ? 'with data' : '');

        // Create entrance transition effect
        SceneTransition.createEntranceTransition(this, TransitionType.FADE, 300);

        // Setup background
        this.setupBackground();

        // Create game title text
        this.createGameTitle();

        // Create navigation buttons
        this.createNavigationButtons();

        // Setup keyboard navigation
        this.setupKeyboardNavigation();

        console.log('TitleScene: initialization completed');
    }

    /**
     * Phaser lifecycle method: update
     * Game loop processing (currently empty)
     * @param _time - Time elapsed since game start (milliseconds)
     * @param _delta - Time elapsed since last frame (milliseconds)
     */
    public update(_time: number, _delta: number): void {
        // Currently no update logic needed for title screen
        // Future animations or interactions will be added here
    }

    /**
     * Private helper method: Create game title text
     * Display the game title prominently in the center-top area of the screen
     * Implements requirement 1.1: Display game name prominently
     */
    private createGameTitle(): void {
        try {
            // Calculate position for title (center horizontally, upper third vertically)
            const centerX: number = GameConfig.GAME_WIDTH / 2;
            const titleY: number = GameConfig.GAME_HEIGHT / 3;

            // Define text style for the game title
            const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
                fontSize: '96px',
                color: '#ffffff',
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
                stroke: '#2c3e50',
                strokeThickness: 6,
                shadow: {
                    offsetX: 4,
                    offsetY: 4,
                    color: '#000000',
                    blur: 8,
                    fill: true,
                },
                align: 'center',
            };

            // Create the game title text object
            this.gameTitle = this.add.text(centerX, titleY, '2D シミュレーションRPG', titleStyle);

            // Center the text (setOrigin(0.5) sets center as anchor point)
            this.gameTitle.setOrigin(0.5, 0.5);

            // Add subtle scale animation for visual appeal
            this.tweens.add({
                targets: this.gameTitle,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 2000,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
            });

            console.log(`Game title created at position: (${centerX}, ${titleY})`);
        } catch (error) {
            console.error('Error creating game title:', error);
        }
    }

    /**
     * Private helper method: Setup background
     * Create visually appealing background for the title screen
     * Implements requirement 1.2: Show visually appealing background
     */
    private setupBackground(): void {
        try {
            // Create graphics object for background
            this.backgroundGraphics = this.add.graphics();

            // Create gradient background effect
            this.createGradientBackground();

            // Set background to lowest depth
            this.backgroundGraphics.setDepth(-10);

            console.log('Title screen background setup completed');
        } catch (error) {
            console.error('Error setting up background:', error);
        }
    }

    /**
     * Private helper method: Create gradient background
     * Creates a visually appealing gradient background
     */
    private createGradientBackground(): void {
        if (!this.backgroundGraphics) return;

        // Create a gradient from dark blue to lighter blue
        const topColor = 0x1a252f;
        const bottomColor = 0x2c3e50;

        // Fill the entire screen with gradient effect
        this.backgroundGraphics.fillGradientStyle(
            topColor, topColor,    // Top colors
            bottomColor, bottomColor, // Bottom colors
            1 // Alpha
        );

        this.backgroundGraphics.fillRect(0, 0, GameConfig.GAME_WIDTH, GameConfig.GAME_HEIGHT);

        // Add some decorative elements for visual appeal
        this.addBackgroundDecorations();
    }

    /**
     * Private helper method: Add background decorations
     * Add subtle decorative elements to enhance visual appeal
     */
    private addBackgroundDecorations(): void {
        if (!this.backgroundGraphics) return;

        // Add some subtle geometric shapes for decoration
        this.backgroundGraphics.lineStyle(2, 0x34495e, 0.3);

        // Draw some decorative lines
        for (let i = 0; i < 5; i++) {
            const x = (GameConfig.GAME_WIDTH / 6) * (i + 1);
            this.backgroundGraphics.lineBetween(x, 0, x, GameConfig.GAME_HEIGHT);
        }

        for (let i = 0; i < 3; i++) {
            const y = (GameConfig.GAME_HEIGHT / 4) * (i + 1);
            this.backgroundGraphics.lineBetween(0, y, GameConfig.GAME_WIDTH, y);
        }
    }

    /**
     * Private helper method: Create navigation buttons
     * Create "Game Start" and "Config" buttons with proper positioning
     * Implements requirements 2.1, 3.1: Show navigation buttons and handle clicks
     */
    private createNavigationButtons(): void {
        try {
            // Calculate button positions
            const centerX = GameConfig.GAME_WIDTH / 2;
            const buttonStartY = GameConfig.GAME_HEIGHT * 0.6; // Position buttons in lower half
            const buttonSpacing = 80; // Vertical spacing between buttons

            // Create "Game Start" button with keyboard navigation support
            this.gameStartButton = new NavigableMenuButton(
                this,
                centerX,
                buttonStartY,
                'Game Start',
                () => this.handleGameStart(),
                220, // width
                60,  // height
                'title-game-start-button'
            );

            // Create "Config" button with keyboard navigation support
            this.configButton = new NavigableMenuButton(
                this,
                centerX,
                buttonStartY + buttonSpacing,
                'Config',
                () => this.handleConfig(),
                220, // width
                60,  // height
                'title-config-button'
            );

            console.log(`Navigation buttons created at positions: Game Start (${centerX}, ${buttonStartY}), Config (${centerX}, ${buttonStartY + buttonSpacing})`);
        } catch (error) {
            console.error('Error creating navigation buttons:', error);
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
            if (this.gameStartButton) {
                this.keyboardNavigation.addElement(this.gameStartButton);
            }
            if (this.configButton) {
                this.keyboardNavigation.addElement(this.configButton);
            }

            console.log('TitleScene: Keyboard navigation setup completed');
        } catch (error) {
            console.error('Error setting up keyboard navigation:', error);
        }
    }

    /**
     * Private helper method: Handle Game Start button click
     * Transition to stage selection scene
     * Implements requirement 2.2: Transition to stage selection screen
     */
    private async handleGameStart(): Promise<void> {
        try {
            console.log('Game Start button clicked - transitioning to stage selection');

            // Validate target scene exists
            if (!SceneTransition.validateSceneKey(this, 'StageSelectScene')) {
                console.error('StageSelectScene not found');
                return;
            }

            // Use smooth transition to stage selection
            await SceneTransition.transitionTo(
                this,
                'StageSelectScene',
                TransitionType.SLIDE_LEFT,
                { fromScene: 'TitleScene', action: 'gameStart' }
            );
        } catch (error) {
            console.error('Error handling game start:', error);
        }
    }

    /**
     * Private helper method: Handle Config button click
     * Transition to configuration scene
     * Implements requirement 3.2: Display configuration menu
     */
    private async handleConfig(): Promise<void> {
        try {
            console.log('Config button clicked - transitioning to configuration');

            // Validate target scene exists
            if (!SceneTransition.validateSceneKey(this, 'ConfigScene')) {
                console.error('ConfigScene not found');
                return;
            }

            // Use smooth transition to config scene
            await SceneTransition.transitionTo(
                this,
                'ConfigScene',
                TransitionType.SLIDE_DOWN,
                { fromScene: 'TitleScene', action: 'config' }
            );
        } catch (error) {
            console.error('Error handling config:', error);
        }
    }

    /**
     * Scene cleanup method
     * Called when the scene is destroyed to prevent memory leaks
     */
    public destroy(): void {
        // Clean up game title
        if (this.gameTitle) {
            this.gameTitle.destroy();
            this.gameTitle = undefined;
        }

        // Clean up background graphics
        if (this.backgroundGraphics) {
            this.backgroundGraphics.destroy();
            this.backgroundGraphics = undefined;
        }

        // Clean up keyboard navigation
        if (this.keyboardNavigation) {
            this.keyboardNavigation.destroy();
            this.keyboardNavigation = undefined;
        }

        // Clean up navigation buttons
        if (this.gameStartButton) {
            this.gameStartButton.destroy();
            this.gameStartButton = undefined;
        }

        if (this.configButton) {
            this.configButton.destroy();
            this.configButton = undefined;
        }

        console.log('TitleScene: cleanup completed');
    }
}