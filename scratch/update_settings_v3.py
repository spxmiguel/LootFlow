import re

settings_file = "/Users/miguelramthunmoretti/Documents/Projetos/lootflow 2/src/pages/Settings.tsx"

with open(settings_file, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace the WhatsAppSection return block
whatsapp_target = """  return (
    <Section icon={MessageCircle} color="green" title="Notificações WhatsApp" subtitle="Lembretes automáticos de drop via bot">
      <div className="space-y-5">"""

whatsapp_end_target = """      </div>
    </Section>
  )
}"""

# Locate the WhatsAppSection return start and end
wa_start = content.find(whatsapp_target)
if wa_start == -1:
    print("Could not find WhatsAppSection return start!")
    exit(1)

wa_end_search = content.find(whatsapp_end_target, wa_start)
if wa_end_search == -1:
    print("Could not find WhatsAppSection return end!")
    exit(1)

wa_end = wa_end_search + len(whatsapp_end_target)

# New WhatsAppSection body
new_wa_body = """  return (
    <div className="space-y-5">
      {/* 1. Conexão & Status */}
      <Section icon={MessageCircle} color="green" title="Conexão & Status" subtitle="Ative o bot e configure seu número de celular" defaultOpen={true}>
        {/* Info */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0d1117] border border-white/[0.06]">
          <Info size={13} className="text-slate-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            O número que você coloca aqui é o <span className="text-slate-300">seu</span> número — onde vai <span className="text-slate-300">receber</span> as mensagens. O bot envia de um número dedicado.
          </p>
        </div>

        {/* Toggle principal + status */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#111827] border border-white/[0.06]">
          <div>
            <p className="text-sm text-white font-medium">Ativar lembretes</p>
            <p className={`text-[11px] mt-0.5 ${botStatus.color}`}>{botStatus.label}</p>
          </div>
          <Toggle value={draft.enabled ?? false} onChange={v => updateDraft({ enabled: v })} />
        </div>

        {/* Número */}
        <div>
          <label className="text-xs text-slate-400 block mb-1.5">Seu número do WhatsApp</label>
          {!editingPhone && hasPhone ? (
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#111827] border border-white/[0.06]">
              <div>
                <p className="text-sm text-white font-mono">+{phone}</p>
                <p className={`text-[11px] mt-0.5 ${verified ? 'text-profit' : 'text-yellow-500'}`}>
                  {verified ? '✓ Verificado' : '⏳ Aguardando verificação'}
                </p>
              </div>
              <button
                onClick={() => { setPhoneInput(phone.startsWith('55') ? phone.slice(2) : phone); setEditingPhone(true) }}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg border border-white/[0.1] hover:border-white/30 transition-all"
              >
                Trocar
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">+55</span>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="11 99999-9999"
                  className="w-full h-9 rounded-xl border border-white/[0.1] bg-[#111827] text-slate-200 text-sm pl-10 pr-3 focus:outline-none focus:border-primary/60 placeholder:text-slate-600"
                />
              </div>
              <div className="flex gap-2">
                <button
                  disabled={sendingCode || phoneInput.length < 10}
                  onClick={() => sendVerifyCode(`55${phoneInput}`)}
                  className="flex-1 h-8 rounded-xl bg-primary/10 border border-primary/40 text-primary text-xs font-medium hover:bg-primary/20 transition-all disabled:opacity-50"
                >
                  {sendingCode ? 'Enviando...' : 'Enviar código de verificação'}
                </button>
                {hasPhone && (
                  <button
                    onClick={() => { setEditingPhone(false); setPhoneInput('') }}
                    className="px-3 h-8 rounded-xl border border-white/[0.1] text-slate-500 text-xs hover:text-slate-300 transition-all"
                  >
                    Cancelar
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-600">DDD + número — somente dígitos</p>
              <p className="text-[10px] text-slate-600/70 leading-relaxed">
                Ao enviar o código, você autoriza o LootFlow a enviar mensagens automáticas para este número via bot WhatsApp.
                Para revogar, envie <span className="text-slate-500">PARAR</span> para o bot ou desative os lembretes.
                Base legal: consentimento (LGPD Art. 7, I).
              </p>
            </div>
          )}
        </div>

        {/* Verificação pendente */}
        {hasPhone && !verified && !editingPhone && (
          <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/25 space-y-3">
            <div>
              <p className="text-xs text-yellow-400 font-medium">⏳ Verificação pendente</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                O bot enviou um código de 6 dígitos pro seu WhatsApp. Digite ele abaixo:
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={codeInput}
                onChange={e => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="flex-1 h-9 rounded-xl border border-white/[0.1] bg-[#0d1117] text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-yellow-500/50 placeholder:text-slate-700"
              />
              <button
                disabled={codeInput.length !== 6 || verifying}
                onClick={async () => {
                  if (!user?.uid) return
                  setVerifying(true)
                  try {
                    const stored = settings.whatsapp?.verifyCode
                    if (codeInput === stored) {
                      updateSettings({ whatsapp: { ...settings.whatsapp!, verified: true, verifyCode: undefined } })
                      setCodeInput('')
                      toast.success('✅ Número verificado! Bot ativado.')
                    } else {
                      toast.error('Código inválido. Verifique e tente de novo.')
                    }
                  } finally { setVerifying(false) }
                }}
                className="px-4 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-medium hover:bg-yellow-500/20 transition-all disabled:opacity-40"
              >
                {verifying ? '...' : 'Verificar'}
              </button>
            </div>
            <button
              disabled={sendingCode || cooldownLeft > 0}
              onClick={() => sendVerifyCode()}
              className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sendingCode
                ? 'Enviando...'
                : cooldownLeft > 0
                ? `Aguarde ${formatCooldown(cooldownLeft)} para reenviar`
                : 'Não recebi — reenviar código'}
            </button>
          </div>
        )}
      </Section>

      {/* 2. Tipos de Alerta */}
      <Section icon={MessageCircle} color="blue" title="Tipos de Alerta" subtitle="Escolha quais relatórios e mensagens quer receber" defaultOpen={true}>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#111827] border border-white/[0.06]">
            <div>
              <p className="text-sm text-white">Resumo semanal</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Toda quarta: resumo da semana que fechou (terça 21h)</p>
            </div>
            <Toggle value={draft.weeklySummary ?? true} onChange={v => updateDraft({ weeklySummary: v })} />
          </div>

          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#111827] border border-loss/20">
            <div>
              <p className="text-sm text-white">Modo "enche o saco" 😤</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Repete o lembrete no intervalo configurado</p>
            </div>
            <Toggle value={draft.encheSaco ?? false} onChange={v => updateDraft({ encheSaco: v })} />
          </div>

          {(draft.encheSaco ?? false) && (
            <div className="pl-1 py-1">
              <label className="text-xs text-slate-500 block mb-2">Repetir a cada</label>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { label: '30 min', value: 30 },
                  { label: '1h', value: 60 },
                  { label: '1h30', value: 90 },
                  { label: '2h', value: 120 },
                  { label: '3h', value: 180 },
                  { label: '4h', value: 240 },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateDraft({ encheSacoInterval: opt.value })}
                    className={`h-8 px-3 rounded-xl text-xs font-medium border transition-all ${
                      (draft.encheSacoInterval ?? 60) === opt.value
                        ? 'bg-loss/10 border-loss/40 text-loss'
                        : 'bg-[#0d1117] border-white/[0.08] text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-white/[0.08] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDevTone(v => !v)}
              className="w-full flex items-center justify-between gap-3 p-3 bg-[#111827] text-left hover:bg-[#131c2e] transition-colors"
            >
              <div>
                <p className="text-sm text-white">Modo zoeira/dev</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Mensagens agressivas ficam escondidas e exigem opt-in consciente.</p>
              </div>
              <ChevronDown size={15} className={`text-slate-500 transition-transform ${showDevTone ? 'rotate-180' : ''}`} />
            </button>
            {showDevTone && (
              <div className="bg-[#0d1117] border-t border-white/[0.06] p-3 space-y-3">
                <div className="flex items-start gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-yellow-400" />
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Conteúdo propositalmente ofensivo. Use só em ambiente privado, demo interna ou desenvolvimento.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#111827] border border-red-500/20">
                  <div>
                    <p className="text-sm text-white">Ativar modo zoeira/dev</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">O bot usa mensagens agressivas até os drops serem registrados.</p>
                  </div>
                  <Toggle value={draft.xingamentos ?? false} onChange={async v => {
                    const wasOff = !(draft.xingamentos ?? false)
                    updateDraft({ xingamentos: v })
                    if (v && wasOff && user?.uid && hasPhone) {
                      try { await firestoreQueueNotification(user.uid, 'xingamentos_welcome') } catch {}
                    }
                  }} />
                </div>

                {(draft.xingamentos ?? false) && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Mensagens ativas</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateDraft({ enabledXingamentos: undefined })}
                          className="text-[10px] text-slate-600 hover:text-profit transition-colors"
                        >
                          Todas
                        </button>
                        <span className="text-slate-800 text-[10px]">·</span>
                        <button
                          onClick={() => updateDraft({ enabledXingamentos: [] })}
                          className="text-[10px] text-slate-600 hover:text-loss transition-colors"
                        >
                          Nenhuma
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                      {XINGAMENTOS_META.map(x => {
                        const enabled = !draft.enabledXingamentos || draft.enabledXingamentos.includes(x.id)
                        return (
                          <div
                            key={x.id}
                            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all cursor-pointer ${
                              enabled
                                ? 'bg-red-500/5 border-red-500/15 text-slate-300'
                                : 'bg-transparent border-white/[0.04] text-slate-600'
                            }`}
                            onClick={() => {
                              const current = draft.enabledXingamentos ?? XINGAMENTOS_META.map(m => m.id)
                              updateDraft({
                                enabledXingamentos: enabled
                                  ? current.filter(i => i !== x.id)
                                  : [...current, x.id].sort((a, b) => a - b),
                              })
                            }}
                          >
                            <span className="text-base leading-none shrink-0">{x.emoji}</span>
                            <span className="text-[11px] font-mono flex-1 truncate">{x.title}</span>
                            <span className={`text-[10px] shrink-0 ${enabled ? 'text-profit' : 'text-slate-700'}`}>
                              {enabled ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-[10px] text-slate-700 mt-2 text-center">
                      {(() => {
                        const n = draft.enabledXingamentos == null ? XINGAMENTOS_META.length : draft.enabledXingamentos.length
                        return `${n} de ${XINGAMENTOS_META.length} ativas`
                      })()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* 3. Grade de Horários */}
      <Section icon={MessageCircle} color="gold" title="Grade de Horários" subtitle="Dias e horários permitidos para envio" defaultOpen={false}>
        <p className="text-[11px] text-slate-600 mb-3">Ative os dias e configure o horário em que o bot pode te mandar mensagem.</p>
        <div className="space-y-1.5">
          {[0, 1, 2, 3, 4, 5, 6].map(day => {
            const conf = schedule[day] ?? { enabled: false, activeStart: '09:00', activeEnd: '22:00' }
            return (
              <div
                key={day}
                className={`rounded-xl border transition-all ${
                  conf.enabled
                    ? 'bg-[#111827]'
                    : 'bg-transparent'
                } border-white/[0.05]`}
              >
                <div className="flex items-center gap-3 px-3 py-2">
                  <span className={`text-xs font-medium w-7 ${conf.enabled ? 'text-white' : 'text-slate-600'}`}>
                    {DAY_LABELS[day]}
                  </span>
                  <Toggle
                    value={conf.enabled}
                    onChange={v => updateDraft({
                      schedule: { ...schedule, [day]: { ...conf, enabled: v } },
                    })}
                  />
                  {conf.enabled && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <input
                        type="time"
                        value={conf.activeStart}
                        onChange={e => updateDraft({
                          schedule: { ...schedule, [day]: { ...conf, activeStart: e.target.value } },
                        })}
                        className="h-7 w-20 rounded-lg border border-white/[0.1] bg-[#0d1117] text-slate-200 text-xs px-2 focus:outline-none focus:border-primary/60"
                      />
                      <span className="text-slate-600 text-xs">→</span>
                      <input
                        type="time"
                        value={conf.activeEnd}
                        onChange={e => updateDraft({
                          schedule: { ...schedule, [day]: { ...conf, activeEnd: e.target.value } },
                        })}
                        className="h-7 w-20 rounded-lg border border-white/[0.1] bg-[#0d1117] text-slate-200 text-xs px-2 focus:outline-none focus:border-primary/60"
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* 4. Testes & Diagnóstico */}
      <Section icon={MessageCircle} color="purple" title="Testes & Diagnóstico" subtitle="Valide o funcionamento do bot de mensagens" defaultOpen={false}>
        <div className="space-y-2">
          <Button
            onClick={handleTest}
            disabled={testing || !hasPhone}
            variant="ghost"
            size="sm"
            className="w-full border border-white/[0.1] hover:border-profit/40 hover:text-profit"
          >
            {testing ? '⏳ Enviando...' : '📲 Enviar mensagem de teste'}
          </Button>
          <Button
            onClick={handleForceReminder}
            disabled={forcingReminder || !hasPhone}
            variant="ghost"
            size="sm"
            className="w-full border border-white/[0.1] hover:border-primary/40 hover:text-primary"
          >
            {forcingReminder ? '⏳ Enviando...' : '🔔 Simular lembrete real agora'}
          </Button>
        </div>
      </Section>

      {/* Botão Salvar */}
      <div className={`p-4 rounded-xl border bg-[#0d1117]/30 transition-all ${hasChanges ? 'border-primary/30' : 'border-white/[0.06]'}`}>
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          size="sm"
          className={`w-full transition-all ${
            hasChanges
              ? 'bg-primary/90 hover:bg-primary text-white border-transparent'
              : 'opacity-40 cursor-not-allowed'
          }`}
        >
          {saving ? '⏳ Salvando...' : hasChanges ? '💾 Salvar alterações' : '✓ Tudo salvo'}
        </Button>
        {hasChanges && (
          <p className="text-[10px] text-primary/70 text-center mt-1.5">
            Alterações pendentes — clique em salvar para o bot receber as novas configurações
          </p>
        )}
      </div>
    </div>
  )
}"""

content = content[:wa_start] + new_wa_body + content[wa_end:]

# 2. Replace the finance tab panel
finance_target_pattern = r"\{\/\* ── Tab: Financeiro ── \*\/\}\s*\{activeTab === 'finance' && \(\s*<div className=\"space-y-5\">\s*<Section icon=\{Settings2\} color=\"blue\" title=\"Financeiro\" subtitle=\"Parâmetros de cálculo\">.*?</Section>\s*</div>\s*\)\}"
# Let's find it exactly to be safe
finance_start_str = "{/* ── Tab: Financeiro ── */}\n            {activeTab === 'finance' && (\n              <div className=\"space-y-5\">\n                <Section icon={Settings2} color=\"blue\" title=\"Financeiro\" subtitle=\"Parâmetros de cálculo\">"
finance_end_str = "</Section>\n              </div>\n            )}"

f_start = content.find(finance_start_str)
if f_start == -1:
    print("Could not find finance tab start!")
    exit(1)
f_end = content.find(finance_end_str, f_start) + len(finance_end_str)

new_finance_block = """{/* ── Tab: Financeiro ── */}
            {activeTab === 'finance' && (
              <div className="space-y-5">
                {/* 1. Taxa de Cashout */}
                <Section icon={Settings2} color="blue" title="Taxa de Cashout" subtitle="Percentual do valor bruto recebido na venda" defaultOpen={true}>
                  {/* Cashout rate */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-white font-medium">Taxa de Cashout</p>
                      <span className="text-lg font-mono font-bold text-primary">{cashoutRate}%</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">
                      Percentual do valor bruto que você realmente recebe na venda.<br/>
                      Ex: item {formatCurrency(10, settings.currency)} de valor bruto → cashout {formatCurrency(10 * cashoutRate / 100, settings.currency)}
                    </p>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={cashoutRate}
                      onChange={e => handleCashoutRate(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-[#111827]"
                    />
                    <div className="flex justify-between text-xs text-slate-600 mt-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Manual override */}
                  <div className="pt-3 border-t border-white/[0.04]">
                    <label className="text-xs text-slate-400 mb-1.5 block">Ou insira manualmente</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={String(cashoutRate)}
                        onChange={e => handleCashoutRate(Number(e.target.value))}
                        className="w-28"
                      />
                      <span className="flex items-center text-slate-400 text-sm">%</span>
                    </div>
                  </div>
                </Section>

                {/* 2. Moeda & Conversão */}
                <Section icon={Settings2} color="green" title="Moeda & Conversão" subtitle="Escolha a moeda de exibição e taxa do dólar" defaultOpen={true}>
                  {/* Currency */}
                  <SettingRow label="Moeda / Currency" hint={settings.currency === 'USD' ? `Taxa: 1 USD = R$ ${settings.usdRate ?? 5.2}` : 'Valores em Real Brasileiro'}>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateSettings({ currency: 'BRL' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${settings.currency === 'BRL' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200'}`}
                      >R$ BRL</button>
                      <button
                        onClick={() => updateSettings({ currency: 'USD' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${settings.currency === 'USD' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200'}`}
                      >$ USD</button>
                    </div>
                  </SettingRow>

                  {settings.currency === 'USD' && (
                    <div className="pt-3 border-t border-white/[0.04] pl-4 border-l-2 border-primary/20 space-y-1.5">
                      <label className="text-xs text-slate-400 block">Taxa de Conversão (1 USD = R$ ...)</label>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        value={String(settings.usdRate ?? 5.2)}
                        onChange={e => updateSettings({ usdRate: Number(e.target.value) || 5.2 })}
                        placeholder="5.2"
                      />
                    </div>
                  )}
                </Section>

                {/* 3. Meta Semanal */}
                <Section icon={Settings2} color="gold" title="Meta Semanal" subtitle="Defina o valor alvo de cashout por semana" defaultOpen={true}>
                  {/* Weekly goal */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Meta semanal de cashout ({settings.currency === 'USD' ? '$' : 'R$'})</label>
                    <Input
                      type="number"
                      min="0"
                      step="10"
                      value={String(
                        settings.currency === 'USD'
                          ? parseFloat((settings.weeklyGoalAmount / (settings.usdRate ?? 5.2)).toFixed(2))
                          : settings.weeklyGoalAmount
                      )}
                      onChange={e => {
                        const val = Number(e.target.value)
                        const finalVal = settings.currency === 'USD' ? val * (settings.usdRate ?? 5.2) : val
                        updateSettings({ weeklyGoalAmount: finalVal })
                      }}
                      placeholder="50"
                    />
                  </div>
                </Section>
              </div>
            )}"""

content = content[:f_start] + new_finance_block + content[f_end:]

# 3. Replace the appearance tab panel
appearance_start_str = "{/* ── Tab: Aparência ── */}\n            {activeTab === 'appearance' && (\n              <div className=\"space-y-5\">\n                <Section icon={Palette} color=\"purple\" title=\"Aparência\" subtitle=\"Cores, idioma e efeitos visuais\">"
appearance_end_str = "</Section>\n              </div>\n            )}"

ap_start = content.find(appearance_start_str)
if ap_start == -1:
    print("Could not find appearance tab start!")
    exit(1)
ap_end = content.find(appearance_end_str, ap_start) + len(appearance_end_str)

new_appearance_block = """{/* ── Tab: Aparência ── */}
            {activeTab === 'appearance' && (
              <div className="space-y-5">
                {/* 1. Tema & Cores */}
                <Section icon={Palette} color="purple" title="Tema & Cores" subtitle="Personalize as cores do painel" defaultOpen={true}>
                  {/* Primary color */}
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Cor Principal</label>
                    <div className="flex gap-2 flex-wrap mb-2">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => updateTheme({ primaryColor: c })}
                          className={`w-7 h-7 rounded-lg transition-all ${
                            settings.theme.primaryColor === c
                              ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0d1117] scale-110'
                              : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={settings.theme.primaryColor}
                        onChange={e => updateTheme({ primaryColor: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-white/[0.08] bg-transparent cursor-pointer"
                      />
                      <Input
                        value={settings.theme.primaryColor}
                        onChange={e => updateTheme({ primaryColor: e.target.value })}
                        className="w-28 font-mono text-xs"
                        placeholder="#38bdf8"
                      />
                    </div>
                  </div>

                  {/* Accent color */}
                  <div className="pt-3 border-t border-white/[0.04]">
                    <label className="text-xs text-slate-400 mb-2 block">Cor de Destaque</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={settings.theme.accentColor}
                        onChange={e => updateTheme({ accentColor: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-white/[0.08] bg-transparent cursor-pointer"
                      />
                      <Input
                        value={settings.theme.accentColor}
                        onChange={e => updateTheme({ accentColor: e.target.value })}
                        className="w-28 font-mono text-xs"
                        placeholder="#4ade80"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.04]">
                    <SettingRow label="Glassmorphism" hint="Efeito de vidro nas cards">
                      <Toggle
                        value={settings.theme.glassmorphism}
                        onChange={v => updateTheme({ glassmorphism: v })}
                      />
                    </SettingRow>
                  </div>
                </Section>

                {/* 2. Interface & Otimização */}
                <Section icon={Palette} color="blue" title="Interface & Otimização" subtitle="Ajustes visuais e de performance" defaultOpen={true}>
                  <SettingRow label="Otimizar site" hint="Desativa animações e efeitos para melhor performance">
                    <Toggle
                      value={!settings.theme.animations}
                      onChange={v => updateTheme({ animations: !v })}
                    />
                  </SettingRow>

                  <div className="pt-3 border-t border-white/[0.04]">
                    <SettingRow label="Sidebar compacta" hint="Colapsa labels no menu lateral">
                      <Toggle
                        value={settings.theme.sidebarCompact}
                        onChange={v => updateTheme({ sidebarCompact: v })}
                      />
                    </SettingRow>
                  </div>
                </Section>

                {/* 3. Idioma */}
                <Section icon={Palette} color="gold" title="Idioma / Language" subtitle="Mude o idioma da interface" defaultOpen={true}>
                  <SettingRow label="Idioma / Language" hint="Idioma da interface / Interface language">
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateSettings({ language: 'pt' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${settings.language !== 'en' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200'}`}
                      >🇧🇷 PT</button>
                      <button
                        onClick={() => updateSettings({ language: 'en' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${settings.language === 'en' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200'}`}
                      >🇺🇸 EN</button>
                    </div>
                  </SettingRow>
                </Section>
              </div>
            )}"""

content = content[:ap_start] + new_appearance_block + content[ap_end:]

with open(settings_file, "w", encoding="utf-8") as f:
    f.write(content)

print("Settings sections updated successfully!")
