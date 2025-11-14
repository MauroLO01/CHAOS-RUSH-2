import MenuScene from './scene/MenuScene.js'; 
import MainScene from './scene/MainScene.js';

const config = {
  type: Phaser.AUTO,
  width: '100%',
  height: '100%',
  autoCenter: Phaser.Scale.CENTER_BOTH,
  mode: Phaser.Scale.RESIZE,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false 
    }
  },
  scene: [MenuScene, MainScene]
};

const game = new Phaser.Game(config);