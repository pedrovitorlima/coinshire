export type MqttConfig = {
  enabled: boolean;
  host: string;
  port: number;
  topic: string;
  username?: string;
  password?: string;
};

export function getMqttConfig(): MqttConfig {
  const enabled = process.env.MQTT_ENABLED === 'true';
  const host = process.env.MQTT_HOST?.trim() ?? '';
  const port = Number(process.env.MQTT_PORT ?? 1883);
  const topic = process.env.MQTT_TOPIC?.trim() || 'coinshire/balance';
  const username = process.env.MQTT_USERNAME?.trim() || undefined;
  const password = process.env.MQTT_PASSWORD?.trim() || undefined;

  return {
    enabled: enabled && host.length > 0,
    host,
    port: Number.isFinite(port) ? port : 1883,
    topic,
    username,
    password,
  };
}
