'use client';

import React, { useState } from 'react';
import { InboxOutlined, LoadingOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { message, Upload, Card, Image, Button, Space } from 'antd';

const { Dragger } = Upload;

interface UploadResponse {
  id: string;
  originalFilename: string;
  storagePath: string;
  type: string;
}

const UploadZone: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [assetData, setAssetData] = useState<UploadResponse | null>(null);

  const props: UploadProps = {
    name: 'file',
    multiple: false,
    action: '/api/assets/upload',
    onChange(info) {
      const { status } = info.file;
      if (status !== 'uploading') {
        setLoading(true);
      }
      if (status === 'done') {
        message.success(`${info.file.name} file uploaded successfully.`);
        setLoading(false);
        const response = info.file.response as UploadResponse;
        setAssetData(response);
        // For preview, we use the storagePath. In real app, consider using a signed URL or dedicated preview endpoint.
        // Here we assume the backend proxies the file content via /api/assets/file/{storagePath}
        setImageUrl(`/api/assets/file/${response.storagePath}`);
      } else if (status === 'error') {
        message.error(`${info.file.name} file upload failed.`);
        setLoading(false);
      }
    },
    onDrop(e) {
      console.log('Dropped files', e.dataTransfer.files);
    },
    showUploadList: false,
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <Card title="Upload Image or Video" bordered={false}>
        {!imageUrl ? (
            <Dragger {...props}>
            <p className="ant-upload-drag-icon">
                {loading ? <LoadingOutlined /> : <InboxOutlined />}
            </p>
            <p className="ant-upload-text">Click or drag file to this area to upload</p>
            <p className="ant-upload-hint">
                Support for a single or bulk upload. Strictly prohibited from uploading company data or other
                banned files.
            </p>
            </Dragger>
        ) : (
            <div style={{ textAlign: 'center' }}>
                <Image
                    src={imageUrl}
                    alt="Uploaded Asset"
                    style={{ maxHeight: 400, objectFit: 'contain' }}
                />
                <div style={{ marginTop: 16 }}>
                    <p>Asset ID: {assetData?.id}</p>
                    <Space>
                        <Button type="primary" href={`/editor/${assetData?.id}`}>
                            Open in 3D Editor
                        </Button>
                        <Button onClick={() => {
                            setImageUrl(null);
                            setAssetData(null);
                        }}>Upload New</Button>
                    </Space>
                </div>
            </div>
        )}
      </Card>
    </div>
  );
};

export default UploadZone;
