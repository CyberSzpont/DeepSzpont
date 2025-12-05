import sqlite3 from 'sqlite3';
const db = sqlite3.verbose();
const d = new db.Database('./data/db.sqlite', (err) => { if (err) { console.error(err); process.exit(1); }});

d.all('SELECT * FROM ratings ORDER BY id DESC LIMIT 1', (err, rows) => {
  if (err) { console.error(err); process.exit(1); }
  console.log('last rating row:');
  console.log(JSON.stringify(rows[0] || null, null, 2));
  d.close();
});
