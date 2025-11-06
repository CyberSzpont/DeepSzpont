<?php
require_once __DIR__ . '/../src/bootstrap.php';
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true) ?: [];
$videoId = $data['videoId'] ?? null; // filename
$rating = isset($data['rating']) ? (int)$data['rating'] : null;
$userId = isset($data['userId']) ? (int)$data['userId'] : null;

// prefer PHP session user id if available; start session to access it
session_start();
if(empty($userId) && !empty($_SESSION['user_id'])){
    $userId = (int)$_SESSION['user_id'];
}

if (!$videoId || !$rating) {
    http_response_code(400);
    echo json_encode(['error'=>'missing parameters']);
    exit;
}

if (empty($userId)) {
    http_response_code(400);
    echo json_encode(['error'=>'missing userId']);
    exit;
}

$pdo = getPDO();
// find video id by filename
$stmt = $pdo->prepare('SELECT id FROM videos WHERE filename = :f LIMIT 1');
$stmt->execute([':f'=>$videoId]);
$vid = $stmt->fetchColumn();
if (!$vid) {
    http_response_code(404);
    echo json_encode(['error'=>'video not found']);
    exit;
}

$stmt = $pdo->prepare('INSERT INTO ratings (user_id, video_id, rating) VALUES (:u,:v,:r)');
$stmt->execute([':u'=>$userId, ':v'=>$vid, ':r'=>$rating]);

echo json_encode(['ok'=>true]);
