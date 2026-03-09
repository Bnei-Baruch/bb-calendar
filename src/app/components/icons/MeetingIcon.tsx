interface MeetingIconProps {
  className?: string;
}

export function MeetingIcon({ className = "w-5 h-5" }: MeetingIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        {/* Outer circle border */}
        <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.5" />
        
        {/* Person in front */}
        <circle cx="12" cy="18" r="1.8" />
        <path d="M12 20c-1.2 0-2 0.8-2 1.5v1.5h4v-1.5c0-0.7-0.8-1.5-2-1.5z" />
        
        {/* Person on left */}
        <circle cx="6" cy="8" r="1.8" />
        <path d="M6 10c-1.2 0-2 0.8-2 1.5v1.5h4v-1.5c0-0.7-0.8-1.5-2-1.5z" />
        
        {/* Person on right */}
        <circle cx="18" cy="8" r="1.8" />
        <path d="M18 10c-1.2 0-2 0.8-2 1.5v1.5h4v-1.5c0-0.7-0.8-1.5-2-1.5z" />
        
        {/* Person in back center */}
        <circle cx="12" cy="4" r="1.8" />
        <path d="M12 6c-1.2 0-2 0.8-2 1.5v1.5h4V7.5c0-0.7-0.8-1.5-2-1.5z" />
        
        {/* Table/Circle in center */}
        <circle cx="12" cy="13" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        
        {/* Arms connecting to table */}
        <path d="M9.5 11c-1.5 0.5-2.5 1-3.5 1.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M14.5 11c1.5 0.5 2.5 1 3.5 1.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M12 16c0 1 0 2 0 3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M12 10c0-1 0-2 0-2.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}