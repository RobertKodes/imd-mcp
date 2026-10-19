import { env } from 'cloudflare:workers';
import { verifyMessage } from 'viem';
import { createHandler } from '@/lib/memory/service.mjs';
export const dynamic = 'force-dynamic';
async function handle(request:Request){
 if(!env.DB)return Response.json({error:'Database unavailable'},{status:503});
 return createHandler(env.DB,{verifyMessage,paymentsEnabled:env.MEMORY_PAYMENTS_ENABLED==='true'})(request);
}
export { handle as GET, handle as POST };
