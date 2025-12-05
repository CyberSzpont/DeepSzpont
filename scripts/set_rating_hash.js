import sqlite3 from 'sqlite3';
const db = sqlite3.verbose();
const d = new db.Database('./data/db.sqlite', (err) => { if (err) { console.error(err); process.exit(1); }});
const [,, id, hash] = process.argv;
if (!id || !hash) { console.error('Usage: node scripts/set_rating_hash.js <id> <hash>'); process.exit(1); }

d.run('UPDATE ratings SET user_hash = ? WHERE id = ? OR rowid = ?', [hash, id, id], function(err) {
  if (err) { console.error('Update failed', err); process.exit(1); }
  console.log('Updated rows:', this.changes);
  d.all('SELECT * FROM ratings WHERE id = ?', [id], (e, rows) => {
    if (e) { console.error(e); process.exit(1); }
    console.log(rows[0]);
    d.close();
  });
});
