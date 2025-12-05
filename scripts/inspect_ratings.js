import sqlite3 from 'sqlite3';

const dbFile = './data/db.sqlite';
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(dbFile, (err) => {
  if (err) {
    console.error('Failed to open DB:', err);
    process.exit(1);
  }
});

// show schema and a few rows
db.all("PRAGMA table_info('ratings')", (err, cols) => {
  if (err) {
    console.error('PRAGMA failed:', err);
    process.exit(1);
  }
  const names = (cols || []).map(c => c.name);
  console.log('ratings columns:', names);
  db.all('SELECT * FROM ratings LIMIT 20', (e, rows) => {
    if (e) {
      console.error('Query failed:', e);
      process.exit(1);
    }
    console.log('ratings rows (up to 20):');
    if (!rows || rows.length === 0) console.log('(no rows)');
    else rows.forEach(r => console.log(JSON.stringify(r)));
    db.close();
  });
});
