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
    console.log("looking for credentials in local storage");
    const googleCredential = localStorage.getItem('googleCredential');

    if (googleCredential) {

      console.log("found credentials in local storage");

      try {
        const decoded = jwtDecode<GoogleUser>(googleCredential);

        console.log("checking if credentials are expired");
        // Check if token is expired
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < currentTime) {
          console.log("credentials are expired");
          handleLogout();
          return;
        }

        console.log("credentials are not expired");
        setUser(decoded);

        console.log("getting access token from local storage");
        const accessToken = localStorage.getItem('accessToken');
        
        if (accessToken) {
          console.log("found access token in local storage, setting header");
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        } else {
          console.log("no access token found in local storage");
          handleLogout();
        }
      } catch (error) {
        console.error("error looking for local credentials: " + error);
        localStorage.removeItem('googleCredential');
        localStorage.removeItem('accessToken');
        delete axios.defaults.headers.common['Authorization'];
      }
    } else {
      console.log("no credentials found in local storage");
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

    console.log("calling test endpoint");

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

      console.log("putting credentials in local storage");

      localStorage.setItem('googleCredential', credentialResponse.credential ?? '');
      const decoded = jwtDecode<GoogleUser>(credentialResponse.credential ?? '');

      console.log('Token expires:', new Date(decoded.exp! * 1000).toLocaleString());

      setUser(decoded);

      console.log("calling backed with google credentials");
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.post(`${apiUrl}/api/auth/google`, {
        token: credentialResponse.credential
      });

      if (response.data.success) {
        // Handle successful authentication (e.g., store token)
        console.log('Authentication successful');

        // Store the access token from your backend
        console.log("putting access token in local storage");
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
    console.log("logging out");
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