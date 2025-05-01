import React, { useState } from 'react';
import axios from 'axios';
import '../App.css';
import './StartScreen.css';

const StartScreen = ({ onGameStart }) => {
  const [playerName, setPlayerName] = useState('');
  const [gameSetting, setGameSetting] = useState('fantasy');
  const [storyPrompt, setStoryPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const settings = [
    { value: 'fantasy', label: 'Fantasy' },
    { value: 'sci-fi', label: 'Sci-Fi' },
    { value: 'western', label: 'Western' },
    { value: 'cyberpunk', label: 'Cyberpunk' },
    { value: 'horror', label: 'Horror' },
    { value: 'mystery', label: 'Mystery' },
    { value: 'post-apocalyptic', label: 'Post-Apocalyptic' },
    { value: 'steampunk', label: 'Steampunk' },
    { value: 'historical', label: 'Historical' },
    { value: 'superhero', label: 'Superhero' },
  ];

  const startGame = async () => {
    if (!storyPrompt.trim()) {
      setError('Please enter a story prompt to begin your adventure');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/start-game', {
        playerName: playerName.trim() || 'Adventurer',
        gameSetting,
        storyPrompt: storyPrompt.trim()
      });
      
      onGameStart(response.data);
    } catch (err) {
      console.error('Failed to start game:', err);
      setError('Failed to start game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="start-screen">
      <div className="start-container">
        <h1 className="game-title">MiniQuest</h1>
        <h2 className="game-subtitle">AI-Powered Procedural Game Engine</h2>
        
        <div className="form-group">
          <label htmlFor="playerName">Your Character Name:</label>
          <input
            type="text"
            id="playerName"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="gameSetting">Game Setting:</label>
          <select
            id="gameSetting"
            value={gameSetting}
            onChange={(e) => setGameSetting(e.target.value)}
          >
            {settings.map((setting) => (
              <option key={setting.value} value={setting.value}>
                {setting.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group story-prompt-group">
          <label htmlFor="storyPrompt">Story Prompt:</label>
          <textarea
            id="storyPrompt"
            value={storyPrompt}
            onChange={(e) => setStoryPrompt(e.target.value)}
            placeholder="Describe your adventure... (e.g., 'A mystical world where technology and magic coexist, and you're a rogue scientist trying to unlock ancient secrets')"
            rows={5}
          />
          <p className="prompt-help">This will generate the world, characters, and story of your game.</p>
        </div>
        
        {error && <div className="error">{error}</div>}
        
        <button 
          onClick={startGame} 
          disabled={loading}
          className="start-button"
        >
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              Creating your world...
            </>
          ) : (
            'Begin Your Adventure'
          )}
        </button>
      </div>
    </div>
  );
};

export default StartScreen; 