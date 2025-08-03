import * as Phaser from 'phaser';

/**
 * MenuButton - A reusable button component with hover effects and click handling
 * Provides consistent styling and animation for menu interfaces
 */
export class MenuButton extends Phaser.GameObjects.Container {
  private background!: Phaser.GameObjects.Rectangle;
  private text!: Phaser.GameObjects.Text;
  private isHovered: boolean = false;
  private isPressed: boolean = false;
  private callback: () => void;

  // Style configuration
  private static readonly STYLE = {
    width: 200,
    height: 50,
    backgroundColor: 0x2c3e50,
    hoverColor: 0x3498db,
    pressedColor: 0x2980b9,
    textColor: '#ffffff',
    hoverTextColor: '#ffffff',
    fontSize: '18px',
    fontFamily: 'Arial',
    borderRadius: 8,
    animationDuration: 150,
  };

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    callback: () => void,
    width: number = MenuButton.STYLE.width,
    height: number = MenuButton.STYLE.height
  ) {
    super(scene, x, y);

    this.callback = callback;
    this.setupButton(text, width, height);
    this.setupInteractions();

    // Add to scene
    scene.add.existing(this);
  }

  private setupButton(text: string, width: number, height: number): void {
    // Create background rectangle
    this.background = this.scene.add.rectangle(
      0,
      0,
      width,
      height,
      MenuButton.STYLE.backgroundColor
    );
    this.background.setStrokeStyle(2, 0x34495e);
    this.add(this.background);

    // Create text
    this.text = this.scene.add.text(0, 0, text, {
      fontSize: MenuButton.STYLE.fontSize,
      fontFamily: MenuButton.STYLE.fontFamily,
      color: MenuButton.STYLE.textColor,
    });
    this.text.setOrigin(0.5, 0.5);
    this.add(this.text);

    // Set container size for interaction
    this.setSize(width, height);
    this.setInteractive();
  }

  private setupInteractions(): void {
    // Hover events
    this.on('pointerover', this.onHover, this);
    this.on('pointerout', this.onOut, this);

    // Click events
    this.on('pointerdown', this.onDown, this);
    this.on('pointerup', this.onUp, this);

    // Handle click outside
    this.on('pointerupoutside', this.onUpOutside, this);
  }

  private onHover(): void {
    if (this.isHovered) return;

    this.isHovered = true;
    this.animateToHoverState();
  }

  private onOut(): void {
    if (!this.isHovered) return;

    this.isHovered = false;
    this.isPressed = false;
    this.animateToNormalState();
  }

  private onDown(): void {
    if (this.input && this.input.enabled) {
      this.isPressed = true;
      this.animateToPressedState();
    }
  }

  private onUp(): void {
    if (this.isPressed && this.input && this.input.enabled) {
      this.isPressed = false;

      // Trigger callback only if button is enabled
      this.callback();

      // Return to hover state if still hovering
      if (this.isHovered) {
        this.animateToHoverState();
      } else {
        this.animateToNormalState();
      }
    } else if (this.isPressed) {
      // Reset pressed state even if disabled
      this.isPressed = false;
    }
  }

  private onUpOutside(): void {
    this.isPressed = false;
    if (this.isHovered) {
      this.animateToHoverState();
    } else {
      this.animateToNormalState();
    }
  }

  private animateToHoverState(): void {
    this.scene.tweens.add({
      targets: this.background,
      fillColor: MenuButton.STYLE.hoverColor,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: MenuButton.STYLE.animationDuration,
      ease: 'Power2',
    });

    this.scene.tweens.add({
      targets: this.text,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: MenuButton.STYLE.animationDuration,
      ease: 'Power2',
    });
  }

  private animateToPressedState(): void {
    this.scene.tweens.add({
      targets: this.background,
      fillColor: MenuButton.STYLE.pressedColor,
      scaleX: 0.95,
      scaleY: 0.95,
      duration: MenuButton.STYLE.animationDuration / 2,
      ease: 'Power2',
    });

    this.scene.tweens.add({
      targets: this.text,
      scaleX: 0.95,
      scaleY: 0.95,
      duration: MenuButton.STYLE.animationDuration / 2,
      ease: 'Power2',
    });
  }

  private animateToNormalState(): void {
    this.scene.tweens.add({
      targets: this.background,
      fillColor: MenuButton.STYLE.backgroundColor,
      scaleX: 1,
      scaleY: 1,
      duration: MenuButton.STYLE.animationDuration,
      ease: 'Power2',
    });

    this.scene.tweens.add({
      targets: this.text,
      scaleX: 1,
      scaleY: 1,
      duration: MenuButton.STYLE.animationDuration,
      ease: 'Power2',
    });
  }

  /**
   * Update button text
   */
  public setText(newText: string): void {
    this.text.setText(newText);
  }

  /**
   * Enable or disable the button
   */
  public setEnabled(enabled: boolean): void {
    this.setInteractive(enabled);
    this.setAlpha(enabled ? 1 : 0.5);
  }

  /**
   * Get current hover state
   */
  public getIsHovered(): boolean {
    return this.isHovered;
  }

  /**
   * Get current pressed state
   */
  public getIsPressed(): boolean {
    return this.isPressed;
  }

  /**
   * Cleanup method to remove event listeners
   */
  public destroy(fromScene?: boolean): void {
    this.off('pointerover');
    this.off('pointerout');
    this.off('pointerdown');
    this.off('pointerup');
    this.off('pointerupoutside');

    super.destroy(fromScene);
  }
}
