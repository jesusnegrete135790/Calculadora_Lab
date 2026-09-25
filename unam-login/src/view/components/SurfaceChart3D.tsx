import { useMemo, useState } from 'react';
import { Box, Rotate3D } from 'lucide-react';
import type { SurfaceData } from '../../model/types';

type Projected = { x: number; y: number; depth: number };

export default function SurfaceChart3D({ surface }: { surface: SurfaceData }) {
  const [rotation, setRotation] = useState(38);
  const [elevation, setElevation] = useState(43);
  const geometry = useMemo(() => {
    const values = surface.z.flat();
    const zMin = Math.min(...values), zMax = Math.max(...values);
    const xMin = surface.x[0], xMax = surface.x.at(-1)!;
    const yMin = surface.y[0], yMax = surface.y.at(-1)!;
    const azimuth = rotation * Math.PI / 180;
    const pitch = elevation * Math.PI / 180;
    function project(x: number, y: number, z: number): Projected {
      const nx = 2 * (x - xMin) / (xMax - xMin) - 1;
      const ny = 2 * (y - yMin) / (yMax - yMin) - 1;
      const nz = zMax === zMin ? 0 : 2 * (z - zMin) / (zMax - zMin) - 1;
      const rx = nx * Math.cos(azimuth) - ny * Math.sin(azimuth);
      const ry = nx * Math.sin(azimuth) + ny * Math.cos(azimuth);
      return { x: 320 + rx * 155, y: 210 + ry * 118 * Math.sin(pitch) - nz * 115 * Math.cos(pitch), depth: ry * Math.cos(pitch) + nz * Math.sin(pitch) };
    }
    const cells = [];
    for (let row = 0; row < surface.y.length - 1; row++) for (let col = 0; col < surface.x.length - 1; col++) {
      const corners = [
        project(surface.x[col], surface.y[row], surface.z[row][col]),
        project(surface.x[col + 1], surface.y[row], surface.z[row][col + 1]),
        project(surface.x[col + 1], surface.y[row + 1], surface.z[row + 1][col + 1]),
        project(surface.x[col], surface.y[row + 1], surface.z[row + 1][col]),
      ];
      const average = (surface.z[row][col] + surface.z[row][col + 1] + surface.z[row + 1][col + 1] + surface.z[row + 1][col]) / 4;
      const ratio = zMax === zMin ? .5 : (average - zMin) / (zMax - zMin);
      cells.push({ key: `${row}-${col}`, points: corners.map((point) => `${point.x},${point.y}`).join(' '), depth: corners.reduce((sum, point) => sum + point.depth, 0) / 4, color: `hsl(${215 - ratio * 155} 64% ${48 + ratio * 12}%)`, x: (surface.x[col] + surface.x[col + 1]) / 2, y: (surface.y[row] + surface.y[row + 1]) / 2, z: average });
    }
    cells.sort((left, right) => left.depth - right.depth);
    const origin = project(xMin, yMin, zMin);
    const xEnd = project(xMax, yMin, zMin);
    const yEnd = project(xMin, yMax, zMin);
    const zEnd = project(xMin, yMin, zMax);
    return { cells, axes: [{ label: 'x', from: origin, to: xEnd }, { label: 'y', from: origin, to: yEnd }, { label: 'z', from: origin, to: zEnd }], zMin, zMax };
  }, [surface, rotation, elevation]);

  return <section className="surface-card" aria-label={`Gráfica tridimensional de ${surface.label}`}>
    <div className="surface-heading"><div><Box size={19}/><strong>Superficie 3D · {surface.label}</strong></div><span>{surface.x.length} × {surface.y.length} puntos</span></div>
    <svg className="surface-svg" viewBox="0 0 640 420" role="img" aria-label={`Superficie tridimensional, z mínimo ${geometry.zMin.toPrecision(4)} y máximo ${geometry.zMax.toPrecision(4)}`}>
      <rect width="640" height="420" fill="#f8fbfd"/>
      {geometry.axes.map((axis) => <g key={axis.label}><line x1={axis.from.x} y1={axis.from.y} x2={axis.to.x} y2={axis.to.y} className="surface-axis"/><text x={axis.to.x + 7} y={axis.to.y - 5} className="surface-axis-label">{axis.label}</text></g>)}
      {geometry.cells.map((cell) => <polygon key={cell.key} points={cell.points} fill={cell.color} className="surface-polygon"><title>{`x=${cell.x.toFixed(2)}, y=${cell.y.toFixed(2)}, z=${cell.z.toFixed(3)}`}</title></polygon>)}
    </svg>
    <div className="surface-legend"><span>z = {geometry.zMin.toPrecision(4)}</span><span className="surface-gradient" aria-hidden="true"/><span>z = {geometry.zMax.toPrecision(4)}</span></div>
    <div className="surface-controls no-print"><Rotate3D size={17}/><label>Giro <input type="range" min="-180" max="180" value={rotation} onChange={(event) => setRotation(Number(event.target.value))}/></label><label>Elevación <input type="range" min="15" max="80" value={elevation} onChange={(event) => setElevation(Number(event.target.value))}/></label></div>
  </section>;
}
