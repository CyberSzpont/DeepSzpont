import express, { json } from "express";
import path from "path";
import { readdirSync, appendFileSync, mkdirSync } from "fs";
import sqlite3 from "sqlite3";

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
         userId TEXT
       )`,
      (err) => { if (err) console.error("Failed to create ratings table:", err); }
    );
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
         id TEXT PRIMARY KEY,
         created TEXT
       )`,
      (err) => { if (err) console.error("Failed to create users table:", err); }
    );
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
  db.run(`INSERT OR IGNORE INTO users (id, created) VALUES (?, ?)`, [id, ts], (err) => {
    if (err) {
      console.error('Failed to create user:', err);
      return res.status(500).json({ message: 'Unable to create user' });
    }
    res.json({ userId: id });
  });
});

// Receive rating for a video and save to SQLite (plus optional file log)
app.post("/api/rate", (req, res) => {
  // Accept rating submissions that may also include a certainty (1-5) and a userId
  const { videoId, rating, certainty, userId } = req.body;
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

      if (insertCols.length === 0) {
        console.error('No matching columns found for insert');
        return res.status(500).json({ message: 'DB schema mismatch' });
      }

      const sql = `INSERT INTO ratings (${insertCols.join(',')}) VALUES (${placeholders.join(',')})`;
      db.run(sql, values, function(err) {
        if (err) {
          console.error("DB insert failed:", err);
          // fallback to file log for durability
          try {
            const parts = [`${ts}`, `Video: ${videoId}`, `Rating: ${rating}`];
            if (typeof certainty !== 'undefined') parts.push(`Certainty: ${certainty}`);
            if (userId) parts.push(`User: ${userId}`);
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
          const logLine = parts.join(' | ') + '\n';
          appendFileSync("./data/rating.log", logLine);
        } catch (e) { /* ignore */ }

        res.json({ message: "Rating saved", id: this.lastID });
      });
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
