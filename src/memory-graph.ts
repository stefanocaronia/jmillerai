import cytoscape from "cytoscape";

export type PublicGraphNode = {
  id: string;
  kind: string;
  label: string;
  url: string | null;
  timestamp?: string | null;
  memory_type?: string | null;
  importance?: number | null;
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
  extends: "#46d9ff",
  contradicts: "#d14b4b",
  about: "#60a5fa",
  inspired: "#ff7a00",
  continues: "#f2f2f2",
  relates_to: "#b07cff",
};

const PUBLIC_MIN_NODE_DISTANCE = 84;

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

export function presentPublicNodeLabel(node: Pick<PublicGraphNode, "kind" | "label" | "memory_type">): string {
  if (node.kind === "friend") return "Contact";
  if (node.kind === "memory" && node.memory_type === "conversation") {
    const normalized = cleanLabel(node.label);
    if (/^\d+\s+chat$/i.test(normalized)) {
      return capitalizeLabel(normalized);
    }
    return "Chat";
  }
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
  return trimmed;
}

function nodeSizeForImportance(node: PublicGraphNode): number {
  const raw = Number(node.importance ?? 5);
  const importance = Number.isFinite(raw) ? Math.max(1, Math.min(10, raw)) : 5;
  return 16 + (importance - 1) * 2.6;
}

function enforceNodeSpacing(cy: cytoscape.Core, minDistance: number) {
  const nodes = cy.nodes().toArray();
  if (nodes.length < 2) return;

  for (let iteration = 0; iteration < 120; iteration += 1) {
    let moved = false;

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const left = nodes[i];
        const right = nodes[j];
        const leftPos = left.position();
        const rightPos = right.position();
        let dx = rightPos.x - leftPos.x;
        let dy = rightPos.y - leftPos.y;
        let distance = Math.hypot(dx, dy);

        if (distance === 0) {
          const seed = ((i + 1) * 37 + (j + 1) * 17) % 360;
          const angle = (seed * Math.PI) / 180;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distance = 1;
        }

        if (distance >= minDistance) continue;
        const shift = ((minDistance - distance) / 2) * 0.55;
        const nx = dx / distance;
        const ny = dy / distance;

        left.position({
          x: leftPos.x - nx * shift,
          y: leftPos.y - ny * shift,
        });
        right.position({
          x: rightPos.x + nx * shift,
          y: rightPos.y + ny * shift,
        });
        moved = true;
      }
    }

    if (!moved) break;
  }

  cy.fit(undefined, 30);
}

function collapseChatContactClusters(nodes: PublicGraphNode[], edges: PublicGraphEdge[]) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const degrees = new Map<string, number>();
  for (const edge of edges) {
    degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
  }

  type ChatCluster = {
    contactId: string;
    relation: string;
    direction: "chat-to-contact" | "contact-to-chat";
    chatIds: string[];
    strengths: number[];
    importances: number[];
  };

  const clusters = new Map<string, ChatCluster>();

  for (const edge of edges) {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    if (!sourceNode || !targetNode) continue;

    let chatNode: PublicGraphNode | null = null;
    let contactNode: PublicGraphNode | null = null;
    let direction: ChatCluster["direction"] | null = null;

    if (sourceNode.kind === "memory" && sourceNode.memory_type === "conversation" && targetNode.kind === "friend") {
      chatNode = sourceNode;
      contactNode = targetNode;
      direction = "chat-to-contact";
    } else if (
      targetNode.kind === "memory" &&
      targetNode.memory_type === "conversation" &&
      sourceNode.kind === "friend"
    ) {
      chatNode = targetNode;
      contactNode = sourceNode;
      direction = "contact-to-chat";
    }

    if (!chatNode || !contactNode || !direction) continue;
    if ((degrees.get(chatNode.id) ?? 0) !== 1) continue;

    const clusterKey = [contactNode.id, edge.relation, direction].join("::");
    const cluster = clusters.get(clusterKey) ?? {
      contactId: contactNode.id,
      relation: edge.relation,
      direction,
      chatIds: [],
      strengths: [],
      importances: [],
    };
    cluster.chatIds.push(chatNode.id);
    cluster.strengths.push(edge.strength);
    cluster.importances.push(Number(chatNode.importance ?? 5));
    clusters.set(clusterKey, cluster);
  }

  const collapsedClusters = Array.from(clusters.values()).filter((cluster) => cluster.chatIds.length >= 2);
  if (collapsedClusters.length === 0) {
    return { nodes, edges };
  }

  const removedChatIds = new Set(collapsedClusters.flatMap((cluster) => cluster.chatIds));
  const collapsedNodes = nodes.filter((node) => !removedChatIds.has(node.id));
  const collapsedEdges = edges.filter(
    (edge) => !removedChatIds.has(edge.source) && !removedChatIds.has(edge.target),
  );

  for (const cluster of collapsedClusters) {
    const clusterId = `chat-group:${cluster.contactId}:${cluster.relation}:${cluster.direction}`;
    const averageStrength =
      cluster.strengths.reduce((sum, value) => sum + value, 0) / cluster.strengths.length;
    const averageImportance =
      cluster.importances.reduce((sum, value) => sum + value, 0) / cluster.importances.length;

    collapsedNodes.push({
      id: clusterId,
      kind: "memory",
      label: `${cluster.chatIds.length} Chat`,
      url: null,
      memory_type: "conversation",
      importance: Math.max(5, Math.round(averageImportance)),
    });

    collapsedEdges.push({
      source: cluster.direction === "chat-to-contact" ? clusterId : cluster.contactId,
      target: cluster.direction === "chat-to-contact" ? cluster.contactId : clusterId,
      relation: cluster.relation,
      strength: Math.max(1, Math.min(3, Math.round(averageStrength))),
    });
  }

  return { nodes: collapsedNodes, edges: collapsedEdges };
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
  return collapseChatContactClusters(nodes, edges);
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
          size: nodeSizeForImportance(node),
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
      padding: 36,
      nodeRepulsion: 240000,
      idealEdgeLength: 112,
      componentSpacing: 138,
      nodeOverlap: 28,
    },
    style: [
      {
        selector: "node",
        style: {
          "background-color": "data(color)",
          label: "data(label)",
          color: "#f2f2f2",
          "font-size": 11,
          "text-wrap": "wrap",
          "text-max-width": "144px",
          "text-valign": "bottom",
          "text-margin-y": 10,
          width: "data(size)",
          height: "data(size)",
          "border-width": 0,
        },
      },
      {
        selector: "edge",
        style: {
          width: "mapData(strength, 1, 3, 2, 4.8)",
          "line-color": "data(edgeColor)",
          "curve-style": "bezier",
          "target-arrow-shape": "triangle",
          "target-arrow-color": "data(edgeColor)",
          "arrow-scale": 1.3,
          opacity: 0.9,
        },
      },
    ],
  });
  enforceNodeSpacing(cy, PUBLIC_MIN_NODE_DISTANCE);

  return () => cy.destroy();
}
