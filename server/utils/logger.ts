import moment from "npm:moment@^2.30.1";

/**
 * 日志级别枚举
 * @enum {string}
 */
export enum LogLevel {
  /** 信息级别日志 */
  INFO = 'INFO',
  /** 警告级别日志 */
  WARN = 'WARN',
  /** 错误级别日志 */
  ERROR = 'ERROR',
  /** 调试级别日志 */
  DEBUG = 'DEBUG'
}

/**
 * 日志配置接口
 */
export interface LogConfig {
  /** 日志文件路径 */
  logFilePath: string;
  /** 是否在控制台输出日志 */
  console?: boolean;
  /** 是否在日志中包含时间戳 */
  timestamp?: boolean;
}

/**
 * 日志记录类
 * 使用单例模式确保全局只有一个日志记录实例
 * 支持文件写入和控制台输出
 * 
 * @example
 * ```ts
 * const logger = Logger.getInstance({
 *   logFilePath: "./logs/app.log",
 *   console: true,
 *   timestamp: true
 * });
 * 
 * await logger.info("应用启动成功", { port: 3000 });
 * await logger.error("操作失败", { error: "连接超时" });
 * ```
 */
export class Logger {
  private static instance: Logger;
  private logFilePath: string;
  private enableConsole: boolean;
  private enableTimestamp: boolean;

  /**
   * 私有构造函数，防止直接实例化
   * @param {LogConfig} config - 日志配置
   */
  private constructor(config: LogConfig) {
    this.logFilePath = config.logFilePath;
    this.enableConsole = config.console ?? true;
    this.enableTimestamp = config.timestamp ?? true;
  }

  /**
   * 获取Logger的单例实例
   * @param {LogConfig} [config] - 可选的日志配置
   * @returns {Logger} Logger的单例实例
   */
  public static getInstance(config?: LogConfig): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config ?? {
        logFilePath: "./logs/app.log",
      });
    }
    return Logger.instance;
  }

  /**
   * 获取当前时间戳
   * @returns {string} 格式化的时间戳 YYYY-MM-DD HH:mm:ss
   * @private
   */
  private getTimestamp(): string {
    return moment().format('YYYY-MM-DD HH:mm:ss');
  }

  /**
   * 写入日志到文件
   * @param {string} message - 日志消息
   * @returns {Promise<void>}
   * @private
   */
  private async writeToFile(message: string): Promise<void> {
    try {
      // 确保目录存在
      const dir = this.logFilePath.substring(0, this.logFilePath.lastIndexOf("/"));
      try {
        await Deno.mkdir(dir, { recursive: true });
      } catch (_error: unknown) {
        // 目录可能已存在，忽略错误
      }

      // 写入日志
      await Deno.writeTextFile(
        this.logFilePath,
        message + "\n",
        { append: true }
      );
    } catch (error: unknown) {
      console.error(`写入日志文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 格式化日志消息
   * @param {LogLevel} level - 日志级别
   * @param {string} message - 日志消息
   * @param {Record<string, unknown>} [meta] - 元数据
   * @returns {string} 格式化后的日志消息
   * @private
   */
  private formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const timestamp = this.enableTimestamp ? `[${this.getTimestamp()}]` : "";
    const metaString = meta ? ` - ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level}] ${message}${metaString}`;
  }

  /**
   * 记录日志的核心方法
   * @param {LogLevel} level - 日志级别
   * @param {string} message - 日志消息
   * @param {Record<string, unknown>} [meta] - 元数据
   * @returns {Promise<void>}
   */
  public async log(level: LogLevel, message: string, meta?: Record<string, unknown>): Promise<void> {
    const formattedMessage = this.formatMessage(level, message, meta);
    
    if (this.enableConsole) {
      switch (level) {
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        default:
          console.log(formattedMessage);
      }
    }

    await this.writeToFile(formattedMessage);
  }

  /**
   * 记录信息级别日志
   * @param {string} message - 日志消息
   * @param {Record<string, unknown>} [meta] - 元数据
   * @returns {Promise<void>}
   */
  public async info(message: string, meta?: Record<string, unknown>): Promise<void> {
    await this.log(LogLevel.INFO, message, meta);
  }

  /**
   * 记录警告级别日志
   * @param {string} message - 日志消息
   * @param {Record<string, unknown>} [meta] - 元数据
   * @returns {Promise<void>}
   */
  public async warn(message: string, meta?: Record<string, unknown>): Promise<void> {
    await this.log(LogLevel.WARN, message, meta);
  }

  /**
   * 记录错误级别日志
   * @param {string} message - 日志消息
   * @param {Record<string, unknown>} [meta] - 元数据
   * @returns {Promise<void>}
   */
  public async error(message: string, meta?: Record<string, unknown>): Promise<void> {
    await this.log(LogLevel.ERROR, message, meta);
  }

  /**
   * 记录调试级别日志
   * @param {string} message - 日志消息
   * @param {Record<string, unknown>} [meta] - 元数据
   * @returns {Promise<void>}
   */
  public async debug(message: string, meta?: Record<string, unknown>): Promise<void> {
    await this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * 设置日志文件路径
   * @param {string} path - 新的日志文件路径
   */
  public setLogFilePath(path: string): void {
    this.logFilePath = path;
  }

  /**
   * 设置是否在控制台输出日志
   * @param {boolean} enable - 是否启用控制台输出
   */
  public setConsoleOutput(enable: boolean): void {
    this.enableConsole = enable;
  }

  /**
   * 设置是否在日志中包含时间戳
   * @param {boolean} enable - 是否启用时间戳
   */
  public setTimestamp(enable: boolean): void {
    this.enableTimestamp = enable;
  }
}

// 创建默认实例
export const logger = Logger.getInstance(); 