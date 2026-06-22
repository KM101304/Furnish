import { useState } from "react";
import Badge from "./Badge.jsx";

export default function ListingPanel({ hotspot, onClose }) {
  const [imgIdx, setImgIdx] = useState(0);
  if (!hotspot) return null;

  const { listing, label, why, placement } = hotspot;
  const price = listing.price > 0 ? `$${Math.round(listing.price / 100)}` : null;
  const images = listing.images || [];
  const hasImg = images.length > 0;

  // Reset image index when hotspot changes
  // (can't use useEffect cleanly here without key — parent should key on hotspot.id)

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#fff", overflowY:"auto" }}>

      {/* Hero image */}
      <div style={{ position:"relative", flexShrink:0, background:"#ede6dc", aspectRatio:"4/3", overflow:"hidden" }}>
        {hasImg ? (
          <img
            key={images[imgIdx]}
            src={images[imgIdx]}
            alt={listing.title}
            style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
          />
        ) : (
          <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"3rem", opacity:0.3 }}>🛋</div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          style={{ position:"absolute", top:12, right:12, width:32, height:32, borderRadius:"50%", background:"rgba(0,0,0,0.45)", backdropFilter:"blur(6px)", border:"none", color:"#fff", fontSize:"1rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}
        >×</button>

        {/* Image gallery dots */}
        {images.length > 1 && (
          <div style={{ position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)", display:"flex", gap:5 }}>
            {images.slice(0, 5).map((_, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                style={{ width: i === imgIdx ? 18 : 6, height:6, borderRadius:3, background: i === imgIdx ? "#fff" : "rgba(255,255,255,0.5)", border:"none", cursor:"pointer", padding:0, transition:"width 0.2s" }}
              />
            ))}
          </div>
        )}

        {/* Slot label chip */}
        <div style={{ position:"absolute", top:12, left:12, background:"rgba(26,18,8,0.65)", backdropFilter:"blur(6px)", color:"#e8d9c4", fontSize:"0.65rem", fontFamily:"'DM Sans',sans-serif", fontWeight:500, padding:"4px 10px", borderRadius:100, letterSpacing:"0.04em" }}>
          {label}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding:"20px 20px 32px", flex:1, display:"flex", flexDirection:"column", gap:14 }}>

        {/* Source + location row */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
          <Badge label={listing.source} />
          <span style={{ fontSize:"0.7rem", color:"#b0a090", fontFamily:"'DM Sans',sans-serif" }}>
            {[listing.city, listing.postedAgo].filter(Boolean).join(" · ")}
          </span>
        </div>

        {/* Title */}
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.25rem", fontWeight:600, color:"#1a1208", lineHeight:1.3 }}>
          {listing.title}
        </div>

        {/* Price + condition row */}
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {price && (
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"2.2rem", fontWeight:700, color:"#1a1208", lineHeight:1 }}>
              {price}
            </span>
          )}
          {listing.condition && (
            <span style={{ fontSize:"0.72rem", color:"#7a6a58", background:"#f5ede4", padding:"4px 10px", borderRadius:100, fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>
              {listing.condition}
            </span>
          )}
        </div>

        {/* Listing description */}
        {listing.description && (
          <p style={{ fontSize:"0.82rem", color:"#5a4a3a", lineHeight:1.6, fontFamily:"'DM Sans',sans-serif", margin:0 }}>
            {listing.description}
          </p>
        )}

        {/* Why it fits */}
        {why && (
          <div style={{ background:"#faf7f4", borderRadius:12, padding:"12px 14px", borderLeft:"3px solid #b08d6e" }}>
            <div style={{ fontSize:"0.6rem", color:"#b08d6e", fontFamily:"'DM Sans',sans-serif", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:5 }}>Why it fits</div>
            <div style={{ fontSize:"0.82rem", color:"#3a2e22", lineHeight:1.6, fontFamily:"'DM Sans',sans-serif", fontStyle:"italic" }}>{why}</div>
          </div>
        )}

        {/* Placement note */}
        {placement && (
          <div style={{ fontSize:"0.75rem", color:"#9e8e7e", fontFamily:"'DM Sans',sans-serif", lineHeight:1.5, display:"flex", gap:6, alignItems:"flex-start" }}>
            <span style={{ color:"#b08d6e", flexShrink:0 }}>↳</span>
            {placement}
          </div>
        )}

        {/* Image thumbnails if multiple */}
        {images.length > 1 && (
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:2 }}>
            {images.slice(0, 6).map((url, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                style={{ flexShrink:0, width:52, height:52, borderRadius:8, overflow:"hidden", border:`2px solid ${i === imgIdx ? "#b08d6e" : "#ede6dc"}`, padding:0, cursor:"pointer", background:"none" }}
              >
                <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              </button>
            ))}
          </div>
        )}

        {/* CTA */}
        <a
          href={listing.listing_url || "#"}
          target={listing.listing_url && listing.listing_url !== "#" ? "_blank" : "_self"}
          rel="noopener noreferrer"
          style={{ marginTop:"auto", display:"flex", alignItems:"center", justifyContent:"center", gap:8, background:"#1a1208", color:"#fff", borderRadius:14, padding:"14px 20px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.9rem", fontWeight:500, textDecoration:"none", letterSpacing:"0.01em" }}
        >
          View on {listing.source === "mercari" ? "Mercari" : "OfferUp"}
          <span style={{ fontSize:"1rem" }}>→</span>
        </a>
      </div>
    </div>
  );
}
