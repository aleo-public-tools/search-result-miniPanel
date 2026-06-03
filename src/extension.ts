import * as vscode from 'vscode';
import { SearchController, revealResultsPanel } from './controllers/SearchController';
import { NavigationService } from './services/NavigationService';
import { SearchService } from './services/SearchService';
import { ResultStore } from './state/ResultStore';
import { ResultPanelProvider } from './views/ResultPanelProvider';

export function activate(context: vscode.ExtensionContext): void {
  const resultStore = new ResultStore();
  const searchService = new SearchService();
  const navigationService = new NavigationService();
  const controller = new SearchController(searchService, resultStore);
  const panelProvider = new ResultPanelProvider(
    context.extensionUri,
    resultStore,
    navigationService,
    (query, scope) => controller.searchFromPanel(query, scope),
    () => controller.refreshLastSearch(),
    () => controller.clearResults()
  );

  context.subscriptions.push(
    resultStore,
    controller,
    vscode.window.registerWebviewViewProvider(ResultPanelProvider.viewType, panelProvider, {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    }),
    vscode.commands.registerCommand('searchResultMiniPanel.searchInCurrentFile', () => controller.searchInCurrentFile()),
    vscode.commands.registerCommand('searchResultMiniPanel.searchSelectionInCurrentFile', () => controller.searchSelectionInCurrentFile()),
    vscode.commands.registerCommand('searchResultMiniPanel.searchInWorkspace', () => controller.searchInWorkspace()),
    vscode.commands.registerCommand('searchResultMiniPanel.searchFromFindWidget', () => controller.searchFromFindWidget()),
    vscode.commands.registerCommand('searchResultMiniPanel.refresh', () => controller.refreshLastSearch()),
    vscode.commands.registerCommand('searchResultMiniPanel.clear', () => controller.clearResults()),
    vscode.commands.registerCommand('searchResultMiniPanel.revealPanel', () => revealResultsPanel())
  );

  const config = vscode.workspace.getConfiguration('searchResultMiniPanel');
  if (config.get<boolean>('revealOnStartup')) {
    void revealResultsPanel();
  }
}

export function deactivate(): void {}
