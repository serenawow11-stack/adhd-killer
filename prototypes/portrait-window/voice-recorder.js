/* Microphone capture remains local until the user explicitly requests transcription. */
(()=>{
const pen=document.querySelector('#voice-pen'),dialog=document.createElement('dialog');dialog.className='voice-dialog';
dialog.innerHTML=`<button class="voice-close" aria-label="合上记录，返回车厢">×</button><section class="voice-paper"><h2>今日 · 随笔</h2><p class="voice-status" role="status">按下录音，慢慢说下今天。</p><textarea class="voice-text" placeholder="今天，想记下些什么……" aria-label="语音转写文字"></textarea><div class="ink-actions"><button class="voice-transcribe" disabled>语音转写待接入</button><button class="voice-save">收进手帐 ↗</button></div></section><div class="recording-controls"><button class="recorder-trigger" aria-label="开始录音"><i aria-hidden="true"></i><span>开始录音</span></button><output class="recorder-clock">00:00</output></div><audio controls hidden></audio><a class="voice-download" hidden>保存录音 ↓</a><p class="voice-footnote">录音暂存本页，离开前请下载保存</p>`;
document.body.append(dialog);
const trigger=dialog.querySelector('.recorder-trigger'),status=dialog.querySelector('.voice-status'),clock=dialog.querySelector('output'),audio=dialog.querySelector('audio'),download=dialog.querySelector('a'),text=dialog.querySelector('textarea'),transcribe=dialog.querySelector('.voice-transcribe');
let media=null,stream=null,blob=null,url=null,interval=null,started=0,requesting=false;
function message(t){status.textContent=t}
function release(){stream?.getTracks().forEach(t=>t.stop());stream=null;clearInterval(interval);pen.classList.remove('recording');dialog.classList.remove('recording');trigger.setAttribute('aria-label','开始录音');trigger.querySelector('span').textContent='开始录音';trigger.disabled=false;}
pen.onclick=()=>{if(!dialog.open){dialog.showModal();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)dialog.animate([{opacity:0,transform:'translateY(24px) scale(.96)'},{opacity:1,transform:'none'}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)'});}};
dialog.querySelector('.voice-close').onclick=()=>{if(requesting||media?.state==='recording'){message('请先点击红色按钮结束录音。');return}audio.pause();dialog.close()};
dialog.addEventListener('close',()=>audio.pause());
dialog.addEventListener('cancel',e=>{if(requesting||media?.state==='recording'){e.preventDefault();message('请先结束录音，再关闭录音笔。')}});
trigger.onclick=async()=>{
 if(requesting)return;
 if(media?.state==='recording'){trigger.disabled=true;media.stop();return}
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){message('当前浏览器不支持录音，请使用 HTTPS 网站或本机预览，在 Safari/Chrome 中打开。');return}
 requesting=true;trigger.disabled=true;message('等待麦克风权限…');
 try{
 stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
 const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));
 media=new MediaRecorder(stream,mime?{mimeType:mime}:{});const chunks=[];
 media.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
 media.onerror=()=>{release();message('录音出现错误，请重试。')};
 media.onstop=()=>{blob=new Blob(chunks,{type:media.mimeType||mime||'audio/webm'});release();if(!blob.size){message('没有录到音频，请重新录制。');return}if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);audio.src=url;audio.hidden=false;download.href=url;download.download='今日复盘.'+(blob.type.includes('mp4')?'m4a':'webm');download.hidden=false;message('录音已完成，可以试听或下载。ASR 配置完成后可转成文字。')};
 media.start(1000);started=Date.now();audio.pause();audio.hidden=true;download.hidden=true;clock.textContent='00:00';pen.classList.add('recording');dialog.classList.add('recording');trigger.setAttribute('aria-label','结束录音');trigger.querySelector('span').textContent='结束录音';message('正在录音，再点红色按钮结束。');
 interval=setInterval(()=>{const s=Math.floor((Date.now()-started)/1000);clock.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');if(s>=600&&media.state==='recording')media.stop()},500);
 }catch(e){release();message(e.name==='NotAllowedError'?'麦克风权限未获允许，可以在浏览器设置中开启后重试。':'无法打开麦克风，请检查设备连接。')}
 finally{requesting=false;trigger.disabled=false;}
};
// Endpoint will be enabled by deployment configuration; no API keys belong here.
if(window.APP_CONFIG?.asrEndpoint){transcribe.disabled=false;transcribe.textContent='转成文字';}
transcribe.onclick=async()=>{if(!blob){message('请先录制一段语音。');return}transcribe.disabled=true;message('正在转写…');const body=new FormData();body.append('audio',blob,blob.type.includes('mp4')?'recording.m4a':'recording.webm');try{const r=await fetch(window.APP_CONFIG.asrEndpoint,{method:'POST',body,credentials:'same-origin'});if(!r.ok)throw Error('转写失败（'+r.status+'）');const data=await r.json();if(typeof data.text!=='string')throw Error('转写响应缺少文字');text.value=data.text;text.animate([{opacity:.2},{opacity:1}],{duration:800});message('转写完成，请核对后写入手帐。')}catch(e){message(e.message)}finally{transcribe.disabled=false}};
dialog.querySelector('.voice-save').onclick=()=>{const v=text.value.trim();if(!v){message('请先输入或转写一段文字。');return}window.voiceJournal.append(v);text.value='';message('文字已写入旅行手帐，保存在本机。')};
window.addEventListener('pagehide',()=>{if(media?.state==='recording')media.stop();release();if(url)URL.revokeObjectURL(url)});
})();
