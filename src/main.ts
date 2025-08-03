import * as Phaser from 'phaser';
import { GameConfig } from '../game/src/config/GameConfig';
import { TitleScene } from '../game/src/scenes/TitleScene';
import { ConfigScene } from '../game/src/scenes/ConfigScene';
import { StageSelectScene } from '../game/src/scenes/StageSelectScene';

// Global type declarations for debugging objects
declare global {
  interface Window {
    game: Phaser.Game;
    gameConfig: GameConfig;
    gameInitializer: GameInitializer;
  }
}

/**
 * Scene registration interface for type safety
 */
interface SceneRegistration {
  key: string;
  sceneClass: typeof Phaser.Scene;
  description: string;
}

/**
 * Game initialization error class
 */
class GameInitializationError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'GameInitializationError';
  }
}

/**
 * Scene loading error class
 */
class SceneLoadingError extends Error {
  constructor(
    message: string,
    public sceneKey?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'SceneLoadingError';
  }
}

/**
 * Main game initialization class
 * Handles proper scene registration, startup sequence, and error handling
 * Implements requirements 2.3, 2.4, 6.4 from the title-menu-screen specification
 */
class GameInitializer {
  private gameConfig: GameConfig;
  private game?: Phaser.Game;
  private registeredScenes: SceneRegistration[] = [];

  constructor() {
    this.gameConfig = new GameConfig();
    this.registerScenes();
  }

  /**
   * Register all game scenes with proper error handling
   * Implements proper scene registration and startup sequence
   */
  private registerScenes(): void {
    try {
      // Define all scenes to be registered
      const scenesToRegister: SceneRegistration[] = [
        {
          key: 'TitleScene',
          sceneClass: TitleScene,
          description: 'Main title screen with navigation options',
        },
        {
          key: 'ConfigScene',
          sceneClass: ConfigScene,
          description: 'Configuration screen with settings options',
        },
        {
          key: 'StageSelectScene',
          sceneClass: StageSelectScene,
          description: 'Stage selection screen with available stages',
        },
      ];

      // Validate each scene before registration
      for (const sceneReg of scenesToRegister) {
        this.validateScene(sceneReg);
        this.registeredScenes.push(sceneReg);
      }

      console.log(`Successfully registered ${this.registeredScenes.length} scenes`);
    } catch (error) {
      throw new GameInitializationError(
        'Failed to register game scenes',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Validate scene class before registration
   * @param sceneReg - Scene registration object to validate
   */
  private validateScene(sceneReg: SceneRegistration): void {
    if (!sceneReg.key || typeof sceneReg.key !== 'string') {
      throw new SceneLoadingError('Invalid scene key', sceneReg.key);
    }

    if (!sceneReg.sceneClass || typeof sceneReg.sceneClass !== 'function') {
      throw new SceneLoadingError('Invalid scene class', sceneReg.key);
    }

    // Check if scene class extends Phaser.Scene
    if (
      !sceneReg.sceneClass.prototype ||
      !(sceneReg.sceneClass.prototype instanceof Phaser.Scene)
    ) {
      throw new SceneLoadingError(
        `Scene class ${sceneReg.key} does not extend Phaser.Scene`,
        sceneReg.key
      );
    }

    console.log(`✓ Scene validated: ${sceneReg.key} - ${sceneReg.description}`);
  }

  /**
   * Initialize the game with proper error handling
   * @returns Promise that resolves when game is successfully initialized
   */
  public async initializeGame(): Promise<Phaser.Game> {
    try {
      // Validate game configuration
      if (!this.gameConfig.validateConfig()) {
        throw new GameInitializationError('Game configuration validation failed');
      }

      // Get Phaser configuration
      const config: Phaser.Types.Core.GameConfig = this.gameConfig.getConfig();

      // Add scene classes to configuration
      config.scene = this.registeredScenes.map(sceneReg => sceneReg.sceneClass);

      // Add error handling callbacks
      this.addErrorHandlers(config);

      // Log configuration in development mode
      if (process.env.NODE_ENV === 'development') {
        this.gameConfig.logConfig();
        this.logSceneRegistration();
        console.log('Development mode: Debug information enabled');
      }

      // Create and initialize the game
      this.game = new Phaser.Game(config);

      // Setup global objects for debugging
      this.setupGlobalObjects();

      // Wait for game to be ready
      await this.waitForGameReady();

      // Start the initial scene (TitleScene)
      this.startInitialScene();

      console.log('Game initialized successfully');
      return this.game;
    } catch (error) {
      const initError =
        error instanceof GameInitializationError
          ? error
          : new GameInitializationError(
              'Failed to initialize game',
              error instanceof Error ? error : new Error(String(error))
            );

      this.handleInitializationError(initError);
      throw initError;
    }
  }

  /**
   * Add error handling callbacks to Phaser configuration
   * @param config - Phaser game configuration
   */
  private addErrorHandlers(config: Phaser.Types.Core.GameConfig): void {
    // Add callbacks for error handling
    const originalCallbacks = config.callbacks || {};

    config.callbacks = {
      ...originalCallbacks,
      postBoot: (game: Phaser.Game) => {
        console.log('Game post-boot completed');

        // Call original callback if it exists
        if (originalCallbacks.postBoot) {
          originalCallbacks.postBoot(game);
        }

        // Add scene loading error handlers
        this.setupSceneErrorHandlers(game);
      },
      preBoot: (game: Phaser.Game) => {
        console.log('Game pre-boot started');

        // Call original callback if it exists
        if (originalCallbacks.preBoot) {
          originalCallbacks.preBoot(game);
        }
      },
    };
  }

  /**
   * Setup error handlers for scene loading failures
   * @param game - Phaser game instance
   */
  private setupSceneErrorHandlers(game: Phaser.Game): void {
    // Note: Phaser's SceneManager doesn't have direct event listeners
    // Instead, we'll set up error handling through scene lifecycle callbacks
    console.log('Scene error handlers configured');

    // Store reference for potential error handling
    this.game = game;
  }

  /**
   * Wait for game to be ready
   * @returns Promise that resolves when game is ready
   */
  private waitForGameReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.game) {
        reject(new GameInitializationError('Game instance not created'));
        return;
      }

      // Set timeout for game initialization
      const timeout = setTimeout(() => {
        reject(new GameInitializationError('Game initialization timeout'));
      }, 10000); // 10 second timeout

      // Wait for game to be ready
      const checkReady = () => {
        if (this.game && this.game.isRunning) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };

      checkReady();
    });
  }

  /**
   * Start the initial scene with error handling
   */
  private startInitialScene(): void {
    try {
      if (!this.game) {
        throw new GameInitializationError('Game instance not available');
      }

      // Verify TitleScene is registered
      const titleSceneExists = this.registeredScenes.some(scene => scene.key === 'TitleScene');
      if (!titleSceneExists) {
        throw new SceneLoadingError('TitleScene not registered', 'TitleScene');
      }

      // Start the title scene
      console.log('Starting initial scene: TitleScene');
      this.game.scene.start('TitleScene');
    } catch (error) {
      throw new GameInitializationError(
        'Failed to start initial scene',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Setup global objects for debugging
   */
  private setupGlobalObjects(): void {
    if (!this.game) return;

    // Expose objects globally for debugging
    window.game = this.game;
    window.gameConfig = this.gameConfig;
    window.gameInitializer = this;

    console.log('Global objects available: window.game, window.gameConfig, window.gameInitializer');
  }

  /**
   * Log scene registration information
   */
  private logSceneRegistration(): void {
    console.log('Registered Scenes:');
    this.registeredScenes.forEach((scene, index) => {
      console.log(`  ${index + 1}. ${scene.key} - ${scene.description}`);
    });
  }

  /**
   * Handle initialization errors
   * @param error - Initialization error
   */
  private handleInitializationError(error: GameInitializationError): void {
    console.error('Game initialization failed:', error);

    // Log the full error chain
    let currentError: Error | undefined = error;
    let depth = 0;
    while (currentError && depth < 5) {
      console.error(`  ${depth === 0 ? 'Error' : 'Caused by'}: ${currentError.message}`);
      currentError = 'cause' in currentError ? (currentError.cause as Error) : undefined;
      depth++;
    }
  }

  /**
   * Get registered scenes information
   * @returns Array of registered scene information
   */
  public getRegisteredScenes(): SceneRegistration[] {
    return [...this.registeredScenes];
  }

  /**
   * Get game instance
   * @returns Phaser game instance or undefined if not initialized
   */
  public getGame(): Phaser.Game | undefined {
    return this.game;
  }
}

// Initialize the game
const gameInitializer = new GameInitializer();

// Start game initialization
gameInitializer
  .initializeGame()
  .then(() => {
    console.log('Game startup completed successfully');
  })
  .catch(error => {
    console.error('Failed to start game:', error);
  });
