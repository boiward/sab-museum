import { Game } from './Game.js';

const canvas = document.getElementById('canvas');
const game   = new Game(canvas);

game.init().catch(console.error);

// Expose globally for debugging / scripting in the browser console
window.game = game;
