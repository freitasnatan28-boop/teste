// Serve a landing page de landing/oferta.html em /oferta.
import { lerPaginaLanding } from "@/lib/landing";

export async function GET() {
  return new Response(await lerPaginaLanding(), { headers: { "content-type": "text/html; charset=utf-8" } });
}
