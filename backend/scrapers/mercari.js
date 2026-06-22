const SEARCH_URL = "https://api.mercari.us/v2/entities:search";
const ITEM_URL   = "https://www.mercari.com/us/item/";

const sleep = ms => new Promise(r => setTimeout(r, ms));

function buildHeaders() {
  return {
    "Content-Type": "application/json",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "X-Platform": "web",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Origin": "https://www.mercari.com",
    "Referer": "https://www.mercari.com/",
  };
}

function buildBody(keyword, pageToken = "") {
  return {
    pageSize: 30,
    searchSessionId: crypto.randomUUID(),
    indexRouting: "INDEX_ROUTING_UNSPECIFIED",
    thumbnailTypes: [],
    searchCondition: {
      keyword,
      excludeKeyword: "",
      sort: "SORT_DEFAULT",
      order: "ORDER_DESC",
      status: ["STATUS_ON_SALE"],
      sizeId: [],
      categoryId: [],
      brandId: [],
      sellerId: [],
      priceMin: 0,
      priceMax: 0,
      itemConditionId: [],
      shippingPayerId: [],
      shippingFromArea: [],
      shippingMethod: [],
      colorId: [],
      hasCoupon: false,
      attributes: [],
      itemTypes: [],
      skuIds: [],
    },
    defaultDatasets: ["DATASET_TYPE_MERCARI", "DATASET_TYPE_BEYOND"],
    serviceFrom: "suruga",
    userId: "",
    pageToken,
  };
}

function conditionLabel(raw) {
  if (!raw) return null;
  const name = (typeof raw === "object" ? raw.name : String(raw)).toLowerCase();
  if (name.includes("new") && name.includes("like")) return "Like New";
  if (name.includes("new")) return "New";
  if (name.includes("good")) return "Good";
  if (name.includes("fair")) return "Fair";
  if (name.includes("poor")) return "Poor";
  return raw.name || String(raw);
}

function normalizeItem(item, keyword) {
  const photos = (item.thumbnails || [])
    .map(t => t.url || t.originalUrl || null)
    .filter(Boolean);

  // Mercari price is in USD cents already
  const price = typeof item.price === "number"
    ? item.price                        // already cents if > 1000, else dollars
    : parseInt(item.price || "0", 10);
  // Mercari stores price in USD (e.g. 280 = $280), we want cents
  const priceCents = price < 1000 ? price * 100 : price;

  return {
    source: "mercari",
    external_id: item.id,
    title: item.name || "",
    description: item.description || "",
    price: priceCents,
    condition: conditionLabel(item.itemCondition),
    city: item.seller?.region || null,
    images: photos,
    listing_url: `${ITEM_URL}${item.id}/`,
    posted_at: item.created ? new Date(item.created * 1000).toISOString() : null,
    _keyword: keyword,
  };
}

async function searchMercari(keyword) {
  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(buildBody(keyword)),
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mercari API ${res.status}: ${text.slice(0, 120)}`);
  }

  const data = await res.json();
  return (data.items || []).filter(i => i.status === "STATUS_ON_SALE" || !i.status);
}

export async function scrapeMercari(keywords) {
  const byId = new Map();
  let blocked = 0;

  for (const keyword of keywords) {
    try {
      const items = await searchMercari(keyword);
      console.log(`  Mercari "${keyword}": ${items.length} listings`);
      for (const item of items) {
        if (!byId.has(item.id)) {
          byId.set(item.id, normalizeItem(item, keyword));
        }
      }
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("403") || msg.includes("429")) blocked++;
      console.error(`  Mercari "${keyword}" error: ${msg}`);
    }
    await sleep(1500 + Math.random() * 1000);
  }

  if (blocked > 0) {
    console.warn(`  Mercari: ${blocked}/${keywords.length} keywords blocked — set PROXY_URL to route around Cloudflare`);
  }

  return [...byId.values()];
}
