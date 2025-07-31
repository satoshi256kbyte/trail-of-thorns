import * as Phaser from 'phaser';

/**
 * Transition types available for scene changes
 */
export enum TransitionType {
    FADE = 'fade',
    SLIDE_LEFT = 'slideLeft',
    SLIDE_RIGHT = 'slideRight',
    SLIDE_UP = 'slideUp',
    SLIDE_DOWN = 'slideDown',
    ZOOM_IN = 'zoomIn',
    ZOOM_OUT = 'zoomOut'
}

/**
 * Transition configuration interface
 */
export interface TransitionConfig {
    type: TransitionType;
    duration: number;
    ease?: string;
    color?: number;
    alpha?: number;
}

/**
 * Scene data interface for passing data between scenes
 */
export interface SceneData {
    [key: string]: any;
}

/**
 * SceneTransition utility class
 * Provides smooth transition effects between scenes with data passing capability
 * Implements requirements 4.1, 4.4, 2.2, 2.4 from the title-menu-screen specification
 */
export class SceneTransition {
    private static readonly DEFAULT_DURATION = 500; // 500ms as per requirement 4.4
    private static readonly DEFAULT_COLOR = 0x000000;
    private static readonly DEFAULT_ALPHA = 1;

    /**
     * Default transition configurations for different transition types
     */
    private static readonly DEFAULT_CONFIGS: Record<TransitionType, TransitionConfig> = {
        [TransitionType.FADE]: {
            type: TransitionType.FADE,
            duration: SceneTransition.DEFAULT_DURATION,
            color: SceneTransition.DEFAULT_COLOR,
            alpha: SceneTransition.DEFAULT_ALPHA
        },
        [TransitionType.SLIDE_LEFT]: {
            type: TransitionType.SLIDE_LEFT,
            duration: SceneTransition.DEFAULT_DURATION,
            ease: 'Power2'
        },
        [TransitionType.SLIDE_RIGHT]: {
            type: TransitionType.SLIDE_RIGHT,
            duration: SceneTransition.DEFAULT_DURATION,
            ease: 'Power2'
        },
        [TransitionType.SLIDE_UP]: {
            type: TransitionType.SLIDE_UP,
            duration: SceneTransition.DEFAULT_DURATION,
            ease: 'Power2'
        },
        [TransitionType.SLIDE_DOWN]: {
            type: TransitionType.SLIDE_DOWN,
            duration: SceneTransition.DEFAULT_DURATION,
            ease: 'Power2'
        },
        [TransitionType.ZOOM_IN]: {
            type: TransitionType.ZOOM_IN,
            duration: SceneTransition.DEFAULT_DURATION,
            ease: 'Back.easeIn'
        },
        [TransitionType.ZOOM_OUT]: {
            type: TransitionType.ZOOM_OUT,
            duration: SceneTransition.DEFAULT_DURATION,
            ease: 'Back.easeOut'
        }
    };

    /**
     * Transition to a new scene with specified transition effect
     * @param fromScene - Current scene to transition from
     * @param toSceneKey - Key of the scene to transition to
     * @param transitionType - Type of transition effect to use
     * @param sceneData - Optional data to pass to the new scene
     * @param customConfig - Optional custom transition configuration
     * @returns Promise that resolves when transition is complete
     */
    public static transitionTo(
        fromScene: Phaser.Scene,
        toSceneKey: string,
        transitionType: TransitionType = TransitionType.FADE,
        sceneData?: SceneData,
        customConfig?: Partial<TransitionConfig>
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const config = this.mergeConfig(transitionType, customConfig);

                console.log(`Starting transition from ${fromScene.scene.key} to ${toSceneKey} with ${transitionType}`);

                // Execute the appropriate transition
                switch (config.type) {
                    case TransitionType.FADE:
                        this.executeFadeTransition(fromScene, toSceneKey, config, sceneData, resolve);
                        break;
                    case TransitionType.SLIDE_LEFT:
                    case TransitionType.SLIDE_RIGHT:
                    case TransitionType.SLIDE_UP:
                    case TransitionType.SLIDE_DOWN:
                        this.executeSlideTransition(fromScene, toSceneKey, config, sceneData, resolve);
                        break;
                    case TransitionType.ZOOM_IN:
                    case TransitionType.ZOOM_OUT:
                        this.executeZoomTransition(fromScene, toSceneKey, config, sceneData, resolve);
                        break;
                    default:
                        // Fallback to fade transition
                        this.executeFadeTransition(fromScene, toSceneKey, config, sceneData, resolve);
                        break;
                }
            } catch (error) {
                console.error('Error during scene transition:', error);
                reject(error);
            }
        });
    }

    /**
     * Quick fade transition (most commonly used)
     * @param fromScene - Current scene
     * @param toSceneKey - Target scene key
     * @param sceneData - Optional scene data
     * @param duration - Optional custom duration
     * @returns Promise that resolves when transition is complete
     */
    public static fadeToScene(
        fromScene: Phaser.Scene,
        toSceneKey: string,
        sceneData?: SceneData,
        duration: number = SceneTransition.DEFAULT_DURATION
    ): Promise<void> {
        return this.transitionTo(
            fromScene,
            toSceneKey,
            TransitionType.FADE,
            sceneData,
            { duration }
        );
    }

    /**
     * Merge default configuration with custom configuration
     * @param transitionType - Type of transition
     * @param customConfig - Custom configuration to merge
     * @returns Merged configuration
     */
    private static mergeConfig(
        transitionType: TransitionType,
        customConfig?: Partial<TransitionConfig>
    ): TransitionConfig {
        const defaultConfig = this.DEFAULT_CONFIGS[transitionType];
        return { ...defaultConfig, ...customConfig };
    }

    /**
     * Execute fade transition effect
     * @param fromScene - Current scene
     * @param toSceneKey - Target scene key
     * @param config - Transition configuration
     * @param sceneData - Scene data to pass
     * @param resolve - Promise resolve function
     */
    private static executeFadeTransition(
        fromScene: Phaser.Scene,
        toSceneKey: string,
        config: TransitionConfig,
        sceneData: SceneData | undefined,
        resolve: () => void
    ): void {
        // Start fade out effect
        const color = config.color || SceneTransition.DEFAULT_COLOR;
        fromScene.cameras.main.fadeOut(
            config.duration,
            (color >> 16) & 0xff, // Red component
            (color >> 8) & 0xff,  // Green component
            color & 0xff           // Blue component
        );

        // Handle fade completion
        fromScene.cameras.main.once('camerafadeoutcomplete', () => {
            this.startNewScene(fromScene, toSceneKey, sceneData);
            resolve();
        });
    }

    /**
     * Execute slide transition effect
     * @param fromScene - Current scene
     * @param toSceneKey - Target scene key
     * @param config - Transition configuration
     * @param sceneData - Scene data to pass
     * @param resolve - Promise resolve function
     */
    private static executeSlideTransition(
        fromScene: Phaser.Scene,
        toSceneKey: string,
        config: TransitionConfig,
        sceneData: SceneData | undefined,
        resolve: () => void
    ): void {
        const camera = fromScene.cameras.main;
        const gameWidth = fromScene.game.config.width as number;
        const gameHeight = fromScene.game.config.height as number;

        let targetX = 0;
        let targetY = 0;

        // Determine slide direction
        switch (config.type) {
            case TransitionType.SLIDE_LEFT:
                targetX = -gameWidth;
                break;
            case TransitionType.SLIDE_RIGHT:
                targetX = gameWidth;
                break;
            case TransitionType.SLIDE_UP:
                targetY = -gameHeight;
                break;
            case TransitionType.SLIDE_DOWN:
                targetY = gameHeight;
                break;
        }

        // Create slide animation
        fromScene.tweens.add({
            targets: camera,
            scrollX: targetX,
            scrollY: targetY,
            duration: config.duration,
            ease: config.ease || 'Power2',
            onComplete: () => {
                this.startNewScene(fromScene, toSceneKey, sceneData);
                resolve();
            }
        });
    }

    /**
     * Execute zoom transition effect
     * @param fromScene - Current scene
     * @param toSceneKey - Target scene key
     * @param config - Transition configuration
     * @param sceneData - Scene data to pass
     * @param resolve - Promise resolve function
     */
    private static executeZoomTransition(
        fromScene: Phaser.Scene,
        toSceneKey: string,
        config: TransitionConfig,
        sceneData: SceneData | undefined,
        resolve: () => void
    ): void {
        const camera = fromScene.cameras.main;
        const targetZoom = config.type === TransitionType.ZOOM_IN ? 2 : 0.1;

        // Create zoom animation
        fromScene.tweens.add({
            targets: camera,
            zoom: targetZoom,
            duration: config.duration,
            ease: config.ease || 'Power2',
            onComplete: () => {
                this.startNewScene(fromScene, toSceneKey, sceneData);
                resolve();
            }
        });
    }

    /**
     * Start the new scene with optional data
     * @param fromScene - Current scene
     * @param toSceneKey - Target scene key
     * @param sceneData - Optional data to pass to new scene
     */
    private static startNewScene(
        fromScene: Phaser.Scene,
        toSceneKey: string,
        sceneData?: SceneData
    ): void {
        try {
            if (sceneData) {
                // Pass data to the new scene
                fromScene.scene.start(toSceneKey, sceneData);
            } else {
                // Start scene without data
                fromScene.scene.start(toSceneKey);
            }

            console.log(`Successfully transitioned to ${toSceneKey}${sceneData ? ' with data' : ''}`);
        } catch (error) {
            console.error(`Error starting scene ${toSceneKey}:`, error);
            // Fallback: try to start scene without data
            fromScene.scene.start(toSceneKey);
        }
    }

    /**
     * Create entrance transition for a newly started scene
     * @param scene - Scene that just started
     * @param transitionType - Type of entrance transition
     * @param duration - Duration of entrance transition
     */
    public static createEntranceTransition(
        scene: Phaser.Scene,
        transitionType: TransitionType = TransitionType.FADE,
        duration: number = SceneTransition.DEFAULT_DURATION
    ): void {
        try {
            switch (transitionType) {
                case TransitionType.FADE:
                    scene.cameras.main.fadeIn(duration);
                    break;
                case TransitionType.SLIDE_LEFT:
                    this.createSlideInTransition(scene, duration, 'left');
                    break;
                case TransitionType.SLIDE_RIGHT:
                    this.createSlideInTransition(scene, duration, 'right');
                    break;
                case TransitionType.SLIDE_UP:
                    this.createSlideInTransition(scene, duration, 'up');
                    break;
                case TransitionType.SLIDE_DOWN:
                    this.createSlideInTransition(scene, duration, 'down');
                    break;
                case TransitionType.ZOOM_IN:
                case TransitionType.ZOOM_OUT:
                    this.createZoomInTransition(scene, duration);
                    break;
                default:
                    scene.cameras.main.fadeIn(duration);
                    break;
            }
        } catch (error) {
            console.error('Error creating entrance transition:', error);
            // Fallback to simple fade in
            scene.cameras.main.fadeIn(duration);
        }
    }

    /**
     * Create slide-in transition for scene entrance
     * @param scene - Scene to animate
     * @param duration - Animation duration
     * @param direction - Slide direction
     */
    private static createSlideInTransition(
        scene: Phaser.Scene,
        duration: number,
        direction: 'left' | 'right' | 'up' | 'down'
    ): void {
        const camera = scene.cameras.main;
        const gameWidth = scene.game.config.width as number;
        const gameHeight = scene.game.config.height as number;

        let startX = 0;
        let startY = 0;

        // Set initial camera position based on direction
        switch (direction) {
            case 'left':
                startX = gameWidth;
                break;
            case 'right':
                startX = -gameWidth;
                break;
            case 'up':
                startY = gameHeight;
                break;
            case 'down':
                startY = -gameHeight;
                break;
        }

        // Set initial position
        camera.setScroll(startX, startY);

        // Animate to normal position
        scene.tweens.add({
            targets: camera,
            scrollX: 0,
            scrollY: 0,
            duration: duration,
            ease: 'Power2'
        });
    }

    /**
     * Create zoom-in transition for scene entrance
     * @param scene - Scene to animate
     * @param duration - Animation duration
     */
    private static createZoomInTransition(scene: Phaser.Scene, duration: number): void {
        const camera = scene.cameras.main;

        // Start with small zoom
        camera.setZoom(0.1);

        // Animate to normal zoom
        scene.tweens.add({
            targets: camera,
            zoom: 1,
            duration: duration,
            ease: 'Back.easeOut'
        });
    }

    /**
     * Validate scene key exists in the scene manager
     * @param scene - Current scene
     * @param sceneKey - Scene key to validate
     * @returns True if scene exists, false otherwise
     */
    public static validateSceneKey(scene: Phaser.Scene, sceneKey: string): boolean {
        try {
            return scene.scene.manager.keys.hasOwnProperty(sceneKey);
        } catch (error) {
            console.error('Error validating scene key:', error);
            return false;
        }
    }

    /**
     * Get available scene keys from the scene manager
     * @param scene - Current scene
     * @returns Array of available scene keys
     */
    public static getAvailableScenes(scene: Phaser.Scene): string[] {
        try {
            return Object.keys(scene.scene.manager.keys);
        } catch (error) {
            console.error('Error getting available scenes:', error);
            return [];
        }
    }
}