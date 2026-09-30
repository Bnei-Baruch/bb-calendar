import type { CSSProperties } from 'react';

interface EventDescriptionProps {
  text: string;
  className?: string;
  style?: CSSProperties;
}

/** Renders a description; when it has more than one line, each line becomes a bullet. */
export function EventDescription({ text, className = '', style }: EventDescriptionProps) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return <p className={`${className} whitespace-pre-line`} style={style}>{text}</p>;
  }
  return (
    <ul className={`${className} list-disc ps-5`} style={style}>
      {lines.map((line, i) => <li key={i}>{line}</li>)}
    </ul>
  );
}
