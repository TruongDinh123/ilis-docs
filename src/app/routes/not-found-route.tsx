import { Link } from "react-router-dom";
import { paths } from "@/config/paths";

export function NotFoundRoute() {
  return (
    <div style={{ padding: "64px 24px", textAlign: "center" }}>
      <h1>404 — Không tìm thấy trang</h1>
      <p>Trang bạn tìm không tồn tại hoặc đã được di chuyển.</p>
      <Link to={paths.home.getHref()}>Quay về trang chủ</Link>
    </div>
  );
}
