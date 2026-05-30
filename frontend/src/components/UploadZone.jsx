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
      width: 110, height: 110, border: `2px dashed ${drag ? "#b08d6e" : "#d9cfc7"}`,
      borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", cursor: "pointer", background: drag ? "#fdf8f4" : "#faf7f4",
      transition: "all 0.2s", userSelect: "none",
    }}>
      <div style={{ fontSize: "1.8rem", color: "#b08d6e", lineHeight: 1 }}>+</div>
      <div style={{ fontSize: "0.68rem", color: "#9e8e7e", marginTop: 4 }}>Add angle</div>
      <input ref={ref} type="file" accept="image/*,image/heic,image/heif" style={{ display: "none" }} onChange={e => handle(e.target.files[0])} />
    </div>
  );

  return (
    <div {...zone} onClick={() => ref.current.click()} style={{
      border: `2px dashed ${drag ? "#b08d6e" : "#d9cfc7"}`, borderRadius: 20,
      padding: "60px 40px", textAlign: "center", cursor: "pointer",
      background: drag ? "#fdf8f4" : "#faf7f4", transition: "all 0.2s", userSelect: "none",
    }}>
      <div style={{ fontSize: "3rem", marginBottom: 16 }}>🛋</div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.5rem", color: "#2c2016", marginBottom: 8, fontWeight: 600 }}>
        Drop your room photo here
      </div>
      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: "#9e8e7e" }}>
        or click to browse — JPG, PNG, HEIC
      </div>
      <input ref={ref} type="file" accept="image/*,image/heic,image/heif" style={{ display: "none" }} onChange={e => handle(e.target.files[0])} />
    </div>
  );
}
