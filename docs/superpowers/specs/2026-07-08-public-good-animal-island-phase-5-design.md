# Phase 5 设计：公益公告与 Animal Island 页面级强化

日期：2026-07-08

状态：已由用户确认设计方向，待转为执行任务。

## 1. 背景

项目已经完成 Phase 1-4 的基础闭环：Next.js 静态前端、Cloudflare Worker、D1 站点 CRUD、管理员登录、公开站点列表、UptimeFlare 状态合并、live iframe 作品卡，以及作品元信息字段。

当前问题不是“是否引入了 `animal-island-ui`”，而是用户从首页和后台截图中仍然感到整体像 demo：页面级视觉语言仍偏网格纸、硬边框、监控面板，Animal Island 只在登录页、局部表单、标签和按钮上形成点状使用。Phase 5 需要把 Animal Island 从组件使用提升为页面感知。

本阶段同时落地公益模块。公益模块接入《姬长信 API公益中国》文档中的接口，用于展示宝贝回家/公益寻亲信息：

- API：`GET https://api.isoyu.com/gy/api.php`
- 主要字段：`id`、`name`、`sex`、`birth_time`、`lost_time`、`child_pic`、`lost_place`、`url`、`child_feature`、`contacts`
- iframe/widget/JS 嵌入方式存在，但本阶段选择自定义渲染，不直接使用外部 iframe widget。

## 2. 目标

1. 在首页首屏之后、作品列表之前新增“公益公告”模块。
2. 公益数据通过 Worker 代理接入第三方 API，不让浏览器直接依赖第三方 CORS 和稳定性。
3. 每个缓存周期展示一组 5 条公益数据，而不是单条数据。
4. 公益模块采用“5 个头像 + 1 个详情告示牌”的交互样式。
5. 对首页和后台做页面级 Animal Island 视觉强化，让用户第一眼感知项目不再是 demo 面板。
6. 保留现有核心架构：Cloudflare Pages 静态导出、Worker API、D1 数据模型、live iframe 作品展示、UptimeFlare 状态合并。

## 3. 非目标

1. 不把公益模块做成后台可配置 CMS。
2. 不新增公益曝光统计。
3. 不使用第三方公益 iframe widget 作为默认实现。
4. 不重写 Worker 鉴权、站点 CRUD、D1 作品模型。
5. 不移除 live iframe 作品卡。
6. 不把 UptimeFlare 状态重新变成首页主视觉。
7. 不把后台改造成多用户系统。

## 4. 已确认产品决策

### 4.1 范围

本阶段采用“公益模块 + 首页 + 后台一起强化”的范围：

- 公益模块必须完整进入首页真实渲染路径。
- 首页需要明显岛屿化，不能只局部替换按钮。
- 后台需要从裸表格/表单 demo 感转向“岛务管理所”语义，但不牺牲维护效率。

### 4.2 视觉强度

采用“明显岛屿化”：

- 首页是“作品小岛”，作品像岛上的小屋或窗口。
- 公益模块像岛上的公共告示牌。
- 后台是“岛务管理所”。
- 视觉上使用 `animal-island-ui` 的温暖纸质、圆润、轻游戏化风格；布局和业务逻辑仍由本项目控制。

### 4.3 公益 API 接入方式

采用 Worker 代理：

- 前端请求项目 Worker 的公开只读端点，例如 `/public-good`。
- Worker 请求 `https://api.isoyu.com/gy/api.php`。
- Worker 对第三方响应做字段筛选、结构校验、URL 校验、文本裁剪和 fallback。
- 前端只消费项目定义的稳定 DTO，不直接依赖第三方原始字段。

### 4.4 公益展示位置

公益模块放在首页首屏之后、作品列表之前：

- 足够可见。
- 不抢首页品牌首屏。
- 不混入作品卡片网格，避免像广告卡。

### 4.5 公益数据轮换

采用按缓存周期轮换：

- 默认缓存周期：6 小时。
- 每个缓存周期展示一组 5 条数据。
- 同一缓存周期内用户看到稳定的一组数据。
- 不做每次刷新都强制请求第三方接口，避免给第三方 API 带来不必要压力。

### 4.6 公益展示形态

采用“5 个头像 + 1 个详情告示牌”：

- 默认显示 5 个圆形头像入口。
- 用户选择或悬停头像时，显示对应详情告示牌。
- 详情告示牌展示照片、姓名、走失时间、走失地点、特征摘要、来源和“查看详情”。
- 移动端不依赖 hover，使用点击切换；头像可横向滚动或自动换行，详情牌在头像下方显示。

## 5. 公益数据设计

### 5.1 Worker DTO

Worker 对外返回稳定结构：

```ts
type PublicGoodPerson = {
  id: string;
  name: string;
  sex: string;
  birthTime: string;
  lostTime: string;
  childPic: string | null;
  lostPlace: string;
  childFeature: string;
  detailUrl: string | null;
};

type PublicGoodContacts = {
  consultMail: string;
  tel: string;
};

type PublicGoodBatch = {
  success: boolean;
  items: PublicGoodPerson[];
  contacts: PublicGoodContacts | null;
  sourceName: string;
  sourceApi: string;
  cachedAt: string;
  cacheTtlSeconds: number;
  isFallback: boolean;
  message?: string;
};
```

### 5.2 批量获取

第三方接口单次示例返回一条数据。Worker 为了组成 5 条数据，应执行有限次数请求：

1. 每次缓存刷新最多请求 8 次第三方 API。
2. 按 `id` 去重，收集到 5 条即停止。
3. 如果第三方接口返回重复数据或失败，只保留有效项。
4. 如果有效项少于 5 条，优先使用上一轮缓存补齐。
5. 如果没有上一轮缓存，使用本地 fallback 数据结构补齐，并显式标记 `isFallback: true` 或在 item 层面标记来源异常。

### 5.3 缓存策略

默认 6 小时缓存一次：

- `PUBLIC_GOOD_CACHE_TTL_SECONDS` 可作为 Worker 环境变量，默认 `21600`。
- Worker 端优先使用 Cloudflare Cache API 或模块级内存缓存；若当前 Worker 部署路径不适合 Cache API，可先使用模块级内存缓存并在文档中标注限制。
- 缓存命中时不请求第三方 API。
- 缓存刷新失败时返回上一轮缓存，并带上 `message`。
- 不因为第三方 API 失败导致首页整体失败。

### 5.4 字段校验与安全

Worker 必须执行以下保护：

- `detailUrl` 和 `childPic` 只接受 `https://` URL；非法值置为 `null`。
- 文本字段去除首尾空白并裁剪长度：
  - `name`：40 字符以内。
  - `lostPlace`：120 字符以内。
  - `childFeature`：240 字符以内。
- 不把第三方原始 JSON 整包透传给前端。
- 不记录或暴露任何密钥；该公益 API 当前不需要密钥。
- 响应头允许当前前端域读取，遵循项目已有 CORS 策略。

## 6. 首页设计

### 6.1 信息架构

首页结构调整为：

1. 第一屏：品牌主信号“小茄的网站小岛”。
2. 第一屏辅助：作品集说明、轻量状态提示、精选作品窗口。
3. 首屏之后：公益公告模块。
4. 公益模块之后：作品列表、分类过滤和其他作品卡。

状态统计不能再呈现为 dashboard 指标条，应作为轻量岛屿信息或小型说明出现。

### 6.2 公益公告模块

模块标题使用“公益公告”或同义中文，只保留来源说明和详情入口，不添加额外口号。

桌面端：

- 左侧或上方显示 5 个圆形头像入口。
- 当前选中头像有 Animal Island 风格描边、投影或轻微浮起状态。
- 详情告示牌展示选中数据。
- 详情告示牌需要有照片，但照片不做夸张视觉处理。
- “查看详情”使用 `animal-island-ui` 的 Button 或同风格按钮。

移动端：

- 头像入口使用横向滚动或多行换行，不能挤压变形。
- 详情告示牌在头像下方完整显示。
- 不依赖 hover。
- 文本必须不溢出、不遮挡照片和按钮。

### 6.3 作品卡继续强化

作品卡仍然以 live iframe 为核心，但视觉上继续远离监控窗口：

- 减少硬网格和生硬边框。
- 使用纸质面板、圆润按钮、标签、轻投影和告示牌层级。
- 状态 pill 保留，但视觉优先级低于作品名称、简介、标签和访问入口。
- 保持 iframe `loading="lazy"`、交互开关、离线/未知状态 fallback、访问网站入口。

## 7. 后台设计

后台不做 CMS 重写，继续保持：

- 单管理员登录。
- 未登录只显示密码输入。
- 登录后显示站点列表、当前编辑面板、打开站点、删除确认、保存/失败反馈。
- 继续使用现有 Worker CRUD。

页面语义强化为“岛务管理所”：

- 顶部工作台标题和快捷动作不再像裸 demo header。
- 站点列表使用 Animal Island 风格表格或本地同风格管理列表。
- 当前编辑面板使用 `animal-island-ui` 的 Card、Input、Button、Select、Switch、Tag 等可用组件。
- 删除确认优先使用 `animal-island-ui` Modal；若 Modal 不适合当前 React/Next 路径，可用本地同风格确认面板。
- 表单错误继续使用清晰中文提示。

后台视觉强化必须服务效率：

- 不隐藏关键字段。
- 不牺牲编辑、保存、取消、删除的可达性。
- 移动端可以纵向维护站点，不发生按钮压缩、文本溢出或表单重叠。

## 8. Animal Island 使用要求

本阶段需要把 `animal-island-ui` 从局部点状使用提升为可感知的页面语言。

优先直接使用：

- `Button`
- `Input`
- `Card`
- `Tag`
- `Select`
- `Switch`
- `Modal`
- `Table`
- `Loading`
- `Tooltip`

如果库组件不满足复杂布局，允许使用本地 CSS 构建页面级结构，但必须遵守同一视觉方向：

- 温暖纸质底色。
- 圆润但不臃肿的边角。
- 明确的按钮层级。
- 轻游戏化但克制的动效。
- 避免冷冰冰的监控面板视觉。

必须保留 `animal-island-ui/style` 的根样式导入。由于该库使用 CC-BY-NC-4.0，README 或页面 footer 应保留合适署名和非商业使用说明；若项目未来商业化，需要重新确认授权。

## 9. 错误处理

### 9.1 公益模块

- Worker 请求第三方接口失败：返回上一轮缓存或 fallback batch。
- 第三方返回结构异常：过滤无效项，不透传异常结构。
- 图片加载失败：显示无照片占位，不隐藏该条数据。
- 详情链接无效：禁用“查看详情”，显示来源异常提示。
- 公益数据不足 5 条：使用缓存或 fallback 补齐，并在响应中标明。
- 前端请求 Worker 失败：显示本地 fallback 公益公告。

### 9.2 首页和后台

- 首页站点列表失败时，不能影响公益模块的 fallback 展示。
- 公益模块失败时，不能影响作品列表。
- 后台 CRUD 错误继续显示中文反馈。
- Animal Island 组件异常或样式污染不得破坏 live iframe、状态合并、Worker API 或 D1 路径。

## 10. 测试与验收

### 10.1 自动验证

按改动范围执行：

- `npm run test:admin`
- `npm run lint`
- `npm run build`
- Worker 相关 typecheck 或测试命令

新增或调整测试应覆盖：

- Worker `/public-good` 返回稳定 DTO。
- Worker 5 条 batch 去重和不足补齐。
- Worker 缓存命中时不重复请求第三方 API。
- 第三方失败时返回缓存或 fallback。
- 前端公益模块能渲染 5 个头像和当前详情告示牌。
- 移动端公益模块不依赖 hover。
- 首页公益模块位于首屏之后、作品列表之前。
- 后台继续维持未登录隔离和登录后 CRUD 结构。
- `animal-island-ui` 使用不接管 live iframe、状态合并、Worker API 或 D1 逻辑。

### 10.2 浏览器验收

需要在桌面和移动端检查：

- 首页第一眼能感知“小茄的网站小岛”，不是监控 demo。
- 公益公告位出现在首屏之后、作品列表之前。
- 公益模块一次显示 5 个头像入口。
- 点击头像后详情告示牌切换到对应数据。
- 公益照片、姓名、走失时间、走失地点、特征摘要、来源、查看详情均可读。
- 后台登录后不再像裸表格/表单 demo，而是清晰的“岛务管理所”工作台。
- 无横向滚动。
- 无明显文本重叠。
- 无按钮被压缩到不可读。
- 浏览器 console 无新增 error。

## 11. 成功标准

Phase 5 完成后，应满足：

1. 用户不需要查看源码，也能明显感知 Animal Island 元素已经进入项目整体 UI。
2. 公益模块不是广告位，而是自然融入首页的公共公告。
3. 公益模块通过 Worker 接入真实 API，并以 5 条数据 batch 展示。
4. API 波动、图片失败、链接异常都不会破坏首页。
5. 首页、公益模块、作品列表、后台在视觉上属于同一个产品，而不是几个 demo 拼在一起。
6. 现有作品集核心能力和后台 CRUD 不回退。
