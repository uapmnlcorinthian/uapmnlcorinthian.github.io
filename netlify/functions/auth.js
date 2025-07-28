// netlify/functions/auth.js
import * as mod from 'netlify-cms-oauth-provider-node';

// pick any callable export
const pickFn=(...xs)=>xs.find(x=>typeof x==='function');
const provider=pickFn(mod,mod?.default,mod?.provider,mod?.handler,...Object.values(mod||{}),...Object.values(mod?.default||{}));

export const handler=async(event,context)=>{
  const hdr=event.headers||{};
  const proto=(hdr['x-forwarded-proto']||'https');
  const host =(hdr['x-forwarded-host']||hdr.host||'').toLowerCase();
  const self =`${proto}://${host}`;

  // allow-list for your site + local dev
  const origin=[
    self,
    'https://uapmnlcorinthian.netlify.app',
    'http://localhost:8888',
    'http://127.0.0.1:8888'
  ];

  const cfg={
    backend:'github',
    origin,                                   // REQUIRED
    completeUrl: `${self}/.netlify/functions/auth`, // REQUIRED
    oauthClientID:     process.env.OAUTH_CLIENT_ID,  // REQUIRED
    oauthClientSecret: process.env.OAUTH_CLIENT_SECRET
  };

  // quick debug
  if(event.queryStringParameters?.debug==='1'){
    return {
      statusCode:200, headers:{'content-type':'application/json'},
      body:JSON.stringify({
        marker:'auth.js v4',
        typeofProvider: typeof provider,
        hasID:!!cfg.oauthClientID, hasSecret:!!cfg.oauthClientSecret,
        origin, completeUrl: cfg.completeUrl, path: event.path, ts:new Date().toISOString()
      })
    };
  }

  if(typeof provider!=='function') return {statusCode:500,body:'provider not a function'};
  return provider(cfg)(event,context);
};
