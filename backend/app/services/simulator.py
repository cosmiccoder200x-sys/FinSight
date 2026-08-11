"""Investment simulator (compound growth with monthly contributions).

Standard future-value math with monthly compounding and contributions at the
start of each month. Inflation is applied as a divisor over the horizon to
express today's purchasing power. Output is explicitly a simulation based on
assumptions, not a prediction.
"""

from __future__ import annotations


def simulate(
    initial_investment: float,
    monthly_contribution: float,
    annual_return_pct: float,
    inflation_pct: float,
    years: int,
    scenario_name: str = "custom",
) -> dict:
    r = annual_return_pct / 100.0 / 12.0
    inflation = inflation_pct / 100.0
    months = years * 12

    def value_at(months_elapsed: int) -> float:
        if r == 0:
            return initial_investment + monthly_contribution * months_elapsed
        growth = (1 + r) ** months_elapsed
        fv = initial_investment * growth + monthly_contribution * ((growth - 1) / r) * (1 + r)
        return fv

    final_value = value_at(months)
    total_contributions = initial_investment + monthly_contribution * months
    gains = final_value - total_contributions
    real_value = final_value / ((1 + inflation) ** years)

    chart = []
    contributed = initial_investment
    for y in range(1, years + 1):
        contributed = initial_investment + monthly_contribution * 12 * y
        value = value_at(y * 12)
        chart.append(
            {
                "year": y,
                "contributed": round(contributed, 2),
                "value": round(value, 2),
                "gains": round(value - contributed, 2),
                "real_value": round(value / ((1 + inflation) ** y), 2),
            }
        )

    return {
        "scenario_name": scenario_name,
        "total_contributions": round(total_contributions, 2),
        "estimated_final_value": round(final_value, 2),
        "estimated_gains": round(gains, 2),
        "inflation_adjusted_value": round(real_value, 2),
        "years": years,
        "annual_return_pct": annual_return_pct,
        "inflation_pct": inflation_pct,
        "chart": chart,
        "is_simulation": True,
    }


# Reference scenarios (historical average-style assumptions, clearly labelled).
SCENARIOS = {
    "conservative": {"annual_return_pct": 6.0, "inflation_pct": 5.0, "label": "Conservative"},
    "moderate": {"annual_return_pct": 10.0, "inflation_pct": 6.0, "label": "Moderate"},
    "aggressive": {"annual_return_pct": 14.0, "inflation_pct": 6.5, "label": "Aggressive"},
}
