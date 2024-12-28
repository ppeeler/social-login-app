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
    axios.get<TestResponse>('http://127.0.0.1:5000/api/test')
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

  return (
    <div>
      <h1>Resume App</h1>
      {message && <p>Message from backend: {message}</p>}
      {error && <p style={{color: 'red'}}>Error: {error}</p>}
    </div>
  )
}

export default App
