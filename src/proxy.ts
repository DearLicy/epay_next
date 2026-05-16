import { NextRequest, NextResponse } from "next/server";
import { appUrl } from "@/lib/app-url";

export function proxy(request: NextRequest) {
  const url = request.nextUrl;

  if (!url.searchParams.has("_rsc")) {
    return NextResponse.next();
  }

  const acceptsHtml = request.headers.get("accept")?.includes("text/html") ?? false;
  const isDocumentNavigation = request.headers.get("sec-fetch-dest") === "document";

  if (!acceptsHtml && !isDocumentNavigation) {
    return NextResponse.next();
  }

  const cleanUrl = new URL(appUrl(url.pathname));
  url.searchParams.forEach((value, key) => {
    if (key !== "_rsc") cleanUrl.searchParams.append(key, value);
  });
  return NextResponse.redirect(cleanUrl, { status: 307 });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};