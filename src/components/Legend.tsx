export default function Legend() {
  return (
    <div className="legend">
      <div className="legend-row">
        <span className="legend-swatch legend-swatch--trunk" />
        Root ancestor
      </div>
      <div className="legend-row">
        <span className="legend-swatch legend-swatch--living" />
        Living
      </div>
      <div className="legend-row">
        <span className="legend-swatch legend-swatch--past" />
        Deceased
      </div>
      <div className="legend-row">
        <span className="legend-swatch legend-swatch--spouse" />
        Spouse companion
      </div>
      <div className="legend-row legend-gradient-row">
        <span className="legend-gradient-bar" aria-hidden="true" />
      </div>
      <div className="legend-row legend-row--muted">
        Rings mark each generation; branch and leaf color deepen from trunk gold to new-growth
        green further out. A pulsing <strong>+</strong> means a branch has more to reveal —
        click the name to grow it.
      </div>
    </div>
  );
}
