# ============================================
# Multi-Stage Dockerfile for LexiAid Backend
# ============================================
# This Dockerfile creates an optimized production image for the Flask backend
# using a multi-stage build to minimize final image size.

# ============================================
# Stage 1: Builder - Install Dependencies
# ============================================
FROM python:3.12-slim AS builder

# Set environment variables for Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies required for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    build-essential \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create a virtual environment
RUN python -m venv /opt/venv

# Activate virtual environment
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements file
COPY backend/requirements.txt .

# Install Python dependencies into the virtual environment
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r requirements.txt && \
    pip install gunicorn==21.2.0

# ============================================
# Stage 2: Final - Production Image
# ============================================
FROM python:3.12-slim AS final

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH=/app \
    FLASK_APP=app.py \
    FLASK_ENV=production

# Install runtime dependencies only (if needed by Google Cloud libraries)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app && \
    chown -R appuser:appuser /app

# Set working directory
WORKDIR /app

# Copy virtual environment from builder stage
COPY --from=builder --chown=appuser:appuser /opt/venv /opt/venv

# Copy application code
COPY --chown=appuser:appuser . ./backend

# Create necessary directories with proper permissions
RUN mkdir -p /app/data/db /app/debug_audio /app/logs && \
    chown -R appuser:appuser /app/data /app/debug_audio /app/logs

# Switch to non-root user
USER appuser

# Change to backend directory for correct Python import paths
WORKDIR /app/backend

# Expose the application port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5000/health', timeout=5)" || exit 1

# Run the application with Gunicorn
# Configuration:
# - 4 worker processes (adjust based on CPU cores)
# - Bind to all interfaces on port 5000
# - 120s timeout for long-running requests (AI operations)
# - Access logs to stdout for container logging
CMD ["gunicorn", \
     "--workers", "4", \
     "--worker-class", "sync", \
     "--bind", "0.0.0.0:5000", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info", \
     "backend.app:app"]
