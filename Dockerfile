FROM mcr.microsoft.com/playwright:v1.60.0-noble

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx tsc --noEmit

ENV CI=true
ENV PLAYWRIGHT_MERGE_REPORTS=false

ENTRYPOINT ["npx", "playwright", "test"]
CMD ["--project=chromium", "--project=api", "--reporter=list"]
