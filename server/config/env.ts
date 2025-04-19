/**
 * 环境变量配置文件
 */
import { logger } from "../utils/logger.ts";

// 环境类型
type EnvType = "development" | "production" | "test";

// 环境变量接口
interface EnvConfig {
  // 端口号
  PORT: number;
  // 主机地址
  HOST: string;
  // web项目地址
  WEB_URL: string;

  // API接口前缀
  PREFIX: string;

  // 数据库地址
  DB_URL: string;
  // 数据库端口
  DB_PORT: number;
  // 数据库用户名
  DB_USER: string;
  // 数据库密码
  DB_PASSWORD: string;
  // 数据库名称
  DB_DATABASE: string;

  // 日志文件多久删除一次
  DEL_LOG_TIME: number;
}

// 各环境配置
const envConfigs: Record<EnvType, EnvConfig> = {
// 开发环境
  development: {
    PORT: 8000,
    HOST: "127.0.0.1",
    WEB_URL: 'localhost:5173',
    PREFIX: "/api",
    DB_URL: "localhost",
    DB_PORT: 3306,
    DB_USER: "root",
    DB_PASSWORD: "123456",
    DB_DATABASE: "deno",
    DEL_LOG_TIME: 12
  },
  // 测试环境
  test: {
    PORT: 8001,
    HOST: "127.0.0.1",
    WEB_URL: 'localhost:5173',
    PREFIX: "/api",
    DB_URL: "localhost",
    DB_PORT: 3306,
    DB_USER: "root",
    DB_PASSWORD: "123456",
    DB_DATABASE: "deno",
    DEL_LOG_TIME: 12
  },
  // 生产环境
  production: {
    PORT: 80,
    HOST: "0.0.0.0",
    WEB_URL: 'localhost:5173',
    PREFIX: "/api",
    DB_URL: "localhost",
    DB_PORT: 3306,
    DB_USER: "root",
    DB_PASSWORD: "123456",
    DB_DATABASE: "deno",
    DEL_LOG_TIME: 12
  },
};

/**
 * 获取环境变量
 */
export function getEnv(): EnvConfig {
  try {
    // 读取系统环境变量
    const sysEnv = Deno.env.toObject();
    
    // 确定当前环境
    const currentEnv = (sysEnv.DENO_ENV || "development") as EnvType;
    
    // 获取当前环境的默认配置
    const defaultConfig = envConfigs[currentEnv];
    
    if (!defaultConfig) {
      throw new Error(`未知的环境类型: ${currentEnv}`);
    }
    
    logger.info(`当前运行环境: ${currentEnv}`);
    
    // 合并系统环境变量和默认配置
    // 系统环境变量优先级更高
    return {
      PORT: Number(sysEnv.PORT || defaultConfig.PORT),
      HOST: sysEnv.HOST || defaultConfig.HOST,
      WEB_URL: sysEnv.WEB_URL || defaultConfig.WEB_URL,
      PREFIX: sysEnv.API_URL || defaultConfig.PREFIX,
      DB_URL: sysEnv.DB_URL || defaultConfig.DB_URL,
      DB_PORT: Number(sysEnv.DB_PORT || defaultConfig.DB_PORT),
      DB_USER: sysEnv.DB_USER || defaultConfig.DB_USER,
      DB_PASSWORD: sysEnv.DB_PASSWORD || defaultConfig.DB_PASSWORD,
      DB_DATABASE: sysEnv.DB_DATABASE || defaultConfig.DB_DATABASE,
      DEL_LOG_TIME: Number(sysEnv.DEL_LOG_TIME || defaultConfig.DEL_LOG_TIME)
    };
  } catch (error) {
    logger.error("读取环境变量失败", { error });
    // 返回开发环境默认配置
    return envConfigs.development;
  }
}

// 导出当前环境配置
export const env = getEnv(); 