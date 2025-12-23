"""
模型管理路由
"""
from fastapi import APIRouter, HTTPException
from app.services.model_manager import (
    scan_models,
    get_model_info,
    load_model,
    unload_model,
    get_loaded_models,
    get_gpu_info,
    ModelInfo
)
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()


class LoadModelRequest(BaseModel):
    device: str = "cpu"  # cpu 或 cuda


@router.get("/")
async def list_models():
    """
    列出所有可用模型
    """
    models = scan_models()
    return {
        "models": [
            {
                "name": m.name,
                "type": m.type,
                "path": m.path,
                "size_mb": m.size_mb,
                "loaded": m.loaded,
                "device": m.device if m.loaded else None
            }
            for m in models
        ],
        "total": len(models)
    }


@router.get("/loaded")
async def list_loaded_models():
    """
    列出已加载的模型
    """
    models = get_loaded_models()
    return {
        "models": [
            {
                "name": m.name,
                "type": m.type,
                "device": m.device
            }
            for m in models
        ]
    }


@router.get("/gpu")
async def gpu_status():
    """
    获取 GPU 状态
    """
    return get_gpu_info()


@router.post("/{name}/load")
async def load_model_api(name: str, request: LoadModelRequest):
    """
    加载指定模型
    """
    info = get_model_info(name)
    if info is None:
        raise HTTPException(status_code=404, detail=f"模型不存在: {name}")
    
    success = load_model(name, request.device)
    
    if success:
        return {
            "success": True,
            "message": f"模型 {name} 已加载到 {request.device}"
        }
    else:
        raise HTTPException(status_code=500, detail=f"模型加载失败: {name}")


@router.post("/{name}/unload")
async def unload_model_api(name: str):
    """
    卸载指定模型
    """
    success = unload_model(name)
    
    if success:
        return {
            "success": True,
            "message": f"模型 {name} 已卸载"
        }
    else:
        raise HTTPException(status_code=500, detail=f"模型卸载失败: {name}")


@router.get("/{name}")
async def get_model_info_api(name: str):
    """
    获取模型详情
    """
    info = get_model_info(name)
    if info is None:
        raise HTTPException(status_code=404, detail=f"模型不存在: {name}")
    
    return {
        "name": info.name,
        "type": info.type,
        "path": info.path,
        "size_mb": info.size_mb,
        "loaded": info.loaded,
        "device": info.device if info.loaded else None
    }
