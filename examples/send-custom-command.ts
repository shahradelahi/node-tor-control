import { TorControl } from 'tor-ctrl';

const tc = new TorControl({
  host: 'localhost',
  port: 9051,
  password: 'password'
});

tc.on('connect', () => {
  console.log('Connected!');
});

tc.on('error', (err) => {
  console.error('Error:', err);
});

tc.on('close', () => {
  console.log('Closed!');
});

tc.connect()
  .then(async () => {
    const { data } = await tc.sendCommand(['GETINFO', 'version']);
    console.log('GETINFO:', data); // [ { code: 250, message: 'version=...' } ]
  })
  .finally(() => tc.disconnect());
