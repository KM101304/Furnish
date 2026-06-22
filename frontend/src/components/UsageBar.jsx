export default function UsageBar({ usage, onUpgrade }) {
  if (!usage) return null;

  const { used, limit, plan } = usage;
  const isUnlimited = limit === Infinity || limit === null;
  const pct = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);
  const critical = !isUnlimited && pct >= 80;

  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      {!isUnlimited && (
        <div style={{ display:"flex", flexDirection:"column", gap:2, width:80 }}>
          <div style={{ fontSize:"0.6rem", color: critical ? "#c0392b" : "#9e8e7e", letterSpacing:"0.04em", textAlign:"right" }}>
            {used}/{limit} rooms
          </div>
          <div style={{ height:3, background:"#ede6dc", borderRadius:100, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${pct}%`, background: critical ? "#c0392b" : "#b08d6e", borderRadius:100, transition:"width 0.4s ease" }} />
          </div>
        </div>
      )}

      {isUnlimited && (
        <div style={{ fontSize:"0.62rem", color:"#9e8e7e" }}>
          {used} rooms · unlimited
        </div>
      )}

      {critical && !isUnlimited && (
        <button
          onClick={onUpgrade}
          style={{ background:"#b08d6e", color:"#fff", border:"none", borderRadius:8, padding:"3px 10px", fontSize:"0.65rem", cursor:"pointer", whiteSpace:"nowrap", fontFamily:"'DM Sans',sans-serif" }}
        >
          Upgrade
        </button>
      )}
    </div>
  );
}
