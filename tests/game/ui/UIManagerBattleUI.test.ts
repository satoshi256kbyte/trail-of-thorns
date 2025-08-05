/**
 * UIManager Battle UI test suite
 * Tests the battle-specific UI functionality of UIManager
 */

import * as Phaser from 'phaser';
import { UIManager, BattleResultDisplay, ErrorNotificationData } from '../../../game/src/ui/UIManager';

// Mock Phaser scene
const mockScene = {
    add: {
        container: jest.fn().mockReturnValue({
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis(),
            add: jest.fn(),
            setVisible: jest.fn(),
            removeAll: jest.fn(),
            setPosition: jest.fn(),
        }),
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn().mockReturnThis(),
            fillRoundedRect: jest.fn().mockReturnThis(),
            lineStyle: jest.fn().mockReturnThis(),
            strokeRoundedRect: jest.fn().mockReturnThis(),
            clear: jest.fn().mockReturnThis(),
        }),
        text: jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            setText: jest.fn().mockReturnThis(),
            setColor: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            setBackgroundColor: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
        }),
        group: jest.fn().mockReturnValue({
            add: jest.fn(),
            clear: jest.fn(),
        }),
    },
    cameras: {
        main: {
            width: 800,
            height: 600,
        },
    },
    time: {
        delayedCall: jest.fn(),
    },
    tweens: {
        add: jest.fn(),
    },
    events: {
        emit: jest.fn(),
    },
} as any;

describe('UIManager Battle UI', () => {
    let uiManager: UIManager;

    beforeEach(() => {
        jest.clearAllMocks();
        uiManager = new UIManager(mockScene);
        uiManager.createUI();
    });

    afterEach(() => {
        if (uiManager) {
            uiManager.destroy();
        }
    });

    describe('Battle Status Panel', () => {
        test('should show battle status', () => {
            uiManager.showBattleStatus('Preparing for battle');

            const uiElements = uiManager.getUIElements();
            expect(uiElements.battleStatusPanel?.setVisible).toHaveBeenCalledWith(true);
            expect(uiElements.battleStatusText?.setText).toHaveBeenCalledWith('Preparing for battle');
        });

        test('should hide battle status', () => {
            uiManager.hideBattleStatus();

            const uiElements = uiManager.getUIElements();
            expect(uiElements.battleStatusPanel?.setVisible).toHaveBeenCalledWith(false);
        });

        test('should handle missing battle status elements gracefully', () => {
            // Create a new UI manager without creating UI
            const emptyUIManager = new UIManager(mockScene);

            expect(() => {
                emptyUIManager.showBattleStatus('Test message');
                emptyUIManager.hideBattleStatus();
            }).not.toThrow();
        });
    });

    describe('Damage Numbers', () => {
        test('should show normal damage number', () => {
            uiManager.showDamageNumber(100, 200, 25, false, false);

            expect(mockScene.add.text).toHaveBeenCalledWith(
                100, 200, '25',
                expect.objectContaining({
                    fontSize: '24px',
                    color: '#ff4444',
                    fontFamily: 'Arial Black',
                })
            );

            expect(mockScene.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: expect.any(Object),
                    y: 150, // 200 - 50
                    alpha: 0,
                    duration: 1500,
                })
            );
        });

        test('should show critical damage number', () => {
            uiManager.showDamageNumber(100, 200, 35, true, false);

            expect(mockScene.add.text).toHaveBeenCalledWith(
                100, 200, '35!',
                expect.objectContaining({
                    fontSize: '28px',
                    color: '#ffff44',
                })
            );
        });

        test('should show healing number', () => {
            uiManager.showDamageNumber(100, 200, 15, false, true);

            expect(mockScene.add.text).toHaveBeenCalledWith(
                100, 200, '+15',
                expect.objectContaining({
                    color: '#44ff44',
                })
            );
        });

        test('should handle missing damage display gracefully', () => {
            const emptyUIManager = new UIManager(mockScene);

            expect(() => {
                emptyUIManager.showDamageNumber(100, 200, 25);
            }).not.toThrow();
        });
    });

    describe('Experience Notifications', () => {
        test('should show experience gained', () => {
            uiManager.showExperienceGained(150, 250, 20);

            expect(mockScene.add.text).toHaveBeenCalledWith(
                150, 250, '+20 EXP',
                expect.objectContaining({
                    fontSize: '16px',
                    color: '#44ff44',
                })
            );

            expect(mockScene.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: expect.any(Object),
                    y: 220, // 250 - 30
                    alpha: 0,
                    duration: 2000,
                    delay: 500,
                })
            );
        });

        test('should not show experience for zero or negative values', () => {
            uiManager.showExperienceGained(150, 250, 0);
            uiManager.showExperienceGained(150, 250, -5);

            expect(mockScene.add.text).not.toHaveBeenCalledWith(
                expect.any(Number), expect.any(Number), expect.stringContaining('EXP'),
                expect.any(Object)
            );
        });

        test('should handle missing experience display gracefully', () => {
            const emptyUIManager = new UIManager(mockScene);

            expect(() => {
                emptyUIManager.showExperienceGained(150, 250, 20);
            }).not.toThrow();
        });
    });

    describe('Battle Result Panel', () => {
        const mockBattleResult: BattleResultDisplay = {
            damage: 25,
            isCritical: false,
            isEvaded: false,
            experienceGained: 15,
            targetDefeated: false,
            attacker: 'Hero',
            target: 'Goblin',
        };

        test('should show battle result with normal damage', () => {
            uiManager.showBattleResult(mockBattleResult);

            const uiElements = uiManager.getUIElements();
            expect(uiElements.battleResultPanel?.removeAll).toHaveBeenCalledWith(true);
            expect(uiElements.battleResultPanel?.add).toHaveBeenCalled();
            expect(uiElements.battleResultPanel?.setVisible).toHaveBeenCalledWith(true);

            // Check that title text was created
            expect(mockScene.add.text).toHaveBeenCalledWith(
                200, 30, 'Battle Result',
                expect.objectContaining({
                    fontSize: '24px',
                    fontStyle: 'bold',
                })
            );

            // Check that result details were created
            expect(mockScene.add.text).toHaveBeenCalledWith(
                200, 100,
                expect.stringContaining('Hero attacks Goblin'),
                expect.any(Object)
            );
        });

        test('should show battle result with critical hit', () => {
            const criticalResult = { ...mockBattleResult, isCritical: true, damage: 40 };
            uiManager.showBattleResult(criticalResult);

            expect(mockScene.add.text).toHaveBeenCalledWith(
                200, 100,
                expect.stringContaining('(Critical Hit!)'),
                expect.any(Object)
            );
        });

        test('should show battle result with evasion', () => {
            const evadedResult = { ...mockBattleResult, isEvaded: true };
            uiManager.showBattleResult(evadedResult);

            expect(mockScene.add.text).toHaveBeenCalledWith(
                200, 100,
                expect.stringContaining('Attack evaded!'),
                expect.any(Object)
            );
        });

        test('should show battle result with target defeated', () => {
            const defeatedResult = { ...mockBattleResult, targetDefeated: true };
            uiManager.showBattleResult(defeatedResult);

            expect(mockScene.add.text).toHaveBeenCalledWith(
                200, 100,
                expect.stringContaining('Target defeated!'),
                expect.any(Object)
            );
        });

        test('should show experience gained in result', () => {
            uiManager.showBattleResult(mockBattleResult);

            expect(mockScene.add.text).toHaveBeenCalledWith(
                200, 100,
                expect.stringContaining('Experience gained: 15'),
                expect.any(Object)
            );
        });

        test('should create interactive continue button', () => {
            uiManager.showBattleResult(mockBattleResult);

            expect(mockScene.add.text).toHaveBeenCalledWith(
                200, 160, 'Continue',
                expect.objectContaining({
                    fontSize: '18px',
                    backgroundColor: '#444444',
                })
            );

            // Check that button was made interactive
            const continueButton = mockScene.add.text.mock.results.find(
                result => result.value.setInteractive
            );
            expect(continueButton?.value.setInteractive).toHaveBeenCalled();
        });

        test('should hide battle result', () => {
            uiManager.hideBattleResult();

            const uiElements = uiManager.getUIElements();
            expect(uiElements.battleResultPanel?.setVisible).toHaveBeenCalledWith(false);
        });

        test('should handle missing battle result panel gracefully', () => {
            const emptyUIManager = new UIManager(mockScene);

            expect(() => {
                emptyUIManager.showBattleResult(mockBattleResult);
                emptyUIManager.hideBattleResult();
            }).not.toThrow();
        });
    });

    describe('Error Notifications', () => {
        test('should show error notification', () => {
            const errorData: ErrorNotificationData = {
                message: 'Target is out of range',
                type: 'error',
                duration: 3000,
            };

            uiManager.showErrorNotification(errorData);

            const uiElements = uiManager.getUIElements();
            expect(uiElements.errorNotification?.removeAll).toHaveBeenCalledWith(true);
            expect(uiElements.errorNotification?.setVisible).toHaveBeenCalledWith(true);

            expect(mockScene.add.text).toHaveBeenCalledWith(
                150, 40, 'Target is out of range',
                expect.objectContaining({
                    fontSize: '16px',
                    color: '#ffffff',
                })
            );

            expect(mockScene.time.delayedCall).toHaveBeenCalledWith(3000, expect.any(Function));
        });

        test('should show warning notification with different colors', () => {
            const warningData: ErrorNotificationData = {
                message: 'Unit has low HP',
                type: 'warning',
            };

            uiManager.showErrorNotification(warningData);

            // Check that graphics was called with warning colors
            expect(mockScene.add.graphics).toHaveBeenCalled();
            const graphics = mockScene.add.graphics.mock.results[mockScene.add.graphics.mock.results.length - 1].value;
            expect(graphics.fillStyle).toHaveBeenCalledWith(0x664400, 0.9);
            expect(graphics.lineStyle).toHaveBeenCalledWith(2, 0xffaa00, 1);
        });

        test('should show info notification with different colors', () => {
            const infoData: ErrorNotificationData = {
                message: 'Battle phase changed',
                type: 'info',
            };

            uiManager.showErrorNotification(infoData);

            // Check that graphics was called with info colors
            expect(mockScene.add.graphics).toHaveBeenCalled();
            const graphics = mockScene.add.graphics.mock.results[mockScene.add.graphics.mock.results.length - 1].value;
            expect(graphics.fillStyle).toHaveBeenCalledWith(0x004466, 0.9);
            expect(graphics.lineStyle).toHaveBeenCalledWith(2, 0x0088ff, 1);
        });

        test('should use default duration when not specified', () => {
            const errorData: ErrorNotificationData = {
                message: 'Default duration test',
                type: 'error',
            };

            uiManager.showErrorNotification(errorData);

            expect(mockScene.time.delayedCall).toHaveBeenCalledWith(3000, expect.any(Function));
        });

        test('should hide error notification', () => {
            uiManager.hideErrorNotification();

            const uiElements = uiManager.getUIElements();
            expect(uiElements.errorNotification?.setVisible).toHaveBeenCalledWith(false);
        });

        test('should handle missing error notification gracefully', () => {
            const emptyUIManager = new UIManager(mockScene);

            expect(() => {
                emptyUIManager.showErrorNotification({
                    message: 'Test error',
                    type: 'error',
                });
                emptyUIManager.hideErrorNotification();
            }).not.toThrow();
        });
    });

    describe('UI Resize Handling', () => {
        test('should resize battle UI elements', () => {
            const newWidth = 1024;
            const newHeight = 768;

            uiManager.resize(newWidth, newHeight);

            const uiElements = uiManager.getUIElements();

            // Check battle status panel position
            expect(uiElements.battleStatusPanel?.setPosition).toHaveBeenCalledWith(
                newWidth / 2 - 125, 20
            );

            // Check battle result panel position
            expect(uiElements.battleResultPanel?.setPosition).toHaveBeenCalledWith(
                newWidth / 2 - 200, newHeight / 2 - 100
            );

            // Check error notification position
            expect(uiElements.errorNotification?.setPosition).toHaveBeenCalledWith(
                newWidth / 2 - 150, 100
            );
        });
    });

    describe('UI Element Creation', () => {
        test('should create all battle UI elements during initialization', () => {
            const uiElements = uiManager.getUIElements();

            expect(uiElements.battleStatusPanel).toBeDefined();
            expect(uiElements.damageDisplay).toBeDefined();
            expect(uiElements.experienceDisplay).toBeDefined();
            expect(uiElements.battleResultPanel).toBeDefined();
            expect(uiElements.errorNotification).toBeDefined();
        });

        test('should set correct depths for battle UI elements', () => {
            const uiElements = uiManager.getUIElements();

            // Battle UI should have higher depth than regular UI
            expect(uiElements.battleStatusPanel?.setDepth).toHaveBeenCalledWith(1003);
            expect(uiElements.damageDisplay?.setDepth).toHaveBeenCalledWith(1003);
            expect(uiElements.experienceDisplay?.setDepth).toHaveBeenCalledWith(1003);
            expect(uiElements.battleResultPanel?.setDepth).toHaveBeenCalledWith(1003);

            // Error notifications should have highest depth
            expect(uiElements.errorNotification?.setDepth).toHaveBeenCalledWith(1004);
        });

        test('should initially hide battle UI elements', () => {
            const uiElements = uiManager.getUIElements();

            // Battle UI elements should be hidden initially
            expect(uiElements.battleStatusPanel?.setVisible).toHaveBeenCalledWith(false);
            expect(uiElements.battleResultPanel?.setVisible).toHaveBeenCalledWith(false);
            expect(uiElements.errorNotification?.setVisible).toHaveBeenCalledWith(false);
        });
    });

    describe('Cleanup and Destruction', () => {
        test('should destroy all UI elements including battle UI', () => {
            uiManager.destroy();

            const uiElements = uiManager.getUIElements();
            expect(Object.keys(uiElements)).toHaveLength(0);
        });
    });
});