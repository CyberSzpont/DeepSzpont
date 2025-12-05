import sqlite3 from 'sqlite3';

const dbFile = './data/db.sqlite';
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(dbFile, (err) => {
  if (err) {
    console.error('Failed to open DB:', err);
    process.exit(1);
  }
});

// inspect table schema first to determine actual column names
db.all("PRAGMA table_info('users')", (err, cols) => {
  if (err) {
    console.error('PRAGMA failed:', err);
    process.exit(1);
  }
  const names = (cols || []).map(c => c.name);
  // determine id column
  let idCol = names.includes('id') ? 'id' : (names.includes('user_id') ? 'user_id' : (names[0] || null));
  let createdCol = names.includes('created') ? 'created' : (names.includes('created_at') ? 'created_at' : null);
  const hasUserHash = names.includes('user_hash');

  const selectCols = [];
  if (idCol) selectCols.push(idCol + ' AS id');
  if (createdCol) selectCols.push(createdCol + ' AS created');
  if (hasUserHash) selectCols.push('user_hash');

  if (selectCols.length === 0) {
    console.log('No usable columns found in users table:', names);
    db.close();
    process.exit(0);
  }

  const sql = `SELECT ${selectCols.join(', ')} FROM users`;
  db.all(sql, (e, rows) => {
    if (e) {
      console.error('Query failed:', e);
      process.exit(1);
    }
    console.log('users rows:');
    if (!rows || rows.length === 0) {
      console.log('(no rows)');
    } else {
      for (const r of rows) console.log(JSON.stringify(r));
    }
    db.close();
  });
});
