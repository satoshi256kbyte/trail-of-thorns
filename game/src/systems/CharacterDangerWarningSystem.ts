/**
 * CharacterDangerWarningSystem - Danger state warning system for character loss prevention
 *
 * This system provides warnings when characters are in danger of being lost:
 * - Danger level calculation and monitoring
 * - Visual warning displays
 * - Confirmation dialogs for risky actions
 * - Special warnings for important characters
 *
 * Implements requirements 4.1, 4.2, 4.3, 4.4, 4.5 from the character loss system specification
 */

import * as Phaser from 'phaser';
import { Unit, GameAction } from '../types/gameplay';
import {
  DangerLevel,
  LossWarningConfig,
  CharacterLossError,
  CharacterLossErrorDetails,
  LossContext,
} from '../types/characterLoss';

/**
 * Warning dialog configuration
 */
export interface WarningDialogConfig {
  /** Enable confirmation dialogs */
  enableDialogs: boolean;
  /** Dialog background color */
  backgroundColor: number;
  /** Dialog text color */
  textColor: string;
  /** Dialog border color */
  borderColor: number;
  /** Dialog width */
  width: number;
  /** Dialog height */
  height: number;
  /** Dialog font size */
  fontSize: number;
  /** Dialog font family */
  fontFamily: string;
  /** Button width */
  buttonWidth: number;
  /** Button height */
  buttonHeight: number;
  /** Animation duration for dialog appearance */
  animationDuration: number;
}

/**
 * Important character configuration
 */
export interface ImportantCharacterConfig {
  /** List of important character IDs */
  importantCharacterIds: string[];
  /** Special warning message for important characters */
  specialWarningMessage: string;
  /** Special warning color */
  specialWarningColor: number;
  /** Enable special sound alerts */
  enableSpecialSounds: boolean;
  /** Special warning duration */
  specialWarningDuration: number;
}

/**
 * Warning display state
 */
export interface WarningDisplayState {
  /** Currently displayed warnings by character ID */
  activeWarnings: Map<string, Phaser.GameObjects.Container>;
  /** Currently displayed dialog */
  activeDialog: Phaser.GameObjects.Container | null;
  /** Whether a dialog is currently waiting for user input */
  waitingForInput: boolean;
  /** Last warning update timestamp */
  lastUpdateTime: number;
}

/**
 * Action confirmation result
 */
export interface ActionConfirmationResult {
  /** Whether the action was confirmed */
  confirmed: boolean;
  /** Whether to remember this choice */
  rememberChoice: boolean;
  /** Timestamp of the decision */
  timestamp: number;
}

/**
 * Interface for CharacterDangerWarningSystem
 */
export interface ICharacterDangerWarningSystem {
  // Danger level monitoring
  updateDangerLevels(units: Unit[]): void;
  getDangerLevel(characterId: string): DangerLevel;
  isCharacterInDanger(characterId: string): boolean;

  // Warning display
  showDangerWarning(unit: Unit, dangerLevel: DangerLevel): void;
  hideDangerWarning(unit: Unit): void;
  clearAllWarnings(): void;

  // Action confirmation
  showActionConfirmationDialog(unit: Unit, action: GameAction): Promise<ActionConfirmationResult>;
  isImportantCharacter(characterId: string): boolean;

  // System management
  updateWarnings(deltaTime: number): void;
  destroy(): void;
}

/**
 * CharacterDangerWarningSystem implementation
 */
export class CharacterDangerWarningSystem
  extends Phaser.Events.EventEmitter
  implements ICharacterDangerWarningSystem
{
  private scene: Phaser.Scene;
  private warningConfig: LossWarningConfig;
  private dialogConfig: WarningDialogConfig;
  private importantCharConfig: ImportantCharacterConfig;
  private displayState: WarningDisplayState;

  // Danger level tracking
  private dangerLevels: Map<string, DangerLevel> = new Map();
  private lastDangerCheck: Map<string, number> = new Map();

  // UI groups for organization
  private warningsGroup: Phaser.GameObjects.Group;
  private dialogsGroup: Phaser.GameObjects.Group;

  // Default configurations
  private static readonly DEFAULT_WARNING_CONFIG: LossWarningConfig = {
    enableWarnings: true,
    criticalHPThreshold: 25,
    highDangerHPThreshold: 50,
    mediumDangerHPThreshold: 75,
    showConfirmationDialog: true,
    warningDisplayDuration: 3000,
    enableSoundAlerts: true,
  };

  private static readonly DEFAULT_DIALOG_CONFIG: WarningDialogConfig = {
    enableDialogs: true,
    backgroundColor: 0x000000,
    textColor: '#ffffff',
    borderColor: 0xff0000,
    width: 400,
    height: 200,
    fontSize: 16,
    fontFamily: 'Arial',
    buttonWidth: 100,
    buttonHeight: 40,
    animationDuration: 300,
  };

  private static readonly DEFAULT_IMPORTANT_CONFIG: ImportantCharacterConfig = {
    importantCharacterIds: ['protagonist', 'main_character', 'hero'],
    specialWarningMessage: '重要なキャラクターが危険です！',
    specialWarningColor: 0xff0000,
    enableSpecialSounds: true,
    specialWarningDuration: 5000,
  };

  /**
   * Creates a new CharacterDangerWarningSystem instance
   * @param scene - Phaser scene for UI rendering
   * @param warningConfig - Warning system configuration
   * @param dialogConfig - Dialog configuration
   * @param importantCharConfig - Important character configuration
   */
  constructor(
    scene: Phaser.Scene,
    warningConfig?: Partial<LossWarningConfig>,
    dialogConfig?: Partial<WarningDialogConfig>,
    importantCharConfig?: Partial<ImportantCharacterConfig>
  ) {
    super();

    this.scene = scene;
    this.warningConfig = {
      ...CharacterDangerWarningSystem.DEFAULT_WARNING_CONFIG,
      ...warningConfig,
    };
    this.dialogConfig = { ...CharacterDangerWarningSystem.DEFAULT_DIALOG_CONFIG, ...dialogConfig };
    this.importantCharConfig = {
      ...CharacterDangerWarningSystem.DEFAULT_IMPORTANT_CONFIG,
      ...importantCharConfig,
    };

    // Initialize display state
    this.displayState = {
      activeWarnings: new Map(),
      activeDialog: null,
      waitingForInput: false,
      lastUpdateTime: 0,
    };

    this.initializeUIGroups();
    this.setupEventListeners();
  }

  /**
   * Initialize UI groups for organized management
   */
  private initializeUIGroups(): void {
    this.warningsGroup = this.scene.add.group();
    this.dialogsGroup = this.scene.add.group();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen to scene events
    this.scene.events.on('shutdown', this.onSceneShutdown.bind(this));
    this.scene.events.on('destroy', this.onSceneDestroy.bind(this));
  }

  /**
   * Update danger levels for all units
   * @param units - Array of units to check
   */
  public updateDangerLevels(units: Unit[]): void {
    if (!this.warningConfig.enableWarnings) {
      return;
    }

    const currentTime = Date.now();
    this.displayState.lastUpdateTime = currentTime;

    for (const unit of units) {
      if (!unit) {
        continue;
      }

      // Calculate current danger level
      const newDangerLevel = this.calculateDangerLevel(unit);
      const oldDangerLevel = this.dangerLevels.get(unit.id) || DangerLevel.NONE;

      // Always update danger level (even if unit is dead)
      this.dangerLevels.set(unit.id, newDangerLevel);
      this.lastDangerCheck.set(unit.id, currentTime);

      // Update danger level if changed
      if (newDangerLevel !== oldDangerLevel) {
        // Show or hide warning based on new danger level
        if (newDangerLevel !== DangerLevel.NONE && unit.currentHP > 0) {
          this.showDangerWarning(unit, newDangerLevel);
        } else {
          this.hideDangerWarning(unit);
        }

        // Emit danger level changed event
        this.emit('danger-level-changed', {
          unit,
          oldLevel: oldDangerLevel,
          newLevel: newDangerLevel,
          isImportant: this.isImportantCharacter(unit.id),
        });

        // Special handling for important characters
        if (this.isImportantCharacter(unit.id) && newDangerLevel === DangerLevel.CRITICAL) {
          this.showImportantCharacterWarning(unit);
        }
      }
    }
  }

  /**
   * Calculate danger level for a unit based on HP percentage
   * @param unit - Unit to calculate danger level for
   * @returns Calculated danger level
   */
  private calculateDangerLevel(unit: Unit): DangerLevel {
    if (!unit || unit.currentHP <= 0) {
      return DangerLevel.CRITICAL;
    }

    const maxHP = unit.stats?.maxHP || unit.currentHP;
    if (maxHP <= 0) {
      return DangerLevel.CRITICAL;
    }

    const hpPercentage = (unit.currentHP / maxHP) * 100;

    if (hpPercentage <= this.warningConfig.criticalHPThreshold) {
      return DangerLevel.CRITICAL;
    } else if (hpPercentage <= this.warningConfig.highDangerHPThreshold) {
      return DangerLevel.HIGH;
    } else if (hpPercentage <= this.warningConfig.mediumDangerHPThreshold) {
      return DangerLevel.MEDIUM;
    } else if (hpPercentage <= 90) {
      return DangerLevel.LOW;
    }

    return DangerLevel.NONE;
  }

  /**
   * Get current danger level for a character
   * @param characterId - ID of the character
   * @returns Current danger level
   */
  public getDangerLevel(characterId: string): DangerLevel {
    return this.dangerLevels.get(characterId) || DangerLevel.NONE;
  }

  /**
   * Check if a character is in danger
   * @param characterId - ID of the character
   * @returns True if character is in danger
   */
  public isCharacterInDanger(characterId: string): boolean {
    const dangerLevel = this.getDangerLevel(characterId);
    return dangerLevel !== DangerLevel.NONE;
  }

  /**
   * Show danger warning for a unit
   * @param unit - Unit to show warning for
   * @param dangerLevel - Level of danger
   */
  public showDangerWarning(unit: Unit, dangerLevel: DangerLevel): void {
    if (!this.warningConfig.enableWarnings || !unit.sprite || dangerLevel === DangerLevel.NONE) {
      return;
    }

    // Remove existing warning if any
    this.hideDangerWarning(unit);

    // Create warning display
    const warningContainer = this.createWarningDisplay(unit, dangerLevel);
    this.displayState.activeWarnings.set(unit.id, warningContainer);
    this.warningsGroup.add(warningContainer);

    // Play sound alert if enabled
    if (this.warningConfig.enableSoundAlerts) {
      this.playWarningSound(dangerLevel);
    }

    // Auto-hide warning after duration
    this.scene.time.delayedCall(this.warningConfig.warningDisplayDuration, () => {
      this.hideDangerWarning(unit);
    });

    this.emit('danger-warning-shown', { unit, dangerLevel });
  }

  /**
   * Hide danger warning for a unit
   * @param unit - Unit to hide warning for
   */
  public hideDangerWarning(unit: Unit): void {
    const existingWarning = this.displayState.activeWarnings.get(unit.id);
    if (existingWarning) {
      // Animate warning disappearance
      this.scene.tweens.add({
        targets: existingWarning,
        alpha: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: 200,
        ease: 'Power2.easeIn',
        onComplete: () => {
          existingWarning.destroy();
        },
      });

      this.displayState.activeWarnings.delete(unit.id);
      this.emit('danger-warning-hidden', { unit });
    }
  }

  /**
   * Clear all active warnings
   */
  public clearAllWarnings(): void {
    this.displayState.activeWarnings.forEach(warning => {
      warning.destroy();
    });
    this.displayState.activeWarnings.clear();

    if (this.displayState.activeDialog) {
      this.displayState.activeDialog.destroy();
      this.displayState.activeDialog = null;
      this.displayState.waitingForInput = false;
    }

    this.emit('all-warnings-cleared');
  }

  /**
   * Show action confirmation dialog for risky actions
   * @param unit - Unit that would be affected
   * @param action - Action that would be performed
   * @returns Promise that resolves with user's decision
   */
  public async showActionConfirmationDialog(
    unit: Unit,
    action: GameAction
  ): Promise<ActionConfirmationResult> {
    if (!this.dialogConfig.enableDialogs || !this.warningConfig.showConfirmationDialog) {
      return { confirmed: true, rememberChoice: false, timestamp: Date.now() };
    }

    // Don't show dialog if one is already active
    if (this.displayState.waitingForInput) {
      return { confirmed: false, rememberChoice: false, timestamp: Date.now() };
    }

    return new Promise(resolve => {
      this.displayState.waitingForInput = true;

      const dialog = this.createConfirmationDialog(unit, action, result => {
        this.displayState.waitingForInput = false;
        this.displayState.activeDialog = null;
        resolve(result);
      });

      this.displayState.activeDialog = dialog;
      this.dialogsGroup.add(dialog);

      this.emit('confirmation-dialog-shown', { unit, action });
    });
  }

  /**
   * Check if a character is marked as important
   * @param characterId - ID of the character
   * @returns True if character is important
   */
  public isImportantCharacter(characterId: string): boolean {
    return this.importantCharConfig.importantCharacterIds.includes(characterId);
  }

  /**
   * Show special warning for important characters
   * @param unit - Important unit in danger
   */
  private showImportantCharacterWarning(unit: Unit): void {
    if (!unit.sprite) return;

    // Create special warning overlay
    const specialWarning = this.scene.add.container(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY - 100
    );

    // Background
    const background = this.scene.add.rectangle(
      0,
      0,
      this.dialogConfig.width + 40,
      80,
      this.importantCharConfig.specialWarningColor,
      0.9
    );
    background.setStrokeStyle(3, 0xffffff);
    specialWarning.add(background);

    // Warning text
    const warningText = this.scene.add.text(0, 0, this.importantCharConfig.specialWarningMessage, {
      fontSize: `${this.dialogConfig.fontSize + 4}px`,
      fontFamily: this.dialogConfig.fontFamily,
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: this.dialogConfig.width - 40 },
    });
    warningText.setOrigin(0.5);
    specialWarning.add(warningText);

    // Character name
    const nameText = this.scene.add.text(0, -25, unit.name, {
      fontSize: `${this.dialogConfig.fontSize + 2}px`,
      fontFamily: this.dialogConfig.fontFamily,
      color: '#ffff00',
      align: 'center',
    });
    nameText.setOrigin(0.5);
    specialWarning.add(nameText);

    // Set depth to appear above other UI
    specialWarning.setDepth(1000);
    specialWarning.setScrollFactor(0);

    // Animate appearance
    specialWarning.setAlpha(0);
    specialWarning.setScale(0.5);

    this.scene.tweens.add({
      targets: specialWarning,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: this.dialogConfig.animationDuration,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Pulse animation
        this.scene.tweens.add({
          targets: specialWarning,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 500,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            // Auto-hide after duration
            this.scene.time.delayedCall(this.importantCharConfig.specialWarningDuration, () => {
              this.scene.tweens.add({
                targets: specialWarning,
                alpha: 0,
                scaleX: 0.8,
                scaleY: 0.8,
                duration: 300,
                ease: 'Power2.easeIn',
                onComplete: () => {
                  specialWarning.destroy();
                },
              });
            });
          },
        });
      },
    });

    // Play special sound if enabled
    if (this.importantCharConfig.enableSpecialSounds) {
      this.playImportantCharacterSound();
    }

    this.emit('important-character-warning-shown', { unit });
  }

  /**
   * Create warning display for a unit
   * @param unit - Unit to create warning for
   * @param dangerLevel - Level of danger
   * @returns Warning display container
   */
  private createWarningDisplay(unit: Unit, dangerLevel: DangerLevel): Phaser.GameObjects.Container {
    if (!unit.sprite) {
      throw new Error('Cannot create warning display without sprite');
    }

    const container = this.scene.add.container(unit.sprite.x, unit.sprite.y - 50);

    // Determine warning color and text based on danger level
    let warningColor = 0xffff00; // Yellow default
    let warningText = '注意';

    switch (dangerLevel) {
      case DangerLevel.CRITICAL:
        warningColor = 0xff0000; // Red
        warningText = '危険！';
        break;
      case DangerLevel.HIGH:
        warningColor = 0xff8800; // Orange
        warningText = '警告';
        break;
      case DangerLevel.MEDIUM:
        warningColor = 0xffff00; // Yellow
        warningText = '注意';
        break;
      case DangerLevel.LOW:
        warningColor = 0x88ff88; // Light green
        warningText = '軽微';
        break;
    }

    // Background
    const background = this.scene.add.rectangle(0, 0, 80, 30, warningColor, 0.8);
    background.setStrokeStyle(2, 0xffffff);
    container.add(background);

    // Warning text
    const text = this.scene.add.text(0, 0, warningText, {
      fontSize: '14px',
      fontFamily: this.dialogConfig.fontFamily,
      color: '#000000',
      align: 'center',
    });
    text.setOrigin(0.5);
    container.add(text);

    // Animate appearance
    container.setAlpha(0);
    container.setScale(0.5);

    this.scene.tweens.add({
      targets: container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // Pulse animation for critical danger
    if (dangerLevel === DangerLevel.CRITICAL) {
      this.scene.tweens.add({
        targets: container,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    return container;
  }

  /**
   * Create confirmation dialog for risky actions
   * @param unit - Unit that would be affected
   * @param action - Action that would be performed
   * @param callback - Callback to call with user's decision
   * @returns Dialog container
   */
  private createConfirmationDialog(
    unit: Unit,
    action: GameAction,
    callback: (result: ActionConfirmationResult) => void
  ): Phaser.GameObjects.Container {
    const dialog = this.scene.add.container(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY
    );

    // Background
    const background = this.scene.add.rectangle(
      0,
      0,
      this.dialogConfig.width,
      this.dialogConfig.height,
      this.dialogConfig.backgroundColor,
      0.9
    );
    background.setStrokeStyle(3, this.dialogConfig.borderColor);
    dialog.add(background);

    // Title
    const title = this.scene.add.text(0, -60, '危険な行動の確認', {
      fontSize: `${this.dialogConfig.fontSize + 2}px`,
      fontFamily: this.dialogConfig.fontFamily,
      color: '#ff0000',
      align: 'center',
    });
    title.setOrigin(0.5);
    dialog.add(title);

    // Warning message
    const dangerLevel = this.getDangerLevel(unit.id);
    const isImportant = this.isImportantCharacter(unit.id);

    let message = `${unit.name}が危険な状態です。\n`;
    message += `この行動により撃破される可能性があります。\n`;
    message += `続行しますか？`;

    if (isImportant) {
      message = `重要キャラクター「${unit.name}」が\n非常に危険な状態です！\n`;
      message += `この行動により撃破される可能性が高いです。\n`;
      message += `本当に続行しますか？`;
    }

    const messageText = this.scene.add.text(0, -10, message, {
      fontSize: `${this.dialogConfig.fontSize}px`,
      fontFamily: this.dialogConfig.fontFamily,
      color: this.dialogConfig.textColor,
      align: 'center',
      wordWrap: { width: this.dialogConfig.width - 40 },
    });
    messageText.setOrigin(0.5);
    dialog.add(messageText);

    // Buttons
    const buttonY = 50;
    const buttonSpacing = 120;

    // Continue button
    const continueButton = this.createDialogButton(
      -buttonSpacing / 2,
      buttonY,
      '続行',
      0x00aa00,
      () => {
        this.animateDialogClose(dialog);
        callback({
          confirmed: true,
          rememberChoice: false,
          timestamp: Date.now(),
        });
      }
    );
    dialog.add(continueButton);

    // Cancel button
    const cancelButton = this.createDialogButton(
      buttonSpacing / 2,
      buttonY,
      'キャンセル',
      0xaa0000,
      () => {
        this.animateDialogClose(dialog);
        callback({
          confirmed: false,
          rememberChoice: false,
          timestamp: Date.now(),
        });
      }
    );
    dialog.add(cancelButton);

    // Set depth and scroll factor
    dialog.setDepth(1000);
    dialog.setScrollFactor(0);

    // Animate appearance
    dialog.setAlpha(0);
    dialog.setScale(0.5);

    this.scene.tweens.add({
      targets: dialog,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: this.dialogConfig.animationDuration,
      ease: 'Back.easeOut',
    });

    return dialog;
  }

  /**
   * Create a dialog button
   * @param x - X position
   * @param y - Y position
   * @param text - Button text
   * @param color - Button color
   * @param callback - Click callback
   * @returns Button container
   */
  private createDialogButton(
    x: number,
    y: number,
    text: string,
    color: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);

    // Button background
    const background = this.scene.add.rectangle(
      0,
      0,
      this.dialogConfig.buttonWidth,
      this.dialogConfig.buttonHeight,
      color,
      0.8
    );
    background.setStrokeStyle(2, 0xffffff);
    button.add(background);

    // Button text
    const buttonText = this.scene.add.text(0, 0, text, {
      fontSize: `${this.dialogConfig.fontSize}px`,
      fontFamily: this.dialogConfig.fontFamily,
      color: '#ffffff',
      align: 'center',
    });
    buttonText.setOrigin(0.5);
    button.add(buttonText);

    // Make interactive
    background.setInteractive();
    background.on('pointerdown', callback);

    // Hover effects
    background.on('pointerover', () => {
      background.setAlpha(1);
      button.setScale(1.05);
    });

    background.on('pointerout', () => {
      background.setAlpha(0.8);
      button.setScale(1);
    });

    return button;
  }

  /**
   * Animate dialog closing
   * @param dialog - Dialog to close
   */
  private animateDialogClose(dialog: Phaser.GameObjects.Container): void {
    this.scene.tweens.add({
      targets: dialog,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 200,
      ease: 'Power2.easeIn',
      onComplete: () => {
        dialog.destroy();
      },
    });
  }

  /**
   * Play warning sound based on danger level
   * @param dangerLevel - Level of danger
   */
  private playWarningSound(dangerLevel: DangerLevel): void {
    // This would play actual sound files in a real implementation
    // For now, we'll just emit an event
    this.emit('warning-sound-requested', { dangerLevel });
  }

  /**
   * Play special sound for important character warnings
   */
  private playImportantCharacterSound(): void {
    // This would play actual sound files in a real implementation
    // For now, we'll just emit an event
    this.emit('important-character-sound-requested');
  }

  /**
   * Update warnings (called from game loop)
   * @param deltaTime - Time since last update
   */
  public updateWarnings(deltaTime: number): void {
    // Update warning positions to follow units
    this.displayState.activeWarnings.forEach((warning, unitId) => {
      // Find the unit by ID (this would need to be provided by the game state)
      // For now, we'll just keep the warnings in place
    });
  }

  /**
   * Handle scene shutdown
   */
  private onSceneShutdown(): void {
    this.clearAllWarnings();
  }

  /**
   * Handle scene destroy
   */
  private onSceneDestroy(): void {
    this.destroy();
  }

  /**
   * Destroy the warning system and clean up resources
   */
  public destroy(): void {
    this.clearAllWarnings();

    // Clear groups
    this.warningsGroup.destroy(true);
    this.dialogsGroup.destroy(true);

    // Clear maps
    this.dangerLevels.clear();
    this.lastDangerCheck.clear();

    // Remove event listeners
    this.removeAllListeners();

    this.emit('warning-system-destroyed');
  }
}
