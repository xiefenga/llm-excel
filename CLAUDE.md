# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LLM Excel is a data processing system that uses Large Language Models to generate structured Excel data processing operations. The system translates natural language requirements into JSON-based operation descriptions that are then executed to produce Excel-reproducible results.

### Core Architecture

This is a **monorepo** using **pnpm workspaces** and **Turbo** for build orchestration, with two main applications:

1. **API (`apps/api`)**: Python FastAPI backend that handles Excel processing
2. **Web (`apps/web`)**: React Router v7 frontend for the UI

### Key Design Principles

1. **Two-Step LLM Flow**: Requirements are processed in two phases:
   - Step 1: LLM analyzes the user's natural language requirement and provides an analysis in Excel formula terms
   - Step 2: LLM converts the analysis into structured JSON operations (allows user feedback between steps)

2. **JSON-Based Expressions**: Formulas are represented as JSON objects (not strings) to avoid parsing ambiguity
3. **Excel Reproducibility**: All operations must be 100% reproducible using Excel formulas

## Commands

### Development

```bash
# Install all dependencies (root + all workspaces)
pnpm install

# Start API server only
pnpm dev:api

# Start all services in dev mode
pnpm dev

# Format code
pnpm format
```

### API-Specific Commands

```bash
cd apps/api

# Install Python dependencies
uv sync

# Start API server
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or use the pnpm script from root
pnpm dev:api

# Run CLI tool
uv run python cli.py
```

### Web-Specific Commands

```bash
cd apps/web

# Start dev server
pnpm dev

# Build for production
pnpm build

# Type checking
pnpm typecheck
```

## Project Structure

### API Application (`apps/api`)

The Python backend follows this architecture:

```
apps/api/
├── app/
│   ├── main.py              # FastAPI application entry
│   ├── api/
│   │   ├── routes.py        # API endpoints (SSE streaming for process flow)
│   │   └── deps.py          # Dependency injection (LLM client)
│   ├── core/
│   │   └── config.py        # Configuration and directory initialization
│   ├── schemas/
│   │   └── response.py      # Pydantic response models
│   ├── services/
│   │   └── excel.py         # Excel file handling (upload, parse, save)
│   └── lib/                 # Core processing logic
│       ├── parser.py        # JSON operation parser and validator
│       ├── executor.py      # Execution engine (evaluates JSON expressions)
│       ├── functions.py     # Excel function implementations
│       ├── excel_generator.py  # Generates Excel formulas from JSON
│       ├── llm_client.py    # OpenAI client (two-step flow)
│       └── prompt.py        # System prompts for both LLM steps
├── SPEC.md                  # Complete technical specification
├── README.md                # API usage guide
├── pyproject.toml           # Python dependencies (managed by uv)
└── cli.py                   # Command-line interface
```

**Key modules:**
- `routes.py`: Implements SSE (Server-Sent Events) streaming for real-time processing updates
- `llm_client.py`: Manages the two-step LLM flow (analyze → generate)
- `executor.py`: Evaluates JSON expression trees and executes operations
- `excel_generator.py`: Maps JSON operations to Excel formula strings

### Web Application (`apps/web`)

React Router v7 application with Tailwind CSS 4 and shadcn/ui components:

```
apps/web/
├── app/
│   ├── root.tsx             # Root layout
│   ├── routes/
│   │   └── _index.tsx       # Main page (file upload + chat interface)
│   ├── components/          # shadcn/ui components
│   └── lib/
│       └── api.ts           # API client (SSE event handling)
├── vite.config.ts           # Vite configuration
└── react-router.config.ts   # React Router configuration
```

**Key features:**
- SSE (Server-Sent Events) for real-time processing status
- Collapsible sections for analysis, operations, and formulas
- File upload with multi-file support

## Operation Types

The system supports three operation types (see `apps/api/SPEC.md` for complete details):

1. **`aggregate`**: Column-level aggregation (SUM, COUNT, AVERAGE, SUMIF, COUNTIF, etc.)
2. **`add_column`**: Row-level calculations to add new columns (IF, VLOOKUP, COUNTIFS, etc.)
3. **`compute`**: Scalar operations combining aggregate results

### JSON Expression Format

All formulas use JSON objects instead of strings:

```json
{
  "op": "+",
  "left": {"col": "price"},
  "right": {"value": 100}
}
```

Expression types:
- `{"value": ...}` - Literal value
- `{"col": "name"}` - Current row column reference
- `{"ref": "table.column"}` - Cross-table column reference
- `{"var": "name"}` - Variable reference (from prior aggregate)
- `{"func": "IF", "args": [...]}` - Function call
- `{"op": "+", "left": {...}, "right": {...}}` - Binary operation

## API Flow

### Standard Processing Flow

1. **Upload** (`POST /excel/upload`): Upload Excel files, get `file_id`
2. **Process** (`POST /excel/process`): SSE stream that executes:
   - Load files
   - LLM analysis (step 1)
   - LLM generate operations (step 2)
   - Execute operations
   - Return results with Excel formulas

### SSE Event Format

All SSE events follow this structure:

```json
{
  "action": "load|analysis|generate|execute",
  "status": "start|done|error",
  "data": { ... }
}
```

## Configuration

### Environment Variables

Create `apps/api/.env` from `.env.example`:

```bash
OPENAI_API_KEY=sk-...
OPENAI_API_BASE=https://api.openai.com/v1  # Optional: for compatible APIs
```

### Python Requirements

- Python 3.11+
- Uses `uv` for dependency management (modern pip/venv replacement)
- Key dependencies: FastAPI, OpenAI, pandas, openpyxl

### Node Requirements

- Node 22+ (managed by Volta in package.json)
- pnpm 10+ (workspace package manager)

## Important Implementation Notes

### When Working on the API

1. **Function Whitelist**: All Excel functions must be in the whitelist (`apps/api/lib/parser.py`). Never allow arbitrary function names.

2. **JSON Expression Trees**: The `executor.py` module evaluates nested JSON expressions recursively. When adding new functions:
   - Add to whitelist in `parser.py`
   - Implement in `functions.py`
   - Add formula template in `excel_generator.py`

3. **Table Context**: The system maintains a `TableCollection` object that stores all loaded Excel sheets. Each operation references tables by name.

4. **Column Mapping**: Excel column letters are mapped from DataFrame column names. The generator needs this mapping to create Excel formulas like `=A2*0.9`.

5. **Two-Step Prompts**: The prompts in `prompt.py` are critical:
   - Analysis prompt: Gets LLM to think in Excel formula terms
   - Generate prompt: Converts analysis to strict JSON (includes the analysis as context)

### When Working on the Web

1. **SSE Handling**: The API uses Server-Sent Events for streaming. The client in `lib/api.ts` parses the event stream and updates UI state.

2. **React Router v7**: This uses the new React Router framework (similar to Remix). Routes are file-based in `app/routes/`.

3. **Tailwind 4**: Uses the new Tailwind CSS 4 with Vite plugin (`@tailwindcss/vite`).

4. **State Management**: Processing state is tracked per-action (load, analysis, generate, execute) and displayed in real-time.

## Key Files to Understand

To understand the full system flow, read these files in order:

1. `apps/api/SPEC.md` - Complete technical specification with examples
2. `apps/api/app/api/routes.py` - SSE endpoint showing the full flow
3. `apps/api/app/lib/prompt.py` - System prompts for both LLM steps
4. `apps/api/app/lib/executor.py` - Expression evaluation engine
5. `apps/web/app/routes/_index.tsx` - Frontend implementation

## Technical Details

### Session Management

Files are stored with a generated `file_id` in `apps/api/uploads/{file_id}/`. This allows multiple users to work independently.

### Excel Formula Generation

The system generates **formula templates** with `{row}` placeholders for `add_column` operations:

```
Formula: =D{row}*0.9
Applied: =D2*0.9, =D3*0.9, =D4*0.9, ...
```

For `aggregate` operations, it generates single formulas:
```
=SUMIF(订单表!B:B, "已完成", 订单表!C:C)
```

### Error Handling

- Parser validates operation structure and function whitelist
- Executor catches evaluation errors and wraps them
- SSE stream sends error events to frontend
- LLM can return `{"error": "UNSUPPORTED", "reason": "..."}` if it cannot handle a request
