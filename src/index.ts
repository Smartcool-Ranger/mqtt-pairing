import { initializeMqttClient } from './oldMqttClient';
import { handlePairingRequest } from './oldPairingProcessor';

console.log("Memulai MQTT Pairing Service (v2: Redis + DB) - Modular");

// Inisialisasi MQTT client dan berikan fungsi processor sebagai message handler.
// Ini akan menghubungkan logika dari kedua file baru.
initializeMqttClient(handlePairingRequest);

console.log("Layanan pairing sedang berjalan dan mendengarkan pesan MQTT...");
