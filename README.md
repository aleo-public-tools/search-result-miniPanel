# Search Result Mini Panel

![Search Result Mini Panel icon](resources/icon.png)

Bring a Notepad++ style search result window to VS Code. Search the current file, selection, or workspace, then review every matching line in a compact bottom panel and jump straight to the exact match with one click.

## Why Use It

VS Code's built-in Search view is powerful, but it lives in the side bar and is designed for full workspace search workflows. Search Result Mini Panel is for the faster loop: run a search while editing, keep the results visible below the editor, scan matching lines, and jump between them without changing your working layout.

## Features

- **Notepad++ style result panel**: matched lines are grouped by file in a bottom Panel view.
- **Click-to-jump navigation**: open the source file, reveal the match, and select the matched range.
- **Flexible search scope**: search the current file, the current selection, or the whole workspace.
- **Local result filtering**: narrow visible results by file path or line text without running a new search.
- **Compact file groups**: expand, collapse, refresh, clear, and copy visible results.
- **Workspace safeguards**: skip likely binary files and files above the configured size limit.
- **Theme-aware UI**: uses VS Code theme colors for light, dark, and high-contrast themes.

## Getting Started

1. Open the Command Palette.
2. Run `Search Result Mini Panel: Search In Current File` or `Search Result Mini Panel: Search In Workspace`.
3. Enter your search text.
4. Review matches in the `Search Results` panel.
5. Click any matched line to jump to the source location.

You can also select text in the editor and run `Search Result Mini Panel: Search Selection In Current File`.

## Commands

| Command | Description |
| --- | --- |
| `Search Result Mini Panel: Search In Current File` | Search the active editor. |
| `Search Result Mini Panel: Search Selection In Current File` | Search only the selected range in the active editor. |
| `Search Result Mini Panel: Search In Workspace` | Search files in the current workspace. |
| `Search Result Mini Panel: Refresh Last Search` | Re-run the most recent search. |
| `Search Result Mini Panel: Clear Results` | Clear the result panel. |
| `Search Result Mini Panel: Reveal Results` | Show the Search Results panel. |

## Configuration

| Setting | Default | Description |
| --- | --- | --- |
| `searchResultMiniPanel.maxFileSizeBytes` | `2097152` | Maximum file size, in bytes, included in workspace search. |
| `searchResultMiniPanel.maxResults` | `10000` | Maximum total matches returned by a single search. |
| `searchResultMiniPanel.maxMatchesPerFile` | `1000` | Maximum matches returned per file. |
| `searchResultMiniPanel.maxConcurrentFiles` | `8` | Number of workspace files searched concurrently. |
| `searchResultMiniPanel.defaultSearchScope` | `currentFile` | Default search scope for future UI expansion. |
| `searchResultMiniPanel.contextLines` | `0` | Reserved for showing context lines around each match. |
| `searchResultMiniPanel.excludeGlob` | `**/{node_modules,.git,out,dist,build}/**` | Files and folders excluded from workspace search. |

## Known Limitations

- The first release uses plain text search from the command input. Case-sensitive, whole-word, and regular expression options are implemented in the service layer and are planned for the panel toolbar.
- Workspace search decodes files as UTF-8 and skips likely binary files.
- Replace and multi-session search result tabs are not included yet.

## Development

Install dependencies:

```bash
npm install
```

Compile:

```bash
npm run compile
```

Run tests:

```bash
npm test
```

Open this folder in VS Code and press `F5` to launch an Extension Development Host.

## Release Notes

### 0.1.0

Initial release with current-file, selection, and workspace search, a bottom result panel, local filtering, grouped results, copy/refresh/clear actions, and click-to-jump navigation.
