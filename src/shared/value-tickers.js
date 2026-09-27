/* TDB shared value tickers: 400ms, direction-aware, interruption-safe. */
(function(){
if(window.TDBTicker)return;
const states=new WeakMap(),counters=new WeakMap();
function update(node,text,value,direction){
 if(!node)return;text=String(text);
 let s=states.get(node);
 node.setAttribute('data-tdb-ticker','');node.setAttribute('aria-label',text);
 if(s&&s.text===text)return;
 const old=s?.text,oldValue=s?.value;
 if(s)s.animations.forEach(a=>a.cancel());
 const token={text,value,animations:[]};states.set(node,token);
 node.setAttribute('data-tdb-ticker','');node.setAttribute('aria-label',text);
 const item=(t,cls)=>{const n=document.createElement('span');n.className=cls;n.textContent=t;n.setAttribute('aria-hidden','true');return n;};
 const size=item(text,'tdb-tick-size'),incoming=item(text,'tdb-tick-value');
 node.replaceChildren(size,incoming);
 if(old===undefined||!node.animate)return;
 const outgoing=item(old,'tdb-tick-value');node.append(outgoing);
 const dir=direction||(value<oldValue?-1:1),timing={duration:400,easing:'ease-in-out',fill:'both'};
 token.animations=[outgoing.animate([{transform:'translateY(0)'},{transform:'translateY('+(-dir*100)+'%)'}],timing),incoming.animate([{transform:'translateY('+(dir*100)+'%)'},{transform:'translateY(0)'}],timing)];
 token.animations[1].onfinish=()=>{if(states.get(node)!==token)return;node.replaceChildren(size,incoming);token.animations.forEach(a=>a.cancel());token.animations=[];};
}
function count(node,current,total,direction){
 if(!node)return;let s=counters.get(node);
 if(!s){const value=document.createElement('span'),rule=document.createElement('span'),all=document.createElement('span');value.className='tdb-tick-count';rule.className='tdb-tick-rule';all.className='tdb-tick-total';rule.setAttribute('aria-hidden','true');node.replaceChildren(value,rule,all);node.classList.add('tdb-tick-pagination');s={value,all};counters.set(node,s);}
 update(s.value,String(current).padStart(2,'0'),current,direction);s.all.textContent=String(total).padStart(2,'0');node.setAttribute('aria-label',current+' of '+total);
}
window.TDBTicker={update,count};
})();