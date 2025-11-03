import express, { json } from "express";
import path from "path";
import { readdirSync, appendFileSync, mkdirSync } from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(json());

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
  const { videoId, rating } = req.body;
  if (!videoId || typeof rating === "undefined") {
    return res.status(400).json({ message: "Missing data" });
  }

  try {
    mkdirSync("./data", { recursive: true });
    const logLine = `${new Date().toISOString()} | Video: ${videoId} | Rating: ${rating}\n`;
    appendFileSync("./data/rating.log", logLine);
    res.json({ message: "Rating saved" });
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
