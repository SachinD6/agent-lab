package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
)

const maxBodyBytes = 1 << 20 // 1 MiB

const tracesFile = "traces.json"

var writeMu sync.Mutex

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /traces", handleTrace)

	addr := ":8090"
	log.Printf("listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func handleTrace(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	if err != nil {
		http.Error(w, "failed to read body", http.StatusBadRequest)
		return
	}

	log.Printf("trace: %s", body)

	if !json.Valid(body) {
		http.Error(w, "body must be valid JSON", http.StatusBadRequest)
		return
	}

	if err := appendTrace(body); err != nil {
		log.Printf("append trace: %v", err)
		http.Error(w, "failed to write trace", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func appendTrace(body []byte) error {
	writeMu.Lock()
	defer writeMu.Unlock()

	f, err := os.OpenFile(tracesFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer f.Close()

	_, err = f.Write(append(bytes.TrimSpace(body), '\n'))
	return err
}
