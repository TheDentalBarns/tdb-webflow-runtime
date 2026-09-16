#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/tdb-calculator.js'),read('src/calculator/core.js')+'\n'+read('src/calculator/ui.js'));
fs.copyFileSync(path.join(root,'src/calculator/calculator.css'),path.join(root,'dist/tdb-calculator.css'));
const pin=process.argv[2];
if(pin){
 if(!/^[a-f0-9]{40}$/.test(pin))throw Error('Pass a full immutable commit SHA');
 fs.writeFileSync(path.join(root,'dist/tdb-calculator-loader.js'),read('src/calculator/loader.js').replace('__TDB_CALCULATOR_ASSET_BASE__','https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@'+pin));
}
console.log('Built calculator'+(pin?' and loader pinned to '+pin:''));
