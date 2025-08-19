import mqtt, { MqttClient } from 'mqtt';
import { mqttConfig } from '../config/oldMqttConfig';

// Mendefinisikan tipe untuk fungsi message handler agar lebih aman
type MessageHandler = (topic: string, payload: Buffer, client: MqttClient) => void;

/**
 * Menginisialisasi dan mengkonfigurasi MQTT client.
 * @param messageHandler Fungsi callback yang akan dieksekusi setiap kali ada pesan masuk.
 * @returns Instance dari MqttClient yang sudah terkonfigurasi.
 */
export function initializeMqttClient(messageHandler: MessageHandler): MqttClient {
    console.log("Menghubungkan ke MQTT Broker...");

    const client = mqtt.connect(mqttConfig.brokerUrl, {
        username: mqttConfig.username,
        password: mqttConfig.password,
        clientId: `pairing_service_${Math.random().toString(16).substr(2, 8)}`,
        reconnectPeriod: 5000,
    });

    client.on('connect', () => {
        console.log('Berhasil terhubung ke MQTT Broker.');
        client.subscribe(mqttConfig.subscribeTopic, (err) => {
            if (!err) {
                console.log(`Berhasil subscribe ke topic: ${mqttConfig.subscribeTopic}`);
            } else {
                console.error('Gagal subscribe:', err);
            }
        });
    });

    client.on('error', (error) => console.error('Koneksi MQTT Error:', error));
    client.on('reconnect', () => console.log('Mencoba menyambung ulang ke MQTT Broker...'));

    // Ketika pesan diterima, panggil messageHandler yang diberikan dari luar
    client.on('message', (topic, payload) => {
        messageHandler(topic, payload, client);
    });

    return client;
}