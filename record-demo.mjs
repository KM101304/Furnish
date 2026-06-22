#!/usr/bin/env node
import { chromium } from "playwright";
import { readFileSync, writeFileSync, readdirSync, renameSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const DOCS  = join(__dir, "docs");
const URL   = "http://localhost:5173";

const MOCK_FURNISH = {
  roomDescription: "The room features white walls and rich dark hardwood floors with natural light streaming through two large windows, giving the space a bright, airy feel.",
  dimensions: "large",
  styleTags: ["minimalist", "contemporary", "scandinavian"],
  slots: [
    { id:"item_0", label:"White sectional sofa", category:"sectional", placement:"along the left wall facing the windows", x:72, y:65, why:"A white sectional anchors the living area and complements the bright walls and dark floors.", listing:{ source:"offerup", title:"IKEA SÖDERHAMN Sectional Sofa – Like New", description:"Barely used 3-seat sectional in off-white. Smoke-free home, pet-free. Disassembles for easy pickup.", price:34000, condition:"Like New", city:"New York", postedAgo:"3h ago", images:["https://images.pexels.com/photos/1866149/pexels-photo-1866149.jpeg?w=500","https://images.pexels.com/photos/276583/pexels-photo-276583.jpeg?w=500"], listing_url:"https://offerup.com/item/detail/123456/" }},
    { id:"item_1", label:"Walnut media console", category:"media console", placement:"centered on the far wall beneath the windows", x:30, y:60, why:"Warm walnut tones ground the space and contrast beautifully with the white walls.", listing:{ source:"mercari", title:"Mid-Century Walnut TV Stand / Media Console", description:"Solid walnut media console, 60 inches wide, two cable-management doors. Minor scuffs on bottom.", price:18500, condition:"Good", city:"Brooklyn", postedAgo:"1d ago", images:["https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?w=500"], listing_url:"https://www.mercari.com/us/item/234567/" }},
    { id:"item_2", label:"Blue geometric area rug", category:"area rug", placement:"centered between sofa and console to define the seating zone", x:50, y:80, why:"A bold geometric rug adds color and defines the living zone on the dark hardwood.", listing:{ source:"offerup", title:"5×8 Geometric Blue Area Rug – Excellent Condition", description:"Aztec-pattern rug in navy and ivory. No stains, light wear. Comes rolled.", price:8500, condition:"Like New", city:"New York", postedAgo:"5h ago", images:["https://images.pexels.com/photos/6492397/pexels-photo-6492397.jpeg?w=500"], listing_url:"https://offerup.com/item/detail/345678/" }},
    { id:"item_3", label:"Black arc floor lamp", category:"floor lamp", placement:"in the far right corner next to the sofa", x:88, y:42, why:"A tall arc lamp fills dead corner space and provides warm ambient lighting.", listing:{ source:"mercari", title:"Arc Floor Lamp Matte Black – Modern", description:"180cm arc floor lamp, matte black finish, LED compatible. Bulb not included.", price:5500, condition:"Good", city:"Manhattan", postedAgo:"2d ago", images:["https://images.pexels.com/photos/1123262/pexels-photo-1123262.jpeg?w=500"], listing_url:"https://www.mercari.com/us/item/456789/" }},
    { id:"item_4", label:"Round coffee table", category:"coffee table", placement:"in front of the sectional centered on the rug", x:60, y:73, why:"A round table softens the angular room and keeps traffic flow open.", listing:{ source:"offerup", title:"West Elm Round Marble Coffee Table", description:"18-inch marble-top coffee table with brass legs. Small chip on underside not visible when placed.", price:22000, condition:"Good", city:"New York", postedAgo:"6h ago", images:["https://images.pexels.com/photos/1571463/pexels-photo-1571463.jpeg?w=500"], listing_url:"https://offerup.com/item/detail/567890/" }},
    { id:"item_5", label:"Tall bookshelf", category:"bookshelf", placement:"against the right wall between the two windows", x:15, y:48, why:"Vertical shelving draws the eye up to the high ceiling and provides storage.", listing:{ source:"mercari", title:"IKEA KALLAX 5×1 Shelving Unit – White", description:"White KALLAX bookshelf, like new condition. 182cm tall, 39cm wide. Disassembles flat-pack.", price:7500, condition:"Like New", city:"Queens", postedAgo:"12h ago", images:["https://images.pexels.com/photos/2079249/pexels-photo-2079249.jpeg?w=500"], listing_url:"https://www.mercari.com/us/item/678901/" }},
  ],
  _usage:{ plan:"free", planLabel:"Free", used:1, limit:3, remaining:2, resetsAt:"2026-07-01" },
};

const renderedB64 = readFileSync(join(DOCS, "demo_room2_after.png")).toString("base64");
const MOCK_RENDER  = { imageUrl:`data:image/png;base64,${renderedB64}` };
const beforeImg    = readFileSync(join(DOCS, "demo_room2_before.jpg"));

async function record({ name, viewport, isMobile = false }) {
  console.log(`\n▶ Recording ${name} (${viewport.width}×${viewport.height})...`);
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport, isMobile, hasTouch: isMobile,
    recordVideo: { dir: DOCS, size: viewport },
  });
  const page = await ctx.newPage();

  await page.route("**/api/furnish", async route => {
    await new Promise(r => setTimeout(r, 2000));
    await route.fulfill({ status:200, contentType:"application/json", body:JSON.stringify(MOCK_FURNISH) });
  });
  await page.route("**/api/render", async route => {
    await new Promise(r => setTimeout(r, 3200));
    await route.fulfill({ status:200, contentType:"application/json", body:JSON.stringify(MOCK_RENDER) });
  });

  // ── Upload ────────────────────────────────────────────────────────────────
  await page.goto(URL, { waitUntil:"networkidle" });
  await page.waitForTimeout(1800);

  const tmp = mkdtempSync(tmpdir() + "/furnish-");
  const tmpImg = tmp + "/room.jpg";
  writeFileSync(tmpImg, beforeImg);
  await page.locator('input[type="file"]').first().setInputFiles(tmpImg);
  await page.waitForTimeout(2200);

  // ── Staging screen ────────────────────────────────────────────────────────
  await page.waitForSelector("button:has-text('Furnish this room')", { timeout:8000 }).catch(() => {});
  await page.waitForTimeout(1800);

  // ── Furnish ───────────────────────────────────────────────────────────────
  await page.locator("button", { hasText:"Furnish this room" }).first().click();
  await page.waitForTimeout(4000); // loading screen

  // ── Render screen — wait for hotspots ────────────────────────────────────
  await page.waitForSelector(".hotspot-btn", { timeout:10000 }).catch(() => {});
  await page.waitForTimeout(2500); // render fades in

  // ── Drag the before/after slider ─────────────────────────────────────────
  if (!isMobile) {
    const container = page.locator(".render-image-area > div").first();
    const box = await container.boundingBox();
    if (box) {
      // Start from right side of slider (55% position) drag to 30% then back
      const startX = box.x + box.width * 0.55;
      const startY = box.y + box.height * 0.5;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.25, startY, { steps: 20 });
      await page.waitForTimeout(900);
      await page.mouse.move(box.x + box.width * 0.75, startY, { steps: 25 });
      await page.waitForTimeout(900);
      await page.mouse.move(startX, startY, { steps: 15 });
      await page.mouse.up();
    }
  }
  await page.waitForTimeout(1200);

  // ── Click hotspot 1 (sofa) ────────────────────────────────────────────────
  await page.locator(".hotspot-btn").nth(0).click({ force:true });
  await page.waitForTimeout(3000);

  // ── Click hotspot 3 (rug) ─────────────────────────────────────────────────
  await page.locator(".hotspot-btn").nth(2).click({ force:true });
  await page.waitForTimeout(2800);

  // ── Mobile: scroll the listing panel ─────────────────────────────────────
  if (isMobile) {
    const panel = page.locator(".listing-panel");
    await panel.evaluate(el => el.scrollBy({ top: 200, behavior: "smooth" })).catch(() => {});
    await page.waitForTimeout(1500);
  }

  // ── Close panel, click hotspot 5 (coffee table) ──────────────────────────
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(600);
  await page.locator(".hotspot-btn").nth(4).click({ force:true });
  await page.waitForTimeout(2500);

  // ── Desktop: show pricing ─────────────────────────────────────────────────
  if (!isMobile) {
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(400);
    await page.locator("button", { hasText:"Pricing" }).first().click({ force:true });
    await page.waitForTimeout(3000);
    await page.locator("button", { hasText:"← Back" }).first().click({ force:true });
    await page.waitForTimeout(1000);
  }

  await page.waitForTimeout(1500);
  await ctx.close();
  await browser.close();

  const files = readdirSync(DOCS).filter(f => f.endsWith(".webm")).sort();
  return join(DOCS, files[files.length - 1]);
}

(async () => {
  const d = await record({ name:"Desktop", viewport:{ width:1280, height:800 } });
  renameSync(d, join(DOCS, "demo_desktop_raw.webm"));

  const m = await record({ name:"Mobile", viewport:{ width:390, height:844 }, isMobile:true });
  renameSync(m, join(DOCS, "demo_mobile_raw.webm"));

  console.log("\n✅ Raw webm files saved.");
})();
