import { serve } from "https://deno.land/x/sift@0.4.3/mod.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,POST",
  "Access-Control-Allow-Headers": "Content-Type",
};

serve(async (req) => {
  // 1) Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  try {
    // 2) Parse token
    const { token } = await req.json();
    if (!token) throw new Error("No token");

    // 3) Verify with Google
    const secret = Deno.env.get("RECAPTCHA_SECRET")!;
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

    // 4) Return JSON + CORS
    return new Response(JSON.stringify({ success: !!data.success }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ success: false }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
