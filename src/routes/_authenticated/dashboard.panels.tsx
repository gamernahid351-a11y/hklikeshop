import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/panels")({
  component: RedirectToLikePackages,
});

function RedirectToLikePackages() {
  const navigate = useNavigate();
  useEffect(() => { navigate({ to: "/dashboard/packages", replace: true }); }, [navigate]);
  return null;
}
