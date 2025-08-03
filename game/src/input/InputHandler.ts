/**
 * InputHandler - Manages user input processing for the gameplay scene
 *
 * This class handles:
 * - Mouse click handling for character and tile selection
 * - Keyboard input processing for camera controls and shortcuts
 * - Input validation to prevent invalid actions during enemy turns
 * - Event emission for input-related actions
 */

import { Position, Unit, GameState, GameplayError, GameplayErrorResult } from '../types/gameplay';

export interface InputConfig {
  /** Enable/disable mouse input */
  mouseEnabled: boolean;
  /** Enable/disable keyboard input */
  keyboardEnabled: boolean;
  /** Enable/disable touch input for mobile */
  touchEnabled: boolean;
  /** Double-click detection time in milliseconds */
  doubleClickTime: number;
  /** Drag threshold in pixels before considering it a drag operation */
  dragThreshold: number;
  /** Input validation enabled */
  validationEnabled: boolean;
}

export interface ClickInfo {
  /** World position of the click */
  worldPosition: Position;
  /** Screen position of the click */
  screenPosition: Position;
  /** Grid position (if applicable) */
  gridPosition?: Position;
  /** Clicked unit (if any) */
  unit?: Unit;
  /** Click type */
  type: 'single' | 'double' | 'right';
  /** Timestamp of the click */
  timestamp: number;
}

export interface KeyboardInfo {
  /** Key that was pressed */
  key: string;
  /** Key code */
  keyCode: number;
  /** Modifier keys state */
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
  };
  /** Timestamp of the key press */
  timestamp: number;
}

export interface InputValidationResult {
  /** Whether the input is valid */
  valid: boolean;
  /** Reason for invalidity (if applicable) */
  reason?: string;
  /** Error type */
  error?: GameplayError;
}

export class InputHandler {
  private scene: Phaser.Scene;
  private eventEmitter?: Phaser.Events.EventEmitter;
  private config: InputConfig;

  // Input state
  private isEnabled: boolean = true;
  private lastClickTime: number = 0;
  private lastClickPosition?: Position;
  private isDragging: boolean = false;
  private dragStartPosition?: Position;

  // Game state reference for validation
  private gameState?: GameState;
  private tileSize: number = 32; // Default tile size, should be set from map data

  // Input callbacks
  private characterSelectionCallback?: (unit: Unit | null, clickInfo: ClickInfo) => void;
  private tileSelectionCallback?: (position: Position, clickInfo: ClickInfo) => void;
  private cameraControlCallback?: (
    direction: 'up' | 'down' | 'left' | 'right',
    deltaTime: number
  ) => void;
  private shortcutCallback?: (shortcut: string, keyInfo: KeyboardInfo) => void;

  // Default configuration
  private static readonly DEFAULT_CONFIG: InputConfig = {
    mouseEnabled: true,
    keyboardEnabled: true,
    touchEnabled: true,
    doubleClickTime: 300,
    dragThreshold: 10,
    validationEnabled: true,
  };

  constructor(
    scene: Phaser.Scene,
    config?: Partial<InputConfig>,
    eventEmitter?: Phaser.Events.EventEmitter
  ) {
    this.scene = scene;
    this.config = { ...InputHandler.DEFAULT_CONFIG, ...config };
    this.eventEmitter = eventEmitter;

    this.initializeInput();
  }

  /**
   * Initialize input handling
   */
  private initializeInput(): void {
    if (this.config.mouseEnabled) {
      this.setupMouseInput();
    }

    if (this.config.keyboardEnabled) {
      this.setupKeyboardInput();
    }

    if (this.config.touchEnabled) {
      this.setupTouchInput();
    }

    this.eventEmitter?.emit('input-initialized', {
      config: this.config,
    });
  }

  /**
   * Setup mouse input handling
   */
  private setupMouseInput(): void {
    // Left click handling
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isEnabled || pointer.rightButtonDown()) return;

      this.handlePointerDown(pointer);
    });

    // Right click handling
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isEnabled || !pointer.rightButtonDown()) return;

      this.handleRightClick(pointer);
    });

    // Pointer up handling (for click completion)
    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isEnabled) return;

      this.handlePointerUp(pointer);
    });

    // Pointer move handling (for drag detection)
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isEnabled) return;

      this.handlePointerMove(pointer);
    });

    // Mouse wheel handling for zoom
    this.scene.input.on(
      'wheel',
      (
        pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[],
        deltaX: number,
        deltaY: number,
        deltaZ: number
      ) => {
        if (!this.isEnabled) return;

        this.handleMouseWheel(deltaY);
      }
    );
  }

  /**
   * Setup keyboard input handling
   */
  private setupKeyboardInput(): void {
    if (!this.scene.input.keyboard) return;

    // Key down handling
    this.scene.input.keyboard.on('keydown', (event: KeyboardEvent) => {
      if (!this.isEnabled) return;

      this.handleKeyDown(event);
    });

    // Key up handling
    this.scene.input.keyboard.on('keyup', (event: KeyboardEvent) => {
      if (!this.isEnabled) return;

      this.handleKeyUp(event);
    });
  }

  /**
   * Setup touch input handling
   */
  private setupTouchInput(): void {
    // Touch start
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isEnabled || !pointer.isDown || pointer.button !== 0) return;

      // Handle touch as mouse click for now
      // Can be extended for touch-specific gestures
    });
  }

  /**
   * Handle pointer down events
   */
  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    const worldPosition = this.screenToWorldPosition(pointer.x, pointer.y);
    const currentTime = Date.now();

    // Store drag start position
    this.dragStartPosition = { x: pointer.x, y: pointer.y };
    this.isDragging = false;

    // Check for double-click
    const isDoubleClick =
      this.lastClickTime > 0 &&
      currentTime - this.lastClickTime < this.config.doubleClickTime &&
      this.lastClickPosition &&
      this.getDistance(worldPosition, this.lastClickPosition) < this.config.dragThreshold;

    this.lastClickTime = currentTime;
    this.lastClickPosition = worldPosition;

    // Don't process the click immediately - wait for pointer up to avoid drag conflicts
    this.eventEmitter?.emit('pointer-down', {
      worldPosition,
      screenPosition: { x: pointer.x, y: pointer.y },
      isDoubleClick,
      timestamp: currentTime,
    });
  }

  /**
   * Handle pointer up events (actual click processing)
   */
  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.dragStartPosition) return;

    const worldPosition = this.screenToWorldPosition(pointer.x, pointer.y);
    const currentTime = Date.now();

    // Check if this was a drag operation
    const dragDistance = this.getDistance({ x: pointer.x, y: pointer.y }, this.dragStartPosition);

    if (dragDistance > this.config.dragThreshold) {
      this.isDragging = true;
      this.handleDragEnd(pointer);
      return;
    }

    // Process as click
    const isDoubleClick =
      this.lastClickTime > 0 &&
      currentTime - this.lastClickTime < this.config.doubleClickTime &&
      this.lastClickPosition &&
      this.getDistance(worldPosition, this.lastClickPosition) < this.config.dragThreshold;

    const clickInfo: ClickInfo = {
      worldPosition,
      screenPosition: { x: pointer.x, y: pointer.y },
      gridPosition: this.worldToGridPosition(worldPosition),
      type: isDoubleClick ? 'double' : 'single',
      timestamp: currentTime,
    };

    this.processClick(clickInfo);

    // Reset drag state
    this.dragStartPosition = undefined;
    this.isDragging = false;
  }

  /**
   * Handle right click events
   */
  private handleRightClick(pointer: Phaser.Input.Pointer): void {
    const worldPosition = this.screenToWorldPosition(pointer.x, pointer.y);

    const clickInfo: ClickInfo = {
      worldPosition,
      screenPosition: { x: pointer.x, y: pointer.y },
      gridPosition: this.worldToGridPosition(worldPosition),
      type: 'right',
      timestamp: Date.now(),
    };

    // Right-click typically cancels selection or shows context menu
    this.eventEmitter?.emit('right-click', clickInfo);

    // Cancel current selection
    if (this.characterSelectionCallback) {
      this.characterSelectionCallback(null, clickInfo);
    }
  }

  /**
   * Handle pointer move events
   */
  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragStartPosition || !pointer.isDown) return;

    const dragDistance = this.getDistance({ x: pointer.x, y: pointer.y }, this.dragStartPosition);

    if (dragDistance > this.config.dragThreshold && !this.isDragging) {
      this.isDragging = true;
      this.handleDragStart(pointer);
    }

    if (this.isDragging) {
      this.handleDragMove(pointer);
    }
  }

  /**
   * Handle drag start
   */
  private handleDragStart(pointer: Phaser.Input.Pointer): void {
    const worldPosition = this.screenToWorldPosition(pointer.x, pointer.y);

    this.eventEmitter?.emit('drag-start', {
      startPosition: this.screenToWorldPosition(
        this.dragStartPosition!.x,
        this.dragStartPosition!.y
      ),
      currentPosition: worldPosition,
      screenPosition: { x: pointer.x, y: pointer.y },
    });
  }

  /**
   * Handle drag move
   */
  private handleDragMove(pointer: Phaser.Input.Pointer): void {
    const worldPosition = this.screenToWorldPosition(pointer.x, pointer.y);

    this.eventEmitter?.emit('drag-move', {
      startPosition: this.screenToWorldPosition(
        this.dragStartPosition!.x,
        this.dragStartPosition!.y
      ),
      currentPosition: worldPosition,
      screenPosition: { x: pointer.x, y: pointer.y },
    });
  }

  /**
   * Handle drag end
   */
  private handleDragEnd(pointer: Phaser.Input.Pointer): void {
    const worldPosition = this.screenToWorldPosition(pointer.x, pointer.y);

    this.eventEmitter?.emit('drag-end', {
      startPosition: this.screenToWorldPosition(
        this.dragStartPosition!.x,
        this.dragStartPosition!.y
      ),
      endPosition: worldPosition,
      screenPosition: { x: pointer.x, y: pointer.y },
    });

    this.dragStartPosition = undefined;
    this.isDragging = false;
  }

  /**
   * Handle mouse wheel events
   */
  private handleMouseWheel(deltaY: number): void {
    const zoomDirection = deltaY > 0 ? 'out' : 'in';
    const zoomAmount = Math.abs(deltaY) / 1000; // Normalize wheel delta

    this.eventEmitter?.emit('mouse-wheel', {
      direction: zoomDirection,
      amount: zoomAmount,
      deltaY,
    });
  }

  /**
   * Handle key down events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const keyInfo: KeyboardInfo = {
      key: event.key,
      keyCode: event.keyCode,
      modifiers: {
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
      },
      timestamp: Date.now(),
    };

    // Process camera controls
    this.processCameraControls(keyInfo);

    // Process shortcuts
    this.processShortcuts(keyInfo);

    this.eventEmitter?.emit('key-down', keyInfo);
  }

  /**
   * Handle key up events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    const keyInfo: KeyboardInfo = {
      key: event.key,
      keyCode: event.keyCode,
      modifiers: {
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
      },
      timestamp: Date.now(),
    };

    this.eventEmitter?.emit('key-up', keyInfo);
  }

  /**
   * Process click events
   */
  private processClick(clickInfo: ClickInfo): void {
    // Validate input if validation is enabled
    if (this.config.validationEnabled) {
      const validation = this.validateInput(clickInfo);
      if (!validation.valid) {
        this.eventEmitter?.emit('input-invalid', {
          clickInfo,
          validation,
        });
        return;
      }
    }

    // Check if click hit a character
    const clickedUnit = this.getUnitAtPosition(clickInfo.worldPosition);
    if (clickedUnit) {
      clickInfo.unit = clickedUnit;

      // Handle character selection
      if (this.characterSelectionCallback) {
        this.characterSelectionCallback(clickedUnit, clickInfo);
      }

      this.eventEmitter?.emit('character-clicked', {
        unit: clickedUnit,
        clickInfo,
      });
    } else {
      // Handle tile selection
      if (this.tileSelectionCallback && clickInfo.gridPosition) {
        this.tileSelectionCallback(clickInfo.gridPosition, clickInfo);
      }

      this.eventEmitter?.emit('tile-clicked', {
        position: clickInfo.gridPosition || clickInfo.worldPosition,
        clickInfo,
      });
    }

    this.eventEmitter?.emit('click-processed', clickInfo);
  }

  /**
   * Process camera control keys
   */
  private processCameraControls(keyInfo: KeyboardInfo): void {
    if (!this.cameraControlCallback) return;

    const deltaTime = 16; // Assume 60fps for key-based movement

    switch (keyInfo.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        this.cameraControlCallback('up', deltaTime);
        break;
      case 'arrowdown':
      case 's':
        this.cameraControlCallback('down', deltaTime);
        break;
      case 'arrowleft':
      case 'a':
        this.cameraControlCallback('left', deltaTime);
        break;
      case 'arrowright':
      case 'd':
        this.cameraControlCallback('right', deltaTime);
        break;
    }
  }

  /**
   * Process keyboard shortcuts
   */
  private processShortcuts(keyInfo: KeyboardInfo): void {
    if (!this.shortcutCallback) return;

    let shortcut = '';

    // Build shortcut string
    if (keyInfo.modifiers.ctrl) shortcut += 'Ctrl+';
    if (keyInfo.modifiers.shift) shortcut += 'Shift+';
    if (keyInfo.modifiers.alt) shortcut += 'Alt+';
    shortcut += keyInfo.key.toUpperCase();

    // Common shortcuts
    switch (shortcut) {
      case 'ESCAPE':
        this.shortcutCallback('cancel', keyInfo);
        break;
      case ' ':
      case 'SPACE':
        this.shortcutCallback('confirm', keyInfo);
        break;
      case 'ENTER':
        this.shortcutCallback('end-turn', keyInfo);
        break;
      case 'TAB':
        this.shortcutCallback('next-unit', keyInfo);
        break;
      case 'Shift+TAB':
        this.shortcutCallback('prev-unit', keyInfo);
        break;
      case 'Ctrl+Z':
        this.shortcutCallback('undo', keyInfo);
        break;
      case 'F1':
        this.shortcutCallback('help', keyInfo);
        break;
      default:
        // Pass through other shortcuts
        this.shortcutCallback(shortcut, keyInfo);
        break;
    }
  }

  /**
   * Validate input based on current game state
   */
  private validateInput(clickInfo: ClickInfo): InputValidationResult {
    if (!this.gameState) {
      return { valid: true }; // No game state to validate against
    }

    // Check if it's player's turn
    if (this.gameState.activePlayer !== 'player') {
      return {
        valid: false,
        reason: 'Not player turn',
        error: GameplayError.INVALID_ACTION,
      };
    }

    // Check if game has ended
    if (this.gameState.gameResult !== null) {
      return {
        valid: false,
        reason: 'Game has ended',
        error: GameplayError.INVALID_TURN_STATE,
      };
    }

    // Check if in enemy phase
    if (this.gameState.phase === 'enemy') {
      return {
        valid: false,
        reason: 'Enemy turn in progress',
        error: GameplayError.INVALID_ACTION,
      };
    }

    // If clicking on a unit, validate unit selection
    if (clickInfo.unit) {
      // Can't select enemy units during player turn (except for info)
      if (clickInfo.unit.faction === 'enemy' && clickInfo.type !== 'right') {
        return {
          valid: false,
          reason: 'Cannot select enemy unit',
          error: GameplayError.INVALID_ACTION,
        };
      }

      // Can't select units that have already acted (except for info)
      if (
        clickInfo.unit.hasActed &&
        clickInfo.type !== 'right' &&
        clickInfo.unit.faction === 'player'
      ) {
        return {
          valid: false,
          reason: 'Unit has already acted',
          error: GameplayError.INVALID_ACTION,
        };
      }
    }

    return { valid: true };
  }

  // Unit detection callback
  private unitDetectionCallback?: (position: Position) => Unit | null;

  /**
   * Get unit at world position using the provided callback
   */
  private getUnitAtPosition(worldPosition: Position): Unit | null {
    if (this.unitDetectionCallback) {
      return this.unitDetectionCallback(worldPosition);
    }

    this.eventEmitter?.emit('unit-detection-requested', {
      position: worldPosition,
    });

    return null;
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  private screenToWorldPosition(screenX: number, screenY: number): Position {
    const camera = this.scene.cameras.main;
    return {
      x: (screenX + camera.scrollX) / camera.zoom,
      y: (screenY + camera.scrollY) / camera.zoom,
    };
  }

  /**
   * Convert world coordinates to grid coordinates
   */
  private worldToGridPosition(worldPosition: Position): Position {
    return {
      x: Math.floor(worldPosition.x / this.tileSize),
      y: Math.floor(worldPosition.y / this.tileSize),
    };
  }

  /**
   * Calculate distance between two positions
   */
  private getDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Set the tile size for grid calculations
   */
  setTileSize(tileSize: number): GameplayErrorResult {
    if (typeof tileSize !== 'number' || tileSize <= 0) {
      return {
        success: false,
        error: GameplayError.INVALID_ACTION,
        message: 'Invalid tile size',
      };
    }

    this.tileSize = tileSize;
    return { success: true };
  }

  /**
   * Set game state for input validation
   */
  setGameState(gameState: GameState): void {
    this.gameState = gameState;
  }

  /**
   * Set character selection callback
   */
  setCharacterSelectionCallback(callback: (unit: Unit | null, clickInfo: ClickInfo) => void): void {
    this.characterSelectionCallback = callback;
  }

  /**
   * Set tile selection callback
   */
  setTileSelectionCallback(callback: (position: Position, clickInfo: ClickInfo) => void): void {
    this.tileSelectionCallback = callback;
  }

  /**
   * Set camera control callback
   */
  setCameraControlCallback(
    callback: (direction: 'up' | 'down' | 'left' | 'right', deltaTime: number) => void
  ): void {
    this.cameraControlCallback = callback;
  }

  /**
   * Set shortcut callback
   */
  setShortcutCallback(callback: (shortcut: string, keyInfo: KeyboardInfo) => void): void {
    this.shortcutCallback = callback;
  }

  /**
   * Set unit detection callback
   */
  setUnitDetectionCallback(callback: (position: Position) => Unit | null): void {
    this.unitDetectionCallback = callback;
  }

  /**
   * Enable input handling
   */
  enable(): void {
    this.isEnabled = true;
    this.eventEmitter?.emit('input-enabled');
  }

  /**
   * Disable input handling
   */
  disable(): void {
    this.isEnabled = false;
    this.eventEmitter?.emit('input-disabled');
  }

  /**
   * Check if input is enabled
   */
  isInputEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Update input configuration
   */
  updateConfig(newConfig: Partial<InputConfig>): GameplayErrorResult {
    try {
      this.config = { ...this.config, ...newConfig };

      this.eventEmitter?.emit('input-config-updated', {
        config: this.config,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.INVALID_ACTION,
        message: 'Failed to update input configuration',
        details: error,
      };
    }
  }

  /**
   * Get current input configuration
   */
  getConfig(): InputConfig {
    return { ...this.config };
  }

  /**
   * Cleanup input handler resources
   */
  destroy(): void {
    this.disable();

    // Remove all event listeners
    this.scene.input.off('pointerdown');
    this.scene.input.off('pointerup');
    this.scene.input.off('pointermove');
    this.scene.input.off('wheel');

    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.off('keydown');
      this.scene.input.keyboard.off('keyup');
    }

    // Clear callbacks
    this.characterSelectionCallback = undefined;
    this.tileSelectionCallback = undefined;
    this.cameraControlCallback = undefined;
    this.shortcutCallback = undefined;

    this.eventEmitter?.emit('input-destroyed');
  }
}
