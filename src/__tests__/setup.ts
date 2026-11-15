// happy-dom has no popover API, which the dropdowns open their menu with; the tests of the packages run in node, without a DOM
if (typeof HTMLElement !== 'undefined') {
  HTMLElement.prototype.showPopover ??= function () {}
}
