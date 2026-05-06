import * as vscode from 'vscode';
import { SearchMatch } from '../types/search';

export class NavigationService {
  async openMatch(match: SearchMatch): Promise<void> {
    const uri = vscode.Uri.parse(match.uri);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document, {
      preview: false,
      preserveFocus: false
    });

    const range = new vscode.Range(
      match.line,
      match.character,
      match.endLine,
      match.endCharacter
    );

    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  }
}
