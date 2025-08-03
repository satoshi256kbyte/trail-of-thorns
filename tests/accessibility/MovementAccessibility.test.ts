/**
 * Movement System Accessibility Tests
 *
 * Tests accessibility features and compliance for movement system interactions
 * Implements requirement 14.5: Write accessibility tests for movement system interactions
 */

import { MovementSystem } from '../../game/src/systems/MovementSystem';
import { Unit, Position, MapData } from '../../game/src/types/gameplay';
import { MovementError } from '../../game/src/types/movement';

// Accessibility testing utilities
interface AccessibilityFeature {
  name: string;
  type: 'keyboard' | 'screen-reader' | 'visual' | 'audio' | 'motor';
  isRequired: boolean;
  isImplemented: boolean;
  testResult?: AccessibilityTestResult;
}

interface AccessibilityTestResult {
  passed: boolean;
  score: number; // 0-100
  issues: AccessibilityIssue[];
  recommendations: string[];
}

interface AccessibilityIssue {
  severity: 'critical' | 'major' | 'minor';
  category: 'keyboard' | 'screen-reader' | 'visual' | 'audio' | 'motor';
  description: string;
  element?: string;
  wcagGuideline?: string;
}

class AccessibilityTester {
  private features: Map<string, AccessibilityFeature> = new Map();
  private testResults: AccessibilityTestResult[] = [];

  registerFeature(feature: AccessibilityFeature): void {
    this.features.set(feature.name, feature);
  }

  testKeyboardNavigation(movementSystem: MovementSystem, units: Unit[]): AccessibilityTestResult {
    const issues: AccessibilityIssue[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Test Tab navigation through units
    try {
      let currentIndex = 0;
      const maxIterations = units.length * 2; // Prevent infinite loops
      let iterations = 0;

      while (iterations < maxIterations) {
        const result = movementSystem.selectNextCharacterWithKeyboard();

        if (!result.success) {
          issues.push({
            severity: 'major',
            category: 'keyboard',
            description: 'Tab navigation failed to cycle through units',
            wcagGuideline: 'WCAG 2.1.1 (Keyboard)',
          });
          score -= 20;
          break;
        }

        currentIndex = (currentIndex + 1) % units.length;
        iterations++;

        if (iterations >= units.length && currentIndex === 0) {
          break; // Successfully cycled through all units
        }
      }

      if (iterations >= maxIterations) {
        issues.push({
          severity: 'critical',
          category: 'keyboard',
          description: 'Tab navigation appears to be stuck in infinite loop',
          wcagGuideline: 'WCAG 2.1.1 (Keyboard)',
        });
        score -= 40;
      }
    } catch (error) {
      issues.push({
        severity: 'critical',
        category: 'keyboard',
        description: `Keyboard navigation threw error: ${error}`,
        wcagGuideline: 'WCAG 2.1.1 (Keyboard)',
      });
      score -= 50;
    }

    // Test arrow key movement
    try {
      const testUnit = units[0];
      movementSystem.selectCharacterForMovement(testUnit);

      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      for (const key of arrowKeys) {
        const result = movementSystem.handleKeyboardInput(key);

        if (!result.handled) {
          issues.push({
            severity: 'major',
            category: 'keyboard',
            description: `Arrow key ${key} not handled for movement preview`,
            wcagGuideline: 'WCAG 2.1.1 (Keyboard)',
          });
          score -= 10;
        }
      }
    } catch (error) {
      issues.push({
        severity: 'major',
        category: 'keyboard',
        description: `Arrow key handling failed: ${error}`,
        wcagGuideline: 'WCAG 2.1.1 (Keyboard)',
      });
      score -= 20;
    }

    // Test Enter key for movement execution
    try {
      const testUnit = units[0];
      movementSystem.selectCharacterForMovement(testUnit);
      movementSystem.setKeyboardCursor({ x: testUnit.position.x + 1, y: testUnit.position.y });

      const result = movementSystem.handleKeyboardInput('Enter');

      if (!result.handled) {
        issues.push({
          severity: 'major',
          category: 'keyboard',
          description: 'Enter key not handled for movement execution',
          wcagGuideline: 'WCAG 2.1.1 (Keyboard)',
        });
        score -= 15;
      }
    } catch (error) {
      issues.push({
        severity: 'major',
        category: 'keyboard',
        description: `Enter key handling failed: ${error}`,
        wcagGuideline: 'WCAG 2.1.1 (Keyboard)',
      });
      score -= 15;
    }

    // Test Escape key for cancellation
    try {
      const testUnit = units[0];
      movementSystem.selectCharacterForMovement(testUnit);

      const result = movementSystem.handleKeyboardInput('Escape');

      if (!result.handled) {
        issues.push({
          severity: 'minor',
          category: 'keyboard',
          description: 'Escape key not handled for movement cancellation',
          wcagGuideline: 'WCAG 2.1.1 (Keyboard)',
        });
        score -= 5;
      } else if (movementSystem.getSelectedCharacter() !== null) {
        issues.push({
          severity: 'major',
          category: 'keyboard',
          description: 'Escape key did not properly cancel movement selection',
          wcagGuideline: 'WCAG 2.1.1 (Keyboard)',
        });
        score -= 15;
      }
    } catch (error) {
      issues.push({
        severity: 'major',
        category: 'keyboard',
        description: `Escape key handling failed: ${error}`,
        wcagGuideline: 'WCAG 2.1.1 (Keyboard)',
      });
      score -= 15;
    }

    if (issues.length === 0) {
      recommendations.push('Keyboard navigation is working well');
    } else {
      recommendations.push('Consider adding keyboard shortcuts help dialog');
      recommendations.push('Ensure all interactive elements are keyboard accessible');
    }

    return {
      passed: score >= 70,
      score: Math.max(0, score),
      issues,
      recommendations,
    };
  }

  testScreenReaderSupport(movementSystem: MovementSystem, units: Unit[]): AccessibilityTestResult {
    const issues: AccessibilityIssue[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Test ARIA labels and descriptions
    try {
      const testUnit = units[0];
      movementSystem.selectCharacterForMovement(testUnit);

      const ariaInfo = movementSystem.getAriaInformation();

      if (!ariaInfo.selectedUnitLabel) {
        issues.push({
          severity: 'critical',
          category: 'screen-reader',
          description: 'No ARIA label provided for selected unit',
          wcagGuideline: 'WCAG 1.3.1 (Info and Relationships)',
        });
        score -= 30;
      }

      if (!ariaInfo.movementRangeDescription) {
        issues.push({
          severity: 'major',
          category: 'screen-reader',
          description: 'No ARIA description for movement range',
          wcagGuideline: 'WCAG 1.3.1 (Info and Relationships)',
        });
        score -= 20;
      }

      if (!ariaInfo.gameStateDescription) {
        issues.push({
          severity: 'major',
          category: 'screen-reader',
          description: 'No ARIA description for current game state',
          wcagGuideline: 'WCAG 1.3.1 (Info and Relationships)',
        });
        score -= 20;
      }
    } catch (error) {
      issues.push({
        severity: 'critical',
        category: 'screen-reader',
        description: `ARIA information retrieval failed: ${error}`,
        wcagGuideline: 'WCAG 1.3.1 (Info and Relationships)',
      });
      score -= 40;
    }

    // Test live region updates
    try {
      const testUnit = units[0];
      const destination = { x: testUnit.position.x + 1, y: testUnit.position.y };

      movementSystem.selectCharacterForMovement(testUnit);

      const liveRegionUpdates = movementSystem.getLiveRegionUpdates();

      if (liveRegionUpdates.length === 0) {
        issues.push({
          severity: 'major',
          category: 'screen-reader',
          description: 'No live region updates for movement selection',
          wcagGuideline: 'WCAG 4.1.3 (Status Messages)',
        });
        score -= 25;
      }

      // Test movement execution announcements
      movementSystem.executeMovement(testUnit, destination).then(() => {
        const executionUpdates = movementSystem.getLiveRegionUpdates();

        if (executionUpdates.length === 0) {
          issues.push({
            severity: 'major',
            category: 'screen-reader',
            description: 'No live region updates for movement execution',
            wcagGuideline: 'WCAG 4.1.3 (Status Messages)',
          });
          score -= 25;
        }
      });
    } catch (error) {
      issues.push({
        severity: 'major',
        category: 'screen-reader',
        description: `Live region testing failed: ${error}`,
        wcagGuideline: 'WCAG 4.1.3 (Status Messages)',
      });
      score -= 25;
    }

    // Test semantic structure
    try {
      const semanticInfo = movementSystem.getSemanticStructure();

      if (!semanticInfo.hasProperHeadings) {
        issues.push({
          severity: 'minor',
          category: 'screen-reader',
          description: 'Missing proper heading structure for movement interface',
          wcagGuideline: 'WCAG 1.3.1 (Info and Relationships)',
        });
        score -= 10;
      }

      if (!semanticInfo.hasLandmarkRoles) {
        issues.push({
          severity: 'minor',
          category: 'screen-reader',
          description: 'Missing landmark roles for movement interface sections',
          wcagGuideline: 'WCAG 1.3.1 (Info and Relationships)',
        });
        score -= 10;
      }
    } catch (error) {
      issues.push({
        severity: 'minor',
        category: 'screen-reader',
        description: `Semantic structure testing failed: ${error}`,
        wcagGuideline: 'WCAG 1.3.1 (Info and Relationships)',
      });
      score -= 10;
    }

    if (score >= 80) {
      recommendations.push('Screen reader support is good');
    } else {
      recommendations.push('Add comprehensive ARIA labels and descriptions');
      recommendations.push('Implement live region updates for all state changes');
      recommendations.push('Ensure proper semantic structure with headings and landmarks');
    }

    return {
      passed: score >= 60,
      score: Math.max(0, score),
      issues,
      recommendations,
    };
  }

  testVisualAccessibility(movementSystem: MovementSystem, units: Unit[]): AccessibilityTestResult {
    const issues: AccessibilityIssue[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Test color contrast
    try {
      const testUnit = units[0];
      movementSystem.selectCharacterForMovement(testUnit);

      const colorInfo = movementSystem.getColorInformation();

      // Test movement range highlight contrast
      if (colorInfo.movementRangeContrast < 3.0) {
        issues.push({
          severity: 'major',
          category: 'visual',
          description: `Movement range highlight contrast ratio ${colorInfo.movementRangeContrast.toFixed(2)} is below WCAG AA standard (3:1)`,
          wcagGuideline: 'WCAG 1.4.3 (Contrast Minimum)',
        });
        score -= 25;
      }

      // Test path highlight contrast
      if (colorInfo.pathHighlightContrast < 3.0) {
        issues.push({
          severity: 'major',
          category: 'visual',
          description: `Path highlight contrast ratio ${colorInfo.pathHighlightContrast.toFixed(2)} is below WCAG AA standard (3:1)`,
          wcagGuideline: 'WCAG 1.4.3 (Contrast Minimum)',
        });
        score -= 25;
      }

      // Test selection indicator contrast
      if (colorInfo.selectionIndicatorContrast < 3.0) {
        issues.push({
          severity: 'major',
          category: 'visual',
          description: `Selection indicator contrast ratio ${colorInfo.selectionIndicatorContrast.toFixed(2)} is below WCAG AA standard (3:1)`,
          wcagGuideline: 'WCAG 1.4.3 (Contrast Minimum)',
        });
        score -= 25;
      }
    } catch (error) {
      issues.push({
        severity: 'major',
        category: 'visual',
        description: `Color contrast testing failed: ${error}`,
        wcagGuideline: 'WCAG 1.4.3 (Contrast Minimum)',
      });
      score -= 30;
    }

    // Test color-blind accessibility
    try {
      const colorBlindTests = ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];

      for (const condition of colorBlindTests) {
        const testResult = movementSystem.testColorBlindAccessibility(condition);

        if (!testResult.isAccessible) {
          issues.push({
            severity: 'major',
            category: 'visual',
            description: `Movement system not accessible for ${condition}`,
            wcagGuideline: 'WCAG 1.4.1 (Use of Color)',
          });
          score -= 15;
        }
      }
    } catch (error) {
      issues.push({
        severity: 'major',
        category: 'visual',
        description: `Color-blind accessibility testing failed: ${error}`,
        wcagGuideline: 'WCAG 1.4.1 (Use of Color)',
      });
      score -= 20;
    }

    // Test focus indicators
    try {
      const testUnit = units[0];
      movementSystem.selectCharacterForMovement(testUnit);

      const focusInfo = movementSystem.getFocusInformation();

      if (!focusInfo.hasFocusIndicator) {
        issues.push({
          severity: 'major',
          category: 'visual',
          description: 'No visible focus indicator for selected unit',
          wcagGuideline: 'WCAG 2.4.7 (Focus Visible)',
        });
        score -= 20;
      }

      if (focusInfo.focusIndicatorContrast < 3.0) {
        issues.push({
          severity: 'minor',
          category: 'visual',
          description: `Focus indicator contrast ${focusInfo.focusIndicatorContrast.toFixed(2)} could be improved`,
          wcagGuideline: 'WCAG 2.4.7 (Focus Visible)',
        });
        score -= 10;
      }
    } catch (error) {
      issues.push({
        severity: 'major',
        category: 'visual',
        description: `Focus indicator testing failed: ${error}`,
        wcagGuideline: 'WCAG 2.4.7 (Focus Visible)',
      });
      score -= 20;
    }

    // Test text scaling
    try {
      const scalingFactors = [1.25, 1.5, 2.0];

      for (const factor of scalingFactors) {
        const scalingResult = movementSystem.testTextScaling(factor);

        if (!scalingResult.isUsable) {
          issues.push({
            severity: 'major',
            category: 'visual',
            description: `Interface not usable at ${factor * 100}% text scaling`,
            wcagGuideline: 'WCAG 1.4.4 (Resize Text)',
          });
          score -= 15;
        }
      }
    } catch (error) {
      issues.push({
        severity: 'minor',
        category: 'visual',
        description: `Text scaling testing failed: ${error}`,
        wcagGuideline: 'WCAG 1.4.4 (Resize Text)',
      });
      score -= 10;
    }

    if (score >= 80) {
      recommendations.push('Visual accessibility is good');
    } else {
      recommendations.push('Improve color contrast ratios to meet WCAG AA standards');
      recommendations.push('Add non-color indicators for important information');
      recommendations.push('Ensure focus indicators are clearly visible');
      recommendations.push('Test interface at various text scaling levels');
    }

    return {
      passed: score >= 70,
      score: Math.max(0, score),
      issues,
      recommendations,
    };
  }

  testMotorAccessibility(movementSystem: MovementSystem, units: Unit[]): AccessibilityTestResult {
    const issues: AccessibilityIssue[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Test click target sizes
    try {
      const testUnit = units[0];
      const targetInfo = movementSystem.getClickTargetInformation(testUnit);

      const minTargetSize = 44; // WCAG AAA recommendation

      if (targetInfo.width < minTargetSize || targetInfo.height < minTargetSize) {
        issues.push({
          severity: 'major',
          category: 'motor',
          description: `Unit click target size ${targetInfo.width}x${targetInfo.height} is below recommended 44x44 pixels`,
          wcagGuideline: 'WCAG 2.5.5 (Target Size)',
        });
        score -= 20;
      }

      // Test movement destination targets
      movementSystem.selectCharacterForMovement(testUnit);
      const state = movementSystem.getCurrentState();

      for (const position of state.movementRange.slice(0, 5)) {
        // Test first 5 positions
        const destTargetInfo = movementSystem.getClickTargetInformation(position);

        if (destTargetInfo.width < minTargetSize || destTargetInfo.height < minTargetSize) {
          issues.push({
            severity: 'minor',
            category: 'motor',
            description: `Movement destination target at (${position.x},${position.y}) is below recommended size`,
            wcagGuideline: 'WCAG 2.5.5 (Target Size)',
          });
          score -= 5;
          break; // Don't spam issues for every position
        }
      }
    } catch (error) {
      issues.push({
        severity: 'major',
        category: 'motor',
        description: `Click target size testing failed: ${error}`,
        wcagGuideline: 'WCAG 2.5.5 (Target Size)',
      });
      score -= 25;
    }

    // Test drag and drop alternatives
    try {
      const testUnit = units[0];
      const destination = { x: testUnit.position.x + 1, y: testUnit.position.y };

      // Test if movement can be accomplished without drag and drop
      movementSystem.selectCharacterForMovement(testUnit);
      const canMoveWithoutDrag = movementSystem.canExecuteMovementWithoutDrag(destination);

      if (!canMoveWithoutDrag) {
        issues.push({
          severity: 'major',
          category: 'motor',
          description: 'Movement requires drag and drop with no alternative method',
          wcagGuideline: 'WCAG 2.5.1 (Pointer Gestures)',
        });
        score -= 30;
      }
    } catch (error) {
      issues.push({
        severity: 'major',
        category: 'motor',
        description: `Drag and drop alternative testing failed: ${error}`,
        wcagGuideline: 'WCAG 2.5.1 (Pointer Gestures)',
      });
      score -= 25;
    }

    // Test timing requirements
    try {
      const testUnit = units[0];
      movementSystem.selectCharacterForMovement(testUnit);

      const timingInfo = movementSystem.getTimingRequirements();

      if (timingInfo.hasTimeLimit && !timingInfo.canExtendTime) {
        issues.push({
          severity: 'major',
          category: 'motor',
          description: 'Movement has time limits that cannot be extended',
          wcagGuideline: 'WCAG 2.2.1 (Timing Adjustable)',
        });
        score -= 25;
      }

      if (timingInfo.requiresRapidInput) {
        issues.push({
          severity: 'minor',
          category: 'motor',
          description: 'Movement system may require rapid input sequences',
          wcagGuideline: 'WCAG 2.2.1 (Timing Adjustable)',
        });
        score -= 10;
      }
    } catch (error) {
      issues.push({
        severity: 'minor',
        category: 'motor',
        description: `Timing requirements testing failed: ${error}`,
        wcagGuideline: 'WCAG 2.2.1 (Timing Adjustable)',
      });
      score -= 10;
    }

    // Test accidental activation prevention
    try {
      const testUnit = units[0];
      const destination = { x: testUnit.position.x + 1, y: testUnit.position.y };

      movementSystem.selectCharacterForMovement(testUnit);

      // Test if there's confirmation for important actions
      const hasConfirmation = movementSystem.hasMovementConfirmation();
      const hasUndo = movementSystem.canUndoMovement();

      if (!hasConfirmation && !hasUndo) {
        issues.push({
          severity: 'minor',
          category: 'motor',
          description: 'No confirmation or undo mechanism for movement actions',
          wcagGuideline: 'WCAG 2.5.2 (Pointer Cancellation)',
        });
        score -= 15;
      }
    } catch (error) {
      issues.push({
        severity: 'minor',
        category: 'motor',
        description: `Accidental activation testing failed: ${error}`,
        wcagGuideline: 'WCAG 2.5.2 (Pointer Cancellation)',
      });
      score -= 10;
    }

    if (score >= 80) {
      recommendations.push('Motor accessibility is good');
    } else {
      recommendations.push('Increase click target sizes to at least 44x44 pixels');
      recommendations.push('Provide alternatives to drag and drop interactions');
      recommendations.push('Add confirmation dialogs for important actions');
      recommendations.push('Consider adding undo functionality');
    }

    return {
      passed: score >= 70,
      score: Math.max(0, score),
      issues,
      recommendations,
    };
  }

  generateAccessibilityReport(): AccessibilityReport {
    const allIssues: AccessibilityIssue[] = [];
    const allRecommendations: string[] = [];
    let totalScore = 0;
    let testCount = 0;

    for (const result of this.testResults) {
      allIssues.push(...result.issues);
      allRecommendations.push(...result.recommendations);
      totalScore += result.score;
      testCount++;
    }

    const averageScore = testCount > 0 ? totalScore / testCount : 0;
    const criticalIssues = allIssues.filter(i => i.severity === 'critical').length;
    const majorIssues = allIssues.filter(i => i.severity === 'major').length;
    const minorIssues = allIssues.filter(i => i.severity === 'minor').length;

    return {
      overallScore: averageScore,
      passed: averageScore >= 70 && criticalIssues === 0,
      summary: {
        totalIssues: allIssues.length,
        criticalIssues,
        majorIssues,
        minorIssues,
      },
      issues: allIssues,
      recommendations: [...new Set(allRecommendations)], // Remove duplicates
      wcagCompliance: this.assessWCAGCompliance(allIssues),
    };
  }

  private assessWCAGCompliance(issues: AccessibilityIssue[]): WCAGCompliance {
    const wcagIssues = new Map<string, number>();

    for (const issue of issues) {
      if (issue.wcagGuideline) {
        wcagIssues.set(issue.wcagGuideline, (wcagIssues.get(issue.wcagGuideline) || 0) + 1);
      }
    }

    const totalGuidelines = 13; // Number of WCAG guidelines we test
    const violatedGuidelines = wcagIssues.size;
    const compliancePercentage = ((totalGuidelines - violatedGuidelines) / totalGuidelines) * 100;

    return {
      level: compliancePercentage >= 90 ? 'AAA' : compliancePercentage >= 70 ? 'AA' : 'A',
      percentage: compliancePercentage,
      violatedGuidelines: Array.from(wcagIssues.keys()),
    };
  }

  addTestResult(result: AccessibilityTestResult): void {
    this.testResults.push(result);
  }
}

interface AccessibilityReport {
  overallScore: number;
  passed: boolean;
  summary: {
    totalIssues: number;
    criticalIssues: number;
    majorIssues: number;
    minorIssues: number;
  };
  issues: AccessibilityIssue[];
  recommendations: string[];
  wcagCompliance: WCAGCompliance;
}

interface WCAGCompliance {
  level: 'A' | 'AA' | 'AAA';
  percentage: number;
  violatedGuidelines: string[];
}

// Mock Phaser scene with accessibility features
const createAccessibleMockScene = () =>
  ({
    add: {
      graphics: jest.fn(() => ({
        clear: jest.fn(),
        fillStyle: jest.fn(),
        fillRect: jest.fn(),
        lineStyle: jest.fn(),
        strokeRect: jest.fn(),
        setDepth: jest.fn(),
        destroy: jest.fn(),
        alpha: 0.5,
      })),
      sprite: jest.fn(() => ({
        setPosition: jest.fn(),
        setRotation: jest.fn(),
        setTint: jest.fn(),
        setAlpha: jest.fn(),
        setVisible: jest.fn(),
        destroy: jest.fn(),
        x: 0,
        y: 0,
      })),
      dom: jest.fn(() => ({
        setAttribute: jest.fn(),
        setHTML: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        destroy: jest.fn(),
      })),
    },
    tweens: {
      add: jest.fn(() => ({
        destroy: jest.fn(),
        stop: jest.fn(),
      })),
    },
    textures: {
      exists: jest.fn(() => true),
    },
    events: {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    },
  }) as any;

// Test data
const createTestUnit = (id: string, position: Position): Unit => ({
  id,
  name: `Test Unit ${id}`,
  position: { ...position },
  stats: {
    maxHP: 100,
    maxMP: 50,
    attack: 20,
    defense: 15,
    speed: 10,
    movement: 4,
  },
  currentHP: 100,
  currentMP: 50,
  faction: 'player',
  hasActed: false,
  hasMoved: false,
});

const createTestMapData = (): MapData => ({
  width: 10,
  height: 10,
  tileSize: 32,
  layers: [
    {
      name: 'terrain',
      type: 'terrain',
      data: Array(10)
        .fill(null)
        .map(() => Array(10).fill(0)),
      visible: true,
      opacity: 1,
    },
  ],
  playerSpawns: [{ x: 1, y: 1 }],
  enemySpawns: [{ x: 8, y: 8 }],
});

describe('Movement System Accessibility Tests', () => {
  let movementSystem: MovementSystem;
  let accessibilityTester: AccessibilityTester;
  let mockScene: any;
  let testUnits: Unit[];
  let testMapData: MapData;

  beforeEach(() => {
    jest.clearAllMocks();

    mockScene = createAccessibleMockScene();
    testMapData = createTestMapData();
    testUnits = [
      createTestUnit('player1', { x: 2, y: 2 }),
      createTestUnit('player2', { x: 3, y: 2 }),
      createTestUnit('enemy1', { x: 7, y: 7 }),
    ];

    const accessibilityConfig = {
      enableKeyboardNavigation: true,
      enableScreenReaderSupport: true,
      enableHighContrast: true,
      enableFocusIndicators: true,
      largeClickTargets: true,
    };

    movementSystem = new MovementSystem(mockScene, accessibilityConfig);
    movementSystem.initialize(testMapData);
    movementSystem.updateUnits(testUnits);

    accessibilityTester = new AccessibilityTester();
  });

  afterEach(() => {
    if (movementSystem) {
      movementSystem.destroy();
    }
  });

  describe('Keyboard Navigation Accessibility', () => {
    test('should support full keyboard navigation', () => {
      const result = accessibilityTester.testKeyboardNavigation(movementSystem, testUnits);
      accessibilityTester.addTestResult(result);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(70);

      // Should have minimal critical issues
      const criticalIssues = result.issues.filter(i => i.severity === 'critical');
      expect(criticalIssues.length).toBe(0);

      console.log('Keyboard Navigation Score:', result.score);
      if (result.issues.length > 0) {
        console.log('Keyboard Issues:', result.issues);
      }
    });

    test('should handle keyboard shortcuts consistently', () => {
      const shortcuts = [
        { key: 'Tab', expectedAction: 'next unit' },
        { key: 'Shift+Tab', expectedAction: 'previous unit' },
        { key: 'Enter', expectedAction: 'confirm action' },
        { key: 'Escape', expectedAction: 'cancel action' },
        { key: 'Space', expectedAction: 'select/deselect' },
      ];

      let allShortcutsWork = true;
      const failedShortcuts: string[] = [];

      for (const shortcut of shortcuts) {
        try {
          const result = movementSystem.handleKeyboardInput(shortcut.key);
          if (!result.handled) {
            allShortcutsWork = false;
            failedShortcuts.push(shortcut.key);
          }
        } catch (error) {
          allShortcutsWork = false;
          failedShortcuts.push(shortcut.key);
        }
      }

      expect(allShortcutsWork).toBe(true);
      if (!allShortcutsWork) {
        console.log('Failed shortcuts:', failedShortcuts);
      }
    });

    test('should provide keyboard alternatives to mouse actions', () => {
      const testUnit = testUnits[0];

      // Test keyboard unit selection
      const keyboardSelection = movementSystem.selectNextCharacterWithKeyboard();
      expect(keyboardSelection.success).toBe(true);

      // Test keyboard movement
      const keyboardMovement = movementSystem.handleKeyboardInput('ArrowRight');
      expect(keyboardMovement.handled).toBe(true);

      // Test keyboard confirmation
      const keyboardConfirm = movementSystem.handleKeyboardInput('Enter');
      expect(keyboardConfirm.handled).toBe(true);
    });
  });

  describe('Screen Reader Support', () => {
    test('should provide comprehensive screen reader support', () => {
      const result = accessibilityTester.testScreenReaderSupport(movementSystem, testUnits);
      accessibilityTester.addTestResult(result);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(60);

      // Should provide ARIA information
      const testUnit = testUnits[0];
      movementSystem.selectCharacterForMovement(testUnit);

      const ariaInfo = movementSystem.getAriaInformation();
      expect(ariaInfo.selectedUnitLabel).toBeDefined();
      expect(ariaInfo.selectedUnitLabel).toContain(testUnit.name);

      console.log('Screen Reader Score:', result.score);
      if (result.issues.length > 0) {
        console.log('Screen Reader Issues:', result.issues);
      }
    });

    test('should announce state changes to screen readers', () => {
      const testUnit = testUnits[0];

      // Clear previous updates
      movementSystem.clearLiveRegionUpdates();

      // Select character
      movementSystem.selectCharacterForMovement(testUnit);

      const updates = movementSystem.getLiveRegionUpdates();
      expect(updates.length).toBeGreaterThan(0);
      expect(updates[0]).toContain(testUnit.name);
    });

    test('should provide meaningful descriptions for game elements', () => {
      const testUnit = testUnits[0];
      movementSystem.selectCharacterForMovement(testUnit);

      const ariaInfo = movementSystem.getAriaInformation();

      // Check for meaningful descriptions
      expect(ariaInfo.movementRangeDescription).toBeDefined();
      expect(ariaInfo.movementRangeDescription.length).toBeGreaterThan(10);

      expect(ariaInfo.gameStateDescription).toBeDefined();
      expect(ariaInfo.gameStateDescription.length).toBeGreaterThan(10);
    });
  });

  describe('Visual Accessibility', () => {
    test('should meet color contrast requirements', () => {
      const result = accessibilityTester.testVisualAccessibility(movementSystem, testUnits);
      accessibilityTester.addTestResult(result);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(70);

      // Check specific contrast ratios
      const testUnit = testUnits[0];
      movementSystem.selectCharacterForMovement(testUnit);

      const colorInfo = movementSystem.getColorInformation();
      expect(colorInfo.movementRangeContrast).toBeGreaterThanOrEqual(3.0);
      expect(colorInfo.pathHighlightContrast).toBeGreaterThanOrEqual(3.0);
      expect(colorInfo.selectionIndicatorContrast).toBeGreaterThanOrEqual(3.0);

      console.log('Visual Accessibility Score:', result.score);
      if (result.issues.length > 0) {
        console.log('Visual Issues:', result.issues);
      }
    });

    test('should be accessible to color-blind users', () => {
      const colorBlindConditions = ['protanopia', 'deuteranopia', 'tritanopia'];

      for (const condition of colorBlindConditions) {
        const testResult = movementSystem.testColorBlindAccessibility(condition);
        expect(testResult.isAccessible).toBe(true);

        if (!testResult.isAccessible) {
          console.log(`Failed color-blind test for ${condition}:`, testResult.issues);
        }
      }
    });

    test('should provide clear focus indicators', () => {
      const testUnit = testUnits[0];
      movementSystem.selectCharacterForMovement(testUnit);

      const focusInfo = movementSystem.getFocusInformation();
      expect(focusInfo.hasFocusIndicator).toBe(true);
      expect(focusInfo.focusIndicatorContrast).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe('Motor Accessibility', () => {
    test('should provide adequate click target sizes', () => {
      const result = accessibilityTester.testMotorAccessibility(movementSystem, testUnits);
      accessibilityTester.addTestResult(result);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(70);

      // Check specific target sizes
      const testUnit = testUnits[0];
      const targetInfo = movementSystem.getClickTargetInformation(testUnit);

      expect(targetInfo.width).toBeGreaterThanOrEqual(44);
      expect(targetInfo.height).toBeGreaterThanOrEqual(44);

      console.log('Motor Accessibility Score:', result.score);
      if (result.issues.length > 0) {
        console.log('Motor Issues:', result.issues);
      }
    });

    test('should not require drag and drop for essential functions', () => {
      const testUnit = testUnits[0];
      const destination = { x: testUnit.position.x + 1, y: testUnit.position.y };

      movementSystem.selectCharacterForMovement(testUnit);
      const canMoveWithoutDrag = movementSystem.canExecuteMovementWithoutDrag(destination);

      expect(canMoveWithoutDrag).toBe(true);
    });

    test('should not have restrictive timing requirements', () => {
      const testUnit = testUnits[0];
      movementSystem.selectCharacterForMovement(testUnit);

      const timingInfo = movementSystem.getTimingRequirements();

      if (timingInfo.hasTimeLimit) {
        expect(timingInfo.canExtendTime).toBe(true);
      }

      expect(timingInfo.requiresRapidInput).toBe(false);
    });
  });

  describe('Comprehensive Accessibility Report', () => {
    test('should generate comprehensive accessibility report', () => {
      // Run all accessibility tests
      const keyboardResult = accessibilityTester.testKeyboardNavigation(movementSystem, testUnits);
      const screenReaderResult = accessibilityTester.testScreenReaderSupport(
        movementSystem,
        testUnits
      );
      const visualResult = accessibilityTester.testVisualAccessibility(movementSystem, testUnits);
      const motorResult = accessibilityTester.testMotorAccessibility(movementSystem, testUnits);

      accessibilityTester.addTestResult(keyboardResult);
      accessibilityTester.addTestResult(screenReaderResult);
      accessibilityTester.addTestResult(visualResult);
      accessibilityTester.addTestResult(motorResult);

      const report = accessibilityTester.generateAccessibilityReport();

      expect(report.passed).toBe(true);
      expect(report.overallScore).toBeGreaterThanOrEqual(70);
      expect(report.summary.criticalIssues).toBe(0);
      expect(report.wcagCompliance.level).toMatch(/^(A|AA|AAA)$/);

      console.log('Overall Accessibility Report:');
      console.log(`Score: ${report.overallScore.toFixed(1)}/100`);
      console.log(
        `WCAG Compliance: ${report.wcagCompliance.level} (${report.wcagCompliance.percentage.toFixed(1)}%)`
      );
      console.log(
        `Issues: ${report.summary.totalIssues} (${report.summary.criticalIssues} critical, ${report.summary.majorIssues} major, ${report.summary.minorIssues} minor)`
      );

      if (report.recommendations.length > 0) {
        console.log('Recommendations:', report.recommendations);
      }
    });

    test('should meet WCAG AA compliance standards', () => {
      // Run all tests
      const keyboardResult = accessibilityTester.testKeyboardNavigation(movementSystem, testUnits);
      const screenReaderResult = accessibilityTester.testScreenReaderSupport(
        movementSystem,
        testUnits
      );
      const visualResult = accessibilityTester.testVisualAccessibility(movementSystem, testUnits);
      const motorResult = accessibilityTester.testMotorAccessibility(movementSystem, testUnits);

      accessibilityTester.addTestResult(keyboardResult);
      accessibilityTester.addTestResult(screenReaderResult);
      accessibilityTester.addTestResult(visualResult);
      accessibilityTester.addTestResult(motorResult);

      const report = accessibilityTester.generateAccessibilityReport();

      // Should meet at least WCAG AA standards
      expect(['AA', 'AAA']).toContain(report.wcagCompliance.level);
      expect(report.wcagCompliance.percentage).toBeGreaterThanOrEqual(70);
      expect(report.summary.criticalIssues).toBe(0);
    });
  });
});
