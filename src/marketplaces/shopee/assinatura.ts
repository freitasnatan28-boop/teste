// Autenticação da Shopee Affiliate Open API.
// Cabeçalho: Authorization: SHA256 Credential={AppId}, Timestamp={ts}, Signature={assinatura}
// assinatura = SHA256( AppId + Timestamp + Payload(JSON do corpo) + Secret ), em hexadecimal.
// ⚠️ Conferir na documentação oficial quando a conta for aprovada (Fase 5).
import { createHash } from "node:crypto";

export function assinarShopee(appId: string, secret: string, payload: string, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHash("sha256").update(`${appId}${timestamp}${payload}${secret}`).digest("hex");
  return {
    timestamp,
    signature,
    authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`,
  };
}
