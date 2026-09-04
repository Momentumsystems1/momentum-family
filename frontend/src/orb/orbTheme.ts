// ============================================================
// ORB — THEME / VISUAL CONSTANTS (single place to tune the Orb)
// Values derived from remix-3d-mind-map-visualizatio (camera 60°, damping 0.08,
// repulsion 0.4*0.1, link spring 0.02, node radius by depth, label opacity by depth).
// ============================================================
export const ORB = {
  // closed floating orb
  closedSize: 68,
  haloExtra: 22,
  compressOnTap: 0.92,
  // scene / camera
  focal: 720, // perspective focal length (px)
  cameraZ: 230, // distance from graph center
  autoRotateSpeed: 0.12, // rad/s (template: slow scene rotation)
  dragRotateGain: 0.0065, // rad per px of drag
  rotationDamping: 0.08, // template OrbitControls.dampingFactor
  pitchLimit: 0.9,
  // layout radii (3D units ≈ px at z=0)
  rootRadius: 34,
  familyOrbit: 150,
  childOrbit: 84,
  familyNodeRadius: 26,
  childNodeRadius: 18,
  // physics (template values)
  repulsion: 0.4,
  repulsionGain: 0.1,
  linkSpring: 0.02,
  damping: 0.86,
  anchorSpring: 0.06, // pulls nodes to their ideal layout position (keeps stable results)
  minDist: 46,
  // appearance
  glowOpacity: 0.55,
  edgeOpacity: 0.35,
  depthOpacityMin: 0.35,
  depthScaleMin: 0.55,
  labelMaxDepthOpacity: 1,
  // timings (ms)
  expandDuration: 520,
  collapseDuration: 380,
  childStagger: 45,
  tickMs: 33, // ~30 fps simulation
};

export type ToneKey = "cyan" | "green" | "blue" | "amber" | "violet" | "red";
