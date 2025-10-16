import { TorControl } from 'tor-ctrl';

async function main() {
  const tc = new TorControl({
    host: 'localhost',
    port: 9051,
    password: 'password',
  });

  try {
    await tc.connect();
    const data = await tc.getNewIdentity();
    console.log('NEW_IDENTITY:', data); // { code: 250, message: 'OK' }
    // Or
    // const data2 = await tc.signal('NEWNYM');
    // console.log('NEWNYM:', data2); // { code: 250, message: 'OK' }
  } catch (err) {
    console.error(err);
  } finally {
    if (tc.state === 'connected') {
      await tc.disconnect();
    }
  }
}

main();
