import sqlite3 from 'sqlite3';
import { writeFileSync } from 'fs';

const dbFile = './data/db.sqlite';
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(dbFile, (err) => {
  if (err) {
    console.error('Failed to open DB:', err);
    process.exit(1);
  }
});

db.serialize(() => {
  console.log('Inspecting tables...');
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users','ratings')", (err, rows) => {
    if (err) {
      console.error('Failed to list tables:', err);
    }
    const existing = (rows || []).map(r => r.name);

    function tryDelete(table) {
      return new Promise((resolve) => {
        db.run(`DELETE FROM ${table}`, (e) => {
          if (e) console.warn(`Could not DELETE from ${table}:`, e.message || e);
          else console.log(`Cleared table: ${table}`);
          resolve();
        });
      });
    }

    (async () => {
      if (existing.includes('ratings')) await tryDelete('ratings');
      else console.log('Table `ratings` does not exist, skipping.');
      if (existing.includes('users')) await tryDelete('users');
      else console.log('Table `users` does not exist, skipping.');

      // Vacuum to reclaim space
      db.run('VACUUM', (vErr) => {
        if (vErr) console.warn('VACUUM failed:', vErr);
        else console.log('VACUUM completed.');

        // Truncate rating log file
        try {
          writeFileSync('./data/rating.log', '');
          console.log('Truncated ./data/rating.log');
        } catch (wfErr) {
          console.warn('Failed to truncate rating.log:', wfErr.message || wfErr);
        }

        db.close();
      });
    })();
  });
});
