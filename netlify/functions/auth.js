// netlify/functions/auth.js  (ESM + robust export detection)
import * as mod from 'netlify-cms-oauth-provider-node';

// pick any callable export regardless of bundling shape
const pickFn=(...xs)=>xs.find(x=>typeof x==='function');
const provider=pickFn(
  mod,              // function export
  mod?.default,     // default export
  mod?.provider,    // named export
  mod?.handler,     // sometimes exposed as handler
  ...(Object.values(mod||{})),
  ...(Object.values(mod?.default||{}))
);

export const handler=async(event,context)=>{
  // DEBUG: verify the deployed file/version & import shape
  if(event.queryStringParameters?.debug==='1'){
    return{
      statusCode:200,
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        marker:'auth.js v3',                 // <— expect THIS after redeploy
        keys:Object.keys(mod||{}),
        hasDefault:!!mod?.default,
        typeofProvider:typeof provider,
        hasID:!!process.env.OAUTH_CLIENT_ID,
        hasSecret:!!process.env.OAUTH_CLIENT_SECRET,
        ts:new Date().toISOString()
      })
    };
  }
  if(typeof provider!=='function')
    return{statusCode:500,body:'provider not a function (import mismatch)'};
  return provider({backend:'github'})(event,context);
};
