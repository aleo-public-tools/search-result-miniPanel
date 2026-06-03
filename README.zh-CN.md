# Search Result Mini Panel

[English](README.md) | [中文](README.zh-CN.md)

![Search Result Mini Panel icon](resources/icon.png)

为 VS Code 带来类似 Notepad++ 的搜索结果窗口。你可以搜索当前文件、选区或整个工作区，然后在紧凑的底部面板中查看每一条匹配行，并一键跳转到准确位置。

## 为什么使用

VS Code 内置搜索很强大，但它位于侧边栏，更适合完整的工作区搜索流程。Search Result Mini Panel 面向更快的编辑循环：一边写代码，一边在编辑器下方保留搜索结果，快速浏览匹配行，并在不改变当前工作布局的情况下跳转。

## 功能

- **类 Notepad++ 结果面板**：匹配行会按文件分组展示在底部 Panel 视图中。
- **点击跳转**：打开源文件、定位匹配位置，并选中匹配范围。
- **原生 Find Widget 联动**：按 `Cmd+F`，在 VS Code 编辑器查找框中输入查询词，再把该查询发送到结果面板。
- **面板内搜索栏**：直接在 `Search Results` 面板中搜索；默认搜索当前文件，勾选 `Workspace` 后搜索整个工作区。
- **灵活搜索范围**：支持当前文件、当前选区和整个工作区。
- **本地结果过滤**：按文件路径或匹配行文本过滤当前可见结果，不需要重新搜索。
- **紧凑文件分组**：支持展开、折叠、刷新、清空和复制可见结果。
- **工作区保护**：跳过疑似二进制文件和超过配置大小限制的文件。
- **主题适配 UI**：使用 VS Code 主题颜色，适配亮色、暗色和高对比度主题。

![Search Result Mini Panel icon search by panel button](resources/in_panel_result.png)
![Search Result Mini Panel icon search in current file](resources/search_01.png)
![Search Result Mini Panel icon search in current panel](resources/search_in_search_001.png)

## 快速开始

1. 打开命令面板。
2. 运行 `Search Result Mini Panel: Reveal Results`。
3. 在 `Search Results` 面板搜索栏中输入搜索文本。
4. 保持 `Workspace` 未勾选即可搜索当前文件；勾选后搜索整个工作区。
5. 点击任意匹配行即可跳转到源文件位置。

提示：如果你在编辑器中选中单行文本后运行 `Search Result Mini Panel: Search In Current File`，扩展会直接使用选中文本搜索，不再弹出输入框。

你也可以选中文本后运行 `Search Result Mini Panel: Search Selection In Current File`，只搜索当前选区。

## 面板搜索流程

`Search Results` 面板内置搜索栏，因此不需要记住命令名称或快捷键也能搜索。

1. 打开 `Search Results` 面板。
2. 在搜索栏输入查询词。
3. 按 `Enter` 或点击 `Search`。
4. 保持 `Workspace` 未勾选，搜索当前活动编辑器。
5. 勾选 `Workspace`，搜索当前工作区。

搜索完成后，面板会保留上一次查询词，因此可以快速在当前文件和工作区范围之间切换。

## 原生 Find Widget 流程

1. 在 macOS 上按 `Cmd+F`，或在 Windows/Linux 上按 `Ctrl+F`。
2. 在 VS Code 原生编辑器查找框中输入搜索词。
3. 保持查找框聚焦，在 macOS 上按 `Cmd+Shift+Enter`，或在 Windows/Linux 上按 `Ctrl+Shift+Enter`。
4. 当前 Find 查询会发送到 Search Result Mini Panel，并在底部面板中展示活动编辑器内的所有匹配项。

这样可以保留 VS Code 原生查找体验，同时为同一个查询增加类似 Notepad++ 的结果列表。

## 命令

| 命令 | 说明 |
| --- | --- |
| `Search Result Mini Panel: Search In Current File` | 搜索当前活动编辑器。 |
| `Search Result Mini Panel: Search Selection In Current File` | 只搜索当前编辑器选区。 |
| `Search Result Mini Panel: Search In Workspace` | 搜索当前工作区文件。 |
| `Search Result Mini Panel: Show Find Widget Results` | 将聚焦的编辑器 Find 查询发送到结果面板。 |
| `Search Result Mini Panel: Refresh Last Search` | 重新运行上一次搜索。 |
| `Search Result Mini Panel: Clear Results` | 清空结果面板。 |
| `Search Result Mini Panel: Reveal Results` | 显示 Search Results 面板。 |

## 快捷键

| 操作 | macOS | Windows/Linux |
| --- | --- | --- |
| 搜索当前文件 | `Cmd+Option+Shift+F` | `Ctrl+Alt+Shift+F` |
| 搜索当前选区 | `Cmd+Option+Shift+S` | `Ctrl+Alt+Shift+S` |
| 搜索工作区 | `Cmd+Option+Shift+W` | `Ctrl+Alt+Shift+W` |
| 显示结果面板 | `Cmd+Option+Shift+R` | `Ctrl+Alt+Shift+R` |
| 将原生 Find 查询发送到面板 | `Cmd+Shift+Enter` | `Ctrl+Shift+Enter` |

选中文本时，当前文件搜索快捷键会直接使用该选中文本搜索，不需要再弹出输入框或按 Enter。

你可以在 VS Code 中自定义所有快捷键：

1. 打开 `Preferences: Open Keyboard Shortcuts`。
2. 搜索 `Search Result Mini Panel`。
3. 修改或移除任意命令的快捷键绑定。

如果希望完全自己定义快捷键，可以将 `searchResultMiniPanel.enableDefaultKeybindings` 设置为 `false`。原生 Find Widget 联动快捷键也可以通过 `searchResultMiniPanel.enableFindWidgetKeybinding` 单独关闭。

## 配置

| 设置 | 默认值 | 说明 |
| --- | --- | --- |
| `searchResultMiniPanel.maxFileSizeBytes` | `2097152` | 工作区搜索包含的最大文件大小，单位为字节。 |
| `searchResultMiniPanel.maxResults` | `10000` | 单次搜索返回的最大总匹配数。 |
| `searchResultMiniPanel.maxMatchesPerFile` | `1000` | 单个文件返回的最大匹配数。 |
| `searchResultMiniPanel.maxConcurrentFiles` | `8` | 工作区搜索时并发搜索的文件数量。 |
| `searchResultMiniPanel.defaultSearchScope` | `currentFile` | 为后续 UI 扩展保留的默认搜索范围。 |
| `searchResultMiniPanel.contextLines` | `0` | 每个匹配项前后展示的上下文行数。 |
| `searchResultMiniPanel.excludeGlob` | `**/{node_modules,.git,out,dist,build}/**` | 工作区搜索默认排除的文件和文件夹。 |
| `searchResultMiniPanel.revealOnStartup` | `false` | VS Code 启动完成后自动显示 Search Results 面板。 |
| `searchResultMiniPanel.enableDefaultKeybindings` | `true` | 启用扩展默认快捷键集合。 |
| `searchResultMiniPanel.enableFindWidgetKeybinding` | `true` | 启用将原生编辑器 Find 查询发送到结果面板的快捷键。 |

## 已知限制

- 当前版本通过纯文本输入进行搜索。大小写敏感、全词匹配和正则表达式选项已在服务层实现，计划后续加入面板工具栏。
- VS Code 稳定版扩展 API 不直接暴露 Find Widget 的实时查询对象。Find Widget 联动会通过 VS Code 命令捕获聚焦的 Find 输入，并在完成后恢复剪贴板。
- 工作区搜索会以 UTF-8 解码文件，并跳过疑似二进制文件。
- 尚未包含替换功能和多搜索会话标签。

## 开发

安装依赖：

```bash
npm install
```

编译：

```bash
npm run compile
```

运行测试：

```bash
npm test
```

在 VS Code 中打开此文件夹并按 `F5`，即可启动 Extension Development Host。

## 发布说明

### 0.2.1

实现 `searchResultMiniPanel.contextLines` 配置。设置为大于 `0` 时，每个匹配项会显示配置数量的前后上下文行，并在匹配块之间展示细分割线，方便浏览带上下文的搜索结果。

### 0.2.0

在 `Search Results` 面板中新增搜索栏。现在面板默认支持搜索当前文件，并可通过 `Workspace` 复选框切换为工作区搜索，减少对命令面板入口或快捷键记忆的依赖。

新增 `searchResultMiniPanel.revealOnStartup` 可选设置，用于在 VS Code 启动后自动显示 `Search Results` 面板。该设置默认关闭。

### 0.1.0

初始版本包含当前文件搜索、选区搜索、工作区搜索、可自定义快捷键、原生 Find Widget 查询捕获、底部结果面板、本地过滤、分组结果、复制/刷新/清空操作，以及点击跳转导航。
