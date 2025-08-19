import mysql from 'mysql2/promise';
import { dbConfig } from '../config/databaseConfig';

// Interface dari payload MQTT tetap dibutuhkan di level aplikasi
export interface MqttPayload {
    chipid: string;
    // properti lain dari payload asli bisa ditambahkan di sini
}

const pool = mysql.createPool(dbConfig);

/**
 * Mencari device_name dari database berdasarkan chip_id.
 * Ini hanya akan dipanggil jika data tidak ditemukan di Redis.
 * @param chipId ID unik dari chip/device.
 * @returns device_name jika ditemukan, selain itu null.
 */
export async function findDeviceNameByChipId(chipId: string): Promise<string | null> {
    const connection = await pool.getConnection();
    console.log(`[DB] Mencari device untuk chip_id: ${chipId}`);
    try {
        // Ganti `devices` dengan nama tabel Anda yang sebenarnya
        const [rows] = await connection.execute<mysql.RowDataPacket[]>(
            "SELECT device_name FROM dt_master_devices WHERE chip_id = ?",
            [chipId.trim()]
        );
        if (rows.length > 0) {
            console.log(`[DB] Ditemukan: ${rows[0].device_name}`);
            return rows[0].device_name;
        } else {
            console.log(`[DB] Tidak ditemukan device untuk chip_id: ${chipId}`);
            return null;
        }
    } catch (error) {
        console.error(`[DB] Error saat query untuk chip_id ${chipId}:`, error);
        return null; // Kembalikan null jika terjadi error
    } finally {
        connection.release();
    }
}