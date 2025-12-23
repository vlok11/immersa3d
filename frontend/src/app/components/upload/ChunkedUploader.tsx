'use client';

import React from 'react';
import { Upload, Progress, message, Button, Space, Typography } from 'antd';
import { InboxOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import SparkMD5 from 'spark-md5';

const { Dragger } = Upload;
const { Text } = Typography;

interface ChunkedUploaderProps {
  onUploadComplete?: (asset: Asset) => void;
  chunkSize?: number; // 默认 5MB
  accept?: string;
}

interface Asset {
  id: string;
  filename: string;
  storagePath: string;
  fileSize: number;
  mimeType: string;
  type: string;
}

interface UploadState {
  status: 'idle' | 'hashing' | 'uploading' | 'completed' | 'error';
  progress: number;
  filename: string;
  error?: string;
}

/**
 * 分块上传组件
 * 支持大文件分块上传、断点续传、秒传
 */
export default function ChunkedUploader({ 
  onUploadComplete, 
  chunkSize = 5 * 1024 * 1024, // 5MB
  accept = "image/*,video/*"
}: ChunkedUploaderProps) {
  const [state, setState] = React.useState<UploadState>({
    status: 'idle',
    progress: 0,
    filename: ''
  });

  /**
   * 计算文件 MD5 哈希（用于去重/秒传）
   */
  const calculateFileHash = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const spark = new SparkMD5.ArrayBuffer();
      const reader = new FileReader();
      const chunkCount = Math.ceil(file.size / chunkSize);
      let currentChunk = 0;

      reader.onload = (e) => {
        if (e.target?.result) {
          spark.append(e.target.result as ArrayBuffer);
        }
        currentChunk++;

        if (currentChunk < chunkCount) {
          // 只采样前、中、后三个块来加速哈希计算
          if (currentChunk === 1 || currentChunk === Math.floor(chunkCount / 2) || currentChunk === chunkCount - 1) {
            loadNextChunk();
          } else {
            currentChunk = Math.min(currentChunk + 1, chunkCount - 1);
            if (currentChunk < chunkCount) {
              loadNextChunk();
            } else {
              resolve(spark.end());
            }
          }
        } else {
          resolve(spark.end());
        }
      };

      reader.onerror = () => reject(new Error('文件读取失败'));

      const loadNextChunk = () => {
        const start = currentChunk * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        reader.readAsArrayBuffer(file.slice(start, end));
      };

      loadNextChunk();
    });
  };

  /**
   * 上传单个分块
   */
  const uploadChunk = async (
    sessionId: string, 
    chunkIndex: number, 
    chunk: Blob
  ): Promise<void> => {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('chunkIndex', String(chunkIndex));
    formData.append('chunk', chunk);

    const response = await fetch('/api/assets/upload/chunk', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '分块上传失败');
    }
  };

  /**
   * 处理文件上传
   */
  const handleUpload = async (file: File) => {
    setState({ status: 'hashing', progress: 0, filename: file.name });

    try {
      // 1. 计算文件哈希
      const fileHash = await calculateFileHash(file);
      setState(s => ({ ...s, progress: 5 }));

      // 2. 初始化上传会话
      const initResponse = await fetch('/api/assets/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileSize: file.size,
          mimeType: file.type,
          chunkSize,
          fileHash
        })
      });

      const initData = await initResponse.json();

      // 秒传成功
      if (initData.status === 'completed') {
        message.success('秒传成功！');
        setState({ status: 'completed', progress: 100, filename: file.name });
        return;
      }

      const { sessionId, totalChunks } = initData;
      setState({ status: 'uploading', progress: 10, filename: file.name });

      // 3. 分块上传（并行上传，最多 3 个并发）
      const concurrency = 3;
      let uploadedChunks = 0;

      for (let i = 0; i < totalChunks; i += concurrency) {
        const promises: Promise<void>[] = [];
        
        for (let j = i; j < Math.min(i + concurrency, totalChunks); j++) {
          const start = j * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunk = file.slice(start, end);
          
          promises.push(
            uploadChunk(sessionId, j, chunk).then(() => {
              uploadedChunks++;
              const progress = 10 + (uploadedChunks / totalChunks) * 80;
              setState(s => ({ ...s, progress }));
            })
          );
        }

        await Promise.all(promises);
      }

      // 4. 完成上传
      const completeResponse = await fetch('/api/assets/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      const completeData = await completeResponse.json();

      if (completeData.success) {
        setState({ status: 'completed', progress: 100, filename: file.name });
        message.success('上传成功！');
        onUploadComplete?.(completeData.asset);
      } else {
        throw new Error(completeData.error || '完成上传失败');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      setState({ status: 'error', progress: 0, filename: file.name, error: errorMessage });
      message.error(errorMessage);
    }
  };

  const customRequest = ({ file }: { file: File | Blob }) => {
    if (file instanceof File) {
      handleUpload(file);
    }
  };

  const reset = () => {
    setState({ status: 'idle', progress: 0, filename: '' });
  };

  // 上传中或完成状态显示进度
  if (state.status !== 'idle') {
    return (
      <div style={{ 
        padding: 24, 
        background: '#fafafa', 
        borderRadius: 8, 
        border: '1px solid #d9d9d9',
        textAlign: 'center'
      }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>{state.filename}</Text>
          
          {state.status === 'hashing' && (
            <Text type="secondary">正在计算文件指纹...</Text>
          )}
          
          {state.status === 'uploading' && (
            <Progress percent={Math.round(state.progress)} status="active" />
          )}
          
          {state.status === 'completed' && (
            <>
              <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
              <Text type="success">上传完成</Text>
              <Button onClick={reset}>继续上传</Button>
            </>
          )}
          
          {state.status === 'error' && (
            <>
              <CloseCircleOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
              <Text type="danger">{state.error}</Text>
              <Button onClick={reset}>重试</Button>
            </>
          )}
        </Space>
      </div>
    );
  }

  return (
    <Dragger
      name="file"
      multiple={false}
      accept={accept}
      showUploadList={false}
      customRequest={customRequest as never}
      style={{ background: '#fff', border: '2px dashed #d9d9d9', borderRadius: 8 }}
    >
      <p className="ant-upload-drag-icon">
        <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
      </p>
      <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
      <p className="ant-upload-hint">支持图片和视频文件，大文件将自动分块上传</p>
    </Dragger>
  );
}
