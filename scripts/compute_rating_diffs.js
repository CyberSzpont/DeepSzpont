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

function chooseColumns(cols) {
  const names = (cols || []).map(c => c.name);
  const videoCol = names.includes('videoId') ? 'videoId' : (names.includes('video_id') ? 'video_id' : null);
  const ratingCol = names.includes('rating') ? 'rating' : (names.includes('score') ? 'score' : null);
  return { videoCol, ratingCol };
}

db.all("PRAGMA table_info('ratings')", (err, cols) => {
  if (err) {
    console.error('PRAGMA failed:', err);
    db.close();
    process.exit(1);
  }
  const { videoCol, ratingCol } = chooseColumns(cols);
  if (!videoCol || !ratingCol) {
    console.error('Unable to detect required columns on ratings table. Found:', (cols || []).map(c=>c.name));
    db.close();
    process.exit(1);
  }

  // Group by the video column and sort by videoId (case-insensitive)
  const sql = `SELECT ${videoCol} AS videoId, AVG(${ratingCol}) AS avgRating, COUNT(*) AS count FROM ratings GROUP BY ${videoCol} ORDER BY LOWER(${videoCol}) ASC`;
  db.all(sql, (qErr, rows) => {
    if (qErr) {
      console.error('Query failed:', qErr);
      db.close();
      process.exit(1);
    }

    const results = (rows || []).map(r => {
      const vid = r.videoId || '';
      // determine original number: Ai -> 1, Real -> 5 (case-insensitive)
      let original = null;
      if (/ai/i.test(vid)) original = 1;
      else if (/real/i.test(vid)) original = 5;

      const avg = (typeof r.avgRating === 'number') ? r.avgRating : Number(r.avgRating || 0);
      const diff = (original === null) ? null : Math.abs(avg - original);

      return {
        videoId: vid,
        avgRating: Number(avg.toFixed(4)),
        original,
        absDifference: diff === null ? null : Number(diff.toFixed(4)),
        count: r.count || 0
      };
    });

    // Print a compact table to console with aligned columns
    const headers = ['videoId', 'avgRating', 'original', 'absDifference', 'count'];
    const tableRows = results.map(r => ({
      videoId: String(r.videoId),
      avgRating: String(r.avgRating),
      original: r.original === null ? '-' : String(r.original),
      absDifference: r.absDifference === null ? '-' : String(r.absDifference),
      count: String(r.count)
    }));

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
        // right-align numeric-like columns
        if (['avgRating', 'original', 'absDifference', 'count'].includes(h)) return pad(row[h], colWidths[h], true);
        return pad(row[h], colWidths[h], false);
      }).join(' | ');
      console.log(line);
    });

    // write JSON output for later inspection
    try {
      writeFileSync('./data/ratings_diffs.json', JSON.stringify(results, null, 2));
      console.log('\nWrote ./data/ratings_diffs.json');
    } catch (e) {
      console.error('Failed to write output JSON:', e);
    }

    db.close();
  });
});
