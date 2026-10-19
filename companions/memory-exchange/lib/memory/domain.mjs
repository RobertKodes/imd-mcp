export const CATEGORIES = ['Engineering','Research','Design','Operations','Security'];
export const USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
export const IMD_NFT = '0x0000ec93127baa929e58e97dd0095a2bfb38ec1d';
export const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const ADDRESS = /^0x[a-fA-F0-9]{40}$/;
export class ApiError extends Error { constructor(status, message) {super(message);this.status=status;} }
export function text(v,min,max,label) {if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)throw new ApiError(400,`${label}: ${min}–${max} characters required`);return v.trim();}
export function validateCapsule(x) {
 const body={problem:text(x.body?.problem,10,3000,'Problem'),lesson:text(x.body?.lesson,20,8000,'Lesson'),steps:text(x.body?.steps,10,6000,'Steps'),pitfalls:text(x.body?.pitfalls,0,3000,'Pitfalls'),applicability:text(x.body?.applicability,10,3000,'Applicability')};
 if(x.rightsConfirmed!==true)throw new ApiError(400,'Confirm that you have the right to share or sell this content');
 if(!CATEGORIES.includes(x.category))throw new ApiError(400,'Unknown category');
 if(!['private','public'].includes(x.visibility))throw new ApiError(400,'Unknown visibility');
 if(!['CC-BY-4.0','Agent-use-1.0'].includes(x.license))throw new ApiError(400,'Choose a supported license');
 if(!Number.isSafeInteger(x.price)||x.price<0||x.price>100000000)throw new ApiError(400,'Price must be 0–100 USDC in integer micro-USDC');
 if(x.price>0&&x.license==='CC-BY-4.0')throw new ApiError(400,'Paid content uses Agent-use-1.0; CC-BY content is freely redistributable');
 if(x.sourceJob&&!UUID.test(x.sourceJob))throw new ApiError(400,'Source must be an IMD job UUID');
 const kind=x.kind||'lesson';if(!['lesson','skill'].includes(kind))throw new ApiError(400,'Unknown product kind');
 let skill=null;if(kind==='skill'){
 if(!x.skill||!Array.isArray(x.skill.files)||x.skill.files.length<1||x.skill.files.length>5)throw new ApiError(400,'A skill needs 1–5 source files');
 const seen=new Set();const files=x.skill.files.map(f=>{const path=text(f.path,1,100,'File path');if(!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.[a-zA-Z0-9]+$/.test(path)||seen.has(path))throw new ApiError(400,'Use unique relative file paths without dot segments');seen.add(path);return{path,content:text(f.content,1,12000,'File content')}});
 if(files.reduce((n,f)=>n+f.content.length,0)>12000)throw new ApiError(400,'Skill source limit is 12000 characters');
 skill={runtime:text(x.skill.runtime,2,100,'Runtime'),testCommand:text(x.skill.testCommand,2,300,'Test command'),files,validation:'Author supplied; not executed or independently verified'};
 }
 const raw=JSON.stringify({body,skill,title:x.title,summary:x.summary,tags:x.tags});
 if(/-----BEGIN .*PRIVATE KEY-----|\bnsm_[a-f0-9]{64}\b|\bsk-[a-zA-Z0-9_-]{20,}|(?:private[_ -]?key|api[_ -]?key|bearer)\s*[:=]\s*["']?[a-zA-Z0-9_-]{24,}/i.test(raw))throw new ApiError(400,'Possible credential detected. Remove it before saving.');
 return {kind,skill,title:text(x.title,5,100,'Title'),summary:text(x.summary,20,300,'Summary'),category:x.category,tags:Array.isArray(x.tags)?x.tags.slice(0,6).map(t=>text(t,1,24,'Tag')):[],body,visibility:x.visibility,license:x.license,price:x.price,sourceJob:x.sourceJob||null,parentId:x.parentId||null};
}
export async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function newKey(){return 'nsm_'+[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function publicCapsule(c){const {body,owner,skill_json,...safe}=c;return {...safe,tags:typeof c.tags==='string'?JSON.parse(c.tags):c.tags};}
export function canRead(c,agent,acquired){return (agent&&c.owner===agent.id)||c.visibility==='public'&&(c.price===0||acquired);}
export function validateTransfer(receipt,quote,tx,block,now){
 if(receipt.status!=='0x1')throw new ApiError(400,'Transaction did not succeed');
 if(!block||Number(BigInt(block.timestamp))*1000<quote.created||Number(BigInt(block.timestamp))*1000>quote.expires)throw new ApiError(400,'Payment block falls outside this quote');
 if(!tx||tx.from?.toLowerCase()!==quote.wallet.toLowerCase())throw new ApiError(400,'Payment sender does not match your verified wallet');
 const log=receipt.logs?.find(l=>l.address?.toLowerCase()===USDC&&l.topics?.[0]===TRANSFER&&l.topics?.[1]?.slice(-40).toLowerCase()===quote.wallet.slice(2).toLowerCase()&&l.topics?.[2]?.slice(-40).toLowerCase()===quote.recipient.slice(2).toLowerCase()&&BigInt(l.data)===BigInt(quote.amount));
 if(!log)throw new ApiError(400,'No matching USDC transfer for this quote');
 if(now>quote.expires+86400000)throw new ApiError(400,'Receipt confirmation window expired; contact support with the transaction hash');
 return true;
}
