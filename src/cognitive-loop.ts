import cytoscape, { type Core } from "cytoscape";
import {
  type CognitiveLoopData,
  graphPositions,
  graphEdgeCurves,
  isLoopDebugEnabled,
  projectLoopGraph,
} from "./cognitive-loop-data";


const DEFAULT_CURVE_WEIGHT = 0.5;

function formatGraphKey(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : `"${key}"`;
}

function roundGraphPosition(value: number): number {
  return Math.round(value);
}

function canonicalEdgeKey(source: string, target: string): string {
  return [source, target].sort().join("::");
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

  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  let selectedEdgeId: string | null = null;

  if (status) {
    status.textContent = "Debug active. Drag nodes to log positions. Click an edge to tune and log its curve.";
  }

  const dumpPositions = () => logNodePositions(cy, "manual");
  const dumpCurves = () => logEdgeCurves(cy, "manual");
  const fitGraph = () => {
    cy.fit(undefined, 18);
    if (isMobile) {
      const containerWidth = container.clientWidth;
      const h = Math.min(containerWidth, 500);
      container.style.minHeight = `${h}px`;
      container.style.height = `${h}px`;
      cy.resize();
      cy.fit(undefined, 18);
    }
  };
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
  const updateSelectedEdge = (updater: (distance: number, weight: number) => { distance: number; weight?: number }) => {
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

export function mountCognitiveLoop(container: HTMLElement, loop: CognitiveLoopData): () => void {
  const graph = projectLoopGraph(loop);
  const debugEnabled = isLoopDebugEnabled();
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  const cy = cytoscape({
    container,
    userPanningEnabled: !isMobile,
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
