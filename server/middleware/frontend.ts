import { Middleware } from "https://deno.land/x/oak/mod.ts";
import { env } from "../config/env.ts";

/**
 * 前端代理中间件
 * 将请求代理到 Vue 开发服务器，支持 WebSocket 连接
 *
 * @param {Context} ctx - 上下文对象，包含请求和响应的详细信息
 * @returns {Promise<void>} - 中间件执行完成的 Promise
 */
export const frontendMiddleware: Middleware = async (ctx) => {
  const path = ctx.request.url.pathname;
  const searchParams = ctx.request.url.search || "";

  // 检查是否是 WebSocket 升级请求
  const upgrade = ctx.request.headers.get("upgrade");
  if (upgrade?.toLowerCase() === "websocket") {
    if (!ctx.isUpgradable) {
      ctx.throw(501);
    }
    const ws = ctx.upgrade();

    try {
      const wsUrl = `ws://${env.WEB_URL}${path}${searchParams}`;
      const wsClient = new WebSocket(wsUrl);

      // 处理 WebSocket 事件
      wsClient.onmessage = (e) => ws.send(e.data);
      wsClient.onclose = () => ws.close();
      wsClient.onerror = (_e) => {
        ws.close();
      };

      ws.onmessage = (e) => wsClient.send(e.data);
      ws.onclose = () => wsClient.close();
      ws.onerror = (_e) => {
        ws.close();
      };

      ctx.response.body = ws;
      return;
    } catch (_error) {
      ctx.response.status = 500;
      return;
    }
  }

  try {
    // 转发普通 HTTP 请求到 Vite 开发服务器
    // deno-lint-ignore ban-ts-comment
    //@ts-ignore
    const requestBody = ctx.request.hasBody ? await ctx.request.body().value : undefined;
    const response = await fetch(`http://${env.WEB_URL}${path}${searchParams}`, {
      method: ctx.request.method,
      headers: ctx.request.headers,
      body: requestBody,
    });
    
    // 设置响应头
    const headers = new Headers(response.headers);
    ctx.response.headers = headers;
    
    // 设置响应状态
    ctx.response.status = response.status;
    
    // 设置响应体
    if (response.body) {
      ctx.response.body = response.body;
    }
  } catch (error) {
    console.error("Error proxying to Vite server:", error);
    ctx.response.status = 502;
    ctx.response.body = "Bad Gateway";
  }
}; 