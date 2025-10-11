# Examples - Standalone Projection Loader

This directory contains practical examples demonstrating different usage patterns of the standalone projection loader.

## 📁 Available Examples

### 1. **browser-d3.html** - Browser Usage
Complete HTML example using D3 from CDN. Shows:
- Loading D3 from CDN
- Manual projection registration
- Rendering a composite map in the browser
- Interactive visualization

**Usage:**
```bash
# Open directly in browser or serve with a local server
npx serve examples
# Then open http://localhost:3000/browser-d3.html
```

### 2. **node-basic.js** - Node.js Basics
Fundamental Node.js example covering:
- ESM/CommonJS imports
- Individual vs bulk registration
- Loading composite projections
- Testing projected coordinates
- Registry utilities

**Usage:**
```bash
node examples/node-basic.js
```

### 3. **tree-shakeable.js** - Bundle Size Optimization
Demonstrates tree-shaking for production builds:
- Selective projection imports
- Minimal bundle size (94% reduction)
- Best practices for modern bundlers
- Bundle analysis tips

**Usage:**
```bash
node examples/tree-shakeable.js
```

### 4. **custom-projection.js** - Custom Projections
Advanced example showing custom projection implementations:
- Simple custom projection
- Full D3-compatible interface
- Proj4 wrapper pattern
- Custom defaults for standard projections

**Usage:**
```bash
node examples/custom-projection.js
```

## 🎯 Use Cases

| Example | Best For | Complexity |
|---------|----------|------------|
| `browser-d3.html` | Web visualization, learning | Beginner |
| `node-basic.js` | Server-side rendering, CLI tools | Beginner |
| `tree-shakeable.js` | Production builds, performance | Intermediate |
| `custom-projection.js` | Custom algorithms, Proj4 integration | Advanced |

## 🚀 Quick Start

1. **Install dependencies** (for Node.js examples):
```bash
npm install standalone-projection-loader d3-geo d3-geo-projection
```

2. **Run an example**:
```bash
# Node.js examples
node examples/node-basic.js
node examples/tree-shakeable.js
node examples/custom-projection.js

# Browser example
npx serve examples
# Open browser-d3.html
```

## 📚 Learning Path

1. Start with **node-basic.js** to understand the core concepts
2. Try **browser-d3.html** for visual feedback
3. Study **tree-shakeable.js** for production optimization
4. Explore **custom-projection.js** for advanced customization

## 💡 Key Concepts Demonstrated

### Plugin Architecture
All examples show how the loader uses a **plugin pattern** where you register only what you need:
```javascript
registerProjection('mercator', () => d3.geoMercator())
registerProjection('albers', () => d3.geoAlbers())
```

### Zero Dependencies
The loader itself has **no dependencies**. You bring your own projections:
- D3 projections (d3-geo, d3-geo-projection)
- Proj4 projections
- Custom algorithms
- Any other projection library

### Tree-Shaking Benefits
By registering projections manually, bundlers can eliminate unused code:
- **Before**: 100KB (all D3 projections)
- **After**: 6KB (only what you use)
- **Savings**: 94% 🎉

## 🔧 Adapting Examples

### For Your Project
1. Copy the example closest to your use case
2. Replace the configuration with your own
3. Register the projections you need
4. Adjust layout and positions

### For Different Frameworks

**React:**
```jsx
import * as d3 from 'd3-geo'
import { useEffect } from 'react'
import { loadCompositeProjection, registerProjections } from 'standalone-projection-loader'

function MapComponent({ config }) {
  useEffect(() => {
    registerProjections({
      mercator: () => d3.geoMercator(),
      albers: () => d3.geoAlbers(),
    })
  }, [])

  const projection = loadCompositeProjection(config, { width: 800, height: 600 })
  // ... render map
}
```

**Vue:**
```vue
<script setup>
import * as d3 from 'd3-geo'
import { loadCompositeProjection, registerProjections } from 'standalone-projection-loader'
import { onMounted } from 'vue'

const props = defineProps(['config'])

onMounted(() => {
  registerProjections({
    mercator: () => d3.geoMercator(),
    albers: () => d3.geoAlbers(),
  })
})

const projection = loadCompositeProjection(props.config, { width: 800, height: 600 })
</script>
```

**Svelte:**
```svelte
<script>
import { onMount } from 'svelte';
import { registerProjections, loadCompositeProjection } from 'standalone-projection-loader';
import * as d3 from 'd3-geo';

export let config;

onMount(() => {
  registerProjections({
    mercator: () => d3.geoMercator(),
    albers: () => d3.geoAlbers(),
  });
});

const projection = loadCompositeProjection(config, { width: 800, height: 600 });
</script>
```

## ❓ Common Questions

**Q: Do I need all these dependencies?**
A: No! Install only what you use:
- Core loader: Zero dependencies
- D3 projections: `npm install d3-geo d3-geo-projection`
- Custom projections: No additional dependencies

**Q: Can I use this with Observable Plot?**
A: Yes! See the main README for Observable Plot examples.

**Q: How do I add more projections?**
A: Just register them before loading:
```javascript
registerProjection('newProjection', () => createProjection())
```

**Q: Can I unregister projections?**
A: Yes, use `unregisterProjection(name)` or `clearProjections()`.

## 🔗 Additional Resources

- [Main README](../README.md) - Complete API documentation
- [Atlas composer](https://atlas-composer.example.com) - Visual configuration creator
- [D3 Projections](https://d3js.org/d3-geo) - Standard projection library
- [D3 Extended Projections](https://d3js.org/d3-geo-projection) - Additional projections

## 📝 Contributing Examples

Have a useful example? Contributions welcome!

1. Create a new `.js` or `.html` file
2. Add clear comments explaining the pattern
3. Include it in this README
4. Submit a pull request

Good candidates:
- TypeScript usage
- Observable Plot integration
- Express.js server-side rendering
- Canvas rendering
- WebGL integration
- Testing examples
