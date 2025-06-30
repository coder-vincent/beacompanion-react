# Use Ubuntu base image with Node.js
FROM node:18-bullseye

# Install Python and system dependencies including MediaPipe requirements
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    # MediaPipe system dependencies
    libgl1-mesa-glx \
    libglib2.0-0 \
    libgtk-3-0 \
    libsm6 \
    libxext6 \
    libfontconfig1 \
    libxrender1 \
    libgomp1 \
    # OpenCV dependencies for MediaPipe
    libopencv-dev \
    # Additional MediaPipe dependencies
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    libgstreamer-plugins-good1.0-0 \
    libgstreamer-plugins-bad1.0-0 \
    libgstreamer-plugins-ugly1.0-0 \
    # Cleanup to reduce image size
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create symbolic link for python command
RUN ln -s /usr/bin/python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy package files
COPY server/package*.json ./server/
COPY machine-learning/requirements.txt ./machine-learning/

# Install Node.js dependencies
WORKDIR /app/server
RUN npm ci --only=production

# Install Python dependencies
WORKDIR /app
RUN pip3 install -r machine-learning/requirements.txt

# Copy application code
COPY server/ ./server/
COPY machine-learning/ ./machine-learning/

# Create necessary directories
RUN mkdir -p /tmp

# Health check for container monitoring  
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:4000/api/ml/test || exit 1

# Expose port
EXPOSE 4000

# Set working directory to server
WORKDIR /app/server

# Start the server
CMD ["node", "server.js"] 