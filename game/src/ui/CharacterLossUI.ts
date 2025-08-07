/**
 * CharacterLossUI - UI management for character loss system
 *
 * This class handles all visual representations of character loss states:
 * - Party composition screen grayout display
 * - Loss reason explanations
 * - Stage selection screen loss count display
 * - Warning dialogs and feedback
 *
 * Implements requirements 3.1, 3.2, 3.3, 3.4, 3.5 from the character loss system specification
 */

import * as Phaser from 'phaser';
import { Unit } from '../types/gameplay';
import {
  LostCharacter,
  DangerLevel,
  LossCause,
  ChapterLossSummary,
  PartyValidationResult,
  CharacterLossError,
  CharacterLossErrorDetails,
  LossContext,
} from '../types/characterLoss';

/**
 * Character loss UI configuration
 */
export interface CharacterLossUIConfig {
  /** Enable grayout effects for lost characters */
  enableGrayoutEffects: boolean;
  /** Enable loss reason tooltips */
  enableLossReasonTooltips: boolean;
  /** Enable stage selection loss count display */
  enableStageSelectionDisplay: boolean;
  /** Enable confirmation dialogs */
  enableConfirmationDialogs: boolean;
  /** Duration for tooltip display in milliseconds */
  tooltipDisplayDuration: number;
  /** Animation duration for UI transitions */
  animationDuration: number;
  /** UI depth for loss-related elements */
  uiDepth: number;
}

/**
 * Character display state for UI rendering
 */
export interface CharacterDisplayState {
  characterId: string;
  isLost: boolean;
  isSelectable: boolean;
  grayoutAlpha: number;
  lossReason?: string;
  displayName: string;
}

/**
 * Loss reason tooltip data
 */
export interface LossReasonTooltip {
  characterId: string;
  reason: string;
  position: { x: number; y: number };
  visible: boolean;
  container?: Phaser.GameObjects.Container;
}

/**
 * Stage selection loss display data
 */
export interface StageSelectionLossDisplay {
  totalCharacters: number;
  lostCharacters: number;
  lossPercentage: number;
  displayText: string;
  warningLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Party composition validation display
 */
export interface PartyValidationDisplay {
  isValid: boolean;
  errorMessages: string[];
  warningMessages: string[];
  availableCount: number;
  requiredCount: number;
  displayContainer?: Phaser.GameObjects.Container;
}

/**
 * Interface for CharacterLossUI class
 */
export interface ICharacterLossUI {
  // Party composition UI
  updatePartyCompositionDisplay(characters: Unit[], lostCharacters: LostCharacter[]): void;
  showCharacterGrayoutEffect(characterId: string, isLost: boolean): void;
  showCharacterSelectionFeedback(characterId: string, canSelect: boolean, reason?: string): void;

  // Loss reason display
  showLossReasonTooltip(
    characterId: string,
    position: { x: number; y: number },
    reason: string
  ): void;
  hideLossReasonTooltip(characterId: string): void;
  hideAllTooltips(): void;

  // Stage selection display
  updateStageSelectionLossCount(lostCount: number, totalCount: number): void;
  showStageSelectionWarning(warningLevel: string, message: string): void;

  // Party validation display
  showPartyValidationResult(result: PartyValidationResult): void;
  hidePartyValidationDisplay(): void;

  // Chapter completion display
  showChapterCompletionSummary(summary: ChapterLossSummary): Promise<void>;

  // Game over display
  showGameOverScreen(gameOverData: any): Promise<void>;

  // Error handling
  showErrorMessage(error: CharacterLossErrorDetails): void;
  hideErrorMessage(): void;

  // Cleanup
  destroy(): void;
}

/**
 * CharacterLossUI implementation
 * Manages all UI elements related to character loss visualization
 */
export class CharacterLossUI extends Phaser.Events.EventEmitter implements ICharacterLossUI {
  private scene: Phaser.Scene;
  private config: CharacterLossUIConfig;

  // UI containers and elements
  private partyCompositionContainer?: Phaser.GameObjects.Container;
  private stageSelectionContainer?: Phaser.GameObjects.Container;
  private tooltipContainer?: Phaser.GameObjects.Container;
  private validationContainer?: Phaser.GameObjects.Container;
  private errorContainer?: Phaser.GameObjects.Container;
  private chapterSummaryContainer?: Phaser.GameObjects.Container;

  // Character display tracking
  private characterDisplayStates: Map<string, CharacterDisplayState> = new Map();
  private activeTooltips: Map<string, LossReasonTooltip> = new Map();
  private characterSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();

  // UI state
  private isPartyCompositionVisible: boolean = false;
  private isStageSelectionVisible: boolean = false;
  private isValidationDisplayVisible: boolean = false;
  private isErrorVisible: boolean = false;

  // Default configuration
  private static readonly DEFAULT_CONFIG: CharacterLossUIConfig = {
    enableGrayoutEffects: true,
    enableLossReasonTooltips: true,
    enableStageSelectionDisplay: true,
    enableConfirmationDialogs: true,
    tooltipDisplayDuration: 3000,
    animationDuration: 300,
    uiDepth: 2000,
  };

  /**
   * Creates a new CharacterLossUI instance
   * @param scene - Phaser scene for rendering
   * @param config - UI configuration options
   */
  constructor(scene: Phaser.Scene, config?: Partial<CharacterLossUIConfig>) {
    super();

    this.scene = scene;
    this.config = { ...CharacterLossUI.DEFAULT_CONFIG, ...config };

    this.initializeContainers();
    this.setupEventListeners();

    console.log('[CharacterLossUI] Initialized with config:', this.config);
  }

  /**
   * Initialize UI containers
   */
  private initializeContainers(): void {
    // Create main containers for different UI sections
    this.partyCompositionContainer = this.scene.add
      .container(0, 0)
      .setDepth(this.config.uiDepth)
      .setVisible(false);

    this.stageSelectionContainer = this.scene.add
      .container(0, 0)
      .setDepth(this.config.uiDepth)
      .setVisible(false);

    this.tooltipContainer = this.scene.add
      .container(0, 0)
      .setDepth(this.config.uiDepth + 10)
      .setVisible(true);

    this.validationContainer = this.scene.add
      .container(0, 0)
      .setDepth(this.config.uiDepth + 5)
      .setVisible(false);

    this.errorContainer = this.scene.add
      .container(0, 0)
      .setDepth(this.config.uiDepth + 20)
      .setVisible(false);

    this.chapterSummaryContainer = this.scene.add
      .container(0, 0)
      .setDepth(this.config.uiDepth + 15)
      .setVisible(false);
  }

  /**
   * Setup event listeners for UI interactions
   */
  private setupEventListeners(): void {
    // Listen for scene events
    this.scene.events.on('shutdown', this.onSceneShutdown.bind(this));
    this.scene.events.on('destroy', this.onSceneDestroy.bind(this));

    // Listen for resize events
    this.scene.scale.on('resize', this.onSceneResize.bind(this));
  }

  /**
   * Update party composition display with character loss states
   * Implements requirement 3.1: Party composition screen grayout display
   * @param characters - All characters in the party
   * @param lostCharacters - Characters that are lost
   */
  public updatePartyCompositionDisplay(characters: Unit[], lostCharacters: LostCharacter[]): void {
    if (!this.config.enableGrayoutEffects) {
      return;
    }

    try {
      // Create set of lost character IDs for quick lookup
      const lostCharacterIds = new Set(lostCharacters.map(char => char.characterId));

      // Update display states for all characters
      characters.forEach(character => {
        const isLost = lostCharacterIds.has(character.id);
        const lostCharacter = lostCharacters.find(lost => lost.characterId === character.id);

        const displayState: CharacterDisplayState = {
          characterId: character.id,
          isLost: isLost,
          isSelectable: !isLost,
          grayoutAlpha: isLost ? 0.3 : 1.0,
          lossReason: lostCharacter ? this.formatLossReason(lostCharacter.cause) : undefined,
          displayName: character.name,
        };

        this.characterDisplayStates.set(character.id, displayState);

        // Apply visual effects
        this.applyCharacterDisplayState(character.id, displayState);
      });

      this.isPartyCompositionVisible = true;
      this.partyCompositionContainer?.setVisible(true);

      this.emit('party-composition-updated', {
        totalCharacters: characters.length,
        lostCharacters: lostCharacters.length,
        displayStates: Array.from(this.characterDisplayStates.values()),
      });

      console.log(
        `[CharacterLossUI] Updated party composition display: ${lostCharacters.length}/${characters.length} lost`
      );
    } catch (error) {
      console.error('[CharacterLossUI] Error updating party composition display:', error);
      this.showErrorMessage(
        this.createError(
          CharacterLossError.UI_UPDATE_FAILED,
          'Failed to update party composition display',
          { characterId: '', phase: 'party_composition_update' }
        )
      );
    }
  }

  /**
   * Show grayout effect for lost characters
   * Implements requirement 3.1: Visual indication of lost characters
   * @param characterId - ID of the character
   * @param isLost - Whether the character is lost
   */
  public showCharacterGrayoutEffect(characterId: string, isLost: boolean): void {
    if (!this.config.enableGrayoutEffects) {
      return;
    }

    try {
      const sprite = this.characterSprites.get(characterId);
      if (!sprite) {
        console.warn(`[CharacterLossUI] No sprite found for character ${characterId}`);
        return;
      }

      const targetAlpha = isLost ? 0.3 : 1.0;
      const targetTint = isLost ? 0x666666 : 0xffffff;

      // Animate the grayout effect
      this.scene.tweens.add({
        targets: sprite,
        alpha: targetAlpha,
        tint: targetTint,
        duration: this.config.animationDuration,
        ease: 'Power2.easeInOut',
        onComplete: () => {
          this.emit('grayout-effect-applied', {
            characterId,
            isLost,
            alpha: targetAlpha,
          });
        },
      });

      console.log(
        `[CharacterLossUI] Applied grayout effect to ${characterId}: ${isLost ? 'lost' : 'available'}`
      );
    } catch (error) {
      console.error(`[CharacterLossUI] Error applying grayout effect to ${characterId}:`, error);
    }
  }

  /**
   * Show character selection feedback
   * Implements requirement 3.2: Selection feedback for lost characters
   * @param characterId - ID of the character
   * @param canSelect - Whether the character can be selected
   * @param reason - Reason why character cannot be selected
   */
  public showCharacterSelectionFeedback(
    characterId: string,
    canSelect: boolean,
    reason?: string
  ): void {
    try {
      const sprite = this.characterSprites.get(characterId);
      if (!sprite) {
        console.warn(`[CharacterLossUI] No sprite found for character ${characterId}`);
        return;
      }

      if (!canSelect) {
        // Show "cannot select" feedback
        this.showSelectionDeniedFeedback(sprite, reason || 'Character is not available');

        // Show tooltip with reason if enabled
        if (this.config.enableLossReasonTooltips && reason) {
          const worldPosition = sprite.getWorldTransformMatrix();
          this.showLossReasonTooltip(
            characterId,
            {
              x: worldPosition.tx,
              y: worldPosition.ty - 50,
            },
            reason
          );
        }
      } else {
        // Show normal selection feedback
        this.showSelectionAllowedFeedback(sprite);
      }

      this.emit('selection-feedback-shown', {
        characterId,
        canSelect,
        reason,
      });
    } catch (error) {
      console.error(
        `[CharacterLossUI] Error showing selection feedback for ${characterId}:`,
        error
      );
    }
  }

  /**
   * Show loss reason tooltip
   * Implements requirement 3.3: Loss reason explanation display
   * @param characterId - ID of the character
   * @param position - Screen position for the tooltip
   * @param reason - Loss reason text
   */
  public showLossReasonTooltip(
    characterId: string,
    position: { x: number; y: number },
    reason: string
  ): void {
    if (!this.config.enableLossReasonTooltips) {
      return;
    }

    try {
      // Hide existing tooltip for this character
      this.hideLossReasonTooltip(characterId);

      // Create tooltip container
      const tooltipContainer = this.scene.add.container(position.x, position.y);

      // Create tooltip background
      const tooltipWidth = Math.max(200, reason.length * 8);
      const tooltipHeight = 60;

      const background = this.scene.add
        .graphics()
        .fillStyle(0x000000, 0.9)
        .fillRoundedRect(-tooltipWidth / 2, -tooltipHeight / 2, tooltipWidth, tooltipHeight, 8)
        .lineStyle(2, 0xff6666, 1)
        .strokeRoundedRect(-tooltipWidth / 2, -tooltipHeight / 2, tooltipWidth, tooltipHeight, 8);

      // Create tooltip text
      const tooltipText = this.scene.add
        .text(0, 0, reason, {
          fontSize: '14px',
          color: '#ffffff',
          fontFamily: 'Arial',
          align: 'center',
          wordWrap: { width: tooltipWidth - 20 },
        })
        .setOrigin(0.5);

      // Add elements to container
      tooltipContainer.add([background, tooltipText]);
      this.tooltipContainer?.add(tooltipContainer);

      // Store tooltip reference
      const tooltip: LossReasonTooltip = {
        characterId,
        reason,
        position,
        visible: true,
        container: tooltipContainer,
      };
      this.activeTooltips.set(characterId, tooltip);

      // Auto-hide tooltip after duration
      this.scene.time.delayedCall(this.config.tooltipDisplayDuration, () => {
        this.hideLossReasonTooltip(characterId);
      });

      // Animate tooltip appearance
      tooltipContainer.setAlpha(0).setScale(0.8);
      this.scene.tweens.add({
        targets: tooltipContainer,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: 'Back.easeOut',
      });

      this.emit('loss-reason-tooltip-shown', {
        characterId,
        reason,
        position,
      });

      console.log(`[CharacterLossUI] Showed loss reason tooltip for ${characterId}: ${reason}`);
    } catch (error) {
      console.error(
        `[CharacterLossUI] Error showing loss reason tooltip for ${characterId}:`,
        error
      );
    }
  }

  /**
   * Hide loss reason tooltip for specific character
   * @param characterId - ID of the character
   */
  public hideLossReasonTooltip(characterId: string): void {
    try {
      const tooltip = this.activeTooltips.get(characterId);
      if (!tooltip || !tooltip.container) {
        return;
      }

      // Animate tooltip disappearance
      this.scene.tweens.add({
        targets: tooltip.container,
        alpha: 0,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 150,
        ease: 'Power2.easeIn',
        onComplete: () => {
          tooltip.container?.destroy();
          this.activeTooltips.delete(characterId);
        },
      });

      this.emit('loss-reason-tooltip-hidden', { characterId });
    } catch (error) {
      console.error(
        `[CharacterLossUI] Error hiding loss reason tooltip for ${characterId}:`,
        error
      );
    }
  }

  /**
   * Hide all active tooltips
   */
  public hideAllTooltips(): void {
    try {
      const characterIds = Array.from(this.activeTooltips.keys());
      characterIds.forEach(characterId => {
        this.hideLossReasonTooltip(characterId);
      });

      console.log(`[CharacterLossUI] Hidden ${characterIds.length} tooltips`);
    } catch (error) {
      console.error('[CharacterLossUI] Error hiding all tooltips:', error);
    }
  }

  /**
   * Update stage selection screen with loss count
   * Implements requirement 3.4: Stage selection loss count display
   * @param lostCount - Number of lost characters
   * @param totalCount - Total number of characters
   */
  public updateStageSelectionLossCount(lostCount: number, totalCount: number): void {
    if (!this.config.enableStageSelectionDisplay) {
      return;
    }

    try {
      // Calculate loss statistics
      const lossPercentage = totalCount > 0 ? (lostCount / totalCount) * 100 : 0;
      const warningLevel = this.calculateWarningLevel(lossPercentage);

      const displayData: StageSelectionLossDisplay = {
        totalCharacters: totalCount,
        lostCharacters: lostCount,
        lossPercentage,
        displayText: this.formatLossCountText(lostCount, totalCount),
        warningLevel,
      };

      // Clear existing display
      this.stageSelectionContainer?.removeAll(true);

      // Create loss count display
      this.createStageSelectionDisplay(displayData);

      this.isStageSelectionVisible = true;
      this.stageSelectionContainer?.setVisible(true);

      this.emit('stage-selection-loss-count-updated', displayData);

      console.log(
        `[CharacterLossUI] Updated stage selection loss count: ${lostCount}/${totalCount} (${lossPercentage.toFixed(1)}%)`
      );
    } catch (error) {
      console.error('[CharacterLossUI] Error updating stage selection loss count:', error);
    }
  }

  /**
   * Show stage selection warning
   * @param warningLevel - Warning level
   * @param message - Warning message
   */
  public showStageSelectionWarning(warningLevel: string, message: string): void {
    try {
      // Create warning display
      const warningContainer = this.scene.add.container(this.scene.cameras.main.width / 2, 100);

      const warningColor = this.getWarningColor(warningLevel);

      const background = this.scene.add
        .graphics()
        .fillStyle(warningColor, 0.8)
        .fillRoundedRect(-150, -30, 300, 60, 10)
        .lineStyle(2, 0xffffff, 1)
        .strokeRoundedRect(-150, -30, 300, 60, 10);

      const warningText = this.scene.add
        .text(0, 0, message, {
          fontSize: '16px',
          color: '#ffffff',
          fontFamily: 'Arial',
          align: 'center',
          wordWrap: { width: 280 },
        })
        .setOrigin(0.5);

      warningContainer.add([background, warningText]);
      this.stageSelectionContainer?.add(warningContainer);

      // Auto-hide warning after 5 seconds
      this.scene.time.delayedCall(5000, () => {
        warningContainer.destroy();
      });

      this.emit('stage-selection-warning-shown', {
        warningLevel,
        message,
      });
    } catch (error) {
      console.error('[CharacterLossUI] Error showing stage selection warning:', error);
    }
  }

  /**
   * Show party validation result
   * @param result - Party validation result
   */
  public showPartyValidationResult(result: PartyValidationResult): void {
    try {
      // Clear existing validation display
      this.hidePartyValidationDisplay();

      if (result.isValid && result.errors.length === 0 && result.warnings.length === 0) {
        return; // No need to show anything for valid parties
      }

      // Create validation display
      const validationDisplay = this.createPartyValidationDisplay(result);
      this.validationContainer?.add(validationDisplay.displayContainer!);

      this.isValidationDisplayVisible = true;
      this.validationContainer?.setVisible(true);

      this.emit('party-validation-result-shown', result);

      console.log(
        `[CharacterLossUI] Showed party validation result: ${result.isValid ? 'valid' : 'invalid'}`
      );
    } catch (error) {
      console.error('[CharacterLossUI] Error showing party validation result:', error);
    }
  }

  /**
   * Hide party validation display
   */
  public hidePartyValidationDisplay(): void {
    try {
      this.validationContainer?.removeAll(true);
      this.validationContainer?.setVisible(false);
      this.isValidationDisplayVisible = false;

      this.emit('party-validation-display-hidden');
    } catch (error) {
      console.error('[CharacterLossUI] Error hiding party validation display:', error);
    }
  }

  /**
   * Show chapter completion summary
   * Implements requirement 3.5: Chapter completion display
   * @param summary - Chapter loss summary
   */
  public async showChapterCompletionSummary(summary: ChapterLossSummary): Promise<void> {
    try {
      // Clear existing summary display
      this.chapterSummaryContainer?.removeAll(true);

      // Create chapter summary display
      const summaryDisplay = this.createChapterSummaryDisplay(summary);
      this.chapterSummaryContainer?.add(summaryDisplay);
      this.chapterSummaryContainer?.setVisible(true);

      // Animate summary appearance
      summaryDisplay.setAlpha(0).setScale(0.8);

      await new Promise<void>(resolve => {
        this.scene.tweens.add({
          targets: summaryDisplay,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 500,
          ease: 'Back.easeOut',
          onComplete: () => resolve(),
        });
      });

      this.emit('chapter-completion-summary-shown', summary);

      console.log(
        `[CharacterLossUI] Showed chapter completion summary: ${summary.isPerfectClear ? 'Perfect Clear' : `${summary.lostCharacters.length} losses`}`
      );
    } catch (error) {
      console.error('[CharacterLossUI] Error showing chapter completion summary:', error);
      throw error;
    }
  }

  /**
   * Show game over screen when all characters are lost
   * @param gameOverData - Game over information
   */
  public async showGameOverScreen(gameOverData: any): Promise<void> {
    try {
      // Clear existing displays
      this.chapterSummaryContainer?.removeAll(true);

      // Create game over display
      const gameOverDisplay = this.createGameOverDisplay(gameOverData);
      this.chapterSummaryContainer?.add(gameOverDisplay);
      this.chapterSummaryContainer?.setVisible(true);

      // Animate game over screen appearance
      gameOverDisplay.setAlpha(0).setScale(0.8);

      await new Promise<void>(resolve => {
        this.scene.tweens.add({
          targets: gameOverDisplay,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 800,
          ease: 'Back.easeOut',
          onComplete: () => resolve(),
        });
      });

      this.emit('game-over-screen-shown', gameOverData);

      console.log(`[CharacterLossUI] Showed game over screen: ${gameOverData.reason}`);
    } catch (error) {
      console.error('[CharacterLossUI] Error showing game over screen:', error);
      throw error;
    }
  }

  /**
   * Show error message
   * @param error - Character loss error details
   */
  public showErrorMessage(error: CharacterLossErrorDetails): void {
    try {
      // Clear existing error display
      this.hideErrorMessage();

      // Create error display
      const errorDisplay = this.createErrorDisplay(error);
      this.errorContainer?.add(errorDisplay);
      this.errorContainer?.setVisible(true);

      this.isErrorVisible = true;

      // Auto-hide error after 5 seconds
      this.scene.time.delayedCall(5000, () => {
        this.hideErrorMessage();
      });

      this.emit('error-message-shown', error);

      console.log(`[CharacterLossUI] Showed error message: ${error.message}`);
    } catch (displayError) {
      console.error('[CharacterLossUI] Error showing error message:', displayError);
    }
  }

  /**
   * Hide error message
   */
  public hideErrorMessage(): void {
    try {
      this.errorContainer?.removeAll(true);
      this.errorContainer?.setVisible(false);
      this.isErrorVisible = false;

      this.emit('error-message-hidden');
    } catch (error) {
      console.error('[CharacterLossUI] Error hiding error message:', error);
    }
  }

  /**
   * Apply character display state to sprite
   * @param characterId - Character ID
   * @param displayState - Display state to apply
   */
  private applyCharacterDisplayState(
    characterId: string,
    displayState: CharacterDisplayState
  ): void {
    const sprite = this.characterSprites.get(characterId);
    if (!sprite) {
      return;
    }

    // Apply grayout effect
    sprite.setAlpha(displayState.grayoutAlpha);

    if (displayState.isLost) {
      sprite.setTint(0x666666);
    } else {
      sprite.clearTint();
    }

    // Update interactivity
    sprite.setInteractive(displayState.isSelectable);
  }

  /**
   * Show selection denied feedback
   * @param sprite - Character sprite
   * @param reason - Reason for denial
   */
  private showSelectionDeniedFeedback(sprite: Phaser.GameObjects.Sprite, reason: string): void {
    // Create "X" mark or similar visual feedback
    const feedback = this.scene.add
      .text(sprite.x, sprite.y - 30, '✗', {
        fontSize: '24px',
        color: '#ff4444',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // Animate feedback
    this.scene.tweens.add({
      targets: feedback,
      y: sprite.y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Power2.easeOut',
      onComplete: () => {
        feedback.destroy();
      },
    });
  }

  /**
   * Show selection allowed feedback
   * @param sprite - Character sprite
   */
  private showSelectionAllowedFeedback(sprite: Phaser.GameObjects.Sprite): void {
    // Create highlight effect
    const highlight = this.scene.add
      .graphics()
      .lineStyle(3, 0x44ff44, 1)
      .strokeCircle(sprite.x, sprite.y, 40);

    // Animate highlight
    this.scene.tweens.add({
      targets: highlight,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 500,
      ease: 'Power2.easeOut',
      onComplete: () => {
        highlight.destroy();
      },
    });
  }

  /**
   * Create stage selection display
   * @param displayData - Display data
   */
  private createStageSelectionDisplay(displayData: StageSelectionLossDisplay): void {
    const container = this.scene.add.container(this.scene.cameras.main.width - 200, 50);

    const bgColor = this.getWarningColor(displayData.warningLevel);

    const background = this.scene.add
      .graphics()
      .fillStyle(bgColor, 0.8)
      .fillRoundedRect(-100, -25, 200, 50, 8)
      .lineStyle(2, 0xffffff, 1)
      .strokeRoundedRect(-100, -25, 200, 50, 8);

    const displayText = this.scene.add
      .text(0, 0, displayData.displayText, {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial',
        align: 'center',
      })
      .setOrigin(0.5);

    container.add([background, displayText]);
    this.stageSelectionContainer?.add(container);
  }

  /**
   * Create party validation display
   * @param result - Validation result
   * @returns Validation display data
   */
  private createPartyValidationDisplay(result: PartyValidationResult): PartyValidationDisplay {
    const container = this.scene.add.container(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2
    );

    const panelWidth = 400;
    const panelHeight = 200;

    // Background
    const background = this.scene.add
      .graphics()
      .fillStyle(result.isValid ? 0x004400 : 0x440000, 0.9)
      .fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 12)
      .lineStyle(3, result.isValid ? 0x00ff00 : 0xff0000, 1)
      .strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 12);

    // Title
    const title = this.scene.add
      .text(0, -panelHeight / 2 + 30, result.isValid ? 'Party Valid' : 'Party Invalid', {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Error messages
    let yOffset = -panelHeight / 2 + 60;
    result.errors.forEach(error => {
      const errorText = this.scene.add
        .text(0, yOffset, error.message, {
          fontSize: '14px',
          color: '#ff6666',
          fontFamily: 'Arial',
          align: 'center',
          wordWrap: { width: panelWidth - 40 },
        })
        .setOrigin(0.5);

      container.add(errorText);
      yOffset += 25;
    });

    // Warning messages
    result.warnings.forEach(warning => {
      const warningText = this.scene.add
        .text(0, yOffset, warning.message, {
          fontSize: '14px',
          color: '#ffaa00',
          fontFamily: 'Arial',
          align: 'center',
          wordWrap: { width: panelWidth - 40 },
        })
        .setOrigin(0.5);

      container.add(warningText);
      yOffset += 25;
    });

    container.add([background, title]);

    return {
      isValid: result.isValid,
      errorMessages: result.errors.map(e => e.message),
      warningMessages: result.warnings.map(w => w.message),
      availableCount: result.availableCharacters.length,
      requiredCount: 1, // Minimum required
      displayContainer: container,
    };
  }

  /**
   * Create chapter summary display
   * @param summary - Chapter summary
   * @returns Display container
   */
  private createChapterSummaryDisplay(summary: ChapterLossSummary): Phaser.GameObjects.Container {
    const container = this.scene.add.container(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2
    );

    const panelWidth = 500;
    const panelHeight = 400;

    // Background
    const bgColor = summary.isPerfectClear ? 0x004400 : 0x444400;
    const borderColor = summary.isPerfectClear ? 0x00ff00 : 0xffaa00;

    const background = this.scene.add
      .graphics()
      .fillStyle(bgColor, 0.95)
      .fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 15)
      .lineStyle(4, borderColor, 1)
      .strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 15);

    // Title
    const titleText = summary.isPerfectClear ? 'Perfect Clear!' : 'Chapter Complete';
    const title = this.scene.add
      .text(0, -panelHeight / 2 + 40, titleText, {
        fontSize: '28px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Chapter info
    const chapterInfo = this.scene.add
      .text(0, -panelHeight / 2 + 80, `${summary.chapterName}\nTurns: ${summary.totalTurns}`, {
        fontSize: '16px',
        color: '#cccccc',
        fontFamily: 'Arial',
        align: 'center',
      })
      .setOrigin(0.5);

    // Loss summary
    let yOffset = -panelHeight / 2 + 140;

    if (summary.isPerfectClear) {
      const perfectText = this.scene.add
        .text(0, yOffset, 'All characters survived!', {
          fontSize: '18px',
          color: '#44ff44',
          fontFamily: 'Arial',
          align: 'center',
        })
        .setOrigin(0.5);
      container.add(perfectText);
    } else {
      const lossText = this.scene.add
        .text(0, yOffset, `Characters Lost: ${summary.lostCharacters.length}`, {
          fontSize: '18px',
          color: '#ffaa00',
          fontFamily: 'Arial',
          align: 'center',
        })
        .setOrigin(0.5);
      container.add(lossText);

      yOffset += 30;

      // List lost characters
      summary.lostCharacters.forEach(lostChar => {
        const lossInfo = this.scene.add
          .text(0, yOffset, `${lostChar.name}: ${this.formatLossReason(lostChar.cause)}`, {
            fontSize: '14px',
            color: '#ff6666',
            fontFamily: 'Arial',
            align: 'center',
            wordWrap: { width: panelWidth - 60 },
          })
          .setOrigin(0.5);

        container.add(lossInfo);
        yOffset += 25;
      });
    }

    // Continue button
    const continueButton = this.scene.add
      .text(0, panelHeight / 2 - 40, 'Continue', {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial',
        backgroundColor: '#666666',
        padding: { x: 30, y: 15 },
      })
      .setOrigin(0.5)
      .setInteractive();

    continueButton.on('pointerdown', () => {
      this.chapterSummaryContainer?.setVisible(false);
      this.emit('chapter-summary-dismissed', summary);
    });

    continueButton.on('pointerover', () => {
      continueButton.setBackgroundColor('#888888');
    });

    continueButton.on('pointerout', () => {
      continueButton.setBackgroundColor('#666666');
    });

    container.add([background, title, chapterInfo, continueButton]);

    return container;
  }

  /**
   * Create game over display
   * @param gameOverData - Game over data
   * @returns Game over display container
   */
  private createGameOverDisplay(gameOverData: any): Phaser.GameObjects.Container {
    const container = this.scene.add.container(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2
    );

    const panelWidth = 600;
    const panelHeight = 500;

    // Background with dark red theme for game over
    const background = this.scene.add
      .graphics()
      .fillStyle(0x440000, 0.95)
      .fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 15)
      .lineStyle(4, 0xff0000, 1)
      .strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 15);

    // Game Over title
    const title = this.scene.add
      .text(0, -panelHeight / 2 + 50, 'GAME OVER', {
        fontSize: '36px',
        color: '#ff4444',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Reason
    const reasonText =
      gameOverData.reason === 'all_characters_lost'
        ? '全てのキャラクターが失われました'
        : gameOverData.reason;

    const reason = this.scene.add
      .text(0, -panelHeight / 2 + 110, reasonText, {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial',
        align: 'center',
      })
      .setOrigin(0.5);

    // Chapter info
    const chapterInfo = this.scene.add
      .text(0, -panelHeight / 2 + 150, `章: ${gameOverData.chapterId || 'Unknown'}`, {
        fontSize: '16px',
        color: '#cccccc',
        fontFamily: 'Arial',
        align: 'center',
      })
      .setOrigin(0.5);

    // Loss summary
    let yOffset = -panelHeight / 2 + 200;

    if (gameOverData.lostCharacters && gameOverData.lostCharacters.length > 0) {
      const lossCountText = this.scene.add
        .text(0, yOffset, `失われたキャラクター: ${gameOverData.lostCharacters.length}`, {
          fontSize: '18px',
          color: '#ffaa00',
          fontFamily: 'Arial',
          align: 'center',
        })
        .setOrigin(0.5);
      container.add(lossCountText);

      yOffset += 40;

      // List some lost characters (limit to avoid overflow)
      const displayLimit = Math.min(gameOverData.lostCharacters.length, 5);
      for (let i = 0; i < displayLimit; i++) {
        const lostChar = gameOverData.lostCharacters[i];
        const lossInfo = this.scene.add
          .text(0, yOffset, `${lostChar.name}: ${this.formatLossReason(lostChar.cause)}`, {
            fontSize: '14px',
            color: '#ff6666',
            fontFamily: 'Arial',
            align: 'center',
            wordWrap: { width: panelWidth - 80 },
          })
          .setOrigin(0.5);

        container.add(lossInfo);
        yOffset += 25;
      }

      // Show "and more" if there are more characters
      if (gameOverData.lostCharacters.length > displayLimit) {
        const moreText = this.scene.add
          .text(0, yOffset, `...他 ${gameOverData.lostCharacters.length - displayLimit} 名`, {
            fontSize: '14px',
            color: '#ff6666',
            fontFamily: 'Arial',
            align: 'center',
          })
          .setOrigin(0.5);
        container.add(moreText);
      }
    }

    // Restart/Return button
    const restartButton = this.scene.add
      .text(0, panelHeight / 2 - 60, 'タイトルに戻る', {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial',
        backgroundColor: '#666666',
        padding: { x: 30, y: 15 },
      })
      .setOrigin(0.5)
      .setInteractive();

    restartButton.on('pointerdown', () => {
      this.chapterSummaryContainer?.setVisible(false);
      this.emit('game-over-dismissed', gameOverData);
    });

    restartButton.on('pointerover', () => {
      restartButton.setBackgroundColor('#888888');
    });

    restartButton.on('pointerout', () => {
      restartButton.setBackgroundColor('#666666');
    });

    container.add([background, title, reason, chapterInfo, restartButton]);

    return container;
  }

  /**
   * Create error display
   * @param error - Error details
   * @returns Error display container
   */
  private createErrorDisplay(error: CharacterLossErrorDetails): Phaser.GameObjects.Container {
    const container = this.scene.add.container(this.scene.cameras.main.width / 2, 100);

    const panelWidth = 400;
    const panelHeight = 100;

    // Background
    const background = this.scene.add
      .graphics()
      .fillStyle(0x660000, 0.9)
      .fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 10)
      .lineStyle(2, 0xff0000, 1)
      .strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 10);

    // Error message
    const errorText = this.scene.add
      .text(0, 0, error.message, {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial',
        align: 'center',
        wordWrap: { width: panelWidth - 40 },
      })
      .setOrigin(0.5);

    container.add([background, errorText]);

    return container;
  }

  /**
   * Format loss reason for display
   * @param cause - Loss cause
   * @returns Formatted reason string
   */
  private formatLossReason(cause: LossCause): string {
    switch (cause.type) {
      case 'battle_defeat':
        return cause.sourceName ? `${cause.sourceName}の攻撃により撃破` : '戦闘により撃破';
      case 'critical_damage':
        return cause.sourceName
          ? `${cause.sourceName}のクリティカル攻撃により撃破`
          : 'クリティカル攻撃により撃破';
      case 'status_effect':
        return '状態異常により撃破';
      case 'environmental':
        return '環境ダメージにより撃破';
      case 'sacrifice':
        return '自己犠牲により撃破';
      default:
        return cause.description || '不明な原因により撃破';
    }
  }

  /**
   * Format loss count text for stage selection
   * @param lostCount - Number of lost characters
   * @param totalCount - Total number of characters
   * @returns Formatted text
   */
  private formatLossCountText(lostCount: number, totalCount: number): string {
    if (lostCount === 0) {
      return `全員生存 (${totalCount}/${totalCount})`;
    }

    const percentage = Math.round((lostCount / totalCount) * 100);
    return `ロスト: ${lostCount}/${totalCount} (${percentage}%)`;
  }

  /**
   * Calculate warning level based on loss percentage
   * @param lossPercentage - Loss percentage
   * @returns Warning level
   */
  private calculateWarningLevel(
    lossPercentage: number
  ): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (lossPercentage === 0) return 'none';
    if (lossPercentage <= 25) return 'low';
    if (lossPercentage <= 50) return 'medium';
    if (lossPercentage <= 75) return 'high';
    return 'critical';
  }

  /**
   * Get warning color based on level
   * @param warningLevel - Warning level
   * @returns Color value
   */
  private getWarningColor(warningLevel: string): number {
    switch (warningLevel) {
      case 'none':
        return 0x004400;
      case 'low':
        return 0x444400;
      case 'medium':
        return 0x664400;
      case 'high':
        return 0x660000;
      case 'critical':
        return 0x440000;
      default:
        return 0x444444;
    }
  }

  /**
   * Create error details object
   * @param error - Error type
   * @param message - Error message
   * @param context - Error context
   * @returns Error details object
   */
  private createError(
    error: CharacterLossError,
    message: string,
    context: Partial<LossContext>
  ): CharacterLossErrorDetails {
    return {
      error,
      message,
      context: {
        characterId: context.characterId || '',
        chapterId: context.chapterId,
        turn: context.turn || 1,
        phase: context.phase || 'unknown',
        additionalData: context.additionalData || {},
      },
      timestamp: Date.now(),
      recoverable: true,
      suggestedAction: 'Check UI state and retry operation',
    };
  }

  /**
   * Register character sprite for UI management
   * @param characterId - Character ID
   * @param sprite - Character sprite
   */
  public registerCharacterSprite(characterId: string, sprite: Phaser.GameObjects.Sprite): void {
    this.characterSprites.set(characterId, sprite);
    console.log(`[CharacterLossUI] Registered sprite for character ${characterId}`);
  }

  /**
   * Unregister character sprite
   * @param characterId - Character ID
   */
  public unregisterCharacterSprite(characterId: string): void {
    this.characterSprites.delete(characterId);
    console.log(`[CharacterLossUI] Unregistered sprite for character ${characterId}`);
  }

  /**
   * Handle scene shutdown
   */
  private onSceneShutdown(): void {
    this.hideAllTooltips();
    console.log('[CharacterLossUI] Scene shutdown - cleaned up tooltips');
  }

  /**
   * Handle scene destroy
   */
  private onSceneDestroy(): void {
    this.destroy();
  }

  /**
   * Handle scene resize
   * @param gameSize - New game size
   */
  private onSceneResize(gameSize: any): void {
    // Update container positions based on new screen size
    if (this.stageSelectionContainer) {
      this.stageSelectionContainer.setPosition(gameSize.width - 200, 50);
    }

    if (this.validationContainer) {
      this.validationContainer.setPosition(gameSize.width / 2, gameSize.height / 2);
    }

    if (this.chapterSummaryContainer) {
      this.chapterSummaryContainer.setPosition(gameSize.width / 2, gameSize.height / 2);
    }

    if (this.errorContainer) {
      this.errorContainer.setPosition(gameSize.width / 2, 100);
    }
  }

  /**
   * Destroy UI and clean up resources
   */
  public destroy(): void {
    try {
      // Hide all tooltips
      this.hideAllTooltips();

      // Destroy all containers
      this.partyCompositionContainer?.destroy();
      this.stageSelectionContainer?.destroy();
      this.tooltipContainer?.destroy();
      this.validationContainer?.destroy();
      this.errorContainer?.destroy();
      this.chapterSummaryContainer?.destroy();

      // Clear maps
      this.characterDisplayStates.clear();
      this.activeTooltips.clear();
      this.characterSprites.clear();

      // Remove event listeners
      this.scene.events.off('shutdown', this.onSceneShutdown);
      this.scene.events.off('destroy', this.onSceneDestroy);
      this.scene.scale.off('resize', this.onSceneResize);

      // Clear references
      this.partyCompositionContainer = undefined;
      this.stageSelectionContainer = undefined;
      this.tooltipContainer = undefined;
      this.validationContainer = undefined;
      this.errorContainer = undefined;
      this.chapterSummaryContainer = undefined;

      console.log('[CharacterLossUI] Destroyed and cleaned up resources');
    } catch (error) {
      console.error('[CharacterLossUI] Error during destruction:', error);
    }
  }
}
