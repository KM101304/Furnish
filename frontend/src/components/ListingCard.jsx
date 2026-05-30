import { useState } from "react";
import Badge from "./Badge.jsx";
import { visualize } from "../api/visualize.js";

const FALLBACK_EMOJI = { sofa: "🛋", sectional: "🛋", armchair: "🪑", "coffee table": "☕", "dining table": "🍽", "side table": "🪵", "floor lamp": "💡", "table lamp": "💡", dresser: "🗄", credenza: "🪵", bookshelf: "📚", "media console": "📺", "area rug": "🪺" };

export default function ListingCard({ listing, roomImage, roomTags }) {
  const [viz, setViz] = useState(null);
  const [vizLoading, setVizLoading] = useState(false);
  const [vizOpen, setVizOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const matched = roomTags?.filter(t => listing.style_tags?.includes(t)) || [];

  const handleViz = async () => {
    if (viz) { setVizOpen(v => !v); return; }
    setVizLoading(true);
    try {
      const text = await visualize(roomImage, listing.name, listing.description);
      setViz(text);
      setVizOpen(true);
    } catch (e) {
      setViz("Visualization error: " + e.message);
      setVizOpen(true);
    }
    setVizLoading(false);
  };

  const hasImage = listing.images?.length > 0 && !imgError;
  const emoji = FALLBACK_EMOJI[listing.category] || "🪑";
  const priceDisplay = listing.price > 0 ? `$${Math.round(listing.price / 100)}` : "—";

  return (
    <div
      style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)", transition: "transform 0.18s,box-shadow 0.18s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.10)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)"; }}
    >
      <div style={{ height: 180, background: "linear-gradient(135deg,#f5ede4,#ede3d8)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        {hasImage ? (
          <img src={listing.images[0]} alt={listing.name} onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
        ) : (
          <span style={{ fontSize: "3.5rem" }}>{emoji}</span>
        )}
        <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.92)", borderRadius: 8, padding: "4px 10px", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "#2c2016" }}>
          {priceDisplay}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.1rem", fontWeight: 600, color: "#1a1208", lineHeight: 1.25 }}>
            {listing.name}
          </div>
          <Badge label={listing.source} />
        </div>

        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: "#9e8e7e", marginBottom: 8 }}>
          {[listing.city, listing.condition, listing.postedAgo].filter(Boolean).join(" · ")}
        </div>

        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "#5a4a3a", lineHeight: 1.5, marginBottom: 10 }}>
          {listing.description}
        </div>

        {matched.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {matched.map(t => (
              <span key={t} style={{ background: "#fdf3e7", color: "#b08d6e", fontSize: "0.68rem", padding: "2px 8px", borderRadius: 100, fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }}>
                {t}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: vizOpen ? 10 : 0 }}>
          <button onClick={handleViz} disabled={vizLoading} style={{
            flex: 1, padding: 9, background: vizLoading ? "#f0ebe4" : "#2c2016",
            color: vizLoading ? "#9e8e7e" : "#fff", border: "none", borderRadius: 10,
            fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", fontWeight: 500,
            cursor: vizLoading ? "not-allowed" : "pointer", transition: "background 0.15s",
          }}>
            {vizLoading ? "Visualizing…" : vizOpen ? "Hide visualization" : "✦ Place in my room"}
          </button>

          {listing.listing_url && (
            <a href={listing.listing_url} target="_blank" rel="noopener noreferrer" style={{
              padding: "9px 14px", background: "#f5ede4", border: "none", borderRadius: 10,
              fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "#7a6a58",
              cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap",
            }}>
              View →
            </a>
          )}
        </div>

        {vizOpen && viz && (
          <div style={{ background: "#f7f3ee", borderRadius: 10, padding: 12, fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "#3a2e22", lineHeight: 1.6, animation: "fadeIn 0.3s ease" }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: "#b08d6e", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Room Visualization</div>
            {viz}
          </div>
        )}
      </div>
    </div>
  );
}
