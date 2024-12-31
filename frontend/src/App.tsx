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
  picture: string;
}

function App() {
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [user, setUser] = useState<GoogleUser | null>(null);

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
      const decoded = jwtDecode<GoogleUser>(credentialResponse.credential ?? '');
      setUser(decoded);

      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.post(`${apiUrl}/api/auth/google`, {
        token: credentialResponse.credential
      });

      if (response.data.success) {
        // Handle successful authentication (e.g., store token)
        console.log('Authentication successful');
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