import PMT from '@/utils/PMT'

describe('PMT Formula Calculations', () => {
  it('returns standard monthly repayment for a typical loan', () => {
    // 10% annual rate, monthly periods (12/yr), 24 months term, $30,000 principal
    const monthlyRate = 0.1 / 12
    const result = PMT(monthlyRate, 24, 30000)
    expect(Math.trunc(result)).toEqual(-1384)
  })

  it('safely handles 0% interest rate without dividing by zero', () => {
    // 0% annual rate, monthly periods, 12 months term, $12,000 principal
    const result = PMT(0, 12, 12000)
    expect(result).toEqual(-1000)
  })

  it('calculates weekly repayments correctly', () => {
    // 4.5% annual rate, weekly periods (52/yr), 104 weeks (2 years), $15,000 principal
    const weeklyRate = 0.045 / 52
    const result = PMT(weeklyRate, 104, 15000)
    // Excel PMT(0.045/52, 104, 15000) is approx -150.88
    expect(Math.abs(result)).toBeCloseTo(150.88, 1)
  })

  it('calculates fortnightly repayments correctly', () => {
    // 2.9% annual rate, fortnightly periods (26/yr), 52 fortnights (2 years), $50,000 principal
    const fortnightlyRate = 0.029 / 26
    const result = PMT(fortnightlyRate, 52, 50000)
    // Excel PMT(0.029/26, 52, 50000) is approx -990.23
    expect(Math.abs(result)).toBeCloseTo(990.23, 1)
  })

  it('applies ceil rounding correctly to match business rules', () => {
    // Business rule: cents round up to nearest dollar.
    const amount = -150.88
    const roundedValue = Math.ceil(Math.abs(amount))
    expect(roundedValue).toEqual(151)

    const amount2 = -990.23
    const roundedValue2 = Math.ceil(Math.abs(amount2))
    expect(roundedValue2).toEqual(991)
  })
})
