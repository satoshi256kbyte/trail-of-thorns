# Movement System Debugging Tools

This directory contains comprehensive debugging and development tools for the movement system. These tools are designed to help developers test, debug, and optimize the movement system during development.

## Overview

The movement system debugging infrastructure consists of four main components:

1. **GameConfig** - Configuration management for movement system settings
2. **MovementDebugManager** - Visual debugging and performance monitoring
3. **MovementConsoleCommands** - Console-based debugging commands
4. **MovementDevelopmentTools** - High-level development workflow tools

## Quick Start

### Enable Debug Mode

```javascript
// Quick enable through development tools
dev.enable();

// Or through movement system
movement.debug.enable();
```

### Basic Debugging Commands

```javascript
// Show help for all available commands
dev.help();
movement.help();

// Visualize movement range for a character
movement.visualize.range('CharacterName');

// Run a test scenario
movement.test.scenario('basic-movement');

// Get performance metrics
movement.info.metrics();
```

## Components

### 1. GameConfig - Movement System Configuration

The `GameConfig` class manages all movement system configuration options.

#### Configuration Options

```typescript
interface MovementSystemConfig {
  // Visual feedback settings
  enableVisualFeedback: boolean;
  enablePathPreview: boolean;
  enableMovementAnimation: boolean;

  // Debug settings
  enableMovementDebug: boolean;
  showMovementRangeDebug: boolean;
  showPathfindingDebug: boolean;
  showMovementCostDebug: boolean;

  // Terrain and animation configuration
  terrainCosts: TerrainCost;
  animationConfig: MovementAnimationConfig;
  debugColors: DebugColors;
}
```

#### Usage

```javascript
// Get current configuration
const config = movement.config.get();

// Update configuration
movement.config.set({
  enableMovementDebug: true,
  showMovementRangeDebug: true,
  showPathfindingDebug: true,
});

// Reset to defaults
movement.config.reset();

// Validate configuration
movement.config.validate();
```

### 2. MovementDebugManager - Visual Debugging

The `MovementDebugManager` provides visual debugging capabilities for movement calculations.

#### Features

- **Movement Range Visualization**: Shows reachable tiles with cost indicators
- **Pathfinding Visualization**: Displays pathfinding algorithm steps
- **Performance Metrics**: Tracks calculation times and memory usage
- **Test Scenarios**: Predefined test cases for common scenarios

#### Usage

```javascript
// Enable debug visualization
movementDebug.enable();

// Visualize movement range
movementDebug.visualizeRange('CharacterName');

// Visualize pathfinding
movementDebug.visualizePath(startX, startY, goalX, goalY);

// Run test scenarios
movementDebug.testScenario('pathfinding-stress');

// Get performance metrics
movementDebug.metrics();
```

#### Available Test Scenarios

- **basic-movement**: Test basic character movement functionality
- **pathfinding-stress**: Test pathfinding performance with obstacles
- **range-calculation**: Test movement range calculation with different movement values

### 3. MovementConsoleCommands - Console Interface

The `MovementConsoleCommands` class provides a comprehensive console interface for debugging.

#### Command Categories

##### Configuration Commands

```javascript
movement.config.get(); // Get current configuration
movement.config.set(config); // Update configuration
movement.config.reset(); // Reset to defaults
movement.config.validate(); // Validate configuration
```

##### Debug Mode Commands

```javascript
movement.debug.enable(); // Enable debug mode
movement.debug.disable(); // Disable debug mode
movement.debug.toggle(); // Toggle debug mode
movement.debug.status(); // Get debug status
```

##### Visualization Commands

```javascript
movement.visualize.range(name); // Visualize movement range
movement.visualize.path(x1, y1, x2, y2); // Visualize pathfinding
movement.visualize.clear(); // Clear visualizations
```

##### Test Commands

```javascript
movement.test.scenario(name); // Run test scenario
movement.test.list(); // List available scenarios
movement.test.custom(config); // Run custom test
movement.test.stress(size, chars, obstacles); // Run stress test
```

##### Character Management

```javascript
movement.character.create(x, y, name, movement); // Create test character
movement.character.list(); // List test characters
movement.character.select(name); // Select character
movement.character.move(name, x, y); // Move character
movement.character.clear(); // Clear all test characters
```

##### Performance Benchmarking

```javascript
movement.benchmark.movement(iterations); // Benchmark movement calculations
movement.benchmark.pathfinding(iterations); // Benchmark pathfinding
movement.benchmark.all(iterations); // Run all benchmarks
```

### 4. MovementDevelopmentTools - Development Workflow

The `MovementDevelopmentTools` class provides high-level development workflow tools.

#### Features

- **Session Management**: Track development session state
- **Automated Testing**: Run comprehensive test suites
- **Performance Monitoring**: Continuous performance tracking
- **Development Reports**: Generate detailed development reports

#### Usage

```javascript
// Quick development commands
dev.enable(); // Enable debug mode
dev.disable(); // Disable debug mode
dev.test(); // Run comprehensive test suite
dev.report(); // Generate development report

// Configuration management
dev.config.get(); // Get development configuration
dev.config.set(config); // Update configuration
dev.config.reset(); // Reset to defaults

// Performance monitoring
dev.monitor.start(); // Start performance monitoring
dev.monitor.stop(); // Stop performance monitoring
dev.monitor.status(); // Get monitoring status

// Session information
dev.session.state(); // Get session state
dev.session.duration(); // Get session duration
```

## Development Workflow

### 1. Initial Setup

```javascript
// Enable debug mode and create test scenario
dev.enable();
dev.scenario.create();
```

### 2. Testing Movement Features

```javascript
// Create test characters
movement.character.create(5, 5, 'TestChar1', 4);
movement.character.create(8, 8, 'TestChar2', 3);

// Test movement range visualization
movement.visualize.range('TestChar1');

// Test pathfinding
movement.visualize.path(5, 5, 15, 15);
```

### 3. Performance Testing

```javascript
// Run stress test
movement.test.stress(30, 10, 20);

// Run benchmarks
movement.benchmark.all(100);

// Monitor performance
dev.monitor.start();
```

### 4. Configuration Testing

```javascript
// Test different configurations
movement.config.set({
  animationConfig: { moveSpeed: 300 },
  terrainCosts: { grass: { movementCost: 0.5, isPassable: true } },
});

// Validate changes
movement.config.validate();
```

### 5. Generate Report

```javascript
// Generate comprehensive development report
dev.report();
```

## Performance Monitoring

The debugging tools include comprehensive performance monitoring:

### Metrics Tracked

- **Range Calculation Time**: Time to calculate movement ranges
- **Pathfinding Time**: Time to find optimal paths
- **Memory Usage**: JavaScript heap usage
- **Frame Rate**: Rendering performance impact

### Accessing Metrics

```javascript
// Get current performance metrics
const metrics = movement.info.metrics();

// Start continuous monitoring
dev.monitor.start();

// View monitoring status
dev.monitor.status();
```

## Error Handling

The debugging tools include comprehensive error handling:

### Configuration Validation

```javascript
// Invalid configuration will be rejected
movement.config.set({
  animationConfig: { moveSpeed: -100 }, // Invalid negative speed
});
// Returns: { success: false, message: "Configuration update failed: Invalid movement animation speed" }
```

### Graceful Degradation

- Debug visualizations fail silently if Phaser objects are unavailable
- Console commands return error messages for invalid operations
- Performance monitoring continues even if some metrics are unavailable

## Integration with Game Systems

The debugging tools are fully integrated with the main game systems:

### GameplayScene Integration

```typescript
// In GameplayScene.ts
this.movementDevTools = MovementDevelopmentTools.getInstance();
this.movementDevTools.initialize(this.movementSystem);
```

### Automatic Initialization

- Development tools auto-initialize in development mode
- Console commands are automatically registered
- Global interfaces are available immediately

## Best Practices

### Development Workflow

1. **Start with debug mode enabled**: `dev.enable()`
2. **Create test scenarios early**: Use predefined scenarios or create custom ones
3. **Monitor performance continuously**: Enable performance monitoring during development
4. **Use visualization tools**: Visual feedback helps identify issues quickly
5. **Run comprehensive tests**: Use `dev.test()` to run full test suite
6. **Generate reports regularly**: Track progress with `dev.report()`

### Performance Optimization

1. **Benchmark regularly**: Use benchmark commands to track performance
2. **Monitor memory usage**: Watch for memory leaks during development
3. **Test with realistic data**: Use stress tests with appropriate map sizes
4. **Profile different configurations**: Test various terrain and animation settings

### Debugging Issues

1. **Use step-by-step visualization**: Enable pathfinding debug to see algorithm steps
2. **Check configuration validity**: Always validate configuration after changes
3. **Monitor error messages**: Console commands provide detailed error information
4. **Use test scenarios**: Reproduce issues with predefined test cases

## Troubleshooting

### Common Issues

#### Debug Mode Not Working

```javascript
// Check if debug mode is enabled
movement.debug.status();

// Force enable debug mode
movement.debug.enable();
```

#### Visualizations Not Showing

```javascript
// Clear and re-enable visualizations
movement.visualize.clear();
movement.debug.enable();
```

#### Performance Issues

```javascript
// Check current metrics
movement.info.metrics();

// Run performance benchmark
movement.benchmark.all(50);
```

#### Configuration Problems

```javascript
// Validate current configuration
movement.config.validate();

// Reset to known good state
movement.config.reset();
```

### Getting Help

```javascript
// Show all available commands
movement.help();
dev.help();

// Get specific command help
movement.test.list(); // List available test scenarios
movement.info.system(); // Show system information
```

## File Structure

```
game/src/debug/
├── README.md                           # This documentation
├── DebugManager.ts                     # General debug manager
├── MovementDebugManager.ts             # Movement-specific debugging
├── MovementConsoleCommands.ts          # Console command interface
├── MovementDevelopmentTools.ts         # High-level development tools
└── tests/
    ├── MovementDebugManager.test.ts
    ├── MovementConsoleCommands.test.ts
    └── MovementSystemDebuggingIntegration.test.ts
```

## Configuration Reference

### Default Configuration

```typescript
const DEFAULT_MOVEMENT_CONFIG = {
  enableVisualFeedback: true,
  enablePathPreview: true,
  enableMovementAnimation: true,
  enableMovementDebug: process.env.NODE_ENV === 'development',
  showMovementRangeDebug: false,
  showPathfindingDebug: false,
  showMovementCostDebug: false,
  terrainCosts: {
    grass: { movementCost: 1, isPassable: true },
    forest: { movementCost: 2, isPassable: true },
    mountain: { movementCost: 3, isPassable: true },
    water: { movementCost: 999, isPassable: false },
    wall: { movementCost: 999, isPassable: false },
    road: { movementCost: 0.5, isPassable: true },
    bridge: { movementCost: 1, isPassable: true },
  },
  animationConfig: {
    moveSpeed: 200,
    turnSpeed: Math.PI * 2,
    easing: 'Power2',
    stepDelay: 100,
  },
  debugColors: {
    movementRange: 0x00ff00,
    pathfinding: 0xff0000,
    movementCost: 0x0000ff,
    blockedTiles: 0xff00ff,
    alternativePaths: 0xffff00,
  },
};
```

This comprehensive debugging infrastructure provides everything needed to develop, test, and optimize the movement system effectively.
