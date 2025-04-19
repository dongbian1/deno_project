# Deno + Vue 全栈项目

基于 Deno + Oak 构建的服务端框架，支持代理到 Vue 开发服务器和生产环境打包。

## 技术栈

### 后端

- Deno
- Oak (Web 框架)
- MySQL

### 前端代理支持

- Vue 3 + Vite 开发服务器代理
- WebSocket 支持（用于 HMR）
- 生产环境静态文件服务

## 项目结构

```
.
├── server/                # 服务器端代码
│   ├── config/           # 配置文件
│   │   └── env.ts        # 环境变量配置
│   ├── middleware/       # 中间件
│   │   └── frontend.ts   # 前端代理中间件
│   ├── utils/           # 工具函数
│   │   └── bodyFormat.ts    # body格式化工具
│   │   └── cron.ts    # 定时任务工具
│   │   └── logger.ts    # 日志工具
│   │   └── mysql.ts    # mysql链接工具
│   │   └── request.ts    # web服务工具
└── deno.json           # Deno 配置文件
└── main.ts             # 服务器入口文件

```

## 功能特性

### 1. 环境配置管理

- 支持开发、测试、生产三种环境
- 灵活的环境变量配置系统
- 配置文件：`server/config/env.ts`

```typescript
// 环境配置示例
{
  PORT: 8000,              // 服务器端口
  HOST: "127.0.0.1",      // 主机地址
  WEB_URL: "localhost:5173", // 前端开发服务器地址
  PREFIX: "/api",         // API 前缀
  DB_URL: "localhost",    // 数据库地址
  DB_PORT: 3306,          // 数据库端口
  DB_USER: "root",        // 数据库账号
  DB_PASSWORD: "123456",  // 数据库密码
  DB_DATABASE: "deno",    // 库名
  DEL_LOG_TIME: 12        // 日志文件定期清理时间 单位小时
}
```

### 2. 中间件系统

#### 前端代理中间件 (frontend.ts)

- 开发环境
  - 代理请求到外部 Vue 开发服务器
  - 支持 WebSocket 连接（用于热重载）
  - 自动转发请求头和请求体
  - 支持 HMR（热模块替换）
- 生产环境
  - 服务静态文件
  - 支持 SPA 路由

### 3. 构建系统

#### 开发模式

```bash
deno run dev
```

- 启动代理服务器
- 自动转发请求到 Vue 开发服务器
- 支持文件修改自动重载

#### 生产构建

```bash
deno run build:pro
```

- 打包静态资源
- 生成独立可执行文件

### 4. 日志系统

- 集成日志工具
- 支持多级别日志
- 自动日志清理

## 快速开始

1. 安装 Deno

```bash
# Windows (PowerShell):
irm https://deno.land/install.ps1 | iex

# macOS/Linux:
curl -fsSL https://deno.land/x/install/install.sh | sh
```

2. 克隆项目

```bash
git clone https://github.com/dongbian1/deno_project
cd deno_project
```

3. 开发模式

```bash
deno run dev
```

4. 生产构建

```bash
deno run build:pro
```

5. 运行生产版本

```bash
./app  # Unix
# 或
app.exe  # Windows
```

## 环境变量

| 变量名       | 说明                 | 默认值         |
| ------------ | -------------------- | -------------- |
| PORT         | 服务器端口           | 8000           |
| HOST         | 服务器主机           | 127.0.0.1      |
| WEB_URL      | 前端服务地址         | localhost:5173 |
| PREFIX       | 接口前缀             | /api           |
| DB_URL       | 数据库地址           | localhost      |
| DB_PORT      | 数据库端口           | 3306           |
| DB_USER      | 数据库账号           | root           |
| DB_PASSWORD  | 数据库密码           | 123456         |
| DB_DATABASE  | 数据库名             | deno           |
| DEL_LOG_TIME | log 文件定期删除时间 | 12             |

## 开发指南

### 配置前端开发服务器

1. 在环境配置中设置 `WEB_URL`
2. 确保 Vue 开发服务器正在运行
3. 启动代理服务器：`deno run dev`

### 添加新的中间件

1. 在 `server/middleware` 目录下创建新文件
2. 实现中间件逻辑
3. 在 `main.ts` 中注册中间件

### 修改环境配置

1. 在 `server/config/env.ts` 中添加新的配置项
2. 更新 `EnvConfig` 接口
3. 在相应环境中设置值

## 注意事项

1. 本项目仅提供代理服务器功能，不包含 Vue 项目的实际代码
2. 开发环境需要外部运行的 Vue 开发服务器
3. 生产环境需要已构建的 Vue 项目静态文件
4. WebSocket 代理仅在开发环境中使用，用于支持 HMR
5. 确保环境变量正确配置，特别是 `WEB_URL`
