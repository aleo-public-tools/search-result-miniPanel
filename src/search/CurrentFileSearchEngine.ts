import * as vscode from 'vscode';
import { FileSearchResult, SearchRequest, serializeRange } from '../types/search';
import { searchTextSource } from './textSearch';

export class CurrentFileSearchEngine {
  async search(request: SearchRequest): Promise<FileSearchResult[]> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      throw new Error('No active editor is available.');
    }

    const document = editor.document;
    const selection = request.scope === 'selection'
      ? getSearchSelection(editor)
      : undefined;

    if (request.scope === 'selection' && !selection) {
      throw new Error('Select text before running selection search.');
    }

    const text = selection ? document.getText(selection) : document.getText();
    const baseOffset = selection ? document.offsetAt(selection.start) : 0;
    const result = searchTextSource(
      {
        uri: document.uri,
        text,
        document,
        baseOffset,
        workspaceRelativePath: vscode.workspace.asRelativePath(document.uri, false)
      },
      {
        ...request,
        source: {
          uri: document.uri.toString(),
          selection: selection ? serializeRange(selection) : undefined
        }
      }
    );

    return result ? [result] : [];
  }
}

function getSearchSelection(editor: vscode.TextEditor): vscode.Range | undefined {
  const selection = editor.selection;
  if (selection.isEmpty) {
    return undefined;
  }

  return new vscode.Range(selection.start, selection.end);
}
