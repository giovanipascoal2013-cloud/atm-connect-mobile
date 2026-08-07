import { waLink } from './phone'

export const SUPPORT_WHATSAPP_NUMBER = '+244933986318'

export const SUPPORT_DEFAULT_MESSAGE = 'Olá, preciso de ajuda com o ATM Connect.'

export function supportWhatsAppUrl(prefill: string = SUPPORT_DEFAULT_MESSAGE): string {
  return waLink(SUPPORT_WHATSAPP_NUMBER, prefill)
}
