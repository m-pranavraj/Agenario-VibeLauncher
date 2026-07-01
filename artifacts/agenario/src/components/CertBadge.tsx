interface CertBadgeProps {
  score: number;
  valid: boolean;
  certId: string;
  className?: string;
}

export function CertBadge({ score, valid, certId, className = "h-6" }: CertBadgeProps) {
  const label = valid ? "Agenario Certified" : "Agenario Audit";
  const bg = valid ? "#10b981" : "#f59e0b";
  const textColor = valid ? "#065f46" : "#92400e";

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="24" viewBox="0 0 200 24" className={className} aria-label="Agenario Security Badge" role="img">
      <rect x="0" y="0" width="96" height="24" rx="4" fill="#1a1a2e"/>
      <rect x="96" y="0" width="104" height="24" rx="4" fill={bg}/>
      <text x="10" y="16" font-family="system-ui,-apple-system,sans-serif" font-size="12" font-weight="600" fill="#888">SECURITY</text>
      <text x="106" y="16" font-family="system-ui,-apple-system,sans-serif" font-size="12" font-weight="600" fill={textColor}>{label}</text>
    </svg>
  );
}
