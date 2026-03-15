import cytoscape, { type Core } from "cytoscape";

export type CognitiveLoopNode = {
  id: string;
  label: string;
  kind: string;
  summary: string;
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

/** Node id → display color (matches kind-badge--* in CSS).
 *  Node IDs now match public mode names directly (source of truth: modes.yaml). */
const modeColors: Record<string, string> = {
  reading: "#f4e409",
  thinking: "#46d9ff",
  browsing: "#ffb000",
  dreaming: "#b07cff",
  heartbeat: "#ef4444",
  trading: "#8f8f8f",
  blogging: "#f472b6",
  mailing: "#a78bfa",
  coding: "#34d399",
  sharing: "#ff5ea8",
  chat: "#6ee7b7",
};

const DEFAULT_NODE_COLOR = "#c3c3c3";

function nodeColor(node: CognitiveLoopNode): string {
  return modeColors[resolveNodeId(node.id)] ?? DEFAULT_NODE_COLOR;
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
  thinking: { x: 672, y: 132 },
  reading: { x: 549, y: 363 },
  dreaming: { x: 381, y: 518 },
  blogging: { x: 645, y: 461 },
  sharing: { x: 480, y: 116 },
  trading: { x: 144, y: 143 },
  coding: { x: 542, y: 253 },
};

export const graphEdgeCurves: Record<string, GraphCurveConfig> = {
  "blogging::coding": { distance: -38, weight: 0.50 },
  "blogging::dreaming": { distance: 38, weight: 0.50 },
  "blogging::reading": { distance: 38, weight: 0.50 },
  "blogging::thinking": { distance: -98, weight: 0.50 },
  "chat::memory-hub": { distance: -8, weight: 0.50 },
  "coding::memory-hub": { distance: 38, weight: 0.50 },
  "coding::thinking": { distance: 38, weight: 0.50 },
  "dreaming::memory-hub": { distance: 8, weight: 0.50 },
  "browsing::heartbeat": { distance: 56, weight: 0.50 },
  "browsing::memory-hub": { distance: -50, weight: 0.50 },
  "browsing::sharing": { distance: -74, weight: 0.40 },
  "heartbeat::memory-hub": { distance: 8, weight: 0.50 },
  "heartbeat::thinking": { distance: -44, weight: 0.55 },
  "heartbeat::trading": { distance: 86, weight: 0.50 },
  "mailing::memory-hub": { distance: 8, weight: 0.50 },
  "memory-hub::reading": { distance: 26, weight: 0.50 },
  "memory-hub::sharing": { distance: -8, weight: 0.42 },
  "memory-hub::thinking": { distance: -62, weight: 0.50 },
  "memory-hub::trading": { distance: 86, weight: 0.40 },
  "reading::thinking": { distance: -50, weight: 0.50 },
  "sharing::thinking": { distance: 34, weight: 0.45 },
};

declare global {
  interface Window {
    __JM_LOOP_DEBUG__?: {
      cy: Core;
      dumpPositions: () => void;
      dumpCurves: () => void;
      dumpAll: () => void;
      fit: () => void;
    };
  }
}

function canonicalEdgeKey(source: string, target: string): string {
  return [source, target].sort().join("::");
}

function formatGraphKey(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : `"${key}"`;
}

function roundGraphPosition(value: number): number {
  return Math.round(value);
}

function formatNodePositions(cy: Core): string {
  const orderedIds = [
    ...Object.keys(graphPositions),
    ...cy.nodes()
      .map((node) => node.id())
      .filter((id) => !(id in graphPositions))
      .sort((left, right) => left.localeCompare(right)),
  ];

  const seenIds = new Set<string>();
  const lines = orderedIds.flatMap((id) => {
    if (seenIds.has(id)) {
      return [];
    }

    seenIds.add(id);
    const node = cy.getElementById(id);
    if (!node.nonempty()) {
      return [];
    }

    const position = node.position();
    return `  ${formatGraphKey(id)}: { x: ${roundGraphPosition(position.x)}, y: ${roundGraphPosition(position.y)} },`;
  });

  return ["export const graphPositions = {", ...lines, "};"].join("\n");
}

function sortEdgesByKey(cy: Core) {
  return cy.edges().sort((left, right) => {
    const leftKey = String(left.data("pairKey"));
    const rightKey = String(right.data("pairKey"));
    return leftKey.localeCompare(rightKey);
  });
}

function formatEdgeCurves(cy: Core): string {
  const lines = sortEdgesByKey(cy).map((edge) => {
    const pairKey = String(edge.data("pairKey"));
    const distance = roundGraphPosition(Number(edge.data("curveDistance")) || 0);
    const weight = Number(Number(edge.data("curveWeight")) || DEFAULT_CURVE_WEIGHT).toFixed(2);
    return `  "${pairKey}": { distance: ${distance}, weight: ${weight} },`;
  });

  return ["export const graphEdgeCurves = {", ...lines, "};"].join("\n");
}

function logNodePositions(cy: Core, reason: string): void {
  console.groupCollapsed(`[loop debug] node positions (${reason})`);
  console.info(formatNodePositions(cy));
  console.groupEnd();
}

function logEdgeCurves(cy: Core, reason: string): void {
  console.groupCollapsed(`[loop debug] edge curves (${reason})`);
  console.info(formatEdgeCurves(cy));
  console.groupEnd();
}

function bindDebugControls(container: HTMLElement, cy: Core): () => void {
  const panel = container.parentElement?.querySelector<HTMLElement>("[data-loop-debug-panel]");
  const dumpNodesButton = panel?.querySelector<HTMLButtonElement>("[data-loop-debug-action='dump-nodes']");
  const dumpCurvesButton = panel?.querySelector<HTMLButtonElement>("[data-loop-debug-action='dump-curves']");
  const flipCurveButton = panel?.querySelector<HTMLButtonElement>("[data-loop-debug-action='flip-curve']");
  const increaseCurveButton = panel?.querySelector<HTMLButtonElement>("[data-loop-debug-action='curve-more']");
  const decreaseCurveButton = panel?.querySelector<HTMLButtonElement>("[data-loop-debug-action='curve-less']");
  const increaseWeightButton = panel?.querySelector<HTMLButtonElement>("[data-loop-debug-action='weight-more']");
  const decreaseWeightButton = panel?.querySelector<HTMLButtonElement>("[data-loop-debug-action='weight-less']");
  const fitButton = panel?.querySelector<HTMLButtonElement>("[data-loop-debug-action='fit']");
  const status = panel?.querySelector<HTMLElement>("[data-loop-debug-status]");
  const edgeStatus = panel?.querySelector<HTMLElement>("[data-loop-debug-edge]");

  let selectedEdgeId: string | null = null;

  if (status) {
    status.textContent = "Debug active. Drag nodes to log positions. Click an edge to tune and log its curve.";
  }

  const dumpPositions = () => logNodePositions(cy, "manual");
  const dumpCurves = () => logEdgeCurves(cy, "manual");
  const fitGraph = () => cy.fit(undefined, 18);
  const selectedEdge = () => (selectedEdgeId ? cy.getElementById(selectedEdgeId) : null);
  const setEdgeStatus = (message: string) => {
    if (edgeStatus) {
      edgeStatus.textContent = message;
    }
  };
  const describeEdge = (edge: cytoscape.SingularElementReturnValue) => {
    const pairKey = String(edge.data("pairKey"));
    const distance = roundGraphPosition(Number(edge.data("curveDistance")) || 0);
    const weight = Number(Number(edge.data("curveWeight")) || DEFAULT_CURVE_WEIGHT).toFixed(2);
    return `${pairKey} | distance ${distance} | weight ${weight}`;
  };
  const syncSelectedEdge = () => {
    cy.edges().removeClass("is-debug-selected");
    const edge = selectedEdge();
    if (!edge?.nonempty()) {
      setEdgeStatus("No edge selected.");
      return;
    }
    edge.addClass("is-debug-selected");
    setEdgeStatus(`Selected edge: ${describeEdge(edge)}`);
  };
  const selectEdge = (edge: cytoscape.SingularElementReturnValue) => {
    selectedEdgeId = edge.id();
    syncSelectedEdge();
  };
  const updateSelectedEdge = (updater: (distance: number, weight: number) => GraphCurveConfig) => {
    const edge = selectedEdge();
    if (!edge?.nonempty()) {
      setEdgeStatus("Select an edge first.");
      return;
    }

    const currentDistance = Number(edge.data("curveDistance")) || 0;
    const currentWeight = Number(edge.data("curveWeight")) || DEFAULT_CURVE_WEIGHT;
    const next = updater(currentDistance, currentWeight);
    edge.data("curveDistance", roundGraphPosition(next.distance));
    edge.data("curveWeight", Number((next.weight ?? currentWeight).toFixed(2)));
    syncSelectedEdge();
    logEdgeCurves(cy, "edge-adjust");
  };
  const onEdgeTap = (event: cytoscape.EventObject) => {
    selectEdge(event.target);
  };
  const clearSelection = (event: cytoscape.EventObject) => {
    if (event.target === cy) {
      selectedEdgeId = null;
      syncSelectedEdge();
    }
  };
  const flipCurve = () => updateSelectedEdge((distance, weight) => ({ distance: distance === 0 ? 38 : -distance, weight }));
  const increaseCurve = () => updateSelectedEdge((distance, weight) => {
    const direction = distance < 0 ? -1 : 1;
    const magnitude = Math.max(8, Math.abs(distance || 38) + 6);
    return { distance: direction * magnitude, weight };
  });
  const decreaseCurve = () => updateSelectedEdge((distance, weight) => {
    const direction = distance < 0 ? -1 : 1;
    const magnitude = Math.max(8, Math.abs(distance || 38) - 6);
    return { distance: direction * magnitude, weight };
  });
  const increaseWeight = () => updateSelectedEdge((distance, weight) => ({
    distance,
    weight: Math.min(0.9, weight + 0.05),
  }));
  const decreaseWeight = () => updateSelectedEdge((distance, weight) => ({
    distance,
    weight: Math.max(0.1, weight - 0.05),
  }));

  cy.on("tap", "edge", onEdgeTap);
  cy.on("tap", clearSelection);

  dumpNodesButton?.addEventListener("click", dumpPositions);
  dumpCurvesButton?.addEventListener("click", dumpCurves);
  flipCurveButton?.addEventListener("click", flipCurve);
  increaseCurveButton?.addEventListener("click", increaseCurve);
  decreaseCurveButton?.addEventListener("click", decreaseCurve);
  increaseWeightButton?.addEventListener("click", increaseWeight);
  decreaseWeightButton?.addEventListener("click", decreaseWeight);
  fitButton?.addEventListener("click", fitGraph);
  syncSelectedEdge();

  return () => {
    cy.off("tap", "edge", onEdgeTap);
    cy.off("tap", clearSelection);
    dumpNodesButton?.removeEventListener("click", dumpPositions);
    dumpCurvesButton?.removeEventListener("click", dumpCurves);
    flipCurveButton?.removeEventListener("click", flipCurve);
    increaseCurveButton?.removeEventListener("click", increaseCurve);
    decreaseCurveButton?.removeEventListener("click", decreaseCurve);
    increaseWeightButton?.removeEventListener("click", increaseWeight);
    decreaseWeightButton?.removeEventListener("click", decreaseWeight);
    fitButton?.removeEventListener("click", fitGraph);
  };
}

function defaultCurveDistance(source: string, target: string): number {
  return source === GRAPH_MEMORY_NODE_ID || target === GRAPH_MEMORY_NODE_ID ? 26 : 38;
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

export function mountCognitiveLoop(container: HTMLElement, loop: CognitiveLoopData): () => void {
  const graph = projectLoopGraph(loop);
  const debugEnabled = isLoopDebugEnabled();

  const cy = cytoscape({
    container,
    autoungrabify: !debugEnabled,
    elements: [
      ...graph.nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          color: node.color,
        },
        position: node.position,
        grabbable: debugEnabled,
      })),
      ...graph.edges.map((edge, index) => ({
        data: {
          id: `loop-edge-${index}`,
          pairKey: canonicalEdgeKey(edge.source, edge.target),
          source: edge.source,
          target: edge.target,
          sourceArrow: edge.sourceArrow,
          targetArrow: edge.targetArrow,
          curveDistance: edge.curveDistance,
          curveWeight: edge.curveWeight,
        },
      })),
    ],
    layout: {
      name: "preset",
      padding: 18,
      animate: false,
      fit: true,
    },
    style: [
      {
        selector: "node",
        style: {
          "background-color": "data(color)",
          label: "data(label)",
          color: "#f2f2f2",
          "font-size": 10,
          "text-wrap": "wrap",
          "text-max-width": "110px",
          "text-valign": "bottom",
          "text-margin-y": 8,
          width: 14,
          height: 14,
          "border-width": 0,
        },
      },
      {
        selector: "edge",
        style: {
          width: "2",
          "line-color": "#666666",
          opacity: 0.82,
          "curve-style": "unbundled-bezier",
          "control-point-distances": "data(curveDistance)",
          "control-point-weights": "data(curveWeight)",
          "source-arrow-shape": "data(sourceArrow)",
          "source-arrow-color": "#666666",
          "target-arrow-shape": "data(targetArrow)",
          "target-arrow-color": "#666666",
        } as never,
      },
      {
        selector: "edge.is-debug-selected",
        style: {
          width: "3",
          "line-color": "#ff7a00",
          "source-arrow-color": "#ff7a00",
          "target-arrow-color": "#ff7a00",
        } as never,
      },
    ],
  });

  const cleanup: Array<() => void> = [];

  if (debugEnabled) {
    const reportDrag = (event: cytoscape.EventObject) => {
      const node = event.target;
      const position = node.position();
      console.info(
        `[loop debug] ${node.id()} -> { x: ${roundGraphPosition(position.x)}, y: ${roundGraphPosition(position.y)} }`,
      );
      logNodePositions(cy, "drag");
    };

    cy.on("dragfree", "node", reportDrag);
    cleanup.push(() => cy.off("dragfree", "node", reportDrag));
    cleanup.push(bindDebugControls(container, cy));

    window.__JM_LOOP_DEBUG__ = {
      cy,
      dumpPositions: () => logNodePositions(cy, "console"),
      dumpCurves: () => logEdgeCurves(cy, "console"),
      dumpAll: () => {
        logNodePositions(cy, "console");
        logEdgeCurves(cy, "console");
      },
      fit: () => cy.fit(undefined, 18),
    };

    logNodePositions(cy, "initial");
    logEdgeCurves(cy, "initial");
  }

  return () => {
    cleanup.forEach((dispose) => dispose());
    if (window.__JM_LOOP_DEBUG__?.cy === cy) {
      delete window.__JM_LOOP_DEBUG__;
    }
    cy.destroy();
  };
}
