import * as Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { SaveLoadManager } from '../systems/chapterStage/SaveLoadManager';
import { SceneTransition, TransitionType, SceneData } from '../utils/SceneTransition';
import { SaveSlotList } from '../ui/SaveSlotList';
import { SaveSlotDetailPanel } from '../ui/SaveSlotDetailPanel';
import { NavigableMenuButton } from '../ui/NavigableMenuButton';
import { KeyboardNavigationManager } from '../utils/KeyboardNavigationManager';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import { ErrorMessage, ERROR_MESSAGES, ErrorMessageConfig } from '../ui/ErrorMessage';
import { LoadingSpinner } from '../ui/LoadingSpinner';

/**
 * SaveLoadScene class
 * セーブ・ロード画面を実装
 * Implements unified save/load UI system
 */
export class SaveLoadScene extends Phaser.Scene {
  // Private properties for scene elements
  private backgroundGraphics?: Phaser.GameObjects.Graphics;
  private titleText?: Phaser.GameObjects.Text;
  private saveLoadManager: SaveLoadManager;
  private saveSlotList?: SaveSlotList;
  private detailPanel?: SaveSlotDetailPanel;
  private backButton?: NavigableMenuButton;
  private saveButton?: NavigableMenuButton;
  private loadButton?: NavigableMenuButton;
  private deleteButton?: NavigableMenuButton;
  private autoSaveToggle?: NavigableMenuButton;
  private keyboardNavigation?: KeyboardNavigationManager;
  private confirmDialog?: ConfirmationDialog;
  private currentMode: 'save' | 'load' = 'load';
  private fromScene: string = 'TitleScene';
  private selectedSlotId: number = -1;
  private currentGameState?: {
    chapterState: any;
    stageProgress: any;
    partyComposition: any;
    playTime: number;
  };
  private messageText?: Phaser.GameObjects.Text;
  private currentErrorMessage?: ErrorMessage;
  private loadingSpinner?: LoadingSpinner;

  /**
   * Constructor
   * Initialize the scene with the key 'SaveLoadScene'
   */
  constructor() {
    super({ key: 'SaveLoadScene' });
    
    // Initialize SaveLoadManager
    this.saveLoadManager = new SaveLoadManager();
    
    console.log('SaveLoadScene: constructor initialized');
  }

  /**
   * Phaser lifecycle method: preload
   * Load assets for the save/load screen (currently empty for basic implementation)
   */
  public preload(): void {
    console.log('SaveLoadScene: preload phase');
    // Future asset loading will be implemented here
  }

  /**
   * Phaser lifecycle method: create
   * Initialize the scene and create all game objects
   * @param data - Optional data passed from previous scene
   */
  public create(data?: SceneData): void {
    console.log('SaveLoadScene: create phase', data ? 'with data' : '');

    // Extract scene data
    if (data) {
      this.currentMode = (data.mode as 'save' | 'load') || 'load';
      this.fromScene = (data.fromScene as string) || 'TitleScene';
      this.currentGameState = data.currentGameState as any;
    }

    // Check LocalStorage availability
    if (!this.saveLoadManager.isLocalStorageAvailable()) {
      console.error('LocalStorage is not available');
      this.showEnhancedError(ERROR_MESSAGES.STORAGE_UNAVAILABLE);
      return;
    }

    // Check storage quota
    if (this.checkStorageQuota()) {
      console.warn('Storage quota is nearly exceeded');
      this.showEnhancedError({
        ...ERROR_MESSAGES.QUOTA_EXCEEDED,
        duration: 3000, // Show for 3 seconds as warning
      });
    }

    // Create entrance transition effect
    SceneTransition.createEntranceTransition(this, TransitionType.FADE, 300);

    // Setup background
    this.setupBackground();

    // Create title
    this.createTitle();

    // Create save slot list
    this.createSaveSlotList();

    // Create detail panel
    this.createDetailPanel();

    // Create navigation buttons
    this.createNavigationButtons();

    // Setup keyboard navigation
    this.setupKeyboardNavigation();

    // Create loading spinner
    this.createLoadingSpinner();

    // Display auto-save status message
    this.showAutoSaveStatus();

    console.log(`SaveLoadScene: initialization completed (mode: ${this.currentMode})`);
  }

  /**
   * Phaser lifecycle method: update
   * Game loop processing (currently empty)
   * @param _time - Time elapsed since game start (milliseconds)
   * @param _delta - Time elapsed since last frame (milliseconds)
   */
  public update(_time: number, _delta: number): void {
    // Currently no update logic needed
    // Future animations or interactions will be added here
  }

  /**
   * Private helper method: Setup background
   * Create visually appealing background for the save/load screen
   */
  private setupBackground(): void {
    try {
      // Create graphics object for background
      this.backgroundGraphics = this.add.graphics();

      // Create gradient background
      this.createGradientBackground();

      // Set background to lowest depth
      this.backgroundGraphics.setDepth(-10);

      console.log('Save/Load screen background setup completed');
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

    // Create a gradient from dark blue to lighter blue (consistent with other scenes)
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
   * Display the save/load title
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

      this.titleText = this.add.text(
        GameConfig.GAME_WIDTH / 2,
        100,
        'セーブ・ロード',
        titleStyle
      );

      this.titleText.setOrigin(0.5, 0.5);

      console.log('Save/Load title created');
    } catch (error) {
      console.error('Error creating title:', error);
    }
  }

  /**
   * Private helper method: Create save slot list
   * Display the list of save slots
   */
  private createSaveSlotList(): void {
    try {
      // セーブスロット情報を取得
      const saveSlots = this.saveLoadManager.getSaveSlots();

      // SaveSlotListを作成
      this.saveSlotList = new SaveSlotList(
        this,
        150,
        200,
        (slotId) => this.handleSlotSelect(slotId)
      );

      // スロット一覧を作成
      this.saveSlotList.create(saveSlots);

      console.log('Save slot list created');
    } catch (error) {
      console.error('Error creating save slot list:', error);
    }
  }

  /**
   * Private helper method: Create detail panel
   * Display the detail panel for selected slot
   */
  private createDetailPanel(): void {
    try {
      // 詳細パネルを作成
      this.detailPanel = new SaveSlotDetailPanel(
        this,
        GameConfig.GAME_WIDTH / 2 + 200,
        GameConfig.GAME_HEIGHT / 2
      );

      console.log('Detail panel created');
    } catch (error) {
      console.error('Error creating detail panel:', error);
    }
  }

  /**
   * Private helper method: Create navigation buttons
   * Display the back button, save button, load button, and delete button
   */
  private createNavigationButtons(): void {
    try {
      // Create "保存" (Save) button - only in save mode
      if (this.currentMode === 'save') {
        this.saveButton = new NavigableMenuButton(
          this,
          GameConfig.GAME_WIDTH / 2 - 240,
          GameConfig.GAME_HEIGHT - 80,
          '保存',
          () => this.handleSaveButton(),
          180, // width
          50, // height
          'saveload-save-button'
        );
        
        // Initially disabled until a valid slot is selected
        this.saveButton.setEnabled(false);
      }

      // Create "読み込み" (Load) button - only in load mode
      if (this.currentMode === 'load') {
        this.loadButton = new NavigableMenuButton(
          this,
          GameConfig.GAME_WIDTH / 2 - 240,
          GameConfig.GAME_HEIGHT - 80,
          '読み込み',
          () => this.handleLoadButton(),
          180, // width
          50, // height
          'saveload-load-button'
        );
        
        // Initially disabled until a valid slot with data is selected
        this.loadButton.setEnabled(false);
      }

      // Create "削除" (Delete) button - available in both modes
      this.deleteButton = new NavigableMenuButton(
        this,
        GameConfig.GAME_WIDTH / 2 - 30,
        GameConfig.GAME_HEIGHT - 80,
        '削除',
        () => this.handleDeleteButton(),
        180, // width
        50, // height
        'saveload-delete-button'
      );
      
      // Initially disabled until a valid slot with data is selected
      this.deleteButton.setEnabled(false);

      // Create "オートセーブ" (Auto-save) toggle button
      const isAutoSaveEnabled = this.saveLoadManager.isAutoSaveEnabled();
      this.autoSaveToggle = new NavigableMenuButton(
        this,
        GameConfig.GAME_WIDTH / 2 - 30,
        GameConfig.GAME_HEIGHT - 150,
        isAutoSaveEnabled ? 'オートセーブ: ON' : 'オートセーブ: OFF',
        () => this.handleAutoSaveToggle(),
        180, // width
        50, // height
        'saveload-autosave-toggle'
      );

      // Create "戻る" (Back) button
      const backButtonX = GameConfig.GAME_WIDTH / 2 + 180;
      
      this.backButton = new NavigableMenuButton(
        this,
        backButtonX,
        GameConfig.GAME_HEIGHT - 80,
        '戻る',
        () => this.handleBackButton(),
        180, // width
        50, // height
        'saveload-back-button'
      );

      console.log('Navigation buttons created');
    } catch (error) {
      console.error('Error creating navigation buttons:', error);
    }
  }

  /**
   * Private helper method: Setup keyboard navigation
   * Initialize keyboard navigation manager and add navigable elements
   */
  private setupKeyboardNavigation(): void {
    try {
      // Create keyboard navigation manager
      this.keyboardNavigation = new KeyboardNavigationManager(this);

      // Add slot buttons to navigation
      if (this.saveSlotList) {
        const slotButtons = this.saveSlotList.getSlotButtons();
        slotButtons.forEach((button) => {
          this.keyboardNavigation!.addElement(button);
        });
      }

      // Add save button to navigation (if in save mode)
      if (this.saveButton) {
        this.keyboardNavigation.addElement(this.saveButton);
      }

      // Add load button to navigation (if in load mode)
      if (this.loadButton) {
        this.keyboardNavigation.addElement(this.loadButton);
      }

      // Add delete button to navigation
      if (this.deleteButton) {
        this.keyboardNavigation.addElement(this.deleteButton);
      }

      // Add auto-save toggle to navigation
      if (this.autoSaveToggle) {
        this.keyboardNavigation.addElement(this.autoSaveToggle);
      }

      // Add back button to navigation
      if (this.backButton) {
        this.keyboardNavigation.addElement(this.backButton);
      }

      // Setup custom keyboard handlers
      this.setupCustomKeyboardHandlers();

      console.log('SaveLoadScene: Keyboard navigation setup completed');
    } catch (error) {
      console.error('Error setting up keyboard navigation:', error);
    }
  }

  /**
   * Private helper method: Create loading spinner
   * Initialize the loading spinner component
   */
  private createLoadingSpinner(): void {
    try {
      // Create loading spinner at center of screen
      this.loadingSpinner = new LoadingSpinner(
        this,
        GameConfig.GAME_WIDTH / 2,
        GameConfig.GAME_HEIGHT / 2
      );

      console.log('Loading spinner created');
    } catch (error) {
      console.error('Error creating loading spinner:', error);
    }
  }

  /**
   * Private helper method: Setup custom keyboard handlers
   * Add Enter and Escape key handlers
   */
  private setupCustomKeyboardHandlers(): void {
    if (!this.input.keyboard) {
      console.warn('Keyboard input not available');
      return;
    }

    // Enter key - execute default action based on context
    const enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    enterKey.on('down', () => {
      this.handleEnterKey();
    });

    // Escape key - close screen
    const escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    escapeKey.on('down', () => {
      this.handleEscapeKey();
    });

    console.log('SaveLoadScene: Custom keyboard handlers setup completed');
  }

  /**
   * Private helper method: Handle Enter key press
   * Execute default action based on current context
   */
  private handleEnterKey(): void {
    if (!this.keyboardNavigation) return;

    const focusedElement = this.keyboardNavigation.getCurrentFocusedElement();
    
    if (!focusedElement) {
      // No element focused - do nothing
      return;
    }

    // Check if focused element is a slot button
    const isSlotButton = focusedElement.getId().startsWith('save-slot-button-');
    
    if (isSlotButton && this.selectedSlotId !== -1) {
      // Slot button is focused - execute save or load action
      if (this.currentMode === 'save' && this.saveButton?.isInteractive()) {
        this.handleSaveButton();
      } else if (this.currentMode === 'load' && this.loadButton?.isInteractive()) {
        this.handleLoadButton();
      }
    } else {
      // Other element focused - activate it
      focusedElement.onActivate();
    }
  }

  /**
   * Private helper method: Handle Escape key press
   * Close the save/load screen
   */
  private handleEscapeKey(): void {
    console.log('Escape key pressed - closing save/load screen');
    this.handleBackButton();
  }

  /**
   * Private helper method: Handle auto-save toggle button click
   * Toggle auto-save on/off
   */
  private handleAutoSaveToggle(): void {
    try {
      console.log('Auto-save toggle clicked');

      // Toggle auto-save
      const currentState = this.saveLoadManager.isAutoSaveEnabled();
      const newState = !currentState;
      this.saveLoadManager.setAutoSaveEnabled(newState);

      // Update button text
      if (this.autoSaveToggle) {
        this.autoSaveToggle.setText(newState ? 'オートセーブ: ON' : 'オートセーブ: OFF');
      }

      // Show message
      this.showMessage(
        newState ? 'オートセーブを有効にしました' : 'オートセーブを無効にしました',
        'success'
      );

      console.log(`Auto-save ${newState ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling auto-save:', error);
      this.showMessage(`オートセーブ切り替えエラー: ${error}`, 'error');
    }
  }

  /**
   * Private helper method: Show auto-save status on scene start
   */
  private showAutoSaveStatus(): void {
    const isEnabled = this.saveLoadManager.isAutoSaveEnabled();
    const statusMessage = isEnabled
      ? 'オートセーブが有効です（スロット0に自動保存）'
      : 'オートセーブが無効です';

    // Show status message for 3 seconds
    this.time.delayedCall(500, () => {
      this.showMessage(statusMessage, 'info');
    });
  }

  /**
   * Private helper method: Handle back button click
   * Return to the previous scene
   */
  private async handleBackButton(): Promise<void> {
    try {
      console.log(`Back button clicked - returning to ${this.fromScene}`);

      // Validate target scene exists
      if (!SceneTransition.validateSceneKey(this, this.fromScene)) {
        console.error(`${this.fromScene} not found`);
        return;
      }

      // Use smooth transition to return to previous scene
      await SceneTransition.transitionTo(this, this.fromScene, TransitionType.FADE, {
        fromScene: 'SaveLoadScene',
        action: 'back',
      });
    } catch (error) {
      console.error('Error handling back button:', error);
    }
  }

  /**
   * Private helper method: Handle slot selection
   * @param slotId - Selected slot ID
   */
  private handleSlotSelect(slotId: number): void {
    console.log(`Slot ${slotId} selected`);

    // Store selected slot ID
    this.selectedSlotId = slotId;

    // Check for data corruption
    if (this.checkDataCorruption(slotId)) {
      console.warn(`Slot ${slotId} has corrupted data`);
      this.showEnhancedError({
        ...ERROR_MESSAGES.DATA_CORRUPTED,
        duration: 3000,
      });
    }

    // 詳細パネルの更新
    if (this.detailPanel && this.saveSlotList) {
      const selectedButton = this.saveSlotList.getSlotButtonById(slotId);
      if (selectedButton) {
        // スロット情報を取得して詳細パネルに渡す
        const saveSlots = this.saveLoadManager.getSaveSlots();
        const selectedSlot = saveSlots.find(slot => slot.slotId === slotId);
        
        if (selectedSlot) {
          this.detailPanel.updateDetails(selectedSlot);
        }
      }
    }

    // Update button state based on mode
    if (this.currentMode === 'save') {
      this.updateSaveButtonState(slotId);
    } else if (this.currentMode === 'load') {
      this.updateLoadButtonState(slotId);
    }

    // Update delete button state (available in both modes)
    this.updateDeleteButtonState(slotId);
  }

  /**
   * Private helper method: Update save button state
   * Enable/disable save button based on selected slot
   * @param slotId - Selected slot ID
   */
  private updateSaveButtonState(slotId: number): void {
    if (!this.saveButton || this.currentMode !== 'save') {
      return;
    }

    // Disable save button for slot 0 (autosave)
    if (slotId === 0) {
      this.saveButton.setEnabled(false);
      this.showEnhancedError({
        ...ERROR_MESSAGES.AUTOSAVE_SLOT,
        duration: 2000,
      });
      return;
    }

    // Check for data corruption
    if (this.checkDataCorruption(slotId)) {
      this.saveButton.setEnabled(false);
      return;
    }

    // Enable save button for valid slots
    if (slotId >= 1 && slotId < 10) {
      this.saveButton.setEnabled(true);
    } else {
      this.saveButton.setEnabled(false);
    }
  }

  /**
   * Private helper method: Update load button state
   * Enable/disable load button based on selected slot having data
   * @param slotId - Selected slot ID
   */
  private updateLoadButtonState(slotId: number): void {
    if (!this.loadButton || this.currentMode !== 'load') {
      return;
    }

    // Check if slot has data
    const hasData = this.checkExistingData(slotId);

    // Check for data corruption
    if (hasData && this.checkDataCorruption(slotId)) {
      this.loadButton.setEnabled(false);
      return;
    }

    // Enable load button only if slot has data
    if (hasData) {
      this.loadButton.setEnabled(true);
    } else {
      this.loadButton.setEnabled(false);
      this.showEnhancedError({
        ...ERROR_MESSAGES.EMPTY_SLOT,
        duration: 2000,
      });
    }
  }

  /**
   * Private helper method: Update delete button state
   * Enable/disable delete button based on selected slot having data
   * @param slotId - Selected slot ID
   */
  private updateDeleteButtonState(slotId: number): void {
    if (!this.deleteButton) {
      return;
    }

    // Check if slot has data
    const hasData = this.checkExistingData(slotId);

    // Enable delete button only if slot has data
    if (hasData) {
      this.deleteButton.setEnabled(true);
    } else {
      this.deleteButton.setEnabled(false);
    }
  }

  /**
   * Private helper method: Handle save button click
   * Execute save operation
   */
  private async handleSaveButton(): Promise<void> {
    try {
      console.log('Save button clicked');

      // Validate selected slot
      if (this.selectedSlotId < 1 || this.selectedSlotId >= 10) {
        this.showMessage('有効なスロットを選択してください', 'error');
        return;
      }

      // Check if slot 0 (autosave) is selected
      if (this.selectedSlotId === 0) {
        this.showMessage('スロット0はオートセーブ専用です', 'error');
        return;
      }

      // Get current game state
      const gameState = this.getCurrentGameState();
      if (!gameState) {
        this.showMessage('セーブするゲーム状態がありません', 'error');
        return;
      }

      // Check if slot has existing data
      const hasExistingData = this.checkExistingData(this.selectedSlotId);
      if (hasExistingData) {
        // Show overwrite confirmation dialog
        this.showOverwriteConfirmation(() => {
          this.executeSaveOperation(gameState);
        });
        return;
      }

      // Execute save directly if no existing data
      await this.executeSaveOperation(gameState);
    } catch (error) {
      console.error('Error handling save button:', error);
      this.showMessage(`保存エラー: ${error}`, 'error');
    }
  }

  /**
   * Private helper method: Execute save operation
   * @param gameState - Game state to save
   */
  private async executeSaveOperation(gameState: {
    chapterState: any;
    stageProgress: any;
    partyComposition: any;
    playTime: number;
  }): Promise<void> {
    try {
      // Show loading spinner
      if (this.loadingSpinner) {
        this.loadingSpinner.show();
      }

      // Check storage availability before saving
      if (!this.checkStorageAvailability()) {
        if (this.loadingSpinner) {
          this.loadingSpinner.hide();
        }
        this.showEnhancedError(ERROR_MESSAGES.STORAGE_UNAVAILABLE);
        return;
      }

      // Check storage quota before saving
      if (this.checkStorageQuota()) {
        if (this.loadingSpinner) {
          this.loadingSpinner.hide();
        }
        this.showEnhancedError(ERROR_MESSAGES.QUOTA_EXCEEDED);
        return;
      }

      // Execute save
      const success = await this.executeSave(
        this.selectedSlotId,
        gameState.chapterState,
        gameState.stageProgress,
        gameState.partyComposition,
        gameState.playTime
      );

      // Hide loading spinner
      if (this.loadingSpinner) {
        this.loadingSpinner.hide();
      }

      if (success) {
        this.showMessage('保存完了', 'success');
        // Refresh slot list after 1 second
        this.time.delayedCall(1000, () => {
          this.refreshSlotList();
        });
      } else {
        this.showEnhancedError(ERROR_MESSAGES.SAVE_FAILED);
      }
    } catch (error) {
      // Hide loading spinner on error
      if (this.loadingSpinner) {
        this.loadingSpinner.hide();
      }
      console.error('Save operation failed:', error);
      this.handleStorageError(error);
    }
  }

  /**
   * Private helper method: Show overwrite confirmation dialog
   * @param onConfirm - Callback when confirmed
   */
  private showOverwriteConfirmation(onConfirm: () => void): void {
    if (!this.confirmDialog) {
      this.confirmDialog = new ConfirmationDialog(this);
    }

    this.confirmDialog.show(
      '既存のデータを上書きしますか？',
      onConfirm,
      undefined, // onCancel - just close dialog
      'はい',
      'いいえ'
    );
  }

  /**
   * Private helper method: Handle load button click
   * Execute load operation
   */
  private async handleLoadButton(): Promise<void> {
    try {
      console.log('Load button clicked');

      // Validate selected slot
      if (this.selectedSlotId < 0 || this.selectedSlotId >= 10) {
        this.showMessage('有効なスロットを選択してください', 'error');
        return;
      }

      // Check if slot has data
      const hasData = this.checkExistingData(this.selectedSlotId);
      if (!hasData) {
        this.showMessage('このスロットにはデータがありません', 'error');
        return;
      }

      // Show load confirmation dialog
      this.showLoadConfirmation(() => {
        this.executeLoadOperation();
      });
    } catch (error) {
      console.error('Error handling load button:', error);
      this.showMessage(`読み込みエラー: ${error}`, 'error');
    }
  }

  /**
   * Private helper method: Execute load operation
   */
  private async executeLoadOperation(): Promise<void> {
    try {
      // Show loading spinner
      if (this.loadingSpinner) {
        this.loadingSpinner.show();
      }

      // Check storage availability before loading
      if (!this.checkStorageAvailability()) {
        if (this.loadingSpinner) {
          this.loadingSpinner.hide();
        }
        this.showEnhancedError(ERROR_MESSAGES.STORAGE_UNAVAILABLE);
        return;
      }

      // Execute load
      const saveData = await this.executeLoad(this.selectedSlotId);

      if (!saveData) {
        if (this.loadingSpinner) {
          this.loadingSpinner.hide();
        }
        this.showEnhancedError(ERROR_MESSAGES.LOAD_FAILED);
        return;
      }

      // Validate loaded data
      if (!this.validateLoadedData(saveData)) {
        if (this.loadingSpinner) {
          this.loadingSpinner.hide();
        }
        this.showEnhancedError(ERROR_MESSAGES.DATA_CORRUPTED);
        return;
      }

      // Determine target scene
      const targetScene = this.determineTargetScene(saveData);

      // Hide loading spinner
      if (this.loadingSpinner) {
        this.loadingSpinner.hide();
      }

      // Show success message
      this.showMessage('読み込み完了', 'success');

      // Transition to target scene after 1 second
      this.time.delayedCall(1000, async () => {
        await SceneTransition.transitionTo(this, targetScene, TransitionType.FADE, {
          fromScene: 'SaveLoadScene',
          action: 'load',
          saveData: saveData,
        });
      });
    } catch (error) {
      // Hide loading spinner on error
      if (this.loadingSpinner) {
        this.loadingSpinner.hide();
      }
      console.error('Load operation failed:', error);
      this.handleStorageError(error);
    }
  }

  /**
   * Private helper method: Show load confirmation dialog
   * @param onConfirm - Callback when confirmed
   */
  private showLoadConfirmation(onConfirm: () => void): void {
    if (!this.confirmDialog) {
      this.confirmDialog = new ConfirmationDialog(this);
    }

    this.confirmDialog.show(
      '現在の進行状況が失われます。読み込みますか？',
      onConfirm,
      undefined, // onCancel - just close dialog
      'はい',
      'いいえ'
    );
  }

  /**
   * Private helper method: Handle delete button click
   * Execute delete operation
   */
  private async handleDeleteButton(): Promise<void> {
    try {
      console.log('Delete button clicked');

      // Validate selected slot
      if (this.selectedSlotId < 0 || this.selectedSlotId >= 10) {
        this.showMessage('有効なスロットを選択してください', 'error');
        return;
      }

      // Check if slot has data
      const hasData = this.checkExistingData(this.selectedSlotId);
      if (!hasData) {
        this.showMessage('このスロットにはデータがありません', 'error');
        return;
      }

      // Show delete confirmation dialog
      this.showDeleteConfirmation(() => {
        this.executeDeleteOperation();
      });
    } catch (error) {
      console.error('Error handling delete button:', error);
      this.showMessage(`削除エラー: ${error}`, 'error');
    }
  }

  /**
   * Private helper method: Execute delete operation
   */
  private async executeDeleteOperation(): Promise<void> {
    try {
      // Show loading spinner
      if (this.loadingSpinner) {
        this.loadingSpinner.show();
      }

      // Check storage availability before deleting
      if (!this.checkStorageAvailability()) {
        if (this.loadingSpinner) {
          this.loadingSpinner.hide();
        }
        this.showEnhancedError(ERROR_MESSAGES.STORAGE_UNAVAILABLE);
        return;
      }

      // Execute delete
      const success = await this.executeDelete(this.selectedSlotId);

      // Hide loading spinner
      if (this.loadingSpinner) {
        this.loadingSpinner.hide();
      }

      if (success) {
        this.showMessage('削除完了', 'success');
        // Refresh slot list after 1 second
        this.time.delayedCall(1000, () => {
          this.refreshSlotList();
          // Reset selected slot
          this.selectedSlotId = -1;
          // Disable delete button
          if (this.deleteButton) {
            this.deleteButton.setEnabled(false);
          }
          // Clear detail panel
          if (this.detailPanel) {
            this.detailPanel.updateDetails({
              slotId: -1,
              saveData: null,
            });
          }
        });
      } else {
        this.showEnhancedError(ERROR_MESSAGES.DELETE_FAILED);
      }
    } catch (error) {
      // Hide loading spinner on error
      if (this.loadingSpinner) {
        this.loadingSpinner.hide();
      }
      console.error('Delete operation failed:', error);
      this.handleStorageError(error);
    }
  }

  /**
   * Private helper method: Show delete confirmation dialog
   * @param onConfirm - Callback when confirmed
   */
  private showDeleteConfirmation(onConfirm: () => void): void {
    if (!this.confirmDialog) {
      this.confirmDialog = new ConfirmationDialog(this);
    }

    this.confirmDialog.show(
      '本当に削除しますか？この操作は取り消せません。',
      onConfirm,
      undefined, // onCancel - just close dialog
      '削除する',
      'キャンセル'
    );
  }

  /**
   * Private helper method: Get current game state
   * Extract game state from scene data
   * @returns Current game state or null
   */
  private getCurrentGameState(): {
    chapterState: any;
    stageProgress: any;
    partyComposition: any;
    playTime: number;
  } | null {
    if (!this.currentGameState) {
      console.warn('No current game state available');
      return null;
    }

    return this.currentGameState;
  }

  /**
   * Private helper method: Check if slot has existing data
   * @param slotId - Slot ID to check
   * @returns True if slot has data
   */
  private checkExistingData(slotId: number): boolean {
    const saveSlots = this.saveLoadManager.getSaveSlots();
    const slot = saveSlots.find(s => s.slotId === slotId);
    return slot?.saveData !== null;
  }

  /**
   * Private helper method: Execute save operation
   * @param slotId - Slot ID
   * @param chapterState - Chapter state data
   * @param stageProgress - Stage progress data
   * @param partyComposition - Party composition
   * @param playTime - Play time in milliseconds
   * @returns True if save succeeded
   */
  private async executeSave(
    slotId: number,
    chapterState: any,
    stageProgress: any,
    partyComposition: any,
    playTime: number
  ): Promise<boolean> {
    try {
      const success = this.saveLoadManager.saveGame(
        slotId,
        chapterState,
        stageProgress,
        partyComposition,
        playTime
      );

      return success;
    } catch (error) {
      console.error('Save execution failed:', error);
      return false;
    }
  }

  /**
   * Private helper method: Execute load operation
   * @param slotId - Slot ID
   * @returns Loaded save data or null if failed
   */
  private async executeLoad(slotId: number): Promise<any | null> {
    try {
      const saveData = this.saveLoadManager.loadGame(slotId);

      if (!saveData) {
        console.error('Load execution failed: no data returned');
        return null;
      }

      return saveData;
    } catch (error) {
      console.error('Load execution failed:', error);
      return null;
    }
  }

  /**
   * Private helper method: Execute delete operation
   * @param slotId - Slot ID
   * @returns True if delete succeeded
   */
  private async executeDelete(slotId: number): Promise<boolean> {
    try {
      const success = this.saveLoadManager.deleteSaveData(slotId);

      if (!success) {
        console.error('Delete execution failed');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete execution failed:', error);
      return false;
    }
  }

  /**
   * Private helper method: Validate loaded save data
   * @param saveData - Save data to validate
   * @returns True if data is valid
   */
  private validateLoadedData(saveData: any): boolean {
    try {
      return this.saveLoadManager.validateSaveData(saveData);
    } catch (error) {
      console.error('Save data validation failed:', error);
      return false;
    }
  }

  /**
   * Private helper method: Determine target scene based on loaded data
   * @param saveData - Loaded save data
   * @returns Target scene key
   */
  private determineTargetScene(saveData: any): string {
    // If chapter is completed, go to chapter select
    if (saveData.chapterState?.isCompleted) {
      return 'ChapterSelectScene';
    }

    // If chapter is in progress, go to stage select
    return 'StageSelectScene';
  }

  /**
   * Private helper method: Refresh slot list
   * Reload save slots from storage
   */
  private refreshSlotList(): void {
    if (!this.saveSlotList) {
      return;
    }

    try {
      // Get updated save slots
      const saveSlots = this.saveLoadManager.getSaveSlots();
      
      // Destroy old list
      this.saveSlotList.destroy();
      
      // Create new list
      this.saveSlotList = new SaveSlotList(
        this,
        150,
        200,
        (slotId) => this.handleSlotSelect(slotId)
      );
      
      this.saveSlotList.create(saveSlots);
      
      console.log('Slot list refreshed');
    } catch (error) {
      console.error('Error refreshing slot list:', error);
    }
  }

  /**
   * Private helper method: Show message to user
   * @param message - Message to display
   * @param type - Message type (success, error, warning)
   */
  private showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success'): void {
    // Remove existing message if any
    if (this.messageText) {
      this.messageText.destroy();
      this.messageText = undefined;
    }

    // Determine color based on type
    let color = '#66ff66'; // success - green
    if (type === 'error') {
      color = '#ff6666'; // error - red
    } else if (type === 'warning') {
      color = '#ffaa00'; // warning - orange
    } else if (type === 'info') {
      color = '#66aaff'; // info - blue
    }

    // Create message text (initially positioned above screen)
    this.messageText = this.add
      .text(GameConfig.GAME_WIDTH / 2, -50, message, {
        fontSize: '24px',
        color: color,
        fontFamily: 'Arial',
        align: 'center',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(2000);

    // Slide in animation from top
    this.tweens.add({
      targets: this.messageText,
      y: 150,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Auto-remove message after 3 seconds with slide out animation
    this.time.delayedCall(3000, () => {
      if (this.messageText) {
        this.tweens.add({
          targets: this.messageText,
          y: -50,
          duration: 300,
          ease: 'Power2',
          onComplete: () => {
            if (this.messageText) {
              this.messageText.destroy();
              this.messageText = undefined;
            }
          },
        });
      }
    });
  }

  /**
   * Private helper method: Show error message to user
   * @param message - Error message to display
   */
  private showError(message: string): void {
    const errorText = this.add
      .text(GameConfig.GAME_WIDTH / 2, GameConfig.GAME_HEIGHT / 2, message, {
        fontSize: '24px',
        color: '#ff6666',
        fontFamily: 'Arial',
        align: 'center',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(2000);

    // Auto-remove error after 5 seconds
    this.time.delayedCall(5000, () => {
      if (errorText) {
        errorText.destroy();
      }
    });
  }

  /**
   * Private helper method: Show enhanced error message
   * @param config - Error message configuration
   */
  private showEnhancedError(config: ErrorMessageConfig): void {
    // Remove existing error message if any
    if (this.currentErrorMessage) {
      this.currentErrorMessage.destroy();
      this.currentErrorMessage = undefined;
    }

    // Create new error message
    this.currentErrorMessage = new ErrorMessage(
      this,
      GameConfig.GAME_WIDTH / 2,
      GameConfig.GAME_HEIGHT / 2,
      {
        ...config,
        duration: config.duration || 5000, // Default 5 seconds
      }
    );

    // Log error to console
    console.error(`[SaveLoadScene] ${config.type}: ${config.title} - ${config.message}`);
    if (config.action) {
      console.info(`[SaveLoadScene] Suggested action: ${config.action}`);
    }
  }

  /**
   * Private helper method: Check for data corruption
   * @param slotId - Slot ID to check
   * @returns True if data is corrupted
   */
  private checkDataCorruption(slotId: number): boolean {
    try {
      const saveSlots = this.saveLoadManager.getSaveSlots();
      const slot = saveSlots.find(s => s.slotId === slotId);
      
      if (!slot || !slot.saveData) {
        return false;
      }

      // Validate save data
      const isValid = this.saveLoadManager.validateSaveData(slot.saveData);
      return !isValid;
    } catch (error) {
      console.error('Error checking data corruption:', error);
      return true; // Assume corrupted if check fails
    }
  }

  /**
   * Private helper method: Check storage availability
   * @returns True if storage is available
   */
  private checkStorageAvailability(): boolean {
    return this.saveLoadManager.isLocalStorageAvailable();
  }

  /**
   * Private helper method: Check storage quota
   * @returns True if quota is exceeded
   */
  private checkStorageQuota(): boolean {
    try {
      const usage = this.saveLoadManager.getStorageUsage();
      // Consider quota exceeded if usage is above 90%
      return usage.percentage > 90;
    } catch (error) {
      console.error('Error checking storage quota:', error);
      return false;
    }
  }

  /**
   * Private helper method: Handle storage errors
   * @param error - Error object
   */
  private handleStorageError(error: any): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check for specific error types
    if (errorMessage.includes('QuotaExceededError') || errorMessage.includes('quota')) {
      this.showEnhancedError(ERROR_MESSAGES.QUOTA_EXCEEDED);
    } else if (errorMessage.includes('not available') || errorMessage.includes('disabled')) {
      this.showEnhancedError(ERROR_MESSAGES.STORAGE_UNAVAILABLE);
    } else if (errorMessage.includes('corrupted') || errorMessage.includes('invalid')) {
      this.showEnhancedError(ERROR_MESSAGES.DATA_CORRUPTED);
    } else {
      // Generic error
      this.showEnhancedError({
        title: 'エラー',
        message: `操作に失敗しました: ${errorMessage}`,
        action: '再度お試しください。',
        type: 'error',
      });
    }
  }

  /**
   * Scene cleanup method
   * Called when the scene is destroyed to prevent memory leaks
   */
  public destroy(): void {
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

    // Clean up save slot list
    if (this.saveSlotList) {
      this.saveSlotList.destroy();
      this.saveSlotList = undefined;
    }

    // Clean up detail panel
    if (this.detailPanel) {
      this.detailPanel.destroy();
      this.detailPanel = undefined;
    }

    // Clean up save button
    if (this.saveButton) {
      this.saveButton.destroy();
      this.saveButton = undefined;
    }

    // Clean up load button
    if (this.loadButton) {
      this.loadButton.destroy();
      this.loadButton = undefined;
    }

    // Clean up delete button
    if (this.deleteButton) {
      this.deleteButton.destroy();
      this.deleteButton = undefined;
    }

    // Clean up auto-save toggle
    if (this.autoSaveToggle) {
      this.autoSaveToggle.destroy();
      this.autoSaveToggle = undefined;
    }

    // Clean up back button
    if (this.backButton) {
      this.backButton.destroy();
      this.backButton = undefined;
    }

    // Clean up message text
    if (this.messageText) {
      this.messageText.destroy();
      this.messageText = undefined;
    }

    // Clean up error message
    if (this.currentErrorMessage) {
      this.currentErrorMessage.destroy();
      this.currentErrorMessage = undefined;
    }

    // Clean up loading spinner
    if (this.loadingSpinner) {
      this.loadingSpinner.destroy();
      this.loadingSpinner = undefined;
    }

    // Clean up confirmation dialog
    if (this.confirmDialog) {
      this.confirmDialog.destroy();
      this.confirmDialog = undefined;
    }

    // Clean up keyboard navigation
    if (this.keyboardNavigation) {
      this.keyboardNavigation.destroy();
      this.keyboardNavigation = undefined;
    }

    console.log('SaveLoadScene: cleanup completed');
  }
}
