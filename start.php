<?php
// Initialize session and mark the participant as allowed to access the player
session_start();
// if the user already finished the study, don't allow restarting; send them back to the start page
if(!empty($_SESSION['finished'])){
	header('Location: /index.php');
	exit;
}

// set a flag that allows access to player/thanks during this session
$_SESSION['can_play'] = true;
// optional: store timestamp
$_SESSION['started_at'] = time();

// redirect to the player
header('Location: /player.php');
exit;
