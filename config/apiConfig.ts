import dotenv from 'dotenv';

dotenv.config();

export const apiConfig = {
    laravelIpApiUrl: process.env.LARAVEL_IP_API_URL,
};