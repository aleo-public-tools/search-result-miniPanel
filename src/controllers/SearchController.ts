import * as vscode from 'vscode';
import { FindWidgetQueryCaptureService } from '../services/FindWidgetQueryCaptureService';
import { SearchService } from '../services/SearchService';
import { ResultStore } from '../state/ResultStore';
import { SearchOptions, SearchRequest, SearchScope } from '../types/search';

export class SearchController {
  private cancellation?: vscode.CancellationTokenSource;

  constructor(
    private readonly searchService: SearchService,
    private readonly resultStore: ResultStore,
    private readonly findWidgetQueryCaptureService = new FindWidgetQueryCaptureService()
  ) {}

  async searchInCurrentFile(): Promise<void> {
    const selectedQuery = getSelectedSingleLineQuery();
    if (selectedQuery) {
      await this.executeSearch({
        id: createRequestId(),
        query: selectedQuery,
        scope: 'currentFile',
        options: getSearchOptions(),
        createdAt: Date.now()
      });
      return;
    }

    await this.runInteractiveSearch('currentFile');
  }

  async searchSelectionInCurrentFile(): Promise<void> {
    await this.runInteractiveSearch('selection');
  }

  async searchInWorkspace(): Promise<void> {
    await this.runInteractiveSearch('workspace');
  }

  async searchFromFindWidget(): Promise<void> {
    const query = await this.findWidgetQueryCaptureService.captureFocusedFindInput();
    if (!query) {
      vscode.window.showInformationMessage('Focus the editor Find box and enter a query before sending results to Search Result Mini Panel.');
      return;
    }

    await this.executeSearch({
      id: createRequestId(),
      query,
      scope: 'currentFile',
      options: getSearchOptions(),
      createdAt: Date.now()
    });
  }

  async refreshLastSearch(): Promise<void> {
    const request = this.resultStore.getState().lastRequest;
    if (!request) {
      vscode.window.showInformationMessage('No previous search to refresh.');
      return;
    }

    await this.executeSearch({
      ...request,
      id: createRequestId(),
      createdAt: Date.now()
    });
  }

  clearResults(): void {
    this.cancelCurrentSearch();
    this.resultStore.clear();
  }

  dispose(): void {
    this.cancelCurrentSearch();
  }

  private async runInteractiveSearch(scope: SearchScope): Promise<void> {
    const query = await this.promptForQuery(scope);
    if (!query) {
      return;
    }

    const request: SearchRequest = {
      id: createRequestId(),
      query,
      scope,
      options: getSearchOptions(),
      createdAt: Date.now()
    };

    await this.executeSearch(request);
  }

  private async promptForQuery(scope: SearchScope): Promise<string | undefined> {
    const editor = vscode.window.activeTextEditor;
    const selectedText = editor && !editor.selection.isEmpty
      ? editor.document.getText(editor.selection)
      : undefined;
    const value = selectedText && !selectedText.includes('\n') ? selectedText : undefined;

    return vscode.window.showInputBox({
      title: scope === 'workspace' ? 'Search in Workspace' : 'Search in Current File',
      prompt: 'Enter text or a regular expression to search for.',
      value,
      ignoreFocusOut: true,
      validateInput: input => input.trim() ? undefined : 'Search query cannot be empty.'
    });
  }

  private async executeSearch(request: SearchRequest): Promise<void> {
    this.cancelCurrentSearch();
    this.cancellation = new vscode.CancellationTokenSource();
    this.resultStore.setLoading(request);
    await revealResultsPanel();

    try {
      const run = () => this.searchService.search(request, this.cancellation?.token);
      const resultSet = request.scope === 'workspace'
        ? await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: `Searching workspace for "${request.query}"`,
              cancellable: true
            },
            async (_progress, token) => {
              token.onCancellationRequested(() => this.cancellation?.cancel());
              return run();
            }
          )
        : await run();

      if (this.cancellation?.token.isCancellationRequested) {
        return;
      }

      this.resultStore.setResults(resultSet);
    } catch (error) {
      if (this.cancellation?.token.isCancellationRequested) {
        return;
      }

      this.resultStore.setError({
        message: error instanceof Error ? error.message : 'Search failed.'
      });
      vscode.window.showErrorMessage(error instanceof Error ? error.message : 'Search failed.');
    }
  }

  private cancelCurrentSearch(): void {
    this.cancellation?.cancel();
    this.cancellation?.dispose();
    this.cancellation = undefined;
  }
}

export function getSearchOptions(): SearchOptions {
  const config = vscode.workspace.getConfiguration('searchResultMiniPanel');
  return {
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    includeGlob: undefined,
    excludeGlob: config.get<string>('excludeGlob') || undefined,
    maxFileSizeBytes: config.get<number>('maxFileSizeBytes') ?? 2 * 1024 * 1024,
    maxResults: config.get<number>('maxResults') ?? 10000,
    maxMatchesPerFile: config.get<number>('maxMatchesPerFile') ?? 1000,
    maxConcurrentFiles: config.get<number>('maxConcurrentFiles') ?? 8,
    contextLines: config.get<number>('contextLines') ?? 0
  };
}

export async function revealResultsPanel(): Promise<void> {
  await vscode.commands.executeCommand('workbench.view.extension.searchResultMiniPanel');
}

function createRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getSelectedSingleLineQuery(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    return undefined;
  }

  const selectedText = editor.document.getText(editor.selection);
  if (!selectedText || selectedText.includes('\n') || selectedText.includes('\r')) {
    return undefined;
  }

  return selectedText.trim() ? selectedText : undefined;
}
