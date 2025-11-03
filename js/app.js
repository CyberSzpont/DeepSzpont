const videoEl = document.getElementById("video");
const titleEl = document.getElementById("video-title");
const ratingButtonsRow = document.getElementById("rating-buttons");
const thanksScreen = document.getElementById("thanks-screen");
const playerCard = document.getElementById("player-card");
const startScreen = document.getElementById("start-screen");
const startBtn = document.getElementById("start-btn");

let videos = [];
let currentIndex = 0;
let currentUserId = null; // created when a person starts the test

async function fetchVideos() {
	try {
		const res = await fetch("/api/videos");
		if (!res.ok) throw new Error("Failed to load videos");
		videos = await res.json();
	} catch (err) {
		console.error(err);
		videos = [];
	}
}

function buildRatingButtons() {
	ratingButtonsRow.innerHTML = "";
	for (let i = 1; i <= 5; i++) {
		const btn = document.createElement("button");
		btn.className = "rate-btn";
		btn.textContent = i;
		btn.addEventListener("click", () => onRate(i));
		ratingButtonsRow.appendChild(btn);
	}
}


async function onRate(value) {
	const filename = videos[currentIndex];
	try {
		await fetch("/api/rate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ videoId: filename, rating: value, userId: currentUserId }),
		});
	} catch (err) {
		console.error("Failed to send rating", err);
	}

	nextVideo();
}

function nextVideo() {
	currentIndex++;
	if (currentIndex >= videos.length) {
		showThanks();
		return;
	}

	loadCurrent();
}

function showThanks() {
	playerCard.classList.add("hidden");
	thanksScreen.classList.remove("hidden");
}

function reset() {
	currentIndex = 0;
	thanksScreen.classList.add("hidden");
	playerCard.classList.remove("hidden");
	loadCurrent();
}

function loadCurrent() {
	const filename = videos[currentIndex];
	if (!filename) return;
	// title is intentionally hidden in CSS; no visible filename shown
	videoEl.src = `videos/${encodeURIComponent(filename)}`;
	// ensure user cannot control playback via native controls
	videoEl.controls = false;
	// do not loop: when video ends, leave it on the last frame
	videoEl.loop = false;
	// start playback programmatically
	videoEl.play().catch(() => {});
}

async function start() {
	await fetchVideos();
	if (!videos || videos.length === 0) {
		titleEl.textContent = "Brak dostępnych filmów w katalogu /videos";
		return;
	}
	buildRatingButtons();
	loadCurrent();
}

// Start button: hide start screen, show player, begin test
startBtn.addEventListener("click", async () => {
	// create a new user id (increments user counter on server)
	try {
		const res = await fetch('/api/user', { method: 'POST' });
		if (res.ok) {
			const data = await res.json();
			currentUserId = data.userId;
			console.log('Current userId:', currentUserId);
		} else {
			console.warn('Failed to create user, proceeding without userId');
		}
	} catch (e) {
		console.warn('Error creating user:', e);
	}

	// remove distracting header and start screen from DOM so they won't be shown during the test
	try {
		const header = document.querySelector('.site-header');
		if (header) header.remove();
	} catch (e) {}

	try { startScreen.remove(); } catch (e) {}
	playerCard.classList.remove("hidden");
	await start();
});

// The restart button was removed to keep flow focused; when the test ends the thanks screen is shown.

// If video ends without rating (we loop), provide a fallback: after many loops advance automatically
// Prevent user from pausing, seeking or using context menu / keyboard shortcuts
let lastSafeTime = 0;
videoEl.addEventListener("timeupdate", () => {
	// track the last safe playback time so we can prevent seeking
	if (!isNaN(videoEl.currentTime)) lastSafeTime = videoEl.currentTime;
});

videoEl.addEventListener("seeking", () => {
	// revert any user attempt to seek back to the last known time
	try {
		if (Math.abs(videoEl.currentTime - lastSafeTime) > 0.1) {
			videoEl.currentTime = lastSafeTime;
		}
	} catch (e) {
		// ignore
	}
});

videoEl.addEventListener("pause", () => {
	// if the video was paused before it ended, resume playback
	if (!videoEl.ended) {
		videoEl.play().catch(() => {});
	}
});

videoEl.addEventListener("contextmenu", (e) => e.preventDefault());
videoEl.addEventListener("dblclick", (e) => e.preventDefault());

// block common keys that can control playback (space, arrow keys, media keys)
window.addEventListener("keydown", (e) => {
	const blocked = [" ", "Spacebar", "ArrowLeft", "ArrowRight", "MediaPlayPause", "k", "K"];
	if (blocked.includes(e.key)) {
		e.preventDefault();
		e.stopPropagation();
	}
});

start();
