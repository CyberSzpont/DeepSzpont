<?php
require_once __DIR__ . '/../vendor/autoload.php';

// Twig setup
$loader = new \Twig\Loader\FilesystemLoader(__DIR__ . '/../templates');
$twig = new \Twig\Environment($loader, [
    'cache' => false,
]);

// SQLite setup
$dbFile = __DIR__ . '/../data/database.sqlite';
$pdo = new PDO('sqlite:' . $dbFile);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('PRAGMA foreign_keys = ON');

function getPDO() {
    global $pdo;
    return $pdo;
}

function getTwig() {
    global $twig;
    return $twig;
}

?>
