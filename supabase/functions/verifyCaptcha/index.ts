import { serve } from "https://deno.land/x/sift@0.4.3/mod.ts";

// Define CORS headers to reuse
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  // Handle OPTIONS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: {
        ...CORS_HEADERS,
        // Allow caching of preflight response
        "Access-Control-Max-Age": "86400",
      } 
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  try {
    const { token } = await req.json();
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing token" }),
        { 
          status: 400, 
          headers: { 
            ...CORS_HEADERS,
            "Content-Type": "application/json" 
          } 
        }
      );
    }

    const secret = Deno.env.get("RECAPTCHA_SECRET");
    if (!secret) {
      console.error("RECAPTCHA_SECRET is not set");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { 
          status: 500, 
          headers: { 
            ...CORS_HEADERS,
            "Content-Type": "application/json" 
          } 
        }
      );
    }

    const params = new URLSearchParams({ 
      secret, 
      response: token 
    });
    
    const googleRes = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      }
    );
    
    const data = await googleRes.json();
    
    return new Response(
      JSON.stringify({ success: Boolean(data.success) }),
      { 
        status: 200, 
        headers: { 
          ...CORS_HEADERS,
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error("Error verifying captcha:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { 
        status: 500, 
        headers: { 
          ...CORS_HEADERS,
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});