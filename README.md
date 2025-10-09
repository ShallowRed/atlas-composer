# Atlas Composer

A web application for creating custom cartographic visualizations of countries with geographically-scattered territories using composite projections. Design and test different map projections interactively, par## 📐 Projection System

Atlas Composer includes a comprehensive projection ## 🗺️ Atlas Configuration System

> **📖 [Full Atlas Documentation](./docs/ATLASES.md)** - Complete guide to atlas configuration, API reference, and adding new atlases

### Configuration Structure

Each atlas is defined in a JSON file following this structure:m with intelligent recommendations and context-aware filtering.

> **📖 [Full Projection Documentation](./docs/PROJECTIONS.md)** - Complete API reference, projection catalog, and usage guide

### Features

- **20+ Projections**: From standard D3 projections to composite projections
- **Smart Recommendations**: Automatic scoring based on atlas, view mode, and geographic suitability
- **Type Safety**: Compile-time validation with TypeScript
- **Metadata-Rich**: Each projection includes capabilities, suitability, and usage recommendations
- **Extensible**: Easy to add new projections with definition filesseful for countries with overseas territories (France, Portugal, Spain, etc.).

## 🎯 Purpose

**Atlas Composer** helps you create accurate map visualizations that:
- Display mainland and overseas territories side-by-side
- Preserve true size relationships between territories
- Use optimized geographic projections for each territory
- Allow interactive customization of territory positioning

## ✨ Features

- 🗺️ **Interactive Atlas Composer** - Adjust territory positions and scales in real-time
- 📐 **Smart Projection System** - 20+ projections with intelligent recommendations
- 🎯 **Context-Aware Selection** - Automatic filtering based on atlas and view mode
- 🎨 **Visual Territory Controls** - Sliders for fine-tuning X/Y position and scale
- 🌍 **Multiple Countries** - Pre-configured atlases for France, Portugal, Spain, and EU
- 🔧 **Natural Earth Integration** - Automated geodata preparation from Natural Earth datasets
- 📊 **Data Validation** - Scripts to ensure config/data consistency
- 🧪 **Comprehensive Testing** - 79 unit & integration tests with 100% pass rate

## 🚀 Quick Start

### Prerequisites

- Node.js 22.12+ (recommended)
- pnpm (package manager)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd atlas-composer

# Install dependencies
pnpm install

# Prepare geographic data (optional if already generated)
pnpm geodata:prepare france

# Start development server
pnpm dev
```

The application will be available at [http://localhost:5173](http://localhost:5173)

### Available Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm preview          # Preview production build
pnpm typecheck        # Run TypeScript type checking
pnpm lint             # Lint source code

# Geodata Scripts
pnpm geodata:prepare <atlas>   # Generate TopoJSON data from Natural Earth
pnpm geodata:validate <atlas>  # Validate config/data consistency
pnpm geodata:lookup <country>  # Look up Natural Earth country data
pnpm geodata:analyze <id>      # Analyze country polygon structure
```

## 🛠️ Technology Stack

- **[Vite](https://vitejs.dev/)** - Build tool and dev server
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe programming
- **[Vue.js 3](https://vuejs.org/)** - Reactive UI framework
- **[Pinia](https://pinia.vuejs.org/)** - State management
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS
- **[DaisyUI](https://daisyui.com/)** - UI components
- **[Observable Plot](https://observablehq.com/plot/)** - Data visualization
- **[D3.js](https://d3js.org/)** - Geographic data and projections
- **[d3-composite-projections](https://github.com/rveciana/d3-composite-projections)** - Pre-built composite projections
- **[TopoJSON](https://github.com/topojson/topojson)** - Optimized geographic data format

## 📁 Project Architecture

Atlas Composer follows a layered architecture with clear separation of concerns:

```
atlas-composer/
├── configs/                      # �� Atlas Configuration (JSON)
│   ├── schema.json              # JSON Schema for validation
│   ├── france.json              # France atlas definition
│   ├── portugal.json            # Portugal atlas definition
│   ├── spain.json               # Spain atlas definition
│   └── eu.json                  # EU atlas definition
│
├── scripts/                      # 🔧 Build & Data Scripts
│   ├── prepare-geodata.js       # Generate TopoJSON from Natural Earth
│   ├── validate-configs.js      # Validate config/data consistency
│   ├── utils/                   # Shared utilities
│   │   ├── cli-args.js         # CLI argument parser
│   │   ├── config-loader.js    # Atlas config loader
│   │   ├── logger.js           # Colored console output
│   │   └── ne-data.js          # Natural Earth data fetcher
│   └── dev/                     # Developer utilities
│       ├── lookup-country.js   # Look up any country in Natural Earth
│       └── analyze-country.js  # Analyze country polygon structure
│
└── src/                          # 🎨 Vue.js Application
    ├── core/                     # 🏗️ Domain Layer (Core Business Logic)
    │   ├── atlases/             # Atlas domain definitions
    │   │   ├── loader.ts        # JSON-to-config transformation
    │   │   ├── registry.ts      # Auto-discovery atlas registry
    │   │   ├── utils.ts         # Territory helper functions
    │   │   └── constants.ts     # Atlas-related constants
    │   │
    │   └── projections/         # Projection domain definitions
    │       ├── types.ts         # Type definitions
    │       ├── registry.ts      # Projection registry (singleton)
    │       ├── factory.ts       # Projection factory
    │       ├── recommender.ts   # Smart recommendation engine
    │       ├── definitions/     # Projection definitions by category
    │       │   ├── composite.ts # Composite projections
    │       │   ├── conic.ts     # Conic projections
    │       │   ├── azimuthal.ts # Azimuthal projections
    │       │   ├── cylindrical.ts # Cylindrical projections
    │       │   ├── world.ts     # World projections
    │       │   └── artistic.ts  # Artistic projections
    │       └── __tests__/       # Test suite (170 tests passing)
    │
    ├── services/                 # 🔧 Application Services
    │   ├── atlas-service.ts     # Atlas operations facade
    │   ├── cartographer-service.ts # Map rendering engine
    │   ├── cartographer-factory.ts # Cartographer factory
    │   ├── geo-data-service.ts  # TopoJSON loading
    │   ├── projection-service.ts # Legacy projection service
    │   └── composite-projection.ts # Custom composite builder
    │
    ├── stores/                   # 💾 State Management (Pinia)
    │   ├── config.ts            # UI configuration store
    │   └── geoData.ts           # Geographic data store
    │
    ├── components/               # 🎨 Vue Components
    │   ├── MapRenderer.vue      # Main map rendering component
    │   ├── TerritoryControls.vue # Territory adjustment controls
    │   └── ui/                  # Reusable UI components
    │       ├── AppHeader.vue
    │       ├── AppFooter.vue
    │       ├── ThemeSelector.vue
    │       └── ...
    │
    ├── views/                    # 📄 Page Views
    │   ├── MapView.vue          # Main map view
    │   └── AboutView.vue        # About page
    │
    ├── router/                   # 🧭 Vue Router
    │   └── index.ts             # Route definitions
    │
    ├── types/                    # 📝 TypeScript Definitions
    │   ├── territory.d.ts       # Territory and atlas types
    │   └── d3-geo-projection.d.ts # D3 projection type augmentations
    │
    ├── utils/                    # 🛠️ Utility Functions
    │   └── color-utils.ts       # Color manipulation utilities
    │
    ├── public/                   # 📦 Static Assets
    │   └── data/                # Generated TopoJSON files
    │       ├── france-territories-50m.json
    │       ├── france-metadata-50m.json
    │       ├── portugal-territories-50m.json
    │       └── ...
    │
    ├── App.vue                   # Root component
    ├── main.ts                   # Application entry point
    └── styles.css               # Global styles
```

### Architecture Principles

#### 1. **Domain-Driven Design**
   - **Core Domain Layer** (`core/`): Contains pure domain logic for atlases and projections
   - **Application Layer** (`services/`, `stores/`): Coordinates domain objects and application concerns
   - **Presentation Layer** (`components/`, `views/`): UI and user interaction
   - **Infrastructure** (`scripts/`): Build tools and data generation

#### 2. **Atlas-Driven Configuration**
   - Each atlas (France, Portugal, EU) is defined in a JSON config file
   - Configs specify territories, projections, and display modes
   - **Auto-discovery**: New atlases are automatically loaded from `configs/` folder
   - **Schema validation**: JSON Schema ensures config correctness
   - Data is generated from Natural Earth based on config definitions

#### 3. **Registry Pattern for Domain Definitions**
   - **AtlasRegistry**: Auto-discovers and provides access to all atlas configurations
   - **ProjectionRegistry**: Centralizes all projection definitions with intelligent recommendations
   - Both registries use singleton pattern for consistent access
   - Lazy loading and caching for performance optimization

#### 4. **Multi-Pattern Atlas Support**
   - **Traditional Pattern**: 1 mainland + N overseas territories (France, Portugal)
   - **Multi-Mainland Pattern**: N equal member-states + optional overseas (EU)
   - Type-safe discriminated unions ensure correct handling of both patterns
   - Seamless support for different territorial structures

#### 5. **Service Layer Pattern**
   - **AtlasService**: Facade for atlas-specific operations
   - **GeoDataService**: Handles TopoJSON loading and geographic data
   - **ProjectionFactory**: Creates D3 projection instances with parameters
   - **CartographerFactory**: Creates rendering engines for specific atlases
   - **CompositeProjection**: Custom composite projection builder

#### 6. **Type Safety Throughout**
   - Complete TypeScript coverage across all layers
   - Strict typing for atlas configs, territories, and projections
   - JSON Schema validation for config files
   - Compile-time validation of projection IDs and parameters
   - Discriminated unions for pattern matching

#### 7. **Intelligent Projection System**
   - Context-aware projection filtering based on atlas and view mode
   - Smart scoring algorithm considering suitability, capabilities, and usage
   - Atlas-specific projection preferences (recommended, default, prohibited)
   - Automatic fallback to best alternatives
   - 20+ projections from standard to composite

### Domain Documentation

For detailed information about the core domain systems:

- **[Atlas System](./docs/ATLASES.md)** - Complete guide to atlas configuration, territory management, and multi-pattern support
- **[Projection System](./docs/PROJECTIONS.md)** - Comprehensive projection documentation with API reference and recommendations

## � Projection System

Atlas Composer includes a comprehensive projection system with intelligent recommendations and context-aware filtering.

### Features

- **20+ Projections**: From standard D3 projections to composite projections
- **Smart Recommendations**: Automatic scoring based on atlas, view mode, and geographic suitability
- **Type Safety**: Compile-time validation with TypeScript
- **Metadata-Rich**: Each projection includes capabilities, suitability, and usage recommendations
- **Extensible**: Easy to add new projections with definition files

### Projection Categories

1. **Composite Projections** (Recommended)
   - `conic-conformal-france` - Optimized for France with overseas territories
   - `conic-conformal-portugal` - Optimized for Portugal with Azores & Madeira
   - `conic-conformal-europe` - Optimized for European Union

2. **Conic Projections** (Mid-latitudes)
   - `conic-conformal` - Lambert Conformal Conic
   - `albers` - Albers Equal Area

3. **Azimuthal Projections** (Polar & centered views)
   - `azimuthal-equal-area` - Equal area
   - `azimuthal-equidistant` - Preserves distances from center
   - `stereographic` - Conformal polar view

4. **Cylindrical Projections** (World maps)
   - `mercator` - Standard web mapping
   - `equirectangular` - Simple rectangular

5. **World Projections** (Global context)
   - `natural-earth` - Visually appealing compromise
   - `robinson` - National Geographic standard

6. **Artistic Projections** (Historical/aesthetic)
   - `armadillo`, `polyhedral`, `loximuthal`

### Usage Example

```typescript
import { ProjectionFactory } from '@/projections/factory'
import { ProjectionRegistry } from '@/projections/registry'

// Get recommended projections for France in split view
const registry = ProjectionRegistry.getInstance()
const recommendations = registry.recommend({
  atlasId: 'france',
  viewMode: 'split',
  limit: 5
})

// Create a projection instance
const factory = ProjectionFactory.getInstance()
const projection = factory.create({
  projection: recommendations[0].definition,
  center: [2.5, 46.5],
  scale: 2500
})
```

For detailed documentation, see [docs/PROJECTIONS.md](docs/PROJECTIONS.md).

## �📊 Atlas Configuration System

### Configuration Structure

Each atlas is defined in a JSON file following this structure:

```json
{
  "name": "France",
  "description": "France with overseas territories",
  "defaultResolution": "50m",
  "territories": {
    "250": {
      "name": "France métropolitaine",
      "code": "FR-MET",
      "iso": "FRA",
      "mainlandPolygon": 1,
      "region": "Métropole"
    },
    "250-gf": {
      "name": "Guyane",
      "code": "FR-GF",
      "iso": "GUF",
      "extractFrom": 250,
      "polygonIndices": [9],
      "region": "Amérique"
    }
  },
  "modes": {
    "all": {
      "label": "All territories",
      "territories": ["250", "250-gf", "250-gp", "250-mq"]
    }
  },
  "projections": {
    "composite": {
      "label": "Composite (Conic Conformal)",
      "type": "d3-composite",
      "projection": "conicConformalFrance"
    }
  }
}
```

### Creating a New Atlas

1. **Analyze the country** to understand its polygon structure:
   ```bash
   pnpm geodata:analyze 620  # Portugal's Natural Earth ID
   ```

2. **Create the config file** in `configs/`:
   ```bash
   cp configs/france.json configs/portugal.json
   # Edit portugal.json with territory definitions
   ```

3. **Generate the data**:
   ```bash
   pnpm geodata:prepare portugal
   ```

4. **Validate consistency**:
   ```bash
   pnpm geodata:validate portugal
   ```

5. **Create the frontend config** in `src/core/atlases/`:
   ```typescript
   // src/core/atlases/portugal.config.ts
   export default {
     defaultProjection: 'mercator',
     defaultMode: 'all',
     defaultResolution: '50m'
   }
   ```

### Developer Utilities

#### Lookup Country Data
Look up any country in Natural Earth by name or ID:
```bash
pnpm geodata:lookup france
pnpm geodata:lookup portugal
pnpm geodata:lookup 620  # By Natural Earth ID
```

#### Analyze Country Structure
Get detailed polygon analysis and configuration suggestions:
```bash
pnpm geodata:analyze 250   # France
pnpm geodata:analyze 620   # Portugal
```

Output includes:
- Polygon breakdown with bounds and areas
- Geographic region classification
- Suggested territory groupings
- Ready-to-use configuration snippets

## 🗺️ How It Works

### Data Flow

1. **Configuration Discovery & Loading** (Build Time + Runtime)
   - **Auto-discovery**: Vite's `import.meta.glob` automatically finds all JSON configs in `configs/`
   - **Loader transformation**: `core/atlases/loader` transforms JSON into typed application configs
   - **Registry initialization**: `core/atlases/registry` builds the atlas registry on module load
   - **Pattern detection**: Loader automatically detects traditional vs multi-mainland patterns

2. **Data Preparation** (Build Time)
   - Natural Earth data is downloaded and filtered using scripts
   - TopoJSON files are generated for each atlas based on JSON config
   - Metadata is extracted (names, codes, areas, bounds)
   - Validation ensures config/data consistency

3. **Runtime Initialization**
   - User selects an atlas from auto-discovered options
   - **AtlasRegistry** provides immediate access to configuration (no async loading)
   - **ProjectionRegistry** recommends suitable projections based on atlas and view mode
   - TopoJSON geodata is loaded dynamically via **GeoDataService**

4. **Rendering Pipeline**
   - **CartographerFactory** creates a cartographer for the selected atlas
   - **ProjectionFactory** creates D3 projection instances with atlas-specific parameters
   - **Cartographer** orchestrates projection application and territory rendering
   - Observable Plot or D3 renders the final visualization

### Key Concepts

#### Atlas
A complete cartographic configuration for a country or region (e.g., "France", "EU"):
- **Traditional pattern**: 1 mainland + N overseas territories (France, Portugal)
- **Multi-mainland pattern**: N equal member-states + optional overseas (EU)
- Auto-discovered from `configs/` folder - no code changes needed to add new atlases

#### Territory
A geographic entity with its own geometry and rendering configuration:
- Can be a complete country (Natural Earth ID like `250`)
- Can be extracted polygons from a country (e.g., `250-GP` for Guadeloupe)
- Includes projection preferences, rendering parameters, and positioning

#### Territory Role
Defines the type and function of a territory:
- **`mainland`**: Principal territory (traditional pattern)
- **`overseas`**: Overseas territories distant from mainland
- **`embedded`**: Territories embedded within another (e.g., enclaves)
- **`member-state`**: Equal member states (multi-mainland pattern, e.g., EU countries)

#### View Mode
Display mode determining how territories are rendered:
- **`split`**: Separate maps for each territory
- **`composite-existing`**: Pre-built composite projection (e.g., `conicConformalFrance`)
- **`composite-custom`**: Custom composite with adjustable territory positions
- **`unified`**: Single projection for all territories

#### Territory Mode
Pre-defined territory selections (e.g., "All territories", "Caribbean only"):
- Configurable per atlas in JSON
- Used for filtering which territories to display
- Enables region-based visualization

## 🎨 UI Features

### Map View Modes

1. **Unified Composite View**
   - All territories displayed together
   - Uses composite projection or custom positioning
   - Interactive controls for adjusting territory placement

2. **Individual Territory View**
   - Each territory in its own optimized projection
   - Grid layout with responsive cards
   - Separate maps for mainland and overseas territories

3. **Projection Testing**
   - Switch between different projection types
   - Compare D3 projections, composite projections, and custom projections
   - Real-time preview of projection changes

### Interactive Controls

- **Territory Selection**: Choose which territories to display
- **Position Adjustment**: X/Y sliders for fine-tuning territory placement
- **Scale Control**: Adjust relative size of territories
- **Projection Selector**: Switch between available projections
- **Theme Toggle**: Light/dark mode support

## 🔧 Development Workflow

### Adding a New Country Atlas

1. **Research**: Find the Natural Earth country ID
2. **Analyze**: Run `pnpm geodata:analyze <id>` to understand polygon structure
3. **Configure**: Create JSON config in `configs/`
4. **Generate**: Run `pnpm geodata:prepare <atlas>` to create TopoJSON
5. **Validate**: Run `pnpm geodata:validate <atlas>` to ensure consistency
6. **Implement**: Create frontend config in `src/core/atlases/`
7. **Test**: Load in the application and verify rendering

### Modifying Projections

1. **Built-in D3**: Modify `ProjectionService` in `src/services/projections.ts`
2. **Composite**: Use existing d3-composite-projections or create custom
3. **Custom**: Implement `CompositeProjection` for full control

### Debugging

- Check browser console for errors
- Use `pnpm geodata:validate` to verify data consistency
- Enable debug mode in stores for verbose logging
- Use Vue DevTools for inspecting component state

## 📝 Code Style

- **Naming Conventions**:
  - Files: `kebab-case.ts` (e.g., `atlas.ts`, `geo-data.ts`)
  - Classes: `PascalCase` (e.g., `AtlasService`, `Cartographer`)
  - Functions/Variables: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`

- **Import Sorting**: Automatically sorted by ESLint (@antfu/eslint-config)

- **TypeScript**: Strict mode enabled, full type coverage expected

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Observable](https://observablehq.com/) for visualization libraries
- [Mike Bostock](https://bost.ocks.org/mike/) for D3.js
- [Natural Earth](https://www.naturalearthdata.com/) for geographic data
- [Roger Veciana](https://github.com/rveciana) for d3-composite-projections
- The web cartography community

---

*Built with ❤️ for better cartographic visualization*
