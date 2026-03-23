import { modeColors, defaultModeColor } from "./colors";

export type CognitiveLoopNode = {
  id: string;
  label: string;
  label_en?: string | null;
  kind: string;
  summary: string;
  summary_en?: string | null;
  notes: string[];
};

export type CognitiveLoopEdge = {
  source: string;
  target: string;
  label?: string;
};

export type CognitiveLoopData = {
  schema_version: number;
  generated_at: string;
  title: string;
  nodes: CognitiveLoopNode[];
  edges: CognitiveLoopEdge[];
};

type GraphPosition = {
  x: number;
  y: number;
};

type GraphCurveConfig = {
  distance: number;
  weight?: number;
};

type ProjectedLoopNode = {
  id: string;
  label: string;
  color: string;
  position: GraphPosition;
};

type ProjectedLoopEdge = {
  source: string;
  target: string;
  sourceArrow: "none" | "triangle";
  targetArrow: "none" | "triangle";
  curveDistance: number;
  curveWeight: number;
};

function nodeColor(node: CognitiveLoopNode): string {
  return modeColors[resolveNodeId(node.id)] ?? defaultModeColor;
}

export function nodePublicMode(node: CognitiveLoopNode): string | null {
  const id = resolveNodeId(node.id);
  return id in modeColors ? id : null;
}

/** Map server node id → public name used in positions/edges/colors */
const serverIdToPublic: Record<string, string> = {
  experience: "browsing",
  conversation: "chat",
  dream: "dreaming",
  blog: "blogging",
  social: "sharing",
  developer: "coding",
  mail: "mailing",
};

function resolveNodeId(serverId: string): string {
  return serverIdToPublic[serverId] ?? serverId;
}

const GRAPH_MEMORY_NODE_ID = "memory-hub";
const DEFAULT_NODE_POSITION: GraphPosition = { x: 420, y: 260 };
const DEFAULT_CURVE_WEIGHT = 0.5;
const LOOP_DEBUG_QUERY_PARAM = "loopDebug";
const DISABLED_DEBUG_VALUES = new Set(["0", "false", "off", "no"]);

export const graphPositions: Record<string, GraphPosition> = {
  heartbeat: { x: 416, y: 1 },
  browsing: { x: 256, y: 132 },
  chat: { x: 141, y: 334 },
  mailing: { x: 230, y: 465 },
  [GRAPH_MEMORY_NODE_ID]: { x: 390, y: 294 },
  thinking: { x: 664, y: 127 },
  reading: { x: 626, y: 342 },
  dreaming: { x: 381, y: 518 },
  blogging: { x: 645, y: 461 },
  sharing: { x: 471, y: 81 },
  trading: { x: 144, y: 143 },
  coding: { x: 476, y: 424 },
  research: { x: 534, y: 249 },
};

export const graphEdgeCurves: Record<string, GraphCurveConfig> = {
  "blogging::coding": { distance: 38, weight: 0.50 },
  "blogging::dreaming": { distance: 38, weight: 0.50 },
  "blogging::reading": { distance: 38, weight: 0.50 },
  "blogging::thinking": { distance: -98, weight: 0.50 },
  "browsing::heartbeat": { distance: 56, weight: 0.50 },
  "browsing::memory-hub": { distance: -50, weight: 0.50 },
  "browsing::sharing": { distance: -74, weight: 0.40 },
  "chat::memory-hub": { distance: -8, weight: 0.50 },
  "coding::memory-hub": { distance: 38, weight: 0.50 },
  "coding::thinking": { distance: -38, weight: 0.50 },
  "dreaming::memory-hub": { distance: 8, weight: 0.50 },
  "heartbeat::memory-hub": { distance: 44, weight: 0.50 },
  "heartbeat::thinking": { distance: -44, weight: 0.55 },
  "heartbeat::trading": { distance: 86, weight: 0.50 },
  "mailing::memory-hub": { distance: 8, weight: 0.50 },
  "memory-hub::reading": { distance: 26, weight: 0.50 },
  "memory-hub::research": { distance: 26, weight: 0.50 },
  "memory-hub::sharing": { distance: -8, weight: 0.42 },
  "memory-hub::thinking": { distance: -74, weight: 0.50 },
  "memory-hub::trading": { distance: 86, weight: 0.40 },
  "reading::thinking": { distance: -50, weight: 0.50 },
  "research::thinking": { distance: 14, weight: 0.50 },
  "sharing::thinking": { distance: 34, weight: 0.45 },
};

function canonicalEdgeKey(source: string, target: string): string {
  return [source, target].sort().join("::");
}

export function isLoopDebugEnabled(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return false;
  }

  const value = new URLSearchParams(window.location.search).get(LOOP_DEBUG_QUERY_PARAM);
  return value !== null && !DISABLED_DEBUG_VALUES.has(value.trim().toLowerCase());
}

function shortenLabel(label: string): string {
  const maxChars = 22;
  if (label.length <= maxChars) {
    return label;
  }
  const slice = label.slice(0, maxChars + 1);
  const boundary = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf("/"));
  const trimmed = (boundary >= 10 ? slice.slice(0, boundary) : label.slice(0, maxChars))
    .trim()
    .replace(/[,:;/.!?-]+$/g, "");
  return `${trimmed}…`;
}

function graphNodeId(node: CognitiveLoopNode): string {
  if (node.id === "memory" || node.id === "short-state") {
    return GRAPH_MEMORY_NODE_ID;
  }

  return resolveNodeId(node.id);
}

function graphLabel(node: CognitiveLoopNode): string {
  if (node.id === "memory" || node.id === "short-state") {
    return "MEMORY";
  }

  const id = resolveNodeId(node.id);
  return id in modeColors ? id.toUpperCase() : shortenLabel(node.label);
}

function defaultCurveDistance(source: string, target: string): number {
  return source === GRAPH_MEMORY_NODE_ID || target === GRAPH_MEMORY_NODE_ID ? 26 : 38;
}

export function projectLoopGraph(loop: CognitiveLoopData): {
  nodes: ProjectedLoopNode[];
  edges: ProjectedLoopEdge[];
} {
  const nodeMap = new Map<string, ProjectedLoopNode>();

  for (const node of loop.nodes) {
    const id = graphNodeId(node);
    if (nodeMap.has(id)) {
      continue;
    }

    nodeMap.set(id, {
      id,
      label: graphLabel(node),
      color: nodeColor(node),
      position: graphPositions[id] ?? DEFAULT_NODE_POSITION,
    });
  }

  const orientedEdges = loop.edges
    .map((edge) => ({
      source: edge.source === "memory" || edge.source === "short-state" ? GRAPH_MEMORY_NODE_ID : resolveNodeId(edge.source),
      target: edge.target === "memory" || edge.target === "short-state" ? GRAPH_MEMORY_NODE_ID : resolveNodeId(edge.target),
    }))
    .filter((edge) => edge.source !== edge.target);

  const edgeMap = new Map<
    string,
    ProjectedLoopEdge
  >();

  for (const edge of orientedEdges) {
    const pairKey = canonicalEdgeKey(edge.source, edge.target);
    const existing = edgeMap.get(pairKey);
    if (!existing) {
      const curve = graphEdgeCurves[pairKey];
      edgeMap.set(pairKey, {
        source: edge.source,
        target: edge.target,
        sourceArrow: "none",
        targetArrow: "triangle",
        curveDistance: curve?.distance ?? defaultCurveDistance(edge.source, edge.target),
        curveWeight: curve?.weight ?? DEFAULT_CURVE_WEIGHT,
      });
      continue;
    }

    if (existing.source === edge.target && existing.target === edge.source) {
      existing.sourceArrow = "triangle";
      existing.targetArrow = "triangle";
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}
