import { useState, useCallback } from 'react'
import { View, Text, ScrollView, Alert, TextInput, RefreshControl, Keyboard, TouchableWithoutFeedback, TouchableOpacity } from 'react-native'
import { useSupervisor, type PendingATM } from '../../src/hooks/useSupervisor'
import { timeSince } from '../../src/lib/time'
import { AppCard } from '../../src/components/ui/AppCard'
import { AppButton } from '../../src/components/ui/AppButton'
import { EmptyState } from '../../src/components/ui/EmptyState'
import { Badge } from '../../src/components/ui/Badge'
import { colors, radius, shadows } from '../../src/theme/tokens'

export default function PendingATMsScreen() {
  const { pendingATMs, loading, refetch, approveATM, rejectATM } = useSupervisor()
  const [selectedATM, setSelectedATM] = useState<PendingATM | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [processing, setProcessing] = useState(false)

  const handleApprove = useCallback(async (atmId: string) => {
    setProcessing(true)
    const { error } = await approveATM(atmId)
    setProcessing(false)
    if (error) {
      Alert.alert('Erro', 'Não foi possível aprovar o ATM.')
    } else {
      Alert.alert('Sucesso', 'ATM aprovado com sucesso!')
      setSelectedATM(null)
    }
  }, [approveATM])

  const handleReject = useCallback(async (atmId: string) => {
    if (!rejectReason.trim()) {
      Alert.alert('Erro', 'Indique o motivo da rejeição.')
      return
    }
    setProcessing(true)
    const { error } = await rejectATM(atmId, rejectReason.trim())
    setProcessing(false)
    if (error) {
      Alert.alert('Erro', 'Não foi possível rejeitar o ATM.')
    } else {
      Alert.alert('Sucesso', 'ATM rejeitado.')
      setSelectedATM(null)
      setRejectReason('')
      setShowRejectForm(false)
    }
  }, [rejectATM, rejectReason])

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.brand[500]} />}
      >
        {pendingATMs.length === 0 ? (
          <AppCard>
            <EmptyState
              icon="checkmark-done"
              title="Nenhum ATM pendente de aprovação"
              description="Quando um agente submeter um ATM, ele aparecerá aqui."
            />
          </AppCard>
        ) : (
          pendingATMs.map((atm) => (
            <AppCard
              key={atm.id}
              raised
              style={{ marginBottom: 12, padding: 14 }}
              onPress={() => { setSelectedATM(atm); setShowRejectForm(false); setRejectReason('') }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary }}>{atm.bank_name}</Text>
                  <Text style={{ fontSize: 13, color: colors.text.secondary, marginTop: 2 }}>{atm.address}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <Badge
                      variant={atm.has_cash ? 'success' : 'danger'}
                      icon={atm.has_cash ? 'cash' : 'close-circle'}
                      label={atm.has_cash ? 'Dinheiro' : 'Sem dinheiro'}
                    />
                    <Badge
                      variant={atm.has_paper ? 'success' : 'danger'}
                      icon={atm.has_paper ? 'receipt' : 'close-circle'}
                      label={atm.has_paper ? 'Papel' : 'Sem papel'}
                    />
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: colors.text.tertiary }}>{timeSince(atm.created_at)}</Text>
              </View>
            </AppCard>
          ))
        )}
      </ScrollView>

      {selectedATM && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, ...shadows.raised, padding: 20, maxHeight: '60%' }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />

              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary }}>{selectedATM.bank_name}</Text>
              <Text style={{ fontSize: 14, color: colors.text.secondary, marginTop: 2 }}>{selectedATM.address}</Text>

              {selectedATM.obs && (
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.sm, padding: 10, marginTop: 12 }}>
                  <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Observações</Text>
                  <Text style={{ fontSize: 13, color: colors.text.primary, marginTop: 2 }}>{selectedATM.obs}</Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <AppButton
                  label="Aprovar"
                  icon="checkmark"
                  loading={processing}
                  onPress={() => handleApprove(selectedATM.id)}
                  style={{ flex: 1 }}
                />
                <AppButton
                  label={showRejectForm ? 'Cancelar' : 'Rejeitar'}
                  variant="danger"
                  icon="close-circle"
                  disabled={processing}
                  onPress={() => setShowRejectForm(!showRejectForm)}
                  style={{ flex: 1 }}
                />
              </View>

              {showRejectForm && (
                <View style={{ marginTop: 12 }}>
                  <TextInput
                    style={{ backgroundColor: colors.surface, borderRadius: radius.sm, padding: 10, fontSize: 13, minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border }}
                    value={rejectReason}
                    onChangeText={setRejectReason}
                    placeholder="Motivo da rejeição..."
                    placeholderTextColor={colors.text.tertiary}
                    multiline
                  />
                  <AppButton
                    label="Confirmar Rejeição"
                    variant="danger"
                    icon="trash"
                    loading={processing}
                    onPress={() => handleReject(selectedATM.id)}
                    style={{ marginTop: 8 }}
                  />
                </View>
              )}

              <TouchableOpacity onPress={() => setSelectedATM(null)} style={{ paddingVertical: 12, alignItems: 'center', marginTop: 8 }}>
                <Text style={{ fontSize: 14, color: colors.text.tertiary }}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      )}
    </View>
  )
}
