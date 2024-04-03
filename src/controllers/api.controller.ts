import { NextFunction, Request, Response } from 'express';
import { QueryItem, DBPool, SQL_INJECTION } from '../config/index';
import { logger } from '@/utils/logger';
import { getPlaceHolders, hasSql, replaceString } from '@/utils/util';

class APIController {
  mappingRequestData(query: string, queryData: any, isCheckInjection: boolean = false): string {
    // data mapping
    const paramKeys = getPlaceHolders(query);

    if (paramKeys.length > 0) {
      const valueObj = {};

      let paramKey: string, reqData: any;
      for (let i = 0; i < paramKeys.length; i++) {
        paramKey = paramKeys[i];
        reqData = queryData[paramKey];
        if (reqData !== undefined && reqData !== null) {
          // check sql injection
          if (isCheckInjection) {
            if (hasSql(reqData)) {
              throw new Error(`SQL inject detect with final query data, ${paramKey}, ${reqData}, ${this.queryItem.endPoint}`);
            }
          }
          valueObj[paramKey] = reqData;
        }
      }

      logger.info(JSON.stringify({ queryData, valueObj, paramKeys }));

      // make final query
      return replaceString(query, valueObj);
    } else {
      return query;
    }
  }

  public queryItem?: QueryItem;
  public index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let rows = [];
    if (!this.queryItem || !this.queryItem.query) {
      res.writeHead(500, {
        'Content-Type': 'application/json',
      });
      res.end(
        JSON.stringify({
          message: 'Query item empty',
        }),
      );
      return;
    }

    let sql = this.queryItem.query;

    try {
      sql = this.mappingRequestData(sql, req.query, !!SQL_INJECTION);
    } catch (e) {
      console.error(e);
      res.writeHead(400, {
        'Content-Type': 'application/json',
      });
      res.end(
        JSON.stringify({
          message: 'SQL inject data detected.',
        }),
      );
    }

    try {
      logger.info(`RUN SQL : ${sql}`);
      const conn = await DBPool();
      const result = await conn.query(sql);
      res.writeHead(200, {
        'Content-Type': 'application/json',
      });
      res.end(
        JSON.stringify({
          rows: result,
        }),
      );
    } catch (error) {
      console.error(error);
      next(error);
    }
  };
}

export default APIController;
