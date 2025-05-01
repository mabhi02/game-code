import React from 'react';

const ActionButtons = ({ actions, onActionClick, disabled }) => {
  if (!actions || actions.length === 0) return null;
  
  return (
    <div className="action-buttons">
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={() => onActionClick(action)}
          disabled={disabled}
          className="action-button"
        >
          {action}
        </button>
      ))}
      
      <style jsx>{`
        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .action-button {
          background-color: var(--secondary-color);
          text-align: left;
          padding: 12px 15px;
          transition: all 0.2s ease;
        }
        
        .action-button:hover:not(:disabled) {
          background-color: #2980b9;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default ActionButtons; 