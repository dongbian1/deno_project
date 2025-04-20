/**
 * @fileoverview 请求处理工具类，包含路由配置、中间件和服务器启动功能
 * @module server/utils/request
 */

import { Application, HTTPMethods, Middleware, Router, RouterContext, isHttpError, Status } from "https://deno.land/x/oak/mod.ts"
import { errorBody } from "./bodyFormat.ts";
import { logger } from "./logger.ts";
import { env } from "../config/env.ts";
import { mysql } from "./mysql.ts";
import { frontendMiddleware } from "../middleware/frontend.ts";

/**
 * 路由配置接口
 * @interface RouterItem
 * @description 定义单个路由项的配置结构
 */
export interface RouterItem {
    /** 
     * 接口地址
     * @type {string}
     * @description API 端点的 URL 路径
     */
    url: string;
    /** 
     * 接口类型
     * @type {HTTPMethods}
     * @description HTTP 请求方法（GET, POST, PUT, DELETE 等）
     */
    method: HTTPMethods;
    /** 
     * 回调函数
     * @type {Function}
     * @description 处理请求的控制器函数
     * @param {RouterContext<string>} ctx - Oak 路由上下文对象
     */
    callback: (ctx: RouterContext<string>) => void
}

/**
 * 请求日志中间件
 * @type {Middleware}
 * @description 记录所有 HTTP 请求的日志信息，包括请求开始、完成和错误情况
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
 * @type {Middleware}
 * @description 统一处理应用中的错误，将错误转换为标准的 HTTP 响应
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
 * 启动服务器
 * @async
 * @function server
 * @description 配置并启动 Oak 服务器，设置中间件、路由和错误处理
 * @param {Array<RouterItem>} route - 路由配置数组
 * @returns {Promise<void>}
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

    /** 
     * 前端代理中间件
     * @description 处理前端和 API 请求的路由分发
     * @param {Context} ctx - Oak 上下文对象
     * @param {Next} next - 下一个中间件函数
     */
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

    /** 
     * 注册路由中间件
     * @description 启用应用的路由处理
     */
    app.use(router.routes())

    /** 
     * 注册路由方法中间件
     * @description 添加 HTTP 方法验证，确保请求方法的合法性
     */
    app.use(router.allowedMethods())

    /** 
     * 输出服务启动信息
     * @description 记录服务器配置和运行环境信息
     */
    logger.info(`服务启动成功: http://${HOST}:${PORT}`, {
        host: HOST,
        port: PORT,
        dbConnected: mysql.getConnectionStatus(),
        environment: Deno.env.get("DENO_ENV") || "development"
    });
    
    /** 
     * 启动应用服务器
     * @description 在指定的主机和端口上启动 HTTP 服务器
     */
    await app.listen(`${HOST}:${PORT}`)
}