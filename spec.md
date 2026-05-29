# AI PR Review 助手需求文档

## 项目背景

Pull Request Review 是团队协作开发中保证代码质量的重要环节，但人工 Review 容易受到时间、经验和注意力影响，存在理解变更慢、风险代码漏看、Review 建议不充分等问题。

本项目希望开发一个 AI PR Review 助手，帮助开发者快速理解 Pull Request 的代码变更，并辅助发现潜在风险。

## 项目目标

用户输入 GitHub Pull Request 链接后，系统自动获取 PR 基础信息、变更文件和 diff 内容，并调用大语言模型生成结构化代码评审报告。

## 核心功能

1. 输入 GitHub PR 链接。
2. 解析 owner、repo、pull number。
3. 调用 GitHub API 获取 PR 信息。
4. 获取 changed files 和 diff patch。
5. 整理 PR 上下文。
6. 调用 AI 模型生成 Review 报告。
7. 前端展示分析结果。
8. 支持复制 Markdown 格式报告。

## Review 报告内容

报告需要包含：

1. PR 变更总结
2. 风险等级：低风险 / 中风险 / 高风险
3. 风险代码识别
4. 文件级 Review 建议
5. 测试建议
6. Markdown 格式 Review 报告

## 技术栈

前端：Vue 3 + Vite + Axios  
后端：Node.js + Express  
模型：DeepSeek API，兼容 OpenAI API 调用格式  
代码平台：GitHub REST API  
部署：Vercel，可选

## 后端接口

POST /api/review/analyze

请求体：

{
  "prUrl": "https://github.com/owner/repo/pull/1"
}

响应体：

{
  "success": true,
  "data": {
    "summary": "本次 PR 主要修改了……",
    "riskLevel": "medium",
    "risks": [],
    "suggestions": [],
    "testSuggestions": [],
    "markdownReport": "# PR Review 报告..."
  }
}

## 关键要求

1. 每个 PR 只实现一个独立功能。
2. main 分支始终保持可运行。
3. 不允许把 API Key 写死在代码中。
4. 使用 .env 管理环境变量。
5. 提供 .env.example。
6. 错误提示要清晰。
7. README 要说明项目背景、功能、架构、运行方式、模型选择、上下文获取、误报漏报控制、响应速度优化和未来扩展。