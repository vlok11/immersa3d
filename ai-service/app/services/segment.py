"""
分割服务 - SAM 2 (Segment Anything Model) 集成
支持交互式分割和自动分割
"""
import os
import numpy as np
from PIL import Image
from pathlib import Path
from typing import Optional, List, Tuple
import logging

logger = logging.getLogger(__name__)

# 配置
DEVICE = os.getenv("INFERENCE_DEVICE", "cpu")
SAM_MODEL_PATH = os.getenv("SAM_MODEL_PATH", "./models/sam2_hiera_small.pt")

# 延迟加载
_sam_model = None
_sam_predictor = None


def get_sam_model():
    """延迟加载 SAM 模型"""
    global _sam_model, _sam_predictor
    
    if _sam_predictor is not None:
        return _sam_predictor
    
    try:
        logger.info(f"加载 SAM 模型: {SAM_MODEL_PATH}, 设备: {DEVICE}")
        
        if not os.path.exists(SAM_MODEL_PATH):
            logger.warning(f"SAM 模型不存在: {SAM_MODEL_PATH}，使用 Mock 模式")
            return None
        
        # 尝试加载 SAM 2
        try:
            from sam2.build_sam import build_sam2
            from sam2.sam2_image_predictor import SAM2ImagePredictor
            
            _sam_model = build_sam2(
                config_file="sam2_hiera_s.yaml",
                ckpt_path=SAM_MODEL_PATH,
                device=DEVICE
            )
            _sam_predictor = SAM2ImagePredictor(_sam_model)
            
        except ImportError:
            # 回退到 SAM 1
            from segment_anything import sam_model_registry, SamPredictor
            
            model_type = "vit_h" if "vit_h" in SAM_MODEL_PATH else "vit_b"
            _sam_model = sam_model_registry[model_type](checkpoint=SAM_MODEL_PATH)
            _sam_model.to(DEVICE)
            _sam_predictor = SamPredictor(_sam_model)
        
        logger.info("SAM 模型加载完成")
        return _sam_predictor
        
    except Exception as e:
        logger.error(f"SAM 模型加载失败: {e}")
        return None


def segment_with_points(
    image_path: str, 
    points: List[Tuple[int, int]], 
    labels: List[int],
    output_path: str
) -> str:
    """
    基于点提示的交互式分割
    
    Args:
        image_path: 输入图像路径
        points: 点坐标列表 [(x, y), ...]
        labels: 点标签列表 [1=前景, 0=背景, ...]
        output_path: 输出 mask 路径
    """
    predictor = get_sam_model()
    
    if predictor is None:
        return segment_mock(image_path, output_path)
    
    try:
        # 加载图像
        image = np.array(Image.open(image_path).convert('RGB'))
        predictor.set_image(image)
        
        # 转换点格式
        input_points = np.array(points)
        input_labels = np.array(labels)
        
        # 预测
        masks, scores, _ = predictor.predict(
            point_coords=input_points,
            point_labels=input_labels,
            multimask_output=True
        )
        
        # 选择最佳 mask
        best_mask = masks[np.argmax(scores)]
        
        # 保存 mask
        mask_img = Image.fromarray((best_mask * 255).astype(np.uint8))
        mask_img.save(output_path)
        
        logger.info(f"分割完成: {output_path}")
        return output_path
        
    except Exception as e:
        logger.error(f"分割失败: {e}")
        return segment_mock(image_path, output_path)


def segment_with_box(
    image_path: str,
    box: Tuple[int, int, int, int],
    output_path: str
) -> str:
    """
    基于边界框的分割
    
    Args:
        image_path: 输入图像路径
        box: 边界框 (x1, y1, x2, y2)
        output_path: 输出 mask 路径
    """
    predictor = get_sam_model()
    
    if predictor is None:
        return segment_mock(image_path, output_path)
    
    try:
        image = np.array(Image.open(image_path).convert('RGB'))
        predictor.set_image(image)
        
        input_box = np.array(box)
        
        masks, scores, _ = predictor.predict(
            box=input_box,
            multimask_output=True
        )
        
        best_mask = masks[np.argmax(scores)]
        mask_img = Image.fromarray((best_mask * 255).astype(np.uint8))
        mask_img.save(output_path)
        
        return output_path
        
    except Exception as e:
        logger.error(f"分割失败: {e}")
        return segment_mock(image_path, output_path)


def segment_auto(image_path: str, output_dir: str) -> List[str]:
    """
    自动分割 - 检测并分割所有对象
    """
    predictor = get_sam_model()
    
    if predictor is None:
        return [segment_mock(image_path, os.path.join(output_dir, "mask_0.png"))]
    
    try:
        from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator
        
        image = np.array(Image.open(image_path).convert('RGB'))
        
        mask_generator = SAM2AutomaticMaskGenerator(_sam_model)
        masks = mask_generator.generate(image)
        
        os.makedirs(output_dir, exist_ok=True)
        results = []
        
        for i, mask_data in enumerate(masks):
            mask = mask_data['segmentation']
            output_path = os.path.join(output_dir, f"mask_{i:03d}.png")
            mask_img = Image.fromarray((mask * 255).astype(np.uint8))
            mask_img.save(output_path)
            results.append(output_path)
        
        logger.info(f"自动分割完成，生成 {len(results)} 个 mask")
        return results
        
    except Exception as e:
        logger.error(f"自动分割失败: {e}")
        return [segment_mock(image_path, os.path.join(output_dir, "mask_0.png"))]


def segment_mock(image_path: str, output_path: str) -> str:
    """Mock 分割 - 简单边缘检测"""
    logger.warning("使用 Mock 模式进行分割")
    
    from PIL import ImageFilter
    
    img = Image.open(image_path).convert('L')
    
    # 简单边缘检测作为 mock
    edges = img.filter(ImageFilter.FIND_EDGES)
    
    # 二值化
    threshold = 30
    mask = edges.point(lambda x: 255 if x > threshold else 0)
    
    # 膨胀
    mask = mask.filter(ImageFilter.MaxFilter(5))
    
    mask.save(output_path)
    return output_path
