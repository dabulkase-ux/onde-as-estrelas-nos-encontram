export function QuizVisuals({ stage }: { stage: string }) {
 return <div className={`quiz-visuals visual-${stage}`} aria-hidden="true"><svg viewBox="0 0 400 240">
 <g className="quiz-particles">{Array.from({ length: 48 }, (_, i) => { const angle = i * Math.PI * 2 / 48; return <circle key={i} cx={200 + Math.cos(angle) * (80 + i % 3 * 5)} cy={120 + Math.sin(angle) * (80 + i % 3 * 5)} r={i % 4 === 0 ? 2 : 1}/>; })}</g>
 <g className="quiz-pair"><circle className="star-left" cx="110" cy="120" r="5"/><circle className="star-right" cx="290" cy="120" r="5"/></g>
 <circle className="quiz-single" cx="200" cy="120" r="5"/>
 <g className="quiz-galaxies">{[-1, 1].map(side => <g key={side} className={side < 0 ? 'galaxy-left' : 'galaxy-right'}>{Array.from({length: 60}, (_, i) => { const a = i * .63; const r = 4 + i * .65; return <circle key={i} cx={200 + side * 65 + Math.cos(a) * r} cy={120 + Math.sin(a) * r * .45} r={1.2}/>; })}</g>)}</g>
 <g className="quiz-heart"><path d="M200 172 L144 122 L138 98 L151 78 L177 77 L200 98 L223 77 L249 78 L262 98 L256 122 Z" fill="none"/>{[[200,172],[144,122],[138,98],[151,78],[177,77],[200,98],[223,77],[249,78],[262,98],[256,122]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2.5"/>)}</g>
 </svg></div>;
}
