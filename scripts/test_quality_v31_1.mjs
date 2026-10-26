import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const r=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=r('docs/index.html'), automation=r('docs/automation.js'),studio=r('docs/studio.js'),style=r('docs/automation.css'),i18n=r('docs/i18n.js');
// The optional IDE runtime must not be fetched during ordinary landing page navigation.
for(const asset of ['vendor/codemirror/codemirror.js','vendor/codemirror/javascript.js','vendor/codemirror/sql.js','vendor/codemirror/python.js','vendor/codemirror/matchbrackets.js','vendor/xterm/xterm.js','vendor/codemirror/codemirror.css']){
  assert.ok(!html.includes(`src="./${asset}"`) && !html.includes(`href="./${asset}"`),'eager IDE asset: '+asset);
  assert.ok(studio.includes(asset),'missing dynamic IDE asset: '+asset);
}
assert.match(studio,/await loadEditorLibraries\(\)/);
assert.match(studio,/OPTIONAL EDITOR LIBRARY UNAVAILABLE/);
for(const id of ['autoNodeSearch','autoNodeCount','automationUndo','automationRedo'])assert.ok(html.includes(`id="${id}"`),id);
for(const event of ['confirmChanges','beforeunload','undoChange','redoChange','renderNodes','window.confirm','focusable','state.undo.push'])assert.ok(automation.includes(event),event);
for(const token of ['.auto-node-search','.auto-history','.auto-workflow-actions','prefers-reduced-motion'])assert.ok(style.includes(token),token);
const match=i18n.match(/const messages\s*=\s*(\{[\s\S]*?\});\s*const available=/);assert.ok(match,'i18n dictionary');
const msg=JSON.parse(match[1]);
for(const l of ['en','fr','es','ar'])for(const key of ['autoSearchNodes','autoSearchPlaceholder','autoUndo','autoRedo','autoShortcuts'])assert.ok(msg[l][key],l+': '+key);
for(const version of ['v28','v29','v30_1','v30_2','v31','v31_1'])assert.ok(existsSync(new URL(`../scripts/push_${version}.sh`,import.meta.url)),version+' publisher');
console.log('PASS V31.1: opt-in IDE bundles, keyboard/focus support, safe editing history, mobile controls, four locales and historical publishers');
