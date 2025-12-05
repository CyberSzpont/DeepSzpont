import sqlite3 from 'sqlite3';
import crypto from 'crypto';
sqlite3.verbose();
const db = new sqlite3.Database('./data/db.sqlite', (err) => {
  if (err) return console.error('Open DB error:', err);
  const id = `u_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
  const ts = new Date().toISOString();
  const userHash = crypto.createHash('md5').update(id).digest('hex');

  db.all("PRAGMA table_info('users')", (err, cols) => {
    if (err) { console.error('PRAGMA error', err); db.close(); return; }
    const names = cols.map(c => c.name);
    let idCol = 'id';
    if (!names.includes('id') && names.includes('user_id')) idCol = 'user_id';
    else if (!names.includes('id') && !names.includes('user_id')) idCol = names[0] || 'id';
    const sql = `INSERT OR REPLACE INTO users (${idCol}, created, user_hash) VALUES (?, ?, ?)`;
    console.log('Using SQL:', sql);
    db.run(sql, [id, ts, userHash], (e) => {
      if (e) console.error('Insert error:', e);
      else console.log('Insert success');
      db.all(`SELECT ${idCol}, created, user_hash FROM users WHERE ${idCol} = ?`, [id], (err2, rows) => {
        if (err2) console.error('Select error:', err2);
        else console.log('Inserted rows:', JSON.stringify(rows, null, 2));
        db.close();
      });
    });
  });
});