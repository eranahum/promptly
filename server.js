// server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const OpenAI = require('openai');
const config = require('./config');

const app = express();

// --- Config ---
const PORT = Number(config.PORT || process.env.PORT || 3001);
const DB_PATH = config.DATABASE_PATH || './database.sqlite';
const OPENAI_MODEL = config.OPENAI_MODEL || 'gpt-3.5-turbo';
const OPENAI_MAX_TOKENS = Number(config.OPENAI_MAX_TOKENS || 500);
const OPENAI_TEMPERATURE = Number(config.OPENAI_TEMPERATURE || 0.7);

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Database ---
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log(`Connected to SQLite database at ${DB_PATH}`);
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // asks table
    db.run(
      `CREATE TABLE IF NOT EXISTS asks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_prompt TEXT NOT NULL,
        openai_response TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    );

    // suggests table (include selected_words in new installs)
    db.run(
      `CREATE TABLE IF NOT EXISTS suggests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_prompt TEXT NOT NULL,
        openai_words TEXT NOT NULL,
        selected_words TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    );

    // For existing DBs created without selected_words, try to add it.
    db.run(
      `ALTER TABLE suggests ADD COLUMN selected_words TEXT`,
      (err) => {
        if (err && !/duplicate column name/i.test(err.message)) {
          console.warn('ALTER TABLE suggests failed:', err.message);
        }
      }
    );
  });
}

// --- OpenAI ---
let openai = null;
try {
  openai = new OpenAI({ apiKey: config.OPENAI_API_KEY || process.env.OPENAI_API_KEY });
  if (!openai.apiKey) {
    console.warn('⚠️  OPENAI_API_KEY is not set. /api/ask and /api/suggest will fail until you configure it.');
  }
} catch (e) {
  console.error('Failed to initialize OpenAI client:', e.message);
}

// --- API Routes ---

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, db: !!db, openai: !!(openai && openai.apiKey) });
});

// History (latest 10 of each)
app.get('/api/history', (req, res) => {
  db.all(`SELECT * FROM asks ORDER BY created_at DESC LIMIT 10`, (err, asks) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    db.all(`SELECT * FROM suggests ORDER BY created_at DESC LIMIT 10`, (err2, suggests) => {
      if (err2) return res.status(500).json({ success: false, error: err2.message });

      res.json({ success: true, history: { asks, suggests } });
    });
  });
});

// Suggest words
app.post('/api/suggest', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ success: false, error: 'Text is required' });
    if (!openai || !openai.apiKey) {
      return res.status(500).json({ success: false, error: 'OpenAI API key is not configured on the server.' });
    }

    const prompt =
      `Given the following text, suggest 5-10 relevant words or phrases that could be used to enhance or expand upon this content. ` +
      `Return only the words separated by commas, no explanations:\n\n` +
      `Text: "${text}"\n\nWords:`;

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: OPENAI_TEMPERATURE,
    });

    const openaiResponse = (completion.choices?.[0]?.message?.content || '').trim();

    const words = openaiResponse
      .split(/[,\n\r\t•\-]/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0 && !/^\d+\./.test(w))
      .slice(0, 10);

    const stmt = db.prepare(
      `INSERT INTO suggests (user_prompt, openai_words, selected_words) VALUES (?, ?, NULL)`
    );
    stmt.run(text, openaiResponse, function (err) {
      if (err) {
        console.error('DB insert suggests error:', err);
        return res.status(500).json({ success: false, error: 'Failed to save to database' });
      }
      res.json({ success: true, words, message: 'Suggestion saved successfully' });
    });
    stmt.finalize();
  } catch (error) {
    console.error('OpenAI /suggest error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate suggestions. Please check your OpenAI API key.',
    });
  }
});

// Ask (AI response)
app.post('/api/ask', async (req, res) => {
  try {
    const { text, selectedWords } = req.body || {};
    if (!text) return res.status(400).json({ success: false, error: 'Text is required' });
    if (!openai || !openai.apiKey) {
      return res.status(500).json({ success: false, error: 'OpenAI API key is not configured on the server.' });
    }

    const prompt =
      `Please provide a helpful and informative response to the following request or question:\n\n` +
      `"${text}"\n\nResponse:`;

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: OPENAI_MAX_TOKENS,
      temperature: OPENAI_TEMPERATURE,
    });

    const openaiResponse = (completion.choices?.[0]?.message?.content || '').trim();

    const stmt = db.prepare(`INSERT INTO asks (user_prompt, openai_response) VALUES (?, ?)`);
    stmt.run(text, openaiResponse, function (err) {
      if (err) {
        console.error('DB insert asks error:', err);
        return res.status(500).json({ success: false, error: 'Failed to save to database' });
      }

      // Optionally attach selected words to the latest suggests row
      if (Array.isArray(selectedWords) && selectedWords.length > 0) {
        const selectedWordsStr = selectedWords.join(', ');
        db.run(
          `UPDATE suggests SET selected_words = ? WHERE id = (SELECT MAX(id) FROM suggests)`,
          [selectedWordsStr],
          (uErr) => {
            if (uErr) console.error('DB update suggests error:', uErr.message);
          }
        );
      }

      res.json({ success: true, response: openaiResponse, message: 'Response saved successfully' });
    });
    stmt.finalize();
  } catch (error) {
    console.error('OpenAI /ask error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI response. Please check your OpenAI API key.',
    });
  }
});

// --- Static React build ---
const buildDir = path.join(__dirname, 'build');
app.use(express.static(buildDir));

// SPA fallback (must come after API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(buildDir, 'index.html'));
});

// --- Start server ---
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`OpenAI configured: ${Boolean(openai && openai.apiKey) ? 'Yes' : 'No'}`);
});

// --- Graceful shutdown ---
function shutdown() {
  console.log('\nShutting down...');
  server && server.close(() => console.log('HTTP server closed.'));
  db.close((err) => {
    if (err) console.error('Error closing database:', err.message);
    else console.log('Database connection closed.');
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);