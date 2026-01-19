# @atlas-composer/specification

> The official data contract for the Atlas Composer ecosystem.

This package contains the **JSON Schemas** and **TypeScript interfaces** that define valid `CompositeProjectionConfig` objects. It is the single source of truth for the data format used by the editor, the loader, and the presets.

## Contents

- **TypeScript Definitions**: `CompositeProjectionConfig`, `TerritoryConfig`, etc.
- **JSON Schemas**: Valid Draft-07 schemas for validation.
- **Type Guards**: Runtime checks for data structures.

## Usage

```typescript
import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import { isCompositeProjectionConfig } from '@atlas-composer/specification'

function loadConfig(data: unknown) {
  if (isCompositeProjectionConfig(data)) {
    // data is narrowed to CompositeProjectionConfig
    console.log(data.metadata.atlasId)
  }
}
```
