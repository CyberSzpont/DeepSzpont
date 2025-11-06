<?php
require_once __DIR__ . '/src/bootstrap.php';

// protect direct access: require session flag set by start.php
session_start();
if(empty($_SESSION['can_play'])){
	header('Location: /index.php');
	exit;
}

// mark session as finished so participant cannot re-enter
$_SESSION['finished'] = true;
if(isset($_SESSION['can_play'])){
	unset($_SESSION['can_play']);
}
if(isset($_SESSION['started_at'])){
	unset($_SESSION['started_at']);
}
// ensure session is saved
session_write_close();

// render the thanks page
echo getTwig()->render('thanks.twig', []);
