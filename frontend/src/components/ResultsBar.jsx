import Badge from "./Badge.jsx";

const FALLBACK = {
  sofa: "🛋", sectional: "🛋", armchair: "🪑", "coffee table": "☕",
  "dining table": "🍽", "side table": "🪵", "console table": "🪵",
  "floor lamp": "💡", "table lamp": "💡", dresser: "🗄", credenza: "🪵",
  bookshelf: "📚", "media console": "📺", sideboard: "🪵", "area rug": "🟫",
};

export default function ResultsBar({ hotspots, activeId, onSelect }) {
  return (
    <div style={{ background: "#fff", borderTop: "1px solid #ede6dc", padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))", overflowX: "auto", WebkitOverflowScrolling: "touch", display: "flex", gap: 10, scrollbarWidth: "none", flexShrink: 0 }}>
      {hotspots.map((h, i) => {
        const price = h.listing?.price > 0 ? `$${Math.round(h.listing.price / 100)}` : "—";
        const active = h.id === activeId;
        const emoji = FALLBACK[h.category] || "🪑";
        const hasImg = h.listing?.images?.length > 0;
        return (
          <button
            key={h.id}
            onClick={() => onSelect(h.id)}
            style={{
              flexShrink: 0, width: 90, background: active ? "#2c2016" : "#faf7f4",
              border: `2px solid ${active ? "#2c2016" : "#ede6dc"}`,
              borderRadius: 12, padding: "8px 6px", cursor: "pointer",
              textAlign: "center", transition: "all 0.18s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", background: "#e0d8d0", flexShrink: 0 }}>
              {hasImg && <img src={h.listing.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            </div>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.64rem", color: active ? "#e8d9c4" : "#9e8e7e", lineHeight: 1.2, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {h.label}
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "0.9rem", fontWeight: 700, color: active ? "#fff" : "#2c2016" }}>
              {price}
            </div>
            <div style={{ fontSize: "0.58rem", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, letterSpacing: "0.03em", color: active ? "#b08d6e" : "#c0b0a0", textTransform: "uppercase" }}>
              {i + 1}
            </div>
          </button>
        );
      })}
    </div>
  );
}
