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
import { BattleSystem } from '../systems/BattleSystem';
import { RecruitmentSystem } from '../systems/recruitment/RecruitmentSystem';
import { RecruitmentUI } from '../systems/recruitment/RecruitmentUI';
import { SkillSystem } from '../systems/skills/SkillSystem';
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
import { BattleResult, BattleError } from '../types/battle';
import { RecruitmentResult, RecruitmentProgress, RecruitmentCondition } from '../types/recruitment';
import { AISystemManager } from '../systems/ai/AISystemManager';
import { AISystemManagerConfig, AIExecutionResult } from '../types/ai';

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
    private battleSystem!: BattleSystem;
    private recruitmentSystem!: RecruitmentSystem;
    private recruitmentUI!: RecruitmentUI;
    private skillSystem!: SkillSystem;
    private aiSystemManager!: AISystemManager;

    // Scene data and state
    private stageData?: StageData;
    private config: GameplaySceneConfig;
    private isInitialized: boolean = false;
    private isPaused: boolean = false;

    // Battle system state
    private isBattleActive: boolean = false;
    private battleInputLocked: boolean = false;

    // AI system state
    private isAIExecuting: boolean = false;
    private aiTurnInProgress: boolean = false;

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

            // Update AI system state
            this.updateAISystem(time, delta);

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

            // Initialize data persistence for recruitment system
            this.initializeDataPersistence();

            // Initialize skill system with battlefield state
            this.initializeSkillSystem();

            // Initialize AI system with all game systems
            this.initializeAISystem();

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
                metadata: {
                    recruitment: {
                        conditions: [
                            {
                                id: 'specific_attacker',
                                type: 'specific_attacker',
                                description: '主人公で攻撃して撃破する',
                                parameters: {
                                    attackerId: 'player-1',
                                },
                            },
                            {
                                id: 'hp_threshold',
                                type: 'hp_threshold',
                                description: 'HPが30%以下の状態で撃破する',
                                parameters: {
                                    threshold: 0.3,
                                },
                            },
                        ],
                        priority: 80,
                        description: 'オークの戦士を仲間にする',
                        rewards: [],
                    },
                },
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
                metadata: {
                    recruitment: {
                        conditions: [
                            {
                                id: 'damage_type',
                                type: 'damage_type',
                                description: '魔法攻撃で撃破する',
                                parameters: {
                                    damageType: 'magic',
                                },
                            },
                        ],
                        priority: 60,
                        description: 'ゴブリンの弓兵を仲間にする',
                        rewards: [],
                    },
                },
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

        // Initialize BattleSystem
        this.battleSystem = new BattleSystem(this, {
            enableAnimations: true,
            enableSoundEffects: false, // Disabled for now
            battleSpeed: 1.0,
            enableBattleLogging: this.config.debugMode,
            animationTimeout: 5000,
            enableResultCaching: false,
        });

        // Initialize RecruitmentSystem
        this.recruitmentSystem = new RecruitmentSystem(
            this,
            {
                enableRecruitment: true,
                enableConditionValidation: true,
                enableProgressTracking: true,
                enableNPCProtection: true,
                debugMode: this.config.debugMode,
            },
            this.events
        );

        // Initialize RecruitmentUI
        this.recruitmentUI = new RecruitmentUI(
            this,
            {
                showConditions: true,
                showProgress: true,
                enableAnimations: true,
                enableSoundEffects: false,
                conditionDisplayDuration: 5000,
                successAnimationDuration: 3000,
                failureAnimationDuration: 2000,
                npcIndicatorScale: 1.0,
            },
            this.events
        );

        // Initialize SkillSystem
        this.skillSystem = new SkillSystem(this, {
            execution: {
                enableAnimations: true,
                enableSoundEffects: false,
                executionSpeed: 1.0,
                animationTimeout: 5000,
                enableDebugLogging: this.config.debugMode,
                enableAutoRecovery: true
            },
            ui: {
                menuPosition: { x: 150, y: 150 },
                menuSize: { width: 320, height: 450 },
                rangeColors: {
                    valid: 0x00ff00,
                    invalid: 0xff0000,
                    selected: 0xffff00,
                    area: 0x0088ff
                },
                animations: {
                    menuFadeIn: 300,
                    menuFadeOut: 200,
                    rangeDisplay: 150
                },
                keyboard: {
                    enabled: true,
                    repeatDelay: 500,
                    repeatRate: 150
                },
                detailPanel: {
                    width: 380,
                    height: 280,
                    position: { x: 480, y: 150 }
                }
            },
            debugMode: this.config.debugMode,
            autoSave: true,
            performanceMonitoring: this.config.performanceMonitoring,
            autoErrorRecovery: true
        });

        // Initialize AISystemManager
        const aiConfig: AISystemManagerConfig = {
            thinkingTimeLimit: 2000, // 2 seconds
            enableDebugLogging: this.config.debugMode,
            enableVisualFeedback: true,
            randomFactor: 0.2,
            npcPriorityMultiplier: 50,
            defaultDifficulty: {
                thinkingDepth: 3,
                randomnessFactor: 0.2,
                mistakeProbability: 0.1,
                reactionTime: 1000,
                skillUsageFrequency: 0.7,
            },
        };

        this.aiSystemManager = new AISystemManager(this, aiConfig, this.events);

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

        // Initialize battle system with map data
        // Note: Units will be set later in setupCharacters
        this.battleSystem.initialize([], this.stageData.mapData);

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

        // Update battle system with all units
        this.battleSystem.initialize(allCharacters, this.stageData.mapData);

        // Initialize recruitment system with stage data
        const recruitmentResult = this.recruitmentSystem.initialize(this.stageData);
        if (!recruitmentResult.success) {
            console.warn('Failed to initialize recruitment system:', recruitmentResult.message);
        } else {
            console.log('Recruitment system initialized:', recruitmentResult.message);
        }

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

        // Set character selection callback (battle and recruitment aware)
        this.inputHandler.setCharacterSelectionCallback((unit, clickInfo) => {
            this.handleCharacterSelectionWithRecruitment(unit, clickInfo);
        });

        // Set tile selection callback for movement (battle-aware)
        this.inputHandler.setTileSelectionCallback((position, clickInfo) => {
            this.handleTileSelectionWithBattle(position, clickInfo);
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

            // Handle AI turn start
            this.handleTurnChanged(data);
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

        // Battle system event listeners
        this.setupBattleEventListeners();

        // Recruitment system event listeners
        this.setupRecruitmentEventListeners();

        // Skill system event listeners
        this.setupSkillEventListeners();

        // AI system event listeners
        this.setupAIEventListeners();

        console.log('GameplayScene: Event listeners setup completed');
    }

    /**
     * Setup battle system event listeners
     */
    private setupBattleEventListeners(): void {
        console.log('GameplayScene: Setting up battle event listeners');

        // Battle system events
        this.battleSystem.on('attack-initiated', (data: any) => {
            this.handleBattleAttackInitiated(data);
        });

        this.battleSystem.on('attack-range-shown', (data: any) => {
            this.handleBattleRangeShown(data);
        });

        this.battleSystem.on('target-selected', (data: any) => {
            this.handleBattleTargetSelected(data);
        });

        this.battleSystem.on('battle-complete', (data: any) => {
            this.handleBattleComplete(data);
        });

        this.battleSystem.on('attack-cancelled', (data: any) => {
            this.handleBattleCancelled(data);
        });

        this.battleSystem.on('battle-error', (data: any) => {
            this.handleBattleError(data);
        });

        // Battle animation events
        this.battleSystem.on('attack-animation-complete', (data: any) => {
            console.log('Attack animation completed:', data);
        });

        this.battleSystem.on('damage-animation-complete', (data: any) => {
            console.log('Damage animation completed:', data);
        });

        this.battleSystem.on('unit-defeated', (data: any) => {
            this.handleUnitDefeated(data);
        });

        this.battleSystem.on('experience-granted', (data: any) => {
            this.handleExperienceGranted(data);
        });

        console.log('GameplayScene: Battle event listeners setup completed');
    }

    /**
     * Setup recruitment system event listeners
     */
    private setupRecruitmentEventListeners(): void {
        console.log('GameplayScene: Setting up recruitment event listeners');

        // Recruitment system events
        this.events.on('recruitment-initialized', (data: any) => {
            console.log(
                `Recruitment system initialized with ${data.recruitableCount} recruitable characters`
            );
        });

        this.events.on('recruitment-eligibility-checked', (data: any) => {
            console.log(
                `Recruitment eligibility checked for ${data.unitId}: ${data.eligible ? 'eligible' : 'not eligible'}`
            );
        });

        this.events.on('recruitment-attempt-processed', (data: any) => {
            console.log(
                `Recruitment attempt processed for ${data.unitId}:`,
                data.result.success ? 'success' : 'failed'
            );
        });

        this.events.on('character-converted-to-npc', (data: any) => {
            console.log(`Character ${data.unitId} converted to NPC state`);

            // Find the unit and show NPC indicator
            const unit = this.findUnitById(data.unitId);
            if (unit) {
                this.recruitmentUI.showNPCIndicator(unit);

                // Update character visual state
                this.characterManager.updateCharacterVisualState(unit.id, 'npc');
            }
        });

        this.events.on('recruitment-completed', (data: any) => {
            console.log(
                `Recruitment completed for ${data.unitId}: ${data.success ? 'success' : 'failed'}`
            );

            if (data.success) {
                const unit = this.findUnitById(data.unitId);
                if (unit) {
                    this.recruitmentUI.showRecruitmentSuccess(unit);
                }
            }
        });

        this.events.on('recruitment-failed', (data: any) => {
            console.log(`Recruitment failed for ${data.unitId}: ${data.reason}`);

            const unit = this.findUnitById(data.unitId);
            if (unit) {
                this.recruitmentUI.showRecruitmentFailure(
                    unit,
                    this.getRecruitmentErrorMessage(data.reason)
                );
                this.recruitmentUI.hideNPCIndicator(unit);
            }
        });

        this.events.on('stage-recruitment-completed', (data: any) => {
            console.log(
                `Stage recruitment completed: ${data.recruitedUnits.length} recruited, ${data.failedUnits.length} failed`
            );

            // Handle stage completion with recruited units
            this.handleStageRecruitmentCompletion(data.recruitedUnits, data.failedUnits);
        });

        console.log('GameplayScene: Recruitment event listeners setup completed');
    }

    /**
     * Setup skill system event listeners
     */
    private setupSkillEventListeners(): void {
        console.log('GameplayScene: Setting up skill event listeners');

        if (!this.skillSystem) {
            console.warn('Skill system not available for event listener setup');
            return;
        }

        // Skill system events
        this.skillSystem.on('skill-executed', (data: any) => {
            console.log('Skill executed:', data.result?.skillId);

            // Update UI based on skill execution
            if (data.result?.success) {
                this.uiManager.showNotification({
                    message: `${data.result.skillName || 'Skill'} executed successfully!`,
                    type: 'success',
                    duration: 2000
                });
            }
        });

        this.skillSystem.on('skill-execution-error', (data: any) => {
            console.error('Skill execution error:', data.error?.message);

            this.uiManager.showErrorNotification({
                message: data.error?.message || 'Skill execution failed',
                type: 'error',
                duration: 3000
            });
        });

        this.skillSystem.on('skill-selection-cancelled', (data: any) => {
            console.log('Skill selection cancelled for:', data.casterId);

            // Show action menu again when skill selection is cancelled
            const unit = this.findUnitById(data.casterId);
            if (unit) {
                this.showActionMenuForUnit(unit);
            }
        });

        this.skillSystem.on('battle-system-update', (data: any) => {
            console.log('Battle system update from skill system:', data);

            // Update battle system state if needed
            if (this.battleSystem && data.unitUpdates) {
                data.unitUpdates.forEach((update: any) => {
                    // Update unit in battle system
                    console.log('Updating unit in battle system:', update.unitId);
                });
            }
        });

        this.skillSystem.on('turn-system-update', (data: any) => {
            console.log('Turn system update from skill system:', data);

            // Update turn system state if needed
            if (data.advanceTurn) {
                const turnResult = this.gameStateManager.nextTurn();
                if (!turnResult.success) {
                    console.error('Failed to advance turn from skill system:', turnResult.message);
                }
            }
        });

        console.log('GameplayScene: Skill event listeners setup completed');
    }

    /**
     * Setup AI system event listeners
     */
    private setupAIEventListeners(): void {
        console.log('GameplayScene: Setting up AI event listeners');

        if (!this.aiSystemManager) {
            console.warn('AI system manager not available for event listener setup');
            return;
        }

        // AI turn events
        this.events.on('ai-turn-started', (data: any) => {
            console.log('AI turn started for:', data.unit.name);
            this.isAIExecuting = true;
            this.aiTurnInProgress = true;

            // Disable player input during AI turn (using flag)
            // Note: InputHandler doesn't have setInputEnabled, so we use our own flag

            // Show AI thinking indicator
            this.uiManager.showNotification({
                message: `${data.unit.name} is thinking...`,
                type: 'info',
                duration: 0, // Keep showing until AI turn completes
            });
        });

        this.events.on('ai-turn-completed', (data: any) => {
            console.log('AI turn completed for:', data.unit.name, 'Success:', data.success);
            this.isAIExecuting = false;
            this.aiTurnInProgress = false;

            // Re-enable player input (flag is reset above)

            // Hide AI thinking notification
            this.uiManager.hideNotification();

            // Show action result
            if (data.success && data.action) {
                this.uiManager.showNotification({
                    message: `${data.unit.name}: ${data.action.reasoning}`,
                    type: 'info',
                    duration: 2000,
                });
            }

            // Advance to next turn after a short delay
            this.time.delayedCall(1000, () => {
                this.advanceToNextTurn();
            });
        });

        console.log('GameplayScene: AI event listeners setup completed');
    }

    /**
     * Handle turn changed event
     */
    private handleTurnChanged(data: any): void {
        console.log('GameplayScene: Handling turn change to', data.activePlayer);

        // If it's an enemy turn, start AI execution
        if (data.activePlayer === 'enemy' && data.activeUnit && !this.isAIExecuting) {
            this.startAITurn(data.activeUnit);
        }
    }

    /**
     * Start AI turn for the given unit
     */
    private async startAITurn(activeUnit: Unit): Promise<void> {
        if (!this.aiSystemManager || !this.stageData) {
            console.warn('Cannot start AI turn: missing AI system or stage data');
            return;
        }

        try {
            console.log('GameplayScene: Starting AI turn for', activeUnit.name);

            // Set AI execution flag
            this.isAIExecuting = true;
            this.aiTurnInProgress = true;

            // Update AI unit state at turn start (skill cooldowns, etc.)
            const updateResult = this.gameStateManager.updateAIUnitAtTurnStart(activeUnit);
            if (!updateResult.success) {
                console.warn('Failed to update AI unit at turn start:', updateResult.message);
            }

            // Start AI thinking phase
            const thinkingResult = this.gameStateManager.startAIThinkingPhase(activeUnit);
            if (!thinkingResult.success) {
                console.warn('Failed to start AI thinking phase:', thinkingResult.message);
            }

            // Execute AI turn
            const result = await this.aiSystemManager.executeAITurn(
                activeUnit,
                this.gameStateManager.getGameState(),
                this.stageData.mapData
            );

            console.log('GameplayScene: AI turn result:', result);

            // Complete AI thinking phase
            const completeThinkingResult = this.gameStateManager.completeAIThinkingPhase(activeUnit);
            if (!completeThinkingResult.success) {
                console.warn('Failed to complete AI thinking phase:', completeThinkingResult.message);
            }

            if (result.success && result.action) {
                // Execute the AI action through appropriate systems
                await this.executeAIAction(activeUnit, result.action);
            } else {
                console.warn('AI turn failed:', result.message);
                // Mark as acted to prevent infinite loop
                this.gameStateManager.completeAIAction(activeUnit, 'wait');
            }

        } catch (error) {
            console.error('GameplayScene: Error during AI turn:', error);
            // Mark as acted to prevent infinite loop
            this.gameStateManager.completeAIAction(activeUnit, 'wait');
        } finally {
            // Clear AI execution flags
            this.isAIExecuting = false;
            this.aiTurnInProgress = false;
        }
    }

    /**
     * Execute AI action through appropriate game systems
     * @param aiUnit - AI unit performing the action
     * @param action - AI action to execute
     */
    private async executeAIAction(aiUnit: Unit, action: any): Promise<void> {
        try {
            console.log('GameplayScene: Executing AI action', {
                unit: aiUnit.name,
                action: action.type,
                target: action.target?.name || 'none'
            });

            let actionResult: any = null;

            switch (action.type) {
                case 'move':
                    if (action.position && this.movementSystem) {
                        // Execute movement
                        const moveResult = await this.movementSystem.executeMovement(
                            aiUnit,
                            action.position
                        );

                        if (moveResult.success) {
                            this.gameStateManager.completeAIAction(aiUnit, 'move');
                            actionResult = moveResult;
                        }
                    }
                    break;

                case 'attack':
                    if (action.target && this.battleSystem) {
                        // Execute attack through battle system
                        const battleResult = await this.battleSystem.executeAIAction(action);

                        if (battleResult) {
                            this.gameStateManager.completeAIAction(aiUnit, 'attack');
                            actionResult = battleResult;
                        }
                    }
                    break;

                case 'skill':
                    if (action.skillId && this.battleSystem) {
                        // Execute skill through battle system
                        const skillResult = await this.battleSystem.executeAIAction(action);

                        if (skillResult) {
                            this.gameStateManager.completeAIAction(aiUnit, 'skill');
                            actionResult = skillResult;
                        }
                    }
                    break;

                case 'wait':
                default:
                    // Wait action - just mark as acted
                    this.gameStateManager.completeAIAction(aiUnit, 'wait');
                    actionResult = { success: true, action: 'wait' };
                    break;
            }

            // Notify battle system of AI action completion
            if (this.battleSystem && actionResult) {
                this.battleSystem.notifyAIActionComplete(action, actionResult);
            }

            console.log('GameplayScene: AI action completed', {
                unit: aiUnit.name,
                action: action.type,
                success: actionResult?.success !== false
            });

        } catch (error) {
            console.error('GameplayScene: Error executing AI action:', error);
            // Mark as acted to prevent infinite loop
            this.gameStateManager.completeAIAction(aiUnit, 'wait');
        }
    }

    /**
     * Advance to the next turn
     */
    private advanceToNextTurn(): void {
        if (this.isAIExecuting) {
            console.log('GameplayScene: Skipping turn advance - AI still executing');
            return;
        }

        const turnResult = this.gameStateManager.nextTurn();
        if (!turnResult.success) {
            console.error('GameplayScene: Failed to advance turn:', turnResult.message);
        }
    }

    /**
     * Handle keyboard shortcuts
     * @param shortcut - Shortcut string
     * @param keyInfo - Key information
     */
    private handleShortcut(shortcut: string, keyInfo: any): void {
        // Handle battle shortcuts first
        this.handleBattleShortcuts(shortcut, keyInfo);

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
            case 'S':
            case 's':
                this.handleSkillShortcut();
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
            // Show recruitment conditions if unit is recruitable
            this.showRecruitmentConditionsIfApplicable(unit);

            // Try to select character for movement
            const movementResult = this.movementSystem.selectCharacterForMovement(unit, true);

            if (movementResult.valid) {
                // Also update game state manager
                const selectResult = this.gameStateManager.selectUnit(unit);
                if (selectResult.success) {
                    this.characterManager.selectCharacter(unit.id);
                    console.log(`Character selected for movement: ${unit.name}`);

                    // Show action menu for player units
                    if (unit.faction === 'player' && this.gameStateManager.isPlayerTurn()) {
                        this.showActionMenuForUnit(unit);
                    }
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

        const selectedUnit = this.gameStateManager.getSelectedUnit();
        if (!selectedUnit) {
            console.warn('No unit selected for action');
            return;
        }

        switch (action) {
            case 'move':
                this.handleMoveAction(selectedUnit);
                break;
            case 'attack':
                this.handleAttackAction(selectedUnit);
                break;
            case 'skill':
                this.handleSkillAction(selectedUnit);
                break;
            case 'wait':
                this.handleWaitAction(selectedUnit);
                break;
            case 'cancel':
                this.handleCancelAction();
                break;
            default:
                console.warn('Unknown action:', action);
                break;
        }
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
     * Update AI system state
     * @param time - Current time
     * @param delta - Delta time
     */
    private updateAISystem(time: number, delta: number): void {
        if (!this.aiSystemManager) {
            return;
        }

        // Check if AI is taking too long (timeout handling)
        if (this.isAIExecuting) {
            const thinkingState = this.aiSystemManager.getThinkingState();

            // If AI has been thinking for more than 5 seconds, show warning
            if (thinkingState.thinkingTime > 5000) {
                console.warn('AI thinking time exceeded 5 seconds');

                // Show timeout warning to user
                this.uiManager.showNotification({
                    message: 'AI is taking longer than expected...',
                    type: 'warning',
                    duration: 2000,
                });
            }

            // If AI has been thinking for more than 10 seconds, force timeout
            if (thinkingState.thinkingTime > 10000) {
                console.error('AI thinking timeout - forcing turn advance');
                this.isAIExecuting = false;
                this.aiTurnInProgress = false;
                // Input will be re-enabled when AI execution completes
                this.uiManager.hideNotification();

                this.time.delayedCall(100, () => {
                    this.advanceToNextTurn();
                });
            }
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
     * Handle skill shortcut (S key)
     */
    private handleSkillShortcut(): void {
        const selectedUnit = this.gameStateManager.getSelectedUnit();

        if (!selectedUnit) {
            console.log('No unit selected for skill shortcut');
            return;
        }

        if (selectedUnit.faction !== 'player') {
            console.log('Cannot use skills with non-player units');
            return;
        }

        if (selectedUnit.hasActed) {
            console.log('Unit has already acted this turn');
            return;
        }

        if (!this.gameStateManager.isPlayerTurn()) {
            console.log('Cannot use skills during enemy turn');
            return;
        }

        // Use the skill action handler
        this.handleSkillAction(selectedUnit);
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
     * Show action menu for a selected unit
     * @param unit - Unit to show actions for
     */
    private showActionMenuForUnit(unit: Unit): void {
        const actions = [];

        // Move action (if unit hasn't moved)
        if (!unit.hasMoved && this.movementSystem.canCharacterMove(unit)) {
            actions.push({
                text: 'Move',
                action: 'move',
                enabled: true,
            });
        }

        // Attack action (if unit can attack)
        if (!unit.hasActed && this.battleSystem.canAttack(unit)) {
            actions.push({
                text: 'Attack',
                action: 'attack',
                enabled: true,
            });
        }

        // Skill action (if unit has skills and hasn't acted)
        if (!unit.hasActed && this.skillSystem) {
            const availableSkills = this.skillSystem.getAvailableSkills(unit.id);
            const usableSkills = availableSkills.filter(skill => skill.enabled);

            if (usableSkills.length > 0) {
                actions.push({
                    text: 'Skill',
                    action: 'skill',
                    enabled: true,
                });
            }
        }

        // Wait action (always available)
        actions.push({
            text: 'Wait',
            action: 'wait',
            enabled: !unit.hasActed,
        });

        // Cancel action (always available)
        actions.push({
            text: 'Cancel',
            action: 'cancel',
            enabled: true,
        });

        // Show the action menu
        this.uiManager.showActionMenu(actions);
    }

    // ===== BATTLE SYSTEM INTEGRATION METHODS =====

    /**
     * Handle move action
     * @param unit - Unit to move
     */
    private handleMoveAction(unit: Unit): void {
        console.log(`Move action for ${unit.name}`);

        // Use existing movement system
        const movementResult = this.movementSystem.selectCharacterForMovement(unit, true);

        if (movementResult.valid) {
            this.uiManager.hideActionMenu();
            console.log(`Movement initiated for ${unit.name}`);
        } else {
            this.uiManager.showErrorNotification({
                message: movementResult.message || 'Cannot move this unit',
                type: 'error',
                duration: 2000,
            });
        }
    }

    /**
     * Handle attack action
     * @param unit - Unit to attack with
     */
    private async handleAttackAction(unit: Unit): Promise<void> {
        console.log(`Attack action for ${unit.name}`);

        // Check if unit can attack
        if (!this.battleSystem.canAttack(unit)) {
            this.uiManager.showErrorNotification({
                message: 'This unit cannot attack',
                type: 'error',
                duration: 2000,
            });
            return;
        }

        try {
            // Lock input during battle
            this.battleInputLocked = true;
            this.isBattleActive = true;

            // Hide action menu
            this.uiManager.hideActionMenu();

            // Show battle status
            this.uiManager.showBattleStatus('Select Attack Target');

            // Initiate attack with battle system
            await this.battleSystem.initiateAttack(unit);

            console.log(`Attack initiated for ${unit.name}`);
        } catch (error) {
            console.error('Failed to initiate attack:', error);
            this.uiManager.showErrorNotification({
                message: 'Failed to initiate attack',
                type: 'error',
                duration: 2000,
            });
            this.resetBattleState();
        }
    }

    /**
     * Handle skill action
     * @param unit - Unit to use skill with
     */
    private async handleSkillAction(unit: Unit): Promise<void> {
        console.log(`Skill action for ${unit.name}`);

        // Check if unit has skills
        if (!this.skillSystem) {
            this.uiManager.showErrorNotification({
                message: 'Skill system not available',
                type: 'error',
                duration: 2000,
            });
            return;
        }

        // Get available skills
        const availableSkills = this.skillSystem.getAvailableSkills(unit.id);
        const usableSkills = availableSkills.filter(skill => skill.enabled);

        if (usableSkills.length === 0) {
            this.uiManager.showErrorNotification({
                message: 'No usable skills available',
                type: 'warning',
                duration: 2000,
            });
            return;
        }

        try {
            // Hide action menu
            this.uiManager.hideActionMenu();

            // Show skill selection UI
            console.log(`Showing skill selection for ${unit.name} with ${usableSkills.length} skills`);

            // Use the skill system's UI to show skill selection
            const skillUsageResult = await this.skillSystem.useSkill(
                '', // Will be selected by UI
                unit.id,
                unit.position, // Default target position
                false // Don't skip UI
            );

            if (skillUsageResult.success && skillUsageResult.result) {
                console.log(`Skill used successfully: ${skillUsageResult.result.skillId}`);

                // Mark unit as having acted
                unit.hasActed = true;
                this.gameStateManager.updateUnit(unit);

                // Show skill result
                this.handleSkillExecutionResult(skillUsageResult.result, unit);

                // Advance turn
                setTimeout(() => {
                    const turnResult = this.gameStateManager.nextTurn();
                    if (!turnResult.success) {
                        console.error('Failed to advance turn after skill:', turnResult.message);
                    }
                }, 1000);
            } else {
                console.log('Skill usage cancelled or failed');

                // Show action menu again if skill was cancelled
                this.showActionMenuForUnit(unit);
            }

        } catch (error) {
            console.error('Failed to handle skill action:', error);
            this.uiManager.showErrorNotification({
                message: 'Failed to use skill',
                type: 'error',
                duration: 2000,
            });

            // Show action menu again on error
            this.showActionMenuForUnit(unit);
        }
    }

    /**
     * Handle skill execution result
     * @param result - Skill execution result
     * @param caster - Unit that used the skill
     */
    private handleSkillExecutionResult(result: any, caster: Unit): void {
        console.log('Skill execution result:', result);

        // Show skill effects based on result
        if (result.effects && result.effects.length > 0) {
            result.effects.forEach((effect: any) => {
                if (effect.type === 'damage' && effect.target) {
                    // Show damage numbers
                    const targetScreenPos = this.getUnitScreenPosition(effect.target);
                    if (targetScreenPos) {
                        this.uiManager.showDamageNumber(
                            targetScreenPos.x,
                            targetScreenPos.y,
                            effect.value,
                            false, // Not critical for skills by default
                            true   // Is skill damage
                        );
                    }
                } else if (effect.type === 'heal' && effect.target) {
                    // Show heal numbers
                    const targetScreenPos = this.getUnitScreenPosition(effect.target);
                    if (targetScreenPos) {
                        this.uiManager.showHealNumber(
                            targetScreenPos.x,
                            targetScreenPos.y,
                            effect.value
                        );
                    }
                }
            });
        }

        // Update character positions and states
        if (this.stageData) {
            const allCharacters = [...this.stageData.playerUnits, ...this.stageData.enemyUnits];
            this.movementSystem.updateUnits(allCharacters);
            this.battleSystem.initialize(allCharacters, this.stageData.mapData);
        }

        // Check for game end conditions
        this.checkGameEndConditions();
    }

    /**
     * Show skill range display for a skill
     * @param skill - Skill to show range for
     * @param caster - Unit casting the skill
     * @param targetPosition - Optional target position
     */
    private showSkillRangeDisplay(skill: any, caster: Unit, targetPosition?: { x: number; y: number }): void {
        if (!this.skillSystem) {
            return;
        }

        try {
            // Use the skill system's UI to show range
            this.skillSystem.getSystemState(); // Ensure system is ready

            // The skill UI will handle range display internally
            console.log(`Showing skill range for ${skill.name} from ${caster.name}`);

        } catch (error) {
            console.error('Error showing skill range display:', error);
        }
    }

    /**
     * Clear skill range display
     */
    private clearSkillRangeDisplay(): void {
        if (!this.skillSystem) {
            return;
        }

        try {
            // The skill UI will handle clearing range display
            console.log('Clearing skill range display');

        } catch (error) {
            console.error('Error clearing skill range display:', error);
        }
    }

    /**
     * Handle wait action
     * @param unit - Unit to wait
     */
    private handleWaitAction(unit: Unit): void {
        console.log(`Wait action for ${unit.name}`);

        // Mark unit as having acted
        unit.hasActed = true;

        // Update game state
        this.gameStateManager.updateUnit(unit);

        // Hide action menu
        this.uiManager.hideActionMenu();

        // Advance turn
        const turnResult = this.gameStateManager.nextTurn();
        if (!turnResult.success) {
            console.error('Failed to advance turn:', turnResult.message);
        }

        console.log(`${unit.name} waits and ends turn`);
    }

    /**
     * Handle cancel action
     */
    private handleCancelAction(): void {
        console.log('Cancel action');

        // Cancel any active battle
        if (this.isBattleActive) {
            this.battleSystem.cancelAttack();
            this.resetBattleState();
        }

        // Cancel any active movement
        if (this.movementSystem.isMovementInProgress()) {
            this.movementSystem.cancelMovement();
        }

        // Hide action menu
        this.uiManager.hideActionMenu();

        // Deselect unit
        this.gameStateManager.selectUnit(null);
        this.characterManager.selectCharacter(null);
    }

    /**
     * Handle battle attack initiated event
     * @param data - Attack initiation data
     */
    private handleBattleAttackInitiated(data: any): void {
        console.log('Battle attack initiated:', data.attacker.name);

        // Update UI to show attack mode
        this.uiManager.showBattleStatus(`${data.attacker.name} - Select Target`);

        // Disable movement and other systems during battle
        this.inputHandler.disable();

        // Re-enable input but with battle-specific handling
        this.inputHandler.enable();
    }

    /**
     * Handle battle range shown event
     * @param data - Range display data
     */
    private handleBattleRangeShown(data: any): void {
        console.log('Battle range shown:', data.rangeCount, 'positions');

        // Update battle status
        this.uiManager.showBattleStatus(`Attack Range: ${data.rangeCount} tiles`);
    }

    /**
     * Handle battle target selected event
     * @param data - Target selection data
     */
    private handleBattleTargetSelected(data: any): void {
        console.log('Battle target selected:', data.target.name);

        // Update battle status
        this.uiManager.showBattleStatus(`Attacking ${data.target.name}...`);
    }

    /**
     * Handle battle complete event
     * @param data - Battle completion data
     */
    private handleBattleComplete(data: any): void {
        const result: BattleResult = data.battleResult;

        console.log('Battle completed:', {
            attacker: result.attacker.name,
            target: result.target.name,
            damage: result.finalDamage,
            defeated: result.targetDefeated,
        });

        // Check for recruitment if target would be defeated
        let recruitmentResult: RecruitmentResult | null = null;
        if (result.targetDefeated && result.finalDamage > 0) {
            recruitmentResult = this.processRecruitmentAttempt(
                result.attacker,
                result.target,
                result.finalDamage,
                result
            );
        }

        // Show damage numbers
        const targetScreenPos = this.getUnitScreenPosition(result.target);
        if (targetScreenPos) {
            if (result.isEvaded) {
                this.uiManager.showDamageNumber(targetScreenPos.x, targetScreenPos.y, 0, false, false);
            } else {
                this.uiManager.showDamageNumber(
                    targetScreenPos.x,
                    targetScreenPos.y,
                    result.finalDamage,
                    result.isCritical,
                    false
                );
            }
        }

        // Show experience gained
        if (result.experienceGained > 0) {
            const attackerScreenPos = this.getUnitScreenPosition(result.attacker);
            if (attackerScreenPos) {
                this.uiManager.showExperienceGained(
                    attackerScreenPos.x,
                    attackerScreenPos.y - 30,
                    result.experienceGained
                );
            }
        }

        // Show battle result panel (with recruitment info if applicable)
        this.uiManager.showBattleResult({
            damage: result.finalDamage,
            isCritical: result.isCritical,
            isEvaded: result.isEvaded,
            experienceGained: result.experienceGained,
            targetDefeated: result.targetDefeated,
            attacker: result.attacker.name,
            target: result.target.name,
            recruitmentResult: recruitmentResult,
        });

        // Update character manager with new unit states
        this.characterManager.updateCharacterPosition(result.attacker.id, result.attacker.position);
        this.characterManager.updateCharacterPosition(result.target.id, result.target.position);

        // Update all units in systems
        if (this.stageData) {
            const allCharacters = [...this.stageData.playerUnits, ...this.stageData.enemyUnits];
            this.movementSystem.updateUnits(allCharacters);
            this.battleSystem.initialize(allCharacters, this.stageData.mapData);
        }

        // Mark attacker as having acted
        result.attacker.hasActed = true;
        this.gameStateManager.updateUnit(result.attacker);

        // Reset battle state
        this.resetBattleState();

        // Check for victory/defeat conditions
        this.checkGameEndConditions();

        // Advance turn if needed
        setTimeout(() => {
            const turnResult = this.gameStateManager.nextTurn();
            if (!turnResult.success) {
                console.error('Failed to advance turn after battle:', turnResult.message);
            }
        }, 1000);
    }

    /**
     * Handle battle cancelled event
     * @param data - Cancellation data
     */
    private handleBattleCancelled(data: any): void {
        console.log('Battle cancelled:', data.reason);

        this.uiManager.showErrorNotification({
            message: 'Attack cancelled',
            type: 'info',
            duration: 1500,
        });

        this.resetBattleState();
    }

    /**
     * Handle battle error event
     * @param data - Error data
     */
    private handleBattleError(data: any): void {
        console.error('Battle error:', data.message);

        this.uiManager.showErrorNotification({
            message: data.message || 'Battle system error',
            type: 'error',
            duration: 3000,
        });

        this.resetBattleState();
    }

    /**
     * Handle unit defeated event
     * @param data - Unit defeat data
     */
    private handleUnitDefeated(data: any): void {
        console.log('Unit defeated:', data.unit?.name || 'unknown');

        // Update character manager to show defeated state
        if (data.unit) {
            this.characterManager.updateCharacterPosition(data.unit.id, data.unit.position);
        }
    }

    /**
     * Handle experience granted event
     * @param data - Experience data
     */
    private handleExperienceGranted(data: any): void {
        console.log('Experience granted:', data.amount, 'to', data.unit?.name || 'unknown');
    }

    /**
     * Reset battle system state
     */
    private resetBattleState(): void {
        this.isBattleActive = false;
        this.battleInputLocked = false;

        // Hide battle UI
        this.uiManager.hideBattleStatus();

        // Re-enable normal input
        this.inputHandler.enable();

        console.log('Battle state reset');
    }

    /**
     * Get screen position for a unit
     * @param unit - Unit to get position for
     * @returns Screen position or null
     */
    private getUnitScreenPosition(unit: Unit): { x: number; y: number } | null {
        const tileSize = this.stageData?.mapData.tileSize || 32;
        const camera = this.cameras.main;

        const worldX = unit.position.x * tileSize + tileSize / 2;
        const worldY = unit.position.y * tileSize + tileSize / 2;

        return {
            x: (worldX - camera.scrollX) * camera.zoom,
            y: (worldY - camera.scrollY) * camera.zoom,
        };
    }

    /**
     * Check for game end conditions (victory/defeat)
     */
    private checkGameEndConditions(): void {
        if (!this.stageData) return;

        const playerUnits = this.stageData.playerUnits.filter(unit => unit.currentHP > 0);
        const enemyUnits = this.stageData.enemyUnits.filter(
            unit => unit.currentHP > 0 && !this.recruitmentSystem.isNPC(unit)
        );

        if (playerUnits.length === 0) {
            // Defeat - all player units defeated
            this.gameStateManager.setGameResult('defeat');
            console.log('Game Over - All player units defeated');
        } else if (enemyUnits.length === 0) {
            // Victory - all enemy units defeated or converted to NPCs
            this.checkStageCompletionWithRecruitment();
            console.log('Victory - All enemy units defeated or converted');
        }
    }

    /**
     * Override tile selection to handle battle target selection
     * @param position - Grid position of selected tile
     * @param clickInfo - Click information
     */
    private handleTileSelectionWithBattle(position: Position, clickInfo: any): void {
        // Block input during AI execution
        if (this.isAIExecuting || this.aiTurnInProgress) {
            console.log('Input blocked: AI is executing');
            return;
        }

        // If battle is active, try to select target
        if (this.isBattleActive && this.battleSystem.isActive()) {
            const targetUnit = this.getUnitAtWorldPosition({
                x: position.x * (this.stageData?.mapData.tileSize || 32),
                y: position.y * (this.stageData?.mapData.tileSize || 32),
            });

            if (targetUnit) {
                // Try to select this unit as battle target
                this.battleSystem
                    .selectTarget(targetUnit)
                    .then((result: BattleResult) => {
                        console.log('Battle target selected successfully');
                    })
                    .catch((error: Error) => {
                        console.error('Failed to select battle target:', error);
                        this.uiManager.showErrorNotification({
                            message: 'Invalid target',
                            type: 'error',
                            duration: 2000,
                        });
                    });
                return;
            } else {
                // No unit at position, show error
                this.uiManager.showErrorNotification({
                    message: 'No target at this position',
                    type: 'warning',
                    duration: 1500,
                });
                return;
            }
        }

        // Normal tile selection (movement)
        this.handleTileSelection(position, clickInfo);
    }

    /**
     * Override character selection to handle battle state
     * @param unit - Selected unit (null for deselection)
     * @param clickInfo - Click information
     */
    private handleCharacterSelectionWithBattle(unit: Unit | null, clickInfo: any): void {
        // If battle is active, try to select target
        if (this.isBattleActive && this.battleSystem.isActive() && unit) {
            this.battleSystem
                .selectTarget(unit)
                .then((result: BattleResult) => {
                    console.log('Battle target selected successfully');
                })
                .catch((error: Error) => {
                    console.error('Failed to select battle target:', error);
                    this.uiManager.showErrorNotification({
                        message: 'Invalid target',
                        type: 'error',
                        duration: 2000,
                    });
                });
            return;
        }

        // Normal character selection
        this.handleCharacterSelection(unit, clickInfo);
    }

    /**
     * Add keyboard shortcuts for battle system
     * @param shortcut - Shortcut string
     * @param keyInfo - Key information
     */
    private handleBattleShortcuts(shortcut: string, keyInfo: any): void {
        // Handle battle-specific shortcuts
        switch (shortcut) {
            case 'A':
            case 'a':
                // Attack shortcut
                const selectedUnit = this.gameStateManager.getSelectedUnit();
                if (selectedUnit && !this.isBattleActive) {
                    this.handleAttackAction(selectedUnit);
                }
                break;
            case 'ESCAPE':
                // Cancel battle
                if (this.isBattleActive) {
                    this.battleSystem.cancelAttack();
                    this.resetBattleState();
                    return; // Don't call normal escape handler
                }
                break;
        }
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

        if (this.battleSystem) {
            this.battleSystem.destroy();
        }

        if (this.recruitmentSystem) {
            // Recruitment system doesn't have a destroy method, but we can clean up references
            console.log('Cleaning up recruitment system');
        }

        if (this.recruitmentUI) {
            this.recruitmentUI.destroy();
        }

        if (this.skillSystem) {
            this.skillSystem.destroy();
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

    // ===== RECRUITMENT SYSTEM INTEGRATION METHODS =====

    /**
     * Show recruitment conditions if unit is recruitable
     * @param unit - Unit to check for recruitment conditions
     */
    private showRecruitmentConditionsIfApplicable(unit: Unit): void {
        try {
            // Only show conditions for enemy units
            if (unit.faction !== 'enemy') {
                return;
            }

            // Get recruitment conditions
            const conditions = this.recruitmentSystem.getRecruitmentConditions(unit);
            if (conditions.length > 0) {
                this.recruitmentUI.showRecruitmentConditions(unit, conditions);

                // Also show current progress if we have a selected attacker
                const selectedUnit = this.gameStateManager.getSelectedUnit();
                if (selectedUnit && selectedUnit.faction === 'player') {
                    const progress = this.recruitmentSystem.getRecruitmentProgress(unit, {
                        attacker: selectedUnit,
                        turn: this.gameStateManager.getCurrentTurn(),
                    });

                    if (progress) {
                        this.recruitmentUI.updateRecruitmentProgress(unit, progress);
                    }
                }
            }
        } catch (error) {
            console.error('Error showing recruitment conditions:', error);
        }
    }

    /**
     * Process recruitment attempt during battle
     * @param attacker - Attacking unit
     * @param target - Target unit
     * @param damage - Damage dealt
     * @param battleResult - Complete battle result
     * @returns Recruitment result or null if not applicable
     */
    private processRecruitmentAttempt(
        attacker: Unit,
        target: Unit,
        damage: number,
        battleResult: BattleResult
    ): RecruitmentResult | null {
        try {
            // Only process recruitment for enemy targets
            if (target.faction !== 'enemy') {
                return null;
            }

            // Check if target is recruitable
            const conditions = this.recruitmentSystem.getRecruitmentConditions(target);
            if (conditions.length === 0) {
                return null;
            }

            // Process recruitment attempt
            const recruitmentResult = this.recruitmentSystem.processRecruitmentAttempt(
                attacker,
                target,
                damage,
                battleResult,
                this.gameStateManager.getCurrentTurn()
            );

            console.log('Recruitment attempt result:', recruitmentResult);
            return recruitmentResult;
        } catch (error) {
            console.error('Error processing recruitment attempt:', error);
            return null;
        }
    }

    /**
     * Handle stage completion with recruitment
     */
    private handleStageRecruitmentCompletion(recruitedUnits: Unit[], failedUnits: string[]): void {
        try {
            console.log(
                `Stage recruitment completion: ${recruitedUnits.length} recruited, ${failedUnits.length} failed`
            );

            // Add recruited units to player units for next stage
            if (recruitedUnits.length > 0 && this.stageData) {
                this.stageData.playerUnits.push(...recruitedUnits);

                // Update character manager with new player units
                recruitedUnits.forEach(unit => {
                    this.characterManager.updateCharacterFaction(unit.id, 'player');
                    this.recruitmentUI.hideNPCIndicator(unit);
                });

                // Show recruitment completion notification
                this.uiManager.showNotification({
                    message: `${recruitedUnits.length} character(s) recruited!`,
                    type: 'success',
                    duration: 3000,
                });
            }

            // Clean up failed recruitment indicators
            failedUnits.forEach(unitId => {
                const unit = this.findUnitById(unitId);
                if (unit) {
                    this.recruitmentUI.hideNPCIndicator(unit);
                }
            });
        } catch (error) {
            console.error('Error handling stage recruitment completion:', error);
        }
    }

    /**
     * Handle NPC input processing restrictions
     * @param unit - Unit to check for NPC status
     * @returns True if unit can be controlled, false if NPC
     */
    private canControlUnit(unit: Unit): boolean {
        try {
            // Check if unit is in NPC state
            if (this.recruitmentSystem.isNPC(unit)) {
                console.log(`Unit ${unit.name} is in NPC state and cannot be controlled`);

                // Show notification to player
                this.uiManager.showNotification({
                    message: `${unit.name} is in NPC state and cannot act`,
                    type: 'info',
                    duration: 2000,
                });

                return false;
            }

            return true;
        } catch (error) {
            console.error('Error checking unit control status:', error);
            return true; // Default to allowing control if error occurs
        }
    }

    /**
     * Override character selection to handle NPC restrictions
     * @param unit - Unit to select
     * @param clickInfo - Click information
     */
    private handleCharacterSelectionWithRecruitment(unit: Unit | null, clickInfo: any): void {
        // Block input during AI execution
        if (this.isAIExecuting || this.aiTurnInProgress) {
            console.log('Input blocked: AI is executing');
            return;
        }

        if (unit) {
            // Check if unit can be controlled (not NPC)
            if (!this.canControlUnit(unit)) {
                // Show message for NPC units
                if (this.recruitmentSystem.isNPC(unit.id)) {
                    this.uiManager.showMessage(`${unit.name}はNPC状態のため操作できません`, 'info');
                    this.recruitmentUI.showNPCIndicator(unit);
                }
                return; // Don't select NPC units
            }

            // Show recruitment conditions for enemy units
            this.showRecruitmentConditionsIfApplicable(unit);
        }

        // Continue with normal character selection
        this.handleCharacterSelectionWithBattle(unit, clickInfo);
    }

    /**
     * Check for stage clear and complete recruitment
     */
    private checkStageCompletionWithRecruitment(): void {
        try {
            if (!this.stageData) {
                return;
            }

            // Check if stage is complete (all enemies defeated or objectives met)
            const enemyUnits = this.stageData.enemyUnits.filter(
                unit => unit.currentHP > 0 && !this.recruitmentSystem.isNPC(unit.id)
            );

            if (enemyUnits.length === 0) {
                console.log('Stage completed - processing recruitment');

                // Complete recruitment for all surviving NPCs
                const allUnits = [...this.stageData.playerUnits, ...this.stageData.enemyUnits];
                const recruitedUnits = this.recruitmentSystem.completeRecruitment(allUnits);

                console.log(`Recruitment completed: ${recruitedUnits.length} units recruited`);

                // Handle recruitment completion
                if (recruitedUnits.length > 0) {
                    const recruitedUnitData = recruitedUnits.map(ru => ru.unit);
                    const failedUnits: string[] = [];
                    this.handleStageRecruitmentCompletion(recruitedUnitData, failedUnits);
                }

                // Set game result to victory
                this.gameStateManager.setGameResult('victory');
            }
        } catch (error) {
            console.error('Error checking stage completion with recruitment:', error);
        }
    }

    /**
     * Find unit by ID across all units
     * @param unitId - Unit ID to find
     * @returns Unit or null if not found
     */
    private findUnitById(unitId: string): Unit | null {
        if (!this.stageData) {
            return null;
        }

        const allUnits = [...this.stageData.playerUnits, ...this.stageData.enemyUnits];
        return allUnits.find(unit => unit.id === unitId) || null;
    }

    /**
     * Check if a unit can be controlled by the player
     * @param unit - Unit to check
     * @returns True if unit can be controlled
     */
    private canControlUnit(unit: Unit): boolean {
        // Player units can be controlled unless they are NPCs
        if (unit.faction === 'player') {
            return !this.recruitmentSystem.isNPC(unit.id);
        }

        // Enemy units cannot be controlled
        return false;
    }

    /**
     * Show recruitment conditions for applicable units
     * @param unit - Unit to show conditions for
     */
    private showRecruitmentConditionsIfApplicable(unit: Unit): void {
        if (unit.faction === 'enemy' && this.recruitmentSystem) {
            const recruitableData = this.recruitmentSystem.getRecruitableCharacter(unit.id);
            if (recruitableData) {
                // Show recruitment conditions for this character
                this.recruitmentUI.showRecruitmentConditions(unit, recruitableData.conditions);

                // Update recruitment progress display
                this.updateRecruitmentProgress(unit);
            }
        }
    }

    /**
     * Update recruitment progress display for a unit
     * @param unit - Unit to update progress for
     */
    private updateRecruitmentProgress(unit: Unit): void {
        if (!this.recruitmentSystem || unit.faction !== 'enemy') {
            return;
        }

        try {
            // Get current selected unit as potential attacker
            const selectedUnit = this.gameStateManager.getSelectedUnit();
            if (!selectedUnit) {
                return;
            }

            // Check recruitment eligibility to get progress
            this.recruitmentSystem.checkRecruitmentEligibility(selectedUnit, unit)
                .then(result => {
                    if (result.progress) {
                        this.recruitmentUI.updateRecruitmentProgress(unit, result.progress);
                    }
                })
                .catch(error => {
                    console.warn('Failed to update recruitment progress:', error);
                });
        } catch (error) {
            console.warn('Error updating recruitment progress:', error);
        }
    }

    /**
     * Handle stage recruitment completion
     * @param recruitedUnits - Successfully recruited units
     * @param failedUnits - Failed recruitment unit IDs
     */
    private handleStageRecruitmentCompletion(recruitedUnits: Unit[], failedUnits: string[]): void {
        console.log(`Stage recruitment completed: ${recruitedUnits.length} recruited, ${failedUnits.length} failed`);

        // Show recruitment results to player
        if (recruitedUnits.length > 0) {
            const recruitedNames = recruitedUnits.map(unit => unit.name).join(', ');
            this.uiManager.showMessage(`仲間になりました: ${recruitedNames}`, 'success');
        }

        if (failedUnits.length > 0) {
            this.uiManager.showMessage(`仲間化に失敗: ${failedUnits.length}体`, 'warning');
        }

        // Update stage data with recruited units
        if (this.stageData && recruitedUnits.length > 0) {
            // Add recruited units to player units for next stage
            this.stageData.playerUnits.push(...recruitedUnits);

            // Remove recruited units from enemy units
            this.stageData.enemyUnits = this.stageData.enemyUnits.filter(
                unit => !recruitedUnits.some(recruited => recruited.id === unit.id)
            );
        }

        // Save recruitment data to persistent storage
        this.saveRecruitmentProgress();
    }

    /**
     * Initialize data persistence for recruitment system
     */
    private async initializeDataPersistence(): Promise<void> {
        try {
            if (!this.recruitmentSystem) {
                console.warn('Recruitment system not available for data persistence initialization');
                return;
            }

            // Perform data integrity check first
            await this.performDataIntegrityCheck();

            // Initialize data persistence in recruitment system
            const initResult = await this.recruitmentSystem.initializeDataPersistence();
            if (!initResult.success) {
                console.warn('Failed to initialize recruitment data persistence:', initResult.message);
                return;
            }

            // Load previously recruited characters if available
            const availableCharacters = this.recruitmentSystem.getAvailableRecruitedCharacters();
            if (availableCharacters.length > 0) {
                console.log(`Loaded ${availableCharacters.length} previously recruited characters`);

                // Add recruited characters to player units
                this.integrateRecruitedCharacters(availableCharacters);
            }

            console.log('Data persistence initialized successfully');
        } catch (error) {
            console.error('Error initializing data persistence:', error);
        }
    }

    /**
     * Integrate previously recruited characters into current stage
     * @param recruitedCharacters - Previously recruited character data
     */
    private integrateRecruitedCharacters(recruitedCharacters: any[]): void {
        try {
            if (!this.stageData) {
                console.warn('No stage data available for character integration');
                return;
            }

            for (const recruitedData of recruitedCharacters) {
                // Convert saved character data back to Unit format
                const recruitedUnit: Unit = {
                    id: recruitedData.characterId,
                    name: recruitedData.characterId, // This should be loaded from character data
                    position: { x: 0, y: 0 }, // Will be set during placement
                    stats: recruitedData.currentStats,
                    currentHP: recruitedData.currentStats.maxHP,
                    currentMP: recruitedData.currentStats.maxMP,
                    faction: 'player',
                    hasActed: false,
                    hasMoved: false,
                    equipment: recruitedData.equipment,
                };

                // Add to player units if not already present
                const existingUnit = this.stageData.playerUnits.find(unit => unit.id === recruitedUnit.id);
                if (!existingUnit) {
                    this.stageData.playerUnits.push(recruitedUnit);
                    console.log(`Integrated recruited character: ${recruitedUnit.id}`);
                }
            }

            // Update character manager with new units
            if (this.characterManager) {
                const loadResult = this.characterManager.loadCharacters(this.stageData);
                if (!loadResult.success) {
                    console.warn('Failed to reload characters after integration:', loadResult.message);
                }
            }
        } catch (error) {
            console.error('Error integrating recruited characters:', error);
        }
    }

    /**
     * Initialize skill system with battlefield state
     */
    private initializeSkillSystem(): void {
        try {
            if (!this.skillSystem) {
                console.warn('Skill system not available for initialization');
                return;
            }

            // Set battlefield state for skill system
            const battlefieldState = {
                getCurrentTurn: () => this.gameStateManager.getCurrentTurn(),
                getActivePlayer: () => this.gameStateManager.getActivePlayer(),
                getAllUnits: () => {
                    if (!this.stageData) return [];
                    return [...this.stageData.playerUnits, ...this.stageData.enemyUnits];
                },
                getPlayerUnits: () => this.gameStateManager.getPlayerUnits(),
                getEnemyUnits: () => this.gameStateManager.getEnemyUnits(),
                getMapData: () => this.stageData?.mapData,
                isPositionOccupied: (position: { x: number; y: number }) => {
                    return this.getUnitAtWorldPosition({
                        x: position.x * (this.stageData?.mapData.tileSize || 32),
                        y: position.y * (this.stageData?.mapData.tileSize || 32)
                    }) !== null;
                },
                getUnitAt: (position: { x: number; y: number }) => {
                    return this.getUnitAtWorldPosition({
                        x: position.x * (this.stageData?.mapData.tileSize || 32),
                        y: position.y * (this.stageData?.mapData.tileSize || 32)
                    });
                }
            };

            this.skillSystem.setBattlefieldState(battlefieldState);

            // Register some basic skills for testing
            this.registerBasicSkills();

            console.log('Skill system initialized successfully');
        } catch (error) {
            console.error('Error initializing skill system:', error);
        }
    }

    /**
     * Register basic skills for testing
     */
    private registerBasicSkills(): void {
        try {
            // Register a basic attack skill
            this.skillSystem.registerSkill({
                id: 'basic-attack',
                name: '基本攻撃',
                description: '基本的な攻撃スキル',
                skillType: 'attack',
                targetType: 'single',
                range: 1,
                usageCondition: {
                    mpCost: 0,
                    levelRequirement: 1,
                    cooldown: 0,
                    usageLimit: -1,
                    weaponRequirement: [],
                    jobRequirement: undefined
                },
                effects: [{
                    type: 'damage',
                    value: 1.0,
                    duration: 0,
                    target: 'enemy'
                }],
                areaOfEffect: {
                    shape: 'single',
                    size: 1
                },
                animation: {
                    castAnimation: 'cast',
                    effectAnimation: 'attack',
                    duration: 1000
                },
                learnConditions: {
                    level: 1,
                    prerequisiteSkills: [],
                    jobRequirement: undefined
                }
            });

            // Register a heal skill
            this.skillSystem.registerSkill({
                id: 'basic-heal',
                name: '回復',
                description: '基本的な回復スキル',
                skillType: 'heal',
                targetType: 'single',
                range: 1,
                usageCondition: {
                    mpCost: 10,
                    levelRequirement: 2,
                    cooldown: 0,
                    usageLimit: -1,
                    weaponRequirement: [],
                    jobRequirement: undefined
                },
                effects: [{
                    type: 'heal',
                    value: 30,
                    duration: 0,
                    target: 'ally'
                }],
                areaOfEffect: {
                    shape: 'single',
                    size: 1
                },
                animation: {
                    castAnimation: 'cast',
                    effectAnimation: 'heal',
                    duration: 1000
                },
                learnConditions: {
                    level: 2,
                    prerequisiteSkills: [],
                    jobRequirement: undefined
                }
            });

            // Learn skills for player units
            if (this.stageData) {
                this.stageData.playerUnits.forEach(unit => {
                    this.skillSystem.learnSkill(unit.id, 'basic-attack', unit);
                    if (unit.name === 'Mage') {
                        this.skillSystem.learnSkill(unit.id, 'basic-heal', unit);
                    }
                });
            }

            console.log('Basic skills registered successfully');
        } catch (error) {
            console.error('Error registering basic skills:', error);
        }
    }

    /**
     * Initialize AI system with all game systems
     */
    private initializeAISystem(): void {
        try {
            if (!this.aiSystemManager) {
                console.warn('AI system manager not available for initialization');
                return;
            }

            // Initialize AI system with all required game systems
            this.aiSystemManager.initialize(
                this.gameStateManager,
                this.movementSystem,
                this.battleSystem,
                this.skillSystem,
                this.recruitmentSystem
            );

            // Set up AI system integration with battle system
            if (this.battleSystem) {
                this.battleSystem.setAISystemManager(this.aiSystemManager);
            }

            // Create AI controllers for enemy units
            if (this.stageData) {
                const allUnits = [...this.stageData.playerUnits, ...this.stageData.enemyUnits];
                this.aiSystemManager.createAIControllers(allUnits);
            }

            console.log('AI system initialized successfully');
        } catch (error) {
            console.error('Error initializing AI system:', error);
        }
    }

    /**
     * Save current recruitment progress to persistent storage
     */
    private async saveRecruitmentProgress(): Promise<void> {
        try {
            if (!this.recruitmentSystem) {
                console.warn('Recruitment system not available for saving progress');
                return;
            }

            // Save current recruitment state
            const saveResult = await this.recruitmentSystem.saveRecruitmentProgress();
            if (!saveResult.success) {
                console.warn('Failed to save recruitment progress:', saveResult.message);
                this.uiManager.showMessage('仲間化データの保存に失敗しました', 'warning');
            } else {
                console.log('Recruitment progress saved successfully');
            }
        } catch (error) {
            console.error('Error saving recruitment progress:', error);
            this.uiManager.showMessage('仲間化データの保存中にエラーが発生しました', 'error');
        }
    }

    /**
     * Handle chapter completion and reset character loss status
     * @param completedChapterId - ID of the completed chapter
     */
    private async handleChapterCompletion(completedChapterId: string): Promise<void> {
        try {
            if (!this.recruitmentSystem) {
                console.warn('Recruitment system not available for chapter completion');
                return;
            }

            // Reset character loss status for completed chapter
            const resetResult = await this.recruitmentSystem.resetChapterLossStatus(completedChapterId);
            if (!resetResult.success) {
                console.warn('Failed to reset chapter loss status:', resetResult.message);
                this.uiManager.showMessage('章完了処理に失敗しました', 'warning');
            } else {
                console.log(`Chapter ${completedChapterId} completed - character loss status reset`);
                this.uiManager.showMessage('章をクリアしました！ロストキャラクターが復活します', 'success');
            }
        } catch (error) {
            console.error('Error handling chapter completion:', error);
            this.uiManager.showMessage('章完了処理中にエラーが発生しました', 'error');
        }
    }

    /**
     * Handle character loss during gameplay
     * @param characterId - ID of the lost character
     */
    private async handleCharacterLoss(characterId: string): Promise<void> {
        try {
            if (!this.recruitmentSystem) {
                console.warn('Recruitment system not available for character loss handling');
                return;
            }

            // Get current chapter ID (this should be set from stage data)
            const currentChapterId = this.getCurrentChapterId();
            if (!currentChapterId) {
                console.warn('No current chapter ID available for character loss');
                return;
            }

            // Mark character as lost in current chapter
            const lossResult = await this.recruitmentSystem.markCharacterLost(characterId, currentChapterId);
            if (!lossResult.success) {
                console.warn('Failed to mark character as lost:', lossResult.message);
            } else {
                console.log(`Character ${characterId} marked as lost in chapter ${currentChapterId}`);

                // Find the character and show loss message
                const lostCharacter = this.findUnitById(characterId);
                if (lostCharacter) {
                    this.uiManager.showMessage(`${lostCharacter.name}がロストしました（章内で使用不可）`, 'warning');
                }
            }
        } catch (error) {
            console.error('Error handling character loss:', error);
        }
    }

    /**
     * Get current chapter ID from stage data
     * @returns Current chapter ID or null if not available
     */
    private getCurrentChapterId(): string | null {
        // This should be extracted from stage data or scene data
        // For now, return a default chapter ID
        if (this.stageData && (this.stageData as any).chapterId) {
            return (this.stageData as any).chapterId;
        }

        // Extract from stage ID if it follows a pattern like "chapter1-stage1"
        if (this.stageData && this.stageData.id) {
            const match = this.stageData.id.match(/^(chapter\d+)/);
            if (match) {
                return match[1];
            }
        }

        // Default fallback
        return 'chapter1';
    }

    /**
     * Perform data integrity check for recruitment system
     */
    private async performDataIntegrityCheck(): Promise<void> {
        try {
            if (!this.recruitmentSystem) {
                console.warn('Recruitment system not available for integrity check');
                return;
            }

            // Check if recruitment system has save data
            if (!this.recruitmentSystem.hasSaveData()) {
                console.log('No recruitment save data found - starting fresh');
                return;
            }

            // Perform integrity check
            const integrityResult = await this.recruitmentSystem.checkDataIntegrity();
            if (!integrityResult.success) {
                console.warn('Data integrity check failed:', integrityResult.message);
                this.uiManager.showMessage('セーブデータに問題があります。復旧を試みます...', 'warning');

                // Attempt to recover data
                const recoveryResult = await this.recruitmentSystem.recoverData();
                if (recoveryResult.success) {
                    this.uiManager.showMessage('データの復旧に成功しました', 'success');
                } else {
                    this.uiManager.showMessage('データの復旧に失敗しました。新しいゲームを開始してください', 'error');
                }
            } else {
                console.log('Data integrity check passed');
            }
        } catch (error) {
            console.error('Error during data integrity check:', error);
            this.uiManager.showMessage('データ整合性チェック中にエラーが発生しました', 'error');
        }
    }

    /**
     * Get user-friendly error message for recruitment errors
     * @param error - Recruitment error
     * @returns User-friendly error message
     */
    private getRecruitmentErrorMessage(error: string): string {
        switch (error) {
            case 'INVALID_TARGET':
                return 'このキャラクターは仲間にできません';
            case 'CONDITIONS_NOT_MET':
                return '仲間化条件を満たしていません';
            case 'NPC_ALREADY_DEFEATED':
                return 'NPCが撃破されました';
            case 'SYSTEM_ERROR':
                return 'システムエラーが発生しました';
            default:
                return '仲間化に失敗しました';
        }
    }
}
