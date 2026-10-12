/** Hand-mapped landmarks from referencia-olhos.png (1600 × 800).
 * Coordinates are normalized image coordinates, not a symmetric eye formula.
 * The two sides deliberately retain the reference's unequal heights/curvature.
 */
export interface EyeStar { id: string; x: number; y: number; depth: number; size: number; intensity: number; color: string; }
export interface EyeChain { id: string; stars: string[]; stage: number; strength: number; }
const blue = '#b3d2ff', gold = '#ffe2bc', violet = '#c7baff';
const landmarks: [string,number,number,number,number,string][] = [
 ['l-brow-0',255,268,.30,1,gold],['l-brow-1',331,224,.25,.95,gold],['l-brow-2',418,203,.18,.85,gold],
 ['l-brow-3',563,240,.17,.8,blue],['l-brow-4',680,267,.15,.7,violet],['l-brow-5',749,326,.27,1,violet],
 ['l-brow-low-1',407,262,.19,.82,gold],['l-brow-low-2',497,286,.18,.8,blue],['l-brow-low-3',630,306,.19,.85,violet],
 ['l-fold-0',252,377,.31,1,gold],['l-fold-1',301,340,.13,.65,blue],['l-fold-2',408,322,.24,.95,gold],
 ['l-fold-3',517,348,.15,.74,violet],['l-fold-4',602,390,.13,.7,blue],
 ['l-lid-1',302,363,.13,.72,blue],['l-lid-2',333,370,.17,.85,blue],['l-lid-3',404,376,.19,.88,violet],
 ['l-lid-4',493,386,.13,.68,blue],['l-lid-5',554,408,.12,.62,violet],['l-inner',637,445,.18,.83,blue],
 ['l-outer',320,430,.27,1,gold],['l-lower-1',357,452,.12,.65,violet],['l-lower-2',426,465,.12,.63,blue],
 ['l-lower-3',493,465,.22,.93,gold],['l-lower-4',575,455,.13,.66,violet],
 ['l-lash-0',286,399,.10,.55,blue],['l-lash-1',318,473,.11,.56,violet],['l-lash-2',363,486,.11,.58,blue],
 ['l-reflection',399,440,.24,.94,blue],['l-reflection-low',388,428,.09,.54,violet],
 ['l-dust-light',520,416,.24,.97,gold],['l-dust-small',369,408,.15,.76,gold],
 ['bridge-left',713,488,.17,.8,gold],['bridge-top',774,414,.21,.9,violet],['bridge-mid',874,432,.16,.84,blue],
 ['bridge-right',925,418,.16,.86,gold],['r-inner',944,500,.25,.97,gold],
 ['r-fold-0',979,360,.18,.84,gold],['r-fold-1',1006,341,.17,.81,blue],['r-fold-2',1082,307,.13,.64,blue],
 ['r-fold-3',1168,289,.13,.68,violet],['r-fold-4',1255,278,.19,.86,blue],['r-fold-5',1350,269,.19,.9,blue],
 ['r-brow-0',1048,286,.18,.82,blue],['r-brow-1',1110,256,.18,.86,violet],['r-brow-2',1148,233,.17,.83,gold],
 ['r-brow-3',1267,215,.22,.9,blue],['r-brow-4',1363,198,.26,.97,gold],['r-brow-5',1416,254,.21,.88,gold],
 ['r-brow-end',1435,300,.29,1,violet],['r-lash-top',1392,335,.16,.77,blue],
 ['r-crease-1',1089,374,.11,.66,violet],['r-crease-2',1180,350,.15,.77,violet],['r-crease-3',1301,380,.13,.73,blue],
 ['r-outer',1349,405,.30,1,gold],['r-lid-1',989,453,.12,.7,blue],['r-lid-2',1055,418,.15,.78,blue],
 ['r-lid-3',1114,410,.12,.74,blue],['r-lid-4',1176,411,.17,.8,gold],['r-lid-5',1269,418,.13,.73,violet],
 ['r-lower-1',1014,476,.12,.69,violet],['r-lower-2',1080,492,.12,.65,blue],['r-lower-3',1155,498,.13,.68,violet],
 ['r-lower-4',1263,469,.25,.97,gold],['r-lower-5',1310,436,.12,.72,violet],
 ['r-reflection',1074,461,.26,.98,blue],['r-reflection-top',1113,443,.16,.81,violet],
 ['r-lash-0',1411,424,.11,.63,violet],['r-lash-1',1298,491,.10,.55,blue],['r-lash-2',1248,522,.11,.55,violet],
];
export const eyeStars: readonly EyeStar[] = landmarks.map(([id,x,y,size,intensity,color],i)=>({
  id,x:x/1600,y:y/800,size,intensity,color,depth:Math.sin(i*1.73)*.025,
}));
export const eyeChains: readonly EyeChain[] = [
 {id:'left-upper-lid',stars:['l-fold-0','l-lid-1','l-lid-2','l-lid-3','l-lid-4','l-lid-5','l-inner'],stage:0,strength:.53},
 {id:'left-lower-lid',stars:['l-fold-0','l-outer','l-lower-1','l-lower-2','l-lower-3','l-lower-4','l-inner'],stage:.035,strength:.52},
 {id:'right-upper-lid',stars:['r-inner','r-lid-1','r-lid-2','r-lid-3','r-lid-4','r-lid-5','r-outer'],stage:.02,strength:.50},
 {id:'right-lower-lid',stars:['r-inner','r-lower-1','r-lower-2','r-lower-3','r-lower-4','r-lower-5','r-outer'],stage:.045,strength:.50},
 {id:'left-fold',stars:['l-fold-0','l-fold-1','l-fold-2','l-fold-3','l-fold-4','l-inner'],stage:.07,strength:.31},
 {id:'right-fold',stars:['r-inner','r-lid-1','r-crease-1','r-crease-2','r-crease-3','r-outer'],stage:.075,strength:.30},
 {id:'left-brow-crown',stars:['l-brow-0','l-brow-1','l-brow-2','l-brow-3','l-brow-4','l-brow-5'],stage:.12,strength:.36},
 {id:'left-brow-base',stars:['l-brow-0','l-brow-low-1','l-brow-low-2','l-brow-low-3','l-brow-5'],stage:.14,strength:.34},
 {id:'right-brow-crown',stars:['r-fold-0','r-brow-0','r-brow-1','r-brow-2','r-brow-3','r-brow-4','r-brow-5','r-brow-end'],stage:.12,strength:.36},
 {id:'right-brow-base',stars:['r-fold-0','r-fold-1','r-fold-2','r-fold-3','r-fold-4','r-fold-5','r-brow-end'],stage:.14,strength:.31},
 {id:'left-temple',stars:['l-brow-0','l-fold-0','l-lash-0','l-outer'],stage:.18,strength:.30},
 {id:'right-temple',stars:['r-brow-end','r-lash-top','r-outer','r-lash-0'],stage:.18,strength:.30},
 {id:'bridge',stars:['l-brow-5','bridge-top','bridge-mid','bridge-right','r-inner','r-fold-0','r-fold-1','r-brow-0'],stage:.18,strength:.27},
 {id:'inner-left',stars:['l-inner','bridge-left','bridge-top'],stage:.2,strength:.28},
 {id:'left-lashes',stars:['l-outer','l-lash-1','l-lash-2'],stage:.21,strength:.20},
 {id:'right-lashes',stars:['r-lower-4','r-lash-2','r-lash-1'],stage:.21,strength:.20},
];
/** Cubic outlines of the partly occluded dark irises. No ellipse/circle primitives. */
export const irisContours = [
 [[363,386],[392,382,432,391,462,404],[465,431,437,453,407,454],[373,453,354,430,363,386]],
 [[1043,418],[1085,407,1134,405,1163,416],[1169,448,1138,479,1106,487],[1076,484,1048,448,1043,418]],
] as const;
export const eyeDustPolygons = [
 [[294,404],[341,396],[413,390],[481,399],[552,414],[609,434],[637,445],[575,455],[493,469],[424,466],[354,451],[320,431]],
 [[944,500],[977,470],[1028,431],[1077,417],[1155,414],[1231,421],[1296,420],[1349,405],[1310,441],[1263,473],[1170,501],[1100,492],[1015,478]],
] as const;
/** Nebula paths in reference pixel space; only diffuse color/dust, no eye bitmap. */
export const nebulaBands = [
 [[128,311],[179,268],[224,350],[240,447],[318,496],[530,477]],
 [[211,133],[301,190],[414,225],[553,264],[689,335]],
 [[1068,259],[1206,198],[1388,211],[1470,344],[1500,440]],
 [[1454,381],[1509,449],[1433,549],[1313,626],[1157,672],[1032,748]],
 [[966,431],[1082,383],[1263,415],[1396,505],[1350,568]],
] as const;
