# 项目更新与 Cloudflare 部署指南

## 资源与账号

- Cloudflare Pages 承载 Next.js 静态构建产物 `out/`，由 GitHub Action 部署。
- Worker `live-monitor-portfolio-api` 提供认证和站点 API。
- D1 `live-monitor-portfolio` 保存站点与登录限流记录。
- Pages 与 Worker 位于不同账号。仓库没有 Worker 自动部署工作流；Worker/D1 由对应账号手动管理。

## 更新前检查

需要 Node.js 24 或更高版本。在仓库根目录执行：

```powershell
npm ci
npm ci --prefix worker
npm run check
```

`check` 依次运行 lint、前后端类型检查、全部测试和生产构建。PR 会运行 Quality checks；推送 main 后 Deploy Pages 复用同一流程，仅部署通过检查的静态产物。

## 新版后台的部署前提

1. 先应用 `0003_login_attempts.sql`，它只新增登录限流表，不改站点数据。
2. 为生产 Worker 配置 `ADMIN_PASSWORD`、`SESSION_SECRET` 和 `ALLOWED_ORIGINS`。
3. `ALLOWED_ORIGINS` 必须包含前台的准确 Origin，例如 `https://portfolio.example.com`。多个域名以逗号分隔，不带路径或末尾斜线，不使用 `*`。
4. 生产 Worker 不会自动允许 localhost。缺少域名授权时，浏览器请求将返回 403；缺少限流迁移时，登录返回 503。

可在 Worker 平台设置中配置变量。也可进入 worker 目录，对应账号登录后通过 CLI 交互设置：

```powershell
cd worker
npx wrangler whoami
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put ALLOWED_ORIGINS
```

ALLOWED_ORIGINS 本身不是秘密，使用 secret 命令可避免把具体生产配置写入仓库。不要打印密码或签名密钥到终端记录。域名配置为完整替换时须保留所有仍需使用的正式前台地址。

## Worker/D1 更新顺序

在 worker 目录操作，并先确认 Cloudflare 账号正确：

```powershell
npx wrangler whoami
npx wrangler d1 migrations list live-monitor-portfolio --remote
npx wrangler d1 migrations apply live-monitor-portfolio --remote
npx wrangler deploy
```

迁移按编号依次执行：`0001_init.sql`、`0002_portfolio_fields.sql`、`0003_login_attempts.sql`、`0004_site_cover.sql`。仅尚未应用的迁移会执行。数据库迁移不读取本地站点，也不上传本地内容。

部署后从白名单中的正式前台验证登录、读取隐藏站点和保存操作，再发布新前端。通过命令行执行写操作也需要合法 Origin 和管理员会话；避免在生产环境运行本地验证或 seed。

## Pages 更新

GitHub 仓库需配置：

- Secrets：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`，使用 Pages 所在账号。
- Variables：`CLOUDFLARE_PAGES_PROJECT_NAME`、`NEXT_PUBLIC_API_BASE_URL`、`NEXT_PUBLIC_UPTIMEFLARE_API_URL`。

推送 main 后，`deploy-pages.yml` 调用 `ci.yml` 安装前后端依赖并执行 `npm run check`。检查任务上传静态产物，部署任务下载同一产物并发布 Pages。PR 仅验证，不部署。Worker 更新和迁移不会随 Pages 自动执行。

含数据库改动的更新顺序为：**D1 迁移 → 配置允许的前台 Origin → Worker → Pages**。

## 本地开发与内容整理

根目录和 worker 目录先分别安装依赖，复制配置示例并填写本地密码及密钥。应用本地迁移：

```powershell
cd worker
npx wrangler d1 migrations apply live-monitor-portfolio --local
cd ..
npm run dev:all
```

首页 <http://localhost:3000>，后台 <http://localhost:3000/admin>，API <http://localhost:8787/sites>。前后端统一使用 localhost。

现有本地验收数据可执行 `npm run content:local`：先备份到 `.tmp/content-backups/`，再隐藏 phase-4-e2e 验收卡片并更新三个匹配的正式作品。所有未知记录保留，已有技术栈和链接保留。该脚本只接受本机服务，线上内容继续由线上后台自行编辑。

`npm run verify:local` 验证已启动的前后端。若通过进程环境提供 ADMIN_PASSWORD，将验证临时隐藏站点的 CRUD，并在 finally 中删除它创建的测试记录。不要把密码写进共享命令历史。

## 上线验收

- 首页读取正式作品，标题、简介、标签和精选顺序正确。
- 管理后台从受信任前台登录成功，不受信任 Origin 的写操作返回 403。
- 同一来源连续失败超过 5 次后返回 429；等待最多 10 分钟恢复。
- 已过期或篡改会话不能执行写入。
- 接近视口时加载预览；离线站点保留离线提示；打开交互后滚动不丢失窗口状态。
- 页面隐藏时不继续轮询，重新可见后更新监控。

## 常见问题

**登录返回 503：** 检查 Worker 是否已配置认证变量，0003 迁移是否已应用，以及 D1 绑定是否可用。

**请求返回 403：** 检查 ALLOWED_ORIGINS 是否包含当前前台的协议、域名及端口；不得混用 www、其他子域名或路径。

**登录成功但后台仍未登录：** 检查浏览器是否允许 Pages 与 Worker 间的 Cookie，及本地是否混用了 localhost 和 127.0.0.1。HTTPS Cookie 使用 SameSite=None; Secure；跨站 Cookie 仍可能被浏览器策略限制，同一主域的部署可减少此问题。

**需要立即使所有会话失效：** 轮换 SESSION_SECRET。退出登录只删除当前浏览器 Cookie，不撤销其他已复制的有效令牌。

**构建报独立草稿错误：** 草稿不属于业务目录，检查是否误加入 TypeScript include。移入业务代码的文件必须补齐依赖和类型后再使用。

## 封面更新后仍未保存

仅更新 D1 或推送 Pages 不会更新 Worker 代码。旧 Worker 可能接受新的请求但忽略 `coverUrl`；必须在 D1 迁移完成后部署当前 Worker，公开 `/sites` 返回值应包含 `coverUrl`（允许 null）。新后台会在保存后回读并核对全部字段，发现遗漏时保留表单并提示，而不报成功。旧版未保存的封面链接需要重新填写。

当前 `wrangler.toml` 的公开 `ALLOWED_ORIGINS` 配置同时包含 `https://proj.331106.xyz` 与 `https://eo-proj.331106.xyz`。密码和会话密钥仍使用现有 Worker secrets，不写入仓库。
