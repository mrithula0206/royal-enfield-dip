import { useState } from 'react';

const STYLE_SHAPE = {
  Roadster: { seatY: 60, tankRx: 15, barY: 40 },
  Cruiser: { seatY: 66, tankRx: 17, barY: 52 },
  'Adventure Tourer': { seatY: 56, tankRx: 14, barY: 34 },
  Scrambler: { seatY: 58, tankRx: 14, barY: 38 },
};

// Verified real photos only live here — every other model falls back to the SVG illustration below.
const HAS_PHOTO = new Set([
  'hunter-350', 'classic-350', 'bullet-350', 'meteor-350', 'guerrilla-450',
  'himalayan-450', 'interceptor-650', 'continental-gt-650', 'bear-650', 'flying-flea-c6',
  'shotgun-650', 'super-meteor-650', 'bullet-650', 'scram-440',
]);

export function ModelThumb({ model, bodyStyle, accent = '#D6323F' }) {
  const slug = model.toLowerCase().replace(/\s+/g, '-');
  const [broken, setBroken] = useState(!HAS_PHOTO.has(slug));

  if (broken) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 110 }}>
        <BikeArt bodyStyle={bodyStyle} accent={accent} size={100} />
      </div>
    );
  }
  return (
    <img
      src={`/images/models/${slug}.jpg`}
      alt={model}
      onError={() => setBroken(true)}
      style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, display: 'block' }}
    />
  );
}

export default function BikeArt({ bodyStyle, accent = '#D6323F', size = 64 }) {
  const s = STYLE_SHAPE[bodyStyle] || STYLE_SHAPE.Roadster;
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 120 74" fill="none">
      <circle cx="24" cy="58" r="14" stroke="#B9BFC7" strokeWidth="4" />
      <circle cx="96" cy="58" r="14" stroke="#B9BFC7" strokeWidth="4" />
      <circle cx="24" cy="58" r="3" fill="#B9BFC7" />
      <circle cx="96" cy="58" r="3" fill="#B9BFC7" />
      <path d={`M24 58 L46 ${s.seatY} L${s.barY < 40 ? 70 : 66} ${s.seatY - 6} L96 58`} stroke="#3A4048" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <ellipse cx="52" cy={s.seatY - 12} rx={s.tankRx} ry="9" fill={accent} />
      <path d={`M46 ${s.seatY - 4} L74 ${s.seatY - 4}`} stroke="#20242A" strokeWidth="6" strokeLinecap="round" />
      <path d={`M74 ${s.seatY - 4} L${s.barY < 40 ? 82 : 78} ${s.barY}`} stroke="#3A4048" strokeWidth="3" strokeLinecap="round" />
      <path d={`M${s.barY < 40 ? 74 : 70} ${s.barY} L${s.barY < 40 ? 90 : 84} ${s.barY}`} stroke="#3A4048" strokeWidth="3" strokeLinecap="round" />
      <circle cx="82" cy="46" r="4" fill="#20242A" />
      <path d="M24 58 L34 42 L44 42" stroke="#3A4048" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
