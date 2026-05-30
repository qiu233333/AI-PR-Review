# AI PR Review

AI PR Review 是一个用于辅助 Pull Request 代码评审的项目。当前后端已包含健康检查、GitHub PR 链接解析、GitHub API 获取 PR 信息和 diff 上下文整理能力，暂不包含 AI Review 分析功能。

## 项目结构

```text
.
├── frontend/          # Vue 3 + Vite 前端
├── backend/           # Node.js + Express 后端
├── package.json       # 根目录 npm workspace 和启动脚本
└── spec.md            # 需求说明
```

## 本地运行

安装依赖：

```bash
npm install
```

如需自定义后端端口或跨域来源，可以复制环境变量示例：

```bash
cp backend/.env.example backend/.env
```

Windows PowerShell：

```powershell
Copy-Item backend/.env.example backend/.env
```

后端环境变量：

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `PORT` | 否 | 后端服务端口，默认 `3000` |
| `CORS_ORIGIN` | 否 | 允许访问后端的前端地址，默认 `http://localhost:5173` |
| `GITHUB_TOKEN` | 否 | GitHub API Token；不填写也可请求公开仓库，但更容易受到 API 限流 |

同时启动前后端：

```bash
npm run dev
```

也可以分别启动：

```bash
npm run dev:backend
npm run dev:frontend
```

默认地址：

- 前端：http://localhost:5173
- 后端：http://localhost:3000
- 健康检查：http://localhost:3000/api/health

## 测试

运行后端健康检查测试和前端构建检查：

```bash
npm test
```

也可以在后端启动后手动访问：

```bash
curl http://localhost:3000/api/health
```

期望响应：

```json
{
  "status": "ok",
  "service": "ai-pr-review-backend",
  "timestamp": "2026-05-29T00:00:00.000Z"
}
```

## PR 链接解析

后端提供纯函数 `parsePrUrl`，用于解析 GitHub Pull Request 链接：

```js
import { parsePrUrl } from './src/utils/parsePrUrl.js';

parsePrUrl('https://github.com/openai/codex/pull/123');
// { owner: 'openai', repo: 'codex', pullNumber: 123 }
```

当前仅支持 `https://github.com/{owner}/{repo}/pull/{number}` 格式。该函数只做本地字符串解析，不会请求 GitHub API，也不会调用任何 AI 模型。非法输入会抛出带 `code` 和清晰 `message` 的 `ParsePrUrlError`。

## 获取 PR 信息

后端提供临时测试接口，用于根据 GitHub PR 链接获取 PR 基础信息和 changed files：

```http
POST /api/review/fetch-pr
Content-Type: application/json
```

请求体：

```json
{
  "prUrl": "https://github.com/owner/repo/pull/1"
}
```

成功响应包含：

- `pullRequest.title`
- `pullRequest.body`
- `pullRequest.user.login`
- `pullRequest.html_url`
- `changedFiles[].filename`
- `changedFiles[].status`
- `changedFiles[].additions`
- `changedFiles[].deletions`
- `changedFiles[].changes`
- `changedFiles[].patch`

接口测试示例：

```bash
curl -X POST http://localhost:3000/api/review/fetch-pr \
  -H "Content-Type: application/json" \
  -d '{"prUrl":"https://github.com/owner/repo/pull/1"}'
```

Windows PowerShell：

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/review/fetch-pr `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"prUrl":"https://github.com/owner/repo/pull/1"}'
```

该接口只获取 GitHub PR 数据，不会调用 DeepSeek、OpenAI 或其他 AI 模型。`GITHUB_TOKEN` 从环境变量读取，可选，不能写死在代码中。

## 上下文获取方式

后端按以下步骤准备后续模型分析所需的文本上下文：

1. 使用 `parsePrUrl` 解析 `https://github.com/{owner}/{repo}/pull/{number}`。
2. 使用 `githubService` 获取 PR 基础信息和 changed files。
3. 使用 `chunkDiff` 保留每个文件的 `filename`、`status`、`additions`、`deletions`、`patch`，并对过长 patch 做截断。
4. 使用 `promptBuilder` 将 PR title、body、author、changed files 和 patch 拼接成结构化 prompt。

生成的 prompt 会明确要求模型输出：

- 变更总结
- 风险等级
- 风险代码
- Review 建议
- 测试建议

当前仅构建 prompt 文本，不会调用 DeepSeek、OpenAI 或其他 AI API，也不会生成真实 AI Review 报告。

## 响应速度优化

为避免 prompt 过长影响后续响应速度，`chunkDiff` 会限制单个文件 patch 长度和总 patch 长度。超过限制的 patch 会保留前部内容，并插入截断提示，说明原始长度和保留长度。

后续接入模型时可以继续优化：

- 优先发送 changed files 中最关键的 patch。
- 对大型 PR 限制每次分析的文件数量。
- 使用 `GITHUB_TOKEN` 提高 GitHub API 限额，减少请求失败重试。
- 缓存同一 PR 的 GitHub API 响应，避免重复拉取。

## 后续功能边界

后续 PR 可按 `spec.md` 继续实现 AI Review 报告生成、Markdown 复制等功能。API Key 不应写入代码，应通过 `.env` 管理，并在 `.env.example` 中提供变量名称示例。
