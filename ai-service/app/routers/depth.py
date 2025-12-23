from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.concurrency import run_in_threadpool
from app.services.depth import estimate_depth_sync
from app.utils.storage import save_upload, save_result
import shutil
import uuid
import os

router = APIRouter()

@router.post("/")
async def create_depth(file: UploadFile = File(...)):
    """
    同步模式：接收图片，生成深度图，直接返回结果 URL
    """
    job_id = str(uuid.uuid4())
    
    # 确保 temp 目录存在
    os.makedirs("temp", exist_ok=True)
    os.makedirs("results", exist_ok=True)
    
    file_path = f"temp/{job_id}_{file.filename}"
    
    # 保存上传的文件
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件保存失败: {str(e)}")
    
    # 同步处理（MVP 模式，等待结果）
    try:
        result_path = await run_in_threadpool(estimate_depth_sync, job_id, file_path)
        
        # 返回结果 URL（假设后端会代理访问 /results/...）
        result_url = f"/ai-service/results/{os.path.basename(result_path)}"
        
        return {
            "success": True,
            "job_id": job_id,
            "result_url": result_url,
            "result_path": result_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"深度图生成失败: {str(e)}")
