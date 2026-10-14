import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  ErrorCatalog,
  GalleryProvider,
  GlobalSearch,
  GuideDocs,
  HeaderSearchButton,
  Hero,
  NotesSection,
  NotificationBell,
  NotificationDialog,
  PortalBrand,
  PortalFooter,
  PortalNav,
  PortalSidebar,
  QuickAccess,
  ResourcesSection,
  SigningSoftware,
  SupportGuide,
  TickerBar,
  VideoGuides,
  useNotifications,
} from "@/features/portal";
import styles from "./home-route.module.css";

/**
 * Trang chủ cổng hướng dẫn iLIS Cà Mau. Route chỉ "lắp ráp": các phần riêng của tính năng
 * (ticker, chuông, menu...) được truyền vào khung bố cục dùng chung qua slot.
 */
export function HomeRoute() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = useNotifications();

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const openNotifications = useCallback(() => setNotificationsOpen(true), []);

  // Ctrl/⌘ + K mở tìm kiếm nhanh (phím tắt quen thuộc, không chặn khi đang gõ Esc...).
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
          <Hero onOpenSearch={openSearch} />
          <QuickAccess />
          <SupportGuide />
          <ErrorCatalog />
          <NotesSection />
          <SigningSoftware />
          <VideoGuides />
          <GuideDocs />
          <ResourcesSection />
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
