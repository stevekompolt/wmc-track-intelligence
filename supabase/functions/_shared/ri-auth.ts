// Verify the caller against the Real Intelligence Salesforce endpoint.
// The RI login is stateless — every request re-checks the user's role
// via the same endpoint the frontend already uses.

const RI_API_BASE = "https://api.realintelligence.com/api";
const RI_ORG_ID = "00D5e000000HEcP";

export interface RiUser {
  email: string;
  intelrole: string;
  isAdmin: boolean;
}

function extractTag(text: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([^<]+)</${tag}>`, "i");
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

export async function verifyRiUser(email: string): Promise<RiUser | null> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const url =
    `${RI_API_BASE}/specific-wmc-member-email.py` +
    `?orgId=${encodeURIComponent(RI_ORG_ID)}` +
    `&email=${encodeURIComponent(email)}` +
    `&sandbox=False`;
  const res = await fetch(url, { headers: { Accept: "*/*" } });
  if (!res.ok) return null;
  const text = await res.text();
  const intelrole = extractTag(text, "intelrole") || "";
  const normalized = intelrole.toLowerCase().replace(/[_\s&]+/g, "");
  const isAdmin = normalized === "wmcadmin" || normalized === "admin";
  return { email, intelrole, isAdmin };
}

/** Reads the RI email from the request header and verifies it. */
export async function requireRiAdmin(
  req: Request,
): Promise<{ ok: true; user: RiUser } | { ok: false; status: number; error: string }> {
  const email = req.headers.get("x-ri-email");
  if (!email) {
    return { ok: false, status: 401, error: "missing_ri_email_header" };
  }
  const user = await verifyRiUser(email);
  if (!user) return { ok: false, status: 401, error: "ri_user_not_found" };
  if (!user.isAdmin) return { ok: false, status: 403, error: "not_wmc_admin" };
  return { ok: true, user };
}