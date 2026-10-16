import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  DashboardMonitor,
  GalleryProvider,
  GlobalSearch,
  HeaderSearchButton,
  NotificationBell,
  NotificationDialog,
  PortalBrand,
  PortalFooter,
  PortalNav,
  PortalSidebar,
  TickerBar,
  useNotifications,
} from "@/features/portal";
import type { DashboardTabKey } from "@/features/portal/components/dashboard-monitor";
import styles from "./home-route.module.css";

export interface DashboardRouteProps {
  initialTab?: DashboardTabKey;
}

/**
 * Tuyến trang chuyên biệt hiển thị Trung tâm Giám sát & Báo cáo số liệu Đất đai
 * (dành cho đường dẫn trực tiếp /thong-ke hoặc /giam-sat).
 */
export function DashboardRoute({ initialTab = "baocao" }: DashboardRouteProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = useNotifications();

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const openNotifications = useCallback(() => setNotificationsOpen(true), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <GalleryProvider>
      <a className="skip-link" href="#main-content">
        Bỏ qua, tới nội dung chính
      </a>
      <AppShell
        banner={<TickerBar onOpenNotifications={openNotifications} />}
        brand={<PortalBrand />}
        headerNav={<PortalNav />}
        headerActions={
          <>
            <HeaderSearchButton onClick={openSearch} />
            <NotificationBell unreadCount={notifications.unreadCount} onClick={openNotifications} />
          </>
        }
        sidebar={<PortalSidebar onOpenSearch={openSearch} />}
      >
        <div className={styles.page}>
          <DashboardMonitor initialTab={initialTab} />
          <PortalFooter />
        </div>
      </AppShell>

      <NotificationDialog
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        items={notifications.items}
        isUnread={notifications.isUnread}
        unreadCount={notifications.unreadCount}
        onMarkAllRead={notifications.markAllRead}
      />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} onOpenNotifications={openNotifications} />
    </GalleryProvider>
  );
}
