/**
 * Los cambios a un intercambio se publican como un mensaje más del chat, para
 * que las dos partes vean el historial de propuestas en un solo lugar.
 * El prefijo marca esos mensajes automáticos y se pinta distinto.
 */
export const PROPOSAL_PREFIX = "::propuesta::\n";

export function parseProposal(body: string): string | null {
  return body.startsWith(PROPOSAL_PREFIX) ? body.slice(PROPOSAL_PREFIX.length) : null;
}
