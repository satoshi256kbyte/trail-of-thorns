import * as Phaser from 'phaser';
import { MenuButton } from '../ui/MenuButton';

/**
 * MenuButtonDemo - A demonstration scene showing MenuButton usage
 * This scene can be used for testing and showcasing the MenuButton component
 */
export class MenuButtonDemo extends Phaser.Scene {
    private buttons: MenuButton[] = [];

    constructor() {
        super({ key: 'MenuButtonDemo' });
    }

    create(): void {
        // Add title
        this.add.text(400, 100, 'MenuButton Demo', {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#ffffff',
        }).setOrigin(0.5);

        // Create demo buttons
        this.createDemoButtons();

        // Add instructions
        this.add.text(400, 500, 'Hover and click the buttons to test interactions', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#cccccc',
        }).setOrigin(0.5);
    }

    private createDemoButtons(): void {
        // Standard button
        const standardButton = new MenuButton(
            this,
            200,
            200,
            'Standard Button',
            () => {
                console.log('Standard button clicked!');
                this.showMessage('Standard button clicked!');
            }
        );
        this.buttons.push(standardButton);

        // Custom sized button
        const wideButton = new MenuButton(
            this,
            600,
            200,
            'Wide Button',
            () => {
                console.log('Wide button clicked!');
                this.showMessage('Wide button clicked!');
            },
            300,
            50
        );
        this.buttons.push(wideButton);

        // Button that toggles enabled state
        let isEnabled = true;
        const toggleButton = new MenuButton(
            this,
            200,
            300,
            'Toggle Me',
            () => {
                isEnabled = !isEnabled;
                toggleButton.setEnabled(isEnabled);
                toggleButton.setText(isEnabled ? 'Toggle Me' : 'Disabled');
                console.log(`Toggle button is now ${isEnabled ? 'enabled' : 'disabled'}`);
                this.showMessage(`Button is now ${isEnabled ? 'enabled' : 'disabled'}`);
            }
        );
        this.buttons.push(toggleButton);

        // Button that changes text
        let clickCount = 0;
        const counterButton = new MenuButton(
            this,
            600,
            300,
            'Click Count: 0',
            () => {
                clickCount++;
                counterButton.setText(`Click Count: ${clickCount}`);
                console.log(`Counter button clicked ${clickCount} times`);
                this.showMessage(`Clicked ${clickCount} times`);
            }
        );
        this.buttons.push(counterButton);

        // Exit button
        const exitButton = new MenuButton(
            this,
            400,
            400,
            'Back to Game',
            () => {
                console.log('Returning to main game...');
                this.showMessage('Returning to main game...');
                // In a real game, this would transition to another scene
                // this.scene.start('MainMenuScene');
            }
        );
        this.buttons.push(exitButton);
    }

    private showMessage(message: string): void {
        // Create a temporary message that fades out
        const messageText = this.add.text(400, 550, message, {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#00ff00',
        }).setOrigin(0.5);

        // Fade out the message
        this.tweens.add({
            targets: messageText,
            alpha: 0,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                messageText.destroy();
            },
        });
    }

    destroy(): void {
        // Clean up buttons
        this.buttons.forEach(button => button.destroy());
        this.buttons = [];
        super.destroy();
    }
}