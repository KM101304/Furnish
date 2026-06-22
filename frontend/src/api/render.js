const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function renderFurnished(image, roomDescription, styleTags, slots, analysisId, token) {
  const res = await fetch(`${API}/api/render`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ image, roomDescription, styleTags, slots, analysisId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}
