import * as Phaser from 'phaser';

/**
 * LoadingSpinner class
 * ローディング中の視覚的フィードバックを提供するコンポーネント
 * Provides visual feedback during loading operations
 */
export class LoadingSpinner extends Phaser.GameObjects.Container {
  private spinnerGraphics?: Phaser.GameObjects.Graphics;
  private loadingText?: Phaser.GameObjects.Text;
  private backgroundOverlay?: Phaser.GameObjects.Rectangle;
  private rotationTween?: Phaser.Tweens.Tween;

  // Configuration
  private static readonly SPINNER_RADIUS = 30;
  private static readonly SPINNER_LINE_WIDTH = 4;
  private static readonly SPINNER_COLOR = 0x3498db;
  private static readonly BACKGROUND_COLOR = 0x000000;
  private static readonly BACKGROUND_ALPHA = 0.7;
  private static readonly ROTATION_DURATION = 1000; // 1 second per rotation

  /**
   * Constructor
   * @param scene - Phaser scene
   * @param x - X position
   * @param y - Y position
   */
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Add to scene
    scene.add.existing(this);

    // Create UI elements
    this.createBackgroundOverlay();
    this.createSpinner();
    this.createLoadingText();

    // Set depth to ensure visibility
    this.setDepth(4000);

    // Initially hidden
    this.setVisible(false);
    this.setAlpha(0);

    console.log('LoadingSpinner created');
  }

  /**
   * Private helper method: Create background overlay
   * Creates a semi-transparent background to dim the screen
   */
  private createBackgroundOverlay(): void {
    // Get game dimensions from scene
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;

    this.backgroundOverlay = this.scene.add.rectangle(
      0,
      0,
      gameWidth,
      gameHeight,
      LoadingSpinner.BACKGROUND_COLOR,
      LoadingSpinner.BACKGROUND_ALPHA
    );

    this.backgroundOverlay.setOrigin(0.5, 0.5);
    this.add(this.backgroundOverlay);
  }

  /**
   * Private helper method: Create spinner graphics
   * Creates a rotating spinner animation
   */
  private createSpinner(): void {
    this.spinnerGraphics = this.scene.add.graphics();

    // Draw spinner arc
    this.spinnerGraphics.lineStyle(
      LoadingSpinner.SPINNER_LINE_WIDTH,
      LoadingSpinner.SPINNER_COLOR,
      1
    );

    // Draw 3/4 circle (270 degrees)
    this.spinnerGraphics.beginPath();
    this.spinnerGraphics.arc(
      0,
      0,
      LoadingSpinner.SPINNER_RADIUS,
      Phaser.Math.DegToRad(0),
      Phaser.Math.DegToRad(270),
      false
    );
    this.spinnerGraphics.strokePath();

    this.add(this.spinnerGraphics);
  }

  /**
   * Private helper method: Create loading text
   * Creates "処理中..." text below the spinner
   */
  private createLoadingText(): void {
    this.loadingText = this.scene.add.text(0, LoadingSpinner.SPINNER_RADIUS + 30, '処理中...', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial',
      align: 'center',
    });

    this.loadingText.setOrigin(0.5, 0.5);
    this.add(this.loadingText);
  }

  /**
   * Public method: Show the loading spinner
   * Displays the spinner with fade-in animation and starts rotation
   */
  public show(): void {
    if (this.visible) {
      return; // Already visible
    }

    console.log('LoadingSpinner: showing');

    // Make visible
    this.setVisible(true);

    // Fade in animation
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
    });

    // Start rotation animation
    this.startRotation();
  }

  /**
   * Public method: Hide the loading spinner
   * Hides the spinner with fade-out animation and stops rotation
   */
  public hide(): void {
    if (!this.visible) {
      return; // Already hidden
    }

    console.log('LoadingSpinner: hiding');

    // Stop rotation animation
    this.stopRotation();

    // Fade out animation
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.setVisible(false);
      },
    });
  }

  /**
   * Private helper method: Start rotation animation
   * Starts the infinite rotation animation of the spinner
   */
  private startRotation(): void {
    if (this.rotationTween) {
      this.rotationTween.stop();
    }

    if (!this.spinnerGraphics) {
      return;
    }

    // Create infinite rotation tween
    this.rotationTween = this.scene.tweens.add({
      targets: this.spinnerGraphics,
      angle: 360,
      duration: LoadingSpinner.ROTATION_DURATION,
      ease: 'Linear',
      repeat: -1, // Infinite loop
    });
  }

  /**
   * Private helper method: Stop rotation animation
   * Stops the rotation animation of the spinner
   */
  private stopRotation(): void {
    if (this.rotationTween) {
      this.rotationTween.stop();
      this.rotationTween = undefined;
    }
  }

  /**
   * Override destroy method to clean up resources
   */
  public destroy(fromScene?: boolean): void {
    // Stop rotation animation
    this.stopRotation();

    // Clean up graphics
    if (this.spinnerGraphics) {
      this.spinnerGraphics.destroy();
      this.spinnerGraphics = undefined;
    }

    // Clean up text
    if (this.loadingText) {
      this.loadingText.destroy();
      this.loadingText = undefined;
    }

    // Clean up background overlay
    if (this.backgroundOverlay) {
      this.backgroundOverlay.destroy();
      this.backgroundOverlay = undefined;
    }

    // Call parent destroy
    super.destroy(fromScene);

    console.log('LoadingSpinner destroyed');
  }
}
