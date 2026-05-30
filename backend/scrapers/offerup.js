const SEARCH_URL = "https://offerup.com/search/";
const DETAIL_URL = "https://offerup.com/item/detail/";

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];
let uaIdx = 0;
const ua = () => USER_AGENTS[uaIdx++ % USER_AGENTS.length];

const HEADERS = () => ({
  "User-Agent": ua(),
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

function extractNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/s);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

function extractSearchListings(nextData) {
  const tiles = nextData?.props?.pageProps?.searchFeedResponse?.looseTiles || [];
  return tiles
    .filter(t => t.__typename === "ModularFeedTileListing" && t.listing)
    .map(t => t.listing);
}

function normalizeSearchListing(raw, keyword) {
  return {
    source: "offerup",
    external_id: raw.listingId,
    title: raw.title || "",
    description: "",
    price: raw.price ? Math.round(parseFloat(raw.price) * 100) : 0,
    condition: raw.conditionText || null,
    city: raw.locationName ? raw.locationName.split(",")[0].trim() : null,
    images: raw.image?.url ? [raw.image.url] : [],
    listing_url: `${DETAIL_URL}${raw.listingId}/`,
    posted_at: null,
    _keyword: keyword,
  };
}

async function fetchSearchPage(keyword) {
  const url = `${SEARCH_URL}?q=${encodeURIComponent(keyword)}`;
  const res = await fetch(url, { headers: HEADERS() });
  if (!res.ok) throw new Error(`OfferUp search ${res.status} for "${keyword}"`);
  const html = await res.text();
  const nextData = extractNextData(html);
  if (!nextData) throw new Error(`No __NEXT_DATA__ for "${keyword}"`);
  return extractSearchListings(nextData);
}

async function fetchListingDetail(listingId) {
  const url = `${DETAIL_URL}${listingId}/`;
  const res = await fetch(url, { headers: HEADERS() });
  if (!res.ok) return null;
  const html = await res.text();
  const nextData = extractNextData(html);
  if (!nextData) return null;

  const apollo = nextData?.props?.pageProps?.initialApolloState;
  if (!apollo) return null;

  const rq = apollo["ROOT_QUERY"];
  if (!rq) return null;

  const listingRefKey = Object.keys(rq).find(k => k.startsWith("listing("));
  if (!listingRefKey) return null;

  const ref = rq[listingRefKey];
  if (!ref?.__ref) return null;

  const full = apollo[ref.__ref];
  if (!full) return null;

  const photos = (full.photos || []).map(p => {
    if (p.detail?.url) return p.detail.url;
    if (p.list?.url) return p.list.url;
    return null;
  }).filter(Boolean);

  return {
    description: full.description || "",
    images: photos,
    condition: full.condition ? conditionLabel(full.condition) : null,
    posted_at: full.postDate || null,
    city: full.locationDetails?.locationName?.split(",")[0]?.trim() || null,
  };
}

function conditionLabel(code) {
  const map = { 10: "New", 20: "Like New", 30: "Good", 40: "Fair", 50: "Poor" };
  return map[code] || String(code);
}

export async function scrapeOfferUp(keywords, { fetchDetails = true, detailLimit = 20 } = {}) {
  const byId = new Map();

  for (const keyword of keywords) {
    try {
      const raw = await fetchSearchPage(keyword);
      console.log(`  OfferUp "${keyword}": ${raw.length} listings`);
      for (const r of raw) {
        if (!byId.has(r.listingId)) {
          byId.set(r.listingId, normalizeSearchListing(r, keyword));
        }
      }
    } catch (err) {
      console.error(`  OfferUp search error for "${keyword}": ${err.message}`);
    }
    await sleep(2000 + Math.random() * 1500);
  }

  const listings = [...byId.values()];

  if (!fetchDetails) return listings;

  // Fetch detail pages for descriptions + extra photos
  const toFetch = listings.slice(0, detailLimit);
  console.log(`  Fetching detail pages for ${toFetch.length} listings...`);

  for (const listing of toFetch) {
    try {
      const detail = await fetchListingDetail(listing.external_id);
      if (detail) {
        listing.description = detail.description || listing.description;
        if (detail.images.length > 0) listing.images = detail.images;
        if (detail.condition) listing.condition = detail.condition;
        if (detail.posted_at) listing.posted_at = detail.posted_at;
        if (detail.city) listing.city = detail.city;
      }
    } catch (err) {
      console.error(`  Detail fetch error for ${listing.external_id}: ${err.message}`);
    }
    await sleep(1500 + Math.random() * 1000);
  }

  return listings;
}
