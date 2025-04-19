import { cron } from "https://deno.land/x/deno_cron@v1.0.0/cron.ts";
import { Logger } from "./logger.ts";

/**
 * 定时任务配置接口
 */
interface CronJobConfig {
  /** 任务名称 */
  name: string;
  /** cron表达式 */
  schedule: string;
  /** 任务执行函数 */
  task: () => Promise<void> | void;
}

/**
 * 定时任务日志条目接口
 */
interface CronLogEntry {
  /** 任务名称 */
  jobName: string;
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime: Date;
  /** 执行状态 */
  status: 'success' | 'error';
  /** 错误信息 */
  error?: string;
}

/**
 * 定时任务管理器
 * 使用单例模式确保全局只有一个定时任务管理实例
 * 
 * @example
 * ```ts
 * const cronManager = CronJobManager.getInstance();
 * await cronManager.addJob({
 *   name: "dailyBackup",
 *   schedule: "0 0 * * *",  // 每天午夜执行
 *   task: async () => {
 *     // 执行备份操作
 *   }
 * });
 * ```
 */
export class CronJobManager {
  private static instance: CronJobManager;
  private jobs: Map<string, CronJobConfig>;
  private logger: Logger;

  /**
   * 私有构造函数，防止直接实例化
   */
  private constructor() {
    this.jobs = new Map();
    this.logger = Logger.getInstance({
      logFilePath: "./logs/cron.log"
    });
  }

  /**
   * 获取CronJobManager的单例实例
   * @returns {CronJobManager} CronJobManager的单例实例
   */
  public static getInstance(): CronJobManager {
    if (!CronJobManager.instance) {
      CronJobManager.instance = new CronJobManager();
    }
    return CronJobManager.instance;
  }

  /**
   * 写入任务执行日志
   * @param {CronLogEntry} logEntry - 日志条目
   */
  private async writeLog(logEntry: CronLogEntry): Promise<void> {
    const duration = logEntry.endTime.getTime() - logEntry.startTime.getTime();
    const meta = {
      jobName: logEntry.jobName,
      startTime: logEntry.startTime.toISOString(),
      endTime: logEntry.endTime.toISOString(),
      duration: `${duration}ms`,
      status: logEntry.status,
      ...(logEntry.error && { error: logEntry.error })
    };

    if (logEntry.status === 'success') {
      await this.logger.info(`Cron job ${logEntry.jobName} completed successfully`, meta);
    } else {
      await this.logger.error(`Cron job ${logEntry.jobName} failed`, meta);
    }
  }

  /**
   * 添加新的定时任务
   * @param {CronJobConfig} config - 定时任务配置
   * @throws {Error} 当任务名称已存在时抛出错误
   * 
   * @example
   * ```ts
   * await cronManager.addJob({
   *   name: "dailyCleanup",
   *   schedule: "0 0 * * *",
   *   task: async () => {
   *     // 清理任务逻辑
   *   }
   * });
   * ```
   */
  public async addJob(config: CronJobConfig): Promise<void> {
    if (this.jobs.has(config.name)) {
      throw new Error(`Job with name ${config.name} already exists`);
    }

    this.jobs.set(config.name, config);
    await this.logger.info(`Adding new cron job: ${config.name} with schedule: ${config.schedule}`);

    cron(config.schedule, async () => {
      const startTime = new Date();
      try {
        await config.task();
        const endTime = new Date();
        await this.writeLog({
          jobName: config.name,
          startTime,
          endTime,
          status: "success",
        });
      } catch (error: unknown) {
        const endTime = new Date();
        await this.writeLog({
          jobName: config.name,
          startTime,
          endTime,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  /**
   * 移除指定的定时任务
   * @param {string} jobName - 要移除的任务名称
   * @throws {Error} 当任务不存在时抛出错误
   */
  public async removeJob(jobName: string): Promise<void> {
    if (!this.jobs.has(jobName)) {
      throw new Error(`Job with name ${jobName} does not exist`);
    }
    this.jobs.delete(jobName);
    await this.logger.info(`Removed cron job: ${jobName}`);
  }

  /**
   * 获取所有已注册的定时任务
   * @returns {Map<string, CronJobConfig>} 任务名称到任务配置的映射
   */
  public getJobs(): Map<string, CronJobConfig> {
    return new Map(this.jobs);
  }
}
