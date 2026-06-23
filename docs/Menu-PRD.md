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
[File] [Edit] [View] [Code] [Claude] [Terminal] [Help]
```

---

## 3. 各菜单详细设计

### 3.1 File 菜单

| 优先级 | 菜单项 | 功能描述 | 快捷键 | 触发时机 | 关联模块 |
|--------|--------|----------|--------|----------|----------|
| P0 | New File... | 新建文件，弹出输入框输入文件名 | Ctrl+N | 全局 | 文件管理 |
| P0 | New Folder... | 新建文件夹 | Ctrl+Shift+N | 全局 | 文件管理 |
| P0 | Open Folder... | 打开项目文件夹 | Ctrl+K Ctrl+O | 全局 | 工作区 |
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

### 3.5 Claude 菜单（AI 功能核心入口）

| 优先级 | 菜单项 | 功能描述 | 快捷键 | 触发时机 | 关联模块 |
|--------|--------|----------|--------|----------|----------|
| P0 | New Chat | 新建对话 | Ctrl+L | 全局 | Claude 对话 |
| P0 | Send Message | 发送当前输入 | Enter | 对话输入框 | Claude 对话 |
| P0 | Attach Image... | 从文件选择图片附加 | - | 全局 | Claude 对话 |
| P0 | Toggle Thinking Mode | 切换思考模式（展开/收起） | - | 全局 | Claude 对话 |
| P1 | Clear Chat History | 清空当前对话历史 | - | 全局 | Claude 对话 |
| P1 | Export Chat... | 导出对话为 Markdown | - | 全局 | Claude 对话 |
| P1 | Settings → Model | 选择 Claude 模型 | - | 全局 | 设置 |
| P1 | Settings → Temperature | 调整生成温度 | - | 全局 | 设置 |
| P2 | Insert Code to Chat | 将当前选中的代码发送到对话 | - | 编辑器焦点（有选区） | Claude 对话 |
| P2 | Explain Selected Code | 请求 Claude 解释选中代码 | - | 编辑器焦点（有选区） | Claude 对话 |

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
| P1 | Documentation | 打开在线文档 | - | 全局 | 外部浏览器 |
| P1 | Keyboard Shortcuts Reference | 快捷键速查表 | - | 全局 | 帮助 |
| P1 | Release Notes | 版本更新说明 | - | 全局 | 应用 |
| P2 | Check for Updates | 检查更新 | - | 全局 | 更新系统 |
| P2 | About | 关于对话框 | - | 全局 | 应用 |

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
| P2 | Explain with Claude | 有选区时 |
| P2 | Send to Claude Chat | 有选区时 |

---

## 5. 优先级汇总

| 优先级 | 数量 | 说明 |
|--------|------|------|
| P0 | 28 项 | MVP 必须实现，保证基础 IDE 可用性 |
| P1 | 24 项 | 重要功能，提升开发效率 |
| P2 | 12 项 | 增强体验，迭代阶段实现 |

---

## 6. 验收标准

1. **结构完整性**：7 个顶级菜单全部存在，子菜单层级正确
2. **快捷键绑定**：P0 项全部绑定快捷键，P1 项 ≥ 80% 绑定
3. **上下文感知**：右键菜单根据触发区域动态显示/隐藏项
4. **禁用状态**：菜单项在不可用时应置灰（如未打开文件时 Save 禁用）
5. **国际化预留**：菜单文本通过 i18n key 定义，支持后续多语言

---

*文档结束*
