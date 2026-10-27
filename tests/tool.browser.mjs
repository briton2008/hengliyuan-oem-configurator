import {tmpdir} from "node:os";
import {join} from "node:path";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:5196";
const output = join(tmpdir(),"hly-oem-browser-qa");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [], errors = [], leaked = [];
const marker = "QA-OEM-PRIVATE-TEXT-5079";
async function start(width = 1440) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  page.on("pageerror", e => errors.push(e.message));
  page.on("request", r => { if ((r.url() + (r.postData() || "")).includes(marker)) leaked.push(r.url()); });
  await page.goto(base + "/");
  await page.getByRole("textbox", { name: "Project name", exact: true }).waitFor();
  await page.waitForFunction(() => !document.documentElement.classList.contains("hly-app-booting") && document.querySelector(".oem-form input")?.disabled === false, null, { timeout: 30000 });
  return { context, page };
}
async function project(page) {
  await page.getByRole("textbox", { name: "Project name", exact: true }).fill(marker);
  await page.getByRole("textbox", { name: "Where will the finished product be sold?", exact: true }).fill("Test market");
  await page.getByRole("textbox", { name: "How will the product be used?", exact: true }).fill("Tabletop powder trial");
  await page.getByText("I need help developing a blend", { exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}
try {
  {
    const { page, context } = await start();
    await page.screenshot({ path: output + "/desktop.png" });
    await project(page);
    await page.getByText("Stick packs", { exact: true }).click();
    await page.getByRole("spinbutton", { name: "Net fill (g)", exact: true }).fill("5");
    await page.getByRole("spinbutton", { name: "Sticks per retail pack", exact: true }).fill("30");
    await page.getByRole("spinbutton", { name: "Number of retail packs", exact: true }).fill("1000");
    await page.getByRole("spinbutton", { name: "Retail packs per shipping carton, if known", exact: true }).fill("24");
    await page.getByText("I plan to supply the packaging", { exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Generate my project brief", exact: true }).click();
    const brief = await page.getByRole("textbox", { name: "Your complete project brief", exact: true }).inputValue();
    assert.match(brief, /primary packs: 30000; net product: 150 kg/);
    assert.match(brief, /Shipping cartons: 42; final carton: 16/);
    assert.match(brief, /I plan to supply the packaging/);
    assert.equal(await page.getByTestId("oem-net-kg").innerText(), "150 kg");
    await page.getByRole("button", { name: "Copy brief", exact: true }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), brief);
    await writeFile(output + "/project-brief.txt", brief);
    await page.screenshot({ path: output + "/desktop-result.png" });
    await page.emulateMedia({ media: "print" });
    assert.equal(await page.locator(".topbar").isVisible(), false);
    assert.equal(await page.locator(".footer").isVisible(), false);
    assert.equal(await page.locator(".company-tool-document").isVisible(), true);
    await page.pdf({ path: output + "/project-brief.pdf", format: "A4", printBackground: true });
    await page.emulateMedia({ media: "screen" });
    await page.getByRole("button", { name: "Edit project", exact: true }).click();
    assert.equal(await page.getByRole("textbox", { name: "Project name", exact: true }).inputValue(), marker);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    assert.equal(await page.getByRole("textbox", { name: "Project name", exact: true }).inputValue(), "");
    assert.equal(await page.getByTestId("oem-net-kg").innerText(), "—");
    results.push({ case: "sticks_copy_company_pdf_edit_reset", passed: true, net_kg: 150, primary_packs: 30000, cartons: 42 });
    await context.close();
  }
  for (const width of [320, 390, 768]) {
    const { page, context } = await start(width);
    const widthOk = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    assert.ok(await widthOk(), `Initial overflow at ${width}`);
    await project(page);
    await page.getByText("Jars", { exact: true }).click();
    await page.getByRole("spinbutton", { name: "Net fill (g)", exact: true }).fill("250");
    await page.getByRole("spinbutton", { name: "Number of retail packs", exact: true }).fill("1000");
    await page.getByRole("button", { name: "Add another size", exact: true }).click();
    const second = page.getByRole("group", { name: "Pack 2", exact: true });
    await second.getByText("Pouches", { exact: true }).click();
    await second.getByRole("spinbutton", { name: "Net fill (g)", exact: true }).fill("100");
    await second.getByRole("spinbutton", { name: "Number of retail packs", exact: true }).fill("500");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Generate my project brief", exact: true }).click();
    assert.equal(await page.getByTestId("oem-net-kg").innerText(), "300 kg");
    assert.equal(await page.getByTestId("oem-cartons").innerText(), "To confirm");
    assert.ok(await widthOk(), `Result overflow at ${width}`);
    if (width === 390) await page.screenshot({ path: output + "/mobile-result.png" });
    results.push({ case: "multi_size_mobile", width, passed: true, net_kg: 300, unknown_cartons_preserved: true });
    await context.close();
  }
  {
    const { page, context } = await start(390); await project(page);
    await page.getByText("Jars", { exact: true }).click();
    await page.getByRole("spinbutton", { name: "Net fill (g)", exact: true }).fill("0");
    await page.getByRole("spinbutton", { name: "Number of retail packs", exact: true }).fill("1.5");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Generate my project brief", exact: true }).click();
    assert.equal(await page.getByRole("textbox", { name: "Your complete project brief", exact: true }).count(), 0);
    assert.equal(await page.getByTestId("oem-net-kg").innerText(), "—");
    assert.ok(await page.getByText("Enter a positive whole number.", { exact: true }).count() > 0);
    results.push({ case: "invalid_numeric_values_block_brief", passed: true }); await context.close();
  }
  {
    const { page, context } = await start(390); await project(page);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Generate my project brief", exact: true }).click();
    const brief = await page.getByRole("textbox", { name: "Your complete project brief", exact: true }).inputValue();
    assert.match(brief, /Total net product: To confirm/);
    assert.ok(!brief.includes("0 kg"));
    assert.equal(await page.getByTestId("oem-net-kg").innerText(), "—");
    assert.ok(!((await page.locator(".oem-complete-overview").innerText()).includes("0 retail packs")));
    results.push({ case: "undecided_pack_details_still_generate_working_brief", passed: true }); await context.close();
  }
  assert.deepEqual(errors, []); assert.deepEqual(leaked, []);
  await writeFile(output + "/result.json", JSON.stringify({ browser: "headless Chromium", browser_plugin: "not available; user disallows desktop control", base, results, page_errors: errors, customer_value_network_leaks: leaked }, null, 2));
  console.log(JSON.stringify({ passed: results.length, output, errors, leaked }));
} finally { await browser.close(); }
process.exit(0);
