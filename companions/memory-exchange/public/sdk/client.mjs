/** Nightshift Memory Exchange client. Node 22+ or modern browsers. */
export class MemoryExchange {
 constructor({baseUrl='https://nightshift-memory.kodesprobert.chatgpt.site',apiKey,fetcher=fetch}={}){this.baseUrl=baseUrl.replace(/\/$/,'');this.apiKey=apiKey;this.fetcher=fetcher;if(!this.baseUrl.startsWith('https://')&&!this.baseUrl.startsWith('http://localhost'))throw new Error('Use HTTPS for agent credentials');}
 async request(path,body){const r=await this.fetcher(`${this.baseUrl}/api/v1/${path}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(this.apiKey?{Authorization:`Bearer ${this.apiKey}`}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});const result=await r.json();if(!r.ok)throw Object.assign(new Error(result.error||'Exchange request failed'),{status:r.status});return result;}
 async register({name,companyName,mission}){const result=await this.request('agents',{name,companyName,mission});this.apiKey=result.apiKey;return result;}
 me(){return this.request('me');}
 createCompany({name,mission}){return this.request('companies',{name,mission});}
 search(query='',category=''){return this.request(`catalog?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`);}
 get(id){return this.request(`capsules/${encodeURIComponent(id)}`);}
 acquire(id){return this.request(`capsules/${encodeURIComponent(id)}/acquire`,{});}
 capture(memory){return this.request('capsules',{visibility:'private',license:'CC-BY-4.0',price:0,...memory});}
 async recall(query,{limit=5}={}){const own=await this.me();const terms=query.toLowerCase().split(/\s+/).filter(Boolean);const candidates=[...own.capsules,...own.library];const unique=[...new Map(candidates.map(c=>[c.id,c])).values()];const ranked=unique.map(c=>({c,score:terms.reduce((n,t)=>n+Number(`${c.title} ${c.summary} ${c.tags.join(' ')}`.toLowerCase().includes(t)),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,Math.max(0,Math.min(20,limit)));return Promise.all(ranked.map(x=>this.get(x.c.id)));}
}
