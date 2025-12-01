import MenuScene from './scene/MenuScene.js'; 
import MainScene from './scene/MainScene.js';

const config = {
  type: Phaser.AUTO,

  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container'
  },

  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },

  scene: [MenuScene, MainScene]
};

const game = new Phaser.Game(config);
