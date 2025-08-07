/**
 * UIManager - Manages game interface elements and UI state
 *
 * This class handles:
 * - Turn display and game status UI
 * - Character information panel
 * - Action menu display
 * - UI state management and updates
 */

import { Unit, GameState } from '../types/gameplay';

export interface UIElements {
  turnDisplay: Phaser.GameObjects.Text;
  playerDisplay: Phaser.GameObjects.Text;
  characterInfoPanel: Phaser.GameObjects.Container;
  characterNameText: Phaser.GameObjects.Text;
  characterHPText: Phaser.GameObjects.Text;
  characterMPText: Phaser.GameObjects.Text;
  characterStatsText: Phaser.GameObjects.Text;
  actionMenu: Phaser.GameObjects.Container;
  actionButtons: Phaser.GameObjects.Text[];
  pauseButton: Phaser.GameObjects.Image;
  background: Phaser.GameObjects.Graphics;
  // Battle UI elements
  battleStatusPanel: Phaser.GameObjects.Container;
  battleStatusText: Phaser.GameObjects.Text;
  damageDisplay: Phaser.GameObjects.Container;
  experienceDisplay: Phaser.GameObjects.Container;
  battleResultPanel: Phaser.GameObjects.Container;
  errorNotification: Phaser.GameObjects.Container;
}

export interface ActionMenuItem {
  text: string;
  action: string;
  enabled: boolean;
}

/**
 * Battle result display data
 */
export interface BattleResultDisplay {
  damage: number;
  isCritical: boolean;
  isEvaded: boolean;
  experienceGained: number;
  targetDefeated: boolean;
  attacker: string;
  target: string;
}

/**
 * Error notification data
 */
export interface ErrorNotificationData {
  message: string;
  type: 'error' | 'warning' | 'info';
  duration?: number;
}

export class UIManager {
  private scene: Phaser.Scene;
  private uiElements: Partial<UIElements> = {};
  private isCharacterInfoVisible: boolean = false;
  private actionMenuVisible: boolean = false;
  private readonly UI_DEPTH = 1000;
  private readonly PANEL_DEPTH = 1001;
  private readonly TEXT_DEPTH = 1002;
  private readonly BATTLE_UI_DEPTH = 1003;
  private readonly NOTIFICATION_DEPTH = 1004;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create and initialize all UI elements
   */
  createUI(): void {
    this.createTurnDisplay();
    this.createCharacterInfoPanel();
    this.createActionMenu();
    this.createPauseButton();
    this.createBattleUI();

    // Initially hide panels
    this.hideCharacterInfo();
    this.hideActionMenu();
    this.hideBattleUI();
  }

  /**
   * Create turn display UI elements
   */
  private createTurnDisplay(): void {
    const camera = this.scene.cameras.main;
    const x = 20;
    const y = 20;

    // Turn number display
    this.uiElements.turnDisplay = this.scene.add
      .text(x, y, 'Turn: 1', {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setScrollFactor(0)
      .setDepth(this.TEXT_DEPTH);

    // Current player display
    this.uiElements.playerDisplay = this.scene.add
      .text(x, y + 35, 'Player Turn', {
        fontSize: '20px',
        color: '#00ff00',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setScrollFactor(0)
      .setDepth(this.TEXT_DEPTH);
  }

  /**
   * Create character information panel
   */
  private createCharacterInfoPanel(): void {
    const camera = this.scene.cameras.main;
    const panelWidth = 300;
    const panelHeight = 200;
    const x = camera.width - panelWidth - 20;
    const y = 20;

    // Create container for the panel
    this.uiElements.characterInfoPanel = this.scene.add
      .container(x, y)
      .setScrollFactor(0)
      .setDepth(this.PANEL_DEPTH);

    // Background for the panel
    const background = this.scene.add
      .graphics()
      .fillStyle(0x000000, 0.8)
      .fillRoundedRect(0, 0, panelWidth, panelHeight, 10)
      .lineStyle(2, 0xffffff, 1)
      .strokeRoundedRect(0, 0, panelWidth, panelHeight, 10);

    // Character name
    this.uiElements.characterNameText = this.scene.add.text(15, 15, '', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });

    // HP display
    this.uiElements.characterHPText = this.scene.add.text(15, 45, '', {
      fontSize: '16px',
      color: '#ff6666',
      fontFamily: 'Arial',
    });

    // MP display
    this.uiElements.characterMPText = this.scene.add.text(15, 70, '', {
      fontSize: '16px',
      color: '#6666ff',
      fontFamily: 'Arial',
    });

    // Stats display
    this.uiElements.characterStatsText = this.scene.add.text(15, 100, '', {
      fontSize: '14px',
      color: '#cccccc',
      fontFamily: 'Arial',
    });

    // Add all elements to the container
    this.uiElements.characterInfoPanel.add([
      background,
      this.uiElements.characterNameText,
      this.uiElements.characterHPText,
      this.uiElements.characterMPText,
      this.uiElements.characterStatsText,
    ]);
  }

  /**
   * Create action menu
   */
  private createActionMenu(): void {
    const camera = this.scene.cameras.main;
    const menuWidth = 200;
    const menuHeight = 150;
    const x = camera.width / 2 - menuWidth / 2;
    const y = camera.height - menuHeight - 20;

    // Create container for the menu
    this.uiElements.actionMenu = this.scene.add
      .container(x, y)
      .setScrollFactor(0)
      .setDepth(this.PANEL_DEPTH);

    // Background for the menu
    this.uiElements.background = this.scene.add
      .graphics()
      .fillStyle(0x000000, 0.9)
      .fillRoundedRect(0, 0, menuWidth, menuHeight, 10)
      .lineStyle(2, 0xffffff, 1)
      .strokeRoundedRect(0, 0, menuWidth, menuHeight, 10);

    this.uiElements.actionMenu.add(this.uiElements.background);

    // Initialize empty action buttons array
    this.uiElements.actionButtons = [];
  }

  /**
   * Create pause button
   */
  private createPauseButton(): void {
    const camera = this.scene.cameras.main;

    // Create a simple pause button using graphics since we don't have image assets
    const pauseGraphics = this.scene.add
      .graphics()
      .fillStyle(0x333333, 0.8)
      .fillRoundedRect(0, 0, 60, 40, 5)
      .lineStyle(2, 0xffffff, 1)
      .strokeRoundedRect(0, 0, 60, 40, 5);

    const pauseText = this.scene.add
      .text(30, 20, '||', {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    // Create container for pause button
    const pauseContainer = this.scene.add
      .container(camera.width - 80, 20)
      .setScrollFactor(0)
      .setDepth(this.UI_DEPTH)
      .setInteractive({
        hitArea: { x: 0, y: 0, width: 60, height: 40 },
        hitAreaCallback: (hitArea: any, x: number, y: number) => {
          return (
            x >= hitArea.x &&
            x <= hitArea.x + hitArea.width &&
            y >= hitArea.y &&
            y <= hitArea.y + hitArea.height
          );
        },
      })
      .on('pointerdown', () => {
        this.scene.events.emit('pause-requested');
      })
      .on('pointerover', () => {
        pauseGraphics
          .clear()
          .fillStyle(0x555555, 0.8)
          .fillRoundedRect(0, 0, 60, 40, 5)
          .lineStyle(2, 0xffffff, 1)
          .strokeRoundedRect(0, 0, 60, 40, 5);
      })
      .on('pointerout', () => {
        pauseGraphics
          .clear()
          .fillStyle(0x333333, 0.8)
          .fillRoundedRect(0, 0, 60, 40, 5)
          .lineStyle(2, 0xffffff, 1)
          .strokeRoundedRect(0, 0, 60, 40, 5);
      });

    pauseContainer.add([pauseGraphics, pauseText]);

    // Store reference (we'll treat the container as the pause button)
    this.uiElements.pauseButton = pauseContainer as any;
  }

  /**
   * Update turn display with current turn number and active player
   */
  updateTurnDisplay(turnNumber: number, currentPlayer: 'player' | 'enemy'): void {
    if (this.uiElements.turnDisplay) {
      this.uiElements.turnDisplay.setText(`Turn: ${turnNumber}`);
    }

    if (this.uiElements.playerDisplay) {
      const playerText = currentPlayer === 'player' ? 'Player Turn' : 'Enemy Turn';
      const color = currentPlayer === 'player' ? '#00ff00' : '#ff6666';

      this.uiElements.playerDisplay.setText(playerText).setColor(color);
    }
  }

  /**
   * Show character information panel with unit details
   */
  showCharacterInfo(character: Unit): void {
    if (!this.uiElements.characterInfoPanel) {
      return;
    }

    // Update character information
    if (this.uiElements.characterNameText) {
      this.uiElements.characterNameText.setText(character.name);
    }

    if (this.uiElements.characterHPText) {
      const hpPercent = Math.round((character.currentHP / character.stats.maxHP) * 100);
      this.uiElements.characterHPText.setText(
        `HP: ${character.currentHP}/${character.stats.maxHP} (${hpPercent}%)`
      );
    }

    if (this.uiElements.characterMPText) {
      const mpPercent = Math.round((character.currentMP / character.stats.maxMP) * 100);
      this.uiElements.characterMPText.setText(
        `MP: ${character.currentMP}/${character.stats.maxMP} (${mpPercent}%)`
      );
    }

    if (this.uiElements.characterStatsText) {
      const statsText = [
        `ATK: ${character.stats.attack}`,
        `DEF: ${character.stats.defense}`,
        `SPD: ${character.stats.speed}`,
        `MOV: ${character.stats.movement}`,
      ].join('  ');
      this.uiElements.characterStatsText.setText(statsText);
    }

    // Show the panel
    this.uiElements.characterInfoPanel.setVisible(true);
    this.isCharacterInfoVisible = true;
  }

  /**
   * Hide character information panel
   */
  hideCharacterInfo(): void {
    if (this.uiElements.characterInfoPanel) {
      this.uiElements.characterInfoPanel.setVisible(false);
      this.isCharacterInfoVisible = false;
    }
  }

  /**
   * Show action menu with available actions
   */
  showActionMenu(actions: ActionMenuItem[]): void {
    if (!this.uiElements.actionMenu) {
      return;
    }

    // Clear existing action buttons
    this.clearActionButtons();

    // Create new action buttons
    actions.forEach((action, index) => {
      const y = 20 + index * 30;
      const color = action.enabled ? '#ffffff' : '#666666';

      const actionButton = this.scene.add.text(15, y, action.text, {
        fontSize: '16px',
        color: color,
        fontFamily: 'Arial',
      });

      if (action.enabled) {
        actionButton
          .setInteractive()
          .on('pointerdown', () => {
            this.scene.events.emit('action-selected', action.action);
          })
          .on('pointerover', () => {
            actionButton.setColor('#ffff00');
          })
          .on('pointerout', () => {
            actionButton.setColor('#ffffff');
          });
      }

      this.uiElements.actionMenu!.add(actionButton);
      this.uiElements.actionButtons!.push(actionButton);
    });

    // Show the menu
    this.uiElements.actionMenu.setVisible(true);
    this.actionMenuVisible = true;
  }

  /**
   * Hide action menu
   */
  hideActionMenu(): void {
    if (this.uiElements.actionMenu) {
      this.uiElements.actionMenu.setVisible(false);
      this.actionMenuVisible = false;
    }
  }

  /**
   * Clear all action buttons from the menu
   */
  private clearActionButtons(): void {
    if (this.uiElements.actionButtons) {
      this.uiElements.actionButtons.forEach(button => {
        button.destroy();
      });
      this.uiElements.actionButtons = [];
    }
  }

  /**
   * Update UI based on game state changes
   */
  updateUI(gameState: GameState): void {
    this.updateTurnDisplay(gameState.currentTurn, gameState.activePlayer);

    // Show character info if a unit is selected
    if (gameState.selectedUnit) {
      this.showCharacterInfo(gameState.selectedUnit);
    } else {
      this.hideCharacterInfo();
    }

    // Hide action menu during enemy turns
    if (gameState.activePlayer === 'enemy' && this.actionMenuVisible) {
      this.hideActionMenu();
    }
  }

  /**
   * Check if character info panel is currently visible
   */
  isCharacterInfoPanelVisible(): boolean {
    return this.isCharacterInfoVisible;
  }

  /**
   * Check if action menu is currently visible
   */
  isActionMenuVisible(): boolean {
    return this.actionMenuVisible;
  }

  /**
   * Get UI elements (for testing purposes)
   */
  getUIElements(): Partial<UIElements> {
    return { ...this.uiElements };
  }

  /**
   * Destroy all UI elements and clean up
   */
  destroy(): void {
    // Destroy all UI elements
    Object.values(this.uiElements).forEach(element => {
      if (element && typeof element.destroy === 'function') {
        element.destroy();
      }
    });

    // Clear references
    this.uiElements = {};
    this.isCharacterInfoVisible = false;
    this.actionMenuVisible = false;
  }

  /**
   * Create battle UI elements
   */
  private createBattleUI(): void {
    this.createBattleStatusPanel();
    this.createDamageDisplay();
    this.createExperienceDisplay();
    this.createBattleResultPanel();
    this.createErrorNotification();
  }

  /**
   * Create battle status panel
   */
  private createBattleStatusPanel(): void {
    const camera = this.scene.cameras.main;
    const panelWidth = 250;
    const panelHeight = 60;
    const x = camera.width / 2 - panelWidth / 2;
    const y = 20;

    this.uiElements.battleStatusPanel = this.scene.add
      .container(x, y)
      .setScrollFactor(0)
      .setDepth(this.BATTLE_UI_DEPTH);

    // Background
    const background = this.scene.add
      .graphics()
      .fillStyle(0x000000, 0.8)
      .fillRoundedRect(0, 0, panelWidth, panelHeight, 8)
      .lineStyle(2, 0xff4444, 1)
      .strokeRoundedRect(0, 0, panelWidth, panelHeight, 8);

    // Status text
    this.uiElements.battleStatusText = this.scene.add
      .text(panelWidth / 2, panelHeight / 2, 'Battle Phase', {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.uiElements.battleStatusPanel.add([background, this.uiElements.battleStatusText]);
  }

  /**
   * Create damage display container
   */
  private createDamageDisplay(): void {
    this.uiElements.damageDisplay = this.scene.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(this.BATTLE_UI_DEPTH);
  }

  /**
   * Create experience display container
   */
  private createExperienceDisplay(): void {
    this.uiElements.experienceDisplay = this.scene.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(this.BATTLE_UI_DEPTH);
  }

  /**
   * Create battle result panel
   */
  private createBattleResultPanel(): void {
    const camera = this.scene.cameras.main;
    const panelWidth = 400;
    const panelHeight = 200;
    const x = camera.width / 2 - panelWidth / 2;
    const y = camera.height / 2 - panelHeight / 2;

    this.uiElements.battleResultPanel = this.scene.add
      .container(x, y)
      .setScrollFactor(0)
      .setDepth(this.BATTLE_UI_DEPTH);

    // Background
    const background = this.scene.add
      .graphics()
      .fillStyle(0x000000, 0.9)
      .fillRoundedRect(0, 0, panelWidth, panelHeight, 12)
      .lineStyle(3, 0xffffff, 1)
      .strokeRoundedRect(0, 0, panelWidth, panelHeight, 12);

    this.uiElements.battleResultPanel.add(background);
  }

  /**
   * Create error notification container
   */
  private createErrorNotification(): void {
    const camera = this.scene.cameras.main;
    const panelWidth = 300;
    const panelHeight = 80;
    const x = camera.width / 2 - panelWidth / 2;
    const y = 100;

    this.uiElements.errorNotification = this.scene.add
      .container(x, y)
      .setScrollFactor(0)
      .setDepth(this.NOTIFICATION_DEPTH);

    // Background
    const background = this.scene.add
      .graphics()
      .fillStyle(0x660000, 0.9)
      .fillRoundedRect(0, 0, panelWidth, panelHeight, 8)
      .lineStyle(2, 0xff0000, 1)
      .strokeRoundedRect(0, 0, panelWidth, panelHeight, 8);

    this.uiElements.errorNotification.add(background);
  }

  /**
   * Show battle status
   * @param status - Battle status message
   */
  public showBattleStatus(status: string): void {
    if (this.uiElements.battleStatusPanel && this.uiElements.battleStatusText) {
      this.uiElements.battleStatusText.setText(status);
      this.uiElements.battleStatusPanel.setVisible(true);
    }
  }

  /**
   * Hide battle status panel
   */
  public hideBattleStatus(): void {
    if (this.uiElements.battleStatusPanel) {
      this.uiElements.battleStatusPanel.setVisible(false);
    }
  }

  /**
   * Show damage number at position
   * @param x - Screen X position
   * @param y - Screen Y position
   * @param damage - Damage amount
   * @param isCritical - Whether it's a critical hit
   * @param isHealing - Whether it's healing
   */
  public showDamageNumber(
    x: number,
    y: number,
    damage: number,
    isCritical: boolean = false,
    isHealing: boolean = false
  ): void {
    if (!this.uiElements.damageDisplay) return;

    const color = isHealing ? '#44ff44' : isCritical ? '#ffff44' : '#ff4444';
    const text = isHealing ? `+${damage}` : isCritical ? `${damage}!` : `${damage}`;
    const fontSize = isCritical ? '28px' : '24px';

    const damageText = this.scene.add
      .text(x, y, text, {
        fontSize,
        color,
        fontFamily: 'Arial Black',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.uiElements.damageDisplay.add(damageText);

    // Animate damage text
    this.scene.tweens.add({
      targets: damageText,
      y: y - 50,
      alpha: 0,
      duration: 1500,
      ease: 'Power2.easeOut',
      onComplete: () => {
        damageText.destroy();
      },
    });
  }

  /**
   * Show experience gained notification
   * @param x - Screen X position
   * @param y - Screen Y position
   * @param experience - Experience amount
   */
  public showExperienceGained(x: number, y: number, experience: number): void {
    if (!this.uiElements.experienceDisplay || experience <= 0) return;

    const expText = this.scene.add
      .text(x, y, `+${experience} EXP`, {
        fontSize: '16px',
        color: '#44ff44',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.uiElements.experienceDisplay.add(expText);

    // Animate experience text
    this.scene.tweens.add({
      targets: expText,
      y: y - 30,
      alpha: 0,
      duration: 2000,
      ease: 'Power2.easeOut',
      delay: 500,
      onComplete: () => {
        expText.destroy();
      },
    });
  }

  /**
   * Show battle result panel
   * @param result - Battle result data
   */
  public showBattleResult(result: BattleResultDisplay): void {
    if (!this.uiElements.battleResultPanel) return;

    // Clear previous content
    this.uiElements.battleResultPanel.removeAll(true);

    const panelWidth = 400;
    const panelHeight = 200;

    // Background
    const background = this.scene.add
      .graphics()
      .fillStyle(0x000000, 0.9)
      .fillRoundedRect(0, 0, panelWidth, panelHeight, 12)
      .lineStyle(3, 0xffffff, 1)
      .strokeRoundedRect(0, 0, panelWidth, panelHeight, 12);

    // Title
    const title = this.scene.add
      .text(panelWidth / 2, 30, 'Battle Result', {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Result details
    let resultText = `${result.attacker} attacks ${result.target}\n`;

    if (result.isEvaded) {
      resultText += 'Attack evaded!';
    } else {
      resultText += `Damage: ${result.damage}`;
      if (result.isCritical) {
        resultText += ' (Critical Hit!)';
      }
      if (result.targetDefeated) {
        resultText += '\nTarget defeated!';
      }
    }

    if (result.experienceGained > 0) {
      resultText += `\nExperience gained: ${result.experienceGained}`;
    }

    const details = this.scene.add
      .text(panelWidth / 2, 100, resultText, {
        fontSize: '16px',
        color: '#cccccc',
        fontFamily: 'Arial',
        align: 'center',
      })
      .setOrigin(0.5);

    // Close button
    const closeButton = this.scene.add
      .text(panelWidth / 2, 160, 'Continue', {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Arial',
        backgroundColor: '#444444',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive();

    closeButton.on('pointerdown', () => {
      this.hideBattleResult();
    });

    closeButton.on('pointerover', () => {
      closeButton.setBackgroundColor('#666666');
    });

    closeButton.on('pointerout', () => {
      closeButton.setBackgroundColor('#444444');
    });

    this.uiElements.battleResultPanel.add([background, title, details, closeButton]);
    this.uiElements.battleResultPanel.setVisible(true);
  }

  /**
   * Hide battle result panel
   */
  public hideBattleResult(): void {
    if (this.uiElements.battleResultPanel) {
      this.uiElements.battleResultPanel.setVisible(false);
    }
  }

  /**
   * Show error notification
   * @param data - Error notification data
   */
  public showErrorNotification(data: ErrorNotificationData): void {
    if (!this.uiElements.errorNotification) return;

    // Clear previous content
    this.uiElements.errorNotification.removeAll(true);

    const panelWidth = 300;
    const panelHeight = 80;

    // Background color based on type
    let bgColor = 0x660000;
    let borderColor = 0xff0000;

    switch (data.type) {
      case 'warning':
        bgColor = 0x664400;
        borderColor = 0xffaa00;
        break;
      case 'info':
        bgColor = 0x004466;
        borderColor = 0x0088ff;
        break;
    }

    // Background
    const background = this.scene.add
      .graphics()
      .fillStyle(bgColor, 0.9)
      .fillRoundedRect(0, 0, panelWidth, panelHeight, 8)
      .lineStyle(2, borderColor, 1)
      .strokeRoundedRect(0, 0, panelWidth, panelHeight, 8);

    // Message text
    const messageText = this.scene.add
      .text(panelWidth / 2, panelHeight / 2, data.message, {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial',
        align: 'center',
        wordWrap: { width: panelWidth - 20 },
      })
      .setOrigin(0.5);

    this.uiElements.errorNotification.add([background, messageText]);
    this.uiElements.errorNotification.setVisible(true);

    // Auto-hide after duration
    const duration = data.duration || 3000;
    this.scene.time.delayedCall(duration, () => {
      this.hideErrorNotification();
    });
  }

  /**
   * Hide error notification
   */
  public hideErrorNotification(): void {
    if (this.uiElements.errorNotification) {
      this.uiElements.errorNotification.setVisible(false);
    }
  }

  /**
   * Hide all battle UI elements
   */
  private hideBattleUI(): void {
    this.hideBattleStatus();
    this.hideBattleResult();
    this.hideErrorNotification();
  }

  /**
   * Resize UI elements when screen size changes
   */
  resize(width: number, height: number): void {
    // Update pause button position
    if (this.uiElements.pauseButton) {
      this.uiElements.pauseButton.setPosition(width - 80, 20);
    }

    // Update character info panel position
    if (this.uiElements.characterInfoPanel) {
      this.uiElements.characterInfoPanel.setPosition(width - 320, 20);
    }

    // Update action menu position
    if (this.uiElements.actionMenu) {
      this.uiElements.actionMenu.setPosition(width / 2 - 100, height - 170);
    }

    // Update battle UI positions
    if (this.uiElements.battleStatusPanel) {
      this.uiElements.battleStatusPanel.setPosition(width / 2 - 125, 20);
    }

    if (this.uiElements.battleResultPanel) {
      this.uiElements.battleResultPanel.setPosition(width / 2 - 200, height / 2 - 100);
    }

    if (this.uiElements.errorNotification) {
      this.uiElements.errorNotification.setPosition(width / 2 - 150, 100);
    }
  }
}
