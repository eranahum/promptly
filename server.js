const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const OpenAI = require('openai');
const config = require('./config');
require('dotenv').config();

const app = express();
const PORT = config.PORT;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize SQLite database
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Table for storing "Ask" interactions
    db.run(`CREATE TABLE IF NOT EXISTS asks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_prompt TEXT NOT NULL,
      openai_response TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Table for storing "Suggest" interactions
    db.run(`CREATE TABLE IF NOT EXISTS suggests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_prompt TEXT NOT NULL,
      openai_words TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

// API Routes

// Get history of all interactions
app.get('/api/history', (req, res) => {
  db.all(`SELECT * FROM asks ORDER BY created_at DESC LIMIT 10`, (err, asks) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    
    db.all(`SELECT * FROM suggests ORDER BY created_at DESC LIMIT 10`, (err, suggests) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      
      res.json({
        success: true,
        history: { asks, suggests }
      });
    });
  });
});

// Handle "Suggest" button - generates word suggestions
app.post('/api/suggest', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }

    // Create a prompt for word suggestions
    const prompt = `Given the following text, suggest 5-10 relevant words or phrases that could be used to enhance or expand upon this content. Return only the words separated by commas, no explanations:

Text: "${text}"

Words:`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: config.OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: config.OPENAI_TEMPERATURE,
    });

    const openaiResponse = completion.choices[0].message.content.trim();
    
    // Parse words from response
    const words = openaiResponse
      .split(/[,\n\r\t•\-]/)
      .map(word => word.trim())
      .filter(word => word.length > 0 && !word.match(/^\d+\./))
      .slice(0, 10);

    // Save to database
    const stmt = db.prepare(`INSERT INTO suggests (user_prompt, openai_words) VALUES (?, ?)`);
    stmt.run(text, openaiResponse, function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ success: false, error: 'Failed to save to database' });
      }
      
      res.json({
        success: true,
        words: words,
        message: 'Suggestion saved successfully'
      });
    });
    stmt.finalize();

  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate suggestions. Please check your OpenAI API key.' 
    });
  }
});

// Handle "Ask" button - gets AI response
app.post('/api/ask', async (req, res) => {
  try {
    const { text, selectedWords } = req.body;
    
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }

    // Create a prompt for AI response
    const prompt = `Please provide a helpful and informative response to the following request or question:

"${text}"

Response:`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: config.OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: config.OPENAI_MAX_TOKENS,
      temperature: config.OPENAI_TEMPERATURE,
    });

    const openaiResponse = completion.choices[0].message.content.trim();

    // Save to database
    const stmt = db.prepare(`INSERT INTO asks (user_prompt, openai_response) VALUES (?, ?)`);
    stmt.run(text, openaiResponse, function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ success: false, error: 'Failed to save to database' });
      }
      
      // If there are selected words, update the most recent suggest entry
      if (selectedWords && selectedWords.length > 0) {
        const selectedWordsStr = selectedWords.join(', ');
        db.run(`UPDATE suggests SET selected_words = ? WHERE id = (SELECT MAX(id) FROM suggests)`, 
          [selectedWordsStr], (err) => {
            if (err) {
              console.error('Error updating suggests with selected words:', err);
            } else {
              console.log('Updated suggests table with selected words:', selectedWordsStr);
            }
          });
      }
      
      res.json({
        success: true,
        response: openaiResponse,
        message: 'Response saved successfully'
      });
    });
    stmt.finalize();

  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get AI response. Please check your OpenAI API key.' 
    });
  }
});

// Serve React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`OpenAI API Key configured: ${config.OPENAI_API_KEY !== 'your_openai_api_key_here' ? 'Yes' : 'No'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
}); 