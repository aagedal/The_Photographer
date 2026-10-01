// Optional asynchronous GPU measurements. Never finish/wait on the GPU, and
// discard disjoint samples (for example after a graphics clock change).
type TimerExtension = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };
export function createGpuTimer(gl: WebGL2RenderingContext) {
  const extension = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension | null;
  const pending: WebGLQuery[] = [];
  let active: WebGLQuery | null = null;
  return {
    supported: !!extension,
    begin() {
      if (!extension || active || pending.length >= 8) return;
      active = gl.createQuery();
      if (active) gl.beginQuery(extension.TIME_ELAPSED_EXT, active);
    },
    end() {
      if (!extension || !active) return;
      gl.endQuery(extension.TIME_ELAPSED_EXT); pending.push(active); active = null;
    },
    poll(): number[] {
      if (!extension) return [];
      if (gl.getParameter(extension.GPU_DISJOINT_EXT)) {
        pending.splice(0).forEach(query => gl.deleteQuery(query)); return [];
      }
      const samples: number[] = [];
      while (pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) {
        const query = pending.shift()!;
        samples.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(query);
      }
      return samples;
    },
    dispose() {
      if (extension && active) { gl.endQuery(extension.TIME_ELAPSED_EXT); gl.deleteQuery(active); active = null; }
      pending.splice(0).forEach(query => gl.deleteQuery(query));
    },
  };
}
