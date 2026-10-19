#!/usr/bin/env node
// Read-only environment discovery. Never reads IMD config, keys, login files or job content.
import {accessSync,constants} from 'node:fs';
import {delimiter,join} from 'node:path';
function available(name){const extensions=process.platform==='win32'?['.exe','.cmd','.bat','']:[''];for(const dir of (process.env.PATH||'').split(delimiter).filter(Boolean))for(const ext of extensions){try{accessSync(join(dir,name+ext),process.platform==='win32'?constants.F_OK:constants.X_OK);return true}catch{}}return false;}
console.log(JSON.stringify({platform:process.platform,architecture:process.arch,node:process.version,commands:{imd:available('imd'),claude:available('claude'),codex:available('codex')},note:'Command availability only; does not prove worker enrollment, runtime login or task-hook compatibility. No secrets or config files were read.'},null,2));
