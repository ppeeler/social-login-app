import { JwtPayload } from 'jwt-decode';

// Auth Types
export interface GoogleUser extends JwtPayload {
  email: string;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  accessToken: string;
  user: {
    email: string;
    name: string;
  };
}

// User Types
export interface User {
  email: string;
  name: string;
  favoriteColor?: string;
  created_at: string;
}

export interface UserResponse {
  success: boolean;
  user?: User;
  created?: boolean;
  error?: string;
}

export interface UpdateColorResponse {
  success: boolean;
  user?: User;
  error?: string;
}

// Component Props Types
export interface ColorPickerProps {
  user: User;
  onColorUpdate: (updatedUser: User) => void;
  onCancel: () => void;
}