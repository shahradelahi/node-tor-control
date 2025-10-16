import { TorControl } from 'tor-ctrl';

async function main() {
  const tc = new TorControl({
    socketPath: '/var/run/tor/control', // Use unix socket control instead of TCP host
    cookiePath: '/var/run/tor/control.authcookie', // Cookie file for authentication
    // password: 'password' // Set password if Tor is running with Password authentication instead of Cookie Autentication
  });

  try {
    await tc.connect();
    console.log('Connected!');

    const data = await tc.sendCommand(['GETINFO', 'version']);
    console.log('GETINFO:', data); // [ { code: 250, message: 'version=...' } ]
  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (tc.state === 'connected') {
      await tc.disconnect();
      console.log('Disconnected!');
    }
  }
}

main();
