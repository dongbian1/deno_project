import { Application, HTTPMethods, Middleware, Router, RouterContext, isHttpError, Status } from "https://deno.land/x/oak/mod.ts"
import { errorBody } from "./bodyFormat.ts";
import { logger } from "./logger.ts";
import { env } from "../config/env.ts";
import { mysql } from "./mysql.ts";
import { frontendMiddleware } from "../middleware/frontend.ts";

/**
 * 路由配置
 */
export interface RouterItem {
    /** 接口地址 */
    url: string;
    /** 接口类型 */
    method: HTTPMethods;
    /** 回调函数 */
    callback: (ctx: RouterContext<string>) => void
}

/**
 * 请求日志中间件
 */
const loggerMiddleware: Middleware = async (ctx, next) => {
    const start = Date.now();
    const { request } = ctx;
    
    // 生成请求ID
    const requestId = crypto.randomUUID();
    
    // 记录请求开始日志
    logger.info(`${requestId} | 请求开始 | ${request.method} ${request.url.pathname}`, {
        method: request.method,
        url: request.url.toString(),
        headers: Object.fromEntries(request.headers.entries()),
        ip: ctx.request.ip,
    });

    try {
        await next();
        
        // 计算响应时间
        const ms = Date.now() - start;
        
        // 记录请求完成日志
        logger.info(`${requestId} | 请求完成 | ${request.method} ${request.url.pathname} | ${ctx.response.status} | ${ms}ms`, {
            status: ctx.response.status,
            responseTime: ms,
        });
    } catch (error: unknown) {
        // 计算响应时间
        const ms = Date.now() - start;
        
        // 记录请求错误日志
        logger.error(`${requestId} | 请求错误 | ${request.method} ${request.url.pathname} | ${ms}ms`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        
        // 继续抛出错误，让错误中间件处理
        throw error;
    }
};

/**
 * 全局错误拦截器中间件
 */
const errorMiddleware: Middleware = async (ctx, next) => {
    try {
        await next();
    } catch (err: unknown) {
        console.error(`服务器错误: ${err instanceof Error ? err.message : String(err)}`);
        
        // 确定状态码
        let status = Status.InternalServerError;
        if (isHttpError(err)) {
            status = err.status;
        }
        
        // 设置响应状态和错误信息
        ctx.response.status = status;
        ctx.response.body = errorBody(err instanceof Error ? err.message : "服务器内部错误");
        
        // 防止进一步传播错误
        ctx.respond = true;
    }
};

/**
 * 启动服务
 */
export const server = async (route: Array<RouterItem>) => {
    // 获取环境变量配置
    const PORT = env.PORT;
    const HOST = env.HOST;
    const PREFIX = env.PREFIX;

    // 创建应用
    const router = new Router()
    const app = new Application()

    // 添加路由
    route.forEach(item => {
        router.add(item.method, `${PREFIX}${item.url}`, item.callback)
    })

    // 添加日志中间件
    app.use(loggerMiddleware);
    
    // 添加全局错误处理中间件
    app.use(errorMiddleware);

    // 添加前端代理中间件
    app.use(async (ctx, next) => {
        const path = ctx.request.url.pathname;
        // 如果是 API 请求，跳过前端代理
        if (path.startsWith(PREFIX)) {
            await next();
        } else {
            // 否则代理到前端应用
            await frontendMiddleware(ctx, next);
        }
    });

    // 添加路由中间件
    app.use(router.routes())

    // 添加路由方法中间件
    app.use(router.allowedMethods())

    logger.info(`服务启动成功: http://${HOST}:${PORT}`, {
        host: HOST,
        port: PORT,
        dbConnected: mysql.getConnectionStatus(),
        environment: Deno.env.get("DENO_ENV") || "development"
    });
    
    // 启动应用
    await app.listen(`${HOST}:${PORT}`)
}