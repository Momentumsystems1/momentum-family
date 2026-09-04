// ============================================================
// ORB — PHYSICS (force simulation ported from the mind-map template) + CAMERA PROJECTION
// Pure functions; no React, no styling.
// ============================================================
import { OrbEdge, OrbNode } from "@/src/orb/orbNodes";
import { ORB } from "@/src/orb/orbTheme";

export function stepPhysics(nodes: OrbNode[], edges: OrbEdge[], paused: boolean) {
  if (paused) return;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  // repulsion (template: force = (minDist - dist)/dist * 0.4; v += d * force * 0.1)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      const dist = Math.hypot(dx, dy, dz) || 0.001;
      const minDist = ORB.minDist + a.radius + b.radius;
      if (dist < minDist) {
        const f = ((minDist - dist) / dist) * ORB.repulsion * ORB.repulsionGain;
        a.vx -= dx * f; a.vy -= dy * f; a.vz -= dz * f;
        b.vx += dx * f; b.vy += dy * f; b.vz += dz * f;
      }
    }
  }
  // link springs (template: force = (dist - idealDist)/dist * 0.02)
  for (const e of edges) {
    const s = byId.get(e.from), t = byId.get(e.to);
    if (!s || !t) continue;
    const ideal = Math.hypot(t.ax - s.ax, t.ay - s.ay, t.az - s.az);
    const dx = t.x - s.x, dy = t.y - s.y, dz = t.z - s.z;
    const dist = Math.hypot(dx, dy, dz) || 0.001;
    const f = ((dist - ideal) / dist) * ORB.linkSpring;
    s.vx += dx * f; s.vy += dy * f; s.vz += dz * f;
    t.vx -= dx * f; t.vy -= dy * f; t.vz -= dz * f;
  }
  // anchor spring (keeps layout stable, avoids drift) + integrate
  for (const n of nodes) {
    if (n.kind === "root") { n.x = n.y = n.z = 0; n.vx = n.vy = n.vz = 0; continue; }
    n.vx += (n.ax - n.x) * ORB.anchorSpring; n.vy += (n.ay - n.y) * ORB.anchorSpring; n.vz += (n.az - n.z) * ORB.anchorSpring;
    n.vx *= ORB.damping; n.vy *= ORB.damping; n.vz *= ORB.damping;
    n.x += n.vx; n.y += n.vy; n.z += n.vz;
  }
}

export type Camera = { yaw: number; pitch: number; targetYaw: number; targetPitch: number };

export function stepCamera(cam: Camera, dtSec: number, autoRotate: boolean) {
  if (autoRotate) cam.targetYaw += ORB.autoRotateSpeed * dtSec;
  cam.yaw += (cam.targetYaw - cam.yaw) * ORB.rotationDamping * 2;
  cam.pitch += (cam.targetPitch - cam.pitch) * ORB.rotationDamping * 2;
}

export type Projected = { id: string; sx: number; sy: number; scale: number; depth: number; opacity: number };

/** Rotate by camera yaw/pitch, then perspective-project to screen space around (cx, cy). */
export function project(n: { id: string; x: number; y: number; z: number }, cam: Camera, cx: number, cy: number): Projected {
  const cosY = Math.cos(cam.yaw), sinY = Math.sin(cam.yaw), cosP = Math.cos(cam.pitch), sinP = Math.sin(cam.pitch);
  const x1 = n.x * cosY - n.z * sinY, z1 = n.x * sinY + n.z * cosY;
  const y2 = n.y * cosP - z1 * sinP, z2 = n.y * sinP + z1 * cosP;
  const scale = ORB.focal / (ORB.focal + ORB.cameraZ + z2);
  const depth = (z2 + ORB.familyOrbit) / (2 * ORB.familyOrbit); // 0 (front) … 1 (back)
  const t = Math.min(1, Math.max(0, depth));
  return { id: n.id, sx: cx + x1 * scale, sy: cy + y2 * scale, scale, depth: t,
    opacity: ORB.labelMaxDepthOpacity - t * (1 - ORB.depthOpacityMin) };
}
