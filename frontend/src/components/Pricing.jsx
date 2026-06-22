const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function checkout(plan, token) {
  const res = await fetch(`${API}/api/billing/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ plan }),
  });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
}

const TIERS = [
  {
    key: "free",
    name: "Free",
    price: 0,
    rooms: 3,
    perks: ["3 rooms/month", "AI furniture selection", "Real Mercari & OfferUp listings", "Furnished room render"],
    cta: "Get started",
    ctaStyle: { background:"#f5ede4", color:"#2c2016" },
    highlight: false,
  },
  {
    key: "starter",
    name: "Starter",
    price: 12,
    rooms: 20,
    perks: ["20 rooms/month", "Everything in Free", "Room history (last 30)", "Priority processing"],
    cta: "Start Starter",
    ctaStyle: { background:"#2c2016", color:"#fff" },
    highlight: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: 24,
    rooms: Infinity,
    perks: ["Unlimited rooms", "Everything in Starter", "Early access to new features", "Email support"],
    cta: "Go Pro",
    ctaStyle: { background:"#b08d6e", color:"#fff" },
    highlight: true,
  },
];

export default function Pricing({ usage, getToken, onBack }) {
  async function handleCheckout(plan) {
    const token = getToken ? await getToken() : null;
    await checkout(plan, token);
  }
  const currentPlan = usage?.plan || "free";

  return (
    <main style={{ maxWidth:900, margin:"0 auto", padding:"56px 24px", animation:"fadeIn 0.4s ease" }}>
      <div style={{ textAlign:"center", marginBottom:48 }}>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(2rem,4vw,3rem)", fontWeight:700, color:"#1a1208", marginBottom:12 }}>
          Simple pricing
        </h2>
        <p style={{ fontSize:"0.9rem", color:"#7a6a58", maxWidth:420, margin:"0 auto" }}>
          Each room uses real AI vision + image generation. Costs scale with usage — so do our plans.
        </p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:20 }}>
        {TIERS.map(tier => (
          <div
            key={tier.key}
            style={{
              background:"#fff",
              borderRadius:18,
              padding:"28px 24px",
              border: tier.highlight ? "2px solid #b08d6e" : "1px solid #ede6dc",
              position:"relative",
              boxShadow: tier.highlight ? "0 8px 32px rgba(176,141,110,0.15)" : "none",
            }}
          >
            {tier.highlight && (
              <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:"#b08d6e", color:"#fff", fontSize:"0.65rem", fontWeight:600, letterSpacing:"0.08em", padding:"3px 12px", borderRadius:100, whiteSpace:"nowrap" }}>
                MOST POPULAR
              </div>
            )}

            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.35rem", fontWeight:700, color:"#1a1208", marginBottom:4 }}>
              {tier.name}
            </div>
            <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:18 }}>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"2.5rem", fontWeight:700, color:"#1a1208" }}>
                {tier.price === 0 ? "Free" : `$${tier.price}`}
              </span>
              {tier.price > 0 && <span style={{ fontSize:"0.78rem", color:"#9e8e7e" }}>/month</span>}
            </div>

            <ul style={{ listStyle:"none", marginBottom:24, display:"flex", flexDirection:"column", gap:8 }}>
              {tier.perks.map((perk, i) => (
                <li key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:"0.82rem", color:"#3a2e22", lineHeight:1.45 }}>
                  <span style={{ color:"#b08d6e", flexShrink:0, marginTop:1 }}>✦</span>
                  {perk}
                </li>
              ))}
            </ul>

            {currentPlan === tier.key ? (
              <div style={{ textAlign:"center", fontSize:"0.8rem", color:"#b08d6e", fontWeight:500, padding:"10px 0" }}>
                ✓ Current plan
              </div>
            ) : (
              <button
                onClick={() => tier.price === 0 ? null : handleCheckout(tier.key)}
                disabled={tier.price === 0}
                style={{ width:"100%", border:"none", borderRadius:12, padding:"11px 20px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.88rem", fontWeight:500, cursor: tier.price === 0 ? "default" : "pointer", ...tier.ctaStyle, opacity: tier.price === 0 ? 0.6 : 1 }}
              >
                {tier.cta}
              </button>
            )}
          </div>
        ))}
      </div>

      <p style={{ textAlign:"center", marginTop:32, fontSize:"0.72rem", color:"#b0a090" }}>
        Cancel anytime · Rooms reset monthly · Powered by GPT-4o Vision + gpt-image-1
      </p>
    </main>
  );
}
