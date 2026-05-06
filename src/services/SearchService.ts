import * as vscode from 'vscode';
import { CurrentFileSearchEngine } from '../search/CurrentFileSearchEngine';
import { WorkspaceSearchEngine } from '../search/WorkspaceSearchEngine';
import { buildMatcher } from '../search/matcher';
import {
  FileSearchResult,
  SearchRequest,
  SearchResultSet,
  SkippedFile
} from '../types/search';

export class SearchService {
  constructor(
    private readonly currentFileEngine = new CurrentFileSearchEngine(),
    private readonly workspaceEngine = new WorkspaceSearchEngine()
  ) {}

  async search(request: SearchRequest, token?: vscode.CancellationToken): Promise<SearchResultSet> {
    const startedAt = Date.now();
    buildMatcher(request.query, request.options);

    let files: FileSearchResult[] = [];
    let skippedFiles: SkippedFile[] = [];
    let totalFiles = 1;
    let hitLimit = false;

    if (request.scope === 'workspace') {
      const workspaceResult = await this.workspaceEngine.search(request, token);
      files = workspaceResult.files;
      skippedFiles = workspaceResult.skippedFiles;
      totalFiles = workspaceResult.totalFiles;
      hitLimit = workspaceResult.hitLimit;
    } else {
      files = await this.currentFileEngine.search(request);
    }

    let totalMatches = 0;
    const limitedFiles: FileSearchResult[] = [];

    for (const file of files) {
      if (totalMatches >= request.options.maxResults) {
        hitLimit = true;
        break;
      }

      const remaining = request.options.maxResults - totalMatches;
      const matches = file.matches.slice(0, remaining);
      totalMatches += matches.length;
      limitedFiles.push({ ...file, matches });

      if (file.matches.length > matches.length) {
        hitLimit = true;
      }
    }

    return {
      requestId: request.id,
      query: request.query,
      scope: request.scope,
      startedAt,
      finishedAt: Date.now(),
      totalFiles,
      matchedFiles: limitedFiles.length,
      totalMatches,
      files: limitedFiles,
      skippedFiles,
      hitLimit
    };
  }
}
