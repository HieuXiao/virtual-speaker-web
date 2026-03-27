# Virtual Speaker Web 🎙️

Ứng dụng trợ lý ảo 3D tích hợp công nghệ VRM, VRMA và FPT.AI Text-to-Speech. Giao diện hiện đại phong cách Zalo/Messenger.

## Cấu trúc dự án

- `apps/web`: Frontend React + Three.js + Vite.
- `apps/server`: Backend Node.js + Express (Proxy cho FPT.AI).
- `packages/shared`: Các kiểu dữ liệu dùng chung.

## Hướng dẫn cài đặt

1.  **Cài đặt dependencies**:
    ```bash
    npm install
    ```

2.  **Cấu hình biến môi trường**:
    - Truy cập `apps/server`, copy `.env.example` thành `.env` và nhập `FPT_API_KEY`.

3.  **Chạy dự án ở chế độ phát triển**:
    ```bash
    npm run dev
    ```
    - Web: `http://localhost:5173`
    - Server: `http://localhost:3001`

## Tính năng chính

- **3D Avatar**: Hiển thị nhân vật VRM với hiệu ứng ánh sáng và camera chuyên nghiệp.
- **VRMA Animations**: Hệ thống hành động và cảm xúc đa dạng (Wave, Dance, Angry, v.v.).
- **TTS & Lip-sync**: Tự động mấp máy môi khớp với giọng nói từ FPT.AI.
- **Messenger UI**: Thanh nhập liệu nổi (floating pill bar) với hiệu ứng Glassmorphism.

## Công nghệ sử dụng

- **Frontend**: React, Three.js, @pixiv/three-vrm, Vite.
- **Backend**: Express, Dotenv.
- **AI**: FPT.AI (Speech Synthesis).
