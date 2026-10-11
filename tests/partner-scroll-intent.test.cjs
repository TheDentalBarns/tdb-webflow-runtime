const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/logo-marquee/logo-marquee.js','utf8');
function fixture(card=true) {
  const start=source.indexOf('    function onPointerMove(event)');
  const end=source.indexOf('    function onClick(event)',start);
  const s={pointerId:1,startX:0,startY:0,horizontal:false,dragging:false,
    pressedItem:{},openCard:card?{}:null,samples:[{x:0,t:0}],lastPointerX:0,
    currentX:0,targetX:0,loopWidth:100,CONFIG:{dragClickThreshold:6},
    closed:0,resumed:0,released:0,prevented:0,
    track:{setPointerCapture(){},releasePointerCapture(){}},
    closeCard(){s.closed++;},resume(){s.resumed++;},releaseActiveLogo(){s.released++;},
    setTransform(){},wrapX:x=>x,reduceMotion:()=>false,startAnimation(){},clamp:x=>x};
  vm.createContext(s);vm.runInContext(source.slice(start,end),s);
  s.move=(x,y)=>s.onPointerMove({pointerId:1,clientX:x,clientY:y,timeStamp:20,preventDefault(){s.prevented++;}});
  return s;
}
test('vertical scrolling starting on marquee preserves open card and native scroll',()=>{
 const s=fixture();s.move(2,30);assert.equal(s.closed,0);assert.equal(s.resumed,0);assert.equal(s.prevented,0);assert.equal(s.pointerId,null);assert.equal(s.pressedItem,null);assert.equal(s.suppressNextClick,true);
});
test('native pan cancellation before a directional move preserves the card',()=>{
 const s=fixture();s.endPointer({pointerId:1,type:'pointercancel'});assert.equal(s.resumed,0);assert.equal(s.closed,0);assert.equal(s.pointerId,null);assert.equal(s.suppressNextClick,true);
});
test('horizontal dragging retains dismissal and track movement',()=>{
 const s=fixture();s.move(30,2);assert.equal(s.closed,1);assert.equal(s.released,1);assert.equal(s.dragging,true);assert.equal(s.prevented,1);assert.equal(s.currentX,30);
});
test('vertical pan resumes marquee when no card is open',()=>{
 const s=fixture(false);s.move(1,30);assert.equal(s.resumed,1);
});
