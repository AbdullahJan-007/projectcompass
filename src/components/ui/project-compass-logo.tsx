import { useId } from "react";
import { cn } from "@/lib/utils";

export interface ProjectCompassLogoProps {
  className?: string;
}

/**
 * Official ProjectCompass Minimal Astrolabe Compass SVG Mark (from Google Stitch).
 * Uses React `useId()` to namespace SVG gradient and filter IDs so multiple
 * instances render cleanly on the same page without ID collisions.
 */
export function ProjectCompassLogo({ className }: ProjectCompassLogoProps) {
  const uid = useId().replace(/:/g, "");
  const iconLuxGlow = `${uid}-lux`;
  const squircleGrad = `${uid}-sqg`;
  const squircleBorder = `${uid}-sqb`;
  const trackRingGrad = `${uid}-trg`;
  const needleNorthDark = `${uid}-nnd`;
  const needleNorthLight = `${uid}-nnl`;
  const needleSouthLight = `${uid}-nsl`;
  const needleSouthDark = `${uid}-nsd`;
  const iconSoftShadow = `${uid}-iss`;
  const needleElevation = `${uid}-nel`;
  const apexBeaconGlow = `${uid}-abg`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      aria-hidden="true"
      className={cn("h-8 w-8 shrink-0", className)}
    >
      <defs>
        <radialGradient id={iconLuxGlow} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#E3FDFD" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#F9F7F7" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={squircleGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#F9F7F7" />
          <stop offset="100%" stopColor="#EAF0F8" />
        </linearGradient>
        <linearGradient id={squircleBorder} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#A6E3E9" />
          <stop offset="75%" stopColor="#DBE2EF" />
          <stop offset="100%" stopColor="#3F72AF" />
        </linearGradient>
        <linearGradient id={trackRingGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#71C9CE" />
          <stop offset="50%" stopColor="#3F72AF" />
          <stop offset="100%" stopColor="#112D4E" />
        </linearGradient>
        <linearGradient id={needleNorthDark} x1="50%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E3E62" />
          <stop offset="60%" stopColor="#112D4E" />
          <stop offset="100%" stopColor="#0B1A30" />
        </linearGradient>
        <linearGradient id={needleNorthLight} x1="0%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#3F72AF" />
          <stop offset="35%" stopColor="#71C9CE" />
          <stop offset="100%" stopColor="#CBF1F5" />
        </linearGradient>
        <linearGradient id={needleSouthLight} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#DBE2EF" />
        </linearGradient>
        <linearGradient id={needleSouthDark} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3F72AF" />
          <stop offset="100%" stopColor="#1B385D" />
        </linearGradient>
        <filter id={iconSoftShadow} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="#112D4E" floodOpacity="0.10" />
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#3F72AF" floodOpacity="0.08" />
        </filter>
        <filter id={needleElevation} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#112D4E" floodOpacity="0.22" />
        </filter>
        <filter id={apexBeaconGlow} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#71C9CE" floodOpacity="0.7" />
        </filter>
      </defs>

      <rect width="512" height="512" rx="112" fill="#FFFFFF" />
      <rect width="512" height="512" rx="112" fill={`url(#${iconLuxGlow})`} />

      <g filter={`url(#${iconSoftShadow})`}>
        <rect
          x="48"
          y="48"
          width="416"
          height="416"
          rx="104"
          fill={`url(#${squircleGrad})`}
          stroke={`url(#${squircleBorder})`}
          strokeWidth="3.5"
        />
        <rect
          x="56"
          y="56"
          width="400"
          height="400"
          rx="96"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          opacity="0.9"
        />
      </g>

      <g transform="translate(256, 256)">
        <circle
          cx="0"
          cy="0"
          r="160"
          fill="none"
          stroke="#DBE2EF"
          strokeWidth="1.75"
          strokeDasharray="6 8"
          opacity="0.75"
        />
        <circle
          cx="0"
          cy="0"
          r="136"
          fill="none"
          stroke={`url(#${trackRingGrad})`}
          strokeWidth="3"
          strokeDasharray="48 16 64 16 32 16"
        />

        <line x1="0" y1="-172" x2="0" y2="-152" stroke="#71C9CE" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="0" cy="-180" r="4.5" fill="#71C9CE" />
        <line x1="0" y1="152" x2="0" y2="172" stroke="#3F72AF" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="-172" y1="0" x2="-152" y2="0" stroke="#3F72AF" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="152" y1="0" x2="172" y2="0" stroke="#3F72AF" strokeWidth="3.5" strokeLinecap="round" />

        <circle cx="106" cy="-106" r="3.5" fill="#3F72AF" opacity="0.5" />
        <circle cx="-106" cy="-106" r="3.5" fill="#71C9CE" opacity="0.6" />
        <circle cx="106" cy="106" r="3.5" fill="#3F72AF" opacity="0.5" />
        <circle cx="-106" cy="106" r="3.5" fill="#3F72AF" opacity="0.5" />

        <path
          d="M 0 -115 L 12 -12 L 115 0 L 12 12 L 0 115 L -12 12 L -115 0 L -12 -12 Z"
          fill="#CBF1F5"
          opacity="0.4"
        />

        <g filter={`url(#${needleElevation})`}>
          <polygon points="0,0 0,-144 48,0" fill={`url(#${needleNorthDark})`} />
          <polygon points="0,0 0,-144 -48,0" fill={`url(#${needleNorthLight})`} />
          <polygon points="0,0 0,140 -48,0" fill={`url(#${needleSouthLight})`} />
          <polygon points="0,0 0,140 48,0" fill={`url(#${needleSouthDark})`} />
          <polygon points="0,0 128,0 0,14" fill="#3F72AF" opacity="0.9" />
          <polygon points="0,0 -128,0 0,-14" fill="#71C9CE" opacity="0.95" />
        </g>

        <circle
          cx="0"
          cy="0"
          r="32"
          fill="#FFFFFF"
          stroke="#DBE2EF"
          strokeWidth="4"
          filter={`url(#${iconSoftShadow})`}
        />
        <circle cx="0" cy="0" r="22" fill="#112D4E" />
        <circle cx="0" cy="0" r="14" fill="#71C9CE" />
        <circle cx="0" cy="0" r="6.5" fill="#FFFFFF" />

        <g filter={`url(#${apexBeaconGlow})`}>
          <polygon points="0,-162 4,-148 16,-144 4,-140 0,-126 -4,-140 -16,-144 -4,-148" fill="#71C9CE" />
          <circle cx="0" cy="-144" r="3" fill="#FFFFFF" />
        </g>
      </g>
    </svg>
  );
}
