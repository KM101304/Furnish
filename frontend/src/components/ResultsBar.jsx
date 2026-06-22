export default function ResultsBar({ hotspots, activeId, onSelect }) {
  return (
    <div style={{
      background:"#fff",
      borderTop:"1px solid #ede6dc",
      padding:"10px 12px",
      paddingBottom:"calc(10px + env(safe-area-inset-bottom, 0px))",
      overflowX:"auto",
      WebkitOverflowScrolling:"touch",
      display:"flex",
      gap:8,
      scrollbarWidth:"none",
      flexShrink:0,
      alignItems:"stretch",
    }}>
      {hotspots.map((h, i) => {
        const price = h.listing?.price > 0 ? `$${Math.round(h.listing.price / 100)}` : "—";
        const active = h.id === activeId;
        const imgs = h.listing?.images || [];
        return (
          <button
            key={h.id}
            onClick={() => onSelect(h.id)}
            style={{
              flexShrink:0,
              width:104,
              background: active ? "#1a1208" : "#faf7f4",
              border:`1.5px solid ${active ? "#1a1208" : "#ede6dc"}`,
              borderRadius:12,
              padding:0,
              cursor:"pointer",
              overflow:"hidden",
              transition:"all 0.15s",
              display:"flex",
              flexDirection:"column",
            }}
          >
            {/* Thumbnail */}
            <div style={{ width:"100%", aspectRatio:"4/3", overflow:"hidden", background:"#e8e0d8", position:"relative", flexShrink:0 }}>
              {imgs[0]
                ? <img src={imgs[0]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                : <div style={{ width:"100%", height:"100%", background:"linear-gradient(135deg,#e8e0d8,#d8cfc7)" }} />
              }
              {/* Number badge */}
              <div style={{
                position:"absolute", top:5, left:5,
                width:18, height:18, borderRadius:"50%",
                background: active ? "#b08d6e" : "rgba(26,18,8,0.6)",
                color:"#fff",
                fontSize:"0.6rem", fontWeight:700,
                fontFamily:"'DM Sans',sans-serif",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>{i + 1}</div>
            </div>

            {/* Info */}
            <div style={{ padding:"7px 8px 9px", flex:1, display:"flex", flexDirection:"column", gap:2 }}>
              <div style={{
                fontSize:"0.62rem",
                color: active ? "#c0b09c" : "#9e8e7e",
                fontFamily:"'DM Sans',sans-serif",
                lineHeight:1.25,
                overflow:"hidden",
                display:"-webkit-box",
                WebkitLineClamp:2,
                WebkitBoxOrient:"vertical",
              }}>{h.label}</div>
              <div style={{
                fontFamily:"'Cormorant Garamond',serif",
                fontSize:"1rem",
                fontWeight:700,
                color: active ? "#fff" : "#1a1208",
                lineHeight:1,
                marginTop:"auto",
              }}>{price}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
