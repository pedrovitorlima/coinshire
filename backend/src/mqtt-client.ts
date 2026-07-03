import mqtt, { type MqttClient } from 'mqtt';
import { getMqttConfig } from './mqtt-config.js';

let client: MqttClient | null = null;
let connecting: Promise<MqttClient> | null = null;

function brokerUrl(config: ReturnType<typeof getMqttConfig>): string {
  return `mqtt://${config.host}:${config.port}`;
}

async function getClient(): Promise<MqttClient> {
  const config = getMqttConfig();
  if (!config.enabled) {
    throw new Error('MQTT is not enabled');
  }

  if (client?.connected) return client;

  if (connecting) return connecting;

  connecting = new Promise((resolve, reject) => {
    const nextClient = mqtt.connect(brokerUrl(config), {
      username: config.username,
      password: config.password,
      reconnectPeriod: 5000,
      connectTimeout: 10_000,
    });

    const onConnect = () => {
      cleanup();
      client = nextClient;
      connecting = null;
      resolve(nextClient);
    };

    const onError = (err: Error) => {
      cleanup();
      connecting = null;
      nextClient.end(true);
      reject(err);
    };

    const cleanup = () => {
      nextClient.off('connect', onConnect);
      nextClient.off('error', onError);
    };

    nextClient.once('connect', onConnect);
    nextClient.once('error', onError);
  });

  return connecting;
}

export async function publishBalanceMessage(payload: unknown): Promise<void> {
  const config = getMqttConfig();
  if (!config.enabled) return;

  const mqttClient = await getClient();
  const message = JSON.stringify(payload);

  await new Promise<void>((resolve, reject) => {
    mqttClient.publish(config.topic, message, { qos: 1, retain: true }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
