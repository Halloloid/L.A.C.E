# syntax=docker/dockerfile:1
#
# LMPC Validation Engine (FastAPI + GLiNER/RapidFuzz).
#
# Build context is the `engine/Validation_Engine/` directory
# (see ../../docker-compose.yml).
#
# This image bakes in real GLiNER extraction (see extractor.py). The model
# weights are downloaded once at BUILD time, not at container startup, so:
#   - the running container needs no network access to function
#   - restarting the container doesn't re-download anything
#   - `docker compose build` needs internet access and will take a while
#     the first time (CPU PyTorch wheel + model weights are a few hundred
#     MB to ~1GB depending on the model).

FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt ./

# BuildKit cache mount: persists pip's download cache across builds, so a
# future unrelated requirements.txt edit doesn't re-download every wheel
# (torch especially) from scratch again.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Plain RUN (no cache mount) so the downloaded model weights are actually
# committed into this layer, not discarded like a cache mount's contents
# would be. This only re-runs when an earlier layer (requirements.txt)
# changes, which should be rare once dependencies settle.
# Must match the model name in extractor.py's GLiNERExtractor.__init__.
RUN python -c "from gliner import GLiNER; GLiNER.from_pretrained('urchade/gliner_multi-v2.1')"

COPY . .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
