import mqtt, { MqttClient } from 'mqtt';
import { oldMqttConfig } from '../config/oldMqttConfig';

type MessageHandler = (topic: string, payload: Buffer, client: MqttClient) => void;

export function initializeMqttClient(messageHandler: MessageHandler): MqttClient {
    console.log("Menghubungkan ke MQTT Broker...");

    const client = mqtt.connect(oldMqttConfig.brokerUrl, {
        username: oldMqttConfig.username,
        password: oldMqttConfig.password,
        clientId: `pairing_service_${Math.random().toString(16).substr(2, 8)}`,
        reconnectPeriod: 5000,
    });

    client.on('connect', () => {
        console.log('Berhasil terhubung ke MQTT Broker.');
        client.subscribe(oldMqttConfig.subscribeTopic, (err) => {
            if (!err) {
                console.log(`Berhasil subscribe ke topic: ${oldMqttConfig.subscribeTopic}`);
            } else {
                console.error('Gagal subscribe:', err);
            }
        });
    });

    client.on('error', (error) => console.error('Koneksi MQTT Error:', error));
    client.on('reconnect', () => console.log('Mencoba menyambung ulang ke MQTT Broker...'));

    client.on('message', (topic, payload) => {
        messageHandler(topic, payload, client);
    });

    return client;
}