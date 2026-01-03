import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from "@/config/constants";

export class TelegramError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = "TelegramError";
  }
}

/**
 * Sends a message to Telegram
 */
export async function sendTelegramMessage(message: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new TelegramError("Telegram credentials not configured");
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TelegramError(
        errorData.description || `Failed to send message: ${response.statusText}`,
        response.status
      );
    }
  } catch (error) {
    if (error instanceof TelegramError) {
      throw error;
    }
    throw new TelegramError(
      `Network error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Rate-limited message sender
 */
export async function sendMessagesWithRateLimit(
  messages: string[],
  delayMs: number = 2000
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < messages.length; i++) {
    try {
      await sendTelegramMessage(messages[i]);
      sent++;

      // Wait between messages to avoid rate limiting
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Failed to send message ${i + 1}:`, error);
      failed++;
    }
  }

  return { sent, failed };
}
