from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI(
    title="OrGanuz Test Automation API",
    version="1.0.0",
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "FastAPI server is running"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
