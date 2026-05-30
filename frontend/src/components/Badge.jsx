const SOURCE_STYLES = {
  mercari:  { bg: "#fdecea", color: "#e32e30" },
  offerup:  { bg: "#e6f7f8", color: "#0baab0" },
};

export default function Badge({ label }) {
  const key = label?.toLowerCase();
  const { bg, color } = SOURCE_STYLES[key] || { bg: "#f0f0f0", color: "#555" };
  const display = key === "mercari" ? "Mercari" : key === "offerup" ? "OfferUp" : label;

  return (
    <span style={{
      background: bg, color, fontSize: "0.68rem",
      fontFamily: "'DM Sans',sans-serif", fontWeight: 600,
      padding: "3px 8px", borderRadius: 100,
      letterSpacing: "0.02em", textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>
      {display}
    </span>
  );
}
