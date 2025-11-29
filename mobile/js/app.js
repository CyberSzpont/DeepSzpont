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
  try { videoEl.style.visibility = 'visible'; videoEl.style.display = ''; } catch (e) {}
  // ensure card is visible (remove hidden if present)
  try { card.classList.remove('hidden'); } catch (e) {}
  videoEl.src = `/videos/${encodeURI(filename)}`;
  videoEl.currentTime = 0;
  // reset transform
  card.classList.remove('swipe-left','swipe-right');
  leftLabel.style.opacity = 0; rightLabel.style.opacity = 0;
}

function showDone(){
  card.classList.add('hidden');
  leftBtn.disabled = true; rightBtn.disabled = true;
  doneEl.classList.remove('hidden');
}

async function submitRating(rating){
  const filename = videos[currentIndex];
  try{
    await fetch('/api/rate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({videoId:filename,rating,userId:currentUserId})});
  }catch(e){console.warn('rate failed',e)}
}

function animateChoice(dir){
  if(dir === 'left'){
    card.classList.add('swipe-left'); leftLabel.style.opacity=1
  } else {
    card.classList.add('swipe-right'); rightLabel.style.opacity=1
  }
}

async function choose(dir){
  if(!videos || currentIndex>=videos.length) return;
  const rating = dir === 'left' ? 5 : 1; // left=real(5), right=ai(1)
  animateChoice(dir);
  await submitRating(rating);
  // wait for animation then advance
  setTimeout(()=>{ currentIndex++; loadCurrent(); }, 320);
}

// touch handling for swipe gestures
let startX = 0; let isTouching = false;
card.addEventListener('touchstart', e=>{ isTouching=true; startX = e.touches[0].clientX });
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
leftBtn.addEventListener('click', ()=> choose('left'));
rightBtn.addEventListener('click', ()=> choose('right'));

// hide video when playback completes so the last frozen frame isn't visible
videoEl.addEventListener('ended', () => {
  try {
    // fade the video out to black, then clear the src so no frozen frame remains
    videoEl.pause();
    // ensure transition is set (CSS also provides it)
    try { videoEl.style.transition = 'opacity 240ms ease'; } catch (e) {}
    try { videoEl.style.opacity = '0'; } catch (e) {}
    // after transition finishes, remove src/poster and hide the element
    setTimeout(() => {
      try { videoEl.removeAttribute('src'); } catch (e) {}
      try { videoEl.removeAttribute('poster'); } catch (e) {}
      try { videoEl.load(); } catch (e) {}
      try { videoEl.style.display = 'none'; } catch (e) {}
      // reset opacity so the next video can fade in normally
      try { videoEl.style.opacity = '1'; } catch (e) {}
    }, 260);
    // keep the card visible so the user can still rate the item
    // reset labels so they don't remain visible
    leftLabel.style.opacity = 0; rightLabel.style.opacity = 0;
  } catch (e) {}
});

// startup
(async function(){
  await createUser();
  await fetchVideos();
  loadCurrent();
})();
