package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
)

const maxBodyBytes = 1 << 20 // 1 MiB

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

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
