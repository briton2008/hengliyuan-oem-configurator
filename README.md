# Hengliyuan OEM Configurator

[![CI](https://github.com/briton2008/hengliyuan-oem-configurator/actions/workflows/ci.yml/badge.svg)](https://github.com/briton2008/hengliyuan-oem-configurator/actions/workflows/ci.yml) [![Pages](https://github.com/briton2008/hengliyuan-oem-configurator/actions/workflows/pages.yml/badge.svg)](https://github.com/briton2008/hengliyuan-oem-configurator/actions/workflows/pages.yml) [![Release](https://img.shields.io/github/v/release/briton2008/hengliyuan-oem-configurator)](https://github.com/briton2008/hengliyuan-oem-configurator/releases) [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**[Company website](https://heng-li-yuan.com/) · [Live demo](https://briton2008.github.io/hengliyuan-oem-configurator/) · [Official company tool](https://heng-li-yuan.com/tools/oem-product-configurator/) · [中文](README.zh-CN.md)**

[![Hengliyuan OEM Configurator](assets/team-cover-en.png)](https://heng-li-yuan.com/)

Click the illustrated cover to visit the company website.

Plan powder sweetener pack quantities and prepare a customer-entered OEM project brief. An independent, English-language browser project maintained by Guilin Hengliyuan Biotech Co., Ltd. No login or automatic submissions.

## What it does

- Stick, jar and pouch requirements without invented quantities or MOQ.
- Net product and retail/primary packaging quantities remain separate.
- Company PDF brief, editable review and a clear list of open items.

## Run locally

Node.js 22.12+ and npm:

```sh
npm ci --ignore-scripts
npm test
npm run check:release
npm run dev
```

Production: `npm run build`, then `npm run preview`. Deploy `dist/` to static hosting. GitHub Pages uses `.github/workflows/pages.yml`; project subdirectories need no rewrite rule. This distribution is interactive client code, not the company website's SEO prerenderer.

## Check the browser workflow

```sh
npm run build
npx playwright install chromium
npm run test:browser
```

This checks a real browser against a simulated Pages subdirectory, including a complete tool workflow, mobile layouts, clipboard and company PDF export. Example records are synthetic and written to temporary folders.

## Data and limits

Planning inputs are customer-entered requirements, not an approved formulation, quotation, MOQ or production commitment.

All inputs stay in memory in the current tab. Refreshing or navigating away clears them. Copy or save a PDF first. No database, localStorage, analytics, remote calculation, API key or customer-submission endpoint is included. Contact buttons explain the handoff before opening the official contact page in another tab; input values are not attached.

Customer dimensions, weights, sample observations, project specifications and costs are not supplied by the project. No inventory, freight, price, MOQ, customer review or approval is invented. The company identity in PDFs is for review worksheets, not authorization to issue official commercial or technical documents.

## Reuse and contribute

MIT code; original third-party terms in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Company identifiers and PDF branding are separately reserved: see [TRADEMARKS.md](TRADEMARKS.md). Forks should replace the identity before redistribution. See [CONTRIBUTING.md](CONTRIBUTING.md), [Code of Conduct](CODE_OF_CONDUCT.md) and [security policy](.github/SECURITY.md).

This repository contains this tool only. Other Hengliyuan tools have independent repositories, demos and releases.
