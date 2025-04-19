import { getFileData, readFileCSV, readFileExcel } from "./server/read/index.ts";
import { RouterItem, server } from "./server/request/index.ts";
import { CronJobManager } from "./server/utils/cron.ts";
import { env } from "./server/config/env.ts";
import { logger } from "./server/utils/logger.ts";
import { mysql } from "./server/utils/mysql.ts";

// 接口路由配置
const routerArr: Array<RouterItem> = [
  { url: "/readFileCSV", method: "GET", callback: readFileCSV },
  { url: "/readFileExcel", method: "GET", callback: readFileExcel },
  { url: "/getFileData", method: "GET", callback: getFileData },
];

if (import.meta.main) {
  
  // 启动服务
  server(routerArr);

  // 检测数据库连接
  try {
    logger.info("正在检测数据库连接...");
    await mysql.connect();
    logger.info("数据库连接检测成功");
  } catch (error) {
    logger.error("数据库连接失败，服务可能无法正常访问数据", {
      error: error instanceof Error ? error.message : String(error),
    });
    // 继续启动服务，但数据库操作可能会失败
  }

  // 定时器删除日志文件，防止日志太大
  const cronManager = CronJobManager.getInstance();
  cronManager.addJob({
    name: "del_log",
    schedule: `0 */${env.DEL_LOG_TIME} * * *`,
    task: async () => {
      await Deno.remove("./logs/app.log");
    },
  });
}
