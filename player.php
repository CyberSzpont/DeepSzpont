<?php
require_once __DIR__ . '/src/bootstrap.php';

// protect direct access: require session flag set by start.php
session_start();
if(empty($_SESSION['can_play'])){
	header('Location: /index.php');
	exit;
}

echo getTwig()->render('player.twig', [
	// hide the global header/logo on the player page
	'show_header' => false,
	// add a body class so we can target CSS specifically for the player page
	'body_class' => 'player',
]);
