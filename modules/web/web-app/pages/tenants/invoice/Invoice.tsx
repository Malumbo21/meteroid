import { createConnectQueryKey, useMutation } from '@connectrpc/connect-query'
import { spaces } from '@md/foundation'
import {
  Badge,
  Button,
  Card,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Skeleton,
} from '@md/ui'
import { useQueryClient } from '@tanstack/react-query'
import { Flex } from '@ui/components/legacy'
import { ChevronDown, Download, DownloadIcon, RefreshCcw } from 'lucide-react'
import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { AddressLinesCompact } from '@/features/customers/cards/address/AddressCard'
import { useBasePath } from '@/hooks/useBasePath'
import { useQuery } from '@/lib/connectrpc'
import { env } from '@/lib/env'
import { PreviewInvoiceDialog } from '@/pages/tenants/invoice/InvoicePreview'
import {
  getInvoice,
  refreshInvoiceData,
  requestPdfGeneration,
} from '@/rpc/api/invoices/v1/invoices-InvoicesService_connectquery'
import {
  DetailedInvoice,
  InvoiceStatus,
  InvoiceType,
  LineItem,
} from '@/rpc/api/invoices/v1/models_pb'
import { parseAndFormatDate, parseAndFormatDateOptional } from '@/utils/date'
import { formatCurrency, formatCurrencyNoRounding, formatUsage } from '@/utils/numbers'
import { useTypedParams } from '@/utils/params'

export const Invoice = () => {
  const { invoiceId } = useTypedParams<{ invoiceId: string }>()
  const invoiceQuery = useQuery(
    getInvoice,
    {
      id: invoiceId ?? '',
    },
    { enabled: Boolean(invoiceId) }
  )

  const data = invoiceQuery.data?.invoice
  const isLoading = invoiceQuery.isLoading

  const [openPreview, setOpenPreview] = useState(false)

  return (
    <Fragment>
      <Flex direction="column" gap={spaces.space6} fullHeight>
        {isLoading || !data ? (
          <>
            <Skeleton height={16} width={50} />
            <Skeleton height={44} />
          </>
        ) : (
          <>
            <InvoiceView invoice={data} previewHtml={setOpenPreview} />
            {invoiceId && openPreview && (
              <PreviewInvoiceDialog
                invoiceId={invoiceId}
                open={openPreview}
                setOpen={setOpenPreview}
              />
            )}
          </>
        )}
      </Flex>
    </Fragment>
  )
}

interface Props {
  invoice: DetailedInvoice
}

export const InvoiceMeta = ({ invoice }: Props) => {
  const basePath = useBasePath()
  return (
    <div className="text-sm">
      <Card className="p-6 ">
        <div className="grid grid-cols-6 grid-flow-row lg:grid-flow-col gap-y-2 pb-2">
          <div className="flex flex-col col-span-2 lg:col-span-2">
            <span className="text-muted-foreground">Due date</span>
            <span className="text-gray-90">{parseAndFormatDateOptional(invoice.dueAt)}</span>
          </div>
          <div className="flex flex-col col-span-2 lg:col-span-2">
            <span className="text-muted-foreground">Invoice date</span>
            <span className="text-gray-90">{parseAndFormatDate(invoice.invoiceDate)}</span>
          </div>
          <div className="col-span-4 lg:col-span-2 row-span-2 gap-y-2">
            <div className="flex flex-col">
              <span className="text-muted-foreground">From</span>
              <span className="break-words">
                <a>ACME Corp</a>
                {/*  TODO account / invoicing entity */}
              </span>
            </div>
          </div>
          <div className="col-span-4 lg:col-span-2 row-span-2 gap-y-2">
            <div className="flex flex-col">
              <span className="text-muted-foreground">Bill to</span>
              <span className="break-words">
                <Link
                  to={`${basePath}/customers/${invoice.customerId}`}
                  className="flex items-center text-brand hover:underline"
                >
                  <a>{invoice.customerDetails?.name}</a>
                </Link>
              </span>
              {invoice.customerDetails?.billingAddress && (
                <AddressLinesCompact address={invoice.customerDetails?.billingAddress} />
              )}
            </div>
          </div>
        </div>

        {invoice.memo ? (
          <div className="flex flex-col col-span-1 lg:col-span-1">
            <span className="text-muted-foreground">Memo</span>
            <span className="text-gray-90 whitespace-pre-line">{invoice.memo}</span>
          </div>
        ) : null}
      </Card>
    </div>
  )
}

const LeftOverview: React.FC<{
  className?: string
  invoice: DetailedInvoice
}> = ({ invoice }) => {
  const updateInvoicingEntityMut = useMutation(requestPdfGeneration, {
    onSuccess: async () => {
      toast.success(
        'Generation requested. It should be processed shortly, depending on the queue length.'
      )
    },
  })

  const canRequestNewDocument =
    import.meta.env.DEV && // allow on prod/stg ?
    (invoice.status === InvoiceStatus.FINALIZED || invoice.status === InvoiceStatus.VOID) &&
    !invoice.pdfDocumentId

  const requestNewGeneration = () => {
    updateInvoicingEntityMut.mutateAsync({ id: invoice.id })
  }

  const pdf_url =
    invoice.documentSharingKey &&
    `${env.meteroidRestApiUri}/files/v1/invoice/pdf/${invoice.localId}?token=${invoice.documentSharingKey}`

  return (
    <div className=" h-full">
      <div className="flex flex-col items-start gap-y-2 pb-4 border-b">
        <InvoiceStatusBadge status={invoice.status} />
        <div className="flex items-center text-center justify-center gap-2">
          <span className="text-lg font-semibold">INVOICE {invoice.invoiceNumber ?? ''}</span>
        </div>

        <div className="text-sm font-medium">Total</div>
        <span className="text-3xl">{formatCurrency(invoice.total, invoice.currency)}</span>
      </div>
      <div className="gap-y-4 pt-2">
        <div className="flex content-between w-full text-sm text-muted-foreground justify-center">
          <div className="flex-1 self-center">PDF file</div>
          <div>
            {canRequestNewDocument ? (
              <Button size="md" variant="ghost" onClick={requestNewGeneration}>
                Request
              </Button>
            ) : (
              <a
                href={pdf_url}
                download={`invoice_${invoice.invoiceNumber}.pdf`}
                target="_blank"
                rel="noreferrer"
              >
                <Button size="md" hasIcon disabled={!invoice.pdfDocumentId} variant="ghost">
                  Download <DownloadIcon size="12" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="gap-y-4">
        <div className="py-6 space-y-6">
          <div>Timeline</div>

          {invoice.finalizedAt && (
            <div className="text-muted-foreground text-sm">
              {parseAndFormatDate(invoice.finalizedAt)} - Invoice finalized
            </div>
          )}

          <div className="text-muted-foreground text-sm">
            {parseAndFormatDate(invoice.createdAt)} - Invoice created
          </div>
        </div>
      </div>
    </div>
  )
}

export const InvoiceView: React.FC<Props & { previewHtml: (open: boolean) => void }> = ({
  invoice,
  previewHtml,
}) => {
  const queryClient = useQueryClient()

  const refresh = useMutation(refreshInvoiceData, {
    onSuccess: async res => {
      await queryClient.setQueryData(
        createConnectQueryKey(getInvoice, { id: invoice?.id ?? '' }),
        res
      )
    },
  })

  const doRefresh = () => refresh.mutateAsync({ id: invoice?.id ?? '' })
  const canRefresh = invoice && invoice.status === InvoiceStatus.DRAFT
  const pdf_url =
    invoice.documentSharingKey &&
    `${env.meteroidRestApiUri}/files/v1/invoice/pdf/${invoice.localId}?token=${invoice.documentSharingKey}`

  useEffect(() => {
    if (canRefresh) {
      doRefresh()
    }
  }, [])

  return (
    <div className="grid grid-cols-3 h-full bg-gray-10">
      <div className="col-span-1 h-full">
        <LeftOverview invoice={invoice} />
      </div>
      <div className="col-span-2 px-6 overflow-y-auto">
        <div className="w-full flex justify-end px-6 pb-4 gap-2">
          <Button
            size="sm"
            variant="ghost"
            hasIcon
            onClick={doRefresh}
            disabled={!canRefresh || refresh.isPending}
          >
            Refresh <RefreshCcw size="16" className={cn(refresh.isPending && 'animate-spin')} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            hasIcon
            onClick={() => previewHtml(true)}
            disabled={refresh.isPending}
          >
            Preview
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="primary" className="gap-2  " size="sm" hasIcon>
                Actions <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* {secondaryActions.map((option, optionIndex) => (
                <DropdownMenuItem key={optionIndex} onClick={option.onClick}>
                  {option.label}
                </DropdownMenuItem>
              ))} */}
            </DropdownMenuContent>
          </DropdownMenu>

          <a
            href={invoice.pdfDocumentId ? pdf_url : '#'}
            download={`invoice_${invoice.invoiceNumber}.pdf`}
            target="_blank"
            rel="noreferrer"
          >
            <Button size="sm" disabled={!invoice.pdfDocumentId} variant="primary">
              <Download size="16" />
            </Button>
          </a>
        </div>
        <InvoiceMeta invoice={invoice} />
        {invoice.invoiceType === InvoiceType.RECURRING ? (
          <div className="flex flex-col mt-6">
            <div>
              <a className="cursor-pointer text-base text-accent-1">{invoice.planName}</a>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col mt-4 mb-8">
          <InvoiceLineItems items={invoice.lineItems} invoice={invoice} />
          <InvoiceSummaryLines invoice={invoice} />
        </div>
      </div>
    </div>
  )
}

export const InvoiceStatusBadge = ({ status }: { status: InvoiceStatus }) => {
  const getBadge = () => {
    switch (status) {
      case InvoiceStatus.DRAFT:
        return <Badge variant="primary">Draft</Badge>
      case InvoiceStatus.UNCOLLECTIBLE:
        return <Badge variant="warning">Uncollectible</Badge>
      case InvoiceStatus.FINALIZED:
        return <Badge variant="success">Finalized</Badge>
      case InvoiceStatus.VOID:
        return <Badge variant="outline">Void</Badge>
      default:
        return null
    }
  }

  return getBadge()
}

export const InvoiceSummaryLines: React.FC<{ invoice: DetailedInvoice }> = ({ invoice }) => {
  return (
    <div className="grid grid-cols-4 lg:grid-cols-6 gap-y-4 items-baseline">
      <div className="col-span-2 lg:col-span-4 grid flex-1 justify-end">
        <span className="text-sm text-accent-foreground">Subtotal</span>
      </div>
      <div className="col-span-2 grid flex-1 justify-end mr-4 text-sm">
        {formatCurrency(invoice.subtotal, invoice.currency)}
      </div>
      {invoice.couponLineItems.map(c => (
        <>
          <div className="col-span-2 lg:col-span-4 grid flex-1 justify-end">
            <span className="text-sm text-accent-foreground">{c.name}</span>
          </div>
          <div className="col-span-2 grid flex-1 justify-end mr-4 text-sm text-success">
            -{formatCurrency(c.total, invoice.currency)}
          </div>
        </>
      ))}
      <div className="col-span-2 lg:col-span-4 grid flex-1 justify-end">
        <span className="text-sm text-accent-foreground">Tax</span>
      </div>
      <div className="col-span-2 grid flex-1 justify-end mr-4 text-sm">-</div>

      <div className="col-span-2 lg:col-span-4 grid flex-1 justify-end">
        <span className="text-xl text-accent-foreground">Total</span>
      </div>
      <div className="col-span-2 grid flex-1 justify-end mr-4">
        <span className="text-xl">{formatCurrency(invoice.total, invoice.currency)}</span>
      </div>
    </div>
  )
}

export const InvoiceLineItems: React.FC<{ items: LineItem[]; invoice: DetailedInvoice }> = ({
  items,
  invoice,
}) => {
  return (
    <div className={cn('flex flex-col gap-y-2 mb-6 ')}>
      {items
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(item => {
          return <InvoiceLineItemCard key={item.id} line_item={item} invoice={invoice} />
        })}
    </div>
  )
}

const InvoiceLineItemCard: React.FC<{
  line_item: LineItem
  invoice: DetailedInvoice
}> = ({ line_item, invoice }) => {
  const [isMinimized, setIsMinimized] = useState(true)

  const headingText = <div className="text-accent-1">{line_item.name}</div>

  const heading = (
    <div
      className="text-sm w-full flex text-center gap-2 items-center cursor-pointer relative pointer-events-none lg:pointer-events-auto "
      onClick={() => setIsMinimized(!isMinimized)}
    >
      <span className="font-semibold">{headingText}</span>

      <span className="text-sm text-muted-foreground">
        {line_item.startDate &&
          line_item.endDate &&
          `${parseAndFormatDate(line_item.startDate)} to ${parseAndFormatDate(line_item.endDate)}`}
      </span>
    </div>
  )

  return (
    <Card className="  rounded-lg pl-4 py-4 pr-4 mb-2 text-sm gap-y-2 ">
      <div className="grid grid-cols-3 gap-y-4">
        <div className="col-span-1">{heading}</div>
        <div className="col-span-2">
          <QuantityTimeRate line_item={line_item} invoice={invoice} />
        </div>
        <div className="grid grid-cols-3 col-span-3 gap-y-4">
          <SublinesRate line_item={line_item} invoice={invoice} />
        </div>
        <div className="grid grid-cols-3 col-span-3 ">
          <div>
            <div>Subtotal</div>
          </div>
          <div className="col-start-3 ml-auto font-semibold">
            {formatCurrency(line_item.total, invoice.currency)}
          </div>
        </div>
      </div>
    </Card>
  )
}

export const QuantityTimeRate: React.FC<{
  line_item: LineItem
  invoice: DetailedInvoice
}> = ({ line_item, invoice }) => {
  return (
    line_item.quantity &&
    line_item.unitPrice && (
      <div className="lg:grid lg:grid-cols-3 lg:col-span-3 lg:col-start-O text-sm">
        <div className="hidden lg:grid lg:col-span-1 lg:col-start-2">
          <div className="flex items-center justify-end text-muted-foreground">
            <div>
              <>
                {formatUsage(parseFloat(line_item.quantity))} x{' '}
                {formatCurrencyNoRounding(line_item.unitPrice, invoice.currency)}
              </>
            </div>
          </div>
        </div>
        <div className="grid flex-1 justify-end items-center col-span-1 lg:col-start-3">
          <div>
            <>{formatCurrency(line_item.total, invoice.currency)}</>
          </div>
        </div>
      </div>
    )
  )
}

export const SublinesRate: React.FC<{
  line_item: LineItem
  invoice: DetailedInvoice
}> = ({ line_item, invoice }) => {
  return line_item.subLineItems.map(subLineItem => {
    return (
      <div
        className="lg:grid lg:grid-cols-3 lg:col-span-3 lg:col-start-O text-sm"
        key={subLineItem.id}
      >
        <div className="hidden lg:grid lg:col-span-1 ">
          {subLineItem.name}
          {parseFloat(subLineItem.unitPrice) == 0 && ' (Free)'}
        </div>
        <div className="hidden lg:grid lg:col-span-1 lg:col-start-2">
          <div className="flex items-center justify-end text-muted-foreground">
            <div>
              <>
                {formatUsage(parseFloat(subLineItem.quantity))} x{' '}
                {formatCurrencyNoRounding(subLineItem.unitPrice, invoice.currency)}
              </>
            </div>
          </div>
        </div>
        <div className="grid flex-1 justify-end items-center col-span-1 lg:col-start-3">
          <div>
            <>{formatCurrency(subLineItem.total, invoice.currency)}</>
          </div>
        </div>
      </div>
    )
  })
}
