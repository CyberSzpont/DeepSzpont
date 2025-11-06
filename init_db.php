<?php
require_once __DIR__ . '/src/bootstrap.php';

$pdo = getPDO();

$pdo->exec("CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY,
    filename TEXT UNIQUE
)");

$pdo->exec("CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)");

$pdo->exec("CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    video_id INTEGER,
    rating INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(video_id) REFERENCES videos(id)
)");

// scan only the videos/Test directory and insert filenames with the subfolder prefix
$videoSubdir = 'Test';
$videoDir = __DIR__ . '/videos/' . $videoSubdir;
if (is_dir($videoDir)) {
    $files = scandir($videoDir);
    $stmt = $pdo->prepare('INSERT OR IGNORE INTO videos (filename) VALUES (:f)');
    foreach ($files as $f) {
        if (in_array($f, ['.', '..'])) continue;
        // only include typical video extensions
        if (preg_match('/\.(mp4|webm|ogg)$/i', $f)) {
            // store with subfolder prefix so frontend can request /videos/Test/<file>
            $stmt->execute([':f' => $videoSubdir . '/' . $f]);
        }
    }
} else {
    echo "Warning: video subdirectory not found: $videoDir\n";
}

echo "Database initialized.\n";
