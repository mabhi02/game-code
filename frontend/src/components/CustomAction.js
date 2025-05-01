import React, { useState } from 'react';

const CustomAction = ({ onSubmit, disabled }) => {
  const [customAction, setCustomAction] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (customAction.trim()) {
      onSubmit(customAction);
      setCustomAction('');
    }
  };
  
  return (
    <div className="custom-action">
      <form onSubmit={handleSubmit}>
        <div className="input-row">
          <input
            type="text"
            value={customAction}
            onChange={(e) => setCustomAction(e.target.value)}
            placeholder="Type a custom action..."
            disabled={disabled}
          />
          <button 
            type="submit" 
            disabled={disabled || !customAction.trim()}
            className="submit-button"
          >
            Do it
          </button>
        </div>
      </form>
      
      <style jsx>{`
        .custom-action {
          margin-top: 20px;
        }
        
        .input-row {
          display: flex;
          gap: 10px;
        }
        
        input {
          flex: 1;
          min-width: 0;
        }
        
        .submit-button {
          background-color: var(--accent-color);
          white-space: nowrap;
        }
        
        .submit-button:hover:not(:disabled) {
          background-color: #e67e22;
        }
      `}</style>
    </div>
  );
};

export default CustomAction; 