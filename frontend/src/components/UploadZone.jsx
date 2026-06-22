import { useRef, useState, useCallback } from "react";

export default function UploadZone({ onFile, compact = false }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);

  const handle = useCallback(file => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => onFile({ base64: e.target.result.split(",")[1], mediaType: file.type, previewUrl: e.target.result });
    reader.readAsDataURL(file);
  }, [onFile]);

  const zone = {
    onDragOver: e => { e.preventDefault(); setDrag(true); },
    onDragLeave: () => setDrag(false),
    onDrop: e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); },
  };

  if (compact) return (
    <div {...zone} onClick={() => ref.current.click()} style={{
      width: 110, height: 110,
      border: `2px dashed ${drag ? "#b08d6e" : "#d9cfc7"}`,
      borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", cursor: "pointer",
      background: drag ? "#fdf8f4" : "#faf7f4",
      transition: "all 0.18s", userSelect: "none",
    }}>
      <div style={{ width:28, height:28, borderRadius:"50%", background:"#f0e8e0", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:6, fontSize:"1rem" }}>+</div>
      <div style={{ fontSize: "0.66rem", color: "#9e8e7e", fontFamily:"'DM Sans',sans-serif" }}>Add angle</div>
      <input ref={ref} type="file" accept="image/*,image/heic,image/heif" style={{ display: "none" }} onChange={e => handle(e.target.files[0])} />
    </div>
  );

  return (
    <div
      {...zone}
      onClick={() => ref.current.click()}
      style={{
        border: `1.5px dashed ${drag ? "#b08d6e" : "#d4c9be"}`,
        borderRadius: 20,
        padding: "48px 40px",
        textAlign: "center",
        cursor: "pointer",
        background: drag ? "#fdf8f4" : "#faf7f4",
        transition: "all 0.18s",
        userSelect: "none",
        position: "relative",
      }}
    >
      {/* Camera icon circle */}
      <div style={{
        width: 60, height: 60,
        borderRadius: "50%",
        background: drag ? "#f0e8e0" : "#ede6dc",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px",
        fontSize: "1.6rem",
        transition: "background 0.18s",
      }}>
        📷
      </div>

      <div style={{
        fontFamily: "'Cormorant Garamond',serif",
        fontSize: "1.45rem",
        fontWeight: 600,
        color: "#1a1208",
        marginBottom: 8,
        lineHeight: 1.2,
      }}>
        {drag ? "Drop to furnish" : "Drop your room photo here"}
      </div>

      <div style={{
        fontFamily: "'DM Sans',sans-serif",
        fontSize: "0.82rem",
        color: "#9e8e7e",
        marginBottom: 18,
      }}>
        or <span style={{ color: "#b08d6e", textDecoration: "underline", textUnderlineOffset: 2 }}>browse files</span>
      </div>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12 }}>
        {["JPG", "PNG", "HEIC"].map(fmt => (
          <span key={fmt} style={{ fontSize:"0.66rem", color:"#b0a090", background:"#f0ebe5", padding:"2px 8px", borderRadius:100, fontFamily:"'DM Sans',sans-serif" }}>{fmt}</span>
        ))}
      </div>

      <input ref={ref} type="file" accept="image/*,image/heic,image/heif" style={{ display: "none" }} onChange={e => handle(e.target.files[0])} />
    </div>
  );
}
