import { TorControl } from 'tor-ctrl';

const tc = new TorControl({
  host: 'localhost',
  port: 9051,
  password: 'password'
});

tc.connect()
  .then(async () => {
    const { data } = await tc.getNewIdentity();
    console.log('NEW_IDENTITY:', data); // { code: 250, message: 'OK' }
    // Or
    // const { data: data2 } = await tc.signal('NEWNYM');
    // console.log('NEWNYM:', data2); // { code: 250, message: 'OK' }
  })
  .finally(() => tc.disconnect());
