/**
 * CameraController - Manages camera movement, zoom, and focus for the gameplay scene
 *
 * This class handles:
 * - Smooth camera movement with keyboard and mouse controls
 * - Map boundary constraints to prevent camera from going outside the map
 * - Zoom functionality with smooth transitions
 * - Automatic camera focusing on specific positions
 * - Camera state management and event emission
 */

import { Position, MapData, GameplayError, GameplayErrorResult } from '../types/gameplay';

export interface CameraConfig {
  /** Camera movement speed in pixels per second */
  moveSpeed: number;
  /** Zoom limits */
  minZoom: number;
  maxZoom: number;
  /** Zoom speed for smooth transitions */
  zoomSpeed: number;
  /** Camera bounds padding from map edges */
  boundsPadding: number;
  /** Smooth movement duration in milliseconds */
  smoothMoveDuration: number;
  /** Mouse edge scroll threshold in pixels */
  mouseEdgeThreshold: number;
  /** Mouse edge scroll speed */
  mouseEdgeSpeed: number;
}

export interface CameraBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export class CameraController {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private mapBounds: CameraBounds;
  private config: CameraConfig;
  private eventEmitter?: Phaser.Events.EventEmitter;

  // Input handling
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: { [key: string]: Phaser.Input.Keyboard.Key };
  private mouseEdgeScrollEnabled: boolean = false;
  private keyboardControlsEnabled: boolean = false;

  // Movement state
  private isMoving: boolean = false;
  private targetPosition?: Position;
  private moveTween?: Phaser.Tweens.Tween;
  private zoomTween?: Phaser.Tweens.Tween;

  // Default configuration
  private static readonly DEFAULT_CONFIG: CameraConfig = {
    moveSpeed: 400,
    minZoom: 0.5,
    maxZoom: 2.0,
    zoomSpeed: 0.1,
    boundsPadding: 50,
    smoothMoveDuration: 500,
    mouseEdgeThreshold: 50,
    mouseEdgeSpeed: 300,
  };

  constructor(
    scene: Phaser.Scene,
    mapData?: MapData,
    config?: Partial<CameraConfig>,
    eventEmitter?: Phaser.Events.EventEmitter
  ) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.config = { ...CameraController.DEFAULT_CONFIG, ...config };
    this.eventEmitter = eventEmitter;

    // Initialize camera bounds
    if (mapData) {
      this.setMapBounds(mapData);
    } else {
      // Default bounds if no map data provided
      this.mapBounds = {
        left: 0,
        right: 800,
        top: 0,
        bottom: 600,
      };
    }

    this.initializeCamera();
  }

  /**
   * Initialize camera settings
   */
  private initializeCamera(): void {
    // Set initial zoom
    this.camera.setZoom(1.0);

    // Set camera bounds
    this.updateCameraBounds();

    // Emit camera initialized event
    this.eventEmitter?.emit('camera-initialized', {
      bounds: this.mapBounds,
      zoom: this.camera.zoom,
      position: { x: this.camera.scrollX, y: this.camera.scrollY },
    });
  }

  /**
   * Set map bounds for camera constraints
   *
   * @param mapData Map data containing dimensions
   * @returns GameplayErrorResult indicating success or failure
   */
  setMapBounds(mapData: MapData): GameplayErrorResult {
    try {
      if (
        !mapData ||
        typeof mapData.width !== 'number' ||
        typeof mapData.height !== 'number' ||
        typeof mapData.tileSize !== 'number' ||
        mapData.width <= 0 ||
        mapData.height <= 0 ||
        mapData.tileSize <= 0
      ) {
        return {
          success: false,
          error: GameplayError.MAP_LOAD_FAILED,
          message: 'Invalid map data provided',
        };
      }

      const mapPixelWidth = mapData.width * mapData.tileSize;
      const mapPixelHeight = mapData.height * mapData.tileSize;

      this.mapBounds = {
        left: -this.config.boundsPadding,
        right: mapPixelWidth + this.config.boundsPadding,
        top: -this.config.boundsPadding,
        bottom: mapPixelHeight + this.config.boundsPadding,
      };

      this.updateCameraBounds();

      // Emit bounds updated event
      this.eventEmitter?.emit('camera-bounds-updated', {
        bounds: this.mapBounds,
        mapSize: { width: mapPixelWidth, height: mapPixelHeight },
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.CAMERA_BOUNDS_ERROR,
        message: 'Failed to set map bounds',
        details: error,
      };
    }
  }

  /**
   * Update Phaser camera bounds based on current map bounds
   */
  private updateCameraBounds(): void {
    const boundsWidth = this.mapBounds.right - this.mapBounds.left;
    const boundsHeight = this.mapBounds.bottom - this.mapBounds.top;

    this.camera.setBounds(this.mapBounds.left, this.mapBounds.top, boundsWidth, boundsHeight);
  }

  /**
   * Move camera in a specific direction
   *
   * @param direction Direction to move ('up', 'down', 'left', 'right')
   * @param deltaTime Time elapsed since last frame (for smooth movement)
   * @returns GameplayErrorResult indicating success or failure
   */
  moveCamera(
    direction: 'up' | 'down' | 'left' | 'right',
    deltaTime: number = 16
  ): GameplayErrorResult {
    try {
      if (this.isMoving && this.moveTween) {
        // Don't interrupt smooth movement
        return { success: true };
      }

      const moveDistance = (this.config.moveSpeed * deltaTime) / 1000;
      let newX = this.camera.scrollX;
      let newY = this.camera.scrollY;

      switch (direction) {
        case 'up':
          newY -= moveDistance;
          break;
        case 'down':
          newY += moveDistance;
          break;
        case 'left':
          newX -= moveDistance;
          break;
        case 'right':
          newX += moveDistance;
          break;
        default:
          return {
            success: false,
            error: GameplayError.INVALID_ACTION,
            message: `Invalid direction: ${direction}`,
          };
      }

      // Apply bounds constraints
      const constrainedPosition = this.constrainToBounds(newX, newY);

      // Always set the scroll position (even if it's the same, for consistency)
      this.camera.setScroll(constrainedPosition.x, constrainedPosition.y);

      // Emit camera moved event
      this.eventEmitter?.emit('camera-moved', {
        position: constrainedPosition,
        direction: direction,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.CAMERA_BOUNDS_ERROR,
        message: 'Failed to move camera',
        details: error,
      };
    }
  }

  /**
   * Focus camera on a specific position with smooth movement
   *
   * @param x Target X coordinate
   * @param y Target Y coordinate
   * @param duration Optional duration for smooth movement (uses config default if not provided)
   * @returns GameplayErrorResult indicating success or failure
   */
  focusOnPosition(x: number, y: number, duration?: number): GameplayErrorResult {
    try {
      if (
        typeof x !== 'number' ||
        typeof y !== 'number' ||
        !Number.isFinite(x) ||
        !Number.isFinite(y)
      ) {
        return {
          success: false,
          error: GameplayError.INVALID_POSITION,
          message: 'Invalid position coordinates',
        };
      }

      // Calculate camera position to center on target
      const cameraX = x - this.camera.width / 2 / this.camera.zoom;
      const cameraY = y - this.camera.height / 2 / this.camera.zoom;

      // Constrain to bounds
      const constrainedPosition = this.constrainToBounds(cameraX, cameraY);

      // Stop any existing movement
      if (this.moveTween) {
        this.moveTween.stop();
        this.moveTween = undefined;
      }

      const moveDuration = duration ?? this.config.smoothMoveDuration;

      // If duration is 0 or very small, move immediately
      if (moveDuration <= 0) {
        this.camera.setScroll(constrainedPosition.x, constrainedPosition.y);
        this.isMoving = false;

        this.eventEmitter?.emit('camera-focused', {
          targetPosition: { x, y },
          cameraPosition: constrainedPosition,
          immediate: true,
        });

        return { success: true };
      }

      // Smooth movement
      this.isMoving = true;
      this.targetPosition = { x, y };

      this.moveTween = this.scene.tweens.add({
        targets: this.camera,
        scrollX: constrainedPosition.x,
        scrollY: constrainedPosition.y,
        duration: moveDuration,
        ease: 'Power2',
        onUpdate: () => {
          this.eventEmitter?.emit('camera-moving', {
            currentPosition: { x: this.camera.scrollX, y: this.camera.scrollY },
            targetPosition: constrainedPosition,
            progress: this.moveTween?.progress || 0,
          });
        },
        onComplete: () => {
          this.isMoving = false;
          this.targetPosition = undefined;
          this.moveTween = undefined;

          this.eventEmitter?.emit('camera-focused', {
            targetPosition: { x, y },
            cameraPosition: constrainedPosition,
            immediate: false,
          });
        },
      });

      return { success: true };
    } catch (error) {
      this.isMoving = false;
      this.targetPosition = undefined;
      this.moveTween = undefined;

      return {
        success: false,
        error: GameplayError.CAMERA_BOUNDS_ERROR,
        message: 'Failed to focus on position',
        details: error,
      };
    }
  }

  /**
   * Set camera zoom level with smooth transition
   *
   * @param zoomLevel Target zoom level
   * @param duration Optional duration for smooth zoom (uses config default if not provided)
   * @returns GameplayErrorResult indicating success or failure
   */
  setZoom(zoomLevel: number, duration?: number): GameplayErrorResult {
    try {
      if (typeof zoomLevel !== 'number' || !Number.isFinite(zoomLevel)) {
        return {
          success: false,
          error: GameplayError.INVALID_ACTION,
          message: 'Invalid zoom level',
        };
      }

      // Clamp zoom to configured limits
      const clampedZoom = Math.min(Math.max(zoomLevel, this.config.minZoom), this.config.maxZoom);

      // Stop any existing zoom tween
      if (this.zoomTween) {
        this.zoomTween.stop();
        this.zoomTween = undefined;
      }

      const zoomDuration =
        duration ?? (Math.abs(clampedZoom - this.camera.zoom) / this.config.zoomSpeed) * 1000;

      // If duration is 0 or very small, zoom immediately
      if (zoomDuration <= 10) {
        this.camera.setZoom(clampedZoom);
        this.updateCameraBounds(); // Update bounds for new zoom level

        this.eventEmitter?.emit('camera-zoomed', {
          zoom: clampedZoom,
          immediate: true,
        });

        return { success: true };
      }

      // Smooth zoom
      this.zoomTween = this.scene.tweens.add({
        targets: this.camera,
        zoom: clampedZoom,
        duration: zoomDuration,
        ease: 'Power2',
        onUpdate: () => {
          this.updateCameraBounds(); // Update bounds during zoom

          this.eventEmitter?.emit('camera-zooming', {
            currentZoom: this.camera.zoom,
            targetZoom: clampedZoom,
            progress: this.zoomTween?.progress || 0,
          });
        },
        onComplete: () => {
          this.zoomTween = undefined;

          this.eventEmitter?.emit('camera-zoomed', {
            zoom: clampedZoom,
            immediate: false,
          });
        },
      });

      return { success: true };
    } catch (error) {
      this.zoomTween = undefined;

      return {
        success: false,
        error: GameplayError.CAMERA_BOUNDS_ERROR,
        message: 'Failed to set zoom',
        details: error,
      };
    }
  }

  /**
   * Enable keyboard controls for camera movement
   *
   * @returns GameplayErrorResult indicating success or failure
   */
  enableKeyboardControls(): GameplayErrorResult {
    try {
      if (!this.scene.input.keyboard) {
        return {
          success: false,
          error: GameplayError.INVALID_ACTION,
          message: 'Keyboard input not available',
        };
      }

      // Create cursor keys
      this.cursors = this.scene.input.keyboard.createCursorKeys();

      // Create WASD keys
      this.wasdKeys = this.scene.input.keyboard.addKeys('W,S,A,D') as {
        [key: string]: Phaser.Input.Keyboard.Key;
      };

      this.keyboardControlsEnabled = true;

      this.eventEmitter?.emit('camera-keyboard-enabled');

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.INVALID_ACTION,
        message: 'Failed to enable keyboard controls',
        details: error,
      };
    }
  }

  /**
   * Disable keyboard controls
   */
  disableKeyboardControls(): void {
    this.keyboardControlsEnabled = false;
    this.cursors = undefined;
    this.wasdKeys = undefined;

    this.eventEmitter?.emit('camera-keyboard-disabled');
  }

  /**
   * Enable mouse edge scrolling
   *
   * @returns GameplayErrorResult indicating success or failure
   */
  enableMouseControls(): GameplayErrorResult {
    try {
      this.mouseEdgeScrollEnabled = true;

      this.eventEmitter?.emit('camera-mouse-enabled');

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.INVALID_ACTION,
        message: 'Failed to enable mouse controls',
        details: error,
      };
    }
  }

  /**
   * Disable mouse edge scrolling
   */
  disableMouseControls(): void {
    this.mouseEdgeScrollEnabled = false;

    this.eventEmitter?.emit('camera-mouse-disabled');
  }

  /**
   * Update camera controls (should be called in scene update loop)
   *
   * @param deltaTime Time elapsed since last frame
   */
  update(deltaTime: number): void {
    if (this.keyboardControlsEnabled) {
      this.handleKeyboardInput(deltaTime);
    }

    if (this.mouseEdgeScrollEnabled) {
      this.handleMouseEdgeScroll(deltaTime);
    }
  }

  /**
   * Handle keyboard input for camera movement
   *
   * @param deltaTime Time elapsed since last frame
   */
  private handleKeyboardInput(deltaTime: number): void {
    if (!this.cursors && !this.wasdKeys) return;

    let moved = false;

    // Arrow keys or WASD
    if (this.cursors?.up?.isDown || this.wasdKeys?.W?.isDown) {
      this.moveCamera('up', deltaTime);
      moved = true;
    }
    if (this.cursors?.down?.isDown || this.wasdKeys?.S?.isDown) {
      this.moveCamera('down', deltaTime);
      moved = true;
    }
    if (this.cursors?.left?.isDown || this.wasdKeys?.A?.isDown) {
      this.moveCamera('left', deltaTime);
      moved = true;
    }
    if (this.cursors?.right?.isDown || this.wasdKeys?.D?.isDown) {
      this.moveCamera('right', deltaTime);
      moved = true;
    }

    // Emit keyboard movement event if any movement occurred
    if (moved) {
      this.eventEmitter?.emit('camera-keyboard-moved', {
        position: { x: this.camera.scrollX, y: this.camera.scrollY },
      });
    }
  }

  /**
   * Handle mouse edge scrolling
   *
   * @param deltaTime Time elapsed since last frame
   */
  private handleMouseEdgeScroll(deltaTime: number): void {
    const pointer = this.scene.input.activePointer;
    if (!pointer) return;

    const threshold = this.config.mouseEdgeThreshold;
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;

    let moved = false;

    // Check edges and move camera
    if (pointer.x < threshold) {
      this.moveCamera('left', deltaTime);
      moved = true;
    } else if (pointer.x > gameWidth - threshold) {
      this.moveCamera('right', deltaTime);
      moved = true;
    }

    if (pointer.y < threshold) {
      this.moveCamera('up', deltaTime);
      moved = true;
    } else if (pointer.y > gameHeight - threshold) {
      this.moveCamera('down', deltaTime);
      moved = true;
    }

    // Emit mouse edge scroll event if any movement occurred
    if (moved) {
      this.eventEmitter?.emit('camera-mouse-scrolled', {
        position: { x: this.camera.scrollX, y: this.camera.scrollY },
        mousePosition: { x: pointer.x, y: pointer.y },
      });
    }
  }

  /**
   * Constrain camera position to bounds
   *
   * @param x Camera X position
   * @param y Camera Y position
   * @returns Constrained position
   */
  private constrainToBounds(x: number, y: number): Position {
    const viewWidth = this.camera.width / this.camera.zoom;
    const viewHeight = this.camera.height / this.camera.zoom;

    // Calculate effective bounds considering camera view size
    const minX = this.mapBounds.left;
    const maxX = this.mapBounds.right - viewWidth;
    const minY = this.mapBounds.top;
    const maxY = this.mapBounds.bottom - viewHeight;

    return {
      x: Math.min(Math.max(x, minX), Math.max(minX, maxX)),
      y: Math.min(Math.max(y, minY), Math.max(minY, maxY)),
    };
  }

  /**
   * Get current camera position
   *
   * @returns Current camera position
   */
  getPosition(): Position {
    return {
      x: this.camera.scrollX,
      y: this.camera.scrollY,
    };
  }

  /**
   * Get current camera zoom level
   *
   * @returns Current zoom level
   */
  getZoom(): number {
    return this.camera.zoom;
  }

  /**
   * Get camera bounds
   *
   * @returns Current camera bounds
   */
  getBounds(): CameraBounds {
    return { ...this.mapBounds };
  }

  /**
   * Get camera configuration
   *
   * @returns Current camera configuration
   */
  getConfig(): CameraConfig {
    return { ...this.config };
  }

  /**
   * Update camera configuration
   *
   * @param newConfig Partial configuration to update
   * @returns GameplayErrorResult indicating success or failure
   */
  updateConfig(newConfig: Partial<CameraConfig>): GameplayErrorResult {
    try {
      this.config = { ...this.config, ...newConfig };

      // Update camera bounds if padding changed
      if (newConfig.boundsPadding !== undefined) {
        this.updateCameraBounds();
      }

      this.eventEmitter?.emit('camera-config-updated', {
        config: this.config,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.INVALID_ACTION,
        message: 'Failed to update camera configuration',
        details: error,
      };
    }
  }

  /**
   * Check if camera is currently moving
   *
   * @returns True if camera is in smooth movement
   */
  isCurrentlyMoving(): boolean {
    return this.isMoving;
  }

  /**
   * Check if camera is currently zooming
   *
   * @returns True if camera is in smooth zoom transition
   */
  isCurrentlyZooming(): boolean {
    return this.zoomTween !== undefined;
  }

  /**
   * Stop all camera movement and zoom tweens
   */
  stopAllMovement(): void {
    if (this.moveTween) {
      this.moveTween.stop();
      this.moveTween = undefined;
    }

    if (this.zoomTween) {
      this.zoomTween.stop();
      this.zoomTween = undefined;
    }

    this.isMoving = false;
    this.targetPosition = undefined;

    this.eventEmitter?.emit('camera-movement-stopped');
  }

  /**
   * Reset camera to default position and zoom
   *
   * @param immediate If true, reset immediately without smooth transition
   * @returns GameplayErrorResult indicating success or failure
   */
  reset(immediate: boolean = false): GameplayErrorResult {
    try {
      this.stopAllMovement();

      const centerX = (this.mapBounds.left + this.mapBounds.right) / 2;
      const centerY = (this.mapBounds.top + this.mapBounds.bottom) / 2;

      if (immediate) {
        this.camera.setZoom(1.0);
        this.camera.centerOn(centerX, centerY);
      } else {
        this.setZoom(1.0);
        this.focusOnPosition(centerX, centerY);
      }

      this.eventEmitter?.emit('camera-reset', {
        position: { x: centerX, y: centerY },
        zoom: 1.0,
        immediate,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.CAMERA_BOUNDS_ERROR,
        message: 'Failed to reset camera',
        details: error,
      };
    }
  }

  /**
   * Cleanup camera controller resources
   */
  destroy(): void {
    this.stopAllMovement();
    this.disableKeyboardControls();
    this.disableMouseControls();

    this.eventEmitter?.emit('camera-destroyed');
  }
}
