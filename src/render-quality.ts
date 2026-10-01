export function reflectionRefreshInterval(performanceMode: boolean, touchDevice: boolean) {
  return performanceMode ? 100 : touchDevice ? 66 : 33;
}
