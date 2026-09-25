import { useEffect, useRef } from 'react';
import { Box } from 'lucide-react';
import * as echarts from 'echarts';
import 'echarts-gl';
import type { SurfaceData } from '../../model/types';

export default function SurfaceChart3D({ surface }: { surface: SurfaceData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const printImageRef = useRef<HTMLImageElement>(null);
  const values = surface.z.flat();
  const zMin = Math.min(...values);
  const zMax = Math.max(...values);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !surface.x.length || !surface.y.length) return;

    const chart = echarts.init(container, undefined, { renderer: 'canvas' });
    const data = surface.z.flatMap((row, yIndex) => row.map((z, xIndex) => [surface.x[xIndex], surface.y[yIndex], z]));
    chart.setOption({
      animation: false,
      textStyle: { fontFamily: 'Varela Round' },
      tooltip: { textStyle: { fontFamily: 'Varela Round' }, formatter: (params: { value: number[] }) => `x: ${params.value[0].toPrecision(4)}<br/>y: ${params.value[1].toPrecision(4)}<br/>z: ${params.value[2].toPrecision(5)}` },
      visualMap: { show: false, min: zMin, max: zMax === zMin ? zMin + 1 : zMax, dimension: 2, inRange: { color: ['#256192', '#27a6b2', '#8cbd75', '#f4bd5e'] } },
      xAxis3D: { type: 'value', name: 'x', axisLabel: { fontFamily: 'Varela Round' }, nameTextStyle: { fontFamily: 'Varela Round' } },
      yAxis3D: { type: 'value', name: 'y', axisLabel: { fontFamily: 'Varela Round' }, nameTextStyle: { fontFamily: 'Varela Round' } },
      zAxis3D: { type: 'value', name: 'z', axisLabel: { fontFamily: 'Varela Round', formatter: (value: number) => new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 }).format(value) }, nameTextStyle: { fontFamily: 'Varela Round' } },
      grid3D: {
        boxWidth: 140, boxDepth: 140, boxHeight: 85,
        axisLine: { lineStyle: { color: '#7693a6' } },
        axisPointer: { show: true },
        viewControl: { alpha: 25, beta: 35, distance: 230, autoRotate: false },
        light: { main: { intensity: 1.2, shadow: false }, ambient: { intensity: 0.55 } },
      },
      series: [{ type: 'surface', data, dataShape: [surface.y.length, surface.x.length], shading: 'lambert', wireframe: { show: true, lineStyle: { color: 'rgba(22, 57, 80, 0.28)', width: 0.6 } } }],
    } as unknown as echarts.EChartsOption);

    let captureTimer: ReturnType<typeof setTimeout> | undefined;
    const capture = () => {
      if (printImageRef.current && !chart.isDisposed() && container.clientWidth > 0 && container.clientHeight > 0) {
        // ECharts-GL currently omits WebGL content from exports above pixelRatio 1.
        printImageRef.current.src = chart.getDataURL({ type: 'png', pixelRatio: 1, backgroundColor: '#f8fbfd' });
      }
    };
    const scheduleCapture = () => { clearTimeout(captureTimer); captureTimer = setTimeout(capture, 300); };
    chart.on('finished', scheduleCapture);
    const observer = new ResizeObserver(() => { chart.resize(); scheduleCapture(); });
    observer.observe(container);
    container.addEventListener('pointerup', scheduleCapture);
    window.addEventListener('beforeprint', capture);
    scheduleCapture();
    return () => {
      clearTimeout(captureTimer);
      observer.disconnect();
      container.removeEventListener('pointerup', scheduleCapture);
      window.removeEventListener('beforeprint', capture);
      chart.dispose();
    };
  }, [surface, zMin, zMax]);

  return <section className="surface-card" aria-label={`Gráfica tridimensional de ${surface.label}`}>
    <div className="surface-heading"><div><Box size={19}/><strong>Superficie 3D · {surface.label}</strong></div><span>{surface.x.length} × {surface.y.length} puntos</span></div>
    <div className="surface-echart" ref={containerRef} role="img" aria-label={`Superficie tridimensional interactiva, z mínimo ${zMin.toPrecision(4)} y máximo ${zMax.toPrecision(4)}`}/>
    <img className="surface-print-image" ref={printImageRef} alt={`Vista de la superficie 3D de ${surface.label} para el reporte`}/>
    <div className="surface-legend"><span>z = {zMin.toPrecision(4)}</span><span className="surface-gradient" aria-hidden="true"/><span>z = {zMax.toPrecision(4)}</span></div>
    <p className="surface-hint no-print">Arrastra para girar · usa la rueda para acercar</p>
  </section>;
}
