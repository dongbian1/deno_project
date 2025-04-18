/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR"
}

/**
 * 日志记录类
 */
export class Logger {
  private logFile: string;
  private logLevel: LogLevel;

  constructor(logFile = "./logs/app.log", logLevel = LogLevel.INFO) {
    this.logFile = logFile;
    this.logLevel = logLevel;
  }

  /**
   * 写入日志到文件
   */
  private async writeToFile(message: string): Promise<void> {
    try {
      // 确保目录存在
      const dir = this.logFile.substring(0, this.logFile.lastIndexOf("/"));
      try {
        await Deno.mkdir(dir, { recursive: true });
      } catch (_error: unknown) {
        // 目录可能已存在，忽略错误
      }

      // 写入日志
      await Deno.writeTextFile(
        this.logFile,
        message + "\n",
        { append: true }
      );
    } catch (error: unknown) {
      console.error(`写入日志文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    // 检查日志级别
    const levelOrder = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3
    };

    if (levelOrder[level] < levelOrder[this.logLevel]) {
      return;
    }

    // 构建日志消息
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (data !== undefined) {
      try {
        const dataString = typeof data === 'object' 
          ? JSON.stringify(data) 
          : String(data);
        logMessage += ` - ${dataString}`;
      } catch (_e) {
        logMessage += ` - [无法序列化的数据]`;
      }
    }

    // 输出到控制台
    const consoleMethod = {
      [LogLevel.DEBUG]: console.debug,
      [LogLevel.INFO]: console.info,
      [LogLevel.WARN]: console.warn,
      [LogLevel.ERROR]: console.error
    }[level];

    consoleMethod(logMessage);

    // 写入到文件
    this.writeToFile(logMessage);
  }

  // 公共日志方法
  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }
}

// 创建默认实例
export const logger = new Logger(); 