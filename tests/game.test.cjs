const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function boot(store={}){
 const elements={},spoken=[],notes=[];
 const element=id=>elements[id]??={value:'',style:{},hidden:id==='win',classList:{add(){},remove(){}},addEventListener(type,fn){this[type]=fn},setAttribute(){},focus(){},select(){}};
 class Audio{constructor(){this.state='suspended';this.currentTime=0;this.destination={}}async resume(){this.state='running'}createOscillator(){return {frequency:{},connect(){},start(){notes.push(true)},stop(){},disconnect(){}}}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}}
 const ctx={document:{getElementById:element},localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},window:{matchMedia:()=>({matches:true}),AudioContext:Audio,SpeechSynthesisUtterance:class{constructor(text){this.text=text}},speechSynthesis:{cancel(){},resume(){},getVoices:()=>[],speak:u=>spoken.push(u.text)}},setTimeout(){}};
 vm.createContext(ctx);vm.runInContext(script,ctx);
 return {el:element,ctx,store,spoken,notes,run:s=>vm.runInContext(s,ctx),answer(text){element('answer').value=text;element('answerForm').submit({preventDefault(){}})}};
}
(async()=>{
 const t=boot();t.run('nextLevel()');assert.equal(t.run('level'),0,'Cannot skip an unfinished level');
 for(let g=0;g<3;g++){
  const bank=t.run(`gradeBank(${g})`);assert.equal(bank.flat().length,180);
  assert.equal(new Set(bank.flat().map(q=>q.prompt+'|'+q.display)).size,180);
  assert.equal(t.run(`adventure[${g}].length`),12);assert.equal(t.run(`new Set(adventure[${g}].map(q=>q.id)).size`),12);
  for(let n=0;n<30;n++){
   if(g===0){assert.equal(+bank[0][n].answers[0],n+1+8);const matches=bank[4][n].display.match(/\d+/g).map(Number);assert.equal(+bank[4][n].answers[0],matches[0]*matches[1]);}
   if(g===1){const q=bank[2][n],values=q.display.match(/\d+/g).map(Number);const [num,denom]=q.answers[0].split('/').map(Number);assert.equal(num/(denom||1),(values[0]+values[2])/values[1]);const width=3+n%8,length=5+Math.floor(n/8);assert.equal(+bank[4][n].answers[0],width*length);assert.equal(+bank[5][n].answers[0],n+2);}
   if(g===2){assert.equal(+bank[0][n].answers[0],(n+6)**2);const x=+bank[2][n].answers[0],m=2+n%6,b=4+n%7;assert.equal(m*x+b,(n+2)*m+b);assert.equal(+bank[3][n].answers[0],1+n%6);const hyp=+bank[4][n].answers[0];assert.equal(hyp*hyp,(3*(n+1))**2+(4*(n+1))**2);const price=20+n*10,rate=[10,20,30,40,50][n%5];assert.equal(+bank[5][n].answers[0],price+price*rate/100);}
  }
 }
 await t.run('toggleSound()');assert.equal(t.spoken.at(-1),'Sound is ready');assert.equal(t.notes.length,6);
 t.answer('incorrect');assert.equal(t.spoken.at(-1),'Try again');assert.equal(t.run('won.size'),0);
 for(let g=0;g<3;g++){
  for(let i=0;i<12;i++){
   t.run(`selected=${i};render()`);t.answer(t.run('candies[selected].answers[0]'));
   assert.equal(t.spoken.at(-1),'That is correct');
   if(i<11)assert.equal(t.el('win').hidden,true,'No completion before twelve answers');
  }
  assert.equal(t.el('count').textContent,'12 / 12 COLLECTED');assert.equal(t.el('win').hidden,false);
  t.el('stay').onclick();assert.equal(t.run('level'),g,'Stay does not advance');
  const reload=boot(t.store);assert.equal(reload.run('level'),g);assert.equal(reload.run('won.size'),12);
  if(g<2)t.el('nextLevel').onclick();
 }
 t.run('nextLevel()');assert.equal(t.run('level'),2);
 for(let round=0;round<40;round++){
  const old=t.run('adventure.map(l=>l.map(q=>q.id))');t.run('reset()');
  const fresh=t.run('adventure.map(l=>l.map(q=>q.id))');
  for(let g=0;g<3;g++){assert.equal(fresh[g].length,12);assert(fresh[g].every(id=>!old[g].includes(id)),'Fresh set repeats no prior question');}
 }
 await t.run('toggleSound()');const spoken=t.spoken.length,notes=t.notes.length;await t.run('tone(true)');assert.equal(t.spoken.length,spoken);assert.equal(t.notes.length,notes);
 const corrupt=boot({'sugarCircuit.v4':'{"level":1,"won":[],"adventure":[[],[],[]]}'});assert.equal(corrupt.run('level'),0);assert.equal(corrupt.run('candies.length'),12);
 const unavailable=boot();unavailable.ctx.window.AudioContext=undefined;await unavailable.run('toggleSound()');assert.equal(unavailable.spoken.at(-1),'Sound is ready');assert(unavailable.el('audioStatus').textContent.includes('could not start'));
 console.log('PASS: 540 bank entries; independent math answers; 12-question completion gates; optional advancement; save/reload; 40 resets without repeats; spoken correct/incorrect feedback; celebration and mute; corrupt saves; voice fallback.');
})().catch(error=>{console.error(error);process.exitCode=1});
