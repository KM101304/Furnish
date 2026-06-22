import { useState, useCallback, useEffect, useRef } from "react";
import { useUser, useAuth, SignIn, SignUp, UserButton } from "@clerk/clerk-react";
import UploadZone from "./components/UploadZone.jsx";
import ListingPanel from "./components/ListingPanel.jsx";
import ResultsBar from "./components/ResultsBar.jsx";
import UsageBar from "./components/UsageBar.jsx";
import Pricing from "./components/Pricing.jsx";
import HistoryView from "./components/HistoryView.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { furnishRoom } from "./api/furnish.js";
import { renderFurnished } from "./api/render.js";

const HAS_CLERK = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

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

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  @keyframes fadeIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
  @keyframes fadeImg { from { opacity:0; } to { opacity:1; } }
  @keyframes spin    { to { transform:rotate(360deg); } }
  @keyframes pulse   { 0%,100% { transform:translate(-50%,-50%) scale(1); opacity:1; } 50% { transform:translate(-50%,-50%) scale(1.5); opacity:0.55; } }
  @keyframes panelIn { from { transform:translateX(100%); opacity:0; } to { transform:translateX(0); opacity:1; } }
  @keyframes sheetIn { from { transform:translateY(100%); } to { transform:translateY(0); } }

  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  ::-webkit-scrollbar { display:none; }
  html { -webkit-text-size-adjust:100%; text-size-adjust:100%; }
  body { overscroll-behavior:none; background:#f9f5f0; font-family:'DM Sans',sans-serif; }
  button, a, [role="button"] { -webkit-tap-highlight-color:transparent; touch-action:manipulation; }

  .render-screen { display:flex; flex-direction:column; height:calc(100vh - 56px); height:calc(100dvh - 56px); overscroll-behavior:none; }
  .render-body { flex:1; display:flex; overflow:hidden; min-height:0; }
  .render-image-area { flex:1; min-width:0; position:relative; background:#1a1208; display:flex; align-items:center; justify-content:center; overflow:hidden; }
  .listing-panel { width:340px; flex-shrink:0; border-left:1px solid #ede6dc; overflow-y:auto; -webkit-overflow-scrolling:touch; animation:panelIn 0.22s ease; }
  .room-photo { max-width:100%; display:block; object-fit:contain; max-height:calc(100vh - 210px); max-height:calc(100dvh - 210px); }
  .hotspot-btn { min-width:44px; min-height:44px; }

  .auth-modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:500; display:flex; align-items:center; justify-content:center; padding:24px; }
  .auth-modal { background:#fff; border-radius:20px; overflow:hidden; max-width:420px; width:100%; box-shadow:0 24px 80px rgba(0,0,0,0.25); }

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
    .listing-panel-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.3); z-index:299; }
  }
`;

export default function App() {
  const clerkUser = HAS_CLERK ? useUser() : { isLoaded: true, isSignedIn: true, user: null };
  const clerkAuth = HAS_CLERK ? useAuth() : { getToken: async () => null };

  const [screen, setScreen] = useState("upload"); // upload | staging | loading | render | pricing | history | auth
  const [photos, setPhotos] = useState([]);
  const [city, setCity] = useState("Vancouver");
  const [error, setError] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [renderedUrl, setRenderedUrl] = useState(null);
  const [rendering, setRendering] = useState(false);
  const [usage, setUsage] = useState(null);
  const [authMode, setAuthMode] = useState("sign-in"); // sign-in | sign-up

  // Redirect to auth if Clerk is configured and user isn't signed in
  const needsAuth = HAS_CLERK && clerkUser.isLoaded && !clerkUser.isSignedIn;

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
    if (needsAuth) { setScreen("auth"); return; }

    setScreen("loading");
    setError(null);
    try {
      const token = await clerkAuth.getToken();
      const data = await furnishRoom(photos, city, token);

      if (data._usage) setUsage(data._usage);

      setRoomData(data);
      setActiveId(data.slots?.[0]?.id ?? null);
      setRenderedUrl(null);
      setScreen("render");

      setRendering(true);
      renderFurnished(photos[0], data.roomDescription, data.styleTags, data.slots, data._analysisId, token)
        .then(r => setRenderedUrl(r.imageUrl))
        .catch(() => {})
        .finally(() => setRendering(false));
    } catch (e) {
      if (e.status === 402) {
        setScreen("pricing");
        if (e.usage) setUsage(e.usage);
      } else {
        setError(e.message);
        setScreen("staging");
      }
    }
  };

  const reset = () => {
    setPhotos([]); setRoomData(null); setActiveId(null);
    setError(null); setRenderedUrl(null); setRendering(false);
    setScreen("upload");
  };

  const activeHotspot = roomData?.slots?.find(s => s.id === activeId) ?? null;
  const toggleHotspot = id => setActiveId(prev => prev === id ? null : id);

  if (!clerkUser.isLoaded) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#f9f5f0", fontFamily:"'DM Sans',sans-serif" }}>
      <style>{CSS}</style>

      {/* Header */}
      <header style={{ borderBottom:"1px solid #ede6dc", background:"#fff", padding:"0 24px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:200 }}>
        <button onClick={reset} style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none", cursor:"pointer", padding:0 }}>
          <span style={{ fontSize:"1.2rem" }}>✦</span>
          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.25rem", fontWeight:700, color:"#1a1208" }}>Furnish</span>
        </button>

        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {usage && <UsageBar usage={usage} onUpgrade={() => setScreen("pricing")} />}

          {HAS_CLERK && clerkUser.isSignedIn && (
            <>
              <button
                onClick={() => setScreen(s => s === "history" ? "upload" : "history")}
                style={{ background:"none", border:"none", cursor:"pointer", fontSize:"0.75rem", color:"#7a6a58", padding:"4px 8px" }}
              >
                {screen === "history" ? "← Back" : "My Rooms"}
              </button>
              <UserButton afterSignOutUrl="/" />
            </>
          )}

          {HAS_CLERK && !clerkUser.isSignedIn && (
            <button
              onClick={() => { setAuthMode("sign-in"); setScreen("auth"); }}
              style={{ background:"#2c2016", color:"#fff", border:"none", borderRadius:10, padding:"6px 16px", fontSize:"0.8rem", cursor:"pointer" }}
            >
              Sign in
            </button>
          )}

          <button
            onClick={() => setScreen(s => s === "pricing" ? "upload" : "pricing")}
            style={{ background:"#f5ede4", border:"none", borderRadius:10, padding:"6px 14px", fontSize:"0.75rem", color:"#7a6a58", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}
          >
            {screen === "pricing" ? "← Back" : "Pricing"}
          </button>
        </div>
      </header>

      {/* Auth modal */}
      {screen === "auth" && (
        <div className="auth-modal-backdrop" onClick={() => setScreen("upload")}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            {authMode === "sign-in"
              ? <SignIn routing="hash" afterSignInUrl="/" signUpUrl="#" />
              : <SignUp routing="hash" afterSignUpUrl="/" signInUrl="#" />
            }
            <div style={{ textAlign:"center", padding:"12px 0 20px", fontSize:"0.8rem", color:"#7a6a58" }}>
              {authMode === "sign-in"
                ? <> No account? <button onClick={() => setAuthMode("sign-up")} style={{ color:"#b08d6e", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>Sign up free</button></>
                : <> Have an account? <button onClick={() => setAuthMode("sign-in")} style={{ color:"#b08d6e", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>Sign in</button></>
              }
            </div>
          </div>
        </div>
      )}

      {/* Pricing page */}
      {screen === "pricing" && <Pricing usage={usage} getToken={clerkAuth.getToken} onBack={reset} />}

      {/* History page */}
      {screen === "history" && (
        <ErrorBoundary>
          <HistoryView
            getToken={clerkAuth.getToken}
            onSelect={data => { setRoomData(data); setActiveId(data.slots?.[0]?.id ?? null); setRenderedUrl(data.rendered_url || null); setScreen("render"); }}
            onBack={() => setScreen("upload")}
          />
        </ErrorBoundary>
      )}

      {/* Upload */}
      {screen === "upload" && (
        <main style={{ maxWidth:600, margin:"0 auto", padding:"56px 24px", animation:"fadeIn 0.4s ease" }}>
          <div style={{ textAlign:"center", marginBottom:44 }}>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(2.2rem,5vw,3.2rem)", fontWeight:700, color:"#1a1208", lineHeight:1.1, marginBottom:14, letterSpacing:"-0.02em" }}>
              See your room,<br /><span style={{ color:"#b08d6e" }}>already furnished.</span>
            </h1>
            <p style={{ fontSize:"0.92rem", color:"#7a6a58", maxWidth:420, margin:"0 auto", lineHeight:1.65 }}>
              Upload a photo of your empty room. AI picks real secondhand furniture from Mercari and OfferUp and shows you exactly where each piece goes.
            </p>
          </div>
          <UploadZone onFile={addPhoto} />
          <div style={{ textAlign:"center", marginTop:12, fontSize:"0.7rem", color:"#b0a090" }}>JPG · PNG · HEIC · up to 4 angles</div>

          {!HAS_CLERK && (
            <div style={{ marginTop:32, textAlign:"center", fontSize:"0.75rem", color:"#b0a090", background:"#faf7f4", borderRadius:10, padding:"10px 16px" }}>
              Running in dev mode — auth disabled
            </div>
          )}
        </main>
      )}

      {/* Staging */}
      {screen === "staging" && (
        <main style={{ maxWidth:620, margin:"0 auto", padding:"44px 24px", animation:"fadeIn 0.4s ease" }}>
          <div style={{ textAlign:"center", marginBottom:22 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.4rem", fontWeight:600, color:"#1a1208", marginBottom:4 }}>
              {photos.length === 1 ? "Add more angles for better results" : `${photos.length} angles ready`}
            </div>
            <div style={{ fontSize:"0.76rem", color:"#9e8e7e" }}>More angles help AI understand your full space</div>
          </div>

          <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center", marginBottom:18 }}>
            {photos.map((img, i) => (
              <div key={i} style={{ position:"relative" }}>
                <img src={img.previewUrl} alt={`Angle ${i + 1}`} style={{ width:110, height:110, objectFit:"cover", borderRadius:12, display:"block" }} />
                <button onClick={() => removePhoto(i)} style={{ position:"absolute", top:5, right:5, background:"rgba(0,0,0,0.55)", border:"none", borderRadius:"50%", width:22, height:22, color:"#fff", fontSize:"0.7rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                <div style={{ textAlign:"center", fontSize:"0.67rem", color:"#b0a090", marginTop:3 }}>Angle {i + 1}</div>
              </div>
            ))}
            {photos.length < 4 && <UploadZone compact onFile={addPhoto} />}
          </div>

          <div style={{ maxWidth:340, margin:"0 auto 18px" }}>
            <input
              type="text"
              placeholder="Your city (e.g. Vancouver)"
              value={city}
              onChange={e => setCity(e.target.value)}
              style={{ width:"100%", padding:"10px 14px", border:"1px solid #e0d8cf", borderRadius:10, fontFamily:"'DM Sans',sans-serif", fontSize:"1rem", color:"#2c2016", background:"#faf7f4", outline:"none" }}
            />
          </div>

          {error && (
            <div style={{ marginBottom:16, background:"#fff5f5", border:"1px solid #ffd5d5", borderRadius:12, padding:"12px 16px", fontSize:"0.82rem", color:"#c0392b", textAlign:"center" }}>{error}</div>
          )}

          <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
            <button onClick={runAnalysis} style={{ background:"#2c2016", color:"#fff", border:"none", borderRadius:12, padding:"12px 28px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.88rem", fontWeight:500, cursor:"pointer" }}>
              ✦ Furnish this room
            </button>
            <button onClick={reset} style={{ background:"transparent", color:"#b0a090", border:"1px solid #e0d8cf", borderRadius:12, padding:"12px 20px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.88rem", cursor:"pointer" }}>
              Start over
            </button>
          </div>
        </main>
      )}

      {/* Loading */}
      {screen === "loading" && (
        <main style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"80px 24px", animation:"fadeIn 0.3s ease" }}>
          <Spinner size={38} />
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.25rem", color:"#5a4a3a", marginBottom:6, marginTop:24 }}>Reading your room…</div>
          <div style={{ fontSize:"0.8rem", color:"#b0a090" }}>{photos.length} photo{photos.length > 1 ? "s" : ""} · {city || "any city"}</div>
          <div style={{ marginTop:24, maxWidth:320, textAlign:"center" }}>
            {["Analyzing space dimensions…", "Matching your style…", "Finding real listings nearby…"].map((step, i) => (
              <div key={i} style={{ fontSize:"0.76rem", color:"#c0b09c", marginBottom:6, opacity: i === 0 ? 1 : 0.5 }}>{step}</div>
            ))}
          </div>
        </main>
      )}

      {/* Render screen */}
      {screen === "render" && roomData && (
        <div className="render-screen">
          <div style={{ background:"#fff", borderBottom:"1px solid #ede6dc", padding:"0 16px", height:48, display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            {/* Room thumb */}
            {photos[0] && (
              <img src={photos[0].previewUrl} alt="" style={{ width:30, height:30, objectFit:"cover", borderRadius:6, flexShrink:0, opacity:0.85 }} />
            )}
            {/* Style tags */}
            <div style={{ flex:1, minWidth:0, display:"flex", gap:5, alignItems:"center", overflow:"hidden" }}>
              {(roomData.styleTags || []).map(tag => (
                <span key={tag} style={{ fontSize:"0.62rem", fontFamily:"'DM Sans',sans-serif", color:"#7a6a58", background:"#f5ede4", padding:"2px 8px", borderRadius:100, whiteSpace:"nowrap", flexShrink:0 }}>
                  {tag}
                </span>
              ))}
            </div>
            <button onClick={reset} style={{ background:"none", border:"1px solid #e0d8cf", borderRadius:8, padding:"5px 12px", fontSize:"0.73rem", color:"#7a6a58", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>
              New room
            </button>
          </div>

          <div className="render-body">
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

            {activeHotspot && (
              <>
                <div className="listing-panel-backdrop" onClick={() => setActiveId(null)} />
                <div className="listing-panel">
                  {/* key resets internal imgIdx when hotspot changes */}
                  <ListingPanel key={activeHotspot.id} hotspot={activeHotspot} onClose={() => setActiveId(null)} />
                </div>
              </>
            )}
          </div>

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
  const [sliderPct, setSliderPct] = useState(renderedUrl ? 55 : 100);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef(null);
  const showSlider = !!renderedUrl && !rendering;

  // When render arrives, animate slider from 100→55
  useEffect(() => {
    if (renderedUrl) {
      setSliderPct(100);
      const t = setTimeout(() => setSliderPct(55), 80);
      return () => clearTimeout(t);
    }
  }, [renderedUrl]);

  const onPointerMove = useCallback((e) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
    setSliderPct(Math.max(5, Math.min(95, (x / rect.width) * 100)));
  }, [dragging]);

  const stopDrag = useCallback(() => setDragging(false), []);

  return (
    <div
      ref={containerRef}
      style={{ position:"relative", lineHeight:0, userSelect:"none" }}
      onMouseMove={onPointerMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onTouchMove={e => { if (dragging) { e.preventDefault(); onPointerMove(e); } }}
      onTouchEnd={stopDrag}
    >
      {/* Original photo (always underneath) */}
      <img src={photo?.previewUrl} alt="Your room" className="room-photo" />

      {/* Rendered image clipped to left of slider */}
      {renderedUrl && (
        <div style={{
          position:"absolute", inset:0,
          clipPath:`inset(0 ${100 - sliderPct}% 0 0)`,
          transition: dragging ? "none" : "clip-path 0.6s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <img
            src={renderedUrl}
            alt="Furnished room"
            style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
          />
        </div>
      )}

      {/* Slider handle */}
      {showSlider && (
        <div
          onMouseDown={() => setDragging(true)}
          onTouchStart={() => setDragging(true)}
          style={{
            position:"absolute", top:0, bottom:0,
            left:`${sliderPct}%`,
            width:2,
            background:"rgba(255,255,255,0.9)",
            boxShadow:"0 0 0 1px rgba(0,0,0,0.15)",
            cursor:"col-resize",
            zIndex:25,
            transition: dragging ? "none" : "left 0.6s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Drag pill */}
          <div style={{
            position:"absolute", top:"50%", left:"50%",
            transform:"translate(-50%,-50%)",
            width:32, height:32, borderRadius:"50%",
            background:"#fff",
            boxShadow:"0 2px 12px rgba(0,0,0,0.25)",
            display:"flex", alignItems:"center", justifyContent:"center",
            gap:2,
          }}>
            <div style={{ fontSize:"0.6rem", color:"#b08d6e", fontFamily:"monospace", letterSpacing:-1 }}>◀▶</div>
          </div>
        </div>
      )}

      {/* Before/After labels */}
      {showSlider && (
        <>
          <div style={{ position:"absolute", top:12, left:12, background:"rgba(26,18,8,0.6)", backdropFilter:"blur(4px)", color:"#e8d9c4", fontSize:"0.62rem", fontFamily:"'DM Sans',sans-serif", fontWeight:600, padding:"3px 10px", borderRadius:100, letterSpacing:"0.06em", pointerEvents:"none", zIndex:24 }}>BEFORE</div>
          <div style={{ position:"absolute", top:12, right:12, background:"rgba(176,141,110,0.85)", backdropFilter:"blur(4px)", color:"#fff", fontSize:"0.62rem", fontFamily:"'DM Sans',sans-serif", fontWeight:600, padding:"3px 10px", borderRadius:100, letterSpacing:"0.06em", pointerEvents:"none", zIndex:24 }}>AFTER</div>
        </>
      )}

      {/* Hotspot dots — on top of everything */}
      {slots.map((slot, i) => {
        const active = slot.id === activeId;
        return (
          <button
            key={slot.id}
            onClick={() => onHotspotClick(slot.id)}
            title={slot.label}
            className="hotspot-btn"
            style={{
              position:"absolute",
              left:`${slot.x}%`, top:`${slot.y}%`,
              transform:"translate(-50%,-50%)",
              width: active ? 40 : 32, height: active ? 40 : 32,
              borderRadius:"50%",
              background: active ? "#b08d6e" : "rgba(255,255,255,0.95)",
              border:`2px solid ${active ? "#7a5c3a" : "rgba(0,0,0,0.18)"}`,
              boxShadow: active ? "0 0 0 5px rgba(176,141,110,0.35), 0 2px 10px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.25)",
              cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"0.7rem", fontFamily:"'DM Sans',sans-serif", fontWeight:700,
              color: active ? "#fff" : "#1a1208",
              // Only pulse when not active and not dragging slider
              animation: (active || dragging) ? "none" : "pulse 3s ease-in-out infinite",
              animationDelay: `${i * 0.4}s`,
              transition:"width 0.15s, height 0.15s, background 0.15s, box-shadow 0.15s",
              zIndex:30,
            }}
          >
            {i + 1}
          </button>
        );
      })}

      {/* Rendering badge */}
      {rendering && (
        <div style={{ position:"absolute", top:12, left:"50%", transform:"translateX(-50%)", background:"rgba(26,18,8,0.78)", color:"#e8d9c4", fontSize:"0.7rem", fontFamily:"'DM Sans',sans-serif", padding:"6px 16px", borderRadius:100, backdropFilter:"blur(6px)", display:"flex", alignItems:"center", gap:8, whiteSpace:"nowrap", zIndex:40 }}>
          <div style={{ width:9, height:9, border:"2px solid #b08d6e", borderTop:"2px solid transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite", flexShrink:0 }} />
          Generating furnished render…
        </div>
      )}

      {/* Hint */}
      {!activeId && !rendering && !dragging && slots.length > 0 && (
        <div style={{ position:"absolute", bottom:14, left:"50%", transform:"translateX(-50%)", background:"rgba(26,18,8,0.65)", color:"#e8d9c4", fontSize:"0.7rem", fontFamily:"'DM Sans',sans-serif", padding:"6px 16px", borderRadius:100, backdropFilter:"blur(6px)", pointerEvents:"none", whiteSpace:"nowrap", zIndex:35, display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:"0.8rem" }}>✦</span> Tap a number to see the listing
        </div>
      )}
    </div>
  );
}

export function Spinner({ size = 32 }) {
  return (
    <div style={{ width:size, height:size, border:`${Math.max(2, size/14)}px solid #ede6dc`, borderTop:`${Math.max(2, size/14)}px solid #b08d6e`, borderRadius:"50%", animation:"spin 0.8s linear infinite", flexShrink:0 }} />
  );
}
