# Furnish ✦

> Upload a photo of your empty room. AI furnishes it with real secondhand listings from Mercari and OfferUp — and shows you exactly where each piece goes.

---

## Demo

<!-- Add a screen recording GIF here: docs/demo.gif -->
<!-- To record: QuickTime → File → New Screen Recording, then convert with: ffmpeg -i demo.mov -vf "fps=15,scale=800:-1" docs/demo.gif -->

| Upload your room | AI furnishes it | Click any item |
|---|---|---|
| ![Upload](docs/screenshot-upload.png) | ![Render](docs/screenshot-render.png) | ![Panel](docs/screenshot-panel.png) |

---

## What it does

1. **Upload 1–4 photos** of your empty room
2. **GPT-4o Vision** analyzes the space — dimensions, style, what it needs
3. **6 furniture pieces** are selected from real Mercari and OfferUp listings in your city, matched to your room's style
4. **gpt-image-1** generates a furnished render of your actual room using the real listing photos as references
5. **Tap any numbered dot** on the render to see the listing: photo, price, condition, and a direct link to buy

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite, inline styles |
| Backend | Node.js + Express |
| AI — Room analysis | GPT-4o Vision (`/api/furnish`) |
| AI — Room render | gpt-image-1 image edit (`/api/render`) |
| AI — Style tagging | GPT-4o-mini (scraper pipeline) |
| Database | SQLite via better-sqlite3 |
| Listings | OfferUp + Mercari scrapers |

---

## Setup

### Prerequisites
- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys) with access to `gpt-4o` and `gpt-image-1`

### 1. Clone and install

```bash
git clone https://github.com/KM101304/Furnish.git
cd Furnish

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and add your OPENAI_API_KEY
```

### 3. Populate the listings database

```bash
cd backend
npm run scrape
# Scrapes OfferUp for furniture listings and saves to furnish.db
# Run once to seed — re-run anytime to refresh
```

### 4. Run

**Backend** (port 3001):
```bash
cd backend && npm run dev
```

**Frontend** (port 5173):
```bash
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Project structure

```
Furnish/
├── backend/
│   ├── routes/
│   │   ├── furnish.js      # Room analysis + listing matching (GPT-4o Vision)
│   │   ├── render.js       # Furnished room image generation (gpt-image-1)
│   │   ├── analyze.js      # Legacy: room style tags only
│   │   ├── visualize.js    # Legacy: text placement description
│   │   └── listings.js     # Listing query endpoint
│   ├── scrapers/
│   │   ├── offerup.js      # OfferUp scraper
│   │   └── mercari.js      # Mercari scraper
│   ├── jobs/
│   │   ├── scrape-cron.js  # Cron: scrape + AI style-tag every 4h
│   │   └── tag-heuristic.js # Keyword-based tag fallback
│   ├── db/
│   │   ├── index.js        # SQLite connection
│   │   ├── listings.js     # Query/upsert helpers
│   │   └── schema.sql      # Table definitions
│   └── server.js
│
└── frontend/
    └── src/
        ├── App.jsx             # Main app + screen state machine
        ├── components/
        │   ├── UploadZone.jsx  # Drag/drop + file input
        │   ├── ListingPanel.jsx # Sliding detail panel
        │   ├── ResultsBar.jsx  # Bottom thumbnail strip
        │   └── Badge.jsx       # Mercari/OfferUp source badge
        └── api/
            ├── furnish.js      # POST /api/furnish
            ├── render.js       # POST /api/render
            ├── analyzeRoom.js  # POST /api/analyze (legacy)
            └── listings.js     # GET /api/listings
```

---

## How the render works

The `/api/render` endpoint passes **multiple images** to `gpt-image-1`:
- Image 1: the user's room photo
- Images 2–7: the actual listing product photos from OfferUp

The model is prompted to place each specific item (by reference image) at its described position in the room, preserving the original floors, walls, and architecture. This means the generated render shows furniture that looks like the actual items for sale.

---

## Mobile

Fully optimized for iOS Safari:
- `viewport-fit=cover` + `env(safe-area-inset-bottom)` for notch/home indicator
- `100dvh` for correct height with collapsing URL bar
- 44px minimum tap targets on hotspot dots
- Bottom sheet panel on mobile, side panel on desktop
- HEIC photo support (`image/heic,image/heif`)
- Prevented input zoom (all inputs ≥16px font-size)

---

## License

MIT — see [LICENSE](LICENSE)
