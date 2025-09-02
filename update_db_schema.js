const sqlite3 = require('sqlite3').verbose();

// Open the database
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to SQLite database');
  
  // Update the suggests table to add selected_words column
  updateSchema();
});

function updateSchema() {
  console.log('Updating database schema...');
  
  // Add selected_words column to suggests table if it doesn't exist
  db.run(`ALTER TABLE suggests ADD COLUMN selected_words TEXT`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('Column selected_words already exists');
      } else {
        console.error('Error adding column:', err.message);
        return;
      }
    } else {
      console.log('Added selected_words column to suggests table');
    }
    
    // Show the updated schema
    showSchema();
  });
}

function showSchema() {
  console.log('\n=== UPDATED DATABASE SCHEMA ===\n');
  
  // Show suggests table structure
  db.all(`PRAGMA table_info(suggests)`, (err, rows) => {
    if (err) {
      console.error('Error reading schema:', err.message);
    } else {
      console.log('--- SUGGESTS TABLE STRUCTURE ---');
      rows.forEach(row => {
        console.log(`Column: ${row.name} (${row.type})`);
      });
    }
    
    // Show asks table structure
    db.all(`PRAGMA table_info(asks)`, (err, rows) => {
      if (err) {
        console.error('Error reading schema:', err.message);
      } else {
        console.log('\n--- ASKS TABLE STRUCTURE ---');
        rows.forEach(row => {
          console.log(`Column: ${row.name} (${row.type})`);
        });
      }
      
      // Close database
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('\nDatabase connection closed.');
        }
      });
    });
  });
}

