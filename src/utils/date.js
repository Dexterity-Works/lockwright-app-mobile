const toDate = (input) => {
  const date = new Date(input)
  if (isNaN(date.getTime())) throw new Error('Invalid date input')
  return date
}

const pad = (n) => String(n).padStart(2, '0')

/**
 * @param {string|number|Date} input
 * @param {string} format dash-separated tokens: yyyy, yy, mm, dd, hh, mi, ss
 * @param {string} separator
 */
export const formatDate = (input, format, separator) => {
  const d = toDate(input)
  const parts = {
    yyyy: d.getFullYear(),
    yy: String(d.getFullYear()).slice(-2),
    mm: pad(d.getMonth() + 1),
    dd: pad(d.getDate()),
    hh: pad(d.getHours()),
    mi: pad(d.getMinutes()),
    ss: pad(d.getSeconds())
  }
  return format
    .split('-')
    .map((token) => parts[token] ?? token)
    .join(separator)
}

export const isBefore = (a, b) => toDate(a).getTime() < toDate(b).getTime()

/** Same day of month when it exists, else the last day of the target month. */
export const subtractMonths = (amount, from = new Date()) => {
  const date = toDate(from)
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() - amount)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
  return date
}
