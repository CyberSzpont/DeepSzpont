<?php
require_once __DIR__ . '/../src/bootstrap.php';
header('Content-Type: application/json');
session_start();

$pdo = getPDO();
// If a user id already exists in this PHP session, return it instead of creating a new user
if(!empty($_SESSION['user_id'])){
	echo json_encode(['userId' => (int)$_SESSION['user_id'], 'fromSession' => true]);
	exit;
}

// create a new user row and persist the id in the session so refreshes reuse it
$stmt = $pdo->prepare('INSERT INTO users DEFAULT VALUES');
$stmt->execute();
$id = (int)$pdo->lastInsertId();
$_SESSION['user_id'] = $id;
echo json_encode(['userId' => $id, 'fromSession' => false]);
