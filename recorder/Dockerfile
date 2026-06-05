# Build Stage
FROM rust:1.77-slim-bookworm as builder

# Install build dependencies and FFmpeg development headers
RUN apt-get update && apt-get install -y \
    pkg-config \
    libavformat-dev \
    libavcodec-dev \
    libavutil-dev \
    libavdevice-dev \
    libavfilter-dev \
    libswscale-dev \
    libswresample-dev \
    clang \
    libclang-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY Cargo.toml ./
COPY src ./src

# Build the release binary
RUN cargo build --release

# Runtime Stage
FROM debian:bookworm-slim

# Install runtime FFmpeg libraries
RUN apt-get update && apt-get install -y \
    libavformat59 \
    libavcodec59 \
    libavutil57 \
    libavdevice59 \
    libavfilter8 \
    libswscale6 \
    libswresample4 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /usr/src/app/target/release/mview-recorder .

# Create recordings directory and ensure proper permissions
RUN mkdir -p /recordings
# In a real setup we would run as non-root, but we need volume write access
# RUN useradd -m sentinel && chown -R sentinel:sentinel /recordings
# USER sentinel

CMD ["./mview-recorder"]
