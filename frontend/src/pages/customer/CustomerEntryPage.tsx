import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";

import { fetchMyRequests } from "@/services/requests";

const ACTIVE_STATUSES = ["created", "searching", "driver_found", "en_route", "arrived"];

export default function CustomerEntryPage() {
  const { data: requests, isLoading } = useQuery({
    queryKey: ["my-requests"],
    queryFn: fetchMyRequests,
  });

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-50" />;
  }

  const activeRequest = requests?.find((r) => ACTIVE_STATUSES.includes(r.status));

  if (activeRequest) {
    return <Navigate to={`/musteri/takip/${activeRequest.id}`} replace />;
  }

  return <Navigate to="/musteri/yeni-talep" replace />;
}
