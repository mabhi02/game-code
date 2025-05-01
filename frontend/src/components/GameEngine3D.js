import React, { useEffect, useRef, useState } from 'react';
import './GameEngine3D.css';

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

const GameEngine3D = ({ player, gameState, onAction, loading, initialGameData, asyncLoading }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [playerPos, setPlayerPos] = useState({ x: 5, y: 5 });
  const [gameMap, setGameMap] = useState(() => {
    console.log("Creating initial empty map");
    const emptyMap = Array(17).fill().map(() => Array(17).fill(DEFAULT_SPRITES.GRASS));
    return emptyMap;
  });
  const [entities, setEntities] = useState([]);
  const [message, setMessage] = useState('');
  const [commandInput, setCommandInput] = useState('');
  const [sprites, setSprites] = useState(DEFAULT_SPRITES);
  const [worldTheme, setWorldTheme] = useState('');
  const [cameraAngle, setCameraAngle] = useState(0);
  const [cameraTilt, setCameraTilt] = useState(45);
  const [zoom, setZoom] = useState(1);
  const inputRef = useRef(null);
  const lastFrameTime = useRef(0);
  const animationFrameRef = useRef(null);
  const [showControls, setShowControls] = useState(true);
  
  // Initialize sprites from the game data
  useEffect(() => {
    console.log("Initial Game Data:", initialGameData);
    console.log("Current Game State:", gameState);
    
    if (initialGameData && initialGameData.spriteSet) {
      // Merge the provided sprite set with default sprites as fallback
      console.log("Setting sprites from initialGameData");
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
    
    // Initialize the camera settings based on theme
    if (initialGameData && initialGameData.worldTheme) {
      if (initialGameData.worldTheme.includes('sky') || initialGameData.worldTheme.includes('flying')) {
        setCameraTilt(60);
      } else if (initialGameData.worldTheme.includes('dungeon')) {
        setCameraTilt(35);
      }
    }
    
  }, [initialGameData, gameState]);

  // Generate a map based on the game state and sprite set
  useEffect(() => {
    console.log("Map generation useEffect triggered, gameState:", gameState, "sprites:", sprites);
    
    // Reset entities first
    setEntities([]);
    
    // Ensure we have default sprites even if they're not loaded properly
    if (!sprites || Object.keys(sprites).length === 0) {
      console.log("No sprites detected, using defaults");
      setSprites(DEFAULT_SPRITES);
      return; // Wait for sprites to be set
    }
    
    const generateMap = () => {
      console.log("Generating map with sprites:", sprites);
      // Create a map size based on the world theme/complexity
      const mapSize = 17;
      
      // Get terrain sprites or use defaults
      const terrainSprites = sprites.TERRAIN || {
        GRASS: sprites.GRASS || DEFAULT_SPRITES.GRASS,
        PATH: sprites.PATH || DEFAULT_SPRITES.PATH,
        WATER: sprites.WATER || DEFAULT_SPRITES.WATER,
        WALL: sprites.WALL || DEFAULT_SPRITES.WALL
      };
      
      console.log("Using terrain sprites:", terrainSprites);
      
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
      
      console.log("Map generation complete. Map size:", map.length, "x", map[0].length);
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
            dialog: dialog,
            // Add 3D properties
            height: 1.2,
            elevation: 0,
            bobbing: true
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
            // Add 3D properties
            height: 1.2,
            elevation: 0,
            bobbing: true,
            pulsing: true
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
            // Add 3D properties
            height: 1.2,
            elevation: 0,
            bobbing: true,
            pulsing: true
          });
        }
      }
      
      // Add items
      const itemTypes = [
        { sprite: sprites.POTION || DEFAULT_SPRITES.POTION, name: 'healing potion', height: 0.6, floating: true },
        { sprite: sprites.KEY || DEFAULT_SPRITES.KEY, name: 'mysterious key', height: 0.5, floating: true },
        { sprite: sprites.SWORD || DEFAULT_SPRITES.SWORD, name: 'sword', height: 0.8, rotating: true },
        { sprite: sprites.SHIELD || DEFAULT_SPRITES.SHIELD, name: 'shield', height: 0.8 },
        { sprite: sprites.GOLD || DEFAULT_SPRITES.GOLD, name: 'gold coins', height: 0.5, glowing: true }
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
          // Add 3D properties
          height: item.height || 0.7,
          elevation: 0.1,
          floating: item.floating || false,
          glowing: item.glowing || false,
          rotating: item.rotating || false,
          rotationSpeed: Math.random() * 2 + 1
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
        contents: 'magical artifact',
        // Add 3D properties
        height: 0.8,
        elevation: 0,
        glowing: true
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
    
    // We only want to regenerate when gameState actually changes in a meaningful way
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.version, gameState?.location, sprites]); // Only regenerate when these specific properties change

  // Add an effect to clear the map when component mounts
  useEffect(() => {
    // Reset the map and entities on component mount
    setGameMap([]);
    setEntities([]);
    console.log("2.5D engine mounted - state reset");
    
    return () => {
      console.log("2.5D engine unmounting");
    };
  }, []);

  // Define handleKeyDown outside of useEffect so it can be used by UI elements
  const handleKeyDown = (e) => {
    if (loading) return;
    
    // Don't handle movement keys when the input is focused
    if (document.activeElement === inputRef.current) {
      return;
    }
    
    // Toggle UI with the 'H' key
    if (e.key.toLowerCase() === 'h') {
      setShowControls(prev => !prev);
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
      // Camera controls
      case 'q':
        setCameraAngle(angle => (angle - 15) % 360);
        return;
      case 'r':
        setCameraAngle(angle => (angle + 15) % 360);
        return;
      case 'z':
        setZoom(z => Math.max(0.7, z - 0.1));
        return;
      case 'x':
        setZoom(z => Math.min(2, z + 0.1));
        return;
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
      if ((newX !== playerPos.x || newY !== playerPos.y) && action?.startsWith('move')) {
        setMessage('');
      }
    }
    
    // Send the action to the API if it's a valid movement or interaction
    if (action && (newX !== playerPos.x || newY !== playerPos.y || action === 'examine surroundings' || action === 'interact')) {
      onAction(action);
    }
  };

  // Handle keyboard input for player movement using WASD
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPos, gameMap, entities, loading, onAction, sprites, handleKeyDown]);

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

  // Define the renderFrame function before it's used in useEffect
  const renderFrame = (timestamp) => {
    // Add null checks for the canvas and context
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    
    if (!ctx || !canvas || !gameMap.length) {
      console.log("Render frame skipped - context, canvas, or gameMap missing", {
        hasContext: !!ctx,
        hasCanvas: !!canvas,
        gameMapLength: gameMap?.length || 0
      });
      
      // Schedule next frame if we have a valid canvas reference
      if (canvas) {
        animationFrameRef.current = requestAnimationFrame(renderFrame);
      }
      return;
    }

    lastFrameTime.current = timestamp;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set background color based on world theme
    const getBgColor = () => {
      if (worldTheme?.includes('dark') || worldTheme?.includes('night')) return '#121a2e';
      if (worldTheme?.includes('desert')) return '#8b7d6b';
      if (worldTheme?.includes('snow') || worldTheme?.includes('ice')) return '#d4f1f9';
      if (worldTheme?.includes('volcano') || worldTheme?.includes('fire')) return '#3a1c0d';
      return '#203c56'; // default
    };
    
    ctx.fillStyle = getBgColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw a skybox/horizon if appropriate
    if (cameraTilt < 60) {
      const horizonY = canvas.height * 0.4;
      const gradient = ctx.createLinearGradient(0, 0, 0, horizonY);
      if (worldTheme?.includes('night')) {
        gradient.addColorStop(0, '#05071a');
        gradient.addColorStop(1, '#1a1b4d');
        
        // Draw stars
        ctx.fillStyle = 'white';
        for (let i = 0; i < 100; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * horizonY * 0.8;
          const size = Math.random() * 1.5;
          ctx.fillRect(x, y, size, size);
        }
      } else if (worldTheme?.includes('desert')) {
        gradient.addColorStop(0, '#ffc177');
        gradient.addColorStop(1, '#d68759');
      } else {
        gradient.addColorStop(0, '#8acdff');
        gradient.addColorStop(1, '#c0e6ff');
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, horizonY);
    }

    // Calculate the visible area (centered on player)
    const tileSize = Math.min(canvas.width, canvas.height) / (12 / zoom);
    const visibleRadius = 6;
    
    // Adjust calculations for isometric view
    const isoAngle = cameraAngle * (Math.PI / 180);
    const isoTilt = cameraTilt * (Math.PI / 180);
    
    // Center offset
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Function to convert grid coordinates to screen coordinates
    const gridToScreen = (gridX, gridY, height = 0) => {
      // Adjust for isometric/3D view
      const xOffset = gridX - playerPos.x;
      const yOffset = gridY - playerPos.y;
      
      // Rotate based on camera angle
      const rotatedX = xOffset * Math.cos(isoAngle) - yOffset * Math.sin(isoAngle);
      const rotatedY = xOffset * Math.sin(isoAngle) + yOffset * Math.cos(isoAngle);
      
      // Apply perspective tilt
      const tiltedX = rotatedX;
      const tiltedY = rotatedY * Math.sin(isoTilt);
      
      // Scale by tile size
      const scaledX = tiltedX * tileSize;
      const scaledY = tiltedY * tileSize;
      
      // Apply height effect (makes objects appear to rise from the ground)
      const heightOffset = height * tileSize * 0.7;
      
      return {
        x: centerX + scaledX,
        y: centerY + scaledY - heightOffset
      };
    };
    
    // Determine visible area boundaries
    const mapSize = gameMap.length;
    
    // Sort entities by their y position for proper rendering order
    const sortedEntities = [...entities];
    sortedEntities.sort((a, b) => a.y - b.y);

    // Create a list of all cells to render (terrain + entities)
    const renderList = [];
    
    // Add terrain cells
    for (let y = 0; y < mapSize; y++) {
      for (let x = 0; x < mapSize; x++) {
        // Skip if too far from player
        if (Math.abs(x - playerPos.x) > visibleRadius * 1.5 || 
            Math.abs(y - playerPos.y) > visibleRadius * 1.5) {
          continue;
        }
        
        const terrain = gameMap[y][x];
        const position = gridToScreen(x, y);
        
        // Calculate depth for sorting (further objects drawn first)
        const depth = y * 1000 + x;
        
        renderList.push({
          type: 'terrain',
          sprite: terrain,
          x: position.x,
          y: position.y,
          gridX: x,
          gridY: y,
          depth: depth,
          size: tileSize,
          height: 0
        });
      }
    }
    
    // Add entities
    sortedEntities.forEach(entity => {
      // Skip if too far from player
      if (Math.abs(entity.x - playerPos.x) > visibleRadius * 1.5 || 
          Math.abs(entity.y - playerPos.y) > visibleRadius * 1.5) {
        return;
      }
      
      const height = entity.height || 0;
      
      // Add bobbing/floating animation
      let animatedHeight = height;
      if (entity.bobbing) {
        animatedHeight += Math.sin(timestamp / 500) * 0.1;
      } else if (entity.floating) {
        animatedHeight += Math.sin(timestamp / 800) * 0.15;
      }
      
      const position = gridToScreen(entity.x, entity.y, animatedHeight);
      
      // Calculate depth for sorting
      const depth = entity.y * 1000 + entity.x;
      
      renderList.push({
        type: 'entity',
        entityType: entity.type,
        sprite: entity.sprite,
        x: position.x,
        y: position.y,
        gridX: entity.x,
        gridY: entity.y,
        depth: depth + 1, // Entities appear above terrain
        size: tileSize,
        height: animatedHeight,
        glowing: entity.glowing,
        rotating: entity.rotating,
        rotationAngle: entity.rotating ? (timestamp / (200 / entity.rotationSpeed || 1)) % 360 : 0,
        pulsing: entity.pulsing
      });
    });
    
    // Add player
    const playerHeight = 1.2;
    const playerBobbing = Math.sin(timestamp / 500) * 0.1;
    const playerPosition = gridToScreen(playerPos.x, playerPos.y, playerHeight + playerBobbing);
    
    renderList.push({
      type: 'player',
      sprite: sprites.PLAYER || DEFAULT_SPRITES.PLAYER,
      x: playerPosition.x,
      y: playerPosition.y,
      depth: playerPos.y * 1000 + playerPos.x + 2, // Player appears above entities
      size: tileSize,
      height: playerHeight,
      highlight: true
    });
    
    // Sort the render list by depth
    renderList.sort((a, b) => a.depth - b.depth);
    
    // Draw all items in the sorted list
    renderList.forEach(item => {
      const { x, y, sprite, size, glowing, rotating, rotationAngle, pulsing, highlight } = item;
      
      // Calculate the actual size to draw
      const drawSize = size * 0.85;
      
      // Save the context state
      ctx.save();
      
      // Apply transformations
      ctx.translate(x, y);
      
      // Apply rotation if needed
      if (rotating) {
        ctx.rotate(rotationAngle * Math.PI / 180);
      }
      
      // Add glow/highlight effects
      if (glowing) {
        const glowSize = drawSize * 1.2;
        const glowOpacity = 0.3 + Math.sin(timestamp / 500) * 0.1;
        ctx.fillStyle = `rgba(255, 255, 130, ${glowOpacity})`;
        ctx.beginPath();
        ctx.arc(0, 0, glowSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      if (pulsing) {
        const pulseSize = drawSize * (1 + Math.sin(timestamp / 300) * 0.1);
        ctx.font = `${pulseSize}px Arial`;
      } else {
        ctx.font = `${drawSize}px Arial`;
      }
      
      // Add shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillText(sprite, drawSize * 0.05, drawSize * 0.05);
      
      // Add highlight for player
      if (highlight) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(0, 0, drawSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Draw the sprite
      ctx.fillStyle = 'white';
      ctx.fillText(sprite, 0, 0);
      
      // Restore the context state
      ctx.restore();
    });
    
    // Add shadow under player
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(
      playerPosition.x, 
      playerPosition.y + tileSize * 0.3, 
      tileSize * 0.3, 
      tileSize * 0.15, 
      0, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Draw async loading overlay if active
    if (asyncLoading.active) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Progress bar
      const barWidth = canvas.width * 0.7;
      const barHeight = 10;
      const barX = (canvas.width - barWidth) / 2;
      const barY = canvas.height * 0.6;
      
      // Background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Progress
      ctx.fillStyle = '#8e44ad';
      ctx.fillRect(barX, barY, barWidth * (asyncLoading.progress / 100), barHeight);
      
      // Text
      ctx.fillStyle = 'white';
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(asyncLoading.message, canvas.width / 2, barY - 20);
      ctx.fillText(`${Math.round(asyncLoading.progress)}%`, canvas.width / 2, barY + 30);
      
      ctx.textAlign = 'start';
    }

    // Request the next frame
    animationFrameRef.current = requestAnimationFrame(renderFrame);
  };

  // Initialize the canvas and start the render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log("Canvas ref is null");
      return;
    }
    
    console.log("Canvas initialized, dimensions:", canvas.width, canvas.height);
    const context = canvas.getContext('2d');
    contextRef.current = context;
    console.log("Context created:", !!context);

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      console.log("Canvas resized to:", canvas.width, canvas.height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Start the animation loop
    console.log("Starting animation loop");
    animationFrameRef.current = requestAnimationFrame(renderFrame);

    return () => {
      console.log("Cleaning up canvas animation");
      window.removeEventListener('resize', resizeCanvas);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Clear any references
      contextRef.current = null;
    };
  }, []);

  // Render controls for camera angle
  const renderCameraControls = () => {
    return (
      <div className="camera-controls">
        <div className="camera-title">Camera Controls</div>
        <div className="camera-buttons">
          <button onClick={() => setCameraAngle(angle => (angle - 45) % 360)} title="Rotate Left">
            ↺
          </button>
          <button onClick={() => setCameraTilt(tilt => Math.min(80, tilt + 5))} title="Tilt Up">
            ↑
          </button>
          <button onClick={() => setCameraTilt(tilt => Math.max(30, tilt - 5))} title="Tilt Down">
            ↓
          </button>
          <button onClick={() => setCameraAngle(angle => (angle + 45) % 360)} title="Rotate Right">
            ↻
          </button>
        </div>
        <div className="zoom-controls">
          <button onClick={() => setZoom(z => Math.max(0.7, z - 0.1))} title="Zoom Out">−</button>
          <div className="zoom-level">{Math.round(zoom * 100)}%</div>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} title="Zoom In">+</button>
        </div>
        <div className="camera-help">
          Keyboard: Q/R rotate, Z/X zoom
        </div>
      </div>
    );
  };

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
      
      <button 
        className="toggle-ui-button"
        onClick={() => setShowControls(!showControls)}
        title={showControls ? "Hide UI (Press H)" : "Show UI (Press H)"}
      >
        {showControls ? '👁️' : '👁️‍🗨️'}
      </button>
      
      {showControls && (
        <>
          {renderCameraControls()}
          
          <div className="game-controls">
            <div className="wasd-controls">
              <div className="wasd-row">
                <button className="wasd-key" onClick={() => handleKeyDown({key: 'w'})}>W</button>
              </div>
              <div className="wasd-row">
                <button className="wasd-key" onClick={() => handleKeyDown({key: 'a'})}>A</button>
                <button className="wasd-key" onClick={() => handleKeyDown({key: 's'})}>S</button>
                <button className="wasd-key" onClick={() => handleKeyDown({key: 'd'})}>D</button>
              </div>
            </div>
            
            <div className="action-controls">
              <button onClick={() => handleKeyDown({key: 'e'})}>E: Examine</button>
              <button onClick={() => handleKeyDown({key: 'f'})}>F: Interact</button>
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
        </>
      )}
    </div>
  );
};

export default GameEngine3D; 