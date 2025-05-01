import React from 'react';

const Narrative = ({ text, loading }) => {
  return (
    <div className="narrative">
      <div className="narrative-text">
        {loading ? (
          <div className="loading-text">
            <p>The story unfolds...</p>
            <div className="loading-animation"></div>
          </div>
        ) : (
          <p>{text}</p>
        )}
      </div>
      <style jsx>{`
        .narrative {
          margin-bottom: 30px;
          text-align: left;
        }
        
        .narrative-text {
          background-color: rgba(0, 0, 0, 0.3);
          padding: 20px;
          border-radius: var(--border-radius);
          font-size: 18px;
          line-height: 1.6;
        }
        
        .loading-text {
          opacity: 0.7;
          font-style: italic;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .loading-animation {
          width: 50px;
          height: 10px;
          background: linear-gradient(90deg, 
            var(--secondary-color) 0%, 
            var(--primary-color) 50%, 
            var(--accent-color) 100%);
          border-radius: 10px;
          animation: loading 1.5s infinite;
          margin-top: 10px;
        }
        
        @keyframes loading {
          0% { transform: translateX(-20px); }
          50% { transform: translateX(20px); }
          100% { transform: translateX(-20px); }
        }
      `}</style>
    </div>
  );
};

export default Narrative; 