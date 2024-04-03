import { logger } from '@/utils/logger';
import { config } from 'dotenv';
import odbc, { Pool } from 'odbc';

config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });

export const CREDENTIALS = process.env.CREDENTIALS === 'true';
export const {
  NODE_ENV,
  PORT,
  SECRET_KEY,
  JWT_PRIVATE_KEY_PATH,
  JWT_PUBLIC_KEY_PATH,
  LOG_FORMAT,
  LOG_DIR,
  ORIGIN,
  CONNECTION_STRING,
  INTERVAL_MS,
  MQTT_TOPIC,
  MQTT_HOST,
  MQTT_CLIENT_ID,
  MQTT_ID,
  MQTT_PASSWORD,
  SQL_INJECTION,
  MY_BATIS_FILE_FOLDER,
  MAX_POOL_SIZE,
} = process.env;

export interface QueryItem {
  type: string;
  query?: string;
  topic?: string;
  interval?: number;
  endPoint?: string;
  namespace?: string;
  queryId?: string;
  inputParams?: JSON;
}

export const QueryItems: QueryItem[] = [];
export const QueryType: { API: string; MQTT: string; MYBATIS: string } = { API: 'api', MQTT: 'mqtt', MYBATIS: 'mybatis' };
Object.keys(process.env).forEach(function (key) {
  if (!key.startsWith('QUERY_')) {
    return;
  }

  const queryInfo: Array<string> = process.env[key].split(';');
  const queryType: string = queryInfo[0].toLocaleLowerCase();
  let queryItem: QueryItem;
  switch (queryType) {
    case QueryType.MQTT: {
      queryItem = {
        type: queryType,
        query: queryInfo[1],
        topic: queryInfo[2],
        interval: parseInt(queryInfo[3]),
      };
      break;
    }

    case QueryType.API: {
      queryItem = {
        type: queryType,
        query: queryInfo[1],
        endPoint: queryInfo[2],
      };
      break;
    }

    case QueryType.MYBATIS: {
      queryItem = {
        type: queryType,
        namespace: queryInfo[1],
        queryId: queryInfo[2],
        endPoint: queryInfo[3],
      };
      break;
    }
  }

  QueryItems.push(queryItem);
});

// BigInt bug fix to string
BigInt.prototype['toJSON'] = function () {
  if (this > Number.MAX_SAFE_INTEGER) {
    return this.toString();
  }
  return parseInt(this.toString(), 10);
};

const connectionConfig = {
  connectionString: CONNECTION_STRING,
  connectionTimeout: 10,
  loginTimeout: 10,
  maxSize: parseInt(MAX_POOL_SIZE || '10', 10),
};

let pool: Pool;
export async function DBPool(): Promise<Pool> {
  if (!pool) {
    pool = await odbc.pool(connectionConfig);
  }

  return pool;
}
