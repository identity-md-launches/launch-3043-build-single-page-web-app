const pixels = [
  '    oo          oo    ',
  '   oooo        oooo   ',
  '  oooooo      oooooo  ',
  '  ooooooo    ooooooo  ',
  '  ooooxoooooooooxoo  ',
  '   ooooooooooooooo   ',
  '  ooooooooooooooooo  ',
  ' ooooooooooooooooooo ',
  ' oooooxoooooooxooooo ',
  ' oooooxoooooooxooooo ',
  ' ooooooooooooooooooo ',
  ' oooooooowwwoooooooo ',
  ' ooooowwwxwwwooooooo ',
  ' oooowwwwwwwwwoooooo ',
  '  ooowwwwwwwwwooooo  ',
  '   ooowwwwwwwooooo   ',
  '    ooooooooooooo    ',
  '     ooooooooooo     ',
  '      oo    oo       ',
]
export function Squeek({ compact = false }: { compact?: boolean }) {
  if (compact) return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" className="brand-mark"><rect width="40" height="40" rx="12" fill="currentColor" /><circle cx="12" cy="12" r="6" fill="#eee8ff" /><circle cx="28" cy="12" r="6" fill="#eee8ff" /><ellipse cx="20" cy="23" rx="13" ry="12" fill="#eee8ff" /><circle cx="15" cy="21" r="2" fill="currentColor" /><circle cx="25" cy="21" r="2" fill="currentColor" /><path d="m18 26 2 2 2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  return <svg className="squeek-art" viewBox="0 0 312 280" fill="none" aria-hidden="true">
    <defs><pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="1.35" fill="#dcd4ee" /></pattern></defs>
    <rect width="312" height="280" rx="24" fill="url(#dots)" />
    <circle cx="158" cy="137" r="110" fill="#ece5fa" />
    {pixels.flatMap((row, y) => [...row].map((pixel, x) => pixel === ' ' ? null : <circle key={`${x}-${y}`} cx={35 + x * 11.5} cy={27 + y * 11.5} r={pixel === 'x' ? 4.8 : 4.6} fill={pixel === 'x' ? '#2a1944' : pixel === 'w' ? '#fbf8ff' : '#8560c5'} />))}
    <path d="M267 55v16m-8-8h16M42 213v12m-6-6h12" stroke="#7551b5" strokeWidth="2" strokeLinecap="round" />
    <circle cx="262" cy="222" r="3" fill="#b39ad9" />
  </svg>
}
