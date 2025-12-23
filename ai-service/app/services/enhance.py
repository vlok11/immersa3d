"""
图像/视频增强服务
支持超分辨率、去噪、人脸修复
"""
import os
import numpy as np
from PIL import Image
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# 模型路径
REALESRGAN_MODEL_PATH = os.getenv("REALESRGAN_MODEL_PATH", "./models/RealESRGAN_x4plus.pth")
GFPGAN_MODEL_PATH = os.getenv("GFPGAN_MODEL_PATH", "./models/GFPGANv1.4.pth")

# 延迟加载
_realesrgan_model = None
_gfpgan_model = None


def get_realesrgan():
    """获取 RealESRGAN 模型"""
    global _realesrgan_model
    
    if _realesrgan_model is not None:
        return _realesrgan_model
    
    try:
        if not os.path.exists(REALESRGAN_MODEL_PATH):
            logger.warning(f"RealESRGAN 模型不存在: {REALESRGAN_MODEL_PATH}")
            return None
        
        from basicsr.archs.rrdbnet_arch import RRDBNet
        from realesrgan import RealESRGANer
        
        model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
        _realesrgan_model = RealESRGANer(
            scale=4,
            model_path=REALESRGAN_MODEL_PATH,
            model=model,
            tile=0,
            tile_pad=10,
            pre_pad=0,
            half=False
        )
        
        logger.info("RealESRGAN 模型加载完成")
        return _realesrgan_model
        
    except ImportError as e:
        logger.error(f"RealESRGAN 依赖未安装: {e}")
        return None
    except Exception as e:
        logger.error(f"RealESRGAN 加载失败: {e}")
        return None


def get_gfpgan():
    """获取 GFPGAN 模型"""
    global _gfpgan_model
    
    if _gfpgan_model is not None:
        return _gfpgan_model
    
    try:
        if not os.path.exists(GFPGAN_MODEL_PATH):
            logger.warning(f"GFPGAN 模型不存在: {GFPGAN_MODEL_PATH}")
            return None
        
        from gfpgan import GFPGANer
        
        _gfpgan_model = GFPGANer(
            model_path=GFPGAN_MODEL_PATH,
            upscale=1,
            arch='clean',
            channel_multiplier=2,
            bg_upsampler=get_realesrgan()
        )
        
        logger.info("GFPGAN 模型加载完成")
        return _gfpgan_model
        
    except ImportError as e:
        logger.error(f"GFPGAN 依赖未安装: {e}")
        return None
    except Exception as e:
        logger.error(f"GFPGAN 加载失败: {e}")
        return None


def enhance_image_sync(
    input_path: str,
    output_path: str,
    sr: bool = True,
    denoise: bool = False,
    face_restore: bool = False,
    strength: float = 1.0
) -> str:
    """
    同步模式图像增强
    """
    logger.info(f"开始图像增强: {input_path}")
    
    img = Image.open(input_path).convert('RGB')
    img_array = np.array(img)
    
    result = img_array
    
    # 超分辨率
    if sr:
        realesrgan = get_realesrgan()
        if realesrgan:
            try:
                output, _ = realesrgan.enhance(img_array, outscale=4)
                result = output
                logger.info("超分辨率处理完成")
            except Exception as e:
                logger.error(f"超分辨率失败: {e}")
        else:
            # Mock: 简单双线性放大
            logger.warning("使用 Mock 超分辨率")
            img_upscaled = img.resize((img.width * 4, img.height * 4), Image.BILINEAR)
            result = np.array(img_upscaled)
    
    # 人脸修复
    if face_restore:
        gfpgan = get_gfpgan()
        if gfpgan:
            try:
                _, _, output = gfpgan.enhance(
                    result, 
                    has_aligned=False, 
                    only_center_face=False, 
                    paste_back=True
                )
                result = output
                logger.info("人脸修复完成")
            except Exception as e:
                logger.error(f"人脸修复失败: {e}")
    
    # 去噪 (简单实现)
    if denoise:
        try:
            from PIL import ImageFilter
            result_img = Image.fromarray(result)
            result_img = result_img.filter(ImageFilter.MedianFilter(size=3))
            result = np.array(result_img)
            logger.info("去噪处理完成")
        except Exception as e:
            logger.error(f"去噪失败: {e}")
    
    # 应用强度混合
    if strength < 1.0:
        original_resized = img.resize((result.shape[1], result.shape[0]), Image.BILINEAR)
        original_array = np.array(original_resized)
        result = (result * strength + original_array * (1 - strength)).astype(np.uint8)
    
    # 保存结果
    result_img = Image.fromarray(result)
    result_img.save(output_path)
    
    logger.info(f"图像增强完成: {output_path}")
    return output_path


def enhance_video_frames(
    frame_paths: list,
    output_dir: str,
    sr: bool = True,
    denoise: bool = False,
    face_restore: bool = False
) -> list:
    """
    增强视频帧序列
    """
    os.makedirs(output_dir, exist_ok=True)
    results = []
    
    for i, frame_path in enumerate(frame_paths):
        output_path = os.path.join(output_dir, f"enhanced_{i:05d}.png")
        
        try:
            result = enhance_image_sync(
                frame_path,
                output_path,
                sr=sr,
                denoise=denoise,
                face_restore=face_restore
            )
            results.append(result)
        except Exception as e:
            logger.error(f"帧 {i} 增强失败: {e}")
            results.append(frame_path)  # 使用原帧
    
    return results
