# Design Document

## Overview

The GameplayScene foundation provides the core infrastructure for SRPG tactical combat. It implements a modular, event-driven architecture that manages the game state, user interface, camera system, and turn-based mechanics. The design follows the Entity-Component-System pattern for flexibility and the Observer pattern for loose coupling between systems.

## Architecture

### Core Components

```
GameplayScene
├── SceneManager (Phaser Scene lifecycle)
├── GameStateManager (Turn management, game state)
├── CameraController (Camera movement and controls)
├── UIManager (Game interface management)
├── InputHandler (User input processing)
├── MapRenderer (Map display and grid system)
└── CharacterManager (Character positioning and selection)
```

### System Communication

The systems communicate through a centralized event system using Phaser's EventEmitter:

```typescript
// Event-driven communication
this.events.emit('turn-changed', { currentPlayer: 'player', turnNumber: 1 });
this.events.emit('character-selected', { character: selectedUnit });
this.events.emit('camera-focus', { position: { x: 100, y: 100 } });
```

## Components and Interfaces

### GameplayScene Class

```typescript
export class GameplayScene extends Phaser.Scene {
  private gameStateManager: GameStateManager;
  private cameraController: CameraController;
  private uiManager: UIManager;
  private inputHandler: InputHandler;
  private mapRenderer: MapRenderer;
  private characterManager: CharacterManager;
  
  constructor() {
    super({ key: 'GameplayScene' });
  }
  
  preload(): void;
  create(): void;
  update(time: number, delta: number): void;
}
```

### GameStateManager

```typescript
interface GameState {
  currentTurn: number;
  activePlayer: 'player' | 'enemy';
  phase: 'select' | 'move' | 'action' | 'enemy';
  selectedUnit?: Unit;
  gameResult?: 'victory' | 'defeat' | null;
}

export class GameStateManager {
  private gameState: GameState;
  private turnOrder: Unit[];
  
  initializeTurnOrder(units: Unit[]): void;
  nextTurn(): void;
  getCurrentPlayer(): 'player' | 'enemy';
  selectUnit(unit: Unit): void;
  checkVictoryConditions(): 'victory' | 'defeat' | null;
}
```

### CameraController

```typescript
export class CameraController {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private mapBounds: Phaser.Geom.Rectangle;
  
  constructor(scene: Phaser.Scene, mapBounds: Phaser.Geom.Rectangle);
  
  moveCamera(direction: 'up' | 'down' | 'left' | 'right'): void;
  focusOnPosition(x: number, y: number): void;
  setZoom(zoomLevel: number): void;
  enableKeyboardControls(): void;
  enableMouseControls(): void;
}
```

### UIManager

```typescript
interface UIElements {
  turnDisplay: Phaser.GameObjects.Text;
  characterInfoPanel: Phaser.GameObjects.Container;
  actionButtons: Phaser.GameObjects.Container;
  pauseButton: Phaser.GameObjects.Image;
}

export class UIManager {
  private scene: Phaser.Scene;
  private uiElements: UIElements;
  
  createUI(): void;
  updateTurnDisplay(turnNumber: number, currentPlayer: string): void;
  showCharacterInfo(character: Unit): void;
  hideCharacterInfo(): void;
  showActionMenu(actions: string[]): void;
}
```

### MapRenderer

```typescript
export class MapRenderer {
  private scene: Phaser.Scene;
  private tileMap: Phaser.Tilemaps.Tilemap;
  private gridOverlay: Phaser.GameObjects.Graphics;
  
  loadMap(mapData: MapData): void;
  renderGrid(): void;
  highlightTiles(positions: Position[], color: number): void;
  clearHighlights(): void;
  getTileAtPosition(x: number, y: number): Phaser.Tilemaps.Tile;
}
```

### CharacterManager

```typescript
export class CharacterManager {
  private characters: Map<string, Unit>;
  private selectedCharacter?: Unit;
  
  loadCharacters(characterData: Unit[]): void;
  selectCharacter(characterId: string): void;
  getCharacterAt(position: Position): Unit | null;
  moveCharacter(characterId: string, newPosition: Position): void;
  updateCharacterDisplay(): void;
}
```

## Data Models

### Core Game Data

```typescript
interface Position {
  x: number;
  y: number;
}

interface Unit {
  id: string;
  name: string;
  position: Position;
  stats: UnitStats;
  currentHP: number;
  currentMP: number;
  faction: 'player' | 'enemy';
  hasActed: boolean;
  hasMoved: boolean;
  sprite: Phaser.GameObjects.Sprite;
}

interface UnitStats {
  maxHP: number;
  maxMP: number;
  attack: number;
  defense: number;
  speed: number;
  movement: number;
}

interface MapData {
  width: number;
  height: number;
  tileSize: number;
  layers: MapLayer[];
  playerSpawns: Position[];
  enemySpawns: Position[];
}

interface StageData {
  id: string;
  name: string;
  mapData: MapData;
  playerUnits: Unit[];
  enemyUnits: Unit[];
  victoryConditions: VictoryCondition[];
}
```

## Error Handling

### Error Types

```typescript
enum GameplayError {
  INVALID_STAGE_DATA = 'INVALID_STAGE_DATA',
  CHARACTER_LOAD_FAILED = 'CHARACTER_LOAD_FAILED',
  MAP_LOAD_FAILED = 'MAP_LOAD_FAILED',
  INVALID_ACTION = 'INVALID_ACTION',
  CAMERA_BOUNDS_ERROR = 'CAMERA_BOUNDS_ERROR'
}

class GameplayErrorHandler {
  static handleError(error: GameplayError, details?: any): void {
    console.error(`Gameplay Error: ${error}`, details);
    
    switch (error) {
      case GameplayError.INVALID_STAGE_DATA:
        // Return to stage selection with error message
        break;
      case GameplayError.CHARACTER_LOAD_FAILED:
        // Show error dialog and retry
        break;
      // ... other error cases
    }
  }
}
```

### Validation

```typescript
class DataValidator {
  static validateStageData(stageData: StageData): boolean {
    return !!(
      stageData.id &&
      stageData.mapData &&
      stageData.playerUnits?.length > 0 &&
      stageData.enemyUnits?.length > 0
    );
  }
  
  static validateMapBounds(position: Position, mapData: MapData): boolean {
    return position.x >= 0 && position.x < mapData.width &&
           position.y >= 0 && position.y < mapData.height;
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
// GameStateManager tests
describe('GameStateManager', () => {
  test('should initialize turn order based on speed', () => {
    // Test turn order calculation
  });
  
  test('should advance turn correctly', () => {
    // Test turn progression
  });
  
  test('should detect victory conditions', () => {
    // Test win/lose detection
  });
});

// CameraController tests
describe('CameraController', () => {
  test('should respect map boundaries', () => {
    // Test camera bounds
  });
  
  test('should focus on target position', () => {
    // Test camera focusing
  });
});
```

### Integration Tests

```typescript
describe('GameplayScene Integration', () => {
  test('should load stage data and initialize properly', () => {
    // Test complete scene initialization
  });
  
  test('should handle character selection and UI updates', () => {
    // Test character interaction flow
  });
  
  test('should manage turn transitions correctly', () => {
    // Test turn-based mechanics
  });
});
```

### Performance Considerations

- **Rendering Optimization**: Only render visible tiles and characters
- **Event Throttling**: Limit camera movement and input processing frequency
- **Memory Management**: Proper cleanup of sprites and event listeners
- **Update Loop Optimization**: Minimize calculations in the update loop

### Debug Features

```typescript
class DebugManager {
  private static instance: DebugManager;
  private debugMode: boolean = false;
  
  enableDebugMode(): void {
    this.debugMode = true;
    this.showGridCoordinates();
    this.showCharacterStats();
    this.enableConsoleCommands();
  }
  
  showGridCoordinates(): void;
  showCharacterStats(): void;
  enableConsoleCommands(): void;
}
```

This design provides a solid foundation for the SRPG gameplay scene while maintaining modularity and extensibility for future features.
