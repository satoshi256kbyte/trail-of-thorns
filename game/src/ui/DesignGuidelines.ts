/**
 * DesignGuidelines - Centralized UI/UX design system for consistent visual presentation
 *
 * This module defines the design guidelines and constants used throughout the game
 * to ensure visual consistency and proper hierarchy in UI elements.
 *
 * Implements requirements 9.1, 9.2, 9.3, 9.4, 9.5 from the character loss system specification
 */

/**
 * Color palette for consistent theming
 */
export const Colors = {
  // Primary colors
  PRIMARY: 0x2c3e50,
  PRIMARY_LIGHT: 0x34495e,
  PRIMARY_DARK: 0x1a252f,

  // Secondary colors
  SECONDARY: 0x3498db,
  SECONDARY_LIGHT: 0x5dade2,
  SECONDARY_DARK: 0x2980b9,

  // Status colors
  SUCCESS: 0x27ae60,
  SUCCESS_LIGHT: 0x2ecc71,
  WARNING: 0xf39c12,
  WARNING_LIGHT: 0xf1c40f,
  ERROR: 0xe74c3c,
  ERROR_LIGHT: 0xec7063,
  INFO: 0x3498db,
  INFO_LIGHT: 0x5dade2,

  // Character loss specific colors
  LOSS_CRITICAL: 0xff0000, // Bright red for critical danger
  LOSS_HIGH: 0xff4444, // Red for high danger
  LOSS_MEDIUM: 0xff8800, // Orange for medium danger
  LOSS_LOW: 0xffaa00, // Yellow-orange for low danger
  LOSS_GRAYOUT: 0x666666, // Gray for lost characters
  LOSS_UNAVAILABLE: 0x444444, // Dark gray for unavailable

  // Text colors
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#cccccc',
  TEXT_MUTED: '#999999',
  TEXT_DISABLED: '#666666',
  TEXT_SUCCESS: '#2ecc71',
  TEXT_WARNING: '#f1c40f',
  TEXT_ERROR: '#e74c3c',

  // Background colors
  BACKGROUND_DARK: 0x000000,
  BACKGROUND_SEMI: 0x1a1a1a,
  BACKGROUND_LIGHT: 0x2c2c2c,
  BACKGROUND_OVERLAY: 0x000000, // With alpha

  // UI element colors
  BUTTON_DEFAULT: 0x2c3e50,
  BUTTON_HOVER: 0x3498db,
  BUTTON_PRESSED: 0x2980b9,
  BUTTON_DISABLED: 0x7f8c8d,

  // Border colors
  BORDER_DEFAULT: 0xffffff,
  BORDER_ACTIVE: 0x3498db,
  BORDER_ERROR: 0xe74c3c,
  BORDER_SUCCESS: 0x27ae60,
  BORDER_WARNING: 0xf39c12,
} as const;

/**
 * Typography settings for consistent text rendering
 */
export const Typography = {
  // Font families
  FONT_PRIMARY: 'Arial, sans-serif',
  FONT_SECONDARY: 'Arial Black, sans-serif',
  FONT_MONOSPACE: 'Courier New, monospace',

  // Font sizes
  SIZE_HUGE: '48px',
  SIZE_LARGE: '32px',
  SIZE_TITLE: '24px',
  SIZE_SUBTITLE: '20px',
  SIZE_BODY: '16px',
  SIZE_SMALL: '14px',
  SIZE_TINY: '12px',

  // Font weights
  WEIGHT_NORMAL: 'normal',
  WEIGHT_BOLD: 'bold',

  // Line heights
  LINE_HEIGHT_TIGHT: 1.2,
  LINE_HEIGHT_NORMAL: 1.4,
  LINE_HEIGHT_LOOSE: 1.6,

  // Text styles for specific UI elements
  TITLE: {
    fontSize: '24px',
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'bold',
    color: '#ffffff',
  },
  SUBTITLE: {
    fontSize: '20px',
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'normal',
    color: '#cccccc',
  },
  BODY: {
    fontSize: '16px',
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'normal',
    color: '#ffffff',
  },
  SMALL: {
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'normal',
    color: '#cccccc',
  },
  BUTTON: {
    fontSize: '16px',
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'normal',
    color: '#ffffff',
  },
  ERROR: {
    fontSize: '16px',
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'normal',
    color: '#e74c3c',
  },
  WARNING: {
    fontSize: '16px',
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'normal',
    color: '#f1c40f',
  },
  SUCCESS: {
    fontSize: '16px',
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'normal',
    color: '#2ecc71',
  },
} as const;

/**
 * Spacing and layout constants
 */
export const Spacing = {
  // Padding values
  PADDING_TINY: 4,
  PADDING_SMALL: 8,
  PADDING_MEDIUM: 16,
  PADDING_LARGE: 24,
  PADDING_HUGE: 32,

  // Margin values
  MARGIN_TINY: 4,
  MARGIN_SMALL: 8,
  MARGIN_MEDIUM: 16,
  MARGIN_LARGE: 24,
  MARGIN_HUGE: 32,

  // Border radius values
  RADIUS_SMALL: 4,
  RADIUS_MEDIUM: 8,
  RADIUS_LARGE: 12,
  RADIUS_HUGE: 16,

  // Component sizes
  BUTTON_HEIGHT: 40,
  BUTTON_HEIGHT_SMALL: 32,
  BUTTON_HEIGHT_LARGE: 48,
  INPUT_HEIGHT: 36,
  PANEL_MIN_WIDTH: 200,
  PANEL_MIN_HEIGHT: 100,
} as const;

/**
 * Animation and transition settings
 */
export const Animation = {
  // Duration values (in milliseconds)
  DURATION_FAST: 150,
  DURATION_NORMAL: 300,
  DURATION_SLOW: 500,
  DURATION_VERY_SLOW: 800,

  // Easing functions
  EASE_IN: 'Power2.easeIn',
  EASE_OUT: 'Power2.easeOut',
  EASE_IN_OUT: 'Power2.easeInOut',
  EASE_BACK_OUT: 'Back.easeOut',
  EASE_ELASTIC: 'Elastic.easeOut',
  EASE_BOUNCE: 'Bounce.easeOut',

  // Common animation presets
  FADE_IN: {
    alpha: { from: 0, to: 1 },
    duration: 300,
    ease: 'Power2.easeOut',
  },
  FADE_OUT: {
    alpha: { from: 1, to: 0 },
    duration: 300,
    ease: 'Power2.easeIn',
  },
  SCALE_IN: {
    scale: { from: 0.8, to: 1 },
    alpha: { from: 0, to: 1 },
    duration: 300,
    ease: 'Back.easeOut',
  },
  SCALE_OUT: {
    scale: { from: 1, to: 0.8 },
    alpha: { from: 1, to: 0 },
    duration: 200,
    ease: 'Power2.easeIn',
  },
  SLIDE_UP: {
    y: { from: 50, to: 0 },
    alpha: { from: 0, to: 1 },
    duration: 300,
    ease: 'Power2.easeOut',
  },
  SLIDE_DOWN: {
    y: { from: -50, to: 0 },
    alpha: { from: 0, to: 1 },
    duration: 300,
    ease: 'Power2.easeOut',
  },
} as const;

/**
 * Z-depth layers for proper UI stacking
 */
export const Depth = {
  // Background layers
  BACKGROUND: -100,
  MAP_BACKGROUND: -50,

  // Game world layers
  TERRAIN: 0,
  OBJECTS: 100,
  CHARACTERS: 200,
  EFFECTS: 300,

  // UI layers
  UI_BACKGROUND: 1000,
  UI_ELEMENTS: 1100,
  UI_PANELS: 1200,
  UI_MODALS: 1300,
  UI_TOOLTIPS: 1400,
  UI_NOTIFICATIONS: 1500,
  UI_OVERLAYS: 1600,

  // Character loss specific layers
  LOSS_INDICATORS: 1250,
  LOSS_WARNINGS: 1350,
  LOSS_DIALOGS: 1450,
  LOSS_NOTIFICATIONS: 1550,
} as const;

/**
 * Priority levels for UI elements and notifications
 */
export const Priority = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
  EMERGENCY: 5,
} as const;

/**
 * Character loss specific design constants
 */
export const CharacterLoss = {
  // Danger level colors
  DANGER_COLORS: {
    NONE: Colors.TEXT_PRIMARY,
    LOW: Colors.LOSS_LOW,
    MEDIUM: Colors.LOSS_MEDIUM,
    HIGH: Colors.LOSS_HIGH,
    CRITICAL: Colors.LOSS_CRITICAL,
  },

  // Grayout alpha values
  GRAYOUT_ALPHA: {
    LOST: 0.3,
    UNAVAILABLE: 0.5,
    AVAILABLE: 1.0,
  },

  // Warning display durations
  WARNING_DURATION: {
    SHORT: 2000,
    MEDIUM: 3000,
    LONG: 5000,
    PERSISTENT: -1, // Never auto-hide
  },

  // Icon symbols
  ICONS: {
    LOST: '✗',
    WARNING: '⚠',
    DANGER: '⚡',
    UNAVAILABLE: '🚫',
    SUCCESS: '✓',
  },

  // Panel sizes
  PANEL_SIZES: {
    TOOLTIP: { width: 200, height: 60 },
    WARNING: { width: 300, height: 80 },
    CONFIRMATION: { width: 400, height: 150 },
    SUMMARY: { width: 500, height: 300 },
  },
} as const;

/**
 * Accessibility settings
 */
export const Accessibility = {
  // Minimum contrast ratios
  CONTRAST_NORMAL: 4.5,
  CONTRAST_LARGE: 3.0,

  // Minimum touch target sizes
  TOUCH_TARGET_MIN: 44,
  TOUCH_TARGET_RECOMMENDED: 48,

  // Animation preferences
  REDUCED_MOTION_DURATION: 100,
  REDUCED_MOTION_EASE: 'Linear',

  // Focus indicators
  FOCUS_OUTLINE_WIDTH: 2,
  FOCUS_OUTLINE_COLOR: Colors.SECONDARY,
  FOCUS_OUTLINE_OFFSET: 2,
} as const;

/**
 * Responsive breakpoints
 */
export const Breakpoints = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1440,
  LARGE_DESKTOP: 1920,
} as const;

/**
 * Utility functions for design system
 */
export class DesignUtils {
  /**
   * Get color value for danger level
   */
  static getDangerColor(level: string): number {
    switch (level.toLowerCase()) {
      case 'critical':
        return CharacterLoss.DANGER_COLORS.CRITICAL;
      case 'high':
        return CharacterLoss.DANGER_COLORS.HIGH;
      case 'medium':
        return CharacterLoss.DANGER_COLORS.MEDIUM;
      case 'low':
        return CharacterLoss.DANGER_COLORS.LOW;
      default:
        return CharacterLoss.DANGER_COLORS.NONE;
    }
  }

  /**
   * Get alpha value for character state
   */
  static getCharacterAlpha(state: 'lost' | 'unavailable' | 'available'): number {
    switch (state) {
      case 'lost':
        return CharacterLoss.GRAYOUT_ALPHA.LOST;
      case 'unavailable':
        return CharacterLoss.GRAYOUT_ALPHA.UNAVAILABLE;
      case 'available':
        return CharacterLoss.GRAYOUT_ALPHA.AVAILABLE;
      default:
        return CharacterLoss.GRAYOUT_ALPHA.AVAILABLE;
    }
  }

  /**
   * Get warning duration based on priority
   */
  static getWarningDuration(priority: number): number {
    switch (priority) {
      case Priority.LOW:
        return CharacterLoss.WARNING_DURATION.SHORT;
      case Priority.MEDIUM:
        return CharacterLoss.WARNING_DURATION.MEDIUM;
      case Priority.HIGH:
        return CharacterLoss.WARNING_DURATION.LONG;
      case Priority.CRITICAL:
      case Priority.EMERGENCY:
        return CharacterLoss.WARNING_DURATION.PERSISTENT;
      default:
        return CharacterLoss.WARNING_DURATION.MEDIUM;
    }
  }

  /**
   * Create consistent text style object
   */
  static createTextStyle(
    size: string,
    color: string,
    family: string = Typography.FONT_PRIMARY,
    weight: string = Typography.WEIGHT_NORMAL
  ): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontSize: size,
      color: color,
      fontFamily: family,
      fontStyle: weight,
      stroke: '#000000',
      strokeThickness: 1,
    };
  }

  /**
   * Create consistent panel background
   */
  static createPanelBackground(
    scene: Phaser.Scene,
    width: number,
    height: number,
    backgroundColor: number = Colors.BACKGROUND_SEMI,
    borderColor: number = Colors.BORDER_DEFAULT,
    borderWidth: number = 2,
    radius: number = Spacing.RADIUS_MEDIUM
  ): Phaser.GameObjects.Graphics {
    return scene.add
      .graphics()
      .fillStyle(backgroundColor, 0.9)
      .fillRoundedRect(0, 0, width, height, radius)
      .lineStyle(borderWidth, borderColor, 1)
      .strokeRoundedRect(0, 0, width, height, radius);
  }

  /**
   * Create consistent button style
   */
  static createButtonStyle(
    enabled: boolean = true,
    variant: 'primary' | 'secondary' | 'danger' | 'success' = 'primary'
  ): {
    backgroundColor: number;
    hoverColor: number;
    pressedColor: number;
    textColor: string;
    disabledColor: number;
  } {
    const baseColors = {
      primary: {
        backgroundColor: Colors.BUTTON_DEFAULT,
        hoverColor: Colors.BUTTON_HOVER,
        pressedColor: Colors.BUTTON_PRESSED,
        textColor: Colors.TEXT_PRIMARY,
      },
      secondary: {
        backgroundColor: Colors.PRIMARY_LIGHT,
        hoverColor: Colors.SECONDARY_LIGHT,
        pressedColor: Colors.SECONDARY_DARK,
        textColor: Colors.TEXT_PRIMARY,
      },
      danger: {
        backgroundColor: Colors.ERROR,
        hoverColor: Colors.ERROR_LIGHT,
        pressedColor: Colors.ERROR,
        textColor: Colors.TEXT_PRIMARY,
      },
      success: {
        backgroundColor: Colors.SUCCESS,
        hoverColor: Colors.SUCCESS_LIGHT,
        pressedColor: Colors.SUCCESS,
        textColor: Colors.TEXT_PRIMARY,
      },
    };

    return {
      ...baseColors[variant],
      disabledColor: Colors.BUTTON_DISABLED,
    };
  }

  /**
   * Apply consistent hover effect to interactive element
   */
  static applyHoverEffect(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    options: {
      scale?: number;
      tint?: number;
      alpha?: number;
      duration?: number;
    } = {}
  ): void {
    const {
      scale = 1.05,
      tint = 0xffffff,
      alpha = 1.0,
      duration = Animation.DURATION_FAST,
    } = options;

    if (
      target instanceof Phaser.GameObjects.Container ||
      target instanceof Phaser.GameObjects.Sprite ||
      target instanceof Phaser.GameObjects.Text
    ) {
      target.setInteractive();

      target.on('pointerover', () => {
        scene.tweens.add({
          targets: target,
          scaleX: scale,
          scaleY: scale,
          alpha: alpha,
          duration: duration,
          ease: Animation.EASE_OUT,
        });

        if ('setTint' in target && tint !== 0xffffff) {
          (target as any).setTint(tint);
        }
      });

      target.on('pointerout', () => {
        scene.tweens.add({
          targets: target,
          scaleX: 1,
          scaleY: 1,
          alpha: 1,
          duration: duration,
          ease: Animation.EASE_OUT,
        });

        if ('clearTint' in target) {
          (target as any).clearTint();
        }
      });
    }
  }

  /**
   * Create consistent notification display
   */
  static createNotification(
    scene: Phaser.Scene,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    position: { x: number; y: number } = { x: 0, y: 0 },
    duration: number = CharacterLoss.WARNING_DURATION.MEDIUM
  ): Phaser.GameObjects.Container {
    const colors = {
      info: { bg: Colors.INFO, border: Colors.INFO_LIGHT, text: Colors.TEXT_PRIMARY },
      success: { bg: Colors.SUCCESS, border: Colors.SUCCESS_LIGHT, text: Colors.TEXT_PRIMARY },
      warning: { bg: Colors.WARNING, border: Colors.WARNING_LIGHT, text: Colors.TEXT_PRIMARY },
      error: { bg: Colors.ERROR, border: Colors.ERROR_LIGHT, text: Colors.TEXT_PRIMARY },
    };

    const color = colors[type];
    const width = Math.max(CharacterLoss.PANEL_SIZES.WARNING.width, message.length * 8);
    const height = CharacterLoss.PANEL_SIZES.WARNING.height;

    const container = scene.add.container(position.x, position.y);

    const background = DesignUtils.createPanelBackground(
      scene,
      width,
      height,
      color.bg,
      color.border
    );

    const text = scene.add
      .text(width / 2, height / 2, message, {
        ...Typography.BODY,
        color: color.text,
        align: 'center',
        wordWrap: { width: width - Spacing.PADDING_MEDIUM * 2 },
      })
      .setOrigin(0.5);

    container.add([background, text]);

    // Auto-hide if duration is specified
    if (duration > 0) {
      scene.time.delayedCall(duration, () => {
        scene.tweens.add({
          targets: container,
          alpha: 0,
          duration: Animation.DURATION_FAST,
          ease: Animation.EASE_IN,
          onComplete: () => container.destroy(),
        });
      });
    }

    return container;
  }
}

/**
 * Export all design system components
 */
export const DesignSystem = {
  Colors,
  Typography,
  Spacing,
  Animation,
  Depth,
  Priority,
  CharacterLoss,
  Accessibility,
  Breakpoints,
  DesignUtils,
} as const;

export default DesignSystem;
