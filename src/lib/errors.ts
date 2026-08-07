export function friendlyAuthError(message: string): string {
  const msg = (message || '').toLowerCase()

  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('connection') ||
    msg.includes('failed to connect') ||
    msg.includes('timeout') ||
    msg.includes('typeerror')
  ) {
    return 'Não foi possível ligar ao servidor. Verifique a sua ligação à internet e tente novamente.'
  }

  if (msg.includes('user already registered')) {
    return 'Esta conta já está registada. Faça login com o mesmo número e senha.'
  }

  if (msg.includes('invalid login credentials')) {
    return 'Telefone ou senha incorrectos. Verifique e tente novamente.'
  }

  if (msg.includes('email not confirmed')) {
    return 'O seu email ainda não foi confirmado. Confirme antes de entrar.'
  }

  if (msg.includes('password should be at least') || msg.includes('password must be at least')) {
    return 'A senha deve ter pelo menos 6 caracteres.'
  }

  return message
}
