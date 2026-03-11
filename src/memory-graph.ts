import cytoscape from "cytoscape";

export type PublicGraphNode = {
  id: string;
  kind: string;
  label: string;
  url: string | null;
};

export type PublicGraphEdge = {
  source: string;
  target: string;
  relation: string;
  strength: number;
};

export type PublicGraphData = {
  schema_version: number;
  generated_at: string;
  nodes: PublicGraphNode[];
  edges: PublicGraphEdge[];
};

const kindColors: Record<string, string> = {
  memory: "#ff7a00",
  book: "#c3c3c3",
  source: "#8f8f8f",
  blog_post: "#f2f2f2",
  friend: "#9a9a9a",
};

const relationColors: Record<string, string> = {
  came_from: "#8f8f8f",
  extends: "#c3c3c3",
  contradicts: "#d14b4b",
  about: "#8f8f8f",
  inspired: "#ff7a00",
  continues: "#f2f2f2",
  relates_to: "#787878",
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

function normalizeGraph(graph: PublicGraphData) {
  const connectedNodeIds = new Set(graph.edges.flatMap((edge) => [edge.source, edge.target]));
  const nodes = graph.nodes
    .filter((node) => connectedNodeIds.has(node.id))
    .map((node) => ({
      ...node,
      label: node.kind === "friend" ? "Friend" : node.label,
    }));
  const allowedIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => allowedIds.has(edge.source) && allowedIds.has(edge.target));
  return { nodes, edges };
}

export function mountMemoryGraph(container: HTMLElement, graph: PublicGraphData): () => void {
  const normalized = normalizeGraph(graph);
  const cy = cytoscape({
    container,
    elements: [
      ...normalized.nodes.map((node) => ({
        data: {
          id: node.id,
          label: shortenLabel(node.label),
          color: kindColors[node.kind] || "#c3c3c3",
        },
      })),
      ...normalized.edges.map((edge, index) => ({
        data: {
          id: `edge-${index}`,
          source: edge.source,
          target: edge.target,
          edgeColor: relationColors[edge.relation] || "#787878",
          strength: edge.strength,
        },
      })),
    ],
    layout: {
      name: "cose",
      animate: false,
      fit: true,
      padding: 12,
    },
    style: [
      {
        selector: "node",
        style: {
          "background-color": "data(color)",
          label: "data(label)",
          color: "#f2f2f2",
          "font-size": 9,
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
          width: "mapData(strength, 1, 3, 1, 3)",
          "line-color": "data(edgeColor)",
          "curve-style": "bezier",
          opacity: 0.9,
        },
      },
    ],
  });

  return () => cy.destroy();
}
