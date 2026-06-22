const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function postedAgo(isoString) {
  if (!isoString) return null;
  const diffMs = Date.now() - new Date(isoString).getTime();
  const h = Math.floor(diffMs / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export async function shuffleListing({ category, city, styleTags, excludeUrls, token }) {
  const res = await fetch(`${API}/api/listings/shuffle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ category, city, styleTags, excludeUrls }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchListings({ styleTags, itemTypes, city }) {
  const params = new URLSearchParams({
    tags: styleTags.join(","),
    types: itemTypes.join(","),
    ...(city ? { city } : {}),
  });

  const res = await fetch(`/api/listings?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const rows = await res.json();
  return rows.map(row => ({
    id: row.id,
    source: row.source,
    name: row.title,
    description: row.description || "",
    price: row.price,
    condition: row.condition || "—",
    city: row.city || "",
    images: row.images || [],
    listing_url: row.listing_url,
    posted_at: row.posted_at,
    postedAgo: postedAgo(row.posted_at),
    style_tags: row.style_tags || [],
    category: row.category || "",
  }));
}
