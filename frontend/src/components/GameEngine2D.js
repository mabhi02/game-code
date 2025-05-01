import React, { useEffect, useRef, useState } from 'react';
import './GameEngine2D.css';

// Default sprite assets as fallback
const DEFAULT_SPRITES = {
  PLAYER: '🧙‍♂️',
  TREE: '🌳',
  ROCK: '🪨',
  CHEST: '🎁',
  NPC: '👨‍🌾',
  MERCHANT: '👨‍💼',
  ENEMY: '👺',
  WATER: '🌊',
  GRASS: '🟢',
  PATH: '🟤',
  WALL: '🧱',
  DOOR: '🚪',
  POTION: '🧪',
  SWORD: '⚔️',
  SHIELD: '🛡️',
  KEY: '🗝️',
  HEART: '❤️',
  GOLD: '💰',
  HOUSE: '🏠',
  BRIDGE: '🌉'
};

const GameEngine2D = ({ player, gameState, onAction, loading, initialGameData }) => {
  const canvasRef = useRef(null);
  const [playerPos, setPlayerPos] = useState({ x: 5, y: 5 });
  const [gameMap, setGameMap] = useState([]);
  const [entities, setEntities] = useState([]);
  const [message, setMessage] = useState('');
  const [commandInput, setCommandInput] = useState('');
  const [sprites, setSprites] = useState(DEFAULT_SPRITES);
  const [worldTheme, setWorldTheme] = useState('');
  const inputRef = useRef(null);

  // Initialize sprites from the game data
  useEffect(() => {
    if (initialGameData && initialGameData.spriteSet) {
      // Merge the provided sprite set with default sprites as fallback
      setSprites({
        ...DEFAULT_SPRITES,
        ...initialGameData.spriteSet
      });
    }
    
    if (initialGameData && initialGameData.worldTheme) {
      setWorldTheme(initialGameData.worldTheme);
    }
    
    if (initialGameData && initialGameData.narrative) {
      setMessage(initialGameData.narrative.split('.')[0] + '.');
    }
  }, [initialGameData]);

  // Generate a map based on the game state and sprite set
  useEffect(() => {
    const generateMap = () => {
      // Create a map size based on the world theme/complexity
      const mapSize = 17;
      
      // Get terrain sprites or use defaults
      const terrainSprites = sprites.TERRAIN || {
        GRASS: sprites.GRASS || DEFAULT_SPRITES.GRASS,
        PATH: sprites.PATH || DEFAULT_SPRITES.PATH,
        WATER: sprites.WATER || DEFAULT_SPRITES.WATER,
        WALL: sprites.WALL || DEFAULT_SPRITES.WALL
      };
      
      // Initialize with the primary terrain
      const map = Array(mapSize).fill().map(() => 
        Array(mapSize).fill(terrainSprites.GRASS || DEFAULT_SPRITES.GRASS)
      );
      
      // Add paths in a pattern suitable for the theme
      const addPaths = () => {
        // Main path
        for (let i = 3; i < mapSize - 3; i++) {
          map[7][i] = terrainSprites.PATH || DEFAULT_SPRITES.PATH;
        }
        
        // Secondary path
        for (let i = 4; i < mapSize - 4; i++) {
          map[i][mapSize - 5] = terrainSprites.PATH || DEFAULT_SPRITES.PATH;
        }
        
        // Connecting paths
        for (let i = 7; i < mapSize - 5; i++) {
          map[Math.floor(mapSize/2)][i] = terrainSprites.PATH || DEFAULT_SPRITES.PATH;
        }
      };
      
      // Add water features
      const addWater = () => {
        // Add border water
        for (let i = 0; i < mapSize; i++) {
          map[0][i] = terrainSprites.WATER || DEFAULT_SPRITES.WATER;
          map[mapSize - 1][i] = terrainSprites.WATER || DEFAULT_SPRITES.WATER;
          map[i][0] = terrainSprites.WATER || DEFAULT_SPRITES.WATER;
          map[i][mapSize - 1] = terrainSprites.WATER || DEFAULT_SPRITES.WATER;
        }
        
        // Add a river or lake
        const lakeX = Math.floor(mapSize * 0.3);
        const lakeY = Math.floor(mapSize * 0.7);
        const lakeSize = 3;
        
        for (let y = Math.max(1, lakeY - lakeSize); y <= Math.min(mapSize - 2, lakeY + lakeSize); y++) {
          for (let x = Math.max(1, lakeX - lakeSize); x <= Math.min(mapSize - 2, lakeX + lakeSize); x++) {
            if (Math.sqrt(Math.pow(x - lakeX, 2) + Math.pow(y - lakeY, 2)) <= lakeSize) {
              map[y][x] = terrainSprites.WATER || DEFAULT_SPRITES.WATER;
            }
          }
        }
      };
      
      // Add terrain features (trees, rocks, etc.)
      const addTerrainFeatures = () => {
        const featureSprite = sprites.TREE || DEFAULT_SPRITES.TREE;
        const rockSprite = sprites.ROCK || DEFAULT_SPRITES.ROCK;
        
        // Forest area
        const forestX = Math.floor(mapSize * 0.7);
        const forestY = Math.floor(mapSize * 0.3);
        
        for (let y = forestY - 3; y <= forestY + 3; y++) {
          for (let x = forestX - 3; x <= forestX + 3; x++) {
            if (y >= 1 && y < mapSize - 1 && x >= 1 && x < mapSize - 1) {
              if (Math.random() < 0.7 && map[y][x] === terrainSprites.GRASS) {
                map[y][x] = featureSprite;
              }
            }
          }
        }
        
        // Rocky area
        const rockyX = Math.floor(mapSize * 0.4);
        const rockyY = Math.floor(mapSize * 0.4);
        
        for (let y = rockyY - 2; y <= rockyY + 2; y++) {
          for (let x = rockyX - 2; x <= rockyX + 2; x++) {
            if (y >= 1 && y < mapSize - 1 && x >= 1 && x < mapSize - 1) {
              if (Math.random() < 0.6 && map[y][x] === terrainSprites.GRASS) {
                map[y][x] = rockSprite;
              }
            }
          }
        }
        
        // Add some random features
        for (let i = 0; i < 15; i++) {
          const x = 1 + Math.floor(Math.random() * (mapSize - 2));
          const y = 1 + Math.floor(Math.random() * (mapSize - 2));
          if (map[y][x] === terrainSprites.GRASS) {
            map[y][x] = Math.random() > 0.5 ? featureSprite : rockSprite;
          }
        }
      };
      
      // Add structures (buildings, special locations)
      const addStructures = () => {
        const houseSprite = sprites.HOUSE || DEFAULT_SPRITES.HOUSE;
        const specialSprite = sprites.SPECIAL?.LANDMARK || DEFAULT_SPRITES.DOOR;
        
        // Add a house/starting point
        const houseX = 5;
        const houseY = 5;
        map[houseY][houseX] = houseSprite;
        
        // Add a special landmark
        const landmarkX = mapSize - 6;
        const landmarkY = mapSize - 6;
        map[landmarkY][landmarkX] = specialSprite;
      };
      
      // Generate the map
      addPaths();
      addWater();
      addTerrainFeatures();
      addStructures();
      
      setGameMap(map);
      
      // Generate entities based on the game state and sprites
      generateEntities(map, mapSize);
    };
    
    // Generate entities for the game world
    const generateEntities = (map, mapSize) => {
      const newEntities = [];
      
      // Get entity sprites
      const npcSprite = sprites.NPC || DEFAULT_SPRITES.NPC;
      const merchantSprite = sprites.MERCHANT || DEFAULT_SPRITES.MERCHANT;
      const enemySprite = sprites.ENEMY || DEFAULT_SPRITES.ENEMY;
      const chestSprite = sprites.CHEST || DEFAULT_SPRITES.CHEST;
      
      // Add NPCs
      const addNPC = (x, y, type, dialog) => {
        if (isValidPosition(x, y, map)) {
          newEntities.push({
            type: 'npc',
            sprite: type === 'merchant' ? merchantSprite : npcSprite,
            x,
            y,
            dialog: dialog
          });
        }
      };
      
      // Add several NPCs
      addNPC(9, 5, 'villager', "Welcome, traveler! Our world has many secrets to discover.");
      addNPC(6, 7, 'merchant', "Looking to trade? I've got rare items if you have the coin.");
      
      // Add enemies based on game state
      if (gameState && gameState.enemies) {
        // Add predefined enemies from game state
        gameState.enemies.forEach(enemy => {
          // Find a valid position
          let x, y;
          do {
            x = 1 + Math.floor(Math.random() * (mapSize - 2));
            y = 1 + Math.floor(Math.random() * (mapSize - 2));
          } while (!isValidPosition(x, y, map) || entityExists(x, y, newEntities));
          
          newEntities.push({
            type: 'enemy',
            sprite: enemy.sprite || enemySprite,
            name: enemy.name || 'Enemy',
            x,
            y,
            health: enemy.health || 10,
          });
        });
      } else {
        // Add some default enemies
        for (let i = 0; i < 3; i++) {
          let x, y;
          do {
            x = 1 + Math.floor(Math.random() * (mapSize - 2));
            y = 1 + Math.floor(Math.random() * (mapSize - 2));
          } while (!isValidPosition(x, y, map) || entityExists(x, y, newEntities));
          
          newEntities.push({
            type: 'enemy',
            sprite: enemySprite,
            x,
            y,
            health: 10,
          });
        }
      }
      
      // Add items
      const itemTypes = [
        { sprite: sprites.POTION || DEFAULT_SPRITES.POTION, name: 'healing potion' },
        { sprite: sprites.KEY || DEFAULT_SPRITES.KEY, name: 'mysterious key' },
        { sprite: sprites.SWORD || DEFAULT_SPRITES.SWORD, name: 'sword' },
        { sprite: sprites.SHIELD || DEFAULT_SPRITES.SHIELD, name: 'shield' },
        { sprite: sprites.GOLD || DEFAULT_SPRITES.GOLD, name: 'gold coins' }
      ];
      
      for (let i = 0; i < 5; i++) {
        let x, y;
        do {
          x = 1 + Math.floor(Math.random() * (mapSize - 2));
          y = 1 + Math.floor(Math.random() * (mapSize - 2));
        } while (!isValidPosition(x, y, map) || entityExists(x, y, newEntities));
        
        const item = itemTypes[i % itemTypes.length];
        newEntities.push({
          type: 'item',
          sprite: item.sprite,
          name: item.name,
          x,
          y,
        });
      }
      
      // Add a chest with treasure
      let chestX, chestY;
      do {
        chestX = 1 + Math.floor(Math.random() * (mapSize - 2));
        chestY = 1 + Math.floor(Math.random() * (mapSize - 2));
      } while (!isValidPosition(chestX, chestY, map) || entityExists(chestX, chestY, newEntities));
      
      newEntities.push({
        type: 'chest',
        sprite: chestSprite,
        x: chestX,
        y: chestY,
        contents: 'magical artifact'
      });
      
      setEntities(newEntities);
    };
    
    // Check if a position is valid for entity placement
    const isValidPosition = (x, y, map) => {
      if (x < 0 || y < 0 || x >= map[0].length || y >= map.length) return false;
      
      const cell = map[y][x];
      const grassSprite = sprites.TERRAIN?.GRASS || sprites.GRASS || DEFAULT_SPRITES.GRASS;
      const pathSprite = sprites.TERRAIN?.PATH || sprites.PATH || DEFAULT_SPRITES.PATH;
      
      return cell === grassSprite || cell === pathSprite;
    };
    
    // Check if an entity already exists at position
    const entityExists = (x, y, entities) => {
      return entities.some(e => e.x === x && e.y === y);
    };
    
    generateMap();
  }, [gameState, sprites]);

  // Handle keyboard input for player movement using WASD
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (loading) return;
      
      // Don't handle movement keys when the input is focused
      if (document.activeElement === inputRef.current) {
        return;
      }
      
      let newX = playerPos.x;
      let newY = playerPos.y;
      let action = null;
      
      switch (e.key.toLowerCase()) {
        case 'w':
          newY = Math.max(0, playerPos.y - 1);
          action = 'move north';
          break;
        case 's':
          newY = Math.min(gameMap.length - 1, playerPos.y + 1);
          action = 'move south';
          break;
        case 'a':
          newX = Math.max(0, playerPos.x - 1);
          action = 'move west';
          break;
        case 'd':
          newX = Math.min(gameMap[0]?.length - 1 || 10, playerPos.x + 1);
          action = 'move east';
          break;
        case 'e':
          action = 'examine surroundings';
          break;
        case 'f':
          action = 'interact';
          // Focus the command input when pressing F to interact
          if (inputRef.current) {
            inputRef.current.focus();
          }
          break;
        default:
          return;
      }
      
      // Check if the new position is walkable
      if (gameMap[newY] && (
          gameMap[newY][newX] === (sprites.TERRAIN?.GRASS || sprites.GRASS || DEFAULT_SPRITES.GRASS) || 
          gameMap[newY][newX] === (sprites.TERRAIN?.PATH || sprites.PATH || DEFAULT_SPRITES.PATH) || 
          gameMap[newY][newX] === (sprites.TERRAIN?.BRIDGE || sprites.BRIDGE || DEFAULT_SPRITES.BRIDGE)
      )) {
        setPlayerPos({ x: newX, y: newY });
      }
      
      // Check for entity interactions
      const entity = entities.find(e => e.x === newX && e.y === newY);
      if (entity) {
        if (entity.type === 'npc') {
          setMessage(entity.dialog);
        } else if (entity.type === 'item') {
          const itemName = entity.name || entity.sprite;
          setMessage(`You found a ${itemName}!`);
          // Remove the item from the map
          setEntities(entities.filter(e => e.x !== newX || e.y !== newY));
          // Add it to inventory via the API
          if (action) onAction(`pick up ${itemName}`);
        } else if (entity.type === 'enemy') {
          setMessage(`Fighting ${entity.name || 'enemy'}!`);
          if (action) onAction(`attack ${entity.name || entity.sprite}`);
        } else if (entity.type === 'chest') {
          setMessage(`You found a chest containing ${entity.contents}!`);
          if (action) onAction(`open chest`);
        }
      } else {
        // Clear message if no entity and we're moving
        if ((newX !== playerPos.x || newY !== playerPos.y) && action.startsWith('move')) {
          setMessage('');
        }
      }
      
      // Send the action to the API if it's a valid movement or interaction
      if (action && (newX !== playerPos.x || newY !== playerPos.y || action === 'examine surroundings' || action === 'interact')) {
        onAction(action);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPos, gameMap, entities, loading, onAction, sprites]);

  // Handle command submission
  const handleCommandSubmit = (e) => {
    e.preventDefault();
    if (!commandInput.trim() || loading) return;
    
    onAction(commandInput);
    setCommandInput('');
    
    // Blur the input to allow movement controls again
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  // Draw the game on the canvas with better visuals
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameMap.length) return;
    
    const ctx = canvas.getContext('2d');
    const tileSize = 42;
    
    // Calculate visible area dimensions
    const visibleRadius = 5;
    const visibleWidth = visibleRadius * 2 + 1;
    const visibleHeight = visibleRadius * 2 + 1;
    
    canvas.width = visibleWidth * tileSize;
    canvas.height = visibleHeight * tileSize;
    
    // Determine visible area (centered on player)
    const startX = Math.max(0, playerPos.x - visibleRadius);
    const endX = Math.min(gameMap[0]?.length - 1 || 0, playerPos.x + visibleRadius);
    const startY = Math.max(0, playerPos.y - visibleRadius);
    const endY = Math.min(gameMap.length - 1, playerPos.y + visibleRadius);
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Add a background based on world theme
    const getBgColor = () => {
      if (worldTheme.includes('dark') || worldTheme.includes('night')) return '#121a2e';
      if (worldTheme.includes('desert')) return '#8b7d6b';
      if (worldTheme.includes('snow') || worldTheme.includes('ice')) return '#d4f1f9';
      if (worldTheme.includes('volcano') || worldTheme.includes('fire')) return '#3a1c0d';
      return '#203c56'; // default
    };
    
    ctx.fillStyle = getBgColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw map tiles with improved visuals
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const drawX = (x - startX) * tileSize;
        const drawY = (y - startY) * tileSize;
        
        // Add a slight shadow/depth effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(drawX + 2, drawY + 2, tileSize - 4, tileSize - 4);
        
        // Draw the tile
        ctx.font = `${tileSize - 6}px Arial`;
        ctx.fillText(gameMap[y][x], drawX + 3, drawY + tileSize - 3);
      }
    }
    
    // Draw entities with slight animation effects
    const timestamp = Date.now();
    entities.forEach(entity => {
      if (entity.x >= startX && entity.x <= endX && entity.y >= startY && entity.y <= endY) {
        const drawX = (entity.x - startX) * tileSize;
        const drawY = (entity.y - startY) * tileSize;
        
        // Add a subtle breathing effect for NPCs and enemies
        let offsetY = 0;
        if (entity.type === 'npc' || entity.type === 'enemy') {
          offsetY = Math.sin(timestamp / 500) * 3;
        } else if (entity.type === 'item' || entity.type === 'chest') {
          // Add a slight glow/pulse for items
          ctx.fillStyle = 'rgba(255, 255, 140, 0.2)';
          ctx.beginPath();
          ctx.arc(drawX + tileSize/2, drawY + tileSize/2, 
                 tileSize/2 + Math.sin(timestamp / 500) * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.font = `${tileSize - 6}px Arial`;
        ctx.fillText(entity.sprite, drawX + 3, drawY + tileSize - 3 + offsetY);
      }
    });
    
    // Draw player with a slight breathing effect
    const playerDrawX = (playerPos.x - startX) * tileSize;
    const playerDrawY = (playerPos.y - startY) * tileSize;
    const playerBreathe = Math.sin(timestamp / 500) * 2;
    
    // Add a subtle highlight around the player
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(playerDrawX + tileSize/2, playerDrawY + tileSize/2, tileSize/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw player sprite
    const playerSprite = sprites.PLAYER || DEFAULT_SPRITES.PLAYER;
    ctx.font = `${tileSize - 4}px Arial`;
    ctx.fillText(playerSprite, playerDrawX + 3, playerDrawY + tileSize - 3 + playerBreathe);
    
    // Request animation frame for smooth animations
    requestAnimationFrame(() => {
      if (canvas) {
        // This will trigger a re-render
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, 1, 1);
      }
    });
    
  }, [gameMap, entities, playerPos, sprites, worldTheme]);

  return (
    <div className="game-engine-container">
      <canvas 
        ref={canvasRef} 
        className="game-canvas"
        tabIndex={0}
      />
      
      {message && (
        <div className="game-message">
          {message}
        </div>
      )}
      
      <div className="game-controls">
        <div className="game-controls-info">
          <p>Use WASD to move, E to examine, F to interact</p>
          {loading && <div className="loading-indicator">Processing action...</div>}
        </div>
        
        <form onSubmit={handleCommandSubmit} className="command-form">
          <input
            ref={inputRef}
            type="text"
            className="command-input"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Type a command... (press Enter to submit)"
            disabled={loading}
          />
          <button type="submit" className="command-button" disabled={loading}>
            Execute
          </button>
        </form>
      </div>
    </div>
  );
};

export default GameEngine2D; 