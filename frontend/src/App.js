import React, { useState, useEffect } from 'react';
import './App.css';
import StartScreen from './components/StartScreen';
import GameScreen from './components/GameScreen';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [gameData, setGameData] = useState(null);

  // Check for WebGL support for 3D rendering
  useEffect(() => {
    const checkWebGLSupport = () => {
      try {
        const canvas = document.createElement('canvas');
        return !!(
          window.WebGLRenderingContext && 
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
      } catch (e) {
        return false;
      }
    };

    const hasWebGL = checkWebGLSupport();
    if (!hasWebGL) {
      console.warn('WebGL not supported - 3D mode will not be available');
    }
  }, []);

  // Function to start a new game
  const startGame = (sessionData) => {
    setSessionId(sessionData.sessionId);
    setGameData(sessionData.gameData);
    setGameStarted(true);
  };

  return (
    <div className="App">
      {!gameStarted ? (
        <StartScreen onGameStart={startGame} />
      ) : (
        <GameScreen sessionId={sessionId} initialGameData={gameData} />
      )}
    </div>
  );
}

export default App; 