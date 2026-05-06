import * as vscode from 'vscode';

export class FindWidgetQueryCaptureService {
  async captureFocusedFindInput(): Promise<string | undefined> {
    const previousClipboard = await vscode.env.clipboard.readText();

    try {
      await vscode.commands.executeCommand('editor.action.selectAll');
      await vscode.commands.executeCommand('editor.action.clipboardCopyAction');
      const captured = await vscode.env.clipboard.readText();
      return captured.length > 0 ? captured : undefined;
    } finally {
      await vscode.env.clipboard.writeText(previousClipboard);
    }
  }
}
