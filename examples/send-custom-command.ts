import { TorControl } from 'tor-ctrl';

await using tc = new TorControl({
  host: 'localhost',
  port: 9051,
  password: 'password',
});

await tc.connect();
console.log('Connected!');

const data = await tc.sendCommand(['GETINFO', 'version']);
console.log('GETINFO:', data); // [ { code: 250, message: 'version=...' } ]
