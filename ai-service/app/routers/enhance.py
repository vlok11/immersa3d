"""
图像/视频增强路由
"""
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from pydantic import BaseModel
from typing import Optional
import os
import uuid
import shutil
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class EnhanceOptions(BaseModel):
    """增强选项"""
    sr: bool = True        # 超分辨率
    denoise: bool = False  # 去噪
    faceRestore: bool = False  # 人脸修复
    strength: float = 1.0  # 增强强度 0-1


@router.post("/image")
async def enhance_image(
    file: UploadFile = File(...),
    sr: bool = Form(True),
    denoise: bool = Form(False),
    faceRestore: bool = Form(False),
    strength: float = Form(1.0)
):
    """
    增强单张图像
    """
    job_id = str(uuid.uuid4())
    
    os.makedirs("temp", exist_ok=True)
    os.makedirs("results", exist_ok=True)
    
    file_path = f"temp/{job_id}_{file.filename}"
    output_path = f"results/{job_id}_enhanced.png"
    
    try:
        # 保存上传文件
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 执行增强
        from app.services.enhance import enhance_image_sync
        result = enhance_image_sync(
            file_path, 
            output_path,
            sr=sr,
            denoise=denoise,
            face_restore=faceRestore,
            strength=strength
        )
        
        return {
            "success": True,
            "job_id": job_id,
            "result_url": f"/results/{os.path.basename(result)}"
        }
    except Exception as e:
        logger.error(f"图像增强失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # 清理临时文件
        if os.path.exists(file_path):
            os.remove(file_path)


@router.post("/video")
async def enhance_video(
    file: UploadFile = File(...),
    sr: bool = Form(True),
    denoise: bool = Form(False),
    faceRestore: bool = Form(False)
):
    """
    增强视频（异步任务）
    """
    job_id = str(uuid.uuid4())
    
    os.makedirs("temp", exist_ok=True)
    os.makedirs("results", exist_ok=True)
    
    file_path = f"temp/{job_id}_{file.filename}"
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # TODO: 提交到后台任务队列
        # 当前返回任务 ID，前端可轮询状态
        
        return {
            "success": True,
            "job_id": job_id,
            "status": "queued",
            "message": "视频增强任务已提交"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/video/{job_id}/status")
async def get_video_enhance_status(job_id: str):
    """
    查询视频增强任务状态
    """
    # TODO: 从任务队列获取状态
    result_path = f"results/{job_id}_enhanced.mp4"
    
    if os.path.exists(result_path):
        return {
            "job_id": job_id,
            "status": "completed",
            "progress": 100,
            "result_url": f"/results/{job_id}_enhanced.mp4"
        }
    
    return {
        "job_id": job_id,
        "status": "processing",
        "progress": 50  # 模拟进度
    }
