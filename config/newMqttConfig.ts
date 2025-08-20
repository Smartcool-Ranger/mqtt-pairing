import dotenv from 'dotenv';

dotenv.config();

export const newMqttConfig = {
    brokerUrl: process.env.NEW_MQTT_BROKER || 'mqtt://localhost:1883',
    username: process.env.NEW_MQTT_USER,
    password: process.env.NEW_MQTT_PASSWORD,
    subscribeTopic: process.env.NEW_MQTT_DATA_SUB_TOPIC!,
    publishTopicPattern: process.env.NEW_MQTT_PUB_TOPIC_PATTERN!,
};