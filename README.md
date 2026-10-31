# Art of Memory

记忆宫殿训练系统，支持 PAO 编码、物品编码、单词记忆等模块。

---

## 快速启动

环境要求：JDK 17+、Node.js 18+（无需单独安装 Maven，项目自带 Maven Wrapper `backend/mvnw`）。

```bash
# Windows
start-dev.cmd
```

后端运行在 `http://localhost:8080`，前端运行在 `http://localhost:5173`（通过代理统一访问 `http://localhost:5173`）。

---

## 数据存放位置

- H2 数据库与记忆宫殿上传图片都保存在 **数据目录** 中，默认是 `backend/data/`。
- 可通过环境变量 `APP_DATA_DIR` 指定其他目录（建议使用绝对路径），例如：`$env:APP_DATA_DIR = "D:\memory-data"`。
- 数据目录 **不会提交到 Git**，请自行备份该目录（或使用下文的「导出 JSON」）。
- 首次启动时如果数据库为空，会自动写入默认的 PAO 编码、词库和物品编码（见 `backend/src/main/resources/data.sql`），已有数据不会被覆盖。

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

## 数据备份与恢复

- 点击「导出 JSON」可将当前所有编码导出为文件（同样遵循格式一）。
- 将导出文件内容粘贴到导入弹窗即可恢复。
