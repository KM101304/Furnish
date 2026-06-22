import { useState, useEffect } from "react";
import { Spinner } from "../App.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function HistoryView({ getToken, onSelect, onBack }) {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const token = getToken ? await getToken() : null;
        const res = await fetch(`${API}/api/history`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("Failed to load history");
        setAnalyses(await res.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", padding:"80px 24px" }}>
      <Spinner />
    </div>
  );

  if (error) return (
    <div style={{ padding:"48px 24px", textAlign:"center", color:"#c0392b", fontSize:"0.9rem" }}>{error}</div>
  );

  if (analyses.length === 0) return (
    <div style={{ padding:"80px 24px", textAlign:"center" }}>
      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.5rem", color:"#5a4a3a", marginBottom:10 }}>No rooms yet</div>
      <div style={{ fontSize:"0.82rem", color:"#9e8e7e" }}>Furnish your first room to see it here.</div>
    </div>
  );

  return (
    <main style={{ maxWidth:900, margin:"0 auto", padding:"36px 24px", animation:"fadeIn 0.4s ease" }}>
      <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.75rem", fontWeight:700, color:"#1a1208", marginBottom:24 }}>
        My Rooms
      </h2>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:16 }}>
        {analyses.map(a => (
          <button
            key={a.id}
            onClick={() => onSelect(a)}
            style={{ background:"#fff", border:"1px solid #ede6dc", borderRadius:14, overflow:"hidden", cursor:"pointer", textAlign:"left", padding:0, transition:"box-shadow 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
          >
            <div style={{ height:140, background:"#e8e0d8", overflow:"hidden" }}>
              {a.rendered_url
                ? <img src={a.rendered_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <div style={{ width:"100%", height:"100%", background:"linear-gradient(135deg,#e8e0d8,#d8cfc7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.5rem" }}>✦</div>
              }
            </div>
            <div style={{ padding:"12px 14px" }}>
              <div style={{ fontSize:"0.78rem", color:"#1a1208", fontWeight:500, marginBottom:4, lineHeight:1.35, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                {a.room_description || "Room analysis"}
              </div>
              <div style={{ fontSize:"0.65rem", color:"#9e8e7e" }}>
                {a.city && `${a.city} · `}{new Date(a.created_at).toLocaleDateString()}
              </div>
              <div style={{ fontSize:"0.62rem", color:"#b0a090", marginTop:4 }}>
                {(a.style_tags || []).slice(0, 3).join(" · ")}
              </div>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
