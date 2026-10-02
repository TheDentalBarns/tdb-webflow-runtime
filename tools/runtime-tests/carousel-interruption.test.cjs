const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
for(const type of ['reviews','first'])test(type+' rapid arrows continue from visible positions, including reversal',async()=>{
 const file=type==='reviews'?'src/reviews/review-drawer.js':'src/first-impressions/first-impressions.js';
 const source=fs.readFileSync(path.resolve(__dirname,'../../',file),'utf8');
 const start=source.indexOf('    function finish(){'),end=source.indexOf('    function measure(){',start);
 const cells=new Map(),animations=[];
 const xOf=t=>Number(t.match(/translate3d\(([-\d.]+)/)?.[1]||0);
 for(let i=-4;i<8;i++)cells.set(i,{x:i*430,style:{},dataset:{},contains:()=>false,setAttribute(){},getBoundingClientRect(){return{left:this.x}},animate(frames,options){let done;const a={frames,options,finished:new Promise(r=>done=r),cancel:()=>done(),finish:()=>done(),node:this};animations.push(a);return a;}});
 const noop=()=>{},ctx=vm.createContext({cells,active:0,moving:null,compact:true,total:5,stride:430,width:400,centre:0,previous:{},next:{},document:{activeElement:null},root:{clientWidth:1280,dataset:{}},viewport:{clientWidth:1280,getBoundingClientRect:()=>({left:0}),focus(){}},getComputedStyle:n=>({transform:String(n.x)}),DOMMatrixReadOnly:class{constructor(x){this.m41=Number(x)}},carouselDuration:()=>739,index:x=>x,recordIndex:x=>x,last:()=>4,around:noop,neighbours:noop,hideWords:noop,revealWords:noop,revealQuotes:noop,hideQuotes:noop,syncDetails:noop,syncStatic:noop,mark:noop,markCurrent:noop,updateCount:noop,fitPreview:noop,updateArrows:noop,paint:noop});
 vm.runInContext(source.slice(start,end),ctx);
 ctx.move(1);
 animations.forEach(a=>a.node.x=xOf(a.frames[0].transform)*.6+xOf(a.frames[1].transform)*.4);
 const visible=cells.get(0).x;assert.equal(visible,-172);
 ctx.move(1);assert.equal(ctx.active,0);assert.equal(ctx.moving.target,2);
 const a=ctx.moving.animations.find(a=>a.node===cells.get(0));assert.equal(xOf(a.frames[0].transform),visible);
 ctx.move(-1);assert.equal(ctx.moving.target,1);assert.equal(xOf(ctx.moving.animations.find(a=>a.node===cells.get(0)).frames[0].transform),visible);
 ctx.moving.animations.forEach(a=>a.finish());await new Promise(setImmediate);assert.equal(ctx.active,1);
});
