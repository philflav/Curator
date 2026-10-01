# PROJECT DIRECTIVE: "Curator" — Offline-First Antiques & Collectibles Catalog PWA

## Model & Agent Target
- **Target Platform:** Google Antigravity Agent Harness (Gemini 3.8)
- **Role:** Autonomous Principal Full-Stack Engineer & Systems Architect
- **Operating Mode:** Incremental execution, sandboxed testing, minimal speculative bloat, strict TypeScript type safety.

---

## 1. System Overview & Tech Stack
Build a Progressive Web Application (PWA) tailored for cataloging, researching, valuing, and recording collections of antiques, ceramics, and fine art. The app operates strictly offline-first, leveraging multimodal computer vision to identify maker backstamps, signatures, model numbers, and pattern codes.

- **Frontend & PWA Shell:** React 19 + TypeScript + Vite + Tailwind CSS + Lucide React.
- **Offline Persistence & Authority:** Client-first IndexedDB via `Dexie.js` (with reactive `useLiveQuery` hooks).
- **Service Worker & Caching:** `vite-plugin-pwa` with Workbox (Cache-First for static assets, Stale-While-Revalidate for app shell).
- **Blob & Media Management:** Full-resolution camera captures and thumbnails stored as Blobs directly in IndexedDB.
- **Vision Recognition Engine:** Configurable OpenAI-compatible client connecting to local endpoints (e.g. Ollama/LM Studio at `http://localhost:11434/v1` or `http://localhost:1234/v1`) or cloud vision models.
- **Export/Sync Architecture:** Fully decoupled local schema prepared for optional lightweight sync (FastAPI/SQLite); offline export to JSON and ZIP (with images via `JSZip`).

---

## 2. Core Domain Data Model (`src/types/schema.ts`)

```typescript
export type Category = 
  | 'Furniture'
  | 'Ceramics & Porcelain' 
  | 'Fine Art' 
  | 'Glass' 
  | 'Clocks & Watches' 
  | 'Metalware' 
  | 'Other';

export type Condition = 'Mint' | 'Excellent' | 'Good' | 'Fair' | 'Restored' | 'Damaged';

export interface Item {
  id: string; // UUID v4
  title: string;
  category: Category;
  maker?: string; // e.g. "Royal Doulton", "Moorcroft"
  modelOrPattern?: string; // e.g. "HN 2106", "Blue Fluted"
  periodOrYear?: string; // e.g. "c. 1930", "1954"
  condition: Condition;
  conditionNotes?: string;
  dimensions?: {
    height?: number;
    width?: number;
    depth?: number;
    unit: 'cm' | 'in';
  };
  acquisitionDate?: string;
  acquisitionCost?: number;
  acquisitionLocation?: string; // e.g. "Portobello Road Market, London"
  currency: 'GBP' | 'USD' | 'EUR';
  estimatedValue?: number;
  description?: string; // Freeform item description
  notes?: string;
  primaryImageId?: string;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
}

export interface ItemImage {
  id: string; // UUID v4
  itemId: string;
  imageBlob: Blob;
  thumbnailBlob: Blob;
  type: 'overview' | 'maker_mark' | 'signature' | 'damage_detail' | 'certificate';
  description?: string;
  createdAt: number;
}

export interface AcquisitionLocation {
  id: string; // UUID v4
  name: string; // e.g. "Portobello Road Market", "Christie's South Kensington"
  type: 'Market' | 'Auction House' | 'Antique Centre' | 'Flea Market' | 'Gallery' | 'Estate Sale' | 'Private Collector' | 'Online' | 'Other';
  address?: string;
  city?: string;
  country?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  contactInfo?: string;
  website?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
```

## 3. UI/UX Specification & Routes
Aesthetic: Clean utilitarian catalog theme. Warm neutral backdrop (`bg-stone-50` / `dark:bg-stone-900`), monospaced metadata identifiers, and high-contrast typography.

### View Breakdown
- **Catalog Dashboard (`/`)**:
  - Instant debounced search querying title, maker, modelOrPattern, and notes.
  - Multi-tier Category & Subcategory filter pills (with inline `+ Add` creation and deletion of custom subcategories) + sort dropdown (Date Added, Est. Value, Maker A–Z).
  - Switchable layouts: Responsive Card Grid and Dense Audit Table.
- **Item Detail View (`/item/:id`)**:
  - Media split: Primary high-res viewport with pinch-to-zoom and selectable thumbnail strip for macro detail shots.
  - Detailed specification sheet: Grouped by Identification, Physical Metrics, Valuation/Provenance, and Condition Log.
- **Item Form & Image Ingestion (`/item/new`, `/item/:id/edit`)**:
  - HTML5 Camera Capture + local dropzone with client-side canvas downscaling and thumbnail generation.
  - Tagging of image types (Overview, Maker's Mark, Signature, Damage Detail).
  - Referential acquisition location selector linking to the `locations` collection.
- **Vision Assistant & Mark Reconciliation Modal**:
  - Macro mark photo intake (camera or file).
  - Structured JSON vision inference requesting: maker, modelOrPattern, periodOrYear, description, confidenceScore.
  - Side-by-side reconciliation interface: shows detected traits vs. current form state with individual checkboxes to merge values into the item draft.
- **Online Mark & ID Research Mode**:
  - Dedicated research engine: input or extract an identification number, pattern code, registration diamond, hallmark, or maker mark.
  - Automated web lookup against ceramic/antique databases and auction records to pull provenance and historical data.
  - One-click enrichment into the active item record.
- **Acquisition Locations Console (`/locations`)**:
  - Browse, add, and manage acquisition locations and venues.
  - View purchases, total spend, and item links per venue.
- **Settings & Backup Console (`/settings`)**:
  - Firebase connection credentials and Firestore sync console.
  - Vision endpoint configuration: Base URL, Model Name, and connection test utility.
  - Storage metrics and JSON/CSV/ZIP backup & restore.

---

## 4. Multimodal Vision Assistant Integration Contract
When triggering the identification endpoint, construct an OpenAI-compatible payload:

- **Endpoint**: User-configured baseUrl + `/chat/completions`
- **Prompt Formulation**:
```json
{
  "model": "<configured-model>",
  "messages": [
    {
      "role": "system",
      "content": "You are an expert antique appraiser, ceramicist, and art historian. Inspect the provided image of an antique, backstamp, hallmark, or signature. Output valid JSON matching this schema: {\"maker\": string, \"modelOrPattern\": string, \"periodOrYear\": string, \"category\": string, \"description\": string, \"confidenceScore\": number}."
    },
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "Analyze this maker's mark or collectible object and extract identifying catalog metadata."},
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,<base64_data>"}}
      ]
    }
  ],
  "response_format": { "type": "json_object" }
}
```

---

## 5. Phased Execution Roadmap

### Phase 1: Project Scaffolding & PWA Baseline — [COMPLETED]
- React 19, TypeScript, Tailwind CSS, Lucide React, and Vite PWA with Workbox offline caching.

### Phase 2: Offline Persistence & IndexedDB Authority — [COMPLETED]
- IndexedDB engine, offline sync queue, client-side canvas downscaling, and thumbnail caching.

### Phase 3: Catalog Views & Category/Subcategory Management — [COMPLETED]
- Card Grid and Audit Table views; multi-tier subcategories (Japanese, Chinese, Moorcroft, etc.) with inline `+ Add` and `×` delete management.

### Phase 4: Cloud Firebase / Firestore Integration & Sync Engine — [COMPLETED]
- `ignoreUndefinedProperties: true` & recursive `sanitizeForFirestore` for unblocked writes.
- First-class database recording for categories and subcategories (`metadata/categories_and_subcategories`) with real-time `onSnapshot` promulgation.
- Git repository baseline & initial checkpoint commit (`3951f28`).

### Phase 5: Multimodal AI Vision, Backstamp Identification & Research Mode — [CURRENT]
- Multimodal AI Vision client and Visual Search modal comparing queries with stored catalog images.
- **Online Mark & ID Number Research Mode**: Research identification marks, pattern numbers, and hallmarks against web resources and auction archives to append historical findings.

### Phase 6: Normalized Acquisition Locations Collection — [PLANNED]
- Dedicated `locations` collection in Firestore & IndexedDB.
- Rich location metadata (venue type, geolocation, contact info, notes).
- Referential linking (`locationId`) on items with detail inspection and per-venue purchase analytics.

### Phase 7: Cloud Storage, Export & Portfolio Polish — [UPCOMING]
- Full ZIP archive export (JSON + original photos) via `JSZip`.
- Provision Cloud Storage bucket for cloud image hosting.
- Printable PDF insurance / valuation catalog report generator.

### Phase 8: Native Mobile Transition (Moving Away from PWA to Native Mobile App) — [REQUIREMENT]
- **Target**: Transition from browser-bound PWA to a full-featured native mobile app (iOS and Android).
- **Motivation & Capabilities**:
  - Eliminate browser IndexedDB storage quotas and cache eviction risks; leverage native filesystem / embedded SQLite for vast, high-resolution photo archives.
  - Native camera hardware access (manual macro focus lock, optical zoom, torch/flashlight control) essential for macro photography of tiny hallmarks, makers' marks, and backstamps in dark antique markets.
  - True background sync daemon operating when the app is suspended or minimized.
  - Native device biometrics (Face ID / Touch ID / BiometricPrompt) to safeguard private inventory valuations.
  - App Store & Google Play distribution.
- **Architecture Strategy**:
  - *Option A (Capacitor Runtime - Recommended)*: Bridge the existing React 19 + TypeScript + Tailwind codebase into Xcode / Android Studio via Capacitor (`@capacitor/camera`, `@capacitor/filesystem`, `@capacitor-community/sqlite`). Retains 95%+ of current tested frontend and offline sync logic while enabling full native device APIs.
  - *Option B (React Native / Expo)*: Rewrite the UI layer with native components while sharing existing TypeScript domain models and cloud services.
