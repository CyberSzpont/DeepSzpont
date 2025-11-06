<?php
require_once __DIR__ . '/../src/bootstrap.php';
header('Content-Type: application/json');
$pdo = getPDO();
// return only videos stored under the Test subfolder to enforce loading from /videos/Test
$stmt = $pdo->prepare('SELECT filename FROM videos WHERE filename LIKE :prefix ORDER BY id');
$stmt->execute([':prefix' => 'Test/%']);
$rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo json_encode($rows);
