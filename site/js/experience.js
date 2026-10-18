/* =====================================================================
   DELPHINIUM — expérience 3D de l'accueil (Three.js, scroll-scrub)
   Le scroll de la section #experience pilote une timeline :
     0–12   bague sur le socle de verre (matérialisation au chargement)
     12–30  dématérialisation voxel → particules → bracelet
     30–40  bracelet · 40–58 → collier · 58–66 collier
     66–95  les 3 pièces se rematérialisent côte à côte → choix → configurateur
   Perf : GLB Meshopt, 1re image = bague + socle + HDRI, le reste en arrière-plan,
   shaders précompilés, qualité adaptative, rendu coupé hors écran.
   ===================================================================== */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

/* =====================================================================
   RÉGLAGES
   ===================================================================== */
const CONFIG_URL = '/configurateur/';   // le vrai configurateur Spire (?piece=bague|bracelet|collier)
const ASSETS = '/assets/';
const EXP = document.getElementById('experience');
const EN = document.documentElement.lang === 'en';            // version anglaise : même scène, textes et liens traduits   // section haute dont le scroll pilote la scène
const ORDER = ['bague','bracelet','collier'];
const SIZE = {bague:2.3, bracelet:2.5, collier:3.1, socle:3.2};   // plus grande dimension, en unités monde
const FIN_SCALE = .68;            // taille des 3 pièces finales (desktop)
const finScale = () => L.mob ? .48 : FIN_SCALE;
const LIFT = {collier:.3};         // le collier flotte un peu plus haut
const FINC = .9;                   // ligne des centres des 3 pièces finales (au-dessus de L.fin)

/* =====================================================================
   OUTILS
   ===================================================================== */
const $ = id => document.getElementById(id);
const TAU = Math.PI*2;
const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));
const lerp = (a,b,t) => a+(b-a)*t;
const ss = (a,b,v) => { const t=clamp((v-a)/(b-a)); return t*t*(3-2*t); };
const easeIO = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;   // mouvement réduit : pas d'intro, pièces immobiles (le scroll pilote toujours la scène)
let toastTimer;                    // déclaré avant le 1er toast possible (repli WebGL ci-dessous)

/* =====================================================================
   QUALITÉ (adaptative)
   ===================================================================== */
const mobile = matchMedia('(max-width:820px)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
const Q = {
  hi: !mobile,                                        // réfraction (transmission) des pierres et du verre
  dpr: Math.min(devicePixelRatio||1, mobile?1.5:1.75),
  np: mobile ? 2400 : 4800                            // particules
};

/* =====================================================================
   RENDERER / SCÈNE / CAMÉRA
   ===================================================================== */
const canvas = $('film');
const stage = canvas.parentElement;
let renderer;
try{
  renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
}catch(e){ document.body.classList.add('no3d'); toast(EN ? 'WebGL is not available on this device' : 'WebGL indisponible sur cet appareil'); throw e; }
renderer.setPixelRatio(Q.dpr);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = (()=>{                       // même dégradé lavande que la page
  const c=document.createElement('canvas'); c.width=c.height=512; const g=c.getContext('2d');
  const r=g.createRadialGradient(317,215,0,256,256,430);
  r.addColorStop(0,'#fbfafd'); r.addColorStop(.55,'#f5f3f7'); r.addColorStop(1,'#eeebf3');
  g.fillStyle=r; g.fillRect(0,0,512,512);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
})();
scene.environmentIntensity = 1.45;
scene.environmentRotation.y = -.6;

const camera = new THREE.PerspectiveCamera(24,1,.1,100);

/* =====================================================================
   CHARGEMENT
   ===================================================================== */
const manager = new THREE.LoadingManager();
manager.onProgress = (_u,done,total) => { if(!ready) setLoad(done/total); };
const gltfLoader = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
const texLoader = new THREE.TextureLoader(manager);
const pmrem = new THREE.PMREMGenerator(renderer);

function tex(name, srgb=false){
  const t=texLoader.load(ASSETS+'tex/'+name);
  t.flipY=false; t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.anisotropy=4; return t;
}
const TX = {
  bague: tex('bague_nrm.webp'), chaton: tex('bague_chaton_nrm.webp'),
  bracelet: tex('bracelet_nrm.webp'), lune: tex('pierre_lune.webp',true)
};

/* =====================================================================
   MATÉRIAUX (base color faites ici : or, verre, diamant, pierre de lune)
   ===================================================================== */
const GOLD = '#f6d79c';
const STONE = '#bcdff9';                // pierres de la bague : bleu très clair, presque pastel
function makeMat(kind){
  const gold = (o={}) => new THREE.MeshPhysicalMaterial({color:GOLD, metalness:1, roughness:.11, ...o});
  switch(kind){
    case 'ring':     return gold({normalMap:TX.bague, normalScale:new THREE.Vector2(1.25,1.25), roughness:.15});
    case 'chaton':   return gold({normalMap:TX.chaton, normalScale:new THREE.Vector2(.7,.7), roughness:.14});
    case 'bracelet': return gold({normalMap:TX.bracelet, normalScale:new THREE.Vector2(1,1), roughness:.2});
    case 'gold':     return gold();
    case 'diamond':  // pierres de la bague : bleu pastel laiteux, vernis brillant + légère irisation (pas de transparence : elle assombrit)
      return new THREE.MeshPhysicalMaterial({color:STONE, metalness:0, roughness:.06, clearcoat:1, clearcoatRoughness:0,
        iridescence:.35, iridescenceIOR:1.4, sheen:.6, sheenColor:new THREE.Color('#e6f4ff'), envMapIntensity:1.6,
        emissive:new THREE.Color(STONE), emissiveIntensity:.18});
    case 'moon':     return new THREE.MeshPhysicalMaterial({map:TX.lune, roughness:.16, clearcoat:1, clearcoatRoughness:.05,
                       iridescence:.5, iridescenceIOR:1.35, sheen:.5, sheenColor:new THREE.Color('#d6dcff'),
                       transmission:Q.hi?.15:0, thickness:.3, ior:1.53});
    case 'glass':    return Q.hi
      // épaisseur de réfraction à 0 : sinon le verre recopie les pierres opaques en « fantôme » décalé
      ? new THREE.MeshPhysicalMaterial({color:'#f4f2ff', roughness:.05, transmission:1, thickness:0, ior:1.45,
          specularIntensity:1, envMapIntensity:1.3})
      : new THREE.MeshPhysicalMaterial({color:'#f1efff', roughness:.05, transparent:true, opacity:.38, envMapIntensity:1.5});
    case 'frost':    return Q.hi
      ? new THREE.MeshPhysicalMaterial({color:'#f4f2ff', roughness:.28, transmission:1, thickness:0, ior:1.45, envMapIntensity:1.2})
      : new THREE.MeshPhysicalMaterial({color:'#ecebf8', roughness:.3, transparent:true, opacity:.55, envMapIntensity:1.3});
  }
}
function kindFor(prod, n){
  if(prod==='bague')    return /^Pierre/.test(n)?'diamond':/^Chaton/.test(n)?'chaton':'ring';
  if(prod==='bracelet') return 'bracelet';
  if(prod==='collier')  return /Pierre/.test(n)?'moon':'gold';
  return /Plaque/.test(n)?'glass':'frost';
}

/* ---------- dématérialisation « voxel » injectée dans les matériaux PBR ----------
   uP = seuil : tout ce qui est au-dessus disparaît ; le front s'illumine en lavande. */
const NOISE = `
float dH(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float dN(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(dH(i),dH(i+vec3(1,0,0)),f.x),mix(dH(i+vec3(0,1,0)),dH(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(dH(i+vec3(0,0,1)),dH(i+vec3(1,0,1)),f.x),mix(dH(i+vec3(0,1,1)),dH(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
const EDGE = new THREE.Color('#8f7dff');
function dissolvable(mat, U){
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, {uP:U.uP, uInv:U.uInv, uH:U.uH, uEdge:{value:EDGE}});
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uInv;\nvarying vec3 vDP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvDP=(uInv*modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uP; uniform float uH; uniform vec3 uEdge; varying vec3 vDP;'+NOISE)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        vec3 dQ = floor(vDP*16.)/16.;
        float dK = vDP.y/uH + (dN(dQ*4.)-.5)*.24;
        if(dK > uP) discard;
        float dEdge = 1.-smoothstep(0.,.05,uP-dK);`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uEdge*dEdge*2.4;');
  };
  mat.customProgramCacheKey = () => 'dissolve';
}
const SHOWN = 1.3, HIDDEN = -.2;                     // valeurs de uP « entièrement visible / invisible »
const thrOut = t => lerp(SHOWN, HIDDEN, clamp(t/.5));          // 1re moitié d'une transition
const thrIn  = (t,d=0) => lerp(HIDDEN, SHOWN, clamp((t-.5-d)/.5)); // 2de moitié

/* ---------- instances : ancre (position) > inclinaison > rotation > modèle ---------- */
function instance(key, root){
  const anchor=new THREE.Group(), tilt=new THREE.Group(), spin=new THREE.Group(), model=new THREE.Group();
  anchor.add(tilt); tilt.add(spin); spin.add(model); model.add(root);
  const U = {uP:{value:SHOWN}, uInv:{value:new THREE.Matrix4()}, uH:{value:1}};
  root.traverse(o => { if(o.isMesh){
    o.material = makeMat(kindFor(key,o.name)); dissolvable(o.material,U);
    if(o.isSkinnedMesh) o.frustumCulled=false;
  }});
  if(key==='collier') model.rotation.y = Math.PI;      // pendentif face caméra
  scene.add(anchor); anchor.updateMatrixWorld(true);
  let b=new THREE.Box3().setFromObject(model,true), sz=b.getSize(new THREE.Vector3());
  model.scale.setScalar(SIZE[key]/Math.max(sz.x,sz.y,sz.z)); anchor.updateMatrixWorld(true);
  b=new THREE.Box3().setFromObject(model,true); const c=b.getCenter(new THREE.Vector3());
  model.position.set(-c.x,-b.min.y,-c.z); anchor.updateMatrixWorld(true);
  const h=b.max.y-b.min.y; U.uH.value=h;
  const r=Math.max(b.max.x-b.min.x,b.max.z-b.min.z)/2;
  const I={key,anchor,tilt,spin,model,U,h,r,hv:1};
  setP(I,SHOWN);
  return I;
}
function setP(I,p){ I.U.uP.value=p; I.anchor.visible = p>HIDDEN+.01; }

/* ---------- échantillonnage de surface (positions des particules, dans l'espace « spin ») ---------- */
function sampleSurface(I, n){
  I.anchor.updateMatrixWorld(true);
  const inv=I.spin.matrixWorld.clone().invert(), v=new THREE.Vector3();
  const tris=[], acc=[]; let total=0;
  I.model.traverse(m => {
    if(!m.isMesh) return;
    const g=m.geometry, pc=g.attributes.position.count, P=new Float32Array(pc*3);
    const mw=new THREE.Matrix4().multiplyMatrices(inv,m.matrixWorld);
    for(let i=0;i<pc;i++){ m.getVertexPosition(i,v).applyMatrix4(mw); P[i*3]=v.x; P[i*3+1]=v.y; P[i*3+2]=v.z; }
    const idx=g.index, cnt=idx?idx.count:pc;
    for(let i=0;i<cnt;i+=3){
      const a=(idx?idx.getX(i):i)*3, b=(idx?idx.getX(i+1):i+1)*3, c=(idx?idx.getX(i+2):i+2)*3;
      const ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2], wx=P[c]-P[a],wy=P[c+1]-P[a+1],wz=P[c+2]-P[a+2];
      total += Math.hypot(uy*wz-uz*wy, uz*wx-ux*wz, ux*wy-uy*wx)/2;
      tris.push(P,a,b,c); acc.push(total);
    }
  });
  const pos=new Float32Array(n*3), key=new Float32Array(n);
  for(let i=0;i<n;i++){
    const r=Math.random()*total; let lo=0, hi=acc.length-1;
    while(lo<hi){ const mid=(lo+hi)>>1; if(acc[mid]<r) lo=mid+1; else hi=mid; }
    const P=tris[lo*4], a=tris[lo*4+1], b=tris[lo*4+2], c=tris[lo*4+3];
    let s=Math.random(), t=Math.random(); if(s+t>1){ s=1-s; t=1-t; }
    for(let k=0;k<3;k++) pos[i*3+k]=P[a+k]+(P[b+k]-P[a+k])*s+(P[c+k]-P[a+k])*t;
    key[i]=clamp(pos[i*3+1]/I.h+(Math.random()-.5)*.2,-.1,1.1);
  }
  return {pos,key};
}

/* =====================================================================
   PARTICULES (pixels or / violet)
   ===================================================================== */
const NP = Q.np;
let npActive = NP;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(NP*3), pAlpha = new Float32Array(NP), pRnd = new Float32Array(NP), pDir = new Float32Array(NP*3);
for(let i=0;i<NP;i++){
  pRnd[i]=Math.random();
  const u=Math.random()*2-1, a=Math.random()*TAU, s=Math.sqrt(1-u*u);
  pDir[i*3]=s*Math.cos(a); pDir[i*3+1]=u; pDir[i*3+2]=s*Math.sin(a);
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos,3).setUsage(THREE.DynamicDrawUsage));
pGeo.setAttribute('aAlpha',   new THREE.BufferAttribute(pAlpha,1).setUsage(THREE.DynamicDrawUsage));
pGeo.setAttribute('aRnd',     new THREE.BufferAttribute(pRnd,1));
const pMat = new THREE.ShaderMaterial({
  transparent:true, depthWrite:false,
  uniforms:{uSize:{value:1}},
  vertexShader:`attribute float aAlpha; attribute float aRnd; varying float vA; varying float vR; uniform float uSize;
    void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv;
      gl_PointSize=uSize*(.55+aRnd*1.1)*(12./-mv.z); vA=aAlpha; vR=aRnd; }`,
  fragmentShader:`varying float vA; varying float vR;
    void main(){ if(vA<.01) discard;
      vec3 c = vR>.55 ? vec3(.80,.67,.45) : vec3(.45,.39,.86);
      gl_FragColor=vec4(c, vA*(vR>.55?.95:.75)); }`
});
const points = new THREE.Points(pGeo,pMat);
points.frustumCulled=false; points.renderOrder=10; points.visible=false;
scene.add(points);

const _e = new Float32Array(16);
function toWorld(I, S, i, out, o){
  const e=I.spin.matrixWorld.elements, x=S.pos[i*3], y=S.pos[i*3+1], z=S.pos[i*3+2];
  out[o]=e[0]*x+e[4]*y+e[8]*z+e[12]; out[o+1]=e[1]*x+e[5]*y+e[9]*z+e[13]; out[o+2]=e[2]*x+e[6]*y+e[10]*z+e[14];
}
/* Chaque particule quitte la pièce A au moment où le front de dissolution passe sur elle,
   vole en tourbillon, puis se pose sur la pièce B à l'instant où B se reconstruit à cet endroit. */
const wa=new Float32Array(3), wb=new Float32Array(3);
function updateParticles(src, dst, t, delays){
  if(t<=0 || t>=1 || !dst(0)){ points.visible=false; return; }
  points.visible=true;
  let any=false;
  for(let i=0;i<npActive;i++){
    const B=dst(i), SB=SAMPLES[B.key], kB=SB.key[i], d=delays?delays(i):0;
    const tLand=.5+d+(kB-HIDDEN)/(SHOWN-HIDDEN)*.5;
    let tRel;
    const A=src(i);
    if(A){ const kA=SAMPLES[A.key].key[i]; tRel=(SHOWN-kA)/(SHOWN-HIDDEN)*.5; toWorld(A,SAMPLES[A.key],i,wa,0); }
    else { tRel=pRnd[i]*.35; }                                     // intro : nuage diffus
    toWorld(B,SB,i,wb,0);
    if(!A){ const R=2.4+pRnd[i]*1.6; wa[0]=wb[0]+pDir[i*3]*R; wa[1]=wb[1]+pDir[i*3+1]*R*.6+.6; wa[2]=wb[2]+pDir[i*3+2]*R; }
    const s=(t-tRel)/Math.max(.05,tLand-tRel);
    if(s<=0 || s>=1){ pAlpha[i]=0; continue; }
    any=true;
    const k=easeIO(s), sw=Math.sin(Math.PI*s), rad=sw*(.35+pRnd[i]*.7), ang=s*3+pRnd[i]*TAU;
    pPos[i*3]  = lerp(wa[0],wb[0],k) + (pDir[i*3]*Math.cos(ang)-pDir[i*3+2]*Math.sin(ang))*rad;
    pPos[i*3+1]= lerp(wa[1],wb[1],k) + pDir[i*3+1]*rad*.6 + sw*.35;
    pPos[i*3+2]= lerp(wa[2],wb[2],k) + (pDir[i*3]*Math.sin(ang)+pDir[i*3+2]*Math.cos(ang))*rad;
    pAlpha[i]=Math.min(1,Math.min(s,1-s)*7);
  }
  for(let i=npActive;i<NP;i++) pAlpha[i]=0;
  points.visible=any;
  pGeo.attributes.position.needsUpdate=true; pGeo.attributes.aAlpha.needsUpdate=true;
}

/* =====================================================================
   MISE EN PAGE (positions écran → monde)
   ===================================================================== */
const L = {main:new THREE.Vector3(), socle:new THREE.Vector3(), fin:[0,1,2].map(()=>new THREE.Vector3()), mob:false};
let W=0, H=0;
const ray=new THREE.Vector3();
function screenToWorld(fx, fy, out){                 // intersection avec le plan vertical z = 0
  ray.set(fx*2-1, -(fy*2-1), .5).unproject(camera).sub(camera.position).normalize();
  return out.copy(camera.position).addScaledVector(ray, -camera.position.z/ray.z);
}
const _p=new THREE.Vector3();
function toScreen(v){ _p.copy(v).project(camera); return [(_p.x+1)/2*W, (1-_p.y)/2*H]; }

function layout(){
  W=innerWidth; H=innerHeight; L.mob=W<820;
  renderer.setSize(W,H,false);
  camera.aspect=W/H;
  const tanH=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2);
  let dist=(L.mob?10:6.9)/(2*tanH);
  if(L.mob) dist=Math.max(dist, 6.2/(2*tanH*camera.aspect));
  const el=THREE.MathUtils.degToRad(13);
  camera.position.set(0,Math.sin(el)*dist,Math.cos(el)*dist); camera.lookAt(0,0,0);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  pMat.uniforms.uSize.value=renderer.getPixelRatio()*(L.mob?1.6:2.1);

  screenToWorld(L.mob?.5:.665, L.mob?.44:.6, L.main);
  const xs=L.mob?[.2,.5,.8]:[.3,.52,.74];
  xs.forEach((x,j)=>screenToWorld(x, L.mob?.47:.64, L.fin[j]));
  if(S){ L.socle.copy(L.main); L.socle.y -= .42 + S.h; }
  placePicks();
  placeSketch();
}
// croquis technique autour de la pièce principale (cotes, axe, viseur) : position écran de la pièce
function placeSketch(){
  const sk=$('heroSketch'); if(!sk) return;
  const c=L.main.clone(); c.y+=.9; const [x,y]=toScreen(c), [x2]=toScreen(c.clone().setX(c.x+1.9));
  const r=Math.max(60,x2-x);
  sk.style.setProperty('--x',x+'px'); sk.style.setProperty('--y',y+'px'); sk.style.setProperty('--r',r+'px');
}
const picks=[...document.querySelectorAll('.pick')];
function placePicks(){
  if(!F.length) return;
  F.forEach((I,j)=>{
    const k=finScale(), c=L.fin[j].clone(); c.y+=FINC*k;
    const [x,y]=toScreen(c), [x2]=toScreen(c.clone().setX(c.x+1.7*k));
    const d=Math.min(Math.max(80,(x2-x)*2), W*(L.mob?.3:.2));
    Object.assign(picks[j].style,{left:x+'px',top:y+'px',width:d+'px',height:d+'px'});
    // bas des bijoux et de leurs noms : la pastille de choix se place juste dessous (mobile)
    if(j===0) stage.style.setProperty('--below', Math.round(y + d/2 + 78) + 'px');
  });
}

/* =====================================================================
   SCÈNE : instances
   ===================================================================== */
const M = {};          // pièces sur le socle
let F = [];            // les 3 pièces finales (clones : géométries partagées)
let S = null;          // socle
const SAMPLES = {};
let ready=false, introT0=0;

function addProduct(key, gltf){
  const I = instance(key, gltf.scene);
  SAMPLES[key] = sampleSurface(I, NP);
  I.tilt.rotation.x = key==='collier' ? .05 : .32;
  setP(I,HIDDEN); M[key]=I;
  const Fi = instance(key, cloneSkinned(gltf.scene));
  Fi.tilt.rotation.x = key==='collier' ? .05 : .4;
  setP(Fi,HIDDEN);
  F[ORDER.indexOf(key)] = Fi;
  return [I,Fi];
}
async function precompile(objs){
  objs.forEach(o=>o.anchor.visible=true);
  try{ await renderer.compileAsync(scene,camera); }catch(e){}
  objs.forEach(o=>setP(o,o.U.uP.value));
}

const load = url => gltfLoader.loadAsync(ASSETS+url);
const envP = new RGBELoader(manager).loadAsync(ASSETS+'env/studio.hdr').then(t=>{
  scene.environment = pmrem.fromEquirectangular(t).texture; t.dispose(); pmrem.dispose();
});
const socleP = load('3d/socle.glb');
const bagueP = load('3d/bague.glb');
const restP  = Promise.all([load('3d/bracelet.glb'), load('3d/collier.glb')]);

Promise.all([envP, socleP, bagueP]).then(async ([,socle,bague]) => {
  S = instance('socle', socle.scene);
  const objs = addProduct('bague', bague);
  layout();
  await precompile([S,...objs]);
  ready=true; introT0=performance.now();
  document.body.classList.add('ready');
  // le reste arrive en arrière-plan, compilé avant d'être utile
  const [bracelet,collier] = await restP;
  const more=[...addProduct('bracelet',bracelet), ...addProduct('collier',collier)];
  placePicks();
  await precompile(more);
}).catch(err => { console.error(err); document.body.classList.add('no3d');
  toast(EN ? 'The 3D scene could not be loaded' : 'La scène 3D n’a pas pu se charger'); });

/* =====================================================================
   TIMELINE : état de la scène pour une position f ∈ [0,1]
   ===================================================================== */
let hover=-1, leaving=null, leaveT=0, skipIntro=false;
const seg=(f,a,b)=>clamp((f-a)/(b-a));
const YAW0 = -2.92;                  // angle d'entrée de la bague (rad)

// le collier oscille de face (vu par la tranche, il disparaît) ; les autres tournent
const faceYaw = (I,yaw) => I.key==='collier' ? Math.sin(yaw)*.55 : yaw;
function place(I, pos, yaw, bob){
  I.anchor.position.copy(pos); I.anchor.position.y += bob + (LIFT[I.key]||0);
  I.spin.rotation.y = faceYaw(I,yaw);
}
function sceneAt(f, now){
  const t=RM ? 0 : now/1000;
  // YAW0 : à l'ouverture, la bague arrive pierres face caméra (elles sont à ~118° dans son repère) ;
  // la rotation lente part de l'apparition, pas du chargement, pour une entrée toujours identique
  const yaw=YAW0+f*TAU*1.15+(RM ? 0 : Math.max(0,now-introT0)/1000*.12), bob=Math.sin(t*1.2)*.04;
  const it = skipIntro||RM ? 1 : clamp((now-introT0)/2300);
  for(const k in M) setP(M[k],HIDDEN);
  F.forEach(I=>I&&setP(I,HIDDEN));
  for(const k in M) place(M[k], L.main, yaw, bob);
  S.anchor.position.copy(L.socle);
  S.spin.rotation.y = -f*1.2;
  setP(S, SHOWN);

  let pr=null;   // [src, dst, t, delays]
  const main=k=>M[k]||null;
  if(f<.12){
    const B=main('bague'); setP(B, thrIn(it)); setP(S, lerp(HIDDEN,SHOWN,ss(0,.6,it)));
    if(it<1) pr=[()=>null, ()=>B, it];
  }else if(f<.30){ trans('bague','bracelet',seg(f,.12,.30)); }
  else if(f<.40){ setP(main('bracelet')||M.bague, SHOWN); }
  else if(f<.58){ trans('bracelet','collier',seg(f,.40,.58)); }
  else if(f<.66){ setP(main('collier')||main('bracelet')||M.bague, SHOWN); }
  else{
    const u=seg(f,.66,.95);
    const A=main('collier');
    if(A && F.length===3 && F.every(Boolean)){
      setP(A, thrOut(u)); setP(S, thrOut(u));
      const lv = leaving ? clamp((now-leaveT)/700) : 0;
      F.forEach((I,j)=>{
        const hovered = hover===j && !leaving;
        I.hv += ((hovered?1.12:1)-I.hv)*.12;
        I.anchor.scale.setScalar(finScale()*I.hv);
        I.spin.rotation.y = faceYaw(I, t*.35 + j*2.1 + (I.spinX=(I.spinX||0)+(hovered?.03:0)));
        I.anchor.position.copy(L.fin[j]); I.anchor.position.y += Math.sin(t*1.1+j*1.3)*.03 + (FINC-I.h*.5)*finScale();
        let p = thrIn(u, j*.04);
        if(leaving && ORDER[j]!==leaving) p = Math.min(p, lerp(SHOWN,HIDDEN,lv));
        setP(I,p);
      });
      pr=[()=>A, i=>F[i%3], u, i=>(i%3)*.04];
    }else setP(main('collier')||main('bracelet')||M.bague, SHOWN);
  }
  function trans(a,b,u){
    const A=main(a), B=main(b);
    if(!A||!B){ setP(A||M.bague, SHOWN); return; }
    setP(A, thrOut(u)); setP(B, thrIn(u));
    pr=[()=>A, ()=>B, u];
  }
  scene.updateMatrixWorld();
  // uInv : repère « spin » de chaque pièce (pour la clé de dissolution)
  for(const k in M) M[k].U.uInv.value.copy(M[k].spin.matrixWorld).invert();
  F.forEach(I=>I&&I.U.uInv.value.copy(I.spin.matrixWorld).invert());
  S.U.uInv.value.copy(S.spin.matrixWorld).invert();
  if(pr) updateParticles(pr[0],pr[1],pr[2],pr[3]); else points.visible=false;
}

/* =====================================================================
   SCROLL → TIMELINE (scrub lissé) + UI
   ===================================================================== */
let cur=0, tgt=0, curCh=-1;
const chaps=[...document.querySelectorAll('.chap')], bars=[...document.querySelectorAll('.prog b')];
let inView=true;
function onScroll(){
  const max=EXP.offsetHeight-innerHeight;
  tgt=clamp(max>0?(scrollY-EXP.offsetTop)/max:0);
  inView = scrollY < EXP.offsetTop+EXP.offsetHeight;
}
const bar=$('progressBar');
function setLoad(k){ stage.style.setProperty('--load',k); }
function ui(f){
  const ch=f<.21?0:f<.49?1:2;
  if(ch!==curCh){ chaps.forEach((c,i)=>c.classList.toggle('on',i===ch)); curCh=ch; }
  [[0,.21],[.21,.49],[.49,.66]].forEach(([a,b],i)=>bars[i].style.transform=`scaleX(${clamp((f-a)/(b-a))})`);
  const B=document.body.classList;
  B.toggle('scrolled',f>.015); B.toggle('end',f>.68); B.toggle('picks',f>.9);
  bar.style.transform=`scaleX(${f})`;
}

/* qualité adaptative : on mesure le temps de frame juste après l'apparition */
const perf={n:0, sum:0, stage:0, last:0};
function adapt(dt){
  if(perf.stage>2 || !ready || document.hidden) return;
  if(dt>100) return;                                   // onglet en pause / à-coup de chargement
  perf.n++; perf.sum+=dt;
  if(perf.n<90) return;
  const avg=perf.sum/perf.n; perf.n=0; perf.sum=0;
  if(avg<24){ perf.stage=3; return; }                  // fluide : on garde tout
  if(perf.stage===0 && renderer.getPixelRatio()>1){ renderer.setPixelRatio(1); layout(); }
  else if(perf.stage<=1 && Q.hi){
    Q.hi=false;
    scene.traverse(o=>{ if(o.isMesh && o.material.transmission>0){ o.material.transmission=0;
      o.material.transparent=true; o.material.opacity=.38; o.material.needsUpdate=true; } });
    npActive=NP>>1;
  }
  perf.stage++;
}

renderer.setAnimationLoop(now => {
  adapt(now-(perf.last||now)); perf.last=now;
  cur += (tgt-cur)*.085; if(Math.abs(tgt-cur)<1e-4) cur=tgt;
  ui(cur);
  if(!inView || document.hidden) return;              // scène sortie de l'écran : on ne dessine plus
  if(!ready){ renderer.render(scene,camera); return; }
  sceneAt(cur, now);
  renderer.render(scene,camera);
});

/* =====================================================================
   INTERACTIONS
   ===================================================================== */
picks.forEach((b,j)=>{
  b.addEventListener('pointerenter',()=>hover=j);
  b.addEventListener('pointerleave',()=>hover=-1);
  b.addEventListener('focus',()=>{ hover=j; if(!document.body.classList.contains('picks')) toChoice(); });   // clavier : amène au choix des pièces au lieu d'un bouton invisible
  b.addEventListener('blur',()=>hover=-1);
  b.addEventListener('click',()=>choose(b.dataset.k));
});
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('on'),3800); }
function choose(k){
  if(leaving) return;
  leaving=k; leaveT=performance.now(); document.body.classList.add('leaving');
  setTimeout(()=>location.href=`${CONFIG_URL}?piece=${k}${EN?'&lang=en':'&lang=fr'}`,1000);
}
addEventListener('scroll',onScroll,{passive:true});
addEventListener('resize',layout);
addEventListener('pageshow',e=>{ if(e.persisted){ leaving=null; document.body.classList.remove('leaving'); } });

function toChoice(){ scrollTo({top:EXP.offsetTop+EXP.offsetHeight-innerHeight,behavior:'instant'}); onScroll(); cur=tgt; }
layout();
if(location.hash==='#collection'){                   // retour depuis le configurateur : le choix des pièces
  skipIntro=true;
  if('scrollRestoration' in history) history.scrollRestoration='manual';
  toChoice(); addEventListener('load',toChoice,{once:true});
}
// liens internes vers le choix des pièces
document.querySelectorAll('a[href="#collection"]').forEach(a=>a.addEventListener('click',e=>{
  e.preventDefault(); history.replaceState(null,'','#collection'); scrollTo({top:EXP.offsetTop+EXP.offsetHeight-innerHeight,behavior:'smooth'});
}));
onScroll();
