import Phaser from 'phaser';
import type { Direction } from '../../../../lib';

/**
 * Handles all input (keyboard and touch/swipe) for the game
 */
export class InputHandler {
  private scene: Phaser.Scene;
  private cursorKeys?: Phaser.Types.Input.Keyboard.CursorKeys;
  
  // Swipe gesture detection
  private swipeStartX = 0;
  private swipeStartY = 0;
  private swipeStartTime = 0;
  private swipeDetected: Direction | null = null;
  private readonly SWIPE_MIN_DISTANCE = 50; // Minimum swipe distance in pixels
  private readonly SWIPE_MAX_TIME = 500; // Maximum swipe duration in ms

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupKeyboard();
    this.setupSwipeGestures();
  }

  private setupKeyboard() {
    if (this.scene.input.keyboard) {
      this.cursorKeys = this.scene.input.keyboard.createCursorKeys();
      this.scene.input.keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.UP,
        Phaser.Input.Keyboard.KeyCodes.DOWN,
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
      ]);
    }
  }

  private setupSwipeGestures() {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.swipeStartX = pointer.x;
      this.swipeStartY = pointer.y;
      this.swipeStartTime = this.scene.time.now;
      this.swipeDetected = null;
    });
    
    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const swipeTime = this.scene.time.now - this.swipeStartTime;
      
      // Only process if swipe was quick enough
      if (swipeTime > this.SWIPE_MAX_TIME) {
        return;
      }
      
      const deltaX = pointer.x - this.swipeStartX;
      const deltaY = pointer.y - this.swipeStartY;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      
      // Determine if swipe distance is sufficient
      if (absDeltaX < this.SWIPE_MIN_DISTANCE && absDeltaY < this.SWIPE_MIN_DISTANCE) {
        return;
      }
      
      // Determine primary swipe direction
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        this.swipeDetected = deltaX > 0 ? 'right' : 'left';
      } else {
        // Vertical swipe
        this.swipeDetected = deltaY > 0 ? 'down' : 'up';
      }
    });
  }

  /**
   * Poll for directional input from keyboard or swipe gestures
   */
  pollDirectionalInput(): Direction | null {
    // Check for swipe gesture first
    if (this.swipeDetected) {
      const direction = this.swipeDetected;
      this.swipeDetected = null; // Consume the swipe
      return direction;
    }
    
    // Fall back to keyboard input
    const { JustDown } = Phaser.Input.Keyboard;
    if (this.cursorKeys) {
      const { left, right, up, down } = this.cursorKeys;
      if (left && JustDown(left)) return 'left';
      if (right && JustDown(right)) return 'right';
      if (up && JustDown(up)) return 'up';
      if (down && JustDown(down)) return 'down';
    }

    return null;
  }

  /**
   * Clean up input listeners
   */
  destroy() {
    // Phaser will automatically clean up input events when scene is destroyed
  }
}
