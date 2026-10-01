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

3. UI/UX Specification & Routes
Aesthetic: Clean utilitarian catalog theme. Warm neutral backdrop (bg-stone-50 / dark:bg-stone-900), monospaced metadata identifiers, and high-contrast typography.

Layouts:

Mobile / PWA: Bottom navigation bar (Catalog, Identify, Add Item, Settings).

Desktop / Tablet: Collapsible sidebar navigation with real-time multi-attribute filter facets.

View Breakdown
Catalog Dashboard (/):

Instant debounced search querying title, maker, modelOrPattern, and notes.

Category filter pills + sort dropdown (Date Added, Est. Value, Maker A–Z).

Switchable layouts: Responsive Card Grid (showing hero image, maker badge, model pill, value in £) and Dense Audit Table.

Item Detail View (/item/:id):

Media split: Primary high-res viewport with pinch-to-zoom and selectable thumbnail strip for macro detail shots (maker_mark, signature, damage_detail).

Detailed specification sheet: Grouped by Identification, Physical Metrics, Valuation/Provenance, and Condition Log.

Item Form & Image Ingestion (/item/new, /item/:id/edit):

HTML5 Camera Capture + local dropzone with client-side canvas downscaling and thumbnail generation.

Immediate tagging of image types (Overview, Maker's Mark, Signature).

Vision Assistant & Mark Reconciliation Modal:

Macro mark photo intake (camera or file).

Structured JSON vision inference requesting: maker, modelOrPattern, periodOrYear, description, confidenceScore.

Side-by-side reconciliation interface: shows detected traits vs. current form state with individual checkboxes to merge values into the item draft.

Settings & Backup Console (/settings):

Vision endpoint configuration: Base URL, Model Name, and connection test utility.

Storage metrics: Live gauge of IndexedDB quota and usage.

Portability: One-click export to standalone JSON or complete archive ZIP (JSON + image blobs). Import/restore facility.

4. Multimodal Vision Assistant Integration Contract
When triggering the identification endpoint, construct an OpenAI-compatible payload:

Endpoint: User-configured baseUrl + "/chat/completions"

Prompt Formulation:

JSON
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
5. Antigravity Phased Execution Plan
Execute the following stages in sequence. After each step, verify the build via terminal commands (npm run build or vite build):

Phase 1: Project Scaffolding & PWA Baseline
Initialize Vite project with React 19, TypeScript, Tailwind CSS, Lucide React, and dexie / dexie-react-hooks.

Configure vite-plugin-pwa in vite.config.ts with web manifest (icons, theme colors, standalone display) and Workbox offline caching policies.

Phase 2: Offline Persistence & Media Store
Implement src/db/index.ts initializing the Dexie database with indexes on id, category, maker, modelOrPattern, estimatedValue, updatedAt, and synced.

Create client-side image utility functions for aspect-ratio preservation, canvas downscaling to thumbnail size, and conversion between File, Blob, and base64.

Phase 3: Catalog Views & Fast Logging
Build the Catalog Dashboard with reactive filtering via useLiveQuery.

Implement the Item Entry/Edit view and the Item Detail view with the macro image strip and pan/zoom preview.

Phase 4: Vision Mark Identification Engine
Implement the API service client supporting streaming or JSON-mode multimodal chat completions.

Build the Vision Assistant modal with stage-by-stage loading indicators and field-level merge checkboxes.

Phase 5: Backup, Restore & Polish
Implement complete archive export (JSON + image blobs bundled via JSZip) and import parsing.

Verify full offline operation with service worker active in test build.