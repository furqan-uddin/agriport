import { Box, IconButton, InputBase } from '@mui/material'
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'

interface Props {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  size?: 'small' | 'medium'
}

export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = Infinity,
  step = 1,
  unit,
  size = 'medium',
}: Props) {
  const h = size === 'small' ? 34 : 42
  const clamp = (v: number) => Math.min(max, Math.max(min, v))

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid var(--ink-200)',
        borderRadius: 2,
        height: h,
        overflow: 'hidden',
        backgroundColor: '#fff',
      }}
    >
      <IconButton
        size="small"
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
        sx={{ borderRadius: 0, height: h, width: h }}
      >
        <RemoveRoundedIcon fontSize="small" />
      </IconButton>
      <InputBase
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
          onChange(Number.isNaN(n) ? min : clamp(n))
        }}
        className="tnum"
        sx={{
          width: unit ? 86 : 52,
          '& input': { textAlign: 'center', fontWeight: 700, fontSize: size === 'small' ? 13 : 15 },
        }}
        endAdornment={
          unit ? (
            <Box component="span" sx={{ pr: 1, fontSize: 12, color: 'var(--ink-500)', fontWeight: 600 }}>
              {unit}
            </Box>
          ) : null
        }
      />
      <IconButton
        size="small"
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
        sx={{ borderRadius: 0, height: h, width: h }}
      >
        <AddRoundedIcon fontSize="small" />
      </IconButton>
    </Box>
  )
}
