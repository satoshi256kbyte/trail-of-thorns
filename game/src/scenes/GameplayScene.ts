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
import { ExperienceSystem } from '../systems/experience/ExperienceSystem';
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
import { ExperienceAction, ExperienceSource, ExperienceContext } from '../types/experience';
import { JobSystem, JobSystemConfig } from '../systems/jobs/JobSystem';
import { JobUI, JobUIConfig } from '../ui/JobUI';
import { JobData, RoseEssenceData, JobChangeResult, RankUpResult, CharacterRankUpInfo, StatModifiers } from '../types/job';
import { VictoryConditionSystem, VictoryStageData } from '../systems/victory/VictoryConditionSystem';
import { Objective, ObjectiveType } from '../types/victory';
import { BossData } from '../types/boss';
import { StageCompleteResult, StageFailureResult } from '../types/reward';

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
    private experienceSystem!: ExperienceSystem;
    private aiSystemManager!: AISystemManager;
    private jobSystem!: JobSystem;
    private jobUI!: JobUI;
    private victoryConditionSystem!: VictoryConditionSystem;

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

            // Initialize experience system
            this.initializeExperienceSystem();

            // Initialize AI system with all game systems
            this.initializeAISystem();

            // Initialize job system
            this.initializeJobSystem();

            // Initialize victory condition system with stage data
            this.initializeVictoryConditionSystem();

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

        // Initialize ExperienceSystem
        this.experienceSystem = new ExperienceSystem(this);

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

        // Initialize JobSystem
        const jobSystemConfig: Partial<JobSystemConfig> = {
            enableAnimations: true,
            enableSoundEffects: false, // Disabled for now
            animationSpeed: 1.0,
            debugMode: this.config.debugMode,
            autoSaveEnabled: true,
            maxConcurrentAnimations: 3,
        };

        this.jobSystem = new JobSystem(jobSystemConfig);

        // Initialize JobUI
        const jobUIConfig: Partial<JobUIConfig> = {
            jobSelection: {
                maxJobsPerPage: 6,
                showJobDetails: true,
                enableJobComparison: true,
                allowJobChange: true,
            },
            rankUp: {
                showPreview: true,
                showCostBreakdown: true,
                enableBatchRankUp: false,
                confirmationRequired: true,
            },
            jobInfo: {
                showStatModifiers: true,
                showSkillList: true,
                showJobTraits: true,
                showRankProgress: true,
                compactMode: false,
            },
            enableAnimations: true,
            enableSoundEffects: false,
        };

        this.jobUI = new JobUI(this, jobUIConfig);

        // Initialize VictoryConditionSystem
        this.victoryConditionSystem = new VictoryConditionSystem(this, {
            enableDebugLogs: this.config.debugMode,
            autoCheckConditions: true,
            checkOnTurnEnd: true,
            checkOnBossDefeat: true,
        });

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
            this.updateCharacterInfoDisplay(data.selectedUnit);
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

            // Award experience for skill usage
            this.handleSkillExperienceGain(data);

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
     * Setup experience system event listeners
     */
    private setupExperienceEventListeners(): void {
        console.log('GameplayScene: Setting up experience event listeners');

        if (!this.experienceSystem) {
            console.warn('Experience system not available for event listener setup');
            return;
        }

        // Experience gained events
        this.experienceSystem.on('experience-awarded', (data: any) => {
            console.log('Experience awarded:', data.characterId, data.result.finalAmount);

            // Update character info display if this character is selected
            const selectedUnit = this.gameStateManager.getSelectedUnit();
            if (selectedUnit && selectedUnit.id === data.characterId) {
                this.updateCharacterInfoDisplay(selectedUnit);
            }
        });

        // Level up events
        this.experienceSystem.on('level-up-processed', (data: any) => {
            console.log('Level up processed:', data.characterId, data.result);

            // Update character info display if this character is selected
            const selectedUnit = this.gameStateManager.getSelectedUnit();
            if (selectedUnit && selectedUnit.id === data.characterId) {
                this.updateCharacterInfoDisplay(selectedUnit);
            }

            // Show notification
            this.uiManager.showNotification({
                message: `${data.result.characterName || 'Character'} reached level ${data.result.newLevel}!`,
                type: 'success',
                duration: 3000
            });
        });

        // Battle level up events (immediate stat updates)
        this.experienceSystem.on('battle-level-up-applied', (data: any) => {
            console.log('Battle level up applied:', data.characterId);

            // Update the character in all systems
            const character = this.findUnitById(data.characterId);
            if (character && this.stageData) {
                // Update character manager
                this.characterManager.updateCharacterStats(character.id, character.stats);

                // Update all systems with the new character data
                const allCharacters = [...this.stageData.playerUnits, ...this.stageData.enemyUnits];
                this.movementSystem.updateUnits(allCharacters);
                this.battleSystem.initialize(allCharacters, this.stageData.mapData);
            }
        });

        // Error handling events
        this.experienceSystem.on('experience-error-handled', (eventData: any) => {
            console.log(`Experience error handled: ${eventData.error} with strategy: ${eventData.strategy}`);

            // 重要なエラーの場合は追加の処理
            if (eventData.severity === 'critical' || eventData.severity === 'high') {
                this.handleExperienceError(eventData);
            }
        });

        // System recovery events
        this.experienceSystem.on('system-recovery-completed', (eventData: any) => {
            if (eventData.success) {
                console.log('Experience system recovery completed successfully');
                this.uiManager.showNotification({
                    message: '経験値システムが回復しました',
                    type: 'success',
                    duration: 3000
                });
            } else {
                console.error('Experience system recovery failed');
                this.handleCriticalExperienceError('システム回復に失敗しました');
            }
        });

        // Character data repair events
        this.experienceSystem.on('character-data-repaired', (eventData: any) => {
            console.log(`Character data repaired for ${eventData.characterId}`);
            this.uiManager.showNotification({
                message: `キャラクター「${eventData.characterId}」のデータを修復しました`,
                type: 'info',
                duration: 2000
            });
        });

        // User notification action events
        this.events.on('notification-action-selected', (action: string) => {
            this.handleNotificationAction(action);
        });

        console.log('GameplayScene: Experience event listeners setup completed');
    }

    /**
     * Update character info display with experience information
     */
    private updateCharacterInfoDisplay(character: Unit): void {
        try {
            if (!this.experienceSystem) {
                return;
            }

            // Get experience information
            const experienceInfo = this.experienceSystem.getExperienceInfo(character.id);

            // Update UI with character and experience info
            this.uiManager.showCharacterInfo(character, experienceInfo);

        } catch (error) {
            console.warn('Failed to update character info display with experience:', error);
            // Fallback to showing character info without experience
            this.uiManager.showCharacterInfo(character);
        }
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

        // Process any pending level ups before advancing turn
        this.processPendingLevelUps();

        const turnResult = this.gameStateManager.nextTurn();
        if (!turnResult.success) {
            console.error('GameplayScene: Failed to advance turn:', turnResult.message);
        }
    }

    /**
     * Process pending level ups at turn end
     */
    private processPendingLevelUps(): void {
        if (!this.experienceSystem) {
            return;
        }

        try {
            // Process all pending level ups
            this.experienceSystem.processPendingLevelUps();
        } catch (error) {
            console.error('Failed to process pending level ups:', error);
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

        // Handle job shortcuts
        this.handleJobShortcuts(shortcut, keyInfo);

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
            case 'J':
            case 'j':
                // Job selection shortcut (handled in handleJobShortcuts)
                break;
            case 'R':
            case 'r':
                // Rank up shortcut (handled in handleJobShortcuts)
                break;
            case 'Shift+J':
                // Job info shortcut (handled in handleJobShortcuts)
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

                    // Record damage in victory condition system
                    if (this.victoryConditionSystem && effect.value > 0) {
                        this.victoryConditionSystem.recordDamage(effect.value, 0);
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

                    // Record healing in victory condition system
                    if (this.victoryConditionSystem && effect.value > 0) {
                        this.victoryConditionSystem.recordHealing(effect.value);
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

        // Award experience through experience system
        this.handleBattleExperienceGain(result);

        // Show experience gained (legacy UI - will be replaced by experience system UI)
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

        // Record damage dealt in victory condition system
        if (this.victoryConditionSystem && result.finalDamage > 0) {
            this.victoryConditionSystem.recordDamage(result.finalDamage, 0);
        }

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
     * Handle battle experience gain
     * @param result - Battle result data
     */
    private handleBattleExperienceGain(result: BattleResult): void {
        if (!this.experienceSystem) {
            return;
        }

        try {
            // Award experience for attack hit (if not evaded)
            if (!result.isEvaded) {
                this.awardBattleExperience(result.attacker, ExperienceAction.ATTACK, {
                    target: result.target,
                    damage: result.finalDamage,
                    wasHit: true,
                    wasCritical: result.isCritical || false
                });
            }

            // Award experience for defeat
            if (result.targetDefeated) {
                this.awardBattleExperience(result.attacker, ExperienceAction.DEFEAT, {
                    target: result.target,
                    damage: result.finalDamage,
                    wasDefeated: true
                });
            }

        } catch (error) {
            console.error('Failed to handle battle experience gain:', error);
        }
    }

    /**
     * Award battle experience through experience system
     * @param character - Character to award experience to
     * @param action - Experience action
     * @param battleData - Battle context data
     */
    private awardBattleExperience(
        character: Unit,
        action: ExperienceAction,
        battleData: any
    ): void {
        if (!this.experienceSystem) {
            return;
        }

        try {
            const battleContext = {
                attacker: character,
                target: battleData.target,
                damage: battleData.damage,
                wasHit: battleData.wasHit,
                wasCritical: battleData.wasCritical,
                wasDefeated: battleData.wasDefeated,
                turnNumber: this.gameStateManager.getCurrentTurn(),
                timestamp: Date.now()
            };

            const experienceContext: ExperienceContext = {
                source: this.mapActionToExperienceSource(action),
                action,
                battleContext,
                timestamp: Date.now()
            };

            this.experienceSystem.handleBattleExperience(character.id, action, battleContext);

        } catch (error) {
            console.error('Failed to award battle experience:', error);
        }
    }

    /**
     * Handle skill experience gain
     * @param data - Skill execution data
     */
    private handleSkillExperienceGain(data: any): void {
        if (!this.experienceSystem || !data.result?.success) {
            return;
        }

        try {
            const skill = data.result;
            const caster = this.findUnitById(skill.casterId);

            if (!caster) {
                return;
            }

            // Determine experience action based on skill type
            let experienceAction: ExperienceAction;

            if (skill.skillType === 'healing' || skill.effects?.some((e: any) => e.type === 'heal')) {
                experienceAction = ExperienceAction.HEAL;
            } else if (skill.skillType === 'support' || skill.effects?.some((e: any) => e.type === 'buff')) {
                experienceAction = ExperienceAction.SUPPORT;
            } else if (skill.skillType === 'debuff' || skill.effects?.some((e: any) => e.type === 'debuff')) {
                experienceAction = ExperienceAction.SUPPORT; // Debuffs count as support
            } else {
                experienceAction = ExperienceAction.SKILL_CAST; // Generic skill usage
            }

            // Create skill context
            const skillContext = {
                skillId: skill.skillId,
                skillName: skill.skillName,
                skillType: skill.skillType,
                targets: skill.targets || [],
                effects: skill.effects || [],
                mpCost: skill.mpCost || 0,
                turnNumber: this.gameStateManager.getCurrentTurn(),
                timestamp: Date.now()
            };

            const experienceContext: ExperienceContext = {
                source: this.mapActionToExperienceSource(experienceAction),
                action: experienceAction,
                skillContext,
                timestamp: Date.now()
            };

            this.experienceSystem.handleBattleExperience(caster.id, experienceAction, skillContext);

        } catch (error) {
            console.error('Failed to handle skill experience gain:', error);
        }
    }

    /**
     * Map experience action to experience source
     */
    private mapActionToExperienceSource(action: ExperienceAction): ExperienceSource {
        switch (action) {
            case ExperienceAction.ATTACK:
                return ExperienceSource.ATTACK_HIT;
            case ExperienceAction.DEFEAT:
                return ExperienceSource.ENEMY_DEFEAT;
            case ExperienceAction.HEAL:
                return ExperienceSource.HEALING;
            case ExperienceAction.SUPPORT:
                return ExperienceSource.ALLY_SUPPORT;
            case ExperienceAction.SKILL_CAST:
                return ExperienceSource.SKILL_USE;
            default:
                return ExperienceSource.ATTACK_HIT;
        }
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

            // Record enemy defeat in victory condition system
            if (data.unit.faction === 'enemy') {
                this.victoryConditionSystem.recordEnemyDefeat(data.unit.id);
            }

            // Record unit lost in victory condition system
            if (data.unit.faction === 'player') {
                this.victoryConditionSystem.recordUnitLost(data.unit.id);
            }

            // Check if this was a boss and award rose essence
            if (this.isBossUnit(data.unit)) {
                this.handleBossDefeat(data.unit);
            }
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

        if (this.experienceSystem) {
            this.experienceSystem.destroy();
        }

        if (this.jobSystem) {
            this.jobSystem.destroy();
        }

        if (this.jobUI) {
            // JobUI doesn't have a destroy method, but we can clean up references
            console.log('Cleaning up job UI');
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
     * Initialize experience system
     */
    private async initializeExperienceSystem(): Promise<void> {
        try {
            console.log('GameplayScene: Initializing experience system');

            // Initialize the experience system with default data
            const initialized = await this.experienceSystem.initialize(
                'data/experience-table.json' // This will use defaults if file doesn't exist
            );

            if (!initialized) {
                console.warn('Experience system initialization failed, attempting recovery');

                // システム回復を試行
                const recoverySuccess = await this.experienceSystem.attemptSystemRecovery();
                if (!recoverySuccess) {
                    console.error('Experience system recovery failed');
                    // 致命的エラーの場合はユーザーに通知
                    this.handleCriticalExperienceError('システム初期化に失敗しました');
                    return;
                }
            }

            // Register all characters in the experience system
            if (this.stageData) {
                const allCharacters = [...this.stageData.playerUnits, ...this.stageData.enemyUnits];

                for (const character of allCharacters) {
                    try {
                        // Initialize with level 1 and 0 experience for now
                        // In a full implementation, this would come from save data
                        this.experienceSystem.registerCharacter(character, 1, 0);
                    } catch (characterError) {
                        console.warn(`Failed to register character ${character.id}:`, characterError);

                        // キャラクターデータの修復を試行
                        const repairSuccess = this.experienceSystem.repairCharacterData(character.id);
                        if (repairSuccess) {
                            console.log(`Successfully repaired and registered character ${character.id}`);
                        } else {
                            console.error(`Failed to repair character data for ${character.id}`);
                        }
                    }
                }
            }

            // Setup experience system event listeners
            this.setupExperienceEventListeners();

            console.log('GameplayScene: Experience system initialized successfully');

        } catch (error) {
            console.error('GameplayScene: Failed to initialize experience system:', error);
            this.handleCriticalExperienceError('経験値システムの初期化中にエラーが発生しました');
        }
    }

    /**
     * Initialize job system
     * 要件3.1-3.5: 職業システムのGameplaySceneへの統合
     */
    private async initializeJobSystem(): Promise<void> {
        try {
            console.log('GameplayScene: Initializing job system');

            // Initialize the job system with scene and default data
            await this.jobSystem.initialize(this);

            // Set external system references
            this.jobSystem.setCharacterManager(this.characterManager);
            this.jobSystem.setSkillSystem(this.skillSystem);
            this.jobSystem.setBattleSystem(this.battleSystem);

            // Load mock job data for testing
            await this.loadMockJobData();

            // Initialize characters with default jobs
            if (this.stageData) {
                const allCharacters = [...this.stageData.playerUnits, ...this.stageData.enemyUnits];

                for (const character of allCharacters) {
                    try {
                        // Set default job based on character name/type
                        const defaultJobId = this.getDefaultJobForCharacter(character);
                        this.jobSystem.setCharacterJob(character.id, defaultJobId, 1);
                    } catch (characterError) {
                        console.warn(`Failed to set job for character ${character.id}:`, characterError);
                    }
                }
            }

            // Setup job system event listeners
            this.setupJobSystemEventListeners();

            // Setup job UI callbacks
            this.setupJobUICallbacks();

            console.log('GameplayScene: Job system initialized successfully');

        } catch (error) {
            console.error('GameplayScene: Failed to initialize job system:', error);
            this.uiManager.showErrorNotification({
                message: '職業システムの初期化に失敗しました',
                type: 'error',
                duration: 3000,
            });
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

    /**
     * Handle experience system errors
     * @param eventData - Error event data
     */
    private handleExperienceError(eventData: any): void {
        try {
            console.warn('Handling experience error:', eventData);

            // 重要度に応じた処理
            switch (eventData.severity) {
                case 'critical':
                    this.handleCriticalExperienceError(eventData.error);
                    break;
                case 'high':
                    this.handleHighSeverityExperienceError(eventData);
                    break;
                default:
                    console.log('Experience error handled by error handler');
                    break;
            }

        } catch (error) {
            console.error('Error handling experience error:', error);
        }
    }

    /**
     * Handle critical experience system errors
     * @param errorMessage - Error message to display
     */
    private handleCriticalExperienceError(errorMessage: string): void {
        try {
            console.error('Critical experience error:', errorMessage);

            // ゲームを一時停止
            this.isPaused = true;

            // 緊急通知を表示
            this.uiManager.showMessage(
                `致命的エラー: ${errorMessage}`,
                'error'
            );

            // 回復ガイダンスを表示
            if (this.experienceSystem) {
                const experienceUI = this.experienceSystem['experienceUI'];
                if (experienceUI && experienceUI.showRecoveryGuidance) {
                    experienceUI.showRecoveryGuidance(
                        '経験値システムエラー',
                        errorMessage,
                        [
                            'ゲームを再起動してください',
                            'セーブデータを確認してください',
                            '問題が続く場合はサポートにお問い合わせください'
                        ],
                        () => {
                            // ガイダンス完了後の処理
                            this.attemptExperienceSystemRecovery();
                        }
                    );
                }
            }

        } catch (error) {
            console.error('Error handling critical experience error:', error);
            // 最後の手段: シーンを再起動
            this.scene.restart();
        }
    }

    /**
     * Handle high severity experience system errors
     * @param eventData - Error event data
     */
    private handleHighSeverityExperienceError(eventData: any): void {
        try {
            console.warn('High severity experience error:', eventData);

            // 自動回復を試行
            this.attemptExperienceSystemRecovery();

            // ユーザーに状況を通知
            this.uiManager.showMessage(
                '経験値システムで問題が発生しました。自動回復を試行中...',
                'warning'
            );

        } catch (error) {
            console.error('Error handling high severity experience error:', error);
        }
    }

    /**
     * Attempt experience system recovery
     */
    private async attemptExperienceSystemRecovery(): Promise<void> {
        try {
            console.log('Attempting experience system recovery...');

            if (!this.experienceSystem) {
                console.error('Experience system not available for recovery');
                return;
            }

            // システム回復を試行
            const recoverySuccess = await this.experienceSystem.attemptSystemRecovery();

            if (recoverySuccess) {
                console.log('Experience system recovery successful');

                // ゲームの一時停止を解除
                this.isPaused = false;

                // 成功通知
                this.uiManager.showMessage(
                    '経験値システムが正常に回復しました',
                    'success'
                );

                // キャラクターを再登録
                await this.reregisterCharactersInExperienceSystem();

            } else {
                console.error('Experience system recovery failed');
                this.handleCriticalExperienceError('システム回復に失敗しました');
            }

        } catch (error) {
            console.error('Error during experience system recovery:', error);
            this.handleCriticalExperienceError('回復処理中にエラーが発生しました');
        }
    }

    /**
     * Re-register all characters in the experience system after recovery
     */
    private async reregisterCharactersInExperienceSystem(): Promise<void> {
        try {
            if (!this.experienceSystem || !this.stageData) {
                return;
            }

            console.log('Re-registering characters in experience system...');

            const allCharacters = [...this.stageData.playerUnits, ...this.stageData.enemyUnits];

            for (const character of allCharacters) {
                try {
                    // キャラクターを再登録（レベルと経験値は保存データから復元される）
                    this.experienceSystem.registerCharacter(character, character.level || 1, 0);
                } catch (characterError) {
                    console.warn(`Failed to re-register character ${character.id}:`, characterError);

                    // データ修復を試行
                    const repairSuccess = this.experienceSystem.repairCharacterData(character.id);
                    if (!repairSuccess) {
                        console.error(`Failed to repair character data for ${character.id}`);
                    }
                }
            }

            console.log('Character re-registration completed');

        } catch (error) {
            console.error('Error re-registering characters:', error);
        }
    }

    /**
     * Handle notification actions from error handler
     * @param action - Selected action
     */
    private handleNotificationAction(action: string): void {
        try {
            console.log('Handling notification action:', action);

            switch (action) {
                case 'ゲームを再起動してください':
                    this.restartGame();
                    break;
                case 'セーブデータを確認してください':
                    this.checkSaveData();
                    break;
                case 'サポートにお問い合わせください':
                    this.showSupportInfo();
                    break;
                default:
                    console.log('Unknown notification action:', action);
                    break;
            }

        } catch (error) {
            console.error('Error handling notification action:', error);
        }
    }

    /**
     * Restart the game
     */
    private restartGame(): void {
        try {
            console.log('Restarting game...');

            // シーンを再起動
            this.scene.restart();

        } catch (error) {
            console.error('Error restarting game:', error);
            // ブラウザリロードを試行
            window.location.reload();
        }
    }

    /**
     * Check save data integrity
     */
    private async checkSaveData(): Promise<void> {
        try {
            console.log('Checking save data...');

            // セーブデータの整合性チェックを実行
            if (this.experienceSystem && this.experienceSystem.getPersistenceManager()) {
                const persistenceManager = this.experienceSystem.getPersistenceManager()!;

                // データ整合性チェック（実装されている場合）
                this.uiManager.showMessage(
                    'セーブデータをチェックしています...',
                    'info'
                );

                // 簡単な整合性チェック
                const systemState = this.experienceSystem.getSystemState();
                if (systemState.isInitialized) {
                    this.uiManager.showMessage(
                        'セーブデータは正常です',
                        'success'
                    );
                } else {
                    this.uiManager.showMessage(
                        'セーブデータに問題があります',
                        'warning'
                    );
                }
            } else {
                this.uiManager.showMessage(
                    'セーブデータシステムが利用できません',
                    'warning'
                );
            }

        } catch (error) {
            console.error('Error checking save data:', error);
            this.uiManager.showMessage(
                'セーブデータチェック中にエラーが発生しました',
                'error'
            );
        }
    }

    /**
     * Show support information
     */
    private showSupportInfo(): void {
        try {
            console.log('Showing support info...');

            // サポート情報を表示
            const supportMessage = `
サポート情報:
- ゲーム名: Trail of Thorns
- バージョン: 1.0.0
- エラー発生時刻: ${new Date().toLocaleString()}
- ブラウザ: ${navigator.userAgent}

問題が解決しない場合は、上記の情報と共に
開発チームにお問い合わせください。
            `;

            this.uiManager.showMessage(supportMessage, 'info');

        } catch (error) {
            console.error('Error showing support info:', error);
        }
    }

    /**
     * Restart the game
     */
    private restartGame(): void {
        try {
            console.log('Restarting game...');
            this.scene.restart();
        } catch (error) {
            console.error('Error restarting game:', error);
            // Force reload as fallback
            window.location.reload();
        }
    }

    /**
     * Check save data integrity
     */
    private checkSaveData(): void {
    try {
        console.log('Checking save data...');

        // 経験値システムのセーブデータをチェック
        if(this.experienceSystem) {
    const saveDataStatus = this.experienceSystem.checkSaveDataIntegrity();
    console.log('Save data status:', saveDataStatus);

    this.uiManager.showMessage(
        `セーブデータ状態: ${saveDataStatus.isValid ? '正常' : '破損'}`,
        saveDataStatus.isValid ? 'success' : 'error'
    );
}

        } catch (error) {
    console.error('Error checking save data:', error);
    this.uiManager.showMessage('セーブデータチェック中にエラーが発生しました', 'error');
}
    }

    /**
     * Show support information
     */
    private showSupportInfo(): void {
    try {
        console.log('Showing support info...');

        this.uiManager.showMessage(
            'サポート情報: ゲームログを確認し、問題を報告してください',
            'info'
        );

    } catch(error) {
        console.error('Error showing support info:', error);
    }
}

    // ===== JOB SYSTEM INTEGRATION METHODS =====

    /**
     * Load mock job data for testing
     * 要件2.1-2.5: 職業データ管理
     */
    private async loadMockJobData(): Promise < void> {
    try {
        // Create mock job data for testing
        const mockJobData = new Map<string, JobData>();

        // Warrior job
        mockJobData.set('warrior', {
            id: 'warrior',
            name: '戦士',
            description: '近接戦闘に特化した職業',
            category: 'warrior' as any,
            maxRank: 3,
            statModifiers: {
                1: { hp: 10, mp: 0, attack: 5, defense: 3, speed: -1, skill: 0, luck: 0 },
                2: { hp: 20, mp: 0, attack: 10, defense: 6, speed: -1, skill: 1, luck: 0 },
                3: { hp: 30, mp: 0, attack: 15, defense: 9, speed: -1, skill: 2, luck: 1 },
            },
            availableSkills: {
                1: ['sword_slash', 'guard'],
                2: ['sword_slash', 'guard', 'power_strike'],
                3: ['sword_slash', 'guard', 'power_strike', 'berserker_rage'],
            },
            rankUpRequirements: {
                2: { roseEssenceCost: 10, levelRequirement: 5, prerequisiteSkills: ['sword_slash'] },
                3: { roseEssenceCost: 20, levelRequirement: 10, prerequisiteSkills: ['power_strike'] },
            },
            growthRateModifiers: {
                1: { hp: 1.2, mp: 0.8, attack: 1.1, defense: 1.1, speed: 0.9, skill: 1.0, luck: 1.0 },
                2: { hp: 1.3, mp: 0.8, attack: 1.2, defense: 1.2, speed: 0.9, skill: 1.0, luck: 1.0 },
                3: { hp: 1.4, mp: 0.8, attack: 1.3, defense: 1.3, speed: 0.9, skill: 1.1, luck: 1.0 },
            },
            jobTraits: [
                { id: 'heavy_armor', name: '重装備', description: '重い装備を身に着けられる', effect: {} },
            ],
            visual: {
                iconPath: 'icons/warrior.png',
                spriteModifications: [],
                colorScheme: { primary: 0xff0000, secondary: 0x800000 },
            },
        });

        // Mage job
        mockJobData.set('mage', {
            id: 'mage',
            name: '魔法使い',
            description: '魔法攻撃に特化した職業',
            category: 'mage' as any,
            maxRank: 3,
            statModifiers: {
                1: { hp: -5, mp: 15, attack: 8, defense: -2, speed: 1, skill: 3, luck: 1 },
                2: { hp: -5, mp: 25, attack: 12, defense: -2, speed: 1, skill: 5, luck: 2 },
                3: { hp: -5, mp: 35, attack: 16, defense: -1, speed: 2, skill: 7, luck: 3 },
            },
            availableSkills: {
                1: ['fire_bolt', 'heal'],
                2: ['fire_bolt', 'heal', 'ice_shard', 'group_heal'],
                3: ['fire_bolt', 'heal', 'ice_shard', 'group_heal', 'meteor', 'resurrection'],
            },
            rankUpRequirements: {
                2: { roseEssenceCost: 12, levelRequirement: 4, prerequisiteSkills: ['fire_bolt', 'heal'] },
                3: { roseEssenceCost: 25, levelRequirement: 8, prerequisiteSkills: ['ice_shard'] },
            },
            growthRateModifiers: {
                1: { hp: 0.8, mp: 1.4, attack: 1.2, defense: 0.8, speed: 1.1, skill: 1.3, luck: 1.1 },
                2: { hp: 0.8, mp: 1.5, attack: 1.3, defense: 0.8, speed: 1.1, skill: 1.4, luck: 1.2 },
                3: { hp: 0.9, mp: 1.6, attack: 1.4, defense: 0.9, speed: 1.2, skill: 1.5, luck: 1.3 },
            },
            jobTraits: [
                { id: 'magic_mastery', name: '魔法精通', description: '魔法の威力が上昇する', effect: {} },
            ],
            visual: {
                iconPath: 'icons/mage.png',
                spriteModifications: [],
                colorScheme: { primary: 0x0000ff, secondary: 0x000080 },
            },
        });

        // Initialize job system with mock data
        // Note: The actual job loading would be done through JobDataLoader in a full implementation
        console.log('Mock job data loaded successfully');

    } catch(error) {
        console.error('Failed to load mock job data:', error);
        throw error;
    }
}

    /**
     * Get default job for a character based on their characteristics
     * 要件1.1: キャラクターの初期職業設定
     */
    private getDefaultJobForCharacter(character: Unit): string {
    // Determine default job based on character name or stats
    if (character.name.toLowerCase().includes('mage') || character.stats.maxMP > character.stats.maxHP) {
        return 'mage';
    } else if (character.name.toLowerCase().includes('warrior') || character.stats.attack > character.stats.skill) {
        return 'warrior';
    } else if (character.name.toLowerCase().includes('archer')) {
        return 'archer';
    } else if (character.name.toLowerCase().includes('healer')) {
        return 'healer';
    } else if (character.name.toLowerCase().includes('thief')) {
        return 'thief';
    }

    // Default to warrior for unknown characters
    return 'warrior';
}

    /**
     * Setup job system event listeners
     * 要件3.1-3.5: UI表示の統合
     */
    private setupJobSystemEventListeners(): void {
    console.log('GameplayScene: Setting up job system event listeners');

    if(!this.jobSystem) {
    console.warn('Job system not available for event listener setup');
    return;
}

// Job system events
this.jobSystem.on('system_initialized', (data: any) => {
    console.log('Job system initialized:', data);
    this.jobUI.updateRoseEssenceDisplay(this.jobSystem.getCurrentRoseEssence());
});

this.jobSystem.on('character_job_set', (data: any) => {
    console.log('Character job set:', data);
    // Update character display if this character is selected
    const selectedUnit = this.gameStateManager.getSelectedUnit();
    if (selectedUnit && selectedUnit.id === data.characterId) {
        this.updateCharacterInfoDisplay(selectedUnit);
    }
});

this.jobSystem.on('job_changed', (data: any) => {
    console.log('Job changed:', data);
    // Update character stats in all systems
    this.updateCharacterAfterJobChange(data.characterId);

    // Show notification
    this.uiManager.showNotification({
        message: `${data.characterName || 'Character'} changed job to ${data.newJobName || 'Unknown'}!`,
        type: 'success',
        duration: 3000,
    });
});

this.jobSystem.on('rank_up_completed', (data: any) => {
    console.log('Rank up completed:', data);
    // Update character stats in all systems
    this.updateCharacterAfterJobChange(data.characterId);

    // Show notification
    this.uiManager.showNotification({
        message: `${data.characterName || 'Character'} ranked up to ${data.newRank}!`,
        type: 'success',
        duration: 3000,
    });
});

this.jobSystem.on('rose_essence_awarded', (data: any) => {
    console.log('Rose essence awarded:', data);
    // Update UI display
    this.jobUI.updateRoseEssenceDisplay(data.currentTotal);

    // Show notification
    this.uiManager.showNotification({
        message: `Rose Essence +${data.amount} (Total: ${data.currentTotal})`,
        type: 'info',
        duration: 2000,
    });
});

this.jobSystem.on('rank_up_candidates_available', (data: any) => {
    console.log('Rank up candidates available:', data);
    // Show notification that rank ups are available
    this.uiManager.showNotification({
        message: `${data.length} character(s) can rank up!`,
        type: 'info',
        duration: 3000,
    });
});

this.jobSystem.on('system_error', (data: any) => {
    console.error('Job system error:', data);
    this.uiManager.showErrorNotification({
        message: data.context?.error || 'Job system error occurred',
        type: 'error',
        duration: 3000,
    });
});

console.log('GameplayScene: Job system event listeners setup completed');
    }

    /**
     * Setup job UI callbacks
     * 要件3.1-3.5: 職業・ランクアップ関連の入力処理
     */
    private setupJobUICallbacks(): void {
    console.log('GameplayScene: Setting up job UI callbacks');

    // Job change callback
    this.jobUI['onJobChangeCallback'] = async (characterId: string, newJobId: string): Promise<JobChangeResult> => {
        try {
            return await this.jobSystem.changeJob(characterId, newJobId);
        } catch (error) {
            console.error('Failed to change job:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Job change failed',
                characterId,
                oldJobId: '',
                newJobId,
            };
        }
    };

    // Rank up callback
    this.jobUI['onRankUpCallback'] = async (characterId: string, targetRank?: number): Promise<RankUpResult> => {
        try {
            return await this.jobSystem.rankUpJob(characterId, targetRank);
        } catch (error) {
            console.error('Failed to rank up:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Rank up failed',
                characterId,
                oldRank: 1,
                newRank: targetRank || 1,
                roseEssenceUsed: 0,
                newSkills: [],
                statChanges: {},
            };
        }
    };

    // Close callback
    this.jobUI['onCloseCallback'] = () => {
        console.log('Job UI closed');
        // Re-enable normal input
        this.inputHandler.enable();
    };

    console.log('GameplayScene: Job UI callbacks setup completed');
}

    /**
     * Update character after job change or rank up
     * 要件1.1, 1.4: 職業による能力値修正の適用
     */
    private updateCharacterAfterJobChange(characterId: string): void {
    try {
        const character = this.findUnitById(characterId);
        if(!character) {
            console.warn(`Character ${characterId} not found for job update`);
            return;
        }

            // Get job stat modifiers
            const jobStats = this.jobSystem.getCharacterJobStats(characterId);

        // Apply job modifiers to character stats (this would be more sophisticated in a full implementation)
        // For now, just log the changes
        console.log(`Applying job stat modifiers to ${character.name}:`, jobStats);

        // Update character manager
        this.characterManager.updateCharacterStats(character.id, character.stats);

        // Update all systems with new character data
        if(this.stageData) {
    const allCharacters = [...this.stageData.playerUnits, ...this.stageData.enemyUnits];
    this.movementSystem.updateUnits(allCharacters);
    this.battleSystem.initialize(allCharacters, this.stageData.mapData);
}

// Update skill system with new job skills
if (this.skillSystem) {
    const jobSkills = this.jobSystem.getCharacterJobSkills(characterId);
    console.log(`Updating skills for ${character.name}:`, jobSkills);
    // The skill system would handle job skill updates here
}

        } catch (error) {
    console.error('Failed to update character after job change:', error);
}
    }

    /**
     * Handle job-related input shortcuts
     * 要件3.1-3.5: 職業・ランクアップ関連の入力処理
     */
    private handleJobShortcuts(shortcut: string, keyInfo: any): void {
    switch(shortcut) {
            case 'J':
    case 'j':
    // Show job selection for selected character
    this.handleJobSelectionShortcut();
    break;
    case 'R':
    case 'r':
    // Show rank up UI
    this.handleRankUpShortcut();
    break;
    case 'Shift+J':
    // Show job info for selected character
    this.handleJobInfoShortcut();
    break;
}
    }

    /**
     * Handle job selection shortcut
     */
    private handleJobSelectionShortcut(): void {
    const selectedUnit = this.gameStateManager.getSelectedUnit();
    if(!selectedUnit) {
        this.uiManager.showNotification({
            message: 'No character selected',
            type: 'warning',
            duration: 2000,
        });
        return;
    }

        if(selectedUnit.faction !== 'player') {
    this.uiManager.showNotification({
        message: 'Cannot change jobs for enemy units',
        type: 'warning',
        duration: 2000,
    });
    return;
}

// Show job selection UI
const availableJobs = this.jobSystem.getAllJobs();
this.jobUI.showJobSelection(selectedUnit, availableJobs);

// Disable normal input while UI is open
this.inputHandler.disable();
    }

    /**
     * Handle rank up shortcut
     */
    private handleRankUpShortcut(): void {
    // Get rank up candidates
    const candidates = this.jobSystem.getRankUpCandidates();
    const currentRoseEssence = this.jobSystem.getCurrentRoseEssence();

    if(candidates.length === 0) {
    this.uiManager.showNotification({
        message: 'No characters can rank up',
        type: 'info',
        duration: 2000,
    });
    return;
}

// Show rank up UI
this.jobUI.showRankUpUI(candidates, currentRoseEssence);

// Disable normal input while UI is open
this.inputHandler.disable();
    }

    /**
     * Handle job info shortcut
     */
    private handleJobInfoShortcut(): void {
    const selectedUnit = this.gameStateManager.getSelectedUnit();
    if(!selectedUnit) {
        this.uiManager.showNotification({
            message: 'No character selected',
            type: 'warning',
            duration: 2000,
        });
        return;
    }

        const job = this.jobSystem.getCharacterJob(selectedUnit.id);
    if(!job) {
        this.uiManager.showNotification({
            message: 'Character has no job assigned',
            type: 'warning',
            duration: 2000,
        });
        return;
    }

        // Show job info UI
        this.jobUI.showJobInfo(selectedUnit, job);

    // Disable normal input while UI is open
    this.inputHandler.disable();
}

    /**
     * Handle boss defeat and award rose essence
     * 要件4.1-4.2: ボス撃破時の薔薇の力獲得
     */
    private handleBossDefeat(boss: Unit): void {
    try {
        // Calculate rose essence reward based on boss type/level
        const roseEssenceAmount = this.calculateRoseEssenceReward(boss);

        // Award rose essence
        const bossScreenPos = this.getUnitScreenPosition(boss);
        this.jobSystem.awardRoseEssence(
            roseEssenceAmount,
            `boss_defeat_${boss.id}`,
            bossScreenPos || undefined
        );

        console.log(`Boss ${boss.name} defeated, awarded ${roseEssenceAmount} rose essence`);

    } catch(error) {
        console.error('Failed to handle boss defeat:', error);
    }
}

    /**
     * Calculate rose essence reward for defeating a boss
     */
    private calculateRoseEssenceReward(boss: Unit): number {
    // Base reward calculation (this would be more sophisticated in a full implementation)
    let baseReward = 10;

    // Bonus based on boss level or stats
    if (boss.stats.maxHP > 200) {
        baseReward += 10; // Strong boss bonus
    }

    // Bonus for special boss types (would check boss metadata)
    if (boss.name.toLowerCase().includes('boss') || boss.name.toLowerCase().includes('dragon')) {
        baseReward += 15; // Special boss bonus
    }

    return baseReward;
}

    /**
     * Initialize victory condition system with stage data
     * 要件1.1: ステージ開始時の目標・ボス情報初期化
     */
    private initializeVictoryConditionSystem(): void {
        try {
            if (!this.stageData) {
                console.warn('No stage data available for victory condition system');
                return;
            }

            console.log('GameplayScene: Initializing victory condition system');

            // Create victory stage data from current stage data
            const victoryStageData = this.createVictoryStageData(this.stageData);

            // Initialize the system
            const initResult = this.victoryConditionSystem.initialize(victoryStageData);
            if (!initResult.success) {
                console.error('Failed to initialize victory condition system:', initResult.message);
                return;
            }

            // Set RecruitmentSystem reference for stage clear integration
            this.victoryConditionSystem.setRecruitmentSystem(this.recruitmentSystem);

            // Integrate with BattleSystem
            this.battleSystem.setVictoryConditionSystem(this.victoryConditionSystem);

            // Register boss units if any
            this.registerBossUnits(victoryStageData.bosses);

            // Setup victory condition event listeners
            this.setupVictoryConditionEventListeners();

            console.log('GameplayScene: Victory condition system initialized successfully');
        } catch (error) {
            console.error('GameplayScene: Error initializing victory condition system:', error);
        }
    }

    /**
     * Create VictoryStageData from StageData
     * 要件1.1, 1.2: ステージの勝利条件・敗北条件を読み込む
     */
    private createVictoryStageData(stageData: StageData): VictoryStageData {
        // Create objectives from victory conditions
        const objectives: Objective[] = [];
        let objectiveIdCounter = 1;

        // Default objective: Defeat all enemies
        objectives.push({
            id: `objective-${objectiveIdCounter++}`,
            type: ObjectiveType.DEFEAT_ALL_ENEMIES,
            description: 'Defeat all enemy units',
            isRequired: true,
            isComplete: false,
            progress: {
                current: 0,
                target: stageData.enemyUnits.length,
            },
        });

        // Check for boss units and add boss defeat objectives
        const bossUnits = stageData.enemyUnits.filter(unit => this.isBossUnit(unit));
        for (const boss of bossUnits) {
            objectives.push({
                id: `objective-${objectiveIdCounter++}`,
                type: ObjectiveType.DEFEAT_BOSS,
                description: `Defeat ${boss.name}`,
                isRequired: true,
                isComplete: false,
                progress: {
                    current: 0,
                    target: 1,
                },
                targetData: {
                    bossId: boss.id,
                },
            });
        }

        // Create victory conditions
        const victoryConditions = [
            {
                id: 'victory-all-objectives',
                type: 'all_objectives_complete' as const,
                description: 'Complete all objectives',
                objectiveIds: objectives.filter(obj => obj.isRequired).map(obj => obj.id),
            },
        ];

        // Create defeat conditions
        const defeatConditions = [
            {
                id: 'defeat-all-player-units',
                type: 'all_player_units_defeated' as const,
                description: 'All player units defeated',
            },
        ];

        // Create boss data
        const bosses: BossData[] = bossUnits.map(boss => ({
            id: boss.id,
            name: boss.name,
            type: 'standard' as const,
            difficulty: 'normal' as const,
            roseEssenceReward: {
                type: 'standard' as const,
                amount: this.calculateRoseEssenceReward(boss),
                description: `Rose essence from ${boss.name}`,
            },
            phases: [],
            abilities: [],
        }));

        return {
            id: stageData.id,
            name: stageData.name,
            description: stageData.description,
            objectives,
            victoryConditions,
            defeatConditions,
            bosses,
            baseExperienceReward: 100, // Default value
            targetTurns: 20, // Default value
            maxTurns: 50, // Default value
        };
    }

    /**
     * Register boss units with the victory condition system
     */
    private registerBossUnits(bosses: BossData[]): void {
        if (!this.stageData) {
            return;
        }

        for (const bossData of bosses) {
            const bossUnit = this.stageData.enemyUnits.find(unit => unit.id === bossData.id);
            if (bossUnit) {
                this.victoryConditionSystem.registerBossUnit(bossUnit, bossData);
                console.log(`Registered boss unit: ${bossUnit.name}`);
            }
        }
    }

    /**
     * Setup victory condition system event listeners
     * 要件1.7, 2.8, 3.5, 3.6: イベント処理
     */
    private setupVictoryConditionEventListeners(): void {
        console.log('GameplayScene: Setting up victory condition event listeners');

        // Objective events
        this.victoryConditionSystem.on('objective-completed', (data: any) => {
            console.log('Objective completed:', data.objectiveId);
            this.handleObjectiveCompleted(data);
        });

        this.victoryConditionSystem.on('objective-failed', (data: any) => {
            console.log('Objective failed:', data.objectiveId);
            this.handleObjectiveFailed(data);
        });

        // Boss events
        this.victoryConditionSystem.on('boss-defeated-integrated', (data: any) => {
            console.log('Boss defeated (integrated):', data);
            this.handleBossDefeatedIntegrated(data);
        });

        // Victory/Defeat events
        this.victoryConditionSystem.on('victory-conditions-met', (data: any) => {
            console.log('Victory conditions met!', data);
            this.handleVictoryConditionsMet(data);
        });

        this.victoryConditionSystem.on('defeat-conditions-met', (data: any) => {
            console.log('Defeat conditions met!', data);
            this.handleDefeatConditionsMet(data);
        });

        this.victoryConditionSystem.on('auto-victory-detected', (data: any) => {
            console.log('Auto victory detected!', data);
            this.handleAutoVictory(data);
        });

        this.victoryConditionSystem.on('auto-defeat-detected', (data: any) => {
            console.log('Auto defeat detected!', data);
            this.handleAutoDefeat(data);
        });

        // Stage complete/failure events
        this.victoryConditionSystem.on('stage-complete', (data: StageCompleteResult) => {
            console.log('Stage complete!', data);
            this.handleStageComplete(data);
        });

        this.victoryConditionSystem.on('stage-failure', (data: StageFailureResult) => {
            console.log('Stage failed!', data);
            this.handleStageFailure(data);
        });

        // Turn end integration
        this.events.on('turn-changed', (data: any) => {
            if (this.victoryConditionSystem && this.victoryConditionSystem.isSystemInitialized()) {
                const gameState = this.gameStateManager.getGameState();
                this.victoryConditionSystem.onTurnEnd(gameState);
            }
        });

        console.log('GameplayScene: Victory condition event listeners setup completed');
    }

    /**
     * Handle objective completed
     * 要件1.7: 目標達成イベントを発行する
     */
    private handleObjectiveCompleted(data: any): void {
        // Show notification
        this.uiManager.showNotification({
            message: `Objective completed: ${data.description || data.objectiveId}`,
            type: 'success',
            duration: 3000,
        });

        // Update UI to show objective completion
        // TODO: Implement objective UI update
    }

    /**
     * Handle objective failed
     */
    private handleObjectiveFailed(data: any): void {
        // Show notification
        this.uiManager.showNotification({
            message: `Objective failed: ${data.reason}`,
            type: 'error',
            duration: 3000,
        });
    }

    /**
     * Handle boss defeated (integrated with victory system)
     * 要件2.8: ボス撃破イベントを発行する
     */
    private handleBossDefeatedIntegrated(data: any): void {
        // Show boss defeat notification
        this.uiManager.showNotification({
            message: `Boss defeated: ${data.bossName || 'Boss'}`,
            type: 'success',
            duration: 5000,
        });

        // Award rose essence through job system
        if (data.roseEssenceReward) {
            const bossUnit = this.findUnitById(data.bossId);
            const screenPos = bossUnit ? this.getUnitScreenPosition(bossUnit) : undefined;
            
            this.jobSystem.awardRoseEssence(
                data.roseEssenceReward.amount,
                `boss_defeat_${data.bossId}`,
                screenPos
            );
        }
    }

    /**
     * Handle victory conditions met
     * 要件3.3: すべての勝利条件が満たされるとき、勝利状態に遷移する
     */
    private handleVictoryConditionsMet(data: any): void {
        console.log('Victory conditions met, preparing for stage complete');
        // The actual stage complete will be triggered by auto-victory-detected
    }

    /**
     * Handle defeat conditions met
     * 要件3.4: いずれかの敗北条件が満たされるとき、敗北状態に遷移する
     */
    private handleDefeatConditionsMet(data: any): void {
        console.log('Defeat conditions met, preparing for stage failure');
        // The actual stage failure will be triggered by auto-defeat-detected
    }

    /**
     * Handle auto victory detection
     * 要件3.7: 勝利状態に遷移するとき、ゲーム進行を停止する
     */
    private async handleAutoVictory(data: any): Promise<void> {
        try {
            // Stop game progression
            this.isPaused = true;
            this.inputHandler.disable();

            // Get all units for stage complete processing
            const allUnits = this.getAllUnits();

            // Process stage complete
            const gameState = this.gameStateManager.getGameState();
            const stageCompleteResult = await this.victoryConditionSystem.handleStageComplete(
                gameState,
                allUnits
            );

            console.log('Stage complete result:', stageCompleteResult);
        } catch (error) {
            console.error('Error handling auto victory:', error);
        }
    }

    /**
     * Handle auto defeat detection
     * 要件3.8: 敗北状態に遷移するとき、ゲーム進行を停止する
     */
    private async handleAutoDefeat(data: any): Promise<void> {
        try {
            // Stop game progression
            this.isPaused = true;
            this.inputHandler.disable();

            // Process stage failure
            const gameState = this.gameStateManager.getGameState();
            const defeatReason = data.triggeredConditions?.[0]?.description || 'Defeat conditions met';
            
            const stageFailureResult = await this.victoryConditionSystem.handleStageFailure(
                defeatReason,
                gameState
            );

            console.log('Stage failure result:', stageFailureResult);
        } catch (error) {
            console.error('Error handling auto defeat:', error);
        }
    }

    /**
     * Handle stage complete
     * 要件4.6: 報酬表示UIを表示する
     * 要件10.7: 報酬受け取り後の次ステージ遷移
     */
    private async handleStageComplete(result: StageCompleteResult): Promise<void> {
        try {
            console.log('Handling stage complete with rewards:', result);

            // Show victory screen with rewards
            // TODO: Implement victory screen UI
            this.uiManager.showNotification({
                message: `Stage Complete! Rating: ${result.clearRating}`,
                type: 'success',
                duration: 5000,
            });

            // Distribute rewards
            await this.victoryConditionSystem.distributeRewards(result.rewards);

            // Wait for user confirmation before transitioning
            // TODO: Implement reward confirmation UI
            // For now, auto-transition after delay
            this.time.delayedCall(5000, () => {
                this.transitionToNextStage();
            });
        } catch (error) {
            console.error('Error handling stage complete:', error);
        }
    }

    /**
     * Handle stage failure
     * 要件3.8: 敗北状態に遷移するとき、ゲーム進行を停止する
     */
    private async handleStageFailure(result: StageFailureResult): Promise<void> {
        try {
            console.log('Handling stage failure:', result);

            // Show defeat screen
            // TODO: Implement defeat screen UI
            this.uiManager.showNotification({
                message: `Stage Failed: ${result.defeatReason}`,
                type: 'error',
                duration: 5000,
            });

            // Wait for user confirmation before transitioning
            // TODO: Implement defeat screen UI with retry/quit options
            // For now, auto-transition after delay
            this.time.delayedCall(5000, () => {
                this.transitionToStageSelect();
            });
        } catch (error) {
            console.error('Error handling stage failure:', error);
        }
    }

    /**
     * Transition to next stage
     * 要件10.7: 報酬受け取り後の次ステージ遷移
     */
    private transitionToNextStage(): void {
        console.log('Transitioning to next stage...');
        
        // For now, return to stage select
        // TODO: Implement chapter progression and next stage loading
        this.transitionToStageSelect();
    }

    /**
     * Transition to stage select screen
     */
    private transitionToStageSelect(): void {
        console.log('Transitioning to stage select...');
        
        // Clean up systems
        this.cleanup();
        
        // Transition to stage select scene
        SceneTransition.transitionTo(
            this,
            'StageSelectScene',
            TransitionType.FADE_OUT,
            500,
            {}
        );
    }

    /**
     * Get all units in the stage
     */
    private getAllUnits(): Unit[] {
        if (!this.stageData) {
            return [];
        }
        return [...this.stageData.playerUnits, ...this.stageData.enemyUnits];
    }

    /**
     * Cleanup systems before scene transition
     */
    private cleanup(): void {
        try {
            // Destroy victory condition system
            if (this.victoryConditionSystem) {
                this.victoryConditionSystem.destroy();
            }

            // Other cleanup...
            console.log('GameplayScene: Cleanup completed');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    /**
     * Check if a unit is a boss
     * 要件4.1: ボス撃破時の薔薇の力獲得判定
     */
    private isBossUnit(unit: Unit): boolean {
        // Check if unit is a boss based on various criteria

        // Check name for boss indicators
        const name = unit.name.toLowerCase();
        if (name.includes('boss') || name.includes('dragon') || name.includes('lord') || name.includes('king')) {
            return true;
        }

        // Check stats for boss-level power
        if (unit.stats.maxHP > 150 && unit.stats.attack > 30) {
        return true;
    }

    // Check metadata for boss flag (would be set in stage data)
    if (unit.metadata && (unit.metadata as any).isBoss) {
        return true;
    }

    return false;
}

    // ===== VICTORY CONDITION SYSTEM INTEGRATION METHODS =====

    /**
     * Initialize victory condition system with stage data
     * 要件1.1: ステージの勝利条件・敗北条件を読み込む
     * 要件2.1: ボスユニットを定義する
     */
    private initializeVictoryConditionSystem(): void {
        if (!this.stageData) {
            console.warn('Cannot initialize victory condition system: no stage data');
            return;
        }

        console.log('GameplayScene: Initializing victory condition system');

        try {
            // Create victory stage data from current stage data
            const victoryStageData: VictoryStageData = this.createVictoryStageData(this.stageData);

            // Initialize the system
            const initResult = this.victoryConditionSystem.initialize(victoryStageData);

            if (!initResult.success) {
                console.error('Failed to initialize victory condition system:', initResult.message);
                return;
            }

            console.log('Victory condition system initialized:', {
                objectives: initResult.objectivesRegistered,
                conditions: initResult.conditionsRegistered,
                bosses: initResult.bossesRegistered,
            });

            // Set recruitment system reference for stage completion
            this.victoryConditionSystem.setRecruitmentSystem(this.recruitmentSystem);

            // Register boss units if any
            this.registerBossUnits();

            // Setup victory condition event listeners
            this.setupVictoryConditionEventListeners();

        } catch (error) {
            console.error('Error initializing victory condition system:', error);
        }
    }

    /**
     * Create victory stage data from stage data
     * @param stageData - Current stage data
     * @returns Victory stage data
     */
    private createVictoryStageData(stageData: StageData): VictoryStageData {
        // Create objectives from victory conditions
        const objectives: Objective[] = [];
        let objectiveId = 1;

        // Add defeat all enemies objective
        objectives.push({
            id: `objective-${objectiveId++}`,
            type: ObjectiveType.DEFEAT_ALL_ENEMIES,
            description: 'Defeat all enemy units',
            isRequired: true,
            isComplete: false,
            progress: {
                current: 0,
                target: stageData.enemyUnits.length,
                percentage: 0,
            },
        });

        // Add boss defeat objectives if there are bosses
        const bossUnits = stageData.enemyUnits.filter(unit => this.isBossUnit(unit));
        bossUnits.forEach(boss => {
            objectives.push({
                id: `objective-${objectiveId++}`,
                type: ObjectiveType.DEFEAT_BOSS,
                description: `Defeat ${boss.name}`,
                isRequired: true,
                isComplete: false,
                progress: {
                    current: 0,
                    target: 1,
                    percentage: 0,
                },
                targetData: {
                    bossId: boss.id,
                },
            });
        });

        // Create victory conditions
        const victoryConditions = [
            {
                id: 'victory-defeat-all',
                type: 'defeat_all_enemies' as any,
                description: 'Defeat all enemy units',
                isRequired: true,
                evaluate: (gameState: any) => {
                    const enemyUnits = stageData.enemyUnits.filter(
                        unit => unit.currentHP > 0 && !this.recruitmentSystem.isNPC(unit)
                    );
                    return enemyUnits.length === 0;
                },
            },
        ];

        // Create defeat conditions
        const defeatConditions = [
            {
                id: 'defeat-all-units-defeated',
                type: 'all_units_defeated' as any,
                description: 'All player units defeated',
                evaluate: (gameState: any) => {
                    const playerUnits = stageData.playerUnits.filter(unit => unit.currentHP > 0);
                    return playerUnits.length === 0;
                },
            },
        ];

        // Create boss data for boss units
        const bosses: BossData[] = bossUnits.map(boss => ({
            id: boss.id,
            name: boss.name,
            title: boss.metadata?.bossTitle || 'Boss',
            description: boss.metadata?.bossDescription || 'A powerful enemy',
            roseEssenceAmount: boss.metadata?.roseEssenceAmount || 100,
            roseEssenceType: boss.metadata?.roseEssenceType || 'crimson',
            isBoss: true,
            bossType: boss.metadata?.bossType || 'minor_boss',
            difficulty: boss.metadata?.bossDifficulty || 'normal',
            phases: boss.metadata?.bossPhases || [],
            currentPhase: 0,
            specialAbilities: boss.metadata?.bossAbilities || [],
            aiPersonality: boss.metadata?.aiPersonality || 'aggressive',
            aiPriority: boss.metadata?.aiPriority || 100,
            experienceReward: boss.metadata?.experienceReward || 200,
        }));

        return {
            id: stageData.id,
            name: stageData.name,
            description: stageData.description,
            objectives,
            victoryConditions,
            defeatConditions,
            bosses,
            baseExperienceReward: 100,
            targetTurns: 20,
            maxTurns: 50,
        };
    }

    /**
     * Register boss units with the victory condition system
     */
    private registerBossUnits(): void {
        if (!this.stageData) {
            return;
        }

        const bossUnits = this.stageData.enemyUnits.filter(unit => this.isBossUnit(unit));

        bossUnits.forEach(boss => {
            const bossData: BossData = {
                id: boss.id,
                name: boss.name,
                title: boss.metadata?.bossTitle || 'Boss',
                description: boss.metadata?.bossDescription || 'A powerful enemy',
                roseEssenceAmount: boss.metadata?.roseEssenceAmount || 100,
                roseEssenceType: boss.metadata?.roseEssenceType || 'crimson',
                isBoss: true,
                bossType: boss.metadata?.bossType || 'minor_boss',
                difficulty: boss.metadata?.bossDifficulty || 'normal',
                phases: boss.metadata?.bossPhases || [],
                currentPhase: 0,
                specialAbilities: boss.metadata?.bossAbilities || [],
                aiPersonality: boss.metadata?.aiPersonality || 'aggressive',
                aiPriority: boss.metadata?.aiPriority || 100,
                experienceReward: boss.metadata?.experienceReward || 200,
            };

            this.victoryConditionSystem.registerBossUnit(boss, bossData);
            console.log(`Registered boss unit: ${boss.name}`);
        });
    }

    /**
     * Check if a unit is a boss
     * @param unit - Unit to check
     * @returns True if unit is a boss
     */
    private isBossUnit(unit: Unit): boolean {
        return unit.metadata?.isBoss === true || unit.metadata?.bossType !== undefined;
    }

    /**
     * Handle boss defeat
     * 要件2.8: ボスが撃破されるとき、ボス撃破イベントを発行する
     * @param boss - Defeated boss unit
     */
    private async handleBossDefeat(boss: Unit): Promise<void> {
        console.log(`Boss defeated: ${boss.name}`);

        try {
            // Process boss defeat through victory condition system
            const defeatResult = await this.victoryConditionSystem.handleBossDefeat(boss);

            console.log('Boss defeat processed:', defeatResult);

            // Show boss defeat notification
            this.uiManager.showNotification({
                message: `${boss.name} defeated! Rose Essence gained: ${defeatResult.roseEssenceGained}`,
                type: 'success',
                duration: 5000,
            });

            // Award rose essence through job system
            if (defeatResult.roseEssenceGained > 0 && this.jobSystem) {
                this.jobSystem.awardRoseEssence(defeatResult.roseEssenceGained, {
                    type: 'boss_defeat',
                    bossId: boss.id,
                    bossName: boss.name,
                    essenceType: defeatResult.roseEssenceType,
                });
            }

        } catch (error) {
            console.error('Error handling boss defeat:', error);
        }
    }

    /**
     * Setup victory condition event listeners
     */
    private setupVictoryConditionEventListeners(): void {
        console.log('GameplayScene: Setting up victory condition event listeners');

        // Objective events
        this.victoryConditionSystem.on('objective-completed', (data: any) => {
            console.log('Objective completed:', data.objectiveId);

            this.uiManager.showNotification({
                message: `Objective completed: ${data.description}`,
                type: 'success',
                duration: 3000,
            });
        });

        // Victory/defeat detection events
        this.victoryConditionSystem.on('auto-victory-detected', (data: any) => {
            console.log('Auto victory detected');
            this.handleStageVictory();
        });

        this.victoryConditionSystem.on('auto-defeat-detected', (data: any) => {
            console.log('Auto defeat detected:', data.triggeredConditions);
            this.handleStageDefeat(data.triggeredConditions[0]?.description || 'All units defeated');
        });

        // Boss defeat events
        this.victoryConditionSystem.on('boss-defeated-integrated', (data: any) => {
            console.log('Boss defeated (integrated):', data);
        });

        // Stage completion events
        this.victoryConditionSystem.on('stage-complete', (data: StageCompleteResult) => {
            console.log('Stage complete event:', data);
            this.showStageCompleteScreen(data);
        });

        this.victoryConditionSystem.on('stage-failure', (data: StageFailureResult) => {
            console.log('Stage failure event:', data);
            this.showStageFailureScreen(data);
        });

        // Turn end processing
        this.events.on('turn-changed', (data: any) => {
            this.victoryConditionSystem.onTurnEnd(this.gameStateManager.getGameState());
        });

        console.log('GameplayScene: Victory condition event listeners setup completed');
    }

    /**
     * Handle stage victory
     * 要件3.7: 勝利状態に遷移するとき、ゲーム進行を停止する
     */
    private async handleStageVictory(): Promise<void> {
        console.log('GameplayScene: Handling stage victory');

        try {
            // Stop game progression
            this.isPaused = true;

            // Get all units for recruitment completion
            const allUnits = this.stageData
                ? [...this.stageData.playerUnits, ...this.stageData.enemyUnits]
                : [];

            // Process stage completion through victory condition system
            const completeResult = await this.victoryConditionSystem.handleStageComplete(
                this.gameStateManager.getGameState(),
                allUnits
            );

            console.log('Stage completion processed:', completeResult);

            // The stage-complete event will trigger showStageCompleteScreen

        } catch (error) {
            console.error('Error handling stage victory:', error);

            // Fallback: show basic victory screen
            this.uiManager.showNotification({
                message: 'Stage Complete!',
                type: 'success',
                duration: 5000,
            });
        }
    }

    /**
     * Handle stage defeat
     * 要件3.8: 敗北状態に遷移するとき、ゲーム進行を停止する
     * @param reason - Defeat reason
     */
    private async handleStageDefeat(reason: string): Promise<void> {
        console.log('GameplayScene: Handling stage defeat:', reason);

        try {
            // Stop game progression
            this.isPaused = true;

            // Process stage failure through victory condition system
            const failureResult = await this.victoryConditionSystem.handleStageFailure(
                reason,
                this.gameStateManager.getGameState()
            );

            console.log('Stage failure processed:', failureResult);

            // The stage-failure event will trigger showStageFailureScreen

        } catch (error) {
            console.error('Error handling stage defeat:', error);

            // Fallback: show basic defeat screen
            this.uiManager.showNotification({
                message: `Stage Failed: ${reason}`,
                type: 'error',
                duration: 5000,
            });
        }
    }

    /**
     * Show stage complete screen with rewards
     * 要件4.6: 報酬が計算されるとき、報酬表示UIを表示する
     * @param result - Stage completion result
     */
    private showStageCompleteScreen(result: StageCompleteResult): void {
        console.log('GameplayScene: Showing stage complete screen');

        // Create victory overlay
        const victoryOverlay = this.add
            .graphics()
            .fillStyle(0x000000, 0.8)
            .fillRect(0, 0, this.cameras.main.width, this.cameras.main.height)
            .setScrollFactor(0)
            .setDepth(2000);

        // Victory title
        const victoryTitle = this.add
            .text(this.cameras.main.width / 2, 100, 'Stage Complete!', {
                fontSize: '48px',
                color: '#FFD700',
                fontFamily: 'Arial',
                fontStyle: 'bold',
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(2001);

        // Stage name
        const stageName = this.add
            .text(this.cameras.main.width / 2, 160, result.stageName, {
                fontSize: '24px',
                color: '#ffffff',
                fontFamily: 'Arial',
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(2001);

        // Clear rating
        const ratingText = this.add
            .text(this.cameras.main.width / 2, 220, `Clear Rating: ${result.clearRating}`, {
                fontSize: '32px',
                color: this.getRatingColor(result.clearRating),
                fontFamily: 'Arial',
                fontStyle: 'bold',
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(2001);

        // Rewards summary
        let yPos = 280;
        const rewardTexts: Phaser.GameObjects.Text[] = [];

        // Base experience
        rewardTexts.push(
            this.add
                .text(
                    this.cameras.main.width / 2,
                    yPos,
                    `Base Experience: ${result.rewards.baseExperience}`,
                    {
                        fontSize: '20px',
                        color: '#ffffff',
                        fontFamily: 'Arial',
                    }
                )
                .setOrigin(0.5)
                .setScrollFactor(0)
                .setDepth(2001)
        );
        yPos += 30;

        // Boss rewards
        if (result.rewards.bossRewards.length > 0) {
            result.rewards.bossRewards.forEach(bossReward => {
                rewardTexts.push(
                    this.add
                        .text(
                            this.cameras.main.width / 2,
                            yPos,
                            `${bossReward.bossName}: ${bossReward.roseEssenceAmount} Rose Essence`,
                            {
                                fontSize: '20px',
                                color: '#FF69B4',
                                fontFamily: 'Arial',
                            }
                        )
                        .setOrigin(0.5)
                        .setScrollFactor(0)
                        .setDepth(2001)
                );
                yPos += 30;
            });
        }

        // Recruitment rewards
        if (result.rewards.recruitmentRewards.length > 0) {
            rewardTexts.push(
                this.add
                    .text(
                        this.cameras.main.width / 2,
                        yPos,
                        `Recruited: ${result.rewards.recruitmentRewards.length} characters`,
                        {
                            fontSize: '20px',
                            color: '#00FF00',
                            fontFamily: 'Arial',
                        }
                    )
                    .setOrigin(0.5)
                    .setScrollFactor(0)
                    .setDepth(2001)
            );
            yPos += 30;
        }

        // Performance stats
        yPos += 20;
        rewardTexts.push(
            this.add
                .text(
                    this.cameras.main.width / 2,
                    yPos,
                    `Turns: ${result.performance.turnsUsed} | Enemies Defeated: ${result.performance.enemiesDefeated}`,
                    {
                        fontSize: '18px',
                        color: '#CCCCCC',
                        fontFamily: 'Arial',
                    }
                )
                .setOrigin(0.5)
                .setScrollFactor(0)
                .setDepth(2001)
        );

        // Continue button
        const continueButton = this.createPauseMenuButton(
            this.cameras.main.width / 2,
            this.cameras.main.height - 100,
            'Continue',
            () => {
                this.handleStageCompleteConfirm(result);
            }
        );
        continueButton.setScrollFactor(0).setDepth(2001);

        // Store references for cleanup
        this.data.set('victoryOverlay', victoryOverlay);
        this.data.set('victoryTitle', victoryTitle);
        this.data.set('stageName', stageName);
        this.data.set('ratingText', ratingText);
        this.data.set('rewardTexts', rewardTexts);
        this.data.set('continueButton', continueButton);
    }

    /**
     * Show stage failure screen
     * @param result - Stage failure result
     */
    private showStageFailureScreen(result: StageFailureResult): void {
        console.log('GameplayScene: Showing stage failure screen');

        // Create defeat overlay
        const defeatOverlay = this.add
            .graphics()
            .fillStyle(0x000000, 0.9)
            .fillRect(0, 0, this.cameras.main.width, this.cameras.main.height)
            .setScrollFactor(0)
            .setDepth(2000);

        // Defeat title
        const defeatTitle = this.add
            .text(this.cameras.main.width / 2, 150, 'Stage Failed', {
                fontSize: '48px',
                color: '#FF0000',
                fontFamily: 'Arial',
                fontStyle: 'bold',
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(2001);

        // Defeat reason
        const reasonText = this.add
            .text(this.cameras.main.width / 2, 220, result.defeatReason, {
                fontSize: '24px',
                color: '#ffffff',
                fontFamily: 'Arial',
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(2001);

        // Retry button
        const retryButton = this.createPauseMenuButton(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 50,
            'Retry Stage',
            () => {
                this.handleStageRetry();
            }
        );
        retryButton.setScrollFactor(0).setDepth(2001);

        // Return to stage select button
        const returnButton = this.createPauseMenuButton(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 110,
            'Return to Stage Select',
            () => {
                this.returnToStageSelect();
            }
        );
        returnButton.setScrollFactor(0).setDepth(2001);

        // Store references for cleanup
        this.data.set('defeatOverlay', defeatOverlay);
        this.data.set('defeatTitle', defeatTitle);
        this.data.set('reasonText', reasonText);
        this.data.set('retryButton', retryButton);
        this.data.set('returnButton', returnButton);
    }

    /**
     * Handle stage complete confirmation
     * 要件10.7: 報酬受け取り後の次ステージ遷移を実装
     * @param result - Stage completion result
     */
    private async handleStageCompleteConfirm(result: StageCompleteResult): Promise<void> {
        console.log('GameplayScene: Handling stage complete confirmation');

        try {
            // Distribute rewards through victory condition system
            await this.victoryConditionSystem.distributeRewards(result.rewards);

            // Clean up victory screen
            this.cleanupVictoryScreen();

            // Return to stage select
            await this.returnToStageSelect();

        } catch (error) {
            console.error('Error handling stage complete confirmation:', error);
            await this.returnToStageSelect();
        }
    }

    /**
     * Handle stage retry
     */
    private handleStageRetry(): void {
        console.log('GameplayScene: Retrying stage');

        // Clean up defeat screen
        this.cleanupDefeatScreen();

        // Restart the scene
        this.scene.restart();
    }

    /**
     * Clean up victory screen
     */
    private cleanupVictoryScreen(): void {
        const victoryOverlay = this.data.get('victoryOverlay');
        const victoryTitle = this.data.get('victoryTitle');
        const stageName = this.data.get('stageName');
        const ratingText = this.data.get('ratingText');
        const rewardTexts = this.data.get('rewardTexts');
        const continueButton = this.data.get('continueButton');

        if (victoryOverlay) victoryOverlay.destroy();
        if (victoryTitle) victoryTitle.destroy();
        if (stageName) stageName.destroy();
        if (ratingText) ratingText.destroy();
        if (rewardTexts) rewardTexts.forEach((text: any) => text.destroy());
        if (continueButton) continueButton.destroy();

        this.data.remove('victoryOverlay');
        this.data.remove('victoryTitle');
        this.data.remove('stageName');
        this.data.remove('ratingText');
        this.data.remove('rewardTexts');
        this.data.remove('continueButton');
    }

    /**
     * Clean up defeat screen
     */
    private cleanupDefeatScreen(): void {
        const defeatOverlay = this.data.get('defeatOverlay');
        const defeatTitle = this.data.get('defeatTitle');
        const reasonText = this.data.get('reasonText');
        const retryButton = this.data.get('retryButton');
        const returnButton = this.data.get('returnButton');

        if (defeatOverlay) defeatOverlay.destroy();
        if (defeatTitle) defeatTitle.destroy();
        if (reasonText) reasonText.destroy();
        if (retryButton) retryButton.destroy();
        if (returnButton) returnButton.destroy();

        this.data.remove('defeatOverlay');
        this.data.remove('defeatTitle');
        this.data.remove('reasonText');
        this.data.remove('retryButton');
        this.data.remove('returnButton');
    }

    /**
     * Get color for clear rating
     * @param rating - Clear rating
     * @returns Color string
     */
    private getRatingColor(rating: string): string {
        switch (rating) {
            case 'S':
                return '#FFD700'; // Gold
            case 'A':
                return '#C0C0C0'; // Silver
            case 'B':
                return '#CD7F32'; // Bronze
            case 'C':
                return '#FFFFFF'; // White
            case 'D':
                return '#CCCCCC'; // Gray
            default:
                return '#FFFFFF';
        }
    }

    /**
     * Check stage completion with recruitment
     * Called when all enemies are defeated or converted
     */
    private checkStageCompletionWithRecruitment(): void {
        console.log('GameplayScene: Checking stage completion with recruitment');

        // Trigger victory through victory condition system
        this.handleStageVictory();
    }

    /**
     * Handle stage victory
     */
    private handleStageVictory(): void {
        console.log('GameplayScene: Stage victory detected');
        // Victory will be handled by VictoryConditionSystem auto-detection
    }

    /**
     * Check if a unit is a boss
     * 要件4.1: ボス撃破時の薔薇の力獲得判定
     */
    private isBossUnit(unit: Unit): boolean {
        // Check if unit is a boss based on various criteria

        // Check name for boss indicators
        const name = unit.name.toLowerCase();
        if (name.includes('boss') || name.includes('dragon') || name.includes('lord') || name.includes('king')) {
            return true;
        }

        // Check stats for boss-level power
        if (unit.stats.maxHP > 200) {
            return true;
        }

        // Check metadata for boss flag
        if (unit.metadata && (unit.metadata as any).isBoss) {
            return true;
        }

        return false;
    }
}
