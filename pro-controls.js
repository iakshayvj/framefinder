(() => {
  const $=s=>document.querySelector(s);
  let track=null,caps={};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const getCaps=()=>{try{return track?.getCapabilities?.()||{}}catch(e){return{}}};
  const settings=()=>{try{return track?.getSettings?.()||{}}catch(e){return{}}};
  const sup=()=>{try{return navigator.mediaDevices.getSupportedConstraints?.()||{}}catch(e){return{}}};
  async function apply(patch){
    if(!track||track.readyState!=='live')return false;
    try{await track.applyConstraints({advanced:[patch]});return true}
    catch(e){try{await track.applyConstraints(patch);return true}catch(e2){console.warn('Constraint failed',patch,e2);return false}}
  }
  function toast(msg){const t=$('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2400)}

  function makeRow(label){
    const r=document.createElement('div');r.className='pro-row';
    const h=document.createElement('div');h.className='pro-row-head';
    const l=document.createElement('span');l.className='pro-label';l.textContent=label;h.appendChild(l);
    r.appendChild(h);return{row:r,head:h};
  }
  function chips(list,current,onPick){
    const wrap=document.createElement('div');wrap.className='pro-chips';
    list.forEach(item=>{
      const b=document.createElement('button');b.type='button';b.className='pro-chip';
      b.textContent=item.label;if(String(item.value)===String(current))b.classList.add('active');
      b.onclick=async()=>{const ok=await onPick(item.value);if(ok!==false)wrap.querySelectorAll('.pro-chip').forEach(x=>x.classList.toggle('active',x===b));};
      wrap.appendChild(b);
    });
    return wrap;
  }
  function slider(min,max,step,value,fmt,onInput){
    const wrap=document.createElement('div');wrap.className='pro-slider';
    const s=document.createElement('input');s.type='range';s.min=min;s.max=max;if(step)s.step=step;s.value=value;
    const out=document.createElement('span');out.className='pro-value';out.textContent=fmt(value);
    s.oninput=async()=>{const v=parseFloat(s.value);out.textContent=fmt(v);await onInput(v);};
    wrap.appendChild(s);wrap.appendChild(out);return wrap;
  }

  async function build(){
    const rows=$('#proRows');rows.innerHTML='';let n=0;
    caps=getCaps();const set=settings();
    const note=$('#proNote');note.textContent='';

    // Lens / camera selection
    let devices=[];
    try{devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput')}catch(e){}
    if(devices.length>1){
      const{row}=makeRow('Lens / camera');
      row.appendChild(chips(devices.map((d,i)=>({label:d.label||('Camera '+(i+1)),value:d.deviceId})),set.deviceId,
        async id=>{if(window.framefinderRestartCamera){await window.framefinderRestartCamera(id);return true}return false}));
      rows.appendChild(row);n++;
    }

    // Zoom
    if(caps.zoom&&caps.zoom.max>caps.zoom.min){
      const{row}=makeRow('Zoom');
      const presets=[0.5,1,2,3,5,10].filter(v=>v>=caps.zoom.min-0.01&&v<=caps.zoom.max+0.01);
      row.appendChild(chips(presets.map(v=>({label:(v+'').replace('.0','')+'x',value:v})),Math.round((set.zoom||1)*2)/2,
        async v=>{const ok=await apply({zoom:v});const z=row.querySelector('input');if(ok&&z){z.value=v;const o=row.querySelector('.pro-value');if(o)o.textContent=fmtX(v)}return ok}));
      row.appendChild(slider(caps.zoom.min,caps.zoom.max,caps.zoom.step,set.zoom||caps.zoom.min,fmtX,async v=>apply({zoom:v})));
      rows.appendChild(row);n++;
    }

    // Torch
    const torchBtn=$('#torchBtn');
    if(caps.torch===true){
      torchBtn.hidden=false;
      torchBtn.classList.toggle('active',!!set.torch);
      torchBtn.onclick=async()=>{
        const on=!torchBtn.classList.contains('active');
        const ok=await apply({torch:on});
        if(ok)torchBtn.classList.toggle('active',on);else toast('Torch is not available on this camera');
      };
      const{row}=makeRow('Torch');
      row.appendChild(chips([{label:'Off',value:false},{label:'On',value:true}],!!set.torch,
        async v=>{const ok=await apply({torch:v});if(ok)torchBtn.classList.toggle('active',v);return ok}));
      rows.appendChild(row);n++;
    }else torchBtn.hidden=true;

    // Focus
    const fm=caps.focusMode||[];
    if(fm.length>1){
      const{row}=makeRow('Focus mode');
      row.appendChild(chips(fm.map(v=>({label:v==='single-shot'?'Single shot':v[0].toUpperCase()+v.slice(1),value:v})),set.focusMode,
        async v=>apply({focusMode:v})));
      rows.appendChild(row);n++;
    }
    if(fm.includes('manual')&&caps.focusDistance){
      const{row}=makeRow('Focus distance');
      row.appendChild(slider(caps.focusDistance.min,caps.focusDistance.max,caps.focusDistance.step,set.focusDistance??caps.focusDistance.min,v=>v.toFixed(2)+' m',async v=>apply({focusMode:'manual',focusDistance:v})));
      rows.appendChild(row);n++;
    }
    if(focusAvailable())note.textContent='Tap the preview to set the focus point. ';

    // Exposure
    const em=caps.exposureMode||[];
    if(em.length>1){
      const{row}=makeRow('Exposure mode');
      row.appendChild(chips(em.map(v=>({label:v[0].toUpperCase()+v.slice(1),value:v})),set.exposureMode,async v=>apply({exposureMode:v})));
      rows.appendChild(row);n++;
    }
    if(caps.exposureCompensation){
      const{row}=makeRow('Exposure compensation');
      row.appendChild(slider(caps.exposureCompensation.min,caps.exposureCompensation.max,caps.exposureCompensation.step,set.exposureCompensation??0,v=>(v>0?'+':'')+v.toFixed(1)+' EV',async v=>apply({exposureCompensation:v})));
      rows.appendChild(row);n++;
    }
    if(caps.exposureTime&&em.includes('manual')){
      const{row}=makeRow('Shutter speed');
      row.appendChild(slider(caps.exposureTime.min,caps.exposureTime.max,caps.exposureTime.step,set.exposureTime??caps.exposureTime.min,v=>v<1?('1/'+Math.max(1,Math.round(1/v))+' s'):(v.toFixed(1)+' s'),async v=>apply({exposureMode:'manual',exposureTime:v})));
      rows.appendChild(row);n++;
    }
    if(caps.iso){
      const{row}=makeRow('ISO');
      row.appendChild(slider(caps.iso.min,caps.iso.max,caps.iso.step,set.iso??caps.iso.min,v=>'ISO '+Math.round(v),async v=>apply({iso:v})));
      rows.appendChild(row);n++;
    }

    // White balance
    const wb=caps.whiteBalanceMode||[];
    if(wb.length>1){
      const{row}=makeRow('White balance');
      row.appendChild(chips(wb.map(v=>({label:v[0].toUpperCase()+v.slice(1),value:v})),set.whiteBalanceMode,async v=>apply({whiteBalanceMode:v})));
      rows.appendChild(row);n++;
    }
    if(caps.colorTemperature&&wb.includes('manual')){
      const{row}=makeRow('Colour temperature');
      row.appendChild(slider(caps.colorTemperature.min,caps.colorTemperature.max,caps.colorTemperature.step,set.colorTemperature??caps.colorTemperature.min,v=>Math.round(v)+' K',async v=>apply({whiteBalanceMode:'manual',colorTemperature:v})));
      rows.appendChild(row);n++;
    }

    // Frame rate
    if(caps.frameRate&&caps.frameRate.max>caps.frameRate.min){
      const list=[24,25,30,50,60].filter(v=>v>=caps.frameRate.min-0.5&&v<=caps.frameRate.max+0.5);
      if(list.length>1){
        const{row}=makeRow('Frame rate');
        row.appendChild(chips(list.map(v=>({label:v+' fps',value:v})),Math.round(set.frameRate||30),async v=>apply({frameRate:{ideal:v}})));
        rows.appendChild(row);n++;
      }
    }

    // Resolution
    if(caps.width&&caps.height&&caps.height.max>=720){
      const list=[720,1080,2160].filter(h=>h<=caps.height.max+1);
      if(list.length>1){
        const{row}=makeRow('Resolution');
        row.appendChild(chips(list.map(h=>({label:h>=2160?'4K':(h+'p'),value:h})),Math.min(...list.filter(h=>h>=(set.height||1080)),list[list.length-1]),
          async h=>{const ok=await apply({width:{ideal:Math.round(h*16/9)},height:{ideal:h}});if(!ok)toast('Resolution cannot change while this camera is live');return ok}));
        rows.appendChild(row);n++;
      }
    }

    if(n>0&&n<=2&&!note.textContent)note.textContent='This browser exposes only the controls listed; everything else stays automatic.';
    return n;
  }

  function fmtX(v){return (Math.round(v*10)/10)+'x'}
  function focusAvailable(){
    if(!track||track.readyState!=='live')return false;
    const fm=caps.focusMode||[];
    return !!sup().pointsOfInterest||fm.includes('single-shot')||fm.includes('manual');
  }
  async function focusAt(clientX,clientY){
    if(!track)return;
    const video=$('#camera'),r=video.getBoundingClientRect();
    const vw=video.videoWidth||r.width,vh=video.videoHeight||r.height;
    const scale=Math.max(r.width/vw,r.height/vh),dispW=vw*scale,dispH=vh*scale;
    const px=clamp((clientX-r.left-(r.width-dispW)/2)/dispW,0,1),py=clamp((clientY-r.top-(r.height-dispH)/2)/dispH,0,1);
    const ring=$('#focusRing');
    if(ring){const stage=$('#stage').getBoundingClientRect();ring.style.left=(clientX-stage.left)+'px';ring.style.top=(clientY-stage.top)+'px';ring.hidden=false;ring.classList.remove('pulse');void ring.offsetWidth;ring.classList.add('pulse');clearTimeout(ring._t);ring._t=setTimeout(()=>ring.hidden=true,900)}
    const patch={pointsOfInterest:[{x:px,y:py}]};
    const fm=caps.focusMode||[];
    if(fm.includes('single-shot'))patch.focusMode='single-shot';
    const ok=await apply(patch);
    if(!ok)toast('Focus point is not supported on this camera');
  }
  function closeSheet(){$('#proSheet').hidden=true;$('#proToggle').classList.remove('active')}
  function toggleSheet(){const s=$('#proSheet');s.hidden=!s.hidden;$('#proToggle').classList.toggle('active',!s.hidden)}

  window.ProControls={
    async attach(stream){
      track=stream?.getVideoTracks?.()[0]||null;
      if(!track){this.detach();return}
      await new Promise(r=>setTimeout(r,400));
      caps=getCaps();
      const n=await build();
      $('#proToggle').hidden=n===0;
      closeSheet();
    },
    detach(){track=null;caps={};const p=$('#proToggle');if(p){p.hidden=true}const t=$('#torchBtn');if(t)t.hidden=true;closeSheet()},
    focusAt,focusAvailable
  };
  addEventListener('DOMContentLoaded',()=>{
    $('#proToggle').onclick=toggleSheet;
    $('#proClose').onclick=closeSheet;
  });
})();
