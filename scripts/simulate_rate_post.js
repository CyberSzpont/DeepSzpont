import fetch from 'node-fetch';

(async () => {
  const url = 'http://localhost:3000/api/rate';
  const body = {
    rating: 5,
    userHash: 'p7x2dczh',
    userId: 'u_1764927401665_obf96c5',
    videoId: 'videos_watermark_rm/Video18_Ai_do_wyjebania.mp4'
  };
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    console.log('status', res.status);
    const data = await res.json().catch(() => null);
    console.log('response', data);
  } catch (e) {
    console.error('fetch failed', e);
  }
})();
