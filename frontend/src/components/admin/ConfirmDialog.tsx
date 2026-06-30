import { Dialog, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onClose: () => void
  loading?: boolean
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
  onClose,
  loading,
}: Props) {
  const isPending = loading ?? false
  return (
    <Dialog open={open} onClose={isPending ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogContent sx={{ pt: 3 }}>
        <Typography variant="h6" sx={{ fontSize: 18, mb: 1 }}>
          {title}
        </Typography>
        <Box sx={{ fontSize: 14, color: 'var(--ink-600)' }}>{message}</Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="outlined" disabled={isPending}>
          {cancelLabel}
        </Button>
        <Button
          onClick={() => {
            onConfirm()
            if (loading === undefined) {
              onClose()
            }
          }}
          variant="contained"
          color={destructive ? 'error' : 'primary'}
          disabled={isPending}
        >
          {isPending ? 'Processing...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
