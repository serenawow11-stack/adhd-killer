/* Swap photography only behind closed curtains; retain fixed cabin geometry. */
(()=>{
const car=document.querySelector('#car'),photo=car.querySelector('.photo.open');
const urls=Array.from({length:9},(_,i)=>`assets/scenery/route-${i+1}.png`);
const cache=new Map();let index=-1,pending=null,activeURL=null,covered=false;
function load(url){if(cache.has(url))return cache.get(url);const promise=new Promise((resolve,reject)=>{const im=new Image(),timeout=setTimeout(()=>reject(Error('Scenery timeout')),12000);im.onload=()=>{clearTimeout(timeout);resolve(im)};im.onerror=()=>{clearTimeout(timeout);reject(Error('Scenery unavailable'))};im.src=url});cache.set(url,promise);promise.catch(()=>cache.delete(url));return promise}
const base=load('assets/cabin-portrait-window.png');
// Normalized glass outlines exclude the mirror, window frames, wheel and dashboard.
const front=[[.115,.034],[.363,.03],[.363,.071],[.631,.071],[.631,.03],[.892,.034],[.892,.582],[.115,.582]];
const passenger=[[.923,.06],[.952,.048],[.952,.19],[.923,.198]];
const vent=[[.923,.216],[.952,.208],[.952,.342],[.923,.347]];
const driver=[[.052,.058],[.077,.069],[.077,.185],[.052,.179]];
function cover(ctx,img,points,focus=.57){ctx.save();ctx.beginPath();points.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](x*1086,y*1448));ctx.closePath();ctx.clip();const xs=points.map(p=>p[0]*1086),ys=points.map(p=>p[1]*1448),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;const s=Math.max(w/img.width,h/img.height),dw=img.width*s,dh=img.height*s;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)*focus,dw,dh);ctx.fillStyle='rgba(202,205,176,.035)';ctx.fillRect(x,y,w,h);ctx.restore()}
async function compose(n){const [cabin,img]=await Promise.all([base,load(urls[n])]);const canvas=document.createElement('canvas');canvas.width=1086;canvas.height=1448;const ctx=canvas.getContext('2d');ctx.drawImage(cabin,0,0,1086,1448);cover(ctx,img,front,.52);cover(ctx,img,passenger,.42);cover(ctx,img,vent,.42);cover(ctx,img,driver,.45);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Scenery render failed');return {canvas,url:URL.createObjectURL(blob),index:n}}
function prepare(){if(pending)return;covered=false;pending=compose((index+1)%urls.length).then(scene=>({scene}),error=>({error}));}
async function commit(){if(!pending)return;const request=pending;const result=await request;if(request!==pending)return;pending=null;if(result.error){console.warn('Keeping previous scenery:',result.error);return}const scene=result.scene;photo.style.backgroundImage=`url("${scene.url}")`;window.setDrivingScene?.(scene.canvas);if(activeURL)URL.revokeObjectURL(activeURL);activeURL=scene.url;index=scene.index;car.dataset.scenery=String(index+1);load(urls[(index+1)%urls.length]).catch(()=>{});}
window.journeyScenery={prepare,covered:()=>{covered=true;return commit()},beforeReveal:()=>covered?commit():Promise.resolve()};
load(urls[0]).catch(()=>{});
window.addEventListener('pagehide',()=>{if(activeURL)URL.revokeObjectURL(activeURL)});
})();
