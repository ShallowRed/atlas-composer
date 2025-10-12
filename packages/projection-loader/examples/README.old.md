# Projection Loader Examples

This directory contains examples demonstrating how to use the `@atlas-composer/projection-loader` package with code generated from Atlas composer.

## Examples

### france-example.js

Demonstrates using a generated composite projection for France with overseas territories.

**Key Concepts:**
- Importing D3 projection functions
- Registering projections with the loader
- Loading composite projection from configuration
- Using the projection with D3's geoPath

**Running the example:**

```bash
# From the projection-loader directory
node examples/france-example.js
```

**Expected Output:**
```
Projection created successfully!
Projection center: [2.5, 46.5]
Projection scale: 2700
Paris projected: [400, 300]
```

## Usage Pattern

All examples follow the same pattern that Atlas composer generates:

1. **Import D3 projections** - Only the projections you actually use
2. **Import loader functions** - `registerProjection` and `loadCompositeProjection`
3. **Register projections** - Tell the loader which projection factories to use
4. **Load configuration** - Pass the exported JSON configuration to the loader
5. **Use projection** - Use with D3's geoPath or Observable Plot

## Creating Your Own

To create your own projection:

1. Open [Atlas composer](https://shallowred.github.io/atlas-composer/)
2. Configure your custom composite projection
3. Export as code (JavaScript, TypeScript, or Observable Plot)
4. Copy the generated code into your project
5. Install dependencies:
   ```bash
   npm install @atlas-composer/projection-loader d3-geo d3-geo-projection
   ```
6. Use the generated projection function

## Tree-Shaking

The projection-loader uses a plugin architecture, so your bundle only includes:
- The loader core (~6KB)
- The D3 projections you register
- Your configuration data

Result: **94% smaller** than including all D3 projections!

## Framework Integration

The generated code works with any JavaScript framework:

- **Vanilla JS** - Use directly with D3
- **React** - Use in useEffect hooks
- **Vue** - Use in onMounted lifecycle
- **Svelte** - Use in onMount
- **Observable** - Use with Plot.plot()

See the main [README](../README.md) for framework-specific examples.

## Notes

- Examples use ESM imports (Node.js 14+ required)
- For older Node versions, transpile with your build tool
- For browser usage, use a bundler (Vite, Webpack, Rollup, etc.)
