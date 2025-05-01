import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../App.css';
import './GameScreen.css';
import WorldConfig from './WorldConfig';
import StoryConfig from './StoryConfig';
import GameEngine3DThree from './GameEngine3DThree';

const GameScreen = ({ sessionId, initialGameData }) => {
  console.log("GameScreen rendered with sessionId:", sessionId);
  console.log("initialGameData:", initialGameData);
  
  const [gameData, setGameData] = useState(initialGameData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [storyNarrative, setStoryNarrative] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [asyncLoading, setAsyncLoading] = useState({
    active: false,
    progress: 0,
    message: ''
  });
  
  // Cache for performance optimization
  const cachedActions = useRef(new Map());
  const narrativeHistory = useRef([]);
  
  useEffect(() => {
    console.log("gameData updated:", gameData);
    if (gameData && gameData.narrative) {
      setStoryNarrative(gameData.narrative);
      narrativeHistory.current.push(gameData.narrative);
      
      // Keep only the last 10 narrative entries
      if (narrativeHistory.current.length > 10) {
        narrativeHistory.current.shift();
      }
    }
  }, [gameData]);

  const handleAction = async (action) => {
    console.log("Action requested:", action);
    
    // If we have this action cached and it's in the same context, use the cached version
    const cacheKey = `${action}-${JSON.stringify(gameData.player.stats)}-${JSON.stringify(gameData.gameState)}`;
    
    if (cachedActions.current.has(cacheKey) && !action.includes('examine') && !action.includes('interact')) {
      setGameData(cachedActions.current.get(cacheKey));
      
      // Force refresh of Three.js scene when using cached data
      // Wait for state update, then trigger a game state change to refresh 3D scene
      setTimeout(() => {
        const gameStateCopy = {...gameData.gameState};
        setGameData(prev => ({
          ...prev,
          gameState: {...gameStateCopy, _forceRefresh: Date.now()}
        }));
      }, 50);
      
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // For area transitions, display async loading indicator
    if (action.includes('enter') || action.includes('travel') || action.includes('go to')) {
      setAsyncLoading({
        active: true,
        progress: 0,
        message: 'Generating new area...'
      });
      
      // Simulate progress updates
      const interval = setInterval(() => {
        setAsyncLoading(prev => ({
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 15, 99)
        }));
      }, 200);
      
      // Clean up interval
      setTimeout(() => clearInterval(interval), 3000);
    }
    
    try {
      const response = await axios.post('/api/action', {
        sessionId,
        action
      });
      
      const newGameData = response.data.gameData;
      setGameData(newGameData);
      
      // Cache this action result for future quick access
      if (!action.includes('examine') && !action.includes('random')) {
        cachedActions.current.set(cacheKey, newGameData);
      }
      
      // Turn off async loading
      setAsyncLoading({
        active: false,
        progress: 100,
        message: ''
      });
    } catch (err) {
      console.error('Failed to process action:', err);
      setError('Failed to process your action. Please try again.');
      
      setAsyncLoading({
        active: false,
        progress: 0,
        message: ''
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  if (!gameData) {
    return (
      <div className="loading-container">
        <div>Loading your adventure world...</div>
      </div>
    );
  }

  return (
    <div className={`game-screen ${fullscreen ? 'fullscreen-mode' : ''}`}>
      <div className="story-summary">
        <div className="narrative-display">
          {storyNarrative}
        </div>
        <div className="game-controls-top">
          <button 
            className="fullscreen-toggle" 
            onClick={toggleFullscreen}
            title={fullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {fullscreen ? '◱' : '⛶'}
          </button>
        </div>
      </div>
      
      <div className="game-layout">
        <div className="world-config">
          <WorldConfig 
            gameState={gameData.gameState} 
            worldTheme={gameData.worldTheme}
          />
        </div>
        
        <div className="game-engine">
          <GameEngine3DThree 
            key="3d-engine"
            player={gameData.player}
            gameState={gameData.gameState}
            onAction={handleAction}
            loading={loading}
            initialGameData={initialGameData}
            asyncLoading={asyncLoading}
          />
        </div>
        
        <div className="story-config">
          <StoryConfig 
            player={gameData.player} 
            worldTheme={gameData.worldTheme}
            narrativeHistory={narrativeHistory.current}
          />
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default GameScreen; 