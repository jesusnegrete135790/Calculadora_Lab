import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { ChartData } from '../../model/types';

export default function EChart2D({ labels, values, label, shadeThroughIndex, kind }: ChartData) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isBar = kind === 'bar' || (!kind && values.length <= 30 && shadeThroughIndex === undefined);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !values.length) return;

    // SVG stays crisp in the browser's print/PDF output.
    const chart = echarts.init(container, undefined, { renderer: 'svg' });
    const shaded = shadeThroughIndex === undefined ? [] : [{
      name: 'Área acumulada',
      type: 'line' as const,
      data: values.map((value, index) => index <= shadeThroughIndex ? value : null),
      showSymbol: false,
      silent: true,
      lineStyle: { opacity: 0 },
      areaStyle: { color: 'rgba(62, 151, 177, 0.28)' },
      z: 1,
    }];
    chart.setOption({
      animation: false,
      aria: { enabled: true, description: `Gráfica de ${label}` },
      color: ['#2785a7'],
      textStyle: { fontFamily: 'Varela Round' },
      grid: { left: 62, right: 18, top: 20, bottom: 53, containLabel: false },
      tooltip: { trigger: 'axis', textStyle: { fontFamily: 'Varela Round' }, valueFormatter: (value: unknown) => typeof value === 'number' ? Number(value.toPrecision(6)).toLocaleString('es-MX') : String(value ?? '') },
      xAxis: { type: 'category', data: labels, boundaryGap: isBar, axisLine: { lineStyle: { color: '#a9bdca' } }, axisTick: { show: false }, axisLabel: { fontFamily: 'Varela Round', color: '#627b8c', fontSize: 11, hideOverlap: true, rotate: labels.some((item) => item.length > 12) ? 20 : 0 } },
      yAxis: { type: 'value', scale: !isBar, splitLine: { lineStyle: { color: '#e8eef2' } }, axisLabel: { fontFamily: 'Varela Round', color: '#627b8c', fontSize: 11, formatter: (value: number) => Number(value.toPrecision(3)).toLocaleString('es-MX') } },
      series: [
        ...shaded,
        isBar ? { name: label, type: 'bar' as const, data: values, barMaxWidth: 42, itemStyle: { color: '#4e9eb8', borderRadius: [4, 4, 0, 0] }, emphasis: { itemStyle: { color: '#1d688d' } } }
          : { name: label, type: 'line' as const, data: values, smooth: values.length > 6, showSymbol: values.length <= 16, symbolSize: 6, lineStyle: { width: 3 }, itemStyle: { color: '#2785a7' }, z: 2 },
      ],
    });

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(container);
    return () => { observer.disconnect(); chart.dispose(); };
  }, [labels, values, label, shadeThroughIndex, isBar]);

  if (values.length < 2) return null;
  return <div className="chart-box" role="img" aria-label={`Gráfica de ${label}; valores desde ${labels[0]} hasta ${labels.at(-1)}${shadeThroughIndex !== undefined ? ', con área acumulada sombreada' : ''}`}>
    <div className="chart-heading"><strong>{label}</strong><span>{labels[0]} — {labels.at(-1)}</span></div>
    <div className="echart-2d" ref={containerRef} aria-hidden="true"/>
  </div>;
}
