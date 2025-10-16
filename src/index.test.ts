import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { TorControl } from '@/index';

describe('Tor Control', () => {
  const PASSWORD = 'password';
  const PORT = 59051;

  const container = new GenericContainer('ghcr.io/shahradelahi/torproxy')
    .withEnvironment({
      TOR_CONTROL_PASSWD: PASSWORD,
      TOR_CONTROL_PORT: `0.0.0.0:${PORT}`,
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
      password: PASSWORD,
    });
  }

  beforeAll(async () => {
    await getTestContainer();
  }, 120000);

  afterAll(async () => {
    if (testContainer) {
      await testContainer.stop();
    }
  });

  test('should connect to the Tor Control', async () => {
    const tor = await getClient();

    await tor.connect();
    expect(tor.state).to.equal('connected');

    const data = await tor.getInfo('version');
    expect(data)
      .to.be.a('object')
      .that.has.property('message')
      .that.matches(/^version=\d+\.\d+\.\d+\.\d+$/);

    await tor.disconnect();
    expect(tor.state).to.equal('disconnected');
  });
});
