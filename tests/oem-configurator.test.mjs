import test from "node:test";
import assert from "node:assert/strict";
import { Model } from "survey-core";
import { calculateOemPlan, formatOemQuantity, oemBriefText, oemOpenItems, oemQuestions } from "../src/oem-configurator-model.mjs";

const row = overrides => ({ format: "jar", fillG: 250, quantity: 1000, ...overrides });
const project = packs => ({ market: "Test market", application: "Tabletop powder", formulaRoute: "development", packs });

test("no prices, default formula, country, quantities or automatic submission are prescribed", () => {
  const model = new Model(oemQuestions);
  assert.equal(model.pages.length, 3);
  for (const name of ["market", "formulaRoute", "packs"]) assert.equal(model.data[name], undefined);
  const schema = JSON.stringify(oemQuestions);
  assert.ok(!schema.includes('"defaultValue"'));
  assert.ok(!schema.includes('"price"'));
  assert.ok(!schema.includes('"email"'));
  assert.equal(calculateOemPlan({}).ready, false);
  assert.equal(oemBriefText({}), null);
});

test("sticks distinguish retail packs, primary packaging and net mass", () => {
  const p = calculateOemPlan(project([row({ format: "stick", fillG: 5, sticksPerPack: 30, unitsPerCarton: 24 })]));
  assert.equal(p.ready, true);
  assert.equal(p.netKg, 150);
  assert.equal(p.retailPacks, 1000);
  assert.equal(p.rows[0].primaryPacks, 30000);
  assert.equal(p.cartons, 42);
  assert.equal(p.rows[0].finalCartonPacks, 16);
});

test("different order sizes sum net mass without treating unknown cartons as zero", () => {
  const p = calculateOemPlan(project([row({ unitsPerCarton: 12 }), row({ format: "pouch", fillG: 100, quantity: 500 })]));
  assert.equal(p.netKg, 300);
  assert.equal(p.retailPacks, 1500);
  assert.equal(p.rows[0].cartons, 84);
  assert.equal(p.rows[0].finalCartonPacks, 4);
  assert.equal(p.rows[1].cartons, null);
  assert.equal(p.cartons, null);
  const small = calculateOemPlan(project([row({ quantity: 1 })]));
  assert.equal(small.ready, true);
  assert.equal(small.netKg, .25);
});

test("invalid fill and fractional counts prevent dependent totals and exports", () => {
  for (const bad of ["", null, undefined, 0, -1, Infinity, "bad"]) {
    assert.equal(calculateOemPlan(project([row({ fillG: bad })])).ready, false);
    assert.equal(calculateOemPlan(project([row({ quantity: bad })])).netKg, null);
  }
  for (const change of [{ quantity: 1.5 }, { unitsPerCarton: 2.5 }, { unitsPerCarton: 0 }, { format: "liquid" }, { format: "stick", sticksPerPack: 1.2 }, { fillG: 1e308 }]) {
    assert.equal(calculateOemPlan(project([row(change)])).ready, false);
    assert.equal(oemBriefText(project([row(change)])), null);
  }
  assert.equal(calculateOemPlan(project(Array.from({ length: 11 }, () => row()))).ready, false);
});

test("finished pack plan does not add blend loss, bulk cartons, material MOQ or margins", () => {
  const d = project([row({ fillG: 1, quantity: 25, unitsPerCarton: 5 })]);
  const p = calculateOemPlan(d);
  assert.equal(p.netKg, .025);
  assert.equal(p.cartons, 5);
  assert.equal(p.rows[0].finalCartonPacks, 5);
  assert.equal(Object.hasOwn(p, "price"), false);
  const output = oemBriefText(d);
  assert.match(output, /Not a quotation or production approval/);
  assert.match(output, /No production loss, fill overage or packaging allowance/);
  assert.match(output, /Packaging procurement minimums/);
  assert.ok(!output.includes("5.50"));
});

test("brief includes customer inputs and actionable open items without stale approved references", () => {
  const d = { ...project([row({ name: "Test pouch", packagingSource: "I plan to supply the packaging" })]), reference: "STALE-REF", documents: "Requested document, not approved", nextStep: "Discuss formulation and samples" };
  const output = oemBriefText(d);
  assert.ok(output.includes("Requested document, not approved"));
  assert.ok(output.includes("I plan to supply the packaging"));
  assert.ok(!output.includes("STALE-REF"));
  assert.ok(output.includes("Cartons: to be confirmed"));
  assert.equal(oemBriefText({ ...d, market: " " }), null);
  assert.ok(oemOpenItems(d).some(s => s.includes("Sample evaluation")));
});

test("conditional stick fields and edit mode retain intended values", () => {
  const s = new Model(oemQuestions);
  s.data = project([row({ format: "stick", fillG: 5, sticksPerPack: 30 })]);
  const panel = s.getQuestionByName("packs").panels[0];
  assert.equal(panel.getQuestionByName("sticksPerPack").isVisible, true);
  panel.getQuestionByName("format").value = "jar";
  assert.equal(panel.getQuestionByName("sticksPerPack").isVisible, false);
  assert.equal(calculateOemPlan(s.data).netKg, 5);
  s.doComplete(); s.clear(false);
  assert.equal(s.state, "running");
  assert.equal(s.data.market, "Test market");
});

test("display and exports avoid floating-point tails and rounded-zero mass", () => {
  assert.equal(formatOemQuantity(.1 * 3 / 1000), "0.0003");
  assert.equal(formatOemQuantity(1e-9), "1.000e-9");
  assert.match(oemBriefText(project([row({ fillG: .1, quantity: 3 })])), /net product: 0.0003 kg/);
  assert.ok(oemOpenItems({ sweetnessTarget: "1:1" }).some(s => s.includes("sweetness, weight or volume")));
});

test("early-stage requirements can be shared without inventing unknown quantities", () => {
  const d = project([{}]);
  const plan = calculateOemPlan(d);
  assert.equal(plan.ready, false);
  assert.equal(plan.invalid, false);
  const brief = oemBriefText(d);
  assert.match(brief, /Format to confirm/);
  assert.match(brief, /Retail packs requested: To confirm/);
  assert.match(brief, /Total net product: To confirm/);
  assert.ok(!brief.includes("0 kg"));
  const mixed = project([row(), {}]);
  assert.match(oemBriefText(mixed), /Total net product: To confirm/);
  assert.equal(calculateOemPlan(mixed).netKg, null);
  assert.match(oemBriefText(project([{ fillG: 5, quantity: 100 }])), /5 g; pack basis to confirm/);
});
