# Atlas Composer

> Interactive web application for creating custom cartographic visualizations using composite map projections

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Atlas Composer is a powerful tool for creating professional map visualizations of countries with geographically-scattered territories (like France, Portugal, USA). It provides an intuitive interface to configure composite projections, customize parameters, and export production-ready code.

![Vue.js](https://img.shields.io/badge/Vue.js-3-4FC08D?logo=vue.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![D3.js](https://img.shields.io/badge/D3.js-7-F9A03C?logo=d3.js&logoColor=white)

## ✨ Features

- 🗺️ **Multi-Atlas Support** - Pre-configured atlases for France, Portugal, Spain, Europe, USA, and World
- 🎯 **20+ Map Projections** - Comprehensive projection library with smart recommendations
- 🔧 **Interactive Controls** - Real-time parameter adjustment with visual feedback
- 📐 **Multiple View Modes** - Composite, split, and unified map layouts
- 📦 **Code Export** - Generate D3.js and Observable Plot code for your configurations
- 🌍 **Territory Management** - Position and transform individual territories with precision
- 🎨 **Modern UI** - Responsive design with theme support and internationalization (EN/FR)
- ⚡ **Zero Dependencies Loader** - Lightweight projection loader package for production use

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 8+

### Installation

```bash
# Clone the repository
git clone https://github.com/ShallowRed/atlas-composer.git
cd atlas-composer

# Install dependencies
pnpm install

# Prepare geodata (downloads and processes Natural Earth data)
pnpm run geodata:prepare

# Start development server
pnpm run dev
```

The application will be available at `http://localhost:5173`

## 📖 Usage

### Creating a Map Visualization

1. **Select an Atlas** - Choose from pre-configured atlases (France, Portugal, etc.)
2. **Choose View Mode**:
   - **Composite (Custom)** - Create custom composite projections with full parameter control
   - **Composite (Built-in)** - Use optimized built-in composite projections
   - **Split** - Display territories separately with individual projections
   - **Unified** - Show all territories in a single projection
3. **Configure Projection** - Select projection type and adjust parameters (rotation, center, scale, etc.)
4. **Position Territories** - Fine-tune individual territory placement and transformations
5. **Export** - Generate production-ready D3.js or Observable Plot code

### Using Exported Configurations

Atlas Composer exports configurations compatible with the `@atlas-composer/projection-loader` package:

```bash
npm install @atlas-composer/projection-loader d3-geo d3-geo-projection
```

```typescript
import { loadCompositeProjection, registerProjection } from '@atlas-composer/projection-loader'
import * as d3 from 'd3-geo'
import config from './exported-config.json'

// Register projections used in your configuration
registerProjection('mercator', () => d3.geoMercator())
registerProjection('conic-conformal', () => d3.geoConicConformal())

// Load the composite projection
const projection = loadCompositeProjection(config, {
  width: 800,
  height: 600
})

// Use with D3
const path = d3.geoPath(projection)
svg.selectAll('path')
  .data(features)
  .enter()
  .append('path')
  .attr('d', path)
```

See [`packages/projection-loader/README.md`](packages/projection-loader/README.md) for detailed documentation.

## 🏗️ Project Structure

```
atlas-composer/
├── src/                          # Main application source
│   ├── components/               # Vue components (16 total)
│   │   ├── MapRenderer.vue       # D3 rendering component
│   │   ├── TerritoryControls.vue # Territory adjustment controls
│   │   ├── configuration/        # Configuration UI components
│   │   └── ui/                   # Reusable UI primitives
│   ├── composables/              # Reusable Vue logic (16 composables)
│   ├── stores/                   # Pinia state management
│   │   ├── config.ts             # Configuration state
│   │   ├── geoData.ts            # Geographic data management
│   │   ├── parameters.ts         # Parameter registry and validation
│   │   └── ui.ts                 # UI state
│   ├── core/                     # Core business logic
│   │   ├── atlases/              # Atlas system
│   │   ├── projections/          # Projection definitions (20+)
│   │   ├── parameters/           # Parameter registry
│   │   └── presets/              # Preset types and validation
│   ├── services/                 # Service layer
│   │   ├── atlas/                # Atlas management
│   │   ├── projection/           # Projection creation
│   │   ├── rendering/            # Cartographer service
│   │   ├── data/                 # Data loading
│   │   └── export/               # Code generation
│   └── views/                    # Page components
├── configs/                      # Atlas configurations
│   ├── atlases/                  # Atlas definitions (JSON)
│   │   ├── france.json
│   │   ├── portugal.json
│   │   └── ...
│   ├── presets/                  # Pre-configured presets
│   └── schemas/                  # JSON schemas
├── packages/
│   └── projection-loader/        # Standalone loader package
├── scripts/                      # Build and utilities
│   ├── prepare-geodata.ts        # Natural Earth data processing
│   └── validate-configs.ts       # Configuration validation
└── public/data/                  # Processed geodata (generated)
```

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm run dev              # Start dev server
pnpm run dev:debug        # Start with debug logging
pnpm run build            # Build for production
pnpm run preview          # Preview production build

# Code Quality
pnpm run typecheck        # Type check all packages
pnpm run lint             # Lint code
pnpm run lint:fix         # Fix linting issues
pnpm run test             # Run tests
pnpm run test:watch       # Run tests in watch mode
pnpm run test:coverage    # Generate coverage report

# Data Management
pnpm run geodata:prepare  # Download and process Natural Earth data
pnpm run geodata:validate # Validate atlas configurations
pnpm run geodata:analyze  # Analyze country data
pnpm run geodata:lookup   # Lookup country information

# Package Management
pnpm run build:loader     # Build projection loader package
```

### Technology Stack

- **Frontend**: Vue.js 3 + TypeScript + Vite
- **Mapping**: D3.js + Observable Plot
- **State Management**: Pinia
- **Styling**: Tailwind CSS 4 + DaisyUI 5
- **Data Source**: Natural Earth GeoJSON
- **Testing**: Vitest + Vue Test Utils
- **Build**: Vite + tsup (for packages)

### Adding a New Atlas

1. Create atlas configuration in `configs/atlases/your-atlas.json`
2. Follow the JSON schema in `configs/schemas/atlas.schema.json`
3. Add GeoJSON data sources to `public/data/`
4. Register in `configs/atlas-registry.json`
5. Validate: `pnpm run geodata:validate`

See `.github/docs/add-new-atlas.md` for detailed instructions.

## 📦 Packages

### @atlas-composer/projection-loader

Standalone, zero-dependency loader for composite map projections.

**Features:**
- 🎯 Zero Dependencies - Bring your own D3.js
- 📦 Tree-Shakeable - Only bundle what you use (~6KB)
- 🔌 Plugin Architecture - Register projections on-demand
- 🌐 Framework Agnostic - Works with any D3-based setup
- 📘 Full TypeScript Support

See [`packages/projection-loader/README.md`](packages/projection-loader/README.md) for documentation.

## 🧪 Testing

The project includes comprehensive test coverage:

- **Unit Tests**: 175+ tests across components and services
- **Test Framework**: Vitest with Vue Test Utils
- **Coverage**: Stores, composables, services, and core logic

```bash
pnpm run test              # Run all tests
pnpm run test:watch        # Watch mode
pnpm run test:ui           # Visual test UI
pnpm run test:coverage     # Generate coverage report
```

## 🏛️ Architecture

Atlas Composer follows a layered architecture with clear domain boundaries:

### Core Domains

1. **Configuration Domain** (`core/atlases/`) - Atlas definitions and metadata
2. **Projection Domain** (`core/projections/`) - 20+ projection definitions with parameter management
3. **Parameter Domain** (`core/parameters/`) - Unified parameter registry with validation
4. **Preset Domain** (`core/presets/`) - Saved configuration types and validation
5. **Service Domain** (`services/`) - Business logic and rendering coordination
6. **UI Domain** (`components/`, `composables/`) - Vue components and reusable logic
7. **State Domain** (`stores/`) - Pinia stores for reactive state management

### Data Flow

```
User Interaction
    ↓
Vue Component
    ↓
Pinia Store (state update)
    ↓
Service Layer (business logic)
    ↓
D3.js / Observable Plot (rendering)
    ↓
DOM Update
```

See `.github/docs/architecture.md` for comprehensive architecture documentation.

## 🌍 Supported Atlases

- **France** - Metropolitan France + overseas territories (Guadeloupe, Martinique, Réunion, etc.)
- **Portugal** - Mainland + Madeira + Azores
- **Spain** - Mainland + Canary Islands + Balearic Islands
- **Europe** - European countries and regions
- **USA** - Continental US + Alaska + Hawaii
- **World** - Global view with all countries

## 🎨 UI Features

- **Dark/Light Theme** - System-aware theme switching
- **Internationalization** - English and French translations
- **Responsive Design** - Mobile-friendly interface
- **Real-time Preview** - Instant visual feedback for parameter changes
- **Export Options** - Download as D3.js or Observable Plot code
- **Parameter Validation** - Real-time validation with helpful error messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright © 2025 Lucas Poulain

## 🙏 Acknowledgments

- **Natural Earth** - Free vector and raster map data
- **D3.js** - Powerful visualization library
- **Observable Plot** - Declarative plotting library
- **Vue.js** - Progressive JavaScript framework

## 🔗 Links

- [Documentation](.github/docs/) - Detailed architecture and development docs
- [Projection Loader Package](packages/projection-loader/) - Standalone loader package
- [Natural Earth Data](https://www.naturalearthdata.com/) - Data source

---

**Built with ❤️ using Vue.js, D3.js, and TypeScript**
