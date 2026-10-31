const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const app = express(), server = http.createServer(app), io = new Server(server);
app.use(express.static("public"));
const rooms = new Map();
const challenges = require("./content/challenges.json");
const settings = require("./content/game-settings.json");
const roleCatalog = require("./content/roles.json").roles;
const code = () => crypto.randomBytes(3).toString("hex").toUpperCase();
const publicRoom = r => ({code:r.code,mode:r.mode,hostId:r.hostId,players:[...r.players.values()].map(p=>({id:p.id,name:p.name,ready:p.ready,connected:p.connected,host:p.id===r.hostId})),started:r.started,round:r.round,phase:r.phase,challenge:r.challenge,meetingReason:r.meetingReason||null,grace:r.grace,maxGrace:r.maxGrace,rejected:r.rejected,conversions:r.conversions,feed:r.feed.slice(-8),scores:[...r.players.values()].map(p=>({id:p.id,name:p.name,score:p.score}))});
function emitRoom(r){io.to(r.code).emit("room",publicRoom(r)); for(const p of r.players.values()) if(p.connected) io.to(p.id).emit("private", {role:p.role,faction:p.faction,roleAbility:p.roleAbility,assignment:p.assignment,temptation:p.temptation,notice:p.notice,impact:p.impact,canVote:!p.disabled});}
function addFeed(r,msg){r.feed.push(msg); if(r.feed.length>40)r.feed.shift();}
function rolePlan(n){
 if(n===2)return ["Grace One","The Fallen"];
 if(n===3)return ["Grace One","Grace One","The Fallen"];
 if(n===4)return ["Grace One","Grace One","Lukewarm","The Fallen"];
 if(n===5)return ["Grace One","Grace One","Grace One","Lukewarm","The Fallen"];
 if(n===6)return ["Grace One","Grace One","Grace One","Lukewarm","The Fallen","The Fallen"];
 if(n===7)return ["Grace One","Grace One","Grace One","Grace One","Lukewarm","The Fallen","The Fallen"];
 return ["Grace One","Grace One","Grace One","Grace One","Lukewarm","Lukewarm","The Fallen","The Fallen"];
}
function startGame(r){
 const ps=[...r.players.values()];
 let roles;
 if(r.mode==="roles"){
  const chosen=roleCatalog.filter(x=>x.faction==="Chosen"), fallen=roleCatalog.filter(x=>x.faction==="Fallen"), lukewarm=roleCatalog.filter(x=>x.faction==="Lukewarm");
  const counts=rolePlan(ps.length); const f=counts.filter(x=>x==="The Fallen").length, l=counts.filter(x=>x==="Lukewarm").length, c=ps.length-f-l;
  roles=[...chosen.sort(()=>Math.random()-.5).slice(0,c),...fallen.sort(()=>Math.random()-.5).slice(0,f),...lukewarm.sort(()=>Math.random()-.5).slice(0,l)].sort(()=>Math.random()-.5);
 } else roles=rolePlan(ps.length).sort(()=>Math.random()-.5);
 ps.forEach((p,i)=>{p.role=roles[i].name||roles[i];p.faction=roles[i].faction||(p.role==="The Fallen"?"Fallen":p.role==="Lukewarm"?"Lukewarm":"Chosen");p.roleAbility=roles[i].ability||null;p.assignment=p.role==="Lukewarm"?(Math.random()<.5?"Earn 60 Impact Points across any two rounds.":"Win one public challenge vote."):null;p.impact=0;p.score=0;p.notice="";p.temptation=null;p.disabled=false;});
 r.started=true;r.round=1;r.phase="challenge";r.grace=settings.startingGrace;r.maxGrace=settings.maxGrace;r.rejected=0;r.conversions=0;r.votes={};r.fallenVotes={};r.challenge=challenges[0];r.endsAt=Date.now()+settings.challengeSeconds*1000;
 addFeed(r,"The quest begins. Opening Scripture: Micah 6:8 (reflection): act justly, love mercy, walk humbly.");
}
function checkGraceMeeting(r,oldGrace){
 const thresholds=[25,50,75,100];r.graceMeetings=r.graceMeetings||[];
 for(const t of thresholds){if(oldGrace<t&&r.grace>=t&&!r.graceMeetings.includes(t)&&r.phase==="challenge"){
  r.graceMeetings.push(t);r.resumePhase="challenge";r.meetingReason=`grace-${t}`;r.phase="council";r.endsAt=Date.now()+settings.councilSeconds*1000;r.votes={};r.fallenVotes={};addFeed(r,`Grace reached ${t}%. An automatic meeting begins.`);break;
 }}
}
function endRound(r){
 r.phase="council";r.meetingReason="round-end";r.resumePhase="challenge";r.endsAt=Date.now()+settings.councilSeconds*1000;r.votes={};r.fallenVotes={};
 addFeed(r,`Round ${r.round} challenge closed. Council is open for 60 seconds.`);
}
io.on("connection", socket=>{
 socket.on("create",({name,mode})=>{
  let c=code();while(rooms.has(c))c=code();
  const r={code:c,mode:mode==="roles"?"roles":"temptation",hostId:socket.id,players:new Map(),started:false,round:0,phase:"lobby",challenge:null,grace:0,maxGrace:100,rejected:0,conversions:0,votes:{},fallenVotes:{},feed:[],endsAt:0};
  r.players.set(socket.id,{id:socket.id,name:(name||"Host").slice(0,20),ready:true,connected:true,role:null,faction:null,roleAbility:null,score:0,impact:0,assignment:null,notice:"",temptation:null,disabled:false,alive:true});
  rooms.set(c,r);socket.join(c);socket.emit("joined",{code:c,id:socket.id,token:socket.id});emitRoom(r);
 });
 socket.on("join",({code:c,name,token})=>{
  c=(c||"").toUpperCase();const r=rooms.get(c);if(!r)return socket.emit("errorMsg","Room code not found.");
  if(r.started && !token)return socket.emit("errorMsg","This game has started; reconnect with your existing seat token.");
  if(token&&r.players.has(token)){
   const p=r.players.get(token);r.players.delete(token);p.id=socket.id;p.connected=true;r.players.set(socket.id,p);if(r.hostId===token)r.hostId=socket.id;
  }else{
   if(r.started)return socket.emit("errorMsg","Game already started.");
   if(r.players.size>=8)return socket.emit("errorMsg","Room is full (8 players maximum).");
   r.players.set(socket.id,{id:socket.id,name:(name||"Guest").slice(0,20),ready:false,connected:true,role:null,faction:null,roleAbility:null,score:0,impact:0,assignment:null,notice:"",temptation:null,disabled:false,alive:true});
  }
  socket.join(c);socket.emit("joined",{code:c,id:socket.id,token:socket.id});emitRoom(r);
 });
 socket.on("reconnectSeat",({code:c,token})=>{const r=rooms.get((c||"").toUpperCase());if(!r||!r.players.has(token))return socket.emit("errorMsg","That seat could not be recovered.");const p=r.players.get(token);r.players.delete(token);p.id=socket.id;p.connected=true;r.players.set(socket.id,p);if(r.hostId===token)r.hostId=socket.id;socket.join(r.code);socket.emit("joined",{code:r.code,id:socket.id,token:socket.id});emitRoom(r);});
 socket.on("ready",({code:c,ready})=>{const r=rooms.get(c);if(!r||r.started)return;const p=r.players.get(socket.id);if(p){p.ready=!!ready;emitRoom(r);}});
 socket.on("start",({code:c})=>{const r=rooms.get(c);if(!r||r.hostId!==socket.id)return;if(r.players.size<2)return socket.emit("errorMsg","You need at least 2 players.");if([...r.players.values()].some(p=>!p.ready))return socket.emit("errorMsg","Everyone must be ready first.");startGame(r);emitRoom(r);});
 socket.on("callMeeting",({code:c,reason})=>{
  const r=rooms.get(c),p=r&&r.players.get(socket.id);if(!r||!p||!r.started||r.mode!=="roles"||r.phase!=="challenge")return;
  r.resumePhase="challenge";r.meetingReason=reason==="body"?"body-report":"emergency";r.phase="council";r.endsAt=Date.now()+settings.councilSeconds*1000;r.votes={};r.fallenVotes={};
  addFeed(r,reason==="body"?`${p.name} reported a body. Meeting called.`:`${p.name} called an emergency meeting.`);emitRoom(r);
 });
 socket.on("action",({code:c,kind,value})=>{
  const r=rooms.get(c);if(!r||!r.started)return;const p=r.players.get(socket.id);if(!p)return;
  if(kind==="answer"&&r.phase==="challenge"&&!p.disabled){
   if(r.challenge.type==="Wisdom Sprint"||r.challenge.type==="Parable Bluff"||r.challenge.type==="Body in Action"){
    const good=String(value||"").trim().toLowerCase()===String(r.challenge.answer).toLowerCase() || (r.challenge.choices&&r.challenge.choices.some(x=>x.toLowerCase()===String(value||"").trim().toLowerCase()&&x.toLowerCase()===r.challenge.answer.toLowerCase()));
    if(good){const pts=Math.min(settings.impactCap-p.impact,settings.correctAnswerImpact);p.impact+=pts;p.score+=pts;const oldGrace=r.grace;r.grace=Math.min(r.maxGrace,r.grace+settings.gracePerCorrectAnswer);if(r.mode==="temptation")checkGraceMeeting(r,oldGrace);p.notice=`Correct! +${pts} Impact, +10 Grace.`;addFeed(r,`${p.name} completed the challenge.`);}
    else p.notice="Not quite—try the reflection or discuss with your team.";
   }else{p.notice="Answer submitted for the host-led challenge.";const pts=Math.min(settings.impactCap-p.impact,settings.creativeAnswerImpact);p.impact+=pts;p.score+=pts;}
  }
  if(kind==="vote"&&r.phase==="council"){if(r.players.has(value)&&value!==socket.id)r.votes[socket.id]=value;else if(["investigate","preserve"].includes(value))r.votes[socket.id]=value;}
  if(kind==="fallenVote"&&r.phase==="council"&&p.faction==="Fallen"&&r.players.has(value))r.fallenVotes[socket.id]=value;
  if(kind==="temptation"&&p.temptation&&["accept","reject"].includes(value)){
   p.temptation=null;
   if(value==="reject"){r.rejected++;p.notice="You rejected temptation. You receive Revelation and protection this round.";p.revelation=true;r.grace=Math.min(r.maxGrace,r.grace+Math.ceil((r.maxGrace-r.grace)/2));p.impact=Math.min(settings.impactCap,p.impact+Math.max(0,settings.correctAnswerImpact-p.impact));p.score=p.impact;addFeed(r,"A temptation was rejected; a clue has emerged.");if(r.rejected===1)addFeed(r,"Clue: the Fallen must coordinate privately.");if(r.rejected===2)addFeed(r,"The Fallen’s next targeting action is invalidated.");if(r.rejected>=3){for(const x of r.players.values())if(x.faction==="Fallen")x.exposed=true;addFeed(r,"Three rejections! The Fallen are exposed and defeated.");}}
   else{p.role="Lukewarm";p.score=Math.floor(p.score/2);p.impact=Math.floor(p.impact/2);p.assignment="Earn 60 Impact Points across any two rounds.";p.notice="You accepted temptation. Your role and assignment are private.";r.conversions++;addFeed(r,"A player accepted temptation. A new Lukewarm will take effect now.");}
  }
  emitRoom(r);
 });
 socket.on("next",({code:c})=>{const r=rooms.get(c);if(!r||r.hostId!==socket.id||!r.started)return;
  if(r.phase==="challenge"){endRound(r);}
  else if(r.phase==="council"){
   if(r.meetingReason&&r.meetingReason!=="round-end"){
    r.phase=r.resumePhase||"challenge";r.meetingReason=null;r.endsAt=Date.now()+settings.challengeSeconds*1000;addFeed(r,"Meeting ended. The round continues.");emitRoom(r);return;
   }
   const fallen=[...r.players.values()].filter(p=>p.faction==="Fallen"&&!p.exposed);
   if(r.rejected===2){addFeed(r,"The Fallen’s next target action was invalidated by escalation.");r.rejected=2;}
   else if(fallen.length){
    let target=null;
    if(fallen.length===1)target=r.fallenVotes[fallen[0].id]||null;
    else {const votes=fallen.map(p=>r.fallenVotes[p.id]);if(votes.length&&votes.every(v=>v&&v===votes[0]))target=votes[0];else addFeed(r,"The Fallen did not agree; targeting failed and exposure increased.");}
    if(target&&r.players.has(target)&&r.players.get(target).role==="Grace One"){r.players.get(target).temptation="pending";addFeed(r,"A private temptation awaits one player.");}
   }
   if(r.round>=settings.roundCount){
    r.phase="results";const graceWin=r.grace>=r.maxGrace;addFeed(r,graceWin?"Grace team victory condition met!":"The quest ends: Grace was not fully restored.");r.outcome=graceWin?"Grace Team Victory":"The Fallen prevail unless exposed.";
   }else{r.round++;r.phase="challenge";r.meetingReason=null;r.challenge=challenges[(r.round-1)%challenges.length];r.endsAt=Date.now()+settings.challengeSeconds*1000;for(const p of r.players.values()){p.impact=0;p.notice="";p.disabled=false;}addFeed(r,`Round ${r.round} begins: ${r.challenge.type}.`);}
  } else if(r.phase==="results"){r.started=false;r.phase="lobby";r.round=0;for(const p of r.players.values()){p.role=null;p.assignment=null;p.score=0;p.impact=0;}}
  emitRoom(r);
 });
 socket.on("pause",({code:c})=>{const r=rooms.get(c);if(!r||r.hostId!==socket.id)return;if(r.phase==="paused"){r.phase=r.previousPhase||"challenge";}else{r.previousPhase=r.phase;r.phase="paused";}emitRoom(r);});
 socket.on("endGame",({code:c})=>{const r=rooms.get(c);if(!r||r.hostId!==socket.id)return;r.phase="results";r.started=true;r.outcome="Game ended by host";addFeed(r,"The host ended the game.");emitRoom(r);});
 socket.on("remove",({code:c,id})=>{const r=rooms.get(c);if(!r||r.hostId!==socket.id||id===socket.id)return;const target=r.players.get(id);if(target){io.to(id).emit("errorMsg","You were removed by the host.");io.sockets.sockets.get(id)?.leave(c);r.players.delete(id);emitRoom(r);}});
 socket.on("chat",({code:c,message})=>{const r=rooms.get(c),p=r&&r.players.get(socket.id);if(!r||!p)return;const msg=String(message||"").slice(0,300);io.to(c).emit("chat",{name:p.name,message:msg});});
 socket.on("fallenChat",({code:c,message})=>{const r=rooms.get(c),p=r&&r.players.get(socket.id);if(!r||!p||!r.started||p.faction!=="Fallen")return;const msg=String(message||"").slice(0,300);for(const x of r.players.values())if(x.connected&&x.faction==="Fallen")io.to(x.id).emit("fallenChat",{name:p.name,message:msg});});
 socket.on("disconnect",()=>{for(const r of rooms.values()){const p=r.players.get(socket.id);if(p){p.connected=false;emitRoom(r);setTimeout(()=>{if(r.players.get(socket.id)?.connected===false&&!r.started){r.players.delete(socket.id);emitRoom(r);}},120000);}}});
});
setInterval(()=>{for(const r of rooms.values())if(r.started&&r.phase!=="paused"&&r.phase!=="results"&&r.endsAt&&Date.now()>=r.endsAt){if(r.hostId&&io.sockets.sockets.has(r.hostId))io.to(r.hostId).emit("timerExpired");r.endsAt=Date.now()+100000000;}},1000);
const PORT=process.env.PORT||3000;server.listen(PORT,()=>console.log(`Kingdom Quest running on http://localhost:${PORT}`));
