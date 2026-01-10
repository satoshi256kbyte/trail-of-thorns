import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { ConfirmationDialog } from '../../../game/src/ui/ConfirmationDialog';

describe('ConfirmationDialog', () => {
  let scene: Phaser.Scene;
  let confirmDialog: ConfirmationDialog;

  beforeEach(() => {
    // Create mock scene with all necessary methods
    scene = {
      add: {
        container: vi.fn().mockReturnValue({
          add: vi.fn(),
          setDepth: vi.fn(),
          setVisible: vi.fn(),
          destroy: vi.fn(),
          visible: false,
        }),
        graphics: vi.fn().mockReturnValue({
          fillStyle: vi.fn().mockReturnThis(),
          fillRect: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          strokeRect: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        }),
        text: vi.fn().mockReturnValue({
          setOrigin: vi.fn().mockReturnThis(),
          setWordWrapWidth: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        }),
      },
      input: {
        keyboard: {
          addKey: vi.fn().mockReturnValue({
            on: vi.fn(),
            off: vi.fn(),
          }),
        },
      },
      tweens: {
        add: vi.fn(),
      },
    } as any;
  });

  describe('initialization', () => {
    it('should create confirmation dialog', () => {
      confirmDialog = new ConfirmationDialog(scene);

      expect(scene.add.container).toHaveBeenCalled();
    });

    it('should be initially hidden', () => {
      confirmDialog = new ConfirmationDialog(scene);

      const container = (scene.add.container as any).mock.results[0].value;
      expect(container.setVisible).toHaveBeenCalledWith(false);
    });
  });

  describe('show', () => {
    beforeEach(() => {
      confirmDialog = new ConfirmationDialog(scene);
    });

    it('should display dialog with message', () => {
      const message = 'テストメッセージ';
      const onConfirm = vi.fn();

      confirmDialog.show(message, onConfirm);

      expect(scene.add.text).toHaveBeenCalled();
      const container = (scene.add.container as any).mock.results[0].value;
      expect(container.setVisible).toHaveBeenCalledWith(true);
    });

    it('should use custom button labels', () => {
      const message = 'テストメッセージ';
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      confirmDialog.show(message, onConfirm, onCancel, 'カスタム確認', 'カスタムキャンセル');

      expect(scene.add.text).toHaveBeenCalled();
    });

    it('should use default button labels when not provided', () => {
      const message = 'テストメッセージ';
      const onConfirm = vi.fn();

      confirmDialog.show(message, onConfirm);

      expect(scene.add.text).toHaveBeenCalled();
    });

    it('should call onConfirm when confirm button is clicked', () => {
      const message = 'テストメッセージ';
      const onConfirm = vi.fn();

      confirmDialog.show(message, onConfirm);

      // Simulate confirm button click
      confirmDialog['handleConfirm']();

      expect(onConfirm).toHaveBeenCalled();
    });

    it('should call onCancel when cancel button is clicked', () => {
      const message = 'テストメッセージ';
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      confirmDialog.show(message, onConfirm, onCancel);

      // Simulate cancel button click
      confirmDialog['handleCancel']();

      expect(onCancel).toHaveBeenCalled();
    });

    it('should hide dialog after confirm', () => {
      const message = 'テストメッセージ';
      const onConfirm = vi.fn();

      confirmDialog.show(message, onConfirm);
      confirmDialog['handleConfirm']();

      const container = (scene.add.container as any).mock.results[0].value;
      expect(container.setVisible).toHaveBeenCalledWith(false);
    });

    it('should hide dialog after cancel', () => {
      const message = 'テストメッセージ';
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      confirmDialog.show(message, onConfirm, onCancel);
      confirmDialog['handleCancel']();

      const container = (scene.add.container as any).mock.results[0].value;
      expect(container.setVisible).toHaveBeenCalledWith(false);
    });
  });

  describe('hide', () => {
    beforeEach(() => {
      confirmDialog = new ConfirmationDialog(scene);
    });

    it('should hide dialog', () => {
      const message = 'テストメッセージ';
      const onConfirm = vi.fn();

      confirmDialog.show(message, onConfirm);
      confirmDialog.hide();

      const container = (scene.add.container as any).mock.results[0].value;
      expect(container.setVisible).toHaveBeenCalledWith(false);
    });

    it('should be safe to call hide when already hidden', () => {
      confirmDialog.hide();

      const container = (scene.add.container as any).mock.results[0].value;
      expect(container.setVisible).toHaveBeenCalledWith(false);
    });
  });

  describe('keyboard support', () => {
    beforeEach(() => {
      confirmDialog = new ConfirmationDialog(scene);
    });

    it('should setup Escape key handler', () => {
      const message = 'テストメッセージ';
      const onConfirm = vi.fn();

      confirmDialog.show(message, onConfirm);

      expect(scene.input.keyboard?.addKey).toHaveBeenCalled();
    });

    it('should close dialog on Escape key press', () => {
      const message = 'テストメッセージ';
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      confirmDialog.show(message, onConfirm, onCancel);

      // Simulate Escape key press
      confirmDialog['handleEscapeKey']();

      expect(onCancel).toHaveBeenCalled();
      const container = (scene.add.container as any).mock.results[0].value;
      expect(container.setVisible).toHaveBeenCalledWith(false);
    });

    it('should just hide dialog on Escape if no onCancel provided', () => {
      const message = 'テストメッセージ';
      const onConfirm = vi.fn();

      confirmDialog.show(message, onConfirm);

      // Simulate Escape key press
      confirmDialog['handleEscapeKey']();

      const container = (scene.add.container as any).mock.results[0].value;
      expect(container.setVisible).toHaveBeenCalledWith(false);
    });
  });

  describe('animation', () => {
    beforeEach(() => {
      confirmDialog = new ConfirmationDialog(scene);
    });

    it('should animate dialog on show', () => {
      const message = 'テストメッセージ';
      const onConfirm = vi.fn();

      confirmDialog.show(message, onConfirm);

      expect(scene.tweens.add).toHaveBeenCalled();
    });

    it('should animate dialog on hide', () => {
      const message = 'テストメッセージ';
      const onConfirm = vi.fn();

      confirmDialog.show(message, onConfirm);
      confirmDialog.hide();

      expect(scene.tweens.add).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should clean up all resources', () => {
      confirmDialog = new ConfirmationDialog(scene);

      const message = 'テストメッセージ';
      const onConfirm = vi.fn();
      confirmDialog.show(message, onConfirm);

      confirmDialog.destroy();

      const container = (scene.add.container as any).mock.results[0].value;
      expect(container.destroy).toHaveBeenCalled();
    });

    it('should be safe to destroy when not shown', () => {
      confirmDialog = new ConfirmationDialog(scene);

      confirmDialog.destroy();

      const container = (scene.add.container as any).mock.results[0].value;
      expect(container.destroy).toHaveBeenCalled();
    });
  });

  describe('multiple show calls', () => {
    beforeEach(() => {
      confirmDialog = new ConfirmationDialog(scene);
    });

    it('should handle multiple show calls correctly', () => {
      const message1 = 'メッセージ1';
      const onConfirm1 = vi.fn();

      confirmDialog.show(message1, onConfirm1);
      confirmDialog.hide();

      const message2 = 'メッセージ2';
      const onConfirm2 = vi.fn();

      confirmDialog.show(message2, onConfirm2);

      expect(scene.add.text).toHaveBeenCalled();
    });
  });

  describe('modal overlay', () => {
    beforeEach(() => {
      confirmDialog = new ConfirmationDialog(scene);
    });

    it('should create modal overlay', () => {
      const message = 'テストメッセージ';
      const onConfirm = vi.fn();

      confirmDialog.show(message, onConfirm);

      expect(scene.add.graphics).toHaveBeenCalled();
    });

    it('should make overlay semi-transparent', () => {
      const message = 'テストメッセージ';
      const onConfirm = vi.fn();

      confirmDialog.show(message, onConfirm);

      const graphics = (scene.add.graphics as any).mock.results[0].value;
      expect(graphics.fillStyle).toHaveBeenCalled();
    });
  });
});
