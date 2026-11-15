export interface ExampleFeature {
  path: string
  name: string
  value: number | null
}

export interface ExampleFrame {
  code: string
  x: number
  y: number
  width: number
  height: number
}

// Borders between two entities of a group, between two groups, and of a single entity (coast, state border)
interface ExampleBorders {
  inner: string
  group: string
  outline: string
}

export interface ExampleMap {
  width: number
  height: number
  features: ExampleFeature[]
  borders: ExampleBorders
  frames: ExampleFrame[]
}
