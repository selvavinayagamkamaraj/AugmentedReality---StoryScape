import { writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { Character3DFactory } from '../src/characters/Character3DFactory.ts';
// GLTFExporter uses the browser FileReader interface for Blob serialization.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result=result; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(result => { this.result=`data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }); }
};
for (const [type,color] of [['cat','#fb923c'],['bird','#38bdf8']]) {
  const rig=Character3DFactory.createCharacter3D({id:type,name:type,type,appearance:type,color});
  rig.head.name='head'; rig.body.name='body'; rig.limbs.forEach((l,i)=>l.name=`limb_${i}`); rig.wings?.forEach((w,i)=>w.name=`wing_${i}`);
  const clips=[];
  for (const action of ['idle','walk','run','talk','sit','jump','wave','look','turn','happy','sad','surprised','fly','eat','drink','read']) {
    const times=[0,0.25,0.5,0.75,1];
    const tracks=[];
    const addRotation=(node,axis,amplitude,offset=0,phase=0)=>{
      const values=times.flatMap((t)=>new THREE.Quaternion().setFromAxisAngle(axis, offset+Math.sin(t*Math.PI*2+phase)*amplitude).toArray());
      tracks.push(new THREE.QuaternionKeyframeTrack(`${node.name}.quaternion`,times,values));
    };
    addRotation(rig.head,new THREE.Vector3(1,0,0), ['talk','eat','drink'].includes(action)?0.16:0.035, ['eat','read','sad'].includes(action)?0.25:0);
    if (['walk','run','jump','sit','wave'].includes(action)) rig.limbs.forEach((limb,i)=>addRotation(limb,new THREE.Vector3(1,0,0),action==='run'?0.7:0.35, action==='sit'?-0.4:0,i%2?Math.PI:0));
    if (action==='fly') rig.wings?.forEach((wing,i)=>addRotation(wing,new THREE.Vector3(0,0,1),0.8,0,i%2?Math.PI:0));
    clips.push(new THREE.AnimationClip(action,1,tracks));
  }
  const bytes=await new GLTFExporter().parseAsync(rig.root,{binary:true,animations:clips});
  await writeFile(new URL(`../public/models/${type}.glb`,import.meta.url),Buffer.from(bytes));
  console.log(`${type}.glb: ${bytes.byteLength} bytes, ${clips.length} animation clips`);
}
