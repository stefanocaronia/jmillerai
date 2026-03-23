import { kindColors, memoryTypeColors, relationColors } from "./colors";

export type PublicGraphNode = {
  id: string;
  kind: string;
  label: string;
  label_en?: string | null;
  url: string | null;
  contact_kind?: string | null;
  timestamp?: string | null;
  memory_type?: string | null;
  weight?: number | null;
  importance?: number | null;
  contact_label?: string | null;
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

function cleanLabel(label: string): string {
  return label
    .replace(/\s*[–—]+\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\s,:;/.!?\-–—]+$/g, "")
    .trim();
}

function capitalizeLabel(label: string): string {
  if (!label) return label;
  return `${label.charAt(0).toLocaleUpperCase()}${label.slice(1)}`;
}

export function presentPublicNodeLabel(node: Pick<PublicGraphNode, "kind" | "label" | "label_en" | "memory_type">): string {
  const label = node.label_en || node.label;
  if (node.kind === "friend") return capitalizeLabel(cleanLabel(label));
  if (node.kind === "memory" && node.memory_type === "conversation") {
    const normalized = cleanLabel(label);
    if (/^\d+\s+chat$/i.test(normalized)) {
      return capitalizeLabel(normalized);
    }
    return "Chat";
  }
  return capitalizeLabel(cleanLabel(label));
}

export function presentPublicMemoryTypeLabel(memoryType: string | null | undefined): string {
  if (!memoryType) return "memory";
  return memoryType === "conversation" ? "chat" : memoryType;
}

export function getMemoryGraphStats(graph: PublicGraphData) {
  const connectedNodeIds = new Set(graph.edges.flatMap((edge) => [edge.source, edge.target]));
  const nodes = graph.nodes.filter(
    (node) =>
      connectedNodeIds.has(node.id) &&
      !(node.kind === "memory" && node.memory_type === "heartbeat"),
  );
  return {
    visibleNodes: nodes.length,
    visibleEdges: graph.edges.filter((edge) => {
      const allowedIds = new Set(nodes.map((n) => n.id));
      return allowedIds.has(edge.source) && allowedIds.has(edge.target);
    }).length,
  };
}

export function getMemoryGraphLegend(): MemoryGraphLegendItem[] {
  return [
    { key: "thinking", label: "Thinking", color: memoryTypeColors.thinking },
    { key: "experience", label: "Experience", color: memoryTypeColors.experience },
    { key: "reading", label: "Reading", color: memoryTypeColors.reading },
    { key: "dream", label: "Dream", color: memoryTypeColors.dream },
    { key: "chat", label: "Chat", color: memoryTypeColors.conversation },
    { key: "mail", label: "Mail", color: memoryTypeColors.mail },
    { key: "social", label: "Social", color: memoryTypeColors.social },
    { key: "belief", label: "Belief", color: memoryTypeColors.belief },
    { key: "trade", label: "Trade", color: memoryTypeColors.trade },
    { key: "summary", label: "Summary", color: memoryTypeColors.summary },
    { key: "contact", label: "Contact", color: kindColors.friend },
    { key: "book", label: "Book", color: kindColors.book },
    { key: "source", label: "Source", color: kindColors.source },
    { key: "blog-post", label: "Blog post", color: kindColors.blog_post },
    { key: "project", label: "Project", color: kindColors.project },
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
