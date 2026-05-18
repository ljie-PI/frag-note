# frag-note — 产品需求文档 (PRD)

> 基于代码库逆向工程整理，用于对齐团队对产品功能、数据模型与业务流程的理解。

---

## 1. 文档信息

| 项目 | 内容 |
|------|------|
| 产品名称 | frag-note（碎记 & 随记） |
| 产品定位 | AI 驱动的碎片化笔记捕获与知识管理工具 |
| 目标平台 | 桌面端（Windows / macOS / Linux） |
| 文档版本 | v1.0（基于代码库 2026-05-18 快照） |

---

## 2. 产品概述

frag-note 是一款面向知识工作者和创作者的桌面端 AI 笔记应用。核心设计理念是**"随时随地捕获，AI 自动整理"**——用户可以通过多种方式快速记录碎片化信息（文本、截图、语音、文件等），系统利用 AI 自动进行 OCR、转录、摘要、标签提取、关系构建，并进一步聚合成主题（Topic）、项目（Project）、实体（Entity）等知识对象，最终形成一个可搜索、可关联的个人知识库。

### 2.1 核心价值主张

1. **零摩擦捕获**：通过全局快捷键、剪贴板监听、区域截图、语音录制等方式，在任意场景下 1 秒内完成信息捕获。
2. **AI 自动处理**：捕获后的内容自动经过 OCR、转录、摘要、标签、Embedding 等多阶段处理，无需手动整理。
3. **知识自动组织**：AI 根据内容自动发现主题、项目和实体，建立碎片之间的关联关系。
4. **智能搜索问答**：支持关键词和自然语言查询，基于知识库内容生成带引用溯源的答案。

### 2.2 产品形态

- **桌面客户端**：基于 Tauri 2 + React 19 的跨平台桌面应用，支持 Windows、macOS、Linux。
- **云服务后端**：基于 Supabase（PostgreSQL + Edge Functions + Storage）+ Fastify API Server + Bun Worker。
- **部署模式**：必须连接 Supabase 云服务，无纯本地离线模式。

---

## 3. 目标用户与用户场景

### 3.1 目标用户画像

| 用户类型 | 特征 | 典型场景 |
|----------|------|----------|
| 研究员 / 学生 | 需要收集大量文献、网页、笔记片段 | 看到有价值的论文段落，Alt+Shift+C 一键捕获，后续自动关联到研究主题 |
| 产品经理 / 设计师 | 需要收集竞品截图、用户反馈、灵感 | 截图竞品界面，AI 自动 OCR + 关联到对应项目 |
| 开发者 | 需要记录代码片段、技术文章、错误信息 | 复制代码片段，自动标签归类到技术主题 |
| 内容创作者 | 需要收集素材、灵感、访谈录音 | 录制语音灵感，自动转录并关联到创作项目 |

### 3.2 关键用户场景

**场景 A：阅读时快速摘录**
> 用户正在浏览器中阅读一篇技术博客，看到一段重要内容。按下 `Alt+Shift+C`，系统自动模拟复制操作，将选中的文本捕获到 QuickCapture 窗口，用户补充几句备注后保存。内容自动同步到云端，AI 处理后提取标签、摘要，并关联到已有的相关笔记。

**场景 B：会议中截图记录**
> 用户在视频会议中看到一张重要的 PPT 幻灯片。按下 `Alt+Shift+S`，屏幕出现区域截图遮罩，用户拖拽选择 PPT 区域，截图被捕获为碎片。AI 自动进行 OCR 提取文字，并关联到该会议对应的主题。

**场景 C：灵感语音记录**
> 用户在路上想到一个产品创意。按下 `Alt+Shift+V`，QuickCapture 窗口出现并开始录音。说完后保存，语音自动转录为文本，AI 提取关键实体和标签，归入对应的项目候选。

**场景 D：知识搜索与回顾**
> 用户需要回顾之前收集的关于"向量数据库"的所有资料。在搜索页面输入"向量数据库的优缺点"，系统基于碎片内容和关联关系生成带引用来源的答案，用户可以将答案保存为新的碎片。

**场景 E：整理 AI 建议的知识对象**
> 系统根据用户积累的大量碎片，自动生成了几个候选主题（如 "RAG 技术研究"、"产品设计方法论"）。用户在"整理"页面查看这些候选，确认有价值的、忽略不相关的、推迟暂不决定的。

---

## 4. 核心功能模块

### 4.1 碎片捕获（Capture）

#### 4.1.1 功能描述

提供多种方式将外部信息捕获为系统内的"碎片"（Fragment）。碎片是最小的知识单元，可以包含文本、图片、音频、PDF 等多媒体内容。

#### 4.1.2 捕获方式

| 捕获方式 | 触发方式 | 输入类型 | 说明 |
|----------|----------|----------|------|
| 文本输入 | 主窗口输入 / QuickCapture 输入 | `text` | 直接输入文本内容 |
| 剪贴板抓取 | `Alt+Shift+C` 全局快捷键 | `text` | 模拟系统复制操作，抓取选中文本 |
| 区域截图 | `Alt+Shift+S` 全局快捷键 | `screenshot` | 全屏遮罩，鼠标拖拽选择区域 |
| 文件拖拽 | 主窗口拖拽 / 文件选择 | `image` / `pdf` / `voice` | 支持图片、PDF、音频文件 |
| 语音录制 | `Alt+Shift+V` 全局快捷键 / 主界面按钮 | `voice` | 使用 MediaRecorder 录制音频 |
| 链接 | 文本中包含 URL | `link` | 识别为链接类型 |
| 答案提升 | 搜索页面操作 | `answer` | 将搜索答案保存为新碎片 |

#### 4.1.3 捕获流程

1. 用户触发捕获操作
2. 内容进入 QuickCapture 窗口（或主窗口 CapturePalette）
3. 用户可补充文本备注、调整内容
4. 保存时，内容以 `queued_upload` 状态写入本地存储（SQLite / localStorage）
5. `syncService.flushQueue()` 将待上传内容发送到服务端
6. 服务端通过 Edge Function 或 API 接收，创建 `processing_jobs`
7. Worker 消费任务，执行 AI 处理流水线

#### 4.1.4 本地草稿同步

- 多窗口（主窗口 + QuickCapture）之间的草稿内容通过 Tauri Event 实时同步
- 120ms debounce 避免频繁发射事件
- 保存后广播 `capture-draft:saved` 清空所有窗口草稿

### 4.2 AI 处理流水线（Processing Pipeline）

#### 4.2.1 功能描述

每个碎片进入系统后，Worker 执行标准化的五步处理流水线，将原始内容转化为结构化知识。

#### 4.2.2 处理步骤

| 步骤 | 名称 | 功能 | AI 能力 | 降级策略 |
|------|------|------|---------|----------|
| 1 | Fetch Assets | 下载碎片关联的媒体文件 | — | — |
| 2 | Build Artifacts | 生成派生产物 | OCR / 转录 / 摘要 / 标签 / Embedding | 启发式规则 |
| 3 | Build Relations | 建立碎片间关联 | 关键词匹配 | — |
| 4 | Update Status | 更新碎片状态为 ready | — | — |
| 5 | Build Candidates | 生成派生对象候选 | 启发式聚类 | — |

#### 4.2.3 Artifact 类型

| Artifact 类型 | 生成条件 | 内容说明 |
|---------------|----------|----------|
| `ocr` | 图片 / 截图 / PDF | 从视觉资产中提取的纯文本 |
| `transcript` | 语音 / 音频 | 语音转录文本 |
| `summary` | 所有类型 | 80 词以内的内容摘要 |
| `tags` | 所有类型 | 3-6 个小写关键词标签 |
| `embedding` | 所有类型 | 文本向量（支持真实 Embedding 或确定性伪向量） |
| `answer` | 搜索场景 | 搜索生成的答案 |

#### 4.2.4 Worker 任务队列

- ** Lease 机制**：任务被 Worker claim 后获得 5 分钟租约，每 30 秒续约 heartbeat
- **重试策略**：最多 3 次重试，最终失败标记为 `failed`
- **任务类型**：`ocr`、`transcription`、`understanding`
- **状态流转**：`queued` → `running` → `completed` / `failed`

### 4.3 碎片管理（Fragment Management）

#### 4.3.1 功能描述

用户可以查看、浏览、管理所有已捕获的碎片，了解处理状态和关联信息。

#### 4.3.2 碎片状态

| 状态 | 说明 | 可见场景 |
|------|------|----------|
| `local_only` | 仅在本地保存，未开始同步 | 离线编辑 |
| `queued_upload` | 已加入上传队列 | 等待网络同步 |
| `syncing` | 正在上传中 | 上传过程中 |
| `processing` | 服务端正在处理 | AI 流水线执行中 |
| `partially_processed` | 部分处理完成 | 多阶段处理中 |
| `ready` | 处理完成，可用 | 正常状态 |
| `failed` | 处理失败 | 需要用户重试 |

#### 4.3.3 碎片详情

- 原始内容（文本 / 媒体预览）
- 派生产物列表（OCR、摘要、标签等）
- 关联碎片（通过 Relations 建立）
- 处理任务历史（Processing Jobs）
- 关联的派生对象（Derived Objects）

### 4.4 知识组织（Organization）

#### 4.4.1 功能描述

AI 自动从碎片中聚类生成知识对象（Derived Objects），用户对这些候选进行审核确认，构建个人知识图谱。

#### 4.4.2 派生对象类型

| 类型 | 生成规则 | 示例 |
|------|----------|------|
| `topic` | 关键词出现 ≥3 次聚类 | "向量数据库 research" |
| `project` | 标题/正文含 "project" 的碎片聚类 | "产品设计项目" |
| `entity` | 专有名词出现 ≥2 次聚类 | "OpenAI"、"PostgreSQL" |

#### 4.4.3 派生对象状态

| 状态 | 说明 |
|------|------|
| `candidate` | AI  newly 生成的候选，等待用户审核 |
| `confirmed` | 用户确认，正式纳入知识库 |
| `dismissed` | 用户忽略，不再显示（同类型不会重复生成） |
| `postponed` | 用户推迟决定，后续可能重新提示 |

#### 4.4.4 用户操作

- **确认（Confirm）**：将候选转为正式知识对象
- **忽略（Dismiss）**：排除该候选，防止重复生成
- **稍后（Postpone）**：暂不决定，保留在候选列表
- **合并（Merge）**：将两个派生对象合并为一个
- **更新建议（Update Suggestions）**：查看基于新碎片生成的内容更新建议

### 4.5 搜索与问答（Search & Q&A）

#### 4.5.1 功能描述

基于用户积累的知识库，提供关键词搜索和自然语言问答能力，答案带引用溯源。

#### 4.5.2 搜索类型

| 类型 | 说明 |
|------|------|
| `keyword` | 关键词匹配搜索 |
| `natural_language` | 自然语言问答 |

#### 4.5.3 检索与生成流程

1. **检索碎片**：基于关键词重叠 + Embedding 相似度评分，取 Top N 碎片
2. **关系展开**：通过 `relations` 表展开关联碎片
3. **派生对象展开**：若 confirmed 对象的关联碎片与检索结果有交集，则展开
4. **构建引用包**：前 3 个碎片作为 direct citation，展开项作为 derived_object_expansion citation
5. **生成答案**：启发式拼接答案（最多取 2 个碎片文本 + confirmed 对象标题）
6. **保存答案**：答案记录到 `answers` 表，用户可将其提升为碎片

#### 4.5.4 答案格式

| 格式 | 说明 |
|------|------|
| `summary` | 摘要式回答 |
| `bullets` | 要点列表 |
| `timeline` | 时间线 |
| `comparison` | 对比分析 |

### 4.6 同步与存储（Sync & Storage）

#### 4.6.1 功能描述

桌面端本地存储与服务端云存储之间的双向同步机制。

#### 4.6.2 本地存储

- **Tauri 模式**：SQLite 数据库存储碎片记录
- **浏览器降级模式**：localStorage 存储
- **适配器模式**：`DesktopAdapter` 接口统一封装，运行时自动检测环境

#### 4.6.3 服务端存储

- **数据库**：Supabase PostgreSQL（含 pgvector 扩展）
- **对象存储**：Supabase Storage，分 `captures-raw`（原始文件）和 `captures-derived`（派生文件）
- **存储策略**：用户隔离，按 `userId` 前缀分目录

#### 4.6.4 同步流程

```
本地保存 (queued_upload)
    ↓
flushQueue() → 上传中 (syncing)
    ↓
Edge Function / API 接收 → 云端 processing
    ↓
获取服务端完整详情 → 更新本地记录
```

### 4.7 用户认证（Authentication）

#### 4.7.1 功能描述

基于 Supabase Auth 的用户身份系统。

#### 4.7.2 认证流程

1. 用户邮箱 + 密码注册 / 登录
2. Supabase Auth 返回 accessToken + refreshToken
3. 本地存储 token 和 userId
4. 自动刷新过期 token（refresh token rotation）
5. 创建设备会话（device session）记录设备信息

#### 4.7.3 会话管理

- Token 存储在 `localStorage`
- 应用启动时验证会话有效性
- 过期前自动刷新
- 登出时清除本地存储并调用服务端注销

---

## 5. 数据模型

### 5.1 实体关系图（ERD）

```
auth.users(id)
    │
    ▼ (1:1)
public.users(user_id)
    │
    ├──► public.device_sessions(user_id)          1:N
    ├──► public.fragments(user_id)                1:N
    │       │
    │       ├──► public.assets(fragment_id)       1:N
    │       ├──► public.derived_artifacts(fragment_id)  1:N
    │       ├──► public.processing_jobs(fragment_id)    1:N
    │       │
    │       └──► public.derived_object_fragments(fragment_id)  M:N
    │               │
    │               ▲
    │           public.derived_objects(object_id)
    │
    ├──► public.relations(user_id)                1:N (软引用)
    └──► public.answers(user_id)                  1:N
```

### 5.2 核心表结构

#### 5.2.1 `fragments` — 碎片主表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `fragment_id` | UUID | PK | 主键 |
| `user_id` | UUID | FK → users | 所属用户 |
| `source_type` | TEXT | CHECK | 来源类型：`text`/`image`/`link`/`screenshot`/`pdf`/`voice`/`answer` |
| `origin_kind` | TEXT | CHECK | 来源方式：`user_capture`/`answer_promotion` |
| `status` | TEXT | CHECK | 生命周期状态（见 4.3.2） |
| `title_optional` | TEXT | nullable | 可选标题 |
| `raw_text_optional` | TEXT | nullable | 可选原始文本 |
| `device_metadata` | JSONB | | 设备元数据（平台、捕获方式、版本等） |
| `language_hint_optional` | TEXT | nullable | 语言提示 |
| `created_at` | TIMESTAMPTZ | | 创建时间 |
| `updated_at` | TIMESTAMPTZ | | 更新时间 |

#### 5.2.2 `assets` — 资源文件

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `asset_id` | UUID | PK | 主键 |
| `fragment_id` | UUID | FK → fragments | 所属碎片 |
| `asset_type` | TEXT | CHECK | `original`/`preview`/`attachment` |
| `mime_type` | TEXT | | MIME 类型 |
| `storage_bucket` | TEXT | | Storage 桶名 |
| `storage_key` | TEXT | | Storage 对象键 |
| `byte_size` | INT | ≥0 | 文件大小（字节） |
| `created_at` | TIMESTAMPTZ | | 创建时间 |

#### 5.2.3 `derived_artifacts` — 派生产物

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `artifact_id` | UUID | PK | 主键 |
| `fragment_id` | UUID | FK → fragments | 所属碎片 |
| `artifact_type` | TEXT | CHECK | `ocr`/`transcript`/`summary`/`tags`/`embedding`/`answer` |
| `version` | TEXT | | 版本标识 |
| `content` | JSONB | | 结构化内容 |
| `provider_metadata` | JSONB | | 提供商元数据 |
| `citations` | JSONB | | 引用来源数组 |
| `created_at` | TIMESTAMPTZ | | 创建时间 |

#### 5.2.4 `relations` — 关系（通用边）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `relation_id` | UUID | PK | 主键 |
| `source_object_type` | TEXT | CHECK | 源对象类型：`fragment`/`artifact`/`derived_object`/`answer` |
| `source_object_id` | UUID | | 源对象 ID |
| `target_object_type` | TEXT | CHECK | 目标对象类型 |
| `target_object_id` | UUID | | 目标对象 ID |
| `relation_type` | TEXT | | 关系语义标签（如 `related_topic`） |
| `confidence_basis_points` | INT | | 置信度（万分之几） |
| `explanation` | TEXT | | 关系解释 |
| `created_at` | TIMESTAMPTZ | | 创建时间 |

> **注**：`relations` 采用多态软引用设计，不建立数据库级外键，通过 `*_object_type` + `*_object_id` 标注实体类型。

#### 5.2.5 `derived_objects` — 派生对象

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `object_id` | UUID | PK | 主键 |
| `user_id` | UUID | FK → users | 所属用户 |
| `object_type` | TEXT | CHECK | `topic`/`project`/`entity` |
| `status` | TEXT | CHECK | `candidate`/`confirmed`/`dismissed`/`postponed` |
| `title` | TEXT | | 标题 |
| `summary` | TEXT | | 摘要 |
| `key_entities` | JSONB | | 关键实体词列表 |
| `rule_version` | TEXT | | 生成规则版本 |
| `supporting_fragment_count` | INT | | 支撑碎片数量 |
| `citations` | JSONB | | 引用来源 |
| `relation_edges` | JSONB | | 关联的 Relation ID 列表 |
| `created_at` | TIMESTAMPTZ | | 创建时间 |
| `updated_at` | TIMESTAMPTZ | | 更新时间 |

#### 5.2.6 `derived_object_fragments` — 联结表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `object_id` | UUID | FK → derived_objects | 派生对象 |
| `fragment_id` | UUID | FK → fragments | 碎片 |
| `user_id` | UUID | FK → users | 所属用户 |
| `added_at` | TIMESTAMPTZ | default now() | 关联时间 |
| **PK** | `(object_id, fragment_id)` | | 复合主键 |

#### 5.2.7 `processing_jobs` — 处理任务队列

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `job_id` | UUID | PK | 主键 |
| `fragment_id` | UUID | FK → fragments | 所属碎片 |
| `job_type` | TEXT | | 任务类型 |
| `status` | TEXT | CHECK | `queued`/`running`/`failed`/`completed` |
| `attempt_count` | INT | ≥0 | 重试次数 |
| `provider` | TEXT | | 服务提供商 |
| `payload` | JSONB | | 任务载荷 |
| `error_code` | TEXT | nullable | 错误码 |
| `error_message` | TEXT | nullable | 错误信息 |
| `claimed_at` | TIMESTAMPTZ | nullable | 认领时间 |
| `lease_expires_at` | TIMESTAMPTZ | nullable | 租约过期时间 |
| `started_at` | TIMESTAMPTZ | nullable | 开始时间 |
| `completed_at` | TIMESTAMPTZ | nullable | 完成时间 |

#### 5.2.8 `answers` — 搜索答案

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `answer_id` | UUID | PK | 主键 |
| `user_id` | UUID | FK → users | 所属用户 |
| `query_text` | TEXT | | 查询文本 |
| `query_type` | TEXT | CHECK | `keyword`/`natural_language` |
| `answer_body` | TEXT | | 答案正文 |
| `answer_format` | TEXT | CHECK | `summary`/`bullets`/`timeline`/`comparison` |
| `retrieval_bundle` | JSONB | | 检索结果对象 ID 列表 |
| `model_metadata` | JSONB | | 模型元数据 |
| `citations` | JSONB | | 引用来源 |
| `provenance` | JSONB | | 溯源信息（原始查询 + 引用碎片 ID） |
| `saved_as_fragment` | BOOLEAN | default false | 是否已保存为碎片 |
| `created_at` | TIMESTAMPTZ | | 创建时间 |

### 5.3 引用模型（Citation）

`Citation` 被嵌入到 `derived_artifacts`、`derived_objects`、`answers` 中，采用轻量级不可变设计：

| 字段 | 说明 |
|------|------|
| `fragment_id` | 被引用的碎片 ID |
| `artifact_id` | 被引用的具体制品 ID（可选） |
| `locator` | 定位器（支持 `text_span`、`pdf_page`、`transcript_range`、`image_region` 四种类型） |
| `support_path` | 推理链类型：`direct`/`relation_expansion`/`derived_object_expansion` |

---

## 6. 业务流程

### 6.1 碎片捕获与处理全流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  用户触发    │────▶│ QuickCapture │────▶│  本地保存    │
│  捕获操作    │     │  / 主窗口    │     │ queued_upload│
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┘
                    ▼
           ┌─────────────┐     ┌─────────────┐
           │ syncService │────▶│  Edge Func  │
           │ flushQueue  │     │capture-frag │
           └─────────────┘     └──────┬──────┘
                                      │
                    ┌─────────────────┘
                    ▼
           ┌─────────────┐     ┌─────────────┐
           │  创建 Frag   │────▶│  创建 Jobs   │
           │  processing  │     │   queued     │
           └─────────────┘     └──────┬──────┘
                                      │
                    ┌─────────────────┘
                    ▼
           ┌─────────────┐     ┌─────────────┐
           │   Worker    │────▶│ Fetch Assets │
           │ claim job   │     │              │
           └─────────────┘     └──────┬──────┘
                                      │
                    ┌─────────────────┼─────────────┐
                    ▼                 ▼             ▼
           ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
           │Build Artifacts│ │Build Relations│ │ Build Cand  │
           │ OCR/摘要/标签 │  │  关键词匹配   │  │  聚类生成   │
           └─────────────┘  └─────────────┘  └─────────────┘
                    │                 │             │
                    └─────────────────┼─────────────┘
                                      ▼
                             ┌─────────────┐
                             │  status=ready │
                             │  知识库可用   │
                             └─────────────┘
```

### 6.2 搜索与问答流程

```
用户输入查询
    │
    ▼
┌─────────────┐
│ Tokenize +  │
│  Embedding  │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│ 关键词匹配   │────▶│  相似度评分   │
│  (Retrieve)  │     │  (Top N)     │
└─────────────┘     └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │Direct   │  │Relation │  │Derived  │
        │Citation │  │Expansion│  │Object   │
        └────┬────┘  └────┬────┘  └────┬────┘
             │            │            │
             └────────────┼────────────┘
                          ▼
                   ┌─────────────┐
                   │ 生成答案     │
                   │ (Citation)  │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ 保存到 answers│
                   │ 可提升为碎片  │
                   └─────────────┘
```

### 6.3 派生对象审核流程

```
AI 生成 Candidate
    │
    ▼
┌─────────────┐
│ 用户查看     │
│ Candidate   │
└──────┬──────┘
       │
   ┌───┼───┐
   ▼   ▼   ▼
┌────┐┌────┐┌────┐
│确认││忽略││稍后│
│conf││dism││post│
└──┬─┘└──┬─┘└──┬─┘
   │     │     │
   ▼     ▼     ▼
┌────┐ ┌────┐ ┌────┐
│正式│ │排除│ │保留│
│对象│ │不再│ │待决│
│    │ │生成│ │    │
└────┘ └────┘ └────┘
```

---

## 7. API 规范

### 7.1 Edge Functions

| 端点 | 方法 | 功能 | 状态 |
|------|------|------|------|
| `/functions/v1/device-session` | POST | 创建设备会话 | ✅ 活跃 |
| `/functions/v1/capture-fragment` | POST | 接收碎片捕获 | ✅ 活跃 |
| `/functions/v1/retry-fragment` | POST | 重试碎片处理 | ✅ 活跃 |
| `/functions/v1/review-derived-object` | POST | 审核派生对象 | ✅ 活跃 |
| `/functions/v1/search-query` | POST | 搜索查询 | ❌ 已废弃 (410) |
| `/functions/v1/promote-answer` | POST | 答案提升为碎片 | ❌ 已废弃 (410) |

### 7.2 API Server 路由

| 端点 | 方法 | 功能 |
|------|------|------|
| `GET /health` | — | 健康检查 |
| `POST /v1/auth/device-session` | — | 创建设备会话 |
| `GET /v1/fragments` | — | 列出用户碎片 |
| `GET /v1/fragments/:id` | — | 碎片详情 |
| `POST /v1/fragments` | — | 摄入碎片 |
| `POST /v1/fragments/:id/retry` | — | 重试处理 |
| `GET /v1/derived-objects/candidates` | — | 候选列表 |
| `GET /v1/derived-objects/:id` | — | 对象详情 |
| `POST /v1/derived-objects/:id/confirm` | — | 确认候选 |
| `POST /v1/derived-objects/:id/dismiss` | — | 忽略候选 |
| `POST /v1/derived-objects/:id/postpone` | — | 推迟候选 |
| `GET /v1/derived-objects/:id/update-suggestions` | — | 更新建议 |
| `POST /v1/derived-objects/:id/merge` | — | 合并对象 |
| `POST /v1/search` | — | 知识库搜索 |
| `POST /v1/answers/:id/save-as-fragment` | — | 答案提升为碎片 |

### 7.3 认证方式

- 所有端点（除 health 外）需要 `Authorization: Bearer <accessToken>`
- Token 通过 Supabase Auth 获取
- 服务端验证方式：调用 Supabase Auth `/auth/v1/user` API 验证 token

---

## 8. 用户界面

### 8.1 窗口结构

| 窗口 | 尺寸 | 特性 | 用途 |
|------|------|------|------|
| **Main** | 1280×900 | 无边框、透明背景 | 主应用界面 |
| **QuickCapture** | 600×240 | 无边框、透明、置顶、初始隐藏 | 快捷捕获输入 |
| **ScreenshotOverlay** | 全屏 | 无边框、透明、置顶、初始隐藏 | 区域截图遮罩 |

### 8.2 主界面导航

| 视图 | 说明 |
|------|------|
| **随记 (Capture)** | 主捕获界面，包含 CapturePalette（文本输入、文件拖拽、截图、录音按钮） |
| **碎片 (Fragments)** | 碎片列表 + 碎片详情 |
| **整理 (Organization)** | 派生对象候选列表，支持 confirm/dismiss/postpone |
| **搜索 (Search)** | 搜索输入 + 答案面板 |

### 8.3 全局快捷键

| 快捷键 | 功能 | 触发时机 |
|--------|------|----------|
| `Alt+Shift+C` | 剪贴板抓取 | Released（避免与系统复制冲突） |
| `Alt+Shift+S` | 区域截图 | Pressed |
| `Alt+Shift+V` | 语音录制 | Pressed |

### 8.4 系统托盘

- 左键单击：toggle 主窗口
- 右键菜单：Show main window / Quick capture / Quit
- 关闭按钮行为：隐藏窗口（非退出）

---

## 9. 非功能需求

### 9.1 性能需求

| 指标 | 目标值 |
|------|--------|
| 捕获响应时间 | 从快捷键触发到 QuickCapture 窗口显示 ≤ 300ms |
| 截图响应时间 | 从快捷键触发到遮罩显示 ≤ 500ms |
| 同步上传 | 碎片保存后 5 秒内开始上传（网络可用时） |
| 处理延迟 | 碎片到达服务端后，Worker 30 秒内开始处理 |
| 搜索响应 | 搜索查询 ≤ 2 秒（含答案生成） |

### 9.2 可靠性需求

| 指标 | 目标值 |
|------|--------|
| 任务重试 | 处理失败自动重试 3 次 |
| 租约机制 | Worker 任务 5 分钟租约 + 30 秒 heartbeat |
| 本地数据安全 | SQLite WAL 模式，避免数据损坏 |
| 上传失败恢复 | 失败记录保留在队列，网络恢复后自动重试 |

### 9.3 安全需求

| 项目 | 措施 |
|------|------|
| 数据隔离 | 所有数据库查询附加 `user_id` 过滤；Storage 按 `userId` 前缀隔离 |
| RLS | 数据库层面启用 Row Level Security |
| 认证 | Supabase Auth JWT，1 小时过期，支持 refresh token rotation |
| 传输加密 | HTTPS/TLS 全链路加密 |
| 敏感信息 | API Key 仅存储在服务端环境变量，不暴露给客户端 |

### 9.4 兼容性需求

| 平台 | 支持级别 | 特殊说明 |
|------|----------|----------|
| macOS | 一级支持 | 需要辅助功能权限用于剪贴板抓取 |
| Windows | 一级支持 | 需要 WebView2 Runtime |
| Linux (X11) | 一级支持 | 需要 xdg-desktop-portal、wl-clipboard、pipewire |
| Linux (Wayland) | 二级支持 | 剪贴板抓取降级为直接读取（无法模拟复制） |
| Web 浏览器 | 降级支持 | 无系统级快捷键、无截图功能、使用 localStorage |

### 9.5 AI 能力配置

| 能力 | 默认模型 | 可独立配置 |
|------|----------|------------|
| 摘要 + 标签 | `gpt-4.1-mini` | ✅ |
| Embedding | `text-embedding-3-small` | ✅ |
| 语音转录 | `gpt-4o-mini-transcribe` | ✅ |
| OCR | `gpt-4.1-mini` | ✅ |

- 所有 AI 能力均支持**启发式降级**：当 API 不可用时，使用本地规则生成近似结果。

---

## 10. 技术架构

### 10.1 系统架构图

```
┌─────────────────────────────────────────────┐
│              Desktop Client                  │
│  ┌─────────┐ ┌─────────┐ ┌───────────────┐  │
│  │  Main   │ │ Quick   │ │ Screenshot    │  │
│  │ Window  │ │Capture  │ │ Overlay       │  │
│  └────┬────┘ └────┬────┘ └───────┬───────┘  │
│       └─────────────┴─────────────┘          │
│                  │                           │
│  ┌───────────────┴───────────────┐           │
│  │      Tauri (Rust) Layer       │           │
│  │  clipboard | screenshot |      │           │
│  │  shortcuts | storage (SQLite) │           │
│  └───────────────┬───────────────┘           │
│                  │                           │
└──────────────────┼───────────────────────────┘
                   │ HTTPS / WebSocket
                   ▼
┌─────────────────────────────────────────────┐
│              Supabase Cloud                  │
│  ┌─────────┐ ┌─────────┐ ┌───────────────┐  │
│  │  Auth   │ │PostgREST│ │ Edge Functions│  │
│  │ (GoTrue)│ │  (DB)   │ │  (Deno)       │  │
│  └─────────┘ └─────────┘ └───────┬───────┘  │
│                                  │           │
│  ┌─────────┐ ┌─────────┐ ┌──────┴──────┐   │
│  │PostgreSQL│ │ Storage │ │  Realtime   │   │
│  │+ pgvector│ │(Raw/Der)│ │  (optional) │   │
│  └─────────┘ └─────────┘ └─────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│              API Server + Worker             │
│  ┌─────────┐ ┌─────────┐ ┌───────────────┐  │
│  │ Fastify │ │ Drizzle │ │   OpenAI      │  │
│  │  API    │ │  ORM    │ │   Client      │  │
│  └─────────┘ └─────────┘ └───────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │      Processing Pipeline Worker      │    │
│  │  fetch → artifacts → relations →    │    │
│  │  update → candidates                │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### 10.2 项目结构

```
frag-note/
├── apps/
│   ├── api/              # Fastify HTTP server + Worker
│   └── desktop/          # Tauri 2 + React 19 desktop client
├── packages/
│   ├── domain/           # Zod schemas — 类型单一数据源
│   ├── contracts/        # API request/response schemas
│   ├── config/           # Shared configuration
│   └── testing/          # Test fixtures and seed data
├── supabase/
│   ├── functions/        # Edge Functions (Deno)
│   └── migrations/       # SQL migrations
└── tests/                # Centralized test directory
```

### 10.3 依赖方向

```
desktop → contracts → domain
api     → contracts → domain
```

- `apps/` 之间禁止相互引用
- `packages/` 禁止引用 `apps/`

---

## 11. 附录

### 11.1 术语表

| 术语 | 英文 | 说明 |
|------|------|------|
| 碎片 | Fragment | 最小的知识单元，一次捕获的内容 |
| 资源 | Asset | 碎片关联的媒体文件（图片、音频、PDF 等） |
| 派生产物 | Derived Artifact | AI 对碎片处理后生成的结构化内容（摘要、标签、OCR 等） |
| 派生对象 | Derived Object | AI 从碎片中聚类生成的知识对象（主题、项目、实体） |
| 关系 | Relation | 碎片/对象之间的语义关联边 |
| 处理任务 | Processing Job | Worker 执行的处理任务单元 |
| 引用 | Citation | 答案或制品中标注的内容来源 |

### 11.2 状态枚举汇总

**Fragment Status**: `local_only` → `queued_upload` → `syncing` → `processing` → `partially_processed` → `ready` | `failed`

**Processing Job Status**: `queued` → `running` → `completed` | `failed`

**Derived Object Status**: `candidate` → `confirmed` | `dismissed` | `postponed`

### 11.3 数据源说明

本 PRD 通过以下方式从代码库中提取信息：
- `packages/domain/src/models/` — 数据模型与约束
- `apps/api/src/routes/` — API 端点定义
- `apps/api/src/db/schema*.ts` — 数据库表结构
- `apps/desktop/src/` — 用户界面与交互流程
- `supabase/migrations/` — 数据库迁移与 DDL
- `supabase/functions/` — Edge Functions 逻辑
- `apps/api/src/workers/` — Worker 处理流水线
- `apps/api/src/services/` — 业务逻辑服务层
