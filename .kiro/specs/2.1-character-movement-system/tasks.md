# Implementation Plan

- [x] 1. Create core movement data structures and types
  - Define MovementState, TerrainCost, and MovementAnimationConfig interfaces in game/src/types/movement.ts
  - Implement MovementError enum and error handling types
  - Create Position utility functions for grid coordinate operations
  - Write unit tests for type validation and utility functions
  - _Requirements: 1.1, 2.1, 4.1_

- [x] 2. Implement MovementCalculator class for range calculation
  - Create game/src/systems/MovementCalculator.ts with flood-fill algorithm
  - Code calculateMovementRange() method using character movement stats
  - Implement getMovementCost() method with terrain-based cost calculation
  - Add isPositionReachable() method for single position validation
  - Write unit tests for movement range accuracy and terrain cost application
  - _Requirements: 1.1, 1.2, 4.1, 4.2_

- [x] 3. Create PathfindingService with A\* algorithm implementation
  - Implement game/src/systems/PathfindingService.ts with A\* pathfinding
  - Code findPath() method with heuristic distance calculation
  - Add calculatePathCost() method for path validation
  - Implement priority queue and path reconstruction utilities
  - Write unit tests for pathfinding accuracy and optimal path selection
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Build MovementRenderer for visual feedback system
  - Create game/src/rendering/MovementRenderer.ts for movement visualization
  - Implement highlightMovementRange() method with tile color coding
  - Code showMovementPath() method with animated path arrows
  - Add clearHighlights() method for cleanup and state reset
  - Write unit tests for visual feedback accuracy and highlight management
  - _Requirements: 1.1, 1.2, 2.1_

- [x] 5. Implement MovementExecutor for smooth character animation
  - Create game/src/systems/MovementExecutor.ts for movement animation
  - Code animateMovement() method using Phaser tween system
  - Implement character facing direction updates during movement
  - Add movement completion callbacks and state updates
  - Write unit tests for animation timing and character state changes
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 6. Create main MovementSystem controller class
  - Implement game/src/systems/MovementSystem.ts as central coordinator
  - Code selectCharacterForMovement() method with validation
  - Add showMovementRange() and showMovementPath() integration methods
  - Implement executeMovement() method coordinating all subsystems
  - Write unit tests for movement workflow and state management
  - _Requirements: 1.1, 2.1, 3.1, 5.1, 5.2_

- [x] 7. Add movement cancellation and selection management
  - Implement cancelMovement() method in MovementSystem
  - Code character deselection logic with proper cleanup
  - Add character switching functionality for multiple selection
  - Implement right-click cancellation handling
  - Write unit tests for cancellation scenarios and state cleanup
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 8. Integrate movement system with turn-based game state
  - Update GameStateManager to track character movement status
  - Implement canCharacterMove() validation based on turn state
  - Add movement flag updates after successful movement execution
  - Code turn advancement logic when all characters have moved
  - Write unit tests for turn integration and movement state tracking
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 9. Add terrain and collision detection systems
  - Extend MapRenderer to provide terrain cost data for movement
  - Implement unit collision detection in movement calculations
  - Add impassable terrain handling in pathfinding
  - Code occupied tile detection and alternative path finding
  - Write unit tests for collision detection and terrain interaction
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 10. Integrate movement system with GameplayScene
  - Update GameplayScene to initialize and manage MovementSystem
  - Add movement system to input handling pipeline
  - Implement mouse click handling for character selection and movement
  - Code keyboard shortcut support for movement commands
  - Write integration tests for complete movement workflow in gameplay scene
  - _Requirements: 1.1, 2.1, 3.1, 5.1_

- [x] 11. Create comprehensive error handling and user feedback
  - Implement movement validation with detailed error messages
  - Add visual feedback for invalid movement attempts
  - Code error recovery mechanisms for interrupted movements
  - Implement user notifications for movement restrictions
  - Write unit tests for error scenarios and recovery mechanisms
  - _Requirements: 1.4, 4.4, 5.1_

- [x] 12. Add performance optimization and testing
  - Implement movement calculation caching for repeated operations
  - Add performance monitoring for large map movement calculations
  - Code memory management for movement highlights and animations
  - Optimize pathfinding for complex terrain scenarios
  - Write performance tests for movement system scalability
  - _Requirements: 2.2, 3.4_

- [x] 13. Create movement system configuration and debugging tools
  - Add MovementSystem configuration options to GameConfig
  - Implement debug visualization for movement calculations
  - Code development tools for testing movement scenarios
  - Add console commands for movement system debugging
  - Write debugging utilities and development helper functions
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 14. Implement comprehensive testing suite
  - Create integration tests for complete movement workflows
  - Add end-to-end tests for user interaction scenarios
  - Implement visual regression tests for movement feedback
  - Code performance benchmarks for movement calculations
  - Write accessibility tests for movement system interactions
  - _Requirements: All requirements - comprehensive testing coverage_
