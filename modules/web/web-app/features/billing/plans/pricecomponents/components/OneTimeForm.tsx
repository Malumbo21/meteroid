import { FormItem, SelectItem, Input } from '@ui/components'
import { useAtom } from 'jotai'

import { ControlledSelect } from '@/components/form'
import PriceInput from '@/components/form/PriceInput'
import {
  componentFeeAtom,
  FeeFormProps,
  EditPriceComponentCard,
} from '@/features/billing/plans/pricecomponents/EditPriceComponentCard'
import { useCurrency } from '@/features/billing/plans/pricecomponents/utils'
import { useZodForm } from '@/hooks/useZodForm'
import { OneTimeFeeSchema, OneTimeFee } from '@/lib/schemas/plans'

export const OneTimeForm = (props: FeeFormProps) => {
  const [component] = useAtom(componentFeeAtom)
  const currency = useCurrency()

  const methods = useZodForm({
    schema: OneTimeFeeSchema,
    defaultValues: component?.data as OneTimeFee,
  })

  console.log('errors', methods.getValues())

  return (
    <>
      <EditPriceComponentCard submit={methods.handleSubmit(props.onSubmit)} cancel={props.cancel}>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1 pr-5 border-r border-slate-500">
            <FormItem name="pricing.billingType" label="Billing type">
              <ControlledSelect
                {...methods.withControl('pricing.billingType')}
                className="lg:w-[180px] xl:w-[230px]"
              >
                <SelectItem value="ADVANCE">Paid upfront (advance)</SelectItem>
                <SelectItem value="ARREAR">Postpaid (arrear)</SelectItem>
              </ControlledSelect>
            </FormItem>
          </div>
          <div className="ml-4 col-span-2 space-y-4">
            <FormItem
              name="pricing.quantity"
              label="Quantity"
              {...methods.withError('pricing.quantity')}
            >
              <Input
                {...methods.register('pricing.quantity', {
                  valueAsNumber: true,
                })}
                type="number"
                step={1}
                className="max-w-xs"
              />
            </FormItem>
            <FormItem
              name="pricing.unitPrice"
              label="Price per unit"
              {...methods.withError('pricing.unitPrice')}
            >
              <PriceInput
                {...methods.withControl('pricing.unitPrice')}
                currency={currency}
                className="max-w-xs"
              />
            </FormItem>
          </div>
        </div>
      </EditPriceComponentCard>
    </>
  )
}