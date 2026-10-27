import React, { useMemo, useRef, useState } from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { ArrowRight, Check, Clipboard, Package, Printer, RotateCcw } from "lucide-react";
import "survey-core/survey-core.fontless.min.css";
import "./oem-configurator.css";
import CompanyToolDocument from "./company-tool-document.jsx";
import { calculateOemPlan, formatOemQuantity as n, oemBriefText, oemOpenItems, oemQuestions, oemTitle, packFormats } from "./oem-configurator-model.mjs";

import { oemFaqs } from "./oem-configurator-content.mjs";

export default function OemConfigurator({ onInquiry }) {
  const [data, setData] = useState({}), [brief, setBrief] = useState(null), [status, setStatus] = useState("");
  const resultRef = useRef(null);
  const model = useMemo(() => {
    const survey = new Model({ ...oemQuestions, clearInvisibleValues: "onHidden" });
    survey.applyTheme({ cssVariables: { "--sjs-primary-backcolor": "#237247", "--sjs-primary-backcolor-dark": "#174a31", "--sjs-primary-forecolor": "#ffffff", "--sjs-general-backcolor": "#ffffff", "--sjs-general-backcolor-dim": "#ffffff", "--sjs-corner-radius": "8px", "--sjs-font-family": "inherit", "--sjs-base-unit": "8px" } });
    survey.onValueChanged.add(() => { setData(structuredClone(survey.data)); setBrief(null); setStatus(""); });
    survey.onCurrentPageChanged.add(() => document.getElementById("oem-configurator")?.scrollIntoView({ behavior: "auto", block: "start" }));
    survey.onValidateQuestion.add((_, options) => {
      const name = options.question.name, value = options.value;
      if (["market", "application"].includes(name) && (typeof value !== "string" || !value.trim())) options.error = "Enter your requirement, or write Not decided.";
      if (["quantity", "sticksPerPack", "unitsPerCarton"].includes(name) && value !== undefined && value !== null && String(value).trim() !== "" && (!Number.isSafeInteger(Number(value)) || Number(value) <= 0)) options.error = "Enter a positive whole number.";
      if (name === "fillG" && value !== undefined && value !== null && String(value).trim() !== "" && (!Number.isFinite(Number(value)) || Number(value) <= 0)) options.error = "Enter a positive net fill weight.";
    });
    survey.onCompleting.add((_, options) => {
      if (calculateOemPlan(survey.data).invalid) { options.allowComplete = false; setStatus("Check the entered fill weights, whole-pack counts and carton capacities. Leave undecided quantities blank."); }
    });
    survey.onComplete.add(() => { setBrief(oemBriefText(survey.data)); requestAnimationFrame(() => { resultRef.current?.scrollIntoView({ behavior: "auto", block: "start" }); resultRef.current?.focus({ preventScroll: true }); }); });
    return survey;
  }, []);
  const plan = calculateOemPlan(data);
  async function copy() {
    try { await navigator.clipboard.writeText(brief); setStatus("Project brief copied. Review it before sending."); }
    catch { setStatus("Copy is unavailable here. Select the project brief below and copy it manually."); }
  }

  return <div className="sweetener-tools-page oem-page" lang="en" dir="ltr">
    <div className="blend-container">
      <nav className="blend-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/tools/">Tools</a><span>/</span><span aria-current="page">OEM project configurator</span></nav>
      <header className="blend-hero oem-hero"><div><p className="blend-eyebrow">HENGLIYUAN / PROJECT TOOLS</p><h1>{oemTitle}.</h1><p>Plan the pack.<br />Bring a clearer brief to your next discussion.</p></div><p className="oem-privacy"><Check size={16} aria-hidden="true" /> Free to use · No login<br /><span>Your entries stay in this page.</span></p></header>
      <div className="oem-intro"><Package size={23} aria-hidden="true" /><p>For powder sweetener projects. Define each pack size, see the net product and packaging quantities, then generate a brief you can keep or share. Production feasibility and commercial terms are confirmed separately.</p></div>
      <noscript><p>Enable JavaScript to configure your project. The planning method and review checklist are available below.</p></noscript>
      <div className="oem-workspace" id="oem-configurator">
        <section className="oem-form" aria-label="Configure your powder project"><div className="oem-form-toolbar"><span>YOUR PROJECT WORKSHEET</span><button type="button" className="blend-reset" onClick={() => { model.clear(); setData({}); setBrief(null); setStatus(""); }}><RotateCcw size={15} aria-hidden="true" />Reset</button></div>{brief ? <div className="oem-complete-overview"><p className="blend-eyebrow">CUSTOMER-ENTERED REQUIREMENTS</p><h2>Your project, in one place.</h2><dl>{oemQuestions.pages.flatMap(page => page.elements).filter(q => q.name !== "packs" && data[q.name] && !(q.name === "reference" && data.formulaRoute !== "reference")).map(q => <div key={q.name}><dt>{q.title}</dt><dd>{q.choices?.find(c => c.value === data[q.name])?.text || data[q.name]}</dd></div>)}</dl><h3>Requested packaging</h3>{plan.rows.map(row => { const input = data.packs[row.index]; return <div className="oem-pack-review" key={row.index}><h4>{row.name} · {packFormats[row.format] || "Format to confirm"}</h4><p>{input.fillG ? `${input.fillG} g` : "Net fill to confirm"} {row.format === "stick" ? `per stick · ${input.sticksPerPack || "To confirm"} sticks per retail pack` : packFormats[row.format] ? "per retail pack" : "· pack basis to confirm"}</p><p>{input.quantity ? n(Number(input.quantity)) : "To confirm"} retail packs requested</p><p>{input.packagingSource || "Packaging supply to confirm"}</p>{input.materialNotes && <p>{input.materialNotes}</p>}<p>{input.decoration || "Printing and labels to confirm"}</p></div>; })}{!plan.rows.length && <p className="oem-summary-note">Packaging format, net fill and quantity are to be confirmed.</p>}<p className="oem-summary-note">This is your working brief. Use Edit project to change it, or copy and share it when you are ready.</p></div> : <Survey model={model} />}</section>
        <aside className="oem-summary" aria-labelledby="oem-summary-title" ref={resultRef} tabIndex={-1}>
          <p className="blend-eyebrow">{brief ? "YOUR PROJECT BRIEF" : "PLAN AT A GLANCE"}</p><h2 id="oem-summary-title">{brief ? "Ready for your review." : "The quantities behind the pack."}</h2>
          <p className="oem-summary-note">{brief ? "Customer-entered requirements. Review the details before sharing." : "Fill in each requested size to see the complete plan. No quantities or prices are assumed."}</p>
          <dl className="oem-metrics"><div><dt>Net product required</dt><dd data-testid="oem-net-kg">{plan.ready ? `${n(plan.netKg)} kg` : "—"}</dd></div><div><dt>Finished retail packs</dt><dd data-testid="oem-retail-packs">{plan.ready ? n(plan.retailPacks) : "—"}</dd></div><div><dt>Shipping cartons</dt><dd data-testid="oem-cartons">{plan.cartons === null ? "To confirm" : n(plan.cartons)}</dd></div></dl>
          {plan.rows.map(row => <section className="oem-pack-result" key={row.index}><h3>{row.name}</h3>{row.ready ? <><p>{packFormats[row.format]} · {n(row.primaryPacks)} primary packs</p><p>{n(row.netKg)} kg net product{row.cartons !== null ? ` · ${n(row.cartons)} cartons` : " · carton plan to confirm"}</p>{row.cartons !== null && <p>Final carton: {n(row.finalCartonPacks)} retail packs.</p>}</> : <p>Fill in the quantities to calculate, or leave undecided values blank in your brief.</p>}</section>)}
          <p className="oem-net-note">Net fill only. Production loss, overfill and packaging allowances are not included. Each size is packed separately.</p>
          {brief ? <><div className="oem-actions"><button type="button" onClick={copy}><Clipboard size={16} aria-hidden="true" />Copy brief</button><button type="button" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print / save company PDF</button><button type="button" onClick={() => { model.clear(false); setBrief(null); }}>Edit project</button></div><label className="oem-brief-label">Your complete project brief<textarea readOnly rows={12} value={brief} onFocus={event => event.target.select()} /></label><button type="button" className="oem-contact inquiry-trigger" aria-haspopup="dialog" onClick={() => onInquiry("Powder OEM project — customer brief prepared")}>Discuss this project <ArrowRight size={17} aria-hidden="true" /></button><p className="oem-net-note">Copy the brief or save its PDF first, then add it to your message. Nothing is sent automatically.</p></> : <div className="oem-pending"><h3>What you will get</h3><p>A pack-by-pack quantity plan, your requirements and a clear list of points to confirm. Complete the three steps to generate it.</p></div>}
          <p className="oem-status" role="status">{status}</p>
        </aside>
      </div>
      <section className="oem-review" aria-labelledby="oem-review-title"><div><p className="blend-eyebrow">FROM BRIEF TO PRODUCTION</p><h2 id="oem-review-title">Keep the next decision clear.</h2><p>Your brief helps separate the requested product, packaging responsibility and quantities before samples or commercial terms are agreed.</p><a href="/en/oem/">Explore OEM and private label <ArrowRight size={16} aria-hidden="true" /></a></div><ol>{oemOpenItems(data).slice(0, 6).map(item => <li key={item}>{item}</li>)}</ol></section>
      <section className="oem-method"><h2>How the quantity plan works</h2><p>For jars and pouches, net kilograms = net fill in grams × retail packs ÷ 1,000. For sticks, first multiply sticks per retail pack by retail packs, then multiply by grams per stick and divide by 1,000. A primary pack means an individual stick, jar or pouch; a retail pack may contain several sticks.</p><p>For each size, shipping cartons = round up (retail packs ÷ retail packs per carton). Missing carton capacity stays unconfirmed. A product weight does not establish packaging dimensions or container capacity. Packaging procurement quantities, production quantities and your finished-product order are reviewed separately.</p><a href="/tools/sweetener-blend-cost-calculator/">Estimate blend cost and sweetness <ArrowRight size={16} aria-hidden="true" /></a></section>
      <section className="blend-faq" aria-labelledby="oem-faq-title"><div><p className="blend-eyebrow">BEFORE YOU SHARE</p><h2 id="oem-faq-title">Useful answers.</h2></div><div>{oemFaqs.map(([q, a], index) => <details key={q}><summary><span className="blend-faq-number">{String(index + 1).padStart(2, "0")}</span><span>{q}</span></summary><p>{a}</p></details>)}</div></section>
      <p className="blend-attribution">Form engine: <a href="https://github.com/surveyjs/survey-library" target="_blank" rel="noreferrer">SurveyJS Form Library</a> · <a href="/licenses/surveyjs-form-library-MIT.txt">MIT license</a>.</p>
    </div>
    {brief && <CompanyToolDocument title="OEM PROJECT BRIEF" category="POWDER OEM" text={brief} />}
  </div>;
}
