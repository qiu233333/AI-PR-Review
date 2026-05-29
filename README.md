# AI PR Review

AI PR Review 是一个用于辅助 Pull Request 代码评审的项目。当前 PR 仅完成项目初始化，包含前端 Vue 3 + Vite 和后端 Node.js + Express 的基础骨架，不包含 GitHub API 调用和 AI Review 分析功能。

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

## 后续功能边界

后续 PR 可按 `spec.md` 继续实现 GitHub PR URL 解析、GitHub REST API 数据获取、AI Review 报告生成和 Markdown 复制等功能。API Key 不应写入代码，应通过 `.env` 管理，并在 `.env.example` 中提供变量名称示例。
