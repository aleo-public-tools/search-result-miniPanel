import * as vscode from 'vscode';

export type SearchScope = 'currentFile' | 'selection' | 'workspace';

export interface SerializedRange {
  startLine: number;
  startCharacter: number;
  endLine: number;
  endCharacter: number;
}

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  includeGlob?: string;
  excludeGlob?: string;
  maxFileSizeBytes: number;
  maxResults: number;
  maxMatchesPerFile: number;
  maxConcurrentFiles: number;
  contextLines: number;
}

export interface SearchRequest {
  id: string;
  query: string;
  scope: SearchScope;
  options: SearchOptions;
  createdAt: number;
  source?: {
    uri?: string;
    selection?: SerializedRange;
  };
}

export interface PreviewRange {
  start: number;
  end: number;
}

export interface SearchContextLine {
  line: number;
  text: string;
}

export interface SearchMatch {
  id: string;
  uri: string;
  line: number;
  character: number;
  endLine: number;
  endCharacter: number;
  previewText: string;
  matchText: string;
  rangesInPreview: PreviewRange[];
  contextBefore: SearchContextLine[];
  contextAfter: SearchContextLine[];
}

export interface FileSearchResult {
  uri: string;
  workspaceRelativePath: string;
  fileName: string;
  matches: SearchMatch[];
}

export interface SkippedFile {
  uri: string;
  reason: 'tooLarge' | 'binary' | 'readError' | 'cancelled';
  message: string;
}

export interface SearchResultSet {
  requestId: string;
  query: string;
  scope: SearchScope;
  startedAt: number;
  finishedAt: number;
  totalFiles: number;
  matchedFiles: number;
  totalMatches: number;
  files: FileSearchResult[];
  skippedFiles: SkippedFile[];
  hitLimit: boolean;
}

export interface SearchError {
  message: string;
  detail?: string;
}

export type SearchPanelStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ResultViewState {
  collapsedFiles: string[];
  selectedMatchId?: string;
}

export interface SearchPanelState {
  status: SearchPanelStatus;
  lastRequest?: SearchRequest;
  resultSet?: SearchResultSet;
  error?: SearchError;
  viewState: ResultViewState;
}

export type ExtensionToWebviewMessage =
  | { type: 'stateChanged'; state: SearchPanelState };

export type WebviewToExtensionMessage =
  | { type: 'openMatch'; matchId: string }
  | { type: 'search'; query: string; scope: 'currentFile' | 'workspace' }
  | { type: 'refresh' }
  | { type: 'clear' }
  | { type: 'copyResults'; visibleOnly: boolean; text?: string }
  | { type: 'updateViewState'; viewState: ResultViewState };

export function serializeRange(range: vscode.Range): SerializedRange {
  return {
    startLine: range.start.line,
    startCharacter: range.start.character,
    endLine: range.end.line,
    endCharacter: range.end.character
  };
}

export function deserializeRange(range: SerializedRange): vscode.Range {
  return new vscode.Range(
    range.startLine,
    range.startCharacter,
    range.endLine,
    range.endCharacter
  );
}
