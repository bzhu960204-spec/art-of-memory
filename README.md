# Art of Memory · 闪电记忆大师

本地运行的记忆力训练系统（记忆宫殿 / 记忆运动），包含 12 个训练与统计模块：

| 模块 | 说明 |
| --- | --- |
| 训练仪表盘 | 训练趋势、各模块表现、薄弱项目、个人最佳，可一键导出全部数据 |
| 数字编码大师（PAO） | 00–99 人物-动作-物品编码闪卡，按间隔重复（SM-2）安排复习 |
| 物品编码系统 | 00–99 物品编码训练 + 编码配置/导入导出，到期卡片优先、按熟练度加权抽题 |
| 随机词组 / 扑克 / 数字马拉松 / 数字记忆 | 经典记忆运动项目 |
| 人脸名字 / 文章段落 / 二进制与日期 | 其他记忆项目 |
| 记忆宫殿图库 | 上传、浏览自己的宫殿图片 |
| 挑战与成就 | 每日挑战、连续训练天数、成就徽章 |

技术栈：Spring Boot 4 + Spring Data JPA + H2（后端），React 19 + Vite + Tailwind CSS（前端）。

---

## 快速启动（开发模式）

环境要求：JDK 17+、Node.js 20.19+（推荐 22）。无需单独安装 Maven，项目自带 Maven Wrapper `backend/mvnw`。

```bash
# Windows：同时启动前后端（端口被占用时会自动换端口）
start-dev.cmd
# 停止
powershell -File stop-dev.ps1
```

打开 `http://localhost:5173` 即可使用（前端通过代理访问 `http://localhost:8080` 的后端）。页面地址带有模块路由（如 `#/pao`），刷新后会停留在当前模块。

## 打包成单个 jar（无需 Node.js 运行）

```powershell
.\build-release.ps1          # 构建前端并打进后端 jar，可加 -SkipTests 跳过测试
java -jar backend\target\lightning-memory-master-1.0.0.jar
```

然后打开 `http://localhost:8080`。建议同时设置 `APP_DATA_DIR`（见下文），否则数据目录相对于当前工作目录。

---

## 项目结构

```text
backend/    Spring Boot 后端（controller → service → repository，dto 为请求/响应类型）
frontend/   React 前端（modules/ 各训练模块，hooks/ 通用 Hook，constants/ 模块元数据，api/ 请求封装）
docs/       文档，包括优化清单 optimization-plan.md
```

API 文档（Swagger UI）：后端启动后访问 `http://localhost:8080/swagger-ui/index.html`。

---

## 数据存放位置

- H2 数据库与记忆宫殿上传图片都保存在 **数据目录** 中，默认是 `backend/data/`。
- 可通过环境变量 `APP_DATA_DIR` 指定其他目录（建议使用绝对路径），例如：`$env:APP_DATA_DIR = "D:\memory-data"`。
- 数据目录 **不会提交到 Git**，请自行备份该目录，或在「训练仪表盘」点击 **⬇ 导出数据** 下载全部数据的 JSON（不含图片文件）。
- 首次启动时如果数据库为空，会自动写入默认的 PAO 编码、词库和物品编码（见 `backend/src/main/resources/data.sql`），已有数据不会被覆盖。
- 训练参数（数量、记忆时间等）保存在浏览器 `localStorage` 中。

---

## 测试与代码检查

```bash
# 后端测试（使用内存数据库，不会影响真实数据）
cd backend
mvnw.cmd test

# 前端
cd frontend
npm run lint   # ESLint
npm test       # Vitest
```

推送到 GitHub 后，`.github/workflows/ci.yml` 会自动运行以上检查和前端构建。

---

## 物品编码（00–99 Object System）导入格式

在「物品编码配置」页面点击「导入 JSON」按钮，粘贴以下任意格式的 JSON 即可批量导入。

### 格式一：数组（推荐，支持联想提示）

```json
[
  {"numberString": "00", "objectName": "铃铛", "hint": "铃铛摇一摇"},
  {"numberString": "01", "objectName": "烟斗", "hint": ""},
  {"numberString": "02", "objectName": "恩人", "hint": ""},
  {"numberString": "03", "objectName": "扇子", "hint": ""},
  {"numberString": "04", "objectName": "司机", "hint": ""},
  {"numberString": "05", "objectName": "手套", "hint": ""},
  {"numberString": "06", "objectName": "勺子", "hint": ""},
  {"numberString": "07", "objectName": "气球", "hint": ""},
  {"numberString": "08", "objectName": "手铐", "hint": ""},
  {"numberString": "09", "objectName": "球棒", "hint": ""}
]
```

| 字段           | 说明               | 是否必填 |
| -------------- | ------------------ | -------- |
| `numberString` | 两位编号，如 `"07"` | ✅ 必填   |
| `objectName`   | 物品名称           | ✅ 必填   |
| `hint`         | 联想提示（备注）   | 可留空   |

### 格式二：简写对象

```json
{
  "00": "铃铛",
  "01": "烟斗",
  "02": "恩人"
}
```

### 格式三：对象带提示

```json
{
  "00": {"objectName": "铃铛", "hint": "铃铛摇一摇"},
  "01": {"objectName": "烟斗", "hint": ""}
}
```

> **提示**：导入只会覆盖 JSON 中出现的编号，未出现的编号保持原样不变。

---

## 物品编码的备份与恢复

- 在「物品编码配置」页点击「导出 JSON」可将当前所有编码导出为文件（同样遵循格式一）。
- 将导出文件内容粘贴到导入弹窗即可恢复。
- 如需备份全部训练数据，请使用仪表盘的「⬇ 导出数据」（见上文「数据存放位置」）。
