import { describe, expect, it } from 'vitest'
import { useFigureTooltip } from '@/composables/useFigureTooltip'

function figureWithItem() {
  const figure = document.createElement('figure')
  const item = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  figure.appendChild(item)
  figure.getBoundingClientRect = () => DOMRect.fromRect({ x: 100, y: 50, width: 400, height: 300 })
  item.getBoundingClientRect = () => DOMRect.fromRect({ x: 200, y: 150, width: 40, height: 20 })
  return item
}

describe('useFigureTooltip', () => {
  it('places the item at the pointer, from the corner of its figure', () => {
    const item = figureWithItem()
    const { hovered, show, hide } = useFigureTooltip<string>()
    const event = new MouseEvent('mousemove', { clientX: 130, clientY: 80 })
    Object.defineProperty(event, 'currentTarget', { value: item })

    show(event, 'Ain')
    expect(hovered.value).toEqual({ item: 'Ain', x: 30, y: 30 })
    hide()
    expect(hovered.value).toBeNull()
  })

  it('places the item that has the keyboard focus at its center', () => {
    const { hovered, showOn } = useFigureTooltip<string>()

    showOn(figureWithItem(), 'Ain')
    expect(hovered.value).toEqual({ item: 'Ain', x: 120, y: 110 })
  })
})
