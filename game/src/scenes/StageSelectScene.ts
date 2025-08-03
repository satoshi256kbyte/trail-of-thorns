import * as Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { NavigableMenuButton } from '../ui/NavigableMenuButton';
import { NavigableStageButton } from '../ui/NavigableStageButton';
import { KeyboardNavigationManager } from '../utils/KeyboardNavigationManager';
import { StageData, StagesConfig, StageLoadResult } from '../types/StageData';
import { SceneTransition, TransitionType, SceneData } from '../utils/SceneTransition';

/**
 * StageSelectScene class
 * Implements stage selection interface with grid layout system
 * Loads stage data from JSON configuration and provides navigation
 * Implements requirements 6.1, 6.5 from the title-menu-screen specification
 */
export class StageSelectScene extends Phaser.Scene {
  // Private properties for scene elements
  private backgroundGraphics?: Phaser.GameObjects.Graphics;
  private titleText?: Phaser.GameObjects.Text;
  private backButton?: NavigableMenuButton;
  private stageData: StageData[] = [];
  private stageButtons: NavigableStageButton[] = [];
  private loadingText?: Phaser.GameObjects.Text;
  private keyboardNavigation?: KeyboardNavigationManager;

  // Grid layout configuration
  private static readonly GRID_CONFIG = {
    columns: 3,
    rows: 2,
    buttonWidth: 280,
    buttonHeight: 160,
    horizontalSpacing: 320,
    verticalSpacing: 200,
    startX: GameConfig.GAME_WIDTH / 2 - 320, // Center the grid
    startY: GameConfig.GAME_HEIGHT / 2 - 80,
  };

  /**
   * Constructor
   * Initialize the scene with the key 'StageSelectScene'
   */
  constructor() {
    super({ key: 'StageSelectScene' });
  }

  /**
   * Phaser lifecycle method: preload
   * Load stage data from JSON configuration
   */
  public preload(): void {
    console.log('StageSelectScene: preload phase');

    // Load stages JSON data
    this.load.json('stagesData', 'data/stages.json');

    // Show loading indicator
    this.showLoadingIndicator();
  }

  /**
   * Phaser lifecycle method: create
   * Initialize the scene and create all game objects
   * @param data - Optional data passed from previous scene
   */
  public create(data?: SceneData): void {
    console.log('StageSelectScene: create phase', data ? 'with data' : '');

    // Create entrance transition effect
    SceneTransition.createEntranceTransition(this, TransitionType.SLIDE_RIGHT, 300);

    // Setup background
    this.setupBackground();

    // Create title
    this.createTitle();

    // Load and process stage data
    this.loadStageData();

    // Create stage selection grid
    this.createStageGrid();

    // Create back button
    this.createBackButton();

    // Setup keyboard navigation
    this.setupKeyboardNavigation();

    // Hide loading indicator
    this.hideLoadingIndicator();

    console.log('StageSelectScene: initialization completed');
  }

  /**
   * Private helper method: Show loading indicator
   * Display loading text while data is being loaded
   */
  private showLoadingIndicator(): void {
    this.loadingText = this.add
      .text(GameConfig.GAME_WIDTH / 2, GameConfig.GAME_HEIGHT / 2, 'Loading stages...', {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);
  }

  /**
   * Private helper method: Hide loading indicator
   * Remove loading text when data loading is complete
   */
  private hideLoadingIndicator(): void {
    if (this.loadingText) {
      this.loadingText.destroy();
      this.loadingText = undefined;
    }
  }

  /**
   * Private helper method: Setup background
   * Create visually appealing background for the stage selection screen
   */
  private setupBackground(): void {
    try {
      // Create graphics object for background
      this.backgroundGraphics = this.add.graphics();

      // Create gradient background similar to title screen
      this.createGradientBackground();

      // Set background to lowest depth
      this.backgroundGraphics.setDepth(-10);

      console.log('Stage selection background setup completed');
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

    // Create a gradient from dark blue to lighter blue (similar to title screen)
    const topColor = 0x1a252f;
    const bottomColor = 0x2c3e50;

    // Fill the entire screen with gradient effect
    this.backgroundGraphics.fillGradientStyle(
      topColor,
      topColor, // Top colors
      bottomColor,
      bottomColor, // Bottom colors
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
    this.backgroundGraphics.lineStyle(1, 0x34495e, 0.2);

    // Draw decorative grid pattern
    for (let i = 0; i < 8; i++) {
      const x = (GameConfig.GAME_WIDTH / 8) * i;
      this.backgroundGraphics.lineBetween(x, 0, x, GameConfig.GAME_HEIGHT);
    }

    for (let i = 0; i < 5; i++) {
      const y = (GameConfig.GAME_HEIGHT / 5) * i;
      this.backgroundGraphics.lineBetween(0, y, GameConfig.GAME_WIDTH, y);
    }
  }

  /**
   * Private helper method: Create title
   * Display the stage selection title
   */
  private createTitle(): void {
    try {
      const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        fontSize: '48px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        stroke: '#2c3e50',
        strokeThickness: 4,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',
          blur: 4,
          fill: true,
        },
        align: 'center',
      };

      this.titleText = this.add.text(GameConfig.GAME_WIDTH / 2, 120, 'Stage Selection', titleStyle);

      this.titleText.setOrigin(0.5, 0.5);

      console.log('Stage selection title created');
    } catch (error) {
      console.error('Error creating title:', error);
    }
  }

  /**
   * Private helper method: Load stage data from JSON
   * Parse and validate stage data from the loaded JSON file
   * Implements requirement 6.1: Show list/grid of available stages
   */
  private loadStageData(): void {
    try {
      const loadResult = this.parseStageData();

      if (loadResult.success && loadResult.stages) {
        this.stageData = loadResult.stages;
        console.log(`Successfully loaded ${this.stageData.length} stages`);
      } else {
        console.error('Failed to load stage data:', loadResult.error);
        this.handleStageDataError(loadResult.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error loading stage data:', error);
      this.handleStageDataError('Failed to parse stage data');
    }
  }

  /**
   * Private helper method: Parse stage data from JSON
   * Validate and process the loaded JSON data
   * @returns StageLoadResult with success status and data or error
   */
  private parseStageData(): StageLoadResult {
    try {
      const jsonData = this.cache.json.get('stagesData') as StagesConfig;

      if (!jsonData || !jsonData.stages || !Array.isArray(jsonData.stages)) {
        return {
          success: false,
          error: 'Invalid JSON structure: missing stages array',
        };
      }

      // Validate each stage data
      const validatedStages: StageData[] = [];
      for (const stage of jsonData.stages) {
        const validationResult = this.validateStageData(stage);
        if (validationResult.isValid) {
          validatedStages.push(stage);
        } else {
          console.warn(`Invalid stage data for ${stage.id}: ${validationResult.error}`);
        }
      }

      if (validatedStages.length === 0) {
        return {
          success: false,
          error: 'No valid stages found in data',
        };
      }

      // Sort stages by order
      validatedStages.sort((a, b) => a.order - b.order);

      return {
        success: true,
        stages: validatedStages,
      };
    } catch (error) {
      return {
        success: false,
        error: `JSON parsing error: ${error}`,
      };
    }
  }

  /**
   * Private helper method: Validate individual stage data
   * Check if stage data has all required properties with valid values
   * @param stage - Stage data to validate
   * @returns Validation result with success status and error message
   */
  private validateStageData(stage: any): { isValid: boolean; error?: string } {
    if (!stage.id || typeof stage.id !== 'string') {
      return { isValid: false, error: 'Missing or invalid id' };
    }

    if (!stage.name || typeof stage.name !== 'string') {
      return { isValid: false, error: 'Missing or invalid name' };
    }

    if (!stage.description || typeof stage.description !== 'string') {
      return { isValid: false, error: 'Missing or invalid description' };
    }

    if (typeof stage.isUnlocked !== 'boolean') {
      return { isValid: false, error: 'Missing or invalid isUnlocked' };
    }

    if (typeof stage.difficulty !== 'number' || stage.difficulty < 1 || stage.difficulty > 5) {
      return { isValid: false, error: 'Invalid difficulty (must be 1-5)' };
    }

    if (typeof stage.order !== 'number' || stage.order < 1) {
      return { isValid: false, error: 'Invalid order (must be positive number)' };
    }

    return { isValid: true };
  }

  /**
   * Private helper method: Handle stage data loading errors
   * Display error message and provide fallback functionality
   * @param errorMessage - Error message to display
   */
  private handleStageDataError(errorMessage: string): void {
    // Display error message
    this.add
      .text(
        GameConfig.GAME_WIDTH / 2,
        GameConfig.GAME_HEIGHT / 2,
        `Error loading stages:\n${errorMessage}\n\nPlease check the data/stages.json file`,
        {
          fontSize: '24px',
          color: '#ff6b6b',
          fontFamily: 'Arial',
          align: 'center',
        }
      )
      .setOrigin(0.5);

    // Create fallback stage data for testing
    this.stageData = [
      {
        id: 'fallback-stage',
        name: 'Test Stage',
        description: 'Fallback stage for testing',
        isUnlocked: true,
        difficulty: 1,
        order: 1,
      },
    ];
  }

  /**
   * Private helper method: Create stage selection grid
   * Generate grid layout with stage buttons
   * Implements requirement 6.1: Display available stages in grid format
   */
  private createStageGrid(): void {
    try {
      // Clear existing stage buttons
      this.clearStageButtons();

      // Create stage buttons in grid layout
      for (let i = 0; i < this.stageData.length && i < 6; i++) {
        const stage = this.stageData[i];
        const gridPosition = this.calculateGridPosition(i);

        const stageButton = this.createStageButton(stage, gridPosition.x, gridPosition.y);
        this.stageButtons.push(stageButton);
      }

      console.log(`Created ${this.stageButtons.length} stage buttons`);
    } catch (error) {
      console.error('Error creating stage grid:', error);
    }
  }

  /**
   * Private helper method: Calculate grid position for stage button
   * @param index - Index of the stage in the array
   * @returns Object with x and y coordinates
   */
  private calculateGridPosition(index: number): { x: number; y: number } {
    const row = Math.floor(index / StageSelectScene.GRID_CONFIG.columns);
    const col = index % StageSelectScene.GRID_CONFIG.columns;

    const x =
      StageSelectScene.GRID_CONFIG.startX + col * StageSelectScene.GRID_CONFIG.horizontalSpacing;
    const y =
      StageSelectScene.GRID_CONFIG.startY + row * StageSelectScene.GRID_CONFIG.verticalSpacing;

    return { x, y };
  }

  /**
   * Private helper method: Create individual stage button using StageButton component
   * @param stage - Stage data for the button
   * @param x - X position for the button
   * @param y - Y position for the button
   * @returns Created StageButton instance
   */
  private createStageButton(stage: StageData, x: number, y: number): NavigableStageButton {
    return new NavigableStageButton(
      this,
      x,
      y,
      stage,
      (selectedStage: StageData) => this.handleStageSelect(selectedStage),
      `stage-button-${stage.id}`
    );
  }

  /**
   * Private helper method: Handle stage selection
   * Process stage selection and transition to gameplay
   * Implements scene data passing for selected stages
   * @param stage - Selected stage data
   */
  private async handleStageSelect(stage: StageData): Promise<void> {
    try {
      console.log(`Stage selected: ${stage.name} (${stage.id})`);

      // Validate that GameplayScene exists
      if (!SceneTransition.validateSceneKey(this, 'GameplayScene')) {
        console.error('GameplayScene not found in scene manager');
        this.showError('GameplayScene not available. Please check the game configuration.');
        return;
      }

      // Show loading state
      this.showLoadingState('Loading stage...');

      // Prepare comprehensive stage data to pass to gameplay scene
      const stageSceneData: SceneData = {
        selectedStage: stage,
        fromScene: 'StageSelectScene',
        action: 'stageSelected',
        timestamp: Date.now(),
        playerData: {
          // Placeholder for future player data integration
          level: 1,
          experience: 0,
          unlockedStages: this.getUnlockedStageIds(),
        },
        gameplayConfig: {
          // Pass gameplay configuration options
          debugMode: false,
          autoSaveEnabled: true,
          difficultyModifier: this.getDifficultyModifier(stage.difficulty),
        },
      };

      console.log(`Transitioning to GameplayScene with stage data:`, stageSceneData);

      // Use smooth transition to GameplayScene with stage data
      await SceneTransition.transitionTo(
        this,
        'GameplayScene',
        TransitionType.FADE,
        stageSceneData
      );
    } catch (error) {
      console.error('Error handling stage selection:', error);
      this.showError(`Failed to start stage: ${error.message || error}`);
    } finally {
      // Hide loading state
      this.hideLoadingState();
    }
  }

  /**
   * Get list of unlocked stage IDs for player data
   * @returns Array of unlocked stage IDs
   */
  private getUnlockedStageIds(): string[] {
    return this.stageData.filter(stage => stage.isUnlocked).map(stage => stage.id);
  }

  /**
   * Get difficulty modifier based on stage difficulty
   * @param difficulty - Stage difficulty level (1-5)
   * @returns Difficulty modifier value
   */
  private getDifficultyModifier(difficulty: number): number {
    // Convert difficulty level to modifier (1.0 = normal, higher = harder)
    return 0.5 + difficulty * 0.25; // Range: 0.75 to 1.75
  }

  /**
   * Show loading state during stage transition
   * @param message - Loading message to display
   */
  private showLoadingState(message: string): void {
    // Disable all interactive elements
    this.stageButtons.forEach(button => button.setInteractive(false));
    if (this.backButton) {
      this.backButton.setInteractive(false);
    }

    // Show loading overlay
    const loadingOverlay = this.add
      .graphics()
      .fillStyle(0x000000, 0.7)
      .fillRect(0, 0, GameConfig.GAME_WIDTH, GameConfig.GAME_HEIGHT)
      .setDepth(1000);

    const loadingText = this.add
      .text(GameConfig.GAME_WIDTH / 2, GameConfig.GAME_HEIGHT / 2, message, {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'Arial',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(1001);

    // Store references for cleanup
    this.data.set('loadingOverlay', loadingOverlay);
    this.data.set('loadingText', loadingText);
  }

  /**
   * Hide loading state
   */
  private hideLoadingState(): void {
    // Re-enable interactive elements
    this.stageButtons.forEach(button => button.setInteractive(true));
    if (this.backButton) {
      this.backButton.setInteractive(true);
    }

    // Remove loading overlay
    const loadingOverlay = this.data.get('loadingOverlay');
    const loadingText = this.data.get('loadingText');

    if (loadingOverlay) {
      loadingOverlay.destroy();
      this.data.remove('loadingOverlay');
    }

    if (loadingText) {
      loadingText.destroy();
      this.data.remove('loadingText');
    }
  }

  /**
   * Show error message to user
   * @param message - Error message to display
   */
  private showError(message: string): void {
    const errorText = this.add
      .text(GameConfig.GAME_WIDTH / 2, GameConfig.GAME_HEIGHT / 2 + 100, message, {
        fontSize: '18px',
        color: '#ff6666',
        fontFamily: 'Arial',
        align: 'center',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(2000);

    // Auto-remove error after 3 seconds
    this.time.delayedCall(3000, () => {
      if (errorText) {
        errorText.destroy();
      }
    });
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

      // Add stage buttons in grid order (left to right, top to bottom)
      this.stageButtons.forEach(stageButton => {
        this.keyboardNavigation!.addElement(stageButton);
      });

      // Add back button last
      if (this.backButton) {
        this.keyboardNavigation.addElement(this.backButton);
      }

      console.log('StageSelectScene: Keyboard navigation setup completed');
    } catch (error) {
      console.error('Error setting up keyboard navigation:', error);
    }
  }

  /**
   * Private helper method: Create back button
   * Add navigation button to return to title screen
   * Implements requirement 6.5: Provide way to return to title screen
   */
  private createBackButton(): void {
    try {
      this.backButton = new NavigableMenuButton(
        this,
        GameConfig.GAME_WIDTH / 2,
        GameConfig.GAME_HEIGHT - 80,
        'Back to Title',
        () => this.handleBack(),
        200,
        50,
        'stage-select-back-button'
      );

      console.log('Back button created');
    } catch (error) {
      console.error('Error creating back button:', error);
    }
  }

  /**
   * Private helper method: Handle back button click
   * Return to title screen with transition effect
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
      await SceneTransition.transitionTo(this, 'TitleScene', TransitionType.SLIDE_RIGHT, {
        fromScene: 'StageSelectScene',
        action: 'back',
      });
    } catch (error) {
      console.error('Error handling back navigation:', error);
    }
  }

  /**
   * Private helper method: Clear existing stage buttons
   * Clean up stage buttons before recreating them
   */
  private clearStageButtons(): void {
    this.stageButtons.forEach(button => {
      if (button) {
        button.destroy();
      }
    });
    this.stageButtons = [];
  }

  /**
   * Public method: Get loaded stage data
   * @returns Array of loaded stage data
   */
  public getStageData(): StageData[] {
    return [...this.stageData];
  }

  /**
   * Public method: Get stage count
   * @returns Number of loaded stages
   */
  public getStageCount(): number {
    return this.stageData.length;
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

    // Clean up loading text
    if (this.loadingText) {
      this.loadingText.destroy();
      this.loadingText = undefined;
    }

    // Clean up stage buttons
    this.clearStageButtons();

    // Clear stage data
    this.stageData = [];

    console.log('StageSelectScene: cleanup completed');
  }
}
