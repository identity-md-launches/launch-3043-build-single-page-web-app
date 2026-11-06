export type IconName = 'arrow' | 'external' | 'search' | 'wallet' | 'layers' | 'spark' | 'shield' | 'check' | 'refresh' | 'copy' | 'chevron' | 'info' | 'close' | 'users' | 'trophy' | 'link'
const paths: Record<IconName, string[]> = {
  arrow: ['M5 12h14', 'm13 6 6 6-6 6'],
  external: ['M14 4h6v6', 'm20 4-10 10', 'M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5'],
  search: ['m21 21-5-5', 'M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0'],
  wallet: ['M20 8V5a1 1 0 0 0-1-1H5a3 3 0 0 0 0 6h15v10H5a3 3 0 0 1-3-3V7', 'M20 13h-4v4h4'],
  layers: ['m12 3 10 5-10 5L2 8l10-5Z', 'm2 12 10 5 10-5', 'm2 16 10 5 10-5'],
  spark: ['m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2Z'],
  shield: ['m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z', 'm8 12 3 3 5-6'],
  check: ['m5 12 4 4L19 6'],
  refresh: ['M20 7v5h-5', 'M4 17v-5h5', 'M6 6a8 8 0 0 1 13 2l1 4', 'M18 18a8 8 0 0 1-13-2l-1-4'],
  copy: ['M9 9h12v12H9z', 'M15 5V2H2v13h3'],
  chevron: ['m6 9 6 6 6-6'],
  info: ['M12 11v6', 'M12 7v.01', 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0'],
  close: ['m6 6 12 12', 'M18 6 6 18'],
  users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0', 'M20 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  trophy: ['M8 3h8v7a4 4 0 0 1-8 0V3Z', 'M8 5H3v2a4 4 0 0 0 5 4', 'M16 5h5v2a4 4 0 0 1-5 4', 'M12 14v7', 'M7 21h10'],
  link: ['m10 13 4-4', 'M8 16H6a4 4 0 0 1 0-8h4', 'M14 8h4a4 4 0 0 1 0 8h-4'],
}
export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>{paths[name].map((d, index) => <path d={d} key={index} />)}</svg>
}
