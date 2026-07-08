# 小茄的网站小岛 Phase 1-3 设计文档

Status: Approved by user on 2026-07-08.
Source inputs: 项目需求文档.md, IMPLEMENTATION_PLAN.txt, brainstorming decisions in current Codex thread.

## Goal

把已经跑通闭环的 live monitor portfolio 产品化为“小茄的网站小岛”第一阶段体验。交付重点是验证 `animal-island-ui` 的可用性、重塑公开首页的第一眼作品集表达、改善单管理员后台维护体验。

本阶段不是重做架构，也不是把项目扩展成完整 CMS。它应在保持现有 Cloudflare Pages + Worker + D1 + UptimeFlare 架构的前提下，让公开首页和后台从 demo 进入可参赛展示、可持续维护的状态。

## Execution Scope

本 spec 只覆盖 Phase 1-3：

1. Phase 1: `animal-island-ui` 兼容 spike。
2. Phase 2: 公开首页小岛化重设计。
3. Phase 3: 管理后台工作台重设计。

后续 Phase 4+ 的 D1 数据模型扩展、公益模块、监控状态细化、部署安全硬化均为 out of scope，只在本阶段设计中保留接口意识，不进入本轮验收。

## Non-Negotiable Constraints

- Next.js 16 App Router 必须继续支持 `output: "export"` 静态导出。
- Cloudflare Worker 必须继续负责管理员认证、站点 CRUD 和敏感逻辑。
- 本阶段不得新增 D1 migration，不得要求现有记录迁移。
- UptimeFlare 继续作为前端消费的辅助状态源，不接管监控任务。
- live iframe 是核心展示能力，不能被截图、纯链接或静态占位替代。
- 未登录访问 `/admin` 时只能看到密码输入，不得泄露站点列表、站点数量或后台说明。
- `ADMIN_PASSWORD`、`SESSION_SECRET` 等敏感值不得进入前端环境变量。

## Design Decisions

### Decision 1: 双轨 UI 集成策略

`animal-island-ui` 先作为真实依赖做最小兼容验证。Phase 1 只允许修改根样式引入和管理员登录表单这一小片区域，验证 Next.js 16、React 19、静态导出、hydration 和全局样式兼容性。

如果依赖引入导致构建失败、hydration warning、样式污染、许可证风险或其他阻碍，则 Phase 2/3 必须降级为“视觉参考优先”：不继续扩大依赖使用范围，而是用本项目 Tailwind/CSS 复刻温暖、轻松、游戏化、小岛公告板的视觉语言。

### Decision 2: 首页采用“作品即主角，品牌托底”

公开首页第一屏使用主标题“小茄的网站小岛”，副文案解释这是一个收录真实运行网站作品的在线作品集。第一屏视觉锚点是排序第一位站点的 featured live iframe card，而不是监控统计或营销卡片。

首页应从当前偏监控/终端的视觉转向温暖的小岛作品入口。背景、色彩、卡片和按钮可以引入岛屿、木牌、窗口、公告栏等语义，但不应堆叠过多装饰，也不应让状态监控压过作品展示。

`PortfolioGridClient` 应继续负责公开站点加载、UptimeFlare 状态合并和 60 秒轮询，并在客户端派生 collection summary 与 category filter。分类过滤范围为 all、web、landing、tool、other，不新增 Worker API。

featured 逻辑本阶段继续使用排序第一项。等 Phase 4 引入 `isFeatured` 字段后，再替换为显式精选逻辑。

### Decision 3: 作品卡保留 live iframe 核心

`LiveProjectCard` 必须继续以真实 iframe 加载网站，使用 lazy loading，并默认禁用 iframe pointer events。只有站点开启 `allowInteraction` 且用户显式打开交互模式时，iframe 才可交互。

iframe 加载中、离线、状态未知、未接入监控等状态应有友好提示，但这些提示只能辅助理解，不能遮蔽作品集主视觉。目标网站不允许 iframe 嵌入或暂时不可访问时，卡片仍应保留“访问网站”的强入口。

移动端必须避免 iframe 卡片变成巨大笨重的长块。featured 与普通卡片应有稳定尺寸约束，按钮、描述和状态信息分层展示，保证首屏能露出后续内容。

### Decision 4: 后台采用“总览 + 单一编辑面板”

登录后的 `/admin` 使用单一工作台结构：顶部工作台栏显示当前反馈、退出按钮和打开首页快捷入口；主体包含站点列表和一个当前编辑面板。

默认状态为“新建站点”。点击列表中的“编辑”后，同一个 `AdminSiteForm` 切换为编辑当前站点；取消或保存成功后回到新建状态。不得继续保留新建表单和编辑表单并排抢占注意力的 demo 结构。

站点列表保留名称、slug、monitor key、cover mode、公开状态，并提供编辑、打开站点、删除等动作。删除必须有确认门槛，避免误删。

### Decision 5: 后台表单补齐产品化行为

后台表单必须校验必填字段和 URL。URL 必须以 `https://` 开头。slug 可以从 name 或 URL 自动生成，但用户手动修改过 slug 后，自动生成逻辑不得继续覆盖用户输入。

重复 slug、无效 URL、未登录、网络失败等错误需要映射为友好的中文提示。保存、删除期间必须禁用重复操作并给出明确反馈。

公开状态和交互模式应作为高频开关在编辑面板中快速切换。本阶段不强制做表格内乐观更新，以降低 API 和状态同步风险。

## Component Boundaries

- `HomePage`: 公开首页外壳、品牌 hero、页面级视觉方向。
- `PortfolioGridClient`: 获取公开站点、获取监控数据、合并状态、轮询、summary、category filter。
- `BentoGrid`: 接收过滤后的站点，渲染 featured card 与普通 card。
- `LiveProjectCard`: 单个作品窗口、iframe 加载态、离线/未知提示、访问按钮、交互开关。
- `StatusPill`: 展示状态语义，不承担业务合并判断。
- `AdminDashboard`: 管理认证、站点列表、当前编辑目标、消息、pending 状态与整体工作台布局。
- `AdminSiteTable`: 展示站点行和触发编辑、打开、删除动作。
- `AdminSiteForm`: 单一 create/edit 表单、本地校验、slug 自动生成、开关控件。
- `AdminLoginForm`: Phase 1 兼容 spike 的承载点。

## Data Flow

公开首页仍通过现有 public `getSites()` 获取站点，通过 UptimeFlare `/api/data` 获取监控数据，再合并为 `SiteWithStatus[]`。

summary、分类过滤和 featured 都从 `SiteWithStatus[]` 在前端派生，不新增后端过滤接口。

后台仍通过现有 authenticated CRUD API 创建、更新、删除站点。敏感认证逻辑留在 Worker，前端只消费认证状态和 CRUD 结果。

UptimeFlare 获取失败不得导致首页整体失败。站点列表应继续展示，监控状态降级为未知或未加载。

## Error Handling

表单提交前先做本地校验，覆盖必填、URL 协议和 slug 基础格式。

API 错误需要映射为中文消息，包括重复 slug、无效 URL、未登录、网络失败和通用保存失败。

iframe、监控或单个站点状态异常只影响对应卡片，不应破坏整个作品集列表。

删除操作必须经过确认。确认前不得调用删除 API；删除中不得重复触发删除。

## Testing And Validation

本阶段完成前必须运行 `npm run build` 并通过。

Phase 1 验收：

- 引入 `animal-island-ui` 后 Next.js static export 仍成功。
- 管理员登录表单可渲染、可输入、可提交。
- 不出现 hydration warning。
- 组件样式不全局破坏 iframe card。
- 如果 spike 失败，必须记录原因并切换到本地 CSS 视觉参考路径。

Phase 2 验收：

- 首页第一屏明确呈现“小茄的网站小岛”品牌。
- 第一屏 featured live iframe card 是主要视觉锚点。
- 首页显示 collection summary，并支持 all、web、landing、tool、other 分类过滤。
- iframe live rendering、访问按钮、状态提示和交互模式开关仍可用。
- desktop 与 mobile 布局均不出现文本溢出、元素重叠或巨大失衡 iframe。

Phase 3 验收：

- 未登录 `/admin` 只显示密码输入。
- 登录后能看到工作台、站点列表和单一编辑面板。
- 新建、编辑、取消、保存成功回到新建、删除确认均可用。
- URL `https://` 校验和 slug 自动生成行为符合设计。
- 重复 slug、无效 URL、未登录、网络失败有中文提示。
- 后台在 mobile 上仍可维护站点。

## Review Requirements

实现完成后必须进行独立代码审查或最强可用审查，重点检查：

- 是否仍满足 Cloudflare Pages static export、Worker 认证边界和无 D1 migration 的约束。
- `animal-island-ui` spike 成功时是否有足够证据；失败时是否真实切换到本地 CSS 路径而非半引入。
- 首页是否真正从监控面板转向 live portfolio，小岛品牌是否强于普通导航文本。
- 后台是否确实从双表单 demo 变为单一编辑工作台。
- 验证证据是否覆盖 desktop/mobile、登录保护、CRUD、分类过滤和 build。

## Out Of Scope

- 新增 `summary`、`tags`、`techStack`、`isFeatured`、`repoUrl`、`fallbackUrl` 等 D1 字段。
- 公益曝光模块的真实数据源、后台配置和曝光计数。
- UptimeFlare Worker proxy 或复杂监控历史图表。
- 多用户、权限系统、评论、点赞、收藏等社区能力。
- Cloudflare dashboard、域名、账号级配置变更。
