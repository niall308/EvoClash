// Server-side receipt validation for Apple App Store (StoreKit) and Google
// Play Billing. Credential-gated: when the platform secrets are absent, the
// validators return a clear "not configured" result so the app runs without
// live keys during the initial credential-free implementation.
//
// MOCK MODE: set IAP_MOCK_VALIDATION=true to make validateIapReceipt accept
// any receipt with a known productId and return a valid-looking record
// WITHOUT calling Apple/Google. Dev/sandbox only — NEVER in production.

export interface ValidationResult {
  valid: boolean;
  platform: "apple" | "google";
  transactionId: string;
  productId: string;
  purchaseDate: string;
  expiryDate?: string;
  raw: any;
  error?: string;
  sandbox?: boolean;
}

const APPLE_PROD_URL = "https://buy.itunes.apple.com/verifyReceipt";
const APPLE_SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_PLAY_BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3";

function env(key: string): string {
  try {
    return (Deno as any).env?.get(key) || "";
  } catch {
    return "";
  }
}

export function mockEnabled(): boolean {
  return env("IAP_MOCK_VALIDATION") === "true";
}
export function appleConfigured(): boolean {
  return !!env("APPLE_SHARED_SECRET");
}
export function googleConfigured(): boolean {
  return !!env("GOOGLE_SERVICE_ACCOUNT_JSON") || !!env("GOOGLE_SERVICE_ACCOUNT_JSON_PATH");
}
function googlePackage(): string {
  return env("GOOGLE_PLAY_PACKAGE_NAME") || "com.evoclash.app";
}

// ── Apple (legacy verifyReceipt) ──────────────────────────────────────────
// Needs only the shared secret. When App Store Server API credentials
// (APPLE_ISSUER_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY_*) are added later,
// this can be upgraded to the signed-transaction flow.
export async function verifyAppleReceipt(receiptBase64: string, expectedProductId: string): Promise<ValidationResult> {
  const sharedSecret = env("APPLE_SHARED_SECRET");
  if (!sharedSecret) {
    return { valid: false, platform: "apple", transactionId: "", productId: expectedProductId, purchaseDate: "", raw: null, error: "APPLE_SHARED_SECRET not configured" };
  }
  const body = JSON.stringify({
    "receipt-data": receiptBase64,
    "exclude-old-transactions": true,
    password: sharedSecret,
  });
  // Hit production first; status 21007 means the receipt is sandbox → retry the sandbox URL.
  for (const url of [APPLE_PROD_URL, APPLE_SANDBOX_URL]) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    const json: any = await res.json();
    if (json.status === 21007 && url === APPLE_PROD_URL) continue;
    if (json.status !== 0) {
      return { valid: false, platform: "apple", transactionId: "", productId: expectedProductId, purchaseDate: "", raw: json, error: `Apple status ${json.status}`, sandbox: url === APPLE_SANDBOX_URL };
    }
    const receipt = json.receipt || {};
    const inApp: any[] = receipt.in_app || [];
    const latest = (json.latest_receipt_info || []).slice(-1)[0];
    const tx = inApp.find((t: any) => t.product_id === expectedProductId) || latest;
    if (!tx) {
      return { valid: false, platform: "apple", transactionId: "", productId: expectedProductId, purchaseDate: "", raw: json, error: "product not found in receipt" };
    }
    return {
      valid: true,
      platform: "apple",
      transactionId: tx.transaction_id || tx.original_transaction_id || "",
      productId: tx.product_id,
      purchaseDate: tx.purchase_date_ms ? new Date(Number(tx.purchase_date_ms)).toISOString() : "",
      expiryDate: tx.expires_date_ms ? new Date(Number(tx.expires_date_ms)).toISOString() : undefined,
      raw: json,
      sandbox: url === APPLE_SANDBOX_URL,
    };
  }
  return { valid: false, platform: "apple", transactionId: "", productId: expectedProductId, purchaseDate: "", raw: null, error: "unreachable" };
}

// ── Google Play Developer API ──────────────────────────────────────────────
// Validates/consumes/acknowledges via a service-account JWT exchange.
// Requires GOOGLE_SERVICE_ACCOUNT_JSON (raw JSON) OR GOOGLE_SERVICE_ACCOUNT_JSON_PATH.

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function base64url(input: Uint8Array | ArrayBuffer): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getGoogleAccessToken(): Promise<string> {
  let saJson = env("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!saJson && env("GOOGLE_SERVICE_ACCOUNT_JSON_PATH")) {
    saJson = await Deno.readTextFile(env("GOOGLE_SERVICE_ACCOUNT_JSON_PATH"));
  }
  if (!saJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
  const sa: any = JSON.parse(saJson);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const enc = (o: any) => base64url(new TextEncoder().encode(JSON.stringify(o)));
  const signingInput = `${enc(header)}.${enc(payload)}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput));
  const jwt = `${signingInput}.${base64url(sig)}`;
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const tokenJson: any = await res.json();
  if (!tokenJson.access_token) throw new Error(`Google token exchange failed: ${JSON.stringify(tokenJson)}`);
  return tokenJson.access_token;
}

export async function verifyGooglePurchase(productId: string, purchaseToken: string): Promise<ValidationResult> {
  if (!googleConfigured()) {
    return { valid: false, platform: "google", transactionId: "", productId, purchaseDate: "", raw: null, error: "GOOGLE_SERVICE_ACCOUNT_JSON not configured" };
  }
  const accessToken = await getGoogleAccessToken();
  const pkg = googlePackage();
  const url = `${GOOGLE_PLAY_BASE}/applications/${pkg}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}?access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  const json: any = await res.json();
  if (!res.ok) {
    return { valid: false, platform: "google", transactionId: purchaseToken, productId, purchaseDate: "", raw: json, error: json?.error?.message || `HTTP ${res.status}` };
  }
  // purchaseState 0 = Purchased. acknowledgementState 0 = not yet acknowledged.
  const valid = json.purchaseState === 0;
  return {
    valid,
    platform: "google",
    transactionId: json.purchaseToken || purchaseToken,
    productId,
    purchaseDate: json.purchaseTime ? new Date(Number(json.purchaseTime)).toISOString() : "",
    raw: json,
    error: valid ? undefined : `purchaseState ${json.purchaseState}`,
  };
}

export async function consumeGooglePurchase(productId: string, purchaseToken: string): Promise<{ consumed: boolean; error?: string }> {
  const accessToken = await getGoogleAccessToken();
  const pkg = googlePackage();
  const url = `${GOOGLE_PLAY_BASE}/applications/${pkg}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:consume`;
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
  return res.ok ? { consumed: true } : { consumed: false, error: await res.text() };
}

export async function acknowledgeGooglePurchase(productId: string, purchaseToken: string): Promise<{ acknowledged: boolean; error?: string }> {
  const accessToken = await getGoogleAccessToken();
  const pkg = googlePackage();
  const url = `${GOOGLE_PLAY_BASE}/applications/${pkg}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
  return res.ok ? { acknowledged: true } : { acknowledged: false, error: await res.text() };
}