import Redis from 'ioredis';
import { redisConfig } from '../config/redisConfig';

const redisClient = new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    maxRetriesPerRequest: 3,
});

redisClient.on('connect', () => console.log('Berhasil terhubung ke Redis.'));
redisClient.on('error', (err) => console.error('Koneksi Redis Error:', err));

/**
 * Interface untuk struktur data yang diharapkan dari Redis.
 */
interface RedisDeviceData {
    identity: {
        name: string;
        // properti lain bisa ditambahkan jika perlu
    };
    // properti lain bisa ditambahkan jika perlu
}

/**
 * Mengambil nama device (ScDeviceId) dari Redis berdasarkan ChipId.
 * @param chipId ID unik dari chip/device.
 * @returns Nama device jika ditemukan dan valid, selain itu null.
 */
export async function getDeviceNameFromRedis(chipId: string): Promise<string | null> {
    const key = `ACSM:2.0.0:${chipId}:data`;
    try {
        const data = await redisClient.get(key);
        if (!data) {
            console.log(`[Redis] MISS: Key ${key} tidak ditemukan.`);
            return null;
        }

        console.log(`[Redis] HIT: Key ${key} ditemukan.`);
        const parsedData: RedisDeviceData = JSON.parse(data);

        // Validasi data dan ambil identity.name
        if (parsedData && parsedData.identity && parsedData.identity.name) {
            return parsedData.identity.name;
        } else {
            console.warn(`[Redis] Data untuk key ${key} tidak valid atau tidak memiliki identity.name.`);
            return null;
        }
    } catch (error) {
        console.error(`[Redis] Gagal mengambil atau parse data untuk key ${key}:`, error);
        return null;
    }
}