import { initializeMqttClient as initializeOldClient } from './oldMqttClient';
import { handlePairingRequest } from './oldPairingProcessor';
import { initializeNewMqttClient } from './newMqttClient';
import { handleRegistrationRequest } from './newRegisterProcessor';

console.log("Memulai Multi-Service MQTT...");

// // Menjalankan Layanan Pairing Lama
initializeOldClient(handlePairingRequest);
console.log("Layanan Pairing Lama sedang berjalan...");

// Menjalankan Layanan Registrasi Baru
initializeNewMqttClient(handleRegistrationRequest);
console.log("Layanan Registrasi Baru sedang berjalan...");