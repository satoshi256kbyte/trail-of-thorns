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
}

export interface ActionMenuItem {
    text: string;
    action: string;
    enabled: boolean;
}

export class UIManager {
    private scene: Phaser.Scene;
    private uiElements: Partial<UIElements> = {};
    private isCharacterInfoVisible: boolean = false;
    private actionMenuVisible: boolean = false;
    private readonly UI_DEPTH = 1000;
    private readonly PANEL_DEPTH = 1001;
    private readonly TEXT_DEPTH = 1002;

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

        // Initially hide panels
        this.hideCharacterInfo();
        this.hideActionMenu();
    }

    /**
     * Create turn display UI elements
     */
    private createTurnDisplay(): void {
        const camera = this.scene.cameras.main;
        const x = 20;
        const y = 20;

        // Turn number display
        this.uiElements.turnDisplay = this.scene.add.text(x, y, 'Turn: 1', {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setScrollFactor(0).setDepth(this.TEXT_DEPTH);

        // Current player display
        this.uiElements.playerDisplay = this.scene.add.text(x, y + 35, 'Player Turn', {
            fontSize: '20px',
            color: '#00ff00',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setScrollFactor(0).setDepth(this.TEXT_DEPTH);
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
        this.uiElements.characterInfoPanel = this.scene.add.container(x, y)
            .setScrollFactor(0)
            .setDepth(this.PANEL_DEPTH);

        // Background for the panel
        const background = this.scene.add.graphics()
            .fillStyle(0x000000, 0.8)
            .fillRoundedRect(0, 0, panelWidth, panelHeight, 10)
            .lineStyle(2, 0xffffff, 1)
            .strokeRoundedRect(0, 0, panelWidth, panelHeight, 10);

        // Character name
        this.uiElements.characterNameText = this.scene.add.text(15, 15, '', {
            fontSize: '20px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });

        // HP display
        this.uiElements.characterHPText = this.scene.add.text(15, 45, '', {
            fontSize: '16px',
            color: '#ff6666',
            fontFamily: 'Arial'
        });

        // MP display
        this.uiElements.characterMPText = this.scene.add.text(15, 70, '', {
            fontSize: '16px',
            color: '#6666ff',
            fontFamily: 'Arial'
        });

        // Stats display
        this.uiElements.characterStatsText = this.scene.add.text(15, 100, '', {
            fontSize: '14px',
            color: '#cccccc',
            fontFamily: 'Arial'
        });

        // Add all elements to the container
        this.uiElements.characterInfoPanel.add([
            background,
            this.uiElements.characterNameText,
            this.uiElements.characterHPText,
            this.uiElements.characterMPText,
            this.uiElements.characterStatsText
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
        this.uiElements.actionMenu = this.scene.add.container(x, y)
            .setScrollFactor(0)
            .setDepth(this.PANEL_DEPTH);

        // Background for the menu
        this.uiElements.background = this.scene.add.graphics()
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
        const pauseGraphics = this.scene.add.graphics()
            .fillStyle(0x333333, 0.8)
            .fillRoundedRect(0, 0, 60, 40, 5)
            .lineStyle(2, 0xffffff, 1)
            .strokeRoundedRect(0, 0, 60, 40, 5);

        const pauseText = this.scene.add.text(30, 20, '||', {
            fontSize: '20px',
            color: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Create container for pause button
        const pauseContainer = this.scene.add.container(camera.width - 80, 20)
            .setScrollFactor(0)
            .setDepth(this.UI_DEPTH)
            .setInteractive({
                hitArea: { x: 0, y: 0, width: 60, height: 40 }, hitAreaCallback: (hitArea: any, x: number, y: number) => {
                    return x >= hitArea.x && x <= hitArea.x + hitArea.width && y >= hitArea.y && y <= hitArea.y + hitArea.height;
                }
            })
            .on('pointerdown', () => {
                this.scene.events.emit('pause-requested');
            })
            .on('pointerover', () => {
                pauseGraphics.clear()
                    .fillStyle(0x555555, 0.8)
                    .fillRoundedRect(0, 0, 60, 40, 5)
                    .lineStyle(2, 0xffffff, 1)
                    .strokeRoundedRect(0, 0, 60, 40, 5);
            })
            .on('pointerout', () => {
                pauseGraphics.clear()
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

            this.uiElements.playerDisplay
                .setText(playerText)
                .setColor(color);
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
            this.uiElements.characterHPText.setText(`HP: ${character.currentHP}/${character.stats.maxHP} (${hpPercent}%)`);
        }

        if (this.uiElements.characterMPText) {
            const mpPercent = Math.round((character.currentMP / character.stats.maxMP) * 100);
            this.uiElements.characterMPText.setText(`MP: ${character.currentMP}/${character.stats.maxMP} (${mpPercent}%)`);
        }

        if (this.uiElements.characterStatsText) {
            const statsText = [
                `ATK: ${character.stats.attack}`,
                `DEF: ${character.stats.defense}`,
                `SPD: ${character.stats.speed}`,
                `MOV: ${character.stats.movement}`
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
            const y = 20 + (index * 30);
            const color = action.enabled ? '#ffffff' : '#666666';

            const actionButton = this.scene.add.text(15, y, action.text, {
                fontSize: '16px',
                color: color,
                fontFamily: 'Arial'
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
    }
}