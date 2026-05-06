import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMatcher, escapeRegExp, findMatches } from '../src/search/matcher';

test('escapeRegExp escapes regex control characters', () => {
  assert.equal(escapeRegExp('a+b*c?'), 'a\\+b\\*c\\?');
});

test('buildMatcher finds plain text case-insensitively by default option', () => {
  const matcher = buildMatcher('foo', {
    caseSensitive: false,
    wholeWord: false,
    useRegex: false
  });

  const matches = findMatches('Foo foo football', matcher, 10);
  assert.deepEqual(matches.map(match => match.text), ['Foo', 'foo', 'foo']);
});

test('buildMatcher supports case-sensitive plain text', () => {
  const matcher = buildMatcher('foo', {
    caseSensitive: true,
    wholeWord: false,
    useRegex: false
  });

  const matches = findMatches('Foo foo', matcher, 10);
  assert.deepEqual(matches.map(match => match.text), ['foo']);
});

test('buildMatcher supports whole word matching', () => {
  const matcher = buildMatcher('foo', {
    caseSensitive: false,
    wholeWord: true,
    useRegex: false
  });

  const matches = findMatches('foo food barfoo foo', matcher, 10);
  assert.deepEqual(matches.map(match => match.start), [0, 16]);
});

test('buildMatcher supports regular expressions', () => {
  const matcher = buildMatcher('f.o', {
    caseSensitive: false,
    wholeWord: false,
    useRegex: true
  });

  const matches = findMatches('foo fao fxx', matcher, 10);
  assert.deepEqual(matches.map(match => match.text), ['foo', 'fao']);
});

test('findMatches respects maxMatches', () => {
  const matcher = buildMatcher('x', {
    caseSensitive: false,
    wholeWord: false,
    useRegex: false
  });

  const matches = findMatches('x x x', matcher, 2);
  assert.equal(matches.length, 2);
});

test('findMatches handles zero-length regex matches without hanging', () => {
  const matcher = buildMatcher('(?=a)', {
    caseSensitive: false,
    wholeWord: false,
    useRegex: true
  });

  const matches = findMatches('aaa', matcher, 10);
  assert.equal(matches.length, 3);
});
