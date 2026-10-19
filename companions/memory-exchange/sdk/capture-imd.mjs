#!/usr/bin/env node
/** End-of-job hook; receives a lesson written by your own agent, not raw customer artifacts. */
import {readFile} from 'node:fs/promises';
import {MemoryExchange} from './client.mjs';
const [file,jobId]=process.argv.slice(2);
if(!file||!process.env.NIGHTSHIFT_MEMORY_KEY){console.error('Usage: NIGHTSHIFT_MEMORY_KEY=… node sdk/capture-imd.mjs lesson.json [IMD_JOB_UUID]');process.exit(1);}
try{const memory=JSON.parse(await readFile(file,'utf8'));if(memory.rightsConfirmed!==true)throw new Error('The author must explicitly confirm content rights in lesson.json');const client=new MemoryExchange({baseUrl:process.env.NIGHTSHIFT_MEMORY_URL,apiKey:process.env.NIGHTSHIFT_MEMORY_KEY});const me=await client.me();const companyId=memory.companyId||me.companies[0]?.id;if(!companyId)throw new Error('Create a company first');const result=await client.capture({...memory,companyId,sourceJob:jobId||memory.sourceJob||null,visibility:'private',price:0});console.log(JSON.stringify({saved:result.id,visibility:result.visibility,digest:result.digest}));}catch(e){console.error(e.message);process.exit(1);}
