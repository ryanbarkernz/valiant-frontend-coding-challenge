TODO: Quick scratch breakdown of your to-dos, how you broke up the different tasks and any QA / tests you did.

Build the fat marker while considering:

- Potential to be embeddable widget
- The inputs have specific type requirements
- Cents round up to nearest whole number
- Add a little spice to design with tailwind
- Add tests for bonus points

UX considerations:

- Input error / empty states and how that impacts the result display (animate in/out)
- Responsive behaviour - we aren't given specifics of how this would look. IE are we limited to a small square box that would warrant building it as a stepper form to ensure legibility / no scrolling. Will build the demo to simply stack.
- The fat marker looks like an inline form display and doesn't account for changing text length based on selection. We don't want text jumping, so used a fixed width with ellipses for demo but ideally go with something nicer.

Notes / Assumptions:

- No caching as data retrieved contains rates that are likely critical to keep up to date. Small dataset though future iterations could cache the other two endpoints.
- Few things could be componentised. EG would be nice to move fetch logic outside of the main App. Could use a composable or vue-query
- I've left the entire PrimeVue package/presets in - would tidy this up if it was going somewhere important
- I haven't included tests as I've run over time ;)

Side note: the doc explaining the PMT function has restricted access