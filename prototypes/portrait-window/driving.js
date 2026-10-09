/* Depth-weighted photographic reprojection. A bounded loop, not reconstructed 3D. */
(()=>{
const car=document.querySelector('#car'),canvas=document.createElement('canvas');canvas.className='driving-render';canvas.setAttribute('aria-hidden','true');
const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false});if(!gl)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
try{
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=vec2((p.x+1.0)*.5,(1.0-p.y)*.5);gl_Position=vec4(p,0.,1.);}'));
gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec2 uv;uniform sampler2D photo;uniform float travel;uniform float speed;
vec3 scene(float phase){
float depth=smoothstep(.25,.60,uv.y);depth*=depth;
vec2 vanishing=vec2(.5,.49);
vec2 offset=(uv-vanishing)*depth*phase*.09;
offset.x+=sin(travel*.14)*.0018*depth;
return texture2D(photo,uv-offset).rgb;
}
void main(){float phase=fract(travel*.035);float second=fract(phase+.5);float blend=.5-.5*cos(phase*6.2831853);vec3 color=mix(scene(phase),scene(second),blend);
// Blend seamlessly into fixed window borders; never move roof or dashboard.
float edge=smoothstep(.115,.135,uv.x)*(1.-smoothstep(.875,.893,uv.x))*smoothstep(.075,.095,uv.y)*(1.-smoothstep(.565,.584,uv.y));
float light=sin(travel*.38)*.008*speed;gl_FragColor=vec4(color+light,edge);}`));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('link failed');gl.useProgram(program);
const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
const uTravel=gl.getUniformLocation(program,'travel'),uSpeed=gl.getUniformLocation(program,'speed');let distance=0,speed=0,last=0,raf=0,ready=false;
function resize(){const r=car.getBoundingClientRect(),ratio=Math.min(devicePixelRatio,1.5);canvas.width=Math.min(2200,Math.round(r.width*ratio));canvas.height=Math.round(canvas.width/.75);gl.viewport(0,0,canvas.width,canvas.height)}
new ResizeObserver(resize).observe(car);
function frame(now){const dt=Math.min((now-(last||now))/1000,.05);last=now;const target=reduced.matches||car.matches('.shifting,.parked')?0:1;speed+=(target-speed)*(1-Math.exp(-dt*1.8));distance+=dt*speed;gl.uniform1f(uTravel,distance);gl.uniform1f(uSpeed,speed);gl.drawArrays(gl.TRIANGLES,0,6);raf=requestAnimationFrame(frame)}
let currentScene=null;window.setDrivingScene=source=>{currentScene=source;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);distance=0;gl.uniform1f(uTravel,0);gl.drawArrays(gl.TRIANGLES,0,6)};
const img=new Image();img.onload=()=>{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,currentScene||img);car.insertBefore(canvas,car.querySelector('.passing-light'));car.classList.add('depth-driving');resize();ready=true;raf=requestAnimationFrame(frame)};img.src='assets/cabin-portrait-window.png';
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(raf);if(!document.hidden&&ready){last=0;raf=requestAnimationFrame(frame)}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);canvas.remove();car.classList.remove('depth-driving')});
}catch(e){console.warn('Driving effect unavailable; showing still scenery.',e)}
})();
