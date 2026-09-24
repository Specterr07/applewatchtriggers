# How I build features

Three steps. One file per feature. One rule.

```
  1. THINK  ──►  2. DRAW  ──►  🔒 LOCK  ──►  3. BUILD
```

| Step | What I do | Done when… |
|------|-----------|------------|
| **1. Think** | Write down the problem, what I'm *not* building, the options I looked at (and their downsides), and my open questions. | No open questions left. |
| **2. Draw** | Draw a **flowchart** (what happens, step by step) and an **architecture diagram** (which parts exist and who talks to whom). Write down each decision and *why*. | I could hand it to someone and they could build it without asking me anything. Then I write **🔒 Locked** at the top. |
| **3. Build** | Tick off a short task list. At the end, write what actually got built and what I learned. | It works on Fly. |

## The one rule

**No code until the file says 🔒 Locked.**
If I discover during building that the plan was wrong, I go back to
step 2, fix the drawing, and add a line to *Decisions* saying what
changed and why. I don't just silently change the code.

## Starting a feature

Copy `features/_template.md` to `features/<feature-name>.md` and fill
in step 1.

(The older `docs/plans/PLAN_*.md` files in the repo root are features from before
this process — same idea, less structure.)
