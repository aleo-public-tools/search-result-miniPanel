import * as path from 'path';
import * as vscode from 'vscode';
import {
  FileSearchResult,
  SearchMatch,
  SearchOptions,
  SearchRequest
} from '../types/search';
import { buildMatcher, findMatches, MatchOccurrence, rangesForLinePreview } from './matcher';

export interface TextSearchSource {
  uri: vscode.Uri;
  text: string;
  document?: vscode.TextDocument;
  baseOffset?: number;
  workspaceRelativePath?: string;
}

export function searchTextSource(source: TextSearchSource, request: SearchRequest): FileSearchResult | undefined {
  const matcher = buildMatcher(request.query, request.options);
  const occurrences = findMatches(source.text, matcher, request.options.maxMatchesPerFile);

  if (occurrences.length === 0) {
    return undefined;
  }

  const matches = occurrences.map((occurrence, index) =>
    toSearchMatch(source, request, occurrence, index)
  );

  return {
    uri: source.uri.toString(),
    workspaceRelativePath: source.workspaceRelativePath ?? getDisplayPath(source.uri),
    fileName: path.basename(source.uri.fsPath),
    matches
  };
}

function toSearchMatch(
  source: TextSearchSource,
  request: SearchRequest,
  occurrence: MatchOccurrence,
  index: number
): SearchMatch {
  const baseOffset = source.baseOffset ?? 0;
  const absoluteStart = baseOffset + occurrence.start;
  const absoluteEnd = baseOffset + occurrence.end;
  const startPosition = source.document
    ? source.document.positionAt(absoluteStart)
    : positionAt(source.text, occurrence.start);
  const endPosition = source.document
    ? source.document.positionAt(absoluteEnd)
    : positionAt(source.text, occurrence.end);
  const lineInfo = source.document
    ? documentLineInfo(source.document, startPosition.line)
    : textLineInfo(source.text, occurrence.start);

  return {
    id: `${request.id}:${source.uri.toString()}:${absoluteStart}:${index}`,
    uri: source.uri.toString(),
    line: startPosition.line,
    character: startPosition.character,
    endLine: endPosition.line,
    endCharacter: endPosition.character,
    previewText: lineInfo.text,
    matchText: occurrence.text,
    rangesInPreview: rangesForLinePreview(lineInfo.startOffset - baseOffset, occurrence)
  };
}

function documentLineInfo(document: vscode.TextDocument, line: number): { text: string; startOffset: number } {
  const textLine = document.lineAt(line);
  return {
    text: textLine.text,
    startOffset: document.offsetAt(textLine.range.start)
  };
}

function textLineInfo(text: string, offset: number): { text: string; startOffset: number } {
  const lineStart = text.lastIndexOf('\n', Math.max(0, offset - 1)) + 1;
  const nextLineBreak = text.indexOf('\n', offset);
  const lineEnd = nextLineBreak === -1 ? text.length : nextLineBreak;
  return {
    text: text.slice(lineStart, trimCarriageReturn(text, lineEnd)),
    startOffset: lineStart
  };
}

function trimCarriageReturn(text: string, lineEnd: number): number {
  return lineEnd > 0 && text.charAt(lineEnd - 1) === '\r' ? lineEnd - 1 : lineEnd;
}

function positionAt(text: string, offset: number): vscode.Position {
  const safeOffset = Math.max(0, Math.min(offset, text.length));
  let line = 0;
  let character = 0;

  for (let index = 0; index < safeOffset; index += 1) {
    if (text.charAt(index) === '\n') {
      line += 1;
      character = 0;
    } else {
      character += 1;
    }
  }

  return new vscode.Position(line, character);
}

function getDisplayPath(uri: vscode.Uri): string {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  return workspaceFolder ? vscode.workspace.asRelativePath(uri, false) : uri.fsPath;
}
