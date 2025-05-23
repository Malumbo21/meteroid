import { TrendProp } from '@/features/dashboard/cards/StatCard'
import { Trend, TrendScope } from '@/rpc/api/stats/v1/models_pb'

// trying to replace it with /utils/number/formatCurrency
// export const formatCurrency = (value: number | bigint | undefined, currency: string) => {
//   const not_cents = Number(value) / 100

//   return value !== undefined
//     ? new Intl.NumberFormat('en-UK', {
//         // TODO should we support other formats ? (ex: encode it in the currency json)
//         style: 'currency',
//         currency: currency,
//       }).format(not_cents)
//     : 'No data'
// }

export const formatRate = (value?: number) => {
  return value !== undefined ? `${value.toFixed(1)}%` : 'No data'
}

const trendScopeToString: Record<TrendScope, string> = {
  [TrendScope.TREND_24H]: 'Last 24 hours',
  [TrendScope.TREND_7D]: 'Last 7 days',
  [TrendScope.TREND_30D]: 'Last 30 days',
  [TrendScope.TREND_90D]: 'Last 90 days',
  [TrendScope.TREND_1Y]: 'Last 12 months',
  [TrendScope.TREND_2Y]: 'Last 2 years',
}

export const formattedTrend = (trend?: Trend): TrendProp | undefined => {
  if (!trend) return
  const { changePercent, scope, changeAmount, positiveIsGood } = trend

  return {
    percent: changePercent,
    period: trendScopeToString[scope],
    positiveIsGreen: positiveIsGood,
    value: Number(changeAmount) / 100,
  }
}
