import React, { useState, useEffect, useRef, MouseEvent, useCallback } from 'react';
import axios from 'axios';
import { User } from './types';

interface ColorPickerProps {
  user: User;
  onColorUpdate: (user: User) => void; 
  onCancel: () => void;
}

interface Position {
  x: number;
  y: number;
}

const CustomColorPicker: React.FC<ColorPickerProps> = ({ user, onColorUpdate, onCancel }) => {
  const [selectedColor, setSelectedColor] = useState(user.favoriteColor || '#000000');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<Position>({ x: 0.5, y: 0.5 });
  const [hue, setHue] = useState(180); // 0-360 degrees
  
  const gradientRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleGradientMouseDown = (e: MouseEvent) => {
    if (!gradientRef.current) return;
    
    const rect = gradientRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setCursorPosition({ 
      x: Math.max(0, Math.min(1, x)), 
      y: Math.max(0, Math.min(1, y)) 
    });
    setIsDragging(true);
    
    // Update color based on position
    updateColorFromPosition({ x, y }, hue);
  };

  const handleSliderMouseDown = (e: MouseEvent) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    setHue(x * 360);
    updateColorFromPosition(cursorPosition, x * 360);
  };

  const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
    if (!isDragging || !gradientRef.current) return;
    
    const rect = gradientRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    const newPos = { 
      x: Math.max(0, Math.min(1, x)), 
      y: Math.max(0, Math.min(1, y)) 
    };
    
    setCursorPosition(newPos);
    updateColorFromPosition(newPos, hue);
  }, [isDragging, hue]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const updateColorFromPosition = (pos: Position, currentHue: number) => {
    // Convert HSV to RGB
    const saturation = pos.x;
    const value = 1 - pos.y;
    
    const h = currentHue / 60;
    const c = value * saturation;
    const x = c * (1 - Math.abs((h % 2) - 1));
    const m = value - c;

    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 1) { [r, g, b] = [c, x, 0]; }
    else if (h >= 1 && h < 2) { [r, g, b] = [x, c, 0]; }
    else if (h >= 2 && h < 3) { [r, g, b] = [0, c, x]; }
    else if (h >= 3 && h < 4) { [r, g, b] = [0, x, c]; }
    else if (h >= 4 && h < 5) { [r, g, b] = [x, 0, c]; }
    else { [r, g, b] = [c, 0, x]; }

    const rgb = {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };

    const hex = '#' + 
      rgb.r.toString(16).padStart(2, '0') +
      rgb.g.toString(16).padStart(2, '0') +
      rgb.b.toString(16).padStart(2, '0');

    setSelectedColor(hex);
  };

  const handleSubmit = async () => {
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
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-inner">
          <h2 className="modal-title">Color picker</h2>
          
          {error && (
            <p className="error-message">{error}</p>
          )}

          <div 
            ref={gradientRef}
            className="color-gradient"
            onMouseDown={handleGradientMouseDown}
            style={{
              background: `
                linear-gradient(to bottom, transparent, #000),
                linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))
              `
            }}
          >
            <div 
              className="color-cursor"
              style={{
                left: `${cursorPosition.x * 100}%`,
                top: `${cursorPosition.y * 100}%`
              }}
            />
          </div>

          <div 
            ref={sliderRef}
            className="hue-slider"
            onMouseDown={handleSliderMouseDown}
          >
            <div 
              className="hue-slider-thumb"
              style={{ left: `${(hue / 360) * 100}%` }}
            />
          </div>

          <div className="color-input-container">
            <label className="color-input-label">HEX</label>
            <div className="color-input-wrapper">
              <input
                type="text"
                value={selectedColor.toUpperCase()}
                readOnly
                className="color-input"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button onClick={handleSubmit} className="save-button">
              Save Color
            </button>
            <button onClick={onCancel} className="cancel-button">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomColorPicker;