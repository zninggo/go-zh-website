# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -o /golangorg ./cmd/golangorg

# Runtime stage
FROM alpine:3.20

# Copy Go runtime for GOROOT (needed by pkgdoc)
COPY --from=builder /usr/local/go /usr/local/go

COPY --from=builder /golangorg /usr/local/bin/golangorg

EXPOSE 8080

ENV GOROOT=/usr/local/go

CMD ["golangorg", "-http=:8080", "-lang=zh", "-v"]
