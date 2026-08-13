// Server-side receipt validation for Apple App Store (StoreKit) — APPLE ONLY.
// Credential-gated: when APPLE_SHARED_SECRET is absent, verifyAppleReceipt
// returns a clear "not configured" result so the app runs without live keys
// during the initial credential-free implementation.
//
// MOCK MODE: set IAP_MOCK_VALIDATION=true to make validateIapReceipt accept
// any receipt with a known productId and return a valid-looking record
// WITHOUT calling Apple. Dev/sandbox only — NEVER in production.

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

// Apple legacy verifyReceipt. Needs only the shared secret. When App Store
// Server API credentials (APPLE_ISSUER_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY_*)
// are added later, this can be upgraded to the signed-transaction flow.
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
    // Validate the bundle id matches the expected app (optional guard via APPLE_BUNDLE_ID).
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