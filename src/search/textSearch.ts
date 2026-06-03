import * as path from 'path';
import * as vscode from 'vscode';
import {
  FileSearchResult,
  SearchContextLine,
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

  const lineReader = createSourceLineReader(source);
  const matches = occurrences.map((occurrence, index) =>
    toSearchMatch(source, request, occurrence, index, lineReader)
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
  index: number,
  lineReader: SourceLineReader
): SearchMatch {
  const baseOffset = source.baseOffset ?? 0;
  const absoluteStart = baseOffset + occurrence.start;
  const absoluteEnd = baseOffset + occurrence.end;
  const startPosition = lineReader.positionAt(absoluteStart, occurrence.start);
  const endPosition = lineReader.positionAt(absoluteEnd, occurrence.end);
  const lineInfo = lineReader.lineInfo(startPosition.line);
  const contextLines = clampContextLines(request.options.contextLines);

  return {
    id: `${request.id}:${source.uri.toString()}:${absoluteStart}:${index}`,
    uri: source.uri.toString(),
    line: startPosition.line,
    character: startPosition.character,
    endLine: endPosition.line,
    endCharacter: endPosition.character,
    previewText: lineInfo.text,
    matchText: occurrence.text,
    rangesInPreview: rangesForLinePreview(lineInfo.startOffset - baseOffset, occurrence),
    contextBefore: lineReader.contextBefore(startPosition.line, contextLines),
    contextAfter: lineReader.contextAfter(endPosition.line, contextLines)
  };
}

interface LineInfo {
  text: string;
  startOffset: number;
}

interface SourceLineReader {
  positionAt(absoluteOffset: number, relativeOffset: number): vscode.Position;
  lineInfo(line: number): LineInfo;
  contextBefore(line: number, count: number): SearchContextLine[];
  contextAfter(line: number, count: number): SearchContextLine[];
}

function createSourceLineReader(source: TextSearchSource): SourceLineReader {
  if (source.document) {
    return createDocumentLineReader(source.document);
  }

  return createTextLineReader(source.text);
}

function createDocumentLineReader(document: vscode.TextDocument): SourceLineReader {
  return {
    positionAt: absoluteOffset => document.positionAt(absoluteOffset),
    lineInfo: line => documentLineInfo(document, line),
    contextBefore: (line, count) => getContextLines(
      Math.max(0, line - count),
      line - 1,
      candidateLine => documentLineInfo(document, candidateLine).text
    ),
    contextAfter: (line, count) => getContextLines(
      line + 1,
      Math.min(document.lineCount - 1, line + count),
      candidateLine => documentLineInfo(document, candidateLine).text
    )
  };
}

function createTextLineReader(text: string): SourceLineReader {
  const lineStarts = createLineStarts(text);

  return {
    positionAt: (_absoluteOffset, relativeOffset) => positionAt(text, relativeOffset, lineStarts),
    lineInfo: line => textLineInfo(text, lineStarts, line),
    contextBefore: (line, count) => getContextLines(
      Math.max(0, line - count),
      line - 1,
      candidateLine => textLineInfo(text, lineStarts, candidateLine).text
    ),
    contextAfter: (line, count) => getContextLines(
      line + 1,
      Math.min(lineStarts.length - 1, line + count),
      candidateLine => textLineInfo(text, lineStarts, candidateLine).text
    )
  };
}

function documentLineInfo(document: vscode.TextDocument, line: number): LineInfo {
  const textLine = document.lineAt(line);
  return {
    text: textLine.text,
    startOffset: document.offsetAt(textLine.range.start)
  };
}

function textLineInfo(text: string, lineStarts: number[], line: number): LineInfo {
  const safeLine = Math.max(0, Math.min(line, lineStarts.length - 1));
  const lineStart = lineStarts[safeLine];
  const nextLineStart = lineStarts[safeLine + 1] ?? text.length;
  const lineEnd = nextLineStart > lineStart && text.charAt(nextLineStart - 1) === '\n'
    ? nextLineStart - 1
    : nextLineStart;

  return {
    text: text.slice(lineStart, trimCarriageReturn(text, lineEnd)),
    startOffset: lineStart
  };
}

function trimCarriageReturn(text: string, lineEnd: number): number {
  return lineEnd > 0 && text.charAt(lineEnd - 1) === '\r' ? lineEnd - 1 : lineEnd;
}

function positionAt(text: string, offset: number, lineStarts: number[]): vscode.Position {
  const safeOffset = Math.max(0, Math.min(offset, text.length));
  const line = lineAtOffset(lineStarts, safeOffset);
  const character = safeOffset - lineStarts[line];

  return new vscode.Position(line, character);
}

function createLineStarts(text: string): number[] {
  const lineStarts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text.charAt(index) === '\n') {
      lineStarts.push(index + 1);
    }
  }

  return lineStarts;
}

function lineAtOffset(lineStarts: number[], offset: number): number {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const lineStart = lineStarts[middle];
    const nextLineStart = lineStarts[middle + 1] ?? Number.POSITIVE_INFINITY;

    if (offset < lineStart) {
      high = middle - 1;
    } else if (offset >= nextLineStart) {
      low = middle + 1;
    } else {
      return middle;
    }
  }

  return Math.max(0, Math.min(lineStarts.length - 1, low));
}

function getContextLines(startLine: number, endLine: number, readLine: (line: number) => string): SearchContextLine[] {
  if (endLine < startLine) {
    return [];
  }

  const lines: SearchContextLine[] = [];
  for (let line = startLine; line <= endLine; line += 1) {
    lines.push({
      line,
      text: readLine(line)
    });
  }

  return lines;
}

function clampContextLines(value: number): number {
  return Math.max(0, Math.min(5, Math.floor(value)));
}

function getDisplayPath(uri: vscode.Uri): string {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  return workspaceFolder ? vscode.workspace.asRelativePath(uri, false) : uri.fsPath;
}
