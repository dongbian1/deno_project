# Deno MySQL 工具类使用说明

## 安装依赖

使用MySQL工具类之前，需要安装mysql2依赖：

```bash
# 允许npm依赖
deno run -A --node-modules-dir npm:mysql2@^2.3.3
```

## 基本使用方法

```typescript
import { mysql } from "./pages/utils/mysql.ts";

// 查询多条记录
const users = await mysql.findAll("users", { status: "active" });
console.log(users);

// 查询单条记录
const user = await mysql.findOne("users", { id: 1 });
console.log(user);

// 插入记录
const result = await mysql.insert("users", {
  name: "张三",
  email: "zhangsan@example.com",
  created_at: new Date()
});
console.log(`插入ID: ${result.id}, 影响行数: ${result.affectedRows}`);

// 更新记录
const updateResult = await mysql.update(
  "users",
  { name: "李四", updated_at: new Date() },
  { id: 1 }
);
console.log(`更新影响行数: ${updateResult.affectedRows}`);

// 删除记录
const deleteResult = await mysql.delete("users", { id: 1 });
console.log(`删除影响行数: ${deleteResult.affectedRows}`);

// 执行自定义SQL查询
const data = await mysql.query("SELECT * FROM users WHERE age > ?", [18]);
console.log(data);

// 使用事务
await mysql.transaction(async (conn) => {
  await conn.query("UPDATE accounts SET balance = balance - ? WHERE id = ?", [100, 1]);
  await conn.query("UPDATE accounts SET balance = balance + ? WHERE id = ?", [100, 2]);
  // 如果上述操作有任何错误，会自动回滚
});

// 关闭连接
await mysql.close();
```

## 批量插入数据

```typescript
import { mysql } from "./pages/utils/mysql.ts";

// 准备多条数据
const users = [
  { 
    name: "张三", 
    email: "zhangsan@example.com", 
    created_at: new Date() 
  },
  { 
    name: "李四", 
    email: "lisi@example.com", 
    created_at: new Date() 
  },
  { 
    name: "王五", 
    email: "wangwu@example.com", 
    created_at: new Date() 
  }
];

// 批量插入数据
try {
  const result = await mysql.batchInsert("users", users);
  console.log(`成功插入 ${result.affectedRows} 条记录，起始ID: ${result.insertId}`);
} catch (error) {
  console.error("批量插入失败:", error);
}
```

## 完整API

### 连接数据库
- `mysql.connect()`: 连接到数据库

### 关闭连接
- `mysql.close()`: 关闭数据库连接

### 查询操作
- `mysql.query<T>(sql: string, params?: any[])`: 执行SQL查询
- `mysql.findAll<T>(table: string, conditions?, fields?, orderBy?, limit?, offset?)`: 查询多条记录
- `mysql.findOne<T>(table: string, conditions, fields?)`: 查询单条记录

### 修改操作
- `mysql.execute(sql: string, params?: any[])`: 执行SQL语句(插入/更新/删除)
- `mysql.insert(table: string, data)`: 插入单条记录
- `mysql.batchInsert(table: string, dataList)`: 批量插入多条记录
- `mysql.update(table: string, data, conditions)`: 更新记录
- `mysql.delete(table: string, conditions)`: 删除记录

### 事务
- `mysql.transaction<T>(callback: (conn) => Promise<T>)`: 执行事务

## 环境变量配置

在`config/env.ts`中配置数据库连接信息：

```typescript
// 环境变量接口
interface EnvConfig {
  // ...其他配置...
  
  // 数据库地址
  DB_URL: string;
  // 数据库用户名
  DB_USER: string;
  // 数据库密码
  DB_PASSWORD: string;
  // 数据库名称
  DB_DATABASE: string;
}
```

## 日志记录

工具类自动记录所有SQL操作，包括：
- 查询/执行的SQL语句
- 绑定的参数
- 执行耗时
- 影响的行数
- 错误信息

所有日志通过`logger`工具类记录，支持不同级别的日志。 