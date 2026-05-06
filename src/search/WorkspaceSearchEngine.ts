import * as path from 'path';
import * as vscode from 'vscode';
import {
  FileSearchResult,
  SearchRequest,
  SearchResultSet,
  SkippedFile
} from '../types/search';
import { searchTextSource } from './textSearch';

const DEFAULT_INCLUDE = '**/*';
const BINARY_EXTENSIONS = new Set([
  '.7z',
  '.bmp',
  '.class',
  '.dll',
  '.dmg',
  '.exe',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.mov',
  '.mp3',
  '.mp4',
  '.pdf',
  '.png',
  '.so',
  '.ttf',
  '.webp',
  '.woff',
  '.woff2',
  '.zip'
]);

export class WorkspaceSearchEngine {
  async search(request: SearchRequest, token?: vscode.CancellationToken): Promise<Pick<SearchResultSet, 'files' | 'skippedFiles' | 'totalFiles' | 'hitLimit'>> {
    if (!vscode.workspace.workspaceFolders?.length) {
      throw new Error('Open a workspace before running workspace search.');
    }

    const include = request.options.includeGlob?.trim() || DEFAULT_INCLUDE;
    const exclude = request.options.excludeGlob?.trim() || undefined;
    const uris = await vscode.workspace.findFiles(include, exclude, undefined, token);
    const files: FileSearchResult[] = [];
    const skippedFiles: SkippedFile[] = [];
    let totalMatches = 0;
    let hitLimit = false;
    let cursor = 0;

    const worker = async () => {
      while (cursor < uris.length && !token?.isCancellationRequested && !hitLimit) {
        const uri = uris[cursor];
        cursor += 1;

        const result = await this.searchFile(uri, request, token);
        if (result.skipped) {
          skippedFiles.push(result.skipped);
          continue;
        }

        if (result.fileResult) {
          files.push(result.fileResult);
          totalMatches += result.fileResult.matches.length;

          if (totalMatches >= request.options.maxResults) {
            hitLimit = true;
          }
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(request.options.maxConcurrentFiles, Math.max(1, uris.length)) },
      () => worker()
    );

    await Promise.all(workers);

    files.sort((a, b) => a.workspaceRelativePath.localeCompare(b.workspaceRelativePath));

    if (token?.isCancellationRequested) {
      skippedFiles.push({
        uri: '',
        reason: 'cancelled',
        message: 'Search was cancelled.'
      });
    }

    return {
      files,
      skippedFiles,
      totalFiles: uris.length,
      hitLimit
    };
  }

  private async searchFile(
    uri: vscode.Uri,
    request: SearchRequest,
    token?: vscode.CancellationToken
  ): Promise<{ fileResult?: FileSearchResult; skipped?: SkippedFile }> {
    if (token?.isCancellationRequested) {
      return {
        skipped: {
          uri: uri.toString(),
          reason: 'cancelled',
          message: 'Search was cancelled.'
        }
      };
    }

    if (BINARY_EXTENSIONS.has(path.extname(uri.fsPath).toLowerCase())) {
      return {
        skipped: {
          uri: uri.toString(),
          reason: 'binary',
          message: 'Skipped likely binary file.'
        }
      };
    }

    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.size > request.options.maxFileSizeBytes) {
        return {
          skipped: {
            uri: uri.toString(),
            reason: 'tooLarge',
            message: `Skipped file larger than ${request.options.maxFileSizeBytes} bytes.`
          }
        };
      }

      const bytes = await vscode.workspace.fs.readFile(uri);
      if (looksBinary(bytes)) {
        return {
          skipped: {
            uri: uri.toString(),
            reason: 'binary',
            message: 'Skipped likely binary file.'
          }
        };
      }

      const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      const fileResult = searchTextSource(
        {
          uri,
          text,
          workspaceRelativePath: vscode.workspace.asRelativePath(uri, false)
        },
        request
      );

      return { fileResult };
    } catch (error) {
      return {
        skipped: {
          uri: uri.toString(),
          reason: 'readError',
          message: error instanceof Error ? error.message : 'Unable to read file.'
        }
      };
    }
  }
}

function looksBinary(bytes: Uint8Array): boolean {
  const sampleSize = Math.min(bytes.length, 4096);
  if (sampleSize === 0) {
    return false;
  }

  let zeroBytes = 0;
  for (let index = 0; index < sampleSize; index += 1) {
    if (bytes[index] === 0) {
      zeroBytes += 1;
    }
  }

  return zeroBytes > sampleSize * 0.01;
}
