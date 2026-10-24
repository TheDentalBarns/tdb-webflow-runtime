// Deterministic input-work comparison, not a browser FPS/GPU benchmark.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cp = require('node:child_process');
const { createRequire } = require('node:module');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
process.chdir(root);
const baselineSha = 'eb302ee251544c3d9cd22b9be42dc7b5978c18b2';
const filename = 'src/logo-marquee/logo-marquee.js';
const baseline = cp.execFileSync(
  'git',
  ['-c', 'safe.directory=' + root.replaceAll('\\', '/'), 'show', baselineSha + ':' + filename],
  { encoding: 'utf8' },
);
const candidate = fs.readFileSync(filename, 'utf8');
const tests = fs.readFileSync('tests/marquee-interaction.test.cjs', 'utf8');
const context = {
  require: createRequire(path.join(root, 'package.json')),
  setImmediate,
  module: { exports: {} },
};
vm.runInNewContext(
  tests.slice(0, tests.indexOf("test('close then immediate drag")) + '\nmodule.exports = fixture;',
  context,
);
async function run(source, inputsPerFrame, releaseBetweenFrames) {
  const f = await context.module.exports({ source });
  try {
    f.pointer('pointerdown', 100, f.logos[0], { time: 0 });
    const writes = f.writes(),
      trace = [];
    let x = 100,
      time = 0;
    for (let frame = 0; frame < 120; frame++) {
      for (let input = 0; input < inputsPerFrame; input++) {
        x += frame < 60 ? -2 : 1;
        time += 16 / inputsPerFrame;
        f.pointer('pointermove', x, f.track, { time });
      }
      f.frame(time);
      trace.push([f.status().currentX, f.track.style.transform]);
    }
    if (releaseBetweenFrames) {
      x += 9;
      time += 2;
      f.pointer('pointermove', x, f.track, { time });
    }
    f.pointer('pointerup', x, f.track, { time: time + 1 });
    const state = f.status();
    trace.push([state.currentX, f.track.style.transform, state.momentum, state.coasting]);
    return { writes: f.writes() - writes, trace };
  } finally {
    f.close();
  }
}
(async () => {
  const rows = [];
  for (const inputs of [1, 2, 4, 8]) {
    for (const releaseBetweenFrames of [false, true]) {
      const before = await run(baseline, inputs, releaseBetweenFrames);
      const after = await run(candidate, inputs, releaseBetweenFrames);
      assert.deepEqual(
        after.trace,
        before.trace,
        'rendered positions and release throw must match',
      );
      rows.push({
        inputsPerFrame: inputs,
        frames: 120,
        releaseBetweenFrames,
        baselineWrites: before.writes,
        candidateWrites: after.writes,
        tracesIdentical: true,
      });
    }
  }
  console.log(
    JSON.stringify(
      {
        baselineSha,
        note: 'Synthetic event bursts; identical position and release-velocity traces. No FPS claim.',
        rows,
      },
      null,
      2,
    ),
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
