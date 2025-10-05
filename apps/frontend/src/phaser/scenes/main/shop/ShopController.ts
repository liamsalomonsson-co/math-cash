import Phaser from 'phaser';
import type { GameSession } from '../../../../lib';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  onPurchase?: (session: GameSession) => void;
}

interface ShopCallbacks {
  onPurchase: (item: ShopItem, session: GameSession) => void;
  getSession: () => GameSession | null;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'hint-pack',
    name: 'Hint Pack',
    description: 'Get helpful hints for 3 challenges',
    price: 50,
    icon: '💡',
  },
  {
    id: 'streak-boost',
    name: 'Streak Boost',
    description: 'Double your next streak reward',
    price: 100,
    icon: '⚡',
  },
  {
    id: 'coin-multiplier',
    name: 'Coin Multiplier',
    description: 'Earn 2x coins for 5 challenges',
    price: 150,
    icon: '💰',
  },
  {
    id: 'skip-challenge',
    name: 'Challenge Skip',
    description: 'Skip one difficult challenge',
    price: 200,
    icon: '⏭️',
  },
];

export class ShopController {
  private container?: Phaser.GameObjects.Container;
  private overlay?: Phaser.GameObjects.Rectangle;
  private shopButton?: Phaser.GameObjects.Container;
  private isOpen = false;
  private callbacks?: ShopCallbacks;

  constructor(private readonly scene: Phaser.Scene) {}

  initialize(callbacks: ShopCallbacks) {
    this.callbacks = callbacks;
    this.createShopButton();
  }

  destroy() {
    this.container?.destroy(true);
    this.overlay?.destroy();
    this.shopButton?.destroy(true);
    this.container = undefined;
    this.overlay = undefined;
    this.shopButton = undefined;
    this.callbacks = undefined;
  }

  setVisible(visible: boolean) {
    this.shopButton?.setVisible(visible);
    if (!visible && this.isOpen) {
      this.hide();
    }
  }

  isActive(): boolean {
    return this.isOpen;
  }

  private createShopButton() {
    const canvas = this.scene.game.canvas;
    const parent = canvas?.parentElement;
    const actualWidth = parent?.clientWidth ?? this.scene.scale.width;
    const isMobile = actualWidth < 500;
    
    // Scale button based on screen size
    const buttonWidth = isMobile ? 50 : 70;
    const buttonHeight = isMobile ? 70 : 100;
    const iconSize = isMobile ? '24px' : '36px';
    const labelSize = isMobile ? '10px' : '14px';
    const iconY = isMobile ? -8 : -12;
    const labelY = isMobile ? 16 : 24;
    
    const buttonX = 10;
    const buttonY = isMobile ? 80 : 100;

    const container = this.scene.add.container(buttonX, buttonY);
    container.setDepth(15);

    // Button background - responsive size for mobile
    const background = this.scene.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x4cc9f0, 0.9);
    background.setStrokeStyle(isMobile ? 2 : 3, 0xffffff, 0.6);
    background.setOrigin(0, 0.5);

    // Shop icon - responsive size
    const icon = this.scene.add.text(buttonWidth / 2, iconY, '🛒', {
      fontSize: iconSize,
    });
    icon.setOrigin(0.5);

    // Label - responsive text
    const label = this.scene.add.text(buttonWidth / 2, labelY, 'SHOP', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: labelSize,
      color: '#ffffff',
      fontStyle: 'bold',
    });
    label.setOrigin(0.5);

    container.add([background, icon, label]);

    // Make interactive
    background.setInteractive({ useHandCursor: true });
    background.on('pointerdown', () => {
      if (this.isOpen) {
        this.hide();
      } else {
        this.show();
      }
    });

    background.on('pointerover', () => {
      background.setScale(1.05);
    });

    background.on('pointerout', () => {
      background.setScale(1);
    });

    this.shopButton = container;
  }

  private show() {
    if (this.isOpen || !this.callbacks) {
      return;
    }

    this.isOpen = true;

    // Create overlay
    const overlay = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      this.scene.scale.width,
      this.scene.scale.height,
      0x000000,
      0.7
    );
    overlay.setDepth(25);
    overlay.setInteractive(); // Block clicks to game behind overlay
    this.overlay = overlay;

    // Create shop panel
    const panelWidth = Math.min(500, this.scene.scale.width - 40);
    const panelHeight = Math.min(600, this.scene.scale.height - 40);
    const panelX = this.scene.scale.width / 2;
    const panelY = this.scene.scale.height / 2;

    const container = this.scene.add.container(panelX, panelY);
    container.setDepth(30);

    // Panel background
    const background = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x1b2d44, 0.98);
    background.setStrokeStyle(3, 0x4cc9f0, 0.8);
    background.setInteractive(); // Prevent clicks from passing through
    container.add(background);

    // Title
    const title = this.scene.add.text(0, -panelHeight / 2 + 30, '🛒 SHOP', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '32px',
      color: '#4cc9f0',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    container.add(title);

    // Currency display
    const session = this.callbacks.getSession();
    const currencyText = this.scene.add.text(0, -panelHeight / 2 + 70, `💰 Your Coins: ${session?.player.currency || 0}`, {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '20px',
      color: '#f4d35e',
      fontStyle: 'bold',
    });
    currencyText.setOrigin(0.5);
    container.add(currencyText);

    // Create item list
    const startY = -panelHeight / 2 + 120;
    const itemHeight = 100;
    const itemSpacing = 10;

    SHOP_ITEMS.forEach((item, index) => {
      const itemY = startY + index * (itemHeight + itemSpacing);
      const itemContainer = this.createShopItem(item, itemY, panelWidth - 40, currencyText);
      container.add(itemContainer);
    });

    // Close button
    const closeButton = this.createCloseButton(panelWidth, panelHeight);
    container.add(closeButton);

    this.container = container;
  }

  private createShopItem(item: ShopItem, y: number, width: number, currencyText: Phaser.GameObjects.Text): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, y);

    // Item background
    const background = this.scene.add.rectangle(0, 0, width, 90, 0x2d4263, 0.9);
    background.setStrokeStyle(2, 0x4cc9f0, 0.4);
    container.add(background);

    // Icon
    const icon = this.scene.add.text(-width / 2 + 40, 0, item.icon, {
      fontSize: '36px',
    });
    icon.setOrigin(0.5);
    container.add(icon);

    // Item name
    const nameText = this.scene.add.text(-width / 2 + 80, -15, item.name, {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0, 0.5);
    container.add(nameText);

    // Item description
    const descText = this.scene.add.text(-width / 2 + 80, 10, item.description, {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '14px',
      color: '#cbd5f5',
    });
    descText.setOrigin(0, 0.5);
    container.add(descText);

    // Price and buy button
    const buyButton = this.createBuyButton(item, width, currencyText);
    container.add(buyButton);

    return container;
  }

  private createBuyButton(item: ShopItem, itemWidth: number, currencyText: Phaser.GameObjects.Text): Phaser.GameObjects.Container {
    const container = this.scene.add.container(itemWidth / 2 - 80, 0);

    const buttonWidth = 120;
    const buttonHeight = 40;

    const session = this.callbacks?.getSession();
    const canAfford = (session?.player.currency || 0) >= item.price;

    const background = this.scene.add.rectangle(0, 0, buttonWidth, buttonHeight, canAfford ? 0x43aa8b : 0x666666, 0.9);
    background.setStrokeStyle(2, canAfford ? 0x90ee90 : 0x888888, 0.6);

    const text = this.scene.add.text(0, 0, `${item.price} 💰`, {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '16px',
      color: canAfford ? '#ffffff' : '#aaaaaa',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);

    container.add([background, text]);

    // Always make interactive, but handle disabled state
    background.setInteractive({ useHandCursor: canAfford });

    background.on('pointerdown', () => {
      if (canAfford && this.callbacks && session) {
        this.callbacks.onPurchase(item, session);
        // Update currency display
        currencyText.setText(`💰 Your Coins: ${session.player.currency}`);
        // Refresh the shop to update buy buttons
        this.hide();
        this.show();
      }
    });

    if (canAfford) {
      background.on('pointerover', () => {
        background.setFillStyle(0x52ba9b);
        background.setScale(1.05);
      });

      background.on('pointerout', () => {
        background.setFillStyle(0x43aa8b);
        background.setScale(1);
      });
    }

    return container;
  }

  private createCloseButton(_panelWidth: number, panelHeight: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, panelHeight / 2 - 40);

    const background = this.scene.add.rectangle(0, 0, 120, 40, 0xff6b6b, 0.9);
    background.setStrokeStyle(2, 0xffffff, 0.6);

    const text = this.scene.add.text(0, 0, 'Close', {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);

    container.add([background, text]);

    background.setInteractive({ useHandCursor: true });
    background.on('pointerdown', () => this.hide());

    background.on('pointerover', () => {
      background.setScale(1.05);
    });

    background.on('pointerout', () => {
      background.setScale(1);
    });

    return container;
  }

  hide() {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    this.container?.destroy(true);
    this.overlay?.destroy();
    this.container = undefined;
    this.overlay = undefined;
  }

  handleResize(width: number, height: number) {
    // Recreate shop button with new responsive sizing
    this.shopButton?.destroy(true);
    this.createShopButton();
    
    if (!this.container) {
      return;
    }

    // Update shop modal if open
    const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    overlay.setDepth(25);
    this.overlay?.destroy();
    this.overlay = overlay;

    this.container.setPosition(width / 2, height / 2);
  }
}
