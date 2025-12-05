import http from 'http';

const body = JSON.stringify({
  rating: 5,
  userHash: 'p7x2dczh',
  userId: 'u_1764927401665_obf96c5',
  videoId: 'videos_watermark_rm/Video18_Ai_do_wyjebania.mp4'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/rate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => console.error('Request error', e));
req.write(body);
req.end();
