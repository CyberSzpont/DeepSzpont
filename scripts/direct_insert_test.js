import sqlite3 from 'sqlite3';
const db = sqlite3.verbose();
const d = new db.Database('./data/db.sqlite', (err) => { if (err) { console.error(err); process.exit(1); }});

d.serialize(() => {
  d.all("PRAGMA table_info('ratings')", (err, cols) => {
    if (err) { console.error(err); process.exit(1); }
    console.log('cols', cols.map(c=>c.name));
    const sql = `INSERT INTO ratings (timestamp, video_id, rating, user_hash, user_id) VALUES (?, ?, ?, ?, ?)`;
    const params = [new Date().toISOString(), 'direct_test_video.mp4', 5, 'p7x2dczh', 'u_1764927401665_obf96c5'];
    d.run(sql, params, function(e) {
      if (e) { console.error('insert error', e); process.exit(1); }
      console.log('inserted id', this.lastID);
      d.all('SELECT * FROM ratings WHERE id = ?', [this.lastID], (qerr, rows) => {
        if (qerr) { console.error(qerr); process.exit(1); }
        console.log('row:', rows[0]);
        d.close();
      });
    });
  });
});
