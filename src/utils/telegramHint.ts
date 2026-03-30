/**
 * Builds a safe operator hint for Telegram notifications without exposing
 * encryption keys or decrypted secret values.
 */
export function buildTelegramChannelHint(
  channelId: string | undefined,
  action: string,
  keyHint?: string
): string | undefined {
  const normalizedChannelId = channelId?.trim();
  const normalizedKeyHint = keyHint?.trim();

  if (!normalizedChannelId) {
    return undefined;
  }

  const referencePart = normalizedKeyHint ? ` Safe key reference: ${normalizedKeyHint}.` : '';

  return `Telegram hint: notify channel ${normalizedChannelId} that "${action}" completed.${referencePart} Never send ENV_ENCRYPTION_KEY, ENV_VALUE_ENCRYPTION_KEY, or secret values to Telegram.`;
}
