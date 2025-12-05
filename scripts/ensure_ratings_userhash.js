import sqlite3 from 'sqlite3';

const dbFile = './data/db.sqlite';
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(dbFile, (err) => {
  if (err) {
    console.error('Failed to open DB:', err);
    process.exit(1);
  }
});

db.all("PRAGMA table_info('ratings')", (err, cols) => {
  if (err) {
    console.error('PRAGMA failed:', err);
    process.exit(1);
  }
  const names = (cols || []).map(c => c.name);
  console.log('ratings columns:', names);
  if (!names.includes('user_hash')) {
    console.log('Adding user_hash column to ratings...');
    db.run("ALTER TABLE ratings ADD COLUMN user_hash TEXT", (e) => {
      if (e) {
        console.error('Failed to add user_hash to ratings:', e);
        process.exit(1);
      }
      console.log('Added user_hash column.');
      db.close();
    });
  } else {
    console.log('ratings.user_hash already present.');
    db.close();
  }
});
