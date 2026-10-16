import { Route, Routes } from "react-router-dom";
import { paths } from "@/config/paths";
import { HomeRoute } from "./routes/home-route";
import { DashboardRoute } from "./routes/dashboard-route";
import { NotFoundRoute } from "./routes/not-found-route";

export function AppRouter() {
  return (
    <Routes>
      <Route path={paths.home.path} element={<HomeRoute />} />
      <Route path={paths.category.path} element={<HomeRoute />} />
      <Route path={paths.thongKe.path} element={<DashboardRoute initialTab="baocao" />} />
      <Route path={paths.giamSat.path} element={<DashboardRoute initialTab="vnlis" />} />
      <Route path="*" element={<NotFoundRoute />} />
    </Routes>
  );
}
