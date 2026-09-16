(() => {
  const canvas=document.createElement('canvas'), ctx=canvas.getContext('2d',{willReadFrequently:true});
  const W=160,H=120; canvas.width=W; canvas.height=H;
  let last=null, smooth=null, timer=0, enabled=true, stableText='', stableCount=0;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  function analyze(el,kind){
    try{ctx.drawImage(el,0,0,W,H)}catch{return null}
    const d=ctx.getImageData(0,0,W,H).data, lum=new Float32Array(W*H);let sum=0,dark=0,bright=0,sat=0;
    for(let i=0,p=0;i<d.length;i+=4,p++){const r=d[i],g=d[i+1],b=d[i+2],y=.2126*r+.7152*g+.0722*b;lum[p]=y;sum+=y;if(y<22)dark++;if(y>238)bright++;sat+=(Math.max(r,g,b)-Math.min(r,g,b))/255}
    const mean=sum/lum.length, blocks=[], cols=8,rows=6,bw=W/cols,bh=H/rows;let salSum=0,sx=0,sy=0,edgeSum=0,horiz=0,vert=0;
    for(let by=0;by<rows;by++)for(let bx=0;bx<cols;bx++){let score=0,count=0;for(let y=Math.floor(by*bh)+1;y<Math.floor((by+1)*bh)-1;y+=2)for(let x=Math.floor(bx*bw)+1;x<Math.floor((bx+1)*bw)-1;x+=2){let p=y*W+x,gx=Math.abs(lum[p+1]-lum[p-1]),gy=Math.abs(lum[p+W]-lum[p-W]);score+=gx+gy+Math.abs(lum[p]-mean)*.22;edgeSum+=gx+gy;horiz+=gy;vert+=gx;count++}score/=Math.max(1,count);blocks.push(score);salSum+=score;sx+=(bx+.5)/cols*score;sy+=(by+.5)/rows*score}
    let cx=salSum?sx/salSum:.5,cy=salSum?sy/salSum:.5;
    let mirror=0,mirrorBase=0;for(let y=2;y<H-2;y+=3)for(let x=2;x<W/2;x+=3){const a=lum[y*W+x],b=lum[y*W+(W-1-x)];mirror+=Math.abs(a-b);mirrorBase+=Math.abs(a-mean)+Math.abs(b-mean)}
    const symmetry=clamp(1-mirror/Math.max(1,mirrorBase)), edge=clamp(edgeSum/(W*H*25)), clipping=Math.max(dark,bright)/lum.length;
    let motion=0;if(last){for(let i=0;i<lum.length;i+=8)motion+=Math.abs(lum[i]-last[i]);motion/=lum.length/8}last=lum;
    const stability=kind==='upload'||kind==='demo'?1:clamp(1-motion/22), thirdsDist=Math.min(...[1/3,2/3].flatMap(x=>[1/3,2/3].map(y=>Math.hypot(cx-x,cy-y)))), centered=Math.hypot(cx-.5,cy-.48);
    let score=72;score-=Math.abs(mean-125)*.22;score-=clipping*55;score-=Math.min(thirdsDist,.35)*34;score-=Math.max(0,.42-edge)*16;score-=Math.max(0,.7-stability)*24;score=clamp(score/100)*100;
    const candidate={mean,dark:dark/lum.length,bright:bright/lum.length,saturation:sat/lum.length,edge,stability,symmetry,cx,cy,thirdsDist,centered,score,axis:horiz>vert*1.18?'horizontal':vert>horiz*1.18?'vertical':'mixed'};
    if(!smooth)smooth=candidate;else for(const k of Object.keys(candidate))if(typeof candidate[k]==='number')smooth[k]=smooth[k]*.68+candidate[k]*.32; else smooth[k]=candidate[k];
    return smooth;
  }
  function advice(m){
    if(m.mean<48)return ['Too dark - find more light','Light low','light'];
    if(m.mean>210||m.bright>.14)return ['Highlights are clipping - lower exposure','Light harsh','light'];
    if(m.dark>.32)return ['Lift the shadows or face the light','Shadows heavy','light'];
    if(m.stability<.58)return ['Hold still for a cleaner frame','Motion high','motion'];
    if(m.edge<.22)return ['Tap to focus or move closer','Detail soft','detail'];
    if(m.symmetry>.72&&m.centered>.18)return [m.cx<.5?'Move a little left to centre it':'Move a little right to centre it','Symmetry found','symmetry','centered'];
    if(m.centered<.09&&m.symmetry<.5)return ['Try placing the subject off-centre','Subject centred','balance','thirds'];
    if(m.thirdsDist>.18){const tx=m.cx<.5?1/3:2/3,ty=m.cy<.5?1/3:2/3,dx=tx-m.cx,dy=ty-m.cy;let move=Math.abs(dx)>Math.abs(dy)?(dx>0?'Move the frame right':'Move the frame left'):(dy>0?'Tilt down slightly':'Tilt up slightly');return [move+' for stronger balance','Balance adjusting','balance','thirds']}
    if(m.mean>72&&m.mean<188&&m.stability>.82)return ['Good balance - hold it there','Light good','ready'];
    return ['Simplify the frame around one subject','Scene busy','detail'];
  }
  function render(m){
    const a=advice(m), text=a[0];if(text===stableText)stableCount++;else{stableText=text;stableCount=0}if(stableCount<1)return;
    document.querySelector('#coachNudge').textContent=text;document.querySelector('#coachMode').textContent=a[2]==='ready'?'Frame ready':'Live scene coach';document.querySelector('#coachScore').style.width=Math.round(m.score)+'%';
    document.querySelector('#lightSignal').textContent=m.mean<55?'Light low':m.mean>205?'Light harsh':'Light good';document.querySelector('#levelSignal').textContent=m.axis==='horizontal'?'Lines horizontal':m.axis==='vertical'?'Lines vertical':'Lines mixed';document.querySelector('#balanceSignal').textContent=m.symmetry>.7?'Symmetry strong':m.thirdsDist<.16?'Balance good':'Balance shifting';
    const coach=document.querySelector('#coach');coach.dataset.state=a[2];
    if(a[3]&&window.framefinderSelectGuide&&document.querySelector('[data-guide="'+a[3]+'"]')?.getAttribute('aria-selected')!=='true')window.framefinderSelectGuide(a[3],true);
  }
  function tick(el,kind){clearTimeout(timer);if(!enabled||!el)return;const m=analyze(el,kind);if(m)render(m);timer=setTimeout(()=>tick(el,kind),kind==='camera'?420:850)}
  window.SceneCoach={start(el,kind){last=null;smooth=null;stableText='';stableCount=0;document.querySelector('#coach').hidden=false;document.querySelector('#coachNudge').textContent='Hold still while I read the frame';tick(el,kind)},stop(){clearTimeout(timer);document.querySelector('#coach').hidden=true},toggle(){enabled=!enabled;const b=document.querySelector('#coachToggle'),c=document.querySelector('#coach');b.setAttribute('aria-pressed',String(enabled));c.classList.toggle('off',!enabled);document.querySelector('#coachNudge').textContent=enabled?'Reading the scene again':'Coaching paused';if(enabled){const kind=window.framefinderSource?.();const el=kind==='camera'?document.querySelector('#camera'):kind==='upload'?document.querySelector('#uploaded'):document.querySelector('#demo');tick(el,kind)}}};
  addEventListener('DOMContentLoaded',()=>document.querySelector('#coachToggle').onclick=()=>SceneCoach.toggle());
})();
