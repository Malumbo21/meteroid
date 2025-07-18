import { Button, Card, Skeleton, cn } from '@md/ui'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { useCurrency } from '@/hooks/useCurrency'

export interface TrendProp {
  value: number
  percent: number
  period: string
  positiveIsGreen: boolean
}
export interface StatCardProp {
  title: string
  detailPath?: string
  value?: string | number
  secondaryValue?: string
  trend?: TrendProp
  loading?: boolean
}
export const StatCard: React.FC<StatCardProp> = ({
  title,
  detailPath,
  value,
  secondaryValue,
  trend,
  loading,
}) => {
  return (
    <Card className="h-[120px] grow flex flex-col">
      <div className="text-sm font-semibold flex flex-row px-6 py-4 items-baseline w-full justify-between flex-grow">
        <div>{title}</div>
        {detailPath && (
          <Link to={detailPath}>
            <Button variant="ghost">
              <span className="underline decoration-slate-700 decoration-dashed underline-offset-2">
                View
              </span>
            </Button>
          </Link>
        )}
      </div>
      <div className="px-6 pb-4">
        {loading ? (
          <div className="w-full flex items-end gap-4 pb-1">
            <Skeleton width="100%" height="1.5rem" />
            <Skeleton width="50%" height="1rem" />
          </div>
        ) : (
          <>
            <div className="flex flex-row gap-4 items-baseline">
              {value && <div className="text-2xl font-medium">{value}</div>}

              {secondaryValue && (
                <div className="text-xs text-muted-foreground self-baseline">{secondaryValue}</div>
              )}
            </div>
            {trend && <StatCardTrend {...trend} />}
          </>
        )}
      </div>
    </Card>
  )
}

export const StatCardTrend = ({ value, percent, period, positiveIsGreen }: TrendProp) => {
  const { formatAmount } = useCurrency()

  const formattedTrend = useMemo(() => {
    const formattedValue = formatAmount(Math.abs(value))

    const sign = value >= 0 ? '+' : '-'

    return `${sign} ${formattedValue} (${sign}${percent.toFixed(1)}%) ${period}`
  }, [value, percent, period, formatAmount])

  return (
    <div
      className={cn(
        'text-xs',
        value === 0
          ? 'text-muted-foreground'
          : positiveIsGreen === value > 0
            ? 'text-success'
            : 'text-red-500'
      )}
    >
      {formattedTrend}
    </div>
  )
}
