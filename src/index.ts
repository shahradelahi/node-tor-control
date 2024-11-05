import type { Result, ResultList, SafeReturn, Signal, TorControlConfig } from '@/types';
import { EventEmitter } from 'node:events';
import { connect, Socket } from 'node:net';
import { promises } from 'node:fs';

class TorControl extends EventEmitter {
  private _connection: Socket | null = null;
  private _config: TorControlConfig;
  private _state: 'connected' | 'disconnected' = 'disconnected';
  private _debugger: ((...args: any[]) => void) | null = null;

  /**
   * Get the current connection state of the TorControl
   */
  get state() {
    return this._state;
  }

  constructor(config: Partial<TorControlConfig> = {}) {
    super();

    if (!Object.prototype.hasOwnProperty.call(config, 'host')) {
      config.host = 'localhost';
    }

    if (!Object.prototype.hasOwnProperty.call(config, 'port')) {
      config.port = 9051;
    }

    this._config = config as TorControlConfig;

    // Add debug
    import('debug')
      .then((pkg) => {
        if (pkg) {
          this._debugger = pkg.default('tor-ctrl');
        }
      })
      .catch(() => {});
  }

  private _debug(...args: any[]) {
    if (this._debugger) {
      this._debugger(...args);
    }
  }

  /**
   * Establish a connection to the TorControl
   */
  connect() {
    // Use TOR ControlSocket (Unix socket) setting if it was set or otherwise use TOR TCP ControlPort setting
    const conn = this._config.socketPath
      ? connect(this._config.socketPath)
      : connect({ port: this._config.port, host: this._config.host });
    this._connection = conn;

    return new Promise<SafeReturn<boolean, Error>>((resolve) => {
      // Handle error
      conn.on('error', (err) => {
        const error = err instanceof Error ? err : new Error(`TorControl connection error: ${err}`);
        this.emit('error', error);
        return resolve({ error });
      });

      // Connection established
      conn.once('data', (data) => {
        const str = data.toString();
        this._debug('data:', str);

        if (str.substring(0, 3) === '250') {
          this.emit('connect', conn);
          return resolve({ data: true });
        }

        const error = new Error(`TorControl connection error: ${data}`);
        this.emit('error', error);
        return resolve({ error });
      });

      // Connection closed
      conn.on('close', () => {
        this._state = 'disconnected';
        this.emit('close');
      });

      // Auth
      if (this._config.password) {
        this.authenticate(this._config.password).then(({ error }) => {
          if (error) {
            this.emit('error', error);
            return resolve({ error });
          }
        });
      } else if (this._config.cookiePath) {
        this.authenticateWithCookie(this._config.cookiePath).then(({ error }) => {
          if (error) {
            this.emit('error', error);
            return resolve({ error });
          }
        });
      }
    });
  }

  /**
   * Close the connection to the TorControl
   */
  async disconnect() {
    if (this._connection) {
      // Send QUIT command
      await this.quit();

      // Flush the connection
      this._connection.end();
      this._connection = null;
    }
  }

  get disconnected() {
    return this._connection === null;
  }

  /**
   * Send a command to the TorControl
   *
   * Example:
   * ```typescript
   *  const { data, error } = await torControl.sendCommand(['GETINFO', 'version']);
   *  if (error) {
   *    console.error('Error:', error);
   *    return;
   *  }
   *  console.log('GETINFO:', data); // { code: 250, message: 'version=...' }
   * ```
   *
   * @link https://spec.torproject.org/control-spec/commands.html
   * @param command
   */
  async sendCommand(command: string | string[]): Promise<SafeReturn<ResultList, Error>> {
    if (!this._connection) {
      const error = new Error('TorControl not connected');
      this.emit('error', error);
      return { error };
    }

    const conn = this._connection;

    if (Array.isArray(command)) {
      command = command.join(' ');
    }

    return new Promise((resolve) => {
      // Handle data
      conn.once('data', (data) => {
        const str = data.toString();
        this._debug('sendCommand:data', str, str.split(''));

        const lines = str.split(/\r?\n/);
        this._debug('sendCommand:lines', lines);

        const result: ResultList = [];

        for (const line of lines) {
          if (line !== '') {
            const message = line.substring(4);
            const code = Number(line.substring(0, 3));

            this._debug('sendCommand:message', message);
            this.emit('data', message);

            result.push({ code, message });
          }
        }

        return resolve({ data: result });
      });

      // Write the command
      this._debug('sendCommand:command', command);
      conn.write(`${command}\r\n`);
    });
  }

  private async _solveAndPick(
    promise: Promise<SafeReturn<ResultList, Error>>,
    pick: number = 0
  ): Promise<SafeReturn<Result, Error>> {
    const { data, error } = await promise;
    if (error) return { error };
    return { data: data[pick] };
  }

  // ===============================
  // Config
  // ===============================

  /**
   * Authenticate
   *
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=AUTHENTICATE#authenticate
   * @param password
   */
  async authenticate(password: string): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.sendCommand(`AUTHENTICATE "${password}"`));
  }

  /**
   * Authenticate using the cookie file
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=AUTHENTICATE#authenticate
   * @param cookiePath
   */
  async authenticateWithCookie(cookiePath: string): Promise<SafeReturn<Result, Error>> {
    try {
      // Read the cookie file
      const cookieBuffer = await promises.readFile(cookiePath);

      // Convert the buffer to a hexadecimal string
      const cookie = cookieBuffer.toString('hex').trim();

      // Send the AUTHENTICATE command with the cookie
      return this._solveAndPick(this.sendCommand(`AUTHENTICATE ${cookie}`));
    } catch (error: Error | any) {
      return { error: new Error(`Failed to read cookie file: ${error.message}`) };
    }
  }
  /**
   * Quit
   *
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=QUIT#quit
   */
  async quit(): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.sendCommand('QUIT'));
  }

  /**
   * Example:
   *
   * ```typescript
   * const { data, error } = await torControl.getConfig('SocksPort');
   * if (data) {
   *  console.log('SocksPort:', data); // SocksPort: 9050
   * }
   * ```
   *
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=GETCONF#getconf
   * @param key
   */
  async getConfig(key: string): Promise<SafeReturn<string, Error>> {
    const { data, error } = await this._solveAndPick(this.sendCommand(['GETCONF', key]));
    if (error) return { error };
    return { data: data.message.split('=')[1] };
  }

  /**
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=SETCONF#setconf
   * @param key
   * @param value
   */
  async setConfig(key: string, value: string): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.sendCommand(['SETCONF', `${key}=${value}`]));
  }

  /**
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=RESETCONF#resetconf
   * @param key
   */
  async resetConfig(key: string): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.sendCommand(['RESETCONF', key]));
  }

  // ===============================
  // Signals
  // ===============================

  async signal(signal: Signal | string): Promise<SafeReturn<ResultList, Error>> {
    return this.sendCommand(['SIGNAL', signal]);
  }

  async signalReload(): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.signal('RELOAD'));
  }

  async signalShutdown(): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.signal('SHUTDOWN'));
  }

  async signalDump(): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.signal('DUMP'));
  }

  async signalDebug(): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.signal('DEBUG'));
  }

  async signalHalt(): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.signal('HALT'));
  }

  async signalTerm(): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.signal('TERM'));
  }

  async signalNewNym(): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.signal('NEWNYM'));
  }

  async signalClearDnsCache(): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.signal('CLEARDNSCACHE'));
  }

  async signalUsr1(): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.signal('USR1'));
  }

  async signalUsr2(): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.signal('USR2'));
  }

  // ===============================
  // Misc
  // ===============================

  /**
   * Example:
   *
   * ```typescript
   * const { data, error } = await torControl.getInfo('version');
   * if (data) {
   *  console.log('Version:', data); // Version: Tor
   * }
   * ```
   *
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=GETINFO#getinfo
   * @param key
   */
  async getInfo(key: string): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.sendCommand(['GETINFO', key]));
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
  async mapAddress(address: string, target: string): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.sendCommand(['MAPADDRESS', `${address}=${target}`]));
  }

  // ===============================
  // Circuit
  // ===============================

  async extendCircuit(circuitId: string): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.sendCommand(['EXTENDCIRCUIT', circuitId]));
  }

  /**
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=SETCIRCUITPURPOSE#setcircuitpurpose
   * @param circuitId
   * @param purpose
   */
  async setCircuitPurpose(circuitId: string, purpose: string): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.sendCommand(['SETCIRCUITPURPOSE', circuitId, purpose]));
  }

  /**
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=SETROUTERPURPOSE#setrouterpurpose
   * @param nicknameOrKey
   * @param purpose
   */
  async setRouterPurpose(
    nicknameOrKey: string,
    purpose: string
  ): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.sendCommand(['SETROUTERPURPOSE', nicknameOrKey, purpose]));
  }

  /**
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=CLOSESTREAM#closestream
   * @param streamId
   * @param reason
   */
  async setStream(streamId: string, reason: string): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.sendCommand(['CLOSESTREAM', streamId, reason]));
  }

  /**
   * @link https://spec.torproject.org/control-spec/commands.html?highlight=CLOSECIRCUIT#closecircuit
   * @param circuitId
   */
  async closeCircuit(circuitId: string): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(this.sendCommand(['CLOSECIRCUIT', circuitId]));
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
  ): Promise<SafeReturn<Result, Error>> {
    return this._solveAndPick(
      this.sendCommand(['ATTACHSTREAM', streamId, circuitId, hop ? String(hop) : ''])
    );
  }

  // ===============================
  // Alias
  // ===============================

  /**
   * Alias for `signalNewNym`
   */
  async getNewIdentity(): Promise<SafeReturn<Result, Error>> {
    return this.signalNewNym();
  }
}

// -------------------------

export { TorControl };
export type { TorControlConfig, Result, ResultList, Signal };

// -------------------------
