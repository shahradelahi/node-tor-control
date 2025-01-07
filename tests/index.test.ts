import { expect, describe, beforeAll, afterAll, test } from 'vitest';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { TorControl } from '@/index';
// import { promises } from 'node:fs';

describe('Tor Control', () => {
  const PASSWORD = 'password';
  const PORT = 9051;

  const container = new GenericContainer('ghcr.io/shahradelahi/torproxy')
    .withEnvironment({
      TOR_CONTROL_PASSWD: PASSWORD,
      TOR_CONTROL_PORT: `0.0.0.0:${PORT}`
    })
    .withExposedPorts(PORT)
    .withWaitStrategy(Wait.forLogMessage('Opened Control listener connection (ready)', 1));

  let testContainer: StartedTestContainer;

  async function getTestContainer() {
    if (!testContainer) {
      testContainer = await container.start();
      // const readable = await testContainer.logs();
      // await promises.writeFile('logs.txt', '');
      // readable.on('data', async (chunk) => {
      //   await promises.appendFile('logs.txt', chunk);
      // });
    }
    return testContainer;
  }

  async function getClient(): Promise<TorControl> {
    const testContainer = await getTestContainer();
    const host = testContainer.getHost();
    const port = testContainer.getMappedPort(PORT);
    return new TorControl({
      host,
      port,
      password: PASSWORD
    });
  }

  beforeAll(async () => {
    await getTestContainer();
  });

  afterAll(async () => {
    if (testContainer) {
      await testContainer.stop();
    }
  });

  test('should connect to the Tor Control', async () => {
    const tor = await getClient();

    const connected = await tor.connect();
    expect(connected?.data).to.be.true;

    const { data, error } = await tor.getInfo('version');
    expect(error).to.be.undefined;
    expect(data)
      .to.be.a('object')
      .that.has.property('message')
      .that.matches(/^version=\d+\.\d+\.\d+\.\d+$/);
  });
});
