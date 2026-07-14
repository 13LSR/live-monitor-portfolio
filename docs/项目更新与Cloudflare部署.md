# 项目更新与 Cloudflare 部署指南

本文档用于更新本项目的 Cloudflare Worker、D1 数据库和 Pages 前端。

## 先理解三个部分

- **Cloudflare Pages**：部署 Next.js 静态前端。
- **Cloudflare Worker**：提供管理员登录、网站列表和网站增删改接口。
- **Cloudflare D1**：保存你在线上管理页添加的网站记录。

`worker/migrations/*.sql` 是数据库**表结构升级脚本**，不是本地测试数据。执行远程迁移不会把本地网站记录上传到线上，也不会用本地数据覆盖线上数据。

本次的 `0002_portfolio_fields.sql` 只给线上 `sites` 表增加简介、标签、技术栈、精选状态、仓库地址和备用地址等字段。已有线上网站记录会保留，新字段使用默认值，之后可以在管理页逐条补充。

## 环境准备

在项目根目录打开 PowerShell，确认 Node.js 和 npm 可用：

```powershell
node --version
npm --version
```

首次在这台电脑操作 Cloudflare 时登录：

```powershell
npx wrangler login
```

浏览器授权成功后，可以检查当前账号：

```powershell
npx wrangler whoami
```

项目使用的资源配置在 `worker/wrangler.toml`：

- Worker：`live-monitor-portfolio-api`
- D1：`live-monitor-portfolio`

## 每次更新前的检查

先安装依赖并验证项目：

```powershell
npm ci
npm run lint
npm run build
```

再检查本次提交是否包含 Worker、共享接口或数据库迁移：

```powershell
git diff --name-only origin/main...HEAD -- worker shared
```

根据输出决定更新方式：

- 只有 `app/`、`public/`、前端样式等变化：通常直接推送，由 Pages 自动部署。
- 出现 `worker/` 或 `shared/`：需要先部署 Worker。
- 出现新的 `worker/migrations/*.sql`：必须先执行远程 D1 迁移，再部署 Worker。

## 本次版本的正确更新步骤

### 1. 查看远程迁移状态

```powershell
npx wrangler d1 migrations list live-monitor-portfolio --remote --config worker/wrangler.toml
```

如果列表显示 `0002_portfolio_fields.sql` 尚未应用，继续下一步。如果已经应用，不要重复处理，直接部署 Worker。

### 2. 应用远程 D1 表结构迁移

```powershell
npx wrangler d1 migrations apply live-monitor-portfolio --remote --config worker/wrangler.toml
```

出现确认提示时，核对数据库名称为 `live-monitor-portfolio`，然后确认执行。

这一步操作的是线上 D1 表结构，不会读取本地 D1 中的测试网站，也不会调用测试数据填充接口。

执行完成后再次检查：

```powershell
npx wrangler d1 migrations list live-monitor-portfolio --remote --config worker/wrangler.toml
```

确认 `0002_portfolio_fields.sql` 已应用。

### 3. 手动部署新版 Worker

```powershell
npx wrangler deploy --config worker/wrangler.toml
```

部署完成后，Wrangler 会显示 Worker 名称和访问地址。确认名称是 `live-monitor-portfolio-api`。

### 4. 验证线上 Worker

打开线上管理页，至少检查：

1. 管理员可以正常登录。
2. 原有线上网站仍然存在。
3. 编辑网站时可以保存简介、标签、技术栈、精选状态和仓库地址。
4. 公开网站接口能正常返回网站列表。

不要在线上调用 `/sites/seed`。这个接口是本地演示数据填充用途。

### 5. 推送主分支，触发 Pages 部署

确认当前准备推送的是 `main`，并检查工作区：

```powershell
git branch --show-current
git status
git log -1 --oneline
```

代码已经合并到 `main` 后再推送：

```powershell
git push origin main
```

推送到 `main` 后：

- `.github/workflows/deploy-pages.yml` 会构建并部署 Pages。
- 如果提交包含 `worker/**` 或 `shared/**`，`.github/workflows/deploy-worker.yml` 也会再次部署 Worker。

Worker 被自动重复部署一次通常没有问题。提前手动部署的目的，是确保 Worker 已经在 Pages 新前端上线之前兼容新字段。

### 6. 检查 GitHub Actions 和线上页面

在 GitHub 仓库的 **Actions** 页面确认：

- `Deploy Pages` 成功。
- `Deploy Worker` 成功（本次包含 Worker 改动时）。

最后用无痕窗口检查：

1. 首页可以加载网站作品。
2. 精选作品和普通作品顺序正确。
3. 公益模块显示正常。
4. 在线状态和延迟正常显示。
5. 管理页保存的网站信息能在首页展示。

## 以后日常更新的简化流程

### 仅修改前端

```powershell
npm run lint
npm run build
git push origin main
```

无需手动更新 Worker，也无需执行 D1 迁移。

### 修改 Worker，但没有新增迁移

推荐先部署 Worker，再推送：

```powershell
npm run lint
npm run build
npx wrangler deploy --config worker/wrangler.toml
git push origin main
```

### 修改 Worker，并新增 D1 迁移

严格按照以下顺序：

```powershell
npm run lint
npm run build
npx wrangler d1 migrations list live-monitor-portfolio --remote --config worker/wrangler.toml
npx wrangler d1 migrations apply live-monitor-portfolio --remote --config worker/wrangler.toml
npx wrangler deploy --config worker/wrangler.toml
git push origin main
```

顺序必须是：**D1 迁移 → Worker → Pages**。

## 本地开发命令

本地 D1 和线上 D1 相互独立。本地迁移使用：

```powershell
npx wrangler d1 migrations apply live-monitor-portfolio --local --config worker/wrangler.toml
```

本地同时启动前端和 Worker：

```powershell
npm run dev:all
```

本地测试网站数据不会因为 `git push`、`wrangler deploy` 或远程 D1 迁移而自动上传到线上。线上网站仍然通过线上 `/admin` 管理页自行添加。

## 常见问题

### 页面部署成功，但网站列表报错

通常是 Pages 已使用新接口字段，而 Worker 或 D1 仍是旧版本。依次执行：

```powershell
npx wrangler d1 migrations apply live-monitor-portfolio --remote --config worker/wrangler.toml
npx wrangler deploy --config worker/wrangler.toml
```

然后重新检查页面。

### Wrangler 登录了错误的 Cloudflare 账号

```powershell
npx wrangler logout
npx wrangler login
npx wrangler whoami
```

确认账号正确后再执行远程迁移或部署。

### GitHub 自动部署 Worker 会执行 D1 迁移吗

不会。当前 `.github/workflows/deploy-worker.yml` 只执行 `wrangler deploy`，没有执行 `wrangler d1 migrations apply`。因此新增迁移时必须先手动应用远程迁移。

### 是否每次推送都要更新 Worker

不需要。只有以下情况需要：

- `worker/` 中的 Worker 代码发生变化。
- `shared/` 中前后端接口契约发生变化。
- 新增了 `worker/migrations/*.sql` 数据库迁移。

单纯修改首页组件、CSS、图片或文案时，只需要部署 Pages。
