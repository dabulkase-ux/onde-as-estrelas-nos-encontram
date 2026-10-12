import { seededRandom } from '../graphics/geometry';
const random = seededRandom(81);
const stars = Array.from({length: 65}, (_,i) => ({ id:i, left: `${random()*100}%`, top:`${random()*100}%`, opacity: .12+random()*.48, width: random()>.9 ? 2 : 1, delay: `${random()*-8}s` }));
export function Ambient() { return <div className="ambient" aria-hidden="true"><div className="ambient-halo"/>{stars.map(s => <i key={s.id} style={{left:s.left,top:s.top,opacity:s.opacity,width:s.width,height:s.width,animationDelay:s.delay}}/>)}<div className="grain"/></div>; }
