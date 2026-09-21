import { createHash } from "node:crypto";
export async function allowAuthEmail(admin, email) {
  const key = createHash("sha256").update(email).digest("hex");
  const { data, error } = await admin.rpc("consume_auth_request", {
    key_hash_value: key,
  });
  if (error) {
    console.error("allowAuthEmail rpc error:", error);
    throw new Error(
      "Authentication storage is not ready. Contact the administrator.",
    );
  }
  return data === true;
}
