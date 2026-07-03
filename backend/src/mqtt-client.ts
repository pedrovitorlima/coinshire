import mqtt, { type MqttClient } from 'mqtt';
import { describeMqttConfig, getMqttConfig } from './mqtt-config.js';

let client: MqttClient | null = null;
let connecting: Promise<MqttClient> | null = null;

export type MqttRuntimeStatus = {
  connected: boolean;
  lastError: string | null;
  lastPublishedAt: string | null;
  lastTopics: string[];
};

const runtime: MqttRuntimeStatus = {
  connected: false,
  lastError: null,
  lastPublishedAt: null,
  lastTopics: [],
};

export function getMqttRuntimeStatus(): MqttRuntimeStatus {
  return {
    ...runtime,
    connected: Boolean(client?.connected),
  };
}

function brokerUrl(config: ReturnType<typeof getMqttConfig>): string {
  const protocol = config.useTls ? 'mqtts' : 'mqtt';
  return `${protocol}://${config.host}:${config.port}`;
}

function resetClient(nextClient: MqttClient): void {
  if (client && client !== nextClient) {
    client.removeAllListeners();
    client.end(true);
  }
  client = nextClient;
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
      reconnectPeriod: 0,
      connectTimeout: 10_000,
      keepalive: 30,
      clean: true,
    });

    const finish = (err?: Error) => {
      clearTimeout(timeout);
      cleanup();
      connecting = null;
      if (err) {
        runtime.connected = false;
        runtime.lastError = err.message;
        nextClient.end(true);
        reject(err);
        return;
      }
      runtime.connected = true;
      runtime.lastError = null;
      resetClient(nextClient);
      resolve(nextClient);
    };

    const cleanup = () => {
      nextClient.off('connect', onConnect);
      nextClient.off('error', onError);
      nextClient.off('close', onCloseBeforeConnect);
    };

    const onConnect = () => finish();
    const onError = (err: Error) => finish(err);
    const onCloseBeforeConnect = () => {
      if (!nextClient.connected) {
        finish(new Error(`MQTT connection closed before connect (${brokerUrl(config)})`));
      }
    };

    nextClient.once('connect', onConnect);
    nextClient.once('error', onError);
    nextClient.once('close', onCloseBeforeConnect);

    const timeout = setTimeout(() => {
      finish(new Error(`MQTT connection timeout (${brokerUrl(config)})`));
    }, 12_000);
  });

  return connecting;
}

export async function publishMqttMessage(topic: string, payload: unknown): Promise<void> {
  const config = getMqttConfig();
  if (!config.enabled) {
    console.log('[mqtt] Skipping publish because MQTT is disabled');
    return;
  }

  const mqttClient = await getClient();
  const message = JSON.stringify(payload);

  await new Promise<void>((resolve, reject) => {
    mqttClient.publish(topic, message, { qos: 1, retain: true }, (err) => {
      if (err) {
        runtime.lastError = err.message;
        reject(err);
        return;
      }
      runtime.lastPublishedAt = new Date().toISOString();
      runtime.lastTopics = [...new Set([...runtime.lastTopics, topic])].slice(-5);
      runtime.lastError = null;
      console.log(`[mqtt] Published to ${topic}`);
      resolve();
    });
  });
}

export async function probeMqttConnection(): Promise<{ ok: boolean; config: Record<string, unknown>; error?: string }> {
  const config = describeMqttConfig();
  if (!config.enabled) {
    return { ok: false, config, error: 'MQTT is disabled (check MQTT_ENABLED and MQTT_HOST)' };
  }

  try {
    const mqttClient = await getClient();
    mqttClient.end(true);
    client = null;
    connecting = null;
    runtime.connected = false;
    return { ok: true, config };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    runtime.lastError = message;
    client = null;
    connecting = null;
    runtime.connected = false;
    return { ok: false, config, error: message };
  }
}

export function logMqttStartupConfig(): void {
  const config = describeMqttConfig();
  if (!config.enabled) {
    console.log('[mqtt] Disabled — set MQTT_ENABLED=true and MQTT_HOST to publish balance updates');
    return;
  }
  console.log('[mqtt] Enabled', config);
}
