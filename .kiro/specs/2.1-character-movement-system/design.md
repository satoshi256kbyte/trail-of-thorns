# Character Movement System Design

## Overview

The Character Movement System is a core gameplay component that enables tactical unit positioning in the SRPG. It consists of movement range calculation, pathfinding algorithms, visual feedback systems, and smooth movement execution. The system integrates with the existing GameStateManager, MapRenderer, and CharacterManager to provide a seamless turn-based movement experience.

## Architecture

The movement system follows a modular architecture with clear separation of concerns:

```
MovementSystem (Main Controller)
├── MovementCalculator (Range & Cost Calculation)
├── PathfindingService (A* Algorithm Implementation)
├── MovementRenderer (Visual Feedback)
└── MovementExecutor (Animation & State Updates)
```

### Core Components

- **MovementSystem**: Central coordinator managing movement workflow
- **MovementCalculator**: Calculates movement ranges and terrain costs
- **PathfindingService**: Implements A\* pathfinding with terrain awareness
- **MovementRenderer**: Handles visual feedback (highlights, paths, animations)
- **MovementExecutor**: Executes movement with smooth animations

## Components and Interfaces

### MovementSystem Interface

```typescript
interface IMovementSystem {
  selectCharacterForMovement(character: Unit): void;
  showMovementRange(character: Unit): void;
  showMovementPath(destination: Position): void;
  executeMovement(character: Unit, destination: Position): Promise<void>;
  cancelMovement(): void;
  canCharacterMove(character: Unit): boolean;
}
```

### MovementCalculator Interface

```typescript
interface IMovementCalculator {
  calculateMovementRange(character: Unit, map: MapData): Position[];
  getMovementCost(from: Position, to: Position, map: MapData): number;
  isPositionReachable(character: Unit, position: Position, map: MapData): boolean;
}
```

### PathfindingService Interface

```typescript
interface IPathfindingService {
  findPath(start: Position, goal: Position, map: MapData, maxCost: number): Position[];
  calculatePathCost(path: Position[], map: MapData): number;
}
```

### MovementRenderer Interface

```typescript
interface IMovementRenderer {
  highlightMovementRange(positions: Position[], character: Unit): void;
  showMovementPath(path: Position[]): void;
  clearHighlights(): void;
  animateMovement(character: Unit, path: Position[]): Promise<void>;
}
```

## Data Models

### Movement State

```typescript
interface MovementState {
  selectedCharacter: Unit | null;
  movementRange: Position[];
  currentPath: Position[];
  isMoving: boolean;
  movementMode: 'none' | 'selecting' | 'moving';
}
```

### Terrain Cost Configuration

```typescript
interface TerrainCost {
  [terrainType: string]: {
    movementCost: number;
    isPassable: boolean;
  };
}
```

### Movement Animation Config

```typescript
interface MovementAnimationConfig {
  moveSpeed: number; // pixels per second
  turnSpeed: number; // rotation speed
  easing: string; // Phaser easing function
  stepDelay: number; // delay between tile movements
}
```

## Error Handling

### Movement Validation Errors

```typescript
enum MovementError {
  CHARACTER_ALREADY_MOVED = 'CHARACTER_ALREADY_MOVED',
  DESTINATION_UNREACHABLE = 'DESTINATION_UNREACHABLE',
  DESTINATION_OCCUPIED = 'DESTINATION_OCCUPIED',
  INSUFFICIENT_MOVEMENT_POINTS = 'INSUFFICIENT_MOVEMENT_POINTS',
  INVALID_CHARACTER_SELECTION = 'INVALID_CHARACTER_SELECTION',
  MOVEMENT_IN_PROGRESS = 'MOVEMENT_IN_PROGRESS',
}
```

### Error Recovery Strategies

- **Invalid Selection**: Clear selection and show user feedback
- **Unreachable Destination**: Highlight valid alternatives
- **Movement Blocked**: Recalculate path or show error message
- **Animation Interruption**: Complete current movement before allowing new actions

## Testing Strategy

### Unit Tests

- **MovementCalculator**: Range calculation accuracy, terrain cost application
- **PathfindingService**: A\* algorithm correctness, optimal path finding
- **MovementSystem**: State management, validation logic
- **MovementRenderer**: Visual feedback accuracy, animation timing

### Integration Tests

- **Movement Flow**: Complete movement from selection to execution
- **Turn Integration**: Movement state changes with turn progression
- **Map Integration**: Movement with various map configurations
- **Character Integration**: Movement with different character stats

### Performance Tests

- **Large Maps**: Movement calculation performance on 50x50+ grids
- **Complex Pathfinding**: Performance with multiple obstacles
- **Animation Smoothness**: 60fps maintenance during movement
- **Memory Usage**: No memory leaks during repeated movements

## Implementation Details

### Movement Range Calculation Algorithm

```typescript
// Flood-fill algorithm for movement range
function calculateMovementRange(character: Unit, map: MapData): Position[] {
  const visited = new Set<string>();
  const queue: Array<{ pos: Position; cost: number }> = [];
  const reachable: Position[] = [];

  queue.push({ pos: character.position, cost: 0 });

  while (queue.length > 0) {
    const { pos, cost } = queue.shift()!;
    const key = `${pos.x},${pos.y}`;

    if (visited.has(key)) continue;
    visited.add(key);

    if (cost <= character.stats.movement) {
      reachable.push(pos);

      // Add adjacent tiles to queue
      for (const neighbor of getAdjacentPositions(pos)) {
        if (isValidPosition(neighbor, map)) {
          const moveCost = getMovementCost(pos, neighbor, map);
          queue.push({ pos: neighbor, cost: cost + moveCost });
        }
      }
    }
  }

  return reachable;
}
```

### A\* Pathfinding Implementation

```typescript
function findPath(start: Position, goal: Position, map: MapData, maxCost: number): Position[] {
  const openSet = new PriorityQueue<PathNode>();
  const closedSet = new Set<string>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const cameFrom = new Map<string, Position>();

  const startKey = positionToKey(start);
  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(start, goal));
  openSet.enqueue({ position: start, fScore: fScore.get(startKey)! });

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue()!;
    const currentKey = positionToKey(current.position);

    if (positionsEqual(current.position, goal)) {
      return reconstructPath(cameFrom, current.position);
    }

    closedSet.add(currentKey);

    for (const neighbor of getAdjacentPositions(current.position)) {
      const neighborKey = positionToKey(neighbor);

      if (closedSet.has(neighborKey) || !isValidPosition(neighbor, map)) {
        continue;
      }

      const tentativeGScore = gScore.get(currentKey)! + getMovementCost(current.position, neighbor, map);

      if (tentativeGScore > maxCost) continue;

      if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)!) {
        cameFrom.set(neighborKey, current.position);
        gScore.set(neighborKey, tentativeGScore);
        fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, goal));

        if (!openSet.contains(neighbor)) {
          openSet.enqueue({ position: neighbor, fScore: fScore.get(neighborKey)! });
        }
      }
    }
  }

  return []; // No path found
}
```

### Visual Feedback System

The movement renderer uses different visual indicators:

- **Movement Range**: Semi-transparent blue overlay on reachable tiles
- **Movement Path**: Animated arrow sprites showing the route
- **Invalid Areas**: Red tint on unreachable or occupied tiles
- **Character Selection**: Pulsing outline around selected character

### Animation System

Movement animations use Phaser's tween system for smooth interpolation:

```typescript
async function animateMovement(character: Unit, path: Position[]): Promise<void> {
  for (let i = 1; i < path.length; i++) {
    const targetPos = path[i];
    const worldPos = gridToWorldPosition(targetPos);

    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: character.sprite,
        x: worldPos.x,
        y: worldPos.y,
        duration: this.config.moveSpeed,
        ease: this.config.easing,
        onComplete: resolve,
      });
    });

    // Update character facing direction
    const direction = getDirection(path[i - 1], targetPos);
    character.setFacing(direction);
  }
}
```

## Integration Points

### GameStateManager Integration

- Movement system checks turn state before allowing movement
- Updates character movement flags after successful movement
- Triggers turn advancement when all characters have moved

### MapRenderer Integration

- Uses existing tile highlighting system for movement feedback
- Integrates with grid coordinate conversion functions
- Respects map boundaries and terrain data

### CharacterManager Integration

- Accesses character stats for movement calculation
- Updates character positions after movement
- Manages character selection state

### InputHandler Integration

- Processes mouse clicks for character selection and movement
- Handles right-click for movement cancellation
- Manages keyboard shortcuts for movement commands
