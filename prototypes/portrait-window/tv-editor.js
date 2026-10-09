/* Edit the actual dashboard TV, with a camera move anchored to its screen. */
(()=>{
const car=document.querySelector('#car'),tv=document.querySelector('#goal'),viewport=document.querySelector('.viewport');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let phase='idle',original='',animation=null,previousFocus=null,wasShifting=false;
const editor=document.createElement('form');editor.id='tv-editor';editor.hidden=true;
editor.innerHTML='<label for="tv-task" class="sr-only">当前小时任务</label><textarea id="tv-task" rows="3" maxlength="60" required aria-describedby="tv-guide" spellcheck="false"></textarea><small id="tv-guide">转上方旋钮 · 确认</small><button type="submit" class="tv-knob confirm-knob" aria-label="转动上方旋钮，保存任务"></button><button type="button" class="tv-knob return-knob" aria-label="按下下方旋钮，取消并返回"></button><span class="tv-dial-pointer" aria-hidden="true"></span><span id="tv-message" role="status"></span>';
tv.append(editor);const field=editor.querySelector('textarea'),confirm=editor.querySelector('.confirm-knob'),back=editor.querySelector('.return-knob');
function camera(){
 gsap.set(car,{clearProps:'transform'});
 const v=viewport.getBoundingClientRect(),c=car.getBoundingClientRect(),r=tv.getBoundingClientRect();
 const scale=Math.min(5.5,v.width*.64/r.width,v.height*.60/r.height);
 return {scale,x:v.width*.5-(r.left-c.left+r.width*.5)*scale,y:v.height*.49-(r.top-c.top+r.height*.5)*scale};
}
window.openTvEditor=()=>{
 if(phase!=='idle')return;
 const modal=document.querySelector('#modal');
 if(modal.open){modal.addEventListener('close',window.openTvEditor,{once:true});modal.close();return;}
 phase='opening';previousFocus=document.activeElement;original=window.tvTask.read();field.value=original;
 editor.hidden=false;tv.classList.add('editing');tv.removeAttribute('role');tv.setAttribute('tabindex','-1');
 car.classList.add('tv-focused');wasShifting=car.classList.contains('shifting');car.classList.add('shifting');
 const pose=camera();gsap.set(car,{transformOrigin:'0 0'});
 animation=gsap.to(car,{...pose,duration:reduced.matches?0:1.05,ease:'power3.inOut',onComplete:()=>{phase='editing';field.focus({preventScroll:true});field.setSelectionRange(field.value.length,field.value.length)}});
};
function close(saved){
 if(phase==='idle'||phase==='closing')return;
 animation?.kill();phase='closing';field.blur();editor.querySelector('#tv-message').textContent=saved?'已记录':'返回旅途';
 animation=gsap.to(car,{x:0,y:0,scale:1,duration:reduced.matches?0:.9,delay:(saved&&!reduced.matches)?0.3:0,ease:'power3.inOut',onComplete:()=>{
 editor.hidden=true;tv.classList.remove('editing');car.classList.remove('tv-focused');if(!wasShifting)car.classList.remove('shifting');
 gsap.set(car,{clearProps:'transform,transformOrigin'});gsap.set('.tv-dial-pointer',{clearProps:'transform'});
 tv.setAttribute('role','button');tv.setAttribute('tabindex','0');editor.querySelector('#tv-message').textContent='';phase='idle';(previousFocus&&previousFocus.getClientRects().length?previousFocus:tv).focus({preventScroll:true});
 }});
}
editor.addEventListener('click',e=>e.stopPropagation());editor.addEventListener('keydown',e=>e.stopPropagation());
editor.addEventListener('submit',e=>{e.preventDefault();if(phase!=='editing')return;const value=field.value.trim();if(!value){field.setCustomValidity('请写下这一小时的任务');field.reportValidity();return}window.tvTask.write(value);gsap.to('.tv-dial-pointer',{rotation:75,duration:reduced.matches?0:.25,ease:'power2.out'});close(true)});
field.addEventListener('input',()=>field.setCustomValidity(''));
back.onclick=()=>close(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&phase!=='idle'){e.preventDefault();close(false)}},true);
// Keep tab focus inside the two physical knobs and screen while the camera is close.
document.addEventListener('keydown',e=>{if(e.key!=='Tab'||phase==='idle'||phase==='closing')return;const items=[field,confirm,back],i=items.indexOf(document.activeElement);e.preventDefault();items[(i+(e.shiftKey?2:1)+3)%3].focus()},true);
window.addEventListener('resize',()=>{if(phase==='editing'){animation?.kill();gsap.set(car,{...camera(),transformOrigin:'0 0'})}});
})();
