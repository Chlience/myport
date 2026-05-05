# MyPort

<p align="center">
  <strong>一个安全、轻量的单服务器端口登记与扫描看板。</strong>
</p>

<p align="center">
  <a href="./README.md">English</a> · <a href="#快速开始">快速开始</a> · <a href="#安全边界">安全边界</a> · <a href="#验证">验证</a>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" />
  <img alt="Vitest" src="https://img.shields.io/badge/Vitest-tested-6E9F18?logo=vitest" />
  <img alt="Storage" src="https://img.shields.io/badge/storage-atomic%20JSON-orange" />
</p>

---

## MyPort 是什么？

**MyPort** 是一个用于当前服务器的端口登记与扫描 Web 看板。它适合用来维护你自己启动的服务端口，例如 chat web、Postgres、内部管理面板等。

MyPort 的定位是 **单服务器、单账号、元数据管理工具**：它可以扫描当前正在监听的端口，并与手动保存的服务端口记录进行对比，但不会修改、重启或控制真实服务。

## 功能特性

- **单账号登录**：用户名、密码、Session Secret 均来自服务端环境变量。
- **手动端口登记**：记录服务名、端口、协议、Host、介绍说明。
- **只读端口扫描**：使用固定 `ss -ltnup` 命令读取当前监听端口。
- **状态标记**：
  - `active`：已登记且当前正在监听；
  - `unregistered`：正在监听但尚未登记；
  - `not_running`：已登记但当前未监听；
  - `conflict`：登记记录中存在重复冲突。
- **从扫描结果导入**：将扫描到的端口导入到 MyPort 自己的登记表。
- **Atomic JSON 本地存储**：串行写入、临时文件 + rename、损坏文件备份。
- **适合反向代理部署**：HTTPS、域名、证书由外部反向代理负责。

## 技术栈

| 层级 | 选择 |
|---|---|
| App | Next.js App Router |
| 语言 | TypeScript |
| 登录 | HMAC 签名 HttpOnly Session Cookie |
| 存储 | Atomic 本地 JSON 文件 |
| 扫描 | `execFile` 调用固定只读 `ss` 命令 |
| 测试 | Vitest + E2E smoke script |
| UX 指南 | 项目本地 `ui-ux-pro-max` 设计系统 |

设计系统文件：

```text
design-system/myport/MASTER.md
```

## 快速开始

```bash
npm install
cp .env.example .env
```

编辑 `.env`：

```bash
PORT_MANAGER_USERNAME=admin
PORT_MANAGER_PASSWORD=use-a-strong-password
PORT_MANAGER_SESSION_SECRET=replace-with-at-least-32-random-characters
PORT_MANAGER_DATA_PATH=./data/ports.json
PORT_MANAGER_COOKIE_SECURE=false
```

启动开发服务器：

```bash
npm run dev
```

打开：

```text
http://localhost:3000
```

## 生产部署

构建并运行：

```bash
npm run build
npm run start -- -p 3000
```

如果要外网访问，请将 MyPort 放到你自己的反向代理后面，并在反向代理层处理 HTTPS/TLS。

生产环境建议设置：

```bash
PORT_MANAGER_COOKIE_SECURE=true
```

## 数据存储

默认数据文件：

```text
data/ports.json
```

也可以通过环境变量修改：

```bash
PORT_MANAGER_DATA_PATH=/absolute/or/relative/path/to/ports.json
```

真实数据文件默认被 Git 忽略，不会提交到仓库。

## 安全边界

MyPort 只做 **元数据管理**。

范围内：

- MyPort 自己的登记记录增删改查；
- 固定命令的只读端口扫描；
- 将扫描结果导入到 MyPort 自己的 JSON 数据文件。

明确不做：

- 修改真实服务端口；
- 编辑其他服务的配置文件或环境变量；
- 重启、停止、杀掉进程；
- Docker 或 systemd 控制；
- 多服务器资产管理；
- 多用户、角色、权限系统；
- 历史监控、图表、告警；
- 在应用内部管理 HTTPS、证书或域名。

## 扫描行为

扫描适配器使用 `execFile` 运行固定命令：

```text
ss -ltnup
```

不接受任何用户传入的命令或参数。由于系统权限差异，进程名和 PID 可能缺失；端口、协议、Host 是主要对比字段。

## 验证

完整验证：

```bash
npm run verify
```

单独运行：

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm audit --audit-level=moderate
```

## 仓库名与项目名

GitHub 仓库名保持小写：

```text
myport
```

项目展示名为：

```text
MyPort
```
