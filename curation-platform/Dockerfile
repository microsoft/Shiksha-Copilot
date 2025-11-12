# Base image
FROM python:3.10-slim
WORKDIR /app
COPY . /app/.
RUN pip install -r requirements.txt
EXPOSE 8501
ENTRYPOINT ["streamlit", "run", "Main.py"]

