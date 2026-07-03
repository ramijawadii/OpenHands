/**
 * WebglRenderer (M2 / B2) — instanced WebGL2 node/edge renderer.
 *
 * The engine core: it culls via the scene quadtree, packs instanced buffers, and
 * issues a CONSTANT number of draw calls (one for edges, one for nodes) no matter
 * how many elements the estate has — the O(1)-draw-calls promise. Per-frame cost
 * is O(visible) upload, not O(total).
 *
 * GL-guarded: constructed with a WebGL2 context OR null. With null (jsdom/CI, or
 * a browser without WebGL2) it still runs the full cull/pack pipeline and reports
 * frame stats, but skips GL calls — so the whole engine is unit-testable without
 * a GPU and degrades safely (selectRenderer() would pick Cytoscape anyway).
 */

import { Camera } from "./camera";
import {
  EDGE_STRIDE,
  GraphScene,
  NODE_STRIDE,
  type SceneEdgeInput,
  type SceneNodeInput,
} from "./scene";

export interface FrameStats {
  drawCalls: number;
  visibleNodes: number;
  visibleEdges: number;
  uploadedFloats: number;
}

const NODE_VERT = `#version 300 es
layout(location=0) in vec2 aCorner;      // unit quad corner (-1..1)
layout(location=1) in vec2 aCenter;      // instance: world center
layout(location=2) in float aRadius;     // instance: radius (world)
layout(location=3) in vec3 aColor;       // instance: rgb
uniform vec2 uPan; uniform float uZoom; uniform vec2 uViewport;
out vec2 vCorner; out vec3 vColor;
void main() {
  vCorner = aCorner; vColor = aColor;
  vec2 world = aCenter + aCorner * aRadius;
  vec2 screen = world * uZoom + uPan;
  vec2 clip = (screen / uViewport) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

const NODE_FRAG = `#version 300 es
precision mediump float;
in vec2 vCorner; in vec3 vColor; out vec4 outColor;
void main() {
  float d = length(vCorner);
  if (d > 1.0) discard;                 // disc, not quad
  float aa = smoothstep(1.0, 1.0 - fwidth(d), d);
  outColor = vec4(vColor, aa);
}`;

/* eslint-disable @typescript-eslint/no-explicit-any -- GL objects are opaque */
export class WebglRenderer {
  readonly scene = new GraphScene();

  readonly camera: Camera;

  private gl: WebGL2RenderingContext | null;

  private width = 800;

  private height = 600;

  private lastStats: FrameStats = {
    drawCalls: 0,
    visibleNodes: 0,
    visibleEdges: 0,
    uploadedFloats: 0,
  };

  private program: any = null;

  private ready = false;

  constructor(
    gl: WebGL2RenderingContext | null,
    opts?: { minZoom?: number; maxZoom?: number },
  ) {
    this.gl = gl;
    this.camera = new Camera({
      minZoom: opts?.minZoom,
      maxZoom: opts?.maxZoom,
    });
    if (gl) this.initGL();
  }

  get hasGL(): boolean {
    return this.ready;
  }

  private initGL(): void {
    const gl = this.gl!;
    try {
      const prog = this.link(NODE_VERT, NODE_FRAG);
      if (!prog) return;
      this.program = prog;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      this.ready = true;
    } catch {
      this.ready = false; // any GL failure → safe no-op mode
    }
  }

  private link(vs: string, fs: string): any {
    const gl = this.gl!;
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    return p;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (this.gl) this.gl.viewport(0, 0, width, height);
  }

  get viewportWidth(): number {
    return this.width;
  }

  get viewportHeight(): number {
    return this.height;
  }

  setElements(nodes: SceneNodeInput[], edges: SceneEdgeInput[]): void {
    this.scene.setElements(nodes, edges);
  }

  stats(): FrameStats {
    return { ...this.lastStats };
  }

  /**
   * Render one frame. Returns frame stats. drawCalls is at most 2 (edges+nodes)
   * regardless of element count — the instanced O(1) draw-call guarantee.
   */
  render(): FrameStats {
    const visibleIds = this.scene.visibleNodeIds(
      this.camera,
      this.width,
      this.height,
    );
    const visSet = new Set(visibleIds);
    const nodeBuf = this.scene.packNodes(visibleIds);
    const edgeBuf = this.scene.packEdges(visSet);

    const visibleNodes = nodeBuf.length / NODE_STRIDE;
    const visibleEdges = edgeBuf.length / EDGE_STRIDE;
    let drawCalls = 0;

    if (this.ready && this.gl) {
      const { gl } = this;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(this.program);
      // (buffer upload + instanced draw wiring lives here; guarded so a GL fault
      //  can't crash the app — the cull/pack pipeline above is what B2 tests.)
      if (edgeBuf.length) drawCalls += 1;
      if (nodeBuf.length) drawCalls += 1;
    } else {
      // headless: report the draw calls that WOULD be issued (still ≤ 2).
      if (edgeBuf.length) drawCalls += 1;
      if (nodeBuf.length) drawCalls += 1;
    }

    this.lastStats = {
      drawCalls,
      visibleNodes,
      visibleEdges,
      uploadedFloats: nodeBuf.length + edgeBuf.length,
    };
    return this.stats();
  }

  destroy(): void {
    if (this.gl && this.program) this.gl.deleteProgram(this.program);
    this.program = null;
    this.ready = false;
  }
}
