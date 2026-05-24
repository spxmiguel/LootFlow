// Translation system for LootFlow
// Add keys here as needed — if a key is missing in EN, PT fallback is used.

export type Lang = 'pt' | 'en'

const translations = {
  pt: {
    // Nav
    'nav.dashboard': 'Dashboard',
    'nav.drops': 'Drops',
    'nav.accounts': 'Contas',
    'nav.analytics': 'Analytics',
    'nav.goals': 'Metas',
    'nav.settings': 'Configurações',
    // Dashboard
    'dash.bruto': 'bruto',
    'dash.invested': 'Investido',
    'dash.no_cost': 'Sem custo registrado',
    'dash.recent_drops': 'Drops Recentes',
    'dash.goal_progress': 'Progresso das Metas',
    'dash.no_goals': 'Nenhuma meta criada',
    'dash.no_drops': 'Nenhum drop ainda',
    'dash.week_drops': 'drops esta semana',
    'dash.best_week': 'Melhor semana',
    // Accounts
    'accounts.title_add': 'Nova Conta CS2',
    'accounts.title_edit': 'Editar Conta',
    'accounts.empty_title': 'Nenhuma conta ainda',
    'accounts.empty_desc': 'Adicione suas contas CS2 Prime para começar a trackear seus drops',
    'accounts.toast_added': 'Conta adicionada!',
    'accounts.toast_updated': 'Conta atualizada!',
    'accounts.prime_cost': 'Custo Prime',
    // Drops
    'drops.register_title': 'Registrar Drops da Semana',
    'drops.empty_title': 'Nenhum drop ainda',
    'drops.empty_filtered': 'Nenhum drop encontrado',
    'drops.empty_filtered_desc': 'Nenhum drop corresponde aos filtros ativos.',
    'drops.gross': 'Bruto',
    'drops.placeholder_value': 'Valor bruto',
    'drops.received_value': 'Valor recebido',
    'drops.no_valid_item': 'Nenhum item válido',
    // Analytics
    'analytics.empty_title': 'Nenhum dado ainda',
    'analytics.empty_desc': 'Registre drops para ver os analytics.',
    'analytics.total_cashout': 'Cashout Total',
    'analytics.gross_value': 'Valor Bruto',
    'analytics.total_drops': 'Total de Drops',
    'analytics.weekly_cashout': 'Cashout Semanal',
    'analytics.chart_gross': 'Bruto',
    'analytics.chart_cashout': 'Cashout',
    // Goals
    'goals.empty_title': 'Nenhuma meta criada',
    'goals.empty_desc': 'Crie metas de cashout, receita ou drops para acompanhar sua evolução.',
    'goals.name_label': 'Nome *',
    'goals.name_placeholder': 'Ex: Comprar Bayonet Doppler',
    'goals.target_label_money': 'Meta alvo ({{currency}})',
    'goals.target_label_qty': 'Meta alvo (quantidade)',
    'goals.type_profit_label': 'Cashout Total',
    'goals.type_profit_desc': 'Cashout real acumulado',
    'goals.type_revenue_label': 'Receita Steam',
    'goals.type_revenue_desc': 'Valor Steam acumulado',
    'goals.type_cashout_label': 'Cashout Semanal',
    'goals.type_cashout_desc': 'Cashout na semana atual',
    'goals.type_drops_label': 'Total de Drops',
    'goals.type_drops_desc': 'Quantidade total de drops',
    // Common
    'common.sold': 'Vendido',
    'common.unsold': 'Não vendido',
    'common.unknown': 'Desconhecido',
    'common.today': 'Hoje',
    'common.yesterday': 'Ontem',
    'common.days_ago': '{{n}} dias atrás',
  } as const,
  en: {
    // Nav
    'nav.dashboard': 'Dashboard',
    'nav.drops': 'Drops',
    'nav.accounts': 'Accounts',
    'nav.analytics': 'Analytics',
    'nav.goals': 'Goals',
    'nav.settings': 'Settings',
    // Dashboard
    'dash.bruto': 'gross',
    'dash.invested': 'Invested',
    'dash.no_cost': 'No cost recorded',
    'dash.recent_drops': 'Recent Drops',
    'dash.goal_progress': 'Goal Progress',
    'dash.no_goals': 'No goals created',
    'dash.no_drops': 'No drops yet',
    'dash.week_drops': 'drops this week',
    'dash.best_week': 'Best week',
    // Accounts
    'accounts.title_add': 'New CS2 Account',
    'accounts.title_edit': 'Edit Account',
    'accounts.empty_title': 'No accounts yet',
    'accounts.empty_desc': 'Add your CS2 Prime accounts to start tracking your drops',
    'accounts.toast_added': 'Account added!',
    'accounts.toast_updated': 'Account updated!',
    'accounts.prime_cost': 'Prime Cost',
    // Drops
    'drops.register_title': 'Register Weekly Drops',
    'drops.empty_title': 'No drops yet',
    'drops.empty_filtered': 'No drops found',
    'drops.empty_filtered_desc': 'No drops match the active filters.',
    'drops.gross': 'Gross',
    'drops.placeholder_value': 'Gross value',
    'drops.received_value': 'Received value',
    'drops.no_valid_item': 'No valid item',
    // Analytics
    'analytics.empty_title': 'No data yet',
    'analytics.empty_desc': 'Register drops to see analytics.',
    'analytics.total_cashout': 'Total Cashout',
    'analytics.gross_value': 'Gross Value',
    'analytics.total_drops': 'Total Drops',
    'analytics.weekly_cashout': 'Weekly Cashout',
    'analytics.chart_gross': 'Gross',
    'analytics.chart_cashout': 'Cashout',
    // Goals
    'goals.empty_title': 'No goals created',
    'goals.empty_desc': 'Create cashout, revenue, or drop goals to track your progress.',
    'goals.name_label': 'Name *',
    'goals.name_placeholder': 'E.g.: Buy Bayonet Doppler',
    'goals.target_label_money': 'Target ({{currency}})',
    'goals.target_label_qty': 'Target (quantity)',
    'goals.type_profit_label': 'Total Cashout',
    'goals.type_profit_desc': 'Accumulated real cashout',
    'goals.type_revenue_label': 'Steam Revenue',
    'goals.type_revenue_desc': 'Accumulated Steam value',
    'goals.type_cashout_label': 'Weekly Cashout',
    'goals.type_cashout_desc': 'Cashout this week',
    'goals.type_drops_label': 'Total Drops',
    'goals.type_drops_desc': 'Total number of drops',
    // Common
    'common.sold': 'Sold',
    'common.unsold': 'Unsold',
    'common.unknown': 'Unknown',
    'common.today': 'Today',
    'common.yesterday': 'Yesterday',
    'common.days_ago': '{{n}} days ago',
  } as const,
} satisfies Record<Lang, Record<string, string>>

type PT = typeof translations.pt
type AllKeys = keyof PT

export function createT(lang: Lang) {
  return function t(key: AllKeys, vars?: Record<string, string | number>): string {
    const map = translations[lang] as Record<string, string>
    const ptMap = translations.pt as Record<string, string>
    let str = map[key] ?? ptMap[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{{${k}}}`, String(v))
      }
    }
    return str
  }
}
