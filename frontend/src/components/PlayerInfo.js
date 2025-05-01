import React, { useState } from 'react';

const PlayerInfo = ({ player }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  if (!player) return null;
  
  const { name, stats, inventory } = player;
  
  return (
    <div className="player-info">
      <div className="player-header" onClick={() => setShowDetails(!showDetails)}>
        <h3>{name}</h3>
        <span className="toggle-icon">{showDetails ? '▼' : '►'}</span>
      </div>
      
      {showDetails && (
        <div className="player-details">
          <div className="stats-section">
            <h4>Stats</h4>
            <ul className="stats-list">
              {Object.entries(stats).map(([key, value]) => (
                <li key={key}>
                  <span className="stat-name">{key}:</span> 
                  <span className="stat-value">{value}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="inventory-section">
            <h4>Inventory</h4>
            {inventory.length === 0 ? (
              <p>Empty</p>
            ) : (
              <ul className="inventory-list">
                {inventory.map((item, index) => (
                  <li key={index}>{typeof item === 'string' ? item : item.name}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      
      <style jsx>{`
        .player-info {
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: var(--border-radius);
          margin-bottom: 20px;
          overflow: hidden;
        }
        
        .player-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          background-color: var(--primary-color);
          cursor: pointer;
        }
        
        .player-header h3 {
          margin: 0;
          font-size: 18px;
        }
        
        .toggle-icon {
          font-size: 12px;
        }
        
        .player-details {
          padding: 15px;
          text-align: left;
        }
        
        .stats-section, .inventory-section {
          margin-bottom: 15px;
        }
        
        h4 {
          margin: 0 0 10px 0;
          font-size: 16px;
          color: var(--accent-color);
        }
        
        .stats-list, .inventory-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .stats-list li, .inventory-list li {
          padding: 5px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .stat-name {
          text-transform: capitalize;
          font-weight: bold;
          margin-right: 5px;
        }
      `}</style>
    </div>
  );
};

export default PlayerInfo; 