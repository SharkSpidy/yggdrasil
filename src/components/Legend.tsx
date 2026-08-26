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
      <div className="legend-row legend-row--muted">
        Rings mark each generation, radiating outward from the trunk.
      </div>
    </div>
  );
}
