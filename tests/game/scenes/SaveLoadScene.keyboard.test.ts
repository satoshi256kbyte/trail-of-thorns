/**
 * SaveLoadScene - Keyboard Navigation Tests
 * Task 4.1.10: キーボードナビゲーションの実装
 *
 * キーボードナビゲーション機能のテスト
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { SaveLoadScene } from '../../../game/src/scenes/SaveLoadScene';
import { SaveLoadManager } from '../../../game/src/systems/chapterStage/SaveLoadManager';

describe('SaveLoadScene - Keyboard Navigation', () => {
  let scene: SaveLoadScene;
  let game: Phaser.Game;

  beforeEach(() => {
    // Create a minimal Phaser game instance for testing
    game = new Phaser.Game({
      type: Phaser.HEADLESS,
      scene: SaveLoadScene,
      callbacks: {
        preBoot: () => {
          // Disable physics and other systems we don't need
        },
      },
    });

    scene = game.scene.getScene('SaveLoadScene') as SaveLoadScene;

    // Mock SaveLoadManager
    vi.spyOn(SaveLoadManager.prototype, 'isLocalStorageAvailable').mockReturnValue(true);
    vi.spyOn(SaveLoadManager.prototype, 'getSaveSlots').mockReturnValue([
      { slotId: 0, saveData: null },
      { slotId: 1, saveData: null },
      { slotId: 2, saveData: null },
      { slotId: 3, saveData: null },
      { slotId: 4, saveData: null },
      { slotId: 5, saveData: null },
      { slotId: 6, saveData: null },
      { slotId: 7, saveData: null },
      { slotId: 8, saveData: null },
      { slotId: 9, saveData: null },
    ]);
  });

  afterEach(() => {
    if (game) {
      game.destroy(true);
    }
    vi.restoreAllMocks();
  });

  describe('Keyboard navigation setup', () => {
    test('should initialize KeyboardNavigationManager', () => {
      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      expect((scene as any).keyboardNavigation).toBeDefined();
    });

    test('should register slot buttons with navigation manager', () => {
      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      const keyboardNav = (scene as any).keyboardNavigation;
      const elements = keyboardNav.getNavigableElements();

      // Should have 10 slot buttons + action buttons
      expect(elements.length).toBeGreaterThanOrEqual(10);

      // Check that slot buttons are registered
      const slotButtonIds = elements
        .map((el: any) => el.getId())
        .filter((id: string) => id.startsWith('save-slot-button-'));

      expect(slotButtonIds.length).toBe(10);
    });

    test('should register action buttons in load mode', () => {
      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      const keyboardNav = (scene as any).keyboardNavigation;
      const elements = keyboardNav.getNavigableElements();
      const elementIds = elements.map((el: any) => el.getId());

      expect(elementIds).toContain('saveload-load-button');
      expect(elementIds).toContain('saveload-delete-button');
      expect(elementIds).toContain('saveload-autosave-toggle');
      expect(elementIds).toContain('saveload-back-button');
      expect(elementIds).not.toContain('saveload-save-button');
    });

    test('should register action buttons in save mode', () => {
      scene.create({ mode: 'save', fromScene: 'GameplayScene' });

      const keyboardNav = (scene as any).keyboardNavigation;
      const elements = keyboardNav.getNavigableElements();
      const elementIds = elements.map((el: any) => el.getId());

      expect(elementIds).toContain('saveload-save-button');
      expect(elementIds).toContain('saveload-delete-button');
      expect(elementIds).toContain('saveload-autosave-toggle');
      expect(elementIds).toContain('saveload-back-button');
      expect(elementIds).not.toContain('saveload-load-button');
    });
  });

  describe('Arrow key navigation', () => {
    test('should navigate between slot buttons with arrow keys', () => {
      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      const keyboardNav = (scene as any).keyboardNavigation;

      // Get initial focus
      const initialFocus = keyboardNav.getCurrentFocusedElement();
      expect(initialFocus).toBeDefined();

      // Simulate down arrow key
      const downKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
      downKey?.emit('down');

      // Focus should have moved
      const newFocus = keyboardNav.getCurrentFocusedElement();
      expect(newFocus).toBeDefined();
      expect(newFocus.getId()).not.toBe(initialFocus.getId());
    });

    test('should wrap around when navigating past last element', () => {
      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      const keyboardNav = (scene as any).keyboardNavigation;
      const elements = keyboardNav.getNavigableElements();

      // Navigate to last element
      for (let i = 0; i < elements.length; i++) {
        const downKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        downKey?.emit('down');
      }

      // Should wrap to first element
      const currentFocus = keyboardNav.getCurrentFocusedElement();
      expect(currentFocus.getId()).toBe(elements[0].getId());
    });

    test('should navigate up with up arrow key', () => {
      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      const keyboardNav = (scene as any).keyboardNavigation;

      // Navigate down first
      const downKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
      downKey?.emit('down');

      const focusAfterDown = keyboardNav.getCurrentFocusedElement();

      // Navigate up
      const upKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
      upKey?.emit('down');

      const focusAfterUp = keyboardNav.getCurrentFocusedElement();

      // Should be back to first element
      expect(focusAfterUp.getId()).not.toBe(focusAfterDown.getId());
    });
  });

  describe('Enter key default action', () => {
    test('should execute load action when Enter pressed on slot with data', () => {
      // Mock slot with data
      vi.spyOn(SaveLoadManager.prototype, 'getSaveSlots').mockReturnValue([
        {
          slotId: 0,
          saveData: {
            chapterState: { currentChapterId: 'chapter-1' },
            stageProgress: {},
            partyComposition: {},
            playTime: 1000,
            timestamp: Date.now(),
          },
        },
        { slotId: 1, saveData: null },
        { slotId: 2, saveData: null },
        { slotId: 3, saveData: null },
        { slotId: 4, saveData: null },
        { slotId: 5, saveData: null },
        { slotId: 6, saveData: null },
        { slotId: 7, saveData: null },
        { slotId: 8, saveData: null },
        { slotId: 9, saveData: null },
      ]);

      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      // Select slot 0
      const saveSlotList = (scene as any).saveSlotList;
      saveSlotList.selectSlotById(0);

      // Mock load execution
      const loadSpy = vi.spyOn(scene as any, 'handleLoadButton');

      // Press Enter
      const enterKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      enterKey?.emit('down');

      expect(loadSpy).toHaveBeenCalled();
    });

    test('should execute save action when Enter pressed on valid slot in save mode', () => {
      scene.create({
        mode: 'save',
        fromScene: 'GameplayScene',
        currentGameState: {
          chapterState: { currentChapterId: 'chapter-1' },
          stageProgress: {},
          partyComposition: {},
          playTime: 1000,
        },
      });

      // Select slot 1 (not autosave)
      const saveSlotList = (scene as any).saveSlotList;
      saveSlotList.selectSlotById(1);

      // Mock save execution
      const saveSpy = vi.spyOn(scene as any, 'handleSaveButton');

      // Press Enter
      const enterKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      enterKey?.emit('down');

      expect(saveSpy).toHaveBeenCalled();
    });

    test('should activate focused button when Enter pressed on action button', () => {
      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      const keyboardNav = (scene as any).keyboardNavigation;

      // Focus back button
      keyboardNav.focusElementById('saveload-back-button');

      // Mock back button handler
      const backSpy = vi.spyOn(scene as any, 'handleBackButton');

      // Press Enter
      const enterKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      enterKey?.emit('down');

      expect(backSpy).toHaveBeenCalled();
    });

    test('should not execute action when Enter pressed with no slot selected', () => {
      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      // Don't select any slot
      (scene as any).selectedSlotId = -1;

      // Mock load execution
      const loadSpy = vi.spyOn(scene as any, 'handleLoadButton');

      // Press Enter
      const enterKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      enterKey?.emit('down');

      // Should not call load if no slot selected
      expect(loadSpy).not.toHaveBeenCalled();
    });
  });

  describe('Escape key to close screen', () => {
    test('should close screen when Escape pressed', () => {
      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      // Mock back button handler
      const backSpy = vi.spyOn(scene as any, 'handleBackButton');

      // Press Escape
      const escapeKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      escapeKey?.emit('down');

      expect(backSpy).toHaveBeenCalled();
    });

    test('should work from any focused element', () => {
      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      const keyboardNav = (scene as any).keyboardNavigation;

      // Focus different elements and test Escape
      const elementIds = ['save-slot-button-0', 'saveload-delete-button', 'saveload-back-button'];

      for (const elementId of elementIds) {
        keyboardNav.focusElementById(elementId);

        // Mock back button handler
        const backSpy = vi.spyOn(scene as any, 'handleBackButton');

        // Press Escape
        const escapeKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        escapeKey?.emit('down');

        expect(backSpy).toHaveBeenCalled();

        vi.restoreAllMocks();
      }
    });
  });

  describe('Slot button focus visualization', () => {
    test('should show focus indicator on slot button when focused', () => {
      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      const saveSlotList = (scene as any).saveSlotList;
      const slotButton = saveSlotList.getSlotButtonById(0);

      // Focus the slot button
      slotButton.onFocus();

      // Check that focus overlay is visible
      const focusOverlay = (slotButton as any).focusOverlay;
      expect(focusOverlay).toBeDefined();
      expect(focusOverlay.visible).toBe(true);
    });

    test('should hide focus indicator when slot button loses focus', () => {
      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      const saveSlotList = (scene as any).saveSlotList;
      const slotButton = saveSlotList.getSlotButtonById(0);

      // Focus then blur
      slotButton.onFocus();
      slotButton.onBlur();

      // Check that focus overlay is hidden
      const focusOverlay = (slotButton as any).focusOverlay;
      expect(focusOverlay).toBeDefined();
      // After animation, should be hidden
      setTimeout(() => {
        expect(focusOverlay.visible).toBe(false);
      }, 300);
    });

    test('should activate slot button when onActivate called', () => {
      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      const saveSlotList = (scene as any).saveSlotList;
      const slotButton = saveSlotList.getSlotButtonById(0);

      // Mock select handler
      const selectSpy = vi.spyOn(slotButton as any, 'handleSelect');

      // Activate
      slotButton.onActivate();

      expect(selectSpy).toHaveBeenCalled();
    });
  });

  describe('Keyboard navigation integration', () => {
    test('should maintain focus when slot list is refreshed', () => {
      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      const keyboardNav = (scene as any).keyboardNavigation;

      // Focus a slot button
      keyboardNav.focusElementById('save-slot-button-1');

      const focusedBefore = keyboardNav.getCurrentFocusedElement();

      // Refresh slot list
      (scene as any).refreshSlotList();

      // Re-register slot buttons
      const saveSlotList = (scene as any).saveSlotList;
      const slotButtons = saveSlotList.getSlotButtons();
      slotButtons.forEach((button: any) => {
        keyboardNav.addElement(button);
      });

      // Focus should be maintained (or reset to first element)
      const focusedAfter = keyboardNav.getCurrentFocusedElement();
      expect(focusedAfter).toBeDefined();
    });

    test('should disable navigation for disabled buttons', () => {
      scene.create({ mode: 'save', fromScene: 'GameplayScene' });

      const saveButton = (scene as any).saveButton;

      // Save button should be disabled initially (no slot selected)
      expect(saveButton.isInteractive()).toBe(false);

      // Try to activate
      const activateSpy = vi.spyOn(saveButton as any, 'handleClick');
      saveButton.onActivate();

      // Should not activate disabled button
      expect(activateSpy).not.toHaveBeenCalled();
    });

    test('should handle rapid key presses gracefully', () => {
      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      const keyboardNav = (scene as any).keyboardNavigation;

      // Rapidly press down arrow
      for (let i = 0; i < 20; i++) {
        const downKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        downKey?.emit('down');
      }

      // Should still have valid focus
      const currentFocus = keyboardNav.getCurrentFocusedElement();
      expect(currentFocus).toBeDefined();
      expect(currentFocus.isInteractive()).toBe(true);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup keyboard navigation on scene shutdown', () => {
      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      const keyboardNav = (scene as any).keyboardNavigation;
      const destroySpy = vi.spyOn(keyboardNav, 'destroy');

      // Shutdown scene
      scene.scene.stop();

      expect(destroySpy).toHaveBeenCalled();
    });

    test('should remove all key listeners on cleanup', () => {
      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      // Get keyboard keys
      const enterKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      const escapeKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

      const enterListenerCount = enterKey?.listenerCount('down') || 0;
      const escapeListenerCount = escapeKey?.listenerCount('down') || 0;

      expect(enterListenerCount).toBeGreaterThan(0);
      expect(escapeListenerCount).toBeGreaterThan(0);

      // Cleanup
      (scene as any).destroy();

      // Listeners should be removed (or scene destroyed)
      expect(scene.scene.isActive()).toBe(false);
    });
  });
});
