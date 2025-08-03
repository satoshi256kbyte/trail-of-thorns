import * as Phaser from 'phaser';
import { StageData } from '../types/StageData';

/**
 * StageButton class
 * Reusable component for individual stage selection buttons
 * Implements requirements 6.2, 6.3, 6.4 from the title-menu-screen specification
 */
export class StageButton extends Phaser.GameObjects.Container {
  private stage: StageData;
  private background!: Phaser.GameObjects.Rectangle;
  private nameText!: Phaser.GameObjects.Text;
  private descriptionText!: Phaser.GameObjects.Text;
  private difficultyText!: Phaser.GameObjects.Text;
  private lockIndicator?: Phaser.GameObjects.Text;
  private onSelectCallback: (stage: StageData) => void;
  private isHovered: boolean = false;

  // Visual configuration
  private static readonly CONFIG = {
    width: 280,
    height: 160,
    unlockedColor: 0x3498db,
    lockedColor: 0x7f8c8d,
    unlockedBorderColor: 0x2980b9,
    lockedBorderColor: 0x95a5a6,
    hoverColor: 0x2980b9,
    hoverScale: 1.05,
    normalScale: 1.0,
    borderWidth: 2,
  };

  /**
   * Constructor
   * @param scene - Phaser scene instance
   * @param x - X position
   * @param y - Y position
   * @param stage - Stage data for this button
   * @param onSelect - Callback function when stage is selected
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    stage: StageData,
    onSelect: (stage: StageData) => void
  ) {
    super(scene, x, y);

    this.stage = stage;
    this.onSelectCallback = onSelect;

    this.createButton();
    this.setupInteractivity();

    // Add to scene
    scene.add.existing(this);

    console.log(`StageButton created for stage: ${stage.name}`);
  }

  /**
   * Create the visual elements of the button
   * Implements requirement 6.3: Add stage information display (name, description)
   */
  private createButton(): void {
    // Create background rectangle
    this.background = this.scene.add.rectangle(
      0,
      0,
      StageButton.CONFIG.width,
      StageButton.CONFIG.height,
      this.getBackgroundColor()
    );

    this.background.setStrokeStyle(StageButton.CONFIG.borderWidth, this.getBorderColor());

    this.add(this.background);

    // Create stage name text
    this.nameText = this.scene.add
      .text(0, -40, this.stage.name, {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add(this.nameText);

    // Create stage description text with word wrapping
    this.descriptionText = this.scene.add
      .text(0, -10, this.stage.description, {
        fontSize: '14px',
        color: '#ecf0f1',
        fontFamily: 'Arial',
        align: 'center',
        wordWrap: { width: StageButton.CONFIG.width - 20 },
      })
      .setOrigin(0.5);
    this.add(this.descriptionText);

    // Create difficulty indicator
    const difficultyStars = '★'.repeat(this.stage.difficulty);
    this.difficultyText = this.scene.add
      .text(0, 30, `Difficulty: ${difficultyStars}`, {
        fontSize: '16px',
        color: this.stage.isUnlocked ? '#f1c40f' : '#bdc3c7',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);
    this.add(this.difficultyText);

    // Add lock indicator for locked stages
    // Implements requirement 6.2: Stage availability checking (locked/unlocked states)
    if (!this.stage.isUnlocked) {
      this.lockIndicator = this.scene.add
        .text(0, 50, '🔒 LOCKED', {
          fontSize: '14px',
          color: '#e74c3c',
          fontFamily: 'Arial',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.add(this.lockIndicator);
    }
  }

  /**
   * Setup button interactivity based on stage availability
   * Implements requirement 6.2: Stage availability checking
   */
  private setupInteractivity(): void {
    if (this.stage.isUnlocked) {
      // Make button interactive for unlocked stages
      this.background.setInteractive();

      // Add hover effects
      this.background.on('pointerover', () => this.onHover());
      this.background.on('pointerout', () => this.onOut());
      this.background.on('pointerdown', () => this.onClick());

      // Enable button cursor
      this.background.on('pointerover', () => {
        this.scene.input.setDefaultCursor('pointer');
      });
      this.background.on('pointerout', () => {
        this.scene.input.setDefaultCursor('default');
      });
    } else {
      // Locked stages are not interactive
      this.background.removeInteractive();
    }
  }

  /**
   * Handle hover state
   * Provides visual feedback for interactive buttons
   */
  private onHover(): void {
    if (!this.stage.isUnlocked || this.isHovered) return;

    this.isHovered = true;
    this.background.setFillStyle(StageButton.CONFIG.hoverColor);
    this.setScale(StageButton.CONFIG.hoverScale);

    // Add subtle glow effect
    this.background.setStrokeStyle(StageButton.CONFIG.borderWidth + 1, 0x5dade2);
  }

  /**
   * Handle unhover state
   * Reset visual state when mouse leaves button
   */
  private onOut(): void {
    if (!this.stage.isUnlocked || !this.isHovered) return;

    this.isHovered = false;
    this.background.setFillStyle(this.getBackgroundColor());
    this.setScale(StageButton.CONFIG.normalScale);

    // Reset border
    this.background.setStrokeStyle(StageButton.CONFIG.borderWidth, this.getBorderColor());
  }

  /**
   * Handle click event
   * Implements requirement 6.4: Stage selection functionality
   */
  private onClick(): void {
    if (!this.stage.isUnlocked) return;

    console.log(`StageButton clicked: ${this.stage.name} (${this.stage.id})`);

    // Add click feedback animation
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.95,
      scaleY: 0.95,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        // Call the selection callback
        this.onSelectCallback(this.stage);
      },
    });
  }

  /**
   * Get background color based on stage availability
   * @returns Color value for the background
   */
  private getBackgroundColor(): number {
    return this.stage.isUnlocked
      ? StageButton.CONFIG.unlockedColor
      : StageButton.CONFIG.lockedColor;
  }

  /**
   * Get border color based on stage availability
   * @returns Color value for the border
   */
  private getBorderColor(): number {
    return this.stage.isUnlocked
      ? StageButton.CONFIG.unlockedBorderColor
      : StageButton.CONFIG.lockedBorderColor;
  }

  /**
   * Update stage data and refresh button appearance
   * @param newStageData - Updated stage data
   */
  public updateStage(newStageData: StageData): void {
    this.stage = newStageData;

    // Update visual elements
    this.nameText.setText(this.stage.name);
    this.descriptionText.setText(this.stage.description);

    const difficultyStars = '★'.repeat(this.stage.difficulty);
    this.difficultyText.setText(`Difficulty: ${difficultyStars}`);
    this.difficultyText.setColor(this.stage.isUnlocked ? '#f1c40f' : '#bdc3c7');

    // Update background colors
    this.background.setFillStyle(this.getBackgroundColor());
    this.background.setStrokeStyle(StageButton.CONFIG.borderWidth, this.getBorderColor());

    // Handle lock indicator
    if (!this.stage.isUnlocked && !this.lockIndicator) {
      // Add lock indicator if stage became locked
      this.lockIndicator = this.scene.add
        .text(0, 50, '🔒 LOCKED', {
          fontSize: '14px',
          color: '#e74c3c',
          fontFamily: 'Arial',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.add(this.lockIndicator);
    } else if (this.stage.isUnlocked && this.lockIndicator) {
      // Remove lock indicator if stage became unlocked
      this.lockIndicator.destroy();
      this.lockIndicator = undefined;
    }

    // Update interactivity
    this.setupInteractivity();

    console.log(`StageButton updated for stage: ${this.stage.name}`);
  }

  /**
   * Get the stage data associated with this button
   * @returns Stage data
   */
  public getStage(): StageData {
    return { ...this.stage };
  }

  /**
   * Check if the stage is unlocked
   * @returns True if stage is unlocked, false otherwise
   */
  public isUnlocked(): boolean {
    return this.stage.isUnlocked;
  }

  /**
   * Get stage difficulty level
   * @returns Difficulty level (1-5)
   */
  public getDifficulty(): number {
    return this.stage.difficulty;
  }

  /**
   * Get stage ID
   * @returns Stage identifier
   */
  public getStageId(): string {
    return this.stage.id;
  }

  /**
   * Cleanup method to prevent memory leaks
   */
  public destroy(): void {
    // Remove event listeners
    if (this.background && this.background.input) {
      this.background.removeAllListeners();
    }

    // Reset cursor if this button was hovered
    if (this.isHovered) {
      this.scene.input.setDefaultCursor('default');
    }

    console.log(`StageButton destroyed for stage: ${this.stage.name}`);

    // Call parent destroy
    super.destroy();
  }
}
