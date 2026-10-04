# Curator — Antiques & Fine Art Catalog

[![Version](https://img.shields.io/github/package-json/v/philflav/Curator?color=amber&label=version)](https://github.com/philflav/Curator/blob/main/package.json)
[![PWA](https://img.shields.io/badge/PWA-Installable-5f4131.svg)](https://github.com/philflav/Curator)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-purple.svg)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-stone.svg)](LICENSE)

> **Curator** is an offline-ready, mobile-first Progressive Web App (PWA) designed for collectors, appraisers, antique dealers, and historians to document, value, and manage collections of fine art, ceramics, furniture, clocks, and collectibles.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture & Storage Engine](#architecture--storage-engine)
- [AI-Assisted Cataloging & Appraisal](#ai-assisted-cataloging--appraisal)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
  - [Firebase Setup (Optional Cloud Sync)](#firebase-setup-optional-cloud-sync)
  - [Gemini AI Setup (Visual Appraisal)](#gemini-ai-setup-visual-appraisal)
- [PWA & Mobile Installation](#pwa--mobile-installation)
- [Data Export & Backup](#data-export--backup)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

Traditional collection management software is often locked behind expensive monthly subscriptions, desktop-only software, or cloud services that fail in rural antique fairs and auction basements.

**Curator** was built on three core principles:
1. **100% Free Forever**: No paid SaaS dependencies or recurring subscription fees.
2. **Offline-First Resilience**: Full standalone operation with client-side IndexedDB persistence. Add, edit, photograph, and catalog items anywhere—even without mobile reception.
3. **Intelligent Cloud Synchronization**: Instant, multi-device real-time sync with Google Cloud Firestore as the authoritative master whenever online.

---

## Key Features

### 🏺 Comprehensive Item Cataloging
- **Structured Fields**: Title, category, subcategory, maker/artisan, model/pattern number, period or creation year, condition, physical dimensions (cm/in), acquisition cost, acquisition date, acquisition venue, estimated market valuation, notes, and provenance.
- **UK Date Standard (DD/MM/YYYY)**: All dates across forms, detail views, audit spreadsheets, and CSV exports adhere to standard UK formatting (`DD/MM/YYYY`), complete with an integrated popover calendar picker.
- **7 Core Antique Disciplines**:
  - **Furniture** (*Cabinets & Bookcases, Chests, Clocks & Mirrors, Seating, Tables*)
  - **Ceramics & Porcelain** (*Chinese, Doulton Lambeth, Japanese, Lladró, Moorcroft, Oriental*)
  - **Fine Art** (*Oil Paintings, Prints & Lithographs, Sculpture, Watercolors*)
  - **Glass** (*Art Glass, Carnival Glass, Cut Crystal, Stained Glass*)
  - **Clocks & Watches** (*Bracket Clocks, Carriage Clocks, Longcase / Grandfather, Pocket Watches, Wristwatches*)
  - **Metalware** (*Bronze & Brass, Cast Iron, Pewter, Silver & Silverplate*)
  - **Other** (*Books & Ephemera, Collectibles, Jewelry, Textiles*)
- **Composite Subcategory Dropdown**: Replaced horizontal pill overflow with a compact composite dropdown featuring live search, real-time item counts, filter badges, inline subcategory creation, and automatic metadata harvesting from catalog items.

### 🔍 Search, Filter & Audit Views
- **Card Grid View**: High-resolution gallery view with aspect-ratio scaling to showcase photographs without clipping.
- **Dense Audit Table View**: Spreadsheet-like view for rapid stock auditing, condition checks, and valuation reviews.
- **Multi-Field Instant Search**: Search instantaneously across titles, makers, patterns, periods, notes, and locations.
- **Sorting Modes**: Recently updated, Highest Value, Lowest Value, Maker (A–Z), and Title (A–Z).

### 🤖 AI-Powered Visual Appraisal & Hallmark Research
- **Google Gemini 2.5 Flash Integration**: Point your mobile camera at any antique to analyze traits, origins, and condition.
- **Dedicated Hallmark & Mark Research**: Capture focused macro photographs of underside porcelain backstamps, silver assay marks, diamond registration kite marks, or artist signatures.
- **Automatic Period/Year Detection**: AI-detected date letters and registration dates from mark research automatically populate the **Period / Year** field in catalog records.
- **Realistic Auction Hammer Valuations**: Valuations are strictly calibrated to **secondary market auction hammer prices** (e.g., regional UK auction houses, The-Saleroom, Bonhams, Woolley & Wallis) rather than inflated retail dealer or 1stDibs asking prices, with condition depreciation penalties.
- **Interactive Review**: Review AI suggestions with a side-by-side comparison before applying, with a one-click Undo capability.

### 📸 Visual Image Match
- **Visual Similarity Search**: Photograph an item at an auction or antique shop to find matching or similar items already in your personal collection.

### 💰 Portfolio Valuation
- **Real-Time Portfolio Valuation**: Dynamic valuation tally with profit/acquisition margin calculations and multi-currency support (£ GBP, $ USD, € EUR).

---

## 🚀 What's New in v1.2.0

- **Dedicated AI Mark, Hallmark & Signature Inspection**: Dedicated workflow to photograph bases, maker marks, hallmarks, and artist signatures independently with registry cross-referencing and automatic Period/Year form updates.
- **Secondary Market Auction Hammer Valuations**: Re-anchored AI appraisals to actual auction comps (The-Saleroom, UK regional salerooms) instead of full gallery retail asking prices.
- **Composite Searchable Subcategory Menu**: Replaced horizontal pill row with a sleek composite dropdown menu with live search, item counters, and inline subcategory creation.
- **Automatic Subcategory Syncing**: Automatic harvesting of subcategories tagged on catalog items (e.g. Lladró) synced to Firestore metadata.
- **UK Date Standardization (`DD/MM/YYYY`)**: Standardized all date displays, form inputs, calendar pickers, and CSV exports to UK format, backed by an automated database migration script (`npm run migrate:dates`).

---

## Architecture & Storage Engine

Curator uses a multi-tiered storage architecture:

```
┌────────────────────────────────────────────────────────┐
│                      Client UI                         │
│       React 19 Components + Tailwind CSS Views         │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌────────────────────────────┐
│   IndexedDB (Primary)   │ │  LocalStorage (Fallback)   │
│  - curator_antiques_idb │ │  - Fast config & metadata  │
│  - Full schema records  │ │  - Custom subcategories    │
└────────────┬────────────┘ └────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────┐
│                  Offline Sync Queue                    │
│   - Enqueues saves & deletes when offline              │
│   - Automatic retry engine with timeout protection     │
│   - Conflict prevention & tombstone tracking           │
└──────────────────────────┬─────────────────────────────┘
                           │ (when online)
                           ▼
┌────────────────────────────────────────────────────────┐
│            Google Cloud Firestore (Master)             │
│   - Authoritative source of truth                      │
│   - Real-time onSnapshot bi-directional listeners      │
│   - Automatic schema sanitization (undefined-safe)     │
└────────────────────────────────────────────────────────┘
```

- **Master Reconciliation**: Cloud Firestore serves as the master source of truth. When the app loads or reconnects, local storage actively reconciles with the cloud, pruning remotely deleted items and preserving pending offline drafts.
- **Ghost Deletion Prevention**: Deleting an item immediately cancels pending save jobs in the queue and establishes offline deletion tombstones to ensure deleted items are never accidentally resurrected.

---

## Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Framework** | [React 19](https://react.dev/) | Component hierarchy with modern hooks |
| **Language** | [TypeScript 5.7](https://www.typescriptlang.org/) | Strict type safety across all schemas |
| **Bundler** | [Vite 6.2](https://vitejs.dev/) | Rapid HMR and optimized ES module bundling |
| **Styling** | [Tailwind CSS 3.4](https://tailwindcss.com/) | Bespoke warm antique aesthetic (`#faf8f5`, `#5f4131`) |
| **Icons** | [Lucide React](https://lucide.dev/) | Clean, consistent vector iconography |
| **PWA** | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | Service worker, Workbox precaching, offline manifest |
| **Database** | [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) + [Cloud Firestore](https://firebase.google.com/docs/firestore) | Hybrid offline-first and cloud master database |
| **Cloud Storage** | [Firebase Storage](https://firebase.google.com/docs/storage) | Optional cloud asset hosting with Base64 fallback |
| **AI Engine** | [Google Gemini 2.5 Flash](https://ai.google.dev/) | Multimodal visual recognition and appraisal |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or higher
- `npm` (v9 or higher) or `pnpm`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/philflav/Curator.git
   cd Curator
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5180` in your browser.

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run preview
   ```

---

## Configuration

Curator functions out of the box in standalone local mode. To enable cloud synchronization or AI appraisal, configure the following optional settings:

### Firebase Setup (Optional Cloud Sync)

1. Create a free Firebase project at [console.firebase.google.com](https://console.firebase.google.com/).
2. Enable **Cloud Firestore** in test mode (or configure security rules).
3. *(Optional)* Enable **Cloud Storage** if you want remote image hosting.
4. Copy your Web App credentials.

You can configure credentials in two ways:

- **Option A (In-App Modal):** Click the **Storage / Database** button in the Curator top navigation bar, paste your Firebase JavaScript config snippet, and click **Save & Connect**.
- **Option B (Environment Variables):** Create a `.env.local` file in the project root:
  ```env
  VITE_FIREBASE_API_KEY=your_api_key
  VITE_FIREBASE_PROJECT_ID=your_project_id
  VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
  VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
  VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
  VITE_FIREBASE_APP_ID=your_app_id
  ```

### Gemini AI Setup (Visual Appraisal)

1. Obtain a free Google Gemini API key from [aistudio.google.com](https://aistudio.google.com/).
2. In Curator, click the **AI Settings** (sparkle icon) in the header.
3. Paste your API key and select your preferred model (default: `gemini-2.5-flash`).
4. Alternatively, configure in `.env.local`:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

---

## PWA & Mobile Installation

Curator is built as a Progressive Web App compliant with W3C mobile standards.

### On Android (Chrome / Edge)
1. Open your Curator URL.
2. Tap the **Install App** button in the header (or select **Install app** from the Chrome menu).
3. Curator installs directly to your home screen and app drawer, launching in full-screen standalone mode without browser chrome.

### On iOS (Safari)
1. Open your Curator URL in Safari.
2. Tap the **Share** button (box with upward arrow) in the bottom navigation bar.
3. Scroll down and tap **Add to Home Screen**.
4. Confirm to add the Curator icon to your iPhone or iPad home screen.

---

## Data Export & Backup

- **CSV Export**: Clean spreadsheet export formatted for Microsoft Excel, Apple Numbers, or Google Sheets. Image download binaries are excluded to maintain lightweight, reliable tabular data.
- **JSON Backup**: Complete raw data backup including all metadata, timestamps, and gallery image references.
- **Category Filtered Exports**: Export your entire catalog or filter exports by a specific category (e.g. *Furniture*, *Ceramics & Porcelain*).

---

## Project Structure

```
Curator/
├── public/                     # Static PWA launcher icons and manifest
│   ├── pwa-192x192.png        # Android 192px maskable icon
│   ├── pwa-512x512.png        # Android 512px launcher icon
│   ├── apple-touch-icon.png   # iOS Safari touch icon (180px)
│   ├── favicon.ico            # Browser favicon
│   └── manifest.json          # Web App Manifest
├── scripts/
│   └── migrateDatesToUK.js    # Database migration script for UK date formats
├── src/
│   ├── components/            # UI components
│   │   ├── Navbar.tsx         # Header, search bar, PWA install & sync status
│   │   ├── CatalogGrid.tsx    # Card gallery grid view
│   │   ├── CatalogTable.tsx   # Dense audit table view
│   │   ├── SubcategoryDropdown.tsx # Searchable composite subcategory menu
│   │   ├── ItemDetailModal.tsx# Comprehensive item view & lightbox
│   │   ├── ItemFormModal.tsx  # Add/Edit form with AI camera appraisal
│   │   ├── ResearchMarksModal.tsx # Macro mark & hallmark research modal
│   │   ├── GeminiApiKeyPromptModal.tsx # Explanatory API key dialog
│   │   ├── FirebaseModal.tsx  # Cloud credentials & manual sync manager
│   │   ├── ExportModal.tsx    # CSV / JSON export engine
│   │   ├── VisualSearchModal.tsx # Image similarity matcher
│   │   ├── AIVisionSettingsModal.tsx # Gemini AI API configuration
│   │   └── ErrorBoundary.tsx  # React recovery & cache-buster boundary
│   ├── services/              # Business logic & data access
│   │   ├── firebase.ts        # Firebase SDK initialization & sanitizers
│   │   ├── storageService.ts  # Master-replica IndexedDB & Firestore engine
│   │   ├── syncService.ts     # Offline queue & background sync processor
│   │   ├── subcategoryService.ts # Dynamic subcategory persistence & sync
│   │   ├── aiVisionService.ts # Multimodal AI appraisal & mark research pipeline
│   │   └── imageSimilarity.ts # Visual feature matching
│   ├── types/
│   │   └── schema.ts          # Core Item, Category & Condition definitions
│   ├── utils/
│   │   ├── date.ts            # UK date formatting (DD/MM/YYYY) utilities
│   │   ├── export.ts          # CSV and JSON serialisation utilities
│   │   └── image.ts           # Client-side image downscaling & processing
│   ├── App.tsx                # Application root, state & view router
│   ├── main.tsx               # Service Worker registration & React entrypoint
│   └── index.css              # Tailwind base styling & font imports
├── index.html                 # App shell with PWA tags & self-healing watchdog
├── vite.config.ts             # Vite configuration with Workbox & PWA settings
├── vercel.json                # Vercel deployment configuration & asset headers
└── package.json               # Dependencies, scripts & application version metadata
```

---

## Roadmap

- [x] PWA offline caching and standalone home screen installation.
- [x] Bi-directional Google Cloud Firestore synchronization.
- [x] Multimodal AI image appraisal via Gemini 2.5 Flash.
- [x] Visual image similarity matching.
- [x] Alphabetized dynamic category and subcategory hierarchy.
- [x] Clean CSV and JSON collection export.
- [ ] Barcode and QR code labeling for physical inventory tags.
- [ ] Insurance valuation PDF report generator.
- [ ] Multi-user shared collections with permission tiers.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
