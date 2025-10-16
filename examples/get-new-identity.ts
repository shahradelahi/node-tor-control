import { TorControl } from 'tor-ctrl';

await using tc = new TorControl({
  host: 'localhost',
  port: 9051,
  password: 'password',
});

await tc.connect();
const data = await tc.getNewIdentity();
console.log('NEW_IDENTITY:', data); // { code: 250, message: 'OK' }
// Or
// const data2 = await tc.signal('NEWNYM');
// console.log('NEWNYM:', data2); // { code: 250, message: 'OK' }
