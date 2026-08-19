/** Short POS-style chime for new orders (no asset file required). */
export function playOrderBell() {
  playToneSequence([880, 1174.7, 1318.5], 0.12, 0.18)
}

/** More urgent doorbell-style ring for waiter / assistance calls. */
export function playWaiterBell() {
  // Two bursts so staff notice even during busy service
  playToneSequence([740, 988, 740, 988], 0.14, 0.22)
  window.setTimeout(() => playToneSequence([740, 988, 1174], 0.12, 0.2), 700)
}

function playToneSequence(tones: number[], stepSec: number, volume: number) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    tones.forEach((freq, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now)
      const start = now + index * stepSec
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + stepSec + 0.05)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + stepSec + 0.08)
    })
    window.setTimeout(() => void ctx.close(), Math.ceil((tones.length * stepSec + 0.5) * 1000))
  } catch {
    // Audio may be blocked until a user gesture; toast still notifies.
  }
}
