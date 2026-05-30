# AI PR Review 助手

AI PR Review 助手是一个面向 GitHub Pull Request 的智能代码评审辅助系统。支持输入 GitHub PR 链接后自动获取 PR 变更信息，整理 diff 上下文，调用大语言模型生成结构化 Review 报告，并在前端页面展示和复制 Markdown 报告。

## 项目背景

Pull Request Review 是团队协作开发中保障代码质量的重要环节。传统人工 Review 依赖评审者的时间、经验和注意力，在实际研发流程中经常面临 PR 改动较多、上下文理解成本高、风险点遗漏、建议不够结构化等问题。

本项目希望通过“GitHub 数据获取 + diff 上下文整理 + 大语言模型分析”的方式，辅助开发者快速理解 PR 改动内容，识别潜在风险，并生成可复制的 Markdown Review 报告，从而提升 Review 效率和一致性。

## 用户痛点

- 评审者需要在多个文件和 diff 片段之间反复切换，理解成本高。
- 大型 PR 容易遗漏边界条件、异常处理、测试覆盖等风险点。
- 人工 Review 建议风格不统一，不利于沉淀团队协作规范。
- Review 报告手动整理耗时，难以快速复制到 PR 评论区。
- 新成员对项目上下文不熟悉，难以及时给出有效 Review 意见。

## 核心功能

1. GitHub PR 链接解析：支持 `https://github.com/{owner}/{repo}/pull/{number}`。
2. GitHub API 获取 PR 信息：获取标题、描述、作者、PR 地址和 changed files。
3. diff 上下文整理：保留文件名、状态、增删行数和 patch，并对超长 patch 做截断。
4. AI Review 生成：使用 DeepSeek OpenAI 兼容接口生成结构化报告。
5. 前端报告展示：展示变更总结、风险等级、风险代码、Review 建议、测试建议和 Markdown 报告。
6. Markdown 报告复制：一键复制模型生成的 Markdown Review 报告。
7. 错误提示与兜底：对 PR 链接错误、GitHub 请求失败、模型返回非 JSON 等情况提供友好提示。

## 项目亮点

- **严格按 PR 逐步开发**：每个 PR 只完成一项独立能力，便于评审和回滚。
- **结构化模型输出**：后端要求模型返回固定字段，便于前端稳定展示。
- **上下文长度控制**：对超长 patch 做截断，降低 prompt 过长导致的响应慢和失败风险。
- **误报漏报控制**：prompt 明确要求模型基于真实 diff 输出，不臆造文件和风险。
- **良好使用体验**：前端提供 loading、错误提示、风险等级展示和 Markdown 复制能力。
- **密钥安全**：GitHub Token 和 DeepSeek API Key 均通过环境变量读取，不写死在代码中。

## 题目符合性说明

本项目针对题目要求逐项实现：

| 题目要求 | 项目实现 |
| --- | --- |
| PR 变更总结 | `summary` 字段输出 PR 改动概览 |
| 风险代码识别 | `risks` 字段输出潜在风险代码或风险点 |
| Review 建议生成 | `suggestions` 字段输出文件级或逻辑级 Review 建议 |
| 测试建议生成 | `testSuggestions` 字段输出建议补充的测试场景 |
| 模型选择 | 使用 DeepSeek `deepseek-chat`，通过 OpenAI 兼容格式调用 |
| 上下文获取方式 | 通过 GitHub REST API 获取 PR 信息和 diff patch，再构建 prompt |
| 误报与漏报控制 | 通过结构化 prompt、风险等级约束和人工复核友好报告降低误判影响 |
| 响应速度 | 对 patch 做单文件和总长度控制，避免超长 prompt |
| 使用体验 | Vue 3 页面支持输入、loading、错误提示、报告展示和 Markdown 复制 |
| 未来扩展方向 | 支持 GitHub App、自动评论、多模型评审、缓存和 CI 集成等扩展 |

## 技术架构

```text
用户浏览器
  │
  ▼
Vue 3 + Vite 前端
  │ POST /api/review/analyze
  ▼
Node.js + Express 后端
  ├─ parsePrUrl：解析 GitHub PR 链接
  ├─ githubService：调用 GitHub REST API
  ├─ chunkDiff：整理 changed files 并截断超长 patch
  ├─ promptBuilder：构建模型分析上下文
  └─ aiReviewService：调用 DeepSeek OpenAI 兼容接口
  │
  ▼
结构化 AI Review 报告
```

项目结构：

```text
.
├── frontend/          # Vue 3 + Vite 前端页面
├── backend/           # Node.js + Express 后端服务
├── docs/              # 比赛提交说明文档
├── package.json       # npm workspace 和启动脚本
└── spec.md            # 原始需求说明
```

更多设计说明见 [docs/架构设计.md](docs/架构设计.md)。

## 本地运行方式

### 1. 准备环境

建议使用 Node.js 18 或更高版本，并确认本机可以访问 GitHub API 和 DeepSeek API。

```bash
node -v
npm -v
```

### 2. 安装依赖

项目使用 npm workspace 管理前后端依赖，在仓库根目录执行：

```bash
npm install
```

### 3. 复制环境变量示例

复制前后端.env.example，并将文件名改成.env。

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Windows PowerShell：

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

### 4. 填写后端环境变量

打开 `backend/.env`，至少需要填写自己的 DeepSeek API Key：

```env
PORT=3000
CORS_ORIGIN=http://localhost:5173
GITHUB_TOKEN=
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

说明：

- `DEEPSEEK_API_KEY` 必须自行填写，否则 AI Review 接口无法生成报告。
- `GITHUB_TOKEN` 可选；不填写也可以分析公开仓库 PR，但更容易受到 GitHub API 限流影响。
- 不要把真实 API Key 写入 `.env.example`，也不要提交 `.env` 文件。

如果前端和后端不在同一开发环境，或不想使用 Vite 代理，可以在 `frontend/.env` 中配置后端地址：

```env
VITE_API_BASE_URL=http://localhost:3000
```

本地默认联调时，也可以不创建 `frontend/.env`，前端会通过 Vite 代理访问 `/api`。

### 5. 启动项目

在根目录同时启动前后端：

```bash
npm run dev
```

也可以分两个终端分别启动：

```bash
npm run dev:backend
npm run dev:frontend
```

### 6. 访问地址

- 前端：http://localhost:5173
- 后端：http://localhost:3000
- 健康检查：http://localhost:3000/api/health

### 7. 快速验证

先验证后端服务是否启动：

```bash
curl http://localhost:3000/api/health
```

再打开前端页面，输入一个 GitHub PR 链接，例如：

```text
https://github.com/qiu233333/AI-PR-Review/pull/1
```

点击“开始分析”后，系统会请求后端 `/api/review/analyze`，获取 PR 信息并生成 AI Review 报告。

## 环境变量说明

后端环境变量：

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `PORT` | 否 | 后端服务端口，默认 `3000` |
| `CORS_ORIGIN` | 否 | 允许访问后端的前端地址，默认 `http://localhost:5173` |
| `GITHUB_TOKEN` | 否 | GitHub API Token；不填写也可请求公开仓库，但更容易受到 API 限流 |
| `DEEPSEEK_API_KEY` | 是 | DeepSeek API Key，用于生成 AI PR Review 报告 |
| `DEEPSEEK_BASE_URL` | 否 | DeepSeek OpenAI 兼容 API 地址，默认 `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 否 | DeepSeek 模型名称，默认 `deepseek-v4-flash` |

前端环境变量：

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 否 | 后端 API 地址。本地联调可填 `http://localhost:3000`，不填写时使用 Vite 代理访问 `/api` |

注意：`.env` 文件不应提交到仓库，API Key 不应写死在代码或文档示例中。

## 使用示例

前端使用：

1. 打开 `http://localhost:5173`。
2. 在输入框中填入 GitHub PR 链接，例如 `https://github.com/qiu233333/AI-PR-Review/pull/1`。
3. 点击“开始分析”。
4. 等待 loading 结束后查看结构化 Review 报告。
5. 点击“复制 Markdown 报告”复制完整报告。

后端接口调用：

```bash
curl -X POST http://localhost:3000/api/review/analyze \
  -H "Content-Type: application/json" \
  -d '{"prUrl":"https://github.com/qiu233333/AI-PR-Review/pull/1"}'
```

Windows PowerShell：

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/review/analyze `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"prUrl":"https://github.com/qiu233333/AI-PR-Review/pull/1"}'
```

## Review 报告示例

接口成功后返回结构化数据：

```json
{
  "summary": "本次 PR 新增了 PR 链接解析和 Review 报告展示能力。",
  "riskLevel": "medium",
  "risks": [
    "需要关注接口异常时前端错误提示是否覆盖所有场景。",
    "超长 diff 被截断后可能影响模型对部分文件的完整判断。"
  ],
  "suggestions": [
    "建议补充错误状态下的端到端验证。",
    "建议在后续版本中增加缓存，减少重复请求 GitHub API。"
  ],
  "testSuggestions": [
    "验证合法 PR 链接可以生成报告。",
    "验证非法 PR 链接、GitHub API 限流、模型返回非 JSON 的兜底逻辑。"
  ],
  "markdownReport": "# AI PR Review 报告\n\n## 变更总结\n..."
}
```

前端会将以上字段分别展示，并支持复制 `markdownReport`。

## PR 开发过程说明

本项目按“每个 PR 只做一件事”的原则拆分开发，保证每次变更边界清晰、便于评审：

| 阶段 | PR 内容 | 说明 |
| --- | --- | --- |
| 1 | 初始化项目结构 | 创建 `frontend` 和 `backend`，完成 Vue 3 + Vite、Node.js + Express 基础骨架 |
| 2 | PR 链接解析 | 实现 `parsePrUrl`，覆盖合法链接和非法链接测试 |
| 3 | GitHub API 获取 PR 信息 | 新增 `githubService`，获取 PR 基础信息和 changed files |
| 4 | diff 上下文整理 | 新增 `chunkDiff` 和 `promptBuilder`，控制 prompt 长度 |
| 5 | AI Review 服务 | 新增 `aiReviewService`，使用 DeepSeek OpenAI 兼容接口生成报告 |
| 6 | 前端报告展示 | 完善 Vue 页面，接入 `/api/review/analyze` 并展示结构化结果 |
| 7 | Markdown 报告复制 | 增加 Markdown 报告复制按钮和复制状态提示 |
| 8 | 项目文档完善 | 补充 README 和 docs，形成比赛提交材料 |

## 模型选择说明

本项目默认使用 DeepSeek `deepseek-v4-flash` 模型。选择原因如下：

- DeepSeek 提供 OpenAI 兼容接口，后端集成成本低。
- `deepseek-v4-flash` 适合通用文本理解、代码 diff 分析和结构化输出。
- 通过 `DEEPSEEK_MODEL` 可替换模型，便于后续比较不同模型的 Review 质量。
- 通过 `response_format` 和 prompt 约束模型输出 JSON，便于前端稳定展示。

详见 [docs/模型选择说明.md](docs/模型选择说明.md)。

## 上下文获取方式

后端上下文构建流程：

1. `parsePrUrl` 解析 PR 链接，得到 `owner`、`repo`、`pullNumber`。
2. `githubService` 调用 GitHub REST API 获取 PR 基础信息。
3. `githubService` 获取 changed files，包括 `filename`、`status`、`additions`、`deletions`、`changes`、`patch`。
4. `chunkDiff` 保留关键字段并截断超长 patch。
5. `promptBuilder` 组装 title、body、author、文件列表和 diff patch，生成模型 prompt。

详见 [docs/上下文获取方式.md](docs/上下文获取方式.md)。

## 误报与漏报控制

本项目通过以下方式降低误报和漏报风险：

- prompt 明确要求模型只基于输入上下文分析，不臆造文件和改动。
- 输出中区分风险等级，帮助用户判断问题优先级。
- 保留 Markdown 原始报告，便于人工复核和二次编辑。
- 对模型非 JSON 输出做兜底处理，避免格式异常导致报告完全不可用。
- 对超长 diff 截断时保留截断提示，提醒用户报告可能缺少部分上下文。

详见 [docs/误报漏报控制.md](docs/误报漏报控制.md)。

## 响应速度优化

当前已实现的响应速度优化：

- changed files 分页拉取，每页最多处理 GitHub 返回的文件数据。
- 对单个文件 patch 和总 patch 长度做限制，避免 prompt 过长。
- 前端显示 loading 状态，降低等待过程中的不确定感。
- `GITHUB_TOKEN` 可提升 API 限额，减少公开匿名请求的限流风险。

后续可继续加入缓存、任务队列和流式输出等优化。详见 [docs/响应速度优化.md](docs/响应速度优化.md)。

## 未来扩展方向

- GitHub App 集成：支持自动监听 PR 事件并回写评论。
- 多模型对比：支持 DeepSeek、OpenAI、通义千问等模型横向比较。
- 文件级 Review：对大型 PR 按文件生成更细粒度建议。
- 缓存与任务队列：缓存 GitHub API 响应，异步生成长 PR 报告。
- 团队规则配置：支持项目自定义 Review 规则、风险等级和输出模板。
- CI/CD 集成：在 PR 检查流程中自动运行 AI Review。

详见 [docs/未来扩展方向.md](docs/未来扩展方向.md)。

## 演示说明

演示建议流程：

1. 展示项目背景和题目要求对应关系。
2. 打开前端页面，输入一个公开 GitHub PR 链接。
3. 点击“开始分析”，展示 loading 状态。
4. 展示结构化 Review 报告，包括总结、风险、建议和测试建议。
5. 点击“复制 Markdown 报告”，展示复制成功提示。
6. 说明后端如何获取上下文、控制长度、调用模型和处理异常。

详见 [docs/演示说明.md](docs/演示说明.md)。

## 测试与验证

运行全部测试：

```bash
npm test
```

测试内容包括：

- 后端健康检查。
- PR 链接解析。
- GitHub API service 的 mock 测试。
- diff 截断和 prompt 构建。
- AI Review service 的 mock 测试。
- 前端 Vite 构建。
