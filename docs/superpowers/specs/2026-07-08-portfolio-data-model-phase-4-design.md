# 小茄的网站小岛 Phase 4 作品集数据模型设计

Status: Approved by user on 2026-07-08.
Source inputs: 项目需求文档.md, IMPLEMENTATION_PLAN.txt, Phase 1-3 review artifacts, brainstorming decisions in current Codex thread.

## Goal

Phase 1-3 已经完成首页小岛化、后台单一编辑工作台、`animal-island-ui` 最小兼容验证和独立审查闭环。Phase 4 的目标是在不重做架构的前提下，把现有“站点记录”升级为更像“作品集作品”的数据模型。

本阶段交付后，每个作品应能表达一句话简介、标签、技术栈、精选状态、源码地址和 iframe 备用访问地址。后台应能顺手维护这些字段，首页作品卡应能轻量展示这些信息，并让用户明显感知到 `animal-island-ui` 不再只停留在登录页 spike。

## Execution Scope

本 spec 只覆盖 Phase 4：作品集数据模型扩展。

包含范围：

1. 新增 D1 migration，为 `sites` 表增加作品字段。
2. 扩展 Worker 数据读取、写入、校验和 API 映射。
3. 扩展 `shared/types.ts` 与 `shared/contracts.ts` 契约。
4. 扩展后台单一编辑面板，加入结构化作品信息编辑区。
5. 扩展首页作品卡，轻量展示作品元信息和精选逻辑。
6. 在新增作品信息 UI 中显著运用或贴近 `animal-island-ui` 的组件与视觉语言。

不包含范围：

- 公益曝光模块。
- 作品详情页或 `/sites/[slug]` 静态路由。
- Worker 状态代理、复杂监控历史图表或截图兜底。
- 多用户、权限系统、评论、点赞、收藏等社区能力。
- Cloudflare dashboard、域名、账号级配置变更。

## Non-Negotiable Constraints

- Next.js 16 App Router 必须继续支持 `output: "export"` 静态导出。
- Cloudflare Worker 必须继续负责管理员认证、站点 CRUD 和敏感逻辑。
- 本阶段必须保留 live iframe 作为核心展示能力。
- 新字段都是公开作品信息，不得承载密钥、后台密码、token 或其他 secrets。
- 前端不得引用 `ADMIN_PASSWORD`、`SESSION_SECRET` 或 Worker-only secret。
- 现有站点记录在 migration 后必须继续可读取、可编辑、可展示。
- D1 migration 必须低风险，不做从旧字段自动推导作品信息的复杂回填。

## Data Model

新增 migration 文件为 `worker/migrations/0002_portfolio_fields.sql`，只对既有 `sites` 表执行 `ALTER TABLE ... ADD COLUMN`。

新增列：

- `summary TEXT NOT NULL DEFAULT ''`
- `tags TEXT NOT NULL DEFAULT '[]'`
- `tech_stack TEXT NOT NULL DEFAULT '[]'`
- `is_featured INTEGER NOT NULL DEFAULT 0`
- `repo_url TEXT`
- `fallback_url TEXT`

`tags` 和 `tech_stack` 在 D1 中存储 JSON 字符串。Worker 负责 parse/stringify，API 对前端返回 `string[]`。如果 D1 中的 JSON 为空、损坏、不是数组或数组项不是字符串，API 必须容错返回 `[]`，不能让单条脏数据破坏整个列表。

`summary` 是一句话简介，可以为空。建议最大长度为 120 个字符，Worker 和前端都应校验。

`repo_url` 和 `fallback_url` 可以为空。非空时必须是 `https://` 绝对 URL。

`is_featured` 是宽松标记。数据库允许多条记录为精选，不增加唯一索引，也不在保存一条记录时暗中修改其他记录。

本阶段不新增索引。标签筛选、精选查询和技术栈筛选仍在前端基于公开列表派生，等后续出现真实后端查询需求时再加索引。

## API Contract

`SiteRecord` 增加：

- `summary: string`
- `tags: string[]`
- `techStack: string[]`
- `isFeatured: boolean`
- `repoUrl: string | null`
- `fallbackUrl: string | null`

`SitePayload` 增加同名字段，并以 camelCase 作为前端和 Worker route 的 JSON 契约。

Worker 的 `SiteRow` 增加对应 snake_case 字段。`listSites()` 的 `SELECT` 必须包含所有新列，`handleGetSites()` 映射为 camelCase API 字段。

创建和更新仍走现有 authenticated CRUD API，不新增专用作品字段 API。`handleCreateSite()` 和 `handleUpdateSite()` 应 normalize payload：

- `summary` trim。
- `tags` 和 `techStack` trim 每一项、去空值、去重，并限制为字符串数组。
- `repoUrl` 和 `fallbackUrl` trim；空字符串写入 `null`。
- `isFeatured` 写入 `1` 或 `0`。
- 写入 D1 前将 `tags` 和 `techStack` stringify 为 JSON 字符串。

Worker 校验必须覆盖：

- `summary` 不超过 120 个字符。
- `tags` 和 `techStack` 必须是字符串数组。
- `repoUrl` 和 `fallbackUrl` 非空时必须是 `https://` 绝对 URL。
- 原有 `name`、`slug`、`url` 必填与 `https://` 校验继续有效。

公开 `/sites` 返回新字段。由于这些字段是作品展示信息，公开接口可以返回它们。

## Featured Selection

首页 featured 逻辑从“永远使用排序第一项”升级为：

1. 在当前过滤后的站点列表中寻找第一个 `isFeatured === true` 的站点。
2. 如果找到，将它作为 featured card。
3. 如果没有精选，回退到过滤后列表的第一项。
4. 普通列表排除 featured 那一项，避免重复展示。

排序仍以 API 返回顺序为准，即 `sort_order ASC, id ASC`。本阶段不做多精选区域，也不强制后台保持数据库中最多一个精选。

## Admin Editing Experience

后台沿用 Phase 1-3 的单一编辑面板，不新增页面或弹窗。

`AdminSiteForm` 在现有基础字段下新增“作品信息”分区，字段包括：

- 一句话简介 `summary`
- 标签 `tags`
- 技术栈 `techStack`
- 源码地址 `repoUrl`
- 备用访问地址 `fallbackUrl`
- 精选开关 `isFeatured`

`tags` 和 `techStack` 使用结构化 chip 输入：输入框录入一项，按 Enter 或点击添加后变成 chip；每个 chip 可以删除。提交前统一 trim、去空值、去重。数组顺序按用户添加顺序保存。

第一版不做：

- 拖拽排序。
- 自动标签推荐。
- 全局标签管理。
- 从已有站点自动推断技术栈。

`repoUrl` 和 `fallbackUrl` 独立校验。留空时写入 `null`。`fallbackUrl` 不自动等于主 `url`，因为它的语义是 iframe 不可用时的备用入口。

`isFeatured` 是普通开关。后台文案必须说明：可以标记多个精选，首页只展示当前筛选范围内排序最靠前的精选。

## Animal Island UI Requirement

Phase 4 必须让用户在登录页之外明显感知到 `animal-island-ui` 或其设计语言。

明确要求：

- 后台“作品信息”分区是 `animal-island-ui` 的第二个真实使用场景。
- 该分区优先使用 `animal-island-ui` 的 Card、Button、Input 或可用表单组件。
- 如果组件库没有合适的 chip/tag 输入组件，可以用本地 React 状态实现交互，但视觉应贴近 `animal-island-ui` 的温暖、游戏化、卡片和标签质感。
- 首页作品卡的 tags、techStack、repoUrl 按钮应使用或模仿 `animal-island-ui` 的标签和按钮风格。
- `animal-island-ui` 不接管 live iframe、状态合并、Worker API 或 D1 逻辑。

验收标准：Phase 4 完成后，`animal-island-ui` 不应只出现在 `AdminLoginForm`。至少后台作品信息编辑区和首页作品元信息展示区应能明显看到它的组件或视觉语言。

## Homepage Display

首页保持 Phase 1-3 的结构：`HomePage` 外壳、`PortfolioGridClient` 数据加载和过滤、`BentoGrid` 分配 featured 与普通列表、`LiveProjectCard` 渲染作品窗口。

`LiveProjectCard` 使用 `summary` 作为主要一句话介绍。如果 `summary` 为空，则回退 `description`。

`tags` 以轻量标签展示，建议最多显示 4 个。`techStack` 以紧凑技术栈行或 chip 展示，建议最多显示 5 个。超出数量时可以显示“+N”或类似克制提示，但不得让卡片变成标签墙。

`repoUrl` 有值时显示“源码”入口，打开新标签。

`fallbackUrl` 有值时，访问按钮在 iframe 未加载、离线或访问异常语境下优先指向 `fallbackUrl`；否则继续使用主 `url`。本阶段不新增复杂 iframe 失败检测，也不代理渲染 fallback。

状态监控仍是辅助信息。新增作品元信息不能把页面重新推回监控仪表盘，也不能压过 live iframe 作品窗口。

移动端优先展示 name、summary、状态和访问按钮。tags 与 techStack 可以换行，但不得造成按钮挤压、文本溢出或卡片高度失控。

## Error Handling

前端表单本地校验覆盖：

- `summary` 长度。
- `tags` 和 `techStack` 空值、重复项、非字符串异常状态。
- `repoUrl` 和 `fallbackUrl` 必须为可空的 `https://` 绝对 URL。

Worker 是最终校验边界。即使前端漏掉，也必须拒绝非法 payload，并返回稳定错误字符串供前端映射为中文提示。

D1 读取时必须容错。`tags` 或 `tech_stack` JSON 损坏时，对应 API 字段返回 `[]`，并继续返回其他站点字段。

新增字段错误不能影响原有认证边界。未登录请求仍返回 Unauthorized；后台 UI 仍映射为中文会话过期提示。

## Testing And Validation

本阶段完成前至少运行：

- `npm run test:admin` 或新增等效测试命令。
- `npm run lint`
- `npm run build`
- `cd worker; npm run typecheck`

涉及 D1 migration，必须额外提供本地 migration 验证记录。优先验证方式是对本地 D1 或等效 SQLite/D1 环境执行 `0002_portfolio_fields.sql`，确认旧 `sites` 表可升级，新字段默认值正确，旧记录仍能被读取。

如果当前环境无法运行真实 D1 migration，必须在交付记录中明确标记 `validation_limited`，并提供用户可执行的 wrangler/D1 验证命令。

测试覆盖建议：

- Worker normalize 和 validation：summary 长度、tags/techStack 数组、JSON stringify、repo/fallback URL、旧字段校验。
- D1 row 到 API record 映射：snake_case 到 camelCase，JSON parse 容错，默认值。
- 前端表单：chip 添加/删除/去重、payload 构造、URL 校验、精选开关。
- 首页逻辑：featured 选择、featured 去重、summary fallback、repo/fallback 入口选择。
- 生产路径：创建带新字段的站点、读取公开列表、编辑新字段、首页展示新信息、删除不受影响。
- UI 验收：后台作品信息编辑区和首页作品元信息展示区明显使用或贴近 `animal-island-ui`，且没有破坏 mobile 布局。

## Review Requirements

实现完成后必须进行独立审查或最强可用审查，重点检查：

- migration 是否只新增低风险列，并保持旧记录兼容。
- Worker API 是否把 D1 JSON 字符串稳定 normalize 成前端数组。
- 新字段是否没有承载 secrets，也没有把 Worker secret 引入前端。
- 后台 chip 编辑和 URL 校验是否同时有前端校验与 Worker 校验。
- featured 逻辑是否按“当前过滤范围内排序最靠前精选，否则第一项”执行。
- 首页是否轻量展示作品信息，而不是挤压 live iframe 或变成标签墙。
- `animal-island-ui` 是否在后台作品信息区和首页作品元信息区形成可感知运用。
- build、lint、typecheck、测试和 migration 验证证据是否真实存在。

## Out Of Scope

- 公益曝光模块真实数据源、后台配置和曝光计数。
- 作品详情页或静态详情路由。
- 复杂监控历史图表或 Worker `/status` proxy。
- 多用户、权限系统、评论、点赞、收藏。
- 自动推断 tags 或 techStack。
- 对所有第三方网站强行截图、代理渲染或绕过 iframe 限制。
