FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar el controlador de SQL Server y sus dependencias.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       curl ca-certificates gnupg g++ unixodbc-dev libgssapi-krb5-2 \
    && curl -fsSL \
       https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb \
       -o /tmp/packages-microsoft-prod.deb \
    && dpkg -i /tmp/packages-microsoft-prod.deb \
    && rm /tmp/packages-microsoft-prod.deb \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.lock.txt ./

RUN pip install --no-cache-dir -r requirements.lock.txt \
    && pip check

COPY . .

RUN useradd --create-home appuser
USER appuser

CMD ["sh", "-c", "exec python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]