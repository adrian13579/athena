import React, { useEffect, useRef } from 'react';
import type { Study } from './main';

type GraphNode = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  studyIndex: number;
};

type Edge = [number, number];

export default function KnowledgeGraph({
  studies,
  onSelect,
}: {
  studies: Study[];
  onSelect: (study: Study) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectRef = useRef(onSelect);
  const studiesRef = useRef(studies);
  selectRef.current = onSelect;
  studiesRef.current = studies;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const graphCanvas = canvas;
    const drawingContext = context;

    const count = studiesRef.current.length;
    const nodes: GraphNode[] = Array.from({ length: count }, (_, index) => {
      const angle = (index / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2;
      const spread = 135 + (index % 3) * 28;
      return {
        x: Math.cos(angle) * spread,
        y: Math.sin(angle) * spread,
        vx: Math.sin(index * 2.3) * 0.3,
        vy: Math.cos(index * 1.7) * 0.3,
        radius: 8 + Math.min(5, Math.sqrt(studiesRef.current[index].sources)),
        studyIndex: index,
      };
    });

    const edgeSet = new Set<string>();
    const edges: Edge[] = [];
    nodes.forEach((_, index) => {
      [1, ...(index % 2 === 0 ? [2] : [])].forEach((step) => {
        const next = (index + step) % count;
        if (next === index) return;
        const key = [index, next].sort((a, b) => a - b).join(':');
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push([index, next]);
        }
      });
    });

    const view = { width: 0, height: 0, dpr: 1, panX: 0, panY: 0, zoom: 1 };
    const resizeObserver = new ResizeObserver(() => {
      const bounds = graphCanvas.getBoundingClientRect();
      view.width = bounds.width;
      view.height = bounds.height;
      view.dpr = Math.min(window.devicePixelRatio || 1, 2);
      graphCanvas.width = Math.round(view.width * view.dpr);
      graphCanvas.height = Math.round(view.height * view.dpr);
    });
    resizeObserver.observe(graphCanvas);

    let hovered = -1;
    let dragged = -1;
    let pointerDown = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;
    let animationId = 0;
    let previousTime = 0;

    function toGraphPoint(clientX: number, clientY: number) {
      const bounds = graphCanvas.getBoundingClientRect();
      return {
        x: (clientX - bounds.left - view.width / 2 - view.panX) / view.zoom,
        y: (clientY - bounds.top - view.height / 2 - view.panY) / view.zoom,
      };
    }

    function nodeAt(clientX: number, clientY: number) {
      const point = toGraphPoint(clientX, clientY);
      for (let index = nodes.length - 1; index >= 0; index -= 1) {
        const node = nodes[index];
        if (Math.hypot(point.x - node.x, point.y - node.y) < node.radius + 7 / view.zoom) {
          return index;
        }
      }
      return -1;
    }

    function handlePointerDown(event: PointerEvent) {
      pointerDown = true;
      moved = false;
      lastX = event.clientX;
      lastY = event.clientY;
      dragged = nodeAt(event.clientX, event.clientY);
      graphCanvas.setPointerCapture(event.pointerId);
      graphCanvas.style.cursor = dragged < 0 ? 'grabbing' : 'grabbing';
    }

    function handlePointerMove(event: PointerEvent) {
      if (pointerDown) {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
        if (dragged >= 0) {
          const point = toGraphPoint(event.clientX, event.clientY);
          nodes[dragged].x = point.x;
          nodes[dragged].y = point.y;
          nodes[dragged].vx = 0;
          nodes[dragged].vy = 0;
        } else {
          view.panX += dx;
          view.panY += dy;
        }
        lastX = event.clientX;
        lastY = event.clientY;
        return;
      }
      hovered = nodeAt(event.clientX, event.clientY);
      graphCanvas.style.cursor = hovered >= 0 ? 'pointer' : 'grab';
    }

    function handlePointerUp(event: PointerEvent) {
      if (pointerDown && !moved && dragged >= 0) {
        const study = studiesRef.current[nodes[dragged].studyIndex];
        if (study) selectRef.current(study);
      }
      pointerDown = false;
      dragged = -1;
      graphCanvas.releasePointerCapture(event.pointerId);
      graphCanvas.style.cursor = hovered >= 0 ? 'pointer' : 'grab';
    }

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      const before = toGraphPoint(event.clientX, event.clientY);
      view.zoom = Math.max(0.45, Math.min(3.5, view.zoom * Math.exp(-event.deltaY * 0.001)));
      const after = toGraphPoint(event.clientX, event.clientY);
      view.panX += (after.x - before.x) * view.zoom;
      view.panY += (after.y - before.y) * view.zoom;
    }

    function simulate(delta: number) {
      const step = Math.min(delta / 16.67, 1.5);
      const idealLength = Math.max(110, Math.min(175, Math.min(view.width, view.height) * 0.22));

      for (let a = 0; a < nodes.length; a += 1) {
        const first = nodes[a];
        let fx = -first.x * 0.0009;
        let fy = -first.y * 0.0009;

        for (let b = a + 1; b < nodes.length; b += 1) {
          const second = nodes[b];
          const dx = first.x - second.x;
          const dy = first.y - second.y;
          const distanceSquared = Math.max(dx * dx + dy * dy, 100);
          const distance = Math.sqrt(distanceSquared);
          const repulsion = 7800 / distanceSquared;
          const pushX = (dx / distance) * repulsion;
          const pushY = (dy / distance) * repulsion;
          fx += pushX;
          fy += pushY;
        }

        for (const [from, to] of edges) {
          if (from !== a && to !== a) continue;
          const other = nodes[from === a ? to : from];
          const dx = other.x - first.x;
          const dy = other.y - first.y;
          const distance = Math.max(Math.hypot(dx, dy), 1);
          const pull = (distance - idealLength) * 0.0032;
          fx += (dx / distance) * pull;
          fy += (dy / distance) * pull;
        }

        if (dragged !== a) {
          first.vx = (first.vx + fx * step) * 0.93;
          first.vy = (first.vy + fy * step) * 0.93;
          first.x += first.vx * step;
          first.y += first.vy * step;
        }
      }
    }

    function draw(time: number) {
      animationId = requestAnimationFrame(draw);
      const delta = previousTime ? time - previousTime : 16.67;
      previousTime = time;
      simulate(delta);

      drawingContext!.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      drawingContext!.clearRect(0, 0, view.width, view.height);
      drawingContext!.save();
      drawingContext!.translate(view.width / 2 + view.panX, view.height / 2 + view.panY);
      drawingContext!.scale(view.zoom, view.zoom);

      drawingContext!.beginPath();
      edges.forEach(([from, to]) => {
        drawingContext!.moveTo(nodes[from].x, nodes[from].y);
        drawingContext!.lineTo(nodes[to].x, nodes[to].y);
      });
      drawingContext!.strokeStyle = '#b8b8b8';
      drawingContext!.lineWidth = 1.25 / view.zoom;
      drawingContext!.stroke();

      nodes.forEach((node, index) => {
        const active = index === hovered || index === dragged;
        drawingContext!.beginPath();
        drawingContext!.arc(node.x, node.y, node.radius + (active ? 2 : 0), 0, Math.PI * 2);
        drawingContext!.fillStyle = active ? '#444' : '#111';
        drawingContext!.shadowColor = active ? '#00000033' : 'transparent';
        drawingContext!.shadowBlur = active ? 12 / view.zoom : 0;
        drawingContext!.fill();
        drawingContext!.shadowBlur = 0;

        const title = studiesRef.current[node.studyIndex]?.title ?? '';
        drawingContext!.font = `${active ? 500 : 400} ${12 / view.zoom}px system-ui, sans-serif`;
        drawingContext!.textAlign = 'center';
        drawingContext!.textBaseline = 'top';
        drawingContext!.fillStyle = active ? '#111' : '#555';
        drawingContext!.fillText(title, node.x, node.y + node.radius + 9 / view.zoom);
      });
      drawingContext!.restore();
    }

    graphCanvas.addEventListener('pointerdown', handlePointerDown);
    graphCanvas.addEventListener('pointermove', handlePointerMove);
    graphCanvas.addEventListener('pointerup', handlePointerUp);
    graphCanvas.addEventListener('pointercancel', handlePointerUp);
    graphCanvas.addEventListener('wheel', handleWheel, { passive: false });
    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      graphCanvas.removeEventListener('pointerdown', handlePointerDown);
      graphCanvas.removeEventListener('pointermove', handlePointerMove);
      graphCanvas.removeEventListener('pointerup', handlePointerUp);
      graphCanvas.removeEventListener('pointercancel', handlePointerUp);
      graphCanvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div className="graph-scene">
      <canvas className="graph" ref={canvasRef} aria-label="Interactive 2D knowledge graph" />
      <span className="graph-hint">
        Drag to move nodes � Drag empty space to pan � Scroll to zoom
      </span>
    </div>
  );
}
