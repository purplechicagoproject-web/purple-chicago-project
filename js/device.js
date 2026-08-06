export function isMobileViewport(config) {
  return window.matchMedia(`(max-width: ${config.MOBILE_MAX_WIDTH}px)`).matches;
}
