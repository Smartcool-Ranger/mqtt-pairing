import mqtt, { MqttClient } from 'mqtt';
import { newMqttConfig } from '../config/newMqttConfig';

type MessageHandler = (topic: string, payload: Buffer, client: MqttClient) => void;

export function initializeNewMqttClient(messageHandler: MessageHandler): MqttClient {
    console.log("Menghubungkan ke MQTT Broker (Layanan Registrasi)...");

    const client = mqtt.connect(newMqttConfig.brokerUrl, {
        username: newMqttConfig.username,
        password: newMqttConfig.password,
        clientId: `registration_service_${Math.random().toString(16).substr(2, 8)}`,
        reconnectPeriod: 5000,
    });

    client.on('connect', () => {
        console.log('Berhasil terhubung ke MQTT Broker (Layanan Registrasi).');
        client.subscribe(newMqttConfig.subscribeTopic, (err) => {
            if (!err) {
                console.log(`Berhasil subscribe ke topic: ${newMqttConfig.subscribeTopic}`);
            } else {
                console.error('Gagal subscribe (Layanan Registrasi):', err);
            }
        });
    });

    client.on('error', (error) => console.error('Koneksi MQTT Error (Layanan Registrasi):', error));
    client.on('reconnect', () => console.log('Menyambung ulang ke MQTT Broker (Layanan Registrasi)...'));
    client.on('message', (topic, payload) => messageHandler(topic, payload, client));

    return client;
}