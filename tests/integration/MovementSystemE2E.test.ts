/**
 * Enhanced End-to-End Movement System Tests
 *
 * Comprehensive end-to-end tests covering complete user interaction scenarios
 * Implements requirement 14.2: Add end-to-end tests for user interaction scenarios
 */

import { GameplayScene } from '../../game/src/scenes/GameplayScene';
import { MovementSystem } from '../../game/src/systems/MovementSystem';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import { StageData, Unit, Position } from '../../game/src/types/gameplay';
import { MovementError } from '../../game/src/types/movement';

// Enhanced user interaction simulation
interface UserScenario {
  name: string;
  description: string;
  steps: UserStep[];
  expectedOutcome: ScenarioOutcome;
  timeout?: number;
}

interface UserStep {
  type: 'click' | 'key' | 'hover' | 'drag' | 'wait';
  target?: string | Position;
  key?: string;
  duration?: number;
  expectedResult?: any;
  validation?: (result: any) => boolean;
}

interface ScenarioOutcome {
  success: boolean;
  finalState?: any;
  errors?: string[];
  performance?: {
    totalTime: number;
    averageStepTime: number;
  };
}

class EnhancedUserSimulator {
  private scene: GameplayScene;
  private movementSystem: MovementSystem;
  private gameStateManager: GameStateManager;
  private actionLog: UserAction[] = [];
  private performanceData: PerformanceData[] = [];

  constructor(scene: GameplayScene) {
    this.scene = scene;
    this.movementSystem = scene.getMovementSystem();
    this.gameStateManager = scene.getGameStateManager();
  }

  async executeScenario(scenario: UserScenario): Promise<ScenarioResult> {
    const startTime = performance.now();
    const result: ScenarioResult = {
      scenarioName: scenario.name,
      success: true,
      executedSteps: 0,
      totalSteps: scenario.steps.length,
      errors: [],
      stepResults: [],
      performance: {
        totalTime: 0,
        averageStepTime: 0,
        slowestStep: { index: 0, duration: 0 },
        fastestStep: { index: 0, duration: Infinity },
      },
    };

    try {
      for (let i = 0; i < scenario.steps.length; i++) {
        const step = scenario.steps[i];
        const stepStartTime = performance.now();

        const stepResult = await this.executeStep(step, i);
        const stepDuration = performance.now() - stepStartTime;

        result.stepResults.push(stepResult);
        result.executedSteps++;

        // Track performance
        if (stepDuration > result.performance.slowestStep.duration) {
          result.performance.slowestStep = { index: i, duration: stepDuration };
        }
        if (stepDuration < result.performance.fastestStep.duration) {
          result.performance.fastestStep = { index: i, duration: stepDuration };
        }

        if (!stepResult.success) {
          result.success = false;
          result.errors.push(`Step ${i + 1} failed: ${stepResult.error}`);

          if (step.validation && !step.validation(stepResult)) {
            result.errors.push(`Step ${i + 1} validation failed`);
          }
        }

        // Check timeout
        const elapsedTime = performance.now() - startTime;
        if (scenario.timeout && elapsedTime > scenario.timeout) {
          result.success = false;
          result.errors.push(`Scenario timed out after ${elapsedTime.toFixed(2)}ms`);
          break;
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`Scenario execution failed: ${error}`);
    }

    const totalTime = performance.now() - startTime;
    result.performance.totalTime = totalTime;
    result.performance.averageStepTime = totalTime / result.executedSteps;

    return result;
  }

  private async executeStep(step: UserStep, index: number): Promise<StepResult> {
    const stepResult: StepResult = {
      stepIndex: index,
      stepType: step.type,
      success: true,
      duration: 0,
      result: null,
      error: null,
    };

    const startTime = performance.now();

    try {
      switch (step.type) {
        case 'click':
          stepResult.result = await this.simulateClick(step);
          break;
        case 'key':
          stepResult.result = await this.simulateKeyPress(step);
          break;
        case 'hover':
          stepResult.result = await this.simulateHover(step);
          break;
        case 'drag':
          stepResult.result = await this.simulateDrag(step);
          break;
        case 'wait':
          stepResult.result = await this.simulateWait(step);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      // Validate step result if validation function provided
      if (step.validation && !step.validation(stepResult.result)) {
        stepResult.success = false;
        stepResult.error = 'Step validation failed';
      }
    } catch (error) {
      stepResult.success = false;
      stepResult.error = error instanceof Error ? error.message : 'Unknown error';
    }

    stepResult.duration = performance.now() - startTime;
    return stepResult;
  }

  private async simulateClick(step: UserStep): Promise<ClickResult> {
    if (typeof step.target === 'string') {
      // Click on named target (unit ID)
      const unit = this.findUnitById(step.target);
      if (!unit) {
        throw new Error(`Unit not found: ${step.target}`);
      }

      const result = this.movementSystem.selectCharacterForMovement(unit);
      return {
        type: 'unit_selection',
        target: step.target,
        success: result.valid,
        error: result.error,
        selectedUnit: result.valid ? unit : null,
      };
    } else if (step.target && typeof step.target === 'object') {
      // Click on position
      const position = step.target as Position;
      const selectedUnit = this.movementSystem.getSelectedCharacter();

      if (!selectedUnit) {
        throw new Error('No unit selected for movement');
      }

      const executionResult = await this.movementSystem.executeMovement(selectedUnit, position);
      return {
        type: 'movement_execution',
        target: position,
        success: executionResult.success,
        error: executionResult.error,
        finalPosition: executionResult.finalPosition,
      };
    } else {
      throw new Error('Invalid click target');
    }
  }

  private async simulateKeyPress(step: UserStep): Promise<KeyResult> {
    if (!step.key) {
      throw new Error('No key specified for key press');
    }

    const result = this.movementSystem.handleKeyboardInput(step.key);
    return {
      type: 'keyboard_input',
      key: step.key,
      handled: result.handled,
      action: result.action,
    };
  }

  private async simulateHover(step: UserStep): Promise<HoverResult> {
    if (typeof step.target === 'object') {
      const position = step.target as Position;
      this.movementSystem.showMovementPath(position);

      const state = this.movementSystem.getCurrentState();
      return {
        type: 'hover_preview',
        position,
        pathShown: state.currentPath.length > 0,
        pathLength: state.currentPath.length,
      };
    } else {
      throw new Error('Invalid hover target');
    }
  }

  private async simulateDrag(step: UserStep): Promise<DragResult> {
    // Simulate drag and drop movement
    const selectedUnit = this.movementSystem.getSelectedCharacter();
    if (!selectedUnit) {
      throw new Error('No unit selected for drag operation');
    }

    if (typeof step.target === 'object') {
      const destination = step.target as Position;
      const executionResult = await this.movementSystem.executeMovement(selectedUnit, destination);

      return {
        type: 'drag_movement',
        startPosition: selectedUnit.position,
        endPosition: destination,
        success: executionResult.success,
        error: executionResult.error,
      };
    } else {
      throw new Error('Invalid drag target');
    }
  }

  private async simulateWait(step: UserStep): Promise<WaitResult> {
    const duration = step.duration || 100;
    await new Promise(resolve => setTimeout(resolve, duration));

    return {
      type: 'wait',
      duration,
      completed: true,
    };
  }

  private findUnitById(id: string): Unit | null {
    const stageData = this.scene.getStageData();
    if (!stageData) return null;

    const allUnits = [...stageData.playerUnits, ...stageData.enemyUnits];
    return allUnits.find(unit => unit.id === id) || null;
  }

  getActionLog(): UserAction[] {
    return [...this.actionLog];
  }

  getPerformanceData(): PerformanceData[] {
    return [...this.performanceData];
  }

  reset(): void {
    this.actionLog = [];
    this.performanceData = [];
  }
}

// Result interfaces
interface ScenarioResult {
  scenarioName: string;
  success: boolean;
  executedSteps: number;
  totalSteps: number;
  errors: string[];
  stepResults: StepResult[];
  performance: {
    totalTime: number;
    averageStepTime: number;
    slowestStep: { index: number; duration: number };
    fastestStep: { index: number; duration: number };
  };
}

interface StepResult {
  stepIndex: number;
  stepType: string;
  success: boolean;
  duration: number;
  result: any;
  error: string | null;
}

interface ClickResult {
  type: 'unit_selection' | 'movement_execution';
  target: string | Position;
  success: boolean;
  error?: MovementError;
  selectedUnit?: Unit | null;
  finalPosition?: Position;
}

interface KeyResult {
  type: 'keyboard_input';
  key: string;
  handled: boolean;
  action?: string;
}

interface HoverResult {
  type: 'hover_preview';
  position: Position;
  pathShown: boolean;
  pathLength: number;
}

interface DragResult {
  type: 'drag_movement';
  startPosition: Position;
  endPosition: Position;
  success: boolean;
  error?: MovementError;
}

interface WaitResult {
  type: 'wait';
  duration: number;
  completed: boolean;
}

interface UserAction {
  type: string;
  timestamp: number;
  data: any;
}

interface PerformanceData {
  operation: string;
  duration: number;
  timestamp: number;
}

// Mock comprehensive scene setup
const createComprehensiveTestScene = () => {
  const mockScene = {
    add: {
      text: jest.fn().mockReturnValue({
        setOrigin: jest.fn().mockReturnThis(),
        setScrollFactor: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
        setText: jest.fn().mockReturnThis(),
        setColor: jest.fn().mockReturnThis(),
      }),
      graphics: jest.fn().mockReturnValue({
        fillStyle: jest.fn().mockReturnThis(),
        fillRect: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
        clear: jest.fn().mockReturnThis(),
        lineStyle: jest.fn().mockReturnThis(),
        strokeRect: jest.fn().mockReturnThis(),
      }),
      sprite: jest.fn().mockReturnValue({
        setScale: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        setTint: jest.fn().mockReturnThis(),
        setInteractive: jest.fn().mockReturnThis(),
        on: jest.fn().mockReturnThis(),
        setPosition: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
      }),
      container: jest.fn().mockReturnValue({
        setScrollFactor: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        add: jest.fn().mockReturnThis(),
        setVisible: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
      }),
    },
    cameras: {
      main: {
        width: 1920,
        height: 1080,
        setZoom: jest.fn(),
        setBounds: jest.fn(),
        setScroll: jest.fn(),
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
      },
    },
    input: {
      keyboard: {
        createCursorKeys: jest.fn().mockReturnValue({}),
        addKeys: jest.fn().mockReturnValue({}),
        on: jest.fn(),
        off: jest.fn(),
        once: jest.fn(),
      },
      on: jest.fn(),
      off: jest.fn(),
      activePointer: {
        x: 0,
        y: 0,
        isDown: false,
        button: 0,
        rightButtonDown: jest.fn().mockReturnValue(false),
      },
    },
    load: {
      json: jest.fn(),
      on: jest.fn(),
    },
    cache: {
      json: {
        get: jest.fn().mockReturnValue({
          width: 15,
          height: 12,
          tileSize: 32,
          layers: [
            {
              name: 'background',
              type: 'background',
              data: Array(12)
                .fill(null)
                .map(() => Array(15).fill(1)),
              visible: true,
              opacity: 1.0,
            },
          ],
          playerSpawns: [
            { x: 2, y: 10 },
            { x: 3, y: 10 },
          ],
          enemySpawns: [
            { x: 12, y: 2 },
            { x: 13, y: 2 },
          ],
        }),
      },
    },
    events: {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
    },
    data: {
      set: jest.fn(),
      get: jest.fn(),
      remove: jest.fn(),
    },
    scale: { width: 1920, height: 1080 },
    tweens: { add: jest.fn().mockReturnValue({ stop: jest.fn(), progress: 0 }) },
    make: {
      tilemap: jest.fn().mockReturnValue({
        addTilesetImage: jest.fn().mockReturnValue({}),
        createLayer: jest.fn().mockReturnValue({
          setAlpha: jest.fn(),
          setDepth: jest.fn(),
        }),
        destroy: jest.fn(),
      }),
    },
    textures: { exists: jest.fn().mockReturnValue(false) },

    // Mock methods for enhanced testing
    getMovementSystem: jest.fn(),
    getGameStateManager: jest.fn(),
    getStageData: jest.fn(),
    isSceneInitialized: jest.fn().mockReturnValue(true),
  } as any;

  return mockScene;
};

const createComprehensiveStageData = (): StageData => ({
  id: 'e2e-comprehensive-test',
  name: 'Comprehensive E2E Test Stage',
  description: 'Stage for comprehensive end-to-end testing',
  mapData: {
    width: 15,
    height: 12,
    tileSize: 32,
    layers: [
      {
        name: 'background',
        type: 'background',
        data: Array(12)
          .fill(null)
          .map(() => Array(15).fill(1)),
        visible: true,
        opacity: 1.0,
      },
    ],
    playerSpawns: [
      { x: 2, y: 10 },
      { x: 3, y: 10 },
      { x: 4, y: 10 },
    ],
    enemySpawns: [
      { x: 12, y: 2 },
      { x: 13, y: 2 },
    ],
  },
  playerUnits: [
    {
      id: 'hero-warrior',
      name: 'Hero Warrior',
      position: { x: 2, y: 10 },
      stats: { maxHP: 120, maxMP: 40, attack: 30, defense: 20, speed: 14, movement: 4 },
      currentHP: 120,
      currentMP: 40,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
    },
    {
      id: 'mage-healer',
      name: 'Mage Healer',
      position: { x: 3, y: 10 },
      stats: { maxHP: 80, maxMP: 100, attack: 20, defense: 12, speed: 12, movement: 3 },
      currentHP: 80,
      currentMP: 100,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
    },
    {
      id: 'archer-scout',
      name: 'Archer Scout',
      position: { x: 4, y: 10 },
      stats: { maxHP: 90, maxMP: 60, attack: 25, defense: 15, speed: 16, movement: 5 },
      currentHP: 90,
      currentMP: 60,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
    },
  ],
  enemyUnits: [
    {
      id: 'orc-brute',
      name: 'Orc Brute',
      position: { x: 12, y: 2 },
      stats: { maxHP: 100, maxMP: 20, attack: 28, defense: 18, speed: 8, movement: 3 },
      currentHP: 100,
      currentMP: 20,
      faction: 'enemy',
      hasActed: false,
      hasMoved: false,
    },
    {
      id: 'goblin-shaman',
      name: 'Goblin Shaman',
      position: { x: 13, y: 2 },
      stats: { maxHP: 70, maxMP: 80, attack: 22, defense: 10, speed: 10, movement: 2 },
      currentHP: 70,
      currentMP: 80,
      faction: 'enemy',
      hasActed: false,
      hasMoved: false,
    },
  ],
  victoryConditions: [
    {
      type: 'defeat_all',
      description: 'Defeat all enemy units',
    },
  ],
});

describe('Enhanced Movement System End-to-End Tests', () => {
  let scene: GameplayScene;
  let simulator: EnhancedUserSimulator;
  let stageData: StageData;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockScene = createComprehensiveTestScene();
    stageData = createComprehensiveStageData();

    scene = new GameplayScene();

    // Mock the required methods
    scene.getMovementSystem = jest.fn().mockReturnValue({
      selectCharacterForMovement: jest.fn().mockReturnValue({ valid: true }),
      getSelectedCharacter: jest.fn().mockReturnValue(null),
      executeMovement: jest
        .fn()
        .mockResolvedValue({ success: true, finalPosition: { x: 5, y: 8 } }),
      showMovementPath: jest.fn(),
      cancelMovement: jest.fn(),
      handleKeyboardInput: jest.fn().mockReturnValue({ handled: true, action: 'test' }),
      getCurrentState: jest.fn().mockReturnValue({
        selectedCharacter: null,
        movementMode: 'none',
        movementRange: [],
        currentPath: [],
      }),
    });

    scene.getGameStateManager = jest.fn().mockReturnValue({
      getGameState: jest.fn().mockReturnValue({
        currentTurn: 1,
        activePlayer: 'player',
        phase: 'select',
      }),
      isPlayerTurn: jest.fn().mockReturnValue(true),
    });

    scene.getStageData = jest.fn().mockReturnValue(stageData);

    scene.create({ selectedStage: stageData });
    simulator = new EnhancedUserSimulator(scene);
  });

  describe('Complete Tactical Scenarios', () => {
    test('should execute basic movement scenario successfully', async () => {
      const scenario: UserScenario = {
        name: 'Basic Movement',
        description: 'Select a unit and move it to a new position',
        steps: [
          {
            type: 'click',
            target: 'hero-warrior',
            validation: result => result.success === true,
          },
          {
            type: 'hover',
            target: { x: 5, y: 8 },
            validation: result => result.pathShown === true,
          },
          {
            type: 'click',
            target: { x: 5, y: 8 },
            validation: result => result.success === true,
          },
        ],
        expectedOutcome: {
          success: true,
          finalState: { unitMoved: true, position: { x: 5, y: 8 } },
        },
        timeout: 5000,
      };

      const result = await simulator.executeScenario(scenario);

      expect(result.success).toBe(true);
      expect(result.executedSteps).toBe(3);
      expect(result.errors.length).toBe(0);
      expect(result.performance.totalTime).toBeLessThan(1000);

      console.log(
        `Basic Movement Scenario - Success: ${result.success}, Time: ${result.performance.totalTime.toFixed(2)}ms`
      );
    });

    test('should execute multi-unit coordination scenario', async () => {
      const scenario: UserScenario = {
        name: 'Multi-Unit Coordination',
        description: 'Move multiple units in sequence for tactical positioning',
        steps: [
          // Move warrior forward
          { type: 'click', target: 'hero-warrior' },
          { type: 'click', target: { x: 6, y: 8 } },

          // Move mage to support position
          { type: 'click', target: 'mage-healer' },
          { type: 'click', target: { x: 5, y: 9 } },

          // Move archer to flanking position
          { type: 'click', target: 'archer-scout' },
          { type: 'hover', target: { x: 8, y: 7 } },
          { type: 'click', target: { x: 8, y: 7 } },

          // Verify final positioning
          { type: 'wait', duration: 100 },
        ],
        expectedOutcome: {
          success: true,
          finalState: { allUnitsMoved: true },
        },
        timeout: 10000,
      };

      const result = await simulator.executeScenario(scenario);

      expect(result.success).toBe(true);
      expect(result.executedSteps).toBe(8);
      expect(result.performance.averageStepTime).toBeLessThan(200);

      console.log(
        `Multi-Unit Coordination - Success: ${result.success}, Avg Step Time: ${result.performance.averageStepTime.toFixed(2)}ms`
      );
    });

    test('should handle error recovery scenario', async () => {
      // Mock movement system to simulate errors
      const mockMovementSystem = scene.getMovementSystem();
      mockMovementSystem.executeMovement = jest
        .fn()
        .mockResolvedValueOnce({ success: false, error: MovementError.DESTINATION_UNREACHABLE })
        .mockResolvedValueOnce({ success: true, finalPosition: { x: 4, y: 9 } });

      const scenario: UserScenario = {
        name: 'Error Recovery',
        description: 'Handle movement errors and recover gracefully',
        steps: [
          { type: 'click', target: 'hero-warrior' },
          { type: 'click', target: { x: 14, y: 1 } }, // Invalid move - too far
          { type: 'key', key: 'Escape' }, // Cancel
          { type: 'click', target: 'hero-warrior' }, // Reselect
          { type: 'click', target: { x: 4, y: 9 } }, // Valid move
        ],
        expectedOutcome: {
          success: true,
          finalState: { errorRecovered: true },
        },
        timeout: 5000,
      };

      const result = await simulator.executeScenario(scenario);

      expect(result.success).toBe(true);
      expect(result.stepResults[1].success).toBe(false); // First movement should fail
      expect(result.stepResults[4].success).toBe(true); // Recovery movement should succeed

      console.log(
        `Error Recovery - Success: ${result.success}, Errors Handled: ${result.stepResults.filter(s => !s.success).length}`
      );
    });

    test('should execute keyboard-only navigation scenario', async () => {
      const scenario: UserScenario = {
        name: 'Keyboard Navigation',
        description: 'Complete movement using only keyboard controls',
        steps: [
          { type: 'key', key: 'Tab' }, // Select first unit
          { type: 'key', key: 'ArrowRight' }, // Move cursor right
          { type: 'key', key: 'ArrowRight' }, // Move cursor right again
          { type: 'key', key: 'ArrowDown' }, // Move cursor down
          { type: 'key', key: 'Enter' }, // Confirm movement
          { type: 'key', key: 'Tab' }, // Select next unit
          { type: 'key', key: 'ArrowLeft' }, // Move cursor left
          { type: 'key', key: 'Enter' }, // Confirm movement
        ],
        expectedOutcome: {
          success: true,
          finalState: { keyboardNavigationComplete: true },
        },
        timeout: 3000,
      };

      const result = await simulator.executeScenario(scenario);

      expect(result.success).toBe(true);
      expect(result.stepResults.every(step => step.stepType === 'key')).toBe(true);

      console.log(
        `Keyboard Navigation - Success: ${result.success}, All Steps Keyboard: ${result.stepResults.every(s => s.stepType === 'key')}`
      );
    });

    test('should execute rapid input scenario', async () => {
      const scenario: UserScenario = {
        name: 'Rapid Input',
        description: 'Handle rapid user input without breaking',
        steps: [
          { type: 'click', target: 'hero-warrior' },
          { type: 'hover', target: { x: 3, y: 9 } },
          { type: 'hover', target: { x: 4, y: 9 } },
          { type: 'hover', target: { x: 5, y: 9 } },
          { type: 'hover', target: { x: 6, y: 9 } },
          { type: 'click', target: { x: 5, y: 9 } },
          { type: 'click', target: 'mage-healer' },
          { type: 'click', target: { x: 4, y: 8 } },
        ],
        expectedOutcome: {
          success: true,
          finalState: { rapidInputHandled: true },
        },
        timeout: 2000,
      };

      const result = await simulator.executeScenario(scenario);

      expect(result.success).toBe(true);
      expect(result.performance.totalTime).toBeLessThan(1000);
      expect(result.performance.averageStepTime).toBeLessThan(100);

      console.log(
        `Rapid Input - Success: ${result.success}, Total Time: ${result.performance.totalTime.toFixed(2)}ms`
      );
    });
  });

  describe('Complex Tactical Scenarios', () => {
    test('should execute flanking maneuver scenario', async () => {
      const scenario: UserScenario = {
        name: 'Flanking Maneuver',
        description: 'Execute a coordinated flanking attack',
        steps: [
          // Phase 1: Position main force
          { type: 'click', target: 'hero-warrior' },
          { type: 'click', target: { x: 7, y: 6 } },

          // Phase 2: Move support
          { type: 'click', target: 'mage-healer' },
          { type: 'click', target: { x: 6, y: 7 } },

          // Phase 3: Flanking movement
          { type: 'click', target: 'archer-scout' },
          { type: 'hover', target: { x: 10, y: 4 } }, // Preview flanking position
          { type: 'click', target: { x: 10, y: 4 } },

          // Phase 4: Verify positioning
          { type: 'wait', duration: 200 },
        ],
        expectedOutcome: {
          success: true,
          finalState: { flankingComplete: true },
        },
        timeout: 8000,
      };

      const result = await simulator.executeScenario(scenario);

      expect(result.success).toBe(true);
      expect(result.executedSteps).toBe(8);

      // Verify tactical positioning was achieved
      const hoverSteps = result.stepResults.filter(step => step.stepType === 'hover');
      expect(hoverSteps.length).toBe(1);
      expect(hoverSteps[0].success).toBe(true);

      console.log(
        `Flanking Maneuver - Success: ${result.success}, Tactical Steps: ${result.executedSteps}`
      );
    });

    test('should execute defensive formation scenario', async () => {
      const scenario: UserScenario = {
        name: 'Defensive Formation',
        description: 'Form a defensive line to protect key units',
        steps: [
          // Form defensive line
          { type: 'click', target: 'hero-warrior' },
          { type: 'click', target: { x: 6, y: 6 } }, // Front line

          { type: 'click', target: 'archer-scout' },
          { type: 'click', target: { x: 7, y: 6 } }, // Front line

          { type: 'click', target: 'mage-healer' },
          { type: 'click', target: { x: 6, y: 7 } }, // Back line (protected)

          // Test formation integrity
          { type: 'key', key: 'Tab' }, // Cycle through units to verify positions
          { type: 'key', key: 'Tab' },
          { type: 'key', key: 'Tab' },
        ],
        expectedOutcome: {
          success: true,
          finalState: { defensiveFormation: true },
        },
        timeout: 6000,
      };

      const result = await simulator.executeScenario(scenario);

      expect(result.success).toBe(true);
      expect(result.executedSteps).toBe(9);

      console.log(
        `Defensive Formation - Success: ${result.success}, Formation Steps: ${result.executedSteps}`
      );
    });
  });

  describe('Performance and Stress Testing', () => {
    test('should handle extended gameplay session', async () => {
      const scenario: UserScenario = {
        name: 'Extended Session',
        description: 'Simulate extended gameplay with many actions',
        steps: [],
        expectedOutcome: {
          success: true,
          finalState: { extendedSessionComplete: true },
        },
        timeout: 15000,
      };

      // Generate many movement actions
      const units = ['hero-warrior', 'mage-healer', 'archer-scout'];
      for (let round = 0; round < 5; round++) {
        for (const unit of units) {
          scenario.steps.push(
            { type: 'click', target: unit },
            { type: 'hover', target: { x: 5 + round, y: 8 + round } },
            { type: 'click', target: { x: 5 + round, y: 8 + round } },
            { type: 'wait', duration: 50 }
          );
        }
      }

      const result = await simulator.executeScenario(scenario);

      expect(result.success).toBe(true);
      expect(result.performance.totalTime).toBeLessThan(10000);
      expect(result.performance.averageStepTime).toBeLessThan(50);

      console.log(
        `Extended Session - Success: ${result.success}, Total Actions: ${result.executedSteps}, Avg Time: ${result.performance.averageStepTime.toFixed(2)}ms`
      );
    });

    test('should maintain performance under stress', async () => {
      const scenario: UserScenario = {
        name: 'Stress Test',
        description: 'Rapid-fire actions to test system stability',
        steps: [],
        expectedOutcome: {
          success: true,
          finalState: { stressTestComplete: true },
        },
        timeout: 5000,
      };

      // Generate rapid actions
      for (let i = 0; i < 20; i++) {
        scenario.steps.push(
          { type: 'click', target: 'hero-warrior' },
          { type: 'hover', target: { x: 3 + (i % 3), y: 8 + (i % 3) } },
          { type: 'key', key: 'Escape' }
        );
      }

      const result = await simulator.executeScenario(scenario);

      expect(result.success).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.performance.totalTime).toBeLessThan(3000);

      console.log(
        `Stress Test - Success: ${result.success}, Actions: ${result.executedSteps}, Errors: ${result.errors.length}`
      );
    });
  });

  describe('Accessibility Scenarios', () => {
    test('should support screen reader workflow', async () => {
      const scenario: UserScenario = {
        name: 'Screen Reader Support',
        description: 'Complete movement using screen reader compatible controls',
        steps: [
          { type: 'key', key: 'Tab' }, // Navigate to first unit
          { type: 'key', key: 'Space' }, // Select unit
          { type: 'key', key: 'ArrowRight' }, // Navigate movement options
          { type: 'key', key: 'Enter' }, // Confirm movement
          { type: 'key', key: 'Tab' }, // Navigate to next unit
          { type: 'key', key: 'Space' }, // Select unit
          { type: 'key', key: 'Escape' }, // Cancel selection
        ],
        expectedOutcome: {
          success: true,
          finalState: { screenReaderCompatible: true },
        },
        timeout: 4000,
      };

      const result = await simulator.executeScenario(scenario);

      expect(result.success).toBe(true);
      expect(result.stepResults.every(step => step.stepType === 'key')).toBe(true);

      console.log(
        `Screen Reader Support - Success: ${result.success}, Keyboard Only: ${result.stepResults.every(s => s.stepType === 'key')}`
      );
    });

    test('should support motor accessibility workflow', async () => {
      const scenario: UserScenario = {
        name: 'Motor Accessibility',
        description: 'Complete movement with motor accessibility considerations',
        steps: [
          { type: 'click', target: 'hero-warrior' },
          { type: 'wait', duration: 500 }, // Allow time for users with motor difficulties
          { type: 'hover', target: { x: 5, y: 8 } },
          { type: 'wait', duration: 300 }, // Allow time to review path
          { type: 'click', target: { x: 5, y: 8 } },
          { type: 'wait', duration: 200 }, // Allow time for confirmation
        ],
        expectedOutcome: {
          success: true,
          finalState: { motorAccessible: true },
        },
        timeout: 3000,
      };

      const result = await simulator.executeScenario(scenario);

      expect(result.success).toBe(true);
      expect(result.performance.totalTime).toBeGreaterThan(1000); // Should take time due to waits

      const waitSteps = result.stepResults.filter(step => step.stepType === 'wait');
      expect(waitSteps.length).toBe(3);
      expect(waitSteps.every(step => step.success)).toBe(true);

      console.log(
        `Motor Accessibility - Success: ${result.success}, Wait Steps: ${waitSteps.length}`
      );
    });
  });
});
