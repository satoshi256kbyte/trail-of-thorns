import * as Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { NavigableMenuButton } from './NavigableMenuButton';

/**
 * ConfirmationDialog class
 * 確認ダイアログを表示するコンポーネント
 * Displays confirmation dialogs for user actions
 */
export class ConfirmationDialog {
  private scene: Phaser.Scene;
  private container?: Phaser.GameObjects.Container;
  private overlay?: Phaser.GameObjects.Rectangle;
  private panel?: Phaser.GameObjects.Graphics;
  private messageText?: Phaser.GameObjects.Text;
  private confirmButton?: NavigableMenuButton;
  private cancelButton?: NavigableMenuButton;
  private onConfirm?: () => void;
  private onCancel?: () => void;
  private escKey?: Phaser.Input.Keyboard.Key;

  /**
   * Constructor
   * @param scene - Phaser scene instance
   */
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show confirmation dialog
   * @param message - Message to display
   * @param onConfirm - Callback when confirmed
   * @param onCancel - Callback when cancelled
   * @param confirmText - Text for confirm button (default: "はい")
   * @param cancelText - Text for cancel button (default: "いいえ")
   */
  public show(
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText: string = 'はい',
    cancelText: string = 'いいえ'
  ): void {
    // Store callbacks
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;

    // Create container
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(3000);

    // Create modal overlay (semi-transparent background)
    this.createOverlay();

    // Create dialog panel
    this.createPanel();

    // Create message text
    this.createMessageText(message);

    // Create buttons
    this.createButtons(confirmText, cancelText);

    // Setup keyboard input (Esc key to close)
    this.setupKeyboardInput();

    // Add fade-in animation
    this.playFadeInAnimation();
  }

  /**
   * Hide and destroy the dialog
   */
  public hide(): void {
    // Play fade-out animation
    this.playFadeOutAnimation(() => {
      this.destroy();
    });
  }

  /**
   * Destroy the dialog and clean up resources
   */
  public destroy(): void {
    // Remove keyboard input
    if (this.escKey) {
      this.escKey.off('down');
      this.escKey = undefined;
    }

    // Destroy buttons
    if (this.confirmButton) {
      this.confirmButton.destroy();
      this.confirmButton = undefined;
    }

    if (this.cancelButton) {
      this.cancelButton.destroy();
      this.cancelButton = undefined;
    }

    // Destroy text
    if (this.messageText) {
      this.messageText.destroy();
      this.messageText = undefined;
    }

    // Destroy panel
    if (this.panel) {
      this.panel.destroy();
      this.panel = undefined;
    }

    // Destroy overlay
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = undefined;
    }

    // Destroy container
    if (this.container) {
      this.container.destroy();
      this.container = undefined;
    }

    // Clear callbacks
    this.onConfirm = undefined;
    this.onCancel = undefined;
  }

  /**
   * Private helper: Create modal overlay
   */
  private createOverlay(): void {
    this.overlay = this.scene.add.rectangle(
      0,
      0,
      GameConfig.GAME_WIDTH,
      GameConfig.GAME_HEIGHT,
      0x000000,
      0.7
    );
    this.overlay.setOrigin(0, 0);
    this.overlay.setInteractive();

    if (this.container) {
      this.container.add(this.overlay);
    }
  }

  /**
   * Private helper: Create dialog panel
   */
  private createPanel(): void {
    const panelWidth = 600;
    const panelHeight = 300;
    const panelX = (GameConfig.GAME_WIDTH - panelWidth) / 2;
    const panelY = (GameConfig.GAME_HEIGHT - panelHeight) / 2;

    this.panel = this.scene.add.graphics();

    // Draw panel background
    this.panel.fillStyle(0x2c3e50, 1);
    this.panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);

    // Draw panel border
    this.panel.lineStyle(3, 0x3498db, 1);
    this.panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);

    if (this.container) {
      this.container.add(this.panel);
    }
  }

  /**
   * Private helper: Create message text
   * @param message - Message to display
   */
  private createMessageText(message: string): void {
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      align: 'center',
      wordWrap: { width: 500 },
    };

    this.messageText = this.scene.add.text(
      GameConfig.GAME_WIDTH / 2,
      GameConfig.GAME_HEIGHT / 2 - 40,
      message,
      textStyle
    );
    this.messageText.setOrigin(0.5, 0.5);

    if (this.container) {
      this.container.add(this.messageText);
    }
  }

  /**
   * Private helper: Create buttons
   * @param confirmText - Text for confirm button
   * @param cancelText - Text for cancel button
   */
  private createButtons(confirmText: string, cancelText: string): void {
    const buttonY = GameConfig.GAME_HEIGHT / 2 + 80;
    const buttonSpacing = 220;

    // Create confirm button
    this.confirmButton = new NavigableMenuButton(
      this.scene,
      GameConfig.GAME_WIDTH / 2 - buttonSpacing / 2,
      buttonY,
      confirmText,
      () => this.handleConfirm(),
      180,
      50,
      'confirmation-confirm-button'
    );

    // Create cancel button
    this.cancelButton = new NavigableMenuButton(
      this.scene,
      GameConfig.GAME_WIDTH / 2 + buttonSpacing / 2,
      buttonY,
      cancelText,
      () => this.handleCancel(),
      180,
      50,
      'confirmation-cancel-button'
    );

    if (this.container) {
      this.container.add(this.confirmButton.getContainer());
      this.container.add(this.cancelButton.getContainer());
    }
  }

  /**
   * Private helper: Setup keyboard input
   */
  private setupKeyboardInput(): void {
    // Add Esc key listener to close dialog
    if (this.scene.input.keyboard) {
      this.escKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      this.escKey.on('down', () => {
        this.handleCancel();
      });
    }
  }

  /**
   * Private helper: Handle confirm button click
   */
  private handleConfirm(): void {
    if (this.onConfirm) {
      this.onConfirm();
    }
    this.hide();
  }

  /**
   * Private helper: Handle cancel button click
   */
  private handleCancel(): void {
    if (this.onCancel) {
      this.onCancel();
    }
    this.hide();
  }

  /**
   * Private helper: Play fade-in animation
   */
  private playFadeInAnimation(): void {
    if (!this.container) return;

    // Set initial alpha to 0
    this.container.setAlpha(0);

    // Tween to alpha 1
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
    });

    // Scale animation for panel
    if (this.panel) {
      const panelX = (GameConfig.GAME_WIDTH - 600) / 2 + 300;
      const panelY = (GameConfig.GAME_HEIGHT - 300) / 2 + 150;

      this.panel.setScale(0.8);
      this.scene.tweens.add({
        targets: this.panel,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: 'Back.easeOut',
      });
    }
  }

  /**
   * Private helper: Play fade-out animation
   * @param onComplete - Callback when animation completes
   */
  private playFadeOutAnimation(onComplete: () => void): void {
    if (!this.container) {
      onComplete();
      return;
    }

    // Tween to alpha 0
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        onComplete();
      },
    });
  }
}
