import React from 'react';

/**
 * Minimal, dependency-free markdown renderer for AI chat output.
 * Returns React elements only (never dangerouslySetInnerHTML), so it is
 * safe against HTML/script injection.
 *
 * Supported:
 *   Blocks  — paragraphs, #..###### headings, > blockquotes,
 *             - / * / + unordered lists, 1. ordered lists
 *   Inline  — **bold**, __bold__, *italic*, _italic_, `code`, [links](url)
 */

const INLINE_RE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)|(\[[^\]\n]+\]\([^)\n]+\))/g;

function renderInline(text, keyPrefix) {
  const nodes = [];
  if (!text) return nodes;

  let lastIndex = 0;
  let idx = 0;
  let match;
  INLINE_RE.lastIndex = 0;

  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

    const token = match[0];
    const key = `${keyPrefix}-${idx++}`;

    if (token.startsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('__')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('_')) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        const href = /^(https?:|mailto:)/i.test(link[2]) ? link[2] : undefined;
        nodes.push(
          <a key={key} href={href} target="_blank" rel="noopener noreferrer">
            {link[1]}
          </a>
        );
      } else {
        nodes.push(token);
      }
    }

    lastIndex = INLINE_RE.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

const isBlank = (l) => l.trim() === '';
const isHeading = (l) => /^#{1,6}\s+/.test(l);
const isQuote = (l) => /^\s*>\s?/.test(l);
const isUl = (l) => /^\s*[-*+]\s+/.test(l);
const isOl = (l) => /^\s*\d+\.\s+/.test(l);
const startsBlock = (l) => isHeading(l) || isQuote(l) || isUl(l) || isOl(l);

function parseBlocks(content) {
  const lines = String(content).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) { i++; continue; }

    // Heading (# -> h3, ## -> h4, ... clamped at h6)
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 2, 6);
      const Tag = `h${level}`;
      blocks.push(<Tag key={`b${key}`}>{renderInline(heading[2], `h${key}`)}</Tag>);
      key++;
      i++;
      continue;
    }

    // Blockquote
    if (isQuote(line)) {
      const quote = [];
      while (i < lines.length && isQuote(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push(<blockquote key={`b${key}`}>{renderInline(quote.join(' '), `q${key}`)}</blockquote>);
      key++;
      continue;
    }

    // Unordered list
    if (isUl(line)) {
      const items = [];
      while (i < lines.length && isUl(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={`b${key}`}>
          {items.map((it, n) => <li key={n}>{renderInline(it, `ul${key}-${n}`)}</li>)}
        </ul>
      );
      key++;
      continue;
    }

    // Ordered list
    if (isOl(line)) {
      const items = [];
      while (i < lines.length && isOl(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={`b${key}`}>
          {items.map((it, n) => <li key={n}>{renderInline(it, `ol${key}-${n}`)}</li>)}
        </ol>
      );
      key++;
      continue;
    }

    // Paragraph — gather until a blank line or the next block starts
    const para = [line];
    i++;
    while (i < lines.length && !isBlank(lines[i]) && !startsBlock(lines[i])) {
      para.push(lines[i]);
      i++;
    }

    const inline = [];
    para.forEach((p, n) => {
      if (n > 0) inline.push(<br key={`br${key}-${n}`} />);
      inline.push(...renderInline(p, `p${key}-${n}`));
    });
    blocks.push(<p key={`b${key}`}>{inline}</p>);
    key++;
  }

  return blocks;
}

export default function Markdown({ content }) {
  if (!content) return null;
  return <>{parseBlocks(content)}</>;
}
