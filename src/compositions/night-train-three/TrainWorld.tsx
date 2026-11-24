import React from "react";
import {useCurrentFrame, useVideoConfig, interpolate, Easing} from "remotion";
import {useThree} from "@react-three/fiber";
import * as THREE from "three";
import {ThreeScene, GroundPlane} from "../../shared/three-scene";

type V3=[number,number,number];
const CameraMove:React.FC<{from:V3;to:V3;lookFrom:V3;lookTo:V3}> = ({from,to,lookFrom,lookTo})=>{
 const f=useCurrentFrame(),{durationInFrames}=useVideoConfig(),{camera}=useThree();
 const t=interpolate(f,[0,durationInFrames-1],[0,1],{extrapolateRight:"clamp",easing:Easing.inOut(Easing.cubic)});
 camera.position.set(...from.map((v,i)=>THREE.MathUtils.lerp(v,to[i]!,t)) as V3);
 const target=lookFrom.map((v,i)=>THREE.MathUtils.lerp(v,lookTo[i]!,t)) as V3; camera.lookAt(...target); return null;
};
const Mountain:React.FC<{position:V3;scale:V3;color:string;seed:number}> = ({position,scale,color,seed})=>{
 const geometry=React.useMemo(()=>{
  const g=new THREE.ConeGeometry(1,2,7,5); const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i); const wobble=Math.sin((i+seed)*2.13)*.08+Math.cos((i+seed)*.71)*.05; p.setXYZ(i,x*(1+wobble),y+(y>-.9?wobble*.7:0),z*(1+wobble));}
  g.computeVertexNormals(); return g;
 },[seed]);
 return <mesh geometry={geometry} position={position} scale={scale} receiveShadow><meshStandardMaterial color={color} roughness={1} flatShading/></mesh>;
};
const Window:React.FC<{x:number;y:number;z:number}> = ({x,y,z})=><mesh position={[x,y,z]}><boxGeometry args={[.34,.3,.035]}/><meshStandardMaterial color="#ffca78" emissive="#ff9d3e" emissiveIntensity={2.4} roughness={.35}/></mesh>;
const Coach:React.FC<{position:V3;index:number}> = ({position,index})=><group position={position}>
 <mesh position={[0,.82,0]}><boxGeometry args={[3.65,1.45,1.55]}/><meshStandardMaterial color={index%2?"#263e50":"#314c5d"} metalness:.38 roughness:.48/></mesh>
 <mesh position={[0,1.58,0]}><boxGeometry args={[3.68,.12,1.58]}/><meshStandardMaterial color="#9aaab0" metalness:.65 roughness:.32/></mesh>
 <mesh position={[0,.21,0]}><boxGeometry args={[3.72,.22,1.62]}/><meshStandardMaterial color="#101d27" metalness:.3/></mesh>
 {Array.from({length:7},(_,i)=><Window key={i} x={-1.48+i*.49} y={1.05} z={.792}/>)}
 {[-1.1,1.1].map(x=><group key={x} position={[x,.25,0]}>
  {[-.62,.62].map(z=><mesh key={z} position={[0,0,z]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.35,.35,.13,12]}/><meshStandardMaterial color="#080d13" roughness:.9/></mesh>)}
 </group>)}
 <mesh position={[1.86,.78,0]}><boxGeometry args={[.12,.65,1.52]}/><meshStandardMaterial color="#a6b5bc" metalness:.55/></mesh>
 </group>;
const Locomotive:React.FC=()=> <group>
 <mesh position={[0,1.05,0]}><boxGeometry args={[4.3,1.7,1.85]}/><meshStandardMaterial color="#233e50" metalness:.52 roughness:.34/></mesh>
 <mesh position={[-1.35,1.9,0]}><boxGeometry args={[1.25,.5,1.9]}/><meshStandardMaterial color="#172c3b" metalness:.4/></mesh>
 <mesh position={[-.75,1.72,.94]}><boxGeometry args={[.72,.82,.045]}/><meshStandardMaterial color="#e9c88e" emissive="#ffb34d" emissiveIntensity={1.7}/></mesh>
 <mesh position={[.85,1.55,.94]}><boxGeometry args={[.9,.65,.045]}/><meshStandardMaterial color="#e9c88e" emissive="#ffb34d" emissiveIntensity={1.5}/></mesh>
 <mesh position={[2.13,.88,.14]}><boxGeometry args={[.12,.32,.38]}/><meshStandardMaterial color="#e5d4a8" emissive="#ffcf79" emissiveIntensity={3.5}/></mesh>
 <mesh position={[2.12,.88,-.14]}><boxGeometry args={[.12,.32,.38]}/><meshStandardMaterial color="#e5d4a8" emissive="#ffcf79" emissiveIntensity={3.5}/></mesh>
 <mesh position={[2.25,.88,0]}><sphereGeometry args={[.13,10,8]}/><meshStandardMaterial color="#fff2ca" emissive="#ffc568" emissiveIntensity={4}/></mesh>
 <mesh position={[-.1,2.03,0]}><cylinderGeometry args={[.23,.28,.75,9]}/><meshStandardMaterial color="#101b25" roughness:.7/></mesh>
 <mesh position={[0,.18,0]}><boxGeometry args={[4.5,.22,1.95]}/><meshStandardMaterial color="#0a121a" metalness:.5/></mesh>
 {[-1.35,1.3].map(x=><group key={x} position={[x,.28,0]}>{[-.82,.82].map(z=><mesh key={z} position={[0,0,z]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.43,.43,.16,14]}/><meshStandardMaterial color="#070d13" roughness:.9/></mesh>)}</group>)}
 </group>;
const Track:React.FC=()=> <group position={[0,.03,0]}>
 <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,0]}><planeGeometry args={[100,12]}/><meshStandardMaterial color="#172532" roughness:1/></mesh>
 {Array.from({length:72},(_,i)=><mesh key={i} position={[-40+i*1.15,.08,0]}><boxGeometry args={[.22,.16,3.8]}/><meshStandardMaterial color="#5d6264" roughness:1}/></mesh>)}
 {[-1.15,1.15].map(z=><mesh key={z} position={[0,.2,z]}><boxGeometry args={[100,.2,.16]}/><meshStandardMaterial color="#85929a" metalness:.8 roughness:.35}/></mesh>)}
 </group>;
const Snowfall:React.FC=()=>{
 const f=useCurrentFrame();
 const positions=React.useMemo(()=>{const a=new Float32Array(900*3);for(let i=0;i<900;i++){a[i*3]=(Math.sin(i*91.7)*.5+.5)*54-27;a[i*3+1]=(Math.sin(i*43.1)*.5+.5)*19+1;a[i*3+2]=(Math.cos(i*31.9)*.5+.5)*23-11.5;}return a;},[]);
 const moved=React.useMemo(()=>new Float32Array(positions.length),[positions]);
 for(let i=0;i<900;i++){moved[i*3]=positions[i*3]!+Math.sin(f*.035+i)*.55;moved[i*3+1]=1+((positions[i*3+1]! - f*.085 + 20)%20);moved[i*3+2]=positions[i*3+2]!;}
 return <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[moved,3]}/></bufferGeometry><pointsMaterial color="#eef7ff" size={.075} transparent opacity={.8} sizeAttenuation/></points>;
};
const SceneLights:React.FC=()=> <><ambientLight intensity={.32}/><directionalLight position={[-8,13,4]} intensity={1.5} color="#b8d5ef"/><directionalLight position={[5,6,-7]} intensity={.8} color="#809fc7"/><pointLight position={[5,3,2]} intensity={22} distance={25} color="#ffc777"/></>;
export const TrainWorld:React.FC<{shot:"side"|"low"|"high"}> = ({shot})=>{
 const f=useCurrentFrame();
 const trainX=shot==="side"?interpolate(f,[0,209],[15,-15]):shot==="low"?interpolate(f,[0,209],[7,-8]):interpolate(f,[0,209],[3,-5]);
 const camera=shot==="side"?{from:[9,4.2,12] as V3,to:[-2,4.0,12] as V3,lookFrom:[0,1,0] as V3,lookTo:[0,1,0] as V3}:shot==="low"?{from:[11,1.45,4] as V3,to:[2,1.55,4] as V3,lookFrom:[0,1.0,0] as V3,lookTo:[-1,1,0] as V3}:{from:[15,13,18] as V3,to:[8,17,23] as V3,lookFrom:[0,0,0] as V3,lookTo:[-3,0,0] as V3};
 return <ThreeScene background="#081522" fog="#263b50" cameraFrom={camera.from} cameraTo={camera.to}>
  <CameraMove {...camera}/>
  <SceneLights/>
  <group position={[0,-.08,0]}><GroundPlane color="#1b2c3b" width={70} depth={40}/></group>
  <Track/>
  <group position={[trainX,0,0]}><Locomotive/>{Array.from({length:5},(_,i)=><Coach key={i} position={[-4.05-i*3.9,0,0]} index={i}/>)}</group>
  <Mountain position={[-17,5,-10]} scale={[10,12,8]} color="#71879b" seed={1}/>
  <Mountain position={[-4,5,-13]} scale={[9,11,8]} color="#526e83" seed={2}/>
  <Mountain position={[12,4,-12]} scale={[12,10,8]} color="#435c70" seed={3}/>
  <Mountain position={[20,3,8]} scale={[9,8,7]} color="#31485e" seed={4}/>
  <Mountain position={[-23,3,8]} scale={[9,9,8]} color="#405a70" seed={5}/>
  <Snowfall/>
 </ThreeScene>;
};
