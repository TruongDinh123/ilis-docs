import raw from "./dongthap-content.json";
import type { PortalContent } from "../types";

/**
 * Nội dung nhân bản đầy đủ từ page source ilis-docs.vnptdongthap.com.vn.
 * Làm mới bằng: `npm run sync:content -- <file-page-source.html>`.
 * Ép kiểu qua `unknown` vì JSON suy luận chuỗi thường thay vì union literal.
 */
export const content = raw as unknown as PortalContent;
