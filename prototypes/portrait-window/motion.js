/* One reversible timeline for the cabin, and object-anchored dialog transitions. */
(()=>{
const car=document.querySelector('#car'),timer=document.querySelector('#timer'),modal=document.querySelector('#modal');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const duration=n=>reduced?0:n;
let trip=null,busy=false,origin=null,closing=false;
// Hinged wooden casements close before the destination changes.
const glass=document.createElement('div');glass.className='casement-pair';glass.setAttribute('aria-hidden','true');glass.innerHTML='<div class="casement-leaf casement-left"></div><div class="casement-leaf casement-right"></div>';car.append(glass);
const leftLeaf=glass.children[0],rightLeaf=glass.children[1];
gsap.set(leftLeaf,{rotationY:-88,autoAlpha:0});gsap.set(rightLeaf,{rotationY:88,autoAlpha:0});
window.parkMotion=()=>{
 window.journeyScenery?.prepare();trip?.kill();busy=true;document.querySelector('#finish').disabled=true;
 car.classList.add('shifting');timer.hidden=false;
 gsap.set(timer,{opacity:0,scale:.2,xPercent:-13,yPercent:-40,rotation:-5});
 trip=gsap.timeline({onComplete:()=>{busy=false;document.querySelector('#finish').disabled=false;}})
 .set([leftLeaf,rightLeaf],{autoAlpha:1})
 .to(leftLeaf,{rotationY:0,duration:duration(1.25),ease:'power2.inOut'})
 .to(rightLeaf,{rotationY:0,duration:duration(1.3),ease:'power2.inOut'},'<.1')
 .add(()=>{car.classList.add('parked');window.journeyScenery?.covered();})
 .to(timer,{opacity:1,scale:1,xPercent:0,yPercent:0,rotation:0,duration:duration(.7),ease:'power3.out'});
};
window.resumeMotion=async()=>{
 busy=true;document.querySelector('#finish').disabled=true;
 await window.journeyScenery?.beforeReveal();trip?.kill();
 trip=gsap.timeline({onComplete:()=>{busy=false;car.classList.remove('shifting');timer.hidden=true;}})
 .to(timer,{opacity:0,scale:.2,yPercent:-40,xPercent:-13,duration:duration(.45),ease:'power2.in'})
 .add(()=>car.classList.remove('parked'))
 .to(rightLeaf,{rotationY:88,duration:duration(1.3),ease:'power2.inOut'})
 .to(leftLeaf,{rotationY:-88,duration:duration(1.25),ease:'power2.inOut'},'<.1')
 .set([leftLeaf,rightLeaf],{autoAlpha:0});
};
// Capture the source object before an existing click handler opens the dialog.
document.addEventListener('click',e=>{const hit=e.target.closest('[data-panel],#goal,#stop');if(hit)origin=hit;},true);
const nativeShow=modal.showModal.bind(modal),nativeClose=modal.close.bind(modal);
function delta(){const a=origin?.getBoundingClientRect(),b=modal.getBoundingClientRect();return a?{x:a.left+a.width/2-b.left-b.width/2,y:a.top+a.height/2-b.top-b.height/2,scale:Math.max(.12,Math.min(.38,a.width/b.width))}:{x:0,y:20,scale:.94}}
let objectTimeline=null,activeObject=null,focusBefore=null;
function objectType(){return modal.classList.contains('journal-modal')?'journal':modal.classList.contains('album-modal')?'album':modal.classList.contains('drawer-modal')?'drawer':null}
function resetObject(){modal.classList.remove('physical-object','object-album','object-journal','object-drawer');modal.querySelector('.pickup-cover')?.remove();gsap.set(modal,{clearProps:'transform,opacity'});gsap.set('#content',{clearProps:'opacity'});}
modal.showModal=function(){
 focusBefore=document.activeElement;nativeShow();closing=false;
 requestAnimationFrame(()=>{
  if(closing||!modal.open)return;
  objectTimeline?.kill();gsap.killTweensOf(modal);resetObject();activeObject=objectType();
  if(!activeObject){const d=delta();objectTimeline=gsap.fromTo(modal,{...d,opacity:.15},{x:0,y:0,scale:1,opacity:1,duration:duration(.65),ease:'power3.inOut'});return;}
  modal.classList.add('physical-object','object-'+activeObject);
  const d=delta(),content=modal.querySelector('#content');
  if(activeObject==='drawer'){
   // The open drawer advances along its rail, then the paper becomes legible.
   gsap.set(content,{opacity:0});
   objectTimeline=gsap.timeline().fromTo(modal,{x:d.x,y:d.y,scale:d.scale,rotationX:7,opacity:.8},{x:d.x*.5,y:d.y+30,scale:d.scale*1.8,rotationX:3,opacity:1,duration:duration(.4),ease:'power2.inOut'})
   .to(modal,{x:0,y:0,scale:1,rotationX:0,duration:duration(.65),ease:'power2.inOut'})
   .to(content,{opacity:1,duration:duration(.25)},'>-.1');
  }else{
   const cover=document.createElement('div');cover.className='pickup-cover '+activeObject+'-cover';cover.setAttribute('aria-hidden','true');cover.innerHTML='<span>'+(activeObject==='album'?'今日足迹':'旅行手帐')+'</span>';modal.append(cover);
   gsap.set(content,{opacity:0});
   objectTimeline=gsap.timeline().fromTo(modal,{x:d.x,y:d.y,scale:d.scale,rotation:-3,rotationX:22,opacity:1},{x:d.x*.85,y:d.y-35,scale:d.scale*1.22,rotation:-2,rotationX:12,duration:duration(.3),ease:'power2.out'})
   .to(modal,{x:0,y:0,scale:1,rotation:0,rotationX:0,duration:duration(.65),ease:'power2.inOut'})
   .set(content,{opacity:1})
   .to(cover,{rotationY:-155,opacity:0,duration:duration(.65),ease:'power2.inOut'});
  }
 });
};
modal.close=function(){
 if(closing||!modal.open)return;closing=true;objectTimeline?.kill();gsap.killTweensOf(modal);
 const d=delta(),cover=modal.querySelector('.pickup-cover');
 objectTimeline=gsap.timeline({onComplete:()=>{nativeClose();resetObject();closing=false;activeObject=null;focusBefore?.focus({preventScroll:true})}});
 if(cover){objectTimeline.to(cover,{rotationY:0,opacity:1,duration:duration(.4),ease:'power2.inOut'}).set('#content',{opacity:0});}
 objectTimeline.to(modal,{...d,rotation:activeObject&&activeObject!=='drawer'?-3:0,opacity:activeObject?1:0,duration:duration(.65),ease:'power3.inOut'});
};
modal.addEventListener('cancel',e=>{e.preventDefault();modal.close()});
// Pointer drag is constrained to one shift axis; clicks remain an alternative.
const gear=document.querySelector('.gear-console');let start=null,moved=false;
gear.style.touchAction='none';gear.addEventListener('pointerdown',e=>{if(busy)return;start=e.clientY;moved=false;gear.setPointerCapture(e.pointerId)});
gear.addEventListener('pointermove',e=>{if(start===null)return;const dy=Math.max(-30,Math.min(30,e.clientY-start));if(Math.abs(dy)>5)moved=true;if(moved)gsap.set(gear,{rotation:dy*.35})});
gear.addEventListener('pointerup',()=>{if(start===null)return;start=null;if(moved){gsap.to(gear,{rotation:0,duration:duration(.2),clearProps:'transform'});if(!car.classList.contains('parked'))document.querySelector('#stop').click();} });
gear.addEventListener('click',e=>{if(moved&&e.isTrusted){e.preventDefault();e.stopImmediatePropagation();moved=false}},true);
gear.addEventListener('pointercancel',()=>{start=null;gsap.set(gear,{clearProps:'transform'})});
})();
