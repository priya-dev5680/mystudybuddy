import React from 'react';

function inlineNodes(text, keyPrefix) {
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
  const nodes = [];
  let lastIndex = 0;
  let match;
  let index = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;
    if (token.startsWith('**') || token.startsWith('__')) nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('`')) nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    else if (token.startsWith('*') || token.startsWith('_')) nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const safeUrl = link?.[2].match(/^https?:\/\//i) ? link[2] : null;
      nodes.push(safeUrl
        ? <a key={key} href={safeUrl} target="_blank" rel="noreferrer">{link[1]}</a>
        : <span key={key}>{link?.[1] ?? token}</span>);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function MarkdownContent({ children, className = '' }) {
  const lines = String(children ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let list = [];
  let listType = '';
  let code = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(<p key={`p-${blocks.length}`}>{inlineNodes(paragraph.join(' '), `p-${blocks.length}`)}</p>);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (!list.length) return;
    const Tag = listType === 'ol' ? 'ol' : 'ul';
    blocks.push(<Tag key={`list-${blocks.length}`}>{list.map((item, index) => <li key={index}>{inlineNodes(item, `li-${blocks.length}-${index}`)}</li>)}</Tag>);
    list = [];
    listType = '';
  };

  lines.forEach((line, index) => {
    if (code) {
      if (/^\s*```/.test(line)) {
        blocks.push(<pre key={`code-${blocks.length}`}><code>{code.join('\n')}</code></pre>);
        code = null;
      } else code.push(line);
      return;
    }
    if (/^\s*```/.test(line)) {
      flushParagraph(); flushList(); code = [];
      return;
    }
    if (!line.trim()) { flushParagraph(); flushList(); return; }
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList();
      const Tag = `h${heading[1].length}`;
      blocks.push(<Tag key={`h-${index}`}>{inlineNodes(heading[2], `h-${index}`)}</Tag>);
      return;
    }
    const listMatch = line.match(/^\s*(?:([-*+])|\d+[.)])\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      const nextType = listMatch[1] ? 'ul' : 'ol';
      if (list.length && listType !== nextType) flushList();
      listType = nextType;
      list.push(listMatch[2]);
      return;
    }
    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      flushParagraph(); flushList();
      blocks.push(<blockquote key={`quote-${index}`}>{inlineNodes(quote[1], `quote-${index}`)}</blockquote>);
      return;
    }
    if (/^\s*(---+|___+|\*\*\*+)\s*$/.test(line)) {
      flushParagraph(); flushList(); blocks.push(<hr key={`hr-${index}`}/>);
      return;
    }
    flushList();
    paragraph.push(line.trim());
  });

  flushParagraph(); flushList();
  if (code) blocks.push(<pre key={`code-${blocks.length}`}><code>{code.join('\n')}</code></pre>);
  return <div className={`markdown-body ${className}`}>{blocks}</div>;
}
