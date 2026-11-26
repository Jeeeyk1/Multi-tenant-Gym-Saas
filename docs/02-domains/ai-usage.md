# AI Usage & Allowances

AI is FitOps's cost, paid out of each gym's subscription, so every AI call is costed and capped.

## Two pools per gym, by plan
Each billing plan (`plans`) carries two monthly caps per gym, in US micro-dollars (migration 0053), editable per
plan:

| Plan (tier) | Staff AI assistant | Members' AI (workouts, meals) |
|---|---|---|
| Starter (`BASIC`) | $1.50 | $2.00 |
| Standard (`STANDARD`, legacy `GROWTH`) | $2.50 | $3.50 |
| Pro (`PRO`, legacy `ENTERPRISE`) | $5.00 | $7.00 |

- The month is the **calendar month in the gym's timezone**, the same as members' own limits. It stays monthly on
  yearly billing.
- No `ACTIVE`/`TRIALING` subscription means no AI, so checks fail closed. A `PAST_DUE` gym is in its grace period for
  the rest of the app, but has no AI until it pays.
- Members also keep their own per-feature monthly limits (`modules/ai/domain/member-ai-limits.ts`).

## Cost of each call
- `ai_usage_log` records `model`, `input_tokens`, `output_tokens` and `cost_usd_micros` for every call.
- Prices are in `apps/api/src/common/adapters/ai/ai-pricing.ts`. Check them against the provider price lists when
  models change. An unknown model is charged at the highest known price.
- Staff assistant questions are recorded even when a step fails, since the model calls that ran still cost money.
- If saving a usage row fails, the answer is still returned and the full usage is logged at `error`
  (`assistant usage not recorded …` / `member AI usage not recorded …`), so the row can be rebuilt.
- Every call is logged (`assistant usage …` / `member AI usage …`) with gym, model, tokens and cost.
- An unknown model logs `no price for model …` at `warn`.

## Staff AI assistant
- **Who:** Owner and Staff (`insights.query`). Revenue questions (renewal amounts, revenue trends) need
  `reports.view`, which is Owner only, and are refused inside the tool whatever the model asks. Counting renewals
  is fine for Staff.
- **Daily limit per person** (gym timezone): Owner 40, Staff 15. On top of that there's the 15-per-minute burst
  limit.
- **Per question:** the last 6 turns of history, at most 4 model steps, 800 output tokens per step.
- **Errors (all 429 except the first):**
  - `FEATURE_NOT_AVAILABLE` (403): the plan doesn't include the assistant.
  - `AI_ALLOWANCE_EXCEEDED`: the gym's monthly assistant pool is used up; the message gives the reset date.
  - `AI_DAILY_LIMIT_REACHED`: this person's questions for today are used up.
  - `RATE_LIMITED`: the burst limit.

## Members' AI
- Checked in `MemberAiLimitsService.run()`: first the gym pool (`GYM_AI_ALLOWANCE_EXCEEDED`), then the member's own
  limit (`MEMBER_AI_LIMIT_REACHED`).
- The gym pool isn't locked, so at worst one call already in flight goes slightly over.

## Not covered yet
- **Landing-page chat** (public, `modules/public`) is limited per IP only (10/min, 100/day), with no cost logging or
  global cap. Planned for 4E hardening.

## Code
`modules/ai-usage` (`AiAllowanceService`, `AiUsageRepository`) is shared by `modules/ai-insights` (assistant) and
`modules/ai` (members). Usage for the meter: `GET /gyms/:gymId/insights/usage`.
