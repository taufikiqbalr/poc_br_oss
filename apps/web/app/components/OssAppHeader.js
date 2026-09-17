function Icon({ name }) {
  const common = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  if (name === 'home') return <svg {...common}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/></svg>;
  if (name === 'manage') return <svg {...common}><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/><circle cx="8" cy="6" r="2" fill="white"/><circle cx="16" cy="12" r="2" fill="white"/><circle cx="10" cy="18" r="2" fill="white"/></svg>;
  if (name === 'designer') return <svg {...common}><rect x="3" y="4" width="6" height="5" rx="1"/><rect x="15" y="15" width="6" height="5" rx="1"/><path d="M9 6.5h4a3 3 0 0 1 3 3v5.5"/><path d="m13 13 3 3 3-3"/></svg>;
  if (name === 'flow') return <svg {...common}><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 6h10"/><path d="M6.5 8 11 16"/><path d="m17.5 8-4.5 8"/></svg>;
  if (name === 'artifact') return <svg {...common}><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5"/><path d="m10 12-2 2 2 2"/><path d="m14 12 2 2-2 2"/></svg>;
  return null;
}

const OFFICIAL_OSS_LOGO = 'https://pemrosesan.oss.go.id/media/logos/LOGO_OSS_NEW.png';

export default function OssAppHeader() {
  const items = [
    ['/', 'home', 'Simulator'],
    ['/manage', 'manage', 'Rule Management'],
    ['/designer', 'designer', 'Regulation Designer'],
    ['/rule-flow', 'flow', 'Rule Flow'],
    ['/artifacts', 'artifact', 'DMN Artifacts'],
  ];
  return (
    <header className="ossAppHeader">
      <div className="ossHeaderInner">
        <a href="/" className="ossBrand" aria-label="OSS v2 Business Rules PoC">
          <img
            src={OFFICIAL_OSS_LOGO}
            alt="Logo OSS Indonesia"
            width="124"
            height="52"
            loading="eager"
            decoding="async"
            style={{ display: 'block', width: 124, height: 'auto', objectFit: 'contain' }}
          />
          <span className="ossBrandText"><strong>Business Rules</strong><small>OSS v2 · B1 Orchestrator PoC</small></span>
          <span className="ossPrototypeBadge">PROTOTYPE</span>
        </a>
        <nav className="ossPrimaryNav" aria-label="Navigasi PoC Business Rules">
          {items.map(([href, icon, label]) => (
            <a href={href} key={href}><Icon name={icon} /><span>{label}</span></a>
          ))}
        </nav>
      </div>
    </header>
  );
}
