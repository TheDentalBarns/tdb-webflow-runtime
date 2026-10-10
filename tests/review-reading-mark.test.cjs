const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/reviews/native/drawer-content.js'), 'utf8');
const context = {window: {}, getComputedStyle: node => ({opacity: node.style.opacity || '1'})};
vm.runInNewContext(source.replace("const instances=new WeakMap();", "window.testReadingMark=readingMarkController;const instances=new WeakMap();"), context);
class Node {
  constructor(name) {this.name=name;this.style={opacity:'',translate:''};this.attrs={};this.children=[];this.rect={left:10,top:100};this.classes=new Set(['is-stationary']);this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x)};}
  cloneNode(){const n=new Node('reading copy');n.style={...this.style};n.attrs={...this.attrs};return n;}
  removeAttribute(key){delete this.attrs[key];}
  setAttribute(key,value){this.attrs[key]=value;}
  append(node){node.remove();this.children.push(node);node.parentNode=this;}
  remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}}
  querySelector(){return this.slot;}
  getBoundingClientRect(){return this.rect;}
}
function setup(){
  const layer=new Node('overlay'),mark=new Node('original'),a=new Node('review A'),b=new Node('review B');
  a.slot=new Node('slot A');b.slot=new Node('slot B');layer.append(mark);
  const scroll={scrollTop:0},calls=[];
  const motion={fadeController:()=>({to(node,opacity,duration){calls.push({node,opacity,duration});node.style.opacity=String(opacity);},destroy(){}})};
  const api=context.window.testReadingMark(mark,layer,motion,()=>300,()=>scroll);
  const copy=layer.children.find(n=>n!==mark);
  api.open();api.settle(a);api.show();
  return {api,layer,mark,copy,a,b,scroll,calls};
}
test('reading mark lives in the native quote slot; scrolling requires no controller call',()=>{
  const {copy,a,mark,scroll}=setup();assert.equal(copy.parentNode,a.slot);assert.equal(copy.style.opacity,'1');assert.equal(mark.style.opacity,'0');
  scroll.scrollTop=240;assert.equal(copy.parentNode,a.slot);assert.equal(copy.style.translate,'');assert.equal(mark.style.translate,'');
});
test('unscrolled slide change uses the fixed copy without moving the reading SVG',()=>{
  const {api,copy,a,b,mark}=setup();api.begin();assert.equal(copy.parentNode,a.slot);assert.equal(copy.style.opacity,'0');assert.equal(mark.style.opacity,'1');
  api.begin();assert.equal(mark.style.opacity,'1');api.settle(b);assert.equal(copy.parentNode,b.slot);assert.equal(copy.style.opacity,'1');assert.equal(mark.style.opacity,'0');
});
test('scrolled review fades out and the incoming review stays hidden until reveal',()=>{
  const {api,copy,a,b,mark,scroll,calls}=setup();scroll.scrollTop=220;api.begin();
  assert.equal(copy.parentNode,a.slot);assert.equal(mark.style.opacity,'0');assert.ok(calls.some(c=>c.node===copy&&c.opacity===0&&c.duration===300));
  api.settle(b);assert.equal(copy.parentNode,b.slot);assert.equal(copy.style.opacity,'0');api.show();assert.equal(copy.style.opacity,'1');
});
test('cancelled swipe returns to the same scroll owner and restores the quote',()=>{
  const {api,copy,a,scroll}=setup();scroll.scrollTop=120;api.begin();api.settle(a);api.show();assert.equal(copy.parentNode,a.slot);assert.equal(scroll.scrollTop,120);assert.equal(copy.style.opacity,'1');
});
test('rapid direction changes retain one reading copy and one fixed copy',()=>{
  const {api,copy,a,b,layer,mark}=setup();api.begin();api.begin();api.settle(b);api.show();api.begin();api.settle(a);api.show();
  assert.deepEqual(layer.children,[mark]);assert.deepEqual(a.slot.children,[copy]);assert.equal(b.slot.children.length,0);
});
test('filter rebuild parks hidden artwork and reopening restores the selected slot',()=>{
  const {api,copy,b,layer,mark}=setup();api.park();assert.equal(copy.parentNode,layer);assert.equal(copy.style.opacity,'0');
  api.settle(b);api.show();api.close();api.open();api.settle(b);assert.equal(copy.style.opacity,'1');assert.equal(mark.style.opacity,'0');
});
test('transition alignment is sampled once, including native landscape offsets',()=>{
  const {api,copy,mark}=setup();copy.rect={left:20,top:80};mark.rect={left:10,top:100};api.begin();assert.equal(mark.style.translate,'10px -20px');
  copy.rect={left:200,top:800};api.begin();assert.equal(mark.style.translate,'10px -20px');
});
test('teardown removes the extra node and restores original inline state',()=>{
  const {api,copy,layer,mark}=setup();api.begin();api.destroy();assert.equal(copy.parentNode,null);assert.deepEqual(layer.children,[mark]);assert.equal(mark.style.opacity,'');assert.equal(mark.style.translate,'');
});
