// ============================================================
// SENTINEL ORB LAB V2 — FAKE FIRST PERSONALITY LAB
// ============================================================
// Purpose: polish the Orb as an independent visual/interaction system over the
// map before reconnecting production tools. The map stays visible. The 3D
// renderer is transparent and communicates with React Native through a tiny
// bridge. Final tool selection emits only a visual-lab event.
// ============================================================

import React, { useMemo, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { MapCanvas } from "@/src/components/MapCanvas";
import { ORB_FAMILIES } from "@/src/copy";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const TONE_HEX: Record<string, string> = {
  cyan: "#22D3EE",
  green: "#2DD4A7",
  blue: "#4F9CF9",
  amber: "#F6B84A",
  violet: "#9B7BFF",
  red: "#FF5D73",
};

function makeOrbHtml(graphJson: string) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent;touch-action:none;-webkit-user-select:none;user-select:none}
canvas{display:block;width:100%;height:100%;background:transparent}
#status{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);font:600 12px system-ui;color:rgba(255,255,255,.72);background:rgba(5,10,22,.62);padding:9px 12px;border-radius:12px;backdrop-filter:blur(10px);display:none}
</style>
<script type="importmap">
{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.183.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.183.0/examples/jsm/"}}
</script>
</head>
<body>
<div id="status">Cargando Orbe…</div>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const DATA=${graphJson};
const PALETTE={cyan:0x22D3EE,green:0x2DD4A7,blue:0x4F9CF9,amber:0xF6B84A,violet:0x9B7BFF,red:0xFF5D73,root:0x9B7BFF};
const state={mode:'parents',activeFamily:null,physics:true};

function post(payload){
  try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(payload));}catch(e){}
}

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,0.1,1600);
camera.position.set(0,45,330);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
renderer.setSize(innerWidth,innerHeight);
renderer.setClearColor(0x000000,0);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.22;
document.body.appendChild(renderer.domElement);

const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;
controls.dampingFactor=.08;
controls.enablePan=true;
controls.enableZoom=true;
controls.enableRotate=true;
controls.minDistance=120;
controls.maxDistance=650;
controls.target.set(0,0,0);

scene.add(new THREE.AmbientLight(0xffffff,1.15));
const key=new THREE.DirectionalLight(0xffffff,1.55);key.position.set(100,180,160);scene.add(key);
const fill=new THREE.DirectionalLight(0x6b8cff,.75);fill.position.set(-120,-50,-120);scene.add(fill);
const rim=new THREE.PointLight(0xb499ff,28,500,2);rim.position.set(0,20,90);scene.add(rim);

const graphGroup=new THREE.Group();
scene.add(graphGroup);
const linksGroup=new THREE.Group();
const nodesGroup=new THREE.Group();
graphGroup.add(linksGroup);graphGroup.add(nodesGroup);

const nodes=[];
const nodeMap={};
const links=[];
const highGeo=new THREE.SphereGeometry(1,38,38);
const lowGeo=new THREE.SphereGeometry(1,22,22);
const labelCache={};

function labelTexture(text){
  if(labelCache[text])return labelCache[text];
  const c=document.createElement('canvas');c.width=512;c.height=150;
  const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);
  x.font='600 38px system-ui,-apple-system,sans-serif';x.textAlign='center';x.textBaseline='middle';
  x.shadowColor='rgba(0,0,0,.75)';x.shadowBlur=12;x.fillStyle='#fff';
  const words=String(text).split(' ');let lines=[''];
  words.forEach(function(w){const i=lines.length-1;const trial=(lines[i]+' '+w).trim();if(x.measureText(trial).width>430&&lines[i])lines.push(w);else lines[i]=trial;});
  const h=43;const sy=c.height/2-(lines.length-1)*h/2;lines.forEach(function(l,i){x.fillText(l,c.width/2,sy+i*h);});
  const t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;labelCache[text]=t;return t;
}

function addNode(spec){
  const color=spec.kind==='root'?PALETTE.root:(PALETTE[spec.tone]||PALETTE.cyan);
  const geo=spec.kind==='root'||spec.kind==='family'?highGeo:lowGeo;
  const mat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:spec.kind==='root'?.74:.5,roughness:.2,metalness:.08,transparent:true,opacity:.96});
  const mesh=new THREE.Mesh(geo,mat);mesh.scale.setScalar(spec.radius);mesh.position.set(spec.x,spec.y,spec.z);mesh.userData.nodeId=spec.id;nodesGroup.add(mesh);
  const glowMat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:spec.kind==='root'?.12:.075,side:THREE.BackSide,depthWrite:false});
  const glow=new THREE.Mesh(geo,glowMat);glow.scale.setScalar(spec.radius*(spec.kind==='root'?2.65:2.15));glow.position.copy(mesh.position);nodesGroup.add(glow);
  let glow2=null;
  if(spec.kind==='root'){
    const gm=new THREE.MeshBasicMaterial({color:0x6f5cff,transparent:true,opacity:.045,side:THREE.BackSide,depthWrite:false});
    glow2=new THREE.Mesh(geo,gm);glow2.scale.setScalar(spec.radius*4.1);glow2.position.copy(mesh.position);nodesGroup.add(glow2);
  }
  const tex=labelTexture(spec.label);
  const sm=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,opacity:.96});
  const sprite=new THREE.Sprite(sm);const sh=spec.kind==='root'?21:spec.kind==='family'?14:11;sprite.scale.set(48,sh,1);sprite.position.set(spec.x,spec.y+spec.radius+sh*.72,spec.z);nodesGroup.add(sprite);
  const n={...spec,mesh,glow,glow2,sprite,vx:0,vy:0,vz:0,pulse:Math.random()*Math.PI*2,visible:true};nodes.push(n);nodeMap[n.id]=n;return n;
}

function addLink(source,target){
  const color=target.kind==='root'?PALETTE.root:(PALETTE[target.tone]||PALETTE.cyan);
  const material=new THREE.LineBasicMaterial({color,transparent:true,opacity:.42,depthWrite:false});
  const geo=new THREE.BufferGeometry();
  const line=new THREE.Line(geo,material);linksGroup.add(line);
  const pmat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false});
  const particle=new THREE.Mesh(new THREE.SphereGeometry(.95,10,10),pmat);linksGroup.add(particle);
  const link={source,target,line,particle,phase:Math.random()};links.push(link);return link;
}

const root=addNode({id:'root',kind:'root',label:'Sentinel',tone:'violet',radius:29,x:0,y:0,z:0,parent:null});
const parentRadius=142;
DATA.forEach(function(f,i){
  const a=(i/DATA.length)*Math.PI*2-Math.PI/2;
  const z=[18,-26,34,-12,26,-32,8][i%7];
  const y=Math.sin(a)*parentRadius*.62;
  const x=Math.cos(a)*parentRadius;
  const p=addNode({id:f.key,kind:'family',label:f.label,tone:f.tone,radius:18,x:x*.78,y:y*.78,z:z,parent:'root',family:f.key});
  p.target={x,y,z};addLink(root,p);
  f.tools.forEach(function(t,j){
    const count=f.tools.length;const ca=(j/Math.max(1,count))*Math.PI*2+(i*.31);
    const cr=70+((j%2)*10);
    const c=addNode({id:f.key+':'+t.key,kind:'tool',label:t.label,tone:f.tone,radius:10.5,x:p.x+(Math.random()-.5)*12,y:p.y+(Math.random()-.5)*12,z:p.z+(Math.random()-.5)*12,parent:f.key,family:f.key,tool:t.key});
    c.target={x:x+Math.cos(ca)*cr,y:y+Math.sin(ca)*cr*.62,z:z+Math.sin(ca*.83)*36};
    addLink(p,c);
  });
});

function setVisible(n,v,spawn){
  n.visible=v;n.mesh.visible=v;n.glow.visible=v;if(n.glow2)n.glow2.visible=v;n.sprite.visible=v;
  if(v&&spawn){const p=nodeMap[n.parent];if(p){n.mesh.position.copy(p.mesh.position);n.glow.position.copy(p.mesh.position);if(n.glow2)n.glow2.position.copy(p.mesh.position);n.sprite.position.copy(p.mesh.position);n.vx=n.vy=n.vz=0;}}
}
function syncLinks(){links.forEach(function(l){const v=l.source.visible&&l.target.visible;l.line.visible=v;l.particle.visible=v;});}
function showParents(){
  state.mode='parents';state.activeFamily=null;
  nodes.forEach(function(n){setVisible(n,n.kind==='root'||n.kind==='family',false);});syncLinks();post({type:'state',mode:state.mode,activeFamily:null});
}
function collapseAll(){
  state.mode='collapsed';state.activeFamily=null;
  nodes.forEach(function(n){setVisible(n,n.kind==='root',false);});syncLinks();post({type:'state',mode:state.mode,activeFamily:null});
}
function expandAll(){
  state.mode='expanded';state.activeFamily=null;
  nodes.forEach(function(n){setVisible(n,true,n.kind==='tool'&&!n.visible);});syncLinks();post({type:'state',mode:state.mode,activeFamily:null});
}
function focusFamily(key){
  const parent=nodeMap[key];if(!parent)return;
  state.mode='family';state.activeFamily=key;
  nodes.forEach(function(n){const v=n.kind==='root'||n.id===key||n.parent===key;setVisible(n,v,v&&n.kind==='tool'&&!n.visible);});syncLinks();
  controls.target.set(parent.mesh.position.x*.25,parent.mesh.position.y*.25,parent.mesh.position.z*.25);post({type:'state',mode:state.mode,activeFamily:key});
}

showParents();

const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();
let dragged=null;let dragPlane=new THREE.Plane();let dragOffset=new THREE.Vector3();let downAt=0;let moved=false;
function hit(e){const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const meshes=nodes.filter(function(n){return n.visible;}).map(function(n){return n.mesh;});const h=raycaster.intersectObjects(meshes);return h.length?nodeMap[h[0].object.userData.nodeId]:null;}
renderer.domElement.addEventListener('pointerdown',function(e){if(e.button!==0)return;const n=hit(e);downAt=performance.now();moved=false;if(n){dragged=n;controls.enabled=false;const dir=new THREE.Vector3();camera.getWorldDirection(dir);dragPlane.setFromNormalAndCoplanarPoint(dir.negate(),n.mesh.position);const q=new THREE.Vector3();raycaster.ray.intersectPlane(dragPlane,q);dragOffset.copy(n.mesh.position).sub(q);}});
renderer.domElement.addEventListener('pointermove',function(e){if(!dragged)return;moved=true;const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const q=new THREE.Vector3();if(raycaster.ray.intersectPlane(dragPlane,q)){q.add(dragOffset);dragged.mesh.position.copy(q);dragged.vx=dragged.vy=dragged.vz=0;}});
renderer.domElement.addEventListener('pointerup',function(){if(!dragged)return;const n=dragged;const quick=performance.now()-downAt<270&&!moved;dragged=null;controls.enabled=true;if(quick)activate(n);});

function activate(n){
  if(n.kind==='root'){
    if(state.mode==='family'||state.mode==='expanded'||state.mode==='collapsed')showParents();else collapseAll();
    return;
  }
  if(n.kind==='family'){
    if(state.mode==='family'&&state.activeFamily===n.id){nodes.filter(function(x){return x.parent===n.id;}).forEach(function(x){setVisible(x,false,false);});syncLinks();state.mode='family-parent';post({type:'state',mode:state.mode,activeFamily:n.id});}
    else focusFamily(n.id);
    return;
  }
  if(n.kind==='tool')post({type:'tool',family:n.family,tool:n.tool,label:n.label});
}

function curveFor(l){const a=l.source.mesh.position,b=l.target.mesh.position;const m=new THREE.Vector3().addVectors(a,b).multiplyScalar(.5);m.y+=12;m.z+=Math.sin((a.x+b.x)*.02)*9;return new THREE.QuadraticBezierCurve3(a,m,b);}
function updateLinks(t){links.forEach(function(l){if(!l.line.visible)return;const c=curveFor(l);l.line.geometry.dispose();l.line.geometry=new THREE.BufferGeometry().setFromPoints(c.getPoints(30));const q=(t*.12+l.phase)%1;l.particle.position.copy(c.getPoint(q));});}

function simulate(){
  if(!state.physics)return;
  const vis=nodes.filter(function(n){return n.visible;});
  for(let i=0;i<vis.length;i++)for(let j=i+1;j<vis.length;j++){const a=vis[i],b=vis[j];if(a===dragged||b===dragged)continue;const pa=a.mesh.position,pb=b.mesh.position;const d=new THREE.Vector3().subVectors(pa,pb);let dist=d.length()||1;const min=(a.radius+b.radius)*3.2;if(dist<min){const f=(min-dist)/dist*.018;d.multiplyScalar(f);a.vx+=d.x;a.vy+=d.y;a.vz+=d.z;b.vx-=d.x;b.vy-=d.y;b.vz-=d.z;}}
  links.forEach(function(l){if(!l.line.visible)return;const a=l.source,b=l.target;if(a===dragged||b===dragged)return;const d=new THREE.Vector3().subVectors(b.mesh.position,a.mesh.position);const dist=d.length()||1;const ideal=a.kind==='root'?142:75;const f=(dist-ideal)/dist*.006;a.vx+=d.x*f;a.vy+=d.y*f;a.vz+=d.z*f;b.vx-=d.x*f;b.vy-=d.y*f;b.vz-=d.z*f;});
  vis.forEach(function(n){if(n===dragged)return;if(n.kind==='root'){n.vx+=(0-n.mesh.position.x)*.008;n.vy+=(0-n.mesh.position.y)*.008;n.vz+=(0-n.mesh.position.z)*.008;}else if(n.target){n.vx+=(n.target.x-n.mesh.position.x)*.0025;n.vy+=(n.target.y-n.mesh.position.y)*.0025;n.vz+=(n.target.z-n.mesh.position.z)*.0025;}n.vx*=.89;n.vy*=.89;n.vz*=.89;n.mesh.position.x+=n.vx;n.mesh.position.y+=n.vy;n.mesh.position.z+=n.vz;});
}

let travelStart=0;let travelActive=false;
function travel(){travelStart=performance.now();travelActive=true;}
function updateTravel(){if(!travelActive)return;const u=Math.min(1,(performance.now()-travelStart)/720);const e=1-Math.pow(1-u,4);graphGroup.position.x=Math.sin(e*Math.PI)*55;graphGroup.position.y=-Math.sin(e*Math.PI)*25;if(u>=1){travelActive=false;graphGroup.position.set(0,0,0);}}

window.SentinelOrb={command:function(name,arg){
  if(name==='parents')showParents();
  else if(name==='expandAll')expandAll();
  else if(name==='collapseAll')collapseAll();
  else if(name==='focusFamily')focusFamily(arg);
  else if(name==='reset'){camera.position.set(0,45,330);controls.target.set(0,0,0);controls.update();showParents();}
  else if(name==='zoomIn'){camera.position.multiplyScalar(.86);controls.update();}
  else if(name==='zoomOut'){camera.position.multiplyScalar(1.16);controls.update();}
  else if(name==='travel')travel();
  return true;
}};

const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);const t=clock.getElapsedTime();simulate();updateTravel();
  nodes.forEach(function(n){if(!n.visible)return;const p=n.mesh.position;n.glow.position.copy(p);if(n.glow2)n.glow2.position.copy(p);n.sprite.position.set(p.x,p.y+n.radius+(n.kind==='root'?15:n.kind==='family'?11:8),p.z);const pulse=1+Math.sin(t*(n.kind==='root'?1.65:1.15)+n.pulse)*(n.kind==='root'?.045:.018);n.mesh.scale.setScalar(n.radius*pulse);n.glow.scale.setScalar(n.radius*(n.kind==='root'?2.65:2.15)*(1+Math.sin(t*.8+n.pulse)*.055));if(n.glow2)n.glow2.scale.setScalar(n.radius*4.1*(1+Math.sin(t*.55)*.07));});
  updateLinks(t);controls.update();renderer.render(scene,camera);
}
animate();

addEventListener('resize',function(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
post({type:'ready',mode:state.mode});
</script>
</body>
</html>`;
}

export function OrbPersonalityLab() {
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const { colors } = useTheme();
  const webRef = useRef<any>(null);
  const [open, setOpen] = useState(false);
  const [interactionTarget, setInteractionTarget] = useState<"orb" | "map">("orb");
  const [sceneMode, setSceneMode] = useState("parents");
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const [toolPopup, setToolPopup] = useState(false);
  const [search, setSearch] = useState("");

  const graph = useMemo(
    () =>
      ORB_FAMILIES.map((f) => ({
        key: f.key,
        label: f.label,
        tone: f.tone,
        tools: f.tools.map((t) => ({ key: t.key, label: t.label })),
      })),
    [],
  );
  const html = useMemo(() => makeOrbHtml(JSON.stringify(graph)), [graph]);

  const command = (name: string, arg?: string) => {
    const payload = arg === undefined ? "undefined" : JSON.stringify(arg);
    webRef.current?.injectJavaScript(`window.SentinelOrb&&window.SentinelOrb.command(${JSON.stringify(name)},${payload});true;`);
  };

  const onMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "tool") setToolPopup(true);
      if (msg.type === "state") {
        setSceneMode(msg.mode ?? "parents");
        setActiveFamily(msg.activeFamily ?? null);
      }
    } catch {
      // Visual lab: ignore malformed bridge messages rather than affecting app state.
    }
  };

  const openOrb = () => {
    setOpen(true);
    setInteractionTarget("orb");
    setTimeout(() => command("parents"), 180);
  };

  const closeOrb = () => {
    setOpen(false);
    setActiveFamily(null);
    setSceneMode("parents");
  };

  return (
    <View style={s.root} testID="orb-personality-lab-v2">
      <MapCanvas people={[]} onPersonPress={() => undefined} />

      <View style={[s.searchWrap, { top: insets.top + spacing.sm }]}>
        <View style={s.searchBar}>
          <Text style={s.searchIcon}>⌕</Text>
          <TextInput
            testID="orb-lab-search"
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar dirección, comercio o lugar"
            placeholderTextColor={colors.muted}
            returnKeyType="go"
            onSubmitEditing={() => command("travel")}
            style={s.searchInput}
          />
          {search ? (
            <Pressable testID="orb-lab-go" onPress={() => command("travel")} style={s.goBtn}>
              <Text style={s.goTxt}>Ir</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {open ? (
        <>
          <View style={s.webLayer} pointerEvents={interactionTarget === "orb" ? "auto" : "none"}>
            {Platform.OS === "web" ? (
              <View style={s.webFallback}>
                <Text style={s.webFallbackTitle}>ORB LAB 3D</Text>
                <Text style={s.webFallbackText}>La versión WebGL del laboratorio se prueba en Android/iOS.</Text>
              </View>
            ) : (
              <WebView
                ref={webRef}
                source={{ html }}
                originWhitelist={["*"]}
                onMessage={onMessage}
                javaScriptEnabled
                domStorageEnabled={false}
                cacheEnabled
                overScrollMode="never"
                bounces={false}
                scrollEnabled={false}
                androidLayerType="hardware"
                style={s.webView}
                containerStyle={s.webViewContainer}
              />
            )}
          </View>

          <View style={[s.familyNavWrap, { top: insets.top + 66 }]} pointerEvents="box-none">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.familyNavContent}>
              {ORB_FAMILIES.map((f) => (
                <Pressable
                  key={f.key}
                  testID={`orb-lab-family-nav-${f.key}`}
                  onPress={() => {
                    setInteractionTarget("orb");
                    command("focusFamily", f.key);
                  }}
                  style={[s.familyChip, activeFamily === f.key && s.familyChipActive]}
                >
                  <View style={[s.familyDot, { backgroundColor: TONE_HEX[f.tone] }]} />
                  <Text style={[s.familyChipText, activeFamily === f.key && s.familyChipTextActive]}>{f.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <Pressable testID="orb-lab-close" onPress={closeOrb} style={[s.closeScene, { top: insets.top + 68 }]}>
            <Text style={s.closeSceneText}>×</Text>
          </Pressable>

          <View style={[s.controlsWrap, { bottom: insets.bottom + spacing.md }]} pointerEvents="box-none">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.controlsContent}>
              <Pressable
                testID="orb-lab-control-orb"
                onPress={() => setInteractionTarget("orb")}
                style={[s.control, interactionTarget === "orb" && s.controlActive]}
              >
                <Text style={[s.controlText, interactionTarget === "orb" && s.controlTextActive]}>Orbe</Text>
              </Pressable>
              <Pressable
                testID="orb-lab-control-map"
                onPress={() => setInteractionTarget("map")}
                style={[s.control, interactionTarget === "map" && s.controlActive]}
              >
                <Text style={[s.controlText, interactionTarget === "map" && s.controlTextActive]}>Mapa</Text>
              </Pressable>
              <Pressable testID="orb-lab-expand-all" onPress={() => { setInteractionTarget("orb"); command("expandAll"); }} style={[s.control, sceneMode === "expanded" && s.controlActive]}>
                <Text style={[s.controlText, sceneMode === "expanded" && s.controlTextActive]}>Expandir todo</Text>
              </Pressable>
              <Pressable testID="orb-lab-parents" onPress={() => command("parents")} style={s.control}>
                <Text style={s.controlText}>Parents</Text>
              </Pressable>
              <Pressable testID="orb-lab-zoom-out" onPress={() => command("zoomOut")} style={s.roundControl}><Text style={s.roundText}>−</Text></Pressable>
              <Pressable testID="orb-lab-zoom-in" onPress={() => command("zoomIn")} style={s.roundControl}><Text style={s.roundText}>+</Text></Pressable>
              <Pressable testID="orb-lab-reset" onPress={() => command("reset")} style={s.control}><Text style={s.controlText}>Centrar</Text></Pressable>
            </ScrollView>
          </View>
        </>
      ) : (
        <Pressable testID="orb-lab-core" onPress={openOrb} style={[s.closedOrbHit, { bottom: insets.bottom + 92 }]}>
          <View style={s.closedHaloOuter} />
          <View style={s.closedHaloInner} />
          <LinearGradient colors={["#B9A8FF", "#7F62F2", "#2FC8E8"]} start={{ x: 0.15, y: 0.1 }} end={{ x: 0.9, y: 0.9 }} style={s.closedCore}>
            <View style={s.closedShine} />
            <View style={s.closedSeed} />
          </LinearGradient>
        </Pressable>
      )}

      <View pointerEvents="none" style={[s.labMark, { bottom: insets.bottom + 18 }]}>
        <Text style={s.labMarkText}>ORB LAB · FAKE FIRST</Text>
      </View>

      <Modal visible={toolPopup} transparent animationType="fade" onRequestClose={() => setToolPopup(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.toolText}>HERRAMIENTA</Text>
            <Pressable testID="orb-lab-tool-close" onPress={() => setToolPopup(false)} style={s.toolClose}>
              <Text style={s.toolCloseText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.mapTint },
  searchWrap: { position: "absolute", left: spacing.md, right: spacing.md, zIndex: 90 },
  searchBar: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    backgroundColor: c.glassStrong,
    borderWidth: 1,
    borderColor: c.border,
    paddingLeft: 14,
    paddingRight: 6,
  },
  searchIcon: { color: c.muted, fontFamily: fonts.bold, fontSize: 22, marginRight: 8, marginTop: -2 },
  searchInput: { flex: 1, minWidth: 0, color: c.onSurface, fontFamily: fonts.medium, fontSize: 15, paddingVertical: 0 },
  goBtn: { minWidth: 44, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: c.brandPrimary },
  goTxt: { color: c.onBrandPrimary, fontFamily: fonts.bold, fontSize: 13 },
  webLayer: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, zIndex: 20 },
  webView: { flex: 1, backgroundColor: "transparent" },
  webViewContainer: { flex: 1, backgroundColor: "transparent" },
  webFallback: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(5,10,22,0.22)" },
  webFallbackTitle: { color: c.onSurface, fontFamily: fonts.bold, fontSize: 18 },
  webFallbackText: { marginTop: 6, color: c.muted, fontFamily: fonts.regular, fontSize: 12, textAlign: "center", paddingHorizontal: 30 },
  familyNavWrap: { position: "absolute", left: 0, right: 56, zIndex: 100 },
  familyNavContent: { gap: 6, paddingHorizontal: spacing.md },
  familyChip: { height: 36, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, borderRadius: 18, backgroundColor: c.glassStrong, borderWidth: 1, borderColor: c.border },
  familyChipActive: { backgroundColor: c.surfaceInverse, borderColor: c.glassStrong },
  familyDot: { width: 7, height: 7, borderRadius: 4 },
  familyChipText: { color: c.onSurface, fontFamily: fonts.semibold, fontSize: 11 },
  familyChipTextActive: { color: c.onSurfaceInverse },
  closeScene: { position: "absolute", right: spacing.md, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: c.glassStrong, borderWidth: 1, borderColor: c.border, zIndex: 110 },
  closeSceneText: { color: c.onSurface, fontFamily: fonts.regular, fontSize: 25, lineHeight: 27 },
  controlsWrap: { position: "absolute", left: 0, right: 0, zIndex: 120 },
  controlsContent: { gap: 7, paddingHorizontal: spacing.md, alignItems: "center" },
  control: { height: 38, paddingHorizontal: 12, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: c.glassStrong, borderWidth: 1, borderColor: c.border },
  controlActive: { backgroundColor: c.surfaceInverse, borderColor: c.glassStrong },
  controlText: { color: c.onSurface, fontFamily: fonts.semibold, fontSize: 11 },
  controlTextActive: { color: c.onSurfaceInverse },
  roundControl: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: c.glassStrong, borderWidth: 1, borderColor: c.border },
  roundText: { color: c.onSurface, fontFamily: fonts.bold, fontSize: 20, marginTop: -1 },
  closedOrbHit: { position: "absolute", right: spacing.xl, width: 82, height: 82, alignItems: "center", justifyContent: "center", zIndex: 70 },
  closedHaloOuter: { position: "absolute", width: 106, height: 106, borderRadius: 53, backgroundColor: "rgba(112,87,255,0.12)" },
  closedHaloInner: { position: "absolute", width: 92, height: 92, borderRadius: 46, backgroundColor: "rgba(47,200,232,0.10)" },
  closedCore: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.72)" },
  closedShine: { position: "absolute", top: 8, left: 15, width: 30, height: 13, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.42)", transform: [{ rotate: "-18deg" }] },
  closedSeed: { width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.88)", borderWidth: 5, borderColor: "rgba(113,84,240,0.75)" },
  labMark: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 130 },
  labMarkText: { color: c.muted, fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1.5, backgroundColor: c.glass, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, backgroundColor: "rgba(3,8,20,0.55)" },
  modalCard: { minWidth: 230, padding: spacing.xl, alignItems: "center", borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  toolText: { color: c.onSurface, fontFamily: fonts.bold, fontSize: 25, letterSpacing: 1.4 },
  toolClose: { marginTop: spacing.lg, minHeight: 44, paddingHorizontal: spacing.xl, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: c.brandPrimary },
  toolCloseText: { color: c.onBrandPrimary, fontFamily: fonts.bold, fontSize: 14 },
}));
