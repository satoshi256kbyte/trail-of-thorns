/**
 * RecruitmentUI - UI management for the character recruitment system
 *
 * This class handles all visual aspects of the recruitment system:
 * - Displaying recruitment conditions to players
 * - Showing progress towards meeting conditions
 * - Visual indicators for NPC state characters
 * - Success and failure animations and notifications
 * - Integration with the main UI system
 */

import {
  RecruitmentCondition,
  RecruitmentProgress,
  RecruitmentUIConfig,
  RecruitmentError,
  RecruitmentUtils,
  NPCState,
} from '../../types/recruitment';
import { Unit, Position } from '../../types/gameplay';
import {
  RecruitmentErrorHandler,
  RecruitmentUserFeedbackInterface,
} from './RecruitmentErrorHandler';
import { RecruitmentUIPool } from './RecruitmentUIPool';

export interface RecruitmentUIElements {
  conditionPanel: Phaser.GameObjects.Container;
  conditionBackground: Phaser.GameObjects.Graphics;
  conditionTitle: Phaser.GameObjects.Text;
  conditionList: Phaser.GameObjects.Text[];
  progressBar: Phaser.GameObjects.Graphics;
  progressText: Phaser.GameObjects.Text;
  npcIndicators: Map<string, Phaser.GameObjects.Container>;
  successNotification: Phaser.GameObjects.Container;
  failureNotification: Phaser.GameObjects.Container;
}

export interface RecruitmentNotificationData {
  unit: Unit;
  message: string;
  type: 'success' | 'failure' | 'progress';
  duration?: number;
}

/**
 * UI manager for the recruitment system
 */
export class RecruitmentUI {
  private scene: Phaser.Scene;
  private config: RecruitmentUIConfig;
  private uiElements: Partial<RecruitmentUIElements>;
  private eventEmitter?: Phaser.Events.EventEmitter;
  private errorHandler?: RecruitmentErrorHandler;
  private uiPool: RecruitmentUIPool;

  // UI positioning and styling constants
  private readonly UI_DEPTH = 2000;
  private readonly NOTIFICATION_DEPTH = 2100;
  private readonly INDICATOR_DEPTH = 1500;

  // Panel dimensions
  private readonly CONDITION_PANEL_WIDTH = 350;
  private readonly CONDITION_PANEL_HEIGHT = 200;
  private readonly NOTIFICATION_WIDTH = 300;
  private readonly NOTIFICATION_HEIGHT = 100;

  // Colors
  private readonly COLORS = {
    PANEL_BACKGROUND: 0x1a1a2e,
    PANEL_BORDER: 0x16213e,
    CONDITION_MET: 0x00ff00,
    CONDITION_NOT_MET: 0xff6b6b,
    PROGRESS_BACKGROUND: 0x333333,
    PROGRESS_FILL: 0x4ecdc4,
    SUCCESS: 0x00ff00,
    FAILURE: 0xff4757,
    NPC_INDICATOR: 0xffd700,
    TEXT_PRIMARY: '#ffffff',
    TEXT_SECONDARY: '#cccccc',
    TEXT_SUCCESS: '#00ff00',
    TEXT_FAILURE: '#ff4757',
  };

  constructor(
    scene: Phaser.Scene,
    config?: Partial<RecruitmentUIConfig>,
    eventEmitter?: Phaser.Events.EventEmitter,
    errorHandler?: RecruitmentErrorHandler
  ) {
    this.scene = scene;
    this.config = { ...RecruitmentUtils.createDefaultUIConfig(), ...config };
    this.uiElements = {};
    this.eventEmitter = eventEmitter;
    this.errorHandler = errorHandler;
    this.uiPool = new RecruitmentUIPool(scene);

    this.initializeUI();
  }

  /**
   * Initialize UI elements
   */
  private initializeUI(): void {
    try {
      this.createConditionPanel();
      this.createNotificationContainers();
      this.uiElements.npcIndicators = new Map();

      // Initially hide all panels
      this.hideRecruitmentConditions();
      this.hideNotifications();

      console.log('RecruitmentUI: UI elements initialized');
    } catch (error) {
      console.error('RecruitmentUI: Error initializing UI:', error);
    }
  }

  /**
   * Create the recruitment conditions panel
   */
  private createConditionPanel(): void {
    const camera = this.scene.cameras.main;
    const x = 20;
    const y = camera.height - this.CONDITION_PANEL_HEIGHT - 20;

    // Create main container
    this.uiElements.conditionPanel = this.scene.add
      .container(x, y)
      .setScrollFactor(0)
      .setDepth(this.UI_DEPTH)
      .setVisible(false);

    // Create background
    this.uiElements.conditionBackground = this.scene.add
      .graphics()
      .fillStyle(this.COLORS.PANEL_BACKGROUND, 0.9)
      .fillRoundedRect(0, 0, this.CONDITION_PANEL_WIDTH, this.CONDITION_PANEL_HEIGHT, 10)
      .lineStyle(2, this.COLORS.PANEL_BORDER, 1)
      .strokeRoundedRect(0, 0, this.CONDITION_PANEL_WIDTH, this.CONDITION_PANEL_HEIGHT, 10);

    // Create title
    this.uiElements.conditionTitle = this.scene.add
      .text(this.CONDITION_PANEL_WIDTH / 2, 20, '仲間化条件', {
        fontSize: '18px',
        color: this.COLORS.TEXT_PRIMARY,
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);

    // Create progress bar background
    this.uiElements.progressBar = this.scene.add
      .graphics()
      .fillStyle(this.COLORS.PROGRESS_BACKGROUND, 1)
      .fillRoundedRect(20, 45, this.CONDITION_PANEL_WIDTH - 40, 20, 5);

    // Create progress text
    this.uiElements.progressText = this.scene.add
      .text(this.CONDITION_PANEL_WIDTH / 2, 55, '0%', {
        fontSize: '14px',
        color: this.COLORS.TEXT_PRIMARY,
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Initialize condition list array
    this.uiElements.conditionList = [];

    // Add elements to container
    this.uiElements.conditionPanel.add([
      this.uiElements.conditionBackground,
      this.uiElements.conditionTitle,
      this.uiElements.progressBar,
      this.uiElements.progressText,
    ]);
  }

  /**
   * Create notification containers
   */
  private createNotificationContainers(): void {
    const camera = this.scene.cameras.main;
    const centerX = camera.width / 2;
    const centerY = camera.height / 2;

    // Success notification
    this.uiElements.successNotification = this.scene.add
      .container(centerX, centerY - 50)
      .setScrollFactor(0)
      .setDepth(this.NOTIFICATION_DEPTH)
      .setVisible(false);

    // Failure notification
    this.uiElements.failureNotification = this.scene.add
      .container(centerX, centerY + 50)
      .setScrollFactor(0)
      .setDepth(this.NOTIFICATION_DEPTH)
      .setVisible(false);
  }

  /**
   * Show recruitment conditions for a unit
   * @param unit - Unit to show conditions for
   * @param conditions - Array of recruitment conditions
   */
  showRecruitmentConditions(unit: Unit, conditions: RecruitmentCondition[]): void {
    try {
      if (!this.config.showConditions || !this.uiElements.conditionPanel) {
        return;
      }

      // Update title with unit name
      if (this.uiElements.conditionTitle) {
        this.uiElements.conditionTitle.setText(`${unit.name} の仲間化条件`);
      }

      // Clear existing condition list
      this.clearConditionList();

      // Create condition text elements
      conditions.forEach((condition, index) => {
        const y = 80 + index * 25;
        const conditionText = this.scene.add.text(25, y, `• ${condition.description}`, {
          fontSize: '14px',
          color: this.COLORS.TEXT_SECONDARY,
          fontFamily: 'Arial',
          wordWrap: { width: this.CONDITION_PANEL_WIDTH - 50 },
        });

        this.uiElements.conditionList!.push(conditionText);
        this.uiElements.conditionPanel!.add(conditionText);
      });

      // Show the panel
      this.uiElements.conditionPanel.setVisible(true);

      // Auto-hide after configured duration
      if (this.config.conditionDisplayDuration > 0) {
        this.scene.time.delayedCall(this.config.conditionDisplayDuration, () => {
          this.hideRecruitmentConditions();
        });
      }

      // Emit event
      this.eventEmitter?.emit('recruitment-conditions-shown', {
        unitId: unit.id,
        conditionsCount: conditions.length,
      });
    } catch (error) {
      console.error('RecruitmentUI: Error showing recruitment conditions:', error);
    }
  }

  /**
   * Update recruitment progress display
   * @param unit - Unit to update progress for
   * @param progress - Current recruitment progress
   */
  updateRecruitmentProgress(unit: Unit, progress: RecruitmentProgress): void {
    try {
      if (!this.config.showProgress || !this.uiElements.conditionPanel) {
        return;
      }

      // Update progress bar
      if (this.uiElements.progressBar) {
        // Clear previous progress bar
        this.uiElements.progressBar.clear();

        // Draw background
        this.uiElements.progressBar
          .fillStyle(this.COLORS.PROGRESS_BACKGROUND, 1)
          .fillRoundedRect(20, 45, this.CONDITION_PANEL_WIDTH - 40, 20, 5);

        // Draw progress fill
        const progressWidth = ((this.CONDITION_PANEL_WIDTH - 40) * progress.overallProgress) / 100;
        if (progressWidth > 0) {
          this.uiElements.progressBar
            .fillStyle(this.COLORS.PROGRESS_FILL, 1)
            .fillRoundedRect(20, 45, progressWidth, 20, 5);
        }
      }

      // Update progress text
      if (this.uiElements.progressText) {
        this.uiElements.progressText.setText(`${progress.overallProgress}%`);
      }

      // Update condition colors based on progress
      this.uiElements.conditionList?.forEach((conditionText, index) => {
        if (index < progress.conditionProgress.length) {
          const isMet = progress.conditionProgress[index];
          const color = isMet ? this.COLORS.CONDITION_MET : this.COLORS.CONDITION_NOT_MET;
          conditionText.setColor(isMet ? this.COLORS.TEXT_SUCCESS : this.COLORS.TEXT_SECONDARY);
        }
      });

      // Show eligibility status
      if (progress.isEligible && this.uiElements.conditionTitle) {
        this.uiElements.conditionTitle.setColor(this.COLORS.TEXT_SUCCESS);
      }

      // Emit event
      this.eventEmitter?.emit('recruitment-progress-updated', {
        unitId: unit.id,
        progress: progress.overallProgress,
        isEligible: progress.isEligible,
      });
    } catch (error) {
      console.error('RecruitmentUI: Error updating recruitment progress:', error);
    }
  }

  /**
   * Show NPC indicator for a unit
   * @param unit - Unit to show indicator for
   */
  showNPCIndicator(unit: Unit): void {
    try {
      if (!unit.sprite) {
        console.warn('RecruitmentUI: Cannot show NPC indicator - unit has no sprite');
        return;
      }

      // Remove existing indicator
      this.hideNPCIndicator(unit);

      // Create indicator container
      const indicator = this.scene.add
        .container(unit.sprite.x, unit.sprite.y - 40)
        .setDepth(this.INDICATOR_DEPTH);

      // Create indicator background
      const background = this.scene.add
        .graphics()
        .fillStyle(0x000000, 0.8)
        .fillRoundedRect(-25, -15, 50, 30, 8)
        .lineStyle(2, this.COLORS.NPC_INDICATOR, 1)
        .strokeRoundedRect(-25, -15, 50, 30, 8);

      // Create crown icon (simple representation)
      const crown = this.scene.add
        .graphics()
        .fillStyle(this.COLORS.NPC_INDICATOR, 1)
        .fillTriangle(-10, 5, 0, -5, 10, 5)
        .fillCircle(-8, 0, 3)
        .fillCircle(0, -3, 3)
        .fillCircle(8, 0, 3);

      // Create "NPC" text
      const npcText = this.scene.add
        .text(0, 8, 'NPC', {
          fontSize: '10px',
          color: this.COLORS.TEXT_PRIMARY,
          fontFamily: 'Arial',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      // Add elements to indicator
      indicator.add([background, crown, npcText]);

      // Add pulsing animation
      this.scene.tweens.add({
        targets: indicator,
        scaleX: this.config.npcIndicatorScale * 1.1,
        scaleY: this.config.npcIndicatorScale * 1.1,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Store indicator reference
      this.uiElements.npcIndicators!.set(unit.id, indicator);

      // Emit event
      this.eventEmitter?.emit('npc-indicator-shown', {
        unitId: unit.id,
      });
    } catch (error) {
      console.error('RecruitmentUI: Error showing NPC indicator:', error);
    }
  }

  /**
   * Hide NPC indicator for a unit
   * @param unit - Unit to hide indicator for
   */
  hideNPCIndicator(unit: Unit): void {
    try {
      const indicator = this.uiElements.npcIndicators?.get(unit.id);
      if (indicator) {
        indicator.destroy();
        this.uiElements.npcIndicators!.delete(unit.id);

        // Emit event
        this.eventEmitter?.emit('npc-indicator-hidden', {
          unitId: unit.id,
        });
      }
    } catch (error) {
      console.error('RecruitmentUI: Error hiding NPC indicator:', error);
    }
  }

  /**
   * Show recruitment success notification
   * @param unit - Successfully recruited unit
   */
  showRecruitmentSuccess(unit: Unit): void {
    try {
      if (!this.uiElements.successNotification) {
        return;
      }

      // Clear previous content
      this.uiElements.successNotification.removeAll(true);

      // Create success background
      const background = this.scene.add
        .graphics()
        .fillStyle(this.COLORS.SUCCESS, 0.9)
        .fillRoundedRect(
          -this.NOTIFICATION_WIDTH / 2,
          -this.NOTIFICATION_HEIGHT / 2,
          this.NOTIFICATION_WIDTH,
          this.NOTIFICATION_HEIGHT,
          12
        )
        .lineStyle(3, 0xffffff, 1)
        .strokeRoundedRect(
          -this.NOTIFICATION_WIDTH / 2,
          -this.NOTIFICATION_HEIGHT / 2,
          this.NOTIFICATION_WIDTH,
          this.NOTIFICATION_HEIGHT,
          12
        );

      // Create success icon (checkmark)
      const checkmark = this.scene.add
        .graphics()
        .lineStyle(4, 0xffffff, 1)
        .strokePoints([
          { x: -15, y: 0 },
          { x: -5, y: 10 },
          { x: 15, y: -10 },
        ]);

      // Create success text
      const successTitle = this.scene.add
        .text(0, -15, '仲間化成功！', {
          fontSize: '18px',
          color: this.COLORS.TEXT_PRIMARY,
          fontFamily: 'Arial',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      const successMessage = this.scene.add
        .text(0, 15, `${unit.name} が仲間になりました`, {
          fontSize: '14px',
          color: this.COLORS.TEXT_PRIMARY,
          fontFamily: 'Arial',
        })
        .setOrigin(0.5);

      // Add elements to notification
      this.uiElements.successNotification.add([
        background,
        checkmark,
        successTitle,
        successMessage,
      ]);

      // Show notification with animation
      this.uiElements.successNotification.setVisible(true).setScale(0).setAlpha(0);

      // Entrance animation
      this.scene.tweens.add({
        targets: this.uiElements.successNotification,
        scale: 1,
        alpha: 1,
        duration: 300,
        ease: 'Back.easeOut',
        onComplete: () => {
          // Auto-hide after duration
          this.scene.time.delayedCall(this.config.successAnimationDuration, () => {
            this.hideSuccessNotification();
          });
        },
      });

      // Play sound effect if enabled
      if (this.config.enableSoundEffects) {
        // In a real implementation, play success sound
        console.log('Playing recruitment success sound');
      }

      // Emit event
      this.eventEmitter?.emit('recruitment-success-shown', {
        unitId: unit.id,
      });
    } catch (error) {
      console.error('RecruitmentUI: Error showing recruitment success:', error);
    }
  }

  /**
   * Show recruitment failure notification
   * @param unit - Unit that failed recruitment
   * @param reason - Reason for failure
   */
  showRecruitmentFailure(unit: Unit, reason: string): void {
    try {
      if (!this.uiElements.failureNotification) {
        return;
      }

      // Clear previous content
      this.uiElements.failureNotification.removeAll(true);

      // Create failure background
      const background = this.scene.add
        .graphics()
        .fillStyle(this.COLORS.FAILURE, 0.9)
        .fillRoundedRect(
          -this.NOTIFICATION_WIDTH / 2,
          -this.NOTIFICATION_HEIGHT / 2,
          this.NOTIFICATION_WIDTH,
          this.NOTIFICATION_HEIGHT,
          12
        )
        .lineStyle(3, 0xffffff, 1)
        .strokeRoundedRect(
          -this.NOTIFICATION_WIDTH / 2,
          -this.NOTIFICATION_HEIGHT / 2,
          this.NOTIFICATION_WIDTH,
          this.NOTIFICATION_HEIGHT,
          12
        );

      // Create failure icon (X mark)
      const xMark = this.scene.add
        .graphics()
        .lineStyle(4, 0xffffff, 1)
        .strokePoints([
          { x: -10, y: -10 },
          { x: 10, y: 10 },
        ])
        .strokePoints([
          { x: 10, y: -10 },
          { x: -10, y: 10 },
        ]);

      // Create failure text
      const failureTitle = this.scene.add
        .text(0, -15, '仲間化失敗', {
          fontSize: '18px',
          color: this.COLORS.TEXT_PRIMARY,
          fontFamily: 'Arial',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      const failureMessage = this.scene.add
        .text(0, 15, reason, {
          fontSize: '14px',
          color: this.COLORS.TEXT_PRIMARY,
          fontFamily: 'Arial',
          wordWrap: { width: this.NOTIFICATION_WIDTH - 40 },
          align: 'center',
        })
        .setOrigin(0.5);

      // Add elements to notification
      this.uiElements.failureNotification.add([background, xMark, failureTitle, failureMessage]);

      // Show notification with animation
      this.uiElements.failureNotification.setVisible(true).setScale(0).setAlpha(0);

      // Entrance animation (shake effect for failure)
      this.scene.tweens.add({
        targets: this.uiElements.failureNotification,
        scale: 1,
        alpha: 1,
        duration: 300,
        ease: 'Back.easeOut',
        onComplete: () => {
          // Shake animation
          this.scene.tweens.add({
            targets: this.uiElements.failureNotification,
            x: this.uiElements.failureNotification!.x + 5,
            duration: 50,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
              // Auto-hide after duration
              this.scene.time.delayedCall(this.config.failureAnimationDuration, () => {
                this.hideFailureNotification();
              });
            },
          });
        },
      });

      // Play sound effect if enabled
      if (this.config.enableSoundEffects) {
        // In a real implementation, play failure sound
        console.log('Playing recruitment failure sound');
      }

      // Emit event
      this.eventEmitter?.emit('recruitment-failure-shown', {
        unitId: unit.id,
        reason: reason,
      });
    } catch (error) {
      console.error('RecruitmentUI: Error showing recruitment failure:', error);
    }
  }

  /**
   * Hide recruitment conditions panel
   */
  hideRecruitmentConditions(): void {
    try {
      if (this.uiElements.conditionPanel) {
        this.uiElements.conditionPanel.setVisible(false);
        this.clearConditionList();
      }
    } catch (error) {
      console.error('RecruitmentUI: Error hiding recruitment conditions:', error);
    }
  }

  /**
   * Hide success notification
   */
  private hideSuccessNotification(): void {
    try {
      if (this.uiElements.successNotification) {
        this.scene.tweens.add({
          targets: this.uiElements.successNotification,
          scale: 0,
          alpha: 0,
          duration: 200,
          ease: 'Power2.easeIn',
          onComplete: () => {
            this.uiElements.successNotification!.setVisible(false);
          },
        });
      }
    } catch (error) {
      console.error('RecruitmentUI: Error hiding success notification:', error);
    }
  }

  /**
   * Hide failure notification
   */
  private hideFailureNotification(): void {
    try {
      if (this.uiElements.failureNotification) {
        this.scene.tweens.add({
          targets: this.uiElements.failureNotification,
          scale: 0,
          alpha: 0,
          duration: 200,
          ease: 'Power2.easeIn',
          onComplete: () => {
            this.uiElements.failureNotification!.setVisible(false);
          },
        });
      }
    } catch (error) {
      console.error('RecruitmentUI: Error hiding failure notification:', error);
    }
  }

  /**
   * Hide all notifications
   */
  private hideNotifications(): void {
    this.hideSuccessNotification();
    this.hideFailureNotification();
  }

  /**
   * Clear condition list text elements
   */
  private clearConditionList(): void {
    try {
      if (this.uiElements.conditionList) {
        this.uiElements.conditionList.forEach(text => {
          text.destroy();
        });
        this.uiElements.conditionList = [];
      }
    } catch (error) {
      console.error('RecruitmentUI: Error clearing condition list:', error);
    }
  }

  /**
   * Update NPC indicator position when unit moves
   * @param unit - Unit that moved
   * @param newPosition - New world position
   */
  updateNPCIndicatorPosition(unit: Unit, newPosition: Position): void {
    try {
      const indicator = this.uiElements.npcIndicators?.get(unit.id);
      if (indicator && unit.sprite) {
        indicator.setPosition(unit.sprite.x, unit.sprite.y - 40);
      }
    } catch (error) {
      console.error('RecruitmentUI: Error updating NPC indicator position:', error);
    }
  }

  /**
   * Show recruitment hint for a unit
   * @param unit - Unit to show hint for
   * @param hint - Hint message
   */
  showRecruitmentHint(unit: Unit, hint: string): void {
    try {
      if (!unit.sprite) {
        return;
      }

      // Create temporary hint text
      const hintText = this.scene.add
        .text(unit.sprite.x, unit.sprite.y - 60, hint, {
          fontSize: '12px',
          color: this.COLORS.TEXT_PRIMARY,
          fontFamily: 'Arial',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: { x: 8, y: 4 },
        })
        .setOrigin(0.5);

      // Set depth if method exists
      if (typeof hintText.setDepth === 'function') {
        hintText.setDepth(this.NOTIFICATION_DEPTH);
      }

      // Animate hint
      this.scene.tweens.add({
        targets: hintText,
        y: hintText.y - 20,
        alpha: 0,
        duration: 2000,
        ease: 'Power2.easeOut',
        onComplete: () => {
          hintText.destroy();
        },
      });
    } catch (error) {
      console.error('RecruitmentUI: Error showing recruitment hint:', error);
    }
  }

  /**
   * Update UI configuration
   * @param newConfig - New configuration options
   */
  updateConfig(newConfig: Partial<RecruitmentUIConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   * @returns Current UI configuration
   */
  getConfig(): RecruitmentUIConfig {
    return { ...this.config };
  }

  /**
   * Check if recruitment conditions are currently visible
   * @returns True if conditions panel is visible
   */
  isConditionPanelVisible(): boolean {
    return this.uiElements.conditionPanel?.visible || false;
  }

  /**
   * Get count of active NPC indicators
   * @returns Number of active NPC indicators
   */
  getNPCIndicatorCount(): number {
    return this.uiElements.npcIndicators?.size || 0;
  }

  /**
   * Resize UI elements when screen size changes
   * @param width - New screen width
   * @param height - New screen height
   */
  resize(width: number, height: number): void {
    try {
      // Update condition panel position
      if (this.uiElements.conditionPanel) {
        this.uiElements.conditionPanel.setPosition(20, height - this.CONDITION_PANEL_HEIGHT - 20);
      }

      // Update notification positions
      if (this.uiElements.successNotification) {
        this.uiElements.successNotification.setPosition(width / 2, height / 2 - 50);
      }

      if (this.uiElements.failureNotification) {
        this.uiElements.failureNotification.setPosition(width / 2, height / 2 + 50);
      }
    } catch (error) {
      console.error('RecruitmentUI: Error resizing UI elements:', error);
    }
  }

  /**
   * Get UI pool statistics for performance monitoring
   */
  getUIPoolStatistics() {
    return this.uiPool.getStatistics();
  }

  /**
   * Optimize UI pool performance
   */
  optimizeUIPool(): void {
    this.uiPool.optimizePools();
  }

  /**
   * Destroy UI system and cleanup resources
   */
  destroy(): void {
    try {
      // Hide all UI elements
      this.hideRecruitmentConditions();
      this.hideNotifications();

      // Clear condition list
      this.clearConditionList();

      // Destroy main UI elements
      if (this.uiElements.conditionPanel) {
        this.uiElements.conditionPanel.destroy();
      }

      if (this.uiElements.successNotification) {
        this.uiElements.successNotification.destroy();
      }

      if (this.uiElements.failureNotification) {
        this.uiElements.failureNotification.destroy();
      }

      // Destroy all NPC indicators
      if (this.uiElements.npcIndicators) {
        for (const indicator of this.uiElements.npcIndicators.values()) {
          indicator.destroy();
        }
        this.uiElements.npcIndicators.clear();
      }

      // Destroy UI pool
      if (this.uiPool) {
        this.uiPool.destroy();
      }

      // Clear references
      this.uiElements = {};

      console.log('RecruitmentUI: Destroyed and cleaned up');
    } catch (error) {
      console.error('RecruitmentUI: Error during destruction:', error);
    }
  }

  /**
   * Show recruitment error message
   * @param message - Error message to display
   * @param type - Type of error message
   * @param duration - Duration to show message
   */
  showRecruitmentErrorMessage(
    message: string,
    type: 'error' | 'warning' | 'info',
    duration?: number
  ): void {
    try {
      const colors = {
        error: this.COLORS.FAILURE,
        warning: 0xffaa00,
        info: 0x0088ff,
      };

      const textColors = {
        error: this.COLORS.TEXT_FAILURE,
        warning: '#ffaa00',
        info: '#0088ff',
      };

      // Create error notification container
      const errorContainer = this.scene.add.container(0, 0);
      errorContainer.setDepth(this.NOTIFICATION_DEPTH + 10);

      // Create background
      const background = this.scene.add.graphics();
      background.fillStyle(colors[type], 0.9);
      background.fillRoundedRect(-150, -30, 300, 60, 10);
      background.lineStyle(2, colors[type], 1);
      background.strokeRoundedRect(-150, -30, 300, 60, 10);

      // Create error text
      const errorText = this.scene.add.text(0, 0, message, {
        fontSize: '14px',
        color: textColors[type],
        align: 'center',
        wordWrap: { width: 280 },
      });
      errorText.setOrigin(0.5);

      errorContainer.add([background, errorText]);

      // Position at top of screen
      const camera = this.scene.cameras.main;
      errorContainer.setPosition(camera.centerX, camera.y + 80);

      // Animate in
      errorContainer.setAlpha(0);
      errorContainer.setScale(0.8);

      this.scene.tweens.add({
        targets: errorContainer,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        ease: 'Back.easeOut',
      });

      // Auto-hide after duration
      const displayDuration = duration || this.config.messageDuration;
      this.scene.time.delayedCall(displayDuration, () => {
        this.scene.tweens.add({
          targets: errorContainer,
          alpha: 0,
          scaleX: 0.8,
          scaleY: 0.8,
          duration: 200,
          ease: 'Power2.easeIn',
          onComplete: () => {
            errorContainer.destroy();
          },
        });
      });
    } catch (error) {
      console.error('RecruitmentUI: Error showing error message:', error);
    }
  }

  /**
   * Show recruitment guidance tooltip
   * @param message - Guidance message
   * @param conditions - Optional condition details
   * @param position - Optional position for tooltip
   */
  showRecruitmentGuidance(message: string, conditions?: string[], position?: Position): void {
    try {
      // Create guidance container
      const guidanceContainer = this.scene.add.container(0, 0);
      guidanceContainer.setDepth(this.NOTIFICATION_DEPTH + 5);

      // Create background
      const background = this.scene.add.graphics();
      background.fillStyle(0x2c3e50, 0.95);
      background.fillRoundedRect(-200, -100, 400, 200, 15);
      background.lineStyle(2, 0x3498db, 1);
      background.strokeRoundedRect(-200, -100, 400, 200, 15);

      // Create title
      const title = this.scene.add.text(0, -70, 'Recruitment Guidance', {
        fontSize: '16px',
        color: '#3498db',
        fontStyle: 'bold',
        align: 'center',
      });
      title.setOrigin(0.5);

      // Create message text
      const messageText = this.scene.add.text(0, -30, message, {
        fontSize: '14px',
        color: this.COLORS.TEXT_PRIMARY,
        align: 'center',
        wordWrap: { width: 360 },
      });
      messageText.setOrigin(0.5);

      guidanceContainer.add([background, title, messageText]);

      // Add conditions if provided
      if (conditions && conditions.length > 0) {
        const conditionsTitle = this.scene.add.text(0, 10, 'Conditions:', {
          fontSize: '14px',
          color: '#e74c3c',
          fontStyle: 'bold',
          align: 'center',
        });
        conditionsTitle.setOrigin(0.5);

        const conditionsText = this.scene.add.text(0, 35, conditions.join('\n'), {
          fontSize: '12px',
          color: this.COLORS.TEXT_SECONDARY,
          align: 'center',
          wordWrap: { width: 360 },
        });
        conditionsText.setOrigin(0.5);

        guidanceContainer.add([conditionsTitle, conditionsText]);
      }

      // Position guidance
      const camera = this.scene.cameras.main;
      if (position) {
        guidanceContainer.setPosition(position.x, position.y);
      } else {
        guidanceContainer.setPosition(camera.centerX, camera.centerY);
      }

      // Animate in
      guidanceContainer.setAlpha(0);
      guidanceContainer.setScale(0.8);

      this.scene.tweens.add({
        targets: guidanceContainer,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 400,
        ease: 'Back.easeOut',
      });

      // Auto-hide after delay
      this.scene.time.delayedCall(5000, () => {
        this.scene.tweens.add({
          targets: guidanceContainer,
          alpha: 0,
          scaleX: 0.8,
          scaleY: 0.8,
          duration: 300,
          ease: 'Power2.easeIn',
          onComplete: () => {
            guidanceContainer.destroy();
          },
        });
      });
    } catch (error) {
      console.error('RecruitmentUI: Error showing guidance:', error);
    }
  }

  /**
   * Highlight unit with error indication
   * @param unit - Unit to highlight
   * @param errorType - Type of recruitment error
   */
  highlightRecruitmentError(unit: Unit, errorType: RecruitmentError): void {
    try {
      const worldPos = this.convertToWorldPosition(unit.position);

      // Create error highlight
      const errorHighlight = this.scene.add.graphics();
      errorHighlight.setDepth(this.INDICATOR_DEPTH + 10);

      // Different highlight styles for different error types
      let color = 0xff0000;
      let style = 'solid';

      switch (errorType) {
        case RecruitmentError.INVALID_TARGET:
          color = 0xff4757;
          style = 'dashed';
          break;
        case RecruitmentError.CONDITIONS_NOT_MET:
          color = 0xffa502;
          style = 'dotted';
          break;
        case RecruitmentError.NPC_ALREADY_DEFEATED:
          color = 0x2f3542;
          style = 'solid';
          break;
        default:
          color = 0xff0000;
          style = 'solid';
      }

      // Draw highlight based on style
      if (style === 'dashed') {
        this.drawDashedCircle(errorHighlight, worldPos.x, worldPos.y, 25, color, 3);
      } else if (style === 'dotted') {
        this.drawDottedCircle(errorHighlight, worldPos.x, worldPos.y, 25, color, 3);
      } else {
        errorHighlight.lineStyle(3, color, 1);
        errorHighlight.strokeCircle(worldPos.x, worldPos.y, 25);
      }

      // Animate highlight
      this.scene.tweens.add({
        targets: errorHighlight,
        alpha: { from: 1, to: 0.3 },
        scaleX: { from: 1, to: 1.2 },
        scaleY: { from: 1, to: 1.2 },
        duration: 1000,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          errorHighlight.destroy();
        },
      });
    } catch (error) {
      console.error('RecruitmentUI: Error highlighting recruitment error:', error);
    }
  }

  /**
   * Show recruitment progress with error indication
   * @param unit - Unit to show progress for
   * @param progress - Progress percentage
   * @param errorMessage - Error message to display
   */
  showRecruitmentProgressError(unit: Unit, progress: number, errorMessage: string): void {
    try {
      const worldPos = this.convertToWorldPosition(unit.position);

      // Create progress error container
      const progressContainer = this.scene.add.container(worldPos.x, worldPos.y - 40);
      progressContainer.setDepth(this.NOTIFICATION_DEPTH);

      // Create background
      const background = this.scene.add.graphics();
      background.fillStyle(0x000000, 0.8);
      background.fillRoundedRect(-80, -25, 160, 50, 8);
      background.lineStyle(2, 0xff4757, 1);
      background.strokeRoundedRect(-80, -25, 160, 50, 8);

      // Create progress bar background
      const progressBg = this.scene.add.graphics();
      progressBg.fillStyle(0x333333, 1);
      progressBg.fillRoundedRect(-70, -15, 140, 8, 4);

      // Create progress bar fill
      const progressFill = this.scene.add.graphics();
      progressFill.fillStyle(0xff4757, 1);
      progressFill.fillRoundedRect(-70, -15, 140 * (progress / 100), 8, 4);

      // Create error text
      const errorText = this.scene.add.text(0, 5, errorMessage, {
        fontSize: '10px',
        color: '#ff4757',
        align: 'center',
        wordWrap: { width: 150 },
      });
      errorText.setOrigin(0.5);

      progressContainer.add([background, progressBg, progressFill, errorText]);

      // Animate in
      progressContainer.setAlpha(0);
      progressContainer.setScale(0.8);

      this.scene.tweens.add({
        targets: progressContainer,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        ease: 'Back.easeOut',
      });

      // Auto-hide after delay
      this.scene.time.delayedCall(3000, () => {
        this.scene.tweens.add({
          targets: progressContainer,
          alpha: 0,
          y: progressContainer.y - 20,
          duration: 500,
          ease: 'Power2.easeIn',
          onComplete: () => {
            progressContainer.destroy();
          },
        });
      });
    } catch (error) {
      console.error('RecruitmentUI: Error showing progress error:', error);
    }
  }

  /**
   * Clear all recruitment error messages
   */
  clearRecruitmentMessages(): void {
    try {
      // This would clear all active error messages
      // Implementation depends on how messages are tracked
      console.log('RecruitmentUI: Clearing all recruitment messages');
    } catch (error) {
      console.error('RecruitmentUI: Error clearing messages:', error);
    }
  }

  /**
   * Draw dashed circle for error highlighting
   * @param graphics - Graphics object to draw on
   * @param x - Center X position
   * @param y - Center Y position
   * @param radius - Circle radius
   * @param color - Line color
   * @param lineWidth - Line width
   */
  private drawDashedCircle(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    color: number,
    lineWidth: number
  ): void {
    graphics.lineStyle(lineWidth, color, 1);

    const segments = 16;
    const angleStep = (Math.PI * 2) / segments;

    for (let i = 0; i < segments; i += 2) {
      const startAngle = i * angleStep;
      const endAngle = (i + 1) * angleStep;

      const startX = x + Math.cos(startAngle) * radius;
      const startY = y + Math.sin(startAngle) * radius;
      const endX = x + Math.cos(endAngle) * radius;
      const endY = y + Math.sin(endAngle) * radius;

      graphics.lineBetween(startX, startY, endX, endY);
    }
  }

  /**
   * Draw dotted circle for error highlighting
   * @param graphics - Graphics object to draw on
   * @param x - Center X position
   * @param y - Center Y position
   * @param radius - Circle radius
   * @param color - Line color
   * @param lineWidth - Line width
   */
  private drawDottedCircle(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    color: number,
    lineWidth: number
  ): void {
    graphics.fillStyle(color, 1);

    const dots = 24;
    const angleStep = (Math.PI * 2) / dots;

    for (let i = 0; i < dots; i++) {
      const angle = i * angleStep;
      const dotX = x + Math.cos(angle) * radius;
      const dotY = y + Math.sin(angle) * radius;

      graphics.fillCircle(dotX, dotY, lineWidth);
    }
  }

  /**
   * Cleanup and destroy all UI elements
   */
  destroy(): void {
    try {
      // Destroy all NPC indicators
      if (this.uiElements.npcIndicators) {
        for (const indicator of this.uiElements.npcIndicators.values()) {
          indicator.destroy();
        }
        this.uiElements.npcIndicators.clear();
      }

      // Clear condition list
      this.clearConditionList();

      // Destroy main UI elements
      Object.values(this.uiElements).forEach(element => {
        if (element && typeof element.destroy === 'function') {
          element.destroy();
        }
      });

      // Clear references
      this.uiElements = {};

      // Emit cleanup event
      this.eventEmitter?.emit('recruitment-ui-destroyed');

      console.log('RecruitmentUI: UI elements destroyed');
    } catch (error) {
      console.error('RecruitmentUI: Error destroying UI elements:', error);
    }
  }
}
