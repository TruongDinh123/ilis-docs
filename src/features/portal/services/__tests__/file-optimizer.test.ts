import { describe, expect, it } from "vitest";
import {
  buildZipArchiveBytes,
  computeTargetBytes,
  generateSampleDatasetFiles,
  isSupportedFile,
  optimizeFileBytes,
  readBlobBytes,
} from "../file-optimizer.service";

describe("fileOptimizerService", () => {
  it("filters supported extensions and rejects office/video files", () => {
    expect(isSupportedFile("HSQ_To12_Thua160.pdf")).toBe(true);
    expect(isSupportedFile("Anh_GCN.JPG")).toBe(true);
    expect(isSupportedFile("SoDoThuaDat.svg")).toBe(true);
    expect(isSupportedFile("BanVe.tiff")).toBe(true);
    expect(isSupportedFile("32201_XaDatMoi.xlsx")).toBe(false);
    expect(isSupportedFile("BienBan.docx")).toBe(false);
    expect(isSupportedFile("VideoHuongDan.mp4")).toBe(false);
  });

  it("identifies oversized files (> 15MB), optimizes PDF/JPG/PNG/SVG below targetBytes, and builds UTF-8 ZIP", async () => {
    const demoEntries = generateSampleDatasetFiles();
    expect(demoEntries.length).toBe(7);

    const targetBytes = computeTargetBytes(15);
    const limitBytes = 15 * 1024 * 1024;

    const oversizedEntries = demoEntries.filter((e) => e.file.size > limitBytes);
    const compliantEntries = demoEntries.filter((e) => e.file.size <= limitBytes);

    expect(oversizedEntries.length).toBe(4);
    expect(compliantEntries.length).toBe(3);

    for (const entry of oversizedEntries) {
      const inputBytes = await readBlobBytes(entry.file);
      const { bytes, meta } = await optimizeFileBytes(entry.file.name, inputBytes, 15);
      expect(bytes.byteLength).toBeLessThanOrEqual(targetBytes);
      expect(bytes.byteLength).toBeGreaterThanOrEqual(13 * 1024 * 1024);
      expect(meta.optimized_size).toBeLessThan(meta.original_size);
    }

    const zipBytes = buildZipArchiveBytes(
      demoEntries.map((entry) => ({
        relativePath: entry.relativePath,
        data: new Uint8Array([1, 2, 3, 4]),
      })),
    );
    expect(zipBytes[0]).toBe(0x50);
    expect(zipBytes[1]).toBe(0x4b);
    expect(zipBytes[2]).toBe(0x03);
    expect(zipBytes[3]).toBe(0x04);
  });
});
