// ============================================================
// ORB — NODES (data → node graph). No physics, no styling here.
// ============================================================
import { ORB_FAMILIES, OrbFamily, OrbTool } from "@/src/copy";
import { ORB, ToneKey } from "@/src/orb/orbTheme";

export type OrbNode = {
  id: string;
  kind: "root" | "family" | "tool";
  label: string;
  icon: string;
  tone: ToneKey;
  parent?: string;
  family?: OrbFamily;
  tool?: OrbTool;
  capability?: string;
  // ideal (anchor) position in 3D, graph space
  ax: number; ay: number; az: number;
  // simulated position / velocity
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  radius: number;
  born: number; // timestamp for birth animation
};

export type OrbEdge = { from: string; to: string };

function sphere(i: number, n: number, r: number) {
  // Fibonacci sphere → evenly distributed nodes in 3D (template distributes children in 3D around parent)
  const k = i + 0.5;
  const phi = Math.acos(1 - (2 * k) / n);
  const theta = Math.PI * (1 + Math.sqrt(5)) * k;
  return { x: r * Math.cos(theta) * Math.sin(phi), y: r * Math.cos(phi) * 0.75, z: r * Math.sin(theta) * Math.sin(phi) };
}

export function buildRootGraph(): { nodes: OrbNode[]; edges: OrbEdge[] } {
  const now = Date.now();
  const nodes: OrbNode[] = [{ id: "root", kind: "root", label: "Sentinel", icon: "ellipse", tone: "cyan", ax: 0, ay: 0, az: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, radius: ORB.rootRadius, born: now }];
  const edges: OrbEdge[] = [];
  ORB_FAMILIES.forEach((f, i) => {
    const p = sphere(i, ORB_FAMILIES.length, ORB.familyOrbit);
    nodes.push({ id: f.key, kind: "family", label: f.label, icon: f.icon, tone: f.tone, parent: "root", family: f, ax: p.x, ay: p.y, az: p.z,
      x: p.x * 0.2, y: p.y * 0.2, z: p.z * 0.2, vx: 0, vy: 0, vz: 0, radius: ORB.familyNodeRadius, born: now + i * ORB.childStagger });
    edges.push({ from: "root", to: f.key });
  });
  return { nodes, edges };
}

/** Expand a family: children are born at the parent position and spring outward (template: expand → children materialize). */
export function expandFamily(graph: { nodes: OrbNode[]; edges: OrbEdge[] }, familyKey: string) {
  const parent = graph.nodes.find((n) => n.id === familyKey);
  if (!parent?.family) return graph;
  const now = Date.now();
  const nodes = graph.nodes.filter((n) => n.kind !== "tool");
  const edges = graph.edges.filter((e) => graph.nodes.find((n) => n.id === e.to)?.kind !== "tool");
  const dir = { x: parent.ax, y: parent.ay, z: parent.az };
  const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
  parent.family.tools.forEach((t, i) => {
    const p = sphere(i, parent.family!.tools.length, ORB.childOrbit);
    nodes.push({ id: `${familyKey}:${t.key}`, kind: "tool", label: t.label, icon: t.icon, tone: parent.tone, parent: familyKey, tool: t, capability: t.capability,
      ax: parent.ax + p.x + (dir.x / len) * 30, ay: parent.ay + p.y, az: parent.az + p.z + (dir.z / len) * 30,
      x: parent.x, y: parent.y, z: parent.z, vx: 0, vy: 0, vz: 0, radius: ORB.childNodeRadius, born: now + i * ORB.childStagger });
    edges.push({ from: familyKey, to: `${familyKey}:${t.key}` });
  });
  return { nodes, edges };
}

export function collapseTools(graph: { nodes: OrbNode[]; edges: OrbEdge[] }) {
  const nodes = graph.nodes.filter((n) => n.kind !== "tool");
  const ids = new Set(nodes.map((n) => n.id));
  return { nodes, edges: graph.edges.filter((e) => ids.has(e.to)) };
}
