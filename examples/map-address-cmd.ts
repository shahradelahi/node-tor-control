import { TorControl } from 'tor-ctrl';

const tc = new TorControl({
  host: 'localhost',
  port: 9051,
  password: 'password'
});

tc.connect()
  .then(async () => {
    const mar = await tc.mapAddress('1.2.3.4', 'torproject.org');
    console.log('MAPADDRESS:', mar.data); // { code: 250, message: '1.2.3.4=torproject.org' }

    const gir = await tc.getInfo('address-mappings/control');
    console.log('GETINFO:', gir.data); // { code: 250, message: 'address-mappings/control=1.2.3.4 torproject.org NEVER' }
  })
  .finally(() => tc.disconnect());
