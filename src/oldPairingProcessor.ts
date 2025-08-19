import { MqttClient } from 'mqtt';
import { findDeviceNameByChipId, MqttPayload } from './database';
import { getDeviceNameFromRedis } from './redis';
import { mqttConfig } from '../config/oldMqttConfig';

/**
 * Mem-publish pesan konfirmasi ke device setelah pairing berhasil.
 * @param chipId Chip ID dari device target.
 * @param deviceId device_name (ScDeviceId) yang ditemukan.
 * @param client Instance MQTT client untuk melakukan publish.
 */
function publishConfirmation(chipId: string, deviceId: string, client: MqttClient): void {
    const topic = mqttConfig.publishTopicPattern.replace('{chipId}', chipId);
    const payload = {
        chipid: chipId,
        devicecommand: "NEWDEVICEID",
        deviceidbaruupper: deviceId.toUpperCase(),
        deviceidbarulower: deviceId.toLowerCase(),
    };
    const payloadString = JSON.stringify(payload);

    client.publish(topic, payloadString, { qos: 1 }, (err) => {
        if (err) {
            console.error(`Gagal publish konfirmasi ke ${topic}:`, err);
        } else {
            console.log(`Berhasil publish konfirmasi ke ${topic}`);
            console.log(`Payload: ${payloadString}`);
        }
    });
}

/**
 * Fungsi utama untuk menangani logika pairing.
 * @param topic Topic MQTT tempat pesan diterima.
 * @param payload Isi pesan (Buffer).
 * @param client Instance MQTT client.
 */
export async function handlePairingRequest(topic: string, payload: Buffer, client: MqttClient): Promise<void> {
    if (topic !== mqttConfig.subscribeTopic) return;

    try {
        console.log(`\n--- Pesan diterima ---`);
        console.log(`Topic: ${topic}`);
        const payloadString = payload.toString();
        console.log(`Payload: ${payloadString}`);

        const mqttPayload: MqttPayload = JSON.parse(payloadString);

        if (!mqttPayload.chipid) {
            console.warn("Payload tidak valid (tidak ada chipid), pesan diabaikan.");
            return;
        }

        const chipId = String(mqttPayload.chipid);
        let deviceName: string | null = null;

        // 1. Cek di Redis
        deviceName = await getDeviceNameFromRedis(chipId);

        // 2. Jika tidak ada di Redis, cek di Database
        if (!deviceName) {
            deviceName = await findDeviceNameByChipId(chipId);
        }

        // 3. Proses hasilnya
        if (deviceName) {
            console.log(`Pairing berhasil untuk Chip ID ${chipId} -> Device Name: ${deviceName}`);
            publishConfirmation(chipId, deviceName, client);
        } else {
            console.error(`GAGAL PAIRING: Device untuk Chip ID ${chipId} tidak ditemukan di Redis maupun Database.`);
        }

    } catch (error: any) {
        console.error(`Gagal memproses pesan dari topic ${topic}:`, error.message);
    }
}