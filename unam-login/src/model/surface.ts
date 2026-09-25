import type { SurfaceData } from './types';

export function createSurface(
  evaluate: (scope: Record<string, number>) => number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  resolution = 25,
  label = 'f(x,y)',
): SurfaceData {
  if (![xMin, xMax, yMin, yMax].every(Number.isFinite) || xMin >= xMax || yMin >= yMax) {
    throw new Error('Los límites de la superficie deben formar intervalos crecientes.');
  }
  if (!Number.isInteger(resolution) || resolution < 3 || resolution > 41) {
    throw new Error('La resolución 3D debe estar entre 3 y 41 puntos por eje.');
  }
  const x = Array.from({ length: resolution }, (_, index) => xMin + index * (xMax - xMin) / (resolution - 1));
  const y = Array.from({ length: resolution }, (_, index) => yMin + index * (yMax - yMin) / (resolution - 1));
  const z = y.map((yv) => x.map((xv) => {
    const value = evaluate({ x: xv, y: yv });
    if (!Number.isFinite(value) || Math.abs(value) > 1e9) throw new Error('La función no es finita en todo el dominio seleccionado.');
    return value;
  }));
  return { x, y, z, label };
}
