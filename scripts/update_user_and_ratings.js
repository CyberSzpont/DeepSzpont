import sqlite3 from 'sqlite3';

const [,, userId, userHash] = process.argv;
if (!userId || !userHash) {
  console.error('Usage: node scripts/update_user_and_ratings.js <userId> <userHash>');
  process.exit(1);
}
const db = sqlite3.verbose();
const d = new db.Database('./data/db.sqlite', (err) => { if (err) { console.error(err); process.exit(1); }});

// Ensure users row exists, then update ratings
const ts = new Date().toISOString();

d.serialize(() => {
  d.all("PRAGMA table_info('users')", (err, cols) => {
    if (err) { console.error(err); process.exit(1); }
    const names = (cols||[]).map(c=>c.name);
    let idCol = 'id';
    if (!names.includes('id') && names.includes('user_id')) idCol = 'user_id';
    else if (!names.includes('id') && !names.includes('user_id')) idCol = names[0] || 'id';

    const upSql = `INSERT OR REPLACE INTO users (${idCol}, created, user_hash) VALUES (?, ?, ?)`;
    d.run(upSql, [userId, ts, userHash], function(insErr) {
      if (insErr) { console.error('Failed to upsert user', insErr); process.exit(1); }
      console.log('Upserted user', userId, userHash);
      // Update ratings
      d.run('UPDATE ratings SET user_hash = ? WHERE user_id = ?', [userHash, userId], function(uErr) {
        if (uErr) { console.error('Failed to update ratings', uErr); process.exit(1); }
        console.log('Updated ratings rows:', this.changes);
        d.close();
      });
    });
  });
});
