import sqlite3 from 'sqlite3';

const dbFile = './data/db.sqlite';
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(dbFile, (err) => {
  if (err) {
    console.error('Failed to open DB:', err);
    process.exit(1);
  }
});

const ts = new Date().toISOString();
const sql = `INSERT INTO ratings (timestamp, video_id, rating, user_hash, user_id) VALUES (?, ?, ?, ?, ?)`;
const params = [ts, 'test_video.mp4', 5, 'TESTPATHHASH', 'u_testid'];

db.run(sql, params, function(err) {
  if (err) {
    console.error('Insert failed:', err);
    process.exit(1);
  }
  console.log('Inserted rating id:', this.lastID);
  db.close();
});
