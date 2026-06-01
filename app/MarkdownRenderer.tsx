"use client";

import { Fragment, type ReactNode, useState } from "react";

const BOLD_PATTERN = /(\*\*.+?\*\*)/g;
const HEADING_MARKERS = [
  { marker: "### ", className: "mdHeading", tag: "h4" },
  { marker: "## ", className: "mdHeading", tag: "h3" },
  { marker: "# ", className: "mdHeading", tag: "h2" },
] as const;

function renderInlineMarkdown(text: string): ReactNode {
  return text.split(BOLD_PATTERN).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return <Fragment key={index}>{part}</Fragment>;
  });
}

function renderMarkdown(md: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const listItems: ReactNode[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    nodes.push(
      <ul className="mdList" key={`list-${nodes.length}`}>
        {listItems.splice(0)}
      </ul>,
    );
  };

  md.split(/\n+/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }

    const heading = HEADING_MARKERS.find((entry) => line.startsWith(entry.marker));
    if (heading) {
      flushList();
      const content = renderInlineMarkdown(line.slice(heading.marker.length));
      if (heading.tag === "h4") {
        nodes.push(<h4 className={heading.className} key={`heading-${nodes.length}`}>{content}</h4>);
      } else if (heading.tag === "h3") {
        nodes.push(<h3 className={heading.className} key={`heading-${nodes.length}`}>{content}</h3>);
      } else {
        nodes.push(<h2 className={heading.className} key={`heading-${nodes.length}`}>{content}</h2>);
      }
      return;
    }

    if (line.startsWith("- ")) {
      listItems.push(
        <li className="mdListItem" key={`item-${nodes.length}-${listItems.length}`}>
          {renderInlineMarkdown(line.slice(2))}
        </li>,
      );
      return;
    }

    flushList();
    nodes.push(
      <p className="mdParagraph" key={`paragraph-${nodes.length}`}>
        {renderInlineMarkdown(line)}
      </p>,
    );
  });

  flushList();
  return nodes;
}

export default function MarkdownRenderer({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mdContainer">
      <button
        type="button"
        className="mdCopyBtn"
        onClick={handleCopy}
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
      <div className="mdContent">{renderMarkdown(content)}</div>
    </div>
  );
}
