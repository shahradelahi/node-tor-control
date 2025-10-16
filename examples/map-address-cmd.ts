import { TorControl } from 'tor-ctrl';

async function main() {
  const tc = new TorControl({
    host: 'localhost',
    port: 9051,
    password: 'password',
  });

  try {
    await tc.connect();
    const mar = await tc.mapAddress('1.2.3.4', 'torproject.org');
    console.log('MAPADDRESS:', mar); // { code: 250, message: '1.2.3.4=torproject.org' }

    const gir = await tc.getInfo('address-mappings/control');
    console.log('GETINFO:', gir); // { code: 250, message: 'address-mappings/control=1.2.3.4 torproject.org NEVER' }
  } catch (err) {
    console.error(err);
  } finally {
    if (tc.state === 'connected') {
      await tc.disconnect();
    }
  }
}

main();
