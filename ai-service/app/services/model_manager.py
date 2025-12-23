"""
模型管理服务
支持模型的加载、卸载、切换和状态查询
"""
import os
import logging
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

# 模型目录
MODELS_DIR = os.getenv("MODELS_DIR", "./models")


class ModelType(str, Enum):
    DEPTH = "depth"
    SEGMENT = "segment"
    ENHANCE = "enhance"
    NORMAL = "normal"


@dataclass
class ModelInfo:
    """模型信息"""
    name: str
    type: ModelType
    path: str
    size_mb: float
    loaded: bool = False
    device: str = "cpu"


# 已注册的模型
_registered_models: Dict[str, ModelInfo] = {}

# 已加载的模型实例
_loaded_models: Dict[str, object] = {}


def scan_models() -> List[ModelInfo]:
    """扫描模型目录，发现可用模型"""
    models = []
    
    if not os.path.exists(MODELS_DIR):
        os.makedirs(MODELS_DIR, exist_ok=True)
        logger.info(f"创建模型目录: {MODELS_DIR}")
        return models
    
    # 深度模型
    depth_patterns = ["depth_anything*.pth", "depth_anything*.pt", "midas*.pt"]
    for pattern in depth_patterns:
        for path in Path(MODELS_DIR).glob(pattern):
            size_mb = path.stat().st_size / (1024 * 1024)
            model = ModelInfo(
                name=path.stem,
                type=ModelType.DEPTH,
                path=str(path),
                size_mb=round(size_mb, 2),
                loaded=path.stem in _loaded_models
            )
            models.append(model)
            _registered_models[path.stem] = model
    
    # 分割模型
    sam_patterns = ["sam*.pt", "sam*.pth", "segment_anything*.pth"]
    for pattern in sam_patterns:
        for path in Path(MODELS_DIR).glob(pattern):
            size_mb = path.stat().st_size / (1024 * 1024)
            model = ModelInfo(
                name=path.stem,
                type=ModelType.SEGMENT,
                path=str(path),
                size_mb=round(size_mb, 2),
                loaded=path.stem in _loaded_models
            )
            models.append(model)
            _registered_models[path.stem] = model
    
    # 增强模型
    enhance_patterns = ["realesrgan*.pth", "gfpgan*.pth", "esrgan*.pth"]
    for pattern in enhance_patterns:
        for path in Path(MODELS_DIR).glob(pattern):
            size_mb = path.stat().st_size / (1024 * 1024)
            model = ModelInfo(
                name=path.stem,
                type=ModelType.ENHANCE,
                path=str(path),
                size_mb=round(size_mb, 2),
                loaded=path.stem in _loaded_models
            )
            models.append(model)
            _registered_models[path.stem] = model
    
    logger.info(f"扫描到 {len(models)} 个模型")
    return models


def get_model_info(name: str) -> Optional[ModelInfo]:
    """获取模型信息"""
    if name in _registered_models:
        return _registered_models[name]
    
    # 重新扫描
    scan_models()
    return _registered_models.get(name)


def load_model(name: str, device: str = "cpu") -> bool:
    """加载模型到内存"""
    info = get_model_info(name)
    if info is None:
        logger.error(f"模型不存在: {name}")
        return False
    
    if info.loaded:
        logger.info(f"模型已加载: {name}")
        return True
    
    try:
        if info.type == ModelType.DEPTH:
            from app.services.depth import get_model
            # 设置环境变量
            os.environ["DEPTH_MODEL_PATH"] = info.path
            os.environ["INFERENCE_DEVICE"] = device
            # 触发加载
            get_model()
            
        elif info.type == ModelType.SEGMENT:
            from app.services.segment import get_sam_model
            os.environ["SAM_MODEL_PATH"] = info.path
            os.environ["INFERENCE_DEVICE"] = device
            get_sam_model()
        
        info.loaded = True
        info.device = device
        _loaded_models[name] = True
        
        logger.info(f"模型加载成功: {name} on {device}")
        return True
        
    except Exception as e:
        logger.error(f"模型加载失败: {name}, {e}")
        return False


def unload_model(name: str) -> bool:
    """卸载模型"""
    info = get_model_info(name)
    if info is None or not info.loaded:
        return True
    
    try:
        # 清理模型引用
        if info.type == ModelType.DEPTH:
            import app.services.depth as depth_module
            depth_module._model = None
            depth_module._transform = None
            
        elif info.type == ModelType.SEGMENT:
            import app.services.segment as segment_module
            segment_module._sam_model = None
            segment_module._sam_predictor = None
        
        info.loaded = False
        if name in _loaded_models:
            del _loaded_models[name]
        
        # 触发垃圾回收
        import gc
        gc.collect()
        
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except ImportError:
            pass
        
        logger.info(f"模型卸载成功: {name}")
        return True
        
    except Exception as e:
        logger.error(f"模型卸载失败: {name}, {e}")
        return False


def get_loaded_models() -> List[ModelInfo]:
    """获取已加载的模型"""
    return [m for m in _registered_models.values() if m.loaded]


def get_gpu_info() -> Dict:
    """获取 GPU 信息"""
    try:
        import torch
        if torch.cuda.is_available():
            return {
                "available": True,
                "device_count": torch.cuda.device_count(),
                "device_name": torch.cuda.get_device_name(0),
                "memory_total": torch.cuda.get_device_properties(0).total_memory / (1024**3),
                "memory_allocated": torch.cuda.memory_allocated() / (1024**3),
                "memory_cached": torch.cuda.memory_reserved() / (1024**3)
            }
    except ImportError:
        pass
    
    return {"available": False}
