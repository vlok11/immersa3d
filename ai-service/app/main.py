from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.routers import depth, segment, models, enhance
import os

app = FastAPI(title="Immersa 3D AI 服务")

# 确保目录存在
os.makedirs("temp", exist_ok=True)
os.makedirs("results", exist_ok=True)
os.makedirs("models", exist_ok=True)

# 挂载结果目录为静态文件服务
app.mount("/results", StaticFiles(directory="results"), name="results")

# 注册路由
app.include_router(depth.router, prefix="/infer/depth", tags=["深度估计"])
app.include_router(segment.router, prefix="/infer/segment", tags=["图像分割"])
app.include_router(models.router, prefix="/models", tags=["模型管理"])
app.include_router(enhance.router, prefix="/enhance", tags=["图像增强"])

@app.get("/")
def read_root():
    return {"message": "Immersa 3D AI 服务运行中"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
