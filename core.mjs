export const dateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const tomorrow=()=>{let d=new Date();d.setDate(d.getDate()+1);return dateKey(d)};
export const minutesOf=t=>{const [h,m]=t.split(':').map(Number);return h*60+m};
export const clock=m=>`${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
export function progress(spent,estimate){return estimate>0?Math.round(Math.max(0,spent)/estimate*100):null}
export function overlap(a,b,c,d){return Math.max(0,Math.min(b,d)-Math.max(a,c))}
export function validSlots(rows,routines){
 const occupied=routines.filter(r=>r.name!=='起床').map(r=>[minutesOf(r.time),minutesOf(r.time)+r.duration]);
 const wake=routines.find(r=>r.name==='起床'),sleep=routines.find(r=>r.name==='睡觉');
 if(!wake||!sleep)return '请先设置起床与睡觉时间';
 const from=minutesOf(wake.time),to=minutesOf(sleep.time);
 if(to<=from)return '本地排程暂支持当天起床、当晚入睡的模式，请调整或等待 AI 接入';
 for(const row of rows.filter(r=>r.start!==null)){
  if(row.start<from||row.start+row.duration>to)return '任务超出起床至睡觉之间的时间';
  if(occupied.some(([a,b])=>overlap(a,b,row.start,row.start+row.duration)>0))return '任务与固定作息或其他任务冲突';
  occupied.push([row.start,row.start+row.duration]);
 }
 return '';
}
export function makeDraft(text,routines){
 let rows=text.split(/\n|；/).map(s=>s.trim()).filter(Boolean).map((s,i)=>{
  const m=s.match(/(?:\s*)(\d+(?:\.\d+)?)\s*(小时|h|分钟|min)\s*$/i);
  const duration=m?Number(m[1])*(/小时|h/i.test(m[2])?60:1):30;
  return {id:`draft-${i}`,title:m?s.slice(0,m.index).trim():s,duration:Math.round(duration),suggested:!m,start:null};
 });
 if(rows.some(r=>!r.title||r.duration<=0||r.duration>1440))throw Error('每项任务需要名称和 1–1440 分钟的预计时长');
 const wake=routines.find(r=>r.name==='起床'),sleep=routines.find(r=>r.name==='睡觉');
 if(!wake||!sleep)throw Error('请先配置该模式的固定作息');
 const start=minutesOf(wake.time),end=minutesOf(sleep.time);
 if(end<=start)throw Error('当前规则排程需要当天起床、当晚入睡的时间范围');
 const blocked=routines.filter(r=>r.name!=='起床').map(r=>[minutesOf(r.time),minutesOf(r.time)+r.duration]);
 const free=Array.from({length:1440},(_,m)=>m>=start&&m<end&&!blocked.some(([a,b])=>m>=a&&m<b));
 let budget=Math.floor(free.filter(Boolean).length*.8);
 for(const row of rows){if(row.duration>budget)continue;for(let s=start;s+row.duration<=end;s++){if(free.slice(s,s+row.duration).every(Boolean)){row.start=s;budget-=row.duration;for(let m=s;m<s+row.duration;m++)free[m]=false;break}}}
 return rows;
}
