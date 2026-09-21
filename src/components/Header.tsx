interface HeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
  matchCount: number | null;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  isFullyExpanded: boolean;
  onToggleExpandAll: () => void;
}

export default function Header({
  query,
  onQueryChange,
  matchCount,
  onZoomIn,
  onZoomOut,
  onReset,
  isFullyExpanded,
  onToggleExpandAll,
}: HeaderProps) {
  return (
    <header className="site-header">
      <div className="brand">
        <img
          className="brand-mark"
          src="https://placehold.co/64x64/0b0f0d/e8c97a.png?text=Y&font=playfair-display"
          alt="Yggdrasil crest placeholder"
        />
        <div className="brand-text">
          <span className="brand-name">Yggdrasil</span>
          <span className="brand-tag">The Family Record</span>
        </div>
      </div>

      <div className="search-wrap">
        <svg className="search-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <line x1="16.2" y1="16.2" x2="21" y2="21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          id="search"
          type="text"
          placeholder="Find a name in the record…"
          autoComplete="off"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <span className="search-count">
          {query.trim() ? (matchCount ? `${matchCount} found` : "no match") : ""}
        </span>
      </div>

      <div className="view-controls" role="group" aria-label="Tree view controls">
        <button
          className={`ctrl-btn ctrl-btn--bloom${isFullyExpanded ? " is-active" : ""}`}
          title={isFullyExpanded ? "Collapse back to one layer" : "Reveal every branch"}
          aria-label={isFullyExpanded ? "Collapse back to one layer" : "Reveal every branch"}
          aria-pressed={isFullyExpanded}
          onClick={onToggleExpandAll}
        >
          <svg className="ctrl-icon" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <path
              d="M12 20V11M12 11L7.5 6.5M12 11l4.5-4.5M12 15.2l-3.2-3.2M12 15.2l3.2-3.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button className="ctrl-btn" title="Zoom out" aria-label="Zoom out" onClick={onZoomOut}>
          −
        </button>
        <button className="ctrl-btn ctrl-btn--wide" title="Reset view" aria-label="Reset view" onClick={onReset}>
          <svg className="ctrl-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path
              d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="ctrl-label">Reset</span>
        </button>
        <button className="ctrl-btn" title="Zoom in" aria-label="Zoom in" onClick={onZoomIn}>
          +
        </button>
      </div>
    </header>
  );
}
