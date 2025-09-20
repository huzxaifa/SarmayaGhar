import http from 'http';

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/ml/train-models',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log('BODY', data);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Request failed', e);
  process.exit(1);
});

req.write(JSON.stringify({}));
req.end();
