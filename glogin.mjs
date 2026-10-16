import { chromium } from "playwright-core";
import { appendFileSync } from "node:fs";

const dir = new URL(".", import.meta.url).pathname;
const log = (m) => appendFileSync(`${dir}glogin.log`, `${new Date().toISOString()} ${m}\n`);
const [url, account] = process.argv.slice(2);

const ctx = await chromium.launchPersistentContext(`${dir}profile`, {
  channel: "chrome",
  headless: false,
  viewport: null,
  // 1Password 拡張を読むため拡張の無効化を外し、Google に自動操作ブラウザとして弾かれないよう痕跡を消す
  ignoreDefaultArgs: ["--disable-extensions", "--enable-automation"],
  args: ["--disable-blink-features=AutomationControlled"],
});
const page = ctx.pages()[0] ?? (await ctx.newPage());

if (account === undefined) {
  await page.goto(url);
  await page.waitForEvent("close", { timeout: 0 });
  await ctx.close();
  process.exit(0);
}

let redirected = false;
page.on("framenavigated", (f) => {
  if (f !== page.mainFrame()) return;
  log(`nav ${f.url().split("?")[0]}`);
  if (f.url().startsWith("http://localhost")) redirected = true;
});

const clicked = new Set();
const clickOnce = async (name, loc) => {
  if (clicked.has(name) || !(await loc.isVisible().catch(() => false))) return;
  clicked.add(name);
  log(`click ${name}`);
  await loc.click().catch((e) => log(`click ${name} failed: ${e.message.split("\n")[0]}`));
};

await page.goto(url);
const deadline = Date.now() + 300_000;
while (!redirected && Date.now() < deadline) {
  if (page.url().includes("/accountchooser")) {
    await clickOnce("account", page.locator(`[data-identifier="${account}"], [data-email="${account}"]`).first());
  }
  // パスキー本体の承認は OS のダイアログで人が行う
  for (const f of page.frames().filter((f) => f.url().startsWith("chrome-extension://"))) {
    await clickOnce("1password", f.getByRole("button", { name: "Use a security key or another passkey" }));
  }
  if (page.url().includes("/consent")) {
    await clickOnce("consent", page.getByRole("button", { name: /^(Continue|Allow|続行|許可|次へ)$/ }).first());
  }
  await page.waitForTimeout(500);
}
log(redirected ? "done" : "timeout");
await page.waitForTimeout(1500);
await ctx.close();
