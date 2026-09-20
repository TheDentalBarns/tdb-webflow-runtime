// Checks the standalone banner, shipped footer, and source loader as one release.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const banner=read('dist/tdb-announcement.min.js'),footer=read('dist/tdb-footer-runtime.min.js');
const version=read('src/banner/announcement.js').match(/TDB Announcement (\d+\.\d+\.\d+)/)[1];
assert(footer.startsWith(banner),'Footer must contain the exact current standalone banner');
assert(banner.includes('version:"'+version+'"'),'Banner source and output versions differ');
assert(footer.includes('TDBAnnouncement.mount('),'Native banner must be mounted by shared shell');
assert(!footer.includes('elfsight-app-4fa0f002'),'Retired countdown must not be recreated');
const sourcePin=read('src/runtime/immediate-runtime-batch.js').match(/runtime@([a-f0-9]{40})\/dist\/tdb-footer-runtime.min.js/)[1];
const outputPin=read('dist/tdb-immediate-runtime-batch.min.js').match(/runtime@([a-f0-9]{40})\/dist\/tdb-footer-runtime.min.js/)[1];
assert.equal(sourcePin,outputPin,'Immediate source/build footer pins differ');
console.log('PASS: banner '+version+', footer contents, native shell and source/build release pins');
