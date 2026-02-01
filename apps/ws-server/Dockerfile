# -------------------------------
# Base image
# -------------------------------
FROM python:3.11-bookworm

# -------------------------------
# Environment variables
# -------------------------------
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# -------------------------------
# System dependencies (aiortc, webrtcvad, audio)
# -------------------------------
RUN apt-get update && apt-get install -y \
    build-essential \
    ffmpeg \
    libopus-dev \
    libvpx-dev \
    libsrtp2-dev \
    portaudio19-dev \
    libasound2-dev \
    pkg-config \
    git \
    && rm -rf /var/lib/apt/lists/*

# -------------------------------
# Set working directory
# -------------------------------
WORKDIR /app

# -------------------------------
# Install Python dependencies
# -------------------------------
COPY pyproject.toml ./

# If pyproject.toml has [project] deps
RUN pip install --upgrade pip && \
    pip install .

# -------------------------------
# Copy application code
# -------------------------------
COPY src ./src
COPY README.md ./

# -------------------------------
# Expose port
# -------------------------------
EXPOSE 4500

# -------------------------------
# Run server
# -------------------------------
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
