import * as vscode from 'vscode';
import { NavigationService } from '../services/NavigationService';
import { ResultStore } from '../state/ResultStore';
import {
  ExtensionToWebviewMessage,
  SearchPanelState,
  WebviewToExtensionMessage
} from '../types/search';

export class ResultPanelProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'searchResultMiniPanel.resultsView';
  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly resultStore: ResultStore,
    private readonly navigationService: NavigationService,
    private readonly onRefresh: () => Promise<void>,
    private readonly onClear: () => void
  ) {
    this.resultStore.onDidChangeState(state => this.postState(state));
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    const webview = webviewView.webview;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'src', 'views', 'webview')
      ]
    };
    webview.html = this.getHtml(webview);
    webview.onDidReceiveMessage(message => this.handleMessage(message as WebviewToExtensionMessage));
    this.postState(this.resultStore.getState());
  }

  private async handleMessage(message: WebviewToExtensionMessage): Promise<void> {
    switch (message.type) {
      case 'openMatch': {
        const match = this.resultStore.findMatch(message.matchId);
        if (!match) {
          vscode.window.showWarningMessage('Search result is no longer available.');
          return;
        }

        await this.navigationService.openMatch(match);
        break;
      }
      case 'refresh':
        await this.onRefresh();
        break;
      case 'clear':
        this.onClear();
        break;
      case 'copyResults':
        if (message.text) {
          await vscode.env.clipboard.writeText(message.text);
        }
        break;
      case 'updateViewState':
        this.resultStore.setViewState(message.viewState);
        break;
    }
  }

  private postState(state: SearchPanelState): void {
    const message: ExtensionToWebviewMessage = {
      type: 'stateChanged',
      state
    };
    this.view?.webview.postMessage(message);
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'src', 'views', 'webview', 'main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'src', 'views', 'webview', 'styles.css')
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <link href="${styleUri}" rel="stylesheet">
  <title>Search Results</title>
</head>
<body>
  <main class="app">
    <header class="toolbar">
      <div class="summary" id="summary">Search Results</div>
      <div class="actions">
        <button id="refreshButton" type="button" title="Refresh">Refresh</button>
        <button id="clearButton" type="button" title="Clear">Clear</button>
      </div>
    </header>
    <section class="filterRow">
      <input id="filterInput" type="search" placeholder="Filter results by path or line text" aria-label="Filter results">
      <button id="expandButton" type="button">Expand</button>
      <button id="collapseButton" type="button">Collapse</button>
      <button id="copyButton" type="button">Copy</button>
    </section>
    <section id="notice" class="notice" hidden></section>
    <section id="results" class="results" tabindex="0" aria-label="Search results"></section>
  </main>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let index = 0; index < 32; index += 1) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
