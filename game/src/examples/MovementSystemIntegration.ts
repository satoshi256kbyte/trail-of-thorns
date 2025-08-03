/**
 * Example integration of MovementSystem with InputHandler
 * This demonstrates how to wire up the movement cancellation and selection management
 * features with user input handling.
 */

import { MovementSystem } from '../systems/MovementSystem';
import { InputHandler, ClickInfo } from '../input/InputHandler';
import { Unit, Position, MapData } from '../types/gameplay';

export class MovementSystemIntegration {
  private movementSystem: MovementSystem;
  private inputHandler: InputHandler;
  private eventEmitter: Phaser.Events.EventEmitter;
  private allUnits: Unit[] = [];

  constructor(scene: Phaser.Scene, mapData: MapData) {
    // Create event emitter for communication between systems
    this.eventEmitter = new Phaser.Events.EventEmitter();

    // Initialize movement system with event emitter
    this.movementSystem = new MovementSystem(
      scene,
      {
        enableVisualFeedback: true,
        enablePathPreview: true,
        enableMovementAnimation: true,
      },
      this.eventEmitter
    );

    // Initialize input handler with event emitter
    this.inputHandler = new InputHandler(
      scene,
      {
        mouseEnabled: true,
        keyboardEnabled: true,
        validationEnabled: true,
      },
      this.eventEmitter
    );

    // Set up the integration
    this.setupIntegration(mapData);
  }

  private setupIntegration(mapData: MapData): void {
    // Initialize movement system
    this.movementSystem.initialize(mapData);

    // Set up input callbacks
    this.setupInputCallbacks();

    // Set up movement system callbacks
    this.setupMovementCallbacks();

    // Set up event listeners
    this.setupEventListeners();
  }

  private setupInputCallbacks(): void {
    // Handle character selection from input
    this.inputHandler.setCharacterSelectionCallback((unit: Unit | null, clickInfo: ClickInfo) => {
      if (unit) {
        // Left click on character - select for movement (with deselection support)
        const result = this.movementSystem.selectCharacterForMovement(unit, true);

        if (!result.valid) {
          console.warn('Character selection failed:', result.message);
          // Could show UI feedback here
        }
      } else if (clickInfo.type === 'right') {
        // Right click - cancel movement
        this.movementSystem.handleRightClickCancellation();
      }
    });

    // Handle tile selection for movement execution
    this.inputHandler.setTileSelectionCallback((position: Position, clickInfo: ClickInfo) => {
      const selectedCharacter = this.movementSystem.getSelectedCharacter();

      if (selectedCharacter && clickInfo.type === 'single') {
        // Execute movement to clicked tile
        this.movementSystem.executeMovement(selectedCharacter, position, {
          showPath: true,
          animate: true,
          onComplete: (character, result) => {
            if (result.success) {
              console.log(
                `${character.name} moved to (${result.finalPosition?.x}, ${result.finalPosition?.y})`
              );
            } else {
              console.warn(`Movement failed: ${result.message}`);
            }
          },
        });
      }
    });

    // Handle keyboard shortcuts
    this.inputHandler.setShortcutCallback((shortcut: string) => {
      switch (shortcut) {
        case 'cancel':
        case 'ESCAPE':
          // ESC key cancels movement
          this.movementSystem.cancelMovement();
          break;
        case 'next-unit':
        case 'TAB':
          // Tab key selects next available unit
          this.selectNextUnit();
          break;
      }
    });
  }

  private setupMovementCallbacks(): void {
    // Handle selection changes
    this.movementSystem.setOnSelectionChange((character: Unit | null) => {
      if (character) {
        console.log(`Selected character: ${character.name}`);
        // Could update UI to show character info
      } else {
        console.log('Character deselected');
        // Could hide character info UI
      }
    });

    // Handle movement completion
    this.movementSystem.setOnMovementComplete((character: Unit, result) => {
      if (result.success) {
        // Update unit list after successful movement
        this.updateUnitPositions();

        // Could trigger turn advancement logic here
        console.log(`${character.name} completed movement`);
      }
    });

    // Handle movement state changes
    this.movementSystem.setOnMovementStateChange(state => {
      // Could update UI based on movement state
      switch (state.movementMode) {
        case 'selecting':
          console.log('Movement selection mode active');
          break;
        case 'moving':
          console.log('Character movement in progress');
          break;
        case 'none':
          console.log('No movement activity');
          break;
      }
    });
  }

  private setupEventListeners(): void {
    // Listen to movement system events
    this.eventEmitter.on('character-deselected', data => {
      console.log(`Character ${data.character.name} was deselected`);
    });

    this.eventEmitter.on('character-switched', data => {
      console.log(
        `Switched from ${data.previousCharacter?.name || 'none'} to ${data.newCharacter.name}`
      );
    });

    this.eventEmitter.on('movement-cancelled', () => {
      console.log('Movement was cancelled');
    });

    this.eventEmitter.on('movement-cancelled-by-right-click', () => {
      console.log('Movement was cancelled by right-click');
    });

    // Listen to input events
    this.eventEmitter.on('right-click', (clickInfo: ClickInfo) => {
      // Right-click handling is already set up in character selection callback
      // This is just for additional logging/UI feedback
      console.log('Right-click detected at', clickInfo.gridPosition);
    });
  }

  private selectNextUnit(): void {
    const currentSelected = this.movementSystem.getSelectedCharacter();
    const availableUnits = this.allUnits.filter(
      unit => unit.faction === 'player' && !unit.hasMoved && unit.currentHP > 0
    );

    if (availableUnits.length === 0) {
      return; // No units available
    }

    let nextIndex = 0;
    if (currentSelected) {
      const currentIndex = availableUnits.findIndex(unit => unit === currentSelected);
      nextIndex = (currentIndex + 1) % availableUnits.length;
    }

    const nextUnit = availableUnits[nextIndex];
    this.movementSystem.selectCharacterForMovement(nextUnit, false); // Don't allow deselection when cycling
  }

  private updateUnitPositions(): void {
    // Update the movement system with current unit positions
    this.movementSystem.updateUnits(this.allUnits);
  }

  /**
   * Update the list of all units
   */
  public setUnits(units: Unit[]): void {
    this.allUnits = [...units];
    this.movementSystem.updateUnits(this.allUnits);
  }

  /**
   * Get the movement system instance
   */
  public getMovementSystem(): MovementSystem {
    return this.movementSystem;
  }

  /**
   * Get the input handler instance
   */
  public getInputHandler(): InputHandler {
    return this.inputHandler;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.movementSystem.destroy();
    this.inputHandler.destroy();
    this.eventEmitter.removeAllListeners();
  }
}

/**
 * Example usage in a Phaser scene:
 *
 * ```typescript
 * class GameplayScene extends Phaser.Scene {
 *     private movementIntegration: MovementSystemIntegration;
 *
 *     create() {
 *         const mapData = this.loadMapData();
 *         this.movementIntegration = new MovementSystemIntegration(this, mapData);
 *
 *         // Set up units
 *         const units = this.createUnits();
 *         this.movementIntegration.setUnits(units);
 *     }
 *
 *     destroy() {
 *         this.movementIntegration?.destroy();
 *         super.destroy();
 *     }
 * }
 * ```
 */
