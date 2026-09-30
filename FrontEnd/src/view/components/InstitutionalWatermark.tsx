export default function InstitutionalWatermark({ variant }: { variant: 'access' | 'dashboard' }) {
  return (
    <div className={`institutional-watermarks institutional-watermarks-${variant}`} aria-hidden="true">
      <img className="institutional-watermark-unam" src="/unam-cuautitlan.jpg" alt="" />
      <img className="institutional-watermark-fesc" src="/fesc-informatica.png" alt="" />
    </div>
  );
}
