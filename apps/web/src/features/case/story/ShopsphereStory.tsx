import type { PublicProject } from "@hp/shared";
import { TechStrip, Split } from "./shared";
import { Canvas, CaseSection, ChallengeChain, DecisionCards, FlowIcon, HScroll, PipeFlow, StatusScale } from "../visuals";

export function ShopsphereStory({ project }: { project: PublicProject }) {
  return (
    <>
      <CaseSection num="01" kick="STORE LOOP" title="Browse to doorstep, no backend" lede="A complete mobile commerce loop — catalog to delivery tracking — built as one verifiable demo with fifteen source files and zero network calls.">
        <Canvas kicker="COMMERCE LOOP" right="ON-DEVICE · OFFLINE" caption={<><b>Fifteen files, one loop:</b> catalog, global store, shared UI kit and money math — with an admin console governing the same data the shopper sees.</>}>
          <PipeFlow nodes={[
            { label: "Browse", sub: "catalog · search", icon: "search" },
            { label: "Cart", sub: "coupons · totals", icon: "documents", hot: true },
            { label: "Checkout", sub: "simulated pay", icon: "evidence", hot: true, state: true },
            { label: "Orders", sub: "simulated track", icon: "chat" },
            { label: "Admin", sub: "stock · stats", icon: "api" },
          ]} />
          <div className="cs-lanes">
            <div className="cs-lane"><span className="lk">Shopper path</span><span className="lv"><b>Home → Search → Product → Wishlist/Cart → Coupons → Checkout → Orders + Tracking → Account → Reviews.</b> About and Contact ship alongside.</span></div>
            <div className="cs-lane"><span className="lk">Admin path</span><span className="lv"><b>Sales stats, product add/stock/delete, order advancing</b> — enabled via Settings → Demo Admin Mode.</span></div>
          </div>
        </Canvas>
      </CaseSection>

      <CaseSection num="02" kick="HONEST DEMO CONTRACT" title="Simulated means simulated" lede="Every flow that would touch the real world in production is openly labelled — the demo never pretends otherwise.">
        <div className="cs-compare">
          <div className="cs-cmp cs-cmp--hi"><span className="k">Real — on the device</span><h4>What actually works</h4><ul><li><b>14 products + banners</b> bundled in assets/images, works offline</li><li><b>Cart math</b> in one shared summary (coupons, delivery rules)</li><li><b>Persistence</b> via AsyncStorage string-literal keys, tsc-enforced</li><li><b>Reviews, wishlist, support tickets</b> stored and listed on-device</li></ul></div>
          <div className="cs-cmp"><span className="k">Simulated — labelled as such</span><h4>What is openly faked</h4><ul><li><b>Checkout and payments</b> — no real money moves</li><li><b>Tracking and notifications</b> — simulated timeline</li><li><b>Support replies</b> — tickets stored, not sent</li><li><b>No network calls</b> leave the device at all</li></ul></div>
        </div>
      </CaseSection>

      <CaseSection num="03" kick="MONEY MATH · STATE" title="One summary, one store" lede="Coupons, delivery thresholds and stock restores stay consistent because every screen reads the same numbers.">
        <Split
          left={<><h3>Consistency by construction</h3><p>{project.architecture}</p><p>Cancelling an order returns its items to stock; deleting a product in admin removes it from the shop; a review publishes immediately and blends into the average. Each behavior is a consequence of the single store, not a special case.</p></>}
          right={(
            <Canvas kicker="STATE TOPOLOGY" right="ONE STORE · MANY SCREENS">
              <HScroll label="State: ShopProvider holds cart, wishlist, orders, reviews and catalog behind one cart summary">
                <div className="cs-flow" aria-hidden="true">
                  {[["Catalog", "14 products"], ["Store", "ShopProvider"], ["Summary", "money math"], ["Screens", "cart · orders"], ["Admin", "stock · stats"]].map(([b, s], i, a) => (
                    <div key={b} style={{ display: "contents" }}>
                      <div className={`cs-node${i === 2 ? " is-hot" : ""}`}><span className="ic"><FlowIcon kind={["documents", "ledger", "brain", "web", "api"][i]} /></span><b>{b}</b><span>{s}</span></div>
                      {i < a.length - 1 && <span className="cs-link flowline" />}
                    </div>
                  ))}
                </div>
              </HScroll>
            </Canvas>
          )}
        />
      </CaseSection>

      <CaseSection num="04" kick="VERIFIED PASS" title="The emulator receipt" lede="No test suite ships with the template — so verification is the checks plus a full manual tap-through, all passing.">
        <div className="cs-timeline">
          {[
            ["Check 01 — Types", "tsc clean", "npx tsc --noEmit exits 0, no errors — including the string-literal storage-key enforcement."],
            ["Check 02 — Doctor", "expo-doctor 20/20", "All diagnostics pass on the pinned SDK 58 setup."],
            ["Pass 01 — Shop", "Browse → product → add-to-cart dialog → cart", "Rails, search, filters and product details tap through with screenshots."],
            ["Pass 02 — Coupons", "WELCOME20 · SAVE10 · invalid codes", "WELCOME20 takes ₹800 off ₹9,998; SAVE10 takes ₹500 off ₹4,999; bad codes are rejected with a message."],
            ["Pass 03 — Delivery", "Thresholds + FREESHIP", "₹49 below ₹999, FREE above; FREESHIP zeroes it."],
            ["Pass 04 — Consistency", "Cancel restores · admin deletes", "Cancelling returns items to stock (tee 120 → 119 → 120); admin-deleted products vanish from search; admin add accepts 0 stock."],
            ["Pass 05 — Social", "Reviews · Buy Now · support", "Reviews publish and blend into the average; Buy Now jumps to checkout; support stores tickets on-device."],
            ["Log — Clean", "No app errors", "Metro log shows no app errors. One AsyncStorage warning at startup comes from the Expo Go host app, not ShopSphere."],
          ].map(([t, s, d]) => (
            <div key={t} className="cs-tl"><span className="tk">{t}</span><div className="tt">{s}</div><p>{d}</p></div>
          ))}
        </div>
      </CaseSection>

      <CaseSection num="05" kick="DECISIONS · CHALLENGE · OUTCOME" title="Small scope, finished properly" lede="A deliberately bounded demo — completed, verified and honestly labelled.">
        <DecisionCards items={(project.decisions ?? []).map((d) => ({
          title: d,
          why: "Grounded in the repository implementation — fifteen files with one store and one money-math module.",
          tag: "Demo craft",
        }))} />
        <ChallengeChain steps={[
          { k: "Challenge", v: project.challenges ?? "" },
          { k: "Constraint", v: "No backend, no network — every screen must agree on the same on-device truth." },
          { k: "Decision", v: "Single ShopProvider store, one shared cart summary, tsc-enforced storage keys." },
          { k: "Trade-off", v: "No real payments, tracking or sync — simulated flows labelled instead of built." },
          { k: "Outcome", v: project.results ?? "" },
        ]} />
        <StatusScale
          items={[
            { k: "Built", v: "15-file demo store" },
            { k: "Working", v: "offline loop live" },
            { k: "Verified", v: "tsc + emulator pass" },
            { k: "Limited", v: "simulated commerce" },
            { k: "Future", v: "real backend" },
          ]}
          active={[0, 1, 2]}
        />
        <div style={{ marginTop: 18 }}><TechStrip stack={project.stack} /></div>
      </CaseSection>
    </>
  );
}
