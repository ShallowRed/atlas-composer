# ProjectionInfo Component Integration Suggestions

## Overview
`ProjectionInfo.vue` is a well-crafted, unused component that displays comprehensive projection information including:
- Projection name and category with icons
- Description
- Capability badges (area-preserving, angle-preserving, interrupted)
- Properties (preserves/distorts)
- View mode compatibility
- Metadata (creator, year)

## Current State
- ✅ **Component**: Fully implemented with compact and full modes
- ✅ **Styling**: DaisyUI badges and styling
- ✅ **i18n**: Properly internationalized
- ✅ **Icons**: Uses projection-icons utility
- ❌ **Usage**: Not imported or used anywhere

## Integration Opportunities

### 1. **Enhanced Projection Selector (Recommended)**

Add an info button next to each projection option that shows a modal/dialog with detailed projection information.

**Implementation**:

```vue
<!-- In ProjectionSelector.vue -->
<script setup lang="ts">
import ProjectionInfo from '@/components/ui/ProjectionInfo.vue'

const selectedProjectionForInfo = ref<ProjectionDefinition | null>(null)

function showProjectionInfo(projectionId: string) {
  const projection = projectionRegistry.get(projectionId)
  if (projection) {
    selectedProjectionForInfo.value = projection
  }
}
</script>

<template>
  <!-- Add info buttons to each option -->
  <div class="flex items-center gap-2">
    <select v-model="localValue" class="select flex-1">
      <!-- existing options -->
    </select>
    <button
      v-if="modelValue"
      type="button"
      class="btn btn-square btn-sm"
      @click="showProjectionInfo(modelValue)"
    >
      <i class="ri-information-line" />
    </button>
  </div>

  <!-- Modal with ProjectionInfo -->
  <dialog ref="infoModal" class="modal">
    <div class="modal-box">
      <ProjectionInfo
        v-if="selectedProjectionForInfo"
        :projection="selectedProjectionForInfo"
        :show-metadata="true"
      />
      <div class="modal-action">
        <button class="btn" @click="infoModal?.close()">
          {{ t('common.close') }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>
```

**Benefits**:
- Users can learn about projections before selecting them
- Non-intrusive (optional button)
- Complements existing recommendation system

---

### 2. **Projection Comparison View**

Create a comparison page where users can compare multiple projections side by side.

**Location**: `src/views/ProjectionComparisonView.vue`

**Implementation**:

```vue
<script setup lang="ts">
import ProjectionInfo from '@/components/ui/ProjectionInfo.vue'
import { projectionRegistry } from '@/core/projections/registry'

const selectedProjections = ref<ProjectionDefinition[]>([])

function addProjection(projectionId: string) {
  const projection = projectionRegistry.get(projectionId)
  if (projection && !selectedProjections.value.includes(projection)) {
    selectedProjections.value.push(projection)
  }
}
</script>

<template>
  <div class="projection-comparison">
    <h2>{{ t('projections.compare.title') }}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="projection in selectedProjections"
        :key="projection.id"
        class="card card-border"
      >
        <div class="card-body">
          <ProjectionInfo
            :projection="projection"
            :show-metadata="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>
```

**Benefits**:
- Educational tool for learning about different projections
- Helps users make informed decisions
- Could be linked from About page

---

### 3. **Tooltip on Hover (Lightweight)**

Add a tooltip that shows compact projection info when hovering over projection options.

**Implementation**:

```vue
<!-- In ProjectionSelector.vue -->
<script setup lang="ts">
import ProjectionInfo from '@/components/ui/ProjectionInfo.vue'

const hoveredProjection = ref<ProjectionDefinition | null>(null)
const hoveredProjectionId = ref<string | null>(null)

function showTooltip(projectionId: string) {
  hoveredProjectionId.value = projectionId
  hoveredProjection.value = projectionRegistry.get(projectionId) || null
}

function hideTooltip() {
  hoveredProjectionId.value = null
  hoveredProjection.value = null
}
</script>

<template>
  <div class="relative">
    <select
      v-model="localValue"
      class="select"
      @mouseover="(e) => {
        const target = e.target as HTMLSelectElement
        if (target.value) showTooltip(target.value)
      }"
      @mouseout="hideTooltip"
    >
      <!-- options -->
    </select>

    <!-- Floating tooltip -->
    <Transition name="fade">
      <div
        v-if="hoveredProjection"
        class="absolute z-50 top-full mt-2 left-0 right-0 card card-border bg-base-100 shadow-lg"
      >
        <div class="card-body">
          <ProjectionInfo
            :projection="hoveredProjection"
            compact
          />
        </div>
      </div>
    </Transition>
  </div>
</template>
```

**Benefits**:
- Instant information without clicking
- Uses compact mode for quick reference
- Non-intrusive

---

### 4. **Selected Projection Info Panel**

Show detailed info about the currently selected projection below the selector.

**Implementation**:

```vue
<!-- In MapView.vue or ProjectionSelector.vue -->
<script setup lang="ts">
import ProjectionInfo from '@/components/ui/ProjectionInfo.vue'

const selectedProjectionInfo = computed(() => {
  if (!configStore.selectedProjection) return null
  return projectionRegistry.get(configStore.selectedProjection)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Existing projection selector -->
    <ProjectionSelector ... />

    <!-- Info panel for selected projection -->
    <Transition name="slide-fade">
      <div
        v-if="selectedProjectionInfo"
        class="card card-border bg-base-200"
      >
        <div class="card-body">
          <ProjectionInfo
            :projection="selectedProjectionInfo"
            :show-metadata="true"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>
```

**Benefits**:
- Always visible information
- Educational for users
- No extra clicks needed

---

### 5. **About Page Enhancement**

Add a projections gallery/reference page in the About view.

**Location**: `src/views/AboutView.vue`

**Implementation**:

```vue
<script setup lang="ts">
import ProjectionInfo from '@/components/ui/ProjectionInfo.vue'
import { projectionRegistry } from '@/core/projections/registry'

const allProjections = computed(() => {
  return Array.from(projectionRegistry.getAll().values())
    .sort((a, b) => a.name.localeCompare(b.name))
})

const projectionsByCategory = computed(() => {
  const grouped = new Map()
  allProjections.value.forEach(proj => {
    if (!grouped.has(proj.category)) {
      grouped.set(proj.category, [])
    }
    grouped.get(proj.category).push(proj)
  })
  return grouped
})
</script>

<template>
  <div class="about-projections">
    <h2>{{ t('projections.reference.title') }}</h2>
    <p>{{ t('projections.reference.description') }}</p>

    <div
      v-for="[category, projections] in projectionsByCategory"
      :key="category"
      class="mb-8"
    >
      <h3 class="text-xl font-semibold mb-4">
        {{ t(`projections.categories.${category}`) }}
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="projection in projections"
          :key="projection.id"
          class="card card-border"
        >
          <div class="card-body">
            <ProjectionInfo
              :projection="projection"
              :show-metadata="true"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

**Benefits**:
- Comprehensive projection reference
- Educational resource
- Showcases all available projections

---

## Recommended Implementation Priority

### Phase 1: Quick Win (Low Effort, High Value)
1. **Info Button in Projection Selector** ⭐⭐⭐
   - Effort: Low (1-2 hours)
   - Value: High (improves UX immediately)
   - Implementation: Modal with ProjectionInfo

### Phase 2: Enhanced UX (Medium Effort, High Value)
2. **Selected Projection Info Panel** ⭐⭐
   - Effort: Low-Medium (2-3 hours)
   - Value: High (always visible, educational)
   - Implementation: Expand/collapse panel below selector

### Phase 3: Educational Features (Medium Effort, Medium Value)
3. **About Page Enhancement** ⭐
   - Effort: Medium (3-4 hours)
   - Value: Medium (educational, reference)
   - Implementation: New section in About view

4. **Projection Comparison View** ⭐
   - Effort: Medium-High (4-6 hours)
   - Value: Medium (advanced feature)
   - Implementation: New view/page

### Optional Enhancement
5. **Tooltip on Hover**
   - Effort: Medium (needs careful UX design)
   - Value: Medium (can be distracting)
   - Consider: Only if user feedback requests it

---

## Implementation Steps for Phase 1 (Recommended)

### Step 1: Update ProjectionSelector.vue

```typescript
// Add imports
import ProjectionInfo from '@/components/ui/ProjectionInfo.vue'

// Add state
const infoModal = ref<HTMLDialogElement | null>(null)
const selectedProjectionForInfo = ref<ProjectionDefinition | null>(null)

// Add method
function showProjectionInfo() {
  if (localValue.value) {
    const projection = projectionRegistry.get(localValue.value)
    if (projection) {
      selectedProjectionForInfo.value = projection
      infoModal.value?.showModal()
    }
  }
}
```

### Step 2: Add UI Elements

```vue
<template>
  <!-- Add info button next to select -->
  <div class="flex items-center gap-2">
    <select v-model="localValue" class="select flex-1">
      <!-- existing options -->
    </select>
    <button
      v-if="modelValue"
      type="button"
      class="btn btn-square"
      :disabled="disabled || loading"
      :aria-label="t('projections.showInfo')"
      @click="showProjectionInfo"
    >
      <i class="ri-information-line" />
    </button>
  </div>

  <!-- Add modal at bottom -->
  <dialog ref="infoModal" class="modal">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg mb-4">
        {{ t('projections.info.title') }}
      </h3>
      <ProjectionInfo
        v-if="selectedProjectionForInfo"
        :projection="selectedProjectionForInfo"
        :show-metadata="true"
      />
      <div class="modal-action">
        <form method="dialog">
          <button class="btn">
            {{ t('common.close') }}
          </button>
        </form>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>
```

### Step 3: Add i18n translations

```json
// In en.json and fr.json
{
  "projections": {
    "showInfo": "Show projection information",
    "info": {
      "title": "Projection Information"
    }
  }
}
```

---

## Estimated Time Investment

- **Phase 1 (Info Button)**: 1-2 hours ✅ Recommended to start
- **Phase 2 (Info Panel)**: 2-3 hours
- **Phase 3 (About Page)**: 3-4 hours
- **Total for all phases**: 6-9 hours

---

## Benefits Summary

✅ **User Education**: Helps users understand projection properties
✅ **Better Decisions**: Users can make informed projection choices
✅ **Professional Feel**: Shows attention to detail and user experience
✅ **Reusability**: Component can be used in multiple contexts
✅ **Accessibility**: Provides additional information in accessible ways
✅ **No Duplication**: Centralizes projection information display

---

## Next Steps

1. **Decide on implementation priority** (recommend Phase 1)
2. **Add missing i18n keys** if any
3. **Implement Phase 1** (info button + modal)
4. **Test with users** and gather feedback
5. **Iterate based on feedback** and implement additional phases if valuable

The ProjectionInfo component is production-ready and just needs to be integrated into the UI! 🎉
