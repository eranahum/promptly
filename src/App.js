import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [textInput, setTextInput] = useState('');
  const [selectedWords, setSelectedWords] = useState(new Set());
  const [wordBubbles, setWordBubbles] = useState([]);
  const [chatgptResponse, setChatgptResponse] = useState('');
  const [status, setStatus] = useState({ message: '', type: '', show: false });
  const [history, setHistory] = useState({ asks: [], suggests: [] });

  // Load history on component mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/history');
      const data = await response.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const showStatus = (message, type) => {
    setStatus({ message, type, show: true });
    setTimeout(() => {
      setStatus({ message: '', type: '', show: false });
    }, 3000);
  };

  const loadSuggestions = async () => {
    const text = textInput.trim();

    if (!text) {
      showStatus('Please enter some text first!', 'error');
      return;
    }

    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });

      const data = await response.json();
      
      if (data.success) {
        showStatus('Text processed and word suggestions generated!', 'success');
        setWordBubbles(data.words || []);
        setChatgptResponse('');
        await loadHistory(); // Refresh history
      } else {
        showStatus(data.error || 'Failed to process suggestion', 'error');
      }
    } catch (error) {
      console.error('Error in suggest flow:', error);
      showStatus('Failed to process suggestion. Please check if the server is running.', 'error');
    }
  };

  const toggleWordSelection = (word) => {
    const newSelectedWords = new Set(selectedWords);
    if (newSelectedWords.has(word)) {
      newSelectedWords.delete(word);
    } else {
      newSelectedWords.add(word);
    }
    setSelectedWords(newSelectedWords);
  };

  const saveText = async () => {
    const text = textInput.trim();

    if (!text) {
      showStatus('Please enter some text first!', 'error');
      return;
    }

    // Combine user text with selected words
    let finalText = text;
    if (selectedWords.size > 0) {
      const selectedWordsList = Array.from(selectedWords).join(', ');
      finalText = `${text} using the words: ${selectedWordsList}`;
    }

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: finalText,
          selectedWords: Array.from(selectedWords)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        showStatus('Text saved and ChatGPT response received!', 'success');
        setChatgptResponse(data.response || '');
        setWordBubbles([]);
        await loadHistory(); // Refresh history
      } else {
        showStatus(data.error || 'Failed to save text', 'error');
      }
    } catch (error) {
      console.error('Error saving text:', error);
      showStatus('Failed to save text. Please check if the server is running.', 'error');
    }
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      saveText();
    }
  };

  return (
    <div className="container">
      <h1>Text Saver React App</h1>
      
      <div className="input-group">
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your text here..."
        />
      </div>
      
      <div className="button-group">
        <button onClick={loadSuggestions}>Suggest</button>
        <button onClick={saveText}>Ask</button>
      </div>
      
      {wordBubbles.length > 0 && (
        <div className="word-bubbles">
          {wordBubbles.map((word, index) => (
            <div
              key={index}
              className={`word-bubble ${selectedWords.has(word) ? 'checked' : ''}`}
              onClick={() => toggleWordSelection(word)}
            >
              {word}
            </div>
          ))}
        </div>
      )}
      
      {chatgptResponse && (
        <div className="chatgpt-response">
          <h3>ChatGPT Response:</h3>
          <div className="chatgpt-content">{chatgptResponse}</div>
        </div>
      )}
      
      {status.show && (
        <div className={`status ${status.type}`}>
          {status.message}
        </div>
      )}

      {/* History Section */}
      <div className="history-section">
        <h3>Recent Activity</h3>
        
        {history.asks.length > 0 && (
          <div>
            <h4>Recent Asks:</h4>
            {history.asks.slice(0, 3).map((item, index) => (
              <div key={index} className="history-item">
                <h4>User Prompt:</h4>
                <p>{item.user_prompt}</p>
                <h4>OpenAI Response:</h4>
                <p>{item.openai_response}</p>
                <small>Date: {new Date(item.created_at).toLocaleString()}</small>
              </div>
            ))}
          </div>
        )}
        
        {history.suggests.length > 0 && (
          <div>
            <h4>Recent Suggestions:</h4>
            {history.suggests.slice(0, 3).map((item, index) => (
              <div key={index} className="history-item">
                <h4>User Prompt:</h4>
                <p>{item.user_prompt}</p>
                <h4>OpenAI Words:</h4>
                <p>{item.openai_words}</p>
                <small>Date: {new Date(item.created_at).toLocaleString()}</small>
              </div>
            ))}
          </div>
        )}
        
        {history.asks.length === 0 && history.suggests.length === 0 && (
          <p>No activity yet. Start by typing some text and clicking Suggest or Ask!</p>
        )}
      </div>
    </div>
  );
}

export default App;
