<div align="center">

# 🏀 NBA Game Simulator

**Draft two starting fives from the entire NBA player universe, simulate the matchup, and watch a self‑training model sharpen its predictions after every game.**

A dual‑stack project: a **Python + Flask web app** powered by live NBA data, and a standalone **TypeScript CLI** simulator with unit tests.

<br>

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-2.3-000000?logo=flask&logoColor=white)
![nba_api](https://img.shields.io/badge/Data-nba__api-E03A3E)
![TypeScript](https://img.shields.io/badge/TypeScript-4.x-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-22c55e)

</div>

---

## Table of Contents

- [What it does](#what-it-does)
- [How it works](#how-it-works)
  - [The big picture](#the-big-picture)
  - [Data layer — NBAService](#data-layer--nbaservice)
  - [The self‑training model](#the-self-training-model)
  - [Game simulation](#game-simulation)
- [The web UI](#the-web-ui)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
  - [Option A — Python web app (recommended)](#option-a--python-web-app-recommended)
  - [Option B — TypeScript CLI](#option-b--typescript-cli)
- [Configuration & data files](#configuration--data-files)
- [Design system](#design-system)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [License](#license)

---

## What it does

- **Browse the entire NBA player pool** — every player `nba_api` knows about, searchable by name and filterable by **team**, **position**, and **era** (decade).
- **Build two teams of five** with a live, color‑coded picker (HOME vs AWAY) that enforces the 5‑player cap and persists your picks even as you filter.
- **Simulate the game** — each player generates a stat line (PTS / AST / REB / STL / BLK) derived from their real career averages plus per‑game variance; team scores are the sum of points.
- **Predict before tip‑off** — a lightweight logistic model estimates Team A's win probability and an expected score for each side.
- **Learn after every game** — the model trains on the actual outcome via gradient descent and persists its updated weights to disk, so it improves the more you play.

---

## How it works

### The big picture

```
                    ┌──────────────────────────────────────────────┐
                    │                Flask app (app.py)             │
                    │   route ‘/’  (GET = filter,  POST = simulate) │
                    └───────────────┬───────────────┬──────────────┘
                                    │               │
                  filtering / stats │               │ predict + train
                                    ▼               ▼
              ┌───────────────────────────┐   ┌──────────────────────────┐
              │        NBAService         │   │     SimulationModel       │
              │  • static player list     │   │  • weights {rating, bias} │
              │  • live metadata (cached) │   │  • sigmoid prediction     │
              │  • career stats → rating  │   │  • gradient‑descent train │
              └────────────┬──────────────┘   └────────────┬─────────────┘
                           │                                │
                 nba_api   │                                │ persists to
              (stats.nba)  ▼                                ▼
              player_metadata.json   ◄ cache ►        model_state.json
```

The whole pipeline lives in [`nba_service.py`](nba_service.py); [`app.py`](app.py) is a thin Flask layer that wires HTTP requests to it and renders [`templates/index.html`](templates/index.html).

### Data layer — NBAService

`NBAService` is the bridge between the official NBA stats endpoints and the simulation.

| Responsibility | How |
|---|---|
| **Player roster** | Loads the full static player list and the active‑player map from `nba_api`. |
| **Filtering** | `get_filtered_players()` matches on a name substring, then narrows by team / position / era using per‑player metadata. Position matching is fuzzy (`PG` → "Point Guard", `G` → any "Guard", etc.). Era matching checks whether a player's `from_year…to_year` span overlaps a decade. |
| **Metadata** | `get_player_metadata()` pulls team, position, and active years from `CommonPlayerInfo`. Results are **cached on disk** in `player_metadata.json` so repeat lookups are instant and resilient to rate limits. |
| **Career stats** | `get_player_career_stats()` reads career regular‑season totals (`PlayerCareerStats`) and reduces them to per‑game averages (PPG / APG / RPG). |
| **Rating** | `_estimate_rating()` turns those averages into a single rating: `70 + 1.6·PPG + 1.4·APG + 1.2·RPG`. |

> **Graceful degradation:** every network call is wrapped in `try/except`. If the NBA API is unreachable or rate‑limited, the service falls back to cached metadata and randomized‑but‑plausible career stats so the app never hard‑fails.

### The self‑training model

`SimulationModel` is a deliberately tiny logistic regressor with two parameters — `rating_weight` and `bias` — persisted to `model_state.json`.

**Prediction.** Given the two lineups, it sums each side's player ratings and feeds the difference through a sigmoid:

```
strength_A = Σ rating(player)   for player in Team A
strength_B = Σ rating(player)   for player in Team B

diff       = (strength_A − strength_B) · rating_weight + bias
P(A wins)  = sigmoid(diff) = 1 / (1 + e^(−diff))

expected_score_A = 85 + strength_A · 0.18 + diff · 2
expected_score_B = 85 + strength_B · 0.18 − diff · 2
```

**Training.** After the simulated game decides a winner, the model takes one step of gradient descent (learning rate `0.004`) toward the truth:

```
error = actual − P(A wins)      actual = 1 if Team A won else 0

rating_weight += lr · error · (strength_A − strength_B) / 10
bias          += lr · error

# weights are clamped:  rating_weight ∈ [−1, 1],  bias ∈ [−2, 2]
```

Because the weights are saved to disk every game, the model **carries learning across sessions** — delete `model_state.json` to reset it to defaults (`rating_weight = 0.02`, `bias = 0.5`).

### Game simulation

`simulate_game()` ties it together:

1. Ask the model for a pre‑game **prediction**.
2. For each player, generate a stat line from their career averages × a random variance factor (`0.75–1.2`) plus small per‑category noise.
3. **Team score = sum of player points.** Higher total wins; exact ties are broken by the model's predicted favorite.
4. **Train** the model on the result and return everything (winner, score, prediction, updated weights, both box scores) to the UI.

---

## The web UI

The frontend is a **retro‑futurist / synthwave** interface (neon on deep space, CRT scanlines, perspective grid) built to match a competitive‑sports product, while respecting accessibility guardrails:

- Color‑coded **HOME (hot pink)** vs **AWAY (cyan)** teams throughout.
- Live **`0/5` selection counters** with a per‑team cap; the **Run** button stays disabled until both teams are full.
- Picks **persist across filtering** — selecting a player, then searching for another, never loses your earlier choice.
- A jumbotron **scoreboard**, a win‑probability **comparison bar**, and box‑score tables.
- `prefers-reduced-motion` disables all animation; visible focus rings, 44px touch targets, and 16px body text for readability.

Styles live in [`static/style.css`](static/style.css); markup and the small vanilla‑JS interactivity live in [`templates/index.html`](templates/index.html).

---

## Project structure

```
NBA-Game-Simulator/
├── app.py                     # Flask app: routes, request handling, rendering
├── nba_service.py             # NBAService + SimulationModel + simulate_game()
├── requirements.txt           # Python dependencies
├── player_metadata.json       # Disk cache of NBA player metadata (seeded)
├── model_state.json           # Persisted model weights (gitignored, regenerated)
│
├── templates/
│   └── index.html             # Web UI markup + selection logic
├── static/
│   └── style.css              # Synthwave design system
│
├── src/                       # Standalone TypeScript CLI simulator
│   ├── index.ts               # Interactive / argv-driven entry point
│   ├── gameSimulator.ts       # GameSimulator class
│   ├── player.ts              # Player model
│   ├── team.ts                # Team model
│   ├── data/players.ts        # Bundled player pool
│   └── model/
│       ├── trainer.ts         # Predict + train logic
│       └── statsModel.ts      # Statistical model
├── tests/                     # Jest unit tests for the TS simulator
│   ├── gameSimulator.test.ts
│   └── model.test.ts
│
├── package.json               # npm scripts (ts-node, build, jest)
└── tsconfig.json
```

> **Two engines, one idea.** The Python app is the full‑featured, data‑backed product. The TypeScript CLI is a self‑contained, dependency‑light reimplementation of the same simulate‑and‑train concept — handy for offline use, tests, and learning the core logic without the NBA API.

---

## Getting started

### Option A — Python web app (recommended)

**Prerequisites:** Python 3.10+ and `pip`.

```bash
# 1. Clone
git clone https://github.com/anshc2394-beep/NBA-Game-Simulator.git
cd NBA-Game-Simulator

# 2. Create & activate a virtual environment
python -m venv .venv
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run
python app.py
```

Then open **http://127.0.0.1:5000**.

> The first time you filter or simulate, the app may call the NBA API to fetch metadata and career stats; results are cached to `player_metadata.json`, so subsequent runs are much faster.

### Option B — TypeScript CLI

**Prerequisites:** Node.js 16+ and npm.

```bash
npm install

# Interactive: you'll be prompted for 5 player indexes per team
npm start

# Or pass selections directly (Team A indexes  Team B indexes)
npm start -- 0,1,2,3,4 5,6,7,8,9

# Build to dist/
npm run build
```

The CLI prints the available player pool with indexes, runs the simulation, and renders both box scores with `console.table`.

---

## Configuration & data files

| File | Purpose | Committed? |
|---|---|---|
| `player_metadata.json` | Cache of NBA player team/position/active‑years. Speeds up filtering and adds offline resilience. | ✅ Seeded in repo |
| `model_state.json` | The model's learned weights. Regenerated on first run; delete to reset learning. | ❌ Gitignored |
| `FLASK_SECRET_KEY` (env var) | Flask session/flash secret. Falls back to a dev default if unset. | — |

```bash
# Set a real secret in production
export FLASK_SECRET_KEY="your-long-random-string"     # PowerShell: $env:FLASK_SECRET_KEY="..."
```

---

## Design system

The UI follows a documented **Retro‑Futurism** design language:

| Token | Value |
|---|---|
| Display font | Russo One |
| Body font | Chakra Petch |
| Numerals | Share Tech Mono |
| Background | `#0f0f23` deep space + gradient sun + neon grid |
| Team A (HOME) | Hot pink `#ff006e` |
| Team B (AWAY) | Cyan `#00f0ff` |
| Accent | Neon purple `#7c3aed` |

Signature effects (CRT scanlines, neon glow, a single glitch animation on the hero) are all gated behind `prefers-reduced-motion`.

---

## Testing

The TypeScript simulator ships with Jest tests:

```bash
npm test
```

Tests cover game simulation (`tests/gameSimulator.test.ts`) and the model's predict/train behavior (`tests/model.test.ts`).

---

## Roadmap

- [ ] Persist game history and chart the model's accuracy improving over time.
- [ ] Possession‑level simulation instead of aggregate box scores.
- [ ] Richer ratings (usage, efficiency, advanced stats) beyond PPG/APG/RPG.
- [ ] Shareable matchup permalinks.
- [ ] A calmer "broadcast" theme toggle alongside the synthwave default.

---

## License

Released under the **MIT License**. NBA data is provided by the unofficial [`nba_api`](https://github.com/swar/nba_api); this project is not affiliated with or endorsed by the NBA.
