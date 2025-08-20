import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import { dbConfig } from '../config/databaseConfig';

// --- Interfaces ---
export interface MqttPayload { // Untuk pairing lama
    chipid: string;
}

export interface RegistrationPayload { // Untuk registrasi baru
    chip_id: string;
    firmware: string;
    hardware: string;
    mac_wifi: string;
    mac_bluetooth: string;
}

// --- Koneksi Database ---
const pool = mysql.createPool(dbConfig);

// --- Fungsi untuk Layanan Pairing Lama ---
export async function findDeviceNameByChipId(chipId: string): Promise<string | null> {
    const connection = await pool.getConnection();
    console.log(`[DB-OLD] Mencari device untuk chip_id: ${chipId}`);
    try {
        // Menggunakan nama tabel yang benar dari model MasterDevice
        const [rows] = await connection.execute<mysql.RowDataPacket[]>(
            "SELECT device_name FROM dt_master_devices WHERE chip_id = ?",
            [chipId.trim()]
        );
        return rows.length > 0 ? rows[0].device_name : null;
    } finally {
        connection.release();
    }
}

// --- Fungsi untuk Layanan Registrasi Baru ---

/**
 * Mencari device di tabel master berdasarkan chip_id.
 */
export async function findDeviceByChipId_new(chipId: string): Promise<mysql.RowDataPacket | null> {
    const connection = await pool.getConnection();
    try {
        // Menggunakan nama tabel yang benar dari model MasterDevice
        const [rows] = await connection.execute<mysql.RowDataPacket[]>(
            "SELECT * FROM dt_master_devices WHERE chip_id = ?",
            [chipId]
        );
        return rows.length > 0 ? rows[0] : null;
    } finally {
        connection.release();
    }
}

/**
 * Mengambil data placement aktif terakhir untuk sebuah device.
 */
export async function getLatestActivePlacement(deviceId: number): Promise<mysql.RowDataPacket | null> {
    const connection = await pool.getConnection();
    try {
        // Menggunakan nama tabel yang benar dari model PlacementAcsm
        const [rows] = await connection.execute<mysql.RowDataPacket[]>(
            `SELECT * FROM ht_placement_acsms 
             WHERE device_id = ? AND placement_status = 1 
             ORDER BY updated_at DESC LIMIT 1`,
            [deviceId]
        );
        return rows.length > 0 ? rows[0] : null;
    } finally {
        connection.release();
    }
}

/**
 * Membuat device_name unik yang baru (misal: DS0001, DS0002, dst).
 */
async function generateUniqueDeviceName(connection: mysql.PoolConnection): Promise<string> {
    const DEVICE_PREFIX = 'DS';
    // Menggunakan nama tabel yang benar dari model MasterDevice
    const [rows] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT device_name FROM dt_master_devices 
         WHERE device_name LIKE '${DEVICE_PREFIX}%' 
         ORDER BY device_name DESC LIMIT 1`
    );

    const lastDeviceName = rows.length > 0 ? rows[0].device_name : null;
    const nextNumber = lastDeviceName ? parseInt(lastDeviceName.substring(2)) + 1 : 1;
    return DEVICE_PREFIX + String(nextNumber).padStart(4, '0');
}

/**
 * Replikasi formula password dari PHP ke TypeScript.
 */
function passwordFormula(chipId: number, deviceName: string): number {
    const deviceNumberMatch = deviceName.match(/DS(\d+)/);
    const deviceNumber = deviceNumberMatch ? Math.max(1, parseInt(deviceNumberMatch[1], 10)) : 1;

    const computedValue = Math.sqrt((chipId * 1.257) * (chipId >> 3) + (deviceNumber * 13))
        + Math.log10(chipId + deviceNumber + 1);

    const angle = ((chipId % 360) + (deviceNumber % 180)) % 360;
    const denominator = Math.max(0.01, Math.tan(angle * (Math.PI / 180)));

    const result = computedValue / denominator;
    return Math.round(result % Number.MAX_SAFE_INTEGER);
}

/**
 * Fungsi utama untuk membuat device baru beserta user dan command MQTT dalam satu transaksi.
 */
export async function createDeviceWithMqttUser(data: RegistrationPayload): Promise<mysql.RowDataPacket> {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // 1. Buat Master Device
        const deviceName = await generateUniqueDeviceName(connection);
        // Menggunakan nama tabel yang benar dari model MasterDevice
        const [deviceResult] = await connection.execute<mysql.ResultSetHeader>(
            `INSERT INTO dt_master_devices (type_id, device_name, firmware, hardware, condition_id, chip_id, mac_wifi, mac_bluetooth, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [1, deviceName, data.firmware, data.hardware, 6, data.chip_id, data.mac_wifi, data.mac_bluetooth]
        );
        const deviceId = deviceResult.insertId;

        // 2. Buat MQTT User
        const password = passwordFormula(Number(data.chip_id), deviceName);
        const hashedPassword = await bcrypt.hash(String(password), 10);
        // Menggunakan nama tabel yang benar dari model MqttUser
        const [userResult] = await connection.execute<mysql.ResultSetHeader>(
            `INSERT INTO mqtt_users (username, password, created_at, updated_at) VALUES (?, ?, NOW(), NOW())`,
            [data.chip_id, hashedPassword]
        );
        const mqttUserId = userResult.insertId;

        // 3. Buat MQTT Commands (ACL)
        const topics = [
            { topic: `ACSM/${data.hardware}/${data.chip_id}/data`, access_level: 3 },
            { topic: `ACSM/${data.hardware}/${data.chip_id}/cmd`, access_level: 1 },
            { topic: `ACSM/${data.hardware}/${data.chip_id}/recmd`, access_level: 3 },
            { topic: `ACSM/${data.hardware}/${data.chip_id}/notif`, access_level: 3 },
        ];
        for (const acl of topics) {
            // Menggunakan nama tabel yang benar dari model MqttCommand
            await connection.execute(
                `INSERT INTO mqtt_commands (mqtt_id, topic, access_level) VALUES (?, ?, ?)`,
                [mqttUserId, acl.topic, acl.access_level]
            );
        }

        await connection.commit();

        // Ambil data device yang baru dibuat untuk dikembalikan
        const [newDevice] = await connection.execute<mysql.RowDataPacket[]>("SELECT * FROM dt_master_devices WHERE id = ?", [deviceId]);
        return newDevice[0];

    } catch (error) {
        await connection.rollback();
        console.error("Gagal membuat device (transaksi di-rollback):", error);
        throw error;
    } finally {
        connection.release();
    }
}