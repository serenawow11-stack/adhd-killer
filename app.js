"use strict";
const $ = (id) => document.getElementById(id);
const KEY = "adhd-killer:v1";
const day = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const blank = () => ({version:1, tasks:[], goals:{}, sessions:[], active:null});
let state = blank(), storageOkay = true, shownDay = day(), shownHour = new Date().getHours();
function notice(text) { $("notice").textContent = text; }
try {
 const raw = localStorage.getItem(KEY);
 if(raw) { const data = JSON.parse(raw); if(data.version !== 1 || !Array.isArray(data.tasks) || !Array.isArray(data.sessions) || !data.goals || typeof data.goals !== "object") throw new Error("Invalid data"); state = data; }
} catch { storageOkay = false; notice("本地记录无法读取。当前改动仅临时保存，原始数据不会被覆盖；请先导出备份。"); }
function save() { if(!storageOkay) return; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { storageOkay=false; notice("浏览器存储不可用。请导出本次数据，避免关闭页面后丢失。"); } }
function uid() { return crypto.randomUUID(); }
function goalKey(hour) { return `${day()}:${hour}`; }
function goalText() { return state.goals[goalKey(new Date().getHours())] || ""; }
function time(ms) { return new Date(ms).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"}); }
function element(tag, text, className) { const el = document.createElement(tag); if(text!==undefined) el.textContent=text; if(className) el.className=className; return el; }
function render() {
 $("today").textContent = new Date().toLocaleDateString("zh-CN",{month:"long",day:"numeric",weekday:"long"});
 const hour=new Date().getHours(); $("hour-label").textContent=`${String(hour).padStart(2,"0")}:00 — ${String(hour+1).padStart(2,"0")}:00`;
 $("current-goal").textContent=goalText() || "这个小时，想推进什么？";
 const tasks=state.tasks.filter(t=>t.day===day()); $("task-count").textContent=`${tasks.filter(t=>t.done).length} / ${tasks.length}`;
 $("task-list").replaceChildren(); $("task-empty").hidden=tasks.length>0;
 for(const task of tasks) {
  const li=element("li"), check=element("input"), label=element("label",task.text,task.done?"done":""), remove=element("button","×","remove");
  check.type="checkbox"; check.checked=task.done; check.id=`task-${task.id}`; label.htmlFor=check.id;
  check.addEventListener("change",()=>{task.done=check.checked;save();render();});
  remove.type="button";remove.setAttribute("aria-label",`删除任务：${task.text}`);remove.onclick=()=>{state.tasks=state.tasks.filter(t=>t.id!==task.id);save();render();};
  li.append(check,label,remove);$("task-list").append(li);
 }
 $("schedule-list").replaceChildren();
 for(let h=0;h<24;h++) { const text=state.goals[goalKey(h)]; if(!text) continue; const li=element("li"), remove=element("button","×","remove"); remove.type="button";remove.setAttribute("aria-label",`删除 ${h} 点计划`);remove.onclick=()=>{delete state.goals[goalKey(h)];save();render();}; li.append(element("time",`${String(h).padStart(2,"0")}:00`),element("span",text),remove);$("schedule-list").append(li); }
 $("schedule-empty").hidden=$("schedule-list").children.length>0;
 $("session-form").hidden=!!state.active; $("active-session").hidden=!state.active;
 if(state.active) $("active-purpose").textContent=state.active.purpose;
 const history=state.sessions.filter(s=>s.day===day()).slice().reverse(); $("history-list").replaceChildren(); $("history-empty").hidden=history.length>0;
 for(const s of history) { const li=element("li"); li.append(element("time",`${time(s.startedAt)}–${time(s.endedAt)}`),element("span",s.purpose),element("small",`${Math.max(1,Math.round((s.endedAt-s.startedAt)/60000))} 分钟 · ${s.completed?"已完成":"未完成"}`)); $("history-list").append(li); }
 tick();
}
$("goal-form").onsubmit=(e)=>{e.preventDefault();const value=$("goal").value.trim();if(!value)return;state.goals[goalKey(new Date().getHours())]=value;save();$("goal").value="";render();};
$("task-form").onsubmit=(e)=>{e.preventDefault();const text=$("task").value.trim();if(!text)return;state.tasks.push({id:uid(),day:day(),text,done:false});save();$("task").value="";render();};
for(let h=0;h<24;h++){const option=element("option",`${String(h).padStart(2,"0")}:00`);option.value=h;$("schedule-hour").append(option);}$("schedule-hour").value=new Date().getHours();
$("schedule-form").onsubmit=(e)=>{e.preventDefault();const value=$("schedule-goal").value.trim();if(!value)return;state.goals[goalKey(Number($("schedule-hour").value))]=value;save();$("schedule-goal").value="";render();};
$("session-form").onsubmit=(e)=>{e.preventDefault();const purpose=$("purpose").value.trim(),minutes=Number($("minutes").value);if(!purpose||!Number.isFinite(minutes)||minutes<1||minutes>240||state.active)return;const now=Date.now();state.active={id:uid(),day:day(),purpose,startedAt:now,dueAt:now+minutes*60000,notified:false};save();render();};
function finish(completed){if(!state.active)return;state.sessions.push({...state.active,endedAt:Date.now(),completed});state.active=null;save();$("purpose").value="";notice(completed?`这件事完成了。${goalText()?"可以回到："+goalText():"接下来也可以休息一下。"}`:"计时已结束，任务未标记完成。");render();}
$("finish-session").onclick=()=>finish(true);$("cancel-session").onclick=()=>finish(false);
$("extend-session").onclick=()=>{if(!state.active)return;state.active.dueAt=Math.max(Date.now(),state.active.dueAt)+300000;state.active.notified=false;save();notice("已增加 5 分钟。");tick();};
function tick(){const s=state.active;if(!s)return;const elapsed=Math.max(0,Math.floor((Date.now()-s.startedAt)/1000));$("timer").textContent=`${String(Math.floor(elapsed/60)).padStart(2,"0")}:${String(elapsed%60).padStart(2,"0")}`;const remaining=Math.ceil((s.dueAt-Date.now())/60000);$("timer-hint").textContent=remaining>0?`距离预计结束还有 ${remaining} 分钟` : "预计时间到了：完成、延长，或者主动结束。";if(remaining<=0&&!s.notified){s.notified=true;save();notice(`还记得这次的目的吗？${s.purpose}`);}}
setInterval(()=>{const d=day(),h=new Date().getHours();if(d!==shownDay||h!==shownHour){shownDay=d;shownHour=h;render();}else tick();},1000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)render();});
$("export-data").onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),a=element("a");a.href=url;a.download=`adhd-backup-${day()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function connection(){$("connection").textContent=navigator.onLine?"本地优先":"当前离线";}window.addEventListener("online",connection);window.addEventListener("offline",connection);connection();
let installPrompt;window.addEventListener("beforeinstallprompt",(e)=>{e.preventDefault();installPrompt=e;$("install-button").hidden=false;});$("install-button").onclick=async()=>{if(!installPrompt)return;await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$("install-button").hidden=true;};
if("serviceWorker" in navigator && window.isSecureContext){navigator.serviceWorker.register("./sw.js").then(()=>navigator.serviceWorker.ready).then(()=>{$("offline-status").textContent="离线资源已缓存 · 再次打开可离线使用";}).catch(()=>{$("offline-status").textContent="离线缓存未成功，请联网刷新重试。";});}else{$("offline-status").textContent="离线与安装能力需要 HTTPS 或本机 localhost。";}
render();
