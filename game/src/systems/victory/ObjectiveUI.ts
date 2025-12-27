/**
 * ObjectiveUI - Manages objective display UI system
 *
 * This class handles:
 * - Objective list display
 * - Progress update visualization
 * - Objective completion notifications
 * - Objective panel toggle
 * - Minimap objective markers
 *
 * Implements requirements 1.3, 1.4, 1.7, 10.1, 10.2, 10.3 from the boss victory system specification
 */

import * as Phaser from 'phaser';
import { Objective, ObjectiveProgress } from '../../types/victory';

/**
 * ObjectiveUI configuration
 */
export interface ObjectiveUIConfig {
  /** Whether to show the objective panel by default */
  showByDefault: boolean;
  /** Whether to auto-hide completed objectives */
  autoHideCompleted: boolean;
  /** Duration for completion notification (ms) */
  completionNotificationDuration: number;
  /** Whether to show minimap markers */
  showMinimapMarkers: boolean;
  /** Panel position */
  panelPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Enable debug logs */
  enableDebugLogs: boolean;
}

/**
 * Objective marker data for minimap
 */
export interface ObjectiveMarker {
  objectiveId: string;
  position: { x: number; y: number };
  color: number;
  icon?: string;
}

/**
 * ObjectiveUI class for managing objective display
 */
export class ObjectiveUI {
  private scene: Phaser.Scene;
  private config: ObjectiveUIConfig;

  // UI containers
  private objectivePanel: Phaser.GameObjects.Container | null = null;
  private objectivePanelBackground: Phaser.GameObjects.Graphics | null = null;
  private objectiveTitleText: Phaser.GameObjects.Text | null = null;
  private objectiveListContainer: Phaser.GameObjects.Container | null = null;
  private objectiveTextElements: Map<string, Phaser.GameObjects.Text> = new Map();
  private objectiveProgressBars: Map<string, Phaser.GameObjects.Graphics> = new Map();

  // Completion notification
  private completionNotificationContainer: Phaser.GameObjects.Container | null = null;

  // Minimap markers
  private minimapMarkers: Map<string, Phaser.GameObjects.Graphics> = new Map();

  // UI state
  private isPanelVisible: boolean = false;
  private currentObjectives: Objective[] = [];

  // UI constants
  private readonly PANEL_WIDTH = 350;
  private readonly PANEL_HEIGHT = 400;
  private readonly PANEL_PADDING = 15;
  private readonly OBJECTIVE_ITEM_HEIGHT = 60;
  private readonly PROGRESS_BAR_WIDTH = 280;
  private readonly PROGRESS_BAR_HEIGHT = 8;
  private readonly UI_DEPTH = 1000;
  private readonly NOTIFICATION_DEPTH = 1005;
  private readonly MARKER_DEPTH = 999;

  // Default configuration
  private static readonly DEFAULT_CONFIG: ObjectiveUIConfig = {
    showByDefault: true,
    autoHideCompleted: false,
    completionNotificationDuration: 3000,
    showMinimapMarkers: true,
    panelPosition: 'top-left',
    enableDebugLogs: false,
  };

  /**
   * Creates a new ObjectiveUI instance
   * @param scene - Phaser scene
   * @param config - ObjectiveUI configuration
   */
  constructor(scene: Phaser.Scene, config?: Partial<ObjectiveUIConfig>) {
    this.scene = scene;
    this.config = { ...ObjectiveUI.DEFAULT_CONFIG, ...config };

    this.createObjectivePanel();
    this.createCompletionNotification();

    if (this.config.showByDefault) {
      this.showObjectivePanel();
    } else {
      this.hideObjectivePanel();
    }

    this.log('ObjectiveUI initialized');
  }

  /**
   * Create objective panel UI
   */
  private createObjectivePanel(): void {
    const camera = this.scene.cameras.main;
    const position = this.getPanelPosition(camera.width, camera.height);

    // Create main container
    this.objectivePanel = this.scene.add
      .container(position.x, position.y)
      .setScrollFactor(0)
      .setDepth(this.UI_DEPTH);

    // Create background
    this.objectivePanelBackground = this.scene.add.graphics();
    this.drawPanelBackground();

    // Create title
    this.objectiveTitleText = this.scene.add
      .text(this.PANEL_PADDING, this.PANEL_PADDING, 'Objectives', {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0);

    // Create objective list container
    this.objectiveListContainer = this.scene.add
      .container(this.PANEL_PADDING, this.PANEL_PADDING + 35)
      .setSize(this.PANEL_WIDTH - this.PANEL_PADDING * 2, this.PANEL_HEIGHT - 60);

    // Add elements to panel
    this.objectivePanel.add([
      this.objectivePanelBackground,
      this.objectiveTitleText,
      this.objectiveListContainer,
    ]);

    this.log('Objective panel created');
  }

  /**
   * Draw panel background
   */
  private drawPanelBackground(): void {
    if (!this.objectivePanelBackground) return;

    this.objectivePanelBackground
      .clear()
      .fillStyle(0x000000, 0.85)
      .fillRoundedRect(0, 0, this.PANEL_WIDTH, this.PANEL_HEIGHT, 10)
      .lineStyle(2, 0x4488ff, 1)
      .strokeRoundedRect(0, 0, this.PANEL_WIDTH, this.PANEL_HEIGHT, 10);
  }

  /**
   * Get panel position based on configuration
   */
  private getPanelPosition(
    screenWidth: number,
    screenHeight: number
  ): { x: number; y: number } {
    const margin = 20;

    switch (this.config.panelPosition) {
      case 'top-left':
        return { x: margin, y: margin };
      case 'top-right':
        return { x: screenWidth - this.PANEL_WIDTH - margin, y: margin };
      case 'bottom-left':
        return { x: margin, y: screenHeight - this.PANEL_HEIGHT - margin };
      case 'bottom-right':
        return {
          x: screenWidth - this.PANEL_WIDTH - margin,
          y: screenHeight - this.PANEL_HEIGHT - margin,
        };
      default:
        return { x: margin, y: margin };
    }
  }

  /**
   * Show objective list
   * @param objectives - Array of objectives to display
   */
  public showObjectiveList(objectives: Objective[]): void {
    if (!this.objectiveListContainer) {
      this.log('Warning: Objective list container not initialized');
      return;
    }

    this.currentObjectives = objectives;

    // Clear existing objective elements
    this.clearObjectiveList();

    // Create objective items
    objectives.forEach((objective, index) => {
      this.createObjectiveItem(objective, index);
    });

    this.log(`Showing ${objectives.length} objectives`);
  }

  /**
   * Create a single objective item
   */
  private createObjectiveItem(objective: Objective, index: number): void {
    if (!this.objectiveListContainer) return;

    const yOffset = index * this.OBJECTIVE_ITEM_HEIGHT;
    const maxWidth = this.PANEL_WIDTH - this.PANEL_PADDING * 2;

    // Objective status icon
    const statusIcon = objective.isComplete ? '✓' : objective.isRequired ? '●' : '○';
    const statusColor = objective.isComplete ? '#44ff44' : objective.isRequired ? '#ffaa44' : '#888888';

    // Objective text
    const objectiveText = this.scene.add
      .text(0, yOffset, `${statusIcon} ${objective.description}`, {
        fontSize: '14px',
        color: objective.isComplete ? '#888888' : '#ffffff',
        fontFamily: 'Arial',
        wordWrap: { width: maxWidth - 10 },
      })
      .setOrigin(0);

    // Progress bar background
    const progressBarBg = this.scene.add.graphics();
    progressBarBg
      .fillStyle(0x333333, 1)
      .fillRoundedRect(0, yOffset + 25, this.PROGRESS_BAR_WIDTH, this.PROGRESS_BAR_HEIGHT, 4);

    // Progress bar fill
    const progressBar = this.scene.add.graphics();
    this.updateProgressBar(progressBar, objective.progress, yOffset + 25);

    // Progress text
    const progressText = this.scene.add
      .text(
        this.PROGRESS_BAR_WIDTH + 10,
        yOffset + 25,
        `${objective.progress.current}/${objective.progress.target}`,
        {
          fontSize: '12px',
          color: '#cccccc',
          fontFamily: 'Arial',
        }
      )
      .setOrigin(0, 0);

    // Store references
    this.objectiveTextElements.set(objective.id, objectiveText);
    this.objectiveProgressBars.set(objective.id, progressBar);

    // Add to container
    this.objectiveListContainer.add([objectiveText, progressBarBg, progressBar, progressText]);
  }

  /**
   * Update progress bar graphics
   */
  private updateProgressBar(
    graphics: Phaser.GameObjects.Graphics,
    progress: ObjectiveProgress,
    yOffset: number
  ): void {
    const fillWidth = (progress.percentage / 100) * this.PROGRESS_BAR_WIDTH;
    const color = progress.percentage >= 100 ? 0x44ff44 : progress.percentage >= 50 ? 0xffaa44 : 0xff4444;

    graphics
      .clear()
      .fillStyle(color, 1)
      .fillRoundedRect(0, yOffset, fillWidth, this.PROGRESS_BAR_HEIGHT, 4);
  }

  /**
   * Update objective progress display
   * @param objectiveId - ID of the objective to update
   * @param progress - New progress data
   */
  public updateObjectiveProgress(objectiveId: string, progress: ObjectiveProgress): void {
    // Find the objective in current list
    const objective = this.currentObjectives.find(obj => obj.id === objectiveId);
    if (!objective) {
      this.log(`Warning: Objective ${objectiveId} not found in current list`);
      return;
    }

    // Update objective data
    objective.progress = progress;

    // Update progress bar
    const progressBar = this.objectiveProgressBars.get(objectiveId);
    if (progressBar) {
      const index = this.currentObjectives.indexOf(objective);
      const yOffset = index * this.OBJECTIVE_ITEM_HEIGHT + 25;
      this.updateProgressBar(progressBar, progress, yOffset);
    }

    // Update text if completed
    if (progress.percentage >= 100 && !objective.isComplete) {
      objective.isComplete = true;
      const textElement = this.objectiveTextElements.get(objectiveId);
      if (textElement) {
        textElement.setText(`✓ ${objective.description}`).setColor('#888888');
      }

      // Show completion notification
      this.showObjectiveComplete(objective);
    }

    this.log(`Updated progress for objective ${objectiveId}: ${progress.percentage}%`);
  }

  /**
   * Show objective completion notification
   * @param objective - Completed objective
   */
  public showObjectiveComplete(objective: Objective): void {
    if (!this.completionNotificationContainer) {
      this.log('Warning: Completion notification container not initialized');
      return;
    }

    // Clear previous notification
    this.completionNotificationContainer.removeAll(true);

    const camera = this.scene.cameras.main;
    const notificationWidth = 400;
    const notificationHeight = 100;
    const x = camera.width / 2 - notificationWidth / 2;
    const y = camera.height / 2 - notificationHeight / 2;

    // Position container
    this.completionNotificationContainer.setPosition(x, y);

    // Background
    const background = this.scene.add
      .graphics()
      .fillStyle(0x000000, 0.9)
      .fillRoundedRect(0, 0, notificationWidth, notificationHeight, 12)
      .lineStyle(3, 0x44ff44, 1)
      .strokeRoundedRect(0, 0, notificationWidth, notificationHeight, 12);

    // Completion icon
    const icon = this.scene.add
      .text(notificationWidth / 2, 30, '✓', {
        fontSize: '32px',
        color: '#44ff44',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Completion text
    const text = this.scene.add
      .text(notificationWidth / 2, 70, `Objective Complete: ${objective.description}`, {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial',
        align: 'center',
        wordWrap: { width: notificationWidth - 40 },
      })
      .setOrigin(0.5);

    // Add to container
    this.completionNotificationContainer.add([background, icon, text]);
    this.completionNotificationContainer.setVisible(true);

    // Play sound effect (if available)
    if (this.scene.sound.get('objective-complete')) {
      this.scene.sound.play('objective-complete');
    }

    // Auto-hide after duration
    this.scene.time.delayedCall(this.config.completionNotificationDuration, () => {
      this.hideCompletionNotification();
    });

    this.log(`Showing completion notification for objective: ${objective.id}`);
  }

  /**
   * Create completion notification container
   */
  private createCompletionNotification(): void {
    this.completionNotificationContainer = this.scene.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(this.NOTIFICATION_DEPTH)
      .setVisible(false);

    this.log('Completion notification container created');
  }

  /**
   * Hide completion notification
   */
  private hideCompletionNotification(): void {
    if (this.completionNotificationContainer) {
      this.completionNotificationContainer.setVisible(false);
    }
  }

  /**
   * Toggle objective panel visibility
   */
  public toggleObjectivePanel(): void {
    if (this.isPanelVisible) {
      this.hideObjectivePanel();
    } else {
      this.showObjectivePanel();
    }
  }

  /**
   * Show objective panel
   */
  public showObjectivePanel(): void {
    if (this.objectivePanel) {
      this.objectivePanel.setVisible(true);
      this.isPanelVisible = true;
      this.log('Objective panel shown');
    }
  }

  /**
   * Hide objective panel
   */
  public hideObjectivePanel(): void {
    if (this.objectivePanel) {
      this.objectivePanel.setVisible(false);
      this.isPanelVisible = false;
      this.log('Objective panel hidden');
    }
  }

  /**
   * Show objective markers on minimap
   * @param markers - Array of objective markers
   */
  public showObjectiveMarkers(markers: ObjectiveMarker[]): void {
    if (!this.config.showMinimapMarkers) {
      return;
    }

    // Clear existing markers
    this.clearObjectiveMarkers();

    // Create new markers
    markers.forEach(marker => {
      this.createObjectiveMarker(marker);
    });

    this.log(`Showing ${markers.length} objective markers`);
  }

  /**
   * Create a single objective marker
   */
  private createObjectiveMarker(marker: ObjectiveMarker): void {
    const markerGraphics = this.scene.add
      .graphics()
      .setDepth(this.MARKER_DEPTH)
      .setScrollFactor(1);

    // Draw marker (pulsing circle)
    markerGraphics
      .lineStyle(3, marker.color, 1)
      .strokeCircle(marker.position.x, marker.position.y, 20)
      .fillStyle(marker.color, 0.3)
      .fillCircle(marker.position.x, marker.position.y, 20);

    // Add pulsing animation
    this.scene.tweens.add({
      targets: markerGraphics,
      alpha: 0.3,
      scale: 1.2,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Store marker
    this.minimapMarkers.set(marker.objectiveId, markerGraphics);
  }

  /**
   * Update objective marker position
   * @param objectiveId - ID of the objective
   * @param position - New position
   */
  public updateObjectiveMarker(objectiveId: string, position: { x: number; y: number }): void {
    const marker = this.minimapMarkers.get(objectiveId);
    if (marker) {
      marker.setPosition(position.x, position.y);
      this.log(`Updated marker position for objective ${objectiveId}`);
    }
  }

  /**
   * Remove objective marker
   * @param objectiveId - ID of the objective
   */
  public removeObjectiveMarker(objectiveId: string): void {
    const marker = this.minimapMarkers.get(objectiveId);
    if (marker) {
      marker.destroy();
      this.minimapMarkers.delete(objectiveId);
      this.log(`Removed marker for objective ${objectiveId}`);
    }
  }

  /**
   * Clear all objective markers
   */
  private clearObjectiveMarkers(): void {
    this.minimapMarkers.forEach(marker => marker.destroy());
    this.minimapMarkers.clear();
  }

  /**
   * Clear objective list
   */
  private clearObjectiveList(): void {
    if (this.objectiveListContainer) {
      this.objectiveListContainer.removeAll(true);
    }

    this.objectiveTextElements.clear();
    this.objectiveProgressBars.clear();
  }

  /**
   * Check if objective panel is visible
   */
  public isPanelShown(): boolean {
    return this.isPanelVisible;
  }

  /**
   * Get current objectives
   */
  public getCurrentObjectives(): Objective[] {
    return [...this.currentObjectives];
  }

  /**
   * Resize UI elements when screen size changes
   */
  public resize(width: number, height: number): void {
    if (this.objectivePanel) {
      const position = this.getPanelPosition(width, height);
      this.objectivePanel.setPosition(position.x, position.y);
    }

    if (this.completionNotificationContainer) {
      const notificationWidth = 400;
      const notificationHeight = 100;
      const x = width / 2 - notificationWidth / 2;
      const y = height / 2 - notificationHeight / 2;
      this.completionNotificationContainer.setPosition(x, y);
    }

    this.log('ObjectiveUI resized');
  }

  /**
   * Log message with ObjectiveUI prefix
   */
  private log(message: string): void {
    if (this.config.enableDebugLogs) {
      console.log(`[ObjectiveUI] ${message}`);
    }
  }

  /**
   * Cleanup and destroy ObjectiveUI
   */
  public destroy(): void {
    // Destroy objective panel
    if (this.objectivePanel) {
      this.objectivePanel.destroy();
      this.objectivePanel = null;
    }

    // Destroy completion notification
    if (this.completionNotificationContainer) {
      this.completionNotificationContainer.destroy();
      this.completionNotificationContainer = null;
    }

    // Clear markers
    this.clearObjectiveMarkers();

    // Clear references
    this.objectiveTextElements.clear();
    this.objectiveProgressBars.clear();
    this.currentObjectives = [];

    // Reset state
    this.isPanelVisible = false;

    this.log('ObjectiveUI destroyed');
  }
}
