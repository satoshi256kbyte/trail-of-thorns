import * as Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { NavigableMenuButton } from '../ui/NavigableMenuButton';
import { KeyboardNavigationManager } from '../utils/KeyboardNavigationManager';
import { SceneTransition, TransitionType, SceneData } from '../utils/SceneTransition';
import { ChapterData } from '../types/chapter';

/**
 * ChapterSelectScene class
 * 章選択画面を実装
 * 要件8.1, 8.2を実装: 解放済みの章をリスト形式で表示し、章情報を表示
 */
export class ChapterSelectScene extends Phaser.Scene {
  // Private properties for scene elements
  private backgroundGraphics?: Phaser.GameObjects.Graphics;
  private titleText?: Phaser.GameObjects.Text;
  private backButton?: NavigableMenuButton;
  private continueButton?: NavigableMenuButton;
  private chapterData: ChapterData[] = [];
  private chapterButtons: NavigableMenuButton[] = [];
  private chapterInfoPanels: Map<string, Phaser.GameObjects.Container> = new Map();
  private loadingText?: Phaser.GameObjects.Text;
  private keyboardNavigation?: KeyboardNavigationManager;
  private currentChapterInfo?: Phaser.GameObjects.Container;
  private currentChapterId?: string; // Track current chapter in progress

  // Layout configuration
  private static readonly LAYOUT_CONFIG = {
    chapterListX: 200,
    chapterListStartY: 200,
    chapterButtonWidth: 300,
    chapterButtonHeight: 80,
    chapterButtonSpacing: 100,
    infoPanelX: 600,
    infoPanelY: 200,
    infoPanelWidth: 600,
    infoPanelHeight: 500,
  };

  /**
   * Constructor
   * Initialize the scene with the key 'ChapterSelectScene'
   */
  constructor() {
    super({ key: 'ChapterSelectScene' });
  }

  /**
   * Phaser lifecycle method: preload
   * Load chapter data from JSON configuration
   */
  public preload(): void {
    console.log('ChapterSelectScene: preload phase');

    // Load chapters JSON data
    this.load.json('chaptersData', 'data/chapters.json');

    // Show loading indicator
    this.showLoadingIndicator();
  }

  /**
   * Phaser lifecycle method: create
   * Initialize the scene and create all game objects
   * @param data - Optional data passed from previous scene
   */
  public create(data?: SceneData): void {
    console.log('ChapterSelectScene: create phase', data ? 'with data' : '');

    // Create entrance transition effect
    SceneTransition.createEntranceTransition(this, TransitionType.SLIDE_LEFT, 300);

    // Setup background
    this.setupBackground();

    // Create title
    this.createTitle();

    // Load and process chapter data
    this.loadChapterData();

    // Create chapter list
    this.createChapterList();

    // Create continue button if there's a chapter in progress
    this.createContinueButton();

    // Create back button
    this.createBackButton();

    // Setup keyboard navigation
    this.setupKeyboardNavigation();

    // Hide loading indicator
    this.hideLoadingIndicator();

    console.log('ChapterSelectScene: initialization completed');
  }

  /**
   * Private helper method: Show loading indicator
   * Display loading text while data is being loaded
   */
  private showLoadingIndicator(): void {
    this.loadingText = this.add
      .text(GameConfig.GAME_WIDTH / 2, GameConfig.GAME_HEIGHT / 2, '章データを読み込み中...', {
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
   * Create visually appealing background for the chapter selection screen
   */
  private setupBackground(): void {
    try {
      // Create graphics object for background
      this.backgroundGraphics = this.add.graphics();

      // Create gradient background
      this.createGradientBackground();

      // Set background to lowest depth
      this.backgroundGraphics.setDepth(-10);

      console.log('Chapter selection background setup completed');
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
   * Display the chapter selection title
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

      this.titleText = this.add.text(GameConfig.GAME_WIDTH / 2, 100, '章選択', titleStyle);

      this.titleText.setOrigin(0.5, 0.5);

      console.log('Chapter selection title created');
    } catch (error) {
      console.error('Error creating title:', error);
    }
  }

  /**
   * Private helper method: Load chapter data from JSON
   * Parse and validate chapter data from the loaded JSON file
   * 要件8.1を実装: 解放済みの章をリスト形式で表示
   */
  private loadChapterData(): void {
    try {
      const jsonData = this.cache.json.get('chaptersData');

      if (!jsonData || !jsonData.chapters || !Array.isArray(jsonData.chapters)) {
        console.error('Invalid chapter data structure');
        this.handleChapterDataError('章データの構造が無効です');
        return;
      }

      // Validate and store chapter data
      this.chapterData = jsonData.chapters.filter((chapter: any) => {
        return this.validateChapterData(chapter);
      });

      console.log(`Successfully loaded ${this.chapterData.length} chapters`);
    } catch (error) {
      console.error('Error loading chapter data:', error);
      this.handleChapterDataError('章データの読み込みに失敗しました');
    }
  }

  /**
   * Private helper method: Validate individual chapter data
   * Check if chapter data has all required properties with valid values
   * @param chapter - Chapter data to validate
   * @returns True if valid, false otherwise
   */
  private validateChapterData(chapter: any): boolean {
    if (!chapter.id || typeof chapter.id !== 'string') {
      console.warn('Invalid chapter: missing or invalid id');
      return false;
    }

    if (!chapter.name || typeof chapter.name !== 'string') {
      console.warn('Invalid chapter: missing or invalid name');
      return false;
    }

    if (!chapter.storyDescription || typeof chapter.storyDescription !== 'string') {
      console.warn('Invalid chapter: missing or invalid storyDescription');
      return false;
    }

    if (typeof chapter.recommendedLevel !== 'number' || chapter.recommendedLevel < 1) {
      console.warn('Invalid chapter: invalid recommendedLevel');
      return false;
    }

    if (!Array.isArray(chapter.stages)) {
      console.warn('Invalid chapter: stages must be an array');
      return false;
    }

    return true;
  }

  /**
   * Private helper method: Handle chapter data loading errors
   * Display error message and provide fallback functionality
   * @param errorMessage - Error message to display
   */
  private handleChapterDataError(errorMessage: string): void {
    // Display error message
    this.add
      .text(
        GameConfig.GAME_WIDTH / 2,
        GameConfig.GAME_HEIGHT / 2,
        `エラー: ${errorMessage}\n\ndata/chapters.jsonファイルを確認してください`,
        {
          fontSize: '24px',
          color: '#ff6b6b',
          fontFamily: 'Arial',
          align: 'center',
        }
      )
      .setOrigin(0.5);

    // Create fallback chapter data for testing
    this.chapterData = [
      {
        id: 'chapter-1',
        name: 'テスト章',
        storyDescription: 'テスト用の章です',
        stages: [],
        recommendedLevel: 1,
      },
    ];
  }

  /**
   * Private helper method: Create chapter list
   * Generate list of chapter buttons with unlock status
   * 要件8.1, 8.2を実装: 章リストの表示と章情報の表示
   */
  private createChapterList(): void {
    try {
      // Clear existing chapter buttons
      this.clearChapterButtons();

      // Create chapter buttons
      this.chapterData.forEach((chapter, index) => {
        const y =
          ChapterSelectScene.LAYOUT_CONFIG.chapterListStartY +
          index * ChapterSelectScene.LAYOUT_CONFIG.chapterButtonSpacing;

        const button = this.createChapterButton(chapter, y, index);
        this.chapterButtons.push(button);

        // Create info panel for this chapter
        const infoPanel = this.createChapterInfoPanel(chapter);
        this.chapterInfoPanels.set(chapter.id, infoPanel);
      });

      console.log(`Created ${this.chapterButtons.length} chapter buttons`);
    } catch (error) {
      console.error('Error creating chapter list:', error);
    }
  }

  /**
   * Private helper method: Create individual chapter button
   * @param chapter - Chapter data for the button
   * @param y - Y position for the button
   * @param index - Index of the chapter
   * @returns Created NavigableMenuButton instance
   */
  private createChapterButton(
    chapter: ChapterData,
    y: number,
    index: number
  ): NavigableMenuButton {
    const isUnlocked = this.isChapterUnlocked(chapter);
    const buttonText = `${index + 1}. ${chapter.name}${isUnlocked ? '' : ' 🔒'}`;

    const button = new NavigableMenuButton(
      this,
      ChapterSelectScene.LAYOUT_CONFIG.chapterListX,
      y,
      buttonText,
      () => this.handleChapterSelect(chapter),
      ChapterSelectScene.LAYOUT_CONFIG.chapterButtonWidth,
      ChapterSelectScene.LAYOUT_CONFIG.chapterButtonHeight,
      `chapter-button-${chapter.id}`
    );

    // Disable button if chapter is locked
    if (!isUnlocked) {
      button.setInteractive(false);
      button.setAlpha(0.5);
    }

    // Add hover effect to show chapter info
    button.on('pointerover', () => {
      this.showChapterInfo(chapter);
    });

    return button;
  }

  /**
   * Private helper method: Check if chapter is unlocked
   * @param chapter - Chapter to check
   * @returns True if unlocked, false otherwise
   */
  private isChapterUnlocked(chapter: ChapterData): boolean {
    // TODO: Implement actual unlock logic based on game progress
    // For now, unlock first chapter by default
    return chapter.id === 'chapter-1' || !chapter.unlockCondition;
  }

  /**
   * Private helper method: Create chapter info panel
   * 要件8.2を実装: 章の概要、ステージ数、推奨レベル、ストーリー概要を表示
   * @param chapter - Chapter data
   * @returns Container with chapter information
   */
  private createChapterInfoPanel(chapter: ChapterData): Phaser.GameObjects.Container {
    const container = this.add.container(
      ChapterSelectScene.LAYOUT_CONFIG.infoPanelX,
      ChapterSelectScene.LAYOUT_CONFIG.infoPanelY
    );

    // Background panel
    const background = this.add.rectangle(
      0,
      0,
      ChapterSelectScene.LAYOUT_CONFIG.infoPanelWidth,
      ChapterSelectScene.LAYOUT_CONFIG.infoPanelHeight,
      0x2c3e50,
      0.9
    );
    background.setStrokeStyle(2, 0x3498db);
    container.add(background);

    // Chapter name
    const nameText = this.add.text(0, -220, chapter.name, {
      fontSize: '36px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      align: 'center',
    });
    nameText.setOrigin(0.5, 0);
    container.add(nameText);

    // Recommended level
    const levelText = this.add.text(0, -160, `推奨レベル: ${chapter.recommendedLevel}`, {
      fontSize: '24px',
      color: '#f39c12',
      fontFamily: 'Arial',
      align: 'center',
    });
    levelText.setOrigin(0.5, 0);
    container.add(levelText);

    // Stage count
    const stageCount = chapter.stages?.length || 0;
    const stageText = this.add.text(0, -120, `ステージ数: ${stageCount}`, {
      fontSize: '24px',
      color: '#3498db',
      fontFamily: 'Arial',
      align: 'center',
    });
    stageText.setOrigin(0.5, 0);
    container.add(stageText);

    // Story description
    const descriptionText = this.add.text(0, -60, chapter.storyDescription, {
      fontSize: '20px',
      color: '#ecf0f1',
      fontFamily: 'Arial',
      align: 'center',
      wordWrap: { width: ChapterSelectScene.LAYOUT_CONFIG.infoPanelWidth - 40 },
    });
    descriptionText.setOrigin(0.5, 0);
    container.add(descriptionText);

    // Unlock status
    const isUnlocked = this.isChapterUnlocked(chapter);
    const statusText = this.add.text(
      0,
      180,
      isUnlocked ? '✓ 解放済み' : '🔒 未解放',
      {
        fontSize: '24px',
        color: isUnlocked ? '#2ecc71' : '#e74c3c',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        align: 'center',
      }
    );
    statusText.setOrigin(0.5, 0);
    container.add(statusText);

    // Hide by default
    container.setVisible(false);

    return container;
  }

  /**
   * Private helper method: Show chapter info panel
   * @param chapter - Chapter to show info for
   */
  private showChapterInfo(chapter: ChapterData): void {
    // Hide current info panel
    if (this.currentChapterInfo) {
      this.currentChapterInfo.setVisible(false);
    }

    // Show selected chapter info
    const infoPanel = this.chapterInfoPanels.get(chapter.id);
    if (infoPanel) {
      infoPanel.setVisible(true);
      this.currentChapterInfo = infoPanel;
    }
  }

  /**
   * Private helper method: Handle chapter selection
   * Process chapter selection and transition to stage selection
   * 要件8.3, 8.4を実装: 章を開始し、未解放章の選択を制限
   * @param chapter - Selected chapter data
   */
  private async handleChapterSelect(chapter: ChapterData): Promise<void> {
    try {
      console.log(`Chapter selected: ${chapter.name} (${chapter.id})`);

      // Check if chapter is unlocked
      if (!this.isChapterUnlocked(chapter)) {
        console.log(`Chapter ${chapter.name} is locked`);
        this.showUnlockConditions(chapter);
        // Provide visual feedback for locked chapter
        this.showLockedChapterFeedback(chapter);
        return;
      }

      // Show loading state
      this.showLoadingState('章を開始しています...');

      // Validate that StageSelectScene exists
      if (!SceneTransition.validateSceneKey(this, 'StageSelectScene')) {
        console.error('StageSelectScene not found in scene manager');
        this.showError('ステージ選択画面が見つかりません');
        this.hideLoadingState();
        return;
      }

      // Prepare chapter data to pass to stage selection scene
      const sceneData: SceneData = {
        selectedChapter: chapter,
        fromScene: 'ChapterSelectScene',
        action: 'chapterSelected',
        timestamp: Date.now(),
      };

      console.log(`Transitioning to StageSelectScene with chapter data:`, sceneData);

      // Use smooth transition to StageSelectScene with chapter data
      await SceneTransition.transitionTo(
        this,
        'StageSelectScene',
        TransitionType.SLIDE_LEFT,
        sceneData
      );
    } catch (error) {
      console.error('Error handling chapter selection:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.showError(`章の開始に失敗しました: ${errorMessage}`);
      this.hideLoadingState();
    }
  }

  /**
   * Private helper method: Show visual feedback for locked chapter
   * @param chapter - Locked chapter
   */
  private showLockedChapterFeedback(chapter: ChapterData): void {
    // Find the button for this chapter
    const button = this.chapterButtons.find(
      btn => btn.getId() === `chapter-button-${chapter.id}`
    );

    if (button) {
      // Shake animation to indicate locked state
      this.tweens.add({
        targets: button,
        x: button.x - 10,
        duration: 50,
        yoyo: true,
        repeat: 3,
        ease: 'Power2',
      });
    }
  }

  /**
   * Private helper method: Show loading state during chapter transition
   * @param message - Loading message to display
   */
  private showLoadingState(message: string): void {
    // Disable all interactive elements
    this.chapterButtons.forEach(button => button.setInteractive(false));
    if (this.backButton) {
      this.backButton.setInteractive(false);
    }
    if (this.continueButton) {
      this.continueButton.setInteractive(false);
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
   * Private helper method: Hide loading state
   */
  private hideLoadingState(): void {
    // Re-enable interactive elements
    this.chapterButtons.forEach(button => {
      const chapterId = button.getId().replace('chapter-button-', '');
      const chapter = this.chapterData.find(c => c.id === chapterId);
      if (chapter && this.isChapterUnlocked(chapter)) {
        button.setInteractive(true);
      }
    });

    if (this.backButton) {
      this.backButton.setInteractive(true);
    }
    if (this.continueButton) {
      this.continueButton.setInteractive(true);
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
   * Private helper method: Show unlock conditions for locked chapter
   * 要件8.4を実装: 未解放の章の解放条件を表示
   * @param chapter - Locked chapter
   */
  private showUnlockConditions(chapter: ChapterData): void {
    const message = chapter.unlockCondition
      ? `この章を解放するには:\n${this.getUnlockConditionText(chapter.unlockCondition)}`
      : 'この章は現在解放されていません';

    this.showError(message);
  }

  /**
   * Private helper method: Get unlock condition text
   * @param condition - Unlock condition
   * @returns Human-readable unlock condition text
   */
  private getUnlockConditionText(condition: any): string {
    switch (condition.type) {
      case 'PREVIOUS_CHAPTER':
        return `前の章をクリアしてください`;
      case 'STAGE_COMPLETE':
        return `特定のステージをクリアしてください`;
      default:
        return '条件を満たしてください';
    }
  }

  /**
   * Private helper method: Show error message to user
   * @param message - Error message to display
   */
  private showError(message: string): void {
    const errorText = this.add
      .text(GameConfig.GAME_WIDTH / 2, GameConfig.GAME_HEIGHT - 100, message, {
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
   */
  private setupKeyboardNavigation(): void {
    try {
      // Create keyboard navigation manager
      this.keyboardNavigation = new KeyboardNavigationManager(this);

      // Add continue button first if it exists
      if (this.continueButton) {
        this.keyboardNavigation.addElement(this.continueButton);
      }

      // Add chapter buttons
      this.chapterButtons.forEach(button => {
        this.keyboardNavigation!.addElement(button);
      });

      // Add back button last
      if (this.backButton) {
        this.keyboardNavigation.addElement(this.backButton);
      }

      console.log('ChapterSelectScene: Keyboard navigation setup completed');
    } catch (error) {
      console.error('Error setting up keyboard navigation:', error);
    }
  }

  /**
   * Private helper method: Create back button
   * Add navigation button to return to title screen
   */
  private createBackButton(): void {
    try {
      this.backButton = new NavigableMenuButton(
        this,
        GameConfig.GAME_WIDTH / 2,
        GameConfig.GAME_HEIGHT - 80,
        'タイトルに戻る',
        () => this.handleBack(),
        200,
        50,
        'chapter-select-back-button'
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
        fromScene: 'ChapterSelectScene',
        action: 'back',
      });
    } catch (error) {
      console.error('Error handling back navigation:', error);
    }
  }

  /**
   * Private helper method: Clear existing chapter buttons
   * Clean up chapter buttons before recreating them
   */
  private clearChapterButtons(): void {
    this.chapterButtons.forEach(button => {
      if (button) {
        button.destroy();
      }
    });
    this.chapterButtons = [];

    // Clear info panels
    this.chapterInfoPanels.forEach(panel => {
      if (panel) {
        panel.destroy();
      }
    });
    this.chapterInfoPanels.clear();
  }

  /**
   * Public method: Get loaded chapter data
   * @returns Array of loaded chapter data
   */
  public getChapterData(): ChapterData[] {
    return [...this.chapterData];
  }

  /**
   * Public method: Get chapter count
   * @returns Number of loaded chapters
   */
  public getChapterCount(): number {
    return this.chapterData.length;
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

    // Clean up continue button
    if (this.continueButton) {
      this.continueButton.destroy();
      this.continueButton = undefined;
    }

    // Clean up loading text
    if (this.loadingText) {
      this.loadingText.destroy();
      this.loadingText = undefined;
    }

    // Clean up chapter buttons and info panels
    this.clearChapterButtons();

    // Clear chapter data
    this.chapterData = [];

    console.log('ChapterSelectScene: cleanup completed');
  }

  /**
   * Private helper method: Create continue button
   * 要件8.5を実装: 「続きから」オプションを表示
   */
  private createContinueButton(): void {
    try {
      // Check if there's a chapter in progress
      this.currentChapterId = this.getCurrentChapterInProgress();

      if (!this.currentChapterId) {
        console.log('No chapter in progress, continue button not created');
        return;
      }

      // Find the chapter data
      const currentChapter = this.chapterData.find(c => c.id === this.currentChapterId);
      if (!currentChapter) {
        console.warn('Current chapter data not found');
        return;
      }

      // Create continue button
      this.continueButton = new NavigableMenuButton(
        this,
        GameConfig.GAME_WIDTH / 2,
        150,
        `続きから: ${currentChapter.name}`,
        () => this.handleContinue(),
        400,
        60,
        'chapter-continue-button'
      );

      // Style the continue button differently
      this.continueButton.setAlpha(1);

      console.log(`Continue button created for chapter: ${currentChapter.name}`);
    } catch (error) {
      console.error('Error creating continue button:', error);
    }
  }

  /**
   * Private helper method: Get current chapter in progress
   * @returns Chapter ID if there's a chapter in progress, undefined otherwise
   */
  private getCurrentChapterInProgress(): string | undefined {
    // TODO: Implement actual logic to get current chapter from save data
    // For now, return undefined (no chapter in progress)
    // In a real implementation, this would check LocalStorage or game state
    return undefined;
  }

  /**
   * Private helper method: Handle continue button click
   * Resume the current chapter in progress
   * 要件8.5を実装: 中断した位置から再開
   */
  private async handleContinue(): Promise<void> {
    try {
      if (!this.currentChapterId) {
        console.error('No current chapter to continue');
        return;
      }

      const currentChapter = this.chapterData.find(c => c.id === this.currentChapterId);
      if (!currentChapter) {
        console.error('Current chapter data not found');
        return;
      }

      console.log(`Continuing chapter: ${currentChapter.name}`);

      // Transition to stage selection with continue flag
      const sceneData: SceneData = {
        selectedChapter: currentChapter,
        fromScene: 'ChapterSelectScene',
        action: 'continue',
        timestamp: Date.now(),
        continueMode: true,
      };

      await SceneTransition.transitionTo(
        this,
        'StageSelectScene',
        TransitionType.FADE,
        sceneData
      );
    } catch (error) {
      console.error('Error handling continue:', error);
      this.showError('章の再開に失敗しました');
    }
  }
}
