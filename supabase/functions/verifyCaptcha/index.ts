// supabase/functions/verifyCaptcha/index.ts

import { serve } from "https://deno.land/x/sift@0.4.3/mod.ts";

serve(async (req) => {
  try {
    // 1) Parse incoming token
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ success: false }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // 2) Read your secret from env
    const secret = Deno.env.get("RECAPTCHA_SECRET");
    if (!secret) {
      console.error("Missing RECAPTCHA_SECRET env var");
      return new Response(JSON.stringify({ success: false }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    // 3) Verify with Google
    const params = new URLSearchParams({ secret, response: token });
    const googleRes = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      },
    );
    const data = await googleRes.json();

    // 4) Return only the success flag
    return new Response(JSON.stringify({ success: Boolean(data.success) }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("verifyCaptcha error:", err);
    return new Response(JSON.stringify({ success: false }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
