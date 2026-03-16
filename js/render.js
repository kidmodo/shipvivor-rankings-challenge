export function setElementHidden(element, hidden) {
  if (!element) return;
  element.classList.toggle('hidden', hidden);
}
