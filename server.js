import express, { json } from "express";
import path from "path";
import { readdirSync, appendFileSync, mkdirSync } from "fs";
import sqlite3 from "sqlite3";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(json());

// Initialize SQLite database
const DB_DIR = path.resolve("./data");
try { mkdirSync(DB_DIR, { recursive: true }); } catch (e) {}
const DB_PATH = path.join(DB_DIR, "db.sqlite");
sqlite3.verbose();
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Failed to open sqlite database:", err);
    return;
  }
  // enable foreign keys
  db.run("PRAGMA foreign_keys = ON;");
  // create tables if they do not exist
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      video_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`
  );
});

// Serve a list of videos from the ./videos directory
app.get("/api/videos", (req, res) => {
  try {
    const videosDir = path.resolve("./videos");
    const files = readdirSync(videosDir, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name)
      // return only common video extensions
      .filter((name) => /\.(mp4|webm|ogg|mov)$/i.test(name));

    res.json(files);
  } catch (err) {
    console.error("Error reading videos directory:", err);
    res.status(500).json({ message: "Unable to read videos" });
  }
});

// Receive rating for a video and append to data/rating.log
app.post("/api/rate", (req, res) => {
  const { videoId, rating, userId } = req.body;
  if (!videoId || typeof rating === "undefined" || !userId) {
    return res.status(400).json({ message: "Missing data (videoId, rating, userId required)" });
  }

  // Insert rating into the SQLite database
  const stmt = db.prepare(
    `INSERT INTO ratings (user_id, video_id, rating) VALUES (?, ?, ?)`
  );
  stmt.run(userId, videoId, rating, function (err) {
    if (err) {
      console.error("DB error inserting rating:", err);
      return res.status(500).json({ message: "Unable to save rating" });
    }
    res.json({ message: "Rating saved", ratingId: this.lastID });
  });
  stmt.finalize();
});

// Create new user (increments user id). Client should call this at test start to receive a userId.
app.post("/api/user", (req, res) => {
  const stmt = db.prepare(`INSERT INTO users DEFAULT VALUES`);
  stmt.run(function (err) {
    if (err) {
      console.error("DB error creating user:", err);
      return res.status(500).json({ message: "Unable to create user" });
    }
    res.json({ userId: this.lastID });
  });
  stmt.finalize();
});

// Serve static files (index.html, css, js, videos)
app.use(express.static(path.resolve(".")));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
