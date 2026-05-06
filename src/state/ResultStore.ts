import * as vscode from 'vscode';
import {
  ResultViewState,
  SearchError,
  SearchMatch,
  SearchPanelState,
  SearchRequest,
  SearchResultSet
} from '../types/search';

export class ResultStore {
  private state: SearchPanelState = {
    status: 'idle',
    viewState: {
      collapsedFiles: []
    }
  };

  private readonly changeEmitter = new vscode.EventEmitter<SearchPanelState>();
  readonly onDidChangeState = this.changeEmitter.event;

  getState(): SearchPanelState {
    return this.state;
  }

  setLoading(request: SearchRequest): void {
    this.state = {
      ...this.state,
      status: 'loading',
      lastRequest: request,
      error: undefined
    };
    this.emit();
  }

  setResults(resultSet: SearchResultSet): void {
    this.state = {
      ...this.state,
      status: 'ready',
      resultSet,
      error: undefined
    };
    this.emit();
  }

  setError(error: SearchError): void {
    this.state = {
      ...this.state,
      status: 'error',
      error
    };
    this.emit();
  }

  setViewState(viewState: ResultViewState): void {
    this.state = {
      ...this.state,
      viewState
    };
    this.emit();
  }

  clear(): void {
    this.state = {
      status: 'idle',
      lastRequest: this.state.lastRequest,
      viewState: {
        collapsedFiles: []
      }
    };
    this.emit();
  }

  findMatch(matchId: string): SearchMatch | undefined {
    for (const file of this.state.resultSet?.files ?? []) {
      const match = file.matches.find(candidate => candidate.id === matchId);
      if (match) {
        return match;
      }
    }

    return undefined;
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }

  private emit(): void {
    this.changeEmitter.fire(this.state);
  }
}
