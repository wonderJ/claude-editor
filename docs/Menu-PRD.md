# Claude Code 桌面编辑器 - 菜单 PRD

> 版本：v1.0  
> 日期：2026-06-18  
> 负责人：产品（01KV9PMGVJ355N5WWJDYZ7AEFD）  
> 参考：IntelliJ IDEA、VS Code、PyCharm

---

## 1. 设计原则

1. **渐进暴露**：高频操作放顶层，低频操作放子菜单或命令面板
2. **IDE 一致性**：快捷键与 VS Code 默认方案兼容，降低迁移成本
3. **上下文感知**：菜单项根据当前焦点区域（编辑器/终端/文件树）动态启用/禁用
4. **Claude 专属**：Code / Claude 菜单为 AI 功能独占入口

---

## 2. 菜单栏结构总览

```
[File] [Edit] [View] [Code] [Git] [Terminal] [Help]
```

---

## 3. 各菜单详细设计

### 3.1 File 菜单

| 优先级 | 菜单项 | 功能描述 | 快捷键 | 触发时机 | 关联模块 |
|--------|--------|----------|--------|----------|----------|
| P0 | New File... | 新建文件，弹出输入框输入文件名 | Ctrl+N | 全局 | 文件管理 |
| P0 | New Folder... | 新建文件夹 | Ctrl+Shift+N | 全局 | 文件管理 |
| P0 | Open Folder... | 打开项目文件夹 | Ctrl+K Ctrl+O | 全局 | 工作区 |
| P0 | Clone Repository... | 从远程 Git 仓库克隆项目并打开 | - | 全局 | 版本控制 |
| P0 | Open Recent | 最近打开的项目列表（子菜单） | - | 全局 | 工作区 |
| P0 | Save | 保存当前文件 | Ctrl+S | 编辑器焦点 | 编辑器 |
| P0 | Save All | 保存所有打开的文件 | Ctrl+K S | 全局 | 编辑器 |
| P1 | Close Editor | 关闭当前标签页 | Ctrl+W | 编辑器焦点 | 编辑器 |
| P1 | Close Folder | 关闭当前项目 | Ctrl+K F | 全局 | 工作区 |
| P1 | Preferences → Settings | 打开设置面板 | Ctrl+, | 全局 | 设置 |
| P1 | Preferences → Keyboard Shortcuts | 快捷键绑定 | Ctrl+K Ctrl+S | 全局 | 设置 |
| P0 | Exit | 退出应用 | Alt+F4 | 全局 | 应用 |

---

### 3.2 Edit 菜单

| 优先级 | 菜单项 | 功能描述 | 快捷键 | 触发时机 | 关联模块 |
|--------|--------|----------|--------|----------|----------|
| P0 | Undo | 撤销 | Ctrl+Z | 编辑器焦点 | 编辑器 |
| P0 | Redo | 重做 | Ctrl+Shift+Z | 编辑器焦点 | 编辑器 |
| P0 | Cut | 剪切 | Ctrl+X | 全局（有选区） | 编辑器/输入框 |
| P0 | Copy | 复制 | Ctrl+C | 全局（有选区） | 编辑器/输入框 |
| P0 | Paste | 粘贴 | Ctrl+V | 全局 | 编辑器/输入框 |
| P0 | Paste as Image | 粘贴剪贴板图片到 Claude 对话 | Ctrl+Shift+V | 对话输入框焦点 | Claude 对话 |
| P1 | Find... | 当前文件搜索 | Ctrl+F | 编辑器焦点 | 编辑器 |
| P1 | Replace... | 当前文件替换 | Ctrl+H | 编辑器焦点 | 编辑器 |
| P1 | Find in Files... | 全局搜索 | Ctrl+Shift+F | 全局 | 搜索 |
| P1 | Replace in Files... | 全局替换 | Ctrl+Shift+H | 全局 | 搜索 |

---

### 3.3 View 菜单

| 优先级 | 菜单项 | 功能描述 | 快捷键 | 触发时机 | 关联模块 |
|--------|--------|----------|--------|----------|----------|
| P0 | Sidebar | 显示/隐藏左侧边栏 | Ctrl+B | 全局 | 布局系统 |
| P0 | Terminal | 显示/隐藏底部终端 | Ctrl+` | 全局 | 终端 |
| P0 | Command Palette... | 命令面板 | Ctrl+Shift+P | 全局 | 命令系统 |
| P1 | Appearance → Theme → Dark | 切换深色主题 | - | 全局 | 主题 |
| P1 | Appearance → Theme → Light | 切换浅色主题 | - | 全局 | 主题 |
| P1 | Appearance → Zoom In | 放大界面 | Ctrl+= | 全局 | 布局 |
| P1 | Appearance → Zoom Out | 缩小界面 | Ctrl+- | 全局 | 布局 |
| P1 | Appearance → Reset Zoom | 重置缩放 | Ctrl+0 | 全局 | 布局 |
| P2 | Split Editor → Horizontal | 水平分屏 | - | 编辑器焦点 | 编辑器 |
| P2 | Split Editor → Vertical | 垂直分屏 | - | 编辑器焦点 | 编辑器 |

---

### 3.4 Code 菜单（代码操作）

| 优先级 | 菜单项 | 功能描述 | 快捷键 | 触发时机 | 关联模块 |
|--------|--------|----------|--------|----------|----------|
| P0 | Go to File... | 快速打开文件 | Ctrl+P | 全局 | 文件管理 |
| P0 | Go to Symbol... | 跳转到符号 | Ctrl+Shift+O | 编辑器焦点 | 编辑器 |
| P1 | Go to Line... | 跳转到指定行 | Ctrl+G | 编辑器焦点 | 编辑器 |
| P1 | Go to Definition | 跳转到定义 | F12 | 编辑器焦点（有符号） | 编辑器 |
| P1 | Format Document | 格式化当前文件 | Shift+Alt+F | 编辑器焦点 | 编辑器 |
| P1 | Format Selection | 格式化选区 | Ctrl+K Ctrl+F | 编辑器焦点（有选区） | 编辑器 |
| P2 | Comment Line | 切换行注释 | Ctrl+/ | 编辑器焦点 | 编辑器 |
| P2 | Comment Block | 切换块注释 | Shift+Alt+A | 编辑器焦点 | 编辑器 |

---

### 3.5 Git 菜单（版本控制）

| 优先级 | 菜单项 | 功能描述 | 快捷键 | 触发时机 | 关联模块 |
|--------|--------|----------|--------|----------|----------|
| P0 | Initialize Repository... | 在当前工作区初始化 Git 仓库 | - | 工作区打开且非 Git 仓库 | 版本控制 |
| P0 | Commit... | 打开提交面板，输入提交信息并提交 | Ctrl+K | Git 仓库内 | 版本控制 |
| P0 | Push... | 推送当前分支到远程仓库 | Ctrl+Shift+K | Git 仓库内 | 版本控制 |
| P0 | Pull... | 拉取当前分支最新代码并合并 | - | Git 仓库内 | 版本控制 |
| P0 | Fetch | 从远程获取最新分支和标签，不合并 | - | Git 仓库内 | 版本控制 |
| P1 | Update Project... | 拉取并合并远程最新变更（Fetch + Pull/Rebase） | Ctrl+T | Git 仓库内 | 版本控制 |
| P1 | Manage Remotes... | 管理远程仓库地址（添加/编辑/删除） | - | Git 仓库内 | 版本控制 |

---

### 3.5.1 左侧边栏 Git 工具窗口（IDEA 风格）

> 位于文件树最左侧 Activity Rail 的底部，提供 **Commit** 与 **Git** 两个 IDEA 风格的工具窗口入口。点击入口后，在右侧主面板展开对应工具窗口，与顶部 `[Git]` 菜单形成功能互补。

#### 入口列表

| 优先级 | 入口 | 图标 | 展开面板 | 可见条件 |
|--------|------|------|----------|----------|
| P0 | Commit | GitCommitHorizontal | Commit 工具窗口 | 始终可见 |
| P0 | Git | GitBranch | Git 工具窗口 | 始终可见 |

#### Commit 工具窗口

| 优先级 | 区域/操作 | 功能描述 | 触发条件 |
|--------|-----------|----------|----------|
| P0 | 工具窗口标题 | 显示 "Commit" 与当前分支名 | Git 仓库内 |
| P0 | Changes 列表 | 按目录分组展示已修改/已暂存文件，带文件数量徽章（如 "Changes 7 files"） | 有变更文件 |
| P0 | Unversioned files 列表 | 未跟踪文件分组，可选择是否纳入本次提交 | 有未跟踪文件 |
| P0 | 文件复选框 | 每行前复选框，勾选后表示纳入本次提交 | 文件可操作 |
| P1 | 文件状态图标 | 显示 modified / added / deleted / renamed / untracked 状态 | 文件有变更 |
| P1 | Rollback / Show Diff | 右键或悬浮操作：回滚单个文件 / 查看差异 | 文件有变更 |
| P0 | Amend 选项 | 复选框：将变更追加（amend）到上一次提交 | Git 仓库有历史 |
| P0 | Commit Message | 提交信息输入框，支持多行 | Git 仓库内 |
| P0 | Commit 按钮 | 提交已勾选文件；Amend 模式下重写上一次提交 | 有勾选文件或 Amend 模式 |
| P0 | Commit and Push... | 下拉按钮：提交后推送，或先提交再单独推送 | 有勾选文件 |
| P1 | 设置按钮 | 打开提交选项（如签名、提交前检查、换行符等） | Git 仓库内 |

> 非 Git 仓库时，面板显示 "Not a Git repository"。

#### Git 工具窗口

| 优先级 | 区域/操作 | 功能描述 | 触发条件 |
|--------|-----------|----------|----------|
| P0 | 标签页 | Log / Console / Branches / Tags（默认 Log） | Git 仓库内 |
| P0 | 分支树 | 左侧展示 `HEAD (Current Branch)` / `Local` / `Remote` / `Tags` 层级 | Git 仓库内 |
| P1 | New Branch | 在 `Local` 分组下新建本地分支 | Git 仓库内 |
| P1 | Checkout / Merge / Delete | 对分支树节点右键或悬浮操作 | 分支节点 |
| P0 | Log 视图 | 右侧展示带分支图的提交时间线 | 有 commit 历史 |
| P0 | 提交图 | 以彩色连线展示分支合并、分叉、rebase 关系 | 有多个分支 |
| P0 | 提交列表 | 每行显示：短 hash、subject、author、date、refs / tags | 有 commit 历史 |
| P1 | 搜索框 | 按 `Text or hash` 过滤提交 | Log 标签 |
| P1 | 过滤器 | Branch / User / Date / Paths 下拉过滤 | Log 标签 |
| P1 | Commit details | 选中提交后展示详情（变更文件列表、diff） | 选中提交 |
| P1 | 对比操作 | 选择两个提交进行 diff 对比 | 有 commit 历史 |

---

### 3.6 Terminal 菜单

| 优先级 | 菜单项 | 功能描述 | 快捷键 | 触发时机 | 关联模块 |
|--------|--------|----------|--------|----------|----------|
| P0 | New Terminal | 新建终端标签 | Ctrl+Shift+` | 全局 | 终端 |
| P0 | Split Terminal | 终端分屏 | - | 终端焦点 | 终端 |
| P0 | Kill Terminal | 关闭当前终端 | - | 终端焦点 | 终端 |
| P1 | Clear Terminal | 清空终端输出 | - | 终端焦点 | 终端 |
| P1 | Scroll to Top | 滚动到顶部 | - | 终端焦点 | 终端 |
| P1 | Scroll to Bottom | 滚动到底部 | - | 终端焦点 | 终端 |
| P2 | Select Default Shell | 选择默认 shell（bash/zsh/pwsh） | - | 全局 | 设置 |

---

### 3.7 Help 菜单

| 优先级 | 菜单项 | 功能描述 | 快捷键 | 触发时机 | 关联模块 |
|--------|--------|----------|--------|----------|----------|
| P1 | Welcome | 显示欢迎页 | - | 全局 | 应用 |
| P1     | Keyboard Shortcuts Reference | 快捷键速查表 | -      | 全局     | 帮助     |
| P1     | Release Notes                | 版本更新说明 | -      | 全局     | 应用     |
| P2     | About                        | 关于对话框   | -      | 全局     | 应用     |

---

## 4. 上下文菜单（右键菜单）

### 4.1 文件树右键

| 优先级 | 菜单项 | 触发条件 |
|--------|--------|----------|
| P0 | New File | 文件夹或空白处右键 |
| P0 | New Folder | 文件夹或空白处右键 |
| P0 | Rename | 文件/文件夹右键 |
| P0 | Delete | 文件/文件夹右键 |
| P1 | Copy Path | 文件/文件夹右键 |
| P1 | Reveal in Explorer | 文件/文件夹右键 |
| P1 | @ in Terminal | 文件/文件夹右键 |

### 4.2 编辑器标签右键

| 优先级 | 菜单项 | 触发条件 |
|--------|--------|----------|
| P0 | Close | 标签页右键 |
| P0 | Close Others | 标签页右键 |
| P0 | Close All | 标签页右键 |
| P1 | Split Right | 标签页右键 |
| P1 | Copy Path | 标签页右键 |

### 4.3 编辑器内容右键

| 优先级 | 菜单项 | 触发条件 |
|--------|--------|----------|
| P0 | Cut / Copy / Paste | 有选区时 |
| P1 | Go to Definition | 光标在符号上 |
| P1 | Show Diff | 文件有未提交修改时 |
| P1 | Show History | 文件有 Git 历史时 |
| P1 | Discard Changes... | 文件有未提交修改时 |

---

## 5. 优先级汇总

| 优先级 | 数量 | 说明 |
|--------|------|------|
| P0 | 51 项 | MVP 必须实现，保证基础 IDE 可用性 |
| P1 | 43 项 | 重要功能，提升开发效率 |
| P2 | 6 项 | 增强体验，迭代阶段实现 |

---

## 6. 验收标准

1. **结构完整性**：8 个顶级菜单全部存在，子菜单层级正确
2. **快捷键绑定**：P0 项全部绑定快捷键，P1 项 ≥ 80% 绑定
3. **Git 感知**：Git 菜单在非 Git 仓库下隐藏/禁用仓库级操作，初始化/克隆入口始终可见
4. **上下文感知**：右键菜单根据触发区域和文件 Git 状态动态显示/隐藏项
5. **禁用状态**：菜单项在不可用时应置灰（如未打开文件时 Save 禁用，未初始化仓库时 Commit 禁用）
6. **国际化预留**：菜单文本通过 i18n key 定义，支持后续多语言
7. **危险操作确认**：Discard Changes 等会丢失数据的操作需弹窗二次确认
8. **左侧边栏 Git 工具窗口（IDEA 风格）**：Activity Bar 底部始终显示 Commit/Git 入口；Commit 面板按 `Changes` / `Unversioned files` 分组展示文件，支持勾选纳入提交、Amend 重写上一次提交、Commit/Commit and Push；Git 面板 Log 视图展示分支树（HEAD/Local/Remote/Tags）与提交时间线，支持搜索、过滤与 Commit details；非 Git 仓库时显示 "Not a Git repository" 占位。

---

*文档结束*
