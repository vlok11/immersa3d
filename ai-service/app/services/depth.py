"""
深度估计服务 - Depth Anything V2 集成
支持 CPU/GPU 双模式推理
"""
import os
import time
import numpy as np
from PIL import Image
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# 推理后端配置
DEVICE = os.getenv("INFERENCE_DEVICE", "cpu")  # cpu 或 cuda
MODEL_PATH = os.getenv("DEPTH_MODEL_PATH", "./models/depth_anything_v2_vits.pth")

# 延迟加载模型
_model = None
_transform = None


def get_model():
    """延迟加载 Depth Anything 模型"""
    global _model, _transform
    
    if _model is not None:
        return _model, _transform
    
    try:
        import torch
        from torchvision import transforms
        
        logger.info(f"加载 Depth Anything 模型: {MODEL_PATH}, 设备: {DEVICE}")
        
        # 检查模型文件是否存在
        if not os.path.exists(MODEL_PATH):
            logger.warning(f"模型文件不存在: {MODEL_PATH}，使用 Mock 模式")
            return None, None
        
        # 加载模型
        # 注意: 这里假设使用的是 depth_anything_v2 的官方实现
        # 实际部署时需要根据具体模型格式调整
        try:
            from depth_anything_v2.dpt import DepthAnythingV2
            
            model_configs = {
                'vits': {'encoder': 'vits', 'features': 64, 'out_channels': [48, 96, 192, 384]},
                'vitb': {'encoder': 'vitb', 'features': 128, 'out_channels': [96, 192, 384, 768]},
                'vitl': {'encoder': 'vitl', 'features': 256, 'out_channels': [256, 512, 1024, 1024]},
            }
            
            # 根据模型文件名确定配置
            if 'vits' in MODEL_PATH:
                config = model_configs['vits']
            elif 'vitb' in MODEL_PATH:
                config = model_configs['vitb']
            else:
                config = model_configs['vitl']
            
            _model = DepthAnythingV2(**config)
            _model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
            _model.to(DEVICE)
            _model.eval()
            
        except ImportError:
            # 如果没有安装 depth_anything_v2，尝试使用 transformers
            from transformers import pipeline
            _model = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf", device=0 if DEVICE == "cuda" else -1)
        
        # 图像预处理
        _transform = transforms.Compose([
            transforms.Resize((518, 518)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        logger.info("Depth Anything 模型加载完成")
        return _model, _transform
        
    except Exception as e:
        logger.error(f"模型加载失败: {e}")
        return None, None


def estimate_depth_with_model(image_path: str, output_path: str) -> str:
    """使用真实模型进行深度估计"""
    import torch
    
    model, transform = get_model()
    
    if model is None:
        # 回退到 Mock 模式
        return estimate_depth_mock(image_path, output_path)
    
    try:
        # 加载图像
        img = Image.open(image_path).convert('RGB')
        original_size = img.size
        
        # 检查是否是 pipeline 模式
        if hasattr(model, '__call__') and not hasattr(model, 'forward'):
            # Hugging Face pipeline 模式
            result = model(img)
            depth = result["depth"]
        else:
            # 原生 PyTorch 模式
            input_tensor = transform(img).unsqueeze(0).to(DEVICE)
            
            with torch.no_grad():
                depth = model(input_tensor)
            
            # 转换深度图
            depth = depth.squeeze().cpu().numpy()
        
        # 归一化到 0-255
        depth = (depth - depth.min()) / (depth.max() - depth.min()) * 255
        depth = depth.astype(np.uint8)
        
        # 调整回原始尺寸
        depth_img = Image.fromarray(depth)
        depth_img = depth_img.resize(original_size, Image.BILINEAR)
        
        # 保存
        depth_img.save(output_path)
        logger.info(f"深度图生成完成: {output_path}")
        
        return output_path
        
    except Exception as e:
        logger.error(f"深度估计失败: {e}")
        return estimate_depth_mock(image_path, output_path)


def estimate_depth_mock(image_path: str, output_path: str) -> str:
    """Mock 深度估计（回退方案）"""
    logger.warning("使用 Mock 模式进行深度估计")
    
    img = Image.open(image_path)
    
    # 转为灰度图
    if img.mode != 'L':
        depth_img = img.convert('L')
    else:
        depth_img = img
    
    # 反转颜色（近处亮、远处暗）
    depth_array = np.array(depth_img)
    depth_array = 255 - depth_array
    depth_img = Image.fromarray(depth_array)
    
    depth_img.save(output_path)
    return output_path


def estimate_depth_sync(job_id: str, image_path: str) -> str:
    """
    同步模式深度估计
    返回生成的深度图路径
    """
    logger.info(f"[{job_id}] 开始深度估计: {image_path}")
    
    result_path = f"results/{job_id}_depth.png"
    
    # 确保结果目录存在
    os.makedirs("results", exist_ok=True)
    
    try:
        # 使用真实模型
        result = estimate_depth_with_model(image_path, result_path)
        logger.info(f"[{job_id}] 深度图生成完成: {result}")
        
    except Exception as e:
        logger.error(f"[{job_id}] 深度估计失败: {e}")
        # 回退到 Mock
        estimate_depth_mock(image_path, result_path)
    
    # 清理临时文件
    if os.path.exists(image_path) and "temp" in image_path:
        os.remove(image_path)
    
    return result_path


def batch_estimate_depth(image_paths: list, output_dir: str) -> list:
    """批量深度估计"""
    os.makedirs(output_dir, exist_ok=True)
    results = []
    
    for i, path in enumerate(image_paths):
        output_path = os.path.join(output_dir, f"depth_{i:05d}.png")
        result = estimate_depth_with_model(path, output_path)
        results.append(result)
    
    return results
