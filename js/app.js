const videoEl = document.getElementById("video");
const titleEl = document.getElementById("video-title");
const ratingButtonsRow = document.getElementById("rating-buttons");
const thanksScreen = document.getElementById("thanks-screen");
const playerCard = document.getElementById("player-card");
const restartBtn = document.getElementById("restart");
const startScreen = document.getElementById("start-screen");
const startBtn = document.getElementById("start-btn");

let videos = [];
let currentIndex = 0;
let pendingPrimary = null; // temporarily store primary choice ('ai' or 'real') until certainty is given
const RATING_SHOW_DELAY = 500;
let ratingLocked = false; // prevent inputs while a gap is in progress
let currentUserId = null; // przechowuje identyfikator użytkownika
let currentUserHash = null; // hex hash for user (returned from server)

async function createUserDesktop(){
	try{
		// sprawdź najpierw localStorage
		const storedId = localStorage.getItem('roc_userId');
		const storedHash = localStorage.getItem('roc_userHash');
		// ensure a persistent path hash exists for this client (only generated once)
		let pathHash = localStorage.getItem('roc_pathHash');
		// If a userHash is present in the URL (query param or fragment), prefer that
		let urlUserHash = null;
		try { const u = new URL(window.location); urlUserHash = u.searchParams.get('userHash') || (u.hash ? u.hash.replace(/^#/, '') : null); } catch (e) {}
		if (!pathHash && urlUserHash) {
			pathHash = urlUserHash;
			localStorage.setItem('roc_pathHash', pathHash);
		}
		if (!pathHash) {
			pathHash = Math.random().toString(36).substring(2, 10);
			localStorage.setItem('roc_pathHash', pathHash);
		}
		// set URL fragment once (preserve search params). Use hash instead
		// of changing the pathname so a page refresh won't trigger a server
		// GET for /<hash> (which caused "Cannot GET /myhash" errors).
		try {
			const u = new URL(window.location);
			u.hash = `#${pathHash}`;
			history.replaceState({}, '', u);
		} catch (e) {}

		if (storedId) {
			currentUserId = storedId;
			if (storedHash) {
				currentUserHash = storedHash;
				// add to URL without reloading
				try { const u = new URL(window.location); u.searchParams.set('userHash', currentUserHash); history.replaceState({}, '', u); } catch (e) {}
			}
			return;
		}
		const res = await fetch('/api/user',{method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ userHash: pathHash })});
		if(!res.ok) throw new Error('user create failed');
		const data = await res.json();
		currentUserId = data.userId;
		currentUserHash = data.userHash || null;
		localStorage.setItem('roc_userId', currentUserId);
		if (currentUserHash) localStorage.setItem('roc_userHash', currentUserHash);
		// add userHash to address bar (no reload)
		try { const u = new URL(window.location); if (currentUserHash) u.searchParams.set('userHash', currentUserHash); history.replaceState({}, '', u); } catch (e) {}
	}catch(e){
		console.warn('Nie udało się utworzyć usera:', e);
	}
}

function lockRatingUI() {
	ratingLocked = true;
	try {
		for (const b of ratingButtonsRow.querySelectorAll('button')) b.disabled = true, b.hidden = true;
	} catch (e) {}
}

function unlockRatingUI() {
	ratingLocked = false;
	try {
		for (const b of ratingButtonsRow.querySelectorAll('button')) b.disabled = false, b.hidden = false;
	} catch (e) {}
}
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
	// now present a single-step 1..5 scale instead of AI/REAL then certainty
	ratingButtonsRow.innerHTML = "";
	const prompt = document.getElementById('rating-prompt');
	if (prompt) prompt.textContent = 'Oceń materiał — skala 1 (AI) do 5 (REAL)';
	for (let i = 1; i <= 5; i++) {
		const b = document.createElement('button');
		b.className = 'rate-btn scale-btn';
		b.textContent = String(i);
		b.addEventListener('click', () => { if (!ratingLocked) submitScaleRating(i); });
		if (ratingLocked) b.disabled = true;
		ratingButtonsRow.appendChild(b);
	}
}

// remove the two-step certainty flow; provide single submit function
async function submitScaleRating(value) {
	const filename = videos[currentIndex];
	try {
		// include the persistent path hash (roc_pathHash) if available so ratings always carry the URL hash
		const pathHash = localStorage.getItem('roc_pathHash');
		const outgoingUserHash = pathHash || currentUserHash || null;
		console.log('Sending rating ->', { video: filename, userId: currentUserId, outgoingUserHash });
		await fetch('/api/rate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ videoId: filename, rating: value, userId: currentUserId, userHash: outgoingUserHash }),
		});
	} catch (err) {
		console.error('Failed to send rating', err);
	}

	// advance to next video
	lockRatingUI();
	currentIndex++;
	if (currentIndex >= videos.length) {
		showThanks();
		return;
	}
	setTimeout(() => {
		try { videoEl.style.opacity = '1'; } catch (e) {}
		unlockRatingUI();
		loadCurrent();
	}, RATING_SHOW_DELAY);
}

function resetPrimaryButtons() {
	// keep a simple method to rebuild the 1..5 controls
	const prompt = document.getElementById('rating-prompt');
	if (prompt) prompt.textContent = 'Oceń materiał — skala 1 (AI) do 5 (REAL)';
	buildRatingButtons();
}

function showThanks() {
	playerCard.classList.add("hidden");
	thanksScreen.classList.remove("hidden");
}

// Desktop version of mobile's showDone: hide player, disable rating buttons and show thanks

function showDone(){
  card.classList.add('hidden');
  leftBtn.disabled = true; rightBtn.disabled = true;
  doneEl.classList.remove('hidden');
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
	// ensure video element is visible and ready when loading a new file
	try { videoEl.style.visibility = 'visible'; videoEl.style.display = ''; } catch (e) {}
	// filename may include subfolders; use encodeURI so slashes are preserved
	videoEl.src = `videos/${encodeURI(filename)}`;
	// ensure user cannot control playback via native controls
	videoEl.controls = false;
	// do not loop: when video ends, leave it on the last frame
	videoEl.loop = false;
	// start playback programmatically
	videoEl.play().catch(() => {});
}

async function start() {
	await createUserDesktop();
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
	// remove the entire start screen from DOM so it won't be shown again
	try { startScreen.remove(); } catch (e) {}
	playerCard.classList.remove("hidden");
	await start();
});

// if user wants to return to start from thanks screen, reload the page
if (restartBtn) {
	restartBtn.addEventListener("click", () => {
		try { videoEl.pause(); } catch (e) {}
		videoEl.src = "";
		currentIndex = 0;
		thanksScreen.classList.add("hidden");
		playerCard.classList.add("hidden");
		// reload to restore start screen
		window.location.reload();
	});
}

// If video ends without rating (we loop), provide a fallback: after many loops advance automatically
// Prevent user from pausing, seeking or using context menu / keyboard shortcuts
//let lastSafeTime = 0;
//videoEl.addEventListener("timeupdate", () => {
	// track the last safe playback time so we can prevent seeking
//	if (!isNaN(videoEl.currentTime)) lastSafeTime = videoEl.currentTime;
//});

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

///videoEl.addEventListener("pause", () => {
	// if the video was paused before it ended, resume playback
	//if (!videoEl.ended) {
//		videoEl.play().catch(() => {});
//	}
//});

videoEl.addEventListener("contextmenu", (e) => e.preventDefault());
videoEl.addEventListener("dblclick", (e) => e.preventDefault());

// When playback finishes, fade to black and pause. Keep paused until user rates.
videoEl.addEventListener('ended', () => {
	try {
		videoEl.pause();
		videoEl.style.opacity = '0';
	} catch (e) { }
	try {
		videoEl.style.transition = 'opacity 240ms ease';
	} catch (e) {}
});

// block common keys that can control playback (space, arrow keys, media keys)
window.addEventListener("keydown", (e) => {
	const blocked = [" ", "Spacebar", "ArrowLeft", "ArrowRight", "MediaPlayPause", "k", "K"];
	if (blocked.includes(e.key)) {
		e.preventDefault();
		e.stopPropagation();
	}
});

start();
