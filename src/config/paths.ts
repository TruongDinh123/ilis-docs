export const paths = {
  home: {
    path: "/",
    getHref: () => "/",
  },
  category: {
    path: "/danh-muc/:categoryId",
    getHref: (categoryId: string) => `/danh-muc/${categoryId}`,
  },
} as const;
