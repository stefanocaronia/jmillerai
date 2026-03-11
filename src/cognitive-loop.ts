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
  label: string;
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

export function mountCognitiveLoop(container: HTMLElement, loop: CognitiveLoopData): () => void {
  const cy = cytoscape({
    container,
    elements: [
      ...loop.nodes.map((node) => ({
        data: {
          id: node.id,
          label: shortenLabel(node.label),
          color: kindColors[node.kind] || "#c3c3c3",
        },
      })),
      ...loop.edges.map((edge, index) => ({
        data: {
          id: `loop-edge-${index}`,
          source: edge.source,
          target: edge.target,
          label: edge.label,
        },
      })),
    ],
    layout: {
      name: "breadthfirst",
      directed: true,
      padding: 18,
      animate: false,
      spacingFactor: 1.2,
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
          "target-arrow-color": "#666666",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          label: "data(label)",
          "font-size": "8",
          color: "#9a9a9a",
          "text-background-color": "#000000",
          "text-background-opacity": 1,
          "text-background-padding": "2",
        } as never,
      },
    ],
  });

  return () => cy.destroy();
}
