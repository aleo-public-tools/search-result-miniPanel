import { SearchOptions, PreviewRange } from '../types/search';

export interface MatchOccurrence {
  start: number;
  end: number;
  text: string;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildMatcher(query: string, options: Pick<SearchOptions, 'caseSensitive' | 'wholeWord' | 'useRegex'>): RegExp {
  if (!query) {
    throw new Error('Search query cannot be empty.');
  }

  const source = options.useRegex ? query : escapeRegExp(query);
  const finalSource = options.wholeWord ? `\\b(?:${source})\\b` : source;
  const flags = options.caseSensitive ? 'gu' : 'giu';
  return new RegExp(finalSource, flags);
}

export function findMatches(text: string, matcher: RegExp, maxMatches: number): MatchOccurrence[] {
  const matches: MatchOccurrence[] = [];
  matcher.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = matcher.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    matches.push({ start, end, text: match[0] });

    if (matches.length >= maxMatches) {
      break;
    }

    if (match[0].length === 0) {
      matcher.lastIndex += 1;
    }
  }

  return matches;
}

export function rangesForLinePreview(lineStartOffset: number, occurrence: MatchOccurrence): PreviewRange[] {
  return [
    {
      start: Math.max(0, occurrence.start - lineStartOffset),
      end: Math.max(0, occurrence.end - lineStartOffset)
    }
  ];
}
