import sqlite3 from 'sqlite3';
sqlite3.verbose();
const db = new sqlite3.Database('./data/db.sqlite', (err) => {
  if (err) return console.error('Open DB error:', err);
  db.all("PRAGMA table_info('users')", (err, cols) => {
    if (err) console.error('PRAGMA error:', err);
    else console.log('users table info:', JSON.stringify(cols, null, 2));
  });
  db.all("SELECT id, created, user_hash FROM users LIMIT 5", (err, rows) => {
    if (err) console.error('SELECT error:', err);
    else console.log('users rows sample:', JSON.stringify(rows, null, 2));
    db.close();
  });
});