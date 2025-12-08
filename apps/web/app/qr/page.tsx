"use client";
import { useState, useEffect } from "react";
import QRCode from "react-qr-code";

export default function QRLogin() {
  const [qr, setQr] = useState("");
  const [token, setToken] = useState("");

  // clear previous login token
  useEffect(() => {
    localStorage.removeItem("token");
    setToken("");
  }, []);
  

  async function getQr() {
    setToken("");
    setQr("");
    const res = await fetch("/api/auth/qr");
    const data = await res.json();
    setQr(data.qr);
  }

  useEffect(() => {
    if (!qr) return;
    
    // Add a 3 second delay before starting to poll
    const startDelay = setTimeout(() => {
      const interval = setInterval(async () => {
        const res = await fetch(`/api/auth/qr/check?qr=${qr}`);
        const data = await res.json();
        
        // Only accept actual JWT tokens, not "pending"
        if (data.token && data.token !== "pending") {
          setToken(data.token);
          clearInterval(interval);
        }
      }, 2000);

      // Cleanup interval after 2 minutes (QR expires)
      const timeout = setTimeout(() => {
        clearInterval(interval);
      }, 120000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }, 3000); // Wait 3 seconds before first check

    return () => clearTimeout(startDelay);
  }, [qr]);

  if (token) {
    localStorage.setItem("token", token);
    window.location.href = "/"; // redirect to home for now
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-6 p-10">
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={getQr}
      >
        Generate QR Login
      </button>

      {qr && (
        <div className="bg-white p-4">
          <QRCode value={qr} size={220} />
        </div>
      )}

      {qr && <p className="text-gray-500 text-sm">Scanning...</p>}
    </div>
  );
}