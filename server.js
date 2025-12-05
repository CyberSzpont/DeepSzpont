import express, { json } from "express";
import path from "path";
import { readdirSync, appendFileSync, mkdirSync } from "fs";
import sqlite3 from "sqlite3";
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(json());

// ensure data dir exists and open sqlite DB
mkdirSync("./data", { recursive: true });
sqlite3.verbose();
const db = new sqlite3.Database("./data/db.sqlite", (err) => {
  if (err) {
    console.error("Failed to open DB:", err);
  } else {
    db.run(
      `CREATE TABLE IF NOT EXISTS ratings (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         timestamp TEXT,
         videoId TEXT,
         rating INTEGER,
         certainty INTEGER,
         userId TEXT,
         user_hash TEXT
       )`,
      (err) => { if (err) console.error("Failed to create ratings table:", err); }
    );
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
           id TEXT PRIMARY KEY,
           created TEXT,
           user_hash TEXT
         )`,
      (err) => { if (err) console.error("Failed to create users table:", err); }
    );
  }
});

// Ensure users table contains user_hash column for older DBs
db.all("PRAGMA table_info('users')", (err, cols) => {
  if (err) return;
  const names = (cols || []).map(c => c.name);
  if (!names.includes('user_hash')) {
    try {
      db.run("ALTER TABLE users ADD COLUMN user_hash TEXT", (e) => { if (e) console.error('Failed to add user_hash column:', e); });
    } catch (e) {
      console.error('Error ensuring user_hash column:', e);
    }
  }
});

// Ensure ratings table contains user_hash column for older DBs
db.all("PRAGMA table_info('ratings')", (errR, colsR) => {
  if (errR) return;
  const namesR = (colsR || []).map(c => c.name);
  if (!namesR.includes('user_hash')) {
    try {
      db.run("ALTER TABLE ratings ADD COLUMN user_hash TEXT", (e) => { if (e) console.error('Failed to add user_hash column to ratings:', e); });
    } catch (e) {
      console.error('Error ensuring ratings.user_hash column:', e);
    }
  }
});

// Serve a list of videos from the ./videos directory
app.get("/api/videos", (req, res) => {
  try {
    const videosDir = path.resolve("./videos");

    // recursively walk the videos directory and collect files
    function walkDir(dir) {
      let results = [];
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          results = results.concat(walkDir(full));
        } else if (ent.isFile()) {
          // accept common video extensions
          if (/\.(mp4|webm|ogg|mov)$/i.test(ent.name)) {
            // return path relative to videosDir, use forward slashes for client
            results.push(path.relative(videosDir, full).split(path.sep).join('/'));
          }
        }
      }
      return results;
    }

    let files = [];
    try {
      files = walkDir(videosDir);
    } catch (err) {
      // if videos directory doesn't exist or is empty, return empty list
      console.error("Error walking videos directory:", err);
      return res.json([]);
    }

    // shuffle files so clients get a random order without repeats
    function shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    }
    shuffle(files);

    res.json(files);
  } catch (err) {
    console.error("Error reading videos directory:", err);
    res.status(500).json({ message: "Unable to read videos" });
  }
});

// Create simple user id for mobile clients
app.post('/api/user', (req, res) => {
  const id = `u_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
  const ts = new Date().toISOString();
  // Accept a provided short hash for the user (from client) or fallback to md5(id)
  const providedHash = req && req.body && req.body.userHash ? String(req.body.userHash) : null;
  const userHash = providedHash || crypto.createHash('md5').update(id).digest('hex');

  // Determine which column name the users table uses for the id (id or user_id)
  db.all("PRAGMA table_info('users')", (err, cols) => {
    if (err || !Array.isArray(cols)) {
      console.error('Failed to get users table info:', err);
      return res.status(500).json({ message: 'Unable to create user' });
    }
    const names = cols.map(c => c.name);
    let idCol = 'id';
    if (!names.includes('id') && names.includes('user_id')) idCol = 'user_id';
    else if (!names.includes('id') && !names.includes('user_id')) {
      // fallback to first column name if unusual schema
      idCol = names[0] || 'id';
    }

    const sql = `INSERT OR REPLACE INTO users (${idCol}, created, user_hash) VALUES (?, ?, ?)`;
    db.run(sql, [id, ts, userHash], (e) => {
      if (e) {
        console.error('Failed to create user:', e);
        return res.status(500).json({ message: 'Unable to create user' });
      }
      // Return canonical userId as created id (even if DB column named user_id)
      res.json({ userId: id, userHash });
    });
  });
});

// Receive rating for a video and save to SQLite (plus optional file log)
app.post("/api/rate", (req, res) => {
  // Accept rating submissions that may also include a certainty (1-5) and a userId
  const { videoId, rating, certainty, userId, userHash } = req.body;
  try {
    // Log incoming request for debugging
    console.log('Incoming POST /api/rate', { videoId, rating, certainty, userId, userHash });
    try { appendFileSync('./data/rating_debug.log', JSON.stringify({ ts: new Date().toISOString(), incoming: { videoId, rating, certainty, userId, userHash } }) + '\n'); } catch(e) {}
  } catch(e) {}
  if (!videoId || typeof rating === "undefined") {
    return res.status(400).json({ message: "Missing data" });
  }

  try {
    const ts = new Date().toISOString();
    // Inspect table schema to determine column names
    db.all("PRAGMA table_info('ratings')", (err, cols) => {
      if (err || !Array.isArray(cols)) {
        console.error('Failed to get table info:', err);
        return res.status(500).json({ message: 'DB error' });
      }
      const colNames = cols.map(c => c.name);

      // Helper to build and run the insert (accepts an optional resolvedUserHash)
      const buildAndInsert = (resolvedUserHash) => {
        const insertCols = [];
        const placeholders = [];
        const values = [];

        // timestamp / created_at
        if (colNames.includes('timestamp')) {
          insertCols.push('timestamp'); placeholders.push('?'); values.push(ts);
        } else if (colNames.includes('created_at')) {
          insertCols.push('created_at'); placeholders.push('?'); values.push(ts);
        }

        // video id
        if (colNames.includes('videoId')) {
          insertCols.push('videoId'); placeholders.push('?'); values.push(videoId);
        } else if (colNames.includes('video_id')) {
          insertCols.push('video_id'); placeholders.push('?'); values.push(videoId);
        }

        // rating (required)
        if (colNames.includes('rating')) {
          insertCols.push('rating'); placeholders.push('?'); values.push(Number(rating));
        }

        // certainty (optional)
        if (typeof certainty !== 'undefined') {
          if (colNames.includes('certainty')) {
            insertCols.push('certainty'); placeholders.push('?'); values.push(Number(certainty));
          }
        }

        // user id
        if (userId) {
          if (colNames.includes('userId')) {
            insertCols.push('userId'); placeholders.push('?'); values.push(userId);
          } else if (colNames.includes('user_id')) {
            // try to coerce numeric user_id where applicable
            insertCols.push('user_id'); placeholders.push('?'); values.push(userId);
          }
        }

        // user hash (could be snake_case 'user_hash' or camelCase 'userHash')
        const finalUserHash = (typeof userHash !== 'undefined' && userHash !== null) ? userHash : resolvedUserHash;
        if (typeof finalUserHash !== 'undefined' && finalUserHash !== null) {
          if (colNames.includes('user_hash')) {
            insertCols.push('user_hash'); placeholders.push('?'); values.push(finalUserHash);
          } else if (colNames.includes('userHash')) {
            insertCols.push('userHash'); placeholders.push('?'); values.push(finalUserHash);
          }
        }

        if (insertCols.length === 0) {
          console.error('No matching columns found for insert');
          return res.status(500).json({ message: 'DB schema mismatch' });
        }

        const sql = `INSERT INTO ratings (${insertCols.join(',')}) VALUES (${placeholders.join(',')})`;
        console.log('DEBUG: ratings columns present:', colNames);
        console.log('DEBUG: insertCols:', insertCols, 'placeholders:', placeholders, 'values:', values, 'finalUserHash:', finalUserHash);
        try { appendFileSync('./data/rating_debug.log', JSON.stringify({ ts: new Date().toISOString(), sql, insertCols, placeholders, values, finalUserHash }) + '\n'); } catch(e) { console.error('Failed to append rating_debug.log', e); }
        try { appendFileSync('./data/rating_debug.log', JSON.stringify({ ts: new Date().toISOString(), sql, values }) + '\n'); } catch(e) {}
        db.run(sql, values, function(err) {
          if (err) {
            console.error("DB insert failed:", err);
            // fallback to file log for durability
            try {
              const parts = [`${ts}`, `Video: ${videoId}`, `Rating: ${rating}`];
              if (typeof certainty !== 'undefined') parts.push(`Certainty: ${certainty}`);
              if (userId) parts.push(`User: ${userId}`);
              if (finalUserHash) parts.push(`UserHash: ${finalUserHash}`);
              const logLine = parts.join(' | ') + '\n';
              appendFileSync("./data/rating.log", logLine);
            } catch (e) { /* ignore */ }
            return res.status(500).json({ message: "Unable to save rating" });
          }
          // optionally also append to the log file
          try {
            const parts = [`${ts}`, `Video: ${videoId}`, `Rating: ${rating}`];
            if (typeof certainty !== 'undefined') parts.push(`Certainty: ${certainty}`);
            if (userId) parts.push(`User: ${userId}`);
            if (finalUserHash) parts.push(`UserHash: ${finalUserHash}`);
            const logLine = parts.join(' | ') + '\n';
            appendFileSync("./data/rating.log", logLine);
          } catch (e) { /* ignore */ }

          // If we have a finalUserHash, ensure the rating row stores it (handle cases where INSERT omitted it)
          if (finalUserHash) {
            try {
              db.run('UPDATE ratings SET user_hash = ? WHERE id = ? OR rowid = ?', [finalUserHash, this.lastID, this.lastID], (uErr) => {
                if (uErr) console.error('Failed to update rating user_hash after insert:', uErr);
                // respond after update attempt
                res.json({ message: "Rating saved", id: this.lastID });
              });
              return;
            } catch (e) {
              console.error('Error updating rating user_hash after insert:', e);
            }
          }

          res.json({ message: "Rating saved", id: this.lastID });
        });
      };

      // If userHash wasn't supplied in the request but a userId exists, try to look it up from users table
      if ((typeof userHash === 'undefined' || userHash === null) && userId) {
        db.get("SELECT user_hash FROM users WHERE id = ? OR user_id = ? LIMIT 1", [userId, userId], (gErr, row) => {
          if (gErr) {
              console.error('Failed to lookup user_hash for userId', userId, gErr);
              // proceed without user hash
              buildAndInsert(null);
              return;
            }
            if (row && (row.user_hash || row.userHash)) {
              const found = row.user_hash || row.userHash;
              console.log('Resolved user_hash from users table for', userId, '->', found);
              try { appendFileSync('./data/rating_debug.log', JSON.stringify({ ts: new Date().toISOString(), resolvedFromUsers: { userId, found } }) + '\n'); } catch(e) {}
              buildAndInsert(found);
              return;
            }

            // No user row found for this userId. Create one so we can attach the hash to the rating.
            // Prefer any userHash supplied in the request; otherwise generate an md5 from the userId.
            const newHash = (typeof userHash !== 'undefined' && userHash !== null) ? userHash : crypto.createHash('md5').update(String(userId)).digest('hex');
            const userTs = new Date().toISOString();
            // Determine id column name for users table
            db.all("PRAGMA table_info('users')", (pErr, cols) => {
              let idCol = 'id';
              try {
                const names = (cols || []).map(c => c.name);
                if (!names.includes('id') && names.includes('user_id')) idCol = 'user_id';
                else if (!names.includes('id') && !names.includes('user_id')) idCol = names[0] || 'id';
              } catch (e) {}
              const upSql = `INSERT OR REPLACE INTO users (${idCol}, created, user_hash) VALUES (?, ?, ?)`;
              db.run(upSql, [userId, userTs, newHash], (insErr) => {
                if (insErr) {
                  console.error('Failed to create missing user row for userId', userId, insErr);
                  // proceed without user hash
                  buildAndInsert(null);
                  return;
                }
                console.log('Created missing user row for', userId, 'with user_hash', newHash);
                try { appendFileSync('./data/rating_debug.log', JSON.stringify({ ts: new Date().toISOString(), createdUser: { userId, newHash } }) + '\n'); } catch(e) {}
                buildAndInsert(newHash);
              });
            });
        });
      } else {
        // userHash provided in request or no userId: proceed with provided value
        buildAndInsert(null);
      }
    });
  } catch (err) {
    console.error("Error saving rating:", err);
    res.status(500).json({ message: "Unable to save rating" });
  }
});

// Serve static files (index.html, css, js, videos)
app.use(express.static(path.resolve(".")));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
