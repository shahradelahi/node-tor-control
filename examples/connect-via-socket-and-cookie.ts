import { TorControl } from 'tor-ctrl';

using tc = new TorControl({
  socketPath: '/var/run/tor/control', // Use unix socket control instead of TCP host
  cookiePath: '/var/run/tor/control.authcookie', // Cookie file for authentication
  // password: 'password' // Set password if Tor is running with Password authentication instead of Cookie Autentication
});

await tc.connect();
console.log('Connected!');

const data = await tc.sendCommand(['GETINFO', 'version']);
console.log('GETINFO:', data); // [ { code: 250, message: 'version=...' } ]
