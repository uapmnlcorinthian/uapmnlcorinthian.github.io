import { serve } from "https://deno.land/x/sift@0.4.3/mod.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",          // or lock to your domains
  "Access-Control-Allow-Methods": "OPTIONS,POST",
  "Access-Control-Allow-Headers": "Content-Type",
};

serve(async (req) => {
  // 1) Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // 2) Your existing verify logic...
  try {
    const { token } = await req.json();
    if (!token) throw new Error();

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

    return new Response(
      JSON.stringify({ success: Boolean(data.success) }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
