export type MqttConfig = {
  enabled: boolean;
  host: string;
  port: number;
  topicPrefix: string;
  username?: string;
  password?: string;
  useTls: boolean;
};

function envFlag(value: string | undefined): boolean {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

export function getMqttConfig(): MqttConfig {
  const host = process.env.MQTT_HOST?.trim() ?? '';
  const port = Number(process.env.MQTT_PORT ?? 1883);
  const topicPrefix =
    process.env.MQTT_TOPIC_PREFIX?.trim() ||
    process.env.MQTT_TOPIC?.trim() ||
    'coinshire/balance';
  const username = process.env.MQTT_USERNAME?.trim() || undefined;
  const password = process.env.MQTT_PASSWORD?.trim() || undefined;
  const useTls = envFlag(process.env.MQTT_TLS) || port === 8883;

  return {
    enabled: envFlag(process.env.MQTT_ENABLED) && host.length > 0,
    host,
    port: Number.isFinite(port) ? port : 1883,
    topicPrefix,
    username,
    password,
    useTls,
  };
}

export function topicForUser(userId: string): string {
  const { topicPrefix } = getMqttConfig();
  return `${topicPrefix}/${userId}`;
}

export function describeMqttConfig(): Record<string, unknown> {
  const config = getMqttConfig();
  return {
    enabled: config.enabled,
    host: config.host,
    port: config.port,
    protocol: config.useTls ? 'mqtts' : 'mqtt',
    topicPrefix: config.topicPrefix,
    topics: ['u1', 'u2'].map((userId) => topicForUser(userId)),
    username: config.username ?? null,
    passwordConfigured: Boolean(config.password),
  };
}
