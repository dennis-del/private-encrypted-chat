"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return router.replace("/");

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (!data.user) return router.replace("/");

        if (data.role === "admin") router.replace("/admin");
        else router.replace("/user");

      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center mt-12">Loading...</p>;
  return null;
}
