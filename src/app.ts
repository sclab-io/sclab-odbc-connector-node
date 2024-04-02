import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { logger, stream } from '@utils/logger';
import {
  NODE_ENV,
  PORT,
  LOG_FORMAT,
  ORIGIN,
  CREDENTIALS,
  MQTT_TOPIC,
  MQTT_HOST,
  MQTT_CLIENT_ID,
  MQTT_ID,
  MQTT_PASSWORD,
  QueryItems,
  SECRET_KEY,
  JWT_PRIVATE_KEY_PATH,
  LOG_DIR,
  DBPool,
  SQL_INJECTION,
  MY_BATIS_FILE_FOLDER,
  CONNECTION_STRING,
} from '@config';
import { Routes } from '@interfaces/routes.interface';
import errorMiddleware from '@middlewares/error.middleware';
import { QueryItem, QueryType } from './config/index';
import APIRoute from './routes/api_route';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { jwtMiddleware } from './middlewares/jwt.middleware';
import { IOT } from './iot';
import path from 'path';
import MybatisMapper from 'mybatis-mapper';
import MybatisRoute from './routes/mybatis_route';

class App {
  public app: express.Application;
  public env: string;
  public port: string | number;
  public iot: IOT;

  constructor(routes: Routes[]) {
    this.app = express();
    this.env = NODE_ENV || 'development';
    this.port = PORT || 3000;

    logger.info(`=================================`);
    this.checkConnectionInformation();
    this.initializeMiddlewares();
    this.generateJWTKey();
    this.loadMybatisFiles();
    this.createAPIRoutes(routes);
    this.initializeRoutes(routes);
    //this.initializeSwagger();
    this.initializeErrorHandling();
    this.initializeIoT();
  }

  public async loadMybatisFiles() {
    if (!MY_BATIS_FILE_FOLDER) {
      logger.info('Skip mybatis loading');
      return;
    }
    logger.info(`Load mybatis mappers from folder path ${MY_BATIS_FILE_FOLDER}.`);
    if (!fs.existsSync(MY_BATIS_FILE_FOLDER)) {
      logger.info('Folder is not exists.');
      return;
    }
    const files: string[] = [];
    const folderFiles = fs.readdirSync(MY_BATIS_FILE_FOLDER);
    folderFiles.forEach(file => {
      if (!file.endsWith('.xml')) {
        return;
      }
      const filePath = path.join(MY_BATIS_FILE_FOLDER, file);
      files.push(filePath);
      logger.info(`mybatis file : ${file}`);
    });

    MybatisMapper.createMapper(files);
  }

  public async checkConnectionInformation() {
    // check connection
    try {
      const conn = await DBPool();
      logger.info('DB Connection success');
    } catch (e) {
      console.error(e);
    }
  }

  public initializeIoT() {
    this.iot = new IOT();
    this.iot.init();
  }

  public generateJWTKey() {
    try {
      const token = jwt.sign({ id: SECRET_KEY }, fs.readFileSync(JWT_PRIVATE_KEY_PATH), {
        algorithm: 'RS256',
      });
      logger.info('Add authorization to Headers');
      logger.info(`authorization: ${token}`);
      this.app.use(jwtMiddleware);
    } catch (e) {
      console.error(e);
    }
  }

  public createAPIRoutes(routes: Routes[]) {
    logger.info('Create API Routes');

    for (let i: number = 0; i < QueryItems.length; i++) {
      const queryItem: QueryItem = QueryItems[i];
      if (queryItem.type === QueryType.API) {
        const route: Routes = new APIRoute(queryItem);
        routes.push(route);
        logger.info(`API query end point generated: ${queryItem.endPoint}\nSQL: ${queryItem.query}`);
      } else if (queryItem.type === QueryType.MYBATIS) {
        const route: Routes = new MybatisRoute(queryItem);
        routes.push(route);
        logger.info(`MYBATIS query end point generated: ${queryItem.endPoint}\nNamespace: ${queryItem.namespace}\nQuery ID: ${queryItem.queryId}`);
      }
    }
  }

  public listen() {
    this.app.listen(this.port, () => {
      logger.info(`NODE ENV: ${this.env}`);
      logger.info(`LOG_DIR: ${LOG_DIR}`);
      logger.info(`CONNECTION_STRING: ${CONNECTION_STRING}`);
      logger.info(`MQTT_TOPIC: ${MQTT_TOPIC}`);
      logger.info(`MQTT_HOST: ${MQTT_HOST}`);
      logger.info(`MQTT_CLIENT_ID: ${MQTT_CLIENT_ID}`);
      logger.info(`MQTT_ID: ${MQTT_ID}`);
      logger.info(`MQTT_PASSWORD: ${MQTT_PASSWORD}`);
      logger.info(`SQL_INJECTION: ${SQL_INJECTION}`);
      logger.info(`🚀 App listening on the port ${this.port}`);
      logger.info(`=================================`);
    });
  }

  public getServer() {
    return this.app;
  }

  private initializeMiddlewares() {
    this.app.use(morgan(LOG_FORMAT, { stream }));
    this.app.use(cors({ origin: ORIGIN, credentials: CREDENTIALS }));
    this.app.use(hpp());
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach(route => {
      this.app.use(route.path, route.router);
    });
  }

  private initializeSwagger() {
    const options = {
      swaggerDefinition: {
        info: {
          title: 'REST API',
          version: '1.0.0',
          description: 'Example docs',
        },
      },
      apis: ['swagger.yaml'],
    };

    const specs = swaggerJSDoc(options);
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }
}

export default App;
