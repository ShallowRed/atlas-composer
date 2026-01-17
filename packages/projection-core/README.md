# @atlas-composer/projection-core

> Low-level projection and stream utilities.

This package contains the mathematical core and stream manipulation logic used by `@atlas-composer/projection-loader` and the main application. It provides pure, zero-dependency tools for building complex map projections.

## 🔧 Core Functions

- **Stream Multiplexing**: Splits a D3 geo stream into multiple branches (for creating composite views).
- **Bounds Calculation**: Utilities for measuring projected geometry.
- **Coordinate Transformation**: Helpers for managing complex projection pipelines.

> **Note:** Most users should use `@atlas-composer/projection-loader` instead of this package directly.
