const videoEl = document.getElementById('video');
const card = document.getElementById('card');
const leftBtn = document.getElementById('choose-left');
const rightBtn = document.getElementById('choose-right');
const leftLabel = document.getElementById('leftLabel');
const rightLabel = document.getElementById('rightLabel');
const doneEl = document.getElementById('done');

let videos = [];
let currentIndex = 0;
let currentUserId = null;
let pendingPrimaryMobile = null; // store primary choice until certainty is selected
const RATING_SHOW_DELAY = 500;
let ratingLockedMobile = false;

function lockMobileUI() {
  ratingLockedMobile = true;
  try {
    const controls = document.querySelector('.controls');
    if (controls) controls.classList.add('locked');
    for (const b of document.querySelectorAll('.controls button')) {
      b.disabled = true;
      b.hidden = true;
    }
  } catch (e) {}
}

function unlockMobileUI() {
  ratingLockedMobile = false;
  try {
    const controls = document.querySelector('.controls');
    if (controls) controls.classList.remove('locked');
    for (const b of document.querySelectorAll('.controls button')) {
      b.disabled = false;
      b.hidden = false;
    }
  } catch (e) {}
}

async function createUser(){
  try{
    const res = await fetch('/api/user',{method:'POST'});
    if(res.ok){ const data = await res.json(); currentUserId = data.userId }
  }catch(e){console.warn('user create failed', e)}
}

async function fetchVideos(){
  try{
    const r = await fetch('/api/videos'); if(!r.ok) throw 0; videos = await r.json();
  }catch(e){videos=[]}
}

function loadCurrent(){
  if(!videos || currentIndex>=videos.length){ showDone(); return }
  const filename = videos[currentIndex];
  // ensure video is visible when loading
  try { videoEl.style.visibility = 'visible'; videoEl.style.display = ''; videoEl.style.opacity = '1'; } catch (e) {}
  // ensure card is visible (remove hidden if present)
  try { card.classList.remove('hidden'); } catch (e) {}
  videoEl.src = `/videos/${encodeURI(filename)}`;
  videoEl.currentTime = 0;
  // reset transform
  card.classList.remove('swipe-left','swipe-right');
  leftLabel.style.opacity = 0; rightLabel.style.opacity = 0;
  // rebuild controls as 1..5 scale
  restoreChoiceButtons();
}

function showDone(){
  card.classList.add('hidden');
  const controls = document.querySelector('.controls');
  if(controls) controls.innerHTML = '';
  doneEl.classList.remove('hidden');
}

async function submitRating(rating, certainty){
  const filename = videos[currentIndex];
  try{
    // If certainty is provided, include it in the payload
    await fetch('/api/rate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({videoId:filename,rating,certainty,userId:currentUserId})});
  }catch(e){console.warn('rate failed',e)}
}

function animateChoice(dir){
  if(dir === 'left'){
    card.classList.add('swipe-left'); leftLabel.style.opacity=1
  } else {
    card.classList.add('swipe-right'); rightLabel.style.opacity=1
  }
}

function buildScaleButtonsMobile() {
  const controls = document.querySelector('.controls');
  controls.innerHTML = '';
  const prompt = document.createElement('div');
  prompt.className = 'certainty-prompt';
  prompt.textContent = 'Oceń: 1 (AI) — 5 (REAL)';
  controls.appendChild(prompt);
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement('button');
    b.className = 'choice scale';
    b.textContent = String(i);
    if (ratingLockedMobile) b.disabled = true;
    b.addEventListener('click', async () => {
      if (ratingLockedMobile) return;
      lockMobileUI();
      await submitRating(i);
      currentIndex++;
      if (currentIndex >= videos.length) { showDone(); return }
      setTimeout(()=>{ unlockMobileUI(); loadCurrent(); }, RATING_SHOW_DELAY);
    });
    controls.appendChild(b);
  }
}

function nextVideoMobile() {
  currentIndex++;
  if (currentIndex >= videos.length) {
    showDone();
    return;
  }

  setTimeout(() => {
    try { videoEl.style.opacity = '1'; } catch (e) {}
    // unlock inputs again when next video appears
    unlockMobileUI();
    loadCurrent();
  }, RATING_SHOW_DELAY);
}

function restoreChoiceButtons(){
  const controls = document.querySelector('.controls');
  controls.innerHTML = '';
  for (let i = 1; i <= 5; i++){
    const b = document.createElement('button');
    b.id = `scale-${i}`;
    b.className = 'choice scale';
    b.textContent = String(i);
    b.addEventListener('click', async ()=>{
      if (ratingLockedMobile) return;
      lockMobileUI();
      await submitRating(i);
      nextVideoMobile();
    });
    try { b.disabled = ratingLockedMobile; b.hidden = ratingLockedMobile; } catch (e) {}
    controls.appendChild(b);
  }
}

async function choose(dir){
  if (ratingLockedMobile) return; // ignore gestures/clicks while locked
  if(!videos || currentIndex>=videos.length) return;
  // interpret swipe: strong left => 1 (AI), strong right => 5 (REAL)
  if (dir === 'left') {
    // left is REAL previously, but here interpret left swipe as REAL high score
    // To keep consistent with desktop, map left->5, right->1
    const rating = 5;
    lockMobileUI();
    await submitRating(rating);
    nextVideoMobile();
  } else {
    const rating = 1;
    lockMobileUI();
    await submitRating(rating);
    nextVideoMobile();
  }
}

// touch handling for swipe gestures
let startX = 0; let isTouching = false;
card.addEventListener('touchstart', e=>{ if (ratingLockedMobile) return; isTouching=true; startX = e.touches[0].clientX });
card.addEventListener('touchmove', e=>{
  if(!isTouching) return;
  const dx = e.touches[0].clientX - startX;
  card.style.transform = `translateX(${dx}px) rotate(${dx/20}deg)`;
  if(dx > 40) { rightLabel.style.opacity=1; leftLabel.style.opacity=0 }
  else if(dx < -40) { leftLabel.style.opacity=1; rightLabel.style.opacity=0 }
});
card.addEventListener('touchend', e=>{
  isTouching=false; card.style.transform='';
  const endX = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : startX;
  const dx = endX - startX;
  if(dx > 80){ choose('right') }
  else if(dx < -80){ choose('left') }
  else { leftLabel.style.opacity=0; rightLabel.style.opacity=0 }
});

// mouse drag support (for desktop testing)
let isDraggingMouse = false;
card.addEventListener('mousedown', e => {
  if (ratingLockedMobile) return;
  isDraggingMouse = true;
  startX = e.clientX;
  e.preventDefault();
});
document.addEventListener('mousemove', e => {
  if (!isDraggingMouse) return;
  const dx = e.clientX - startX;
  card.style.transform = `translateX(${dx}px) rotate(${dx/20}deg)`;
  if (dx > 40) { rightLabel.style.opacity = 1; leftLabel.style.opacity = 0 }
  else if (dx < -40) { leftLabel.style.opacity = 1; rightLabel.style.opacity = 0 }
});
document.addEventListener('mouseup', e => {
  if (!isDraggingMouse) return;
  isDraggingMouse = false;
  card.style.transform = '';
  const dx = e.clientX - startX;
  if (dx > 80) { choose('right') }
  else if (dx < -80) { choose('left') }
  else { leftLabel.style.opacity = 0; rightLabel.style.opacity = 0 }
});

// click buttons
leftBtn.addEventListener('click', ()=> { if (!ratingLockedMobile) choose('left') });
rightBtn.addEventListener('click', ()=> { if (!ratingLockedMobile) choose('right') });

// hide video when playback completes so the last frozen frame isn't visible
videoEl.addEventListener('ended', () => {
  try {
    // pause and fade to black — keep the element present until the user submits certainty
    videoEl.pause();
    try { videoEl.style.transition = 'opacity 240ms ease'; } catch (e) {}
    try { videoEl.style.opacity = '0'; } catch (e) {}
    // keep the card visible so the user can still rate the item; clear labels
    leftLabel.style.opacity = 0; rightLabel.style.opacity = 0;
  } catch (e) {}
  // If nothing happens, ensure the primary rating controls reappear after a short delay
  setTimeout(() => {
    try {
      const controls = document.querySelector('.controls');
      if (controls && !controls.querySelector('button')) {
        restoreChoiceButtons();
      }
    } catch (e) {}
  }, 500);
});

// startup
(async function(){
  await createUser();
  await fetchVideos();
  loadCurrent();
})();
