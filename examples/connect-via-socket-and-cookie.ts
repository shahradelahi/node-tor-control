import { TorControl } from 'tor-ctrl';

const tc = new TorControl({
  socketPath: '/var/run/tor/control', // Use unix socket control instead of TCP host
  cookiePath: '/var/run/tor/control.authcookie' // Cookie file for authentication
  // password: 'password' // Set password if Tor is running with Password authentication instead of Cookie Autentication
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
