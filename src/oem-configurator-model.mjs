export const oemPath = "/tools/oem-product-configurator/";
export const oemTitle = "OEM powder product configurator";
export const oemDescription = "Plan powder sweetener packaging quantities and prepare an OEM project brief. Compare pack formats, calculate net product needs, and export your requirements without signing in.";
export const packFormats = { stick: "Stick packs", jar: "Jars", pouch: "Pouches" };
export const formatOemQuantity = value => value > 0 && value < .000001 ? value.toExponential(3) : new Intl.NumberFormat("en", { maximumFractionDigits: 6 }).format(value);
const text = value => typeof value === "string" ? value.trim().slice(0, 1500) : "";
const positive = value => (typeof value === "number" || typeof value === "string" && value.trim() !== "") && Number.isFinite(Number(value)) && Number(value) > 0;
const count = value => positive(value) && Number.isSafeInteger(Number(value));
const specified = value => value !== undefined && value !== null && String(value).trim() !== "";

export function calculateOemPlan(data = {}) {
  const rows = Array.isArray(data.packs) ? data.packs : [];
  const results = rows.map((row, index) => {
    const errors = [], missing = [];
    if (!packFormats[row?.format]) (specified(row?.format) ? errors : missing).push("Choose a powder pack format.");
    if (!positive(row?.fillG)) (specified(row?.fillG) ? errors : missing).push("Enter a positive net fill weight in grams.");
    if (!count(row?.quantity)) (specified(row?.quantity) ? errors : missing).push("Enter a positive whole number of retail packs.");
    if (row?.format === "stick" && !count(row?.sticksPerPack)) (specified(row?.sticksPerPack) ? errors : missing).push("Enter a positive whole number of sticks per retail pack.");
    const cartonEntered = row?.unitsPerCarton !== undefined && row.unitsPerCarton !== null && String(row.unitsPerCarton).trim() !== "";
    if (cartonEntered && !count(row.unitsPerCarton)) errors.push("Enter a positive whole number of retail packs per carton, or leave it blank.");
    const retailPacks = Number(row?.quantity), innerCount = row?.format === "stick" ? Number(row.sticksPerPack) : 1;
    const primaryPacks = retailPacks * innerCount, netKg = Number(row?.fillG) * primaryPacks / 1000;
    if (!errors.length && !missing.length && (!Number.isSafeInteger(primaryPacks) || !Number.isFinite(netKg) || netKg <= 0)) errors.push("These quantities are too large or too small to calculate reliably.");
    const ready = !errors.length && !missing.length;
    return { index, name: text(row?.name) || `Pack ${index + 1}`, format: row?.format, errors, missing, invalid: errors.length > 0, ready,
      retailPacks: ready ? retailPacks : null, primaryPacks: ready ? primaryPacks : null,
      netKg: ready ? netKg : null,
      cartons: ready && cartonEntered ? Math.ceil(retailPacks / Number(row.unitsPerCarton)) : null,
      finalCartonPacks: ready && cartonEntered ? retailPacks % Number(row.unitsPerCarton) || Number(row.unitsPerCarton) : null };
  });
  let ready = results.length > 0 && results.length <= 10 && results.every(row => row.ready);
  const netKg = results.reduce((sum, row) => sum + (row.netKg ?? 0), 0);
  const retailPacks = results.reduce((sum, row) => sum + (row.retailPacks ?? 0), 0);
  if (!Number.isFinite(netKg) || !Number.isSafeInteger(retailPacks)) ready = false;
  return { rows: results, ready, invalid: results.some(row => row.invalid) || results.length > 10 || !Number.isFinite(netKg) || !Number.isSafeInteger(retailPacks), netKg: ready ? netKg : null, retailPacks: ready ? retailPacks : null,
    cartons: ready && results.every(row => row.cartons !== null) ? results.reduce((sum, row) => sum + row.cartons, 0) : null };
}

export const oemQuestions = {
  title: "Your powder project", showTitle: false, showQuestionNumbers: "off", showProgressBar: "top",
  focusFirstQuestionAutomatic: false,
  progressBarType: "pages", showCompletedPage: false, completeText: "Generate my project brief",
  pageNextText: "Continue", pagePrevText: "Back", checkErrorsMode: "onComplete",
  pages: [
    { name: "project", title: "01 / Product & purpose", elements: [
      { type: "text", name: "projectName", title: "Project name", maxLength: 100, placeholder: "A name for your own reference" },
      { type: "text", name: "market", title: "Where will the finished product be sold?", isRequired: true, maxLength: 150, placeholder: "Country or market — or write Not decided" },
      { type: "text", name: "application", title: "How will the product be used?", isRequired: true, maxLength: 200, placeholder: "For example, a tabletop sweetener or an ingredient for baking" },
      { type: "radiogroup", name: "formulaRoute", title: "Where are you with the formula?", isRequired: true, choices: [
        { value: "development", text: "I need help developing a blend" }, { value: "customer", text: "I have my own formula to discuss" },
        { value: "reference", text: "I have a product or sample version to reference" }, { value: "undecided", text: "I am still exploring the options" }] },
      { type: "text", name: "reference", title: "Product or sample reference", visibleIf: "{formulaRoute} = 'reference'", maxLength: 150, description: "Use your own reference. This does not confirm a released production specification." },
      { type: "comment", name: "formulaNotes", title: "Ingredients, exclusions or sensory priorities", rows: 3, maxLength: 1500, description: "Share only what you want in your brief. Avoid entering confidential formula proportions on a shared computer." },
      { type: "text", name: "sweetnessTarget", title: "Sweetness or replacement target, if known", maxLength: 250, description: "If you write 1:1, say whether you mean equal sweetness, equal weight or equal volume. It is a target to discuss, not a verified substitution ratio." }
    ] },
    { name: "packaging", title: "02 / Packaging & quantities", elements: [
      { type: "paneldynamic", name: "packs", title: "Your requested pack formats", description: "Add the sizes you intend to order together. Totals include all rows. These are requirements for review, not pre-approved factory specifications.", minPanelCount: 1, maxPanelCount: 10, panelCount: 1, panelAddText: "Add another size", panelRemoveText: "Remove this size", templateTitle: "Pack {panelIndex}", templateElements: [
        { type: "text", name: "name", title: "Pack name", maxLength: 80, placeholder: "Optional — name this size" },
        { type: "radiogroup", colCount: 2, name: "format", title: "Requested powder format", description: "Leave blank if you need help choosing.", choices: Object.entries(packFormats).map(([value, text]) => ({ value, text })) },
        { type: "text", name: "fillG", inputType: "number", title: "Net fill (g)", min: 0, step: "any", description: "For sticks, enter grams per individual stick. For jars or pouches, enter grams per retail unit. Leave blank if undecided." },
        { type: "text", name: "sticksPerPack", inputType: "number", title: "Sticks per retail pack", min: 1, step: 1, visibleIf: "{panel.format} = 'stick'" },
        { type: "text", name: "quantity", inputType: "number", title: "Number of retail packs", min: 1, step: 1, description: "Your intended finished-product quantity, separate from packaging procurement minimums. Leave blank if undecided." },
        { type: "radiogroup", colCount: 2, name: "packagingSource", title: "Who will supply the packaging?", choices: ["Please propose packaging options", "Please review sourcing the packaging", "I plan to supply the packaging", "Not decided"] },
        { type: "comment", name: "materialNotes", title: "Material, closure, dimensions or a reference", rows: 2, maxLength: 1200, description: "If not decided, leave this blank. Use dimensions from your packaging supplier; net fill does not determine the pack dimensions." },
        { type: "radiogroup", colCount: 2, name: "decoration", title: "Requested printing or label approach", choices: ["Printed packaging", "Applied labels", "Please propose options", "Not decided"] },
        { type: "text", name: "unitsPerCarton", inputType: "number", title: "Retail packs per shipping carton, if known", min: 1, step: 1, description: "Optional. A partly filled final carton counts as one carton. Each size is planned separately." }
      ] }
    ] },
    { name: "handoff", title: "03 / Samples & next steps", elements: [
      { type: "radiogroup", colCount: 2, name: "nextStep", title: "What would help you move forward?", choices: ["Discuss formulation and samples", "Review packaging options", "Prepare a production quotation", "Explore the project first"] },
      { type: "comment", name: "sampleNotes", title: "Sample evaluation plan", rows: 2, maxLength: 1200, description: "If relevant, describe the actual application, trial conditions and the first attribute to improve. Sample scope, charges and shipping are confirmed separately." },
      { type: "text", name: "labelLanguage", title: "Requested label language(s)", maxLength: 150 },
      { type: "radiogroup", colCount: 2, name: "artwork", title: "Artwork and label copy", choices: ["I have artwork and copy for review", "I am preparing the artwork and copy", "I need to discuss the design brief", "Not decided"] },
      { type: "comment", name: "documents", title: "Documents or certification requirements", rows: 2, maxLength: 1200, description: "List what your buyer or reviewer needs. Availability and applicability must be checked for the actual product, manufacturer and market." },
      { type: "text", name: "destination", title: "Delivery city or port, if known", maxLength: 200 },
      { type: "text", name: "targetDate", inputType: "date", title: "Your target delivery date", description: "A planning target, not a confirmed lead time." },
      { type: "comment", name: "logistics", title: "Shipping, pallet or other requirements", rows: 2, maxLength: 1200 }
    ] }
  ]
};

export function oemOpenItems(data = {}) {
  const items = ["Formula and sample/version approval", "Pack compatibility, filling feasibility and production quantity", "Packaging procurement minimums, unused packaging and any allowance", "Packaging and filling charges; check which costs are already included", "Product-specific documents, label copy and destination-market review", "Lead time, delivery scope and commercial terms"];
  if (!Array.isArray(data.packs) || !data.packs.length || !data.packs.every(row => row?.unitsPerCarton)) items.push("Shipping carton capacity and final packing specification");
  if (!text(data.sampleNotes)) items.push("Sample evaluation method and acceptance priorities");
  if (!calculateOemPlan(data).ready) items.push("Requested pack formats, net fill and retail-pack quantities for each size");
  if (/1\s*:\s*1/.test(text(data.sweetnessTarget))) items.push("Confirm whether the 1:1 target refers to sweetness, weight or volume in the actual application");
  return items;
}

export function oemBriefText(data = {}) {
  const plan = calculateOemPlan(data);
  if (plan.invalid || !text(data.market) || !text(data.application) || !["development", "customer", "reference", "undecided"].includes(data.formulaRoute)) return null;
  const lines = ["HENGLIYUAN — CUSTOMER OEM PROJECT BRIEF", "Customer-entered requirements for review. Not a quotation or production approval.", "", `Project: ${text(data.projectName) || "Not named"}`, `Market: ${text(data.market)}`, `Application: ${text(data.application)}`];
  for (const page of oemQuestions.pages) for (const q of page.elements) if (q.name !== "packs" && !["projectName", "market", "application"].includes(q.name) && text(data[q.name]) && !(q.name === "reference" && data.formulaRoute !== "reference")) {
    const choice = q.choices?.find(c => c.value === data[q.name]);
    lines.push(`${q.title}: ${choice?.text || text(data[q.name])}`);
  }
  lines.push("", "PACK PLAN");
  for (const row of plan.rows) {
    const input = data.packs[row.index];
    lines.push(`${row.name} — ${packFormats[row.format] || "Format to confirm"}`, `Net fill: ${specified(input.fillG) ? `${input.fillG} g` : "To confirm"}${row.format === "stick" ? ` per stick; ${specified(input.sticksPerPack) ? input.sticksPerPack : "To confirm"} sticks per retail pack` : packFormats[row.format] ? " per retail pack" : "; pack basis to confirm"}`, `Retail packs requested: ${specified(input.quantity) ? input.quantity : "To confirm"}`, row.ready ? `Retail packs: ${row.retailPacks}; primary packs: ${row.primaryPacks}; net product: ${formatOemQuantity(row.netKg)} kg` : "Primary-pack quantity and net product: to confirm", row.cartons === null ? "Cartons: to be confirmed" : `Shipping cartons: ${row.cartons}; final carton: ${row.finalCartonPacks} retail packs`);
    for (const [key, label] of [["packagingSource", "Packaging supply"], ["materialNotes", "Material/closure/dimensions"], ["decoration", "Printing/labels"]]) lines.push(`${label}: ${text(input[key]) || "To be confirmed"}`);
    lines.push("");
  }
  if (!plan.rows.length) lines.push("Pack format, net fill and quantity: to confirm");
  lines.push(`Total net product: ${plan.ready ? formatOemQuantity(plan.netKg) + " kg" : "To confirm"}`, "Net content only. No production loss, fill overage or packaging allowance has been added. Each size is packed separately; mixed cartons need review.", "", "TO CONFIRM", ...oemOpenItems(data).map(item => `- ${item}`), "", "This brief stays in your browser unless you choose to copy, download, print or send it. Refreshing the page clears entries.");
  return lines.join("\n");
}
