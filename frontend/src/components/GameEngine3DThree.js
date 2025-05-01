import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import './GameEngine3D.css'; // Reuse existing CSS

// Default sprite/model mappings
const DEFAULT_MODELS = {
  PLAYER: { type: 'character', color: 0x3366ff },
  TREE: { type: 'cylinder', color: 0x228822 },
  ROCK: { type: 'rock', color: 0x888888 },
  CHEST: { type: 'chest', color: 0xC4A484 },
  NPC: { type: 'character', color: 0xffcc88 },
  MERCHANT: { type: 'character', color: 0xccaa66 },
  ENEMY: { type: 'character', color: 0xcc3344 },
  WATER: { type: 'water', color: 0x3399ff },
  GRASS: { type: 'terrain', color: 0x33cc33 },
  PATH: { type: 'terrain', color: 0xCCBB99 },
  WALL: { type: 'cube', color: 0x999999 },
  DOOR: { type: 'door', color: 0x8B4513 },
  POTION: { type: 'sphere', color: 0xff44ff },
  SWORD: { type: 'weapon', color: 0xCCCCDD },
  SHIELD: { type: 'shield', color: 0x664422 },
  KEY: { type: 'key', color: 0xFFD700 },
  HEART: { type: 'heart', color: 0xff2222 },
  GOLD: { type: 'coin', color: 0xFFD700 },
  HOUSE: { type: 'building', color: 0xA67D3D },
  BRIDGE: { type: 'bridge', color: 0x8B5A2B }
};

// Define renderScene function outside of component to avoid "Cannot access before initialization" errors
const renderScene = (renderer, scene, camera) => {
  if (!renderer || !scene || !camera) return;
  
  // Animate entities
  if (scene) {
    const time = Date.now() * 0.001; // Current time in seconds
    
    scene.traverse((object) => {
      if (object.userData.animation) {
        const anim = object.userData.animation;
        
        if (anim.type === 'float') {
          // Floating animation (items)
          object.position.y = 0.2 + Math.sin(time * anim.speed + anim.offset) * 0.1;
        } else if (anim.type === 'rotate') {
          // Rotation animation (items)
          object.rotation.y = time * anim.speed;
        } else if (anim.type === 'bob') {
          // Bobbing animation (characters)
          object.position.y = anim.baseY + Math.sin(time * anim.speed) * 0.05;
        } else if (anim.type === 'glow') {
          // Glowing animation (pulsating opacity or scale)
          if (anim.target) {
            const s = 1 + Math.sin(time * anim.speed) * 0.1;
            anim.target.scale.set(s, s, s);
            anim.target.material.opacity = 0.5 + Math.sin(time * anim.speed) * 0.3;
          }
        }
      }
    });
  }
  
  renderer.render(scene, camera);
};

// Add CSS for the progress bar - add this at the top of the file
const progressBarStyles = `
  .action-progress-bar-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background-color: rgba(0, 0, 0, 0.2);
    z-index: 1000;
  }
  
  .action-progress-bar {
    height: 100%;
    background-color: #4da6ff;
    width: 0%;
    transition: width 0.3s ease;
  }
  
  .action-progress-bar.active {
    animation: progress-animation 1.2s infinite ease-in-out;
  }
  
  @keyframes progress-animation {
    0% { background-color: #4da6ff; }
    50% { background-color: #66ccff; }
    100% { background-color: #4da6ff; }
  }
`;

const GameEngine3DThree = ({ player, gameState, onAction, loading, initialGameData, asyncLoading }) => {
  // Refs for Three.js
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mountedRef = useRef(true); // Track component mount state
  const playerMeshRef = useRef(null); // Track player mesh
  
  // Add refs for the progress bar
  const progressBarRef = useRef(null);
  const progressTimerRef = useRef(null);
  const initializationTimerRef = useRef(null);
  
  // State
  const [playerPos, setPlayerPos] = useState({ x: 5, y: 0, z: 5 });
  const [models, setModels] = useState(DEFAULT_MODELS);
  const [gameMap, setGameMap] = useState([]);
  const [entities, setEntities] = useState([]);
  const [message, setMessage] = useState('');
  const [commandInput, setCommandInput] = useState('');
  const [worldTheme, setWorldTheme] = useState('');
  const [cameraMode, setCameraMode] = useState('follow'); // 'follow', 'orbit', 'firstPerson'
  const inputRef = useRef(null);
  const [showControls, setShowControls] = useState(true);
  
  // Add state for progress
  const [actionProgress, setActionProgress] = useState({
    active: false,
    progress: 0,
    message: ''
  });
  
  // Add state to track game readiness
  const [gameReady, setGameReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [webGLSupported, setWebGLSupported] = useState(true);
  
  // System readiness check
  useEffect(() => {
    // Check WebGL support - needed for Three.js
    const checkWebGLSupport = () => {
      try {
        const canvas = document.createElement('canvas');
        const hasWebGL = !!(
          window.WebGLRenderingContext && 
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
        console.log("WebGL supported:", hasWebGL);
        return hasWebGL;
      } catch (e) {
        console.error("Error checking WebGL support:", e);
        return false;
      }
    };
    
    const hasWebGL = checkWebGLSupport();
    setWebGLSupported(hasWebGL);
    
    if (!hasWebGL) {
      setMessage("Your browser doesn't support WebGL, which is required for 3D rendering. Try updating your browser or enabling hardware acceleration.");
    }
    
    // Add staged initialization to prevent premature rendering
    if (hasWebGL && initialGameData && gameState) {
      console.log("Beginning staged initialization...");
      setInitializing(true);
      
      // Give the browser a moment to process and render UI before heavy 3D initialization
      initializationTimerRef.current = setTimeout(() => {
        setInitializing(false);
        setGameReady(true);
      }, 300);
    }
    
    return () => {
      if (initializationTimerRef.current) {
        clearTimeout(initializationTimerRef.current);
        initializationTimerRef.current = null;
      }
    };
  }, [initialGameData, gameState]);
  
  // Set mountedRef to false when component unmounts
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  // Logging for debugging
  useEffect(() => {
    console.log("Initial Game Data:", initialGameData);
    console.log("Current Game State:", gameState);
    
    if (initialGameData) {
      if (initialGameData.worldTheme) {
        setWorldTheme(initialGameData.worldTheme);
      }
      
      if (initialGameData.narrative) {
        setMessage(initialGameData.narrative.split('.')[0] + '.');
      }
    }
  }, [initialGameData, gameState]);
  
  // Only initialize Three.js scene when game is ready
  useEffect(() => {
    if (!gameReady || !webGLSupported || !mountedRef.current || !containerRef.current) {
      return;
    }
    
    console.log("Game ready - initializing 3D scene");
    initThreeJsScene();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameReady, webGLSupported, worldTheme]);
  
  // Initialize the Three.js scene
  const initThreeJsScene = () => {
    if (!containerRef.current || !mountedRef.current) return;
    
    console.log("Initializing Three.js scene");
    
    // Cleanup previous scene if it exists
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (rendererRef.current && containerRef.current) {
      try {
        const domElement = rendererRef.current.domElement;
        if (domElement && domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(domElement);
        }
      } catch (e) {
        console.error("Error removing renderer:", e);
      }
      
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    
    if (controlsRef.current) {
      controlsRef.current.dispose();
      controlsRef.current = null;
    }
    
    if (sceneRef.current) {
      disposeScene(sceneRef.current);
      sceneRef.current = null;
    }
    
    try {
      // Create scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      
      // Set background based on world theme
      const getBgColor = () => {
        if (worldTheme?.includes('dark') || worldTheme?.includes('night')) return new THREE.Color(0x121a2e);
        if (worldTheme?.includes('desert')) return new THREE.Color(0x8b7d6b);
        if (worldTheme?.includes('snow') || worldTheme?.includes('ice')) return new THREE.Color(0xd4f1f9);
        if (worldTheme?.includes('volcano') || worldTheme?.includes('fire')) return new THREE.Color(0x3a1c0d);
        if (worldTheme?.includes('forest')) return new THREE.Color(0x225522);
        if (worldTheme?.includes('magic')) return new THREE.Color(0x332255);
        if (worldTheme?.includes('ocean')) return new THREE.Color(0x225588);
        return new THREE.Color(0x87CEEB); // default sky blue
      };
      
      scene.background = getBgColor();
      scene.fog = new THREE.FogExp2(scene.background, 0.04);
      
      // Setup camera with error handling
      try {
        const camera = new THREE.PerspectiveCamera(
          75, // FOV
          containerRef.current.clientWidth / containerRef.current.clientHeight, // Aspect ratio
          0.1, // Near clipping plane
          1000 // Far clipping plane
        );
        camera.position.set(5, 10, 15); // Initial position
        camera.lookAt(5, 0, 5); // Look at center of the map
        cameraRef.current = camera;
      } catch (e) {
        console.error("Error creating camera:", e);
        setMessage("Error initializing camera. Please reload the page.");
        return;
      }
      
      // Create renderer with antialiasing and shadows
      try {
        const renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          alpha: true
        });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Clear container and add the renderer
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
        
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
      } catch (e) {
        console.error("Error creating renderer:", e);
        setMessage("Error initializing renderer. Please reload the page.");
        return;
      }
      
      // Add orbit controls for camera
      try {
        const controls = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.25;
        controls.screenSpacePanning = false;
        controls.maxPolarAngle = Math.PI / 2; // Don't go below the ground
        controls.minDistance = 3;
        controls.maxDistance = 30;
        controlsRef.current = controls;
      } catch (e) {
        console.error("Error creating controls:", e);
        // Controls aren't essential, so continue even if they fail
      }
      
      // Add lighting
      setupLighting(scene, worldTheme);
      
      // Add debug axes
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);
      
      // Handle window resize
      const handleResize = () => {
        if (!containerRef.current || !cameraRef.current || !rendererRef.current || !mountedRef.current) return;
        
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        
        rendererRef.current.setSize(width, height);
      };
      
      window.addEventListener('resize', handleResize);
      
      // Start animation loop
      animate();
      
      // Generate initial map
      generateMap(worldTheme);
      
      // Attach cleanup function
      return () => {
        console.log("Cleaning up Three.js scene");
        window.removeEventListener('resize', handleResize);
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        if (rendererRef.current && containerRef.current) {
          try {
            const domElement = rendererRef.current.domElement;
            if (domElement && domElement.parentNode === containerRef.current) {
              containerRef.current.removeChild(domElement);
            }
          } catch (e) {
            console.error("Error removing renderer:", e);
          }
          
          rendererRef.current.dispose();
          rendererRef.current = null;
        }
        
        if (controlsRef.current) {
          controlsRef.current.dispose();
          controlsRef.current = null;
        }
        
        if (sceneRef.current) {
          disposeScene(sceneRef.current);
          sceneRef.current = null;
        }
      };
    } catch (e) {
      console.error("Critical error initializing Three.js:", e);
      setMessage("Error initializing 3D environment. Please reload the page.");
    }
  };
  
  // Update player position effect
  useEffect(() => {
    if (playerMeshRef.current && sceneRef.current && mountedRef.current) {
      const mapSize = 17;
      const worldX = playerPos.x - Math.floor(mapSize/2);
      const worldZ = playerPos.z - Math.floor(mapSize/2);
      
      // Update player mesh position
      playerMeshRef.current.position.set(worldX, 0, worldZ);
      
      // Update camera to follow player
      updateCameraPosition();
      
      // Force render
      if (rendererRef.current && cameraRef.current) {
        renderScene(rendererRef.current, sceneRef.current, cameraRef.current);
      }
    }
  }, [playerPos]);
  
  // Add useEffect to handle the loading state changing
  useEffect(() => {
    if (loading) {
      // Start the progress animation
      setActionProgress({
        active: true,
        progress: 10, // Start at 10%
        message: 'Processing action...'
      });
      
      // Simulate progress
      progressTimerRef.current = setInterval(() => {
        setActionProgress(prev => ({
          ...prev,
          // Increase progress but max out at 90% until we get a response
          progress: Math.min(prev.progress + Math.random() * 10, 90)
        }));
      }, 200);
    } else {
      // Action completed or no action in progress
      if (actionProgress.active) {
        // Complete the progress bar animation
        setActionProgress(prev => ({
          ...prev,
          progress: 100
        }));
        
        // Reset after animation completes
        setTimeout(() => {
          setActionProgress({
            active: false,
            progress: 0,
            message: ''
          });
        }, 500);
      }
      
      // Clear the interval
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    }
    
    // Cleanup
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [loading]);
  
  // Inject the CSS into the document
  useEffect(() => {
    // Add the CSS to the document
    const styleElement = document.createElement('style');
    styleElement.innerHTML = progressBarStyles;
    document.head.appendChild(styleElement);
    
    // Clean up on unmount
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  // Command input handler
  const handleCommandSubmit = (e) => {
    e.preventDefault();
    if (!commandInput.trim() || loading) return;
    
    // Generate a unique input by adding a timestamp to prevent caching
    const uniqueCommand = `${commandInput} [t:${Date.now()}]`;
    
    onAction(uniqueCommand);
    setCommandInput('');
    
    // Blur the input to allow movement controls again
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };
  
  // Define the animate function
  const animate = () => {
    if (!mountedRef.current) return; // Don't animate if component unmounted
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    if (controlsRef.current) {
      controlsRef.current.update();
    }
    
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      renderScene(rendererRef.current, sceneRef.current, cameraRef.current);
    }
  };
  
  // Setup lighting based on world theme
  const setupLighting = (scene, theme) => {
    // Ambient light
    let ambientIntensity = 0.5; // default
    
    if (theme?.includes('night') || theme?.includes('dark')) {
      ambientIntensity = 0.2;
    } else if (theme?.includes('bright') || theme?.includes('desert')) {
      ambientIntensity = 0.6;
    }
    
    const ambientLight = new THREE.AmbientLight(0xffffff, ambientIntensity);
    scene.add(ambientLight);
    
    // Directional light (sun/moon)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 30, 20);
    directionalLight.castShadow = true;
    
    // Set up shadow properties for better quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    
    scene.add(directionalLight);
    
    // Add a hemisphere light for more natural lighting
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(hemisphereLight);
    
    // Add a colored light based on theme
    let pointLightColor = 0xffffff;
    if (theme?.includes('fire') || theme?.includes('volcano')) {
      pointLightColor = 0xff6600;
    } else if (theme?.includes('ice') || theme?.includes('snow')) {
      pointLightColor = 0x99ccff;
    } else if (theme?.includes('forest') || theme?.includes('jungle')) {
      pointLightColor = 0x33ff66;
    } else if (theme?.includes('magic') || theme?.includes('arcane')) {
      pointLightColor = 0xff33ff;
    }
    
    const pointLight = new THREE.PointLight(pointLightColor, 1, 30);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);
    
    console.log("Lighting setup complete");
  };

  // Helper function to safely dispose a scene
  const disposeScene = (scene) => {
    if (!scene) return;
    
    const objectsToDispose = [];
    
    scene.traverse((object) => {
      objectsToDispose.push(object);
    });
    
    objectsToDispose.forEach(object => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    
    // Clear all objects from the scene
    while(scene.children.length > 0) { 
      scene.remove(scene.children[0]); 
    }
  };
  
  // Add map generation based on game state
  useEffect(() => {
    console.log("Map generation triggered, gameState:", gameState, "scene:", sceneRef.current);
    
    if (!sceneRef.current || !mountedRef.current) return;
    
    // Clear existing map elements
    clearMapFromScene();
    
    // Reset entities array
    setEntities([]);
    
    // Get theme from gameState or use default
    let newTheme = worldTheme;
    if (gameState && gameState.worldTheme) {
      newTheme = gameState.worldTheme;
      setWorldTheme(gameState.worldTheme);
    }
    
    // Generate new map with current theme
    generateMap(newTheme);
    
    // We only want to regenerate when gameState actually changes in a meaningful way
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.version, gameState?.location, gameState?._forceRefresh]); // Only regenerate when these specific properties change

  // Clear existing map elements from scene
  const clearMapFromScene = () => {
    if (!sceneRef.current || !mountedRef.current) return;
    
    const objectsToRemove = [];
    
    sceneRef.current.traverse((object) => {
      if (object.userData.type === 'terrain' || 
          object.userData.type === 'entity' || 
          object.userData.type === 'player') {
        objectsToRemove.push(object);
      }
    });
    
    objectsToRemove.forEach(object => {
      sceneRef.current.remove(object);
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  };

  // Find a clear area for player to spawn
  const findClearArea = (mapData, mapSize, minClearRadius = 2) => {
    console.log("Finding clear area for player spawn...");
    
    // Try center areas first
    const centerStart = Math.floor(mapSize / 2) - 2;
    const centerEnd = Math.floor(mapSize / 2) + 2;
    
    // Check center area first (most natural spawn point)
    for (let z = centerStart; z <= centerEnd; z++) {
      for (let x = centerStart; x <= centerEnd; x++) {
        if (isAreaClear(x, z, mapData, minClearRadius)) {
          console.log(`Found clear center area at (${x},${z})`);
          return { x, z };
        }
      }
    }
    
    // If center not available, try the rest of the map
    for (let attempt = 0; attempt < 50; attempt++) {
      // Start from 2 and end at mapSize-3 to avoid edges
      const x = 2 + Math.floor(Math.random() * (mapSize - 4));
      const z = 2 + Math.floor(Math.random() * (mapSize - 4));
      
      if (isAreaClear(x, z, mapData, minClearRadius)) {
        console.log(`Found clear area at (${x},${z}) after ${attempt+1} attempts`);
        return { x, z };
      }
    }
    
    // Fallback to a default position if no clear area found
    console.log("Could not find ideal clear area, using fallback position");
    return { x: 5, z: 5 };
  };
  
  // Check if an area is clear of obstacles
  const isAreaClear = (centerX, centerZ, mapData, radius) => {
    if (!mapData || !mapData[centerZ] || !mapData[centerZ][centerX]) {
      return false;
    }
    
    // Check if center position is valid
    if (!isValidPosition(centerX, centerZ, mapData)) {
      return false;
    }
    
    // Check surrounding area
    for (let z = centerZ - radius; z <= centerZ + radius; z++) {
      for (let x = centerX - radius; x <= centerX + radius; x++) {
        // Skip checking outside map bounds
        if (x < 0 || z < 0 || x >= mapData[0].length || z >= mapData.length) {
          continue;
        }
        
        // Skip checking the very corner tiles (makes a more circular check area)
        const distSq = (x - centerX) * (x - centerX) + (z - centerZ) * (z - centerZ);
        if (distSq > radius * radius) {
          continue;
        }
        
        // Check if this position contains an obstacle
        const cell = mapData[z][x];
        if (!cell) continue;
        
        // Consider these as obstacles
        if (['tree', 'rock', 'wall', 'water', 'house', 'landmark'].includes(cell.type)) {
          return false;
        }
        
        // Check for entities that would block movement
        if (cell.entities && cell.entities.length > 0) {
          // NPCs and enemies are obstacles, items are not
          const blockingEntities = cell.entities.filter(e => 
            e.type === 'npc' || e.type === 'enemy'
          );
          if (blockingEntities.length > 0) {
            return false;
          }
        }
      }
    }
    
    return true;
  };

  // Fix the map generation function to create clear 3D visuals
  const generateMap = (theme = worldTheme) => {
    if (!sceneRef.current || !mountedRef.current) return;
    
    console.log("Generating 3D map - start with theme:", theme);
    
    // Update scene background based on theme
    if (sceneRef.current) {
      const getBgColor = () => {
        if (theme?.includes('dark') || theme?.includes('night')) return new THREE.Color(0x121a2e);
        if (theme?.includes('desert')) return new THREE.Color(0x8b7d6b);
        if (theme?.includes('snow') || theme?.includes('ice')) return new THREE.Color(0xd4f1f9);
        if (theme?.includes('volcano') || theme?.includes('fire')) return new THREE.Color(0x3a1c0d);
        if (theme?.includes('forest')) return new THREE.Color(0x225522);
        if (theme?.includes('magic')) return new THREE.Color(0x332255);
        if (theme?.includes('ocean')) return new THREE.Color(0x225588);
        return new THREE.Color(0x87CEEB); // default sky blue
      };
      
      sceneRef.current.background = getBgColor();
      sceneRef.current.fog = new THREE.FogExp2(sceneRef.current.background, 0.04);
    }
    
    // Create ground plane
    const groundSize = 50;
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
    
    // Use a try-catch to handle any texture loading issues
    let groundTexture;
    const textureUrl = getGroundTextureForTheme(theme);
    
    try {
      groundTexture = new THREE.TextureLoader().load(
        textureUrl,
        // Success callback
        function(texture) {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(25, 25);
          
          if (rendererRef.current && sceneRef.current && cameraRef.current && mountedRef.current) {
            renderScene(rendererRef.current, sceneRef.current, cameraRef.current);
          }
        },
        // Progress callback
        undefined,
        // Error callback
        function(err) {
          console.error('Error loading texture:', err);
          // Fallback to basic material
          if (ground && ground.material) {
            ground.material = new THREE.MeshStandardMaterial({ 
              color: getGroundColorForTheme(theme),
              roughness: 0.8,
              metalness: 0.2
            });
          }
        }
      );
    } catch (e) {
      console.error("Error in texture loading:", e);
      groundTexture = null;
    }
    
    const groundMaterial = groundTexture 
      ? new THREE.MeshStandardMaterial({ 
          map: groundTexture,
          roughness: 0.8,
          metalness: 0.2
        })
      : new THREE.MeshStandardMaterial({ 
          color: getGroundColorForTheme(theme),
          roughness: 0.8,
          metalness: 0.2
        });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // rotate to horizontal
    ground.position.y = -0.1; // slightly below everything else
    ground.receiveShadow = true;
    ground.userData = { type: 'terrain', subtype: 'ground' };
    
    if (sceneRef.current && mountedRef.current) {
      sceneRef.current.add(ground);
      console.log("Added ground plane to scene");
    }
    
    // Create a 3D grid map (17x17 map matches the 2D version)
    const mapSize = 17;
    const mapData = createEmptyMap(mapSize);
    
    // Add map features (paths, water, etc.)
    addMapFeatures(mapData, mapSize, theme);
    
    // Render the 3D map with objects
    renderMapObjects(mapData, mapSize, theme);
    
    // Find a clear area for player to spawn and update player position
    const clearSpot = findClearArea(mapData, mapSize, 2);
    setPlayerPos({ ...playerPos, x: clearSpot.x, z: clearSpot.z });
    
    // Add the player character (will use the updated position)
    addPlayer();
    
    // Update game map state
    setGameMap(mapData);
    
    // Force a render to make sure objects appear
    if (rendererRef.current && sceneRef.current && cameraRef.current && mountedRef.current) {
      console.log("Forcing initial render");
      renderScene(rendererRef.current, sceneRef.current, cameraRef.current);
    }
    
    console.log("3D Map generation complete", {
      sceneChildCount: sceneRef.current ? sceneRef.current.children.length : 0,
      mapSize: mapData.length
    });
  };

  // Helper function to get ground color based on theme
  const getGroundColorForTheme = (theme) => {
    if (theme?.includes('desert')) return 0xd2b48c; // desert sand
    if (theme?.includes('snow') || theme?.includes('ice')) return 0xf0f8ff; // snow
    if (theme?.includes('volcano') || theme?.includes('fire')) return 0x3a1c0d; // burnt ground
    if (theme?.includes('forest') || theme?.includes('jungle')) return 0x2e8b57; // forest green
    if (theme?.includes('ocean') || theme?.includes('sea')) return 0x1e90ff; // ocean blue
    if (theme?.includes('magic') || theme?.includes('arcane')) return 0x9370db; // magical purple
    if (theme?.includes('cave') || theme?.includes('dungeon')) return 0x696969; // dark stone
    return 0x33aa33; // default grass green
  };

  // Helper function to get texture URL based on theme
  const getGroundTextureForTheme = (theme) => {
    if (theme?.includes('desert')) return 'https://threejs.org/examples/textures/terrain/grasslight-big.jpg';
    if (theme?.includes('snow') || theme?.includes('ice')) return 'https://threejs.org/examples/textures/terrain/grasslight-big.jpg';
    if (theme?.includes('forest') || theme?.includes('jungle')) return 'https://threejs.org/examples/textures/terrain/grasslight-big.jpg';
    return 'https://threejs.org/examples/textures/terrain/grasslight-big.jpg'; // default grass texture
  };

  // Create an empty map data structure
  const createEmptyMap = (size) => {
    return Array(size).fill().map(() => 
      Array(size).fill({ type: 'grass' })
    );
  };

  // Add paths, water, structures to the map data
  const addMapFeatures = (mapData, mapSize, theme) => {
    // Create a seed based on theme and timestamp for pseudorandom generation
    const seed = theme + Date.now();
    const random = seedRandom(seed);
    
    // Determine map style based on theme
    const isDesert = theme?.includes('desert');
    const isSnowy = theme?.includes('snow') || theme?.includes('ice');
    const isVulcanic = theme?.includes('volcano') || theme?.includes('fire');
    const isForest = theme?.includes('forest') || theme?.includes('jungle');
    const isWatery = theme?.includes('ocean') || theme?.includes('sea');
    const isMagical = theme?.includes('magic') || theme?.includes('arcane');
    const isDungeon = theme?.includes('cave') || theme?.includes('dungeon');
    
    // Create a central clearing for player spawn (5x5 area in center)
    const centerX = Math.floor(mapSize / 2);
    const centerZ = Math.floor(mapSize / 2);
    const clearingRadius = 2;
    
    for (let z = centerZ - clearingRadius; z <= centerZ + clearingRadius; z++) {
      for (let x = centerX - clearingRadius; x <= centerX + clearingRadius; x++) {
        if (z >= 0 && z < mapSize && x >= 0 && x < mapSize) {
          mapData[z][x] = { type: 'grass' }; // Keep center clear
        }
      }
    }
    
    // Add paths - style varies by theme
    for (let i = 3; i < mapSize - 3; i++) {
      mapData[7][i] = { type: 'path' };
    }
    
    // Secondary path
    for (let i = 4; i < mapSize - 4; i++) {
      mapData[i][mapSize - 5] = { type: 'path' };
    }
    
    // Connecting path
    for (let i = 7; i < mapSize - 5; i++) {
      mapData[Math.floor(mapSize/2)][i] = { type: 'path' };
    }
    
    // Add water features - more or less based on theme
    if (isWatery) {
      // More water for ocean theme
      for (let i = 0; i < mapSize; i++) {
        for (let j = 0; j < mapSize; j++) {
          if (random() < 0.4 && i > 1 && i < mapSize-2 && j > 1 && j < mapSize-2) {
            mapData[i][j] = { type: 'water' };
          }
        }
      }
    } else if (isDesert) {
      // Less water for desert theme
      for (let i = 0; i < Math.floor(mapSize/8); i++) {
        const x = Math.floor(random() * (mapSize - 2)) + 1;
        const y = Math.floor(random() * (mapSize - 2)) + 1;
        mapData[y][x] = { type: 'water' }; // oasis
      }
    } else {
      // Standard water border
      for (let i = 0; i < mapSize; i++) {
        mapData[0][i] = { type: 'water' };
        mapData[mapSize - 1][i] = { type: 'water' };
        mapData[i][0] = { type: 'water' };
        mapData[i][mapSize - 1] = { type: 'water' };
      }
      
      // Add a river or lake
      const lakeX = Math.floor(mapSize * 0.3);
      const lakeY = Math.floor(mapSize * 0.7);
      const lakeSize = 3;
      
      for (let y = Math.max(1, lakeY - lakeSize); y <= Math.min(mapSize - 2, lakeY + lakeSize); y++) {
        for (let x = Math.max(1, lakeX - lakeSize); x <= Math.min(mapSize - 2, lakeX + lakeSize); x++) {
          if (Math.sqrt(Math.pow(x - lakeX, 2) + Math.pow(y - lakeY, 2)) <= lakeSize) {
            mapData[y][x] = { type: 'water' };
          }
        }
      }
    }
    
    // Add theme-appropriate features
    if (isForest) {
      // Add more trees for forest theme
      for (let i = 0; i < mapSize; i++) {
        for (let j = 0; j < mapSize; j++) {
          if (random() < 0.4 && mapData[i][j].type === 'grass') {
            mapData[i][j] = { type: 'tree' };
          }
        }
      }
    } else if (isDesert) {
      // Add cactus and rocks for desert theme
      for (let i = 0; i < mapSize; i++) {
        for (let j = 0; j < mapSize; j++) {
          if (random() < 0.2 && mapData[i][j].type === 'grass') {
            mapData[i][j] = { type: 'rock' };
          }
        }
      }
    } else if (isVulcanic) {
      // Add more rocks and some "lava" for volcanic theme
      for (let i = 0; i < mapSize; i++) {
        for (let j = 0; j < mapSize; j++) {
          if (random() < 0.3 && mapData[i][j].type === 'grass') {
            mapData[i][j] = { type: 'rock' };
          }
        }
      }
    } else if (isSnowy) {
      // Mostly clear for snowy theme with some trees
      for (let i = 0; i < mapSize; i++) {
        for (let j = 0; j < mapSize; j++) {
          if (random() < 0.15 && mapData[i][j].type === 'grass') {
            mapData[i][j] = { type: 'tree' };
          }
        }
      }
    } else {
      // Default theme with mixed features
      
      // Add trees in forest area
      const forestX = Math.floor(mapSize * 0.7);
      const forestY = Math.floor(mapSize * 0.3);
      
      for (let y = forestY - 3; y <= forestY + 3; y++) {
        for (let x = forestX - 3; x <= forestX + 3; x++) {
          if (y >= 1 && y < mapSize - 1 && x >= 1 && x < mapSize - 1) {
            if (random() < 0.7 && mapData[y][x].type === 'grass') {
              mapData[y][x] = { type: 'tree' };
            }
          }
        }
      }
      
      // Add rocks
      const rockyX = Math.floor(mapSize * 0.4);
      const rockyY = Math.floor(mapSize * 0.4);
      
      for (let y = rockyY - 2; y <= rockyY + 2; y++) {
        for (let x = rockyX - 2; x <= rockyX + 2; x++) {
          if (y >= 1 && y < mapSize - 1 && x >= 1 && x < mapSize - 1) {
            if (random() < 0.6 && mapData[y][x].type === 'grass') {
              mapData[y][x] = { type: 'rock' };
            }
          }
        }
      }
      
      // Add some random features
      for (let i = 0; i < 15; i++) {
        const x = 1 + Math.floor(random() * (mapSize - 2));
        const y = 1 + Math.floor(random() * (mapSize - 2));
        if (mapData[y][x].type === 'grass') {
          mapData[y][x] = { type: random() > 0.5 ? 'tree' : 'rock' };
        }
      }
    }
    
    // Add structures
    // House/starting point
    const houseX = 5;
    const houseY = 5;
    mapData[houseY][houseX] = { type: 'house' };
    
    // Landmark
    const landmarkX = mapSize - 6;
    const landmarkY = mapSize - 6;
    mapData[landmarkY][landmarkX] = { type: 'landmark' };
    
    // Add entities to map data
    addEntitiesToMap(mapData, mapSize, theme);
  };

  // Simple seedable random number generator
  const seedRandom = (seed) => {
    const str = String(seed);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // LCG parameters
    const m = 2147483647; // 2^31 - 1
    const a = 16807;      // 7^5
    const c = 0;
    
    let state = Math.abs(hash);
    
    return function() {
      state = (a * state + c) % m;
      return state / m;
    };
  };

  // Add NPCs, items, enemies to the map data
  const addEntitiesToMap = (mapData, mapSize, theme) => {
    // Use seeded random generator for consistent generation based on theme
    const random = seedRandom(theme + Date.now());
    const newEntities = [];
    
    // Entity types based on theme
    let npcTypes = ['villager', 'merchant', 'guard', 'elder', 'child'];
    let enemyTypes = ['bandit', 'wolf', 'goblin'];
    
    if (theme?.includes('desert')) {
      npcTypes = ['nomad', 'merchant', 'warrior', 'elder', 'explorer'];
      enemyTypes = ['scorpion', 'snake', 'bandit'];
    } else if (theme?.includes('snow') || theme?.includes('ice')) {
      npcTypes = ['villager', 'trader', 'hunter', 'shaman', 'child'];
      enemyTypes = ['wolf', 'bear', 'frost spirit'];
    } else if (theme?.includes('forest') || theme?.includes('jungle')) {
      npcTypes = ['ranger', 'druid', 'hunter', 'shaman', 'child'];
      enemyTypes = ['wolf', 'bear', 'wild boar'];
    } else if (theme?.includes('magic') || theme?.includes('arcane')) {
      npcTypes = ['wizard', 'apprentice', 'alchemist', 'sage', 'familiar'];
      enemyTypes = ['golem', 'imp', 'animated object'];
    }
    
    // Add NPCs
    const addNPC = (x, y, type, dialog) => {
      if (isValidPosition(x, y, mapData)) {
        const npc = {
          type: 'npc',
          subtype: type,
          x, y, z: 0,
          dialog,
          model: type === 'merchant' ? 'merchant' : 'npc'
        };
        newEntities.push(npc);
        if (!mapData[y][x].entities) mapData[y][x].entities = [];
        mapData[y][x].entities.push(npc);
      }
    };
    
    // Add more NPCs in visible locations
    const npcDialogs = [
      "Welcome, traveler! Our world has many secrets to discover.",
      "Looking to trade? I've got rare items if you have the coin.",
      "I'm watching you, stranger. Don't cause any trouble.",
      "In the ancient times, this land was ruled by powerful mages.",
      "Hey! Want to play hide and seek?",
      "The weather has been strange lately. Something is changing.",
      "Have you been to the mountains? They say there's treasure there."
    ];
    
    // Place 5-7 NPCs around the map
    const npcCount = 5 + Math.floor(random() * 3);
    for (let i = 0; i < npcCount; i++) {
      let x, y;
      let attempts = 0;
      do {
        x = 1 + Math.floor(random() * (mapSize - 2));
        y = 1 + Math.floor(random() * (mapSize - 2));
        attempts++;
      } while (!isValidPosition(x, y, mapData) && attempts < 20);
      
      if (attempts < 20) {
        const npcType = npcTypes[Math.floor(random() * npcTypes.length)];
        const dialog = npcDialogs[Math.floor(random() * npcDialogs.length)];
        addNPC(x, y, npcType, dialog);
      }
    }
    
    // Add enemies
    const enemyCount = 2 + Math.floor(random() * 4);
    for (let i = 0; i < enemyCount; i++) {
      let x, y;
      do {
        x = 1 + Math.floor(random() * (mapSize - 2));
        y = 1 + Math.floor(random() * (mapSize - 2));
      } while (!isValidPosition(x, y, mapData));
      
      const enemyType = enemyTypes[Math.floor(random() * enemyTypes.length)];
      const enemy = {
        type: 'enemy',
        subtype: enemyType,
        x, y, z: 0,
        health: 10,
        model: 'enemy'
      };
      
      newEntities.push(enemy);
      if (!mapData[y][x].entities) mapData[y][x].entities = [];
      mapData[y][x].entities.push(enemy);
    }
    
    // Add items
    const itemTypes = ['potion', 'key', 'sword', 'shield', 'gold', 'gem', 'scroll'];
    
    for (let i = 0; i < 5; i++) {
      let x, y;
      do {
        x = 1 + Math.floor(random() * (mapSize - 2));
        y = 1 + Math.floor(random() * (mapSize - 2));
      } while (!isValidPosition(x, y, mapData));
      
      const item = {
        type: 'item',
        subtype: itemTypes[i % itemTypes.length],
        x, y, z: 0,
        model: itemTypes[i % itemTypes.length]
      };
      
      newEntities.push(item);
      if (!mapData[y][x].entities) mapData[y][x].entities = [];
      mapData[y][x].entities.push(item);
    }
    
    // Add a chest
    let chestX, chestY;
    do {
      chestX = 1 + Math.floor(random() * (mapSize - 2));
      chestY = 1 + Math.floor(random() * (mapSize - 2));
    } while (!isValidPosition(chestX, chestY, mapData));
    
    const treasureTypes = [
      'magical artifact', 
      'ancient scroll', 
      'enchanted weapon', 
      'rare gems', 
      'gold coins'
    ];
    
    const chest = {
      type: 'chest',
      x: chestX, y: chestY, z: 0,
      contents: treasureTypes[Math.floor(random() * treasureTypes.length)],
      model: 'chest'
    };
    
    newEntities.push(chest);
    if (!mapData[chestY][chestX].entities) mapData[chestY][chestX].entities = [];
    mapData[chestY][chestX].entities.push(chest);
    
    // Update entities state
    setEntities(newEntities);
  };

  // Render map objects based on the map data
  const renderMapObjects = (mapData, mapSize, theme) => {
    if (!sceneRef.current || !mapData || !mountedRef.current) return;
    
    console.log("Rendering map objects for map size:", mapSize);
    
    // Clear entities collection before adding new ones
    const newEntities = [];
    
    // Create a center offset so (0,0) is the center of the map
    const centerOffset = Math.floor(mapSize / 2);
    
    // Loop through the map data and create meshes for each cell
    for (let z = 0; z < mapSize; z++) {
      for (let x = 0; x < mapSize; x++) {
        const cell = mapData[z][x];
        if (!cell) continue;
        
        // Convert grid coordinates to world coordinates with center offset
        const worldX = x - centerOffset;
        const worldZ = z - centerOffset;
        
        // Don't create terrain for water (already have ground plane)
        if (cell.type !== 'water') {
          // Create and add terrain mesh based on type
          try {
            const terrainMesh = createTerrainMesh(cell.type, worldX, 0, worldZ);
            if (terrainMesh) {
              terrainMesh.userData = { 
                type: 'terrain', 
                subtype: cell.type,
                gridX: x,
                gridZ: z
              };
              sceneRef.current.add(terrainMesh);
            }
          } catch (e) {
            console.error(`Error creating terrain mesh for ${cell.type} at (${x},${z}):`, e);
          }
        }
        
        // Add entities on this cell if needed
        if (cell.entities && Array.isArray(cell.entities)) {
          for (const entity of cell.entities) {
            try {
              const entityMesh = createEntityMesh(entity, worldX, 0, worldZ);
              if (entityMesh) {
                entityMesh.userData = { 
                  type: 'entity',
                  entityData: entity,
                  gridX: x,
                  gridZ: z
                };
                sceneRef.current.add(entityMesh);
                newEntities.push({
                  ...entity,
                  x: x,
                  z: z,
                  mesh: entityMesh
                });
              }
            } catch (e) {
              console.error(`Error creating entity mesh for ${entity.type} at (${x},${z}):`, e);
            }
          }
        }
      }
    }
    
    // Update entities state
    setEntities(newEntities);
    
    console.log("Finished rendering map objects, entity count:", newEntities.length);
    
    // Force a render after all objects are added
    if (rendererRef.current && sceneRef.current && cameraRef.current && mountedRef.current) {
      renderScene(rendererRef.current, sceneRef.current, cameraRef.current);
    }
  };

  // Function to create terrain mesh with improved visuals
  const createTerrainMesh = (type, x, y, z) => {
    if (!sceneRef.current) return null;
    
    let mesh;
    
    switch (type) {
      case 'water':
        // Create water surface
        const waterGeometry = new THREE.BoxGeometry(1, 0.2, 1);
        const waterMaterial = new THREE.MeshStandardMaterial({
          color: worldTheme?.includes('toxic') ? 0x44ff33 : 0x4488ff,
          transparent: true,
          opacity: 0.8,
          roughness: 0.1,
          metalness: 0.3
        });
        mesh = new THREE.Mesh(waterGeometry, waterMaterial);
        mesh.position.y = -0.05; // Slightly lower than ground
        break;
        
      case 'path':
        // Create path
        const pathGeometry = new THREE.PlaneGeometry(0.9, 0.9);
        const pathColor = worldTheme?.includes('desert') ? 0xDDCC99 : 
                          worldTheme?.includes('snow') ? 0xFFFFFF :
                          worldTheme?.includes('forest') ? 0x9B7653 : 0xCCBB99;
        const pathMaterial = new THREE.MeshStandardMaterial({
          color: pathColor,
          roughness: 0.9
        });
        mesh = new THREE.Mesh(pathGeometry, pathMaterial);
        mesh.rotation.x = -Math.PI / 2; // Horizontal
        mesh.position.y = 0.01; // Slightly above ground
        break;
        
      case 'tree':
        // Create tree with trunk and foliage
        mesh = new THREE.Group();
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.2, 1.0, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({
          color: 0x8B4513, // Brown
          roughness: 0.9
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 0.5; // Half height
        trunk.castShadow = true;
        mesh.add(trunk);
        
        // Foliage - use multiple cones for fuller look
        const foliageColor = worldTheme?.includes('desert') ? 0x7cac74 : // Pale green
                             worldTheme?.includes('snow') ? 0x93c088 : // Light green with snow
                             worldTheme?.includes('magic') ? 0x6633cc : // Purple magic trees
                             worldTheme?.includes('volcano') ? 0xaa3300 : // Scorched red
                             0x33AA33; // Default green
                             
        const foliageMaterial = new THREE.MeshStandardMaterial({
          color: foliageColor,
          roughness: 0.8
        });
        
        for (let i = 0; i < 3; i++) {
          const foliageGeometry = new THREE.ConeGeometry(0.6 - i * 0.1, 1.0, 8);
          const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
          foliage.position.y = 1.3 + i * 0.3; // Stack cones
          foliage.castShadow = true;
          mesh.add(foliage);
        }
        break;
        
      case 'rock':
        // Create a more interesting rock formation
        mesh = new THREE.Group();
        
        const rockColor = worldTheme?.includes('desert') ? 0xaa9977 : // Sandy rocks
                         worldTheme?.includes('snow') ? 0xdddddd : // White rocks
                         worldTheme?.includes('magic') ? 0x8866aa : // Purple-tinged
                         worldTheme?.includes('volcano') ? 0x443322 : // Dark volcanic
                         0x888888; // Default gray
        
        // Add 2-3 irregular rocks clustered together
        for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
          const rockGeometry = new THREE.SphereGeometry(0.2 + Math.random() * 0.2, 6, 6);
          
          // Randomly deform to make it more rock-like
          const vertices = rockGeometry.attributes.position;
          for (let j = 0; j < vertices.count; j++) {
            vertices.setXYZ(
              j,
              vertices.getX(j) + (Math.random() - 0.5) * 0.1,
              vertices.getY(j) + (Math.random() - 0.5) * 0.1,
              vertices.getZ(j) + (Math.random() - 0.5) * 0.1
            );
          }
          
          const rockMaterial = new THREE.MeshStandardMaterial({
            color: rockColor,
            roughness: 1.0
          });
          
          const rock = new THREE.Mesh(rockGeometry, rockMaterial);
          rock.position.set(
            (Math.random() - 0.5) * 0.4, // Offset X
            0.1 + Math.random() * 0.2,   // Offset Y
            (Math.random() - 0.5) * 0.4  // Offset Z
          );
          rock.rotation.y = Math.random() * Math.PI * 2;
          rock.castShadow = true;
          mesh.add(rock);
        }
        break;
        
      case 'house':
        mesh = createHouseMesh(worldTheme);
        break;
        
      case 'landmark':
        mesh = createLandmarkMesh(worldTheme);
        break;
        
      default:
        // Default empty cell - do nothing beyond the ground plane
        return null;
    }
    
    if (mesh) {
      mesh.position.x = x;
      mesh.position.z = z;
      mesh.userData = { type: 'terrain', subtype: type };
      return mesh;
    }
    
    return null;
  };

  // Create entity meshes (NPCs, items, etc.)
  const createEntityMesh = (entity, x, y, z) => {
    if (!sceneRef.current) return null;
    
    let mesh;
    
    switch (entity.type) {
      case 'npc':
      case 'enemy':
        // Create character model
        mesh = createCharacterMesh(entity.type);
        break;
        
      case 'item':
        // Create item model based on subtype
        mesh = createItemMesh(entity.subtype);
        break;
        
      case 'chest':
        // Create chest
        mesh = createChestMesh();
        break;
    }
    
    if (mesh) {
      mesh.position.x = x;
      mesh.position.z = z;
      mesh.userData = { type: 'entity', entityData: entity };
      
      // Add animation for items
      if (entity.type === 'item') {
        animateItem(mesh);
      }
      
      return mesh;
    }
    
    return null;
  };

  // Add player character to the scene
  const addPlayer = () => {
    if (!sceneRef.current || !mountedRef.current) {
      console.log("Cannot add player - scene not ready");
      return;
    }
    
    try {
      console.log("Adding player character at position:", playerPos);
      
      // First remove any existing player mesh
      if (playerMeshRef.current) {
        sceneRef.current.remove(playerMeshRef.current);
        if (playerMeshRef.current.geometry) playerMeshRef.current.geometry.dispose();
        if (playerMeshRef.current.material) {
          if (Array.isArray(playerMeshRef.current.material)) {
            playerMeshRef.current.material.forEach(m => m.dispose());
          } else {
            playerMeshRef.current.material.dispose();
          }
        }
        playerMeshRef.current = null;
      }
      
      sceneRef.current.traverse((object) => {
        if (object.userData.type === 'player') {
          sceneRef.current.remove(object);
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(m => m.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });
      
      // Convert player position to world coordinates
      const mapSize = 17; // Consistent with the map generation
      const worldX = playerPos.x - Math.floor(mapSize/2);
      const worldZ = playerPos.z - Math.floor(mapSize/2);
      
      // Create player mesh
      const characterGroup = createCharacterMesh('player');
      characterGroup.position.set(worldX, 0, worldZ);
      characterGroup.userData = { 
        type: 'player',
        animation: {
          type: 'bob',
          speed: 1.5,
          baseY: 0
        }
      };
      
      // Store the player mesh for future position updates
      playerMeshRef.current = characterGroup;
      
      // Add to scene
      sceneRef.current.add(characterGroup);
      
      // Update camera position
      updateCameraPosition();
      
      console.log("Player character added successfully");
      
      // Force a render
      if (rendererRef.current && sceneRef.current && cameraRef.current && mountedRef.current) {
        renderScene(rendererRef.current, sceneRef.current, cameraRef.current);
      }
    } catch (e) {
      console.error("Error adding player:", e);
    }
  };

  // Create a more detailed character mesh
  const createCharacterMesh = (type) => {
    let bodyColor, headColor;
    
    switch (type) {
      case 'player':
        bodyColor = 0x3366ff;
        headColor = 0xffcc99; 
        break;
      case 'npc':
        bodyColor = 0x66cc66; 
        headColor = 0xffcc99; 
        break;
      case 'merchant':
        bodyColor = 0xcc9966; 
        headColor = 0xffcc99; 
        break;
      case 'enemy':
        bodyColor = 0xcc3333; 
        headColor = 0xcccccc; 
        break;
      case 'guard':
        bodyColor = 0x444499;
        headColor = 0xffcc99;
        break;
      case 'elder':
        bodyColor = 0x996633;
        headColor = 0xffeeee;
        break;
      case 'child':
        bodyColor = 0xff9999;
        headColor = 0xffcc99;
        break;
      default:
        bodyColor = 0xcccccc; 
        headColor = 0xeeeeee;
    }
    
    const character = new THREE.Group();
    
    // Create more detailed body
    const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.7, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.35; // Half height
    body.castShadow = true;
    character.add(body);
    
    // Create head
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ color: headColor });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.85; // Above body
    head.castShadow = true;
    character.add(head);
    
    // Add arms
    const armGeometry = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ color: bodyColor });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.3, 0.35, 0);
    leftArm.rotation.z = Math.PI / 6; // Angle slightly outward
    leftArm.castShadow = true;
    character.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.3, 0.35, 0);
    rightArm.rotation.z = -Math.PI / 6; // Angle slightly outward
    rightArm.castShadow = true;
    character.add(rightArm);
    
    // Add legs
    const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x444466 });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, -0.1, 0);
    leftLeg.castShadow = true;
    character.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, -0.1, 0);
    rightLeg.castShadow = true;
    character.add(rightLeg);
    
    // Add animation data for character bobbing
    character.userData.animation = {
      type: 'bob',
      speed: 1.5,
      baseY: 0
    };
    
    // Add specific details based on character type
    if (type === 'player') {
      // Add a small backpack
      const backpackGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.15);
      const backpackMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      const backpack = new THREE.Mesh(backpackGeometry, backpackMaterial);
      backpack.position.set(0, 0.35, 0.2);
      character.add(backpack);
      
      // Add a sword on back
      const swordGeometry = new THREE.BoxGeometry(0.05, 0.4, 0.05);
      const swordMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xCCCCDD, 
        metalness: 0.7, 
        roughness: 0.3 
      });
      const sword = new THREE.Mesh(swordGeometry, swordMaterial);
      sword.position.set(0.1, 0.4, 0.2);
      sword.rotation.z = Math.PI / 8;
      character.add(sword);
    } else if (type === 'enemy') {
      // Add a weapon
      const weaponGeometry = new THREE.BoxGeometry(0.08, 0.5, 0.08);
      const weaponMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x888888,
        metalness: 0.7
      });
      const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
      weapon.position.set(0.4, 0.5, 0.2);
      weapon.rotation.z = Math.PI / 4;
      character.add(weapon);
    } else if (type === 'merchant') {
      // Add a merchant hat
      const hatGeometry = new THREE.ConeGeometry(0.3, 0.3, 8);
      const hatMaterial = new THREE.MeshStandardMaterial({ color: 0x666600 });
      const hat = new THREE.Mesh(hatGeometry, hatMaterial);
      hat.position.y = 1.05;
      character.add(hat);
      
      // Add a bag of goods
      const bagGeometry = new THREE.SphereGeometry(0.2, 8, 8);
      const bagMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      const bag = new THREE.Mesh(bagGeometry, bagMaterial);
      bag.position.set(-0.3, 0.0, 0);
      character.add(bag);
    } else if (type === 'guard') {
      // Add a helmet
      const helmetGeometry = new THREE.SphereGeometry(0.27, 16, 16);
      helmetGeometry.scale(1, 0.8, 1);
      const helmetMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x666666,
        metalness: 0.7,
        roughness: 0.3
      });
      const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
      helmet.position.y = 0.85;
      character.add(helmet);
      
      // Add a spear
      const spearGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8);
      const spearMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      const spear = new THREE.Mesh(spearGeometry, spearMaterial);
      spear.position.set(0.3, 0.5, 0);
      spear.rotation.z = -Math.PI / 12;
      character.add(spear);
      
      // Spear tip
      const tipGeometry = new THREE.ConeGeometry(0.04, 0.1, 8);
      const tipMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xCCCCDD,
        metalness: 0.7
      });
      const tip = new THREE.Mesh(tipGeometry, tipMaterial);
      tip.position.set(0, 0.8, 0);
      spear.add(tip);
    }
    
    return character;
  };

  // Helpers
  const isValidPosition = (x, y, mapData) => {
    if (x < 0 || y < 0 || x >= mapData[0].length || y >= mapData.length) return false;
    
    const cellType = mapData[y][x]?.type;
    // Valid positions are grass or path (not obstacles like trees, rocks, water)
    return cellType === 'grass' || cellType === 'path';
  };

  const getTerrainColor = (type) => {
    switch (type) {
      case 'grass': return 0x33aa33;
      case 'path': return 0xCCBB99;
      case 'water': return 0x3399ff;
      case 'rock': return 0x888888;
      case 'tree': return 0x228822;
      case 'wall': return 0x999999;
      default: return 0xaaaaaa;
    }
  };

  // Create a house mesh
  const createHouseMesh = (theme = worldTheme) => {
    const house = new THREE.Group();
    
    // House style based on theme
    if (theme?.includes('desert')) {
      // Desert/adobe style house
      const baseGeometry = new THREE.BoxGeometry(1.2, 0.7, 1.2);
      const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xd2b48c }); // Tan color
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = 0.35;
      base.castShadow = true;
      house.add(base);
      
      // Flat roof
      const roofGeometry = new THREE.BoxGeometry(1.3, 0.1, 1.3);
      const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xc19a6b });
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = 0.8;
      roof.castShadow = true;
      house.add(roof);
      
    } else if (theme?.includes('snow') || theme?.includes('ice')) {
      // Snow/ice igloo style
      const iglooGeometry = new THREE.SphereGeometry(0.8, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const iglooMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f8ff });
      const igloo = new THREE.Mesh(iglooGeometry, iglooMaterial);
      igloo.position.y = 0.4;
      igloo.castShadow = true;
      house.add(igloo);
      
      // Entrance
      const entranceGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 8, 1, false, 0, Math.PI);
      const entrance = new THREE.Mesh(entranceGeometry, iglooMaterial);
      entrance.position.set(0, 0.2, 0.7);
      entrance.rotation.y = Math.PI;
      house.add(entrance);
      
    } else if (theme?.includes('magic') || theme?.includes('arcane')) {
      // Magical tower
      const towerGeometry = new THREE.CylinderGeometry(0.5, 0.6, 1.6, 8);
      const towerMaterial = new THREE.MeshStandardMaterial({ color: 0x9370db }); // Purple
      const tower = new THREE.Mesh(towerGeometry, towerMaterial);
      tower.position.y = 0.8;
      tower.castShadow = true;
      house.add(tower);
      
      // Pointed roof
      const roofGeometry = new THREE.ConeGeometry(0.6, 0.7, 8);
      const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x800080 }); // Darker purple
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = 1.95;
      roof.castShadow = true;
      house.add(roof);
      
      // Glow effect
      const glowGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      const glowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xcc88ff,
        transparent: true,
        opacity: 0.7
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.y = 2.4;
      house.add(glow);
      
    } else if (theme?.includes('forest') || theme?.includes('jungle')) {
      // Wooden cabin
      const baseGeometry = new THREE.BoxGeometry(1.2, 0.9, 1.2);
      const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown wood
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = 0.45;
      base.castShadow = true;
      house.add(base);
      
      // Sloped roof
      const roofGeometry = new THREE.ConeGeometry(1.0, 0.7, 4);
      const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 }); // Darker brown
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = 1.25;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      house.add(roof);
      
    } else {
      // Default house
      const baseGeometry = new THREE.BoxGeometry(1.2, 0.8, 1.2);
      const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xDDCCAA });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = 0.4;
      base.castShadow = true;
      house.add(base);
      
      // Roof
      const roofGeometry = new THREE.ConeGeometry(1.0, 0.7, 4);
      const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xAA3333 });
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = 1.15;
      roof.rotation.y = Math.PI / 4; // Align with walls
      roof.castShadow = true;
      house.add(roof);
      
      // Door
      const doorGeometry = new THREE.PlaneGeometry(0.3, 0.5);
      const doorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, 
        side: THREE.DoubleSide
      });
      const door = new THREE.Mesh(doorGeometry, doorMaterial);
      door.position.set(0, 0.25, 0.61); // Front of house
      house.add(door);
    }
    
    return house;
  };

  // Create a landmark mesh
  const createLandmarkMesh = (theme = worldTheme) => {
    const landmark = new THREE.Group();
    
    if (theme?.includes('desert')) {
      // Desert pyramid or obelisk
      const baseGeometry = new THREE.BoxGeometry(2, 0.5, 2);
      const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xd2b48c });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = 0.25;
      landmark.add(base);
      
      // Pyramid shape
      const pyramidGeometry = new THREE.ConeGeometry(1.5, 2.5, 4);
      const pyramidMaterial = new THREE.MeshStandardMaterial({ color: 0xe6c99f });
      const pyramid = new THREE.Mesh(pyramidGeometry, pyramidMaterial);
      pyramid.position.y = 1.75;
      pyramid.rotation.y = Math.PI / 4;
      pyramid.castShadow = true;
      landmark.add(pyramid);
      
    } else if (theme?.includes('snow') || theme?.includes('ice')) {
      // Ice spire
      const baseGeometry = new THREE.CylinderGeometry(0.8, 1.0, 0.5, 8);
      const baseMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xadd8e6,
        transparent: true,
        opacity: 0.7
      });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = 0.25;
      landmark.add(base);
      
      // Crystal spire
      const spireGeometry = new THREE.ConeGeometry(0.6, 3.0, 8);
      const spireMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xf0f8ff,
        transparent: true,
        opacity: 0.6,
        metalness: 0.3,
        roughness: 0.2
      });
      const spire = new THREE.Mesh(spireGeometry, spireMaterial);
      spire.position.y = 2.0;
      spire.castShadow = true;
      landmark.add(spire);
      
    } else if (theme?.includes('magic') || theme?.includes('arcane')) {
      // Floating crystal
      const baseGeometry = new THREE.DodecahedronGeometry(0.7);
      const baseMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x9370db,
        emissive: 0x9370db,
        emissiveIntensity: 0.2,
        metalness: 0.8,
        roughness: 0.2
      });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = 1.5;
      base.castShadow = true;
      landmark.add(base);
      
      // Stone pillars around
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const pillarGeometry = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 6);
        const pillarMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.set(
          Math.cos(angle) * 1.2,
          0.75,
          Math.sin(angle) * 1.2
        );
        pillar.castShadow = true;
        landmark.add(pillar);
      }
      
      // Add a glow effect
      const glowGeometry = new THREE.SphereGeometry(0.9, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xcc88ff,
        transparent: true,
        opacity: 0.3
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.y = 1.5;
      landmark.add(glow);
      
    } else if (theme?.includes('forest') || theme?.includes('jungle')) {
      // Ancient tree or stone circle
      const baseGeometry = new THREE.CylinderGeometry(1.3, 1.5, 0.4, 8);
      const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x696969 });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = 0.2;
      landmark.add(base);
      
      // Standing stones
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2;
        const radius = 0.9;
        const height = 0.7 + Math.random() * 1.0;
        
        const stoneGeometry = new THREE.BoxGeometry(0.2, height, 0.2);
        const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
        const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
        stone.position.set(
          Math.cos(angle) * radius,
          height / 2,
          Math.sin(angle) * radius
        );
        stone.rotation.y = Math.random() * Math.PI * 0.25;
        stone.castShadow = true;
        landmark.add(stone);
      }
      
      // Center altar stone
      const altarGeometry = new THREE.BoxGeometry(0.7, 0.3, 0.7);
      const altarMaterial = new THREE.MeshStandardMaterial({ color: 0x696969 });
      const altar = new THREE.Mesh(altarGeometry, altarMaterial);
      altar.position.y = 0.45;
      altar.castShadow = true;
      landmark.add(altar);
      
    } else {
      // Default landmark/tower
      const towerGeometry = new THREE.CylinderGeometry(0.4, 0.5, 2.0, 8);
      const towerMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
      const tower = new THREE.Mesh(towerGeometry, towerMaterial);
      tower.position.y = 1.0;
      tower.castShadow = true;
      landmark.add(tower);
      
      // Top
      const topGeometry = new THREE.ConeGeometry(0.5, 0.7, 8);
      const topMaterial = new THREE.MeshStandardMaterial({ color: 0x3366CC });
      const top = new THREE.Mesh(topGeometry, topMaterial);
      top.position.y = 2.3;
      top.castShadow = true;
      landmark.add(top);
      
      // Add some glowing effect for a magical landmark
      const glowGeometry = new THREE.SphereGeometry(0.2, 8, 8);
      const glowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x66CCFF,
        transparent: true,
        opacity: 0.7
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.y = 2.8;
      landmark.add(glow);
    }
    
    // Add animation data for the glow
    landmark.userData.animation = {
      type: 'glow',
      speed: 1.5,
      target: landmark.children[landmark.children.length-1] // Last child (glow element)
    };
    
    return landmark;
  };

  // Create item mesh
  const createItemMesh = (type) => {
    let geometry, material;
    
    switch (type) {
      case 'potion':
        geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8);
        material = new THREE.MeshStandardMaterial({ 
          color: 0xff44ff,
          transparent: true,
          opacity: 0.8
        });
        break;
        
      case 'key':
        geometry = new THREE.TorusGeometry(0.1, 0.03, 8, 12);
        material = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
        break;
        
      case 'sword':
        const sword = new THREE.Group();
        
        // Blade
        const bladeGeometry = new THREE.BoxGeometry(0.05, 0.4, 0.08);
        const bladeMaterial = new THREE.MeshStandardMaterial({ 
          color: 0xDDDDDD,
          metalness: 0.7,
          roughness: 0.3
        });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.y = 0.1;
        sword.add(blade);
        
        // Handle
        const handleGeometry = new THREE.BoxGeometry(0.04, 0.1, 0.04);
        const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x663300 });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.y = -0.1;
        sword.add(handle);
        
        // Guard
        const guardGeometry = new THREE.BoxGeometry(0.15, 0.02, 0.04);
        const guardMaterial = new THREE.MeshStandardMaterial({ color: 0xAA8833 });
        const guard = new THREE.Mesh(guardGeometry, guardMaterial);
        guard.position.y = -0.05;
        sword.add(guard);
        
        return sword;
        
      case 'shield':
        geometry = new THREE.BoxGeometry(0.3, 0.4, 0.05);
        material = new THREE.MeshStandardMaterial({ color: 0x994400 });
        break;
        
      case 'gold':
        geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16);
        material = new THREE.MeshStandardMaterial({ 
          color: 0xFFD700,
          metalness: 0.8,
          roughness: 0.2
        });
        break;
        
      default:
        geometry = new THREE.SphereGeometry(0.1, 8, 8);
        material = new THREE.MeshStandardMaterial({ color: 0xCCCCCC });
    }
    
    if (type === 'sword') {
      return createItemMesh('sword');
    }
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.position.y = 0.2; // Lift slightly above ground
    
    return mesh;
  };

  // Create a chest mesh
  const createChestMesh = () => {
    const chest = new THREE.Group();
    
    // Base
    const baseGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.3);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.15;
    base.castShadow = true;
    chest.add(base);
    
    // Lid
    const lidGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.3);
    const lidMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const lid = new THREE.Mesh(lidGeometry, lidMaterial);
    lid.position.y = 0.35;
    lid.castShadow = true;
    chest.add(lid);
    
    // Add lock
    const lockGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.05);
    const lockMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFD700,
      metalness: 0.8
    });
    const lock = new THREE.Mesh(lockGeometry, lockMaterial);
    lock.position.set(0, 0.35, 0.175);
    chest.add(lock);
    
    return chest;
  };

  // Add animations for items
  const animateItem = (mesh) => {
    // Animation is handled in the render loop
    mesh.userData.animation = {
      type: 'float',
      speed: 0.5 + Math.random() * 0.5,
      offset: Math.random() * Math.PI * 2
    };
  };

  // Update camera position based on player
  const updateCameraPosition = () => {
    if (!cameraRef.current || !mountedRef.current) return;
    
    const camMode = cameraMode;
    const mapSize = 17;
    const worldX = playerPos.x - Math.floor(mapSize/2);
    const worldZ = playerPos.z - Math.floor(mapSize/2);
    
    console.log("Updating camera for mode:", camMode, "player at:", worldX, playerPos.y, worldZ);
    
    try {
      switch (camMode) {
        case 'follow':
          // Position camera behind and above player
          cameraRef.current.position.set(
            worldX - 5,
            7,
            worldZ + 5
          );
          cameraRef.current.lookAt(worldX, 0, worldZ);
          
          // Disable orbit controls in follow mode
          if (controlsRef.current) {
            controlsRef.current.enabled = false;
          }
          break;
          
        case 'firstPerson':
          // Position camera at player eye level
          cameraRef.current.position.set(
            worldX,
            1.7, // Eye level
            worldZ
          );
          cameraRef.current.lookAt(worldX + 2, 1.7, worldZ);
          
          // Disable orbit controls in first person mode
          if (controlsRef.current) {
            controlsRef.current.enabled = false;
          }
          break;
          
        case 'orbit':
          // Enable orbit controls and set target to player
          if (controlsRef.current) {
            controlsRef.current.enabled = true;
            controlsRef.current.target.set(worldX, 0, worldZ);
            
            // Make sure camera is at reasonable distance
            const distanceToTarget = cameraRef.current.position.distanceTo(
              new THREE.Vector3(worldX, 0, worldZ)
            );
            
            // If camera is too far or too close, reset position
            if (distanceToTarget > 25 || distanceToTarget < 5) {
              cameraRef.current.position.set(
                worldX + 10,
                10,
                worldZ + 10
              );
            }
          }
          break;
      }
      
      // Update camera projection matrix
      cameraRef.current.updateProjectionMatrix();
      
      // Force control update if using orbit
      if (controlsRef.current && camMode === 'orbit') {
        controlsRef.current.update();
      }
      
      // Force a render to update the view
      if (rendererRef.current && sceneRef.current && cameraRef.current && mountedRef.current) {
        renderScene(rendererRef.current, sceneRef.current, cameraRef.current);
      }
    } catch (e) {
      console.error("Error updating camera position:", e);
    }
  };

  // Add keyboard controls for player movement
  useEffect(() => {
    const handleKeyDown = (e) => {
      console.log("Key pressed:", e.key);
      
      if (loading) {
        console.log("Ignoring key press - loading state active");
        return;
      }
      
      // Don't handle movement keys when the input is focused
      if (document.activeElement === inputRef.current) {
        console.log("Ignoring key press - input is focused");
        return;
      }
      
      // Toggle UI with the 'H' key
      if (e.key.toLowerCase() === 'h') {
        setShowControls(prev => !prev);
        return;
      }
      
      // Explicitly prevent default behavior for WASD keys to avoid scrolling
      if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      
      let newX = playerPos.x;
      let newZ = playerPos.z;
      let action = null;
      
      // Always use grid-based movement instead of camera-relative movement
      // This ensures consistent player movement regardless of camera mode
      switch (e.key.toLowerCase()) {
        case 'w':
          newZ = Math.max(0, playerPos.z - 1);
          action = 'move north';
          break;
        case 's':
          newZ = Math.min(16, playerPos.z + 1);
          action = 'move south';
          break;
        case 'a':
          newX = Math.max(0, playerPos.x - 1);
          action = 'move west';
          break;
        case 'd':
          newX = Math.min(16, playerPos.x + 1); 
          action = 'move east';
          break;
      }
      
      // Action keys
      switch (e.key.toLowerCase()) {
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
        case 'c':
          // Cycle through camera modes
          setCameraMode(mode => {
            switch (mode) {
              case 'follow': return 'orbit';
              case 'orbit': return 'firstPerson';
              case 'firstPerson': return 'follow';
              default: return 'follow';
            }
          });
          return;
      }
      
      // Actually move the player if position changed
      if (newX !== playerPos.x || newZ !== playerPos.z) {
        console.log(`Moving player from (${playerPos.x},${playerPos.z}) to (${newX},${newZ})`);
        
        // Update player position state
        setPlayerPos({ x: newX, y: playerPos.y, z: newZ });
        
        // Check for entity interaction
        const entity = findEntityAtPosition(Math.floor(newX), Math.floor(newZ));
        handleEntityInteraction(entity, action);
        
        // Send action to the API
        if (action) {
          onAction(action);
        }
      } else if (action === 'examine surroundings' || action === 'interact') {
        // Handle non-movement actions
        const entity = findEntityAtPosition(Math.floor(playerPos.x), Math.floor(playerPos.z));
        handleEntityInteraction(entity, action);
        
        if (action) {
          onAction(action);
        }
      }
    };
    
    // Add event listeners to both window and container element
    window.addEventListener('keydown', handleKeyDown);
    
    // Attach to container for focus-related interactions
    if (containerRef.current) {
      containerRef.current.addEventListener('keydown', handleKeyDown);
      
      // Give the container tabIndex so it can receive keyboard events
      containerRef.current.tabIndex = 0;
      
      // Focus the container initially to capture keys immediately
      containerRef.current.focus();
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (containerRef.current) {
        containerRef.current.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [playerPos, loading, onAction]);
  
  // Add click handler for the WASD UI buttons
  const handleWASDClick = (direction) => {
    if (loading) return;
    
    console.log("WASD button clicked:", direction);
    
    let newX = playerPos.x;
    let newZ = playerPos.z;
    let action = null;
    
    // Grid-based movement for UI buttons
    switch (direction) {
      case 'w':
        newZ = Math.max(0, playerPos.z - 1);
        action = 'move north';
        break;
      case 's':
        newZ = Math.min(16, playerPos.z + 1);
        action = 'move south';
        break;
      case 'a':
        newX = Math.max(0, playerPos.x - 1);
        action = 'move west';
        break;
      case 'd':
        newX = Math.min(16, playerPos.x + 1);
        action = 'move east';
        break;
    }
    
    if (newX !== playerPos.x || newZ !== playerPos.z) {
      console.log(`Moving player from (${playerPos.x},${playerPos.z}) to (${newX},${newZ})`);
      setPlayerPos({ x: newX, y: playerPos.y, z: newZ });
      
      // Check for entity interaction
      const entity = findEntityAtPosition(Math.floor(newX), Math.floor(newZ));
      handleEntityInteraction(entity, action);
      
      // Send action to the API
      if (action) {
        onAction(action);
      }
    }
  };

  // Helper to find entity at a given position
  const findEntityAtPosition = (x, z) => {
    return entities.find(e => Math.floor(e.x) === x && Math.floor(e.z) === z);
  };

  // Handle entity interaction
  const handleEntityInteraction = (entity, action) => {
    if (!entity) return;
    
    if (entity.type === 'npc') {
      setMessage(entity.dialog || "Hello there!");
    } else if (entity.type === 'item') {
      const itemName = entity.subtype || 'item';
      setMessage(`You found a ${itemName}!`);
      
      // Remove the item from entities
      setEntities(entities.filter(e => e !== entity));
      
      // Remove the mesh from scene
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object.userData.entityData === entity) {
            sceneRef.current.remove(object);
          }
        });
      }
      
      // Notify the API
      if (action) onAction(`pick up ${itemName}`);
    } else if (entity.type === 'enemy') {
      setMessage(`Fighting ${entity.name || 'enemy'}!`);
      if (action) onAction(`attack ${entity.name || 'enemy'}`);
    } else if (entity.type === 'chest') {
      setMessage(`You found a chest containing ${entity.contents || 'treasure'}!`);
      if (action) onAction(`open chest`);
    }
  };

  // Add an effect to clear the map when component mounts
  useEffect(() => {
    // Reset the map and entities on component mount
    setGameMap([]);
    setEntities([]);
    console.log("3D engine mounted - state reset");
    
    return () => {
      console.log("3D engine unmounting");
      
      // Clear animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Clean up Three.js objects
      if (sceneRef.current) {
        disposeScene(sceneRef.current);
      }
      
      // Remove renderer from DOM
      if (rendererRef.current && containerRef.current) {
        try {
          const domElement = rendererRef.current.domElement;
          if (domElement && domElement.parentNode === containerRef.current) {
            containerRef.current.removeChild(domElement);
          }
          rendererRef.current.dispose();
        } catch (e) {
          console.error("Error cleaning up renderer:", e);
        }
      }
      
      // Dispose of controls
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      
      // Clear all refs
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  // Update the return JSX to include loading state
  return (
    <div className="game-engine-container">
      {/* Progress Bar */}
      {actionProgress.active && (
        <div className="action-progress-bar-container">
          <div 
            ref={progressBarRef}
            className={`action-progress-bar ${actionProgress.active ? 'active' : ''}`}
            style={{ width: `${actionProgress.progress}%` }}
          ></div>
        </div>
      )}
      
      {/* Initialization overlay */}
      {initializing && (
        <div className="initialization-overlay">
          <div className="initialization-message">
            Initializing game engine...
          </div>
          <div className="initialization-progress-container">
            <div className="initialization-progress-bar"></div>
          </div>
        </div>
      )}
      
      {/* WebGL error message */}
      {!webGLSupported && (
        <div className="webgl-error">
          <div className="error-message">
            <h3>WebGL Not Supported</h3>
            <p>Your browser or device doesn't support WebGL, which is required for 3D rendering.</p>
            <p>Try updating your browser or enabling hardware acceleration.</p>
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef} 
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
          <div className="camera-controls">
            <div className="camera-title">Camera Mode</div>
            <div className="camera-buttons">
              <button 
                onClick={() => setCameraMode('follow')} 
                className={cameraMode === 'follow' ? 'active' : ''}
                disabled={initializing || !gameReady}
              >
                Follow
              </button>
              <button 
                onClick={() => setCameraMode('orbit')} 
                className={cameraMode === 'orbit' ? 'active' : ''}
                disabled={initializing || !gameReady}
              >
                Orbit
              </button>
              <button 
                onClick={() => setCameraMode('firstPerson')} 
                className={cameraMode === 'firstPerson' ? 'active' : ''}
                disabled={initializing || !gameReady}
              >
                First Person
              </button>
            </div>
          </div>
          
          <div className="game-controls">
            <div className="wasd-controls">
              <div className="wasd-row">
                <button 
                  className="wasd-key" 
                  onClick={() => handleWASDClick('w')}
                  disabled={loading || initializing || !gameReady}
                >W</button>
              </div>
              <div className="wasd-row">
                <button 
                  className="wasd-key" 
                  onClick={() => handleWASDClick('a')}
                  disabled={loading || initializing || !gameReady}
                >A</button>
                <button 
                  className="wasd-key" 
                  onClick={() => handleWASDClick('s')}
                  disabled={loading || initializing || !gameReady}
                >S</button>
                <button 
                  className="wasd-key" 
                  onClick={() => handleWASDClick('d')}
                  disabled={loading || initializing || !gameReady}
                >D</button>
              </div>
            </div>
            
            <div className="action-controls">
              <button 
                onClick={() => handleEntityInteraction(findEntityAtPosition(Math.floor(playerPos.x), Math.floor(playerPos.z)), 'examine surroundings')}
                disabled={loading || initializing || !gameReady}
              >E: Examine</button>
              <button 
                onClick={() => {
                  handleEntityInteraction(findEntityAtPosition(Math.floor(playerPos.x), Math.floor(playerPos.z)), 'interact');
                  if (inputRef.current) inputRef.current.focus();
                }}
                disabled={loading || initializing || !gameReady}
              >F: Interact</button>
            </div>
            
            <form onSubmit={handleCommandSubmit} className="command-form">
              <input
                ref={inputRef}
                type="text"
                className="command-input"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder={initializing ? "Initializing..." : "Type a command... (press Enter to submit)"}
                disabled={loading || initializing || !gameReady}
              />
              <button 
                type="submit" 
                className="command-button" 
                disabled={loading || initializing || !gameReady}
              >
                {initializing ? "Loading..." : loading ? "Processing..." : "Execute"}
              </button>
            </form>
          </div>
        </>
      )}
      
      {/* Add CSS for initialization overlay */}
      <style jsx="true">{`
        .initialization-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          color: white;
        }
        
        .initialization-message {
          font-size: 1.2rem;
          margin-bottom: 1rem;
          text-shadow: 0 0 5px rgba(0, 100, 255, 0.7);
        }
        
        .initialization-progress-container {
          width: 60%;
          height: 10px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 5px;
          overflow: hidden;
        }
        
        .initialization-progress-bar {
          height: 100%;
          width: 100%;
          background: linear-gradient(90deg, #0088ff, #00aaff);
          animation: loading-pulse 1.5s infinite ease-in-out;
          transform-origin: left;
        }
        
        .webgl-error {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: rgba(0, 0, 0, 0.8);
          z-index: 1000;
        }
        
        .error-message {
          background-color: rgba(255, 255, 255, 0.9);
          padding: 2rem;
          border-radius: 5px;
          max-width: 500px;
          text-align: center;
        }
        
        @keyframes loading-pulse {
          0% { transform: scaleX(0.1); opacity: 0.7; }
          50% { transform: scaleX(1); opacity: 1; }
          100% { transform: scaleX(0.1); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default GameEngine3DThree; 