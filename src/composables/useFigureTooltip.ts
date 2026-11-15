import { shallowRef } from 'vue'

// The item under the pointer or the keyboard focus, and its place in the figure that holds the tooltip
export function useFigureTooltip<T>() {
  const hovered = shallowRef<{ item: T, x: number, y: number } | null>(null)

  function place(element: Element, item: T, x: number, y: number) {
    const figure = element.closest('figure')!.getBoundingClientRect()
    hovered.value = { item, x: x - figure.left, y: y - figure.top }
  }

  function show(event: MouseEvent, item: T) {
    place(event.currentTarget as Element, item, event.clientX, event.clientY)
  }

  function showOn(element: Element, item: T) {
    const box = element.getBoundingClientRect()
    place(element, item, box.left + box.width / 2, box.top + box.height / 2)
  }

  function hide() {
    hovered.value = null
  }

  return { hovered, show, showOn, hide }
}
