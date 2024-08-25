FROM python:3.12-alpine

WORKDIR /seeksync
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

CMD ["python", "server.py"]
