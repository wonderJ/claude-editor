# Claude Editor 菜单功能测试用例文档

> 对应变更：完成 `docs/Menu-PRD.md` 中 P0/P1 菜单功能
> 文档版本：v1.0
> 日期：2026-07-14

---

## 1. 测试范围

- **功能名称**：IDE 风格菜单栏、命令面板、快速打开、搜索面板、设置/帮助/Git 弹窗、上下文菜单及全局快捷键
- **涉及模块**：
  - `src/components/layout/MainLayout.tsx`
  - `src/components/menu/*`（MenuBar、CommandPalette、FileQuickOpen）
  - `src/components/search/SearchPanel.tsx`
  - `src/components/settings/SettingsDialog.tsx`
  - `src/components/help/*`（KeyboardShortcutsReference、AboutDialog、ReleaseNotesDialog）
  - `src/components/git/ManageRemotesDialog.tsx`、`src/components/git/useGitMenuActions.ts`
  - `src/components/editor/MonacoEditor.tsx`、`src/components/editor/TabBar.tsx`
  - `src/components/file-tree/FileTreeNode.tsx`
  - `src/components/terminal/TerminalPanel.tsx`、`src/components/terminal/XTerm.tsx`
  - `electron/gitService.ts`、`electron/preload.ts`
  - `src/stores/*`（editorStore、gitStore、recentProjectsStore）
- **入口路径**：应用顶部菜单栏 `File | Edit | View | Code | Git | Terminal | Help`
- **影响范围**：
  - 主窗口菜单交互、全局键盘事件、文件/文件夹创建、项目打开/关闭、Git 操作、终端操作、编辑器命令与右键菜单、主题缩放状态持久化

---

## 2. 测试策略

- **测试类型**：
  - 功能测试：验证每个菜单项、快捷键、弹窗正常打开并执行预期动作
  - 异常测试：无项目、无 Git 仓库、无网络、无效输入、权限不足
  - 边界测试：空文件名、超长文件名、最近项目满 10 条、缩放上下限、和弦超时
  - 兼容性测试：Windows 路径与 Git 相对路径转换、浅色/深色主题切换
- **优先级定义**：
  - P0：阻塞，核心 IDE 可用性（菜单结构、文件打开/保存、Git 基础操作、构建）
  - P1：重要，效率功能（命令面板、快速打开、搜索、主题缩放、上下文菜单）
  - P2：一般，增强体验（About、Release Notes、Split Right 占位）

---

## 3. 测试环境

- **必要数据 / 前置配置**：
  - Electron 桌面应用可正常启动
  - 准备一个本地测试文件夹（含若干文件/子目录）
  - 准备一个本地 Git 仓库（含远程、分支、提交历史、未提交修改、未跟踪文件）
  - 准备一个可公开访问的 Git 仓库 URL（用于 Clone）
  - 可选：禁用网络环境用于 Clone 异常测试
- **用户权限 / 角色要求**：
  - 当前操作系统用户具备文件读写权限
  - 具备执行 `git` 命令的权限
  - 对测试目标文件夹具备删除权限

---

## 4. 测试用例表

### 4.1 菜单结构与基础交互

| 用例ID | 模块 | 标题 | 前置条件 | 测试步骤 | 预期结果 | 优先级 | 自动化 |
|---|---|---|---|---|---|---|---|
| TC-MENU-001 | MenuBar | 顶级菜单完整显示 | 启动应用 | 1. 查看标题栏下方菜单 | 出现 `File Edit View Code Git Terminal Help` 8 个菜单 | P0 | 不可 |
| TC-MENU-002 | MenuBar | 点击打开菜单 | 启动应用 | 1. 点击 `File` 菜单 | 下拉菜单展开，显示 New File、Open Folder、Save 等项 | P0 | 不可 |
| TC-MENU-003 | MenuBar | 鼠标悬停切换菜单 | 已打开 `File` 菜单 | 1. 鼠标移到 `Edit` 菜单 | `File` 菜单关闭，`Edit` 菜单展开 | P1 | 不可 |
| TC-MENU-004 | MenuBar | 点击外部关闭菜单 | 菜单已展开 | 1. 在菜单外点击 | 菜单关闭 | P1 | 不可 |
| TC-MENU-005 | MenuBar | 按 Esc 关闭菜单 | 菜单已展开 | 1. 按 Esc 键 | 菜单关闭 | P1 | 不可 |
| TC-MENU-006 | MenuBar | 嵌套子菜单展开 | 打开 `File > Preferences` 或 `View > Appearance` | 1. 鼠标悬停到含子菜单的项 | 子菜单正常展开且不重叠 | P1 | 不可 |
| TC-MENU-007 | MenuBar | 禁用项置灰不可点 | 未打开任何项目 | 1. 打开 `File` 菜单 | New File、New Folder、Close Folder 等置灰 | P0 | 不可 |
| TC-MENU-008 | MenuBar | 快捷键标签显示正确 | 启动应用 | 1. 展开各菜单 | 快捷键如 `Ctrl+S`、`Ctrl+K Ctrl+O` 正确显示 | P1 | 不可 |

### 4.2 File 菜单

| 用例ID | 模块 | 标题 | 前置条件 | 测试步骤 | 预期结果 | 优先级 | 自动化 |
|---|---|---|---|---|---|---|---|
| TC-FILE-001 | File | New File 创建文件 | 已打开项目 | 1. File > New File（或 Ctrl+N）<br>2. 输入 `test.js` 并确认 | 文件在选中目录/根目录创建成功，文件树刷新，toast 提示成功 | P0 | 不可 |
| TC-FILE-002 | File | New File 在未打开项目时禁用 | 未打开项目 | 1. 打开 File 菜单 | New File 置灰 | P0 | 不可 |
| TC-FILE-003 | File | New File 空名称 | 已打开项目 | 1. File > New File<br>2. 输入空字符确认 | 使用默认名创建（如 `untitled.txt`） | P1 | 不可 |
| TC-FILE-004 | File | New Folder 创建文件夹 | 已打开项目 | 1. File > New Folder（或 Ctrl+Shift+N）<br>2. 输入 `newfolder` 确认 | 文件夹创建成功并刷新 | P0 | 不可 |
| TC-FILE-005 | File | Open Folder 打开项目 | 应用启动 | 1. File > Open Folder（或 Ctrl+K Ctrl+O）<br>2. 选择本地测试文件夹 | 项目打开，文件树加载，最近项目列表更新 | P0 | 不可 |
| TC-FILE-006 | File | Open Folder 取消选择 | 应用启动 | 1. File > Open Folder<br>2. 取消选择 | 无项目打开，无错误 | P0 | 不可 |
| TC-FILE-007 | File | Clone Repository 成功 | 应用启动 | 1. File > Clone Repository<br>2. 输入有效 URL<br>3. 选择父目录 | 仓库克隆成功并自动打开 | P0 | 不可 |
| TC-FILE-008 | File | Clone Repository 无效 URL | 应用启动 | 1. File > Clone Repository<br>2. 输入无效 URL<br>3. 选择父目录 | 克隆失败，toast 提示错误，不切换项目 | P0 | 不可 |
| TC-FILE-009 | File | Clone Repository 取消 | 应用启动 | 1. File > Clone Repository<br>2. 输入 URL<br>3. 取消目录选择 | 不执行克隆 | P1 | 不可 |
| TC-FILE-010 | File | Open Recent 显示最近项目 | 已打开过至少一个项目 | 1. File > Open Recent | 列表显示最近打开的项目 | P0 | 不可 |
| TC-FILE-011 | File | Open Recent 空状态 | 未打开过项目 | 1. File > Open Recent | 显示 `No Recent Folders` 且置灰 | P1 | 不可 |
| TC-FILE-012 | File | Open Recent 打开项目 | 有最近项目 | 1. File > Open Recent > 选择某项目 | 项目重新打开 | P0 | 不可 |
| TC-FILE-013 | File | Clear Recent | 有最近项目 | 1. File > Open Recent > Clear Recent | 最近项目清空，再次查看显示空状态 | P1 | 不可 |
| TC-FILE-014 | File | Save 保存当前文件 | 当前标签有未保存修改 | 1. 修改文件<br>2. File > Save（或 Ctrl+S） | 文件写入磁盘，修改标记消失，toast 提示 Saved | P0 | 不可 |
| TC-FILE-015 | File | Save 无修改时禁用 | 当前标签无修改 | 1. 打开 File 菜单 | Save 置灰 | P0 | 不可 |
| TC-FILE-016 | File | Save All | 多个标签有未保存修改 | 1. 修改多个文件<br>2. File > Save All（或 Ctrl+K S） | 所有修改文件保存，toast 提示 All saved | P0 | 不可 |
| TC-FILE-017 | File | Close Editor | 有打开标签 | 1. File > Close Editor（或 Ctrl+W） | 当前标签关闭 | P1 | 不可 |
| TC-FILE-018 | File | Close Editor 无标签时禁用 | 无打开标签 | 1. 打开 File 菜单 | Close Editor 置灰 | P1 | 不可 |
| TC-FILE-019 | File | Close Folder 确认 | 已打开项目 | 1. File > Close Folder（或 Ctrl+K F）<br>2. 确认弹窗点击确认 | 项目关闭，所有标签关闭 | P1 | 不可 |
| TC-FILE-020 | File | Close Folder 取消 | 已打开项目 | 1. File > Close Folder<br>2. 点击取消 | 保持当前项目和标签 | P1 | 不可 |
| TC-FILE-021 | File | Preferences > Settings | 应用启动 | 1. File > Preferences > Settings（或 Ctrl+,） | Settings 弹窗打开，可切换主题 | P1 | 不可 |
| TC-FILE-022 | File | Preferences > Keyboard Shortcuts | 应用启动 | 1. File > Preferences > Keyboard Shortcuts（或 Ctrl+K Ctrl+S） | Keyboard Shortcuts Reference 弹窗打开 | P1 | 不可 |
| TC-FILE-023 | File | Exit | 应用启动 | 1. File > Exit | 应用关闭 | P0 | 不可 |

### 4.3 Edit 菜单

| 用例ID | 模块 | 标题 | 前置条件 | 测试步骤 | 预期结果 | 优先级 | 自动化 |
|---|---|---|---|---|---|---|---|
| TC-EDIT-001 | Edit | Undo | 编辑器有内容且可撤销 | 1. 输入字符<br>2. Edit > Undo（或 Ctrl+Z） | 内容撤销 | P0 | 不可 |
| TC-EDIT-002 | Edit | Redo | 已执行 Undo | 1. Edit > Redo（或 Ctrl+Shift+Z） | 内容恢复 | P0 | 不可 |
| TC-EDIT-003 | Edit | Cut / Copy / Paste | 编辑器有选区 | 1. 选中文本<br>2. Edit > Cut / Copy / Paste | 剪贴板行为正确 | P0 | 不可 |
| TC-EDIT-004 | Edit | Paste as Image 禁用 | 启动应用 | 1. 打开 Edit 菜单 | Paste as Image 置灰 | P1 | 不可 |
| TC-EDIT-005 | Edit | Find | 编辑器打开 | 1. Edit > Find（或 Ctrl+F） | 编辑器内查找框出现 | P1 | 不可 |
| TC-EDIT-006 | Edit | Replace | 编辑器打开 | 1. Edit > Replace（或 Ctrl+H） | 编辑器内替换框出现 | P1 | 不可 |
| TC-EDIT-007 | Edit | Find in Files | 应用启动 | 1. Edit > Find in Files（或 Ctrl+Shift+F） | SearchPanel 以 find 模式打开 | P1 | 不可 |
| TC-EDIT-008 | Edit | Replace in Files | 应用启动 | 1. Edit > Replace in Files（或 Ctrl+Shift+H） | SearchPanel 以 replace 模式打开 | P1 | 不可 |

### 4.4 View 菜单

| 用例ID | 模块 | 标题 | 前置条件 | 测试步骤 | 预期结果 | 优先级 | 自动化 |
|---|---|---|---|---|---|---|---|
| TC-VIEW-001 | View | Command Palette | 应用启动 | 1. View > Command Palette（或 Ctrl+Shift+P） | Command Palette 弹窗打开 | P0 | 不可 |
| TC-VIEW-002 | View | Sidebar 切换 | 应用启动 | 1. View > Sidebar（或 Ctrl+B） | 左侧边栏显示/隐藏切换 | P0 | 不可 |
| TC-VIEW-003 | View | Terminal 切换 | 应用启动 | 1. View > Terminal（或 Ctrl+`） | 底部终端显示/隐藏切换 | P0 | 不可 |
| TC-VIEW-004 | View | Appearance > Theme Dark/Light | 应用启动 | 1. View > Appearance > Theme > Light<br>2. 再次切换 Dark | 主题状态变化并持久化到 localStorage | P1 | 不可 |
| TC-VIEW-005 | View | Zoom In / Out / Reset | 应用启动 | 1. View > Appearance > Zoom In（Ctrl+=）<br>2. Zoom Out（Ctrl+-）<br>3. Reset Zoom（Ctrl+0） | 界面缩放变化，localStorage 持久化 | P1 | 不可 |
| TC-VIEW-006 | View | Zoom 边界 | 应用启动 | 1. 连续 Zoom In 至最大<br>2. 连续 Zoom Out 至最小 | 缩放不超过 2.0，不低于 0.5 | P1 | 不可 |
| TC-VIEW-007 | View | Full Screen | 应用启动 | 1. View > Full Screen（或 F11） | 应用进入全屏 | P2 | 不可 |

### 4.5 Code 菜单

| 用例ID | 模块 | 标题 | 前置条件 | 测试步骤 | 预期结果 | 优先级 | 自动化 |
|---|---|---|---|---|---|---|---|
| TC-CODE-001 | Code | Go to File | 已打开项目 | 1. Code > Go to File（或 Ctrl+P）<br>2. 输入文件名并回车 | 文件打开 | P0 | 不可 |
| TC-CODE-002 | Code | Go to Symbol | 编辑器打开 | 1. Code > Go to Symbol（或 Ctrl+Shift+O） | 编辑器符号导航出现 | P1 | 不可 |
| TC-CODE-003 | Code | Go to Line | 编辑器打开 | 1. Code > Go to Line（或 Ctrl+G） | 跳转到指定行对话框出现 | P1 | 不可 |
| TC-CODE-004 | Code | Go to Definition | 编辑器光标在符号上 | 1. Code > Go to Definition（或 F12） | 跳转到定义 | P1 | 不可 |
| TC-CODE-005 | Code | Format Document | 编辑器打开 | 1. Code > Format Document（或 Shift+Alt+F） | 文档格式化 | P1 | 不可 |
| TC-CODE-006 | Code | Format Selection | 编辑器有选区 | 1. Code > Format Selection（或 Ctrl+K Ctrl+F） | 选区格式化 | P1 | 不可 |
| TC-CODE-007 | Code | Comment Line | 编辑器打开 | 1. Code > Comment Line（或 Ctrl+/） | 当前行注释切换 | P2 | 不可 |

### 4.6 Git 菜单

| 用例ID | 模块 | 标题 | 前置条件 | 测试步骤 | 预期结果 | 优先级 | 自动化 |
|---|---|---|---|---|---|---|---|
| TC-GIT-001 | Git | Initialize Repository | 已打开非 Git 项目 | 1. Git > Initialize Repository | 项目初始化为 Git 仓库，toast 提示成功 | P0 | 不可 |
| TC-GIT-002 | Git | Initialize Repository 无项目时禁用 | 未打开项目 | 1. 打开 Git 菜单 | Initialize Repository 置灰 | P0 | 不可 |
| TC-GIT-003 | Git | Commit 打开提交面板 | 已打开 Git 项目 | 1. Git > Commit（或 Ctrl+K） | 左侧边栏切换到 Commit 面板 | P0 | 不可 |
| TC-GIT-004 | Git | Commit 非 Git 项目时禁用 | 非 Git 项目 | 1. 打开 Git 菜单 | Commit 置灰 | P0 | 不可 |
| TC-GIT-005 | Git | Push | 已打开 Git 项目且有远程 | 1. Git > Push（或 Ctrl+Shift+K） | 推送执行，toast 提示成功/失败 | P0 | 不可 |
| TC-GIT-006 | Git | Pull | 已打开 Git 项目 | 1. Git > Pull | 拉取执行并刷新状态 | P0 | 不可 |
| TC-GIT-007 | Git | Fetch | 已打开 Git 项目 | 1. Git > Fetch | Fetch 执行并刷新状态 | P0 | 不可 |
| TC-GIT-008 | Git | Update Project | 已打开 Git 项目 | 1. Git > Update Project（或 Ctrl+T） | 先 Fetch 再 Pull | P1 | 不可 |
| TC-GIT-009 | Git | Manage Remotes 打开弹窗 | 已打开 Git 项目 | 1. Git > Manage Remotes | Manage Remotes 弹窗打开，显示当前 remotes | P1 | 不可 |
| TC-GIT-010 | Git | Manage Remotes 添加远程 | Manage Remotes 弹窗打开 | 1. 输入 name 与 URL<br>2. 点击 Add | remote 添加成功并刷新列表 | P1 | 不可 |
| TC-GIT-011 | Git | Manage Remotes 删除远程 | 存在已配置 remote | 1. 点击某 remote 的 Remove | remote 删除成功 | P1 | 不可 |
| TC-GIT-012 | Git | 非 Git 项目时仓库级操作禁用 | 非 Git 项目 | 1. 打开 Git 菜单 | Push/Pull/Fetch/Update/Manage Remotes 置灰 | P0 | 不可 |

### 4.7 Terminal 菜单

| 用例ID | 模块 | 标题 | 前置条件 | 测试步骤 | 预期结果 | 优先级 | 自动化 |
|---|---|---|---|---|---|---|---|
| TC-TERM-001 | Terminal | New Terminal | 应用启动 | 1. Terminal > New Terminal（或 Ctrl+Shift+`） | 新建终端标签并聚焦 | P0 | 不可 |
| TC-TERM-002 | Terminal | Split Terminal | 已有终端 | 1. Terminal > Split Terminal | 新增终端标签 | P0 | 不可 |
| TC-TERM-003 | Terminal | Kill Terminal | 已有终端 | 1. Terminal > Kill Terminal | 当前终端被关闭 | P0 | 不可 |
| TC-TERM-004 | Terminal | Kill Terminal 无终端时禁用 | 无终端标签 | 1. 打开 Terminal 菜单 | Kill Terminal 置灰 | P1 | 不可 |
| TC-TERM-005 | Terminal | Clear Terminal | 已有终端且有输出 | 1. Terminal > Clear Terminal | 当前终端内容清空 | P1 | 不可 |
| TC-TERM-006 | Terminal | Scroll to Top | 已有终端且有输出 | 1. Terminal > Scroll to Top | 滚动到顶部 | P1 | 不可 |
| TC-TERM-007 | Terminal | Scroll to Bottom | 已有终端且有输出 | 1. Terminal > Scroll to Bottom | 滚动到底部 | P1 | 不可 |

### 4.8 Help 菜单

| 用例ID | 模块 | 标题 | 前置条件 | 测试步骤 | 预期结果 | 优先级 | 自动化 |
|---|---|---|---|---|---|---|---|
| TC-HELP-001 | Help | Welcome | 应用启动 | 1. Help > Welcome | 编辑器区域显示欢迎页 | P1 | 不可 |
| TC-HELP-002 | Help | Keyboard Shortcuts Reference | 应用启动 | 1. Help > Keyboard Shortcuts Reference | 快捷键参考弹窗打开 | P1 | 不可 |
| TC-HELP-003 | Help | Release Notes | 应用启动 | 1. Help > Release Notes | Release Notes 弹窗打开 | P1 | 不可 |
| TC-HELP-004 | Help | About | 应用启动 | 1. Help > About | About 弹窗打开，显示版本号 | P2 | 不可 |

### 4.9 命令面板 Command Palette

| 用例ID | 模块 | 标题 | 前置条件 | 测试步骤 | 预期结果 | 优先级 | 自动化 |
|---|---|---|---|---|---|---|---|
| TC-PAL-001 | CommandPalette | 搜索并执行命令 | 应用启动 | 1. Ctrl+Shift+P 打开<br>2. 输入 `save`<br>3. 回车选择 Save | 执行对应命令 | P0 | 不可 |
| TC-PAL-002 | CommandPalette | 空搜索显示全部 | 命令面板打开 | 1. 不输入或清空搜索 | 显示全部命令列表 | P1 | 不可 |
| TC-PAL-003 | CommandPalette | 无匹配结果 | 命令面板打开 | 1. 输入无意义字符 `xyzabc` | 显示 `No matching commands` | P1 | 不可 |
| TC-PAL-004 | CommandPalette | 方向键导航 | 命令面板打开 | 1. 输入关键字<br>2. 按上下方向键<br>3. 回车 | 高亮项移动并执行 | P1 | 不可 |
| TC-PAL-005 | CommandPalette | Esc 关闭 | 命令面板打开 | 1. 按 Esc | 面板关闭 | P1 | 不可 |

### 4.10 全局快捷键与和弦

| 用例ID | 模块 | 标题 | 前置条件 | 测试步骤 | 预期结果 | 优先级 | 自动化 |
|---|---|---|---|---|---|---|---|
| TC-KB-001 | Keyboard | Ctrl+K 和弦触发 Commit | 已打开 Git 项目 | 1. 按 Ctrl+K，保持 400ms 内不按第二键 | Commit 面板打开 | P0 | 不可 |
| TC-KB-002 | Keyboard | Ctrl+K Ctrl+O 打开文件夹 | 应用启动 | 1. 快速按 Ctrl+K 后 Ctrl+O | 文件夹选择对话框出现 | P0 | 不可 |
| TC-KB-003 | Keyboard | Ctrl+K S 保存全部 | 多个文件修改 | 1. 快速按 Ctrl+K 后 S | 全部保存 | P0 | 不可 |
| TC-KB-004 | Keyboard | Ctrl+K F 关闭文件夹 | 已打开项目 | 1. 快速按 Ctrl+K 后 F | 关闭文件夹确认弹窗出现 | P1 | 不可 |
| TC-KB-005 | Keyboard | Ctrl+K Ctrl+S 快捷键参考 | 应用启动 | 1. 快速按 Ctrl+K 后 Ctrl+S | Keyboard Shortcuts Reference 打开 | P1 | 不可 |
| TC-KB-006 | Keyboard | Ctrl+K Ctrl+F 格式化选区 | 编辑器有选区 | 1. 快速按 Ctrl+K 后 Ctrl+F | 选区格式化 | P1 | 不可 |
| TC-KB-007 | Keyboard | 和弦超时取消 | 应用启动 | 1. 按 Ctrl+K<br>2. 等待超过 400ms<br>3. 按 O | Commit 面板已打开，O 不再触发 Open Folder | P1 | 不可 |
| TC-KB-008 | Keyboard | 常用快捷键不冲突 | 应用启动 | 1. 测试 Ctrl+Z/Y/X/C/V/A/F/H/B/`` ` ``/=/+/−/0/P/G/F12 等 | 对应功能正常触发，浏览器默认行为被阻止 | P0 | 不可 |

### 4.11 上下文菜单

| 用例ID | 模块 | 标题 | 前置条件 | 测试步骤 | 预期结果 | 优先级 | 自动化 |
|---|---|---|---|---|---|---|---|
| TC-CTX-001 | TabBar | 标签页右键菜单 | 有打开标签 | 1. 右键标签页 | 显示 Close / Close Others / Close All / Split Right / Copy Path | P0 | 不可 |
| TC-CTX-002 | TabBar | 关闭其他标签 | 有多个标签 | 1. 右键某标签 > Close Others | 仅保留当前标签 | P1 | 不可 |
| TC-CTX-003 | TabBar | 复制路径 | 有打开标签 | 1. 右键标签 > Copy Path | 剪贴板内容为该文件绝对路径 | P1 | 不可 |
| TC-CTX-004 | FileTree | 文件树右键 @ in Terminal | 已打开项目 | 1. 右键某文件夹 > @ in Terminal | 终端在该目录打开 | P1 | 不可 |
| TC-CTX-005 | FileTree | 文件树右键 @ in Terminal 文件 | 已打开项目 | 1. 右键某文件 > @ in Terminal | 终端在该文件所在目录打开 | P1 | 不可 |
| TC-CTX-006 | Editor | 编辑器右键 Show Diff | 已打开 Git 项目中且有修改的文件 | 1. 右键编辑器内容区 > Show Diff | 打开 diff 标签 | P1 | 不可 |
| TC-CTX-007 | Editor | 编辑器右键 Show History | 已打开项目中 | 1. 右键编辑器内容区 > Show History | 历史版本面板打开 | P1 | 不可 |
| TC-CTX-008 | Editor | 编辑器右键 Discard Changes 确认 | 文件有未提交修改 | 1. 右键 > Discard Changes<br>2. 确认 | 文件恢复到最后提交状态 | P1 | 不可 |
| TC-CTX-009 | Editor | 编辑器右键 Discard Changes 取消 | 文件有未提交修改 | 1. 右键 > Discard Changes<br>2. 取消 | 文件内容不变 | P1 | 不可 |
| TC-CTX-010 | Editor | 编辑器右键 Git 项非 Git 项目隐藏/禁用 | 非 Git 项目 | 1. 右键编辑器内容区 | Show Diff / Show History / Discard Changes 不出现或不可用 | P1 | 不可 |

### 4.12 状态与持久化

| 用例ID | 模块 | 标题 | 前置条件 | 测试步骤 | 预期结果 | 优先级 | 自动化 |
|---|---|---|---|---|---|---|---|
| TC-STATE-001 | Theme | 主题持久化 | 应用启动 | 1. 切换为 Light 主题<br>2. 重启应用 | 应用读取 localStorage 保持 Light | P1 | 不可 |
| TC-STATE-002 | Zoom | 缩放持久化 | 应用启动 | 1. 调整缩放<br>2. 重启应用 | 缩放保持 | P1 | 不可 |
| TC-STATE-003 | Recent | 最近项目持久化 | 已打开项目 | 1. 关闭应用<br>2. 重新启动 | 最近项目列表保留 | P0 | 不可 |
| TC-STATE-004 | Recent | 最近项目上限 | 已打开超过 10 个项目 | 1. 查看 Open Recent | 仅保留最近 10 个 | P1 | 不可 |

### 4.13 构建与异常

| 用例ID | 模块 | 标题 | 前置条件 | 测试步骤 | 预期结果 | 优先级 | 自动化 |
|---|---|---|---|---|---|---|---|
| TC-BUILD-001 | Build | TypeScript 编译通过 | 代码已修改 | 1. 运行 `npx tsc -b` | 无错误 | P0 | 可 |
| TC-BUILD-002 | Build | Vite 构建通过 | 代码已修改 | 1. 运行 `npx vite build` | 构建成功 | P0 | 可 |
| TC-ERR-001 | ElectronAPI | API 不可用时提示 | 模拟无 Electron 环境 | 1. 执行依赖 electronAPI 的操作 | toast 提示 `Electron API not available` | P1 | 不可 |
| TC-ERR-002 | Storage | localStorage 写满 | 主题/缩放切换 | 1. 模拟 localStorage 满（如开发者工具）<br>2. 切换主题 | 不崩溃，主题仍生效 | P2 | 不可 |

---

## 5. 风险与依赖

- **外部依赖**：
  - 本地已安装 `git` 命令且版本支持 `--porcelain=v1`、`remote -v` 等参数
  - Electron `contextBridge` 正常暴露 `window.electronAPI`
  - Monaco Editor 支持 `editor.addAction` 注入右键菜单项
- **阻塞风险**：
  - 若 `git` 命令超时（30s）或进程被防火墙/杀毒软件拦截，Git 状态刷新会失败
  - Clone 操作依赖网络，测试环境需允许访问测试仓库
  - 浅色主题仅完成状态与存储，实际 CSS 变量未补齐，可能导致界面显示不一致
- **需人工验证点**：
  - 菜单在不同分辨率下的显示与对齐
  - Ctrl+K 和弦在中文输入法或远程桌面环境下的灵敏度
  - Monaco 右键菜单中 Git 项与其他扩展项的排序
  - 实际物理键盘中 `Ctrl+`` 与 `Ctrl+Shift+`` 的识别（不同键盘布局可能有差异）

---

## 6. 待确认项

- 浅色主题是否已有完整设计稿/色值规范？当前仅切换状态，未验证视觉效果。
- `Split Right` 当前为禁用占位项，具体分屏实现方案待确认。
- `Paste as Image` 后续是否接入 Claude 对话？当前仅做禁用展示。
- `Update Project` 在 PRD 中描述为 `Fetch + Pull/Rebase`，当前实现为 `Fetch + Pull`，Rebase 策略待确认。
