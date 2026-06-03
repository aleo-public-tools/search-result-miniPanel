(function () {
  const vscode = acquireVsCodeApi();
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const workspaceScopeInput = document.getElementById('workspaceScopeInput');
  const summary = document.getElementById('summary');
  const refreshButton = document.getElementById('refreshButton');
  const clearButton = document.getElementById('clearButton');
  const expandButton = document.getElementById('expandButton');
  const collapseButton = document.getElementById('collapseButton');
  const copyButton = document.getElementById('copyButton');
  const filterInput = document.getElementById('filterInput');
  const notice = document.getElementById('notice');
  const results = document.getElementById('results');

  let state = {
    status: 'idle',
    viewState: {
      collapsedFiles: []
    }
  };
  let filterText = '';
  let selectedMatchId;

  searchForm.addEventListener('submit', event => {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) {
      searchInput.focus();
      return;
    }
    post({
      type: 'search',
      query,
      scope: workspaceScopeInput.checked ? 'workspace' : 'currentFile'
    });
  });
  workspaceScopeInput.addEventListener('change', () => {
    searchInput.placeholder = workspaceScopeInput.checked ? 'Search workspace' : 'Search current file';
  });
  refreshButton.addEventListener('click', () => post({ type: 'refresh' }));
  clearButton.addEventListener('click', () => post({ type: 'clear' }));
  expandButton.addEventListener('click', () => {
    state.viewState.collapsedFiles = [];
    saveViewState();
    render();
  });
  collapseButton.addEventListener('click', () => {
    state.viewState.collapsedFiles = getVisibleFiles().map(file => file.uri);
    saveViewState();
    render();
  });
  copyButton.addEventListener('click', () => {
    post({
      type: 'copyResults',
      visibleOnly: true,
      text: formatVisibleResults()
    });
  });
  filterInput.addEventListener('input', () => {
    filterText = filterInput.value.trim().toLowerCase();
    render();
  });
  results.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSelection(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSelection(-1);
    } else if (event.key === 'Enter' && selectedMatchId) {
      event.preventDefault();
      post({ type: 'openMatch', matchId: selectedMatchId });
    }
  });

  window.addEventListener('message', event => {
    const message = event.data;
    if (message.type === 'stateChanged') {
      state = message.state;
      selectedMatchId = state.viewState.selectedMatchId;
      if (state.lastRequest?.query) {
        searchInput.value = state.lastRequest.query;
      }
      if (state.lastRequest?.scope) {
        workspaceScopeInput.checked = state.lastRequest.scope === 'workspace';
        searchInput.placeholder = workspaceScopeInput.checked ? 'Search workspace' : 'Search current file';
      }
      render();
    }
  });

  function render() {
    renderSummary();
    renderNotice();
    replaceChildren(results);

    const visibleFiles = getVisibleFiles();
    if (state.status === 'idle') {
      results.appendChild(emptyBlock('Run a search command to show matches here.'));
      return;
    }

    if (state.status === 'loading') {
      results.appendChild(emptyBlock('Searching...'));
      return;
    }

    if (state.status === 'error') {
      results.appendChild(emptyBlock(state.error?.message || 'Search failed.'));
      return;
    }

    if (visibleFiles.length === 0) {
      results.appendChild(emptyBlock('No matches found.'));
      return;
    }

    for (const file of visibleFiles) {
      results.appendChild(renderFile(file));
    }

    ensureSelectedMatch();
  }

  function renderSummary() {
    if (state.status === 'loading' && state.lastRequest) {
      summary.textContent = `Searching "${state.lastRequest.query}"`;
      return;
    }

    const resultSet = state.resultSet;
    if (!resultSet) {
      summary.textContent = 'Search Results';
      return;
    }

    const elapsed = Math.max(0, resultSet.finishedAt - resultSet.startedAt);
    summary.textContent = `"${resultSet.query}"  ${resultSet.matchedFiles} files  ${resultSet.totalMatches} matches  ${elapsed} ms`;
  }

  function renderNotice() {
    const resultSet = state.resultSet;
    const messages = [];
    if (resultSet?.hitLimit) {
      messages.push('Result limit reached.');
    }
    if (resultSet?.skippedFiles?.length) {
      messages.push(`${resultSet.skippedFiles.length} files skipped.`);
    }
    if (state.status === 'error' && state.error?.message) {
      messages.push(state.error.message);
    }

    notice.hidden = messages.length === 0;
    notice.textContent = messages.join(' ');
  }

  function renderFile(file) {
    const section = document.createElement('section');
    section.className = 'fileGroup';
    section.dataset.uri = file.uri;

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'fileHeader';
    header.addEventListener('click', () => {
      toggleFile(file.uri);
    });

    const collapsed = isCollapsed(file.uri);
    const twisty = document.createElement('span');
    twisty.className = 'twisty';
    twisty.textContent = collapsed ? '>' : 'v';

    const path = document.createElement('span');
    path.className = 'filePath';
    path.textContent = file.workspaceRelativePath;

    const count = document.createElement('span');
    count.className = 'matchCount';
    count.textContent = `${file.matches.length}`;

    header.append(twisty, path, count);
    section.appendChild(header);

    if (!collapsed) {
      const list = document.createElement('div');
      list.className = 'matchList';
      for (const match of file.matches) {
        list.appendChild(renderMatch(match));
      }
      section.appendChild(list);
    }

    return section;
  }

  function renderMatch(match) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'matchRow';
    row.dataset.matchId = match.id;
    row.setAttribute('aria-label', `${match.line + 1}:${match.character + 1} ${match.previewText}`);
    if (match.id === selectedMatchId) {
      row.classList.add('selected');
    }
    row.addEventListener('click', () => {
      selectedMatchId = match.id;
      saveViewState();
      render();
      post({ type: 'openMatch', matchId: match.id });
    });

    const location = document.createElement('span');
    location.className = 'location';
    location.textContent = `${match.line + 1}:${match.character + 1}`;

    const preview = document.createElement('span');
    preview.className = 'preview';
    appendHighlightedPreview(preview, match.previewText, match.rangesInPreview);

    row.append(location, preview);
    return row;
  }

  function appendHighlightedPreview(parent, text, ranges) {
    let cursor = 0;
    const sortedRanges = [...(ranges || [])].sort((a, b) => a.start - b.start);
    for (const range of sortedRanges) {
      const start = clamp(range.start, 0, text.length);
      const end = clamp(range.end, start, text.length);
      if (start > cursor) {
        parent.appendChild(document.createTextNode(text.slice(cursor, start)));
      }
      const mark = document.createElement('mark');
      mark.textContent = text.slice(start, end);
      parent.appendChild(mark);
      cursor = end;
    }
    if (cursor < text.length) {
      parent.appendChild(document.createTextNode(text.slice(cursor)));
    }
  }

  function getVisibleFiles() {
    const files = state.resultSet?.files || [];
    if (!filterText) {
      return files;
    }

    return files
      .map(file => {
        const pathMatches = file.workspaceRelativePath.toLowerCase().includes(filterText);
        const matches = pathMatches
          ? file.matches
          : file.matches.filter(match => match.previewText.toLowerCase().includes(filterText));
        return {
          ...file,
          matches
        };
      })
      .filter(file => file.matches.length > 0);
  }

  function ensureSelectedMatch() {
    const matchIds = getVisibleMatchIds();
    if (matchIds.length === 0) {
      selectedMatchId = undefined;
      return;
    }
    if (!selectedMatchId || !matchIds.includes(selectedMatchId)) {
      selectedMatchId = matchIds[0];
      saveViewState();
      const row = results.querySelector(`[data-match-id="${cssEscape(selectedMatchId)}"]`);
      row?.classList.add('selected');
    }
  }

  function moveSelection(direction) {
    const matchIds = getVisibleMatchIds();
    if (matchIds.length === 0) {
      return;
    }

    const currentIndex = Math.max(0, matchIds.indexOf(selectedMatchId));
    const nextIndex = clamp(currentIndex + direction, 0, matchIds.length - 1);
    selectedMatchId = matchIds[nextIndex];
    saveViewState();
    render();
    const row = results.querySelector(`[data-match-id="${cssEscape(selectedMatchId)}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }

  function getVisibleMatchIds() {
    return getVisibleFiles().flatMap(file => isCollapsed(file.uri) ? [] : file.matches.map(match => match.id));
  }

  function toggleFile(uri) {
    const collapsed = new Set(state.viewState.collapsedFiles || []);
    if (collapsed.has(uri)) {
      collapsed.delete(uri);
    } else {
      collapsed.add(uri);
    }
    state.viewState.collapsedFiles = [...collapsed];
    saveViewState();
    render();
  }

  function isCollapsed(uri) {
    return (state.viewState.collapsedFiles || []).includes(uri);
  }

  function saveViewState() {
    state.viewState = {
      collapsedFiles: state.viewState.collapsedFiles || [],
      selectedMatchId
    };
    post({ type: 'updateViewState', viewState: state.viewState });
  }

  function formatVisibleResults() {
    const lines = [];
    for (const file of getVisibleFiles()) {
      lines.push(`${file.workspaceRelativePath} (${file.matches.length})`);
      for (const match of file.matches) {
        lines.push(`  ${match.line + 1}:${match.character + 1}  ${match.previewText}`);
      }
    }
    return lines.join('\n');
  }

  function emptyBlock(text) {
    const block = document.createElement('div');
    block.className = 'empty';
    block.textContent = text;
    return block;
  }

  function replaceChildren(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function post(message) {
    vscode.postMessage(message);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function cssEscape(value) {
    if (window.CSS?.escape) {
      return window.CSS.escape(value);
    }
    return value.replace(/["\\]/g, '\\$&');
  }
}());
