# tor-ctrl <a href="https://npm.im/tor-ctrl"><img src="https://badgen.net/npm/v/tor-ctrl"></a> <a href="https://packagephobia.now.sh/result?p=tor-ctrl"><img src="https://packagephobia.now.sh/badge?p=tor-ctrl"></a>

A simple library to connect to a Tor control port and send commands to it.

## Installation

```bash
npm install tor-ctrl
```

## Usage

In below example, we are requesting for a new identity from Tor.

```typescript
import { TorControl } from 'tor-ctrl';

const tc = new TorControl({
  host: 'localhost',
  port: 9051,
  password: 'secure-password'
});

// Or, if you want to control via Tor Unix socket:
// const tc = new TorControl({
//   socketPath: '/var/run/tor/control', // Use unix socket control instead of TCP host
//   password: 'secure-password'
//   // cookiePath: '/var/run/tor/control.authcookie', // Set Cookie file for authentication if Tor is running with Cookie Autentication
// });

tc.connect().then(async () => {
  const { data } = await tc.getNewIdentity();
  console.log(data); // { code: 250, message: 'OK' }
  await tc.disconnect();
});
```

## Examples

Check out the [examples](/examples) directory for more examples.

<details>
  <summary>Send a Custom Command</summary>

If you don't know the available commands, please first check out the official [Tor Control Protocol](https://spec.torproject.org/control-spec/commands.html) documentation.

```typescript
const { data, error } = await tc.sendCommand(['GETINFO', 'version', 'config-file']);
console.log(data); // [ { code: NUM, message: STRING }, ... ]
```

</details>

## Contributing

Please read [CONTRIBUTING.md](/CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](/LICENSE) file for details.
