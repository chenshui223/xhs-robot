# XHS Robot - 小红书自动化平台 🤖

> ⚠️ **免责声明**: 这是一个**未完成的演示项目**，仅供学习和研究之用。请勿用于商业用途或违反小红书服务条款的行为。

## 项目简介

XHS Robot 是一个基于 Next.js 的小红书自动化管理平台，集成了 AI 驱动的内容生成、浏览器自动化、热点监控和合规检查功能。该项目演示了如何使用现代 Web 技术和 AI 模型实现内容创作自动化流程。

### 主要功能

- 🌐 **浏览器自动化**: 使用 Playwright 实现持久化登录和自动交互
- 📊 **热点监控**: 实时爬取小红书热门话题，分析热词和评论趋势
- 🤖 **AI 生成**: 基于热点评论和关键词，由 AI 模型自动生成讨论帖
- 📝 **自动发布**: 将生成的内容自动发布到小红书创作者中心
- ✅ **合规检查**: 检测禁用词汇，利用 AI 进行语义审核
- 👤 **账号管理**: 管理多个小红书账号的登录状态和认证
- 📋 **任务日志**: 记录和监控所有后台操作

## 技术栈

| 层级 | 技术 |
|-----|------|
| **前端** | Next.js 14 (App Router) + React + TypeScript + Tailwind CSS |
| **UI 组件** | Shadcn/UI + Recharts |
| **后端** | Next.js API Routes + Server Actions |
| **数据库** | Prisma ORM + SQLite |
| **浏览器自动化** | Playwright |
| **AI 模型** | OpenAI SDK (支持 DashScope/Qwen 等第三方模型) |

## 快速开始

### 前置要求

- Node.js >= 18
- npm 或 yarn
- 小红书账号

### 安装步骤

1. **克隆项目**

```bash
git clone https://github.com/chenshui223/xhs-robot.git
cd xhs-robot
```

2. **安装依赖**

```bash
npm install
```

3. **配置环境变量**

复制 `.env.example` 为 `.env.local` 并填入你的配置：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# OpenAI / 第三方 LLM 配置
# 对于 DashScope (阿里巴巴通义千问):
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL_NAME=qwen3-max

# 浏览器配置
XHS_BROWSER_USER_DATA_DIR=./browser-user-data
XHS_HEADLESS=false  # true=无界面模式, false=有界面模式
```

4. **初始化数据库**

```bash
npx prisma migrate deploy
```

5. **启动开发服务器**

```bash
npm run dev
```

访问 `http://localhost:3000` 打开应用。

## 使用指南

### 1. 启动浏览器并登录

1. 进入 **"概览"** 页面
2. 点击 **"启动浏览器"** 按钮
3. 浏览器会自动打开小红书，手动完成登录（或使用已保存的登录状态）
4. 登录成功后，账号状态会自动更新为"已验证"

### 2. 监控热点话题

1. 进入 **"热点监控"** 页面
2. 输入关键词（例如：美妆、旅行、美食）
3. 点击 **"抓取热点"** 按钮
4. 系统会自动：
   - 抓取前 100 篇热门笔记
   - 提取每篇笔记的页面标题和前 50 条评论
   - 分析热词频率并生成热词统计图表

### 3. 生成讨论帖

1. 完成热点监控后，点击 **"生成讨论帖"** 按钮
2. AI 会基于：
   - 抓取到的热词及其频率
   - 热点评论摘要
3. 自动生成一篇能引发讨论的小红书笔记

### 4. 发布内容

1. 查看生成的笔记内容
2. 可选操作：
   - 📋 **"复制内容"** - 复制到剪贴板手动发布
   - 🚀 **"发布到小红书"** - 自动发布到创作者中心

## 项目结构

```
xhs-robot/
├── app/
│   ├── api/                      # API 路由
│   │   ├── browser/              # 浏览器控制接口
│   │   ├── accounts/             # 账号管理接口
│   │   └── trends/               # 热点监控和生成接口
│   ├── page.tsx                  # 概览页面
│   ├── trends/                   # 热点监控页面
│   ├── accounts/                 # 账号管理页面
│   └── layout.tsx                # 根布局
├── components/
│   ├── layout/                   # 布局组件
│   └── ui/                       # UI 组件库
├── lib/
│   ├── actions.ts                # 核心业务逻辑
│   ├── browser-service.ts        # 浏览器服务（单例）
│   ├── prisma.ts                 # Prisma 客户端
│   ├── banned_words.json         # 禁用词库
│   └── utils.ts                  # 工具函数
├── prisma/
│   ├── schema.prisma             # 数据库模型定义
│   └── migrations/               # 数据库迁移记录
└── public/                       # 静态资源
```

## 数据库模型

### Account (账号)
- `username`: 用户名
- `status`: 状态 (pending/verified)
- `cookie`: 登录 Cookie

### TrendData (热点数据)
- `keyword`: 搜索关键词
- `title`: 笔记标题
- `likes`: 点赞数
- `url`: 笔记链接
- `comments`: 评论列表 (JSON)

### GeneratedPost (生成的帖子)
- `keyword`: 关键词
- `content`: 帖子内容
- `sourceComments`: 来源评论 (JSON)

### TaskLog (任务日志)
- `type`: 任务类型
- `status`: 运行状态
- `details`: 详细信息
- `result`: 执行结果

## 核心功能详解

### 热点趋势分析

系统会：
1. 爬取搜索结果的前 100 篇笔记
2. 对每篇笔记提取最热的 50 条评论
3. 使用 `nodejieba` 进行中文分词
4. 统计热词频率并排序
5. 优先展示最近 3 个月的笔记，按点赞数次级排序

### AI 驱动的内容生成

生成提示词包含：
- **系统角色**: 专业的小红书内容创作者
- **热词输入**: Top 10 热词及其出现频率
- **评论摘要**: 热点评论摘要（最多 30 条）
- **生成要求**:
  - 200-500 字
  - 使用 emoji 和换行增强可读性
  - 包含话题标签和互动问题
  - 符合中国广告法合规要求

### 浏览器自动化

使用 Playwright 实现：
- 持久化会话：Cookie 和登录状态保存在 `browser-user-data` 目录
- 单例模式：全应用只维护一个浏览器实例
- 自动登录检测：启动浏览器时自动识别登录状态
- 评论爬取：访问每篇笔记并提取评论
- 自动发布：填充文本框并点击发布按钮

## 配置选项

### OpenAI / LLM 配置

支持多个模型提供商：

```bash
# OpenAI (默认)
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL_NAME=gpt-4-turbo

# DashScope (阿里巴巴通义千问)
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL_NAME=qwen3-max

# 其他兼容 OpenAI 的服务
OPENAI_BASE_URL=https://your-api-endpoint.com/v1
```

### 浏览器配置

```bash
# 浏览器用户数据目录（保存 Cookie 和登录状态）
XHS_BROWSER_USER_DATA_DIR=./browser-user-data

# 是否使用无界面模式
XHS_HEADLESS=false  # 改为 true 可在后台运行
```

## 已知限制 ⚠️

1. **网页结构依赖**: 代码依赖小红书当前的 DOM 结构，网站更新可能导致爬取失败
2. **速率限制**: 频繁访问可能触发小红书的反爬机制
3. **评论提取**: 某些笔记的评论可能加载不完整
4. **AI 生成质量**: 生成的内容质量取决于 AI 模型和输入的热点数据
5. **账号风险**: 自动化操作可能被小红书识别为异常行为

## 开发和调试

### 运行开发服务器

```bash
npm run dev
```

### 代码检查和构建

```bash
# TypeScript 类型检查
npx tsc --noEmit

# 生产构建
npm run build

# 启动生产服务器
npm run start
```

### 数据库管理

```bash
# 查看数据库
npx prisma studio

# 创建新迁移
npx prisma migrate dev --name <migration_name>

# 重置数据库（谨慎！）
npx prisma migrate reset
```

## 常见问题

### Q: 浏览器无法启动
A: 确保已安装 Playwright 浏览器：
```bash
npx playwright install
```

### Q: 无法爬取评论
A: 可能原因：
- 小红书网站结构已更改
- 评论使用动态加载（需增加等待时间）
- 选择器需要更新

### Q: AI 生成内容很差
A: 尝试：
- 增加 `max_tokens` 以获得更长的输出
- 调整 `temperature` 参数（0.3-0.9）
- 优化 prompt 词语

### Q: 发布失败
A: 检查：
- 是否正确登录
- 创作者中心链接是否可访问
- 文本框和发布按钮的选择器是否正确

## 改进方向 🚀

- [ ] 支持图片上传和处理
- [ ] 实现视频相关内容的爬取
- [ ] 构建评论情感分析模块
- [ ] 添加发布时间自动安排
- [ ] 实现多账号并行管理
- [ ] 添加数据可视化仪表板
- [ ] 支持更多内容平台（抖音、微博等）
- [ ] 实现消息队列进行异步处理

## 许可证

MIT License - 仅供学习和研究使用

## 声明

本项目仅供学习研究之用。使用本项目时请遵守：
- ✅ 所在地的法律法规
- ✅ 小红书的服务条款和隐私政策
- ✅ 相关的网络伦理规范

**不遵守上述条款而产生的一切后果由使用者自行承担。**

## 联系方式

如有问题或建议，欢迎通过 GitHub Issues 反馈。

---

**更新于**: 2025-12-17  
**状态**: 🚧 开发中 (Demo 版本)
