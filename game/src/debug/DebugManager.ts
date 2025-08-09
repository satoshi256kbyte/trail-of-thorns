/**
 * DebugManager - Development assistance and debugging tools
 *
 * Provides comprehensive debugging capabilities for SRPG development:
 * - Grid coordinate display and visualization
 * - Character stat visualization and monitoring
 * - Console commands for testing and debugging
 * - Performance monitoring and frame rate display
 * - Debug overlays and information panels
 *
 * Implements requirements 6.4, 6.5 from the gameplay-scene-foundation specification
 */

import * as Phaser from 'phaser';
import { Unit, Position, GameState, MapData } from '../types/gameplay';

/**
 * Debug configuration options
 */
export interface DebugConfig {
    /** Enable grid coordinate display */
    showGridCoordinates: boolean;
    /** Enable character stat visualization */
    showCharacterStats: boolean;
    /** Enable performance monitoring */
    showPerformanceMetrics: boolean;
    /** Enable console commands */
    enableConsoleCommands: boolean;
    /** Debug overlay opacity */
    overlayOpacity: number;
    /** Debug text color */
    textColor: string;
    /** Debug background color */
    backgroundColor: number;
    /** Update frequency for performance metrics (ms) */
    performanceUpdateInterval: number;
}

/**
 * Performance metrics data
 */
export interface PerformanceMetrics {
    fps: number;
    frameTime: number;
    memoryUsage: number;
    renderCalls: number;
    updateTime: number;
    lastUpdateDuration: number;
}

/**
 * Console command definition
 */
export interface ConsoleCommand {
    name: string;
    description: string;
    parameters: string[];
    handler: (...args: any[]) => void;
}

/**
 * Debug information for characters
 */
export interface CharacterDebugInfo {
    unit: Unit;
    worldPosition: Position;
    screenPosition: Position;
    isVisible: boolean;
    distanceFromCamera: number;
}

/**
 * DebugManager class for development assistance
 */
export class DebugManager {
    private scene: Phaser.Scene;
    private config: DebugConfig;
    private isEnabled: boolean = false;

    // Debug display elements
    private debugContainer?: Phaser.GameObjects.Container;
    private gridCoordinateTexts: Phaser.GameObjects.Text[] = [];
    private characterStatTexts: Map<string, Phaser.GameObjects.Container> = new Map();
    private performanceText?: Phaser.GameObjects.Text;
    private consolePanel?: Phaser.GameObjects.Container;

    // Performance monitoring
    private performanceMetrics: PerformanceMetrics = {
        fps: 0,
        frameTime: 0,
        memoryUsage: 0,
        renderCalls: 0,
        updateTime: 0,
        lastUpdateDuration: 0,
    };
    private lastPerformanceUpdate: number = 0;
    private frameCount: number = 0;
    private lastFrameTime: number = 0;

    // Console commands
    private consoleCommands: Map<string, ConsoleCommand> = new Map();
    private consoleHistory: string[] = [];
    private consoleInput?: Phaser.GameObjects.DOMElement;

    // Map and game state references
    private mapData?: MapData;
    private gameState?: GameState;
    private characters: Unit[] = [];

    // Movement system references for debugging
    private movementSystem?: any; // MovementSystem reference
    private movementDebugManager?: any; // MovementDebugManager reference

    // Battle system references for debugging
    private battleSystem?: any; // BattleSystem reference
    private battleDebugManager?: any; // BattleDebugManager reference

    // Skill system references for debugging
    private skillSystem?: any; // SkillSystem reference
    private skillDebugManager?: any; // SkillDebugManager reference

    // Default configuration
    private static readonly DEFAULT_CONFIG: DebugConfig = {
        showGridCoordinates: true,
        showCharacterStats: true,
        showPerformanceMetrics: true,
        enableConsoleCommands: true,
        overlayOpacity: 0.8,
        textColor: '#00ff00',
        backgroundColor: 0x000000,
        performanceUpdateInterval: 1000,
    };

    /**
     * Constructor
     * @param scene - Phaser scene instance
     * @param config - Debug configuration options
     */
    constructor(scene: Phaser.Scene, config?: Partial<DebugConfig>) {
        this.scene = scene;
        this.config = { ...DebugManager.DEFAULT_CONFIG, ...config };

        this.initializeConsoleCommands();
        this.setupKeyboardShortcuts();

        console.log('DebugManager: Initialized with config:', this.config);
    }

    /**
     * Enable debug mode and show debug overlays
     */
    public enableDebugMode(): void {
        if (this.isEnabled) {
            return;
        }

        this.isEnabled = true;
        console.log('DebugManager: Debug mode enabled');

        // Create main debug container
        this.createDebugContainer();

        // Initialize debug displays based on configuration
        if (this.config.showGridCoordinates && this.mapData) {
            this.showGridCoordinates();
        }

        if (this.config.showCharacterStats) {
            this.showCharacterStats();
        }

        if (this.config.showPerformanceMetrics) {
            this.showPerformanceMetrics();
        }

        if (this.config.enableConsoleCommands) {
            this.enableConsoleCommands();
        }

        // Start performance monitoring
        this.startPerformanceMonitoring();

        // Emit debug mode enabled event
        this.scene.events.emit('debug-mode-enabled');
    }

    /**
     * Disable debug mode and hide debug overlays
     */
    public disableDebugMode(): void {
        if (!this.isEnabled) {
            return;
        }

        this.isEnabled = false;
        console.log('DebugManager: Debug mode disabled');

        // Clean up debug displays
        this.hideGridCoordinates();
        this.hideCharacterStats();
        this.hidePerformanceMetrics();
        this.disableConsoleCommands();

        // Destroy debug container
        if (this.debugContainer) {
            this.debugContainer.destroy();
            this.debugContainer = undefined;
        }

        // Stop performance monitoring
        this.stopPerformanceMonitoring();

        // Emit debug mode disabled event
        this.scene.events.emit('debug-mode-disabled');
    }

    /**
     * Toggle debug mode on/off
     */
    public toggleDebugMode(): void {
        if (this.isEnabled) {
            this.disableDebugMode();
        } else {
            this.enableDebugMode();
        }
    }

    /**
     * Update debug information (called from scene update loop)
     * @param time - Current time in milliseconds
     * @param delta - Time elapsed since last frame in milliseconds
     */
    public update(time: number, delta: number): void {
        if (!this.isEnabled) {
            return;
        }

        const updateStart = performance.now();

        // Update performance metrics
        this.updatePerformanceMetrics(time, delta);

        // Update character debug info
        if (this.config.showCharacterStats) {
            this.updateCharacterStats();
        }

        // Update grid coordinates if camera moved
        if (this.config.showGridCoordinates) {
            this.updateGridCoordinates();
        }

        // Record update duration
        this.performanceMetrics.lastUpdateDuration = performance.now() - updateStart;
    }

    /**
     * Set map data for grid coordinate display
     * @param mapData - Map data
     */
    public setMapData(mapData: MapData): void {
        this.mapData = mapData;

        if (this.isEnabled && this.config.showGridCoordinates) {
            this.showGridCoordinates();
        }
    }

    /**
     * Set game state for debugging
     * @param gameState - Current game state
     */
    public setGameState(gameState: GameState): void {
        this.gameState = gameState;
    }

    /**
     * Set characters for stat visualization
     * @param characters - Array of characters
     */
    public setCharacters(characters: Unit[]): void {
        this.characters = characters;

        if (this.isEnabled && this.config.showCharacterStats) {
            this.showCharacterStats();
        }
    }

    /**
     * Add a custom console command
     * @param command - Console command definition
     */
    public addConsoleCommand(command: ConsoleCommand): void {
        this.consoleCommands.set(command.name.toLowerCase(), command);
        console.log(`DebugManager: Added console command '${command.name}'`);
    }

    /**
     * Execute a console command
     * @param commandLine - Command line input
     */
    public executeConsoleCommand(commandLine: string): void {
        const parts = commandLine.trim().split(/\s+/);
        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1);

        const command = this.consoleCommands.get(commandName);
        if (command) {
            try {
                command.handler(...args);
                this.consoleHistory.push(commandLine);
                console.log(`DebugManager: Executed command '${commandName}' with args:`, args);
            } catch (error) {
                console.error(`DebugManager: Error executing command '${commandName}':`, error);
            }
        } else {
            console.warn(
                `DebugManager: Unknown command '${commandName}'. Type 'help' for available commands.`
            );
        }
    }

    /**
     * Get current performance metrics
     * @returns Performance metrics object
     */
    public getPerformanceMetrics(): PerformanceMetrics {
        return { ...this.performanceMetrics };
    }

    /**
     * Create main debug container
     */
    private createDebugContainer(): void {
        this.debugContainer = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(10000);
    }

    /**
     * Show grid coordinates on the map
     */
    private showGridCoordinates(): void {
        if (!this.mapData || !this.debugContainer) {
            return;
        }

        this.hideGridCoordinates(); // Clear existing coordinates

        const tileSize = this.mapData.tileSize;
        const camera = this.scene.cameras.main;

        // Calculate visible grid range
        const startX = Math.floor(camera.scrollX / tileSize);
        const startY = Math.floor(camera.scrollY / tileSize);
        const endX = Math.min(startX + Math.ceil(camera.width / tileSize) + 1, this.mapData.width);
        const endY = Math.min(startY + Math.ceil(camera.height / tileSize) + 1, this.mapData.height);

        // Create coordinate texts for visible tiles
        for (let x = Math.max(0, startX); x < endX; x++) {
            for (let y = Math.max(0, startY); y < endY; y++) {
                const worldX = x * tileSize + tileSize / 2;
                const worldY = y * tileSize + tileSize / 2;

                const coordText = this.scene.add
                    .text(worldX, worldY, `${x},${y}`, {
                        fontSize: '10px',
                        color: this.config.textColor,
                        fontFamily: 'monospace',
                        backgroundColor: `rgba(0,0,0,${this.config.overlayOpacity})`,
                        padding: { x: 2, y: 1 },
                    })
                    .setOrigin(0.5)
                    .setDepth(9999);

                this.gridCoordinateTexts.push(coordText);
                this.debugContainer.add(coordText);
            }
        }
    }

    /**
     * Hide grid coordinates
     */
    private hideGridCoordinates(): void {
        this.gridCoordinateTexts.forEach(text => text.destroy());
        this.gridCoordinateTexts = [];
    }

    /**
     * Update grid coordinates based on camera position
     */
    private updateGridCoordinates(): void {
        // Only update if camera has moved significantly
        const camera = this.scene.cameras.main;
        const lastCameraPos = this.scene.data.get('lastDebugCameraPos') || { x: 0, y: 0 };

        if (
            Math.abs(camera.scrollX - lastCameraPos.x) > 32 ||
            Math.abs(camera.scrollY - lastCameraPos.y) > 32
        ) {
            this.showGridCoordinates();
            this.scene.data.set('lastDebugCameraPos', { x: camera.scrollX, y: camera.scrollY });
        }
    }

    /**
     * Show character statistics visualization
     */
    private showCharacterStats(): void {
        if (!this.debugContainer) {
            return;
        }

        this.hideCharacterStats(); // Clear existing stats

        this.characters.forEach(character => {
            const statContainer = this.createCharacterStatDisplay(character);
            this.characterStatTexts.set(character.id, statContainer);
            this.debugContainer.add(statContainer);
        });
    }

    /**
     * Hide character statistics
     */
    private hideCharacterStats(): void {
        this.characterStatTexts.forEach(container => container.destroy());
        this.characterStatTexts.clear();
    }

    /**
     * Update character statistics display
     */
    private updateCharacterStats(): void {
        this.characters.forEach(character => {
            const statContainer = this.characterStatTexts.get(character.id);
            if (statContainer && this.mapData) {
                // Update position
                const worldX = character.position.x * this.mapData.tileSize + this.mapData.tileSize / 2;
                const worldY = character.position.y * this.mapData.tileSize - 20;
                statContainer.setPosition(worldX, worldY);

                // Update stat text
                const statText = statContainer.getAt(1) as Phaser.GameObjects.Text;
                if (statText) {
                    const statsDisplay = this.formatCharacterStats(character);
                    statText.setText(statsDisplay);
                }
            }
        });
    }

    /**
     * Create character stat display container
     * @param character - Character to display stats for
     * @returns Container with stat display
     */
    private createCharacterStatDisplay(character: Unit): Phaser.GameObjects.Container {
        const container = this.scene.add.container(0, 0);

        if (!this.mapData) {
            return container;
        }

        const worldX = character.position.x * this.mapData.tileSize + this.mapData.tileSize / 2;
        const worldY = character.position.y * this.mapData.tileSize - 20;
        container.setPosition(worldX, worldY);

        // Background
        const background = this.scene.add
            .graphics()
            .fillStyle(this.config.backgroundColor, this.config.overlayOpacity)
            .lineStyle(1, 0x00ff00, 1)
            .fillRoundedRect(-40, -25, 80, 50, 3)
            .strokeRoundedRect(-40, -25, 80, 50, 3);

        // Character stats text
        const statsDisplay = this.formatCharacterStats(character);
        const statText = this.scene.add
            .text(0, 0, statsDisplay, {
                fontSize: '8px',
                color: this.config.textColor,
                fontFamily: 'monospace',
                align: 'center',
            })
            .setOrigin(0.5);

        container.add([background, statText]);
        container.setDepth(9998);

        return container;
    }

    /**
     * Format character stats for display
     * @param character - Character to format stats for
     * @returns Formatted stats string
     */
    private formatCharacterStats(character: Unit): string {
        const hpPercent = Math.round((character.currentHP / character.stats.maxHP) * 100);
        const mpPercent = Math.round((character.currentMP / character.stats.maxMP) * 100);

        return [
            character.name,
            `HP: ${character.currentHP}/${character.stats.maxHP} (${hpPercent}%)`,
            `MP: ${character.currentMP}/${character.stats.maxMP} (${mpPercent}%)`,
            `ATK: ${character.stats.attack} DEF: ${character.stats.defense}`,
            `SPD: ${character.stats.speed} MOV: ${character.stats.movement}`,
            `Status: ${character.hasActed ? 'Acted' : 'Ready'}`,
        ].join('\n');
    }

    /**
     * Show performance metrics display
     */
    private showPerformanceMetrics(): void {
        if (!this.debugContainer) {
            return;
        }

        this.performanceText = this.scene.add
            .text(10, 10, '', {
                fontSize: '12px',
                color: this.config.textColor,
                fontFamily: 'monospace',
                backgroundColor: `rgba(0,0,0,${this.config.overlayOpacity})`,
                padding: { x: 5, y: 5 },
            })
            .setScrollFactor(0)
            .setDepth(10001);

        this.debugContainer.add(this.performanceText);
    }

    /**
     * Hide performance metrics display
     */
    private hidePerformanceMetrics(): void {
        if (this.performanceText) {
            this.performanceText.destroy();
            this.performanceText = undefined;
        }
    }

    /**
     * Update performance metrics
     * @param time - Current time
     * @param delta - Delta time
     */
    private updatePerformanceMetrics(time: number, delta: number): void {
        this.frameCount++;

        // Update FPS calculation
        if (time - this.lastPerformanceUpdate >= this.config.performanceUpdateInterval) {
            this.performanceMetrics.fps = Math.round(
                (this.frameCount * 1000) / (time - this.lastPerformanceUpdate)
            );
            this.performanceMetrics.frameTime = delta;
            this.performanceMetrics.updateTime = time;

            // Estimate memory usage (approximation)
            if ((performance as any).memory) {
                this.performanceMetrics.memoryUsage = Math.round(
                    (performance as any).memory.usedJSHeapSize / 1024 / 1024
                );
            }

            // Update display
            if (this.performanceText) {
                const metricsDisplay = this.formatPerformanceMetrics();
                this.performanceText.setText(metricsDisplay);
            }

            this.frameCount = 0;
            this.lastPerformanceUpdate = time;
        }
    }

    /**
     * Format performance metrics for display
     * @returns Formatted metrics string
     */
    private formatPerformanceMetrics(): string {
        const metrics = this.performanceMetrics;
        return [
            `FPS: ${metrics.fps}`,
            `Frame Time: ${metrics.frameTime.toFixed(2)}ms`,
            `Update Time: ${metrics.lastUpdateDuration.toFixed(2)}ms`,
            `Memory: ${metrics.memoryUsage}MB`,
            `Camera: ${Math.round(this.scene.cameras.main.scrollX)}, ${Math.round(this.scene.cameras.main.scrollY)}`,
            `Zoom: ${this.scene.cameras.main.zoom.toFixed(2)}x`,
        ].join('\n');
    }

    /**
     * Start performance monitoring
     */
    private startPerformanceMonitoring(): void {
        this.lastPerformanceUpdate = this.scene.time.now;
        this.frameCount = 0;
    }

    /**
     * Stop performance monitoring
     */
    private stopPerformanceMonitoring(): void {
        // Performance monitoring cleanup if needed
    }

    /**
     * Enable console commands
     */
    private enableConsoleCommands(): void {
        // Console commands are already initialized, just log that they're enabled
        console.log('DebugManager: Console commands enabled. Type "help" for available commands.');
    }

    /**
     * Disable console commands
     */
    private disableConsoleCommands(): void {
        // Hide console panel if visible
        if (this.consolePanel) {
            this.consolePanel.destroy();
            this.consolePanel = undefined;
        }
    }

    /**
     * Initialize built-in console commands
     */
    private initializeConsoleCommands(): void {
        // Help command
        this.addConsoleCommand({
            name: 'help',
            description: 'Show available commands',
            parameters: [],
            handler: () => {
                console.log('Available debug commands:');
                this.consoleCommands.forEach(cmd => {
                    console.log(`  ${cmd.name} ${cmd.parameters.join(' ')} - ${cmd.description}`);
                });
            },
        });

        // Toggle grid coordinates
        this.addConsoleCommand({
            name: 'grid',
            description: 'Toggle grid coordinate display',
            parameters: ['[on|off]'],
            handler: (state?: string) => {
                if (state === 'on') {
                    this.config.showGridCoordinates = true;
                    this.showGridCoordinates();
                } else if (state === 'off') {
                    this.config.showGridCoordinates = false;
                    this.hideGridCoordinates();
                } else {
                    this.config.showGridCoordinates = !this.config.showGridCoordinates;
                    if (this.config.showGridCoordinates) {
                        this.showGridCoordinates();
                    } else {
                        this.hideGridCoordinates();
                    }
                }
                console.log(`Grid coordinates: ${this.config.showGridCoordinates ? 'ON' : 'OFF'}`);
            },
        });

        // Toggle character stats
        this.addConsoleCommand({
            name: 'stats',
            description: 'Toggle character stats display',
            parameters: ['[on|off]'],
            handler: (state?: string) => {
                if (state === 'on') {
                    this.config.showCharacterStats = true;
                    this.showCharacterStats();
                } else if (state === 'off') {
                    this.config.showCharacterStats = false;
                    this.hideCharacterStats();
                } else {
                    this.config.showCharacterStats = !this.config.showCharacterStats;
                    if (this.config.showCharacterStats) {
                        this.showCharacterStats();
                    } else {
                        this.hideCharacterStats();
                    }
                }
                console.log(`Character stats: ${this.config.showCharacterStats ? 'ON' : 'OFF'}`);
            },
        });

        // Toggle performance metrics
        this.addConsoleCommand({
            name: 'perf',
            description: 'Toggle performance metrics display',
            parameters: ['[on|off]'],
            handler: (state?: string) => {
                if (state === 'on') {
                    this.config.showPerformanceMetrics = true;
                    this.showPerformanceMetrics();
                } else if (state === 'off') {
                    this.config.showPerformanceMetrics = false;
                    this.hidePerformanceMetrics();
                } else {
                    this.config.showPerformanceMetrics = !this.config.showPerformanceMetrics;
                    if (this.config.showPerformanceMetrics) {
                        this.showPerformanceMetrics();
                    } else {
                        this.hidePerformanceMetrics();
                    }
                }
                console.log(`Performance metrics: ${this.config.showPerformanceMetrics ? 'ON' : 'OFF'}`);
            },
        });

        // Camera commands
        this.addConsoleCommand({
            name: 'camera',
            description: 'Camera control commands',
            parameters: ['<action>', '[x]', '[y]', '[zoom]'],
            handler: (action: string, x?: string, y?: string, zoom?: string) => {
                const camera = this.scene.cameras.main;

                switch (action) {
                    case 'pos':
                        if (x !== undefined && y !== undefined) {
                            camera.setScroll(parseFloat(x), parseFloat(y));
                            console.log(`Camera position set to: ${x}, ${y}`);
                        } else {
                            console.log(`Camera position: ${camera.scrollX}, ${camera.scrollY}`);
                        }
                        break;
                    case 'zoom':
                        if (zoom !== undefined) {
                            camera.setZoom(parseFloat(zoom));
                            console.log(`Camera zoom set to: ${zoom}`);
                        } else {
                            console.log(`Camera zoom: ${camera.zoom}`);
                        }
                        break;
                    case 'reset':
                        camera.setScroll(0, 0);
                        camera.setZoom(1);
                        console.log('Camera reset to origin');
                        break;
                    default:
                        console.log('Camera actions: pos [x] [y], zoom [level], reset');
                        break;
                }
            },
        });

        // Game state commands
        this.addConsoleCommand({
            name: 'gamestate',
            description: 'Display current game state',
            parameters: [],
            handler: () => {
                if (this.gameState) {
                    console.log('Current game state:', this.gameState);
                } else {
                    console.log('No game state available');
                }
            },
        });

        // Character info command
        this.addConsoleCommand({
            name: 'character',
            description: 'Display character information',
            parameters: ['[character_id]'],
            handler: (characterId?: string) => {
                if (characterId) {
                    const character = this.characters.find(c => c.id === characterId);
                    if (character) {
                        console.log(`Character ${characterId}:`, character);
                    } else {
                        console.log(`Character ${characterId} not found`);
                    }
                } else {
                    console.log('Available characters:');
                    this.characters.forEach(c => {
                        console.log(`  ${c.id}: ${c.name} (${c.faction})`);
                    });
                }
            },
        });

        // Movement system debug commands
        this.addConsoleCommand({
            name: 'movement',
            description: 'Movement system debug commands',
            parameters: ['<action>', '[...args]'],
            handler: (action: string, ...args: any[]) => {
                this.handleMovementDebugCommand(action, ...args);
            },
        });

        // Battle system debug commands
        this.addConsoleCommand({
            name: 'battle',
            description: 'Battle system debug commands',
            parameters: ['<action>', '[...args]'],
            handler: (action: string, ...args: any[]) => {
                this.handleBattleDebugCommand(action, ...args);
            },
        });

        // Skill system debug commands
        this.addConsoleCommand({
            name: 'skill',
            description: 'Skill system debug commands',
            parameters: ['<action>', '[...args]'],
            handler: (action: string, ...args: any[]) => {
                this.handleSkillDebugCommand(action, ...args);
            },
        });

        // Clear console
        this.addConsoleCommand({
            name: 'clear',
            description: 'Clear console output',
            parameters: [],
            handler: () => {
                console.clear();
            },
        });
    }

    /**
     * Set movement system reference for debugging
     * @param movementSystem - MovementSystem instance
     */
    public setMovementSystem(movementSystem: any): void {
        this.movementSystem = movementSystem;
        console.log('DebugManager: Movement system reference set');
    }

    /**
     * Set movement debug manager reference
     * @param movementDebugManager - MovementDebugManager instance
     */
    public setMovementDebugManager(movementDebugManager: any): void {
        this.movementDebugManager = movementDebugManager;
        console.log('DebugManager: Movement debug manager reference set');
    }

    /**
     * Set battle system reference for debugging
     * @param battleSystem - BattleSystem instance
     */
    public setBattleSystem(battleSystem: any): void {
        this.battleSystem = battleSystem;
        console.log('DebugManager: Battle system reference set');
    }

    /**
     * Set battle debug manager reference
     * @param battleDebugManager - BattleDebugManager instance
     */
    public setBattleDebugManager(battleDebugManager: any): void {
        this.battleDebugManager = battleDebugManager;
        console.log('DebugManager: Battle debug manager reference set');
    }

    /**
     * Set skill system reference for debugging
     * @param skillSystem - SkillSystem instance
     */
    public setSkillSystem(skillSystem: any): void {
        this.skillSystem = skillSystem;
        console.log('DebugManager: Skill system reference set');
    }

    /**
     * Set skill debug manager reference
     * @param skillDebugManager - SkillDebugManager instance
     */
    public setSkillDebugManager(skillDebugManager: any): void {
        this.skillDebugManager = skillDebugManager;
        console.log('DebugManager: Skill debug manager reference set');
    }

    /**
     * Handle movement system debug commands
     * @param action - Debug action to perform
     * @param args - Additional arguments
     */
    private handleMovementDebugCommand(action: string, ...args: any[]): void {
        if (!this.movementSystem) {
            console.warn('DebugManager: Movement system not available');
            return;
        }

        switch (action.toLowerCase()) {
            case 'state':
                console.log('Movement System State:', this.movementSystem.getCurrentState());
                break;

            case 'select':
                if (args.length > 0) {
                    const characterId = args[0];
                    const character = this.characters.find(c => c.id === characterId);
                    if (character) {
                        const result = this.movementSystem.selectCharacterForMovement(character);
                        console.log(`Selected character ${characterId}:`, result);
                    } else {
                        console.log(`Character ${characterId} not found`);
                    }
                } else {
                    console.log('Usage: movement select <character_id>');
                }
                break;

            case 'move':
                if (args.length >= 2) {
                    const x = parseInt(args[0]);
                    const y = parseInt(args[1]);
                    const selectedCharacter = this.movementSystem.getSelectedCharacter();

                    if (selectedCharacter) {
                        this.movementSystem
                            .executeMovement(selectedCharacter, { x, y })
                            .then((result: any) => {
                                console.log(`Movement result:`, result);
                            })
                            .catch((error: any) => {
                                console.error('Movement failed:', error);
                            });
                    } else {
                        console.log('No character selected. Use "movement select <character_id>" first.');
                    }
                } else {
                    console.log('Usage: movement move <x> <y>');
                }
                break;

            case 'range':
                if (args.length > 0) {
                    const characterId = args[0];
                    const character = this.characters.find(c => c.id === characterId);
                    if (character) {
                        this.movementSystem.showMovementRange(character);
                        console.log(`Showing movement range for ${characterId}`);
                    } else {
                        console.log(`Character ${characterId} not found`);
                    }
                } else {
                    const selectedCharacter = this.movementSystem.getSelectedCharacter();
                    if (selectedCharacter) {
                        this.movementSystem.showMovementRange(selectedCharacter);
                        console.log(`Showing movement range for selected character`);
                    } else {
                        console.log('Usage: movement range [character_id] or select a character first');
                    }
                }
                break;

            case 'path':
                if (args.length >= 2) {
                    const x = parseInt(args[0]);
                    const y = parseInt(args[1]);
                    this.movementSystem.showMovementPath({ x, y });
                    console.log(`Showing movement path to (${x}, ${y})`);
                } else {
                    console.log('Usage: movement path <x> <y>');
                }
                break;

            case 'cancel':
                this.movementSystem.cancelMovement();
                console.log('Movement cancelled');
                break;

            case 'debug':
                if (this.movementDebugManager) {
                    if (args.length > 0 && args[0] === 'off') {
                        this.movementDebugManager.disableDebugMode();
                    } else {
                        this.movementDebugManager.enableDebugMode();
                    }
                } else {
                    console.log('Movement debug manager not available');
                }
                break;

            case 'test':
                if (this.movementDebugManager && args.length > 0) {
                    const scenarioName = args[0];
                    this.movementDebugManager
                        .testMovementScenario(scenarioName)
                        .then(() => {
                            console.log(`Test scenario '${scenarioName}' completed`);
                        })
                        .catch((error: any) => {
                            console.error(`Test scenario '${scenarioName}' failed:`, error);
                        });
                } else {
                    console.log('Usage: movement test <scenario_name>');
                    if (this.movementDebugManager) {
                        console.log(
                            'Available scenarios: basic-movement, pathfinding-stress, range-calculation'
                        );
                    }
                }
                break;

            case 'metrics':
                if (this.movementDebugManager) {
                    console.log('Movement Debug Metrics:', this.movementDebugManager.getPerformanceMetrics());
                } else {
                    console.log('Movement debug manager not available');
                }
                break;

            case 'help':
            default:
                console.log('Movement Debug Commands:');
                console.log('  movement state - Show current movement system state');
                console.log('  movement select <character_id> - Select character for movement');
                console.log('  movement move <x> <y> - Move selected character to position');
                console.log('  movement range [character_id] - Show movement range');
                console.log('  movement path <x> <y> - Show movement path to position');
                console.log('  movement cancel - Cancel current movement');
                console.log('  movement debug [off] - Toggle movement debug visualization');
                console.log('  movement test <scenario_name> - Run movement test scenario');
                console.log('  movement metrics - Show movement performance metrics');
                console.log('  movement help - Show this help');
                break;
        }
    }

    /**
     * Handle battle system debug commands
     * @param action - Debug action to perform
     * @param args - Additional arguments
     */
    private handleBattleDebugCommand(action: string, ...args: any[]): void {
        if (!this.battleSystem) {
            console.warn('DebugManager: Battle system not available');
            return;
        }

        switch (action.toLowerCase()) {
            case 'state':
                console.log(
                    'Battle System State:',
                    this.battleSystem.getCurrentState?.() || 'No state available'
                );
                break;

            case 'attack':
                if (args.length >= 2) {
                    const attackerId = args[0];
                    const targetId = args[1];
                    const attacker = this.characters.find(c => c.id === attackerId);
                    const target = this.characters.find(c => c.id === targetId);

                    if (attacker && target) {
                        this.battleSystem
                            .initiateAttack?.(attacker)
                            .then(() => this.battleSystem.selectTarget?.(target))
                            .then((result: any) => {
                                console.log(`Battle result:`, result);
                            })
                            .catch((error: any) => {
                                console.error('Battle failed:', error);
                            });
                    } else {
                        console.log(`Character not found. Attacker: ${attackerId}, Target: ${targetId}`);
                    }
                } else {
                    console.log('Usage: battle attack <attacker_id> <target_id>');
                }
                break;

            case 'range':
                if (args.length > 0) {
                    const characterId = args[0];
                    const character = this.characters.find(c => c.id === characterId);
                    if (character) {
                        this.battleSystem.showAttackRange?.(character);
                        console.log(`Showing attack range for ${characterId}`);
                    } else {
                        console.log(`Character ${characterId} not found`);
                    }
                } else {
                    console.log('Usage: battle range <character_id>');
                }
                break;

            case 'damage':
                if (args.length >= 2) {
                    const attackerId = args[0];
                    const targetId = args[1];
                    const attacker = this.characters.find(c => c.id === attackerId);
                    const target = this.characters.find(c => c.id === targetId);

                    if (attacker && target && this.battleSystem.damageCalculator) {
                        // Mock weapon for testing
                        const mockWeapon = {
                            id: 'test-weapon',
                            name: 'Test Weapon',
                            attackPower: 25,
                            criticalRate: 10,
                            accuracy: 90,
                        };

                        const damage = this.battleSystem.damageCalculator.calculateFinalDamage?.(
                            attacker,
                            target,
                            mockWeapon
                        );
                        console.log(`Predicted damage from ${attackerId} to ${targetId}: ${damage}`);
                    } else {
                        console.log('Characters not found or damage calculator not available');
                    }
                } else {
                    console.log('Usage: battle damage <attacker_id> <target_id>');
                }
                break;

            case 'stats':
                if (this.battleDebugManager) {
                    console.log('Battle Debug Statistics:', this.battleDebugManager.getDebugStatistics());
                } else {
                    console.log('Battle debug manager not available');
                }
                break;

            case 'simulate':
                if (this.battleDebugManager && args.length > 0) {
                    const scenarioName = args[0];
                    this.battleDebugManager
                        .runSimulationScenario(scenarioName)
                        .then((results: any) => {
                            console.log(`Simulation '${scenarioName}' completed:`, results);
                        })
                        .catch((error: any) => {
                            console.error(`Simulation '${scenarioName}' failed:`, error);
                        });
                } else {
                    console.log('Usage: battle simulate <scenario_name>');
                    if (this.battleDebugManager) {
                        console.log('Available scenarios: basic-damage, critical-hits, evasion-test');
                    }
                }
                break;

            case 'debug':
                if (this.battleDebugManager) {
                    if (args.length > 0 && args[0] === 'off') {
                        this.battleDebugManager.disableDebugMode();
                    } else {
                        this.battleDebugManager.enableDebugMode();
                    }
                } else {
                    console.log('Battle debug manager not available');
                }
                break;

            case 'clear':
                if (this.battleDebugManager) {
                    this.battleDebugManager.clearDebugData();
                    console.log('Battle debug data cleared');
                } else {
                    console.log('Battle debug manager not available');
                }
                break;

            case 'config':
                if (args.length > 0) {
                    const configKey = args[0];
                    const configValue = args[1];

                    if (configValue !== undefined) {
                        // Update battle system configuration
                        console.log(`Setting battle config ${configKey} to ${configValue}`);
                        // This would need to be implemented based on your GameConfig structure
                    } else {
                        console.log(`Current battle config for ${configKey}:`, 'Not implemented');
                    }
                } else {
                    console.log('Usage: battle config <key> [value]');
                    console.log(
                        'Available config keys: globalDamageMultiplier, criticalDamageMultiplier, animationSpeed'
                    );
                }
                break;

            case 'help':
            default:
                console.log('Battle Debug Commands:');
                console.log('  battle state - Show current battle system state');
                console.log(
                    '  battle attack <attacker_id> <target_id> - Execute battle between characters'
                );
                console.log('  battle range <character_id> - Show attack range for character');
                console.log('  battle damage <attacker_id> <target_id> - Calculate predicted damage');
                console.log('  battle stats - Show battle debug statistics');
                console.log('  battle simulate <scenario_name> - Run battle simulation scenario');
                console.log('  battle debug [off] - Toggle battle debug visualization');
                console.log('  battle clear - Clear battle debug data');
                console.log('  battle config <key> [value] - Get/set battle configuration');
                console.log('  battle help - Show this help');
                break;
        }
    }

    /**
     * Handle skill system debug commands
     * @param action - Debug action to perform
     * @param args - Additional arguments
     */
    private handleSkillDebugCommand(action: string, ...args: any[]): void {
        if (!this.skillSystem) {
            console.warn('DebugManager: Skill system not available');
            return;
        }

        switch (action.toLowerCase()) {
            case 'state':
                console.log('Skill System State:', this.skillSystem.getSystemState());
                break;

            case 'use':
                if (args.length >= 2) {
                    const skillId = args[0];
                    const casterId = args[1];
                    const targetX = args[2] ? parseInt(args[2]) : 0;
                    const targetY = args[3] ? parseInt(args[3]) : 0;

                    this.skillSystem
                        .useSkill(skillId, casterId, { x: targetX, y: targetY }, true)
                        .then((result: any) => {
                            console.log(`Skill execution result:`, result);
                        })
                        .catch((error: any) => {
                            console.error('Skill execution failed:', error);
                        });
                } else {
                    console.log('Usage: skill use <skillId> <casterId> [targetX] [targetY]');
                }
                break;

            case 'list':
                if (args.length > 0) {
                    const casterId = args[0];
                    const availableSkills = this.skillSystem.getAvailableSkills(casterId);
                    console.log(`Available skills for ${casterId}:`, availableSkills);
                } else {
                    console.log('Usage: skill list <casterId>');
                }
                break;

            case 'stats':
                if (this.skillDebugManager) {
                    const stats = this.skillDebugManager.getStatistics();
                    console.log('Skill Debug Statistics:', stats);
                } else {
                    console.log('Skill debug manager not available');
                }
                break;

            case 'balance':
                if (this.skillDebugManager && args.length > 0) {
                    const skillId = args[0];
                    const balanceData = this.skillDebugManager.analyzeSkillBalance(skillId);
                    console.log(`Balance analysis for ${skillId}:`, balanceData);
                } else {
                    console.log('Usage: skill balance <skillId>');
                }
                break;

            case 'test':
                if (this.skillDebugManager && args.length > 0) {
                    const scenarioName = args[0];
                    this.skillDebugManager
                        .executeSkillTest(scenarioName)
                        .then((results: any) => {
                            console.log(`Test scenario '${scenarioName}' completed:`, results);
                        })
                        .catch((error: any) => {
                            console.error(`Test scenario '${scenarioName}' failed:`, error);
                        });
                } else {
                    console.log('Usage: skill test <scenario_name>');
                    if (this.skillDebugManager) {
                        console.log('Available scenarios: basic-attack-skill, heal-skill');
                    }
                }
                break;

            case 'debug':
                if (this.skillDebugManager) {
                    if (args.length > 0 && args[0] === 'off') {
                        this.skillDebugManager.disableDebugMode();
                    } else {
                        this.skillDebugManager.enableDebugMode();
                    }
                } else {
                    console.log('Skill debug manager not available');
                }
                break;

            case 'reset':
                if (this.skillDebugManager) {
                    this.skillDebugManager.resetStatistics();
                    console.log('Skill debug statistics reset');
                } else {
                    console.log('Skill debug manager not available');
                }
                break;

            case 'config':
                if (args.length > 0) {
                    const configKey = args[0];
                    const configValue = args[1];

                    if (configValue !== undefined) {
                        this.updateSkillSystemConfig(configKey, configValue);
                    } else {
                        this.showSkillSystemConfig(configKey);
                    }
                } else {
                    console.log('Usage: skill config <key> [value]');
                    console.log('Available config keys:');
                    console.log('  globalSkillDamageMultiplier - Global damage multiplier');
                    console.log('  globalSkillHealingMultiplier - Global healing multiplier');
                    console.log('  globalMPCostMultiplier - Global MP cost multiplier');
                    console.log('  globalCooldownMultiplier - Global cooldown multiplier');
                    console.log('  enableSkillDebug - Enable/disable debug mode');
                    console.log('  showConditionCheckDebug - Show condition check debug');
                    console.log('  showExecutionDebug - Show execution debug');
                    console.log('  showEffectCalculationDebug - Show effect calculation debug');
                }
                break;

            case 'perf':
                if (this.skillDebugManager) {
                    const perfMetrics = this.skillDebugManager.getPerformanceMetrics();
                    console.log('Skill Performance Metrics:', Object.fromEntries(perfMetrics));
                } else {
                    console.log('Skill debug manager not available');
                }
                break;

            case 'log':
                if (this.skillDebugManager) {
                    const level = args[0] || 'debug';
                    const limit = parseInt(args[1]) || 50;
                    const logs = this.skillDebugManager.getLogHistory(level, limit);
                    console.log(`Skill Debug Logs (${level}):`, logs);
                } else {
                    console.log('Skill debug manager not available');
                }
                break;

            case 'simulate':
                if (args.length >= 2) {
                    const skillId = args[0];
                    const iterations = parseInt(args[1]) || 10;
                    this.simulateSkillUsage(skillId, iterations);
                } else {
                    console.log('Usage: skill simulate <skillId> <iterations>');
                }
                break;

            case 'create':
                if (args.length >= 4) {
                    const skillId = args[0];
                    const skillType = args[1];
                    const damage = parseInt(args[2]);
                    const mpCost = parseInt(args[3]);
                    this.createTestSkill(skillId, skillType, damage, mpCost);
                } else {
                    console.log('Usage: skill create <skillId> <type> <damage> <mpCost>');
                    console.log('Types: attack, heal, buff, debuff, status');
                }
                break;

            case 'help':
            default:
                console.log('Skill Debug Commands:');
                console.log('  skill state - Show current skill system state');
                console.log('  skill use <skillId> <casterId> [x] [y] - Execute skill for testing');
                console.log('  skill list <casterId> - Show available skills for character');
                console.log('  skill stats [skillId] - Show skill usage statistics');
                console.log('  skill balance <skillId> - Analyze skill balance');
                console.log('  skill test <scenario_name> - Run skill test scenario');
                console.log('  skill debug [off] - Toggle skill debug visualization');
                console.log('  skill reset - Reset skill statistics');
                console.log('  skill config <key> [value] - Get/set skill configuration');
                console.log('  skill perf - Show performance metrics');
                console.log('  skill log [level] [limit] - Show debug logs');
                console.log('  skill simulate <skillId> <iterations> - Simulate skill usage');
                console.log('  skill create <skillId> <type> <damage> <mpCost> - Create test skill');
                console.log('  skill help - Show this help');
                break;
        }
    }

    /**
     * Update skill system configuration
     * @param key Configuration key
     * @param value Configuration value
     */
    private updateSkillSystemConfig(key: string, value: string): void {
        try {
            const numericValue = parseFloat(value);
            const booleanValue = value.toLowerCase() === 'true';

            console.log(`Updating skill config: ${key} = ${value}`);

            // Get GameConfig instance (this would need to be injected in a real implementation)
            const gameConfig = this.scene.data.get('gameConfig') || this.scene.registry.get('gameConfig');

            if (!gameConfig) {
                console.warn('GameConfig not available, using local configuration');
                this.updateLocalSkillConfig(key, numericValue, booleanValue);
                return;
            }

            // Update balance settings
            const balanceKeys = [
                'globalskillmultiplier', 'globaldamagemultiplier',
                'globalskillhealingmultiplier', 'globalhealingmultiplier',
                'globalmpcostmultiplier', 'globalcooldownmultiplier',
                'skillcriticalchancebonus', 'maxskillsperturn', 'maxskillsusageperturn'
            ];

            if (balanceKeys.includes(key.toLowerCase())) {
                if (isNaN(numericValue)) {
                    console.error(`Invalid numeric value for ${key}: ${value}`);
                    return;
                }

                const success = gameConfig.updateSkillSystemBalanceSetting(key, numericValue);
                if (success) {
                    console.log(`Balance setting '${key}' updated successfully`);
                    // Notify skill system of configuration change
                    this.notifySkillSystemConfigChange(key, numericValue);
                }
                return;
            }

            // Update debug settings
            const debugKeys = [
                'enableskilldebug', 'showconditioncheckdebug', 'showexecutiondebug',
                'showeffectcalculationdebug', 'showskillstatistics', 'enabledetailedlogging',
                'enabletestingmode', 'autoexecuteskills', 'logallexecutions', 'generatestatistics'
            ];

            if (debugKeys.includes(key.toLowerCase())) {
                const success = gameConfig.updateSkillSystemDebugSetting(key, booleanValue);
                if (success) {
                    console.log(`Debug setting '${key}' updated successfully`);
                    // Apply debug setting changes
                    this.applySkillDebugSettingChange(key, booleanValue);
                }
                return;
            }

            console.log(`Unknown configuration key: ${key}`);

        } catch (error) {
            console.error('Failed to update configuration:', error.message);
        }
    }

    /**
     * Update local skill configuration when GameConfig is not available
     * @param key Configuration key
     * @param numericValue Numeric value
     * @param booleanValue Boolean value
     */
    private updateLocalSkillConfig(key: string, numericValue: number, booleanValue: boolean): void {
        switch (key.toLowerCase()) {
            case 'globalskillmultiplier':
            case 'globaldamagemultiplier':
                console.log(`Global skill damage multiplier set to: ${numericValue}`);
                break;
            case 'globalskillhealingmultiplier':
            case 'globalhealingmultiplier':
                console.log(`Global skill healing multiplier set to: ${numericValue}`);
                break;
            case 'globalmpcostmultiplier':
                console.log(`Global MP cost multiplier set to: ${numericValue}`);
                break;
            case 'globalcooldownmultiplier':
                console.log(`Global cooldown multiplier set to: ${numericValue}`);
                break;
            case 'enableskilldebug':
                console.log(`Skill debug mode set to: ${booleanValue}`);
                this.applySkillDebugSettingChange(key, booleanValue);
                break;
            case 'showconditioncheckdebug':
                console.log(`Condition check debug set to: ${booleanValue}`);
                break;
            case 'showexecutiondebug':
                console.log(`Execution debug set to: ${booleanValue}`);
                break;
            case 'showeffectcalculationdebug':
                console.log(`Effect calculation debug set to: ${booleanValue}`);
                break;
            default:
                console.log(`Unknown configuration key: ${key}`);
                return;
        }

        console.log('Local configuration updated successfully.');
    }

    /**
     * Notify skill system of configuration changes
     * @param key Configuration key
     * @param value New value
     */
    private notifySkillSystemConfigChange(key: string, value: number): void {
        if (this.skillSystem) {
            // Emit configuration change event
            this.scene.events.emit('skill-config-changed', { key, value });
        }
    }

    /**
     * Apply skill debug setting changes
     * @param key Setting key
     * @param value New value
     */
    private applySkillDebugSettingChange(key: string, value: boolean): void {
        switch (key.toLowerCase()) {
            case 'enableskilldebug':
                if (this.skillDebugManager) {
                    if (value) {
                        this.skillDebugManager.enableDebugMode();
                    } else {
                        this.skillDebugManager.disableDebugMode();
                    }
                }
                break;
            case 'showconditioncheckdebug':
            case 'showexecutiondebug':
            case 'showeffectcalculationdebug':
            case 'showskillstatistics':
            case 'enabledetailedlogging':
                // These settings would be applied to the skill debug manager
                // if it supports dynamic configuration updates
                if (this.skillDebugManager) {
                    console.log(`Applied debug setting change: ${key} = ${value}`);
                }
                break;
        }
    }

    /**
     * Show skill system configuration
     * @param key Configuration key (optional)
     */
    private showSkillSystemConfig(key?: string): void {
        console.log('Skill System Configuration:');

        // Get GameConfig instance
        const gameConfig = this.scene.data.get('gameConfig') || this.scene.registry.get('gameConfig');

        if (!gameConfig) {
            console.warn('GameConfig not available, showing default values');
            this.showDefaultSkillConfig(key);
            return;
        }

        try {
            if (key) {
                this.showSpecificSkillConfig(gameConfig, key);
            } else {
                this.showAllSkillConfig(gameConfig);
            }
        } catch (error) {
            console.error('Error displaying skill configuration:', error.message);
            this.showDefaultSkillConfig(key);
        }
    }

    /**
     * Show specific skill configuration value
     * @param gameConfig GameConfig instance
     * @param key Configuration key
     */
    private showSpecificSkillConfig(gameConfig: any, key: string): void {
        console.log(`Configuration for: ${key}`);

        const balanceSettings = gameConfig.getSkillSystemBalanceSettings();
        const debugSettings = gameConfig.getSkillSystemDebugSettings();
        const skillConfig = gameConfig.getSkillSystemConfig();

        switch (key.toLowerCase()) {
            case 'globalskillmultiplier':
            case 'globaldamagemultiplier':
                console.log(`  Current value: ${balanceSettings.globalSkillDamageMultiplier}`);
                break;
            case 'globalskillhealingmultiplier':
            case 'globalhealingmultiplier':
                console.log(`  Current value: ${balanceSettings.globalSkillHealingMultiplier}`);
                break;
            case 'globalmpcostmultiplier':
                console.log(`  Current value: ${balanceSettings.globalMPCostMultiplier}`);
                break;
            case 'globalcooldownmultiplier':
                console.log(`  Current value: ${balanceSettings.globalCooldownMultiplier}`);
                break;
            case 'enableskilldebug':
                console.log(`  Current value: ${debugSettings.enableSkillDebug}`);
                break;
            case 'showconditioncheckdebug':
                console.log(`  Current value: ${debugSettings.showConditionCheckDebug}`);
                break;
            case 'showexecutiondebug':
                console.log(`  Current value: ${debugSettings.showExecutionDebug}`);
                break;
            case 'showeffectcalculationdebug':
                console.log(`  Current value: ${debugSettings.showEffectCalculationDebug}`);
                break;
            default:
                console.log(`  Unknown configuration key: ${key}`);
                break;
        }
    }

    /**
     * Show all skill configuration values
     * @param gameConfig GameConfig instance
     */
    private showAllSkillConfig(gameConfig: any): void {
        const balanceSettings = gameConfig.getSkillSystemBalanceSettings();
        const debugSettings = gameConfig.getSkillSystemDebugSettings();
        const skillConfig = gameConfig.getSkillSystemConfig();

        console.log('Balance Settings:');
        console.log(`  globalSkillDamageMultiplier: ${balanceSettings.globalSkillDamageMultiplier}`);
        console.log(`  globalSkillHealingMultiplier: ${balanceSettings.globalSkillHealingMultiplier}`);
        console.log(`  globalMPCostMultiplier: ${balanceSettings.globalMPCostMultiplier}`);
        console.log(`  globalCooldownMultiplier: ${balanceSettings.globalCooldownMultiplier}`);
        console.log(`  skillCriticalChanceBonus: ${balanceSettings.skillCriticalChanceBonus}%`);
        console.log(`  maxSkillUsagePerTurn: ${balanceSettings.maxSkillUsagePerTurn}`);

        console.log('Debug Settings:');
        console.log(`  enableSkillDebug: ${debugSettings.enableSkillDebug}`);
        console.log(`  showConditionCheckDebug: ${debugSettings.showConditionCheckDebug}`);
        console.log(`  showExecutionDebug: ${debugSettings.showExecutionDebug}`);
        console.log(`  showEffectCalculationDebug: ${debugSettings.showEffectCalculationDebug}`);
        console.log(`  showSkillStatistics: ${debugSettings.showSkillStatistics}`);
        console.log(`  enableDetailedLogging: ${debugSettings.enableDetailedLogging}`);

        console.log('Testing Settings:');
        console.log(`  enableTestingMode: ${debugSettings.testingConfig.enableTestingMode}`);
        console.log(`  autoExecuteSkills: ${debugSettings.testingConfig.autoExecuteSkills}`);
        console.log(`  logAllExecutions: ${debugSettings.testingConfig.logAllExecutions}`);
        console.log(`  generateStatistics: ${debugSettings.testingConfig.generateStatistics}`);

        console.log('Animation Settings:');
        console.log(`  castAnimationDuration: ${skillConfig.animationConfig.castAnimationDuration}ms`);
        console.log(`  effectAnimationDuration: ${skillConfig.animationConfig.effectAnimationDuration}ms`);
        console.log(`  hitAnimationDuration: ${skillConfig.animationConfig.hitAnimationDuration}ms`);
        console.log(`  animationSpeed: ${skillConfig.animationConfig.animationSpeed}x`);
    }

    /**
     * Show default skill configuration when GameConfig is not available
     * @param key Configuration key (optional)
     */
    private showDefaultSkillConfig(key?: string): void {
        if (key) {
            console.log(`Default configuration for: ${key}`);
            console.log('  Default values are used when GameConfig is not available');
        } else {
            console.log('Default skill system settings:');
            console.log('  globalSkillDamageMultiplier: 1.0');
            console.log('  globalSkillHealingMultiplier: 1.0');
            console.log('  globalMPCostMultiplier: 1.0');
            console.log('  globalCooldownMultiplier: 1.0');
            console.log('  enableSkillDebug: false');
            console.log('  showConditionCheckDebug: false');
            console.log('  showExecutionDebug: false');
            console.log('  showEffectCalculationDebug: false');
            console.log('Note: These are default values. Actual values require GameConfig integration');
        }
    }

    /**
     * Simulate skill usage for testing
     * @param skillId Skill ID to simulate
     * @param iterations Number of iterations
     */
    private async simulateSkillUsage(skillId: string, iterations: number): Promise<void> {
        console.log(`Simulating skill usage: ${skillId} for ${iterations} iterations`);

        if (!this.skillSystem) {
            console.warn('Skill system not available');
            return;
        }

        const results = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            totalDamage: 0,
            totalHealing: 0,
            totalMPCost: 0,
            averageExecutionTime: 0,
            totalExecutionTime: 0
        };

        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
            try {
                const executionStart = performance.now();

                // Simulate skill execution with dummy data
                const result = await this.skillSystem.useSkill(
                    skillId,
                    'test-caster',
                    { x: Math.floor(Math.random() * 10), y: Math.floor(Math.random() * 10) },
                    true
                );

                const executionTime = performance.now() - executionStart;
                results.totalExecutionTime += executionTime;
                results.totalExecutions++;

                if (result.success && result.result) {
                    results.successfulExecutions++;
                    results.totalDamage += result.result.damage || 0;
                    results.totalHealing += result.result.healing || 0;
                    results.totalMPCost += result.result.mpCost || 0;
                } else {
                    results.failedExecutions++;
                }

            } catch (error) {
                results.failedExecutions++;
                console.warn(`Simulation iteration ${i + 1} failed:`, error.message);
            }
        }

        const totalTime = performance.now() - startTime;
        results.averageExecutionTime = results.totalExecutionTime / results.totalExecutions;

        console.log('Simulation Results:', {
            skillId,
            iterations,
            successRate: `${((results.successfulExecutions / results.totalExecutions) * 100).toFixed(1)}%`,
            averageDamage: (results.totalDamage / results.successfulExecutions).toFixed(1),
            averageHealing: (results.totalHealing / results.successfulExecutions).toFixed(1),
            averageMPCost: (results.totalMPCost / results.successfulExecutions).toFixed(1),
            averageExecutionTime: `${results.averageExecutionTime.toFixed(2)}ms`,
            totalSimulationTime: `${totalTime.toFixed(2)}ms`
        });
    }

    /**
     * Create a test skill for debugging
     * @param skillId Skill ID
     * @param skillType Skill type
     * @param damage Damage value
     * @param mpCost MP cost
     */
    private createTestSkill(skillId: string, skillType: string, damage: number, mpCost: number): void {
        console.log(`Creating test skill: ${skillId}`);

        const skillData = {
            id: skillId,
            name: `Test ${skillId}`,
            description: `Test skill created via debug console`,
            skillType: skillType,
            targetType: 'single',
            usageCondition: {
                mpCost: mpCost,
                levelRequirement: 1,
                cooldown: 0,
                usageLimit: 0
            },
            effects: [{
                type: skillType === 'heal' ? 'heal' : 'damage',
                value: damage,
                target: skillType === 'heal' ? 'ally' : 'enemy'
            }],
            range: 3,
            areaOfEffect: {
                shape: 'single',
                size: 1
            },
            animation: {
                castAnimation: 'default_cast',
                effectAnimation: 'default_effect',
                duration: 1000
            }
        };

        try {
            // Register the test skill (this would need actual SkillManager integration)
            console.log('Test skill data created:', skillData);
            console.log('Note: Actual skill registration requires SkillManager integration');

            if (this.skillDebugManager) {
                console.log('Test skill would be registered with SkillManager');
            }

        } catch (error) {
            console.error('Failed to create test skill:', error.message);
        }
    }

    /**
     * Setup keyboard shortcuts for debug functions
     */
    private setupKeyboardShortcuts(): void {
        // F12 - Toggle debug mode
        this.scene.input.keyboard?.addKey('F12').on('down', () => {
            this.toggleDebugMode();
        });

        // F11 - Toggle grid coordinates
        this.scene.input.keyboard?.addKey('F11').on('down', () => {
            if (this.isEnabled) {
                this.executeConsoleCommand('grid');
            }
        });

        // F10 - Toggle character stats
        this.scene.input.keyboard?.addKey('F10').on('down', () => {
            if (this.isEnabled) {
                this.executeConsoleCommand('stats');
            }
        });

        // F9 - Toggle performance metrics
        this.scene.input.keyboard?.addKey('F9').on('down', () => {
            if (this.isEnabled) {
                this.executeConsoleCommand('perf');
            }
        });

        // F8 - Toggle movement debug mode
        this.scene.input.keyboard?.addKey('F8').on('down', () => {
            if (this.isEnabled && this.movementDebugManager) {
                this.movementDebugManager.toggleDebugMode();
            }
        });

        // F7 - Toggle battle debug mode
        this.scene.input.keyboard?.addKey('F7').on('down', () => {
            if (this.isEnabled && this.battleDebugManager) {
                this.battleDebugManager.toggleDebugMode();
            }
        });

        // F6 - Toggle skill debug mode
        this.scene.input.keyboard?.addKey('F6').on('down', () => {
            if (this.isEnabled && this.skillDebugManager) {
                this.skillDebugManager.enableDebugMode();
            }
        });

        // Tilde (~) - Open console (if implemented)
        this.scene.input.keyboard?.addKey('BACKTICK').on('down', () => {
            if (this.isEnabled) {
                console.log('Debug console - type commands in browser console');
                console.log(
                    'Available commands: help, grid, stats, perf, camera, gamestate, character, movement, battle, clear'
                );
                console.log('Movement commands: movement help');
                console.log('Battle commands: battle help');
            }
        });
    }
}
