import React, { useState } from 'react';
import './ConfigPanels.css';

const WorldConfig = ({ gameState, worldTheme }) => {
  const [expanded, setExpanded] = useState(true);
  const [weather, setWeather] = useState('Sunny');
  const [timeOfDay, setTimeOfDay] = useState('Day');
  const [showEnemies, setShowEnemies] = useState(true);
  const [showTreasures, setShowTreasures] = useState(true);
  const [showNPCs, setShowNPCs] = useState(true);

  if (!gameState) return <div className="config-panel">No world data</div>;
  
  // Determine possible weather based on world theme
  const getWeatherOptions = () => {
    if (worldTheme?.includes('desert')) {
      return ['Sunny', 'Sandstorm', 'Scorching'];
    } else if (worldTheme?.includes('snow') || worldTheme?.includes('ice')) {
      return ['Snowy', 'Blizzard', 'Clear', 'Aurora'];
    } else if (worldTheme?.includes('tropical')) {
      return ['Sunny', 'Rainy', 'Stormy', 'Humid'];
    } else {
      return ['Sunny', 'Rainy', 'Stormy', 'Foggy', 'Cloudy'];
    }
  };

  return (
    <div className="config-panel">
      <div className="config-header" onClick={() => setExpanded(!expanded)}>
        <h3>World Config</h3>
        <span className="toggle-icon">{expanded ? '▼' : '►'}</span>
      </div>
      
      {expanded && (
        <div className="config-content">
          {worldTheme && (
            <div className="world-theme">
              <h4>Theme</h4>
              <div className="theme-badge">
                {worldTheme}
              </div>
            </div>
          )}
          
          <h4>Environment</h4>
          <div className="config-item">
            <label>Weather:</label>
            <select 
              className="config-control"
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
            >
              {getWeatherOptions().map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          
          <div className="config-item">
            <label>Time of Day:</label>
            <select 
              className="config-control"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
            >
              <option>Dawn</option>
              <option>Morning</option>
              <option>Day</option>
              <option>Evening</option>
              <option>Dusk</option>
              <option>Night</option>
            </select>
          </div>
          
          <h4>Map Features</h4>
          <div className="config-checkbox">
            <input 
              type="checkbox" 
              id="showEnemies" 
              checked={showEnemies}
              onChange={() => setShowEnemies(!showEnemies)}
            />
            <label htmlFor="showEnemies">Show Enemies</label>
          </div>
          
          <div className="config-checkbox">
            <input 
              type="checkbox" 
              id="showTreasures" 
              checked={showTreasures}
              onChange={() => setShowTreasures(!showTreasures)}
            />
            <label htmlFor="showTreasures">Show Treasures</label>
          </div>
          
          <div className="config-checkbox">
            <input 
              type="checkbox" 
              id="showNPCs" 
              checked={showNPCs}
              onChange={() => setShowNPCs(!showNPCs)}
            />
            <label htmlFor="showNPCs">Show NPCs</label>
          </div>
          
          <h4>Game Stats</h4>
          <div className="stats-list">
            {Object.entries(gameState).map(([key, value]) => {
              // Don't show complex objects in the stats list
              if (typeof value === 'object') return null;
              
              return (
                <div key={key} className="stat-item">
                  <span className="stat-name">{key}:</span>
                  <span className="stat-value">{JSON.stringify(value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldConfig; 