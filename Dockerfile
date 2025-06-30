# Use Ubuntu base image with Node.js
FROM node:18-bullseye

# Install Python and system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libglib2.0-0 \
    libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

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

# Expose port
EXPOSE 4000

# Set working directory to server
WORKDIR /app/server

# Start the server
CMD ["node", "server.js"] 