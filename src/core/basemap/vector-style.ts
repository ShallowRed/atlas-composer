export interface VectorPalette {
  land: string
  water: string
  wood: string
  grass: string
  ice: string
  residential: string
  minorRoad: string
  majorRoad: string
  motorway: string
  region: string
  country: string
  label: string
  labelHalo: string
}

export const VECTOR_PALETTES: Record<'light' | 'dark', VectorPalette> = {
  light: {
    land: '#f4f1ea',
    water: '#a9cfe0',
    wood: '#cfe3c1',
    grass: '#e1ecd0',
    ice: '#ffffff',
    residential: '#e8e2da',
    minorRoad: '#ffffff',
    majorRoad: '#f2c46b',
    motorway: '#e5935a',
    region: '#b9a6c4',
    country: '#8a6f9c',
    label: '#222222',
    labelHalo: 'rgba(255, 255, 255, 0.85)',
  },
  dark: {
    land: '#23262b',
    water: '#1b3447',
    wood: '#24342a',
    grass: '#2a3329',
    ice: '#3a3f45',
    residential: '#2d2f33',
    minorRoad: '#3a3d42',
    majorRoad: '#8a6d3b',
    motorway: '#a5653d',
    region: '#5d5168',
    country: '#9d86ad',
    label: '#e6e6e6',
    labelHalo: 'rgba(0, 0, 0, 0.75)',
  },
}
