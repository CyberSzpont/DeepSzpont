import sqlite3 from 'sqlite3';

const dbFile = './data/db.sqlite';
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(dbFile, (err) => {
  if (err) {
    console.error('Failed to open DB:', err);
    process.exit(1);
  }
});

let requested = "LucjanJanowski"

function findUserHashColumn(cb) {
  db.all("PRAGMA table_info('ratings')", (err, cols) => {
    if (err) return cb(err);
    const names = (cols || []).map(c => c.name);
    if (names.includes('user_hash')) return cb(null, 'user_hash');
    if (names.includes('userHash')) return cb(null, 'userHash');
    // no user hash column detected
    return cb(new Error('No user_hash/userHash column found in ratings table'));
  });
}

findUserHashColumn((err, colName) => {
  if (err) {
    console.error('Schema check failed:', err.message || err);
    db.close();
    process.exit(1);
  }

  // Helper that runs the query once we have a resolved requested value
  const runQueryFor = (userHashValue) => {
    const sql = `SELECT id, timestamp, video_id AS videoId, rating FROM ratings WHERE ${colName} = ? ORDER BY video_id ASC`;
    db.all(sql, [userHashValue], (qErr, rows) => {
      if (qErr) {
        console.error('Query failed:', qErr);
        db.close();
        process.exit(1);
      }

      // print a leading blank line for readability
      console.log('');
      console.log(`Ratings for user_hash="${userHashValue}" (${rows.length} rows):`);
      if (!rows || rows.length === 0) {
        console.log('(no rows)');
        db.close();
        return;
      }

      // Format table with aligned columns: video_id | userRating | realAnswer
      const headers = ['video_id', 'userRating', 'realAnswer'];
      const tableRows = rows.map(r => {
        const vid = r.videoId || '';
        const userRating = (typeof r.rating !== 'undefined' && r.rating !== null) ? String(r.rating) : '';
        let original = '';
        if (/ai/i.test(vid)) original = '1';
        else if (/real/i.test(vid)) original = '5';
        return { video_id: vid, userRating, realAnswer: original };
      });

      // compute column widths
      const colWidths = {};
      headers.forEach(h => {
        const maxLen = Math.max(h.length, ...tableRows.map(row => (row[h] || '').length));
        colWidths[h] = maxLen;
      });

      const pad = (s, w, right = false) => right ? String(s).padStart(w) : String(s).padEnd(w);

      const headerLine = headers.map(h => pad(h, colWidths[h], false)).join(' | ');
      const sepLine = headers.map(h => '-'.repeat(colWidths[h])).join('-|-');
      console.log(headerLine);
      console.log(sepLine);

      tableRows.forEach(row => {
        const line = headers.map(h => {
          // right-align numeric columns
          if (['userRating', 'realAnswer'].includes(h)) return pad(row[h], colWidths[h], true);
          return pad(row[h], colWidths[h], false);
        }).join(' | ');
        console.log(line);
      });

      db.close();
    });
  };

  // If requested was provided on the command line, run immediately. Otherwise prompt the user.
  if (requested) {
    runQueryFor(requested);
  } else {
    // prompt the user for a hash
    import('readline').then(readlineModule => {
      const rl = readlineModule.createInterface({ input: process.stdin, output: process.stdout });
      rl.question('Enter user_hash to query: ', (answer) => {
        requested = answer.trim();
        rl.close();
        if (!requested) {
          console.error('No user_hash provided. Exiting.');
          db.close();
          process.exit(1);
        }
        runQueryFor(requested);
      });
    }).catch(e => {
      console.error('Failed to load readline for prompt:', e);
      db.close();
      process.exit(1);
    });
  }
});
