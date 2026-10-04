/**
 * ¿El pedido trae el secreto de webhook correcto?
 *
 * Compara los resúmenes SHA-256 de los dos textos recorriéndolos enteros, en vez
 * de `===`: la comparación directa corta en el primer carácter distinto y, en
 * teoría, el tiempo de respuesta delata cuánto del secreto se adivinó. Si la
 * variable no está configurada, nunca da por bueno el pedido.
 */
export async function esSecretoWebhook(recibido: string | null): Promise<boolean> {
  const esperado = process.env.SUPABASE_WEBHOOK_SECRET;
  if (!esperado || !recibido) return false;

  const resumen = async (texto: string) =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto)));
  const [a, b] = await Promise.all([resumen(recibido), resumen(esperado)]);

  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a[i] ^ b[i];
  return diferencia === 0;
}
