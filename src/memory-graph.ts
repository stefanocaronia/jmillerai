import cytoscape from "cytoscape";

export type PublicGraphNode = {
  id: string;
  kind: string;
  label: string;
  url: string | null;
  timestamp?: string | null;
  memory_type?: string | null;
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

export type MemoryGraphLegendItem = {
  key: string;
  label: string;
  color: string;
};

export type MemoryGraphEdgeLegendItem = {
  key: string;
  label: string;
  color: string;
};

const kindColors: Record<string, string> = {
  memory: "#f2f2f2",
  book: "#7dd3fc",
  source: "#f59e0b",
  blog_post: "#f97316",
  friend: "#34d399",
};

const memoryTypeColors: Record<string, string> = {
  thinking: "#46d9ff",
  experience: "#ffb000",
  reading: "#f4e409",
  dream: "#b07cff",
  conversation: "#ff5ea8",
  heartbeat: "#ff7a00",
  belief: "#6ee7b7",
  trade: "#60a5fa",
  summary: "#f9a8d4",
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

function cleanLabel(label: string): string {
  return label
    .trim()
    .replace(/[\s,:;/.!?\-–—]+$/g, "")
    .trim();
}

function capitalizeLabel(label: string): string {
  if (!label) return label;
  return `${label.charAt(0).toLocaleUpperCase()}${label.slice(1)}`;
}

export function presentPublicNodeLabel(node: Pick<PublicGraphNode, "kind" | "label" | "memory_type">): string {
  if (node.kind === "friend") return "Contact";
  if (node.kind === "memory" && node.memory_type === "conversation") return "Chat";
  return capitalizeLabel(cleanLabel(node.label));
}

export function presentPublicMemoryTypeLabel(memoryType: string | null | undefined): string {
  if (!memoryType) return "memory";
  return memoryType === "conversation" ? "chat" : memoryType;
}

function shortenLabel(label: string): string {
  const maxChars = 22;
  const normalized = cleanLabel(label);
  if (normalized.length <= maxChars) {
    return normalized;
  }
  const slice = normalized.slice(0, maxChars + 1);
  const boundary = Math.max(
    slice.lastIndexOf(" "),
    slice.lastIndexOf("/"),
    slice.lastIndexOf("-"),
    slice.lastIndexOf("–"),
    slice.lastIndexOf("—"),
    slice.lastIndexOf(","),
    slice.lastIndexOf(";"),
    slice.lastIndexOf(":"),
  );
  let trimmed = boundary >= 8 ? slice.slice(0, boundary) : slice;
  if (boundary < 8) {
    const withoutPartialWord = trimmed.replace(/[^\s/,:;.!?\-–—]+$/g, "");
    if (cleanLabel(withoutPartialWord).length >= 8) {
      trimmed = withoutPartialWord;
    } else {
      trimmed = normalized.slice(0, maxChars);
    }
  }
  trimmed = cleanLabel(trimmed);
  return `${trimmed}…`;
}

function normalizeGraph(graph: PublicGraphData) {
  const connectedNodeIds = new Set(graph.edges.flatMap((edge) => [edge.source, edge.target]));
  const nodes = graph.nodes
    .filter(
      (node) =>
        connectedNodeIds.has(node.id) &&
        !(node.kind === "memory" && node.memory_type === "heartbeat"),
    )
    .map((node) => ({
      ...node,
      label: presentPublicNodeLabel(node),
    }));
  const allowedIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => allowedIds.has(edge.source) && allowedIds.has(edge.target));
  return { nodes, edges };
}

export function getMemoryGraphStats(graph: PublicGraphData) {
  const normalized = normalizeGraph(graph);
  return {
    visibleNodes: normalized.nodes.length,
    visibleEdges: normalized.edges.length,
  };
}

export function getMemoryGraphLegend(): MemoryGraphLegendItem[] {
  return [
    { key: "thinking", label: "Thinking", color: memoryTypeColors.thinking },
    { key: "experience", label: "Experience", color: memoryTypeColors.experience },
    { key: "reading", label: "Reading", color: memoryTypeColors.reading },
    { key: "dream", label: "Dream", color: memoryTypeColors.dream },
    { key: "chat", label: "Chat", color: memoryTypeColors.conversation },
    { key: "belief", label: "Belief", color: memoryTypeColors.belief },
    { key: "trade", label: "Trade", color: memoryTypeColors.trade },
    { key: "summary", label: "Summary", color: memoryTypeColors.summary },
    { key: "contact", label: "Contact", color: kindColors.friend },
    { key: "book", label: "Book", color: kindColors.book },
    { key: "source", label: "Source", color: kindColors.source },
    { key: "blog-post", label: "Blog post", color: kindColors.blog_post },
  ];
}

export function getMemoryGraphEdgeLegend(): MemoryGraphEdgeLegendItem[] {
  return [
    { key: "came_from", label: "Came from", color: relationColors.came_from },
    { key: "extends", label: "Extends", color: relationColors.extends },
    { key: "inspired", label: "Inspired", color: relationColors.inspired },
    { key: "about", label: "About", color: relationColors.about },
    { key: "continues", label: "Continues", color: relationColors.continues },
    { key: "relates_to", label: "Relates to", color: relationColors.relates_to },
    { key: "contradicts", label: "Contradicts", color: relationColors.contradicts },
  ];
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
          color:
            (node.kind === "memory" && node.memory_type
              ? memoryTypeColors[node.memory_type.toLowerCase()]
              : undefined) ||
            kindColors[node.kind] ||
            "#c3c3c3",
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
          "target-arrow-shape": "triangle",
          "target-arrow-color": "data(edgeColor)",
          "arrow-scale": 0.85,
          opacity: 0.9,
        },
      },
    ],
  });

  return () => cy.destroy();
}
