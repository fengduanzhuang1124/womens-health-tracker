import React, { useState } from 'react';
import '../../styles/NutritionTipsPopup.css';

/**
 * NutritionTipsPopup component
 * 
 * Shows a floating icon that displays healthy eating tips when clicked
 */
const NutritionTipsPopup = () => {
  const [showTips, setShowTips] = useState(false);
  
  // Toggle tips display
  const toggleTips = () => {
    setShowTips(!showTips);
  };
  
  return (
    <>
      <div className="nutrition-tips-icon" onClick={toggleTips}>
        <div className="cat-icon-container">
          <div className="cat-eyes"></div>
          <div className="cat-cheeks"></div>
          <div className="cat-mouth"></div>
          <div className="cat-heart"></div>
        </div>
      </div>
    
      {showTips && (
        <div className="nutrition-tips-modal" onClick={toggleTips}>
          <div className="nutrition-tips-container" onClick={(e) => e.stopPropagation()}>
            <div className="tips-close" onClick={toggleTips}>×</div>
            
            <div className="tips-header">
              <h3>Healthy Eating Tips</h3>
            </div>
            
            <div className="tips-content">
              <ul>
                <li>Try to eat at the same time each day to maintain regular eating habits</li>
                <li>Chew slowly during each meal, taking at least 20 minutes to enjoy your food</li>
                <li>Stay well hydrated by drinking at least 8 glasses of water daily</li>
                <li>Combine with appropriate exercise for optimal health results</li>
                <li>Include a variety of fruits and vegetables in your daily meals</li>
                <li>Limit processed foods and choose whole foods when possible</li>
                <li>Control your portion sizes to avoid overeating</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NutritionTipsPopup; 