# 闪电记忆大师 · 项目优化清单

> 评审日期：2026-10-31
> 范围：后端（Spring Boot + JPA + H2）、前端（React 18 + Vite + Tailwind）、仓库与工程化、训练体验。
> 优先级：**P0** = 功能缺陷 / 数据风险，应优先修复；**P1** = 明显影响可维护性或体验；**P2** = 锦上添花。
> 每一项都带编号，方便我们按编号逐步推进、勾选完成状态。

---

## 0. 总览

| 维度 | 现状概括 | 主要问题 |
| --- | --- | --- |
| 功能正确性 | 13 个训练模块基本可用 | 成就系统永远不会解锁；连续训练逻辑重复；部分模块数据未纳入统计 |
| 数据与仓库 | H2 数据库文件、上传图片直接提交到 Git | 二进制文件频繁变更、克隆后依赖提交的 DB 才能使用，`schema.sql`/`data.sql` 实际未生效 |
| 后端架构 | Controller 直接操作 Repository，部分业务写在 Controller | 业务逻辑重复、实体直接作为请求体、无参数校验、统计在内存中计算 |
| 安全 | 本地使用为主 | H2 Console 无密码开启、前端 dev server 绑定 `0.0.0.0`、CORS 过宽、上传扩展名未白名单 |
| 前端架构 | 单一 `App.jsx` + 13 个 300~600 行的大组件 | 常量/计时器/洗牌逻辑多处重复，无路由，无懒加载，错误被静默吞掉 |
| 性能 | 数据量小，暂无明显瓶颈 | 计时器用 RAF 每帧 `setState`；统计接口全量加载记录 |
| 工程化 | 无测试、无 Lint、无 CI、无 Maven Wrapper | 重构缺乏安全网；依赖版本偏旧（Spring Boot 3.2 已停止 OSS 支持） |
| 训练体验 | 有错题、权重机制 | 无间隔重复（SRS）；每日挑战只是一个标签；错题永不衰减 |

---

## 1. 功能缺陷（Bug）

- [x] **B1 (P0) 成就系统永远不会解锁**
  - 成就进度只在 [`ChallengeController.submitDaily`](../backend/src/main/java/com/memory/controller/ChallengeController.java) 中更新，但前端从未调用 `api.submitDailyChallenge`（仅在 [`api/index.js`](../frontend/src/api/index.js) 中定义）。
  - 训练保存走的是 [`TrainRecordService.save`](../backend/src/main/java/com/memory/service/TrainRecordService.java)，它只更新连续训练和每日挑战，不检查成就。
  - 建议：把"保存训练记录 → 更新连续天数 → 更新每日挑战 → 检查成就"统一放到一个领域服务中，删除 `submitDaily` 或让它复用同一服务。
  - ✅ 已完成：`TrainRecordService.save` 统一调用 `StreakService` / `DailyChallengeService` / `AchievementService`；成就进度由数据推导（训练总数、满分次数、最长连续天数），启动时自动回填历史；`/challenge/daily/submit` 已删除。

- [x] **B2 (P0) 连续训练（Streak）逻辑重复且 GET 有副作用**
  - `updateStreak()` 在 `TrainRecordService` 和 `ChallengeController` 各有一份。
  - `GET /api/challenge/streak` 会把 `currentStreak` 改成 0 并写库——GET 不应修改数据，应在读取时"计算"展示值。

- [x] **B3 (P0) 训练记录接口可覆盖已有数据**
  - `POST /api/records/save` 直接以 `TrainRecord` 实体作为 `@RequestBody`，请求中若带 `id`，JPA 会执行 merge 覆盖已有记录。
  - 建议：引入请求 DTO（不含 `id`/`createdTime`），并校验 `moduleType` 必须是已知枚举、数值字段非负。

- [x] **B4 (P1) 部分模块的训练数据未纳入统计**
  - 前端会保存 `TEXT`、`NAMES`、`BINARY`、`DATES` 记录，但 [`AnalyticsController.getBests`](../backend/src/main/java/com/memory/controller/AnalyticsController.java) 只统计 5 个模块，仪表盘 / 成就页的 `MODULE_NAMES` 也只有 5 个。
  - [`NumberMemory.jsx`](../frontend/src/modules/NumberMemory.jsx) 只把成绩写在 `localStorage`，从不调用 `saveRecord`，仪表盘看不到。
  - ✅ 已完成：前后端均覆盖 10 个模块类型；数字记忆训练新增 `NUM_MEMORY`，按逐位正确率上报（本地历史记录保留）。

- [x] **B5 (P1) 物品编码权重在切换模块时丢失**
  - [`ObjectTrainer.jsx`](../frontend/src/modules/ObjectTrainer.jsx) 仅在 `beforeunload` 时用 `sendBeacon` 补交权重；在侧边栏切换模块会卸载组件，但不会触发 `beforeunload`，未完成的一轮权重变更丢失。
  - 建议：在组件卸载的 cleanup 中也提交，或每题评分后即时提交（数据量很小）。
  - ✅ 已完成：卸载时也会提交。另修复了一个相关 Bug：一轮结束后权重已提交但未清空，此时关闭标签页会被 `sendBeacon` 再提交一次（权重变化被重复计算）。

- [x] **B6 (P1) 在 `setState` 更新函数内产生副作用**
  - 多个模块（如 [`NamesAndFaces.jsx`](../frontend/src/modules/NamesAndFaces.jsx)、`TextMemory`、`SpeedNumbers`、`BinaryDatesTrainer`）在 `setCountdown(prev => { ...; goToRecall(); ... })` 中调用切换状态函数。React StrictMode 下更新函数会被调用两次，存在重复触发风险。
  - 建议：倒计时到 0 用独立 `useEffect` 监听 `countdown === 0` 再切换阶段。
  - ✅ 已完成：新增 `hooks/useCountdown`，4 个模块统一使用；ESLint `exhaustive-deps` 警告已全部清零。

- [x] **B7 (P2) 洗牌算法有偏差**
  - `NamesAndFaces.jsx` 使用 `sort(() => Math.random() - 0.5)`，分布不均匀。项目中已有 Fisher–Yates 实现（`ObjectTrainer.shuffle`、`BinaryDatesTrainer.shuffleArray`），应抽为公共工具。

- [x] **B8 (P2) 前端错误提示会被通知两次 / 非 JSON 响应提示不友好**
  - [`api/index.js`](../frontend/src/api/index.js) 中业务错误先 `notifyError` 再 `throw`，`catch` 里只要消息不含"请求失败"就会再通知一次。
  - 后端未启动时代理返回 HTML/空响应，`response.json()` 抛出 `Unexpected token` 之类的原始错误。
  - `uploadPalaceImage` 绕过了统一的 `request()`。

- [x] **B9 (P2) 每日挑战并发创建**
  - `GET /daily` 与保存训练记录都可能"查不到就创建"今日挑战，存在并发重复插入的可能；创建逻辑也重复了两份（模块轮换数组写了两遍）。
  - ✅ 创建逻辑已合并到 `DailyChallengeService.getOrCreate`。并发唯一约束暂未加（单用户本地应用，风险极低）。

---

## 2. 数据与仓库卫生

- [x] **R1 (P0) 数据库与上传文件不应提交到 Git**
  - `backend/data/memory_db.mv.db`、`memory_db.trace.db`、`backend/data/palaces/*.jpg` 均被跟踪；近期多次提交仅为"commit the latest data"，二进制文件无法 diff、易冲突，且 `trace.db` 是日志。
  - 建议：加入 `.gitignore` 并 `git rm --cached`；如需备份个人数据，改用"导出 JSON"或单独的备份脚本。

- [x] **R2 (P0) 种子数据实际未生效**
  - [`application.yml`](../backend/src/main/resources/application.yml) 配置了 `spring.sql.init.mode: never` + `ddl-auto: update`，因此 [`schema.sql`](../backend/src/main/resources/schema.sql)、[`data.sql`](../backend/src/main/resources/data.sql) 从不执行。新环境（没有提交的 DB 文件）启动后 PAO / 单词 / 物品编码表都是空的。
  - `schema.sql` 也已落后于实体（缺少 `achievements`、`daily_challenges`、`streak_records` 等表）。
  - 建议：引入 Flyway（推荐）管理建表 + 种子数据；或用 `CommandLineRunner` 在表为空时导入种子。

- [x] **R3 (P1) 数据库路径依赖工作目录**
  - `jdbc:h2:file:./data/memory_db` 与上传目录 `./data/palaces` 都是相对路径，从不同目录启动会生成新的空库。建议改为可配置的绝对路径（如 `${user.home}/.art-of-memory/`）或在启动脚本中固定。
  - ✅ 已完成：新增 `app.data-dir`（环境变量 `APP_DATA_DIR`），`start-dev.ps1` 默认将其设为 `backend/data` 的绝对路径；已删除过时的 `schema.sql`，`data.sql` 去掉 BOM 后随启动执行。

- [ ] **R4 (P2) 根目录 `object-codes.json` 用途不明确**
  - 看起来是物品编码的备份/示例。建议移入 `docs/` 或 `backend/src/main/resources/seed/` 作为种子数据来源，并在 README 中说明。

- [ ] **R5 (P2) 提交信息不具描述性**
  - 历史提交多为 `commit` / `commit the latest changes`。建议采用 Conventional Commits（`feat:`/`fix:`/`refactor:`/`docs:`）。

---

## 3. 后端架构与代码质量

- [x] **A1 (P1) 业务逻辑下沉到 Service 层**
  - `ChallengeController`（成就定义、连续训练、挑战）、`AnalyticsController`、`PalaceController`（文件存储）都在 Controller 里写业务逻辑。
  - 建议拆出 `ChallengeService`、`AchievementService`、`AnalyticsService`、`PalaceStorageService`。
  - ✅ 已完成：`StreakService`、`DailyChallengeService`、`AchievementService`、`AnalyticsService`、`PalaceService`、`WrongItemService`，Controller 只做参数校验和转发。

- [x] **A2 (P1) 模块类型使用枚举统一管理**
  - `"PAO"`, `"OBJECT"`, `"NUMBERS"` 等字符串散落在前后端多处；每日挑战轮换数组重复两次。
  - 建议后端定义 `ModuleType` 枚举（含是否参与每日挑战等元数据），可提供 `GET /api/meta/modules` 供前端使用。
  - ✅ 后端已完成（`common/ModuleType`，`/analytics/bests` 已覆盖全部 9 个模块）；前端常量统一见 F1。

- [x] **A3 (P1) 请求 DTO + Bean Validation**
  - 引入 `spring-boot-starter-validation`，对 `limit`、`days`、`numberString`（`^\d{2}$`）、`rating`（1~3）、`accuracy`（0~1）等加约束；`/pao/random?limit=` 与 `/words/random?limit=` 目前无上限。
  - `submitDaily` 使用 `Map<String,Object>` 接收并强转 `Number`，类型错误会变成 500。
  - ✅ 已完成：所有请求体使用 DTO + `@Valid`，`limit`/`days`/编号/评分等参数均有范围校验，非法参数返回 400。

- [x] **A4 (P1) 统一的错误处理与 HTTP 状态码**
  - [`Result.error`](../backend/src/main/java/com/memory/common/Result.java) 固定 `code=500`；Controller 中直接 `return Result.error(...)` 时 HTTP 状态是 200，而异常处理器返回 400/500，表现不一致。
  - `handleGeneral` 把 `e.getMessage()` 原样返回给前端，可能泄露内部信息。建议：业务异常类 + 错误码，未知异常只返回通用提示并记录日志。
  - 🔶 测试中新发现并已修复：兜底的 `Exception` 处理器会把不存在的接口（404）、方法不支持（405）也变成 500，现已保留原始状态码。
  - ✅ 已完成：新增 `BusinessException`（400/404），响应体 `code` 与 HTTP 状态一致；未知异常记录日志，只返回"服务器内部错误，请稍后重试"。

- [x] **A5 (P1) 消除重复代码**
  - `PaoService.processReview` 与 `ObjectService.processReview` 几乎相同（错题累加），`ReviewItem` DTO 也重复——抽出 `WrongItemService.recordFailure(module, item)`。
  - `updateAchievementProgress` 与 `incrementAchievement` 大部分逻辑相同。
  - ✅ 已完成：`WrongItemService.recordReview` 统一错题记录，`ReviewItem` 等 DTO 移到 `dto` 包；成就逻辑已在第 3 步合并。

- [x] **A6 (P2) 统计在数据库端聚合**
  - `getBests` 为每个模块加载全部记录到内存再求 max/min/sum；`getWeakest` 加载全部错题后 `subList`；`/records/list?module=` 返回该模块全部记录。
  - 建议改为 JPQL 聚合查询 + `Pageable`/`Limit`。`/summary` 中热力图可复用 `/trend` 的分组结果，避免同一请求查两次。
  - ✅ 已完成：`AnalyticsService` 承接统计逻辑，个人最佳用 `GROUP BY` 聚合，错题与记录列表分页（`/records/list` 新增 `limit`，默认 20）；热力图只查询时间列。重构前后在真实数据上对比，9 个接口返回完全一致。

- [ ] **A7 (P2) 小改进**
  - 实体样板代码较多，可考虑 Java `record`（DTO）或 Lombok（实体）。
  - `ObjectService.batchUpdateWeights` 逐条 `findByNumberString`，可一次 `findAllByNumberStringIn`。
  - `ORDER BY RAND()` 在当前数据量下没问题，保留即可。
  - 时间统一使用 `Clock` 注入，便于测试"跨天"相关逻辑（连续训练、每日挑战）。
  - 🔶 部分完成：DTO 已改用 Java `record`；权重/导入改为一次 `findAllByNumberStringIn` 批量查询。`Clock` 注入与实体样板代码暂未处理。

---

## 4. 安全（本地个人工具，按风险适度处理）

> ⏭️ 第 6 步已跳过：按项目所有者决定，本项目为本地个人工具，不处理安全加固。以下条目仅作记录。

- [ ] **S1 (P1) H2 Console 默认开启且无密码**：仅在 `dev` profile 开启，或直接关闭。
- [ ] **S2 (P1) 服务暴露在局域网**：`start-dev.ps1` 用 `--host 0.0.0.0` 启动前端，后端默认监听所有网卡；配合 S1 意味着局域网内任何人可访问数据库控制台。建议默认绑定 `localhost`，需要时再通过参数开放。
- [ ] **S3 (P2) CORS 过宽**：`allowedOriginPatterns("*") + allowCredentials(true)`。前端通过 Vite 代理访问同源 `/api`，开发期其实不需要 CORS，可移除或限定为 `http://localhost:5173`。
- [ ] **S4 (P2) 上传文件扩展名未白名单**：[`PalaceController.upload`](../backend/src/main/java/com/memory/controller/PalaceController.java) 保留原始扩展名，构造一个以 JPEG 魔数开头的 `.html`/`.svg` 文件可通过校验，读取时 `probeContentType` 可能返回 `text/html`。建议根据魔数决定扩展名与 `Content-Type`，并加 `X-Content-Type-Options: nosniff`。WEBP 校验目前只检查 `RIFF`，应同时检查偏移 8 的 `WEBP`。

---

## 5. 前端架构与代码质量

- [x] **F1 (P1) 抽取共享常量**
  - `MODULE_NAMES` / `MODULE_COLORS` / 模块图标在 `App.jsx`、`AnalyticsDashboard.jsx`、`ChallengeAchievements.jsx` 中各写一份且不一致（ChallengeAchievements 里还用了一串三元表达式选图标）。
  - 建议新建 `src/constants/modules.js` 作为唯一来源（或从后端 A2 获取）。
  - ✅ 已完成。另发现并修复：仪表盘用 `` `bg-${color}-500` `` 动态拼接 Tailwind 类名，Tailwind 无法识别，进度条颜色可能缺失；现改为完整类名。

- [ ] **F2 (P1) 抽取通用 Hook 与工具**
  - `useCountdown`（倒计时，至少 5 个模块重复实现）、`useStopwatch`（PAO/Object/Cards 用 RAF 计时）、`useHotkeys`（键盘监听）、`shuffle`（Fisher–Yates）、`useTrainingSession`（CONFIG → MEMORIZE → RECALL → RESULTS 状态机 + 保存记录）。
  - 可显著缩短每个模块文件（目前多在 9~20 KB）。
  - 🔶 部分完成：`useCountdown`、`useHashRoute`、`utils/random` 已抽出；`useStopwatch` / `useHotkeys` / `useTrainingSession` 待做（可与 F5 一起处理）。

- [x] **F3 (P1) 不再静默吞错**
  - 大量 `.catch(console.error)` / `.catch(() => {})`：保存失败时用户毫无感知，训练记录可能丢失。至少应提示"成绩未保存，点击重试"。
  - Toast 定时器未在新错误到来时重置，可改为队列或简单的 Toast 组件。
  - ✅ 已完成：所有请求错误统一弹出提示（只提示一次），保存成绩失败时提示"训练成绩保存失败：…"；Toast 定时器已正确重置。"点击重试"暂未实现。

- [x] **F4 (P1) 引入路由与懒加载**
  - 当前用 `activeModule` 状态切换页面：刷新回到首页、无法收藏/分享某个模块、浏览器后退无效。
  - 建议使用 `react-router`（或轻量的 hash 路由），并对模块使用 `React.lazy` + `Suspense` 按需加载（当前打包体积约 250 KB）。
  - ✅ 已完成：轻量 hash 路由（如 `#/pao`、`#/object/config`，无新依赖）+ 懒加载，首屏 JS 从 251 KB 降到 151 KB。

- [ ] **F5 (P2) 计时器渲染性能**
  - PAO / Object / Cards 训练时用 `requestAnimationFrame` 每帧 `setElapsed`，导致整个大组件每秒重渲染约 60 次。
  - 🔶 相关 Bug 已修复：PaoTrainer 计时初值不一致导致显示负数毫秒（后台标签页可能一直为负，并会被后端校验拒绝）。逐帧重渲染本身尚未优化。
  - 建议：开始时间存 `ref`，显示部分拆成独立的小组件，或以 50~100ms 间隔刷新。

- [ ] **F6 (P2) 响应式与可访问性**
  - 侧边栏固定 `w-64`，窄屏/手机上体验差；可折叠侧边栏。
  - 纯 emoji 图标缺少 `aria-label`；`index.html` 硬编码 `class="dark"`，`darkMode: 'class'` 实际没有切换入口。

- [ ] **F7 (P2) 渐进式引入类型**
  - 已安装 `@types/react` 但项目是纯 JS。可先启用 `jsconfig` + JSDoc 检查，后续逐步迁移 TypeScript（建议从 `api/` 和共享 hooks 开始）。

---

## 6. 工程化

- [x] **E1 (P1) 测试**
  - ✅ 已完成基础设施：后端 `src/test`（`test` profile 使用内存数据库）覆盖种子数据、连续训练/每日挑战、物品权重/导入/错题、图片上传校验；前端 Vitest 覆盖 `utils/random`、API 客户端与 App 冒烟测试。后续每修一个 Bug 补对应测试。
  - 后端：添加 `spring-boot-starter-test`，优先覆盖连续训练 / 每日挑战 / 成就（跨天逻辑最易出错）、物品权重边界、上传校验。
  - 前端：Vitest + React Testing Library，覆盖共享 hooks 与评分逻辑。

- [x] **E2 (P1) Lint / 格式化**：前端 ESLint（含 `react-hooks` 规则，可发现大量依赖数组问题）+ Prettier；后端可加 Spotless 或 Checkstyle。
  - ✅ 前端 ESLint 9 已接入，现有错误已清零；剩余 5 个 `exhaustive-deps` 警告即 B6，留到前端重构时处理。Prettier / 后端格式化暂未引入（避免一次性大规模格式化 diff）。

- [x] **E3 (P1) Maven Wrapper**：添加 `mvnw`，避免依赖全局 Maven；启动脚本改用 wrapper。

- [x] **E4 (P2) CI**：GitHub Actions 运行 `mvnw verify` + `npm ci && npm run lint && npm test && npm run build`。
  - ✅ 已完成：`.github/workflows/ci.yml`（后端 JDK 17，前端 Node 22）。

- [x] **E5 (P2) 依赖升级**
  - Spring Boot 3.2.5 → 3.5.x（3.2 已停止开源支持）。
  - Vite 5 → 6/7，React 18 → 19（可选），Tailwind 3 → 4（可选，改动较大，可放最后）。
  - ✅ 已完成：评审时 3.x 也已停止开源支持，直接升级到 **Spring Boot 4.1.2**（Hibernate 7 / Jackson 3）；前端升级到 **React 19、Vite 8、Vitest 5**。重构前后 13 个接口在真实数据上的 JSON 语义完全一致（Jackson 3 仅改变了属性顺序）。React 19 使首屏 JS 增加约 23 KB（gzip），本地应用可忽略。Tailwind 4、ESLint 10 暂不升级（迁移成本高、收益小）。

- [x] **E6 (P2) 单进程发布形态（可选）**：`npm run build` 后把 `dist` 拷入 Spring Boot `static/`，打成单个 jar，双击即可使用，无需 Node 环境。
  - ✅ 已完成：`build-release.ps1` + Maven `release` profile，`java -jar` 即可访问 `http://localhost:8080`。

- [ ] **E7 (P2) 启动脚本**：`start-dev.ps1` 等待后端就绪最长 120 秒，可改为探测健康检查接口（如 Actuator `/actuator/health`）；`stop-dev.ps1` 按端口强杀进程，可能误杀占用同端口的其他程序。
  - ⏸️ 暂未处理：现有脚本可用，收益较小。

---

## 7. 训练体验与产品功能（可选增强）

- [x] **T1 (P1) 间隔重复（SRS）**：PAO / 物品编码目前是随机或简单权重抽取，错题只增不减。可引入 SM-2 / FSRS：根据评分（熟练 / 生疏 / 不会）计算下次复习时间，优先出到期卡片；答对后错题计数衰减。
  - ✅ 已完成：新增 `srs_cards` 表与 `SrsService`（SM-2：熟练=5、生疏=3、不会=1，同一轮内重复出现的卡只按首次评分计算）。PAO 使用 `/api/pao/session`、物品编码使用 `/api/srs/due` + 权重补足，到期卡片优先出现，训练时显示"含 N 张到期复习"。整轮都答对的卡错题次数 −1，降到 0 时移除。
- [x] **T2 (P1) 每日挑战真正可玩**：现在只是显示"今天的模块是 X"，`seed` 字段从未使用。可在挑战页提供"开始挑战"按钮，按 `seed` 生成固定题目，跳转到对应模块并以挑战模式计分。
  - 🔶 部分完成：挑战页新增"开始挑战 →"按钮直接跳到对应模块（成绩本来就会自动计入挑战）。按 `seed` 生成固定题目暂未实现。
- [ ] **T3 (P2) PAO 数据质量**：种子数据中 "person" 字段多为物品（如 "望远镜"、"树"），并非人物，削弱了 PAO 方法的效果；并且 PAO 编码不能像物品编码一样在界面中编辑/导入。
  - ⏸️ 属于内容决策（编码表由你决定），暂不修改。
- [x] **T4 (P2) 训练参数记忆**：各模块的配置（数量、记忆时间等）刷新后重置，可保存到 `localStorage`。
  - ✅ 已完成：`hooks/usePersistentState`，7 个模块的配置会被记住。
- [x] **T5 (P2) 数据导出 / 备份**：一键导出全部训练记录、编码、成就为 JSON，配合 R1 取代"把数据库提交到 Git"。
  - ✅ 已完成：仪表盘右上角"⬇ 导出数据"，下载 `art-of-memory-backup-YYYYMMDD.json`（`GET /api/backup/export`，不含图片文件本身）。导入功能暂未实现。
- [ ] **T6 (P2) 统计维度**：按模块的历史曲线、个人最佳的达成日期、训练时长统计等。

---

## 8. 文档

- [x] **D1 (P1) README 补充**：环境要求（JDK 17、Maven、Node 版本）、项目结构、模块介绍、数据存放位置、备份方式、常见问题（端口占用、数据库位置）。
  - ✅ 已完成：模块介绍、环境要求、开发/单 jar 两种启动方式、项目结构、数据目录与导出、测试与 CI。
- [x] **D2 (P2) API 文档**：可引入 springdoc-openapi 自动生成 Swagger UI。
  - ✅ 已完成：springdoc 3.2.0，`/swagger-ui/index.html`（28 个接口）。

---

## 9. 建议的推进顺序

每个阶段尽量独立可验证，完成一步提交一次。

| 阶段 | 内容 | 涉及条目 | 风险 | 状态 |
| --- | --- | --- | --- | --- |
| **第 1 步：打基础** | 数据库/图片移出 Git、修复种子数据初始化、固定数据目录、Maven Wrapper | R1, R2, R3, E3 | 低（需先备份现有数据） | ✅ 已完成 |
| **第 2 步：安全网** | 后端测试框架 + 前端 ESLint/Vitest，给关键逻辑补测试 | E1, E2 | 低 | ✅ 已完成 |
| **第 3 步：修复核心 Bug** | 训练记录 DTO、统一"记录→连续天数→挑战→成就"流程、模块枚举 | B1, B2, B3, B9, A2, A3 | 中 | ✅ 已完成 |
| **第 4 步：后端重构** | Service 分层、统一错误处理、去重、聚合查询 | A1, A4, A5, A6 | 中 | ✅ 已完成 |
| **第 5 步：前端重构** | 共享常量、通用 hooks、错误提示、路由 + 懒加载 | F1, F2, F3, F4, B4~B8 | 中 | ✅ 已完成 |
| **第 6 步：安全加固** | H2 Console、监听地址、CORS、上传校验 | S1~S4 | 低 | ⏭️ 跳过（不关心安全） |
| **第 7 步：体验增强** | SRS、可玩的每日挑战、数据导出等 | T1~T6 | 按需 | ✅ T1/T2/T4/T5（T3、T6 未做） |
| **第 8 步：收尾** | 依赖升级、CI、文档、单 jar 发布 | E4~E7, D1, D2 | 低~中 | ✅ 除 E7 外完成 |
