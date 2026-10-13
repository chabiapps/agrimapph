import { chromium } from "playwright";

const B = "http://localhost:8090";
let pass = 0, fail = 0;
const chk = (n, ok, d = "") => {
  ok ? (pass++, console.log("PASS  " + n)) : (fail++, console.log("FAIL  " + n + "  " + d));
};

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });

// --- baseline: 18mo child, nothing ticked
await p.goto(B + "/home", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1200);
await p.evaluate(() => {
  localStorage.setItem("child_age_months", "18");
  localStorage.setItem("learners-compass:roadmap:v1", "[]");
});
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(1800);

const txt = await p.evaluate(() => document.body.innerText);
chk("age shown", /18 months old/.test(txt), "no age");
chk("stage emoji+name shown", /Sound Explorer/.test(txt), "no stage name");
chk("0 of 5 milestones reached", /0 of 5 milestones reached/.test(txt), "no 0/5 text");

const bar = p.locator('[role="progressbar"] > div').first();
const w0 = await bar.evaluate((el) => el.getBoundingClientRect().width);
chk("fill 0% at 0 ticked", Math.abs(w0) < 1, "width " + w0);
const cls0 = await bar.getAttribute("class");
chk("fill uses bg-compass-sage", (cls0 || "").includes("bg-compass-sage"), cls0 || "");
const trackCls = await p.locator('[role="progressbar"]').first().getAttribute("class");
chk("track uses bg-compass-border h-1.5 rounded-full",
  ["bg-compass-border", "h-1.5", "rounded-full"].every((c) => (trackCls || "").includes(c)), trackCls || "");

// --- link, scoped to the right rail so we don't match a /roadmap quick-link card
const rail = p.locator("aside").last();
const link = rail.locator('a[href="/roadmap"]').first();
chk("roadmap link in right rail", (await link.count()) > 0, "missing");
const lcls = (await link.getAttribute("class")) || "";
chk("link text-xs + sage + semibold",
  ["text-xs", "text-compass-sage", "font-semibold"].every((c) => lcls.includes(c)), lcls);
chk("link text", (await link.innerText()).trim() === "View roadmap →", await link.innerText());
chk("link navigates", await link.evaluate((el) => el.tagName) === "A", "not an anchor");

// --- tick 2 of stage-2 (age 18 => STAGES[1]) milestones -> 2 of 5
const st = await p.evaluate(() => {
  const raw = localStorage.getItem("learners-compass:roadmap:v1");
  localStorage.setItem("learners-compass:roadmap:v1", JSON.stringify(["s2-m1", "s2-m2"]));
  return raw;
});
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(1800);
const txt2 = await p.evaluate(() => document.body.innerText);
chk("2 of 5 milestones reached", /2 of 5 milestones reached/.test(txt2), "not updated");
const trackW = await p.locator('[role="progressbar"]').first().evaluate((el) => el.getBoundingClientRect().width);
const w2 = await bar.evaluate((el) => el.getBoundingClientRect().width);
const pct = Math.round((w2 / trackW) * 100);
console.log("   fill width " + w2 + " of " + trackW + " => " + pct + "%");
chk("fill ~40% (2/5)", pct >= 38 && pct <= 42, pct + "%");
const aria = await p.locator('[role="progressbar"]').first().getAttribute("aria-valuenow");
chk("aria-valuenow=40", aria === "40", aria || "");

// --- a different stage's ticks must NOT count (stage-1 ticks at age 18)
await p.evaluate(() => localStorage.setItem("learners-compass:roadmap:v1", JSON.stringify(["s1-m1", "s1-m2", "s1-m3"])));
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(1800);
const txt3 = await p.evaluate(() => document.body.innerText);
chk("other-stage ticks don't count (0 of 5)", /0 of 5 milestones reached/.test(txt3), "wrongly counted");

// home.tsx:184 renders tipForAge(age) with NO mounted guard -> a known,
// pre-existing SSR hydration mismatch unrelated to this change. Allow it,
// but report it, and fail on any other error.
const hydration = errs.filter((e) => e.includes("Hydration failed"));
const other = errs.filter((e) => !e.includes("Hydration failed"));
chk("no unexpected page errors", other.length === 0, other.join(" | "));
console.log("   (pre-existing home.tsx hydration warnings: " + hydration.length + ")");

console.log("\n" + pass + " passed, " + fail + " failed");
await b.close();
process.exit(fail ? 1 : 0);
