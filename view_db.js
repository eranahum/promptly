const sqlite3 = require('sqlite3').verbose();

// Open the database
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to SQLite database');
  
  // View all data
  viewAllData();
});

function viewAllData() {
  console.log('\n=== DATABASE CONTENTS ===\n');
  
  // View asks table
  console.log('--- ASKS TABLE ---');
  db.all(`SELECT * FROM asks ORDER BY created_at DESC`, (err, rows) => {
    if (err) {
      console.error('Error reading asks:', err.message);
    } else {
      if (rows.length === 0) {
        console.log('No asks data yet');
      } else {
        rows.forEach((row, index) => {
          console.log(`\nAsk #${index + 1}:`);
          console.log(`ID: ${row.id}`);
          console.log(`User Prompt: ${row.user_prompt}`);
          console.log(`OpenAI Response: ${row.openai_response}`);
          console.log(`Created: ${row.created_at}`);
          console.log('---');
        });
      }
    }
    
    // View suggests table
    console.log('\n--- SUGGESTS TABLE ---');
    db.all(`SELECT * FROM suggests ORDER BY created_at DESC`, (err, rows) => {
      if (err) {
        console.error('Error reading suggests:', err.message);
      } else {
        if (rows.length === 0) {
          console.log('No suggests data yet');
        } else {
          rows.forEach((row, index) => {
            console.log(`\nSuggest #${index + 1}:`);
            console.log(`ID: ${row.id}`);
            console.log(`User Prompt: ${row.user_prompt}`);
            console.log(`OpenAI Words: ${row.openai_words}`);
            console.log(`Selected Words: ${row.selected_words || 'None selected'}`);
            console.log(`Created: ${row.created_at}`);
            console.log('---');
          });
        }
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
