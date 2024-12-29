# Use Python 3.13 slim image
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install pipenv
RUN pip install pipenv

# Copy Pipfile and Pipfile.lock
COPY Pipfile* ./

# Install dependencies
RUN pipenv install --deploy --system

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Add health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/test || exit 1

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl

# Run the application
CMD ["python", "app.py"]
