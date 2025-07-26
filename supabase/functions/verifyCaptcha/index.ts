// supabase/functions/verifyCaptcha/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const origin = req.headers.get("origin") || "*";

  // Handle preflight CORS
	if (req.method === "OPTIONS") {
	  return new Response(null, {
		status: 204,
		headers: {
		  "Access-Control-Allow-Origin": origin,
		  "Access-Control-Allow-Methods": "POST, OPTIONS",
		  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
		  "Access-Control-Max-Age": "86400",
		},
	  });
	}


  try {
    const { token } = await req.json();

    // Validate reCAPTCHA
    const secret = Deno.env.get("RECAPTCHA_SECRET_KEY");
    if (!secret) throw new Error("reCAPTCHA secret key not configured");

    const verifyURL = "https://www.google.com/recaptcha/api/siteverify";
    const res = await fetch(verifyURL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
      }).toString(),
    });

    const data = await res.json();
    const success = data.success === true;

    return new Response(JSON.stringify({ success }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({
      success: false,
      error: e.message,
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin,
      },
    });
  }
});
