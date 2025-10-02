import { MqttClient } from 'mqtt';
import { newMqttConfig } from '../config/newMqttConfig';
import { apiConfig } from '../config/apiConfig';
import {
    findDeviceByChipId_new,
    getLatestActivePlacement,
    createDeviceWithMqttUser,
    RegistrationPayload
} from './database';

let idCounter = 1;

function generate32BitId(): number {
  // Gunakan 23 bit dari timestamp
  const timeBits = (Date.now() & 0x7FFFFF);
  
  // Gunakan 8 bit untuk counter
  const counterBits = (idCounter++ & 0xFF);
  
  // Kombinasikan untuk hasil 31-bit yang unik dan aman
  const id = (timeBits << 8) | counterBits;
  
  // Reset counter jika melebihi batas
  if (idCounter > 255) {
    idCounter = 1;
  }
  
  return id;
}

async function getIpFromLaravelApi(chipId: string, hardware: string): Promise<string | null> {
    if (!apiConfig.laravelIpApiUrl) {
        // console.warn("URL API Laravel tidak di-set di .env. IP tidak akan diambil.");
        return null;
    }
    
    const url = apiConfig.laravelIpApiUrl;
    // console.log(`[API] Mengambil IP dari: ${url}`);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                chip_id: chipId,
                hardware: hardware,
            }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(`API returned error: ${data.message || response.status}`);
        }
        
        // [DIPERBARUI] Mengakses IP dari dalam properti 'data'
        return data.data?.ip || null;

    } catch (error) {
        // console.error(`[API] Gagal mengambil IP untuk chip ID ${chipId}:`, error);
        return null;
    }
}

function formatSuccessResponse(command: string, data: any) {
    return {
        id: generate32BitId(),
        type: 'set',
        command: command,
        key: 0,
        data: data,
    };
}

function formatDeviceResponse(device: any, acId: number | null = null, ip: string | null) {
    return {
        name: device.device_name,
        license: device.license || 0,
        ac_id: acId || device.ac_id || 0,
        ip: ip || "0.0.0.0",
    };
}

export async function handleRegistrationRequest(topic: string, payload: Buffer, client: MqttClient): Promise<void> {
    try {
        // console.log(`\n--- Pesan Registrasi Diterima ---`);
        // console.log(`Topic: ${topic}`);
        const payloadString = payload.toString();
        // console.log(`Payload: ${payloadString}`);

        const data: RegistrationPayload = JSON.parse(payloadString);

        if (!data.chip_id || !data.firmware || !data.hardware) {
            // console.warn("Payload registrasi tidak lengkap, diabaikan.");
            return;
        }

        const deviceIp = await getIpFromLaravelApi(data.chip_id, data.hardware);

        let responsePayload;
        const existingDevice = await findDeviceByChipId_new(data.chip_id);

        if (existingDevice) {
            // console.log(`Device lama terdeteksi dengan Chip ID: ${data.chip_id}.`);
            const placement = await getLatestActivePlacement(existingDevice.id);
            const formattedResponse = formatDeviceResponse(existingDevice, placement ? placement.ac_id : null, deviceIp);
            responsePayload = formatSuccessResponse('register_acsm', formattedResponse);
        } else {
            // console.log(`Device baru dengan Chip ID: ${data.chip_id}. Membuat record baru...`);
            const newDevice = await createDeviceWithMqttUser(data);
            const formattedResponse = formatDeviceResponse(newDevice, null, deviceIp);
            responsePayload = formatSuccessResponse('register_acsm', formattedResponse);
        }

        const publishTopic = newMqttConfig.publishTopicPattern
            .replace('{hardware}', data.hardware)
            .replace('{chipId}', data.chip_id);

        client.publish(publishTopic, JSON.stringify(responsePayload), { qos: 1 }, (err) => {
            if (err) {
                // console.error(`Gagal publish balasan registrasi ke ${publishTopic}:`, err);
            } else {
                // console.log(`Berhasil publish balasan registrasi ke ${publishTopic}`);
            }
        });

    } catch (error) {
        // console.error("Gagal memproses permintaan registrasi:", error);
    }
}