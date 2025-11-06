<?php
require_once __DIR__ . '/src/bootstrap.php';

// pass finished flag to the start template so we can inform participant if they already completed the study
session_start();
$finished = !empty($_SESSION['finished']);
echo getTwig()->render('start.twig', ['finished' => $finished]);
