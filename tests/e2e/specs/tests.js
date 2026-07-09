describe('Loan Repayment Calculator E2E specs', () => {
  beforeEach(() => {
    // Intercept the API calls and mock responses to ensure reliable runs
    cy.intercept('GET', '**/loan-purposes', [
      { label: 'Day-to-day capital', value: 'general', annualRate: 0.1 },
      { label: 'Vehicle or transport', value: 'vehicle', annualRate: 0.045 },
      { label: 'Financing a property', value: 'property', annualRate: 0.029 },
    ]).as('purposes')

    cy.intercept('GET', '**/requested-repayment-periods', [
      { label: 'Weekly', value: 52 },
      { label: 'Fortnightly', value: 26 },
      { label: 'Monthly', value: 12 },
    ]).as('periods')

    cy.intercept('GET', '**/requested-term-months', [
      { label: '6 months', value: 6 },
      { label: '12 months', value: 12 },
      { label: '2 years', value: 24 },
    ]).as('terms')
  })

  it('calculates monthly vehicle loan repayments correctly (Wide Desktop View)', () => {
    // Set desktop viewport width
    cy.viewport(1000, 600)
    cy.visit('http://localhost:5173/?embed=true')

    // Wait for mock data fetch to complete
    cy.wait(['@purposes', '@periods', '@terms'])

    // Input amount 30000
    cy.get('#amount-input').clear()
    cy.get('#amount-input').type('30000')

    // Change purpose to Vehicle or transport (0.045)
    cy.get('select').eq(0).select('Vehicle or transport')

    // Change frequency to Monthly (12)
    cy.get('select').eq(1).select('Monthly')

    // Change term to 2 years (24)
    cy.get('select').eq(2).select('2 years')

    // Calculation verification:
    // Rate: 4.5% annual (monthly rate = 0.045 / 12 = 0.00375)
    // Term: 2 years (24 months)
    // PMT = (30000 * 0.00375) / (1 - (1.00375)^-24) = 1309.18
    // NOTE: Brief mentioned to round up to nearest whole number for display, so $1,310
    // Math.ceil(Math.abs(PMT)) = 1310
    // Asserting the UI output text
    cy.contains('$1,310').should('be.visible')
    cy.contains('per month').should('be.visible')
  })

  it('calculates weekly property loan repayments correctly (Narrow Mobile View)', () => {
    // Set a narrow mobile viewport width to force layout to stack/reflow
    cy.viewport(375, 600)
    cy.visit('http://localhost:5173/?embed=true')

    // Wait for mock data fetch to complete
    cy.wait(['@purposes', '@periods', '@terms'])

    // Change amount to 15000
    cy.get('#amount-input').clear()
    cy.get('#amount-input').type('15000')

    // Select property loan purpose (0.029)
    cy.get('select').eq(0).select('Financing a property')

    // Select weekly period (52)
    cy.get('select').eq(1).select('Weekly')

    // Select 12 months term (12)
    cy.get('select').eq(2).select('12 months')

    // Calculation verification:
    // PMT(0.029 / 52, 12, 15000) = -1254.53
    // Weekly repayment = Math.ceil(Math.abs(-1254.53 * 12 / 52)) = 290
    // Asserting the UI output text
    cy.contains('$290').should('be.visible')
    cy.contains('per week').should('be.visible')
  })
})
