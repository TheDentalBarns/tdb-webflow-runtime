const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Element {
 constructor(cls='',text=''){this.className=cls;this._text=text;this.children=[];this.parentElement=null;this.isConnected=true;this.attrs={};this.animations=[];}
 get childNodes(){return this.children;}
 get classList(){return {contains:n=>this.className.split(' ').includes(n)};}
 get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
 set textContent(v){this._text=String(v);this.children=[];}
 append(n){if(n.parentElement)n.remove();this.children.push(n);n.parentElement=this;}
 replaceChildren(...nodes){this._text='';this.children.forEach(n=>n.parentElement=null);this.children=[];nodes.forEach(n=>this.append(n));}
 remove(){if(this.parentElement){this.parentElement.children=this.parentElement.children.filter(n=>n!==this);this.parentElement=null;}}
 setAttribute(k,v){this.attrs[k]=v;}
 querySelector(q){return this.children.find(n=>n.className===q.slice(1))||null;}
 cloneNode(){return new Element(this.className,this.textContent);}
 animate(frames,options){const animation={frames,options,onfinish:null,cancel(){this.cancelled=true;}};this.animations.push(animation);return animation;}
}
function setup(){const window={TDBMotion:{reduced:{matches:false,addEventListener(){},removeEventListener(){}},defaults:{ticker:400}}};vm.runInNewContext(fs.readFileSync(__dirname+'/../dist/tdb-ticker.js','utf8'),{window,document:{createElement:()=>new Element(),querySelector(){throw Error('Unexpected global template lookup')}}});return window.TDBNativeTicker;}
test('adopts local initial value without concatenating or replacing the hidden target',()=>{const api=setup(),slot=new Element(),value=new Element('review-number_value','84'),incoming=new Element('review-number_incoming','85');slot.append(value);slot.append(incoming);const ticker=api.mount(slot);assert.equal(value.textContent,'84');assert.equal(slot.children[0],value);ticker.update('85');assert.equal(incoming.animations[0].options.duration,400);incoming.animations[0].onfinish();assert.equal(value.textContent,'85');assert.equal(slot.children[1],incoming);ticker.destroy();assert.equal(value.textContent,'85');assert.equal(slot.children[1],incoming);});
test('rapid updates settle to latest value and preserve reusable incoming node',()=>{const api=setup(),slot=new Element(),value=new Element('review-number_value','01'),incoming=new Element('review-number_incoming','02');slot.append(value);slot.append(incoming);const ticker=api.mount(slot);ticker.update('02');ticker.update('03',-1);ticker.settle();assert.equal(value.textContent,'03');assert.equal(slot.children.length,2);ticker.destroy();const remount=api.mount(slot);remount.update('04',1,false);assert.equal(value.textContent,'04');});
test('plain legacy and explicitly templated consumers work without any footer',()=>{const api=setup(),slot=new Element('','01');const ticker=api.mount(slot);ticker.update('02');assert.equal(slot.children.length,2);ticker.settle();assert.equal(slot.children.length,1);assert.equal(slot.textContent,'02');const custom=new Element('','Title'),template=new Element();template.append(new Element('custom-value'));template.append(new Element('custom-incoming'));const title=api.mount(custom,{template,valueClass:'custom-value',incomingClass:'custom-incoming'});title.update('Next');title.settle();assert.equal(custom.textContent,'Next');});
