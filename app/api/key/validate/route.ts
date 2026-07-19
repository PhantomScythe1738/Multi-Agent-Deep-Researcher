import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { validateOpenRouterKey } from "@/lib/ai/openrouter-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ apiKey: z.string().min(1).max(300) });

/**
 * Validate a user's OpenRouter key.
 *
 * The key is read from the request body, used for a single introspection call,
 * and discarded. It is NEVER written to the database, a cookie, or a log.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let apiKey: string;
  try {
    apiKey = bodySchema.parse(await request.json()).apiKey;
  } catch {
    return NextResponse.json({ valid: false, error: "Invalid request." }, { status: 400 });
  }

  const result = await validateOpenRouterKey(apiKey);
  // Explicitly no-store so the response (which reflects key status) isn't cached.
  return NextResponse.json(result, {
    status: result.valid ? 200 : 400,
    headers: { "Cache-Control": "no-store" },
  });
}
