// 28-joint DAS28 set. Coordinates are for an SVG viewBox 400x600 schematic body.
export interface JointDef {
  id: string;
  label: string;
  side: "L" | "R";
  group: "Shoulder" | "Elbow" | "Wrist" | "MCP" | "PIP" | "Knee";
  x: number;
  y: number;
  r: number;
}

const mcpPip = (side: "L" | "R") => {
  // Hand fans out from wrist. Left wrist at (90, 320), right at (310, 320).
  const wristX = side === "L" ? 90 : 310;
  const wristY = 320;
  const dir = side === "L" ? -1 : 1;
  const out: JointDef[] = [];
  // 5 fingers spread; MCP closer to wrist, PIP further.
  const angles = [-55, -28, -2, 22, 48]; // thumb to pinky
  angles.forEach((deg, i) => {
    const idx = i + 1;
    const rad = (deg * Math.PI) / 180;
    const mcpDist = 38;
    const pipDist = 62;
    out.push({
      id: `${side}_MCP${idx}`,
      label: `MCP${idx}`,
      side,
      group: "MCP",
      x: wristX + dir * mcpDist * Math.cos(rad),
      y: wristY + mcpDist * Math.sin(rad) + 10,
      r: 7,
    });
    out.push({
      id: `${side}_PIP${idx}`,
      label: `PIP${idx}`,
      side,
      group: "PIP",
      x: wristX + dir * pipDist * Math.cos(rad),
      y: wristY + pipDist * Math.sin(rad) + 10,
      r: 6,
    });
  });
  return out;
};

export const JOINTS: JointDef[] = [
  { id: "L_Shoulder", label: "Shoulder", side: "L", group: "Shoulder", x: 145, y: 140, r: 14 },
  { id: "R_Shoulder", label: "Shoulder", side: "R", group: "Shoulder", x: 255, y: 140, r: 14 },
  { id: "L_Elbow", label: "Elbow", side: "L", group: "Elbow", x: 120, y: 235, r: 12 },
  { id: "R_Elbow", label: "Elbow", side: "R", group: "Elbow", x: 280, y: 235, r: 12 },
  { id: "L_Wrist", label: "Wrist", side: "L", group: "Wrist", x: 95, y: 315, r: 11 },
  { id: "R_Wrist", label: "Wrist", side: "R", group: "Wrist", x: 305, y: 315, r: 11 },
  ...mcpPip("L"),
  ...mcpPip("R"),
  { id: "L_Knee", label: "Knee", side: "L", group: "Knee", x: 170, y: 470, r: 14 },
  { id: "R_Knee", label: "Knee", side: "R", group: "Knee", x: 230, y: 470, r: 14 },
];

export const fullJointLabel = (id: string) => {
  const j = JOINTS.find((j) => j.id === id);
  if (!j) return id;
  return `${j.side === "L" ? "Left" : "Right"} ${j.label}`;
};
