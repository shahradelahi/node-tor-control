import { promises } from 'node:fs';
import { connect, Socket } from 'node:net';

import type { Result, ResultList, Signal, TorControlConfig } from '@/types';

class TorControl implements Disposable {
  #connection: Socket | null = null;
  #config: TorControlConfig;
  #state: 'connected' | 'disconnected' = 'disconnected';

  /**
   * Get the current connection state of the TorControl
   */
  get state() {
    return this.#state;
  }

  constructor(config: Partial<TorControlConfig> = {}) {
    this.#config = {
      host: 'localhost',
      port: 9051,
      password: undefined,
      socketPath: undefined,
      cookiePath: undefined,
      ...config,
    };
  }

  /**
   * Establish a connection to the TorControl
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const conn = this.#config.socketPath
        ? connect(this.#config.socketPath)
        : connect({ port: this.#config.port, host: this.#config.host });
      this.#connection = conn;

      const onError = (err: Error | string) => {
        const error = err instanceof Error ? err : new Error(`TorControl connection error: ${err}`);
        this.#state = 'disconnected';
        if (!conn.destroyed) {
          conn.destroy();
        }
        this.#connection = null;
        reject(error);
      };

      conn.on('connect', async () => {
        try {
          if (this.#config.password) {
            await this.authenticate(this.#config.password);
          } else if (this.#config.cookiePath) {
            await this.authenticateCookieFile(this.#config.cookiePath);
          }
          this.#state = 'connected';
          conn.removeListener('error', onError);
          resolve();
        } catch (error) {
          onError(error as Error);
        }
      });

      conn.on('error', onError);
      conn.on('close', () => {
        this.#state = 'disconnected';
        this.#connection = null;
      });

      conn.once('data', async (data) => {
        const str = data.toString();

        if (str.substring(0, 3) !== '250') {
          return onError(`TorControl connection error: ${data}`);
        }
      });
    });
  }

  /**
   * Close the connection to the TorControl
   */
  async disconnect(): Promise<void> {
    if (this.#connection) {
      try {
        await this.quit();
      } finally {
        this.#connection.end();
        this.#connection = null;
        this.#state = 'disconnected';
      }
    }
  }

  /**
   * Dispose the connection to the TorControl
   *
   * This method is called when the `using` statement is used on an instance of the class.
   *
   * Example:
   * ```typescript
   * using tor = new TorControl();
   * await tor.connect();
   * // ...
   * ```
   */
  [Symbol.dispose](): void {
    this.disconnect().catch(() => {});
  }

  /**
   * Send a command to the TorControl
   *
   * Example:
   * ```typescript
   *  const data = await torControl.sendCommand(['GETINFO', 'version']);
   *  console.log('GETINFO:', data); // { code: 250, message: 'version=...' }
   * ```
   *
   * @link https://spec.torproject.org/control-spec/commands.html
   * @param command
   */
  async sendCommand(command: string | string[]): Promise<ResultList> {
    if (!this.#connection) {
      throw new Error('TorControl not connected');
    }

    const conn = this.#connection;

    if (Array.isArray(command)) {
      command = command.join(' ');
    }

    return new Promise((resolve, reject) => {
      const onData = (data: Buffer) => {
        const str = data.toString();

        const lines = str.split(/\r?\n/).filter(Boolean);

        const result: ResultList = lines.map((line) => {
          const message = line.substring(4);
          const code = Number(line.substring(0, 3));
          if (code >= 400) {
            conn.removeListener('error', onError);
            reject(new Error(message));
          }
          return { code, message };
        });

        conn.removeListener('error', onError);
        resolve(result);
      };

      const onError = (err: Error) => {
        reject(err);
      };

      conn.once('data', onData);
      conn.once('error', onError);

      conn.write(`${command}\r\n`);
    });
  }

  // ===============================
  // Config
  // ===============================

  /**
   * Authenticate
   *
   * **NOTE:** Authentication is automatically done when the connection is established.
   *
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=AUTHENTICATE#authenticate
   * @param password
   */
  async authenticate(password: string): Promise<Result> {
    const result = await this.sendCommand(`AUTHENTICATE "${password}"`);
    return result[0];
  }

  /**
   * Authenticate using the cookie file
   *
   * This method reads the specified cookie file, converts its contents to a hexadecimal string,
   * and then sends an AUTHENTICATE command to the Tor control port using the cookie.
   *
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=AUTHENTICATE#authenticate
   * @param {string} cookiePath - The path to the cookie file used for authentication.
   */
  async authenticateCookieFile(cookiePath: string): Promise<Result> {
    // Read the cookie file
    const cookieBuffer = await promises.readFile(cookiePath);

    // Convert the buffer to a hexadecimal string
    const cookie = cookieBuffer.toString('hex').trim();

    // Send the AUTHENTICATE command with the cookie
    return this.authenticate(cookie);
  }

  /**
   * Quit
   *
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=QUIT#quit
   */
  async quit(): Promise<Result> {
    const result = await this.sendCommand('QUIT');
    return result[0];
  }

  /**
   * Example:
   *
   * ```typescript
   * const socksPort = await torControl.getConfig('SocksPort');
   * if (socksPort) {
   *  console.log('SocksPort:', socksPort); // SocksPort: 9050
   * }
   * ```
   *
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=GETCONF#getconf
   * @param key
   */
  async getConfig(key: string): Promise<string> {
    const result = await this.sendCommand(['GETCONF', key]);
    return result[0].message.split('=')[1];
  }

  /**
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=SETCONF#setconf
   * @param key
   * @param value
   */
  async setConfig(key: string, value: string): Promise<Result> {
    const result = await this.sendCommand(['SETCONF', `${key}=${value}`]);
    return result[0];
  }

  /**
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=RESETCONF#resetconf
   * @param key
   */
  async resetConfig(key: string): Promise<Result> {
    const result = await this.sendCommand(['RESETCONF', key]);
    return result[0];
  }

  // ===============================
  // Signals
  // ===============================

  async signal(signal: Signal | string): Promise<ResultList> {
    return this.sendCommand(['SIGNAL', signal]);
  }

  async signalReload(): Promise<Result> {
    const result = await this.signal('RELOAD');
    return result[0];
  }

  async signalShutdown(): Promise<Result> {
    const result = await this.signal('SHUTDOWN');
    return result[0];
  }

  async signalDump(): Promise<Result> {
    const result = await this.signal('DUMP');
    return result[0];
  }

  async signalDebug(): Promise<Result> {
    const result = await this.signal('DEBUG');
    return result[0];
  }

  async signalHalt(): Promise<Result> {
    const result = await this.signal('HALT');
    return result[0];
  }

  async signalTerm(): Promise<Result> {
    const result = await this.signal('TERM');
    return result[0];
  }

  async signalNewNym(): Promise<Result> {
    const result = await this.signal('NEWNYM');
    return result[0];
  }

  async signalClearDnsCache(): Promise<Result> {
    const result = await this.signal('CLEARDNSCACHE');
    return result[0];
  }

  async signalUsr1(): Promise<Result> {
    const result = await this.signal('USR1');
    return result[0];
  }

  async signalUsr2(): Promise<Result> {
    const result = await this.signal('USR2');
    return result[0];
  }

  // ===============================
  // Misc
  // ===============================

  /**
   * Example:
   *
   * ```typescript
   * const version = await torControl.getInfo('version');
   * if (version) {
   *  console.log('Version:', version); // Version: Tor
   * }
   * ```
   *
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=GETINFO#getinfo
   * @param key
   */
  async getInfo(key: string): Promise<Result> {
    const result = await this.sendCommand(['GETINFO', key]);
    return result[0];
  }

  /**
   * Example:
   *
   * ```typescript
   * const mar = await torControl.mapAddress('1.2.3.4', 'torproject.org');
   * console.log('MAPADDRESS:', mar); // { code: 250, message: '1.2.3.4=torproject.org' }
   *
   * const gir = await torControl.getInfo('address-mappings/control');
   * console.log('GETINFO:', gir); // { code: 250, message: 'address-mappings/control=1.2.3.4 torproject.org NEVER' }
   * ```
   *
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=MAPADDRESS#mapaddress
   * @param address
   * @param target
   */
  async mapAddress(address: string, target: string): Promise<Result> {
    const result = await this.sendCommand(['MAPADDRESS', `${address}=${target}`]);
    return result[0];
  }

  // ===============================
  // Circuit
  // ===============================

  async extendCircuit(circuitId: string): Promise<Result> {
    const result = await this.sendCommand(['EXTENDCIRCUIT', circuitId]);
    return result[0];
  }

  /**
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=SETCIRCUITPURPOSE#setcircuitpurpose
   * @param circuitId
   * @param purpose
   */
  async setCircuitPurpose(circuitId: string, purpose: string): Promise<Result> {
    const result = await this.sendCommand(['SETCIRCUITPURPOSE', circuitId, purpose]);
    return result[0];
  }

  /**
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=SETROUTERPURPOSE#setrouterpurpose
   * @param nicknameOrKey
   * @param purpose
   */
  async setRouterPurpose(nicknameOrKey: string, purpose: string): Promise<Result> {
    const result = await this.sendCommand(['SETROUTERPURPOSE', nicknameOrKey, purpose]);
    return result[0];
  }

  /**
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=CLOSESTREAM#closestream
   * @param streamId
   * @param reason
   */
  async setStream(streamId: string, reason: string): Promise<Result> {
    const result = await this.sendCommand(['CLOSESTREAM', streamId, reason]);
    return result[0];
  }

  /**
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=CLOSECIRCUIT#closecircuit
   * @param circuitId
   */
  async closeCircuit(circuitId: string): Promise<Result> {
    const result = await this.sendCommand(['CLOSECIRCUIT', circuitId]);
    return result[0];
  }

  /**
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=ATTACHSTREAM#attachstream
   * @param streamId
   * @param circuitId
   * @param hop
   */
  async attachStream(
    streamId: string,
    circuitId: string,
    hop: number | undefined
  ): Promise<Result> {
    const result = await this.sendCommand([
      'ATTACHSTREAM',
      streamId,
      circuitId,
      hop ? String(hop) : '',
    ]);
    return result[0];
  }

  // ===============================
  // Alias
  // ===============================

  /**
   * Alias for `signalNewNym`
   */
  async getNewIdentity(): Promise<Result> {
    return this.signalNewNym();
  }
}

// -------------------------

export { TorControl };
export type { TorControlConfig, Result, ResultList, Signal };

// -------------------------
