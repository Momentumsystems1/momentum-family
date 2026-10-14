// BAYMOVE: opt-in/open-map fallback for Android builds without a Google Maps SDK key.
// It uses MapLibre GL JS inside the already-installed react-native-webview, not a mock map.
// Loads public OpenFreeMap vector tiles online; no precise location is uploaded by this view.
import React, { useEffect, useMemo, useRef } from "react";
import { View, Text } from "react-native";
import WebView, { WebViewMessageEvent } from "react-native-webview";

import type { MapCanvasProps, LatLng, MapPerson } from "@/src/components/MapCanvas";

const RED = "#C91E32";
const encode = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");

type Payload = {
  people: MapCanvasProps["people"];
  pins: NonNullable<MapCanvasProps["pins"]>;
  selected: MapCanvasProps["selected"];
  polyline: MapCanvasProps["polyline"];
  center: MapCanvasProps["center"];
  perspective: MapCanvasProps["perspective"];
};

const html = `<!doctype html><html lang="es"><head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link href="https://unpkg.com/maplibre-gl@5.6.2/dist/maplibre-gl.css" rel="stylesheet"/>
<style>*{box-sizing:border-box}html,body,#map{margin:0;width:100%;height:100%;background:#edf0f0;overflow:hidden}
.maplibregl-control-container{display:none}.marker{height:40px;width:40px;border:3px solid white;border-radius:50%;background:#C91E32;color:#fff;box-shadow:0 3px 12px #0003;font:700 17px system-ui;display:flex;align-items:center;justify-content:center}
.pin{font:700 23px system-ui;color:#C91E32;text-shadow:0 1px 3px white}
#loading{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font:13px system-ui;color:#746E73;background:white;padding:10px 15px;border-radius:14px;z-index:2}
</style></head><body><div id="map"></div><div id="loading">Cargando mapa libre…</div>
<script src="https://unpkg.com/maplibre-gl@5.6.2/dist/maplibre-gl.js"></script>
<script>
(function() {
 const post = (data) => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(data));
 if(!window.maplibregl) {document.getElementById("loading").textContent="No se pudo descargar MapLibre. Comprueba Internet.";return;}
 const map = new maplibregl.Map({container:"map",style:"https://tiles.openfreemap.org/styles/liberty",center:[-3.60,40.05],zoom:5.5,attributionControl:false,pitchWithRotate:true,dragRotate:true});
 let peopleMarkers=[], pinMarkers=[], selectionMarker=null, lastCenterKey=null;
 let activeGesture=false, data=null;
 function clearMarkers(arr) {arr.forEach(m=>m.remove());return [];}
 const makePin = (label,color,css="marker") => {const e=document.createElement("div");e.className=css;e.style.backgroundColor=css==="marker"?color:"transparent";e.textContent=label;return e;};
 function paint(d) {
   if(!map.loaded())return;
   peopleMarkers=clearMarkers(peopleMarkers);pinMarkers=clearMarkers(pinMarkers);
   if(selectionMarker){selectionMarker.remove();selectionMarker=null;}
   for(const p of d.people||[]) {
     if(p.state!=="shared" || !Number.isFinite(p.lat) || !Number.isFinite(p.lng))continue;
     const el=makePin((p.name||"?").slice(0,1).toUpperCase(),p.color||"#C91E32");
     el.addEventListener("click", ev=>{ev.stopPropagation();post({type:"person",member_id:p.member_id});});
     peopleMarkers.push(new maplibregl.Marker({element:el}).setLngLat([p.lng,p.lat]).addTo(map));
   }
   for(const p of d.pins||[]) {
     const el=makePin("●",p.color||RED,"pin");
     pinMarkers.push(new maplibregl.Marker({element:el}).setLngLat([p.lng,p.lat]).addTo(map));
   }
   if(d.selected)selectionMarker=new maplibregl.Marker({color:"#C91E32"}).setLngLat([d.selected.lng,d.selected.lat]).addTo(map);
   const route=(d.polyline||[]).map(p=>[p[1],p[0]]);
   const src=map.getSource("route");
   const feature={type:"Feature",properties:{},geometry:{type:"LineString",coordinates:route.length>=2?route:[]}};
   if(src)src.setData(feature);
   else {map.addSource("route",{type:"geojson",data:feature});map.addLayer({id:"route-line",type:"line",source:"route",paint:{"line-color":"#C91E32","line-width":5,"line-opacity":0.85}});}
   if(route.length>=2){const bounds=route.reduce((b,c)=>b.extend(c),new maplibregl.LngLatBounds(route[0],route[0]));map.fitBounds(bounds,{padding:{top:175,bottom:255,left:45,right:45},maxZoom:15,duration:500});}
   else if(d.center && lastCenterKey!==String(d.center.key)+":"+d.center.lat+":"+d.center.lng) {
     lastCenterKey=String(d.center.key)+":"+d.center.lat+":"+d.center.lng;
     map.easeTo({center:[d.center.lng,d.center.lat],zoom:15,duration:450});
   }
   if(d.perspective)map.easeTo({pitch:d.perspective==="3d"?55:0,duration:500});
 }
 window.BAYMOVE_SET=(d)=>{data=d;paint(d);};
 map.on("load",()=>{document.getElementById("loading").style.display="none";if(data)paint(data);post({type:"ready"});});
 map.on("error",(e)=>{if(e.error)post({type:"map-error",message:String(e.error.message||e.error)});});
 map.on("movestart",e=>{if(e.originalEvent && !activeGesture){activeGesture=true;post({type:"move-start"});}});
 map.on("moveend",()=>{if(activeGesture){activeGesture=false;post({type:"move-end"});}});
 map.on("click",e=>post({type:"press",lat:e.lngLat.lat,lng:e.lngLat.lng}));
 let pressTimer=null;
 map.getCanvas().addEventListener("touchstart",e=>{if(e.touches.length===1){const x=e.touches[0].clientX,y=e.touches[0].clientY;pressTimer=setTimeout(()=>{const point=map.unproject([x,y]);post({type:"longpress",lat:point.lat,lng:point.lng});},650);}}, {passive:true});
 ["touchmove","touchend","touchcancel"].forEach(name=>map.getCanvas().addEventListener(name,()=>{if(pressTimer){clearTimeout(pressTimer);pressTimer=null;}},{passive:true}));
})();
</script></body></html>`;

export function MapCanvasOpen({ people, pins = [], selected, polyline, center, perspective, onPersonPress, onMapPress, onMapLongPress, onInteractionStart, onInteractionEnd }: MapCanvasProps) {
  const web = useRef<WebView>(null);
  const loaded = useRef(false);
  const payload: Payload = useMemo(() => ({
    people: people.filter(p => p.state === "shared" && p.lat != null && p.lng != null),
    pins, selected, polyline, center, perspective
  }), [people, pins, selected, polyline, center, perspective]);
  const serialized = useMemo(() => encode(payload), [payload]);

  useEffect(() => {
    if (loaded.current) web.current?.injectJavaScript(`window.BAYMOVE_SET(${serialized});true;`);
  }, [serialized]);

  const onMessage = (event: WebViewMessageEvent) => {
    let m: any;
    try { m = JSON.parse(event.nativeEvent.data); } catch { return; }
    if (m.type === "ready") {
      loaded.current = true;
      web.current?.injectJavaScript(`window.BAYMOVE_SET(${serialized});true;`);
    } else if (m.type === "press" && Number.isFinite(m.lat) && Number.isFinite(m.lng)) {
      onMapPress?.({ lat: m.lat, lng: m.lng });
    } else if (m.type === "longpress" && Number.isFinite(m.lat) && Number.isFinite(m.lng)) {
      onMapLongPress?.({ lat: m.lat, lng: m.lng });
    } else if (m.type === "person") {
      const p = people.find((p: MapPerson) => p.member_id === m.member_id);
      if (p) onPersonPress?.(p);
    } else if (m.type === "move-start") onInteractionStart?.();
    else if (m.type === "move-end") onInteractionEnd?.();
  };

  return <View style={{ flex: 1, backgroundColor: "#EDF0F0" }} testID="open-free-map">
    <WebView ref={web} source={{ html, baseUrl: "https://tiles.openfreemap.org/" }} originWhitelist={["*"]}
      javaScriptEnabled domStorageEnabled cacheEnabled
      scrollEnabled={false} overScrollMode="never"
      onMessage={onMessage} onLoadStart={() => { loaded.current = false; }}
      onHttpError={(ev) => { /* MapLibre surfaces tile errors in the web layer. */ }}
      style={{ flex: 1, backgroundColor: "#EDF0F0" }} />
    <View style={{ position: "absolute", right: 10, top: 10, backgroundColor: "#FFFFFFE8", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 }} pointerEvents="none">
      <Text style={{ fontSize: 10, color: "#746E73" }}>Mapa libre · requiere Internet</Text>
    </View>
  </View>;
}
