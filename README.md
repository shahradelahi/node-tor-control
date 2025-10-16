# tor-ctrl

[![CI](https://github.com/shahradelahi/node-tor-control/actions/workflows/ci.yml/badge.svg)](https://github.com/shahradelahi/node-tor-control/actions/workflows/ci.yml)
[![NPM Version](https://img.shields.io/npm/v/tor-ctrl)](https://www.npmjs.com/package/tor-ctrl)
[![Install Size](https://packagephobia.com/badge?p=tor-ctrl)](https://packagephobia.com/result?p=tor-ctrl)
[![License](https://img.shields.io/github/license/shahradelahi/node-tor-control)](/LICENSE)

_tor-ctrl_ is a simple library to connect to a Tor control port and send commands to it.

## 📦 Installation

```bash
npm install tor-ctrl
```

## 📖 Usage

In below example, we are requesting for a new identity from Tor.

```typescript
import { TorControl } from 'tor-ctrl';

const tc = new TorControl({
  host: 'localhost',
  port: 9051,
  // Or, if you want to control via Tor Unix socket:
  // socketPath: '/var/run/tor/control',
  password: 'secure-password',
});

await tc.connect();

const data = await tc.getNewIdentity();
console.log(data); // { code: 250, message: 'OK' }

await tc.disconnect();
```

###### Send a Custom Command

If you don't know the available commands, please first check out the official the [Tor Control Protocol](https://spec.torproject.org/control-spec/commands.html) specifications.

```typescript
// ... inside the try block after connect()
const data = await tc.sendCommand(['GETINFO', 'version', 'config-file']);
console.log(data); // [ { code: NUM, message: STRING }, ... ]
```

For more examples, check out the [examples](/examples) directory.

## 🤝 Contributing

Want to contribute? Awesome! To show your support is to star the project, or to raise issues on [GitHub](https://github.com/shahradelahi/node-tor-control).

Thanks again for your support, it is much appreciated! 🙏

## License

[GPL-3.0](/LICENSE) © [Shahrad Elahi](https://github.com/shahradelahi) and [contributors](https://github.com/shahradelahi/node-tor-control/graphs/contributors).
