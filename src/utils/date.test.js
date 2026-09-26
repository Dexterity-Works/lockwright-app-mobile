import { formatDate, isBefore, subtractMonths } from './date'

describe('formatDate', () => {
  const date = new Date(2023, 0, 5, 9, 7, 3)

  it('renders every format the app uses', () => {
    expect(formatDate(date, 'dd-mm-yyyy', '/')).toBe('05/01/2023')
    expect(formatDate(date, 'yyyy-mm-dd', '.')).toBe('2023.01.05')
    expect(formatDate(date, 'hh-mi-ss', ':')).toBe('09:07:03')
    expect(formatDate(date, 'dd-mm-yy', '/')).toBe('05/01/23')
    expect(formatDate(date, 'hh-mi', ':')).toBe('09:07')
  })

  it('accepts timestamps and strings', () => {
    expect(formatDate(date.getTime(), 'dd-mm-yyyy', '/')).toBe('05/01/2023')
    expect(formatDate(date.toISOString(), 'yyyy-mm-dd', '.')).toBe('2023.01.05')
  })

  it('throws on an invalid date', () => {
    expect(() => formatDate('nope', 'dd-mm-yyyy', '/')).toThrow(
      'Invalid date input'
    )
  })
})

describe('subtractMonths', () => {
  it('clamps to the last day of the target month', () => {
    expect(subtractMonths(6, new Date(2024, 2, 31))).toEqual(
      new Date(2023, 8, 30)
    )
    expect(subtractMonths(1, new Date(2024, 2, 15))).toEqual(
      new Date(2024, 1, 15)
    )
  })
})

describe('isBefore', () => {
  it('compares any date-like inputs', () => {
    expect(isBefore('2023-01-01', new Date(2023, 5, 1))).toBe(true)
    expect(isBefore(new Date(2023, 5, 1).getTime(), '2023-01-01')).toBe(false)
  })
})
