# Live Monitor Portfolio

静态优先的 Next.js 作品集，使用 Cloudflare Worker + D1 管理站点，嵌入真实网站预览，并展示 UptimeFlare 的状态与延迟。

## 本地运行

需要 Node.js 24 或更高版本。首次运行：

```powershell
npm ci
npm ci --prefix worker
copy .env.example .env.local
copy worker\.dev.vars.example worker\.dev.vars
```

编辑 `worker/.dev.vars`，设置 `ADMIN_PASSWORD` 和足够随机的 `SESSION_SECRET`，再运行：

```powershell
cd worker
npx wrangler d1 migrations apply live-monitor-portfolio --local
cd ..
npm run dev:all
```

- 首页：<http://localhost:3000>
- 管理后台：<http://localhost:3000/admin>
- Worker API：<http://localhost:8787/sites>
- 管理员只需密码，使用本地 `worker/.dev.vars` 的 `ADMIN_PASSWORD`。

`npm run dev:all` 同时启动前端和 Worker，并将前端 API 地址默认为 `http://localhost:8787`。前后端统一使用 localhost，避免 localhost 与 127.0.0.1 混用造成 Cookie 不匹配。也可在两个终端分别执行根目录和 `worker/` 中的 `npm run dev`。

## 配置

前端 `.env.local`：

- `NEXT_PUBLIC_API_BASE_URL`：Worker 根地址。
- `NEXT_PUBLIC_UPTIMEFLARE_API_URL`：UptimeFlare 域名或完整 `/api/data` 地址。

Worker 的本地配置放在 `worker/.dev.vars`：

- `ADMIN_PASSWORD`：管理员密码。
- `SESSION_SECRET`：签名密钥，轮换后已有会话失效。
- `ALLOWED_ORIGINS`：逗号分隔的前台 Origin，例如 `https://portfolio.example.com`；不带路径或末尾斜线，不支持通配符。

只有本地 Worker 会自动允许 `http://localhost:3000` 和 `http://127.0.0.1:3000`。生产前台必须显式加入白名单。登录、退出和所有站点写操作都要求受信任的 Origin；命令行客户端也须带该请求头。普通公开 GET 仍可由无 Origin 的服务端客户端读取。

生产环境的管理员密码、签名密钥和 Origin 配置需另行写入 Worker；远程 secrets 不会自动进入本地开发环境。

## 后台安全

- HMAC 签名、HttpOnly Cookie，服务端校验 7 天有效期并拒绝未来时间、畸形或篡改会话。
- 同一客户端 10 分钟内最多 5 次失败尝试；第 6 次返回 HTTP 429 和 `Retry-After`。成功登录重置计数。
- D1 原子记录登录尝试，跨 Worker 实例生效。记录使用加密散列标识，不保存明文 IP；过期记录在后续登录时清理。
- 生产仅采用 Cloudflare 提供的 `CF-Connecting-IP`；本地请求共用一个限流桶。
- 未配置认证或限流存储不可用时拒绝登录；请求体限制大小并校验类型。
- 会话仍为无状态令牌：退出清除当前浏览器 Cookie，不撤销已复制的令牌；需要全局失效时轮换 `SESSION_SECRET`。

迁移 `worker/migrations/0003_login_attempts.sql` 必须先于新版 Worker 应用。完整安全边界见 [DESIGN.md](DESIGN.md)。

## 沉浸式首页与导航

首页使用 Three.js 和本地 `public/models/minion-a01.glb`。霓虹街区、招牌、地面与引导圆环由 `app/_lib/scene/neon-city.ts` 生成；布局参考 `samsyninja-rebuild`，不依赖该参考工程运行，不引入其模型、贴图、视频或音频。

首次打开首页或完整刷新后显示 5 秒按键引导；无需操作即可结束，也可跳过。引导状态只保存在当前页面文档内，作品/关于页返回首页不会重复，刷新后重新开始。方向键 / WASD 移动、空格跳跃，鼠标拖动改变视角；手机使用屏幕按键。首页、作品与关于由 `PortfolioShell` 共享一个场景，相机以 1.65 秒平滑曲线移动到相应区域，返回首页保留角色位置。减少动态效果偏好下立即切换视点。

首页默认采用侧向镜头，桌面倾斜角随屏幕宽高比调整，手机减小角度以保留图库视野。中央图片环固定在城市作品广场中，使用与场景相机一致的透视；角色移动、跳跃或转动视角只改变观察角度，图库不跟随角色或自动朝向屏幕。它使用后台网站封面，悬停缓慢旋转、移开逐渐停止，也可拖动。点击封面会进入对应作品；网站计数与操作说明放在底部“浏览作品”入口处，中央不重复放置进入按钮。

城市背面为程序生成的蓝紫色星空背景，远处星点与近处缓慢漂浮的粒子组成不同景深，环顾时保留真实视差。桌面共 1780 个点、手机 770 个点，共用一套点几何和材质；星空无图片、视频或模型请求。减少动态效果偏好下停止闪烁与漂移，页面隐藏时随场景暂停，离开公开场景时释放资源。

街道、作品广场附近和星空一侧随机分布 7 位访客，复用 `public/models/minion-b01.glb`、`minion-c01.glb` 和 `minion-d01.glb`。每位固定对应一句话，7 句全部出现；同一页面文档内位置与台词保持稳定，刷新后重新分配。在角色附近出现 `F · 交谈` 时，按 F 或点击提示即可交谈，角色会转向玩家。对话在头顶显示并自动换行，按字数保留阅读时间；走远、被建筑挡住、切换页面或页面失去焦点时关闭。长按不会连续触发。

访客模型在每次场景创建时各加载一次，克隆独立骨骼并共享几何与材质，总新增模型约 504 KiB。模型失败时以彩色简易角色保留交谈功能；减少动态效果偏好下停止待机动画。台词与安全落点在 `app/_lib/scene/scene-npcs.ts`，渲染、模型复用和释放在 `app/_lib/scene/npc-runtime.ts`。

图片环按精选优先、后台排序最多展示 12 个网站；不足 8 个时重复封面组成环，9～12 个全部展示，超过 12 个展示前 12 个，不随机抽取。重复项不增加作品数量，全部网站始终可在展厅翻页。作品页采用带透视的中央实时预览和两侧封面，桌面预览保持 16:9，手机为 4:3，支持滚轮、方向键、横向触摸及分页按钮。关于页使用大字标、双栏介绍和同一城市背景。

主场景使用实例化建筑、合并招牌和单张招牌图集；像素比上限为桌面 1.5、手机 1.25，反射目标为 768 / 384 像素，辉光在半输出分辨率运行。招牌亮度与辉光已降低。页面隐藏时暂停渲染，离开三个公开页面（例如进入后台）时释放图形资源；Three.js 按需加载。WebGL 不可用时仍可浏览图片环、作品与关于。

## 网站封面

管理后台的“封面图片链接”直接接受图床图片直链，保存后用于首页图片环和作品展厅侧面卡片。建议使用固定 HTTPS 链接；也支持 HTTP 链接（HTTPS 站点中受浏览器混合内容规则约束）。新建站点默认填写 `https://eo-vpic.byz.qzz.io/`。旧记录、留空或自定义图片加载失败时使用该随机图床；默认图床也失败时显示网站名称。

字段在 API 中为 `coverUrl`、D1 中为 `cover_url`。先应用 `0004_site_cover.sql` 再运行新版 Worker。迁移仅增加可空列，不修改已有记录。前后端校验绝对 HTTP(S) URL、2048 字符上限并拒绝含凭据的 URL。封面通过浏览器图片元素加载，不经 Worker 代理，不要求图床支持 WebGL 跨域纹理；作品中央仍是真实 iframe。

## 展示内容与性能

`shared/portfolio-content.ts` 保存已确认的作品简介、标签和顺序。前端无 API 配置时使用这些默认内容，空数据库的受认证 seed 接口也使用同一来源。有 API 配置时以 D1 数据为准。

已有本地验收数据库可执行：

```powershell
npm run content:local
```

脚本仅接受本机地址，先将所有站点备份到 `.tmp/content-backups/`，再更新匹配的三个正式站点并隐藏 `phase-4-e2e` 验收卡片。未匹配记录保留；验收数据仅隐藏，不删除。已有技术栈、源码及备用链接保留。该脚本不会创建线上数据，也不会作为迁移自动执行。

预览接近视口 240px 时才挂载，每次最多同时加载 2 个 iframe；20 秒未载入会释放加载名额并显示重试。非交互预览在远离视口或页面隐藏后卸载；已开启交互的窗口保持挂载，以保留其中的输入状态。跨域 iframe 的 load 事件不能证明业务可用或准确识别 CSP 拒绝，状态仍来自监控源。

站点与监控每轮完成后等待 60 秒刷新；页面隐藏时取消当前请求并停止轮询，恢复可见后立即刷新。请求不重叠，并具有超时及取消处理；刷新期间保留未变更站点的旧监控状态，避免离线预览重复挂载。

## 公益信息

作品页底部展开“公益关注”后，浏览器直接访问 `https://api.isoyu.com/gy/api.php`，最多收集 5 条真实记录，并在浏览器缓存 6 小时。刷新失败时使用历史真实缓存；没有可用数据时隐藏模块。

Worker 的 `/public-good` 接口仍保留，支持 `PUBLIC_GOOD_FIXTURE_JSON` 本地验证和明确标记的本地回退数据，但当前首页不使用该代理接口。不要把 Worker 的本地回退当作实时数据。

## 工程检查

```powershell
npm run check
```

顺序执行全量 lint、前端和 Worker 类型检查、所有 `tests/*.test.mjs` 测试及生产构建。亦可单独运行：

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run verify:local
```

`verify:local` 检查已启动的服务。设置 `ADMIN_PASSWORD` 后会验证登录、隐藏站点创建/更新/删除和退出，并在 finally 中清理自己的临时记录；认证验证仅允许本机地址。

ESLint 排除 `.superpowers/`、`.tmp/` 和独立草稿 `CharityAdWidget.tsx`。前端 TypeScript 限定为 `app/`、`shared/`、Next 配置及生成类型，Worker 独立检查。将草稿接入产品前必须移入业务目录并通过检查。

GitHub 的 Quality checks 在 PR 和手动触发时运行；Deploy Pages 复用同一检查流程，只有全部检查通过才部署该流程生成的静态产物。Worker 和 D1 继续手动部署，不使用 Pages 账号自动部署。

## 结构

- `app/`：首页、管理后台、评审导览，组件及前端数据逻辑。
- `shared/`：前后端契约和默认作品内容。
- `worker/src/`：认证、限流、请求校验、站点 CRUD 与公益代理。
- `worker/migrations/`：D1 表结构迁移。
- `tests/`：Node 测试，含安全边界、加载队列与可见性轮询。
- `scripts/`：联合启动、本地验证、展示数据整理。

## 部署

Next.js 使用 `output: "export"`，生产构建生成 `out/`，由 Cloudflare Pages 承载。不要用 `next start` 代替静态站点部署。Worker 和 D1 单独配置。

具体更新步骤见 [项目更新与 Cloudflare 部署指南](docs/项目更新与Cloudflare部署.md)。

## Attribution

界面使用 `animal-island-ui`。该库授权为 CC-BY-NC-4.0，当前用途为非商业；商业化使用前需确认授权。静态素材来源见 `public/portfolio/ATTRIBUTION.md`。
