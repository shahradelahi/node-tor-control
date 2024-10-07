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


                         ["Node.js"]

{
  "name": "tor-ctrl",
  "version": "0.1.0",
  "description": "Node.js library for accessing the Tor control port",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "files": [
    "dist/**"
  ],
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.mts",
        "default": "./dist/index.mjs"
      },
      "require": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      }
    }
  },
  "scripts": {
    "dev": "tsup --watch",
    "build": "tsup",
    "test": "mocha \"**/*.test.ts\"",
    "type-check": "tsc --noEmit",
    "lint": "eslint \"src/**/*.ts\"",
    "lint:fix": "eslint --fix \"src/**/*.ts\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,json,md}\"",
    "format": "prettier --write .",
    "prepublishOnly": "pnpm run test && pnpm run format:check && pnpm run lint && pnpm run build"
  },
  "packageManager": "pnpm@8.15.0",
  "devDependencies": {
    "@types/chai": "^4.3.12",
    "@types/debug": "^4.1.12",
    "@types/mocha": "^10.0.6",
    "@types/node": "^20.11.24",
    "@typescript-eslint/eslint-plugin": "^7.1.0",
    "chai": "^5.1.0",
    "debug": "^4.3.4",
    "dotenv": "^16.4.5",
    "eslint": "^8.57.0",
    "mocha": "^10.3.0",
    "prettier": "^3.2.5",
    "tsup": "^8.0.2",
    "tsx": "^4.7.1",
    "typescript": "^5.3.3"
  },
  "repository": {
    "type": "git",
    "url": "git://github.com/shahradelahi/node-tor-control.git"
  },
  "keywords": [
    "node",
    "bun",
    "tor",
    "control",
    "port"
  ],
  "author": "Shahrad Elahi <shahrad@litehex.com> (https://github.com/shahradelahi)",
  "license": "GPL-3.0",
  "bugs": {
    "url": "https://github.com/shahradelahi/node-tor-control/issues"
  },
  "homepage": "https://github.com/shahradelahi/node-tor-control#readme"
}