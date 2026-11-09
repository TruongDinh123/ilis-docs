import os
import urllib.parse
from fastapi import FastAPI, Request, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from optimizer import optimize_file_bytes

app = FastAPI(
    title="iLIS Cà Mau - File Size Checker & Optimizer Service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Original-Size", "X-Optimized-Size", "X-Method"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "file-optimizer"}


@app.post("/api/optimize")
async def api_optimize(request: Request):
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type:
        form = await request.form()
        upload = form.get("file")
        if upload is None:
            raise HTTPException(status_code=400, detail="Thiếu file tải lên")
        target_mb = float(form.get("target_mb", 15.0))
        input_bytes = await upload.read()
        filename = getattr(upload, "filename", None) or "document.pdf"
    else:
        raw_name = request.headers.get("x-file-name", "document.pdf")
        filename = urllib.parse.unquote(raw_name)
        target_mb = float(request.headers.get("x-target-mb", "15.0"))
        input_bytes = await request.body()

    if target_mb <= 0.05:
        raise HTTPException(status_code=400, detail="target_mb phải lớn hơn 0.05 MB")

    optimized_bytes, meta = await run_in_threadpool(
        optimize_file_bytes, filename, input_bytes, target_mb
    )

    headers = {
        "X-Original-Size": str(meta["original_size"]),
        "X-Optimized-Size": str(meta["optimized_size"]),
        "X-Method": str(meta["method"]),
        "Access-Control-Expose-Headers": "X-Original-Size, X-Optimized-Size, X-Method",
    }
    return Response(
        content=optimized_bytes,
        media_type="application/octet-stream",
        headers=headers,
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("app:app", host="127.0.0.1", port=port, reload=False)
