import dotenv from 'dotenv';

dotenv.config();

export const oldMqttConfig = {
    brokerUrl: process.env.OLD_MQTT_BROKER || 'mqtt://localhost:1883',
    username: process.env.OLD_MQTT_USER,
    password: process.env.OLD_MQTT_PASSWORD,
    subscribeTopic: process.env.OLD_MQTT_DATA_SUB_TOPIC!,
    publishTopicPattern: process.env.OLD_MQTT_PUB_TOPIC_PATTERN!,
};