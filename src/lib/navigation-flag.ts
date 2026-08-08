let pendingAgentRedirect = false

export function setPendingAgentRedirect(value: boolean) {
  pendingAgentRedirect = value
}

export function getPendingAgentRedirect() {
  return pendingAgentRedirect
}
