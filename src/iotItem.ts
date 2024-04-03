import { MQTT_TOPIC, DBPool, QueryItem } from './config/index';
import mqtt from 'mqtt';
import { logger } from './utils/logger';

export class IOTItem {
  init(client: mqtt.Client, queryItem: QueryItem) {
    const topic: string = `${MQTT_TOPIC}${queryItem.topic}`;
    logger.info(`MQTT push query generated: ${topic}`);

    const func = async () => {
      if (!client.connected) {
        setTimeout(func, queryItem.interval);
        return;
      }

      try {
        logger.info(`RUN SQL : ${queryItem.query}`);
        const conn = await DBPool();
        const result = await conn.query(queryItem.query);
        const data = JSON.stringify({
          rows: result,
        });
        client.publish(topic, Buffer.from(data, 'utf-8'));
        logger.info(`topic: ${topic}, data: ${data}`);
        setTimeout(func, queryItem.interval);
      } catch (error) {
        console.error(error);
      }
    };

    func();
  }
}
