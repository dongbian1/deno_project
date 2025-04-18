/**
 * MySQL 数据库工具类
 */
import * as mysqlClient from "npm:mysql2@^2.3.3/promise";
import { env } from "../config/env.ts";
import { logger } from "./logger.ts";

/**
 * 查询参数类型
 */
export interface QueryParams {
  [key: string]: any;
}

/**
 * MySQL 工具类
 */
export class MySQLUtil {
  private static instance: MySQLUtil;
  private pool: any;
  private connectionStatus = false;

  private constructor() {
    this.pool = null;
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): MySQLUtil {
    if (!MySQLUtil.instance) {
      MySQLUtil.instance = new MySQLUtil();
    }
    return MySQLUtil.instance;
  }

  /**
   * 连接数据库
   */
  public async connect(): Promise<void> {
    if (this.connectionStatus) {
      return;
    }

    try {
      logger.info("正在连接数据库...", {
        host: env.DB_URL,
        user: env.DB_USER,
        database: env.DB_DATABASE
      });
      
      // 尝试使用明确的配置
      this.pool = mysqlClient.createPool({
        host: env.DB_URL, // 如果失败，尝试使用 'localhost' 而非 IP 地址，或相反
        port: env.DB_PORT, // 明确指定端口
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      
      // 测试连接
      const [result] = await this.pool.query("SELECT 1 AS connection_test");
      
      this.connectionStatus = true;
      logger.info("数据库连接成功", { result });
    } catch (error) {
      // 提供更详细的错误信息
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`数据库连接失败: ${errorMessage}`, {
        host: env.DB_URL,
        user: env.DB_USER,
        database: env.DB_DATABASE,
        error: error
      });
      
      throw new Error(`数据库连接失败: ${errorMessage}，请检查数据库配置和服务状态`);
    }
  }

  /**
   * 关闭数据库连接
   */
  public async close(): Promise<void> {
    if (!this.connectionStatus || !this.pool) {
      return;
    }

    try {
      await this.pool.end();
      this.connectionStatus = false;
      logger.info("数据库连接已关闭");
    } catch (error) {
      logger.error("关闭数据库连接失败", error);
      throw error;
    }
  }

  /**
   * 执行SQL查询
   */
  public async query<T>(sql: string, params?: any[]): Promise<T> {
    await this.connect();
    
    try {
      const startTime = Date.now();
      logger.debug(`执行SQL查询: ${sql}`, params);
      
      const [rows] = await this.pool.query(sql, params);
      
      const endTime = Date.now();
      logger.info(`SQL查询成功 (${endTime - startTime}ms): ${sql}`, {
        params,
        rowCount: Array.isArray(rows) ? rows.length : 0,
        duration: endTime - startTime
      });
      
      return rows as T;
    } catch (error) {
      logger.error(`SQL查询失败: ${sql}`, {
        params,
        error
      });
      throw error;
    }
  }

  /**
   * 执行SQL语句（插入、更新、删除）
   */
  public async execute(sql: string, params?: any[]): Promise<{ affectedRows: number; insertId?: number }> {
    await this.connect();
    
    try {
      const startTime = Date.now();
      logger.debug(`执行SQL语句: ${sql}`, params);
      
      const [result] = await this.pool.execute(sql, params);
      
      const endTime = Date.now();
      logger.info(`SQL执行成功 (${endTime - startTime}ms): ${sql}`, {
        params,
        affectedRows: result.affectedRows,
        insertId: result.insertId,
        duration: endTime - startTime
      });
      
      return {
        affectedRows: result.affectedRows,
        insertId: result.insertId
      };
    } catch (error) {
      logger.error(`SQL执行失败: ${sql}`, {
        params,
        error
      });
      throw error;
    }
  }

  /**
   * 查询多条记录
   */
  public async findAll<T>(
    table: string,
    conditions?: QueryParams,
    fields: string[] = ["*"],
    orderBy?: string,
    limit?: number,
    offset?: number
  ): Promise<T[]> {
    let sql = `SELECT ${fields.join(", ")} FROM ${table}`;
    const params: any[] = [];

    // 添加条件
    if (conditions && Object.keys(conditions).length > 0) {
      const conditionClauses: string[] = [];
      for (const [key, value] of Object.entries(conditions)) {
        conditionClauses.push(`${key} = ?`);
        params.push(value);
      }
      sql += ` WHERE ${conditionClauses.join(" AND ")}`;
    }

    // 添加排序
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }

    // 添加分页
    if (limit !== undefined) {
      sql += ` LIMIT ?`;
      params.push(limit);
      
      if (offset !== undefined) {
        sql += ` OFFSET ?`;
        params.push(offset);
      }
    }
    logger.debug(`执行SQL查询: ${sql}`, params);
    return await this.query<T[]>(sql, params);
  }

  /**
   * 查询单条记录
   */
  public async findOne<T>(
    table: string,
    conditions: QueryParams,
    fields: string[] = ["*"]
  ): Promise<T | null> {
    const results = await this.findAll<T>(table, conditions, fields, undefined, 1);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 插入记录
   */
  public async insert<T>(
    table: string,
    data: QueryParams
  ): Promise<{ id: number; affectedRows: number }> {
    if (!data || Object.keys(data).length === 0) {
      throw new Error("插入数据不能为空");
    }

    const columns = Object.keys(data);
    const placeholders = columns.map(() => "?");
    const values = Object.values(data);

    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`;
    
    const result = await this.execute(sql, values);
    
    return {
      id: result.insertId || 0,
      affectedRows: result.affectedRows
    };
  }

  /**
   * 更新记录
   */
  public async update(
    table: string,
    data: QueryParams,
    conditions: QueryParams
  ): Promise<{ affectedRows: number }> {
    if (!data || Object.keys(data).length === 0) {
      throw new Error("更新数据不能为空");
    }

    if (!conditions || Object.keys(conditions).length === 0) {
      throw new Error("更新条件不能为空");
    }

    const updateClauses: string[] = [];
    const params: any[] = [];

    // 构建更新子句
    for (const [key, value] of Object.entries(data)) {
      updateClauses.push(`${key} = ?`);
      params.push(value);
    }

    // 构建条件子句
    const conditionClauses: string[] = [];
    for (const [key, value] of Object.entries(conditions)) {
      conditionClauses.push(`${key} = ?`);
      params.push(value);
    }

    const sql = `UPDATE ${table} SET ${updateClauses.join(", ")} WHERE ${conditionClauses.join(" AND ")}`;
    
    const result = await this.execute(sql, params);
    
    return {
      affectedRows: result.affectedRows
    };
  }

  /**
   * 删除记录
   */
  public async delete(
    table: string,
    conditions: QueryParams
  ): Promise<{ affectedRows: number }> {
    if (!conditions || Object.keys(conditions).length === 0) {
      throw new Error("删除条件不能为空");
    }

    const conditionClauses: string[] = [];
    const params: any[] = [];

    // 构建条件子句
    for (const [key, value] of Object.entries(conditions)) {
      conditionClauses.push(`${key} = ?`);
      params.push(value);
    }

    const sql = `DELETE FROM ${table} WHERE ${conditionClauses.join(" AND ")}`;
    
    const result = await this.execute(sql, params);
    
    return {
      affectedRows: result.affectedRows
    };
  }

  /**
   * 开始事务
   */
  public async transaction<T>(callback: (conn: any) => Promise<T>): Promise<T> {
    await this.connect();
    
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    
    try {
      logger.info("开始事务");
      const startTime = Date.now();
      
      const result = await callback(connection);
      
      await connection.commit();
      
      const endTime = Date.now();
      logger.info(`事务执行成功 (${endTime - startTime}ms)`);
      
      return result;
    } catch (error) {
      logger.error("事务执行失败，执行回滚", error);
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取数据库连接状态
   */
  public getConnectionStatus(): boolean {
    return this.connectionStatus;
  }

  /**
   * 批量插入多条记录
   * @param table 表名
   * @param dataList 数据对象数组
   * @returns 影响行数和最后插入ID
   */
  public async batchInsert(
    table: string,
    dataList: QueryParams[]
  ): Promise<{ affectedRows: number; insertId: number }> {
    if (!dataList || dataList.length === 0) {
      throw new Error("批量插入数据不能为空");
    }

    // 获取第一个对象的所有列名
    const firstItem = dataList[0];
    const columns = Object.keys(firstItem);

    if (columns.length === 0) {
      throw new Error("插入数据不能为空对象");
    }

    // 检查所有数据对象的列是否一致
    for (const data of dataList) {
      const currentColumns = Object.keys(data);
      if (
        currentColumns.length !== columns.length ||
        !columns.every(col => currentColumns.includes(col))
      ) {
        throw new Error("批量插入的所有数据对象必须具有相同的列");
      }
    }

    // 构建占位符字符串 (?, ?, ?)
    const singlePlaceholder = `(${columns.map(() => "?").join(", ")})`;
    
    // 构建多个数据集的占位符 (?, ?, ?), (?, ?, ?), ...
    const placeholders = dataList.map(() => singlePlaceholder).join(", ");
    
    // 构建SQL语句
    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders}`;
    
    // 构建参数数组 [值1, 值2, ..., 值N]
    const params: any[] = [];
    for (const data of dataList) {
      for (const col of columns) {
        params.push(data[col]);
      }
    }
    
    // 执行SQL
    const startTime = Date.now();
    logger.debug(`执行批量插入: ${sql}`, { count: dataList.length });
    
    try {
      const [result] = await this.pool.execute(sql, params);
      
      const endTime = Date.now();
      logger.info(`批量插入成功 (${endTime - startTime}ms): ${table}`, {
        count: dataList.length,
        affectedRows: result.affectedRows,
        insertId: result.insertId,
        duration: endTime - startTime
      });
      
      return {
        affectedRows: result.affectedRows,
        insertId: result.insertId
      };
    } catch (error) {
      logger.error(`批量插入失败: ${table}`, {
        count: dataList.length,
        error
      });
      throw error;
    }
  }
}

// 导出单例实例
export const mysql = MySQLUtil.getInstance(); 