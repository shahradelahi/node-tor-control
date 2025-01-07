import { expect, describe, beforeAll, afterAll, test } from 'vitest';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { TorControl } from '@/index';

describe('Tor Control', () => {
  const PASSWORD = 'password';
  const PORT = 59051;

  const container = new GenericContainer('ghcr.io/shahradelahi/torproxy')
    .withEnvironment({
      TOR_CONTROL_PASSWD: PASSWORD,
      TOR_CONTROL_PORT: `0.0.0.0:${PORT}`
    })
    .withExposedPorts(PORT)
    .withWaitStrategy(Wait.forLogMessage('Bootstrapped 100%', 1));

  let testContainer: StartedTestContainer;

  async function getTestContainer() {
    if (!testContainer) {
      testContainer = await container.start();
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
