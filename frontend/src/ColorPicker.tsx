// ColorPicker.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { User, ColorPickerProps } from './types';

const ColorPicker: React.FC<ColorPickerProps> = ({ user, onColorUpdate, onCancel }) => {
  const [selectedColor, setSelectedColor] = useState(user.favoriteColor || '#000000');
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/user/color`, {
        email: user.email,
        color: selectedColor
      });

      if (response.data.success) {
        onColorUpdate(response.data.user);
      } else {
        setError(response.data.error || 'Failed to update color');
      }
    } catch (error) {
      setError('Failed to save color preference');
      console.error('Color update error:', error);
    }
  };

  return (
    <div className="color-picker-container">
      <h3>Select Your Favorite Color</h3>
      {error && <p className="error-message">{error}</p>}
      
      <form onSubmit={handleSubmit}>
        <div className="color-input-group">
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="color-input"
          />
          <span>{selectedColor}</span>
        </div>
        
        <div className="button-group">
          <button type="submit" className="submit-button">
            Save Color
          </button>
          <button type="button" onClick={onCancel} className="cancel-button">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ColorPicker;