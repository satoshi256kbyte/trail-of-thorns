/**
 * GameplayScene - Main gameplay scene for SRPG tactical combat
 *
 * This scene integrates all manager classes to provide the core gameplay experience:
 * - Turn-based tactical combat
 * - Character management and interaction
 * - Camera controls and map navigation
 * - UI management and player feedback
 * - Input handling and validation
 *
 * Implements requirements 1.1, 6.1, 6.3 from the gameplay-scene-foundation specification
 */

import * as Phaser from 'phaser';
import { GameStateManager } from '../systems/GameStateManager';
import { CameraController } from '../systems/CameraController';
import { UIManager } from '../ui/UIManager';
import { InputHandler } from '../input/InputHandler';
import { MapRenderer } from '../rendering/MapRenderer';
import { CharacterManager } from '../systems/CharacterManager';
import { DebugManager } from '../debug/DebugManager';
import { MovementSystem } from '../systems/MovementSystem';
import { MovementDevelopmentTools } from '../debug/MovementDevelopmentTools';
import {
  StageData,
  MapData,
  Unit,
  GameplayError,
  GameplayErrorResult,
  TypeValidators,
} from '../types/gameplay';
import { SceneTransition, TransitionType, SceneData } from '../utils/SceneTransition';
import { Position } from '../types/movement';

/**
 * GameplayScene configuration interface
 */
export interface GameplaySceneConfig {
  /** Enable debug mode for development */
  debugMode: boolean;
  /** Auto-save interval in milliseconds */
  autoSaveInterval: number;
  /** Camera movement speed */
  cameraSpeed: number;
  /** Enable performance monitoring */
  performanceMonitoring: boolean;
}

/**
 * Main GameplayScene class
 * Orchestrates all gameplay systems and provides the main game loop
 */
export class GameplayScene extends Phaser.Scene {
  // Manager instances
  private gameStateManager!: GameStateManager;
  private cameraController!: CameraController;
  private uiManager!: UIManager;
  private inputHandler!: InputHandler;
  private mapRenderer!: MapRenderer;
  private characterManager!: CharacterManager;
  private debugManager!: DebugManager;
  private movementSystem!: MovementSystem;
  private movementDevTools!: MovementDevelopmentTools;

  // Scene data and state
  private stageData?: StageData;
  private config: GameplaySceneConfig;
  private isInitialized: boolean = false;
  private isPaused: boolean = false;

  // Performance monitoring
  private lastUpdateTime: number = 0;
  private frameCount: number = 0;
  private fpsText?: Phaser.GameObjects.Text;

  // Error handling
  private errorText?: Phaser.GameObjects.Text;
  private hasError: boolean = false;

  // Default configuration
  private static readonly DEFAULT_CONFIG: GameplaySceneConfig = {
    debugMode: false,
    autoSaveInterval: 30000, // 30 seconds
    cameraSpeed: 400,
    performanceMonitoring: false,
  };

  /**
   * Constructor
   * Initialize the scene with the key 'GameplayScene'
   */
  constructor(config?: Partial<GameplaySceneConfig>) {
    super({ key: 'GameplayScene' });
    this.config = { ...GameplayScene.DEFAULT_CONFIG, ...config };
  }

  /**
   * Phaser lifecycle method: preload
   * Load stage data and assets required for gameplay
   */
  public preload(): void {
    console.log('GameplayScene: preload phase');

    try {
      // Load sample map data for now
      // In a full implementation, this would load the specific stage's map
      this.load.json('sampleMap', 'data/sample-map.json');

      // Show loading indicator
      this.showLoadingIndicator();

      // Set up preload event handlers
      this.load.on('complete', () => {
        console.log('GameplayScene: Asset loading completed');
      });

      this.load.on('loaderror', (file: any) => {
        console.error('GameplayScene: Failed to load asset:', file.key);
        this.handleLoadError(`Failed to load asset: ${file.key}`);
      });
    } catch (error) {
      console.error('GameplayScene: Error in preload phase:', error);
      this.handleLoadError('Failed to initialize asset loading');
    }
  }

  /**
   * Phaser lifecycle method: create
   * Initialize all systems and UI elements
   * @param data - Scene data passed from previous scene
   */
  public create(data?: SceneData): void {
    console.log('GameplayScene: create phase', data ? 'with data' : '');

    try {
      // Store start time for play time tracking
      this.data.set('startTime', Date.now());

      // Store scene data for reference
      if (data) {
        this.data.set('sceneData', data);
        console.log('GameplayScene: Received scene data:', data);
      }

      // Hide loading indicator
      this.hideLoadingIndicator();

      // Create entrance transition effect
      SceneTransition.createEntranceTransition(this, TransitionType.FADE_IN, 500);

      // Extract stage data from scene data
      this.extractStageData(data);

      // Initialize all manager systems
      this.initializeManagers();

      // Load and setup the map (async)
      this.setupMap()
        .then(() => {
          // Continue initialization after map is loaded
          this.continueInitialization();
        })
        .catch(error => {
          console.error('GameplayScene: Map setup failed:', error);
          this.handleInitializationError(error);
        });
    } catch (error) {
      console.error('GameplayScene: Error in create phase:', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Phaser lifecycle method: update
   * Main game loop processing
   * @param time - Current time in milliseconds
   * @param delta - Time elapsed since last frame in milliseconds
   */
  public update(time: number, delta: number): void {
    // Skip update if not initialized or has error
    if (!this.isInitialized || this.hasError || this.isPaused) {
      return;
    }

    try {
      // Update camera controls
      if (this.cameraController) {
        this.cameraController.update(delta);
      }

      // Update debug manager
      if (this.debugManager) {
        this.debugManager.update(time, delta);
      }

      // Update performance monitoring
      if (this.config.performanceMonitoring) {
        this.updatePerformanceMonitoring(time, delta);
      }

      // Store last update time
      this.lastUpdateTime = time;
    } catch (error) {
      console.error('GameplayScene: Error in update loop:', error);
      this.handleRuntimeError(error);
    }
  }

  /**
   * Continue initialization after map setup is complete
   */
  private continueInitialization(): void {
    try {
      // Load and position characters
      this.setupCharacters();

      // Initialize game state
      this.initializeGameState();

      // Setup input handling
      this.setupInputHandling();

      // Create UI elements
      this.setupUI();

      // Setup event listeners
      this.setupEventListeners();

      // Enable performance monitoring if configured
      if (this.config.performanceMonitoring) {
        this.setupPerformanceMonitoring();
      }

      // Enable debug mode if configured
      if (this.config.debugMode) {
        this.debugManager.enableDebugMode();
      }

      // Mark as initialized
      this.isInitialized = true;

      console.log('GameplayScene: initialization completed successfully');
    } catch (error) {
      console.error('GameplayScene: Error in continue initialization:', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Extract stage data from scene transition data
   * @param data - Scene data from previous scene
   */
  private extractStageData(data?: SceneData): void {
    if (data && data.selectedStage) {
      // For now, we'll create mock stage data since the stage selection
      // only provides basic stage info, not full gameplay data
      this.stageData = this.createMockStageData(data.selectedStage);
      console.log('GameplayScene: Using stage data:', this.stageData.name);
    } else {
      // Create default stage data for testing
      this.stageData = this.createDefaultStageData();
      console.log('GameplayScene: Using default stage data');
    }
  }

  /**
   * Create mock stage data for testing
   * @param basicStageInfo - Basic stage information from stage selection
   * @returns Complete StageData object
   */
  private createMockStageData(basicStageInfo: any): StageData {
    // Load map data from cache
    const mapData = this.cache.json.get('sampleMap') as MapData;

    return {
      id: basicStageInfo.id || 'test-stage',
      name: basicStageInfo.name || 'Test Stage',
      description: basicStageInfo.description || 'A test stage for gameplay',
      mapData: mapData,
      playerUnits: this.createMockPlayerUnits(),
      enemyUnits: this.createMockEnemyUnits(),
      victoryConditions: [
        {
          type: 'defeat_all',
          description: 'Defeat all enemy units',
        },
      ],
    };
  }

  /**
   * Create default stage data when no stage is selected
   * @returns Default StageData object
   */
  private createDefaultStageData(): StageData {
    const mapData = this.cache.json.get('sampleMap') as MapData;

    return {
      id: 'default-stage',
      name: 'Default Test Stage',
      description: 'Default stage for testing gameplay systems',
      mapData: mapData,
      playerUnits: this.createMockPlayerUnits(),
      enemyUnits: this.createMockEnemyUnits(),
      victoryConditions: [
        {
          type: 'defeat_all',
          description: 'Defeat all enemy units',
        },
      ],
    };
  }

  /**
   * Create mock player units for testing
   * @returns Array of player units
   */
  private createMockPlayerUnits(): Unit[] {
    return [
      {
        id: 'player-1',
        name: 'Hero',
        position: { x: 1, y: 6 },
        stats: {
          maxHP: 100,
          maxMP: 50,
          attack: 25,
          defense: 15,
          speed: 12,
          movement: 3,
        },
        currentHP: 100,
        currentMP: 50,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
      },
      {
        id: 'player-2',
        name: 'Mage',
        position: { x: 2, y: 6 },
        stats: {
          maxHP: 80,
          maxMP: 80,
          attack: 30,
          defense: 10,
          speed: 10,
          movement: 2,
        },
        currentHP: 80,
        currentMP: 80,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
      },
    ];
  }

  /**
   * Create mock enemy units for testing
   * @returns Array of enemy units
   */
  private createMockEnemyUnits(): Unit[] {
    return [
      {
        id: 'enemy-1',
        name: 'Orc Warrior',
        position: { x: 9, y: 1 },
        stats: {
          maxHP: 90,
          maxMP: 20,
          attack: 20,
          defense: 12,
          speed: 8,
          movement: 2,
        },
        currentHP: 90,
        currentMP: 20,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
      },
      {
        id: 'enemy-2',
        name: 'Goblin Archer',
        position: { x: 10, y: 1 },
        stats: {
          maxHP: 60,
          maxMP: 30,
          attack: 22,
          defense: 8,
          speed: 14,
          movement: 3,
        },
        currentHP: 60,
        currentMP: 30,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
      },
    ];
  }

  /**
   * Initialize all manager classes
   */
  private initializeManagers(): void {
    console.log('GameplayScene: Initializing manager systems');

    // Initialize GameStateManager
    this.gameStateManager = new GameStateManager(this.events);

    // Initialize CameraController
    this.cameraController = new CameraController(
      this,
      this.stageData?.mapData,
      {
        moveSpeed: this.config.cameraSpeed,
        minZoom: 0.5,
        maxZoom: 2.0,
      },
      this.events
    );

    // Initialize UIManager
    this.uiManager = new UIManager(this);

    // Initialize InputHandler
    this.inputHandler = new InputHandler(
      this,
      {
        mouseEnabled: true,
        keyboardEnabled: true,
        validationEnabled: true,
      },
      this.events
    );

    // Initialize MapRenderer
    this.mapRenderer = new MapRenderer(this, {
      tileSize: this.stageData?.mapData.tileSize || 32,
      showGrid: this.config.debugMode,
    });

    // Initialize CharacterManager
    this.characterManager = new CharacterManager(
      this,
      this.stageData?.mapData.tileSize || 32,
      {
        spriteScale: 1.0,
      },
      this.events
    );

    // Initialize DebugManager
    this.debugManager = new DebugManager(this, {
      showGridCoordinates: this.config.debugMode,
      showCharacterStats: this.config.debugMode,
      showPerformanceMetrics: this.config.performanceMonitoring,
      enableConsoleCommands: this.config.debugMode,
    });

    // Initialize MovementSystem
    this.movementSystem = new MovementSystem(
      this,
      {
        enableVisualFeedback: true,
        enablePathPreview: true,
        enableMovementAnimation: true,
      },
      this.events
    );

    // Initialize MovementDevelopmentTools
    this.movementDevTools = MovementDevelopmentTools.getInstance();

    console.log('GameplayScene: Manager systems initialized');
  }

  /**
   * Setup map rendering and camera bounds
   */
  private async setupMap(): Promise<void> {
    if (!this.stageData?.mapData) {
      throw new Error('No map data available');
    }

    console.log('GameplayScene: Setting up map');

    // Load map data into renderer
    const mapResult = await this.mapRenderer.loadMap(this.stageData.mapData);
    if (!mapResult.success) {
      throw new Error(`Failed to load map: ${mapResult.message}`);
    }

    // Update camera bounds based on map
    const boundsResult = this.cameraController.setMapBounds(this.stageData.mapData);
    if (!boundsResult.success) {
      throw new Error(`Failed to set camera bounds: ${boundsResult.message}`);
    }

    // Set tile size for input handler
    this.inputHandler.setTileSize(this.stageData.mapData.tileSize);

    // Set map data for debug manager
    this.debugManager.setMapData(this.stageData.mapData);

    // Initialize movement system with map data
    this.movementSystem.initialize(this.stageData.mapData);
    this.movementSystem.setGameStateManager(this.gameStateManager);

    // Initialize movement development tools with movement system
    this.movementDevTools.initialize(this.movementSystem);

    console.log('GameplayScene: Map setup completed');
  }

  /**
   * Setup character loading and positioning
   */
  private setupCharacters(): void {
    if (!this.stageData) {
      throw new Error('No stage data available for character setup');
    }

    console.log('GameplayScene: Setting up characters');

    // Load characters from stage data
    const loadResult = this.characterManager.loadCharacters(this.stageData);
    if (!loadResult.success) {
      throw new Error(`Failed to load characters: ${loadResult.message}`);
    }

    // Set characters for debug manager
    const allCharacters = [...this.stageData.playerUnits, ...this.stageData.enemyUnits];
    this.debugManager.setCharacters(allCharacters);

    // Update movement system with all units
    this.movementSystem.updateUnits(allCharacters);

    console.log('GameplayScene: Characters setup completed');
  }

  /**
   * Initialize game state and turn order
   */
  private initializeGameState(): void {
    if (!this.stageData) {
      throw new Error('No stage data available for game state initialization');
    }

    console.log('GameplayScene: Initializing game state');

    // Combine all units for turn order
    const allUnits = [...this.stageData.playerUnits, ...this.stageData.enemyUnits];

    // Initialize turn order
    const turnResult = this.gameStateManager.initializeTurnOrder(allUnits);
    if (!turnResult.success) {
      throw new Error(`Failed to initialize turn order: ${turnResult.message}`);
    }

    // Set game state for debug manager
    this.debugManager.setGameState(this.gameStateManager.getGameState());

    console.log('GameplayScene: Game state initialized');
  }

  /**
   * Setup input handling and callbacks
   */
  private setupInputHandling(): void {
    console.log('GameplayScene: Setting up input handling');

    // Set game state for input validation
    this.inputHandler.setGameState(this.gameStateManager.getGameState());

    // Set character selection callback
    this.inputHandler.setCharacterSelectionCallback((unit, clickInfo) => {
      this.handleCharacterSelection(unit, clickInfo);
    });

    // Set tile selection callback for movement
    this.inputHandler.setTileSelectionCallback((position, clickInfo) => {
      this.handleTileSelection(position, clickInfo);
    });

    // Set camera control callback
    this.inputHandler.setCameraControlCallback((direction, deltaTime) => {
      this.cameraController.moveCamera(direction, deltaTime);
    });

    // Set shortcut callback
    this.inputHandler.setShortcutCallback((shortcut, keyInfo) => {
      this.handleShortcut(shortcut, keyInfo);
    });

    // Setup movement system callbacks
    this.movementSystem.setOnMovementComplete((character, result) => {
      this.handleMovementComplete(character, result);
    });

    this.movementSystem.setOnSelectionChange(character => {
      this.handleMovementSelectionChange(character);
    });

    // Set unit detection callback for input handler
    this.inputHandler.setUnitDetectionCallback(position => {
      return this.getUnitAtWorldPosition(position);
    });

    // Enable keyboard controls for camera
    this.cameraController.enableKeyboardControls();
    this.cameraController.enableMouseControls();

    console.log('GameplayScene: Input handling setup completed');
  }

  /**
   * Setup UI elements and displays
   */
  private setupUI(): void {
    console.log('GameplayScene: Setting up UI');

    // Create UI elements
    this.uiManager.createUI();

    // Update UI with initial game state
    this.uiManager.updateUI(this.gameStateManager.getGameState());

    console.log('GameplayScene: UI setup completed');
  }

  /**
   * Setup event listeners for system communication
   */
  private setupEventListeners(): void {
    console.log('GameplayScene: Setting up event listeners');

    // Game state events
    this.events.on('turn-changed', (data: any) => {
      this.uiManager.updateTurnDisplay(data.currentTurn, data.activePlayer);
      this.inputHandler.setGameState(this.gameStateManager.getGameState());
    });

    this.events.on('unit-selected', (data: any) => {
      this.uiManager.showCharacterInfo(data.selectedUnit);
    });

    this.events.on('unit-deselected', () => {
      this.uiManager.hideCharacterInfo();
    });

    // UI events
    this.events.on('pause-requested', () => {
      this.handlePause();
    });

    this.events.on('action-selected', (action: string) => {
      this.handleActionSelected(action);
    });

    // Input events
    this.events.on('character-clicked', (data: any) => {
      console.log('Character clicked:', data.unit.name);
    });

    this.events.on('tile-clicked', (data: any) => {
      console.log('Tile clicked:', data.position);
    });

    // Camera events
    this.events.on('camera-focused', (data: any) => {
      console.log('Camera focused on:', data.targetPosition);
    });

    // Character events
    this.events.on('character-moved', (data: any) => {
      console.log('Character moved:', data.character.name, 'to', data.newPosition);
    });

    // Debug events
    this.events.on('debug-mode-enabled', () => {
      console.log('Debug mode enabled');
    });

    this.events.on('debug-mode-disabled', () => {
      console.log('Debug mode disabled');
    });

    // Update debug manager when game state changes
    this.events.on('turn-changed', () => {
      if (this.debugManager) {
        this.debugManager.setGameState(this.gameStateManager.getGameState());
      }
    });

    console.log('GameplayScene: Event listeners setup completed');
  }

  /**
   * Handle keyboard shortcuts
   * @param shortcut - Shortcut string
   * @param keyInfo - Key information
   */
  private handleShortcut(shortcut: string, keyInfo: any): void {
    switch (shortcut) {
      case 'cancel':
      case 'ESCAPE':
        this.handleEscape();
        break;
      case 'end-turn':
      case 'ENTER':
        this.handleEndTurn();
        break;
      case 'next-unit':
      case 'TAB':
        this.handleNextUnit();
        break;
      case 'help':
      case 'F1':
        this.handleHelp();
        break;
      case 'M':
      case 'm':
        this.handleMovementToggle();
        break;
      case 'C':
      case 'c':
        this.handleCancelMovement();
        break;
      case 'Shift+TAB':
        this.handlePreviousUnit();
        break;
      default:
        console.log('Unhandled shortcut:', shortcut);
        break;
    }
  }

  /**
   * Handle escape key press
   */
  private handleEscape(): void {
    // Cancel movement first, then deselect unit, or show pause menu
    if (this.movementSystem.isMovementInProgress()) {
      this.movementSystem.cancelMovement();
    } else if (this.movementSystem.getSelectedCharacter()) {
      this.movementSystem.cancelMovement();
    } else if (this.gameStateManager.getSelectedUnit()) {
      this.gameStateManager.selectUnit(null);
      this.characterManager.selectCharacter(null);
    } else {
      this.handlePause();
    }
  }

  /**
   * Handle end turn action
   */
  private handleEndTurn(): void {
    if (this.gameStateManager.isPlayerTurn()) {
      const turnResult = this.gameStateManager.nextTurn();
      if (turnResult.success) {
        console.log('Turn ended, switching to next player');
      }
    }
  }

  /**
   * Handle next unit selection
   */
  private handleNextUnit(): void {
    // Cycle through player units that can still act
    const playerUnits = this.gameStateManager.getPlayerUnits();
    const availableUnits = playerUnits.filter(unit => !unit.hasActed);

    if (availableUnits.length > 0) {
      const currentSelected = this.gameStateManager.getSelectedUnit();
      let nextIndex = 0;

      if (currentSelected) {
        const currentIndex = availableUnits.findIndex(unit => unit.id === currentSelected.id);
        nextIndex = (currentIndex + 1) % availableUnits.length;
      }

      const nextUnit = availableUnits[nextIndex];
      this.gameStateManager.selectUnit(nextUnit);
      this.characterManager.selectCharacter(nextUnit.id);

      // Focus camera on selected unit
      const worldPos = this.characterManager.getCharacterById(nextUnit.id)?.position;
      if (worldPos) {
        const pixelPos = {
          x: worldPos.x * (this.stageData?.mapData.tileSize || 32) + 16,
          y: worldPos.y * (this.stageData?.mapData.tileSize || 32) + 16,
        };
        this.cameraController.focusOnPosition(pixelPos.x, pixelPos.y);
      }
    }
  }

  /**
   * Handle help request
   */
  private handleHelp(): void {
    console.log('Help requested - showing game controls');
    // In a full implementation, this would show a help overlay
  }

  /**
   * Handle character selection from input
   * @param unit - Selected unit (null for deselection)
   * @param clickInfo - Click information
   */
  private handleCharacterSelection(unit: Unit | null, clickInfo: any): void {
    if (unit) {
      // Try to select character for movement
      const movementResult = this.movementSystem.selectCharacterForMovement(unit, true);

      if (movementResult.valid) {
        // Also update game state manager
        const selectResult = this.gameStateManager.selectUnit(unit);
        if (selectResult.success) {
          this.characterManager.selectCharacter(unit.id);
          console.log(`Character selected for movement: ${unit.name}`);
        } else {
          console.warn(`Failed to select character in game state: ${selectResult.message}`);
        }
      } else {
        console.warn(`Cannot select character for movement: ${movementResult.message}`);
        // Still allow selection for info display
        this.gameStateManager.selectUnit(unit);
        this.characterManager.selectCharacter(unit.id);
      }
    } else {
      // Deselect character
      this.movementSystem.cancelMovement();
      this.gameStateManager.selectUnit(null);
      this.characterManager.selectCharacter(null);
      console.log('Character deselected');
    }
  }

  /**
   * Handle tile selection for movement
   * @param position - Grid position of selected tile
   * @param clickInfo - Click information
   */
  private handleTileSelection(position: Position, clickInfo: any): void {
    const selectedCharacter = this.movementSystem.getSelectedCharacter();

    if (!selectedCharacter) {
      console.log('No character selected for movement');
      return;
    }

    // Check if the position is reachable
    if (!this.movementSystem.isPositionReachable(selectedCharacter, position)) {
      console.log('Position is not reachable');
      return;
    }

    // Execute movement
    console.log(`Moving ${selectedCharacter.name} to position (${position.x}, ${position.y})`);

    this.movementSystem.executeMovement(selectedCharacter, position, {
      showPath: true,
      animate: true,
      onComplete: (character, result) => {
        if (result.success) {
          console.log(`Movement completed for ${character.name}`);
        } else {
          console.error(`Movement failed for ${character.name}: ${result.message}`);
        }
      },
    });
  }

  /**
   * Handle movement completion
   * @param character - Character that completed movement
   * @param result - Movement execution result
   */
  private handleMovementComplete(character: Unit, result: any): void {
    if (result.success) {
      console.log(`Movement completed successfully for ${character.name}`);

      // Update character manager with new position
      this.characterManager.updateCharacterPosition(character.id, character.position);

      // Update all units in movement system
      if (this.stageData) {
        const allCharacters = [...this.stageData.playerUnits, ...this.stageData.enemyUnits];
        this.movementSystem.updateUnits(allCharacters);
      }

      // Emit movement completed event
      this.events.emit('character-movement-completed', {
        character: character,
        newPosition: result.finalPosition,
        timestamp: Date.now(),
      });
    } else {
      console.error(`Movement failed for ${character.name}: ${result.message}`);

      // Emit movement failed event
      this.events.emit('character-movement-failed', {
        character: character,
        error: result.error,
        message: result.message,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle movement selection change
   * @param character - Newly selected character (null for deselection)
   */
  private handleMovementSelectionChange(character: Unit | null): void {
    if (character) {
      console.log(`Movement selection changed to: ${character.name}`);

      // Focus camera on selected character
      const worldPos = this.characterManager.getCharacterById(character.id)?.position;
      if (worldPos) {
        const pixelPos = {
          x: worldPos.x * (this.stageData?.mapData.tileSize || 32) + 16,
          y: worldPos.y * (this.stageData?.mapData.tileSize || 32) + 16,
        };
        this.cameraController.focusOnPosition(pixelPos.x, pixelPos.y);
      }
    } else {
      console.log('Movement selection cleared');
    }
  }

  /**
   * Get unit at world position
   * @param worldPosition - World position to check
   * @returns Unit at position or null
   */
  private getUnitAtWorldPosition(worldPosition: Position): Unit | null {
    if (!this.stageData) {
      return null;
    }

    const tileSize = this.stageData.mapData.tileSize;
    const gridPosition = {
      x: Math.floor(worldPosition.x / tileSize),
      y: Math.floor(worldPosition.y / tileSize),
    };

    // Check all units for position match
    const allUnits = [...this.stageData.playerUnits, ...this.stageData.enemyUnits];
    return (
      allUnits.find(
        unit =>
          unit.position.x === gridPosition.x &&
          unit.position.y === gridPosition.y &&
          unit.currentHP > 0 // Only return living units
      ) || null
    );
  }

  /**
   * Handle pause request
   */
  private handlePause(): void {
    this.isPaused = !this.isPaused;
    console.log('Game paused:', this.isPaused);

    if (this.isPaused) {
      this.showPauseMenu();
    } else {
      this.hidePauseMenu();
    }
  }

  /**
   * Show pause menu with options
   */
  private showPauseMenu(): void {
    // Create pause overlay
    const pauseOverlay = this.add
      .graphics()
      .fillStyle(0x000000, 0.8)
      .fillRect(0, 0, this.cameras.main.width, this.cameras.main.height)
      .setScrollFactor(0)
      .setDepth(1500);

    // Create pause menu container
    const menuContainer = this.add
      .container(this.cameras.main.width / 2, this.cameras.main.height / 2)
      .setScrollFactor(0)
      .setDepth(1501);

    // Pause title
    const pauseTitle = this.add
      .text(0, -120, 'Game Paused', {
        fontSize: '36px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Menu buttons
    const resumeButton = this.createPauseMenuButton(0, -40, 'Resume', () => {
      this.handlePause(); // Toggle pause off
    });

    const returnToStageSelectButton = this.createPauseMenuButton(
      0,
      20,
      'Return to Stage Select',
      () => {
        this.hidePauseMenu();
        this.returnToStageSelect();
      }
    );

    const returnToTitleButton = this.createPauseMenuButton(0, 80, 'Return to Title', () => {
      this.hidePauseMenu();
      this.returnToTitle();
    });

    // Add elements to container
    menuContainer.add([pauseTitle, resumeButton, returnToStageSelectButton, returnToTitleButton]);

    // Store references for cleanup
    this.data.set('pauseOverlay', pauseOverlay);
    this.data.set('pauseMenuContainer', menuContainer);

    // Add keyboard listener for resume
    const resumeKey = this.input.keyboard?.addKey('ESC');
    resumeKey?.once('down', () => {
      if (this.isPaused) {
        this.handlePause();
      }
    });
    this.data.set('pauseResumeKey', resumeKey);
  }

  /**
   * Hide pause menu
   */
  private hidePauseMenu(): void {
    const pauseOverlay = this.data.get('pauseOverlay');
    const pauseMenuContainer = this.data.get('pauseMenuContainer');
    const pauseResumeKey = this.data.get('pauseResumeKey');

    if (pauseOverlay) {
      pauseOverlay.destroy();
      this.data.remove('pauseOverlay');
    }

    if (pauseMenuContainer) {
      pauseMenuContainer.destroy();
      this.data.remove('pauseMenuContainer');
    }

    if (pauseResumeKey) {
      pauseResumeKey.destroy();
      this.data.remove('pauseResumeKey');
    }
  }

  /**
   * Create a pause menu button
   * @param x - X position relative to container
   * @param y - Y position relative to container
   * @param text - Button text
   * @param callback - Click callback
   * @returns Button container
   */
  private createPauseMenuButton(
    x: number,
    y: number,
    text: string,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const buttonContainer = this.add.container(x, y);

    // Button background
    const buttonBg = this.add
      .graphics()
      .fillStyle(0x2c3e50, 1)
      .lineStyle(2, 0x3498db, 1)
      .fillRoundedRect(-100, -15, 200, 30, 5)
      .strokeRoundedRect(-100, -15, 200, 30, 5);

    // Button text
    const buttonText = this.add
      .text(0, 0, text, {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    buttonContainer.add([buttonBg, buttonText]);

    // Make interactive
    buttonContainer.setSize(200, 30);
    buttonContainer.setInteractive({ useHandCursor: true });

    // Hover effects
    buttonContainer.on('pointerover', () => {
      buttonBg
        .clear()
        .fillStyle(0x3498db, 1)
        .lineStyle(2, 0x2980b9, 1)
        .fillRoundedRect(-100, -15, 200, 30, 5)
        .strokeRoundedRect(-100, -15, 200, 30, 5);
    });

    buttonContainer.on('pointerout', () => {
      buttonBg
        .clear()
        .fillStyle(0x2c3e50, 1)
        .lineStyle(2, 0x3498db, 1)
        .fillRoundedRect(-100, -15, 200, 30, 5)
        .strokeRoundedRect(-100, -15, 200, 30, 5);
    });

    buttonContainer.on('pointerdown', callback);

    return buttonContainer;
  }

  /**
   * Handle action selection from UI
   * @param action - Selected action
   */
  private handleActionSelected(action: string): void {
    console.log('Action selected:', action);
    // In a full implementation, this would handle different actions
    // like move, attack, use item, etc.
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    if (this.config.debugMode) {
      this.fpsText = this.add
        .text(10, 10, 'FPS: 0', {
          fontSize: '16px',
          color: '#00ff00',
          fontFamily: 'Arial',
        })
        .setScrollFactor(0)
        .setDepth(2000);
    }
  }

  /**
   * Update performance monitoring
   * @param time - Current time
   * @param delta - Delta time
   */
  private updatePerformanceMonitoring(time: number, delta: number): void {
    this.frameCount++;

    // Update FPS display every second
    if (time - this.lastUpdateTime >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (time - this.lastUpdateTime));
      if (this.fpsText) {
        this.fpsText.setText(`FPS: ${fps}`);
      }
      this.frameCount = 0;
    }
  }

  /**
   * Show loading indicator with enhanced visual feedback
   */
  private showLoadingIndicator(): void {
    // Create loading overlay
    const loadingOverlay = this.add
      .graphics()
      .fillStyle(0x000000, 0.9)
      .fillRect(0, 0, this.cameras.main.width, this.cameras.main.height)
      .setScrollFactor(0)
      .setDepth(3000);

    // Loading text
    const loadingText = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'Loading gameplay...', {
        fontSize: '28px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3001);

    // Loading spinner/progress indicator
    const loadingSpinner = this.add
      .graphics()
      .lineStyle(4, 0x3498db, 1)
      .strokeCircle(0, 0, 30)
      .setScrollFactor(0)
      .setDepth(3001);

    loadingSpinner.setPosition(this.cameras.main.width / 2, this.cameras.main.height / 2 + 60);

    // Animate spinner
    const spinnerTween = this.tweens.add({
      targets: loadingSpinner,
      rotation: Math.PI * 2,
      duration: 1000,
      repeat: -1,
      ease: 'Linear',
    });

    // Store references for cleanup
    this.data.set('loadingOverlay', loadingOverlay);
    this.data.set('loadingText', loadingText);
    this.data.set('loadingSpinner', loadingSpinner);
    this.data.set('spinnerTween', spinnerTween);
  }

  /**
   * Hide loading indicator
   */
  private hideLoadingIndicator(): void {
    const loadingOverlay = this.data.get('loadingOverlay');
    const loadingText = this.data.get('loadingText');
    const loadingSpinner = this.data.get('loadingSpinner');
    const spinnerTween = this.data.get('spinnerTween');

    if (spinnerTween) {
      spinnerTween.destroy();
      this.data.remove('spinnerTween');
    }

    if (loadingOverlay) {
      loadingOverlay.destroy();
      this.data.remove('loadingOverlay');
    }

    if (loadingText) {
      loadingText.destroy();
      this.data.remove('loadingText');
    }

    if (loadingSpinner) {
      loadingSpinner.destroy();
      this.data.remove('loadingSpinner');
    }
  }

  /**
   * Handle load errors
   * @param message - Error message
   */
  private handleLoadError(message: string): void {
    console.error('GameplayScene: Load error:', message);
    this.showError(`Load Error: ${message}`);
  }

  /**
   * Handle initialization errors
   * @param error - Error object
   */
  private handleInitializationError(error: any): void {
    console.error('GameplayScene: Initialization error:', error);
    this.showError(`Initialization Error: ${error.message || error}`);
    this.hasError = true;
  }

  /**
   * Handle runtime errors
   * @param error - Error object
   */
  private handleRuntimeError(error: any): void {
    console.error('GameplayScene: Runtime error:', error);
    this.showError(`Runtime Error: ${error.message || error}`);
  }

  /**
   * Show error message to user
   * @param message - Error message to display
   */
  private showError(message: string): void {
    if (this.errorText) {
      this.errorText.destroy();
    }

    this.errorText = this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        message + '\n\nPress ESC to return to title screen',
        {
          fontSize: '20px',
          color: '#ff6666',
          fontFamily: 'Arial',
          align: 'center',
          backgroundColor: '#000000',
          padding: { x: 20, y: 20 },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3000);

    // Allow escape to return to title
    this.input.keyboard?.once('keydown-ESC', () => {
      this.returnToTitle();
    });
  }

  /**
   * Return to stage selection menu
   */
  public async returnToStageSelect(): Promise<void> {
    try {
      console.log('GameplayScene: Returning to stage selection');

      // Prepare return data with current game state
      const returnData: SceneData = {
        fromScene: 'GameplayScene',
        action: 'return-to-menu',
        timestamp: Date.now(),
        gameState: {
          stageId: this.stageData?.id,
          wasCompleted: false,
          playTime: Date.now() - (this.data.get('startTime') || Date.now()),
        },
      };

      await SceneTransition.transitionTo(
        this,
        'StageSelectScene',
        TransitionType.SLIDE_RIGHT,
        returnData
      );
    } catch (error) {
      console.error('GameplayScene: Error returning to stage select:', error);
      // Fallback to title screen
      this.returnToTitle();
    }
  }

  /**
   * Return to title screen
   */
  private async returnToTitle(): Promise<void> {
    try {
      console.log('GameplayScene: Returning to title screen');

      const returnData: SceneData = {
        fromScene: 'GameplayScene',
        action: 'return-to-title',
        timestamp: Date.now(),
        gameState: {
          stageId: this.stageData?.id,
          wasCompleted: false,
          playTime: Date.now() - (this.data.get('startTime') || Date.now()),
        },
      };

      await SceneTransition.transitionTo(this, 'TitleScene', TransitionType.FADE_OUT, returnData);
    } catch (error) {
      console.error('GameplayScene: Error returning to title:', error);
      // Force scene change as fallback
      this.scene.start('TitleScene');
    }
  }

  /**
   * Get current stage data
   * @returns Current stage data or undefined
   */
  public getStageData(): StageData | undefined {
    return this.stageData;
  }

  /**
   * Get game state manager
   * @returns GameStateManager instance
   */
  public getGameStateManager(): GameStateManager {
    return this.gameStateManager;
  }

  /**
   * Get character manager
   * @returns CharacterManager instance
   */
  public getCharacterManager(): CharacterManager {
    return this.characterManager;
  }

  /**
   * Check if scene is initialized
   * @returns True if scene is fully initialized
   */
  public isSceneInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get unit at world position
   * @param worldPosition - World position to check
   * @returns Unit at position or null
   */
  private getUnitAtWorldPosition(worldPosition: Position): Unit | null {
    if (!this.stageData) {
      return null;
    }

    const tileSize = this.stageData.mapData.tileSize;
    const gridPosition = {
      x: Math.floor(worldPosition.x / tileSize),
      y: Math.floor(worldPosition.y / tileSize),
    };

    // Check all units for position match
    const allUnits = [...this.stageData.playerUnits, ...this.stageData.enemyUnits];
    return (
      allUnits.find(
        unit =>
          unit.position.x === gridPosition.x &&
          unit.position.y === gridPosition.y &&
          unit.currentHP > 0 // Only return living units
      ) || null
    );
  }

  /**
   * Handle movement toggle shortcut (M key)
   */
  private handleMovementToggle(): void {
    const selectedUnit = this.gameStateManager.getSelectedUnit();

    if (!selectedUnit) {
      console.log('No unit selected for movement toggle');
      return;
    }

    if (this.movementSystem.isCharacterSelected(selectedUnit)) {
      // Cancel movement if already selected
      this.movementSystem.cancelMovement();
      console.log('Movement cancelled');
    } else {
      // Select for movement
      const result = this.movementSystem.selectCharacterForMovement(selectedUnit);
      if (result.valid) {
        console.log(`Movement mode activated for ${selectedUnit.name}`);
      } else {
        console.warn(`Cannot activate movement: ${result.message}`);
      }
    }
  }

  /**
   * Handle cancel movement shortcut (C key)
   */
  private handleCancelMovement(): void {
    if (this.movementSystem.getSelectedCharacter()) {
      this.movementSystem.cancelMovement();
      console.log('Movement cancelled');
    } else {
      console.log('No movement to cancel');
    }
  }

  /**
   * Handle previous unit selection (Shift+Tab)
   */
  private handlePreviousUnit(): void {
    // Cycle through player units that can still act (in reverse)
    const playerUnits = this.gameStateManager.getPlayerUnits();
    const availableUnits = playerUnits.filter(unit => !unit.hasActed);

    if (availableUnits.length === 0) {
      console.log('No available units to select');
      return;
    }

    const currentSelected = this.gameStateManager.getSelectedUnit();
    let prevIndex = availableUnits.length - 1; // Default to last unit

    if (currentSelected) {
      const currentIndex = availableUnits.findIndex(unit => unit.id === currentSelected.id);
      if (currentIndex > 0) {
        prevIndex = currentIndex - 1;
      }
    }

    const prevUnit = availableUnits[prevIndex];
    this.gameStateManager.selectUnit(prevUnit);
    this.characterManager.selectCharacter(prevUnit.id);

    // Focus camera on selected unit
    const worldPos = this.characterManager.getCharacterById(prevUnit.id)?.position;
    if (worldPos) {
      const pixelPos = {
        x: worldPos.x * (this.stageData?.mapData.tileSize || 32) + 16,
        y: worldPos.y * (this.stageData?.mapData.tileSize || 32) + 16,
      };
      this.cameraController.focusOnPosition(pixelPos.x, pixelPos.y);
    }

    console.log(`Previous unit selected: ${prevUnit.name}`);
  }

  /**
   * Scene cleanup method
   * Called when the scene is destroyed to prevent memory leaks
   */
  public destroy(): void {
    console.log('GameplayScene: Starting cleanup');

    // Hide pause menu if active
    if (this.isPaused) {
      this.hidePauseMenu();
    }

    // Hide loading indicator if active
    this.hideLoadingIndicator();

    // Cleanup managers
    if (this.gameStateManager) {
      this.gameStateManager.reset();
    }

    if (this.cameraController) {
      this.cameraController.destroy();
    }

    if (this.uiManager) {
      this.uiManager.destroy();
    }

    if (this.inputHandler) {
      this.inputHandler.destroy();
    }

    if (this.mapRenderer) {
      this.mapRenderer.destroy();
    }

    if (this.characterManager) {
      this.characterManager.destroy();
    }

    if (this.movementSystem) {
      this.movementSystem.destroy();
    }

    // Cleanup UI elements
    if (this.fpsText) {
      this.fpsText.destroy();
    }

    if (this.errorText) {
      this.errorText.destroy();
    }

    // Remove all event listeners
    this.events.removeAllListeners();

    // Clear all stored data
    if (this.data && typeof this.data.removeAll === 'function') {
      this.data.removeAll();
    }

    // Reset state
    this.isInitialized = false;
    this.hasError = false;
    this.isPaused = false;
    this.stageData = undefined;

    console.log('GameplayScene: Cleanup completed');
  }
}
