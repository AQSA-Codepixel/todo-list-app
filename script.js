function S(p){return '<svg viewBox="0 0 24 24">'+p+'</svg>'}
var IC={plus:S('<path d="M12 5v14M5 12h14"/>'),edit:S('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>'),del:S('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>'),moon:S('<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>'),list:S('<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 9h8M8 13h8M8 17h5"/>')};
var $=function(id){return document.getElementById(id)};
$("fab").innerHTML=IC.plus;$("theme").innerHTML=IC.moon;

var complete=null,tasks=[],filter="all",nextId=1,editId=null,pri="",undoFn=null,tt=null,RANK={high:0,medium:1,low:2};
try{var s=localStorage.getItem("todo-tasks");if(s){tasks=(JSON.parse(s)||[]).map(function(t){return{id:t.id,text:t.text,notes:t.notes||"",due:t.due||"",priority:t.priority||"",done:!!t.done}});nextId=tasks.reduce(function(m,t){return Math.max(m,t.id)},0)+1}}catch(e){}
function save(){try{localStorage.setItem("todo-tasks",JSON.stringify(tasks))}catch(e){}}
try{var th=localStorage.getItem("todo-theme");if(th)document.documentElement.setAttribute("data-theme",th)}catch(e){}
$("theme").onclick=function(){var c=document.documentElement.getAttribute("data-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");var n=c==="dark"?"light":"dark";document.documentElement.setAttribute("data-theme",n);try{localStorage.setItem("todo-theme",n)}catch(e){}};
$("date").textContent=new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});

function pad(n){return n<10?"0"+n:""+n}
function today(){var d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function fmt(s){return new Date(s+"T00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"})}
function dueInfo(s){if(!s)return null;var d=Math.round((new Date(s+"T00:00")-new Date(today()+"T00:00"))/864e5);
  if(d<0)return{l:"Overdue, "+fmt(s),c:"over"};if(d===0)return{l:"Due today",c:"today"};if(d===1)return{l:"Due tomorrow",c:""};return{l:"Due "+fmt(s),c:""}}
function rk(p){return p&&p in RANK?RANK[p]:3}
function sorted(a){return a.slice().sort(function(x,y){
  if(x.done!==y.done)return x.done?1:-1;
  if(x.due!==y.due){if(!x.due)return 1;if(!y.due)return -1;return x.due<y.due?-1:1}
  if(rk(x.priority)!==rk(y.priority))return rk(x.priority)-rk(y.priority);
  return y.id-x.id})}
function confetti(){if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;var app=$("app"),cols=["#2563eb","#06b6d4","#10b981","#f59e0b","#ec4899","#8b5cf6"];
  for(var i=0;i<26;i++){var c=document.createElement("i");c.className="cf";c.style.left=(20+Math.random()*60)+"%";c.style.background=cols[i%cols.length];c.style.setProperty("--dx",(Math.random()*160-80)+"px");c.style.setProperty("--r",(Math.random()*720-360)+"deg");c.style.animationDelay=(Math.random()*.2)+"s";app.appendChild(c);setTimeout(function(el){el.remove()}.bind(null,c),1900)}}
function find(id){return tasks.filter(function(t){return t.id===id})[0]}

function render(){
  var total=tasks.length,done=tasks.filter(function(t){return t.done}).length,pct=total?Math.round(done/total*100):0;
  $("pt").textContent=done+" of "+total+" done";
  $("ps").textContent=!total?"Add a task to get started":done===total?"All tasks completed":(total-done)+" left to do";
  $("rp").style.strokeDashoffset=163.4*(1-pct/100);$("rpct").textContent=pct+"%";var nowDone=total>0&&done===total;if(complete===false&&nowDone)confetti();complete=nowDone;
  var cnt={all:total,active:total-done,done:done};
  document.querySelectorAll("#tabs button").forEach(function(b){b.classList.toggle("on",b.dataset.f===filter);b.querySelector("em").textContent=cnt[b.dataset.f]});
  var shown=sorted(tasks.filter(function(t){return filter==="all"||(filter==="done"?t.done:!t.done)}));
  var list=$("list");list.innerHTML="";
  if(!shown.length){var e=document.createElement("li");e.className="empty";e.innerHTML=IC.list+"<div></div>";
    e.lastChild.textContent=!total?"No tasks yet. Tap + to add your first task.":filter==="done"?"No completed tasks yet.":"Nothing here.";list.appendChild(e);return}
  shown.forEach(function(t){
    var li=document.createElement("li");li.className="row "+(t.priority||"none")+(t.done?" done":"");
    var cb=document.createElement("input");cb.type="checkbox";cb.className="chk";cb.checked=t.done;cb.setAttribute("aria-label","Mark task as done");
    cb.onchange=function(){t.done=cb.checked;save();render()};
    var bd=document.createElement("button");bd.className="body";bd.setAttribute("aria-label","Edit task");
    var b=document.createElement("b");b.textContent=t.text;bd.appendChild(b);
    var di=dueInfo(t.due);if(di){var m=document.createElement("span");m.className="meta "+di.c;m.textContent=di.l;bd.appendChild(m)}
    bd.onclick=function(){openSheet(t.id)};
    var ed=document.createElement("button");ed.className="ib";ed.innerHTML=IC.edit;ed.setAttribute("aria-label","Edit task");ed.onclick=function(){openSheet(t.id)};
    var dl=document.createElement("button");dl.className="ib del";dl.innerHTML=IC.del;dl.setAttribute("aria-label","Delete task");dl.onclick=function(){del(t.id)};
    li.appendChild(cb);li.appendChild(bd);li.appendChild(ed);li.appendChild(dl);list.appendChild(li);
  });
}

function setPri(p){pri=p;document.querySelectorAll("#fPri button").forEach(function(b){var on=b.dataset.p===p&&p!=="";b.classList.toggle("on",on);b.setAttribute("aria-pressed",on)})}
function openSheet(id){
  editId=id===undefined?null:id;var t=editId===null?null:find(editId);
  $("sh").textContent=t?"Edit task":"New task";
  $("fSave").textContent=t?"Save changes":"Add task";
  $("fTitle").value=t?t.text:"";$("fDue").value=t?t.due:"";setPri(t?t.priority:"");
  $("fDel").style.display=t?"":"none";$("err").hidden=true;$("wrap").hidden=false;
  setTimeout(function(){$("fTitle").focus()},30);
}
function closeSheet(){$("wrap").hidden=true;editId=null;$("fab").focus()}
function commit(){
  var v=$("fTitle").value.trim();if(!v){$("err").hidden=false;$("fTitle").focus();return}
  if(editId===null){tasks.push({id:nextId++,text:v,notes:"",due:$("fDue").value,priority:pri,done:false})}
  else{var t=find(editId);t.text=v;t.due=$("fDue").value;t.priority=pri}
  save();$("wrap").hidden=true;editId=null;render();
}
$("fab").onclick=function(){openSheet()};
$("fSave").onclick=commit;$("fCancel").onclick=closeSheet;$("scrim").onclick=closeSheet;
$("fDel").onclick=function(){var id=editId;$("wrap").hidden=true;editId=null;del(id)};
$("fPri").onclick=function(e){var p=e.target.dataset.p;if(p)setPri(p===pri?"":p)};
$("fTitle").addEventListener("keydown",function(e){if(e.key==="Enter")commit()});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!$("wrap").hidden)closeSheet()});
$("tabs").onclick=function(e){if(e.target.dataset.f){filter=e.target.dataset.f;render()}};

function del(id){var i=tasks.map(function(t){return t.id}).indexOf(id);if(i<0)return;var t=tasks.splice(i,1)[0];save();render();
  undoFn=function(){tasks.splice(i,0,t);save();render()};
  $("tmsg").textContent="Task deleted";$("toast").classList.add("show");clearTimeout(tt);tt=setTimeout(function(){$("toast").classList.remove("show");undoFn=null},5000)}
$("tundo").onclick=function(){if(undoFn)undoFn();undoFn=null;$("toast").classList.remove("show")};
render();
