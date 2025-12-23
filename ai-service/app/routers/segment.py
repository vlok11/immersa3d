"""
分割推理路由
"""
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from app.services.segment import (
    segment_with_points,
    segment_with_box,
    segment_auto
)
import os
import uuid
import shutil
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()


class PointSegmentRequest(BaseModel):
    """点分割请求"""
    image_url: str
    points: List[List[int]]  # [[x, y], ...]
    labels: List[int]  # [1, 0, ...]  1=前景, 0=背景


class BoxSegmentRequest(BaseModel):
    """框分割请求"""
    image_url: str
    box: List[int]  # [x1, y1, x2, y2]


@router.post("/")
async def segment_image(file: UploadFile = File(...)):
    """
    上传图片进行自动分割
    """
    job_id = str(uuid.uuid4())
    
    os.makedirs("temp", exist_ok=True)
    os.makedirs("results", exist_ok=True)
    
    file_path = f"temp/{job_id}_{file.filename}"
    output_dir = f"results/{job_id}_masks"
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件保存失败: {str(e)}")
    
    try:
        mask_paths = segment_auto(file_path, output_dir)
        
        # 构建结果 URL
        result_urls = [
            f"/results/{job_id}_masks/{os.path.basename(p)}"
            for p in mask_paths
        ]
        
        return {
            "success": True,
            "job_id": job_id,
            "mask_count": len(mask_paths),
            "mask_urls": result_urls
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分割失败: {str(e)}")
    finally:
        # 清理临时文件
        if os.path.exists(file_path):
            os.remove(file_path)


@router.post("/points")
async def segment_with_points_api(
    file: UploadFile = File(...),
    points: str = Form(...),  # JSON 字符串 "[[x,y], ...]"
    labels: str = Form(...)   # JSON 字符串 "[1, 0, ...]"
):
    """
    基于点提示的交互式分割
    """
    import json
    
    job_id = str(uuid.uuid4())
    
    os.makedirs("temp", exist_ok=True)
    os.makedirs("results", exist_ok=True)
    
    file_path = f"temp/{job_id}_{file.filename}"
    output_path = f"results/{job_id}_mask.png"
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        points_list = json.loads(points)
        labels_list = json.loads(labels)
        
        result = segment_with_points(
            file_path,
            [(p[0], p[1]) for p in points_list],
            labels_list,
            output_path
        )
        
        return {
            "success": True,
            "job_id": job_id,
            "mask_url": f"/results/{os.path.basename(result)}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分割失败: {str(e)}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


@router.post("/box")
async def segment_with_box_api(
    file: UploadFile = File(...),
    box: str = Form(...)  # JSON 字符串 "[x1, y1, x2, y2]"
):
    """
    基于边界框的分割
    """
    import json
    
    job_id = str(uuid.uuid4())
    
    os.makedirs("temp", exist_ok=True)
    os.makedirs("results", exist_ok=True)
    
    file_path = f"temp/{job_id}_{file.filename}"
    output_path = f"results/{job_id}_mask.png"
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        box_list = json.loads(box)
        
        result = segment_with_box(
            file_path,
            tuple(box_list),
            output_path
        )
        
        return {
            "success": True,
            "job_id": job_id,
            "mask_url": f"/results/{os.path.basename(result)}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分割失败: {str(e)}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
