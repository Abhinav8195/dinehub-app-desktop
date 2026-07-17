import { useState } from 'react'
import { Clock, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useShiftStore } from '@/store/shiftStore'
import { ApiError } from '@/api/types/common'

interface ShiftOpenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpened?: () => void
}

export function ShiftOpenDialog({ open, onOpenChange, onOpened }: ShiftOpenDialogProps) {
  const openShift = useShiftStore((s) => s.openShift)
  const [openingCash, setOpeningCash] = useState('500')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleOpen = async () => {
    const amount = Number(openingCash)
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Enter a valid opening cash amount')
      return
    }
    setLoading(true)
    try {
      await openShift(amount, notes || undefined)
      toast.success('Shift opened')
      onOpenChange(false)
      onOpened?.()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to open shift')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Open Shift
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Opening Cash in Drawer</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                min={0}
                step="0.01"
                className="pl-9"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Morning shift handover" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleOpen} disabled={loading}>Open Shift</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ShiftCloseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShiftCloseDialog({ open, onOpenChange }: ShiftCloseDialogProps) {
  const closeShift = useShiftStore((s) => s.closeShift)
  const currentShift = useShiftStore((s) => s.currentShift)
  const [closingCash, setClosingCash] = useState('')
  const [expectedCash, setExpectedCash] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleClose = async () => {
    const closing = Number(closingCash)
    const expected = expectedCash ? Number(expectedCash) : undefined
    if (!Number.isFinite(closing) || closing < 0) {
      toast.error('Enter valid closing cash')
      return
    }
    setLoading(true)
    try {
      await closeShift(closing, expected, notes || undefined)
      toast.success('Shift closed successfully')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to close shift')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close Shift</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {currentShift && (
            <div className="rounded-xl bg-muted p-3 text-sm">
              <p>Opened: {new Date(currentShift.openedAt).toLocaleString()}</p>
              <p>Opening cash: ₹{currentShift.openingCash.toFixed(2)}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Closing Cash Counted</Label>
            <Input type="number" min={0} step="0.01" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Expected Cash (optional)</Label>
            <Input type="number" min={0} step="0.01" value={expectedCash} onChange={(e) => setExpectedCash(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Close Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" variant="destructive" onClick={handleClose} disabled={loading}>Close Shift</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
