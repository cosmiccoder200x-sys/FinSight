"""AI Finance Copilot.

Flow: user message → intent detection → tool calls gather real user data →
context package → OpenRouter chat completion. If no OpenRouter key is
configured, a transparent "local analysis" mode answers using the same real
data, so the feature always works.

The system prompt strictly instructs the model to:
- never invent financial data (only use the provided context)
- never claim guaranteed returns
- clearly identify assumptions
- explain calculations
- not pose as a licensed financial advisor
- encourage independent verification
"""

from __future__ import annotations

import datetime as dt
import json

import httpx

from app.core.config import settings
from app.services.analytics import allocation, enrich_holdings, portfolio_summary
from app.services.expenses_service import expense_summary
from app.services.health import financial_health
from app.services.market_data import MarketDataService
from app.services.simulator import simulate

SYSTEM_PROMPT = """You are FinSight Copilot, an AI assistant inside a personal finance and investment platform.

Your job is to help users understand their financial data using the "FINANCIAL CONTEXT" block provided below, which was gathered from their account by internal tools. You may also answer general financial-education questions.

MANDATORY RULES:
1. NEVER invent financial data, numbers, prices, or figures. Only use numbers that appear in the FINANCIAL CONTEXT block or that you clearly compute from it.
2. If you do not have the data needed to answer, say so and suggest what the user could add (e.g. "add your income in Settings").
3. NEVER claim or promise guaranteed returns. Always call projections "estimates" or "simulations" and state the assumptions.
4. Clearly label assumptions and explain your calculations in plain language.
5. Do not pretend to be a licensed or registered financial advisor. Provide educational information only.
6. Encourage users to verify important financial decisions independently and, when relevant, consult a qualified professional.
7. Be concise, structured, and readable. Use short sections and bullet points where helpful.

Remember: educational tool, not investment advice. No guaranteed outcomes. No invented data.
"""


def _fmt(value: float) -> str:
    return f"₹{value:,.2f}" if abs(value) < 1e12 else f"₹{value:,.0f}"


def _inr(value: float) -> str:
    return f"₹{value:,.0f}"


def _detect_intent(message: str) -> list[str]:
    text = message.lower()
    intents = []
    if any(k in text for k in ("portfolio", "holding", "stock", "pnl", "investment", "performance", "position")):
        intents.append("portfolio")
    if any(k in text for k in ("spend", "expense", "expens", "budget", "saving", "save", "cost")):
        intents.append("expenses")
    if any(k in text for k in ("health", "score", "risk", "financial situation", "finance")):
        intents.append("health")
    if any(k in text for k in ("simulate", "scenario", "what if", "if i invest", "monthly contribution", "future value", "compounding", "retirement", "grow")):
        intents.append("simulator")
    if any(k in text for k in ("market", "quote", "price of", "nifty", "sensex", "stock price")):
        intents.append("market")
    return list(dict.fromkeys(intents)) or ["general"]


def _build_tool_results(db, user_id: int, intents: list[str]) -> tuple[dict, list[str]]:
    market = MarketDataService(db)
    results: dict = {}
    sources: list[str] = []

    if "portfolio" in intents:
        from app.models import Holding

        holdings = db.query(Holding).filter(Holding.user_id == user_id).all()
        enriched = enrich_holdings(holdings, market)
        summary = portfolio_summary(enriched)
        alloc = allocation(enriched)
        results["portfolio"] = {
            "summary": summary,
            "top_holdings": [
                {"symbol": e["symbol"], "name": e["name"], "value": round(e["current_value"], 2),
                 "pnl": round(e["pnl"], 2), "return_pct": e["return_pct"]}
                for e in sorted(enriched, key=lambda x: -x["current_value"])[:5]
            ],
            "allocation": alloc["slices"],
            "data_basis": "simulated (demo)" if market.is_demo else "actual",
        }
        sources.append("get_portfolio_summary")

    if "expenses" in intents:
        results["expenses"] = expense_summary(db, user_id)
        sources.append("get_expense_summary")

    if "health" in intents:
        results["financial_health"] = financial_health(db, user_id)
        sources.append("get_financial_health")

    if "simulator" in intents:
        results["simulation"] = simulate(
            initial_investment=0, monthly_contribution=10000,
            annual_return_pct=10, inflation_pct=6, years=10, scenario_name="moderate",
        )
        sources.append("get_simulation")

    if "market" in intents:
        quote = market.get_quote("NIFTY 50")
        results["market"] = {"indices": market.indices(), "nifty_quote": quote}
        sources.append("get_market_data")

    return results, sources


def _local_reply(intents: list[str], results: dict) -> str:
    """Build an answer from tool data without an LLM. Numbers are real."""
    sections: list[str] = []
    if "portfolio" in intents:
        p = results.get("portfolio", {})
        s = p.get("summary", {})
        top = p.get("top_holdings", [])
        alloc = p.get("allocation", [])
        sections.append(
            "### Portfolio\n"
            f"- Current value: **{_inr(s.get('total_value', 0))}**\n"
            f"- Invested: **{_inr(s.get('total_invested', 0))}**\n"
            f"- P&L: **{_inr(s.get('total_pnl', 0))}** ({s.get('return_pct', 0)}%)\n"
        )
        if top:
            lines = "  " + "\n  ".join(
                f"{t['symbol']} — {t['name']}: {_inr(t['value'])} ({t['return_pct']}%)"
                for t in top
            )
            sections.append(f"Top holdings:\n{lines}")
        if alloc:
            lines = "  " + "\n  ".join(f"{a['name']}: {a['pct']}%" for a in alloc)
            sections.append(f"Allocation:\n{lines}")
    if "expenses" in intents:
        e = results.get("expenses", {})
        cats = e.get("category_breakdown", [])[:4]
        top_cat = cats[0]["label"] if cats else "n/a"
        sections.append(
            "### Expenses\n"
            f"- Spent this month: **{_inr(e.get('total_this_month', 0))}**\n"
            f"- Last month: **{_inr(e.get('total_last_month', 0))}**\n"
            f"- Largest category: **{top_cat}**\n"
        )
        if e.get("savings_rate") is not None:
            sections.append(f"- Savings rate: **{e['savings_rate']}%**")
    if "health" in intents:
        h = results.get("financial_health", {})
        comps = h.get("components", [])
        weakest = min(comps, key=lambda c: c["score"]) if comps else None
        sections.append(
            "### Financial health\n"
            f"- Overall score: **{h.get('overall_score', 0)}/100** (grade {h.get('grade', '-')})\n"
            + (f"- Focus area: **{weakest['label']}** ({weakest['score']}/100) — {weakest['explanation']}" if weakest else "")
        )
    if "simulator" in intents:
        sim = results.get("simulation", {})
        sections.append(
            "### Simulation example (₹10,000/month, 10% return, 10 years)\n"
            f"- Total contributed: **{_inr(sim.get('total_contributions', 0))}**\n"
            f"- Estimated final value: **{_inr(sim.get('estimated_final_value', 0))}**\n"
            f"- Inflation-adjusted: **{_inr(sim.get('inflation_adjusted_value', 0))}**\n"
            "\n> This is a simulation based on assumptions, not a prediction."
        )
    if "market" in intents:
        m = results.get("market", {})
        idx = m.get("indices", [])
        lines = "\n  ".join(
            f"{i.get('symbol')}: {_inr(i.get('price', 0))} ({i.get('change_pct', 0)}%)"
            for i in idx
        )
        sections.append(f"### Market snapshot (simulated demo data)\n  {lines}")
    if not sections:
        return (
            "I can help with questions about your **portfolio**, **expenses**, "
            "**financial health**, **simulations** and **market data**. "
            "Try asking: \"Why did my portfolio change?\", \"Where am I spending the most?\", "
            "or \"How much am I saving?\"\n\n"
            "*(Local analysis mode — connect an OpenRouter API key for richer AI answers.)*"
        )
    footer = (
        "\n\n_This answer was generated from your actual account data in local analysis mode. "
        "It is educational and not financial advice._"
    )
    return "\n\n".join(sections) + footer


class AICopilotService:
    """Coordinates intent detection, tool calls, and LLM generation."""

    def __init__(self, db) -> None:
        self.db = db

    def chat(self, user, message: str, conversation_id: int | None = None) -> dict:
        intents = _detect_intent(message)
        results, sources = _build_tool_results(self.db, user.id, intents)

        from app.models import AIMessage, AIConversation

        # Get or create conversation
        if conversation_id:
            conversation = self.db.query(AIConversation).filter_by(id=conversation_id, user_id=user.id).first()
        else:
            conversation = None
        if not conversation:
            conversation = AIConversation(
                user_id=user.id,
                title=(message[:60] + "…" if len(message) > 60 else message),
                model=settings.OPENROUTER_MODEL,
            )
            self.db.add(conversation)
            self.db.flush()

        self.db.add(AIMessage(conversation_id=conversation.id, role="user", content=message, sources=sources))
        self.db.commit()

        reply = ""
        mode = "local"
        model_name = "local"
        if settings.ai_configured:
            try:
                reply, model_name = self._call_openrouter(conversation.id, message, results)
                mode = "ai"
            except Exception as exc:  # graceful degradation
                reply = _local_reply(intents, results) + f"\n\n*(AI provider unavailable ({exc}); showing local analysis instead.)*"
                mode = "local"

        if not reply:
            reply = _local_reply(intents, results)
            mode = "local"

        self.db.add(AIMessage(conversation_id=conversation.id, role="assistant", content=reply, sources=sources))
        self.db.commit()
        self.db.refresh(conversation)

        return {
            "reply": reply,
            "conversation_id": conversation.id,
            "model": model_name,
            "mode": mode,
            "sources": sources,
        }

    def _call_openrouter(self, conversation_id: int, message: str, results: dict) -> tuple[str, str]:
        from app.models import AIMessage

        history = (
            self.db.query(AIMessage)
            .filter_by(conversation_id=conversation_id)
            .order_by(AIMessage.created_at.asc())
            .limit(20)
            .all()
        )

        context_json = json.dumps(results, indent=2, default=str)
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for m in history[:-1]:
            messages.append({"role": m.role, "content": m.content[:4000]})
        messages.append({"role": "user", "content": message})

        payload = {
            "model": settings.OPENROUTER_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT + "\n\n## FINANCIAL CONTEXT (gathered by tools)\n" + context_json},
                *messages[1:],
            ],
            "temperature": 0.4,
            "max_tokens": 900,
        }

        resp = httpx.post(
            f"{settings.OPENROUTER_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://finsight.app",
            },
            json=payload,
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        used_model = data.get("model", settings.OPENROUTER_MODEL)
        return content.strip(), used_model
