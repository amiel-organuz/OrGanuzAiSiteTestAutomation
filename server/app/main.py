import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import Gauge
from pydantic import BaseModel, Field


class ServiceStatus(BaseModel):
    status: str = Field(examples=["ok"])


class RootInfo(BaseModel):
    message: str
    docs_url: str
    openapi_url: str


class PlaywrightProject(BaseModel):
    name: str
    test_match: str
    command: str
    purpose: str


class AgentCommand(BaseModel):
    name: str
    command: str
    runner: str
    description: str


class AutomationOverview(BaseModel):
    projects: list[PlaywrightProject]
    agent_commands: list[AgentCommand]
    reports: list[str]


PLAYWRIGHT_PROJECTS = [
    PlaywrightProject(
        name="chromium",
        test_match="tests/ui/**/*.spec.ts",
        command="npx playwright test --project=chromium",
        purpose="Runs UI tests against the OrGanuz marketing site.",
    ),
    PlaywrightProject(
        name="product",
        test_match="tests/product/**/*.spec.ts",
        command="npx playwright test --project=product",
        purpose="Runs the product E2E matrix for personas, calculator, quotations, and access control.",
    ),
    PlaywrightProject(
        name="api",
        test_match="tests/api/**/*.spec.ts",
        command="npx playwright test --project=api",
        purpose="Runs API tests against JSONPlaceholder or the local mock.",
    ),
    PlaywrightProject(
        name="agent",
        test_match="tests/agent/**/*.spec.ts",
        command="npx playwright test --project=agent",
        purpose="Runs QA agent orchestrator regression tests.",
    ),
]

AGENT_COMMANDS = [
    AgentCommand(
        name="offline-demo",
        command="npm run agent:demo",
        runner="StubPlaywrightRunner",
        description=(
            "Runs the QA agent loop with in-memory Azure DevOps, Sheets, "
            "OneDrive, and Playwright stubs."
        ),
    ),
    AgentCommand(
        name="current-tests",
        command="npm run agent:current-tests",
        runner="CliPlaywrightRunner",
        description=(
            "Maps PW-API, PW-CHROMIUM, PW-PRODUCT, and PW-AGENT cases to the real "
            "Playwright CLI projects."
        ),
    ),
]

TEST_RESULTS_PATH = Path(os.getenv("QA_PLAYWRIGHT_RESULTS_PATH", "test-results/results.json"))
QA_TESTS_TOTAL = Gauge(
    "qa_playwright_tests_total",
    "Latest Playwright test count by project and normalized status.",
    ["project", "status"],
)
QA_DURATION_SECONDS = Gauge(
    "qa_playwright_duration_seconds",
    "Latest Playwright total execution duration by project.",
    ["project"],
)
QA_LAST_RUN_TIMESTAMP = Gauge(
    "qa_playwright_last_run_timestamp_seconds",
    "Unix timestamp for the latest Playwright JSON report start time.",
)
QA_REPORT_PRESENT = Gauge(
    "qa_playwright_report_present",
    "Whether the latest Playwright JSON report was found and parsed.",
)

app = FastAPI(
    title="OrGanuz Test Automation API",
    summary="Local documentation, health, metrics, and automation metadata for the OrGanuz test stack.",
    description=(
        "Swagger/OpenAPI surface for the local OrGanuz automation support service. "
        "The service exposes health and metrics endpoints plus read-only metadata "
        "for the Playwright projects and QA agent orchestrator commands."
    ),
    version="1.1.0",
    contact={
        "name": "OrGanuz QA Automation",
    },
    license_info={
        "name": "Internal",
    },
    openapi_tags=[
        {"name": "service", "description": "Runtime service health and root metadata."},
        {"name": "automation", "description": "Read-only metadata for Playwright and QA agent workflows."},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def refresh_qa_metrics_on_scrape(request: Request, call_next):
    if request.url.path == "/metrics":
        refresh_qa_metrics()
    return await call_next(request)


Instrumentator().instrument(app).expose(app, endpoint="/metrics")


def refresh_qa_metrics() -> None:
    if not TEST_RESULTS_PATH.exists():
        QA_REPORT_PRESENT.set(0)
        return

    try:
        report = json.loads(TEST_RESULTS_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        QA_REPORT_PRESENT.set(0)
        return

    project_status_counts: dict[tuple[str, str], int] = {}
    project_durations: dict[str, float] = {}
    for test_case in iter_playwright_tests(report.get("suites", [])):
        project = str(test_case.get("projectName") or test_case.get("projectId") or "unknown")
        results = test_case.get("results") or []
        result = results[-1] if results else {}
        status = normalize_test_status(str(test_case.get("status") or result.get("status") or "unknown"))
        duration_ms = float(result.get("duration") or 0)
        project_status_counts[(project, status)] = project_status_counts.get((project, status), 0) + 1
        project_durations[project] = project_durations.get(project, 0) + duration_ms / 1000

    QA_TESTS_TOTAL.clear()
    QA_DURATION_SECONDS.clear()
    for (project, status), count in project_status_counts.items():
        QA_TESTS_TOTAL.labels(project=project, status=status).set(count)
    for project, duration_seconds in project_durations.items():
        QA_DURATION_SECONDS.labels(project=project).set(duration_seconds)

    start_time = report.get("stats", {}).get("startTime")
    if isinstance(start_time, str):
        QA_LAST_RUN_TIMESTAMP.set(parse_playwright_timestamp(start_time))
    QA_REPORT_PRESENT.set(1)


def iter_playwright_tests(suites: list[dict[str, Any]]):
    for suite in suites:
        for spec in suite.get("specs", []):
            for test_case in spec.get("tests", []):
                yield test_case
        yield from iter_playwright_tests(suite.get("suites", []))


def normalize_test_status(status: str) -> str:
    status_map = {
        "expected": "passed",
        "unexpected": "failed",
        "timedOut": "failed",
        "interrupted": "failed",
    }
    return status_map.get(status, status)


def parse_playwright_timestamp(value: str) -> float:
    normalized = value.replace("Z", "+00:00")
    return datetime.fromisoformat(normalized).timestamp()


@app.get("/", response_model=RootInfo, tags=["service"], summary="Service metadata")
def root() -> RootInfo:
    return RootInfo(
        message="FastAPI server is running",
        docs_url="/docs",
        openapi_url="/openapi.json",
    )


@app.get("/health", response_model=ServiceStatus, tags=["service"], summary="Health check")
def health() -> ServiceStatus:
    return ServiceStatus(status="ok")


@app.get(
    "/automation",
    response_model=AutomationOverview,
    tags=["automation"],
    summary="Automation stack overview",
)
def automation_overview() -> AutomationOverview:
    return AutomationOverview(
        projects=PLAYWRIGHT_PROJECTS,
        agent_commands=AGENT_COMMANDS,
        reports=[
            "playwright-report",
            "test-results/results.json",
            "allure-results",
            "allure-report",
            "blob-report",
        ],
    )


@app.get(
    "/automation/playwright-projects",
    response_model=list[PlaywrightProject],
    tags=["automation"],
    summary="Configured Playwright projects",
)
def playwright_projects() -> list[PlaywrightProject]:
    return PLAYWRIGHT_PROJECTS


@app.get(
    "/automation/qa-agent",
    response_model=list[AgentCommand],
    tags=["automation"],
    summary="QA agent commands",
)
def qa_agent_commands() -> list[AgentCommand]:
    return AGENT_COMMANDS
