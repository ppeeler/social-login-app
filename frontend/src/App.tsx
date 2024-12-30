import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

// Define the shape of our API response
interface TestResponse {
  message: string;
}

function App() {
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL;

    console.log('Attempting to connect to:', apiUrl);

    axios.get<TestResponse>(`${apiUrl}/api/test`)
      .then(response => {
        console.log('Response received:', response);
        setMessage(response.data.message);
      })
      .catch(error => {
        console.error('Full error object:', error);
        
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

  return (
    <div>
      <h1>Social Login App</h1>
      {message && <p>Message from backend: {message}</p>}
      {error && <p style={{color: 'red'}}>Error: {error}</p>}
    </div>
  )
}

export default App
