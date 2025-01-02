import { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse, googleLogout } from '@react-oauth/google';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import axios from 'axios';
import './App.css';

interface TestResponse {
  message: string;
}

interface GoogleUser extends JwtPayload {
  email: string;
  name: string;
}

function App() {
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [user, setUser] = useState<GoogleUser | null>(null);

  // check to see if there's a live token in local storage
  useEffect(() => {
    const googleCredential = localStorage.getItem('googleCredential');

    if (googleCredential) {
      try {
        const decoded = jwtDecode<GoogleUser>(googleCredential);

        // Check if token is expired
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < currentTime) {
          handleLogout();
          return;
        }

        setUser(decoded);

        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        }
      } catch (error) {
        localStorage.removeItem('googleCredential');
        localStorage.removeItem('accessToken');
        delete axios.defaults.headers.common['Authorization'];
      }
    }
  }, []);

  useEffect(() => {
    // Add response interceptor for 401 errors
    const interceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await axios.post(`${apiUrl}/api/auth/refresh`);
            const newToken = response.data.accessToken;

            localStorage.setItem('accessToken', newToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

            return axios(originalRequest);
          } catch (refreshError) {
            handleLogout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL;

    axios.get<TestResponse>(`${apiUrl}/api/test`)
      .then(response => {
        setMessage(response.data.message);
      })
      .catch(error => {
        if (axios.isAxiosError(error)) {
          if (error.response) {
            setError(`Server error: ${error.response.status}`);
          } else if (error.request) {
            setError('No response from server');
          } else {
            setError('Error: ' + error.message);
          }
        } else {
          setError('An unexpected error occurred');
        }
      });
  }, []);

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    try {

      localStorage.setItem('googleCredential', credentialResponse.credential ?? '');
      const decoded = jwtDecode<GoogleUser>(credentialResponse.credential ?? '');

      console.log('Token expires:', new Date(decoded.exp! * 1000).toLocaleString());

      setUser(decoded);

      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.post(`${apiUrl}/api/auth/google`, {
        token: credentialResponse.credential
      });

      if (response.data.success) {
        // Handle successful authentication (e.g., store token)
        console.log('Authentication successful');

        // Store the access token from your backend
        localStorage.setItem('accessToken', response.data.accessToken);

        // Configure axios to use the token
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError('Authentication failed');
      console.error('Auth error:', error);
    }
  };

  const handleLogout = () => {
    googleLogout();
    setUser(null);
    localStorage.removeItem('googleCredential');
    localStorage.removeItem('accessToken');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <div>
      <h1>Social Login App</h1>
      {message && <p>Message from backend: {message}</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        {!user ? (
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError('Login Failed')}
          />
        ) : (
          <div>
            <h2>Welcome, {user.name}!</h2>
            <button
              onClick={handleLogout}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#4287f5',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        )}
      </GoogleOAuthProvider>
    </div>
  );
}

export default App;