export type Result = {
  code: number;
  message: string;
};

export type ResultList = Result[];

export interface TorControlConfig {
  host: string;
  port: number;
  password: string | undefined;
  socketPath: string | undefined;
  cookiePath: string | undefined;
}

/**
 * @link https://spec.torproject.org/control-spec/commands.html?highlight=SIGNAL#signal
 */
export type Signal =
  | 'RELOAD'
  | 'SHUTDOWN'
  | 'DUMP'
  | 'DEBUG'
  | 'HALT'
  | 'HUP'
  | 'INT'
  | 'USR1'
  | 'USR2'
  | 'TERM'
  | 'NEWNYM'
  | 'CLEARDNSCACHE'
  | 'HEARTBEAT'
  | 'ACTIVE'
  | 'DORMANT';
