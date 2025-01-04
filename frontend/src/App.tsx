import { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import axios, { AxiosError } from 'axios';
import { GoogleUser, AuthResponse, User, UserResponse, extendedColors } from './types';
import nearestColor from 'nearest-color';
import ColorPicker from './ColorPicker';
import './App.css';

// Constants
const API_URL = import.meta.env.VITE_API_URL;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Create the color matcher
const getColorName = nearestColor.from(extendedColors);

// Custom hook for API calls
const useApi = () => {
  const handleApiError = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        return `Server error: ${axiosError.response.status}`;
      }
      if (axiosError.request) {
        return 'No response from server';
      }
      return `Error: ${axiosError.message}`;
    }
    return 'An unexpected error occurred';
  };

  const authenticateWithGoogle = async (token: string): Promise<AuthResponse> => {
    const response = await axios.post<AuthResponse>(`${API_URL}/api/auth/google`, { token });
    return response.data;
  };

  const createOrFetchUser = async (email: string, name: string): Promise<UserResponse> => {
    const response = await axios.post<UserResponse>(`${API_URL}/api/user`, { email, name });
    return response.data;
  };

  return { authenticateWithGoogle, createOrFetchUser, handleApiError };
};

// Custom hook for auth state management
const useAuth = () => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const api = useApi();

  const setupAxiosInterceptor = () => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const response = await axios.post(`${API_URL}/api/auth/refresh`);
            const newToken = response.data.accessToken;

            localStorage.setItem('accessToken', newToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

            return axios(originalRequest);
          } catch (refreshError) {
            logout();
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  };

  const checkStoredCredentials = () => {
    const googleCredential = localStorage.getItem('googleCredential');
    if (!googleCredential) return false;

    try {
      const decoded = jwtDecode<GoogleUser>(googleCredential);
      const currentTime = Math.floor(Date.now() / 1000);

      if (decoded.exp && decoded.exp < currentTime) {
        logout();
        return false;
      }

      setUser(decoded);
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        return true;
      }
    } catch (error) {
      console.error("Error checking stored credentials:", error);
      logout();
    }
    return false;
  };

  const handleGoogleAuth = async (credential: string) => {
    try {
      localStorage.setItem('googleCredential', credential);
      const decoded = jwtDecode<GoogleUser>(credential);
      setUser(decoded);

      const authResponse = await api.authenticateWithGoogle(credential);
      if (!authResponse.success) throw new Error('Authentication failed');

      const { accessToken } = authResponse;
      localStorage.setItem('accessToken', accessToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      
      setIsAuthenticated(true);
      return decoded;
    } catch (error) {
      logout();
      throw error;
    }
  };

  const login = async (credentialResponse: CredentialResponse): Promise<void> => {
    if (!credentialResponse.credential) {
      throw new Error('No credential received');
    }
    
    const googleUser = await handleGoogleAuth(credentialResponse.credential);
    if (!googleUser.email || !googleUser.name) {
      throw new Error('Invalid user data received');
    }
  };

  const logout = () => {
    googleLogout();
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('googleCredential');
    localStorage.removeItem('accessToken');
    delete axios.defaults.headers.common['Authorization'];
  };

  useEffect(() => {
    const cleanup = setupAxiosInterceptor();
    const hasValidCredentials = checkStoredCredentials();
    setIsAuthenticated(hasValidCredentials);
    return cleanup;
  }, []);

  return { user, isAuthenticated, login, logout };
};

// Main App component
function App() {
  const [error, setError] = useState<string>('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const { user, isAuthenticated, login, logout } = useAuth();
  const api = useApi();

  useEffect(() => {
    const fetchUserData = async () => {
      if (isAuthenticated && user?.email && user?.name) {
        try {
          const userResponse = await api.createOrFetchUser(user.email, user.name);
          if (!userResponse.success) {
            throw new Error('Failed to create/fetch user record');
          }
          if (userResponse.user) {
            setUserData(userResponse.user);
          } else {
            setUserData(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setError(api.handleApiError(error));
        }
      } else {
        setUserData(null);
      }
    };

    fetchUserData();
  }, [isAuthenticated, user]);

  const handleColorUpdate = (updatedUser: User) => {
    setUserData(updatedUser);
    setShowColorPicker(false);
  };

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      await login(credentialResponse);
    } catch (error) {
      setError('Authentication failed');
      console.error('Auth error:', error);
    }
  };

  return (
    <div className="app-container">
      <h1>Social Login App</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        {!isAuthenticated ? (
          <div className="login-container">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => setError('Login Failed')}
            />
          </div>
        ) : (
          <div className="user-container">
            <h2>Welcome, {user?.name}!</h2>

            {userData?.favoriteColor ? (
              <div className="color-display">
                <p>Your favorite color is:</p>
                <div
                  className="color-swatch"
                  style={{ backgroundColor: userData.favoriteColor }}
                />
                <p>{getColorName(userData.favoriteColor)?.name}</p>
                <button onClick={() => setShowColorPicker(true)}>
                  Change Color
                </button>
              </div>
            ) : (
              <button onClick={() => setShowColorPicker(true)}>
                Select Favorite Color
              </button>
            )}

            {showColorPicker && userData && (
              <ColorPicker
                user={userData}
                onColorUpdate={handleColorUpdate}
                onCancel={() => setShowColorPicker(false)}
              />
            )}

            <button onClick={logout} className="logout-button">
              Logout
            </button>
          </div>
        )}
      </GoogleOAuthProvider>
    </div>
  );
}

export default App;