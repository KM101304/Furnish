import Badge from "./Badge.jsx";

export default function ListingPanel({ hotspot, onClose }) {
  if (!hotspot) return null;
  const { listing, label, why, category } = hotspot;
  const price = listing.price > 0 ? `$${Math.round(listing.price / 100)}` : "—";
  const hasImg = listing.images?.length > 0;

  return (
    <div className="listing-panel" style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff", overflowY: "auto" }}>

      {/* Photo */}
      <div style={{ height: 220, flexShrink: 0, position: "relative", overflow: "hidden", background: "#e8e0d8" }}>
        {hasImg
          ? <img src={listing.images[0]} alt={listing.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#e8e0d8,#d8cfc7)" }} />
        }
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.9)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: "0.85rem", color: "#5a4a3a", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
        >✕</button>
      </div>

      {/* Content */}
      <div style={{ padding: "18px 20px 28px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
          <Badge label={listing.source} />
          <span style={{ fontSize: "0.7rem", color: "#b0a090", fontFamily: "'DM Sans',sans-serif" }}>
            {[listing.city, listing.postedAgo].filter(Boolean).join(" · ")}
          </span>
        </div>

        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.2rem", fontWeight: 600, color: "#1a1208", lineHeight: 1.25 }}>
          {listing.title}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "2rem", fontWeight: 700, color: "#2c2016" }}>{price}</span>
          <span style={{ fontSize: "0.73rem", color: "#9e8e7e", background: "#f5ede4", padding: "2px 8px", borderRadius: 100, fontFamily: "'DM Sans',sans-serif" }}>{listing.condition}</span>
        </div>

        {listing.description && (
          <div style={{ fontSize: "0.82rem", color: "#5a4a3a", lineHeight: 1.55, fontFamily: "'DM Sans',sans-serif" }}>
            {listing.description}
          </div>
        )}

        {why && (
          <div style={{ background: "#faf7f4", borderRadius: 10, padding: "10px 12px", borderLeft: "3px solid #b08d6e" }}>
            <div style={{ fontSize: "0.62rem", color: "#b08d6e", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>Why it fits</div>
            <div style={{ fontSize: "0.81rem", color: "#3a2e22", lineHeight: 1.55, fontFamily: "'DM Sans',sans-serif", fontStyle: "italic" }}>{why}</div>
          </div>
        )}

        <a
          href={listing.listing_url || "#"}
          target={listing.listing_url && listing.listing_url !== "#" ? "_blank" : "_self"}
          rel="noopener noreferrer"
          style={{ marginTop: "auto", display: "block", background: "#2c2016", color: "#fff", borderRadius: 12, padding: "12px 20px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 500, textDecoration: "none", textAlign: "center" }}
        >
          View on {listing.source === "mercari" ? "Mercari" : "OfferUp"} →
        </a>
      </div>
    </div>
  );
}
