export const paths = {
  home: {
    path: "/",
    getHref: () => "/",
  },
  category: {
    path: "/danh-muc/:categoryId",
    getHref: (categoryId: string) => `/danh-muc/${categoryId}`,
  },
  thongKe: {
    path: "/thong-ke",
    getHref: () => "/thong-ke",
  },
  giamSat: {
    path: "/giam-sat",
    getHref: () => "/giam-sat",
  },
  toiUuFile: {
    path: "/toi-uu-file",
    getHref: () => "/toi-uu-file",
  },
} as const;
