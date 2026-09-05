import React from "react";

import { OrbSequenceEmergent } from "@/src/orb-lab/OrbSequenceEmergent";

/**
 * Isolated fake-first route built on Emergent's real Orb menu/rendering base.
 * Only the orbital selection choreography is experimental here.
 */
export default function OrbLab() {
  return <OrbSequenceEmergent />;
}
