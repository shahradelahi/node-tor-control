import { TorControl } from 'tor-ctrl';

async function main() {
  const tc = new TorControl({
    host: 'localhost',
    port: 9051,
    password: 'password',
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
