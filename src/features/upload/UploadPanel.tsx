import { ArrowRight, Image as ImageIcon, Link as LinkIcon, Upload, X } from 'lucide-react';
import React, { memo } from 'react';

interface UploadPanelProps {
  acceptedFormats: string;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUrlSubmit: () => void | Promise<void>;
  setShowUrlInput: (show: boolean) => void;
  setUrlInput: (url: string) => void;
  showUrlInput: boolean;
  urlInput: string;
}

export const UploadPanel = memo(
  ({
    showUrlInput,
    setShowUrlInput,
    urlInput,
    setUrlInput,
    onFileUpload,
    onUrlSubmit,
    acceptedFormats,
  }: UploadPanelProps) => (
    <div className="text-center space-y-6 max-w-md p-8 border border-zinc-800 rounded-2xl bg-zinc-900/50 backdrop-blur-sm shadow-2xl">
      <div className="w-20 h-20 bg-zinc-800 rounded-full mx-auto flex items-center justify-center mb-4">
        <ImageIcon className="w-10 h-10 text-zinc-500" />
      </div>

      {!showUrlInput ? (
        <>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">上传资源</h2>
            <p className="text-zinc-400">
              支持 4K 超清视频与全景照片
              <br />
              AI 深度估计技术将把它们转化为交互式 3D 场景
            </p>
          </div>

          <div className="relative group">
            <input
              accept={acceptedFormats}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              onChange={onFileUpload}
              type="file"
            />
            <button className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
              <Upload className="w-5 h-5" />
              选择本地文件
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors px-3 py-1.5 rounded hover:bg-zinc-800"
              onClick={() => {
                setShowUrlInput(true);
              }}
            >
              <LinkIcon className="w-3 h-3" /> 使用视频链接
            </button>
          </div>
        </>
      ) : (
        <div className="animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white">输入链接</h2>
            <button
              className="text-zinc-500 hover:text-white"
              onClick={() => {
                setShowUrlInput(false);
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-zinc-400 mb-4 text-left">
            请输入直链或支持的网页地址 (如 m3u8, mp4)
          </p>

          <div className="flex gap-2">
            <input
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              onChange={(e) => {
                setUrlInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void onUrlSubmit();
                }
              }}
              placeholder="https://example.com/video.mp4"
              type="text"
              value={urlInput}
            />
            <button
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 rounded-lg flex items-center justify-center"
              onClick={() => {
                void onUrlSubmit();
              }}
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-600 pt-4 border-t border-zinc-800">
        支持 MP4, MOV, MKV, AVI, M3U8 等格式
      </p>
    </div>
  )
);

UploadPanel.displayName = 'UploadPanel';
