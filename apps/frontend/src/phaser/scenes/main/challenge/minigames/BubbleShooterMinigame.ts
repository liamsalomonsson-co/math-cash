import Phaser from 'phaser';
import type { MathChallenge } from '../../../../../lib';

interface BubbleShooterOptions {
  scene: Phaser.Scene;
  challenge: MathChallenge;
  bounds: { x: number; y: number; width: number; height: number };
  onCorrect: () => void;
  onIncorrect: () => void;
}

export class BubbleShooterMinigame {
  private container: Phaser.GameObjects.Container;
  private bubbles: Phaser.Physics.Arcade.Sprite[] = [];
  private bubbleCollider?: Phaser.Physics.Arcade.Collider;
  private crossbow?: Phaser.GameObjects.Sprite;
  private crossbowString?: Phaser.GameObjects.Graphics;
  private arrow?: Phaser.GameObjects.Sprite;
  private arrowTween?: Phaser.Tweens.Tween;
  private bubblePopTweens: Phaser.Tweens.Tween[] = [];
  private arrowIcons: Phaser.GameObjects.Graphics[] = [];
  private aimAngle = -Math.PI / 2; // Point upward initially (-90 degrees)
  private correctAnswer: number;
  private wrongAttempts = 0;
  private maxWrongAttempts = 2;
  private arrowsRemaining = 5;
  private maxArrows = 5;
  private isActive = true;
  private isPulling = false;
  private pullDistance = 0;
  private maxPullDistance = 60;
  private pointerDownHandler?: () => void;
  private pointerMoveHandler?: (pointer: Phaser.Input.Pointer) => void;
  private pointerUpHandler?: () => void;

  constructor(private options: BubbleShooterOptions) {
    this.correctAnswer = options.challenge.correctAnswer;
    this.container = options.scene.add.container(0, 0);
    this.container.setDepth(35);
    
    this.createBubbles();
    this.createCrossbow();
    this.createArrowIcons();
    this.setupInput();
  }

  private createBubbles() {
    const { scene, challenge, bounds } = this.options;
    
    // Generate 3 wrong answers
    const wrongAnswers = this.generateWrongAnswers(challenge.correctAnswer);
    const allAnswers = [challenge.correctAnswer, ...wrongAnswers];
    
    // Shuffle answers
    Phaser.Utils.Array.Shuffle(allAnswers);

    // Create bubbles in the upper portion of the bounds
    const bubbleRadius = 30;
    const playArea = {
      x: bounds.x + bubbleRadius,
      y: bounds.y + bubbleRadius,
      width: bounds.width - bubbleRadius * 2,
      height: bounds.height * 0.7 - bubbleRadius * 2, // Use 70% of height for bubbles
    };

    allAnswers.forEach((answer, index) => {
      // Spread bubbles across the play area
      const x = playArea.x + (playArea.width / 4) * index + playArea.width / 8;
      const y = playArea.y + Phaser.Math.Between(0, playArea.height);

      // Create bubble as physics sprite
      const bubble = scene.physics.add.sprite(x, y, '');
      bubble.setVisible(false); // Hide sprite, use graphics instead
      
      // Draw bubble circle
      const graphics = scene.add.graphics();
      graphics.fillStyle(0x4cc9f0, 0.8);
      graphics.fillCircle(0, 0, bubbleRadius);
      graphics.lineStyle(3, 0xffffff, 0.6);
      graphics.strokeCircle(0, 0, bubbleRadius);
      
      // Add number text
      const text = scene.add.text(0, 0, answer.toString(), {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      text.setOrigin(0.5, 0.5);

      // Create container for bubble graphics
      const bubbleContainer = scene.add.container(0, 0, [graphics, text]);
      bubbleContainer.setPosition(x, y);
      
      // Set physics body to circle
      bubble.setCircle(bubbleRadius);
      bubble.setData('answer', answer);
      bubble.setData('graphics', bubbleContainer);
      bubble.setData('isCorrect', answer === this.correctAnswer);
      
      // Random velocity
      const velocityX = Phaser.Math.Between(-100, 100);
      const velocityY = Phaser.Math.Between(-100, 100);
      bubble.setVelocity(velocityX, velocityY);
      bubble.setBounce(1, 1);
      bubble.setCollideWorldBounds(false); // We'll handle bounds manually
      
      this.bubbles.push(bubble);
      this.container.add(bubbleContainer);
    });

    // Set up bubble collisions
    this.bubbleCollider = scene.physics.add.collider(this.bubbles, this.bubbles);

    // Update bubble positions to match graphics
    scene.events.on('update', this.updateBubbles, this);
  }

  private createCrossbow() {
    const { scene, bounds } = this.options;
    
    // Position crossbow near bottom of bounds (proportional to bounds height)
    const crossbowX = bounds.x + bounds.width / 2;
    const crossbowY = bounds.y + bounds.height - Math.min(40, bounds.height * 0.15);

    // Create crossbow sprite
    const crossbowSprite = scene.add.sprite(0, 0, 'crossbow');
    crossbowSprite.setOrigin(0.5, 0.5);
    crossbowSprite.setScale(0.1); // Reduced scale
    
    // Create bowstring graphic (will be updated dynamically)
    this.crossbowString = scene.add.graphics();
    this.crossbowString.setDepth(34);
    
    const crossbowContainer = scene.add.container(crossbowX, crossbowY, [crossbowSprite]);
    crossbowContainer.setRotation(this.aimAngle + Math.PI / 2); // Add 90 deg offset to point upward
    this.crossbow = scene.add.sprite(crossbowX, crossbowY, '');
    this.crossbow.setVisible(false); // Hide sprite, use for data storage only
    this.crossbow.setData('graphics', crossbowContainer);
    
    this.container.add([crossbowContainer, this.crossbowString]);
  }

  private createArrowIcons() {
    const { scene } = this.options;
    
    if (!this.crossbow) return;
    
    const crossbowData = this.crossbow.getData('graphics');
    const startX = crossbowData.x + 50; // Position to the right of crossbow
    const startY = crossbowData.y;
    const spacing = 12;
    
    // Create arrow icons
    for (let i = 0; i < this.maxArrows; i++) {
      const arrowIcon = scene.add.graphics();
      arrowIcon.fillStyle(0xff6b6b, 1);
      
      const x = startX + (i * spacing);
      const y = startY;
      
      // Small horizontal arrow
      arrowIcon.fillRect(x, y - 1, 8, 2);
      arrowIcon.fillTriangle(x + 8, y, x + 6, y - 2, x + 6, y + 2);
      
      this.arrowIcons.push(arrowIcon);
      this.container.add(arrowIcon);
    }
  }

  private removeArrowIcon() {
    if (this.arrowIcons.length > 0) {
      const icon = this.arrowIcons.pop();
      icon?.destroy();
    }
  }

  private setupInput() {
    const { scene } = this.options;

    // Start pulling on pointer down
    this.pointerDownHandler = () => {
      if (!this.crossbow || !this.isActive || this.arrow) return;

      this.isPulling = true;
    };
    scene.input.on('pointerdown', this.pointerDownHandler);

    // Update pull while dragging
    this.pointerMoveHandler = (pointer: Phaser.Input.Pointer) => {
      if (!this.crossbow || !this.isActive || !this.isPulling) return;

      const crossbowData = this.crossbow.getData('graphics');
      const dx = pointer.x - crossbowData.x;
      const dy = pointer.y - crossbowData.y;
      
      // Calculate pull distance (how far from crossbow)
      const distance = Math.sqrt(dx * dx + dy * dy);
      this.pullDistance = Math.min(distance, this.maxPullDistance);
      
      // Calculate aim angle (OPPOSITE direction - from pointer to crossbow)
      // This makes pulling down/away feel natural
      this.aimAngle = Math.atan2(-dy, -dx);
      
      // Only allow aiming upward (angle between -PI and 0)
      if (this.aimAngle > 0) {
        this.aimAngle = 0; // Horizontal right
      } else if (this.aimAngle < -Math.PI) {
        this.aimAngle = -Math.PI; // Horizontal left
      }
      
      // Rotate crossbow to aim
      crossbowData.setRotation(this.aimAngle);
      
      // Update bowstring visualization
      this.updateBowString();
    };
    scene.input.on('pointermove', this.pointerMoveHandler);

    // Release to shoot
    this.pointerUpHandler = () => {
      if (!this.crossbow || !this.isActive || !this.isPulling) return;

      this.isPulling = false;
      
      // Only shoot if pulled enough (at least 20 pixels)
      if (this.pullDistance >= 20) {
        this.shoot();
      }
      
      // Clear bowstring
      this.crossbowString?.clear();
      this.pullDistance = 0;
    };
    scene.input.on('pointerup', this.pointerUpHandler);
  }

  private updateBowString() {
    if (!this.crossbow || !this.crossbowString) return;

    const crossbowData = this.crossbow.getData('graphics');
    
    // Rotate the crossbow to match aim direction
    // Add 90 degrees offset since sprite points right in image but we want it to point up initially
    crossbowData.setRotation(this.aimAngle + Math.PI / 2);
    
    // Calculate pull back position (BEHIND the crossbow, opposite of aim)
    const pullBackX = crossbowData.x - Math.cos(this.aimAngle) * this.pullDistance;
    const pullBackY = crossbowData.y - Math.sin(this.aimAngle) * this.pullDistance;
    
    // Clear and redraw string
    this.crossbowString.clear();
    
    // Draw the bowstring as two lines from crossbow edges to pull point
    this.crossbowString.lineStyle(2, 0x654321, 0.8);
    
    // Left string (perpendicular to aim direction)
    const leftX = crossbowData.x + Math.cos(this.aimAngle + Math.PI / 2) * 10;
    const leftY = crossbowData.y + Math.sin(this.aimAngle + Math.PI / 2) * 10;
    this.crossbowString.lineBetween(leftX, leftY, pullBackX, pullBackY);
    
    // Right string (perpendicular to aim direction)
    const rightX = crossbowData.x + Math.cos(this.aimAngle - Math.PI / 2) * 10;
    const rightY = crossbowData.y + Math.sin(this.aimAngle - Math.PI / 2) * 10;
    this.crossbowString.lineBetween(rightX, rightY, pullBackX, pullBackY);
    
    // Draw arrow being pulled back (horizontal arrow)
    this.crossbowString.fillStyle(0xff6b6b, 0.8);
    this.crossbowString.save();
    this.crossbowString.translateCanvas(pullBackX, pullBackY);
    this.crossbowString.rotateCanvas(this.aimAngle);
    // Draw arrow pointing right
    this.crossbowString.fillRect(0, -2, 15, 4);
    this.crossbowString.fillTriangle(15, 0, 11, -3, 11, 3);
    this.crossbowString.restore();
  }

  private shoot() {
    const { scene } = this.options;
    if (!this.crossbow) return;

    const crossbowData = this.crossbow.getData('graphics');
    
    // Create arrow pointing right (it will be rotated)
    const graphics = scene.add.graphics();
    graphics.fillStyle(0xff6b6b, 1);
    // Arrow body (horizontal)
    graphics.fillRect(0, -2, 20, 4);
    // Arrow tip (pointing right)
    graphics.fillTriangle(20, 0, 16, -4, 16, 4);
    
    const arrowContainer = scene.add.container(crossbowData.x, crossbowData.y, [graphics]);
    arrowContainer.setRotation(this.aimAngle);
    
    this.arrow = scene.add.sprite(crossbowData.x, crossbowData.y, '');
    this.arrow.setVisible(false); // Hide sprite, use graphics instead
    this.arrow.setData('graphics', arrowContainer);
    
    // Arrow speed based on pull distance (min 300, max 600)
    const baseSpeed = 300;
    const speedMultiplier = this.pullDistance / this.maxPullDistance;
    const speed = baseSpeed + (300 * speedMultiplier);
    
    const vx = Math.cos(this.aimAngle) * speed;
    const vy = Math.sin(this.aimAngle) * speed;
    
    this.container.add(arrowContainer);
    
    // Animate arrow
    this.arrowTween = scene.tweens.add({
      targets: arrowContainer,
      x: crossbowData.x + vx,
      y: crossbowData.y + vy,
      duration: 1000,
      onUpdate: () => {
        this.checkArrowCollision();
      },
      onComplete: () => {
        // Arrow missed
        arrowContainer.destroy();
        this.arrow = undefined;
        this.arrowTween = undefined;
        this.handleMiss();
      }
    });
  }

  private checkArrowCollision() {
    if (!this.arrow) return;

    const arrowData = this.arrow.getData('graphics');
    if (!arrowData) return; // Arrow graphics was destroyed
    
    const arrowBounds = new Phaser.Geom.Circle(arrowData.x, arrowData.y, 5);

    for (const bubble of this.bubbles) {
      const bubbleData = bubble.getData('graphics');
      if (!bubbleData) continue; // Bubble was destroyed
      
      const bubbleBounds = new Phaser.Geom.Circle(bubbleData.x, bubbleData.y, 30);

      if (Phaser.Geom.Intersects.CircleToCircle(arrowBounds, bubbleBounds)) {
        this.hitBubble(bubble);
        return;
      }
    }
  }

  private hitBubble(bubble: Phaser.Physics.Arcade.Sprite) {
    if (!this.isActive) return;

    const isCorrect = bubble.getData('isCorrect');
    
    // Stop the arrow tween to prevent handleMiss from being called
    if (this.arrowTween) {
      this.arrowTween.stop();
      this.arrowTween = undefined;
    }
    
    // Destroy arrow
    const arrowData = this.arrow?.getData('graphics');
    arrowData?.destroy();
    this.arrow = undefined;

    // Pop bubble animation
    const bubbleData = bubble.getData('graphics');
    const popTween = this.options.scene.tweens.add({
      targets: bubbleData,
      scale: 1.5,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        bubbleData.destroy();
        bubble.destroy();
        // Remove from tracked tweens
        const index = this.bubblePopTweens.indexOf(popTween);
        if (index > -1) {
          this.bubblePopTweens.splice(index, 1);
        }
      }
    });
    this.bubblePopTweens.push(popTween);

    if (isCorrect) {
      // Success! Remove arrow icon and trigger win
      this.removeArrowIcon();
      this.arrowsRemaining--;
      this.handleCorrect();
    } else {
      // Wrong bubble - remove arrow and check if failed
      this.removeArrowIcon();
      this.arrowsRemaining--;
      this.handleIncorrect();
    }
  }

  private handleCorrect() {
    this.isActive = false;
    this.options.onCorrect();
    // Don't destroy here - the onCorrect callback calls hide() which destroys this
  }

  private handleIncorrect() {
    this.wrongAttempts++;
    
    // Fail after 2 wrong hits
    if (this.wrongAttempts >= this.maxWrongAttempts) {
      this.isActive = false;
      this.options.onIncorrect();
      // Don't destroy here - the onIncorrect callback calls hide() which destroys this
      return;
    }
    
    // Also fail if out of arrows
    if (this.arrowsRemaining <= 0) {
      this.isActive = false;
      this.options.onIncorrect();
      // Don't destroy here - the onIncorrect callback calls hide() which destroys this
    }
  }

  private handleMiss() {
    // Remove arrow icon
    this.removeArrowIcon();
    this.arrowsRemaining--;
    
    // Fail if out of arrows
    if (this.arrowsRemaining <= 0) {
      this.isActive = false;
      this.options.onIncorrect();
      // Don't destroy here - the onIncorrect callback calls hide() which destroys this
    }
  }

  private updateBubbles() {
    const { bounds } = this.options;
    
    // Update bubble graphics to match physics sprites and handle bounds
    for (const bubble of this.bubbles) {
      const bubbleData = bubble.getData('graphics');
      if (!bubbleData || !bubble.body) continue;

      bubbleData.setPosition(bubble.x, bubble.y);

      // Manual bounds checking
      const radius = 30;
      const body = bubble.body as Phaser.Physics.Arcade.Body;
      
      if (bubble.x < bounds.x + radius) {
        bubble.x = bounds.x + radius;
        bubble.setVelocityX(Math.abs(body.velocity.x));
      } else if (bubble.x > bounds.x + bounds.width - radius) {
        bubble.x = bounds.x + bounds.width - radius;
        bubble.setVelocityX(-Math.abs(body.velocity.x));
      }

      if (bubble.y < bounds.y + radius) {
        bubble.y = bounds.y + radius;
        bubble.setVelocityY(Math.abs(body.velocity.y));
      } else if (bubble.y > bounds.y + bounds.height * 0.7 - radius) {
        bubble.y = bounds.y + bounds.height * 0.7 - radius;
        bubble.setVelocityY(-Math.abs(body.velocity.y));
      }
    }
  }

  private generateWrongAnswers(correctAnswer: number): number[] {
    const wrong: number[] = [];
    const range = Math.abs(correctAnswer) + 10;
    
    while (wrong.length < 3) {
      const offset = Phaser.Math.Between(-range, range);
      const wrongAnswer = correctAnswer + offset;
      
      if (wrongAnswer !== correctAnswer && !wrong.includes(wrongAnswer)) {
        wrong.push(wrongAnswer);
      }
    }
    
    return wrong;
  }

  getGameObjects(): Phaser.GameObjects.GameObject[] {
    return this.container.getAll();
  }

  destroy() {
    // Remove input listeners
    if (this.pointerDownHandler) {
      this.options.scene.input.off('pointerdown', this.pointerDownHandler);
    }
    if (this.pointerMoveHandler) {
      this.options.scene.input.off('pointermove', this.pointerMoveHandler);
    }
    if (this.pointerUpHandler) {
      this.options.scene.input.off('pointerup', this.pointerUpHandler);
    }
    
    // Remove update listener
    this.options.scene.events.off('update', this.updateBubbles, this);
    
    // Destroy bubble collider
    if (this.bubbleCollider) {
      this.bubbleCollider.destroy();
      this.bubbleCollider = undefined;
    }
    
    // Destroy all bubbles and disable their physics bodies
    this.bubbles.forEach(b => {
      const bubbleGraphics = b.getData('graphics');
      if (bubbleGraphics) {
        bubbleGraphics.destroy();
      }
      // Disable physics body before destroying
      if (b.body) {
        this.options.scene.physics.world.disable(b);
      }
      b.destroy();
    });
    this.bubbles = [];
    
    // Destroy arrow icons
    this.arrowIcons.forEach(icon => icon.destroy());
    this.arrowIcons = [];
    
    // Stop arrow tween
    if (this.arrowTween) {
      this.arrowTween.stop();
      this.arrowTween = undefined;
    }
    
    // Stop all bubble pop tweens
    this.bubblePopTweens.forEach(tween => {
      if (tween && tween.isPlaying()) {
        tween.stop();
      }
    });
    this.bubblePopTweens = [];
    
    // Clear and destroy bowstring
    if (this.crossbowString) {
      this.crossbowString.clear();
      this.crossbowString.destroy();
      this.crossbowString = undefined;
    }
    
    // Destroy crossbow
    if (this.crossbow) {
      const crossbowGraphics = this.crossbow.getData('graphics');
      if (crossbowGraphics) {
        crossbowGraphics.destroy();
      }
      this.crossbow.destroy();
      this.crossbow = undefined;
    }
    
    // Destroy arrow
    if (this.arrow) {
      const arrowGraphics = this.arrow.getData('graphics');
      if (arrowGraphics) {
        arrowGraphics.destroy();
      }
      this.arrow.destroy();
      this.arrow = undefined;
    }
    
    // Destroy the main container
    if (this.container) {
      this.container.destroy(true);
    }
  }
}
