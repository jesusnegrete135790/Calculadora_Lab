import type { ChangeEvent } from 'react';

export function NumberField({ label, value, onChange, hint, step = 'any', min, max }: { label: string; value: number; onChange: (value: number) => void; hint?: string; step?: string; min?: number; max?: number }) {
  return <label className="field"><span>{label}</span><input type="number" value={value} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value === '' ? NaN : Number(event.target.value))} step={step} min={min} max={max}/>{hint && <small>{hint}</small>}</label>;
}

export function TextField({ label, value, onChange, placeholder, hint }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; hint?: string }) {
  return <label className="field"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder}/>{hint && <small>{hint}</small>}</label>;
}
