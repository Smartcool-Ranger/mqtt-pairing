import dotenv from 'dotenv';

dotenv.config();

export const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'test',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};