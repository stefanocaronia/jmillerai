import cytoscape from "cytoscape";

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

const kindColors: Record<string, string> = {
  control: "#ff7a00",
  state: "#f2f2f2",
  module: "#46d9ff",
  input: "#ff5ea8",
  output: "#ff6b4a",
  operation: "#8f8f8f",
};

const GRAPH_MEMORY_NODE_ID = "memory-hub";

const graphPositions: Record<string, { x: number; y: number }> = {
  heartbeat: { x: 420, y: 44 },
  experience: { x: 168, y: 132 },
  conversation: { x: 76, y: 270 },
  mail: { x: 164, y: 432 },
  [GRAPH_MEMORY_NODE_ID]: { x: 420, y: 260 },
  thinking: { x: 672, y: 132 },
  reading: { x: 760, y: 270 },
  dream: { x: 672, y: 432 },
  blog: { x: 420, y: 540 },
  trading: { x: 760, y: 500 },
};

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

  return node.id;
}

function graphLabel(node: CognitiveLoopNode): string {
  if (node.id === "memory" || node.id === "short-state") {
    return "MEMORY";
  }

  return shortenLabel(node.label);
}

export function projectLoopGraph(loop: CognitiveLoopData): {
  nodes: Array<{ id: string; label: string; color: string; position: { x: number; y: number } }>;
  edges: Array<{
    source: string;
    target: string;
    sourceArrow: "none" | "triangle";
    targetArrow: "none" | "triangle";
    curveDistance: number;
  }>;
} {
  const nodeMap = new Map<string, { id: string; label: string; color: string; position: { x: number; y: number } }>();

  for (const node of loop.nodes) {
    const id = graphNodeId(node);
    if (nodeMap.has(id)) {
      continue;
    }

    nodeMap.set(id, {
      id,
      label: graphLabel(node),
      color: kindColors[node.kind] || "#c3c3c3",
      position: graphPositions[id] ?? { x: 420, y: 260 },
    });
  }

  const orientedEdges = loop.edges
    .map((edge) => ({
      source: edge.source === "memory" || edge.source === "short-state" ? GRAPH_MEMORY_NODE_ID : edge.source,
      target: edge.target === "memory" || edge.target === "short-state" ? GRAPH_MEMORY_NODE_ID : edge.target,
    }))
    .filter((edge) => edge.source !== edge.target);

  const edgeMap = new Map<
    string,
    {
      source: string;
      target: string;
      sourceArrow: "none" | "triangle";
      targetArrow: "none" | "triangle";
      curveDistance: number;
    }
  >();

  for (const edge of orientedEdges) {
    const pairKey = [edge.source, edge.target].sort().join("::");
    const existing = edgeMap.get(pairKey);
    if (!existing) {
      edgeMap.set(pairKey, {
        source: edge.source,
        target: edge.target,
        sourceArrow: "none",
        targetArrow: "triangle",
        curveDistance: edge.source === GRAPH_MEMORY_NODE_ID || edge.target === GRAPH_MEMORY_NODE_ID ? 26 : 38,
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

  const cy = cytoscape({
    container,
    elements: [
      ...graph.nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          color: node.color,
        },
        position: node.position,
      })),
      ...graph.edges.map((edge, index) => ({
        data: {
          id: `loop-edge-${index}`,
          source: edge.source,
          target: edge.target,
          sourceArrow: edge.sourceArrow,
          targetArrow: edge.targetArrow,
          curveDistance: edge.curveDistance,
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
          "control-point-weights": 0.5,
          "source-arrow-shape": "data(sourceArrow)",
          "source-arrow-color": "#666666",
          "target-arrow-shape": "data(targetArrow)",
          "target-arrow-color": "#666666",
        } as never,
      },
    ],
  });

  return () => cy.destroy();
}
