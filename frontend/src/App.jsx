import { useState, useCallback } from "react";
import UploadZone from "./components/UploadZone.jsx";
import ListingPanel from "./components/ListingPanel.jsx";
import ResultsBar from "./components/ResultsBar.jsx";
import { furnishRoom } from "./api/furnish.js";
import { renderFurnished } from "./api/render.js";

async function resizeImage(dataUrl, maxSize = 1024) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const resized = canvas.toDataURL("image/jpeg", 0.82);
      resolve({ base64: resized.split(",")[1], mediaType: "image/jpeg", previewUrl: resized });
    };
    img.src = dataUrl;
  });
}

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  @keyframes fadeIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
  @keyframes fadeImg { from { opacity:0; } to { opacity:1; } }
  @keyframes spin    { to { transform:rotate(360deg); } }
  @keyframes pulse   { 0%,100% { transform:translate(-50%,-50%) scale(1); opacity:1; } 50% { transform:translate(-50%,-50%) scale(1.5); opacity:0.55; } }
  @keyframes panelIn { from { transform:translateX(100%); opacity:0; } to { transform:translateX(0); opacity:1; } }
  @keyframes sheetIn { from { transform:translateY(100%); } to { transform:translateY(0); } }

  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  ::-webkit-scrollbar { display:none; }

  /* iOS base fixes */
  html { -webkit-text-size-adjust:100%; text-size-adjust:100%; }
  body { overscroll-behavior:none; }
  button, a, [role="button"] { -webkit-tap-highlight-color:transparent; touch-action:manipulation; }

  /* Render screen layout */
  .render-screen { display:flex; flex-direction:column; height:calc(100vh - 56px); height:calc(100dvh - 56px); overscroll-behavior:none; }
  .render-body { flex:1; display:flex; overflow:hidden; min-height:0; }
  .render-image-area { flex:1; min-width:0; position:relative; background:#1a1208; display:flex; align-items:center; justify-content:center; overflow:hidden; }
  .listing-panel { width:320px; flex-shrink:0; border-left:1px solid #ede6dc; overflow-y:auto; -webkit-overflow-scrolling:touch; animation:panelIn 0.22s ease; }

  /* Room photo — dvh fallback */
  .room-photo { max-width:100%; display:block; object-fit:contain; max-height:calc(100vh - 210px); max-height:calc(100dvh - 210px); }

  /* Hotspot tap targets — bigger on touch screens */
  .hotspot-btn { min-width:44px; min-height:44px; }

  @media (max-width:720px) {
    .listing-panel {
      position:fixed; bottom:0; left:0; right:0;
      width:100%; height:64vh;
      border-left:none; border-top:1px solid #ede6dc;
      border-radius:20px 20px 0 0;
      z-index:300;
      animation:sheetIn 0.28s ease;
      padding-bottom:env(safe-area-inset-bottom, 0px);
    }
    .listing-panel-backdrop {
      position:fixed; inset:0; background:rgba(0,0,0,0.3); z-index:299;
    }
  }
`;

export default function App() {
  const [screen, setScreen] = useState("upload");
  const [photos, setPhotos] = useState([]);
  const [city, setCity] = useState("Vancouver");
  const [error, setError] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [renderedUrl, setRenderedUrl] = useState(null);
  const [rendering, setRendering] = useState(false);

  const addPhoto = useCallback(async raw => {
    const r = await resizeImage(raw.previewUrl);
    setPhotos(prev => [...prev, r]);
    setError(null);
    setScreen("staging");
  }, []);

  const removePhoto = i => {
    const next = photos.filter((_, j) => j !== i);
    setPhotos(next);
    if (next.length === 0) setScreen("upload");
  };

  const runAnalysis = async () => {
    setScreen("loading");
    setError(null);
    try {
      const data = await furnishRoom(photos, city);
      setRoomData(data);
      setActiveId(data.slots?.[0]?.id ?? null);
      setRenderedUrl(null);
      setScreen("render");

      setRendering(true);
      renderFurnished(photos[0], data.roomDescription, data.styleTags, data.slots)
        .then(r => setRenderedUrl(r.imageUrl))
        .catch(() => {})
        .finally(() => setRendering(false));
    } catch (e) {
      setError(e.message);
      setScreen("staging");
    }
  };

  const reset = () => {
    setPhotos([]); setRoomData(null); setActiveId(null);
    setError(null); setRenderedUrl(null); setRendering(false);
    setScreen("upload");
  };

  const activeHotspot = roomData?.slots?.find(s => s.id === activeId) ?? null;
  const toggleHotspot = id => setActiveId(prev => prev === id ? null : id);

  return (
    <div style={{ minHeight: "100vh", background: "#f9f5f0", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{GLOBAL_STYLES}</style>

      <header style={{ borderBottom: "1px solid #ede6dc", background: "#fff", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 200 }}>
        <button onClick={reset} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <span style={{ fontSize: "1.2rem" }}>✦</span>
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.25rem", fontWeight: 700, color: "#1a1208" }}>Furnish</span>
        </button>
        <div style={{ fontSize: "0.68rem", color: "#b0a090", letterSpacing: "0.05em" }}>POWERED BY GPT-4o VISION</div>
      </header>

      {/* ── UPLOAD ── */}
      {screen === "upload" && (
        <main style={{ maxWidth: 600, margin: "0 auto", padding: "56px 24px", animation: "fadeIn 0.4s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(2.2rem,5vw,3.2rem)", fontWeight: 700, color: "#1a1208", lineHeight: 1.1, marginBottom: 14, letterSpacing: "-0.02em" }}>
              See your room,<br /><span style={{ color: "#b08d6e" }}>already furnished.</span>
            </h1>
            <p style={{ fontSize: "0.92rem", color: "#7a6a58", maxWidth: 420, margin: "0 auto", lineHeight: 1.65 }}>
              Upload a photo of your empty room. AI picks real secondhand furniture from Mercari and OfferUp and shows you exactly where each piece goes.
            </p>
          </div>
          <UploadZone onFile={addPhoto} />
          <div style={{ textAlign: "center", marginTop: 12, fontSize: "0.7rem", color: "#b0a090" }}>JPG · PNG · HEIC · up to 4 angles</div>
        </main>
      )}

      {/* ── STAGING ── */}
      {screen === "staging" && (
        <main style={{ maxWidth: 620, margin: "0 auto", padding: "44px 24px", animation: "fadeIn 0.4s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.4rem", fontWeight: 600, color: "#1a1208", marginBottom: 4 }}>
              {photos.length === 1 ? "Add more angles for better results" : `${photos.length} angles ready`}
            </div>
            <div style={{ fontSize: "0.76rem", color: "#9e8e7e" }}>More angles help AI understand your full space</div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 18 }}>
            {photos.map((img, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={img.previewUrl} alt={`Angle ${i + 1}`} style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 12, display: "block" }} />
                <button onClick={() => removePhoto(i)} style={{ position: "absolute", top: 5, right: 5, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%", width: 22, height: 22, color: "#fff", fontSize: "0.7rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                <div style={{ textAlign: "center", fontSize: "0.67rem", color: "#b0a090", marginTop: 3 }}>Angle {i + 1}</div>
              </div>
            ))}
            {photos.length < 4 && <UploadZone compact onFile={addPhoto} />}
          </div>

          <div style={{ maxWidth: 340, margin: "0 auto 18px" }}>
            <input type="text" placeholder="Your city (e.g. Vancouver)" value={city} onChange={e => setCity(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0d8cf", borderRadius: 10, fontFamily: "'DM Sans',sans-serif", fontSize: "1rem", color: "#2c2016", background: "#faf7f4", outline: "none" }} />
          </div>

          {error && (
            <div style={{ marginBottom: 16, background: "#fff5f5", border: "1px solid #ffd5d5", borderRadius: 12, padding: "12px 16px", fontSize: "0.82rem", color: "#c0392b", textAlign: "center" }}>{error}</div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={runAnalysis} style={{ background: "#2c2016", color: "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 500, cursor: "pointer" }}>
              ✦ Furnish this room
            </button>
            <button onClick={reset} style={{ background: "transparent", color: "#b0a090", border: "1px solid #e0d8cf", borderRadius: 12, padding: "12px 20px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", cursor: "pointer" }}>
              Start over
            </button>
          </div>
        </main>
      )}

      {/* ── LOADING ── */}
      {screen === "loading" && (
        <main style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", animation: "fadeIn 0.3s ease" }}>
          <div style={{ width: 38, height: 38, border: "3px solid #ede6dc", borderTop: "3px solid #b08d6e", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 24 }} />
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.25rem", color: "#5a4a3a", marginBottom: 6 }}>Reading your room…</div>
          <div style={{ fontSize: "0.8rem", color: "#b0a090" }}>{photos.length} photo{photos.length > 1 ? "s" : ""} · {city || "any city"}</div>
        </main>
      )}

      {/* ── RENDER SCREEN ── */}
      {screen === "render" && roomData && (
        <div className="render-screen">

          {/* Info strip */}
          <div style={{ background: "#fff", borderBottom: "1px solid #ede6dc", padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {photos.slice(0, 2).map((img, i) => (
              <img key={i} src={img.previewUrl} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
            ))}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "0.9rem", fontWeight: 600, color: "#1a1208", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {roomData.roomDescription}
              </div>
              <div style={{ fontSize: "0.68rem", color: "#9e8e7e", marginTop: 1 }}>
                {(roomData.styleTags || []).join(" · ")}
              </div>
            </div>
            <button onClick={reset} style={{ background: "#f5ede4", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: "0.74rem", color: "#7a6a58", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", flexShrink: 0 }}>
              New room
            </button>
          </div>

          {/* Image + Panel side by side */}
          <div className="render-body">

            {/* Room render */}
            <div className="render-image-area">
              <RoomRender
                photo={photos[0]}
                renderedUrl={renderedUrl}
                rendering={rendering}
                slots={roomData.slots || []}
                activeId={activeId}
                onHotspotClick={toggleHotspot}
              />
            </div>

            {/* Listing panel — inline on desktop, bottom-sheet on mobile (via CSS) */}
            {activeHotspot && (
              <>
                <div className="listing-panel-backdrop" onClick={() => setActiveId(null)} />
                <div className="listing-panel">
                  <ListingPanel hotspot={activeHotspot} onClose={() => setActiveId(null)} />
                </div>
              </>
            )}
          </div>

          {/* Bottom bar */}
          <ResultsBar
            hotspots={roomData.slots || []}
            activeId={activeId}
            onSelect={toggleHotspot}
          />
        </div>
      )}
    </div>
  );
}

function RoomRender({ photo, renderedUrl, rendering, slots, activeId, onHotspotClick }) {
  return (
    <div style={{ position: "relative", lineHeight: 0 }}>
      {/* Original photo — sets the layout size */}
      <img
        src={photo?.previewUrl}
        alt="Your room"
        className="room-photo"
      />

      {/* Furnished render fades in over the top */}
      {renderedUrl && (
        <img
          src={renderedUrl}
          alt="Furnished room"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", animation: "fadeImg 1s ease" }}
        />
      )}

      {/* Hotspot dots — always on top */}
      {slots.map((slot, i) => {
        const active = slot.id === activeId;
        return (
          <button
            key={slot.id}
            onClick={() => onHotspotClick(slot.id)}
            title={slot.label}
            className="hotspot-btn"
            style={{
              position: "absolute",
              left: `${slot.x}%`, top: `${slot.y}%`,
              transform: "translate(-50%,-50%)",
              width: active ? 38 : 32, height: active ? 38 : 32,
              borderRadius: "50%",
              background: active ? "#b08d6e" : "rgba(255,255,255,0.92)",
              border: `2px solid ${active ? "#7a5c3a" : "rgba(0,0,0,0.2)"}`,
              boxShadow: active ? "0 0 0 4px rgba(176,141,110,0.4)" : "0 2px 8px rgba(0,0,0,0.3)",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.68rem", fontFamily: "'DM Sans',sans-serif", fontWeight: 700,
              color: active ? "#fff" : "#2c2016",
              animation: active ? "none" : "pulse 2.4s ease-in-out infinite",
              transition: "width 0.15s, height 0.15s, background 0.15s",
              zIndex: 20,
            }}
          >
            {i + 1}
          </button>
        );
      })}

      {/* Rendering badge */}
      {rendering && (
        <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(26,18,8,0.78)", color: "#e8d9c4", fontSize: "0.7rem", fontFamily: "'DM Sans',sans-serif", padding: "5px 14px", borderRadius: 100, backdropFilter: "blur(6px)", display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap", zIndex: 30 }}>
          <div style={{ width: 9, height: 9, border: "2px solid #b08d6e", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
          Rendering furnished room…
        </div>
      )}

      {/* Tap hint */}
      {!activeId && !rendering && slots.length > 0 && (
        <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(26,18,8,0.65)", color: "#e8d9c4", fontSize: "0.72rem", fontFamily: "'DM Sans',sans-serif", padding: "5px 14px", borderRadius: 100, backdropFilter: "blur(6px)", pointerEvents: "none", whiteSpace: "nowrap", zIndex: 30 }}>
          Tap a dot to see the listing
        </div>
      )}
    </div>
  );
}
