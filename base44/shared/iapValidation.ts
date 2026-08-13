// Server-side receipt validation for Apple App Store — APPLE ONLY.
// Two credential modes:
//   (A) Legacy verifyReceipt (consumables) — needs APPLE_SHARED_SECRET, takes
//       a StoreKit 1 receipt blob.
//   (B) App Store Server API JWT (ES256) — needs APPLE_ISSUER_ID /
//       APPLE_KEY_ID / APPLE_PRIVATE_KEY_BASE64 (the .p8 key, base64-encoded),
//       takes a StoreKit 2 transactionId.
// Credential-gated: returns a clear "not configured" result when the required
// set for the chosen path is absent. IAP_MOCK_VALIDATION=true bypasses both.

export interface ValidationResult {
  valid: boolean;
  platform: "apple";
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
const APPLE_SERVER_API_BASE = "https://api.storekit.itunes.apple.com";

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
// Option A (receipt blob).
export function appleConfigured(): boolean {
  return !!env("APPLE_SHARED_SECRET");
}
// Option B (Server API JWT).
export function appleServerApiConfigured(): boolean {
  return !!(env("APPLE_ISSUER_ID") && env("APPLE_KEY_ID") && env("APPLE_PRIVATE_KEY_BASE64"));
}

// ── Option A: legacy verifyReceipt ──────────────────────────────────────────
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
    const bundleId = env("APPLE_BUNDLE_ID");
    if (bundleId && receipt.bundle_id && receipt.bundle_id !== bundleId) {
      return { valid: false, platform: "apple", transactionId: "", productId: expectedProductId, purchaseDate: "", raw: json, error: `bundle id mismatch: ${receipt.bundle_id}` };
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

// ── Option B: App Store Server API (ES256 JWT) ──────────────────────────────
// Validates a StoreKit 2 transactionId via GET /inApps/v1/transactions/{id}.
function base64url(input: Uint8Array | ArrayBuffer): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// Convert an ECDSA signature (DER X9.62) to the raw r||s (64 bytes for P-256)
// JOSE form. Some WebCrypto runtimes return the raw r||s directly; detect both.
function derToJose(sig: ArrayBuffer): Uint8Array {
  const d = new Uint8Array(sig);
  // Already raw r||s (no DER SEQUENCE prefix).
  if (d.length === 64 && d[0] !== 0x30) return d;
  if (d[0] !== 0x30) throw new Error(`ECDSA signature: unexpected form (len ${d.length}, first 0x${d[0]?.toString(16)})`);
  let idx = 2; // skip 0x30 + short-form length (P-256 sigs are < 128 bytes)
  if (d[idx] !== 0x02) throw new Error("ECDSA signature: expected INTEGER r");
  const rLen = d[idx + 1]; idx += 2;
  const r = d.slice(idx, idx + rLen); idx += rLen;
  if (d[idx] !== 0x02) throw new Error("ECDSA signature: expected INTEGER s");
  const sLen = d[idx + 1]; idx += 2;
  const s = d.slice(idx, idx + sLen);
  const strip = (arr: Uint8Array) => {
    let start = 0;
    while (start < arr.length - 1 && arr[start] === 0) start++;
    return arr.slice(start);
  };
  const pad = (arr: Uint8Array, size = 32) => {
    const out = new Uint8Array(size);
    out.set(arr, size - arr.length);
    return out;
  };
  const out = new Uint8Array(64);
  out.set(pad(strip(r)), 0);
  out.set(pad(strip(s)), 32);
  return out;
}

async function makeAppleServerApiJwt(): Promise<string> {
  const issuerId = env("APPLE_ISSUER_ID");
  const keyId = env("APPLE_KEY_ID");
  const bundleId = env("APPLE_BUNDLE_ID");
  const pem = atob(env("APPLE_PRIVATE_KEY_BASE64").trim()); // base64-encoded .p8 PEM text
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(pem),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", typ: "JWT", kid: keyId };
  const payload: any = {
    iss: issuerId,
    iat: now,
    exp: now + 1200, // Apple allows up to 1h; keep safely under the boundary
    aud: "appstoreconnect-v1",
    nonce: crypto.randomUUID(),
  };
  if (bundleId) payload.bid = bundleId;
  const enc = (o: any) => base64url(new TextEncoder().encode(JSON.stringify(o)));
  const signingInput = `${enc(header)}.${enc(payload)}`;
  const sigDer = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64url(derToJose(sigDer))}`;
}

export async function verifyAppleTransaction(transactionId: string, expectedProductId: string): Promise<ValidationResult> {
  if (!appleServerApiConfigured()) {
    return { valid: false, platform: "apple", transactionId, productId: expectedProductId, purchaseDate: "", raw: null, error: "App Store Server API credentials not configured (need APPLE_ISSUER_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY_BASE64)" };
  }
  const jwt = await makeAppleServerApiJwt();
  const url = `${APPLE_SERVER_API_BASE}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${jwt}`, Accept: "application/json" } });
  const text = await res.text();
  const json: any = text ? (() => { try { return JSON.parse(text); } catch { return { _raw: text.slice(0, 300) }; } })() : {};
  // Surface the decoded payload on auth failure for credential debugging.
  const decodedPayload = JSON.parse(atob(jwt.split(".")[1]));
  if (!res.ok) {
    const err = json?.errors?.[0];
    const dbg = res.status === 401 ? ` — jwt payload: ${JSON.stringify({ iss: decodedPayload.iss, kid: env("APPLE_KEY_ID"), aud: decodedPayload.aud, iat: decodedPayload.iat, exp: decodedPayload.exp, hasBid: !!decodedPayload.bid })}` : "";
    return {
      valid: false,
      platform: "apple",
      transactionId,
      productId: expectedProductId,
      purchaseDate: "",
      raw: json,
      error: err ? `${err.code || err.title}: ${err.detail || err.title}` : `HTTP ${res.status} ${JSON.stringify(json).slice(0, 400)}${dbg}`,
    };
  }
  const data: any[] = json.data || [];
  const tx = data.find((t: any) => t.productId === expectedProductId) || data[0];
  if (!tx) {
    return { valid: false, platform: "apple", transactionId, productId: expectedProductId, purchaseDate: "", raw: json, error: "transaction not found for product" };
  }
  const purchaseDate = tx.purchaseDate || tx.originalPurchaseDate;
  return {
    valid: true,
    platform: "apple",
    transactionId: tx.transactionId || transactionId,
    productId: tx.productId,
    purchaseDate: purchaseDate ? new Date(Number(purchaseDate)).toISOString() : "",
    expiryDate: tx.expiresDate ? new Date(Number(tx.expiresDate)).toISOString() : undefined,
    raw: json,
  };
}