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

    // Tilde (~) - Open console (if implemented)
    this.scene.input.keyboard?.addKey('BACKTICK').on('down', () => {
      if (this.isEnabled) {
        console.log('Debug console - type commands in browser console');
        console.log(
          'Available commands: help, grid, stats, perf, camera, gamestate, character, movement, clear'
        );
        console.log('Movement commands: movement help');
      }
    });
  }
}
