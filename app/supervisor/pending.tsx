import { useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, RefreshControl, Keyboard, TouchableWithoutFeedback } from 'react-native'
import { useSupervisor, type PendingATM } from '../../src/hooks/useSupervisor'
import { timeSince } from '../../src/lib/time'

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
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#2094F3" />}
      >
        {pendingATMs.length === 0 ? (
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' }}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>✅</Text>
            <Text style={{ color: '#6B7280', textAlign: 'center' }}>Nenhum ATM pendente de aprovação</Text>
          </View>
        ) : (
          pendingATMs.map((atm) => (
            <TouchableOpacity
              key={atm.id}
              style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
              onPress={() => { setSelectedATM(atm); setShowRejectForm(false); setRejectReason('') }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>{atm.bank_name}</Text>
                  <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{atm.address}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                      {atm.has_cash ? '💵 Dinheiro' : '❌ Sem dinheiro'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                      {atm.has_paper ? '📄 Papel' : '❌ Sem papel'}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{timeSince(atm.created_at)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {selectedATM && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, padding: 20, maxHeight: '60%' }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: 16 }} />

          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{selectedATM.bank_name}</Text>
          <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 2 }}>{selectedATM.address}</Text>

          {selectedATM.obs && (
            <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, marginTop: 12 }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Observações</Text>
              <Text style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>{selectedATM.obs}</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: '#2094F3', borderRadius: 12, paddingVertical: 12, alignItems: 'center', opacity: processing ? 0.7 : 1 }}
              onPress={() => handleApprove(selectedATM.id)}
              disabled={processing}
            >
              {processing ? <ActivityIndicator color="#fff" /> : <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Aprovar</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: '#FEF2F2', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' }}
              onPress={() => setShowRejectForm(!showRejectForm)}
              disabled={processing}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#DC2626' }}>Rejeitar</Text>
            </TouchableOpacity>
          </View>

          {showRejectForm && (
            <View style={{ marginTop: 12 }}>
              <TextInput
                style={{ backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, fontSize: 13, minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: '#E5E7EB' }}
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="Motivo da rejeição..."
                placeholderTextColor="#9CA3AF"
                multiline
              />
              <TouchableOpacity
                style={{ backgroundColor: '#DC2626', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 8, opacity: processing ? 0.7 : 1 }}
                onPress={() => handleReject(selectedATM.id)}
                disabled={processing}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Confirmar Rejeição</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity onPress={() => setSelectedATM(null)} style={{ paddingVertical: 12, alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 14, color: '#9CA3AF' }}>Fechar</Text>
          </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      )}
    </View>
  )
}
