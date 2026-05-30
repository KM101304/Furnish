export async function furnishRoom(images, city) {
  const res = await fetch("/api/furnish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images, city: city || null }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
