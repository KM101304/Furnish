const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function furnishRoom(images, city, token) {
  const res = await fetch(`${API}/api/furnish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ images, city: city || null }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.usage = data.usage || null;
    throw err;
  }

  return data;
}
