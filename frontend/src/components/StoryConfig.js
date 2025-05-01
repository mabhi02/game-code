import React, { useState } from 'react';
import './ConfigPanels.css';

const StoryConfig = ({ player, worldTheme }) => {
  const [expanded, setExpanded] = useState(true);
  const [questDifficulty, setQuestDifficulty] = useState('Medium');
  const [enableSideQuests, setEnableSideQuests] = useState(true);
  const [enableRomance, setEnableRomance] = useState(false);
  const [storyPace, setStoryPace] = useState('Balanced');

  if (!player) return <div className="config-panel">No player data</div>;
  
  // Get quest types based on world theme
  const getQuestTypes = () => {
    const baseTypes = ['Main Story', 'Side Quests'];
    
    if (worldTheme?.includes('fantasy')) {
      return [...baseTypes, 'Dragon Hunts', 'Magical Artifacts'];
    } else if (worldTheme?.includes('sci-fi')) {
      return [...baseTypes, 'Space Exploration', 'Tech Recovery'];
    } else if (worldTheme?.includes('horror')) {
      return [...baseTypes, 'Investigations', 'Survival'];
    } else if (worldTheme?.includes('western')) {
      return [...baseTypes, 'Bounty Hunting', 'Gold Rush'];
    } else if (worldTheme?.includes('cyberpunk')) {
      return [...baseTypes, 'Hacking', 'Corporate Espionage'];
    } else {
      return [...baseTypes, 'Exploration', 'Collection'];
    }
  };

  return (
    <div className="config-panel">
      <div className="config-header" onClick={() => setExpanded(!expanded)}>
        <h3>Story Config</h3>
        <span className="toggle-icon">{expanded ? '▼' : '►'}</span>
      </div>
      
      {expanded && (
        <div className="config-content">
          <h4>Player: {player.name}</h4>
          
          <h4>Stats</h4>
          <div className="stats-list">
            {Object.entries(player.stats).map(([key, value]) => (
              <div key={key} className="stat-item">
                <span className="stat-name">{key}:</span>
                <span className="stat-value">{value}</span>
              </div>
            ))}
          </div>
          
          <h4>Inventory</h4>
          <div className="inventory-list">
            {player.inventory.length === 0 ? (
              <div className="empty-inventory">Empty</div>
            ) : (
              player.inventory.map((item, index) => (
                <div key={index} className="inventory-item">
                  {typeof item === 'string' ? item : item.name}
                </div>
              ))
            )}
          </div>
          
          <h4>Quest Options</h4>
          <div className="config-item">
            <label>Quest Difficulty:</label>
            <select 
              className="config-control"
              value={questDifficulty}
              onChange={(e) => setQuestDifficulty(e.target.value)}
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
              <option>Epic</option>
            </select>
          </div>
          
          <div className="config-item">
            <label>Story Pace:</label>
            <select 
              className="config-control"
              value={storyPace}
              onChange={(e) => setStoryPace(e.target.value)}
            >
              <option>Slow</option>
              <option>Balanced</option>
              <option>Fast</option>
              <option>Dynamic</option>
            </select>
          </div>
          
          <h4>Active Quests</h4>
          <div className="quest-list">
            {getQuestTypes().map((quest, index) => (
              <div key={index} className="quest-option">
                <input 
                  type="checkbox" 
                  id={`quest-${index}`} 
                  checked={index < 2 ? true : Math.random() > 0.5}
                  readOnly
                />
                <label htmlFor={`quest-${index}`}>{quest}</label>
              </div>
            ))}
          </div>
          
          <div className="story-toggles">
            <div className="config-checkbox">
              <input 
                type="checkbox" 
                id="enableSideQuests" 
                checked={enableSideQuests}
                onChange={() => setEnableSideQuests(!enableSideQuests)}
              />
              <label htmlFor="enableSideQuests">Enable Side Quests</label>
            </div>
            
            <div className="config-checkbox">
              <input 
                type="checkbox" 
                id="enableRomance" 
                checked={enableRomance}
                onChange={() => setEnableRomance(!enableRomance)}
              />
              <label htmlFor="enableRomance">Enable Romance</label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryConfig; 