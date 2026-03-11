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

function dedupeEdges(edges: CognitiveLoopEdge[]): CognitiveLoopEdge[] {
  const seen = new Set<string>();
  const unique: CognitiveLoopEdge[] = [];

  for (const edge of edges) {
    const pair = [edge.source, edge.target].sort().join("::");
    if (seen.has(pair)) {
      continue;
    }
    seen.add(pair);
    unique.push(edge);
  }

  return unique;
}

export function projectLoopGraph(loop: CognitiveLoopData): { nodes: Array<{ id: string; label: string; color: string }>; edges: CognitiveLoopEdge[] } {
  const nodeMap = new Map<string, { id: string; label: string; color: string }>();

  for (const node of loop.nodes) {
    const id = graphNodeId(node);
    if (nodeMap.has(id)) {
      continue;
    }

    nodeMap.set(id, {
      id,
      label: graphLabel(node),
      color: kindColors[node.kind] || "#c3c3c3",
    });
  }

  const edges = dedupeEdges(
    loop.edges
      .map((edge) => ({
        source: edge.source === "memory" || edge.source === "short-state" ? GRAPH_MEMORY_NODE_ID : edge.source,
        target: edge.target === "memory" || edge.target === "short-state" ? GRAPH_MEMORY_NODE_ID : edge.target,
      }))
      .filter((edge) => edge.source !== edge.target),
  );

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
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
      })),
      ...graph.edges.map((edge, index) => ({
        data: {
          id: `loop-edge-${index}`,
          source: edge.source,
          target: edge.target,
        },
      })),
    ],
    layout: {
      name: "breadthfirst",
      directed: false,
      padding: 18,
      animate: false,
      spacingFactor: 1.28,
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
          "curve-style": "straight",
        } as never,
      },
    ],
  });

  return () => cy.destroy();
}
